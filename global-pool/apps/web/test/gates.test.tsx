/**
 * Compliance gates (PUB-21 geo interstitial, PUB-22 age gate, ERR-05 regulatory states) — pure rules and server
 * renders: which pages each gate covers, the gate decision per render, the per-browser 18+ memory (blocked storage
 * asks again, never skips), the age-gate form (nothing pre-selected / pre-checked, Enter disabled), the regulatory
 * copy (withdraw stays available, no bypass hints) and the module guard.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RestrictedView } from '@/components/auth/restricted';
import { ageGateAction, AgeGateForm, AgeRestrictedPage } from '@/components/compliance/age-gate';
import { gateView } from '@/components/compliance/compliance-gate';
import { GeoBlockInterstitial } from '@/components/compliance/geo-block';
import {
  REGULATORY_KINDS,
  regulatoryCopy,
  regulatoryFromError,
} from '@/components/compliance/regulatory-copy';
import { RegulatoryGuard, RegulatoryState } from '@/components/compliance/regulatory-state';
import {
  GATE_ROUTES,
  isAgeGated,
  isFocusedGatePage,
  isGeoGated,
} from '@/components/compliance/routes';
import {
  AGE_CONFIRMATION_DAYS,
  AGE_COOKIE,
  markUnderAge,
  readAgeConfirmation,
  readUnderAge,
  resolveDevCountry,
  saveAgeConfirmation,
  type GateStorageEnv,
} from '@/components/compliance/storage';
import { mockGeoDecision } from '@/components/compliance/use-geo';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AccountStatus } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/client';
import { AuthContext } from '@/lib/auth/context';
import { onboardingExempt } from '@/lib/auth/routes';
import type { AuthContextValue } from '@/lib/auth/types';

// ── helpers ───────────────────────────────────────────────────────────────────────────────────

const GUEST: AuthContextValue = {
  mode: 'mock',
  status: 'guest',
  user: null,
  signIn: () => undefined,
  signUp: () => undefined,
  signOut: () => Promise.resolve(),
  getAccessToken: () => Promise.resolve(null),
  openAuth: () => undefined,
};
const MEMBER: AuthContextValue = {
  ...GUEST,
  status: 'member',
  user: { id: 'u1', handle: 'nova.k', displayName: null, initials: 'NK', isDemo: true } as never,
};

function render(node: React.ReactNode, auth: AuthContextValue = GUEST): string {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
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
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');

/**
 * Phrases that would point a restricted visitor at a workaround — never allowed anywhere in the gates. The Figma
 * prohibition "Please don’t use a VPN or proxy" (decision #26) is a warning, not a hint, so a negated form is fine.
 */
const BYPASS =
  /(?<!(?:don[’']t|do not|never|not) )\b(?:use|try|connect (?:via|through|with)|switch to) (?:a |an )?(?:vpn|proxy)|change your (?:location|ip)|hide your location|bypass|work ?around/i;

type MemStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function memStore(): MemStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

interface MemoryEnv extends GateStorageEnv {
  cookies: string[];
  local: MemStore;
  session: MemStore;
}

/** In-memory cookie jar + storages (a real browser's semantics for the bits the gate uses). */
function memoryEnv(over: Partial<GateStorageEnv> = {}): MemoryEnv {
  const cookies: string[] = [];
  const jar = new Map<string, string>();
  const setCookie = (c: string): void => {
    cookies.push(c);
    const [pair = '', ...attrs] = c.split(';').map((p) => p.trim());
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq);
    if (attrs.includes('Max-Age=0')) jar.delete(name);
    else jar.set(name, pair.slice(eq + 1));
  };
  const env: MemoryEnv = {
    cookies,
    getCookie: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
    setCookie,
    local: memStore(),
    session: memStore(),
    now: () => Date.parse('2026-11-28T10:00:00Z'),
    secure: true,
  };
  return Object.assign(env, over);
}

// ── routes ────────────────────────────────────────────────────────────────────────────────────

describe('gate coverage (routes)', () => {
  it('PUB-21 covers gaming and NEW-deposit pages only; withdraw, account, legal, RG and support stay open', () => {
    for (const p of [
      '/games',
      '/games/pool-dice',
      '/pool',
      '/pool/rounds/1248',
      '/promotions',
      '/wallet/deposit',
      '/wallet/deposit?step=address',
      '/favourites',
      '/recently-played',
    ]) {
      expect(isGeoGated(p), p).toBe(true);
    }
    for (const p of [
      '/',
      '/wallet',
      '/wallet/withdraw',
      '/wallet/history',
      '/history/transactions',
      '/account',
      '/dashboard',
      '/responsible-gaming',
      '/responsible-gaming/self-exclusion',
      '/support',
      '/legal/licence',
      '/legal/restricted-countries',
      '/restricted/region',
      '/sign-in',
      '/region-unavailable',
      '/age-restricted',
      '/admin/users',
      '/gamesx',
    ]) {
      expect(isGeoGated(p), p).toBe(false);
    }
  });

  it('PUB-22 covers the lobby and every geo-gated surface, never the exit / legal / RG / sign-in pages', () => {
    for (const p of ['/', '/games', '/pool', '/games/double-side', '/wallet/deposit'])
      expect(isAgeGated(p), p).toBe(true);
    for (const p of [
      '/age-restricted',
      '/region-unavailable',
      '/legal/terms',
      '/responsible-gaming',
      '/support',
      '/sign-up',
      '/onboarding',
      '/wallet/withdraw',
      '/compliance-preview',
    ])
      expect(isAgeGated(p), p).toBe(false);
  });

  it('the gate pages are focused (no shell) and a member who still has to onboard may stay on them', () => {
    expect(isFocusedGatePage(GATE_ROUTES.regionUnavailable)).toBe(true);
    expect(isFocusedGatePage(GATE_ROUTES.ageRestricted)).toBe(true);
    expect(isFocusedGatePage('/games')).toBe(false);
    expect(onboardingExempt('/region-unavailable')).toBe(true);
    expect(onboardingExempt('/age-restricted')).toBe(true);
  });
});

// ── gate decision ─────────────────────────────────────────────────────────────────────────────

describe('gateView — what one render shows', () => {
  const base = {
    pathname: '/games',
    geo: { status: 'success' as const, permitted: true },
    auth: 'guest' as const,
    ageConfirmed: false,
    underAge: false,
  };

  it('restricted location on a gaming / financial page → the interstitial, for guests AND members', () => {
    for (const auth of ['guest', 'member', 'loading'] as const) {
      expect(gateView({ ...base, auth, geo: { status: 'success', permitted: false } })).toBe('geo');
    }
    expect(
      gateView({
        ...base,
        pathname: '/wallet/deposit',
        geo: { status: 'success', permitted: false },
      }),
    ).toBe('geo');
  });

  it('holds a gated page while the decision loads (no gaming UI first); an unreachable API shows the page', () => {
    expect(gateView({ ...base, geo: { status: 'pending', permitted: null } })).toBe('hold');
    expect(
      gateView({ ...base, ageConfirmed: true, geo: { status: 'error', permitted: null } }),
    ).toBe('page');
  });

  it('withdraw, account and support pages are never replaced, even for a restricted location', () => {
    for (const pathname of [
      '/wallet/withdraw',
      '/wallet',
      '/history/games/entries',
      '/support',
      '/account',
    ]) {
      expect(
        gateView({ ...base, pathname, geo: { status: 'success', permitted: false } }),
        pathname,
      ).toBe('page');
    }
  });

  it('PUB-22: guests without a valid confirmation get the age gate on the lobby and gaming pages', () => {
    expect(gateView({ ...base })).toBe('age');
    expect(gateView({ ...base, pathname: '/' })).toBe('age');
    expect(gateView({ ...base, ageConfirmed: true })).toBe('page');
  });

  it('members never see the browser age gate (their onboarding 18+ consent is authoritative)', () => {
    expect(gateView({ ...base, auth: 'member' })).toBe('page');
    expect(gateView({ ...base, auth: 'member', underAge: true })).toBe('page');
    expect(gateView({ ...base, auth: 'loading' })).toBe('page');
  });

  it('no flash: storage not read yet or the location still loading → no modal', () => {
    expect(gateView({ ...base, pathname: '/', ageConfirmed: null })).toBe('page');
    expect(gateView({ ...base, pathname: '/', geo: { status: 'pending', permitted: null } })).toBe(
      'page',
    );
  });

  it('"I am under 18" in this browser session → the exit page on every gambling surface', () => {
    expect(gateView({ ...base, pathname: '/', underAge: true })).toBe('exit');
    expect(gateView({ ...base, underAge: true })).toBe('exit');
    expect(gateView({ ...base, pathname: '/support', underAge: true })).toBe('page');
  });

  it('a restricted location on the lobby shows its restricted variant, not an age question', () => {
    expect(gateView({ ...base, pathname: '/', geo: { status: 'success', permitted: false } })).toBe(
      'page',
    );
  });

  it('the age question waits behind an open sign-in dialog', () => {
    expect(gateView({ ...base, authDialogOpen: true })).toBe('page');
  });
});

// ── per-browser memory ────────────────────────────────────────────────────────────────────────

describe('age confirmation memory (cookie + localStorage, try/catch)', () => {
  it('saves a first-party cookie (30 days, SameSite=Lax, Secure on https) and a localStorage mirror', () => {
    const env = memoryEnv();
    expect(readAgeConfirmation(env)).toBeNull();
    saveAgeConfirmation('PT', env);
    expect(env.cookies[0]).toMatch(
      new RegExp(
        `^${AGE_COOKIE}=\\d+\\.PT; Max-Age=${AGE_CONFIRMATION_DAYS * 86_400}; Path=/; SameSite=Lax; Secure$`,
      ),
    );
    expect(readAgeConfirmation(env)).toEqual({
      confirmedAt: '2026-11-28T10:00:00.000Z',
      country: 'PT',
    });
  });

  it('either store counts; both expire after 30 days', () => {
    const env = memoryEnv();
    saveAgeConfirmation(null, env);
    env.setCookie(`${AGE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`);
    expect(readAgeConfirmation(env)?.country).toBeNull(); // localStorage alone
    const later = { ...env, now: () => Date.parse('2026-12-29T10:00:00Z') };
    expect(readAgeConfirmation(later)).toBeNull();
  });

  it('blocked cookies / storage never skip the gate — they mean "ask again"', () => {
    const boom = () => {
      throw new Error('SecurityError');
    };
    const blocked = memoryEnv({
      getCookie: boom,
      setCookie: boom,
      local: { getItem: boom, setItem: boom, removeItem: boom },
      session: { getItem: boom, setItem: boom, removeItem: boom },
    });
    expect(() => saveAgeConfirmation('PT', blocked)).not.toThrow();
    expect(readAgeConfirmation(blocked)).toBeNull();
    expect(readUnderAge(blocked)).toBe(false);
    // A tampered / future value is not trusted either.
    const env = memoryEnv();
    env.local.setItem('gp.ageGate', JSON.stringify({ confirmedAt: '2030-01-01T00:00:00Z' }));
    env.local.setItem('x', 'y');
    expect(readAgeConfirmation(env)).toBeNull();
    env.local.setItem('gp.ageGate', '{not json');
    expect(readAgeConfirmation(env)).toBeNull();
  });

  it('"under 18" drops an earlier confirmation and is remembered for the browser session', () => {
    const env = memoryEnv();
    saveAgeConfirmation('PT', env);
    markUnderAge(env);
    expect(readAgeConfirmation(env)).toBeNull();
    expect(readUnderAge(env)).toBe(true);
  });

  it('DEV country override (state-preview builds): ?devCountry= sets / clears it for the tab', () => {
    const env = memoryEnv();
    expect(resolveDevCountry('?devCountry=us', env)).toBe('US');
    expect(resolveDevCountry('', env)).toBe('US');
    expect(resolveDevCountry('?devCountry=off', env)).toBeNull();
    expect(resolveDevCountry('', env)).toBeNull();
    expect(resolveDevCountry('?devCountry=USA', env)).toBeNull();
  });
});

// ── PUB-22 form ───────────────────────────────────────────────────────────────────────────────

describe('PUB-22 age gate form', () => {
  it('Enter only after "Yes" + the ticked jurisdiction box for a permitted country; "No" → Continue to the exit', () => {
    const permitted = { declaredPermitted: true };
    expect(ageGateAction({ age: null, jurisdictionConfirmed: false, ...permitted })).toEqual({
      label: 'Enter',
      enabled: false,
      outcome: null,
    });
    expect(ageGateAction({ age: 'yes', jurisdictionConfirmed: false, ...permitted }).enabled).toBe(
      false,
    );
    expect(ageGateAction({ age: null, jurisdictionConfirmed: true, ...permitted }).enabled).toBe(
      false,
    );
    expect(
      ageGateAction({ age: 'yes', jurisdictionConfirmed: true, declaredPermitted: false }).enabled,
    ).toBe(false);
    expect(
      ageGateAction({ age: 'yes', jurisdictionConfirmed: true, declaredPermitted: null }).enabled,
    ).toBe(false);
    expect(ageGateAction({ age: 'yes', jurisdictionConfirmed: true, ...permitted })).toEqual({
      label: 'Enter',
      enabled: true,
      outcome: 'enter',
    });
    expect(
      ageGateAction({ age: 'no', jurisdictionConfirmed: false, declaredPermitted: null }),
    ).toEqual({
      label: 'Continue',
      enabled: true,
      outcome: 'under_age',
    });
  });

  it('renders with nothing selected or ticked, Enter disabled, the licence notice and the legal links', () => {
    const html = render(
      <AgeGateForm
        detected={mockGeoDecision('PT')}
        onEnter={() => undefined}
        onUnderAge={() => undefined}
        onSignIn={() => undefined}
        renderFooter={(f) => <footer>{f}</footer>}
      />,
    );
    expect(html).not.toMatch(/data-state="checked"|aria-checked="true"|checked=""/);
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/role="checkbox"[^>]*aria-checked="false"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Enter<\/button>/);
    const t = text(html);
    for (const s of [
      'Yes, I’m 18 or older',
      'No, I’m under 18',
      'Country of residence',
      'I confirm online gambling is legal for me where I live',
      'Licence notice',
      'Terms',
      'Privacy',
      'Responsible gaming',
      'Restricted countries',
      'Leave',
    ])
      expect(t).toContain(s);
    expect(t).not.toMatch(BYPASS);
  });

  it('the exit page offers real help organisations and "Leave GLOBAL POOL" — no way back into gambling pages', () => {
    const html = render(<AgeRestrictedPage />);
    const t = text(html);
    expect(t).toContain('You must be 18+ to use GLOBAL POOL');
    expect(t).toContain('Leave GLOBAL POOL');
    for (const org of ['Gambling Therapy', 'GamCare', 'Gamblers Anonymous'])
      expect(t).toContain(org);
    expect(t).toContain('For parents and carers');
    expect(html).not.toMatch(/href="\/(games|pool|wallet\/deposit|promotions)/);
  });
});

// ── PUB-21 interstitial ───────────────────────────────────────────────────────────────────────

describe('PUB-21 geo-block interstitial', () => {
  const us = mockGeoDecision('US');

  it('guest: log in to withdraw, support, licence + restricted countries, Sign up disabled, no bypass hint', () => {
    expect(us.permitted).toBe(false);
    const html = render(<GeoBlockInterstitial decision={us} />);
    const t = text(html);
    expect(t).toContain('GLOBAL POOL isn’t available in your region');
    expect(t).toContain('United States');
    expect(t).toContain('Log in to withdraw');
    expect(t).toContain('Contact support');
    expect(t).toContain('Restricted countries');
    expect(t).toContain('Licence information');
    expect(t).toContain('Wrong location? Tell support');
    expect(t).toContain('Please don’t use a VPN or proxy'); // Figma: an explicit prohibition, no hint
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Sign up<\/button>/);
    expect(t).not.toMatch(BYPASS);
    // No casino navigation (sidebar / tab bar) and no link into a gaming or deposit page.
    expect(html).not.toMatch(/href="\/(games|pool|wallet\/deposit|promotions)[/"?]/);
    expect(html).not.toContain('aria-label="Primary"');
  });

  it('member: Withdraw funds is a direct link (withdrawals are never obstructed), history stays available', () => {
    const html = render(<GeoBlockInterstitial decision={us} />, MEMBER);
    expect(html).toMatch(/href="\/wallet\/withdraw"[^>]*>.*Withdraw funds/);
    expect(text(html)).toContain('See your entries and history');
  });
});

// ── ERR-05 copy + components ──────────────────────────────────────────────────────────────────

describe('ERR-05 regulatory states', () => {
  it('the bypass-hint check itself catches hints and allows the prohibition', () => {
    for (const hint of [
      'Try a VPN to keep playing',
      'Use a proxy',
      'connect via a VPN',
      'Change your location',
    ])
      expect(hint).toMatch(BYPASS);
    expect('Please don’t use a VPN or proxy — it breaks our Terms').not.toMatch(BYPASS);
  });

  it('every state names what happened, what still works and a next step — never a workaround', () => {
    for (const kind of REGULATORY_KINDS) {
      for (const signedIn of [true, false]) {
        const c = regulatoryCopy(kind, { signedIn, endsAt: '2027-11-27T16:45:00Z' });
        expect(c.title.length, kind).toBeGreaterThan(10);
        expect(c.actions.length, kind).toBeGreaterThan(0);
        expect(c.stillWorks.length, kind).toBeGreaterThan(0);
        const all = [c.title, c.body, c.note ?? '', ...c.stillWorks.map((i) => i.title + i.body)];
        for (const s of all) expect(s, kind).not.toMatch(BYPASS);
        // No "end early" / "play now" shortcut during a break or a self-exclusion.
        if (kind === 'self_excluded' || kind === 'cooling_off') {
          expect(c.actions.map((a) => a.href)).not.toContain('/games');
        }
      }
    }
  });

  it('withdraw stays the primary action where money is held (guests: log in to withdraw)', () => {
    for (const kind of ['region', 'self_excluded', 'cooling_off'] as const) {
      expect(regulatoryCopy(kind, { signedIn: true }).actions[0]).toMatchObject({
        role: 'withdraw',
        href: '/wallet/withdraw',
      });
      expect(regulatoryCopy(kind, { signedIn: false }).actions[0]).toMatchObject({
        role: 'sign_in',
        label: 'Log in to withdraw',
      });
    }
    expect(regulatoryCopy('kyc_required').actions[0]).toMatchObject({ role: 'kyc' });
    expect(regulatoryCopy('licence').actions[0]).toMatchObject({ role: 'browse' });
  });

  it('maps API refusals to a state (country code → name, break vs self-exclusion, KYC level)', () => {
    const err = (code: string, status: number, details?: Record<string, unknown>) =>
      new ApiRequestError(status, '/x', 'msg', code, undefined, undefined, details);
    expect(regulatoryFromError(err('GEO_RESTRICTED', 451, { country: 'US' }))).toEqual({
      kind: 'region',
      ctx: { countryName: 'United States' },
    });
    expect(
      regulatoryFromError(
        err('SELF_EXCLUDED', 403, { kind: 'cooling_off', endsAt: '2026-12-05T16:45:00Z' }),
      ),
    ).toEqual({ kind: 'cooling_off', ctx: { endsAt: '2026-12-05T16:45:00Z' } });
    expect(
      regulatoryFromError(err('SELF_EXCLUDED', 403, { kind: 'self_exclusion', endsAt: null }))
        ?.kind,
    ).toBe('self_excluded');
    expect(regulatoryFromError(err('KYC_REQUIRED', 422, { kycLevel: 'none' }))).toEqual({
      kind: 'kyc_required',
      ctx: { currentLevel: 'none', requiredLevel: 'level_1' },
    });
    expect(regulatoryFromError(err('REAL_MONEY_DISABLED', 403))?.kind).toBe('licence');
    expect(regulatoryFromError(err('INSUFFICIENT_FUNDS', 422))).toBeNull();
    expect(regulatoryFromError(new Error('x'))).toBeNull();
  });

  it('RegulatoryGuard: a regulatory refusal replaces the module with the shared card; other errors pass through', () => {
    const geo = new ApiRequestError(
      451,
      '/deposits/address',
      'no',
      'GEO_RESTRICTED',
      undefined,
      undefined,
      {
        country: 'US',
      },
    );
    const guarded = text(
      render(<RegulatoryGuard error={geo}>module error</RegulatoryGuard>, MEMBER),
    );
    expect(guarded).toContain('GLOBAL POOL isn’t available in your region');
    expect(guarded).toContain('United States');
    expect(guarded).toContain('Withdraw funds');
    expect(guarded).not.toContain('module error');
    const other = new ApiRequestError(
      500,
      '/x',
      'boom',
      'INTERNAL',
      undefined,
      undefined,
      undefined,
    );
    expect(text(render(<RegulatoryGuard error={other}>module error</RegulatoryGuard>))).toBe(
      'module error',
    );
  });

  it('renders every kind as a page and as a card (no crash, data attribute for QA)', () => {
    for (const kind of REGULATORY_KINDS) {
      for (const layout of ['page', 'card'] as const) {
        const html = render(<RegulatoryState kind={kind} layout={layout} />, MEMBER);
        expect(html, `${kind}/${layout}`).toContain(`data-regulatory-state="${kind}"`);
      }
    }
  });

  it('AUTH-18: a cooling-off break uses the ERR-05 break copy, not "self-exclude"', () => {
    const status: AccountStatus = {
      gate: 'self_excluded',
      restrictions: [],
      paused: { gaming: true, deposits: true, withdrawals: false },
      selfExclusion: {
        active: true,
        startsAt: '2026-11-28T16:45:00Z',
        endsAt: '2026-12-05T16:45:00Z',
        kind: 'cooling_off',
      },
      region: { current: null, declared: null, permitted: true },
      isDemo: true,
    } as never;
    const t = text(
      render(<RestrictedView variant="self-excluded" status={status} balances={null} />, MEMBER),
    );
    expect(t).toContain('You’re on a break until 5 Dec 2026, 16:45 UTC');
    expect(t).toContain('On a break');
    expect(t).not.toContain('You chose to self-exclude');
  });
});
