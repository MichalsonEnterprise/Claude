/**
 * RTP proofs.
 * 1. EXACT: every published table / formula is evaluated over its full outcome space with exact decimal or BigInt
 *    maths — the RTP can never exceed the published value (except the designers' Pinfall 16·Medium board, 99.016 %).
 * 2. MONTE-CARLO with FIXED seeds (deterministic, so never flaky): the HMAC stream + integer mappings produce the
 *    expected distribution — measured RTP within 4.5 standard errors of the exact RTP (≈ 1 in 150,000 chance of a
 *    false alarm for an unbiased game, and a bias larger than the tolerance fails every time).
 */
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  blackjack,
  coinflip,
  crash,
  dice,
  hilo,
  keno,
  mines,
  playInstant,
  plinko,
  wheel,
} from '../../src/fair';
import type { BjState } from '../../src/fair';
import { money } from '../../src/money';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const SERVER = sha('gp-rtp-monte-carlo-server-seed');
const CLIENT = 'rtp-client';
const seedAt = (nonce: number) => ({ serverSeed: SERVER, clientSeed: CLIENT, nonce });

/** Runs `n` fixed-seed bets of 1 unit; returns mean return and standard error. */
function monteCarlo(n: number, ret: (nonce: number) => number) {
  let sum = 0;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const r = ret(i);
    sum += r;
    sq += r * r;
  }
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
  return { mean, se: sd / Math.sqrt(n) };
}
function expectRtp(mc: { mean: number; se: number }, expected: number) {
  expect(Math.abs(mc.mean - expected)).toBeLessThanOrEqual(4.5 * mc.se + 1e-9);
}
const E = 1n << 52n;
const T = 60_000;

describe('exact RTP of the published formulas and tables', () => {
  it('Pool Dice: every target returns ≤ 99.00 % and ≥ 98.98 % (multiplier truncated to 4 dp)', () => {
    for (let t = 1; t <= 9999; t++) {
      for (const condition of ['over', 'under'] as const) {
        const chance = condition === 'over' ? 10_000 - t : t; // in hundredths of a percent
        if (chance < 1 || chance > 9800) continue;
        const target = dice.hundredths(t);
        const rtp = money(chance).div(10_000).times(dice.diceMultiplier({ target, condition }));
        expect(rtp.lte('0.99')).toBe(true);
        expect(rtp.gte('0.9898')).toBe(true);
      }
    }
  });

  it('Double Side: 50 % × 1.96 = 98.00 %', () => {
    expect(money('0.5').times(coinflip.COINFLIP_RULES.multiplier).toFixed(2)).toBe('0.98');
  });

  it('Skyline: RTP = target × floor(99·2⁵² / (100·target)) / 2⁵² ≤ 99.00 % for every target', () => {
    for (let k = 101; k <= 100_000; k += k < 1000 ? 1 : 97) {
      const wins = (99n * E) / BigInt(k); // count of 52-bit values that win
      const rtp = money(k).div(100).times(money(wins)).div(money(E));
      expect(rtp.lte('0.99')).toBe(true);
      expect(rtp.gt('0.98999999')).toBe(true);
    }
  });

  it('Orbit Rush: RTP at any cash-out target = 0.99 × target × floor(100·2⁵² / k) / 2⁵² ≤ 99.00 %', () => {
    for (let k = 101; k <= 100_000; k += k < 1000 ? 1 : 97) {
      const reach = (100n * E) / BigInt(k);
      const rtp = money('0.99').times(money(k).div(100)).times(money(reach)).div(money(E));
      expect(rtp.lte('0.99')).toBe(true);
      expect(rtp.gt('0.98999999')).toBe(true);
    }
  });

  it('Fortune Ring: every ring 99.00 %', () => {
    for (const risk of wheel.WHEEL_RISKS)
      for (const segments of wheel.WHEEL_SEGMENTS)
        expect(wheel.wheelRtp({ risk, segments }).toFixed(12)).toBe('0.990000000000');
  });

  it('Pool Keno: every table 98.65 %–99.00 %', () => {
    for (const risk of keno.KENO_RISKS) {
      for (let p = 1; p <= 10; p++) {
        const r = keno.kenoRtp(risk, p);
        expect(r.lte('0.99')).toBe(true);
        expect(r.gte('0.9865')).toBe(true);
        // probabilities sum to 1
        let total = money(0);
        for (let h = 0; h <= p; h++) total = total.plus(keno.kenoHitChance(p, h));
        expect(total.toFixed(20)).toBe(money(1).toFixed(20));
      }
    }
  });

  it('Pinfall: every board 98.98 %–99.00 %, the designers’ 16·Medium 99.016 %', () => {
    for (const risk of plinko.PLINKO_RISKS) {
      for (let rows = 8; rows <= 16; rows++) {
        const r = plinko.plinkoRtp({ rows, risk });
        if (risk === 'medium' && rows === 16) {
          expect(r.toFixed(6)).toBe('0.990164');
          continue;
        }
        expect(r.lte('0.99')).toBe(true);
        expect(r.gte('0.9898')).toBe(true);
      }
    }
  });

  it('Vault Sweeper: cash-out after k gems returns ≤ 99.00 % for every mines / k', () => {
    for (let m = 1; m <= 24; m++) {
      for (let k = 1; k <= 25 - m; k++) {
        // P(k gems) = num / den exactly; compare num × multiplier with 0.99 × den (no division)
        let num = 1n;
        let den = 1n;
        for (let i = 0; i < k; i++) {
          num *= BigInt(25 - m - i);
          den *= BigInt(25 - i);
        }
        const returned = money(num).times(mines.minesMultiplier(m, k));
        expect(returned.lte(money(den).times('0.99'))).toBe(true);
        expect(returned.gte(money(den).times('0.98'))).toBe(true);
      }
    }
  });
});

describe('Monte-Carlo RTP with fixed seeds (stream + mappings are unbiased)', () => {
  it('Pool Dice over 50.50 and under 10.00', { timeout: T }, () => {
    const over = monteCarlo(200_000, (n) => {
      const o = dice.playDice(seedAt(n), { target: '50.50', condition: 'over' });
      return o.win ? 2 : 0;
    });
    expectRtp(over, 0.99);
    const under = monteCarlo(200_000, (n) => {
      const o = dice.playDice(seedAt(n), { target: '10.00', condition: 'under' });
      return o.win ? 9.9 : 0;
    });
    expectRtp(under, 0.99);
  });

  it('Double Side', { timeout: T }, () => {
    expectRtp(
      monteCarlo(200_000, (n) =>
        coinflip.playCoinflip(seedAt(n), { pick: n % 2 ? 'heads' : 'tails' }).win ? 1.96 : 0,
      ),
      0.98,
    );
  });

  it('Pool Roulette: red and straight up; pockets uniform (chi-square)', { timeout: T }, () => {
    const counts = new Array<number>(37).fill(0);
    const red = monteCarlo(200_000, (n) => {
      const r = playInstant(
        'pool-roulette',
        seedAt(n),
        { bets: [{ type: 'red', amount: '1.00' }] },
        undefined,
      );
      counts[(r.outcome as { pocket: number }).pocket]! += 1;
      return Number(r.payout);
    });
    expectRtp(red, 36 / 37);
    const exp = 200_000 / 37;
    const chi = counts.reduce((a, c) => a + (c - exp) ** 2 / exp, 0);
    expect(chi).toBeLessThan(67.98); // p = 0.001, 36 df
    const straight = monteCarlo(200_000, (n) => {
      const r = playInstant(
        'pool-roulette',
        seedAt(n),
        { bets: [{ type: 'straight', numbers: [19], amount: '1.00' }] },
        undefined,
      );
      return Number(r.payout);
    });
    expectRtp(straight, 36 / 37);
  });

  it('Skyline target 2.00', { timeout: T }, () => {
    expectRtp(
      monteCarlo(200_000, (n) => (crash.playLimbo(seedAt(n), { target: '2.00' }).win ? 2 : 0)),
      0.99,
    );
  });

  it(
    'Orbit Rush crash points: cash-out at 2.00× and 10.00×, instant-crash rate ≈ 1 %',
    { timeout: T },
    () => {
      let instant = 0;
      const points: number[] = [];
      for (let i = 0; i < 200_000; i++) {
        const cp = crash.crashPointOf(sha(`crash-round-${i}`), 'gp-orbit-rush-salt');
        if (cp.instant) instant += 1;
        points.push(Number(cp.crashPoint));
      }
      const at = (m: number) => monteCarlo(points.length, (i) => (points[i]! >= m ? m : 0));
      expectRtp(at(2), 0.99);
      expectRtp(at(10), 0.99);
      expectRtp(at(1.01), 0.99);
      expect(Math.abs(instant / 200_000 - 0.01)).toBeLessThan(
        4.5 * Math.sqrt((0.01 * 0.99) / 200_000),
      );
    },
  );

  it('Fortune Ring medium · 30', { timeout: T }, () => {
    expectRtp(
      monteCarlo(100_000, (n) =>
        Number(wheel.playWheel(seedAt(n), { risk: 'medium', segments: 30 }).multiplier),
      ),
      0.99,
    );
  });

  it('Pool Keno 6 picks Classic', { timeout: T }, () => {
    const exact = keno.kenoRtp('classic', 6).toNumber();
    expectRtp(
      monteCarlo(100_000, (n) =>
        Number(
          keno.playKeno(seedAt(n), { picks: [3, 11, 17, 24, 30, 38], risk: 'classic' }).multiplier,
        ),
      ),
      exact,
    );
  });

  it('Pinfall 16 · low and 8 · high', { timeout: T }, () => {
    for (const p of [
      { rows: 16, risk: 'low' as const },
      { rows: 8, risk: 'high' as const },
    ]) {
      expectRtp(
        monteCarlo(100_000, (n) => Number(plinko.playPlinko(seedAt(n), p).multiplier)),
        plinko.plinkoRtp(p).toNumber(),
      );
    }
  });

  it('Vault Sweeper: 3 mines, cash out after 3 gems', { timeout: T }, () => {
    const exact = money('0.99').div(mines.minesExactMultiplier(3, 3)).times('1.47').toNumber();
    expectRtp(
      monteCarlo(100_000, (n) => {
        const r = mines.replayMines(seedAt(n), 3, '1.00', [0, 1, 2], true);
        return Number(r.payout);
      }),
      exact,
    );
  });

  it('High Card: two calls then cash out (1 % edge per call)', { timeout: T }, () => {
    const pick = (rank: number): hilo.HiloCall =>
      rank === 1
        ? 'lower_or_same'
        : rank === 13
          ? 'higher_or_same'
          : rank <= 7
            ? 'higher_or_same'
            : 'lower_or_same';
    // exact expectation over every (start, card 2, card 3) rank triple
    let exact = money(0);
    for (let r1 = 1; r1 <= 13; r1++) {
      for (let r2 = 1; r2 <= 13; r2++) {
        for (let r3 = 1; r3 <= 13; r3++) {
          const c1 = pick(r1);
          const c2 = pick(r2);
          const w1 = c1 === 'higher_or_same' ? r2 >= r1 : r2 <= r1;
          const w2 = c2 === 'higher_or_same' ? r3 >= r2 : r3 <= r2;
          if (!w1 || !w2) continue;
          const m = hilo.hiloStepMultiplier(r1, c1).times(hilo.hiloStepMultiplier(r2, c2));
          exact = exact.plus(m.toDecimalPlaces(2, 1));
        }
      }
    }
    exact = exact.div(13 ** 3);
    expect(exact.lte(money('0.99').pow(2))).toBe(true);
    expectRtp(
      monteCarlo(100_000, (n) => {
        const deck = new hilo.HiloDeck(seedAt(n));
        const s = hilo.hiloStart(deck);
        for (let i = 0; i < 2 && s.status === 'active'; i++) {
          hilo.hiloPlay(s, deck, pick(hilo.rankOf(hilo.hiloCurrent(s))), '1.00');
        }
        if (s.status === 'active') hilo.hiloCashOut(s, '1.00');
        return Number(s.payout);
      }),
      exact.toNumber(),
    );
  });

  it(
    'Twenty-One with basic strategy ≈ 99.5 % (6 decks, S17, DAS, peek, no surrender)',
    { timeout: 120_000 },
    () => {
      const mc = monteCarlo(200_000, (n) => {
        const shoe = new blackjack.Shoe(seedAt(n));
        const s = blackjack.bjDeal(shoe, '1.00');
        while (s.phase !== 'settled') blackjack.bjApply(s, shoe, basicStrategy(s));
        // return per initial unit bet (house edge convention): 1 + net
        return 1 + Number(s.totalPayout) - Number(s.totalStake);
      });
      expect(mc.mean).toBeGreaterThan(0.985);
      expect(mc.mean).toBeLessThan(1.005);
      expectRtp(mc, 0.9955);
    },
  );
});

/** Basic strategy for 6 decks, S17, DAS, split once, no surrender; never insurance. */
function basicStrategy(s: BjState): blackjack.BjAction {
  const allowed = blackjack.allowedActions(s);
  if (allowed.includes('insurance')) return { type: 'insurance', accept: false };
  const h = s.hands[s.active]!;
  const up = blackjack.cardValue(s.dealer[0]!);
  const d = up === 1 ? 11 : up;
  const can = (a: blackjack.BjActionType) => allowed.includes(a);
  const { total, soft } = blackjack.handValue(h.cards);
  if (can('split')) {
    const v = blackjack.cardValue(h.cards[0]!);
    const split =
      v === 1 ||
      v === 8 ||
      (v === 9 && d !== 7 && d !== 10 && d !== 11) ||
      (v === 7 && d <= 7) ||
      (v === 6 && d <= 6) ||
      (v === 4 && (d === 5 || d === 6)) ||
      ((v === 2 || v === 3) && d <= 7);
    if (split) return { type: 'split' };
  }
  const dbl = (cond: boolean, otherwise: 'hit' | 'stand'): blackjack.BjAction =>
    cond && can('double') ? { type: 'double' } : { type: otherwise };
  if (soft) {
    if (total >= 19) return { type: 'stand' };
    if (total === 18)
      return d >= 3 && d <= 6 ? dbl(true, 'stand') : d >= 9 ? { type: 'hit' } : { type: 'stand' };
    if (total === 17) return dbl(d >= 3 && d <= 6, 'hit');
    if (total >= 15) return dbl(d >= 4 && d <= 6, 'hit');
    return dbl(d >= 5 && d <= 6, 'hit');
  }
  if (total >= 17) return { type: 'stand' };
  if (total >= 13) return d <= 6 ? { type: 'stand' } : { type: 'hit' };
  if (total === 12) return d >= 4 && d <= 6 ? { type: 'stand' } : { type: 'hit' };
  if (total === 11) return dbl(d <= 10, 'hit');
  if (total === 10) return dbl(d <= 9, 'hit');
  if (total === 9) return dbl(d >= 3 && d <= 6, 'hit');
  return { type: 'hit' };
}
