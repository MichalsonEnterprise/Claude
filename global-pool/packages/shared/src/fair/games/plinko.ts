/**
 * Pinfall (plinko): 8–16 rows of pegs, risk low / medium / high. At every row the ball goes left or right with equal
 * chance; the bucket index = number of "right" bounces (0 … rows), so bucket k has chance C(rows, k) / 2^rows.
 * Payout = stake × the bucket multiplier of the chosen board. Exact RTP per board is published (`plinkoRtp`):
 * 98.98 – 99.00 % for every generated board; the designers' 16-row Medium board (GM-04: 100× … 0.3×) returns
 * 99.016 %, kept exactly as designed.
 * PF: one uniformInt(0, 1) per row, in order, on the byte stream (1 = right).
 */
import { money, type Money } from '../../money';
import { creditString, payoutOf } from '../credits';
import { ByteStream, FairError, uniformInt, type SeedInput } from '../stream';

export type PlinkoRisk = 'low' | 'medium' | 'high';
export const PLINKO_RISKS: readonly PlinkoRisk[] = ['low', 'medium', 'high'];
export const PLINKO_RULES = { houseEdgePercent: '1.00', minRows: 8, maxRows: 16 } as const;

export const PLINKO_TABLES: Readonly<Record<PlinkoRisk, Readonly<Record<number, readonly string[]>>>> = {
  low: {
    8: ['2.6', '1.6', '1.3', '0.9', '0.7', '0.9', '1.3', '1.6', '2.6'],
    9: ['2.9', '2.1', '1.3', '1', '0.8', '0.8', '1', '1.3', '2.1', '2.9'],
    10: ['3.5', '2.3', '1.5', '1.2', '0.8', '0.8', '0.8', '1.2', '1.5', '2.3', '3.5'],
    11: ['3.9', '2.2', '1.9', '1.3', '0.9', '0.8', '0.8', '0.9', '1.3', '1.9', '2.2', '3.9'],
    12: ['3.8', '3', '2', '1.4', '1.1', '0.8', '0.8', '0.8', '1.1', '1.4', '2', '3', '3.8'],
    13: ['4.2', '3.1', '2.1', '1.6', '1.2', '0.9', '0.8', '0.8', '0.9', '1.2', '1.6', '2.1', '3.1', '4.2'],
    14: ['4.6', '3.8', '2.4', '1.8', '1.4', '1', '0.8', '0.8', '0.8', '1', '1.4', '1.8', '2.4', '3.8', '4.6'],
    15: ['5', '3.8', '3', '2.3', '1.6', '1.2', '0.9', '0.7', '0.7', '0.9', '1.2', '1.6', '2.3', '3', '3.8', '5'],
    16: ['6.2', '4.7', '3.3', '2.4', '1.8', '1.3', '1', '0.8', '0.7', '0.8', '1', '1.3', '1.8', '2.4', '3.3', '4.7', '6.2'],
  },
  medium: {
    8: ['4.4', '2.6', '1.4', '0.8', '0.5', '0.8', '1.4', '2.6', '4.4'],
    9: ['5.6', '3', '1.7', '1', '0.6', '0.6', '1', '1.7', '3', '5.6'],
    10: ['7.3', '4.2', '2.3', '1.2', '0.7', '0.5', '0.7', '1.2', '2.3', '4.2', '7.3'],
    11: ['9.4', '4.8', '2.9', '1.6', '0.9', '0.5', '0.5', '0.9', '1.6', '2.9', '4.8', '9.4'],
    12: ['10.6', '6.1', '3.5', '2.1', '1.1', '0.6', '0.5', '0.6', '1.1', '2.1', '3.5', '6.1', '10.6'],
    13: ['13.3', '7.9', '4.3', '2.5', '1.4', '0.8', '0.5', '0.5', '0.8', '1.4', '2.5', '4.3', '7.9', '13.3'],
    14: ['18.2', '9.7', '5.8', '3.2', '1.9', '1', '0.5', '0.5', '0.5', '1', '1.9', '3.2', '5.8', '9.7', '18.2'],
    15: ['21.7', '12.2', '7.2', '3.9', '2.2', '1.3', '0.8', '0.4', '0.4', '0.8', '1.3', '2.2', '3.9', '7.2', '12.2', '21.7'],
    16: ['100', '33', '10', '4', '3', '1.4', '1', '0.6', '0.3', '0.6', '1', '1.4', '3', '4', '10', '33', '100'],
  },
  high: {
    8: ['9.4', '3.9', '1.5', '0.6', '0.3', '0.6', '1.5', '3.9', '9.4'],
    9: ['12.5', '5.3', '2.1', '0.8', '0.4', '0.4', '0.8', '2.1', '5.3', '12.5'],
    10: ['18.1', '7.5', '3.1', '1.2', '0.5', '0.2', '0.5', '1.2', '3.1', '7.5', '18.1'],
    11: ['25.9', '10.2', '4.1', '1.7', '0.7', '0.3', '0.3', '0.7', '1.7', '4.1', '10.2', '25.9'],
    12: ['35.2', '14.5', '5.9', '2.4', '0.9', '0.4', '0.3', '0.4', '0.9', '2.4', '5.9', '14.5', '35.2'],
    13: ['49.7', '20.1', '8.4', '3.5', '1.3', '0.5', '0.3', '0.3', '0.5', '1.3', '3.5', '8.4', '20.1', '49.7'],
    14: ['71', '28.4', '11.1', '4.9', '2', '0.8', '0.3', '0.2', '0.3', '0.8', '2', '4.9', '11.1', '28.4', '71'],
    15: ['99.8', '40.2', '16.1', '6.7', '2.7', '1.1', '0.5', '0.2', '0.2', '0.5', '1.1', '2.7', '6.7', '16.1', '40.2', '99.8'],
    16: ['140.5', '57.4', '23.4', '9.8', '4', '1.7', '0.6', '0.2', '0.2', '0.2', '0.6', '1.7', '4', '9.8', '23.4', '57.4', '140.5'],
  },
};

export interface PlinkoParams {
  rows: number;
  risk: PlinkoRisk;
}
export interface PlinkoOutcome {
  rows: number;
  risk: PlinkoRisk;
  /** 0 = left, 1 = right, one per row. */
  path: number[];
  bucket: number;
  multiplier: string;
}

export function plinkoTable(params: PlinkoParams): readonly string[] {
  const t = PLINKO_TABLES[params.risk]?.[params.rows];
  if (!t) throw new FairError('Rows must be 8–16 and risk low, medium or high', 'INVALID_PARAMS');
  return t;
}

const binom = (n: number, k: number): number => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};

/** Exact RTP of a board as a decimal (e.g. 0.98999…). */
export function plinkoRtp(params: PlinkoParams): Money {
  const t = plinkoTable(params);
  let sum = money(0);
  t.forEach((m, k) => (sum = sum.plus(money(m).times(binom(params.rows, k)))));
  return sum.div(money(2).pow(params.rows));
}

export function playPlinko(seed: SeedInput, params: PlinkoParams): PlinkoOutcome {
  const table = plinkoTable(params);
  const stream = new ByteStream(seed);
  const path = Array.from({ length: params.rows }, () => uniformInt(stream, 0, 1));
  const bucket = path.reduce((a, b) => a + b, 0);
  return { rows: params.rows, risk: params.risk, path, bucket, multiplier: money(table[bucket]!).toFixed(2) };
}

export function plinkoPayout(stake: string, outcome: PlinkoOutcome): string {
  return creditString(payoutOf(stake, outcome.multiplier));
}
