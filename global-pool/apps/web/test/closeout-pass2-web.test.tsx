/**
 * Close-out pass 2 (web): open redirect via dot segments (R36b), every route constant is a built page (R11b · Q05 ·
 * Q09), post-sign-in landing for a gated account (Q15), the shell handle (Q01), the admin Tab Bar per role (Q11) and
 * admin modules that are not built (Q13).
 */
import { ROLE_PERMISSIONS, type AdminRole, type Permission } from '@gp/shared/enums';
import { describe, expect, it } from 'vitest';

import { ACCOUNT_ROUTES, DASHBOARD_TABS, HISTORY_ROUTES } from '@/components/account/nav';
import { ADMIN_NAV, adminDestinations, visibleAdminTabs } from '@/components/admin-a/nav-config';
import { postSignInLanding } from '@/components/auth/landing';
import { safeAdminNext, safeNext } from '@/components/auth/safe-next';
import { GATE_ROUTES } from '@/components/compliance/routes';
import { POOL_ROUTES } from '@/components/pool/parts';
import { shellHandle } from '@/components/shell/app-shell';
import { ROUTES } from '@/components/shell/nav-config';
import { WALLET_ROUTES } from '@/components/wallet/wallet-ui';
import type { AccountStatus } from '@/lib/api/auth';

import { resolves } from './support/routes';

// ── R36b: dot segments must not normalise into a protocol-relative URL ─────────────────────────

describe('safeNext() dot-segment bypass (R36b)', () => {
  const BASE = 'http://localhost:3000';
  it.each([
    '/.//evil.example/login',
    '/..//evil.example',
    '/pool/..//evil.example',
    '/%2e//evil.example',
    '/%2E%2E//evil.example',
    '/./..//evil.example?x=1#y',
    '/wallet/../..//evil.example',
  ])('%s is refused', (raw) => {
    const out = safeNext(raw);
    expect(out).toBeUndefined();
    // and whatever would have come out could never leave the origin
    if (out) expect(new URL(out, BASE).origin).toBe(BASE);
  });
  it('keeps the earlier vectors blocked (TAB / LF / CRLF / backslash / scheme)', () => {
    for (const raw of [
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r\n/evil.example',
      '/\\evil.example',
      '//evil.example',
      'https://evil.example',
      'javascript:alert(1)',
    ])
      expect(safeNext(raw), JSON.stringify(raw)).toBeUndefined();
  });
  it('still accepts ordinary same-origin paths (normalised)', () => {
    expect(safeNext('/wallet/withdraw')).toBe('/wallet/withdraw');
    expect(safeNext('/pool/../wallet')).toBe('/wallet');
    expect(safeNext('/./pool/history?x=1#top')).toBe('/pool/history?x=1#top');
    expect(safeNext('/')).toBe('/');
    expect(safeAdminNext('/admin/users?q=x')).toBe('/admin/users?q=x');
    expect(safeAdminNext('/admin/..//evil.example')).toBeUndefined();
  });
});

// ── R11b / Q05 / Q09: every route constant (not only the nav) is a built page ──────────────────

function values(map: Record<string, unknown>): string[] {
  return Object.values(map).flatMap((v) =>
    typeof v === 'string'
      ? [v]
      : typeof v === 'function'
        ? [(v as (a: never) => string)(1248 as never)]
        : [],
  );
}

describe('route constants resolve to built pages (R11b · Q05 · Q09)', () => {
  it('GATE_ROUTES, ROUTES, ACCOUNT_ROUTES, HISTORY_ROUTES, WALLET_ROUTES, POOL_ROUTES and dashboard tabs', () => {
    const internal = [
      ...values(GATE_ROUTES),
      ...values(ROUTES),
      ...values(ACCOUNT_ROUTES),
      ...values(HISTORY_ROUTES),
      ...values(WALLET_ROUTES),
      ...values(POOL_ROUTES),
      ...DASHBOARD_TABS.map((t) => t.href),
      ROUTES.category('table'),
    ].filter((h) => h.startsWith('/'));
    expect(internal.length).toBeGreaterThan(50);
    expect(internal.filter((h) => !resolves(h))).toEqual([]);
  });
  it('the geo-block "See your entries and history" CTA is a page that stays open in a restricted region', () => {
    expect(GATE_ROUTES.entries).toBe('/history/games/entries');
    expect(resolves(GATE_ROUTES.entries)).toBe(true);
    expect(resolves('/history/entries')).toBe(false);
  });
  it('consent, legal and support documents linked from onboarding, footer, KYC and the homepage exist', () => {
    for (const href of [
      '/legal/terms',
      '/legal/privacy',
      '/legal/aml',
      '/legal/aml-kyc',
      '/legal/cookies',
      '/legal/restricted-countries',
      '/legal/licence',
      '/legal/fees',
      '/support',
      '/promotions',
      '/vip',
      '/winners',
      '/affiliates',
      '/about',
      '/official-channels',
      '/status',
      '/security',
      '/pool/history',
      '/history/refunds',
      '/games',
      '/games/orbit-rush',
    ])
      expect(resolves(href), href).toBe(true);
  });
});

// ── Q15: a gated account never lands on the lobby's gaming CTAs after sign-in ──────────────────

const status = (
  gate: AccountStatus['gate'],
  paused: Partial<AccountStatus['paused']> = {},
): Pick<AccountStatus, 'gate' | 'paused'> => ({
  gate,
  paused: { gaming: false, deposits: false, withdrawals: false, ...paused },
});

describe('post-sign-in landing (Q15)', () => {
  const selfExcluded = status('self_excluded', { gaming: true, deposits: true });

  it('a self-excluded player who signed in from /sign-in (lobby behind) goes to /restricted/self-excluded', () => {
    expect(
      postSignInLanding({
        needsOnboarding: false,
        returnTo: '/',
        pathname: '/sign-in',
        status: selfExcluded,
      }),
    ).toEqual({ to: '/restricted/self-excluded', mode: 'replace' });
  });
  it('… also when next= is a gambling page, or the dialog opened over one', () => {
    for (const next of ['/', '/pool', '/games/pool-dice', '/wallet/deposit'])
      expect(
        postSignInLanding({
          needsOnboarding: false,
          next,
          pathname: '/sign-in',
          status: selfExcluded,
        }),
        next,
      ).toEqual({ to: '/restricted/self-excluded', mode: 'replace' });
    expect(
      postSignInLanding({ needsOnboarding: false, pathname: '/pool', status: selfExcluded }),
    ).toEqual({ to: '/restricted/self-excluded', mode: 'replace' });
  });
  it('withdrawals, history, RG and account pages stay reachable for a self-excluded player', () => {
    for (const next of [
      '/wallet/withdraw',
      '/history/transactions',
      '/responsible-gaming',
      '/account',
    ])
      expect(
        postSignInLanding({
          needsOnboarding: false,
          next,
          pathname: '/sign-in',
          status: selfExcluded,
        }),
      ).toEqual({ to: next, mode: 'push' });
  });
  it('other gates that pause gaming route to their own page; a withdrawals-only hold does not block the lobby', () => {
    expect(
      postSignInLanding({
        needsOnboarding: false,
        returnTo: '/',
        pathname: '/sign-in',
        status: status('suspended', { gaming: true, deposits: true }),
      })?.to,
    ).toBe('/restricted/suspended');
    expect(
      postSignInLanding({
        needsOnboarding: false,
        returnTo: '/',
        pathname: '/sign-in',
        status: status('region', { gaming: true, deposits: true }),
      })?.to,
    ).toBe('/restricted/region');
    expect(
      postSignInLanding({
        needsOnboarding: false,
        returnTo: '/',
        pathname: '/sign-in',
        status: status('under_review', { withdrawals: true }),
      }),
    ).toEqual({ to: '/', mode: 'replace' });
  });
  it('keeps the earlier behaviour otherwise (onboarding first; next; returnTo; stay)', () => {
    expect(
      postSignInLanding({
        needsOnboarding: true,
        next: '/pool',
        pathname: '/sign-in',
        status: selfExcluded,
      }),
    ).toEqual({ to: '/onboarding?next=%2Fpool', mode: 'push' });
    expect(
      postSignInLanding({
        needsOnboarding: false,
        next: '/pool',
        pathname: '/sign-in',
        status: status('ok'),
      }),
    ).toEqual({ to: '/pool', mode: 'push' });
    expect(
      postSignInLanding({
        needsOnboarding: false,
        returnTo: '/',
        pathname: '/sign-in',
        status: undefined,
      }),
    ).toEqual({ to: '/', mode: 'replace' });
    expect(
      postSignInLanding({ needsOnboarding: false, pathname: '/pool', status: status('ok') }),
    ).toBeNull();
  });
});

// ── Q01: shell handle ──────────────────────────────────────────────────────────────────────────

describe('shell handle (Q01)', () => {
  it('always shows the public handle with "@" (profile displayHandle first), "Player" before onboarding', () => {
    expect(shellHandle({ displayHandle: '@nova.k', handle: 'nova.k' }, 'nova.k')).toBe('@nova.k');
    expect(shellHandle(null, 'nova.k')).toBe('@nova.k');
    expect(shellHandle({ displayHandle: null, handle: 'fresh_1' }, null)).toBe('@fresh_1');
    expect(shellHandle({ displayHandle: null, handle: null }, null)).toBe('Player');
    expect(shellHandle(undefined, '@already')).toBe('@already');
  });
});

// ── Q11 / Q13: admin navigation ────────────────────────────────────────────────────────────────

const canAnyFor = (role: AdminRole) => {
  const perms = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return (ps: readonly Permission[]) => ps.some((p) => perms.has(p));
};

describe('admin Tab Bar is permission-aware (Q11)', () => {
  it('Finance and Marketing get no KYC tab; Compliance and Support keep it', () => {
    const labels = (role: AdminRole) => visibleAdminTabs(canAnyFor(role)).map((t) => t.label);
    expect(labels('finance')).toEqual(['Overview', 'Approvals', 'Alerts']);
    expect(labels('compliance')).toEqual(['Overview', 'Approvals', 'KYC', 'Alerts']);
    expect(labels('support')).toContain('KYC');
    expect(labels('super_admin')).toEqual(['Overview', 'Approvals', 'KYC', 'Alerts']);
    expect(labels('marketing')).not.toContain('KYC');
  });
});

describe('admin modules that are not built (Q13)', () => {
  it('a group whose page exists only as the "not in this build" catch-all is marked planned', () => {
    for (const g of ADMIN_NAV) {
      const built = [g.href, ...(g.children ?? []).map((c) => c.href)].some((h) =>
        resolves(h, { exact: true }),
      );
      expect(Boolean(g.planned), g.key).toBe(!built);
    }
    expect(ADMIN_NAV.filter((g) => g.planned).map((g) => g.key)).toEqual([
      'games',
      'blockchain',
      'affiliates',
      'marketing',
    ]);
  });
  it('planned modules are not offered as command-palette destinations', () => {
    const hrefs = adminDestinations().map((d) => d.href);
    for (const h of ['/admin/games', '/admin/blockchain', '/admin/affiliates', '/admin/marketing'])
      expect(hrefs).not.toContain(h);
    expect(hrefs.every((h) => resolves(h, { exact: true }))).toBe(true);
  });
});
