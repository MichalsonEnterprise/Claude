/**
 * Fortune Ring (wheel): risk low / medium / high × 10, 20, 30, 40 or 50 segments. Every segment is equally likely
 * and the full segment list of each ring is published, so the RTP is exact: Σ multipliers ÷ segments = 99.00 % for
 * every ring (house edge 1.00 %). Medium · 30 is the GM-06 ring: 0.00× ×15, 1.50× ×6, 1.70× ×1, 2.00× ×5,
 * 3.00× ×3 (segment 19 = 3.00×).
 * PF: segment index = uniformInt(0, segments − 1) on the byte stream (segment number = index + 1, clockwise from
 * the pointer).
 */
import { money, type Money } from '../../money';
import { creditString, payoutOf } from '../credits';
import { ByteStream, FairError, uniformInt, type SeedInput } from '../stream';

export type WheelRisk = 'low' | 'medium' | 'high';
export const WHEEL_RISKS: readonly WheelRisk[] = ['low', 'medium', 'high'];
export const WHEEL_SEGMENTS = [10, 20, 30, 40, 50] as const;
export const WHEEL_RULES = { houseEdgePercent: '1.00' } as const;

const LOW_10 = ['1.50', '1.20', '1.20', '1.20', '0.00', '1.20', '1.20', '1.20', '1.20', '0.00'];

/** Interleave zeros on even segment numbers with the paying values on odd segment numbers. */
function alternate(paying: string[]): string[] {
  return paying.flatMap((p) => [p, '0.00']);
}

const MEDIUM: Record<number, string[]> = {
  10: alternate(['1.50', '2.00', '1.50', '3.00', '1.90']),
  20: alternate(['1.50', '2.00', '1.50', '3.00', '1.50', '2.00', '1.80', '3.00', '1.50', '2.00']),
  30: alternate([
    '1.50', '2.00', '1.50', '3.00', '1.50', '2.00', '1.50', '1.70', '2.00', '3.00',
    '1.50', '2.00', '1.50', '2.00', '3.00',
  ]),
  40: alternate([
    '1.50', '2.00', '1.50', '3.00', '1.50', '2.00', '1.50', '1.60', '2.00', '3.00',
    '1.50', '2.00', '1.50', '2.00', '3.00', '1.50', '2.00', '1.50', '3.00', '2.00',
  ]),
  50: alternate([
    '1.50', '2.00', '1.50', '3.00', '1.50', '2.00', '1.50', '2.00', '2.00', '3.00',
    '1.50', '2.00', '1.50', '2.00', '3.00', '1.50', '2.00', '1.50', '3.00', '2.00',
    '1.50', '2.00', '1.50', '3.00', '1.50',
  ]),
};

function highRing(n: number): string[] {
  const top = money(99).times(n).div(100).toFixed(2);
  return Array.from({ length: n }, (_, i) => (i === 0 ? top : '0.00'));
}

export const WHEEL_LAYOUTS: Readonly<Record<WheelRisk, Readonly<Record<number, readonly string[]>>>> = {
  low: Object.fromEntries(WHEEL_SEGMENTS.map((n) => [n, Array.from({ length: n / 10 }, () => LOW_10).flat()])),
  medium: MEDIUM,
  high: Object.fromEntries(WHEEL_SEGMENTS.map((n) => [n, highRing(n)])),
};

export interface WheelParams {
  risk: WheelRisk;
  segments: number;
}
export interface WheelOutcome {
  risk: WheelRisk;
  segments: number;
  /** 0-based index; the UI shows segment number index + 1. */
  segment: number;
  multiplier: string;
}

export function wheelLayout(params: WheelParams): readonly string[] {
  const l = WHEEL_LAYOUTS[params.risk]?.[params.segments];
  if (!l) throw new FairError('Risk must be low, medium or high and segments 10–50', 'INVALID_PARAMS');
  return l;
}

export function wheelRtp(params: WheelParams): Money {
  const l = wheelLayout(params);
  return l.reduce((a, m) => a.plus(money(m)), money(0)).div(l.length);
}

export function playWheel(seed: SeedInput, params: WheelParams): WheelOutcome {
  const layout = wheelLayout(params);
  const segment = uniformInt(new ByteStream(seed), 0, layout.length - 1);
  return { risk: params.risk, segments: params.segments, segment, multiplier: layout[segment]! };
}

export function wheelPayout(stake: string, outcome: WheelOutcome): string {
  return creditString(payoutOf(stake, outcome.multiplier));
}
