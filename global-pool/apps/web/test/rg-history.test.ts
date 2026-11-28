import { describe, expect, it } from 'vitest';

import { minutesLabel, num, ratio, signed, toneOf } from '@/components/rg-history/format';
import { txAmount, txStatus, txTitle } from '@/components/rg-history/history-common';
import { isPlayRoute } from '@/components/rg-history/reality-check';
import { selfCheckBand } from '@/components/rg-history/self-check';
import type { TxView } from '@/lib/api/rg-history';

const tx = (over: Partial<TxView>): TxView => ({
  id: 'DP-77412',
  uuid: 'u1',
  type: 'deposit',
  status: 'completed',
  direction: 'in',
  network: 'arbitrum',
  amount: '1000.00',
  networkFee: null,
  platformFee: '0.00',
  netAmount: '1000.00',
  addressDisplay: null,
  txHash: null,
  txHashDisplay: '0x5e1f…c0a8',
  confirmations: null,
  description: 'Deposit · Arbitrum',
  statusDetail: null,
  roundId: null,
  createdAt: '2026-11-28T18:40:12.000Z',
  completedAt: null,
  isDemo: true,
  ...over,
});

describe('rg-history formatting (decimal strings, never floats)', () => {
  it('formats money and signs', () => {
    expect(num('5000')).toBe('5,000.00');
    expect(signed('-24.6')).toBe('−24.60');
    expect(signed('300')).toBe('+300.00');
    expect(signed('0')).toBe('0.00');
    expect(toneOf('-1')).toBe('text-text-danger');
    expect(toneOf('0.00')).toBe('text-text-primary');
  });

  it('labels minutes like the designs', () => {
    expect(minutesLabel(120)).toBe('2 h 00 min');
    expect(minutesLabel(72)).toBe('1 h 12 min');
    expect(minutesLabel(45)).toBe('45 min');
    expect(minutesLabel(null)).toBe('—');
  });

  it('computes meter ratios from decimal strings and clamps them', () => {
    expect(ratio('351.75', '500.00')).toBeCloseTo(0.7035, 4);
    expect(ratio('600', '500')).toBe(1);
    expect(ratio('1', '0')).toBe(0);
    expect(ratio(null, '10')).toBe(0);
  });
});

describe('transaction presentation', () => {
  it('signs amounts by direction; entries show the stake (the fee is its own line, Q26); rejected withdrawals move nothing', () => {
    expect(txAmount(tx({})).text).toBe('+1,000.00');
    expect(
      txAmount(
        tx({ type: 'entry_purchase', direction: 'out', amount: '350.00', netAmount: '351.75' }),
      ).text,
    ).toBe('−350.00');
    expect(
      txAmount(tx({ type: 'withdrawal', direction: 'out', status: 'rejected', amount: '250.00' }))
        .tone,
    ).toContain('line-through');
  });

  it('maps statuses to badges with the Figma labels', () => {
    expect(
      txStatus(tx({ status: 'confirming', confirmations: { current: 7, required: 12 } })),
    ).toEqual({
      status: 'processing',
      label: 'Confirming 7/12',
    });
    expect(txStatus(tx({ type: 'refund', status: 'pending' })).label).toBe('Owed');
    expect(txStatus(tx({ type: 'entry_purchase', roundId: 'r1' }), { r1: 'open' })).toEqual({
      status: 'live',
      label: 'In round',
    });
    expect(txStatus(tx({ type: 'entry_purchase', roundId: 'r1' }), { r1: 'cancelled' }).label).toBe(
      'Round cancelled',
    );
  });

  it('titles entry purchases as "Round #n · k entries" with the fee as its own line', () => {
    const t = txTitle(
      tx({
        type: 'entry_purchase',
        description: '35 entries · Round #1,248',
        amount: '350.00',
        platformFee: '1.75',
        netAmount: '351.75',
      }),
    );
    expect(t).toEqual({
      title: 'Round #1,248 · 35 entries',
      sub: 'Entries 350.00 · 351.75 paid with the platform fee below',
    });
  });
});

describe('responsible gaming helpers', () => {
  it('counts play time only on Global Pool / game routes', () => {
    expect(isPlayRoute('/pool')).toBe(true);
    expect(isPlayRoute('/games/pool-dice')).toBe(true);
    expect(isPlayRoute('/history/games')).toBe(false);
    expect(isPlayRoute('/responsible-gaming')).toBe(false);
    expect(isPlayRoute(null)).toBe(false);
  });

  it('maps self-check scores to PGSI bands', () => {
    expect(selfCheckBand(0)).toBe('none');
    expect(selfCheckBand(2)).toBe('low');
    expect(selfCheckBand(7)).toBe('moderate');
    expect(selfCheckBand(8)).toBe('high');
  });
});
