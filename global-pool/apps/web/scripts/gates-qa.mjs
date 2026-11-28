/* global window, document -- used inside page callbacks, which run in the browser */
// Compliance gates visual QA (PUB-21 geo interstitial, PUB-22 age gate + exit page, ERR-05 regulatory states):
// screenshots at 1440 and 390 against a running web (API data source, DEV MOCK auth, NEXT_PUBLIC_STATE_PREVIEW=true
// for /compliance-preview) + an API behind a trusted CDN header (TRUST_PROXY=true GEO_COUNTRY_HEADER=x-country).
// Usage: BASE_URL=http://localhost:3313 API_URL=http://localhost:4313 node scripts/gates-qa.mjs  (ONLY=a,b · WIDTHS=1440)
// Output: test-results/visual/gates/<name>_<width>.png (git-ignored). Fails on horizontal overflow or console errors.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3313';
const API = process.env.API_URL ?? 'http://localhost:4313';
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual', 'gates');
mkdirSync(OUT, { recursive: true });
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ONLY = process.env.ONLY?.split(',');

const ageOk = () => ({
  name: 'gp_age_ok',
  value: `${Math.floor(Date.now() / 1000)}.PT`,
  url: BASE,
});

/** name → { url, country?, member?, confirmed?, full?, steps?(page) } */
const SHOTS = [
  ['PUB-22_age-gate_default', { url: '/', wait: '[data-gate="age-gate"]' }],
  [
    'PUB-22_age-gate_answered',
    {
      url: '/',
      wait: '[data-gate="age-gate"]',
      steps: async (p) => {
        const d = p.locator('[data-gate="age-gate"]');
        await d.getByRole('radio', { name: /Yes, I’m 18 or older/ }).click();
        await d.getByRole('checkbox').click();
      },
    },
  ],
  [
    'PUB-22_age-gate_under-18',
    {
      url: '/games',
      wait: '[data-gate="age-gate"]',
      steps: async (p) => {
        await p
          .locator('[data-gate="age-gate"]')
          .getByRole('radio', { name: /No, I’m under 18/ })
          .click();
      },
    },
  ],
  [
    'PUB-22_exit_age-restricted',
    { url: '/age-restricted', full: true, wait: '[data-gate="age-restricted"]' },
  ],
  [
    'PUB-21_geo-block_US_guest',
    { url: '/games', country: 'US', full: true, wait: '[data-gate="geo-block"]' },
  ],
  [
    'PUB-21_geo-block_US_member',
    { url: '/pool', country: 'US', member: true, full: true, wait: '[data-gate="geo-block"]' },
  ],
  ['PUB-21_region-unavailable_PT', { url: '/region-unavailable', country: 'PT', wait: 'h1' }],
  ...['region', 'licence', 'kyc_required', 'self_excluded', 'cooling_off', 'age'].map((k) => [
    `ERR-05_${k}_page`,
    {
      url: `/compliance-preview?kind=${k}`,
      confirmed: true,
      full: true,
      wait: '[data-regulatory-state]',
    },
  ]),
  [
    'ERR-05_kyc_required_card',
    {
      url: '/compliance-preview?kind=kyc_required&layout=card',
      confirmed: true,
      wait: '[data-regulatory-state]',
    },
  ],
  [
    'ERR-05_region_notice',
    { url: '/compliance-preview?kind=region&layout=notice', confirmed: true, wait: 'main' },
  ],
];

async function memberSession(context) {
  const did = `did:privy:qa-gates-${Math.random().toString(36).slice(2, 10)}`;
  const tok = await fetch(`${API}/auth/dev/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ did }),
  }).then((r) => r.json());
  const headers = { authorization: `Bearer ${tok.token}`, 'content-type': 'application/json' };
  await fetch(`${API}/auth/session`, { method: 'POST', headers });
  await fetch(`${API}/auth/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      handle: `qa_gates_${Math.random().toString(36).slice(2, 8)}`,
      country: 'PT',
      consents: {
        ageConfirmed: true,
        jurisdictionConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingOptIn: false,
      },
    }),
  });
  await context.addInitScript((d) => {
    window.localStorage.setItem(
      'gp.devMockSession',
      JSON.stringify({ did: d, email: null, wallet: null }),
    );
  }, did);
  await context.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

const browser = await chromium.launch();
let failures = 0;
for (const [name, cfg] of SHOTS) {
  if (ONLY && !ONLY.some((o) => name.includes(o))) continue;
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width >= 768 ? 1024 : 844 },
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    if (cfg.country) {
      // The CDN's country header on every request to the API (what Cloudflare adds in production).
      await context.route(`${API}/**`, (route) =>
        route.continue({ headers: { ...route.request().headers(), 'x-country': cfg.country } }),
      );
    }
    if (cfg.confirmed) await context.addCookies([ageOk()]);
    if (cfg.member) await memberSession(context);
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text()))
        errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    try {
      // Members keep a live connection (pool socket, heartbeats): wait for load + the gate's selector instead.
      await page.goto(`${BASE}${cfg.url}`, {
        waitUntil: cfg.member ? 'load' : 'networkidle',
        timeout: 90_000,
      });
      if (cfg.wait) await page.locator(cfg.wait).first().waitFor({ timeout: 30_000 });
      if (cfg.steps) await cfg.steps(page);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(
        () => document.scrollingElement.scrollWidth - window.innerWidth,
      );
      const file = path.join(OUT, `${name}_${width}.png`);
      await page.screenshot({ path: file, fullPage: Boolean(cfg.full) });
      const problems = [
        ...(overflow > 1 ? [`horizontal overflow ${overflow}px`] : []),
        ...errors.map((e) => `console: ${e.slice(0, 160)}`),
      ];
      if (problems.length) failures += 1;
      console.info(
        `${problems.length ? 'FAIL' : 'ok  '} ${name}_${width}${problems.length ? ` — ${problems.join(' | ')}` : ''}`,
      );
    } catch (e) {
      failures += 1;
      console.info(`FAIL ${name}_${width} — ${String(e).split('\n')[0]}`);
    }
    await context.close();
  }
}
await browser.close();
console.info(failures ? `${failures} shot(s) with problems` : 'all shots ok');
process.exit(failures ? 1 : 0);
