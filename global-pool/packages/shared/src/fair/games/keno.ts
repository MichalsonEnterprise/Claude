/**
 * Pool Keno: pick 1–10 numbers from 1–40, then 10 numbers are drawn without repeats. The payout depends on how
 * many picks were drawn (hits) and the risk table (low / classic / medium / high), shown before the bet.
 * Exact RTP per table is published (`kenoRtp`): 98.65 – 99.00 %; the designers' 6-pick Classic table (GM-07:
 * 0 · 0 · 1.10 · 2.50 · 9.00 · 45.00 · 300.00) is kept exactly (98.997 %).
 * PF: drawn numbers = the first 10 positions of a forward Fisher–Yates shuffle of 1…40 on the byte stream.
 */
import { money, type Money } from '../../money';
import { creditString, payoutOf } from '../credits';
import { ByteStream, FairError, shuffle, type SeedInput } from '../stream';

export type KenoRisk = 'low' | 'classic' | 'medium' | 'high';
export const KENO_RISKS: readonly KenoRisk[] = ['low', 'classic', 'medium', 'high'];
export const KENO_RULES = {
  houseEdgePercent: '1.00',
  numbers: 40,
  drawn: 10,
  minPicks: 1,
  maxPicks: 10,
} as const;

export const KENO_TABLES: Readonly<Record<KenoRisk, Readonly<Record<number, readonly string[]>>>> = {
  low: {
    1: ['0', '3.96'],
    2: ['0', '1.91', '4.42'],
    3: ['0', '1.3', '2.4', '7.38'],
    4: ['0', '1.1', '1.6', '3.32', '12.1'],
    5: ['0', '1', '1.2', '2.2', '5.91', '24'],
    6: ['0', '1', '1', '1.5', '3.5', '10', '74.2'],
    7: ['0', '0', '1.3', '1.8', '3.6', '8.4', '30', '182'],
    8: ['0', '0', '1.2', '1.4', '2.3', '5.1', '15', '79', '480'],
    9: ['0', '0', '1.1', '1.2', '1.7', '3.5', '8.8', '31', '190', '500'],
    10: ['0', '0', '0', '1.5', '2.2', '3.7', '8.9', '25', '101', '500', '500'],
  },
  classic: {
    1: ['0', '3.96'],
    2: ['0', '1.5', '7.16'],
    3: ['0', '0', '4.75', '28'],
    4: ['0', '0', '2.3', '8.54', '70'],
    5: ['0', '0', '1.51', '4', '18', '211'],
    6: ['0', '0', '1.1', '2.5', '9', '45', '300'],
    7: ['0', '0', '0', '2.41', '6.5', '30', '250', '1000'],
    8: ['0', '0', '0', '0', '6.46', '22', '140', '1000', '1000'],
    9: ['0', '0', '0', '0', '4', '11', '58.2', '460', '1000', '1000'],
    10: ['0', '0', '0', '0', '2.71', '6.93', '26', '170', '1000', '1000', '1000'],
  },
  medium: {
    1: ['0', '3.96'],
    2: ['0', '1.4', '7.82'],
    3: ['0', '0', '4.13', '35'],
    4: ['0', '0', '1.8', '8.92', '110'],
    5: ['0', '0', '0', '5.33', '34', '630'],
    6: ['0', '0', '0', '2.8', '11', '110', '2854'],
    7: ['0', '0', '0', '0', '8.75', '54', '710', '5000'],
    8: ['0', '0', '0', '0', '4.7', '20', '180', '3321', '5000'],
    9: ['0', '0', '0', '0', '0', '16', '100', '1305', '5000', '5000'],
    10: ['0', '0', '0', '0', '0', '8.41', '43', '390', '5000', '5000', '5000'],
  },
  high: {
    1: ['0', '3.96'],
    2: ['0', '0', '17.1'],
    3: ['0', '0', '2.97', '48'],
    4: ['0', '0', '0', '9.96', '260'],
    5: ['0', '0', '0', '3.01', '30', '1211'],
    6: ['0', '0', '0', '0', '9', '140', '9140'],
    7: ['0', '0', '0', '0', '0', '65.4', '1601', '10000'],
    8: ['0', '0', '0', '0', '0', '16.4', '250', '10000', '10000'],
    9: ['0', '0', '0', '0', '0', '0', '120', '2965', '10000', '10000'],
    10: ['0', '0', '0', '0', '0', '0', '46', '771', '10000', '10000', '10000'],
  },
};

export interface KenoParams {
  picks: number[];
  risk: KenoRisk;
}
export interface KenoOutcome {
  picks: number[];
  risk: KenoRisk;
  drawn: number[];
  hits: number[];
  multiplier: string;
}

export function validateKeno(params: KenoParams): number[] {
  const picks = params.picks;
  if (!Array.isArray(picks) || picks.length < KENO_RULES.minPicks || picks.length > KENO_RULES.maxPicks) {
    throw new FairError('Pick 1–10 numbers', 'INVALID_PARAMS');
  }
  if (!picks.every((n) => Number.isInteger(n) && n >= 1 && n <= KENO_RULES.numbers)) {
    throw new FairError('Numbers are 1–40', 'INVALID_PARAMS');
  }
  if (new Set(picks).size !== picks.length) throw new FairError('Each number once', 'INVALID_PARAMS');
  if (!KENO_RISKS.includes(params.risk)) throw new FairError('Unknown risk table', 'INVALID_PARAMS');
  return [...picks].sort((a, b) => a - b);
}

export function kenoTable(risk: KenoRisk, picks: number): readonly string[] {
  const t = KENO_TABLES[risk]?.[picks];
  if (!t) throw new FairError('Unknown keno table', 'INVALID_PARAMS');
  return t;
}

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};

/** Chance of `hits` hits with `picks` picks (exact decimal). */
export function kenoHitChance(picks: number, hits: number): Money {
  const { numbers, drawn } = KENO_RULES;
  return money(binom(picks, hits))
    .times(binom(numbers - picks, drawn - hits))
    .div(binom(numbers, drawn));
}

export function kenoRtp(risk: KenoRisk, picks: number): Money {
  const t = kenoTable(risk, picks);
  let sum = money(0);
  t.forEach((m, h) => (sum = sum.plus(money(m).times(kenoHitChance(picks, h)))));
  return sum;
}

export function kenoDraw(seed: SeedInput): number[] {
  const all = Array.from({ length: KENO_RULES.numbers }, (_, i) => i + 1);
  return shuffle(new ByteStream(seed), all, KENO_RULES.drawn).slice(0, KENO_RULES.drawn);
}

export function playKeno(seed: SeedInput, params: KenoParams): KenoOutcome {
  const picks = validateKeno(params);
  const drawn = kenoDraw(seed);
  const hits = picks.filter((n) => drawn.includes(n));
  const multiplier = money(kenoTable(params.risk, picks.length)[hits.length]!).toFixed(2);
  return { picks, risk: params.risk, drawn, hits, multiplier };
}

export function kenoPayout(stake: string, outcome: KenoOutcome): string {
  return creditString(payoutOf(stake, outcome.multiplier));
}
