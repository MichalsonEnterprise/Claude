import { describe, expect, it } from 'vitest';

import {
  ENTRY_TOTAL_PER_ENTRY,
  MAX_ENTRIES_PER_PURCHASE,
  QuoteError,
  entryQuote,
  withdrawalQuote,
} from '../src/fees';
import { add, eq, sum, toUSDTString } from '../src/money';
import {
  PRIZES_PER_ROUND,
  feesForEntries,
  meetsThreshold,
  oddsDisclosure,
  poolForEntries,
  prizeBreakdown,
} from '../src/pool';

describe('entryQuote', () => {
  it('35 entries → 350.00 + 1.75 fee + 0.00 network = 351.75', () => {
    expect(entryQuote(35)).toEqual({
      entries: 35,
      entryPrice: '10.00',
      entryAmount: '350.00',
      platformFeePerEntry: '0.05',
      platformFee: '1.75',
      networkFee: '0.00',
      total: '351.75',
      currency: 'USDT',
    });
  });

  it('1 entry costs 10.05 and the maximum purchase is exact', () => {
    expect(entryQuote(1).total).toBe(ENTRY_TOTAL_PER_ENTRY);
    expect(entryQuote(MAX_ENTRIES_PER_PURCHASE)).toMatchObject({
      entryAmount: '10000.00',
      platformFee: '50.00',
      total: '10050.00',
    });
  });

  it('keeps the platform fee a separate line from the entry amount', () => {
    for (const n of [1, 3, 7, 33, 999]) {
      const q = entryQuote(n);
      expect(eq(add(q.entryAmount, q.platformFee), q.total)).toBe(true);
      expect(q.entryAmount).toBe(poolForEntries(n));
      expect(q.platformFee).toBe(feesForEntries(n));
    }
  });

  it('rejects out-of-range or fractional entry counts', () => {
    expect(() => entryQuote(0)).toThrow(QuoteError);
    expect(() => entryQuote(1001)).toThrow(QuoteError);
    expect(() => entryQuote(2.5)).toThrow(QuoteError);
    expect(() => entryQuote(Number.NaN)).toThrow(QuoteError);
  });
});

describe('withdrawalQuote', () => {
  it('WD-20931: 1,500.00 on Arbitrum → fee 0.08, platform 0.00, receive 1,499.92', () => {
    expect(withdrawalQuote('1500.00', 'arbitrum')).toEqual({
      network: 'arbitrum',
      amount: '1500.00',
      networkFee: '0.08',
      platformFee: '0.00',
      youReceive: '1499.92',
      minWithdrawal: '20.00',
      meetsMinimum: true,
      currency: 'USDT',
    });
  });

  it('WD-20877: 800.00 on BNB Chain → 799.88', () => {
    expect(withdrawalQuote('800', 'bnb').youReceive).toBe('799.88');
  });

  it('accepts a live network fee override', () => {
    expect(withdrawalQuote('100', 'arbitrum', { networkFee: '0.031234' }).youReceive).toBe(
      '99.968766',
    );
  });

  it('flags amounts below the minimum and never returns a negative receive amount', () => {
    const q = withdrawalQuote('5', 'arbitrum');
    expect(q.meetsMinimum).toBe(false);
    const eth = withdrawalQuote('1.00', 'ethereum');
    expect(eth.youReceive).toBe('0.00');
    expect(eth.meetsMinimum).toBe(false);
  });

  it('rejects invalid input', () => {
    expect(() => withdrawalQuote('-1', 'arbitrum')).toThrow(QuoteError);
    expect(() => withdrawalQuote('abc', 'arbitrum')).toThrow(QuoteError);
    // @ts-expect-error — runtime guard for untyped callers
    expect(() => withdrawalQuote('100', 'dogecoin')).toThrow(QuoteError);
  });
});

describe('pool rules', () => {
  it('round #1,248: pool 186,400.00 and fees 932.00 from 18,640 entries', () => {
    expect(poolForEntries(18640)).toBe('186400.00');
    expect(feesForEntries(18640)).toBe('932.00');
  });

  it('prize split 50 / 20 / 10 / 10 × 2 sums to the whole pool', () => {
    const b = prizeBreakdown('186400.00');
    expect(b.tiers.map((t) => [t.tier, t.amountEach, t.amountTotal])).toEqual([
      ['first', '93200.00', '93200.00'],
      ['second', '37280.00', '37280.00'],
      ['third', '18640.00', '18640.00'],
      ['runner_up', '3728.00', '37280.00'],
    ]);
    expect(b.totalPaid).toBe('186400.00');
    expect(b.remainder).toBe('0.00');
    expect(PRIZES_PER_ROUND).toBe(13);
  });

  it('rounds prizes down and reports dust instead of inventing money', () => {
    const b = prizeBreakdown('0.000007');
    expect(toUSDTString(sum([b.totalPaid, b.remainder]))).toBe('0.000007');
    expect(b.tiers[0]!.amountEach).toBe('0.000003');
  });

  it('threshold: ≥ 500 participants AND ≥ 50,000.00 pool', () => {
    expect(meetsThreshold({ participants: 3412, poolBalance: '186400.00' })).toBe(true);
    expect(meetsThreshold({ participants: 412, poolBalance: '41200.00' })).toBe(false);
    expect(meetsThreshold({ participants: 900, poolBalance: '49999.99' })).toBe(false);
  });

  it('odds for 35 of 18,640 entries: ≈2.44% (sheet upper bound), exact ≈2.41%, 1st 0.188%', () => {
    const o = oddsDisclosure(35, 18640);
    expect(o.anyPrizeApproxPercent).toBe('2.441');
    expect(o.firstPrizePercent).toBe('0.188');
    expect(Number(o.anyPrizePercent)).toBeGreaterThan(2.4);
    expect(Number(o.anyPrizePercent)).toBeLessThan(2.44);
    expect(oddsDisclosure(18640, 18640).anyPrizePercent).toBe('100');
    expect(oddsDisclosure(0, 100).anyPrizePercent).toBe('0');
    expect(() => oddsDisclosure(5, 4)).toThrow(RangeError);
  });
});
