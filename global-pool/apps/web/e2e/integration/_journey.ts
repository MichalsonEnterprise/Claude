/**
 * Shared helpers for the cross-module journey specs (e2e/integration/j*.spec.ts).
 *
 * Every journey uses a FRESH player (unique DID / email), so runs are repeatable against the shared dev DB.
 * Admin TOTP codes are taken from apps/api/.dev/demo-admins.json; because other agents use the same DEMO admins
 * concurrently and every TOTP step is accepted once per admin, the next code is chosen after the step last consumed
 * in the DB (never a replay → no failed attempts, no lockout).
 *
 *   E2E_BASE_URL=http://localhost:3302 E2E_API_URL=http://localhost:4302 \
 *     pnpm --filter @gp/web exec playwright test e2e/integration --output test-results/e2e-journeys
 */
import { execFileSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expect,
  test as base,
  type APIRequestContext,
  type APIResponse,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://localhost:4302';
export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3302';
export const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/globalpool';
const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Step screenshots live outside the Playwright output dir (which is wiped on every run). */
export const SHOTS = path.join(HERE, '../../test-results/e2e-journeys-shots');

export const uniq = () => Math.random().toString(36).slice(2, 10);

// ── PUB-22 age gate ───────────────────────────────────────────────────────────────────────────

/**
 * The state a visitor has after confirming 18+ on the PUB-22 gate (cookie `gp_age_ok=<epoch s>.<country>`,
 * src/components/compliance/storage.ts). Guest pages on gambling surfaces (/, /pool/**, /games/**) otherwise open
 * behind the age-gate modal. The gate itself is covered by e2e/gates.spec.ts.
 */
export async function presetAgeGate(context: BrowserContext, baseURL = BASE, country = 'PT') {
  await context.addCookies([
    { name: 'gp_age_ok', value: `${Math.floor(Date.now() / 1000)}.${country}`, url: baseURL },
  ]);
}

/**
 * Journey `test`: every page context starts with the age gate confirmed (G05). Contexts a spec opens itself
 * (`browser.newContext()`) call `presetAgeGate()` when they visit a guest gambling page.
 */
export const test = base.extend<{ ageGateConfirmed: void }>({
  ageGateConfirmed: [
    async ({ context, baseURL }, use) => {
      await presetAgeGate(context, baseURL ?? BASE);
      await use();
    },
    { auto: true },
  ],
});
export { expect };

/** E2E_VIEWPORT=390 runs the journeys on the mobile layout (390 × 844); default desktop 1440 × 1024. */
export const MOBILE = process.env.E2E_VIEWPORT === '390';
export const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 1024 };
const VP_TAG = MOBILE ? '_390' : '';

// ── screenshots + integration signals ─────────────────────────────────────────────────────────

export async function shot(page: Page, journey: string, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  const file = path.join(SHOTS, `${journey}${VP_TAG}_${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

/**
 * Collects console errors and failing API requests (≥ 400) for the integration report. Expected 4xx answers are
 * still recorded (journeys provoke some on purpose); the spec decides what is a defect.
 */
export function watch(page: Page, journey: string) {
  const events: { kind: string; text: string; url?: string; at: string }[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error')
      events.push({ kind: 'console.error', text: m.text().slice(0, 500), url: page.url(), at: new Date().toISOString() });
  });
  page.on('pageerror', (e) =>
    events.push({ kind: 'pageerror', text: String(e).slice(0, 500), url: page.url(), at: new Date().toISOString() }),
  );
  page.on('response', async (r) => {
    if (r.status() >= 400 && !r.url().startsWith(API)) {
      events.push({
        kind: `web ${r.status()}`,
        text: `${r.request().method()} ${r.url().replace(BASE, '')}`,
        url: page.url(),
        at: new Date().toISOString(),
      });
      return;
    }
    if (r.status() >= 400 && r.url().startsWith(API)) {
      let body = '';
      try {
        body = (await r.text()).slice(0, 300);
      } catch {
        /* ignore */
      }
      events.push({
        kind: `api ${r.status()}`,
        text: `${r.request().method()} ${r.url().replace(API, '')} → ${body}`,
        url: page.url(),
        at: new Date().toISOString(),
      });
    }
  });
  return {
    events,
    flush(testInfo: TestInfo) {
      mkdirSync(SHOTS, { recursive: true });
      writeFileSync(path.join(SHOTS, `${journey}${VP_TAG}_signals.json`), JSON.stringify(events, null, 2));
      void testInfo.attach('signals', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
    },
  };
}

// ── TOTP ──────────────────────────────────────────────────────────────────────────────────────

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) at an absolute time step. */
export function totpAt(secretBase32: string, step: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secretBase32.replace(/[\s=]/g, '').toUpperCase())
    bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}
export const timeStep = () => Math.floor(Date.now() / 30_000);

export function psql(sql: string): string {
  return execFileSync('psql', [DB, '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

/**
 * A TOTP code that has never been accepted for this secret: step = max(now, lastUsed + 1). The API accepts
 * now−1 … now+1 (30 s tolerance), so this waits only when another client already consumed now+1.
 */
async function freshCode(secret: string, lastUsedStep: () => number | null): Promise<string> {
  for (;;) {
    const last = lastUsedStep();
    const now = timeStep();
    const step = Math.max(now, (last ?? 0) + 1);
    if (step <= now + 1) return totpAt(secret, step);
    await new Promise((r) => setTimeout(r, Math.min(30_000, (step - 1) * 30_000 - Date.now() + 250)));
  }
}

const stepOrNull = (v: string) => (v === '' ? null : Number(v));

export const playerCode = (userId: string, secret: string) =>
  freshCode(secret, () =>
    stepOrNull(psql(`select coalesce(last_used_step::text,'') from totp_secrets where user_id = '${userId}'`)),
  );

// ── admins ────────────────────────────────────────────────────────────────────────────────────

export interface DemoAdmin {
  name: string;
  email: string;
  password: string;
  totpSecret: string;
  roles: string[];
}
export const ADMINS = (
  JSON.parse(readFileSync(path.join(HERE, '../../../api/.dev/demo-admins.json'), 'utf8')) as {
    admins: DemoAdmin[];
  }
).admins;
export const admin = (prefix: string) => ADMINS.find((a) => a.email.startsWith(prefix))!;

export const adminCode = (a: DemoAdmin) =>
  freshCode(a.totpSecret, () =>
    stepOrNull(
      psql(
        `select coalesce(t.last_used_step::text,'') from totp_secrets t join admin_users u on u.id = t.admin_user_id where u.email = '${a.email}'`,
      ),
    ),
  );

/** ADM-01 two-step sign-in through the UI. */
export async function adminSignIn(page: Page, a: DemoAdmin) {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Sign in to the admin console' })).toBeVisible();
  await page.getByLabel('Work email').fill(a.email);
  await page.getByLabel('Password', { exact: true }).fill(a.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Confirm it’s you' })).toBeVisible();
  await page.getByLabel('Authenticator code').fill(await adminCode(a));
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
}

/** Admin bearer token via the API (for read-only cross-checks). */
export async function adminToken(request: APIRequestContext, a: DemoAdmin): Promise<string> {
  const res = await request.post(`${API}/admin/auth/login`, {
    data: { email: a.email, password: a.password, totpCode: await adminCode(a) },
  });
  expect(res.status(), await res.text()).toBe(200);
  const body = (await res.json()) as { accessToken?: string; tokens?: { accessToken: string } };
  return body.accessToken ?? body.tokens!.accessToken;
}

// ── players ───────────────────────────────────────────────────────────────────────────────────

export interface Player {
  did: string;
  token: string;
  handle: string;
  userId: string;
  totpSecret?: string;
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export async function json<T = Record<string, unknown>>(res: APIResponse): Promise<T> {
  return (await res.json()) as T;
}

/** Same DID the web DEV MOCK derives for an email (lib/auth/mock-auth-provider.tsx mockDidForEmail). */
export const mockDidForEmail = (email: string) =>
  `did:privy:mock-${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 24)}`;

/** Fresh onboarded player (Portugal) through the API, optionally with KYC, a DEMO deposit and 2FA. */
export async function createPlayer(
  request: APIRequestContext,
  journey: string,
  opts: { kyc?: 'level_1' | 'level_2'; deposit?: string; twoFactor?: boolean; email?: string } = {},
): Promise<Player> {
  const did = opts.email ? mockDidForEmail(opts.email) : `did:privy:qa-${journey}-${uniq()}`;
  const tok = await request.post(`${API}/auth/dev/token`, {
    data: opts.email ? { did, email: opts.email } : { did },
  });
  expect(tok.status(), await tok.text()).toBe(200);
  const { token } = await json<{ token: string }>(tok);
  const headers = bearer(token);
  expect((await request.post(`${API}/auth/session`, { headers })).ok()).toBeTruthy();
  const handle = `qa_${journey}_${uniq()}`.slice(0, 20);
  const onboard = await request.post(`${API}/auth/onboarding`, {
    headers,
    data: {
      handle,
      country: 'PT',
      consents: {
        ageConfirmed: true,
        jurisdictionConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingOptIn: false,
      },
    },
  });
  expect(onboard.status(), await onboard.text()).toBe(200);
  const userId = psql(`select id from users where privy_user_id = '${did}'`);
  const p: Player = { did, token, handle, userId };
  if (opts.kyc) {
    const k = await request.post(`${API}/dev/kyc/approve`, { headers, data: { level: opts.kyc } });
    expect(k.status(), await k.text()).toBe(200);
  }
  if (opts.deposit) {
    const d = await request.post(`${API}/dev/deposits/simulate`, {
      headers,
      data: { network: 'arbitrum', amount: opts.deposit, idempotencyKey: `qa-${journey}-dep-${uniq()}` },
    });
    expect(d.status(), await d.text()).toBe(200);
  }
  if (opts.twoFactor) await enrolTotp(request, p);
  return p;
}

export async function enrolTotp(request: APIRequestContext, p: Player) {
  const enrol = await request.post(`${API}/auth/2fa/enroll`, { headers: bearer(p.token) });
  expect(enrol.status(), await enrol.text()).toBeLessThan(300);
  const { secret } = await json<{ secret: string }>(enrol);
  const confirm = await request.post(`${API}/auth/2fa/confirm`, {
    headers: bearer(p.token),
    data: { code: totpAt(secret, timeStep()) },
  });
  expect(confirm.status(), await confirm.text()).toBeLessThan(300);
  p.totpSecret = secret;
}

/** DEV MOCK browser session for an API-created player (same DID → same user). */
export async function signIn(page: Page, p: Pick<Player, 'did' | 'token'>, email: string | null = null) {
  const base = new URL(BASE);
  await page
    .context()
    .addCookies([{ name: 'privy-token', value: p.token, domain: base.hostname, path: '/' }]);
  await page.addInitScript(
    ([did, mail]) => {
      window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: mail, wallet: null }));
    },
    [p.did, email] as const,
  );
  // The AUTH-21 new-device prompt is covered by e2e/auth.spec.ts; keep it out of the journeys.
  await page.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

export interface Balances {
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
}
export async function balances(request: APIRequestContext, p: Player): Promise<Balances> {
  const r = await request.get(`${API}/wallet/balances`, { headers: bearer(p.token) });
  expect(r.status()).toBe(200);
  return json<Balances>(r);
}

export interface CurrentRound {
  id: string;
  number: number;
  status: string;
  opensAt: string;
  closesAt: string;
}
export async function currentRound(request: APIRequestContext): Promise<CurrentRound> {
  return json<CurrentRound>(await request.get(`${API}/pool/rounds/current`));
}
/** The round accepts entries only while status = open AND opensAt ≤ now < closesAt (EntriesService.enter). */
export function acceptsEntries(r: CurrentRound, now = Date.now()) {
  return r.status === 'open' && Date.parse(r.opensAt) <= now && now < Date.parse(r.closesAt);
}

// ── wallet: withdraw flow (WAL-10 … WAL-17) ───────────────────────────────────────────────────

/**
 * Drives /wallet/withdraw up to the risk-check screen for a NEW address. Returns once the risk-check heading is
 * visible; the caller asserts the outcome (manual review / blocked) and continues to 2FA.
 */
export async function startWithdrawal(page: Page, address: string, amount: string) {
  await page.goto('/wallet/withdraw');
  await expect(page.getByRole('heading', { name: 'What do you want to withdraw?' })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose the network' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Where should we send it?' })).toBeVisible();
  const fresh = page.getByRole('radio', { name: /Use a new address/ });
  if (!(await fresh.isChecked())) await page.getByText('Use a new address', { exact: true }).click();
  await expect(fresh).toBeChecked();
  await page.getByLabel('Withdrawal address').fill(address);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'How much do you want to withdraw?' })).toBeVisible();
  await page.getByLabel('Amount to withdraw').fill(amount);
  await expect(page.getByText(/updated \d{2}:\d{2}:\d{2} UTC/)).toBeVisible();
  await page.getByRole('button', { name: 'Review fees' }).click();
  await expect(page.getByRole('heading', { name: 'Review your withdrawal' })).toBeVisible();
  const next = page.getByRole('button', { name: 'Continue to security check' });
  await expect(next).toBeDisabled();
  await page.getByRole('checkbox', { name: /I’ve checked the address and network/ }).click();
  await next.click();
}
