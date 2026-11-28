/**
 * Q23 — DEMO / dev helper to walk a DEMO round through close → draw (mock VRF) → settle on demand, so QA can test
 * results → verifier → player winnings without waiting for the real close on a JOBS-enabled API. The helper runs the
 * real lifecycle steps (nothing picks winners or amounts), is refused for real rounds, and writes audit rows.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppError } from '../src/common/errors';
import type { AppConfig } from '../src/config/app-config';
import { AuditService } from '../src/modules/audit/audit.service';
import { DevRoundsService } from '../src/modules/pool/dev-rounds.controller';
import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import { RoundsService } from '../src/modules/pool/rounds.service';
import { RandomnessService } from '../src/modules/randomness/randomness.service';
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

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const openDemoRound = () => {
  const now = Date.now();
  return t.app.get(RoundsService).open({
    opensAt: new Date(now - 60_000),
    closesAt: new Date(now + 3_600_000),
    number: 900_000 + Math.floor(Math.random() * 90_000_000),
    minParticipants: 2,
    minPool: '100.00',
    isDemo: true,
  });
};
const enter = (token: string, roundId: string, entries: number) =>
  t
    .http()
    .post(`/pool/rounds/${roundId}/entries`)
    .set(bearer(token))
    .send({ entries, idempotencyKey: `e-${uid()}` })
    .expect(201);

describe('DEMO round lifecycle helper (Q23)', () => {
  it('close → draw (mock VRF) → settle a DEMO round: verifiable winners, prizes in Owed, winnings in history', async () => {
    const alice = await newPlayer(t);
    const bob = await newPlayer(t);
    await demoDeposit(t, alice, '500.00');
    await demoDeposit(t, bob, '500.00');
    const round = await openDemoRound();
    await enter(alice.token, round.id, 20);
    await enter(bob.token, round.id, 15);
    const dev = (step: string) =>
      t.http().post(`/dev/pool/rounds/${round.number}/${step}`).set(bearer(alice.token));

    // Order is enforced by the lifecycle itself.
    expect((await dev('settle').expect(409)).body.error.code).toBe('CONFLICT');

    const closed = (await dev('close').expect(200)).body;
    expect(closed).toMatchObject({
      step: 'close',
      outcome: 'closed',
      isDemo: true,
      round: { status: 'closed', thresholds: { met: true } },
    });
    // Entries are frozen once closed.
    await t
      .http()
      .post(`/pool/rounds/${round.id}/entries`)
      .set(bearer(bob.token))
      .send({ entries: 1, idempotencyKey: `e-${uid()}` })
      .expect(409);

    const drawn = (await dev('draw').expect(200)).body;
    expect(drawn).toMatchObject({
      outcome: 'drawing',
      round: { status: 'drawing', draw: { provider: 'mock' } },
    });

    const settled = (await dev('settle').expect(200)).body;
    expect(settled).toMatchObject({ outcome: 'settled', round: { status: 'settled' } });
    expect(settled.round.winners).toHaveLength(13);

    const verify = (await t.http().get(`/pool/rounds/${round.number}/verify`).expect(200)).body;
    expect(verify).toMatchObject({
      randomness: { provider: 'mock' },
      recomputed: { matchesStoredWinners: true },
    });

    const owed = async (token: string) =>
      (await t.http().get('/wallet/balances').set(bearer(token)).expect(200)).body.owed as string;
    expect(Number(await owed(alice.token)) + Number(await owed(bob.token))).toBeCloseTo(350, 6);
    const history = (await t.http().get('/pool/me/entries').set(bearer(alice.token)).expect(200))
      .body as { items: { roundNumber: number; result: { kind: string } }[] };
    const mine = history.items.find((i) => i.roundNumber === round.number);
    expect(['won', 'not_selected']).toContain(mine?.result.kind);

    const audit = await t.prisma.auditLog.findMany({
      where: { targetType: 'round', targetId: round.id, action: { startsWith: 'dev.round.' } },
      orderBy: { seq: 'asc' },
    });
    expect(audit.map((a) => a.action)).toEqual([
      'dev.round.close',
      'dev.round.draw',
      'dev.round.settle',
    ]);
  });

  it('a DEMO round below its thresholds is cancelled at draw, stakes refunded to Owed', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '100.00');
    const round = await openDemoRound(); // needs 2 participants
    await enter(p.token, round.id, 3);
    const dev = (step: string) =>
      t.http().post(`/dev/pool/rounds/${round.number}/${step}`).set(bearer(p.token));
    await dev('close').expect(200);
    expect((await dev('draw').expect(200)).body).toMatchObject({
      outcome: 'cancelled',
      round: { status: 'cancelled' },
    });
    const b = (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body;
    expect(b).toMatchObject({ owed: '30.00', locked: '0.00' });
  });

  it('real (non-DEMO) rounds are refused; unknown rounds 404; nothing outside DEMO dev mode', async () => {
    const p = await newPlayer(t);
    const real = await openRound(t, { minParticipants: 2, minPool: '100.00' });
    const res = await t
      .http()
      .post(`/dev/pool/rounds/${real.number}/close`)
      .set(bearer(p.token))
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await t.prisma.round.findUniqueOrThrow({ where: { id: real.id } })).status).toBe(
      'open',
    );
    await t.http().post('/dev/pool/rounds/1999999999/close').set(bearer(p.token)).expect(404);
    await t.http().post(`/dev/pool/rounds/${real.number}/close`).expect(401);

    // Production / real money: the service itself refuses, even if the route guard were bypassed.
    const off = new DevRoundsService(
      t.app.get(RoundsService),
      t.app.get(RoundLifecycleService),
      t.app.get(RandomnessService),
      t.app.get(AuditService),
      { demoEndpointsEnabled: false } as AppConfig,
    );
    const demo = await openDemoRound();
    await expect(
      off.advance({ id: p.userId } as never, demo.number, 'close'),
    ).rejects.toBeInstanceOf(AppError);
    expect((await t.prisma.round.findUniqueOrThrow({ where: { id: demo.id } })).status).toBe(
      'open',
    );
    // Leave nothing open behind in the shared test DB.
    await t.app.get(RoundLifecycleService).close(demo.id);
    await t.app.get(RoundLifecycleService).startDraw(demo.id);
  });
});
