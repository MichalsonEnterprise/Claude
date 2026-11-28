/**
 * Close-out pass 2 (api-b, web side): Q18 the under-review page shows an AML withdrawals hold, R27b the deposit
 * tracker (`/wallet/deposit?ref=DP-…`) stays open from a restricted location and a failed deposits list on /wallet
 * is an error, never "Nothing in progress". Each test failed on the code before its fix.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RestrictedView } from '@/components/auth/restricted';
import { gateView } from '@/components/compliance/compliance-gate';
import { isAgeGated, isGeoGated } from '@/components/compliance/routes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InProgressCard } from '@/components/wallet/overview';
import type { AccountStatus } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';
import { walletKeys, type WalletBalances } from '@/lib/api/wallet';
import { AuthContext } from '@/lib/auth/context';
import type { AuthContextValue } from '@/lib/auth/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/wallet',
  useSearchParams: () => new URLSearchParams(),
}));

const MEMBER: AuthContextValue = {
  mode: 'mock',
  status: 'member',
  user: { id: 'u1', handle: 'nova.k', displayName: null, initials: 'NK', isDemo: true } as never,
  signIn: () => undefined,
  signUp: () => undefined,
  signOut: () => Promise.resolve(),
  getAccessToken: () => Promise.resolve(null),
  openAuth: () => undefined,
};

function render(node: React.ReactNode, seed?: (qc: QueryClient) => void): string {
  const qc = new QueryClient({
    defaultOptions: { queries: { retryOnMount: false, staleTime: Infinity, retry: false } },
  });
  seed?.(qc);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={MEMBER}>
        <TooltipProvider>{node}</TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

/** Visible text of server markup (tags stripped, entities decoded). */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

describe('Q18 /restricted/under-review with an AML withdrawals freeze', () => {
  const frozen: AccountStatus = {
    gate: 'under_review',
    onboarded: true,
    status: 'active',
    restrictions: [{ type: 'withdrawals_frozen', since: '2026-11-28T06:10:00Z', reference: 'FRZ-1A2B3C' }],
    paused: { gaming: false, deposits: false, withdrawals: true },
    selfExclusion: { active: false, startsAt: null, endsAt: null, kind: null },
    region: {
      current: { code: 'PT', name: 'Portugal', permitted: true },
      declared: { code: 'PT', name: 'Portugal', permitted: true },
      permitted: true,
    },
    isDemo: true,
  };

  it('says withdrawals are on hold, lists them as paused, shows the case reference and leads with support', () => {
    const html = render(<RestrictedView variant="under-review" status={frozen} balances={null} />);
    const t = text(html);
    expect(t).not.toMatch(/withdrawals stay open/i);
    expect(t).not.toContain('No restrictions on your account');
    expect(t).toContain('Withdrawals are on hold until the review ends');
    expect(t).toMatch(/Paused during the review.*Withdrawals/);
    expect(t).toContain('FRZ-1A2B3C');
    // The first call to action is support; the withdraw button is shown as unavailable, never as a link.
    expect(html.indexOf('Contact support')).toBeLessThan(html.indexOf('Withdraw available balance'));
    expect(html).not.toMatch(/<a[^>]*href="\/wallet"[^>]*>Withdraw available balance/);
  });

  it('a review without a freeze still says withdrawals stay open', () => {
    const blocked: AccountStatus = {
      ...frozen,
      restrictions: [{ type: 'gaming_blocked', since: '2026-11-28T06:10:00Z', reference: 'REV-9Z8Y7X' }],
      paused: { gaming: true, deposits: false, withdrawals: false },
    };
    const t = text(render(<RestrictedView variant="under-review" status={blocked} balances={null} />));
    expect(t).toMatch(/withdrawals stay open/i);
    expect(t).not.toContain('Withdrawals are on hold');
  });
});

describe('R27b the deposit tracker stays open from a restricted location', () => {
  it('only NEW deposits are geo-gated: ?ref=DP-… (confirmations, DEMO blocks, receipt) is not', () => {
    expect(isGeoGated('/wallet/deposit')).toBe(true);
    expect(isGeoGated('/wallet/deposit?step=address')).toBe(true);
    expect(isGeoGated('/wallet/deposit?ref=not-a-ref')).toBe(true);
    expect(isGeoGated('/wallet/deposit?ref=DP-77412')).toBe(false);
    expect(isGeoGated('/wallet/deposit?ref=DP-77412&step=confirmation')).toBe(false);
    expect(isGeoGated('/wallet/deposit', 'ref=DP-77412&step=pending')).toBe(false);
    // Search not read yet → the path alone decides (held while loading, never a flash of the deposit form).
    expect(isGeoGated('/wallet/deposit', null)).toBe(true);
    expect(isGeoGated('/games?ref=DP-1')).toBe(true);
    // The age gate is unchanged (guests only; the tracker needs sign-in anyway).
    expect(isAgeGated('/wallet/deposit?ref=DP-77412')).toBe(true);
  });

  it('gateView: restricted location + tracker → the page; + new deposit → the interstitial', () => {
    const base = {
      pathname: '/wallet/deposit',
      geo: { status: 'success' as const, permitted: false },
      auth: 'member' as const,
      ageConfirmed: true,
      underAge: false,
    };
    expect(gateView({ ...base, search: 'ref=DP-77412' })).toBe('page');
    expect(gateView({ ...base, search: 'step=address' })).toBe('geo');
    expect(gateView({ ...base, search: null })).toBe('geo');
  });
});

describe('R27b /wallet "In progress" never hides a failed deposits list', () => {
  const balances: WalletBalances = {
    currency: 'USDT',
    available: '0.00',
    locked: '0.00',
    pending: '40.00',
    owed: '0.00',
    total: '40.00',
    breakdown: { lockedWithdrawals: '0.00', lockedEntries: '0.00', locked: [], pending: [], owed: [] },
  };

  it('a refused GET /deposits shows the error, not "Nothing in progress"', () => {
    const html = render(<InProgressCard balances={balances} />, (qc) => {
      qc.getQueryCache()
        .build(qc, { queryKey: walletKeys.deposits() })
        .setState({
          status: 'error',
          error: new ApiRequestError(
            403,
            '/deposits',
            'You are on a break',
            'SELF_EXCLUDED',
            'r1',
            undefined,
            { kind: 'cooling_off' },
          ),
          errorUpdatedAt: Date.now(),
          fetchStatus: 'idle',
        });
      qc.setQueryData(walletKeys.withdrawals(), { items: [], total: 0, page: 1, pageSize: 20 });
    });
    const t = text(html);
    expect(t).not.toContain('Nothing in progress');
    expect(t).toContain('You are on a break');
    expect(t).toContain('Your balance is safe.');
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it('a loaded empty list still says "Nothing in progress"', () => {
    const html = render(<InProgressCard balances={balances} />, (qc) => {
      qc.setQueryData(walletKeys.deposits(), { items: [], total: 0, page: 1, pageSize: 20 });
      qc.setQueryData(walletKeys.withdrawals(), { items: [], total: 0, page: 1, pageSize: 20 });
    });
    expect(text(html)).toContain('Nothing in progress');
  });
});
