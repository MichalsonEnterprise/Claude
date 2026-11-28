import { describe, expect, it } from 'vitest';

import { MockAmlProvider } from './aml.provider';

const input = {
  userId: 'u',
  network: 'arbitrum' as const,
  address: '0x7c4e00000000000000000000000000000000a21d',
  amount: '1500.00',
  newDestination: false,
  whitelisted: true,
  withdrawalsLast24h: 0,
  accountAgeDays: 30,
};

describe('mock AML screening', () => {
  const aml = new MockAmlProvider();

  it('approves known destinations below the review threshold (6 checks)', async () => {
    const r = await aml.screenWithdrawal(input);
    expect(r).toMatchObject({ decision: 'approve', riskLevel: 'low' });
    expect(r.checks).toHaveLength(6);
  });

  it('sends new destinations and large amounts to manual review', async () => {
    expect((await aml.screenWithdrawal({ ...input, newDestination: true })).decision).toBe(
      'review',
    );
    expect((await aml.screenWithdrawal({ ...input, amount: '25000.00' })).riskLevel).toBe('high');
  });

  it('rejects sanctioned (DEMO list) destinations', async () => {
    const r = await aml.screenWithdrawal({
      ...input,
      address: '0x000000000000000000000000000000000000dEaD',
    });
    expect(r).toMatchObject({ decision: 'reject', riskLevel: 'critical' });
  });
});
