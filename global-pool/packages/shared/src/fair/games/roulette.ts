/**
 * Pool Roulette (decision #35) — European single zero, 37 pockets, house edge 2.70 % on every bet type.
 * PF: pocket = floor(f × 37) with f = first 4 bytes / 2³² (exact integer form: floor(u32 × 37 / 2³²)).
 * Payouts (to 1): straight 35 · split 17 · street 11 · corner 8 · six line 5 · dozen / column 2 · even money 1.
 * Zero bets: splits 0-1 / 0-2 / 0-3, trios 0-1-2 / 0-2-3 (11:1) and first four 0-1-2-3 (8:1). Outside bets lose on 0
 * (no La Partage / En Prison). Limits 0.10 – 1,000.00 per spot, 5,000.00 per spin across the table.
 */
import { money, type Money } from '../../money';
import { creditString, parseStake } from '../credits';
import { ByteStream, FairError, scaleU32, type SeedInput } from '../stream';

export const ROULETTE_RULES = {
  houseEdgePercent: '2.70',
  pockets: 37,
  minPerSpot: '0.10',
  maxPerSpot: '1000.00',
  tableMax: '5000.00',
  maxSpots: 60,
} as const;

export const RED_NUMBERS: readonly number[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
const RED = new Set(RED_NUMBERS);

export type RouletteBetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'line'
  | 'dozen'
  | 'column'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high';

/** Payout ratio "to 1" per bet type. */
export const ROULETTE_PAYOUTS: Readonly<Record<RouletteBetType, number>> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  line: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
};

export interface RouletteBet {
  type: RouletteBetType;
  /** Inside bets: the covered numbers. Dozen / column: [1 | 2 | 3]. Even-money bets: omitted. */
  numbers?: number[];
  amount: string;
}
export interface RouletteSettledBet extends RouletteBet {
  covered: number[];
  win: boolean;
  /** Returned amount (stake + winnings) or 0.00. */
  payout: string;
}
export interface RouletteOutcome {
  pocket: number;
  color: 'red' | 'black' | 'green';
  u32: number;
  bets: RouletteSettledBet[];
}

export const pocketColor = (n: number): 'red' | 'black' | 'green' =>
  n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const key = (ns: number[]) => [...ns].sort((x, y) => x - y).join('-');

/** Every valid inside combination on the standard layout, per type. */
const INSIDE: Record<'straight' | 'split' | 'street' | 'corner' | 'line', Set<string>> = (() => {
  const straight = new Set(range(0, 36).map((n) => key([n])));
  const split = new Set<string>(['0-1', '0-2', '0-3']);
  const street = new Set<string>(['0-1-2', '0-2-3']);
  const corner = new Set<string>(['0-1-2-3']);
  const line = new Set<string>();
  for (let n = 1; n <= 36; n++) {
    if (n % 3 !== 0) split.add(key([n, n + 1]));
    if (n <= 33) split.add(key([n, n + 3]));
    if (n % 3 !== 0 && n <= 32) corner.add(key([n, n + 1, n + 3, n + 4]));
  }
  for (let r = 1; r <= 12; r++) street.add(key(range(3 * r - 2, 3 * r)));
  for (let r = 1; r <= 11; r++) line.add(key(range(3 * r - 2, 3 * r + 3)));
  return { straight, split, street, corner, line };
})();

/** Numbers a bet covers (validated). */
export function coveredNumbers(bet: Pick<RouletteBet, 'type' | 'numbers'>): number[] {
  const nums = bet.numbers ?? [];
  switch (bet.type) {
    case 'straight':
    case 'split':
    case 'street':
    case 'corner':
    case 'line': {
      if (!nums.every((n) => Number.isInteger(n)) || !INSIDE[bet.type].has(key(nums))) {
        throw new FairError(`Not a valid ${bet.type} bet on the table layout`, 'INVALID_PARAMS');
      }
      return [...nums].sort((a, b) => a - b);
    }
    case 'dozen': {
      const d = nums[0];
      if (nums.length !== 1 || (d !== 1 && d !== 2 && d !== 3)) {
        throw new FairError('Dozen must be 1, 2 or 3', 'INVALID_PARAMS');
      }
      return range(12 * d - 11, 12 * d);
    }
    case 'column': {
      const c = nums[0];
      if (nums.length !== 1 || (c !== 1 && c !== 2 && c !== 3)) {
        throw new FairError('Column must be 1, 2 or 3', 'INVALID_PARAMS');
      }
      return range(1, 36).filter((n) => ((n - 1) % 3) + 1 === c);
    }
    case 'red':
      return range(1, 36).filter((n) => RED.has(n));
    case 'black':
      return range(1, 36).filter((n) => !RED.has(n));
    case 'odd':
      return range(1, 36).filter((n) => n % 2 === 1);
    case 'even':
      return range(1, 36).filter((n) => n % 2 === 0);
    case 'low':
      return range(1, 18);
    case 'high':
      return range(19, 36);
    default:
      throw new FairError('Unknown bet type', 'INVALID_PARAMS');
  }
}

/** Validates the slip (types, layout, per-spot and table limits) and returns the total stake. */
export function validateRouletteBets(bets: RouletteBet[]): Money {
  if (!Array.isArray(bets) || bets.length === 0)
    throw new FairError('Place at least one bet', 'INVALID_PARAMS');
  if (bets.length > ROULETTE_RULES.maxSpots)
    throw new FairError('Too many bets on one spin', 'INVALID_PARAMS');
  let total = money(0);
  const seen = new Set<string>();
  for (const b of bets) {
    if (!(b.type in ROULETTE_PAYOUTS)) throw new FairError('Unknown bet type', 'INVALID_PARAMS');
    const covered = coveredNumbers(b);
    const spot = `${b.type}:${key(covered)}`;
    if (seen.has(spot)) throw new FairError('Each spot appears once on the slip', 'INVALID_PARAMS');
    seen.add(spot);
    total = total.plus(
      parseStake(b.amount, ROULETTE_RULES.minPerSpot, ROULETTE_RULES.maxPerSpot, 'Bet per spot'),
    );
  }
  if (total.gt(ROULETTE_RULES.tableMax)) {
    throw new FairError(
      `Total stake is above the table maximum of ${ROULETTE_RULES.tableMax}`,
      'BET_ABOVE_MAX',
    );
  }
  return total;
}

export function roulettePocket(seed: SeedInput): { pocket: number; u32: number } {
  const u32 = new ByteStream(seed).nextU32();
  return { pocket: scaleU32(u32, ROULETTE_RULES.pockets), u32 };
}

export function playRoulette(seed: SeedInput, bets: RouletteBet[]): RouletteOutcome {
  validateRouletteBets(bets);
  const { pocket, u32 } = roulettePocket(seed);
  return {
    pocket,
    color: pocketColor(pocket),
    u32,
    bets: bets.map((b) => {
      const covered = coveredNumbers(b);
      const win = covered.includes(pocket);
      const payout = win ? money(b.amount).times(ROULETTE_PAYOUTS[b.type] + 1) : money(0);
      return { ...b, covered, win, payout: creditString(payout) };
    }),
  };
}

export function roulettePayout(outcome: RouletteOutcome): string {
  return creditString(outcome.bets.reduce((a, b) => a.plus(money(b.payout)), money(0)));
}
