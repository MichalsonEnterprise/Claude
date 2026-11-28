/**
 * Pool Roulette (key "roulette") — pure table logic: spots and labels, the bet slip (chips, limits, Repeat), previews
 * computed with the SAME shared rule module the API settles with, felt geometry, and browser verification of a roulette
 * outcome whose JSONB keys come back re-ordered. DEMO credits only — amounts are decimal strings, never floats.
 */
import { playInstant, roulette, sha256Hex } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { describe, expect, it } from 'vitest';

import { verifyInBrowser } from '@/components/games/kit/verify';
import {
  CHIPS,
  OUTSIDE_SPOTS,
  WHEEL_ORDER,
  addChip,
  cellOf,
  chipFace,
  chipFor,
  chipPosition,
  coveredPockets,
  covers,
  expectedReturn,
  feltZones,
  fromBets,
  insideOptionsFor,
  isValidSpot,
  maxPayout,
  numberAt,
  outcomePreview,
  pocketFacts,
  removeChip,
  returnedOn,
  signed,
  slipProblems,
  slipTotal,
  spotKey,
  spotLabel,
  toParams,
  toSlipBet,
  type Slip,
} from '@/components/games/roulette/roulette-math';
import type { BetVerification } from '@/lib/api/games';

/** Decision #35 demo slip: Straight 19 5.00 + Red 10.00 + 2nd dozen 5.00 = 20.00. */
const DEMO: Slip = [
  toSlipBet({ type: 'straight', numbers: [19] }, '5.00'),
  toSlipBet({ type: 'red' }, '10.00'),
  toSlipBet({ type: 'dozen', numbers: [2] }, '5.00'),
];

describe('wheel and layout', () => {
  it('has the 37 European pockets once each, 0 first', () => {
    expect(WHEEL_ORDER).toHaveLength(37);
    expect(new Set(WHEEL_ORDER).size).toBe(37);
    expect(WHEEL_ORDER[0]).toBe(0);
    expect(WHEEL_ORDER.slice(1, 4)).toEqual([32, 15, 19]);
  });
  it('maps felt cells both ways (top row 3 · 6 · 9 …)', () => {
    expect(numberAt(0, 0)).toBe(3);
    expect(numberAt(2, 0)).toBe(1);
    expect(numberAt(1, 6)).toBe(20);
    for (let n = 1; n <= 36; n++) {
      const { row, col } = cellOf(n);
      expect(numberAt(row, col)).toBe(n);
    }
  });
  it('generates every inside target exactly once, all valid for the server', () => {
    const z = feltZones();
    const keys = z.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(z.every((q) => isValidSpot(q.spot))).toBe(true);
    const count = (t: string) => z.filter((q) => q.spot.type === t).length;
    // 57 number splits + 3 zero splits · 12 streets + 2 trios · 22 corners + first four · 11 lines
    expect(count('split')).toBe(60);
    expect(count('street')).toBe(14);
    expect(count('corner')).toBe(23);
    expect(count('line')).toBe(11);
  });
  it('puts split / corner / line chips on the shared line, edge or crossing', () => {
    expect(chipPosition({ type: 'split', numbers: [17, 20] })).toEqual({ x: 6, y: 1.5 });
    expect(chipPosition({ type: 'split', numbers: [19, 20] })).toEqual({ x: 6.5, y: 2 });
    expect(chipPosition({ type: 'corner', numbers: [22, 23, 25, 26] })).toEqual({ x: 8, y: 2 }); // 22 · 25 bottom row, 23 · 26 middle
    expect(chipPosition({ type: 'street', numbers: [31, 32, 33] })).toEqual({ x: 10.5, y: 3 });
    expect(chipPosition({ type: 'line', numbers: [1, 2, 3, 4, 5, 6] })).toEqual({ x: 1, y: 3 });
    expect(chipPosition({ type: 'corner', numbers: [0, 1, 2, 3] })).toEqual({ x: 0, y: 3 });
    expect(chipPosition({ type: 'red' })).toBeNull();
  });
  it('outside boxes cover what the shared rules say', () => {
    expect(OUTSIDE_SPOTS.columns.map((s) => covers(s)[0])).toEqual([3, 2, 1]);
    expect(covers(OUTSIDE_SPOTS.dozens[1]!)).toEqual(Array.from({ length: 12 }, (_, i) => 13 + i));
    expect(covers({ type: 'red' })).toEqual([...roulette.RED_NUMBERS]);
  });
});

describe('bet-type options for one number (mobile sheet · keyboard B)', () => {
  it('lists straight, splits, street, corners and lines covering 19', () => {
    const labels = insideOptionsFor(19).map(spotLabel);
    expect(labels[0]).toBe('Straight · 19');
    expect(labels).toEqual(
      expect.arrayContaining(['Split · 16 | 19', 'Split · 19 | 22', 'Split · 19 | 20', 'Street · 19–21', 'Corner · 19 · 20 · 22 · 23', 'Corner · 16 · 17 · 19 · 20', 'Line · 16–21', 'Line · 19–24']),
    );
    expect(labels).not.toContain('Split · 18 | 19'); // 18 and 19 are not neighbours on the felt
    expect(insideOptionsFor(19).every((s) => covers(s).includes(19))).toBe(true);
  });
  it('offers the zero bets on 0 and on 1 · 2 · 3', () => {
    expect(insideOptionsFor(0).map(spotLabel)).toEqual([
      'Straight · 0',
      'Split · 0 | 1',
      'Split · 0 | 2',
      'Split · 0 | 3',
      'Trio · 0 · 1 · 2',
      'Trio · 0 · 2 · 3',
      'First four · 0–3',
    ]);
    expect(insideOptionsFor(2).map(spotLabel)).toEqual(expect.arrayContaining(['Split · 0 | 2', 'Trio · 0 · 1 · 2', 'Trio · 0 · 2 · 3', 'First four · 0–3']));
    expect(insideOptionsFor(36).map(spotLabel)).toEqual(expect.arrayContaining(['Line · 31–36', 'Street · 34–36', 'Corner · 32 · 33 · 35 · 36']));
  });
});

describe('bet slip', () => {
  it('stacks chips on a spot and keeps one row per spot (same identity as the server)', () => {
    let s: Slip = [];
    s = addChip(s, { type: 'straight', numbers: [19] }, '5.00').slip;
    s = addChip(s, { type: 'straight', numbers: [19] }, '0.10').slip;
    s = addChip(s, { type: 'split', numbers: [20, 17] }, '1.00').slip;
    expect(s).toHaveLength(2);
    expect(s[0]!.amount).toBe('5.10');
    expect(s[1]!.key).toBe(spotKey({ type: 'split', numbers: [17, 20] }));
    expect(slipTotal(s)).toBe('6.10');
    s = removeChip(s, s[0]!.key, '5.00');
    expect(s[0]!.amount).toBe('0.10');
    s = removeChip(s, s[0]!.key, '5.00');
    expect(s).toHaveLength(1);
  });
  it('refuses a 61st spot and invalid spots', () => {
    let s: Slip = [];
    for (let n = 0; n <= 36; n++) s = addChip(s, { type: 'straight', numbers: [n] }, '0.10').slip;
    for (const z of feltZones().slice(0, 23)) s = addChip(s, z.spot, '0.10').slip;
    expect(s).toHaveLength(60);
    expect(addChip(s, { type: 'red' }, '1.00').error).toBe('max_spots');
    expect(addChip([], { type: 'split', numbers: [18, 19] }, '1.00').error).toBe('invalid');
  });
  it('flags (never changes) a spot over 1,000.00, the table max and the balance', () => {
    const over: Slip = [toSlipBet({ type: 'straight', numbers: [19] }, '1200.00'), ...DEMO.slice(1)];
    const p = slipProblems(over, '9215.30');
    expect(p).toEqual([expect.objectContaining({ kind: 'spot_above_max', over: '200.00', label: 'Straight · 19' })]);
    expect(over[0]!.amount).toBe('1200.00');
    const table: Slip = [1, 2, 3, 4, 5, 6].map((n) => toSlipBet({ type: 'straight', numbers: [n] }, '900.00'));
    expect(slipProblems(table, null)).toEqual([expect.objectContaining({ kind: 'table_max', total: '5400.00', over: '400.00' })]);
    expect(slipProblems(DEMO, '4.20')).toEqual([expect.objectContaining({ kind: 'insufficient', short: '15.80' })]);
    expect(slipProblems(DEMO, '20.00')).toEqual([]);
  });
  it('round-trips through the API params (Repeat / “Repeat these bets”)', () => {
    const params = toParams(DEMO);
    expect(params).toEqual({
      bets: [
        { type: 'straight', numbers: [19], amount: '5.00' },
        { type: 'red', amount: '10.00' },
        { type: 'dozen', numbers: [2], amount: '5.00' },
      ],
    });
    expect(fromBets(params.bets)).toEqual(DEMO);
    expect(fromBets([{ type: 'split', numbers: [18, 19], amount: '1.00' }, { type: 'nope', amount: '1' }])).toEqual([]);
  });
});

describe('previews from the shared rules (decision #35 numbers)', () => {
  it('returns 215.00 on 19 and groups every pocket by net', () => {
    expect(returnedOn(DEMO, 19).toFixed(2)).toBe('215.00');
    expect(maxPayout(DEMO)).toEqual({ amount: '215.00', pockets: [19] });
    const g = outcomePreview(DEMO).map((x) => [x.pockets.length, x.net]);
    expect(g).toEqual([
      [1, '195.00'],
      [5, '15.00'],
      [12, '0.00'],
      [6, '-5.00'],
      [13, '-20.00'],
    ]);
    expect(expectedReturn(DEMO)).toBe('19.46'); // 720 ÷ 37 = 19.459… — the 2.70 % edge
    expect(coveredPockets(DEMO)).toBe(24);
  });
  it('matches the server settlement for every pocket', () => {
    for (let p = 0; p < 37; p++) {
      const settled = roulette.playRoulette({ serverSeed: 'x', clientSeed: 'y', nonce: 0 }, toParams(DEMO).bets);
      const forced = settled.bets.map((b) => (b.covered.includes(p) ? money(b.amount).times(roulette.ROULETTE_PAYOUTS[b.type] + 1) : money(0)));
      expect(returnedOn(DEMO, p).eq(forced.reduce((a, b) => a.plus(b), money(0)))).toBe(true);
    }
  });
  it('formats labels and facts', () => {
    expect(signed('195')).toBe('+195.00');
    expect(signed('0')).toBe('±0.00');
    expect(pocketFacts(19)).toBe('Red · odd · 2nd dozen (13–24) · 1st column · high (19–36)');
    expect(pocketFacts(0)).toMatch(/^Zero/);
    expect(chipFor('12.50').label).toBe('10');
    expect(chipFor('0.10').label).toBe('0.10');
    expect(chipFace('1200.00')).toBe('1.2k');
    expect(chipFace('15.00')).toBe('15');
    expect(CHIPS.map((c) => c.value)).toEqual(['0.10', '1.00', '5.00', '10.00', '25.00', '100.00', '500.00']);
  });
});

describe('browser verification of a roulette spin', () => {
  const serverSeed = 'c71d0a58'.repeat(8);
  const seed = { serverSeed, clientSeed: 'nova-k-7f2a91', nonce: 417 };
  const params = toParams(DEMO);
  const settled = playInstant('pool-roulette', seed, params, undefined);
  // JSONB re-orders keys (shorter keys first): the recorded outcome must still verify
  const reorder = (o: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.keys(o)
        .sort((a, b) => a.length - b.length || a.localeCompare(b))
        .map((k) => [k, Array.isArray(o[k]) ? (o[k] as unknown[]).map((x) => (x && typeof x === 'object' ? reorder(x as Record<string, unknown>) : x)) : o[k]]),
    );
  const v: BetVerification = {
    bet: {
      id: 'b',
      ref: 'RL-88191',
      game: { slug: 'pool-roulette', name: 'Pool Roulette' },
      status: 'settled',
      stake: settled.stake,
      payout: settled.payout,
      net: money(settled.payout).minus(money(settled.stake)).toFixed(2),
      multiplier: settled.multiplier,
      win: settled.win,
      fee: '0.00',
      params,
      outcome: reorder({ ...settled.outcome, win: settled.win }),
      fairness: { seedPairId: 's', serverSeedHash: sha256Hex(serverSeed), clientSeed: seed.clientSeed, nonce: 417, revealed: true },
      rulesVersion: 'pool-roulette/1',
      currency: 'DEMO',
      createdAt: '2026-11-28T00:00:00Z',
      settledAt: '2026-11-28T00:00:00Z',
      isDemo: true,
    },
    verify: {
      game: 'pool-roulette',
      rulesVersion: 'pool-roulette/1',
      serverSeedHash: sha256Hex(serverSeed),
      serverSeed,
      clientSeed: seed.clientSeed,
      nonce: 417,
      stake: settled.stake,
      params,
      stream: '',
      library: '',
    },
    revealed: true,
    commitmentValid: true,
    recomputed: null,
    matches: true,
    message: '',
    isDemo: true,
  };
  it('matches a recorded spin whose nested keys came back in another order', () => {
    expect(JSON.stringify(v.bet.outcome)).not.toBe(JSON.stringify({ ...settled.outcome, win: settled.win }));
    const r = verifyInBrowser(v, seed);
    expect(r.ok).toBe(true);
    expect(r.matches).toBe(true);
    expect((r.result?.outcome as { pocket: number }).pocket).toBe((settled.outcome as { pocket: number }).pocket);
  });
  it('still shows a mismatch for another client seed', () => {
    const other = verifyInBrowser(v, { ...seed, clientSeed: 'someone-else' });
    const same = (other.result?.outcome as { pocket: number }).pocket === (settled.outcome as { pocket: number }).pocket;
    expect(same ? true : !other.matches).toBe(true);
  });
});
