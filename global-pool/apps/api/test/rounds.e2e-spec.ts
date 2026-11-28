import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LedgerService } from '../src/modules/ledger/ledger.service';
import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import {
  bearer,
  createTestApp,
  demoDeposit,
  newPlayer,
  openRound,
  uid,
  type TestApp,
} from './helpers';

let t: TestApp;
let lifecycle: RoundLifecycleService;
let ledger: LedgerService;

beforeAll(async () => {
  t = await createTestApp();
  lifecycle = t.app.get(RoundLifecycleService);
  ledger = t.app.get(LedgerService);
});
afterAll(async () => {
  await t?.close();
});

const enter = (token: string, roundId: string, entries: number) =>
  t
    .http()
    .post(`/pool/rounds/${roundId}/entries`)
    .set(bearer(token))
    .send({ entries, idempotencyKey: `e-${uid()}` })
    .expect(201);
const balances = async (token: string) =>
  (await t.http().get('/wallet/balances').set(bearer(token)).expect(200)).body;

describe('round settlement from randomness only', () => {
  it('close → draw (mock VRF) → settle: 13 distinct winners, prizes = pool, owed credited, verifiable', async () => {
    const alice = await newPlayer(t);
    const bob = await newPlayer(t);
    await demoDeposit(t, alice, '500.00');
    await demoDeposit(t, bob, '500.00');
    const round = await openRound(t, { minParticipants: 2, minPool: '100.00' });
    await enter(alice.token, round.id, 20);
    await enter(bob.token, round.id, 15);

    await lifecycle.close(round.id);
    expect(await lifecycle.startDraw(round.id)).toBe('drawing');
    expect(await lifecycle.pollAndSettle(round.id)).toBe('settled');

    const view = (await t.http().get(`/pool/rounds/${round.number}`).expect(200)).body;
    expect(view).toMatchObject({
      status: 'settled',
      entries: 35,
      poolBalance: '350.00',
      draw: { provider: 'mock', status: 'fulfilled' },
    });
    expect(view.winners).toHaveLength(13);
    expect(new Set(view.winners.map((w: { entrySeq: number }) => w.entrySeq)).size).toBe(13);
    const paid = view.winners.reduce(
      (acc: number, w: { amount: string }) => acc + Math.round(Number(w.amount) * 1e6),
      0,
    );
    expect(paid).toBe(350_000_000);
    expect(view.winners[0]).toMatchObject({ place: 1, tier: 'first', amount: '175.00' });

    // pool account emptied, prizes owed to the winners (balances computed from the ledger)
    expect(await ledger.balanceOf({ type: 'pool', roundId: round.id })).toBe('0.00');
    const a = await balances(alice.token);
    const b = await balances(bob.token);
    expect(Number(a.owed) + Number(b.owed)).toBeCloseTo(350, 6);
    expect(a.locked).toBe('0.00');

    // anyone can recompute the winners from the VRF word + entry list
    const verify = (await t.http().get(`/pool/rounds/${round.number}/verify`).expect(200)).body;
    expect(verify).toMatchObject({
      algorithm: { name: 'GLOBAL_POOL_WINNERS_V1' },
      randomness: { provider: 'mock' },
      recomputed: { matchesStoredWinners: true },
    });

    // settling twice is impossible
    await expect(lifecycle.settle(round.id)).rejects.toMatchObject({ code: 'CONFLICT' });

    // claim owed → available (idempotent)
    const key = `claim-${uid()}`;
    const claim = await t
      .http()
      .post('/wallet/owed/claim')
      .set(bearer(alice.token))
      .send({ idempotencyKey: key })
      .expect(200);
    expect(claim.body.claimed).toBe(a.owed);
    const replay = await t
      .http()
      .post('/wallet/owed/claim')
      .set(bearer(alice.token))
      .send({ idempotencyKey: key })
      .expect(200);
    expect(replay.body).toMatchObject({ replayed: true, claimed: a.owed });
    const after = await balances(alice.token);
    expect(after.owed).toBe('0.00');
    expect(Number(after.available)).toBeCloseTo(500 - 201 + Number(a.owed), 6);
  });

  it('threshold not met → cancelled; stakes (not fees) refunded to Owed', async () => {
    const carol = await newPlayer(t);
    await demoDeposit(t, carol, '100.00');
    const round = await openRound(t); // default thresholds: 500 participants / 50,000.00
    await enter(carol.token, round.id, 3);
    expect((await balances(carol.token)).locked).toBe('30.00');

    await lifecycle.close(round.id);
    expect(await lifecycle.startDraw(round.id)).toBe('cancelled');
    const bal = await balances(carol.token);
    expect(bal).toMatchObject({
      available: '69.85',
      locked: '0.00',
      owed: '30.00',
      total: '99.85',
    });
    expect(bal.breakdown.owed[0]).toMatchObject({
      amount: '30.00',
      reference: `round:${round.number}`,
    });
    const view = (await t.http().get(`/pool/rounds/${round.number}`).expect(200)).body;
    expect(view).toMatchObject({
      status: 'cancelled',
      cancellation: { reason: 'threshold_not_met', refundsTo: 'owed' },
    });
    expect((await ledger.reconcile()).ok).toBe(true);
  });

  it('a closed round no longer accepts entries', async () => {
    const dave = await newPlayer(t);
    await demoDeposit(t, dave, '50.00');
    const round = await openRound(t);
    await lifecycle.close(round.id);
    const res = await t
      .http()
      .post(`/pool/rounds/${round.id}/entries`)
      .set(bearer(dave.token))
      .send({ entries: 1, idempotencyKey: `c-${uid()}` })
      .expect(409);
    expect(res.body.error.code).toBe('ROUND_NOT_OPEN');
  });
});

describe('WebSocket gateway (/pool)', () => {
  it('emits a snapshot on connect and pool:update after an entry purchase', async () => {
    const server = await t.app.listen(0, '127.0.0.1');
    const { port } = server.address() as AddressInfo;
    const socket: Socket = io(`http://127.0.0.1:${port}/pool`, {
      transports: ['websocket'],
      reconnection: false,
    });
    try {
      const snapshot = await new Promise<{ round: unknown }>((resolve, reject) => {
        socket.once('pool:snapshot', resolve);
        socket.once('connect_error', reject);
      });
      expect(snapshot).toHaveProperty('round');

      const erin = await newPlayer(t);
      await demoDeposit(t, erin, '100.00');
      const round = await openRound(t);
      const update = new Promise<Record<string, unknown>>((resolve) => {
        socket.on('pool:update', (e: Record<string, unknown>) => {
          if (e.roundId === round.id) resolve(e);
        });
      });
      await enter(erin.token, round.id, 5);
      expect(await update).toMatchObject({
        type: 'pool.update',
        entries: 5,
        participants: 1,
        poolBalance: '50.00',
        platformFees: '0.25',
      });
    } finally {
      socket.close();
    }
  });
});
