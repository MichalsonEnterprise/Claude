/**
 * Round lifecycle close-out fixes (no chain needed): a round committed on-chain is never drawn, cancelled or settled
 * off-chain when the mirror is switched off (R21); with the Chainlink provider a round that was never mirrored is
 * not left in 'closed' forever (R10).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { MirrorUnavailableError } from '../src/modules/onchain-rounds/round-mirror.service';
import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import { RandomnessNotReadyError } from '../src/modules/randomness/chainlink-vrf.provider';
import type { RandomnessProvider } from '../src/modules/randomness/randomness.provider';
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
let lifecycle: RoundLifecycleService;
let randomness: RandomnessService;
let realProvider: RandomnessProvider;

beforeAll(async () => {
  t = await createTestApp();
  lifecycle = t.app.get(RoundLifecycleService);
  randomness = t.app.get(RandomnessService);
  realProvider = randomness.provider;
});
afterEach(() => {
  (randomness as { provider: RandomnessProvider }).provider = realProvider;
});
afterAll(async () => {
  await t?.close();
});

/** A closed round with two players and thresholds met (DB only). */
async function closedRound() {
  const a = await newPlayer(t);
  const b = await newPlayer(t);
  await demoDeposit(t, a, '100.00');
  await demoDeposit(t, b, '100.00');
  const round = await openRound(t, { minParticipants: 2, minPool: '20.00' });
  for (const [p, n] of [
    [a, 2],
    [b, 1],
  ] as const) {
    await t
      .http()
      .post(`/pool/rounds/${round.id}/entries`)
      .set(bearer(p.token))
      .send({ entries: n, idempotencyKey: `rc-${uid()}` })
      .expect(201);
  }
  await lifecycle.close(round.id);
  return { round, players: [a, b] };
}

describe('rounds committed on-chain while the mirror is off (R21)', () => {
  it('a chain_mirror round is never drawn with a non-chainlink provider (no mock re-roll)', async () => {
    const { round } = await closedRound();
    // As if adopted on GlobalPoolRounds earlier; the process now runs with POOL_ONCHAIN_MIRROR=false + mock VRF.
    await t.prisma.round.update({ where: { id: round.id }, data: { chainMirror: true } });
    await expect(lifecycle.startDraw(round.id)).rejects.toBeInstanceOf(MirrorUnavailableError);
    expect((await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } })).status).toBe(
      'closed',
    );
    expect(await t.prisma.randomnessRequest.count({ where: { roundId: round.id } })).toBe(0);
  });

  it('an owed on-chain draw is never refunded off-chain for VRF timeout, nor settled from an off-chain word', async () => {
    const { round } = await closedRound();
    expect(await lifecycle.startDraw(round.id)).toBe('drawing'); // mock request (not mirrored yet)
    // The round is (now) committed on-chain and the request is 30 h old.
    await t.prisma.round.update({ where: { id: round.id }, data: { chainMirror: true } });
    await t.prisma.randomnessRequest.updateMany({
      where: { roundId: round.id },
      data: { requestedAt: new Date(Date.now() - 30 * 3_600_000) },
    });
    await expect(lifecycle.pollAndSettle(round.id)).rejects.toBeInstanceOf(MirrorUnavailableError);
    await expect(lifecycle.settle(round.id)).rejects.toBeInstanceOf(MirrorUnavailableError);
    const after = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(after.status).toBe('drawing');
    expect(await t.prisma.winner.count({ where: { roundId: round.id } })).toBe(0);
  });
});

describe('Chainlink provider and a round that was never mirrored (R10)', () => {
  const chainlinkWithoutRequest: RandomnessProvider = {
    kind: 'chainlink_vrf_v2_5',
    request: () =>
      Promise.reject(new RandomnessNotReadyError('No DrawRequested event (requestDraw not sent)')),
    fulfillment: () => Promise.resolve(null),
  };

  it('waits (not ready) right after the close, then cancels with refunds after VRF_TIMEOUT_HOURS', async () => {
    const { round, players } = await closedRound();
    (randomness as { provider: RandomnessProvider }).provider = chainlinkWithoutRequest;
    await expect(lifecycle.startDraw(round.id)).rejects.toBeInstanceOf(RandomnessNotReadyError);
    expect((await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } })).status).toBe(
      'closed',
    );
    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(await lifecycle.startDraw(round.id, later)).toBe('cancelled');
    const after = await t.prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(after).toMatchObject({ status: 'cancelled', cancelReason: 'vrf_timeout' });
    const owed = await t.http().get('/wallet/balances').set(bearer(players[0]!.token)).expect(200);
    expect(owed.body.owed).toBe('20.00'); // stakes refunded (fees are not)
  });
});
