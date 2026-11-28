import { describe, expect, it } from 'vitest';

import { countryName, countryOptions } from '@/components/auth/countries';
import {
  formatCountdown,
  formatUtcDateTime,
  formatUtcTime,
  maskEmail,
} from '@/components/auth/format';
import { safeAdminNext, safeNext } from '@/components/auth/safe-next';
import { ApiRequestError } from '@/lib/api/client';
import { restrictedRouteFor, routeForGate } from '@/lib/api/auth';
import { onboardingExempt } from '@/lib/auth/routes';
import { buildWalletMessage, shortAddress } from '@/lib/auth/wallet-message';

const apiError = (code: string, details?: Record<string, unknown>) =>
  new ApiRequestError(403, '/x', 'blocked', code, 'req-1', undefined, details);

describe('auth helpers', () => {
  it('accepts only same-origin relative `next` paths (no open redirects)', () => {
    expect(safeNext('/wallet/withdraw?x=1')).toBe('/wallet/withdraw?x=1');
    for (const bad of [
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
      '',
      null,
      undefined,
    ]) {
      expect(safeNext(bad)).toBeUndefined();
    }
  });

  it('rejects `next` values the URL parser would turn into another origin (R36)', () => {
    // The WHATWG parser strips TAB / LF / CR and reads `\` as `/`: each of these would leave the site.
    for (const bad of [
      '/\t/evil.example/login',
      '/\n/evil.example',
      '/\r\n/evil.example',
      '/\u0000/evil.example',
      '/ /evil.example',
      '/\u00a0/evil.example',
      '/a\\b',
      '/\\\\evil.example',
      'javascript:alert(1)',
      ' /wallet',
    ]) {
      expect(safeNext(bad), JSON.stringify(bad)).toBeUndefined();
    }
    // Why: this is what the browser does with the old check's survivor.
    expect(new URL('/\t/evil.example/login', 'http://localhost:3000').origin).toBe(
      'http://evil.example',
    );
    // Same-origin paths survive, normalised (dot segments resolved, query + hash kept).
    expect(safeNext('/wallet/withdraw?step=amount#fees')).toBe('/wallet/withdraw?step=amount#fees');
    expect(safeNext('/pool/../wallet')).toBe('/wallet');
    expect(safeNext('/2fa/challenge?purpose=withdrawal&next=%2Fwallet')).toBe(
      '/2fa/challenge?purpose=withdrawal&next=%2Fwallet',
    );
  });

  it('admin `next` must be a safe /admin path (R20)', () => {
    expect(safeAdminNext('/admin/finance/withdrawals?x=1')).toBe('/admin/finance/withdrawals?x=1');
    expect(safeAdminNext('/admin')).toBe('/admin');
    for (const bad of [
      'https://evil.example/admin/login',
      'javascript:alert(document.domain)',
      '//evil.example/admin',
      '/\t/evil.example/admin',
      '/wallet',
      '/administrator',
      '/admin/../wallet',
      null,
    ]) {
      expect(safeAdminNext(bad), String(bad)).toBeUndefined();
    }
  });

  it('exempts only setup / legal / restricted routes from the onboarding redirect', () => {
    for (const p of [
      '/onboarding',
      '/restricted/region',
      '/legal/terms',
      '/sign-in',
      '/verify',
      '/2fa/setup',
    ]) {
      expect(onboardingExempt(p)).toBe(true);
    }
    for (const p of ['/', '/wallet', '/pool', '/games/pool-dice', '/onboardingx', '/signin']) {
      expect(onboardingExempt(p)).toBe(false);
    }
  });

  it('maps blocked API calls to the AUTH-18 pages', () => {
    expect(restrictedRouteFor(apiError('ONBOARDING_REQUIRED'))).toBe('/onboarding');
    expect(restrictedRouteFor(apiError('SELF_EXCLUDED'))).toBe('/restricted/self-excluded');
    expect(restrictedRouteFor(apiError('GEO_RESTRICTED'))).toBe('/restricted/region');
    expect(restrictedRouteFor(apiError('FORBIDDEN', { restriction: 'account_suspended' }))).toBe(
      '/restricted/suspended',
    );
    expect(restrictedRouteFor(apiError('FORBIDDEN', { restriction: 'gaming_blocked' }))).toBe(
      '/restricted/under-review',
    );
    expect(
      restrictedRouteFor(apiError('FORBIDDEN', { restriction: 'withdrawals_frozen' })),
    ).toBeNull();
    expect(restrictedRouteFor(new Error('x'))).toBeNull();
    expect(routeForGate('ok')).toBeNull();
    expect(routeForGate('self_excluded')).toBe('/restricted/self-excluded');
  });

  it('builds the human-readable wallet message (AUTH-10)', () => {
    const msg = buildWalletMessage({
      address: '0x12aB7c4E90d1F35b6A2c8E07d94F1b3A5c6D9f3C',
      nonce: '8f3a91',
      issuedAt: new Date('2026-11-27T16:42:00Z'),
    });
    expect(msg.startsWith('GLOBAL POOL wants you to sign in with your wallet 0x12aB')).toBe(true);
    expect(msg).toContain('This request will not trigger a transaction or cost gas.');
    expect(msg).toContain('Nonce: 8f3a91');
    expect(msg).toContain('Issued: 2026-11-27 16:42 UTC');
    expect(shortAddress('0x12aB7c4E90d1F35b6A2c8E07d94F1b3A5c6D9f3C')).toBe('0x12aB…9f3C');
  });

  it('formats emails, UTC times and countdowns', () => {
    expect(maskEmail('nova.k@example.com')).toBe('n•••@example.com');
    expect(formatUtcTime('2026-11-27T16:52:00Z')).toBe('16:52 UTC');
    expect(formatUtcDateTime('2026-11-27T16:31:00Z')).toBe('27 Nov 2026, 16:31 UTC');
    expect(formatCountdown(42_000)).toBe('0:42');
    expect(formatCountdown(892_000)).toBe('14:52');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('lists countries by English name with ISO codes', () => {
    const list = countryOptions();
    expect(list.length).toBeGreaterThan(180);
    expect(list.find((c) => c.code === 'PT')?.name).toBe('Portugal');
    expect(countryName('US')).toBe('United States');
    const names = list.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });
});
