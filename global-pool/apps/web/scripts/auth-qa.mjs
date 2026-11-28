/* global window, document -- used inside page callbacks, which run in the browser */
// AUTH module visual QA (AUTH-01/02/03/04/07/08/09/10/18/20/21 + MOB): viewport screenshots at 1440 and 390 of every
// auth screen / dialog state against a running web (DEV MOCK auth) + API.
// Usage: BASE_URL=http://localhost:3101 API_URL=http://localhost:4101 node scripts/auth-qa.mjs  (ONLY=a,b · WIDTHS=1440)
// Output: test-results/visual/auth/<name>_<width>.png (git-ignored). Uses the global `playwright`.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3101';
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual', 'auth');
mkdirSync(OUT, { recursive: true });
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ONLY = process.env.ONLY?.split(',');

const NOVA = { did: 'did:privy:demo-nova-k', email: 'nova.k@example.com', wallet: null };
const uniq = () => Math.random().toString(36).slice(2, 8);

/** name → { url, session?, steps?(page) } */
const SHOTS = [
  ['AUTH-01_sign-up', { url: '/sign-up' }],
  ['AUTH-03_sign-in', { url: '/sign-in' }],
  [
    'AUTH-01_validation',
    {
      url: '/sign-up',
      steps: async (p) => {
        await p.getByRole('button', { name: 'Create account' }).click();
      },
    },
  ],
  ['AUTH-02_wallet', { url: '/auth-preview?show=wallet' }],
  [
    'AUTH-04_code-entry',
    {
      url: '/sign-up',
      steps: async (p) => {
        await p.getByLabel('Email address').fill(`qa-${uniq()}@example.com`);
        await p.getByRole('button', { name: 'Create account' }).click();
        await p.getByLabel('Verification code').waitFor();
        await p.getByLabel('Verification code').fill('482');
      },
    },
  ],
  [
    'AUTH-04_wrong-code',
    {
      url: '/sign-in',
      steps: async (p) => {
        await p.getByLabel('Email address').fill(`qa-${uniq()}@example.com`);
        await p.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
        await p.getByLabel('Verification code').fill('000000');
        await p.getByText(/attempts left/).waitFor();
      },
    },
  ],
  [
    'AUTH-04_success',
    {
      url: '/sign-up',
      steps: async (p) => {
        await p.getByLabel('Email address').fill(`qa-${uniq()}@example.com`);
        await p.getByRole('button', { name: 'Create account' }).click();
        await p.getByLabel('Verification code').fill('482915');
        await p.getByRole('button', { name: 'Continue to account setup' }).waitFor();
        await p.waitForTimeout(400);
      },
    },
  ],
  [
    'AUTH-01_onboarding',
    {
      url: '/sign-up',
      steps: async (p) => {
        await p.getByLabel('Email address').fill(`qa-${uniq()}@example.com`);
        await p.getByRole('button', { name: 'Create account' }).click();
        await p.getByLabel('Verification code').fill('482915');
        await p.getByRole('button', { name: 'Continue to account setup' }).click();
        await p.getByRole('heading', { name: 'Finish setting up your account' }).waitFor();
        await p.waitForTimeout(600);
      },
    },
  ],
  [
    'AUTH-07_scan',
    {
      url: '/2fa/setup',
      session: 'fresh-onboarded',
      steps: async (p) => {
        await p
          .getByRole('heading', { name: 'Scan this QR code with your authenticator app' })
          .waitFor();
        await p.locator('code').first().waitFor();
      },
    },
  ],
  [
    'AUTH-07_confirm',
    {
      url: '/2fa/setup',
      session: 'fresh-onboarded',
      steps: async (p) => {
        await p.getByRole('button', { name: 'Next: enter code' }).click();
      },
    },
  ],
  ['AUTH-08_withdrawal', { url: '/auth-preview?show=stepup', session: 'nova' }],
  ['AUTH-08_wrong', { url: '/auth-preview?show=stepup-wrong', session: 'nova' }],
  ['AUTH-08_locked', { url: '/auth-preview?show=stepup-locked', session: 'nova' }],
  ['AUTH-09_list', { url: '/auth-preview?show=connect-list', session: 'nova' }],
  ['AUTH-09_qr', { url: '/auth-preview?show=connect-qr', session: 'nova' }],
  ['AUTH-09_connecting', { url: '/auth-preview?show=connect-connecting', session: 'nova' }],
  ['AUTH-09_rejected', { url: '/auth-preview?show=connect-rejected', session: 'nova' }],
  ['AUTH-09_wrong-network', { url: '/auth-preview?show=connect-wrong-network', session: 'nova' }],
  ['AUTH-09_success', { url: '/auth-preview?show=connect-success', session: 'nova' }],
  ['AUTH-10_request', { url: '/auth-preview?show=verify-request', session: 'nova' }],
  ['AUTH-10_success', { url: '/auth-preview?show=verify-success', session: 'nova' }],
  ['AUTH-10_rejected', { url: '/auth-preview?show=verify-rejected', session: 'nova' }],
  ['AUTH-10_expired', { url: '/auth-preview?show=verify-expired', session: 'nova' }],
  [
    'AUTH-18_suspended',
    { url: '/auth-preview?show=restricted-suspended', session: 'nova', full: true },
  ],
  [
    'AUTH-18_under-review',
    { url: '/auth-preview?show=restricted-under-review', session: 'nova', full: true },
  ],
  [
    'AUTH-18_self-excluded',
    { url: '/auth-preview?show=restricted-self-excluded', session: 'nova', full: true },
  ],
  ['AUTH-18_region', { url: '/auth-preview?show=restricted-region', session: 'nova', full: true }],
  ['AUTH-18_live-ok', { url: '/restricted/suspended', session: 'nova' }],
  ['AUTH-20_session-expired', { url: '/auth-preview?show=session-expired', session: 'nova' }],
  ['AUTH-21_new-device', { url: '/auth-preview?show=new-device', session: 'nova' }],
];

const API = process.env.API_URL ?? 'http://localhost:4101';

/** A brand-new DEV MOCK player that already completed onboarding (via the API). */
async function freshOnboarded() {
  const email = `qa-${uniq()}@example.com`;
  const did = `did:privy:qa-${uniq()}${uniq()}`;
  const tok = await fetch(`${API}/auth/dev/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ did, email }),
  }).then((r) => r.json());
  const res = await fetch(`${API}/auth/onboarding`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tok.token}` },
    body: JSON.stringify({
      handle: `qa_${uniq()}`,
      country: 'PT',
      dateOfBirth: '1994-03-14',
      consents: {
        ageConfirmed: true,
        jurisdictionConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingOptIn: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`onboarding failed ${res.status} ${await res.text()}`);
  return { did, email, wallet: null };
}

const browser = await chromium.launch();
const problems = [];
for (const [name, shot] of SHOTS) {
  if (ONLY && !ONLY.some((o) => name.includes(o))) continue;
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 1024 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const session =
      shot.session === 'nova'
        ? NOVA
        : shot.session === 'fresh-onboarded'
          ? await freshOnboarded()
          : null;
    await context.addInitScript((s) => {
      try {
        if (s) window.localStorage.setItem('gp.devMockSession', JSON.stringify(s));
        else window.localStorage.removeItem('gp.devMockSession');
      } catch {
        /* ignore */
      }
    }, session);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    try {
      await page.goto(`${BASE}${shot.url}`, { waitUntil: 'load', timeout: 120_000 });
      // The lobby keeps a socket open (never network-idle): wait for the screen itself instead.
      await page.locator('[role="dialog"], main h1, main h2').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
      if (shot.steps) await shot.steps(page);
      await page.waitForTimeout(700);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      if (overflow > 1) problems.push(`${name}@${width}: horizontal overflow ${overflow}px`);
      await page.screenshot({
        path: path.join(OUT, `${name}_${width}.png`),
        fullPage: Boolean(shot.full),
      });
    } catch (err) {
      problems.push(`${name}@${width}: ${String(err).split('\n')[0]}`);
      await page
        .screenshot({ path: path.join(OUT, `${name}_${width}_FAILED.png`) })
        .catch(() => {});
    }
    const relevant = errors.filter(
      // 404 = <Link> prefetches of planned routes (not built yet); 403 = ONBOARDING_REQUIRED for a new player.
      (e) => !/Download the React DevTools|favicon|\[HMR\]|Fast Refresh|status of 40[34]/.test(e),
    );
    if (relevant.length)
      problems.push(`${name}@${width}: console errors: ${relevant.slice(0, 3).join(' | ')}`);
    await context.close();
  }
}
await browser.close();
console.info(
  problems.length
    ? `PROBLEMS:\n${problems.join('\n')}`
    : 'auth QA: all screenshots taken, no problems',
);
process.exitCode = problems.length ? 1 : 0;
