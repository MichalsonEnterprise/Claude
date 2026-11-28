import { entryQuote } from '@gp/shared/fees';
import { describe, expect, it } from 'vitest';

import {
  LedgerError,
  accountCode,
  depositCreditedLines,
  depositDetectedLines,
  entryPurchaseLines,
  normalizePosting,
  owedClaimLines,
  prizeAwardLines,
  roundRefundLines,
  roundSettlementLines,
  sumLines,
  withdrawalLockLines,
  withdrawalReleaseLines,
  withdrawalSettleLines,
  type PostingLineInput,
} from './posting';

const U = '11111111-1111-4111-8111-111111111111';
const V = '22222222-2222-4222-8222-222222222222';
const R = '33333333-3333-4333-8333-333333333333';

function balanced(lines: PostingLineInput[]) {
  const normalized = normalizePosting(lines);
  expect(sumLines(normalized)).toBe('0.00');
  return normalized;
}

describe('double-entry posting rules', () => {
  it('rejects unbalanced postings', () => {
    expect(() =>
      normalizePosting([
        { account: { type: 'user_available', userId: U }, amount: '-10.00' },
        { account: { type: 'fees' }, amount: '9.99' },
      ]),
    ).toThrow(LedgerError);
  });

  it('rejects single-line, zero and >6-decimal lines', () => {
    expect(() => normalizePosting([{ account: { type: 'fees' }, amount: '1' }])).toThrow(
      /at least two/,
    );
    expect(() =>
      normalizePosting([
        { account: { type: 'fees' }, amount: '0' },
        { account: { type: 'refunds' }, amount: '0' },
      ]),
    ).toThrow(/non-zero/);
    expect(() =>
      normalizePosting([
        { account: { type: 'fees' }, amount: '0.0000001' },
        { account: { type: 'refunds' }, amount: '-0.0000001' },
      ]),
    ).toThrow(LedgerError);
  });

  it('refuses JS floats as money', () => {
    expect(() =>
      normalizePosting([
        { account: { type: 'fees' }, amount: 0.1 },
        { account: { type: 'refunds' }, amount: -0.1 },
      ]),
    ).toThrow();
  });

  it('builds stable account codes', () => {
    expect(accountCode({ type: 'user_available', userId: U })).toBe(`user:${U}:available`);
    expect(accountCode({ type: 'pool', roundId: R })).toBe(`pool:${R}`);
    expect(accountCode({ type: 'chain_clearing', network: 'arbitrum' })).toBe(
      'chain_clearing:arbitrum',
    );
    expect(accountCode({ type: 'fees' })).toBe('fees');
  });

  it('entry purchase for 35 entries: Available −351.75, pool +350.00, fees +1.75 (fee never in the pool)', () => {
    const lines = balanced(entryPurchaseLines(U, R, entryQuote(35)));
    expect(lines.map((l) => [l.code, l.amount, l.userId])).toEqual([
      [`user:${U}:available`, '-351.75', U],
      [`pool:${R}`, '350.00', U],
      ['fees', '1.75', U],
    ]);
  });

  it('deposit detected → credited moves CHAIN_CLEARING → PENDING → AVAILABLE', () => {
    expect(balanced(depositDetectedLines(U, 'arbitrum', '1000')).map((l) => l.amount)).toEqual([
      '-1000.00',
      '1000.00',
    ]);
    expect(balanced(depositCreditedLines(U, '1000')).map((l) => l.code)).toEqual([
      `user:${U}:pending`,
      `user:${U}:available`,
    ]);
  });

  it('withdrawal lock / release / settle balance (network fee to operator revenue, net to chain clearing)', () => {
    balanced(withdrawalLockLines(U, '1500.00'));
    balanced(withdrawalReleaseLines(U, '1500.00'));
    const settle = balanced(
      withdrawalSettleLines(U, 'arbitrum', {
        amount: '1500.00',
        networkFee: '0.08',
        platformFee: '0.00',
      }),
    );
    expect(settle.map((l) => [l.code, l.amount])).toEqual([
      [`user:${U}:locked`, '-1500.00'],
      ['chain_clearing:arbitrum', '1499.92'],
      ['operator_revenue', '0.08'],
    ]);
  });

  it('settlement, prize award, refunds and owed claims all sum to zero', () => {
    balanced(roundSettlementLines(R, '186400.00'));
    balanced(
      prizeAwardLines([
        { userId: U, amount: '93200.00' },
        { userId: V, amount: '93200.00' },
      ]),
    );
    const refund = balanced(
      roundRefundLines(R, [
        { userId: U, amount: '300.00' },
        { userId: V, amount: '50.00' },
      ]),
    );
    expect(refund.filter((l) => l.code === `pool:${R}`).map((l) => l.amount)).toEqual([
      '-300.00',
      '-50.00',
    ]);
    balanced(owedClaimLines(U, '415.20'));
  });
});
