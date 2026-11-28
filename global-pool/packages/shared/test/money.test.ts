import { Decimal } from 'decimal.js';
import { describe, expect, it } from 'vitest';

import {
  MoneyError,
  add,
  compare,
  eq,
  formatAmount,
  formatUSDT,
  fromBaseUnits,
  isUSDTAmount,
  max,
  min,
  money,
  mul,
  parseUSDT,
  percentOf,
  roundDown,
  roundHalfUp,
  sub,
  sum,
  toBaseUnits,
  toUSDTString,
} from '../src/money';

describe('parseUSDT / toUSDTString', () => {
  it('parses decimal strings and keeps exact values', () => {
    expect(parseUSDT('1234.5').toFixed(2)).toBe('1234.50');
    expect(parseUSDT(' 0.000001 ').toString()).toBe('0.000001');
    expect(toUSDTString('1234.5')).toBe('1234.50');
    expect(toUSDTString('351.75')).toBe('351.75');
    expect(toUSDTString('0')).toBe('0.00');
    expect(toUSDTString('-0')).toBe('0.00');
    expect(toUSDTString('0.123456')).toBe('0.123456');
    expect(toUSDTString(10n)).toBe('10.00');
    expect(toUSDTString(35)).toBe('35.00');
  });

  it('rejects more than 6 decimals, malformed strings and floats', () => {
    expect(() => parseUSDT('1.1234567')).toThrow(MoneyError);
    expect(() => parseUSDT('1,234.50')).toThrow(MoneyError);
    expect(() => parseUSDT('1e3')).toThrow(MoneyError);
    expect(() => parseUSDT('NaN')).toThrow(MoneyError);
    expect(() => parseUSDT('')).toThrow(MoneyError);
    expect(() => parseUSDT(0.1)).toThrow(/float/);
    expect(() => parseUSDT(Number.NaN)).toThrow(MoneyError);
    expect(() => toUSDTString(new Decimal('1.0000001'))).toThrow(MoneyError);
    expect(isUSDTAmount('10.05')).toBe(true);
    expect(isUSDTAmount('10.0000001')).toBe(false);
    expect(isUSDTAmount(10)).toBe(false);
  });

  it('accepts Decimal instances from another decimal.js copy (e.g. Prisma.Decimal) and DecimalLike objects', () => {
    const Other = Decimal.clone({ precision: 20 });
    expect(toUSDTString(new Other('9215.3'))).toBe('9215.30');
    expect(toUSDTString({ toFixed: () => '415.2' })).toBe('415.20');
    expect(() => money(new Decimal(Infinity))).toThrow(MoneyError);
  });

  it('re-wraps foreign decimal instances so our precision applies (clones share a prototype)', () => {
    const LowPrecision = Decimal.clone({ precision: 5 });
    const big = new LowPrecision('12846500.25');
    expect(toUSDTString(add(big, '0.000001'))).toBe('12846500.250001');
    expect(money(big).constructor).not.toBe(LowPrecision);
  });
});

describe('arithmetic — no float drift', () => {
  it('0.1 + 0.2 is exactly 0.3', () => {
    expect(toUSDTString(add('0.1', '0.2'))).toBe('0.30');
    expect(eq(add('0.1', '0.2'), '0.3')).toBe(true);
  });

  it('sums the demo balances to 12,480.50', () => {
    const total = sum(['9215.30', '1850.00', '1000.00', '415.20']);
    expect(toUSDTString(total)).toBe('12480.50');
    expect(formatUSDT(total)).toBe('12,480.50 USDT');
  });

  it('adding 0.05 eighteen-thousand times is exact (round #1,248 fees = 932.00)', () => {
    let acc = money(0);
    for (let i = 0; i < 18640; i++) acc = acc.plus(money('0.05'));
    expect(toUSDTString(acc)).toBe('932.00');
    expect(toUSDTString(mul('0.05', 18640))).toBe('932.00');
    // the float version drifts — this is exactly what the helpers prevent
    let float = 0;
    for (let i = 0; i < 18640; i++) float += 0.05;
    expect(float === 932).toBe(false);
  });

  it('sub / mul / percentOf / compare / min / max', () => {
    expect(toUSDTString(sub('1500.00', '0.08'))).toBe('1499.92');
    expect(toUSDTString(mul('10.00', 18640))).toBe('186400.00');
    expect(toUSDTString(percentOf('186400.00', '50'))).toBe('93200.00');
    expect(toUSDTString(percentOf('181030.00', '2'))).toBe('3620.60');
    expect(compare('1', '2')).toBe(-1);
    expect(compare('2.00', '2')).toBe(0);
    expect(compare('3', '2')).toBe(1);
    expect(toUSDTString(min('5', '3'))).toBe('3.00');
    expect(toUSDTString(max('5', '3'))).toBe('5.00');
    expect(toUSDTString(sum([]))).toBe('0.00');
  });

  it('roundDown truncates toward zero; roundHalfUp rounds half away from zero', () => {
    expect(roundDown('1.2345679').toString()).toBe('1.234567');
    expect(roundDown('1.239', 2).toFixed(2)).toBe('1.23');
    expect(roundDown('-1.239', 2).toFixed(2)).toBe('-1.23');
    expect(roundHalfUp('1.235', 2).toFixed(2)).toBe('1.24');
    expect(toUSDTString(roundDown(mul('3728', '0.3333333')))).toBe('1242.666542');
    expect(() => roundDown('1', -1)).toThrow(MoneyError);
  });
});

describe('base units', () => {
  it('round-trips 6-decimal USDT', () => {
    expect(toBaseUnits('1.5')).toBe(1_500_000n);
    expect(toBaseUnits('1000.00')).toBe(1_000_000_000n);
    expect(toUSDTString(fromBaseUnits(1_499_920_000n))).toBe('1499.92');
    expect(toBaseUnits('2500', 18)).toBe(2500n * 10n ** 18n);
    expect(() => toBaseUnits('0.0000001')).toThrow(MoneyError);
    expect(() => fromBaseUnits('1.5')).toThrow(MoneyError);
  });
});

describe('formatUSDT', () => {
  it('formats with grouping, 2 decimals and the USDT symbol', () => {
    expect(formatUSDT('1234.5')).toBe('1,234.50 USDT');
    expect(formatUSDT('186400')).toBe('186,400.00 USDT');
    expect(formatUSDT('0.05')).toBe('0.05 USDT');
    expect(formatUSDT('0')).toBe('0.00 USDT');
    expect(formatUSDT('12846500.00')).toBe('12,846,500.00 USDT');
  });

  it('uses the typographic minus, optional plus sign and no symbol', () => {
    expect(formatUSDT('-24.6')).toBe('−24.60 USDT');
    expect(formatUSDT('3620.6', { sign: 'always' })).toBe('+3,620.60 USDT');
    expect(formatUSDT('-24.6', { minusSign: '-' })).toBe('-24.60 USDT');
    expect(formatUSDT('-0.001')).toBe('0.00 USDT');
    expect(formatAmount('9215.3')).toBe('9,215.30');
    expect(formatUSDT('1.234567', { decimals: 6 })).toBe('1.234567 USDT');
    expect(formatUSDT('1234', { decimals: 0 })).toBe('1,234 USDT');
  });

  it('truncates by default (never displays more than the exact amount)', () => {
    expect(formatUSDT('0.019')).toBe('0.01 USDT');
    expect(formatUSDT('0.015', { rounding: 'half-up' })).toBe('0.02 USDT');
    expect(() => formatUSDT('1', { decimals: 7 })).toThrow(MoneyError);
  });
});
