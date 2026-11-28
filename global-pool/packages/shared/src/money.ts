/**
 * USDT money helpers. Money is NEVER a JS float: every amount is a decimal string or a decimal.js value.
 *
 * - Storage / API: decimal strings, at most 6 decimal places (`@db.Decimal(20, 6)` ledger columns).
 * - Display: `formatUSDT('1234.5')` → `'1,234.50 USDT'` (2 decimals, truncated, never rounded up).
 * - On-chain: integer base units (`toBaseUnits` / `fromBaseUnits`), 6 decimals for USDT on Arbitrum.
 */
import { Decimal } from 'decimal.js';

/** USDT ledger precision (decimal places). */
export const USDT_DECIMALS = 6;
/** Decimal places shown in the UI (`1,234.56 USDT`). */
export const USDT_DISPLAY_DECIMALS = 2;
export const USDT_SYMBOL = 'USDT';

/**
 * Isolated decimal.js constructor. We never touch the global `Decimal` config because other libraries
 * (Prisma ships its own decimal.js) may rely on it. High precision; no exponent notation in strings.
 */
export const MoneyDecimal = Decimal.clone({
  precision: 64,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -64,
  toExpPos: 64,
});

/** A decimal value (instance of decimal.js). */
export type Money = Decimal;

/** Anything carrying a decimal value, e.g. `Prisma.Decimal` (a separate decimal.js copy). */
export interface DecimalLike {
  toFixed(): string;
}

/**
 * Accepted money inputs. `number` is accepted ONLY when it is a safe integer (e.g. an entry count);
 * fractional JS numbers are rejected to keep float math out of money paths.
 */
export type MoneyInput = string | bigint | number | Decimal | DecimalLike;

export class MoneyError extends Error {
  override readonly name = 'MoneyError';
}

const DECIMAL_STRING = /^[+-]?\d+(\.\d+)?$/;

function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toFixed?: unknown }).toFixed === 'function'
  );
}

/**
 * Convert any accepted input into a decimal (no precision limit — use {@link parseUSDT} to validate
 * user/API input). Throws {@link MoneyError} for malformed strings, NaN/Infinity and float numbers.
 */
export function money(value: MoneyInput): Money {
  if (typeof value === 'string') {
    const s = value.trim();
    if (!DECIMAL_STRING.test(s)) throw new MoneyError(`Invalid amount "${value}"`);
    return new MoneyDecimal(s);
  }
  if (typeof value === 'bigint') return new MoneyDecimal(value.toString());
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new MoneyError(
        `Refusing JS number ${value} as money (float or unsafe integer) — pass a decimal string`,
      );
    }
    return new MoneyDecimal(value);
  }
  if (Decimal.isDecimal(value)) {
    // decimal.js clones share one prototype, so `instanceof` cannot tell them apart: re-wrap anything that was
    // not built by MoneyDecimal so arithmetic always runs with our precision settings.
    const d = value.constructor === MoneyDecimal ? value : new MoneyDecimal(value);
    if (!d.isFinite()) throw new MoneyError('Amount must be finite');
    return d;
  }
  if (isDecimalLike(value)) return money(value.toFixed());
  throw new MoneyError(`Unsupported money input: ${typeof value}`);
}

/**
 * Parse and validate a USDT amount (at most 6 decimal places). Use for API input and DB values.
 * @example parseUSDT('1234.5').toFixed(2) // '1234.50'
 */
export function parseUSDT(value: MoneyInput): Money {
  const d = money(value);
  if (d.decimalPlaces() > USDT_DECIMALS) {
    throw new MoneyError(
      `USDT amounts have at most ${USDT_DECIMALS} decimal places (got "${d.toString()}")`,
    );
  }
  return d;
}

/** True when `value` is a well-formed USDT amount string (≤ 6 dp). Does not check sign. */
export function isUSDTAmount(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    parseUSDT(value);
    return true;
  } catch {
    return false;
  }
}

/** Canonical string for APIs / ledgers: no grouping, at least 2 and at most 6 decimals ('351.75', '0.123456'). */
export function toUSDTString(value: MoneyInput): string {
  const d = parseUSDT(value);
  const dp = Math.max(USDT_DISPLAY_DECIMALS, d.decimalPlaces());
  return (d.isZero() ? d.abs() : d).toFixed(dp);
}

// ── arithmetic (exact; round explicitly with roundDown when needed) ───────────────────────────

export const add = (a: MoneyInput, b: MoneyInput): Money => money(a).plus(money(b));
export const sub = (a: MoneyInput, b: MoneyInput): Money => money(a).minus(money(b));
export const mul = (a: MoneyInput, b: MoneyInput): Money => money(a).times(money(b));
export const neg = (a: MoneyInput): Money => money(a).negated();
export const abs = (a: MoneyInput): Money => money(a).abs();

/** Exact sum of a list of amounts (0 for an empty list). */
export function sum(values: readonly MoneyInput[]): Money {
  return values.reduce<Money>((acc, v) => acc.plus(money(v)), new MoneyDecimal(0));
}

/** `percent` of `amount`, e.g. percentOf('186400', '50') → 93200. Exact (division by 100). */
export function percentOf(amount: MoneyInput, percent: MoneyInput): Money {
  return money(amount).times(money(percent)).div(100);
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compare(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  const c = money(a).comparedTo(money(b));
  return c < 0 ? -1 : c > 0 ? 1 : 0;
}

export const eq = (a: MoneyInput, b: MoneyInput): boolean => compare(a, b) === 0;
export const gt = (a: MoneyInput, b: MoneyInput): boolean => compare(a, b) > 0;
export const gte = (a: MoneyInput, b: MoneyInput): boolean => compare(a, b) >= 0;
export const lt = (a: MoneyInput, b: MoneyInput): boolean => compare(a, b) < 0;
export const lte = (a: MoneyInput, b: MoneyInput): boolean => compare(a, b) <= 0;
export const isZero = (a: MoneyInput): boolean => money(a).isZero();
export const isPositive = (a: MoneyInput): boolean => money(a).gt(0);
export const isNegative = (a: MoneyInput): boolean => money(a).lt(0);
export const min = (a: MoneyInput, b: MoneyInput): Money => (lte(a, b) ? money(a) : money(b));
export const max = (a: MoneyInput, b: MoneyInput): Money => (gte(a, b) ? money(a) : money(b));

/** Truncate toward zero to `decimals` places (default 6). Never creates value out of thin air. */
export function roundDown(value: MoneyInput, decimals: number = USDT_DECIMALS): Money {
  assertDecimals(decimals);
  return money(value).toDecimalPlaces(decimals, Decimal.ROUND_DOWN);
}

/** Round half away from zero to `decimals` places. Use only where a rule explicitly asks for it. */
export function roundHalfUp(value: MoneyInput, decimals: number = USDT_DECIMALS): Money {
  assertDecimals(decimals);
  return money(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

function assertDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new MoneyError(`Invalid decimal places: ${decimals}`);
  }
}

// ── on-chain base units ───────────────────────────────────────────────────────────────────────

/** '1.5' (6 decimals) → 1500000n. Throws if the amount has more decimals than the token. */
export function toBaseUnits(value: MoneyInput, decimals: number = USDT_DECIMALS): bigint {
  assertDecimals(decimals);
  const d = money(value);
  if (d.decimalPlaces() > decimals) {
    throw new MoneyError(`Amount ${d.toString()} has more than ${decimals} decimals`);
  }
  return BigInt(d.times(new MoneyDecimal(10).pow(decimals)).toFixed(0));
}

/** 1500000n (6 decimals) → 1.5 */
export function fromBaseUnits(units: bigint | string, decimals: number = USDT_DECIMALS): Money {
  assertDecimals(decimals);
  const s = typeof units === 'bigint' ? units.toString() : units.trim();
  if (!/^-?\d+$/.test(s)) throw new MoneyError(`Invalid base-unit amount "${s}"`);
  return new MoneyDecimal(s).div(new MoneyDecimal(10).pow(decimals));
}

// ── display ───────────────────────────────────────────────────────────────────────────────────

export interface FormatUSDTOptions {
  /** Decimal places to show (0–6). Default 2. */
  decimals?: number;
  /** Append " USDT". Default true. */
  symbol?: boolean;
  /** 'auto' (− for negatives), 'always' (+ for positives too), 'never'. Default 'auto'. */
  sign?: 'auto' | 'always' | 'never';
  /** Minus glyph. Default U+2212 "−" (typographic minus used in the Figma designs). */
  minusSign?: string;
  /** Rounding for display. Default 'down' (truncate — never shows more than the exact amount). */
  rounding?: 'down' | 'half-up';
}

/** Group an integer digit string with commas: '1234567' → '1,234,567'. */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format for display: `formatUSDT('1234.5')` → `'1,234.50 USDT'`, `formatUSDT('-24.6')` → `'−24.60 USDT'`,
 * `formatUSDT('3620.6', { sign: 'always' })` → `'+3,620.60 USDT'`, `{ symbol: false }` → `'1,234.50'`.
 */
export function formatUSDT(value: MoneyInput, options: FormatUSDTOptions = {}): string {
  const {
    decimals = USDT_DISPLAY_DECIMALS,
    symbol = true,
    sign = 'auto',
    minusSign = '−',
    rounding = 'down',
  } = options;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > USDT_DECIMALS) {
    throw new MoneyError(`formatUSDT: decimals must be 0–${USDT_DECIMALS}`);
  }
  const rounded = money(value).toDecimalPlaces(
    decimals,
    rounding === 'down' ? Decimal.ROUND_DOWN : Decimal.ROUND_HALF_UP,
  );
  const [int = '0', frac] = rounded.abs().toFixed(decimals).split('.');
  let prefix = '';
  if (!rounded.isZero() && sign !== 'never') {
    if (rounded.isNegative()) prefix = minusSign;
    else if (sign === 'always') prefix = '+';
  }
  return `${prefix}${groupThousands(int)}${frac ? `.${frac}` : ''}${symbol ? ` ${USDT_SYMBOL}` : ''}`;
}

/** `formatUSDT` without the currency symbol: '1,234.50'. */
export function formatAmount(
  value: MoneyInput,
  options: Omit<FormatUSDTOptions, 'symbol'> = {},
): string {
  return formatUSDT(value, { ...options, symbol: false });
}
