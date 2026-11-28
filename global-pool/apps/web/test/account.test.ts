import { describe, expect, it } from 'vitest';

import { kycState, notificationAction } from '@/components/account/logic';
import { ACCOUNT_TABS, DASHBOARD_TABS, isTabActive } from '@/components/account/nav';
import type { KycView } from '@/lib/api/account';

const kyc = (over: Partial<KycView> & { status?: string | null }): KycView => {
  const { status, ...rest } = over;
  return {
    currentLevel: 'none',
    currentLabel: 'Not verified',
    dailyLimit: '0.00',
    levels: [],
    application: status
      ? ({ status, level: 'level_2' } as unknown as KycView['application'])
      : null,
    ...rest,
  };
};

describe('account logic', () => {
  it('maps the KYC application to the A4 status screen', () => {
    expect(kycState(undefined)).toBe('not_started');
    expect(kycState(kyc({}))).toBe('not_started');
    expect(kycState(kyc({ currentLevel: 'level_2' }))).toBe('verified');
    expect(kycState(kyc({ status: 'not_started' }))).toBe('draft');
    expect(kycState(kyc({ status: 'in_review', currentLevel: 'level_1' }))).toBe('review');
    expect(kycState(kyc({ status: 'resubmission_required', currentLevel: 'level_1' }))).toBe('fix');
    expect(kycState(kyc({ status: 'verified', currentLevel: 'level_2' }))).toBe('verified');
  });

  it('links notifications to the screen that resolves them', () => {
    expect(
      notificationAction({
        type: 'withdrawal.under_review',
        title: 'Withdrawal under review',
        body: 'WD-20931: AML',
      }),
    ).toEqual({ label: 'View status', href: '/wallet/withdraw/WD-20931' });
    expect(
      notificationAction({
        type: 'deposit.credited',
        title: 'Deposit credited',
        body: 'DP-77380 in',
      })?.label,
    ).toBe('View receipt');
    expect(
      notificationAction({ type: 'security.new_device', title: 'New sign-in', body: '' })?.href,
    ).toBe('/account/devices');
    expect(notificationAction({ type: 'kyc.submitted', title: 'x', body: '' })?.href).toBe(
      '/account/kyc',
    );
    expect(notificationAction({ type: 'unknown', title: 'x', body: '' })).toBeNull();
  });

  it('keeps the dashboard sub-nav and account pills in the Figma order', () => {
    expect(DASHBOARD_TABS.map((t) => t.label)).toEqual([
      'Overview',
      'Gaming',
      'Wallet',
      'Account & security',
      'Financial history',
      'VIP',
      'Referrals',
      'Responsible gaming',
      'Notifications',
    ]);
    expect(ACCOUNT_TABS.map((t) => t.label)).toEqual([
      'Profile',
      'Security',
      '2FA',
      'KYC',
      'Documents',
      'Login history',
      'Devices',
      'Sessions',
      'Notification settings',
      'Anti-phishing',
    ]);
    const account = DASHBOARD_TABS.find((t) => t.id === 'account')!;
    expect(isTabActive(account, '/account/kyc/verify')).toBe(true);
    expect(isTabActive(account, '/dashboard')).toBe(false);
  });
});
