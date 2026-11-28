/**
 * Per-browser memory for the compliance gates. Every access is wrapped in try/catch: blocked cookies / storage
 * (private mode, strict settings) simply mean the gate asks again — never that it is skipped.
 *
 * - Age gate (PUB-22): a first-party, strictly necessary cookie `gp_age_ok` (30 days, SameSite=Lax) mirrored in
 *   localStorage `gp.ageGate`. Either one counts. For members the onboarding `ageConfirmed` consent is
 *   authoritative and this memory is not consulted.
 * - "I am under 18" is remembered for the browser session (sessionStorage) so gambling pages keep showing the exit
 *   page instead of a fresh question.
 * - DEV QA (state-preview builds only): `?devCountry=US` is kept for the tab in sessionStorage `gp.devCountry`.
 */

export const AGE_COOKIE = 'gp_age_ok';
export const AGE_STORAGE_KEY = 'gp.ageGate';
export const UNDER_AGE_KEY = 'gp.ageGate.under18';
export const DEV_COUNTRY_KEY = 'gp.devCountry';
export const AGE_CONFIRMATION_DAYS = 30;

const DAY_MS = 86_400_000;

export interface AgeConfirmation {
  confirmedAt: string;
  /** Declared country of residence when the visitor confirmed (informational). */
  country: string | null;
}

/** Storage seams (the browser by default; fakes in unit tests). */
export interface GateStorageEnv {
  getCookie: () => string;
  setCookie: (cookie: string) => void;
  local: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  session: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  now: () => number;
  secure: boolean;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function browserEnv(): GateStorageEnv {
  const hasWindow = typeof window !== 'undefined';
  return {
    getCookie: () => (hasWindow ? document.cookie : ''),
    setCookie: (c) => {
      if (hasWindow) document.cookie = c;
    },
    local: hasWindow ? safe(() => window.localStorage, null) : null,
    session: hasWindow ? safe(() => window.sessionStorage, null) : null,
    now: () => Date.now(),
    secure: hasWindow && window.location.protocol === 'https:',
  };
}

function fresh(confirmedAtMs: number, now: number): boolean {
  return (
    Number.isFinite(confirmedAtMs) &&
    confirmedAtMs <= now + 60_000 &&
    now - confirmedAtMs < AGE_CONFIRMATION_DAYS * DAY_MS
  );
}

/** The browser's 18+ confirmation if it is still valid (cookie or localStorage), else null. */
export function readAgeConfirmation(env: GateStorageEnv = browserEnv()): AgeConfirmation | null {
  const now = env.now();
  const cookie = safe(
    () =>
      env
        .getCookie()
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AGE_COOKIE}=`))
        ?.slice(AGE_COOKIE.length + 1) ?? null,
    null,
  );
  if (cookie) {
    // value: "<epoch seconds>.<country|->"
    const [secs, country] = decodeURIComponent(cookie).split('.');
    const at = Number(secs) * 1000;
    if (fresh(at, now)) {
      return {
        confirmedAt: new Date(at).toISOString(),
        country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      };
    }
  }
  const stored = safe(() => env.local?.getItem(AGE_STORAGE_KEY) ?? null, null);
  if (stored) {
    const parsed = safe(() => JSON.parse(stored) as Partial<AgeConfirmation>, null);
    const at = parsed?.confirmedAt ? Date.parse(parsed.confirmedAt) : NaN;
    if (parsed && fresh(at, now)) {
      return {
        confirmedAt: new Date(at).toISOString(),
        country:
          typeof parsed.country === 'string' && /^[A-Z]{2}$/.test(parsed.country)
            ? parsed.country
            : null,
      };
    }
  }
  return null;
}

/** Remember an explicit "Yes, I'm 18+" + jurisdiction confirmation for this browser (30 days). */
export function saveAgeConfirmation(
  country: string | null,
  env: GateStorageEnv = browserEnv(),
): AgeConfirmation {
  const now = env.now();
  const record: AgeConfirmation = { confirmedAt: new Date(now).toISOString(), country };
  const value = `${Math.floor(now / 1000)}.${country ?? '-'}`;
  safe(() => {
    env.setCookie(
      `${AGE_COOKIE}=${encodeURIComponent(value)}; Max-Age=${AGE_CONFIRMATION_DAYS * 86_400}; Path=/; SameSite=Lax${env.secure ? '; Secure' : ''}`,
    );
  }, undefined);
  safe(() => env.local?.setItem(AGE_STORAGE_KEY, JSON.stringify(record)), undefined);
  safe(() => env.session?.removeItem(UNDER_AGE_KEY), undefined);
  return record;
}

/** Forget the confirmation (tests / "not me"). */
export function clearAgeConfirmation(env: GateStorageEnv = browserEnv()): void {
  safe(() => env.setCookie(`${AGE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`), undefined);
  safe(() => env.local?.removeItem(AGE_STORAGE_KEY), undefined);
}

/** "No, I'm under 18": remembered for this browser session; any earlier confirmation is dropped. */
export function markUnderAge(env: GateStorageEnv = browserEnv()): void {
  clearAgeConfirmation(env);
  safe(() => env.session?.setItem(UNDER_AGE_KEY, String(env.now())), undefined);
}

export function readUnderAge(env: GateStorageEnv = browserEnv()): boolean {
  return safe(() => Boolean(env.session?.getItem(UNDER_AGE_KEY)), false);
}

// ── DEV QA: ?devCountry= (state-preview builds only) ───────────────────────────────────────────

/**
 * Resolve the DEV country override for this tab: `?devCountry=US` sets it, `?devCountry=` / `off` clears it, else
 * the last value of this tab. Only called when the state preview is enabled; the API ignores it unless it runs with
 * NODE_ENV=development.
 */
export function resolveDevCountry(
  search: string,
  env: Pick<GateStorageEnv, 'session'> = browserEnv(),
): string | null {
  const params = safe(() => new URLSearchParams(search), new URLSearchParams());
  if (params.has('devCountry')) {
    const raw = (params.get('devCountry') ?? '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(raw)) {
      safe(() => env.session?.setItem(DEV_COUNTRY_KEY, raw), undefined);
      return raw;
    }
    safe(() => env.session?.removeItem(DEV_COUNTRY_KEY), undefined);
    return null;
  }
  const saved = safe(() => env.session?.getItem(DEV_COUNTRY_KEY) ?? null, null);
  return saved && /^[A-Z]{2}$/.test(saved) ? saved : null;
}
