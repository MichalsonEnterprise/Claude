/**
 * High Card (hi-lo). Ace is low (1), King is high (13); every card comes from a fresh 52-card deck, so earlier
 * cards never change the odds. Call "higher or same" (chance (14 − rank) / 13) or "lower or same" (rank / 13); an
 * equal rank wins either "or same" call. Each right call multiplies the run by 0.99 ÷ chance (house edge 1.00 % on
 * every call); the run multiplier is truncated to 2 decimals for the cash-out value. Skips are free and do not
 * change the multiplier. A call that cannot lose (Ace "higher or same", King "lower or same") is not offered.
 * Max payout per run 100,000.00 (reached → cashed out there).
 * PF: card k of a run (k = 0 is the start card) = uniformInt(0, 51) read in order from the run's byte stream;
 * rank = card mod 13 + 1, suit = S H D C by card div 13.
 */
import { money, type Money } from '../../money';
import { creditString, multiplierString, payoutOf, percentString } from '../credits';
import { ByteStream, FairError, uniformInt, type SeedInput } from '../stream';
import { RANKS, SUITS } from './blackjack';

export const HILO_RULES = {
  houseEdgePercentPerCall: '1.00',
  maxPayout: '100000.00',
  maxCards: 200,
  multiplierDecimals: 2,
} as const;

export type HiloCall = 'higher_or_same' | 'lower_or_same';
export interface HiloCard {
  code: string;
  rank: number;
}
export interface HiloStep {
  action: HiloCall | 'skip';
  card: string;
  win: boolean | null;
  /** Step multiplier (0.99 ÷ chance, 4 dp) for a call, null for a skip. */
  stepMultiplier: string | null;
}
export interface HiloState {
  start: string;
  steps: HiloStep[];
  /** Exact run multiplier (decimal string, high precision). */
  exact: string;
  multiplier: string;
  status: 'active' | 'lost' | 'cashed_out';
  payout: string;
  cardsDrawn: number;
}

/** Deterministic card source for one run. */
export class HiloDeck {
  private readonly stream: ByteStream;
  drawn = 0;
  constructor(seed: SeedInput, alreadyDrawn = 0) {
    this.stream = new ByteStream(seed);
    for (let i = 0; i < alreadyDrawn; i++) this.next();
  }
  next(): HiloCard {
    const n = uniformInt(this.stream, 0, 51);
    this.drawn += 1;
    const rank = (n % 13) + 1;
    return { code: `${RANKS[rank - 1]}${SUITS[Math.floor(n / 13)]}`, rank };
  }
}

export const rankOf = (code: string): number => RANKS.indexOf(code[0] as (typeof RANKS)[number]) + 1;

/** Chance (out of 13) that a call wins from `rank`. */
export function hiloChance13(rank: number, call: HiloCall): number {
  return call === 'higher_or_same' ? 14 - rank : rank;
}

export function hiloStepMultiplier(rank: number, call: HiloCall): Money {
  const c = hiloChance13(rank, call);
  if (c >= 13 || c <= 0) throw new FairError('That call cannot lose — pick the other call or skip', 'ACTION_NOT_ALLOWED');
  return money(99).times(13).div(money(c).times(100));
}

/** Offer for the current card: chance % and multiplier per call (null when not offered). */
export function hiloOffer(rank: number): Record<HiloCall, { chance: string; multiplier: string } | null> {
  const offer = (call: HiloCall) => {
    const c = hiloChance13(rank, call);
    if (c >= 13) return null;
    return {
      chance: percentString(money(c).times(100).div(13)),
      multiplier: multiplierString(hiloStepMultiplier(rank, call), 2),
    };
  };
  return { higher_or_same: offer('higher_or_same'), lower_or_same: offer('lower_or_same') };
}

export function hiloStart(deck: HiloDeck): HiloState {
  const c = deck.next();
  return { start: c.code, steps: [], exact: '1', multiplier: '1.00', status: 'active', payout: '0.00', cardsDrawn: deck.drawn };
}

export function hiloCurrent(s: HiloState): string {
  return s.steps.length ? s.steps[s.steps.length - 1]!.card : s.start;
}

export function hiloPlay(s: HiloState, deck: HiloDeck, action: HiloCall | 'skip', stake: string): HiloState {
  if (s.status !== 'active') throw new FairError('This run is over', 'ROUND_OVER');
  if (deck.drawn !== s.cardsDrawn) throw new FairError('Deck position mismatch', 'INTERNAL');
  if (s.cardsDrawn >= HILO_RULES.maxCards) throw new FairError('Card limit reached — cash out', 'ACTION_NOT_ALLOWED');
  const rank = rankOf(hiloCurrent(s));
  if (action === 'skip') {
    const c = deck.next();
    s.steps.push({ action: 'skip', card: c.code, win: null, stepMultiplier: null });
    s.cardsDrawn = deck.drawn;
    return s;
  }
  if (action !== 'higher_or_same' && action !== 'lower_or_same') {
    throw new FairError('Unknown call', 'INVALID_PARAMS');
  }
  const step = hiloStepMultiplier(rank, action);
  const c = deck.next();
  s.cardsDrawn = deck.drawn;
  const win = action === 'higher_or_same' ? c.rank >= rank : c.rank <= rank;
  s.steps.push({ action, card: c.code, win, stepMultiplier: multiplierString(step, 4) });
  if (!win) {
    s.status = 'lost';
    s.multiplier = '0.00';
    s.payout = '0.00';
    return s;
  }
  const exact = money(s.exact).times(step);
  s.exact = exact.toFixed(20);
  s.multiplier = multiplierString(exact, HILO_RULES.multiplierDecimals);
  if (payoutOf(stake, s.multiplier).gte(HILO_RULES.maxPayout)) hiloCashOut(s, stake);
  return s;
}

export function hiloCashOut(s: HiloState, stake: string): HiloState {
  if (s.status !== 'active') throw new FairError('This run is over', 'ROUND_OVER');
  if (!s.steps.some((x) => x.win === true)) {
    throw new FairError('Make at least one right call before cashing out', 'ACTION_NOT_ALLOWED');
  }
  s.status = 'cashed_out';
  const p = payoutOf(stake, s.multiplier);
  s.payout = creditString(p.gt(HILO_RULES.maxPayout) ? HILO_RULES.maxPayout : p);
  return s;
}

/** Replay a run from its seeds and actions (verifier). */
export function replayHilo(
  seed: SeedInput,
  stake: string,
  actions: (HiloCall | 'skip')[],
  cashedOut: boolean,
): HiloState {
  const deck = new HiloDeck(seed);
  const s = hiloStart(deck);
  for (const a of actions) {
    if (s.status !== 'active') break;
    hiloPlay(s, deck, a, stake);
  }
  if (cashedOut && s.status === 'active') hiloCashOut(s, stake);
  return s;
}
