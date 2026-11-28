/**
 * Close-out regressions (web): cache isolation + invalidation (R38 R40 R43), unknown write outcomes (R41), withdraw
 * MAX (R49), deposit confirmation freshness (R39), homepage last-round caption (R30), shell member data (R37),
 * self-exclusion scope copy (R26) and "every navigation link resolves to a built page" (R11 R57).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DASHBOARD_TABS } from '@/components/account/nav';
import { ADMIN_QUERY_ROOTS, clearAdminData } from '@/components/admin-a/session';
import { RestrictedView } from '@/components/auth/restricted';
import { TooltipProvider } from '@/components/ui/tooltip';
import { lastRoundCaption } from '@/components/home/hero';
import { poolKeys } from '@/components/pool/use-pool';
import { AppShellFrame, SHELL_POOL_KEYS } from '@/components/shell/app-shell';
import { FOOTER_COLUMNS } from '@/components/shell/footer-mega';
import { ACCOUNT_NAV, PRIMARY_NAV, TAB_NAV, type NavItem } from '@/components/shell/nav-config';
import { balancesIncludeCredit } from '@/components/wallet/deposit-flow';
import { maxFillAmount } from '@/components/wallet/withdraw-flow';
import type { AccountStatus } from '@/lib/api/auth';
import { ApiRequestError, isOutcomeUnknown } from '@/lib/api/client';
import {
  PLAYER_DATA_PREFIXES,
  clearPlayerData,
  invalidatePlayerFinancials,
} from '@/lib/api/player-cache';
import { useRgMutation } from '@/lib/api/rg-history';
import { useInvalidateWallet } from '@/lib/api/wallet';

import { resolves } from './support/routes';

/** Every query key a module caches for the signed-in player (balances / limits live under several modules). */
const PLAYER_KEYS = [
  ['wallet', 'balances'],
  ['wallet', 'me'],
  ['wallet', 'linked'],
  ['pool', 'me', 'balances'],
  ['pool', 'me', 'rg'],
  ['account', 'balances'],
  ['account', 'rg'],
  ['history', 'balances'],
  ['rg', 'state'],
  ['auth', 'balances'],
  ['auth', 'account-status'],
  ['me', 'balance'],
] as const;
const PUBLIC_KEYS = [
  ['pool', 'round', 'current'],
  ['pool', 'rounds', { pageSize: 3 }],
  ['games'],
] as const;

function seeded() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });
  for (const k of [...PLAYER_KEYS, ...PUBLIC_KEYS, ['auth', 'me', 'did:a'], ['admin-b', 'me']])
    qc.setQueryData(k, { seeded: true });
  return qc;
}
const invalidated = (qc: QueryClient, key: readonly unknown[]) =>
  qc.getQueryState(key)?.isInvalidated ?? false;

/** Runs a hook once (server render) inside a QueryClientProvider and hands back what it returned. */
function captureHook<T>(qc: QueryClient, hook: () => T): T {
  let out: T | undefined;
  function Probe() {
    out = hook();
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <Probe />
    </QueryClientProvider>,
  );
  return out!;
}

describe('player caches (R38 · R40)', () => {
  it('a wallet write refreshes the same balances cached by pool, account, history, RG and auth', async () => {
    const qc = seeded();
    const invalidate = captureHook(qc, () => useInvalidateWallet());
    await invalidate();
    for (const k of PLAYER_KEYS) expect(invalidated(qc, k), JSON.stringify(k)).toBe(true);
    for (const k of PUBLIC_KEYS) expect(invalidated(qc, k), JSON.stringify(k)).toBe(false);
  });

  it('an RG write refreshes the pool modal’s limits and the account gate, not only ["rg"]', async () => {
    const qc = seeded();
    const m = captureHook(qc, () => useRgMutation(() => Promise.resolve({ ok: true })));
    await m.mutateAsync(undefined);
    expect(invalidated(qc, ['pool', 'me', 'rg'])).toBe(true);
    expect(invalidated(qc, ['wallet', 'balances'])).toBe(true);
    expect(invalidated(qc, ['auth', 'account-status'])).toBe(true);
    expect(invalidated(qc, ['rg', 'state'])).toBe(true);
  });

  it('invalidatePlayerFinancials covers every module copy', async () => {
    const qc = seeded();
    await invalidatePlayerFinancials(qc);
    for (const k of PLAYER_KEYS) expect(invalidated(qc, k), JSON.stringify(k)).toBe(true);
  });

  it('sign-out removes every player cache (incl. /me with the anti-phishing code), keeps public data', () => {
    const qc = seeded();
    clearPlayerData(qc);
    for (const k of [...PLAYER_KEYS, ['auth', 'me', 'did:a']])
      expect(qc.getQueryData(k), JSON.stringify(k)).toBeUndefined();
    for (const k of PUBLIC_KEYS) expect(qc.getQueryData(k)).toEqual({ seeded: true });
    expect(qc.getQueryData(['admin-b', 'me'])).toEqual({ seeded: true });
    expect(PLAYER_DATA_PREFIXES).toContainEqual(['pool', 'me']);
  });
});

describe('admin caches (R43)', () => {
  it('admin sign-out / idle expiry removes admin-a AND admin-b data (incl. the previous admin’s /me)', () => {
    const qc = seeded();
    qc.setQueryData(['admin', 'approvals'], { seeded: true });
    qc.setQueryData(['admin-b', 'withdrawal', 'WD-1'], { seeded: true });
    clearAdminData(qc);
    expect(qc.getQueryData(['admin-b', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['admin-b', 'withdrawal', 'WD-1'])).toBeUndefined();
    expect(qc.getQueryData(['admin', 'approvals'])).toBeUndefined();
    expect(qc.getQueryData(['wallet', 'balances'])).toEqual({ seeded: true });
    expect(ADMIN_QUERY_ROOTS).toContainEqual(['admin-b']);
  });
});

describe('unknown write outcomes (R41)', () => {
  const err = (status: number, code: string) =>
    new ApiRequestError(status, '/x', 'm', code, 'req', undefined, undefined);
  it('only a definite 4xx means nothing happened', () => {
    expect(isOutcomeUnknown(new TypeError('Failed to fetch'))).toBe(true);
    expect(isOutcomeUnknown(err(502, 'HTTP_ERROR'))).toBe(true);
    expect(isOutcomeUnknown(err(504, 'HTTP_ERROR'))).toBe(true);
    expect(isOutcomeUnknown(err(500, 'INTERNAL'))).toBe(true);
    expect(isOutcomeUnknown(err(409, 'CONFLICT'))).toBe(true); // same key still being processed
    expect(isOutcomeUnknown(err(402, 'INSUFFICIENT_FUNDS'))).toBe(false);
    expect(isOutcomeUnknown(err(409, 'ROUND_NOT_OPEN'))).toBe(false);
    expect(isOutcomeUnknown(err(422, 'IDEMPOTENCY_CONFLICT'))).toBe(false);
    expect(isOutcomeUnknown(err(400, 'VALIDATION_FAILED'))).toBe(false);
  });
});

describe('withdraw MAX (R49)', () => {
  it('rounds the cap down so the filled amount never exceeds Available / the daily limit', () => {
    expect(maxFillAmount('100.005')).toBe('100.00');
    expect(maxFillAmount('100.009999')).toBe('100.00');
    expect(maxFillAmount('9215.30')).toBe('9215.30');
    expect(maxFillAmount('25000')).toBe('25000.00');
  });
});

describe('deposit confirmation (R39)', () => {
  it('only balances fetched after the credit was seen may be shown as "After"', () => {
    expect(balancesIncludeCredit(true, 1_000, 2_000)).toBe(false); // cached before the credit
    expect(balancesIncludeCredit(true, 2_500, 2_000)).toBe(true);
    expect(balancesIncludeCredit(true, 0, 0)).toBe(false); // never fetched
    expect(balancesIncludeCredit(false, 1_000, 2_000)).toBe(true); // not credited: nothing to wait for
  });
});

describe('homepage last round (R30)', () => {
  const base = { winners: [], draw: null } as unknown as Parameters<typeof lastRoundCaption>[0];
  it('never tells visitors entries were refunded unless the round was cancelled', () => {
    for (const status of ['scheduled', 'open', 'closed', 'drawing'] as const)
      expect(lastRoundCaption({ ...base, status })).not.toMatch(/refund/i);
    expect(lastRoundCaption({ ...base, status: 'cancelled' })).toMatch(/refunded to Owed/);
    expect(lastRoundCaption({ ...base, status: 'drawing' })).toMatch(/Drawing/);
    expect(
      lastRoundCaption({
        ...base,
        status: 'settled',
        winners: new Array(13).fill({}) as never,
      }),
    ).toMatch(/^Paid to 13 winners/);
  });
});

describe('shell member data (R37)', () => {
  it('shares the pool module’s cache keys', () => {
    expect(SHELL_POOL_KEYS.current()).toEqual(poolKeys.current());
    expect(SHELL_POOL_KEYS.myRound('r1')).toEqual(poolKeys.myRound('r1'));
  });
  it('renders a skeleton — not a DEMO number — while the member’s balance loads; no hard-coded country', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <AppShellFrame
            auth="member"
            member={{
              handle: '@fresh',
              initials: 'FR',
              available: null,
              notifications: 0,
              activeEntries: 0,
              demo: true,
            }}
            pathname="/wallet"
            onSignIn={() => undefined}
            onSignUp={() => undefined}
            onSignOut={() => undefined}
            poolAmount={null}
            restricted
          >
            <p>page</p>
          </AppShellFrame>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(html).toContain('Available balance loading');
    expect(html).not.toContain('9,215.30');
    expect(html).not.toContain('United States');
    expect(html).toContain('not available in your region.');
  });
});

describe('self-exclusion copy (R26)', () => {
  it('does not promise that a second account can’t be opened', () => {
    const status: AccountStatus = {
      gate: 'self_excluded',
      onboarded: true,
      status: 'active',
      restrictions: [],
      paused: { gaming: true, deposits: true, withdrawals: false },
      selfExclusion: {
        active: true,
        startsAt: '2026-11-27T16:45:00Z',
        endsAt: '2027-11-27T16:45:00Z',
        kind: 'self_exclusion',
      },
      region: {
        current: { code: 'PT', name: 'Portugal', permitted: true },
        declared: { code: 'PT', name: 'Portugal', permitted: true },
        permitted: true,
      },
      isDemo: true,
    };
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <RestrictedView variant="self-excluded" status={status} balances={null} />
      </QueryClientProvider>,
    );
    expect(html).not.toMatch(/second account can.t be opened/i);
    expect(html).not.toMatch(/check identity at sign-up/i);
    expect(html).toContain('This break covers this account');
  });
});

// ── every navigation link resolves to a built page (R11 · R57) ──────────────────────────────────

const flat = (items: NavItem[]): NavItem[] => items.flatMap((i) => [i, ...flat(i.children ?? [])]);

describe('navigation targets exist (R11 · R57)', () => {
  it('sidebar, account nav, mobile tab bar, footer and dashboard tabs', () => {
    const hrefs = [
      ...flat(PRIMARY_NAV).map((i) => i.href),
      ...flat(ACCOUNT_NAV).map((i) => i.href),
      ...TAB_NAV.map((i) => i.href),
      ...FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href)),
      ...DASHBOARD_TABS.map((t) => t.href),
    ];
    const missing = hrefs.filter((h) => !resolves(h));
    expect(missing).toEqual([]);
  });
  it('consent documents, KYC, bonus terms, support and restricted-countries targets render', () => {
    for (const href of [
      '/legal/terms',
      '/legal/privacy',
      '/legal/aml',
      '/legal/restricted-countries',
      '/legal/licence',
      '/legal/fees',
      '/promotions',
      '/support',
      '/account/kyc/verify',
    ])
      expect(resolves(href), href).toBe(true);
    expect(resolves('/legal/not-a-doc')).toBe(false);
    expect(resolves('/account/verification')).toBe(false);
  });
});

// ── homepage + shell links rendered for real (template-literal hrefs included) ─────────────────

describe('homepage and shell links resolve (R11 · R57)', () => {
  it('every internal href rendered by the homepage sections and the shell is a built page', async () => {
    const { ActivitySection } = await import('@/components/home/activity');
    const { FairnessSection } = await import('@/components/home/fairness');
    const { FaqSection } = await import('@/components/home/faq');
    const { GamesSection } = await import('@/components/home/games');
    const { HeroSection } = await import('@/components/home/hero');
    const { HomeViewProvider } = await import('@/components/home/home-context');
    const { HowItWorksSection, NetworksSection, SecuritySection } =
      await import('@/components/home/info-sections');
    const { PoolLiveSection } = await import('@/components/home/pool-live');
    const { AffiliateSection, VipSection } = await import('@/components/home/programs');
    const { mockMyEntries, mockPoolSnapshot } = await import('@/lib/data/mock-home');
    const { prefetchHome } = await import('@/lib/data/queries');
    const { DEFAULT_SCENARIO } = await import('@/lib/data/types');

    const hrefs = new Set<string>();
    for (const scenario of [DEFAULT_SCENARIO, { round: 'none', region: 'permitted' } as const]) {
      for (const viewer of ['guest', 'member'] as const) {
        const qc = new QueryClient();
        await prefetchHome(qc, scenario);
        const snapshot = mockPoolSnapshot(scenario);
        const html = renderToStaticMarkup(
          <QueryClientProvider client={qc}>
            <TooltipProvider>
              <HomeViewProvider
                value={{
                  viewer,
                  restricted: false,
                  countryName: 'Portugal',
                  scenario,
                  snapshot,
                  demoNow: snapshot.serverNow,
                  now: new Date(snapshot.serverNow).getTime(),
                  myEntries: viewer === 'member' ? mockMyEntries() : undefined,
                  balance: viewer === 'member' ? { available: '10.00', isDemo: true } : undefined,
                  signIn: () => undefined,
                  signUp: () => undefined,
                }}
              >
                <HeroSection />
                <PoolLiveSection />
                <GamesSection />
                <ActivitySection />
                <HowItWorksSection />
                <NetworksSection />
                <SecuritySection />
                <FairnessSection />
                <VipSection />
                <AffiliateSection />
                <FaqSection />
              </HomeViewProvider>
              <AppShellFrame
                auth={viewer === 'member' ? 'member' : 'guest'}
                member={
                  viewer === 'member'
                    ? {
                        handle: '@m',
                        initials: 'M',
                        available: '1.00',
                        notifications: 0,
                        activeEntries: 0,
                        demo: true,
                      }
                    : null
                }
                pathname="/"
                onSignIn={() => undefined}
                onSignUp={() => undefined}
                onSignOut={() => undefined}
              >
                <p>page</p>
              </AppShellFrame>
            </TooltipProvider>
          </QueryClientProvider>,
        );
        for (const m of html.matchAll(/href="(\/[^"]*)"/g))
          hrefs.add(m[1]!.replaceAll('&amp;', '&'));
      }
    }
    expect(hrefs.size).toBeGreaterThan(40);
    // A few that used to 404 (template-literal hrefs the static nav check cannot see).
    for (const h of ['/promotions#welcome-offer', '/legal/terms#entries', '/games?category=table'])
      expect(hrefs, h).toContain(h);
    expect([...hrefs].filter((h) => !resolves(h))).toEqual([]);
  });
});
