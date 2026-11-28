import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { composition } from '@/components/wallet/balance-breakdown';
import { StatusTimeline } from '@/components/wallet/timeline';
import { signedAmount, txSubtitle, txTitle } from '@/components/wallet/tx-list';
import { stepUpError } from '@/components/wallet/two-factor';
import { phaseOf, withdrawalTimeline } from '@/components/wallet/withdrawal-status';
import { ApiRequestError } from '@/lib/api/client';
import type { TxView, WalletBalances, WithdrawalView } from '@/lib/api/wallet';

const tx = (over: Partial<TxView>): TxView => ({
  id: 'WD-20931',
  uuid: 'u',
  type: 'withdrawal',
  status: 'under_review',
  direction: 'out',
  network: 'arbitrum',
  amount: '1500.00',
  networkFee: '0.08',
  platformFee: '0.00',
  netAmount: '1499.92',
  addressDisplay: '0x7c4e…a21d',
  txHash: null,
  txHashDisplay: null,
  confirmations: null,
  description: 'Withdrawal · Arbitrum',
  statusDetail: 'Routine AML screening for new destinations — usually under 4 h',
  roundId: null,
  createdAt: '2026-11-28T18:44:00.000Z',
  completedAt: null,
  isDemo: true,
  ...over,
});

const withdrawal = (over: Partial<WithdrawalView>): WithdrawalView => ({
  id: 'id',
  reference: 'WD-20931',
  network: 'arbitrum',
  toAddress: '0x7c4e00000000000000000000000000000000a21d',
  amount: '1500.00',
  networkFee: '0.08',
  platformFee: '0.00',
  youReceive: '1499.92',
  status: 'under_review',
  statusLabel: 'Under review',
  flagged: true,
  requiresFourEyes: true,
  riskLevel: 'medium',
  txHash: null,
  rejectionReason: null,
  failureReason: null,
  timeline: [
    { status: 'requested', label: 'Submitted', at: '2026-11-28T18:44:00.000Z' },
    { status: 'risk_check', label: 'Security checks', at: '2026-11-28T18:44:01.000Z' },
    { status: 'under_review', label: 'Routine AML screening', at: '2026-11-28T18:44:03.000Z' },
  ],
  createdAt: '2026-11-28T18:44:00.000Z',
  updatedAt: '2026-11-28T18:44:03.000Z',
  isDemo: true,
  ...over,
});

describe('transaction rows (WAL-20)', () => {
  it('titles entries with their count and keeps the platform fee as its own line', () => {
    const entry = tx({
      id: 'EP-1248-00981-01015',
      type: 'entry_purchase',
      status: 'completed',
      network: null,
      amount: '350.00',
      platformFee: '1.75',
      netAmount: '351.75',
      description: '35 entries · Round #1,248',
      addressDisplay: null,
    });
    expect(txTitle(entry)).toBe('Global Pool entries ×35');
    expect(txSubtitle(entry)).toContain('platform fee 1.75 billed separately');
    expect(signedAmount(entry)).toBe('-350.00');
  });

  it('shows confirmations for confirming deposits and a "+" amount for money in', () => {
    const dep = tx({
      id: 'DP-77412',
      type: 'deposit',
      status: 'confirming',
      direction: 'in',
      network: 'ethereum',
      amount: '1000.00',
      confirmations: { current: 7, required: 12 },
      addressDisplay: null,
    });
    expect(txSubtitle(dep)).toBe('DP-77412 · Ethereum · 7 / 12 confirmations');
    expect(signedAmount(dep)).toBe('1000.00');
  });
});

describe('balance composition (WAL-01)', () => {
  it('formats the API breakdown with thousands separators', () => {
    const b = {
      breakdown: {
        locked: [
          { label: 'Active entries — round #1,248', amount: '350.00', reference: 'round:1248' },
          { label: 'Pending withdrawal WD-20931', amount: '1500.00', reference: 'WD-20931' },
        ],
        pending: [],
        owed: [],
      },
    } as unknown as WalletBalances;
    expect(composition(b, 'locked')).toBe(
      '350.00 in active entries · round #1,248 + 1,500.00 pending withdrawal WD-20931',
    );
    expect(composition(b, 'pending')).toBe('Nothing pending right now');
  });
});

describe('withdrawal status (WAL-17/18/19/22)', () => {
  it('maps every state-machine status to a phase', () => {
    expect(phaseOf({ status: 'requested' })).toBe('processing');
    expect(phaseOf({ status: 'under_review' })).toBe('review');
    expect(phaseOf({ status: 'queued' })).toBe('queued');
    expect(phaseOf({ status: 'confirmed' })).toBe('success');
    expect(phaseOf({ status: 'rejected' })).toBe('failed');
    expect(phaseOf({ status: 'failed' })).toBe('failed');
    expect(phaseOf({ status: 'cancelled' })).toBe('cancelled');
  });

  it('builds the review timeline with what comes next', () => {
    const items = withdrawalTimeline(withdrawal({}));
    expect(items.map((i) => [i.id, i.state])).toEqual([
      ['requested', 'done'],
      ['checks', 'done'],
      ['review', 'review'],
      ['sent', 'todo'],
      ['confirmed', 'todo'],
    ]);
  });

  it('ends a rejected withdrawal with "Returned to Available" (no fees)', () => {
    const items = withdrawalTimeline(
      withdrawal({
        status: 'rejected',
        timeline: [
          { status: 'requested', label: 'Submitted', at: '2026-11-28T18:44:00.000Z' },
          { status: 'risk_check', label: 'Security checks', at: '2026-11-28T18:44:01.000Z' },
          { status: 'rejected', label: 'Rejected — sanctions', at: '2026-11-28T18:45:00.000Z' },
        ],
      }),
    );
    expect(items.at(-2)).toMatchObject({ id: 'rejected', state: 'error' });
    expect(items.at(-1)).toMatchObject({ id: 'returned', state: 'done' });
  });

  it('renders timeline states with text, not colour only', () => {
    const html = renderToStaticMarkup(
      <StatusTimeline
        items={[
          { id: 'a', title: 'Requested', state: 'done' },
          { id: 'b', title: 'Review', state: 'review' },
          { id: 'c', title: 'Sent', state: 'todo' },
        ]}
      />,
    );
    expect(html).toContain('Done:');
    expect(html).toContain('Under review:');
    expect(html).toContain('Not yet:');
  });
});

describe('step-up errors (WAL-16 / WAL-23)', () => {
  it('maps wrong code, lockout and missing 2FA to plain language', () => {
    const wrong = new ApiRequestError(
      401,
      '/withdrawals',
      'Incorrect or expired code',
      'STEP_UP_REQUIRED',
      'r1',
      undefined,
      {
        reason: 'invalid_code',
        attemptsRemaining: 3,
      },
    );
    expect(stepUpError(wrong)).toMatchObject({ kind: 'invalid', attemptsRemaining: 3 });
    expect(stepUpError(wrong)?.message).toContain('3 of 5 attempts left');

    const locked = new ApiRequestError(
      423,
      '/withdrawals',
      'Locked',
      'STEP_UP_LOCKED',
      'r2',
      undefined,
      {
        lockedUntil: '2026-11-28T18:58:00.000Z',
      },
    );
    expect(stepUpError(locked)).toMatchObject({ kind: 'locked' });
    expect(stepUpError(locked)?.message).toContain('18:58 UTC');

    const off = new ApiRequestError(
      401,
      '/withdrawals',
      'Set up',
      'STEP_UP_REQUIRED',
      'r3',
      undefined,
      {
        reason: 'enroll_2fa',
      },
    );
    expect(stepUpError(off)?.kind).toBe('not_enrolled');
    expect(stepUpError(new Error('x'))).toBeNull();
  });
});
