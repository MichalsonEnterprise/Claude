/**
 * Pure DEMO-credit amount helpers for bet panels (decimal.js via @gp/shared/money — never JS floats).
 * Stakes have at most 2 decimals (STAKE_DECIMALS); presets never exceed the table limits or the balance.
 */
import { STAKE_DECIMALS } from '@gp/shared/fair';
import {
  MoneyDecimal,
  formatAmount,
  max as moneyMax,
  min as moneyMin,
  money,
  roundDown,
  type Money,
  type MoneyInput,
} from '@gp/shared/money';

const STAKE_RE = /^\d{0,9}(\.\d{0,2})?$/;

/** Keep only a valid partial stake while typing ("12.", "0.5" ok; letters, 3rd decimal, signs dropped). */
export function sanitizeStakeInput(raw: string): string {
  let v = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
  if (dot !== -1 && v.length - dot - 1 > STAKE_DECIMALS) v = v.slice(0, dot + 1 + STAKE_DECIMALS);
  if (/^0\d/.test(v)) v = v.replace(/^0+(?=\d)/, '');
  return STAKE_RE.test(v) ? v : '';
}

/** Parse a stake string to a canonical 2-dp string, or null when empty / malformed. */
export function parseStake(value: string): string | null {
  const v = value.trim();
  if (!v || v === '.' || !/^\d+(\.\d{1,2})?\.?$/.test(v)) return null;
  try {
    return money(v.endsWith('.') ? v.slice(0, -1) : v).toFixed(2);
  } catch {
    return null;
  }
}

export type StakePreset = 'half' | 'double' | 'min' | 'max';

export interface StakeLimits {
  min: string;
  max: string;
  /** Current DEMO balance (null while unknown / signed out). */
  balance: string | null;
}

/** The upper bound a preset may reach: table max, or the balance when it is lower (but never below min). */
export function stakeCeiling(l: StakeLimits): string {
  if (l.balance === null) return money(l.max).toFixed(2);
  const bal = roundDown(l.balance, STAKE_DECIMALS);
  const cap = moneyMin(l.max, bal);
  return (cap.lt(money(l.min)) ? money(l.min) : cap).toFixed(2);
}

function clamp(v: Money, l: StakeLimits): string {
  return moneyMax(l.min, moneyMin(stakeCeiling(l), v))
    .toDecimalPlaces(STAKE_DECIMALS, MoneyDecimal.ROUND_DOWN)
    .toFixed(2);
}

/** ½ / 2× / min / max — always inside [min, ceiling]. Max never goes above the balance (no surprise all-in). */
export function applyPreset(current: string, preset: StakePreset, l: StakeLimits): string {
  const cur = parseStake(current) ?? l.min;
  switch (preset) {
    case 'half':
      return clamp(money(cur).div(2), l);
    case 'double':
      return clamp(money(cur).times(2), l);
    case 'min':
      return money(l.min).toFixed(2);
    case 'max':
      return stakeCeiling(l);
  }
}

export type StakeProblem =
  | { kind: 'empty' }
  | { kind: 'below_min'; min: string }
  | { kind: 'above_max'; max: string }
  | { kind: 'insufficient'; balance: string }
  | null;

/** Client-side pre-check (the server re-checks everything). */
export function stakeProblem(value: string, l: StakeLimits): StakeProblem {
  const s = parseStake(value);
  if (!s || money(s).isZero()) return { kind: 'empty' };
  if (money(s).lt(money(l.min))) return { kind: 'below_min', min: l.min };
  if (money(s).gt(money(l.max))) return { kind: 'above_max', max: l.max };
  if (l.balance !== null && money(s).gt(money(l.balance))) return { kind: 'insufficient', balance: l.balance };
  return null;
}

export function stakeProblemMessage(p: StakeProblem, unit = 'DEMO credits'): string | null {
  if (!p) return null;
  switch (p.kind) {
    case 'empty':
      return 'Enter a bet amount.';
    case 'below_min':
      return `Min bet is ${formatAmount(p.min)} ${unit}.`;
    case 'above_max':
      return `Max bet is ${formatAmount(p.max)} ${unit} per bet. Lower your bet or use Max.`;
    case 'insufficient':
      return `Your bet is more than your DEMO balance (${formatAmount(p.balance)}).`;
  }
}

/** stake × multiplier truncated to 2 dp for display ("You receive on win"). */
export function payoutPreview(stake: MoneyInput, multiplier: MoneyInput): string {
  return roundDown(money(stake).times(money(multiplier)), 2).toFixed(2);
}

/** Profit on win = payout − stake (2 dp, truncated). */
export function profitPreview(stake: MoneyInput, multiplier: MoneyInput): string {
  return roundDown(money(stake).times(money(multiplier)).minus(money(stake)), 2).toFixed(2);
}
