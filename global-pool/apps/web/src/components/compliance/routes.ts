/**
 * Which pages the compliance gates cover (server- and client-safe, unit-tested in test/gates.test.ts).
 *
 * - Geo interstitial (PUB-21): gaming and financial pages — games, Global Pool, promotions, game lists and NEW
 *   deposits. Tracking a deposit already sent (`/wallet/deposit?ref=DP-…`: confirmations, DEMO blocks, receipt)
 *   stays open like the API's `GET /deposits/ref/…`. Withdrawals, wallet overview, history, account, RG tools,
 *   legal pages and support always stay open,
 *   so a restricted visitor can sign in, see the licence and withdraw. The homepage keeps its own restricted
 *   variant (PUB-01) instead of the interstitial.
 * - Age gate (PUB-22): every gambling surface = the lobby homepage + the geo-gated pages.
 */

export const GATE_ROUTES = {
  /** PUB-21 as a page (direct link / QA). */
  regionUnavailable: '/region-unavailable',
  /** PUB-22 failure: "You must be 18+" exit page. */
  ageRestricted: '/age-restricted',
  restrictedCountries: '/legal/restricted-countries',
  licence: '/legal/licence',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  responsibleGaming: '/responsible-gaming',
  support: '/support',
  withdraw: '/wallet/withdraw',
  wallet: '/wallet',
  history: '/history/transactions',
  entries: '/history/entries',
  kyc: '/account/kyc/verify',
  amlKyc: '/legal/aml-kyc',
  games: '/games',
} as const;

/** Where "Leave" / "Leave GLOBAL POOL" goes: a neutral page outside the product. */
export const LEAVE_URL = 'https://www.google.com/';

const GEO_GATED =
  /^\/(games|pool|promotions|favourites|recently-played|casino|originals)(\/|$)|^\/wallet\/deposit(\/|$)/;

/** Pages that are always reachable, whatever the gates say (sign-in, withdraw, legal, RG, support, gates). */
const ALWAYS_OPEN =
  /^\/(region-unavailable|age-restricted|restricted|legal|support|responsible-gaming|sign-in|sign-up|verify|onboarding|2fa|design-system|auth-preview|compliance-preview|admin)(\/|$)/;

function normalise(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || '/';
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/** `/wallet/deposit?ref=DP-…` follows a deposit that was already sent — only NEW deposits are geo-paused. */
function isDepositTracker(path: string, search: string): boolean {
  if (path !== '/wallet/deposit') return false;
  const ref = new URLSearchParams(search).get('ref') ?? '';
  return /^DP-\d{1,12}$/i.test(ref);
}

/**
 * PUB-21: show the geo interstitial on this page for a restricted location. `search` is the query string (the
 * part after `?` in `pathname` is used when it is not given); `null` = not known yet, so only the path decides.
 */
export function isGeoGated(pathname: string, search?: string | null): boolean {
  const p = normalise(pathname);
  if (ALWAYS_OPEN.test(p) || !GEO_GATED.test(p)) return false;
  const query = search ?? (pathname.includes('?') ? pathname.split('?')[1]!.split('#')[0]! : '');
  return !isDepositTracker(p, query);
}

/** PUB-22: a gambling surface that needs the 18+ confirmation on first visit. */
export function isAgeGated(pathname: string): boolean {
  const p = normalise(pathname);
  if (ALWAYS_OPEN.test(p)) return false;
  return p === '/' || GEO_GATED.test(p);
}

/** Focused gate pages rendered without the casino shell (no game navigation, no tab bar). */
export function isFocusedGatePage(pathname: string): boolean {
  return /^\/(region-unavailable|age-restricted)(\/|$)/.test(normalise(pathname));
}
