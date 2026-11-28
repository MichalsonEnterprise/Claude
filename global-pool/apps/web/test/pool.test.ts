import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  approxPercent,
  checkParticipation,
  clock,
  hmsOf,
  mockVrfWord,
  oddsAfter,
  relativeTime,
  roundPhase,
  verifyDraw,
} from '@/components/pool/logic';
import { parsePoolPreview } from '@/components/pool/preview';
import type { PoolVerification, RgLimitView } from '@/lib/api/pool';
import { demoBetweenRoundsShiftDays, demoShiftDays, shiftIso } from '@/lib/data/demo-clock';
import { mockPoolSnapshot } from '@/lib/data/mock-home';

const limit = (
  used: string,
  l = '500.00',
  type: RgLimitView['type'] = 'participation',
): RgLimitView => ({
  type,
  period: 'day',
  limit: l,
  minutes: null,
  used,
  remaining: null,
  pendingIncrease: null,
});

describe('participation preview checks (GP-02)', () => {
  it('35 entries: 350.00 + 1.75 platform fee + 0.00 network = 351.75; Available after 8,863.55', () => {
    const c = checkParticipation({ entries: 35, available: '9215.30', limits: [limit('0.00')] });
    expect(c.quote).toMatchObject({
      entryAmount: '350.00',
      platformFee: '1.75',
      networkFee: '0.00',
      total: '351.75',
    });
    expect(c.availableAfter).toBe('8863.55');
    expect(c.insufficient).toBe(false);
    expect(c.limit).toMatchObject({ after: '351.75', exceeded: false });
  });
  it('insufficient funds: 342.10 Available → short by 9.65, reduce to 34', () => {
    const c = checkParticipation({ entries: 35, available: '342.10', limits: null });
    expect(c.insufficient).toBe(true);
    expect(c.shortBy).toBe('9.65');
    expect(c.maxAffordable).toBe(34);
    expect(c.maxEntries).toBe(34);
  });
  it('limit reached: 210.00 used + 351.75 = 561.75 of 500.00 → reduce to 28', () => {
    const c = checkParticipation({ entries: 35, available: '9215.30', limits: [limit('210.00')] });
    expect(c.limitReached).toBe(true);
    expect(c.limit).toMatchObject({
      after: '561.75',
      remaining: '290.00',
      maxEntries: 28,
      exceeded: true,
    });
  });
  it('uses the tightest of participation and loss limits', () => {
    const c = checkParticipation({
      entries: 1,
      available: '100.00',
      limits: [limit('0.00'), limit('200.00', '200.00', 'loss')],
    });
    expect(c.limit?.type).toBe('loss');
    expect(c.limitReached).toBe(true);
    expect(c.maxEntries).toBe(0);
  });
  it('odds after buying: the new entries also grow the pool (exact, without replacement)', () => {
    const o = oddsAfter({ entries: 18_605 }, 0, 35);
    expect(o).toMatchObject({ myEntries: 35, totalEntries: 18_640, prizes: 13 });
    expect(approxPercent(o.anyPrizePercent)).toBe('≈2.41%');
    expect(approxPercent(o.firstPrizePercent)).toBe('≈0.187%'); // rounded down, never overstated
    expect(approxPercent('0.005364')).toBe('≈0.0053%');
    expect(approxPercent('100')).toBe('≈100.00%');
  });
});

describe('round phase + clocks', () => {
  const base = { opensAt: '2026-11-28T08:00:00Z', closesAt: '2026-11-28T20:00:00Z', draw: null };
  it('open status before opensAt (seed shift) is not accepting entries yet', () => {
    expect(roundPhase({ ...base, status: 'open' }, Date.parse('2026-11-28T04:00:00Z'))).toBe(
      'not_open_yet',
    );
    expect(roundPhase({ ...base, status: 'open' }, Date.parse('2026-11-28T12:00:00Z'))).toBe(
      'open',
    );
    expect(roundPhase({ ...base, status: 'open' }, Date.parse('2026-11-28T20:00:01Z'))).toBe(
      'closing',
    );
  });
  it('drawing → delayed once the VRF request is overdue', () => {
    const draw = {
      provider: 'chainlink_vrf_v2_5',
      network: 'arbitrum',
      requestId: '0x9f2c',
      requestIdDisplay: '0x9f2c',
      requestedAt: '2026-11-28T20:00:04Z',
      fulfilledAt: null,
      confirmations: 0,
      status: 'requested',
      settledAt: null,
    };
    expect(
      roundPhase({ ...base, status: 'drawing', draw }, Date.parse('2026-11-28T20:01:00Z')),
    ).toBe('drawing');
    expect(
      roundPhase({ ...base, status: 'drawing', draw }, Date.parse('2026-11-28T20:14:36Z')),
    ).toBe('delayed');
  });
  it('relative time never invents "0 s ago" for future rows', () => {
    const now = Date.parse('2026-11-28T18:45:00Z');
    expect(relativeTime('2026-11-28T18:44:12Z', now)).toBe('48 s ago');
    expect(relativeTime('2026-11-28T18:40:00Z', now)).toBe('5 min ago');
    expect(relativeTime('2026-11-28T19:44:12Z', now)).toBe('19:44 UTC');
  });
  it('formats countdowns', () => {
    expect(clock(hmsOf((3 * 3600 + 17 * 60 + 42) * 1000))).toBe('03:17:42');
  });
});

describe('DEMO clock (mock data follows the real clock)', () => {
  it('shifts by whole days so round #1,248 closes at the next 20:00 UTC', () => {
    expect(demoShiftDays(Date.parse('2026-11-27T18:44:30Z'))).toBe(0);
    expect(demoShiftDays(Date.parse('2026-11-28T04:00:00Z'))).toBe(1);
    expect(demoShiftDays(Date.parse('2026-12-03T19:30:00Z'))).toBe(6);
    expect(shiftIso('2026-11-27T20:00:00Z', 1)).toBe('2026-11-28T20:00:00Z');
    expect(demoBetweenRoundsShiftDays(Date.parse('2026-11-28T09:00:00Z'))).toBe(1);
  });
  it('homepage snapshot: serverNow is the real now and the close is in the future', () => {
    const now = Date.parse('2026-12-01T10:15:00Z');
    const s = mockPoolSnapshot({ round: 'active', region: 'permitted' }, now);
    expect(s.serverNow).toBe('2026-12-01T10:15:00.000Z');
    expect(s.current?.closesAt).toBe('2026-12-01T20:00:00Z');
    const none = mockPoolSnapshot(
      { round: 'none', region: 'permitted' },
      Date.parse('2026-12-01T22:00:00Z'),
    );
    expect(none.next.opensAt).toBe('2026-12-02T08:00:00Z');
  });
});

describe('dev preview flags', () => {
  it('parses known flags only when enabled', () => {
    expect(parsePoolPreview('participate,wrong-network,nope', true).flags).toEqual([
      'participate',
      'wrong-network',
    ]);
    expect(parsePoolPreview('restricted', false).flags).toEqual([]);
  });
});

// ── draw verification against the Solidity-proven fixture (packages/contracts) ─────────────────

interface Fixture {
  round: { roundId: number; prizeSplitBps: number[] };
  entries: { totalEntries: number; poolAmount: string };
  draw: { randomWord: string; winners: number[] };
  settlement: { prizeAmounts: string[] };
}
const fx = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../packages/contracts/test/fixtures/round-1248.json'),
    'utf8',
  ),
) as Fixture;
const units = (u: string) => `${u.slice(0, -6) || '0'}.${u.slice(-6)}`;

function fixtureBundle(): PoolVerification {
  return {
    round: {
      id: 'r',
      number: 1248,
      status: 'settled',
      totalEntries: fx.entries.totalEntries,
      pool: units(fx.entries.poolAmount),
    },
    algorithm: {
      name: 'GLOBAL_POOL_WINNERS_V1',
      domain: '',
      description: '',
      roundIdUsed: String(fx.round.roundId),
      prizeSplitBps: fx.round.prizeSplitBps,
      entryOrder: 'seq',
    },
    randomness: {
      provider: 'chainlink',
      requestId: '0x9f2c41d7',
      randomWord: `0x${BigInt(fx.draw.randomWord).toString(16)}`,
      requestedAt: '2026-11-27T20:00:04Z',
      fulfilledAt: '2026-11-27T20:00:41Z',
      fulfillTxHash: null,
    },
    winners: fx.draw.winners.map((idx, i) => ({
      place: i + 1,
      tier: i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : 'runner_up',
      handle: null,
      entryId: null,
      entrySeq: idx + 1,
      amount: units(fx.settlement.prizeAmounts[i]!),
    })),
    recomputed: { matchesStoredWinners: true },
  };
}

describe('in-browser draw verification (GP-12) with @gp/contracts/verify', () => {
  const closes = { closesAt: '2026-11-27T20:00:00Z' };
  it('re-derives the 13 winners and prize amounts of the contract fixture', () => {
    const r = verifyDraw(fixtureBundle(), closes);
    expect(r.state).toBe('verified');
    expect(r.winners.map((w) => w.entrySeq - 1)).toEqual(fx.draw.winners);
    expect(r.winners.every((w) => w.matches)).toBe(true);
    expect(r.checks.find((c) => c.id === 'prizes')?.status).toBe('passed');
  });
  it('a pasted random word that differs by one digit fails', () => {
    const b = fixtureBundle();
    const word = b.randomness!.randomWord!;
    const tampered = word.slice(0, -1) + (word.endsWith('f') ? 'e' : 'f');
    const r = verifyDraw(b, closes, tampered);
    expect(r.state).toBe('failed');
    expect(r.checks.find((c) => c.id === 'randomness')?.status).toBe('failed');
    expect(r.checks.find((c) => c.id === 'winners')?.status).toBe('failed');
    expect(r.checks.find((c) => c.id === 'prizes')?.status).toBe('skipped');
  });
  it('a request made before entries closed fails the first check', () => {
    const r = verifyDraw(fixtureBundle(), { closesAt: '2026-11-27T20:30:00Z' });
    expect(r.checks[0]).toMatchObject({ id: 'request', status: 'failed' });
  });
  it('DEV mock VRF: the word must equal keccak256("GP_MOCK_VRF:" + requestId)', () => {
    const b = fixtureBundle();
    b.randomness = { ...b.randomness!, provider: 'mock', requestId: 'mock-1248-x' };
    const r = verifyDraw(b, closes);
    expect(r.checks.find((c) => c.id === 'randomness')?.status).toBe('failed');
    b.randomness.randomWord = mockVrfWord('mock-1248-x');
    expect(verifyDraw(b, closes).checks.find((c) => c.id === 'randomness')?.status).toBe('passed');
  });
  it('cancelled rounds and snapshot history rounds are unavailable, not "failed"', () => {
    const b = fixtureBundle();
    expect(verifyDraw({ ...b, round: { ...b.round, status: 'cancelled' } }, closes).state).toBe(
      'unavailable',
    );
    expect(verifyDraw({ ...b, randomness: null }, closes).state).toBe('unavailable');
  });
});
