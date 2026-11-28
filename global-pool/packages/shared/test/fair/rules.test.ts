import { describe, expect, it } from 'vitest';

import {
  FAIR_GAMES,
  FairError,
  blackjack,
  coinflip,
  crash,
  dice,
  hilo,
  keno,
  mines,
  parseStake,
  payoutOf,
  playInstant,
  plinko,
  roulette,
  verifyBet,
  wheel,
} from '../../src/fair';
import type { BjState } from '../../src/fair';

const seed = { serverSeed: 'c71d0a58'.repeat(8), clientSeed: 'nova-k-7f2a91', nonce: 417 };

describe('DEMO credits', () => {
  it('stakes: ≤ 2 decimals inside the limits', () => {
    expect(parseStake('10.00', '0.10', '1000.00').toFixed(2)).toBe('10.00');
    expect(() => parseStake('0.09', '0.10', '1000.00')).toThrow(/minimum/);
    expect(() => parseStake('1000.01', '0.10', '1000.00')).toThrow(/maximum/);
    expect(() => parseStake('1.005', '0.10', '1000.00')).toThrow(/decimals/);
    expect(() => parseStake('abc', '0.10', '1000.00')).toThrow(FairError);
  });
  it('payouts are truncated to 6 decimals, never rounded up', () => {
    expect(payoutOf('10.00', '1.9603').toFixed()).toBe('19.603');
    expect(payoutOf('0.11', '1.9603').toFixed()).toBe('0.215633');
  });
});

describe('Pool Dice (decision #34)', () => {
  it('win chance and multiplier examples', () => {
    expect(dice.diceWinChance({ target: '34.00', condition: 'over' }).toFixed(2)).toBe('66.00');
    expect(dice.diceMultiplier({ target: '34.00', condition: 'over' })).toBe('1.5000');
    expect(dice.diceMultiplier({ target: '50.50', condition: 'over' })).toBe('2.0000');
    expect(dice.diceMultiplier({ target: '50.50', condition: 'under' })).toBe('1.9603');
    expect(dice.diceMultiplier({ target: '2.00', condition: 'over' })).toBe('1.0102');
    expect(dice.diceMultiplier({ target: '99.99', condition: 'over' })).toBe('9900.0000');
    expect(dice.diceMultiplier({ target: '0.01', condition: 'under' })).toBe('9900.0000');
  });
  it('limits: win chance 0.01–98.00 %', () => {
    expect(() => dice.diceWinChance({ target: '1.99', condition: 'over' })).toThrow(/98.00/);
    expect(() => dice.diceWinChance({ target: '98.01', condition: 'under' })).toThrow(FairError);
    expect(() => dice.diceWinChance({ target: '0.00', condition: 'under' })).toThrow(FairError);
    expect(() => dice.diceWinChance({ target: '50.5', condition: 'over' })).toThrow(FairError);
  });
  it('over T wins on T itself, under T wins strictly below T', () => {
    const roll = dice.diceRollInt(seed); // fixed by the seeds
    const t = dice.hundredths(roll);
    if (roll >= 200 && roll <= 9999) {
      expect(dice.playDice(seed, { target: t, condition: 'over' }).win).toBe(true);
    }
    if (roll >= 1 && roll <= 9800) {
      expect(dice.playDice(seed, { target: t, condition: 'under' }).win).toBe(false);
    }
  });
  it('the result is the same whatever you bet on', () => {
    const a = playInstant('pool-dice', seed, { target: '50.50', condition: 'over' }, '10.00');
    const b = playInstant('pool-dice', seed, { target: '20.00', condition: 'under' }, '999.00');
    expect(a.outcome.roll).toBe(b.outcome.roll);
  });
});

describe('Double Side', () => {
  it('heads iff the first 4 bytes are below 2^31; a correct call pays 1.96×', () => {
    const r = coinflip.playCoinflip(seed, { pick: 'heads' });
    expect(r.side).toBe(r.u32 < 2 ** 31 ? 'heads' : 'tails');
    const pick = r.side;
    const win = playInstant('double-side', seed, { pick }, '10.00');
    expect(win.payout).toBe('19.60');
    const lose = playInstant(
      'double-side',
      seed,
      { pick: pick === 'heads' ? 'tails' : 'heads' },
      '10.00',
    );
    expect(lose.payout).toBe('0.00');
    expect(() => playInstant('double-side', seed, { pick: 'edge' }, '10.00')).toThrow(FairError);
  });
});

describe('Pool Roulette (decision #35)', () => {
  it('layout: 37 straights, 60 splits, 14 streets, 23 corners, 11 six lines', () => {
    const count = (type: roulette.RouletteBetType, combos: number[][]) =>
      combos.filter((ns) => {
        try {
          roulette.coveredNumbers({ type, numbers: ns });
          return true;
        } catch {
          return false;
        }
      }).length;
    const pairs: number[][] = [];
    for (let a = 0; a <= 36; a++) for (let b = a + 1; b <= 36; b++) pairs.push([a, b]);
    expect(count('split', pairs)).toBe(60);
    expect(roulette.coveredNumbers({ type: 'street', numbers: [0, 2, 3] })).toEqual([0, 2, 3]);
    expect(roulette.coveredNumbers({ type: 'corner', numbers: [0, 1, 2, 3] })).toEqual([
      0, 1, 2, 3,
    ]);
    expect(() => roulette.coveredNumbers({ type: 'split', numbers: [3, 4] })).toThrow(FairError);
    expect(() => roulette.coveredNumbers({ type: 'corner', numbers: [3, 4, 6, 7] })).toThrow(
      FairError,
    );
    expect(roulette.coveredNumbers({ type: 'column', numbers: [2] })).toHaveLength(12);
    expect(roulette.coveredNumbers({ type: 'dozen', numbers: [2] })).toEqual(
      Array.from({ length: 12 }, (_, i) => 13 + i),
    );
  });
  it('every bet type returns 36/37 of the stake on average (2.70 % edge)', () => {
    const bets: roulette.RouletteBet[] = [
      { type: 'straight', numbers: [19], amount: '1.00' },
      { type: 'straight', numbers: [0], amount: '1.00' },
      { type: 'split', numbers: [0, 1], amount: '1.00' },
      { type: 'split', numbers: [17, 20], amount: '1.00' },
      { type: 'street', numbers: [13, 14, 15], amount: '1.00' },
      { type: 'street', numbers: [0, 1, 2], amount: '1.00' },
      { type: 'corner', numbers: [17, 18, 20, 21], amount: '1.00' },
      { type: 'line', numbers: [31, 32, 33, 34, 35, 36], amount: '1.00' },
      { type: 'dozen', numbers: [3], amount: '1.00' },
      { type: 'column', numbers: [1], amount: '1.00' },
      { type: 'red', amount: '1.00' },
      { type: 'black', amount: '1.00' },
      { type: 'odd', amount: '1.00' },
      { type: 'even', amount: '1.00' },
      { type: 'low', amount: '1.00' },
      { type: 'high', amount: '1.00' },
    ];
    for (const b of bets) {
      const covered = roulette.coveredNumbers(b);
      const ret = (roulette.ROULETTE_PAYOUTS[b.type] + 1) * covered.length;
      expect(ret).toBe(36);
    }
  });
  it('RL demo slip: 19 → +195.00; outside bets lose on 0; slip limits', () => {
    const slip: roulette.RouletteBet[] = [
      { type: 'straight', numbers: [19], amount: '5.00' },
      { type: 'red', amount: '10.00' },
      { type: 'dozen', numbers: [2], amount: '5.00' },
    ];
    expect(roulette.validateRouletteBets(slip).toFixed(2)).toBe('20.00');
    const settle = (pocket: number) =>
      slip.reduce((a, b) => {
        const win = roulette.coveredNumbers(b).includes(pocket);
        return a + (win ? Number(b.amount) * (roulette.ROULETTE_PAYOUTS[b.type] + 1) : 0);
      }, 0);
    expect(settle(19) - 20).toBe(195);
    expect(settle(0)).toBe(0);
    expect(() =>
      roulette.validateRouletteBets([{ type: 'straight', numbers: [1], amount: '1200.00' }]),
    ).toThrow(/maximum/);
    expect(() =>
      roulette.validateRouletteBets(
        Array.from({ length: 6 }, (_, i) => ({
          type: 'straight' as const,
          numbers: [i + 1],
          amount: '1000.00',
        })),
      ),
    ).toThrow(/table maximum/);
    expect(() =>
      roulette.validateRouletteBets([
        { type: 'red', amount: '1.00' },
        { type: 'red', amount: '2.00' },
      ]),
    ).toThrow(/once/);
    const out = playInstant('pool-roulette', seed, { bets: slip }, undefined);
    expect(out.stake).toBe('20.00');
    expect(() => playInstant('pool-roulette', seed, { bets: slip }, '25.00')).toThrow(/sum/);
  });
});

describe('Orbit Rush (decision #42) and Skyline', () => {
  it('hash chain: each seed hashes to the previous one and to the commitment', () => {
    const chain = crash.buildHashChain('t'.repeat(64), 5);
    expect(chain).toHaveLength(6);
    for (let i = 1; i <= 5; i++) {
      expect(crash.crashCommitment(chain[i]!)).toBe(chain[i - 1]);
      expect(crash.verifyChainSeed(chain[i]!, i, chain[0]!)).toBe(true);
    }
    expect(crash.verifyChainSeed(chain[2]!, 3, chain[0]!)).toBe(false);
  });
  it('crash points are ≥ 1.00 and ≤ 1,000.00 with ~1 % instant crashes', () => {
    let instant = 0;
    for (let i = 0; i < 5000; i++) {
      const cp = crash.crashPointOf(`${i}`.padStart(64, '0'), 'salt');
      expect(Number(cp.crashPoint)).toBeGreaterThanOrEqual(1);
      expect(Number(cp.crashPoint)).toBeLessThanOrEqual(1000);
      if (cp.instant) {
        instant += 1;
        expect(cp.crashPoint).toBe('1.00');
      }
    }
    expect(instant).toBeGreaterThan(25);
    expect(instant).toBeLessThan(80);
  });
  it('curve m(t) = e^(0.1117 t) in 100 ms frames, monotonic, capped', () => {
    expect(crash.multiplierAt(0)).toBe('1.00');
    expect(crash.multiplierAt(99)).toBe('1.00');
    expect(crash.multiplierAt(6200)).toBe('1.99');
    expect(crash.multiplierAt(6300)).toBe('2.02');
    expect(crash.timeToReachMs('2.00')).toBe(6300);
    expect(crash.multiplierAt(crash.timeToReachMs('3.82'))).toBe('3.82');
    expect(crash.multiplierAt(crash.timeToReachMs('3.82') - 100) < '3.82').toBe(true);
    expect(crash.multiplierAt(200_000)).toBe('1000.00');
    let prev = 1;
    for (let t = 0; t < 70_000; t += 100) {
      const m = Number(crash.multiplierAt(t));
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
  it('auto cash-out targets 1.01×–1,000.00×', () => {
    expect(crash.validateCrashTarget('2')).toBe('2.00');
    expect(crash.validateCrashTarget(null)).toBeNull();
    expect(() => crash.validateCrashTarget('1.00')).toThrow(FairError);
    expect(() => crash.validateCrashTarget('1000.01')).toThrow(FairError);
    expect(crash.crashPayout('10.00', '2.00')).toBe('20.00');
  });
  it('Skyline: payout = bet × target when result ≥ target; win chance = 99 ÷ target', () => {
    const r = crash.playLimbo(seed, { target: '2.00' });
    expect(r.winChance).toBe('49.50');
    expect(r.win).toBe(Number(r.result) >= 2);
    expect(crash.limboPayout('10.00', { ...r, win: true })).toBe('20.00');
    expect(() => crash.playLimbo(seed, { target: '1.00' })).toThrow(FairError);
    expect(() => crash.playLimbo(seed, { target: '1000.01' })).toThrow(FairError);
  });
});

// ── Twenty-One with fixed card sequences ─────────────────────────────────────────────────────

class Fixed implements blackjack.CardSource {
  readonly decks = 6;
  position = 0;
  constructor(private readonly cards: string[]) {}
  draw() {
    const c = this.cards[this.position];
    if (!c) throw new Error('out of cards');
    this.position += 1;
    return c;
  }
}
/** Deal order: player, dealer up, player, dealer hole, then draws. */
const deal = (cards: string[], stake = '10.00') => {
  const src = new Fixed(cards);
  return { src, s: blackjack.bjDeal(src, stake) };
};
const act = (st: { src: Fixed; s: BjState }, a: blackjack.BjAction) =>
  blackjack.bjApply(st.s, st.src, a);

describe('Twenty-One rules (BJ notes)', () => {
  it('blackjack pays 3:2 (+15.00 on 10.00) when the dealer has none', () => {
    const { s } = deal(['AS', '9H', 'KD', '7C']);
    expect(s.phase).toBe('settled');
    expect(s.hands[0]!.result).toBe('blackjack');
    expect(s.totalPayout).toBe('25.00');
  });
  it('dealer peeks with a 10 showing: dealer blackjack takes the original bet only', () => {
    const { s } = deal(['9S', 'KH', '9D', 'AC']);
    expect(s.phase).toBe('settled');
    expect(s.dealerBlackjack).toBe(true);
    expect(s.hands[0]!.result).toBe('lose');
    expect(s.totalStake).toBe('10.00');
  });
  it('insurance when the dealer shows an Ace: costs half, pays 2:1', () => {
    const st = deal(['9S', 'AH', '9D', 'KC']);
    expect(st.s.phase).toBe('insurance');
    expect(blackjack.allowedActions(st.s)).toEqual(['insurance']);
    expect(blackjack.actionCost(st.s, { type: 'insurance', accept: true })).toBe('5.00');
    act(st, { type: 'insurance', accept: true });
    expect(st.s.phase).toBe('settled');
    expect(st.s.insurance).toEqual({ taken: true, stake: '5.00', payout: '15.00' });
    expect(st.s.totalStake).toBe('15.00');
    expect(st.s.totalPayout).toBe('15.00');
  });
  it('declined insurance, no dealer blackjack → play continues', () => {
    const st = deal(['9S', 'AH', '9D', '7C']);
    act(st, { type: 'insurance', accept: false });
    expect(st.s.phase).toBe('player');
    expect(st.s.dealerBlackjack).toBe(false);
    act(st, { type: 'stand' });
    // dealer A7 = soft 18 stands → 18 beats 18? push
    expect(st.s.hands[0]!.result).toBe('push');
  });
  it('win 20 beats 18 · lose · push 19 each · bust 25', () => {
    const win = deal(['KS', '8H', 'QD', 'KC']);
    act(win, { type: 'stand' });
    expect(win.s.hands[0]!.result).toBe('win');
    expect(win.s.totalPayout).toBe('20.00');

    const lose = deal(['KS', 'KH', '8D', 'QC']);
    act(lose, { type: 'stand' });
    expect(lose.s.hands[0]!.result).toBe('lose');

    const push = deal(['KS', '9H', '9D', 'TC']);
    act(push, { type: 'stand' });
    expect(push.s.hands[0]!.result).toBe('push');
    expect(push.s.totalPayout).toBe('10.00');

    const bust = deal(['KS', '9H', '6D', '7C', '9S']);
    act(bust, { type: 'hit' });
    expect(bust.s.hands[0]!.result).toBe('bust');
    expect(bust.s.dealer).toHaveLength(2); // dealer does not draw when every hand is bust
  });
  it('dealer draws on 16 and stands on soft 17 (S17)', () => {
    const draws = deal(['KS', '6H', '8D', 'TC', '5S']);
    act(draws, { type: 'stand' });
    expect(draws.s.dealer).toEqual(['6H', 'TC', '5S']);
    expect(draws.s.hands[0]!.result).toBe('lose');

    const soft17 = deal(['KS', 'AH', '8D', '6C']);
    act(soft17, { type: 'insurance', accept: false });
    act(soft17, { type: 'stand' });
    expect(soft17.s.dealer).toEqual(['AH', '6C']);
    expect(soft17.s.hands[0]!.result).toBe('win');
  });
  it('double on the first two cards: one card, stake doubled', () => {
    const st = deal(['5S', '6H', '6D', 'TC', 'KS', '9H']);
    expect(blackjack.actionCost(st.s, { type: 'double' })).toBe('10.00');
    act(st, { type: 'double' });
    expect(st.s.hands[0]!.cards).toEqual(['5S', '6D', 'KS']);
    expect(st.s.hands[0]!.stake).toBe('20.00');
    expect(st.s.hands[0]!.result).toBe('win');
    expect(st.s.totalPayout).toBe('40.00');
    expect(() => act(st, { type: 'hit' })).toThrow(FairError);
  });
  it('split once into 2 hands, double after split allowed, no re-split', () => {
    const st = deal(['8S', '6H', '8D', 'TC', '8H', '3S', 'KD', 'TS']);
    expect(blackjack.allowedActions(st.s)).toContain('split');
    act(st, { type: 'split' });
    expect(st.s.hands).toHaveLength(2);
    expect(st.s.hands[0]!.cards).toEqual(['8S', '8H']);
    expect(blackjack.allowedActions(st.s)).not.toContain('split'); // pair of 8s again: no re-split
    act(st, { type: 'stand' }); // hand 1: 16
    expect(st.s.hands[1]!.cards).toEqual(['8D', '3S']);
    expect(blackjack.allowedActions(st.s)).toContain('double');
    act(st, { type: 'double' }); // hand 2: 11 + K = 21
    expect(st.s.hands[1]!.cards).toEqual(['8D', '3S', 'KD']);
    // dealer 6 + T = 16 → draws TS → 26 bust
    expect(st.s.dealer).toEqual(['6H', 'TC', 'TS']);
    expect(st.s.hands.map((h) => h.result)).toEqual(['win', 'win']);
    expect(st.s.totalStake).toBe('30.00');
    expect(st.s.totalPayout).toBe('60.00');
  });
  it('split Aces get one card each; 21 after a split is not a blackjack', () => {
    const st = deal(['AS', '7H', 'AD', 'TC', 'KS', '5H']);
    act(st, { type: 'split' });
    expect(st.s.phase).toBe('settled');
    expect(st.s.hands[0]!.cards).toEqual(['AS', 'KS']);
    expect(st.s.hands[1]!.cards).toEqual(['AD', '5H']);
    expect(st.s.hands[0]!.result).toBe('win'); // 21 vs 17, paid 1:1
    expect(st.s.hands[0]!.payout).toBe('20.00');
    expect(st.s.hands[1]!.result).toBe('lose'); // soft 16 vs 17
  });
  it('illegal actions are refused', () => {
    const st = deal(['KS', '8H', '7D', 'KC']);
    expect(() => act(st, { type: 'split' })).toThrow(/not possible/);
    expect(() => act(st, { type: 'insurance', accept: true })).toThrow(FairError);
  });
  it('replay from seeds + actions re-creates the hand (verifier)', () => {
    const shoe = new blackjack.Shoe(seed);
    const s = blackjack.bjDeal(shoe, '10.00');
    while (s.phase !== 'settled') {
      const allowed = blackjack.allowedActions(s);
      if (allowed.includes('insurance'))
        blackjack.bjApply(s, shoe, { type: 'insurance', accept: false });
      else
        blackjack.bjApply(s, shoe, {
          type: blackjack.handValue(s.hands[s.active]!.cards).total < 17 ? 'hit' : 'stand',
        });
    }
    const replayed = blackjack.replayBlackjack(seed, '10.00', blackjack.actionsOf(s));
    expect(replayed).toEqual(s);
    const v = verifyBet({
      slug: 'twenty-one',
      ...seed,
      serverSeedHash: '0',
      stake: '10.00',
      params: { actions: blackjack.actionsOf(s) },
    });
    expect(v.payout).toBe(s.totalPayout);
  });
});

describe('Vault Sweeper', () => {
  it('multipliers match the GM-03 frame (3 mines)', () => {
    expect(mines.minesMultiplier(3, 1)).toBe('1.12');
    expect(mines.minesMultiplier(3, 3)).toBe('1.47');
    expect(mines.minesMultiplier(3, 4)).toBe('1.71');
    expect(mines.minesMultiplier(3, 5)).toBe('1.99');
    expect(mines.minesNextChance(3, 4)).toBe('85.71');
    expect(mines.minesMultiplier(24, 1)).toBe('24.75');
  });
  it('board fixed by the seeds; mine ends the round; cash-out pays stake × multiplier', () => {
    const board = mines.minePositions(seed, 3);
    expect(board).toHaveLength(3);
    const safe = Array.from({ length: 25 }, (_, i) => i).filter((t) => !board.includes(t));
    const s = mines.minesStart(3);
    expect(() => mines.minesCashOut(s, '10.00')).toThrow(/at least one/);
    mines.minesReveal(s, board, safe[0]!, '10.00');
    mines.minesReveal(s, board, safe[1]!, '10.00');
    expect(s.multiplier).toBe('1.28'); // 0.99 ÷ (22/25 × 21/24) = 1.2857
    mines.minesCashOut(s, '10.00');
    expect(s.payout).toBe('12.80');
    const t = mines.minesStart(3);
    mines.minesReveal(t, board, board[0]!, '10.00');
    expect(t.status).toBe('lost');
    expect(() => mines.minesReveal(t, board, safe[0]!, '10.00')).toThrow(FairError);
    const r = mines.replayMines(seed, 3, '10.00', [safe[0]!, safe[1]!], true);
    expect(r.payout).toBe('12.80');
  });
  it('max payout 100,000.00', () => {
    const board = mines.minePositions(seed, 24);
    const safe = Array.from({ length: 25 }, (_, i) => i).find((t) => !board.includes(t))!;
    const s = mines.minesStart(24);
    mines.minesReveal(s, board, safe, '1000.00'); // 24.75× → 24,750.00 (also the last gem: auto cash-out)
    expect(s.status).toBe('cashed_out');
    expect(s.payout).toBe('24750.00');
  });
});

const hiloPick = (rank: number): hilo.HiloCall =>
  rank === 1
    ? 'lower_or_same'
    : rank === 13
      ? 'higher_or_same'
      : rank <= 7
        ? 'higher_or_same'
        : 'lower_or_same';

describe('High Card', () => {
  it('offers match the GM-08 frame (4♠)', () => {
    expect(hilo.hiloOffer(4)).toEqual({
      higher_or_same: { chance: '76.92', multiplier: '1.28' },
      lower_or_same: { chance: '30.77', multiplier: '3.21' },
    });
    expect(hilo.hiloOffer(1).higher_or_same).toBeNull();
    expect(hilo.hiloOffer(13).lower_or_same).toBeNull();
    // 7♣ higher → J♦ lower = 2.15× (edge 1 % per call)
    const run = hilo
      .hiloStepMultiplier(7, 'higher_or_same')
      .times(hilo.hiloStepMultiplier(11, 'lower_or_same'));
    expect(run.toDecimalPlaces(2, 1).toFixed(2)).toBe('2.15');
  });
  it('a run replays from seeds and actions', () => {
    const deck = new hilo.HiloDeck(seed);
    const s = hilo.hiloStart(deck);
    const actions: (hilo.HiloCall | 'skip')[] = [];
    for (let i = 0; i < 4 && s.status === 'active'; i++) {
      const rank = hilo.rankOf(hilo.hiloCurrent(s));
      const a = i === 1 ? 'skip' : hiloPick(rank);
      actions.push(a);
      hilo.hiloPlay(s, deck, a, '5.00');
    }
    const cashed = s.status === 'active' && s.steps.some((x) => x.win);
    if (cashed) hilo.hiloCashOut(s, '5.00');
    expect(hilo.replayHilo(seed, '5.00', actions, cashed)).toEqual(s);
  });
});

describe('Fortune Ring, Pool Keno, Pinfall tables', () => {
  it('Fortune Ring medium 30 = GM-06 ring; every ring returns 99.00 %', () => {
    const l = wheel.wheelLayout({ risk: 'medium', segments: 30 });
    const count = (m: string) => l.filter((x) => x === m).length;
    expect([count('0.00'), count('1.50'), count('1.70'), count('2.00'), count('3.00')]).toEqual([
      15, 6, 1, 5, 3,
    ]);
    expect(l[18]).toBe('3.00'); // segment 19
    for (const risk of wheel.WHEEL_RISKS) {
      for (const segments of wheel.WHEEL_SEGMENTS) {
        expect(wheel.wheelRtp({ risk, segments }).toFixed(10)).toBe('0.9900000000');
      }
    }
  });
  it('Pool Keno 6 picks Classic = GM-07 table with its chances', () => {
    expect(keno.kenoTable('classic', 6)).toEqual(['0', '0', '1.1', '2.5', '9', '45', '300']);
    const pct = (h: number) => keno.kenoHitChance(6, h).times(100).toDecimalPlaces(2, 4).toFixed(2);
    expect([0, 1, 2, 3, 4].map(pct)).toEqual(['15.47', '37.13', '32.13', '12.69', '2.38']);
    expect(() => keno.validateKeno({ picks: [1, 1], risk: 'classic' })).toThrow(FairError);
    expect(() => keno.validateKeno({ picks: [41], risk: 'classic' })).toThrow(FairError);
    expect(() => keno.validateKeno({ picks: [], risk: 'classic' })).toThrow(FairError);
    const o = keno.playKeno(seed, { picks: [3, 11, 17, 24, 30, 38], risk: 'classic' });
    expect(o.drawn).toHaveLength(10);
    expect(new Set(o.drawn).size).toBe(10);
  });
  it('Pinfall 16 rows Medium = GM-04 board', () => {
    expect(plinko.plinkoTable({ rows: 16, risk: 'medium' }).map(Number)).toEqual([
      100, 33, 10, 4, 3, 1.4, 1, 0.6, 0.3, 0.6, 1, 1.4, 3, 4, 10, 33, 100,
    ]);
    const o = plinko.playPlinko(seed, { rows: 16, risk: 'medium' });
    expect(o.path).toHaveLength(16);
    expect(o.bucket).toBe(o.path.reduce((a, b) => a + b, 0));
    expect(() => plinko.plinkoTable({ rows: 7, risk: 'low' })).toThrow(FairError);
  });
});

describe('catalogue', () => {
  it('publishes limits and edges for the 11 playable games', () => {
    expect(Object.keys(FAIR_GAMES)).toHaveLength(11);
    expect(FAIR_GAMES['pool-roulette'].tableMax).toBe('5000.00');
    expect(FAIR_GAMES['twenty-one'].minBet).toBe('1.00');
    expect(FAIR_GAMES['double-side'].houseEdgePercent).toBe('2.00');
  });
});
