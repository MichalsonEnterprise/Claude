/* global document, window -- used inside page.evaluate() / addInitScript callbacks, which run in the browser */
// admin-a visual QA: signs in a DEMO admin through the API (password + TOTP from apps/api/.dev/demo-admins.json),
// seeds the tab's admin session and screenshots each admin page at the requested widths.
// Usage: BASE_URL=http://localhost:3106 API_URL=http://localhost:4106 node scripts/admin-a-qa.mjs
//        env ADMIN=s.iyer|k.osei|r.duarte|a.marin|e.lindqvist  WIDTHS=1440,390  PAGES=/admin,/admin/users
// Output: test-results/visual/admin-a/<admin>_<page>_<width>.png (git-ignored). Fails on horizontal overflow or
// console errors. Uses the global `playwright` (chromium preinstalled).
import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3106';
const API = process.env.API_URL ?? 'http://localhost:4106';
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual', 'admin-a');
mkdirSync(OUT, { recursive: true });
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ADMIN = process.env.ADMIN ?? 's.iyer';
const PAGES = (
  process.env.PAGES ??
  '/admin,/admin/approvals,/admin/alerts,/admin/users,/admin/audit,/admin/roles,/admin/permissions'
)
  .split(',')
  .filter(Boolean);
const FULL = process.env.FULL !== 'false';

export function totp(secretBase32, offset = 0) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secretBase32.replace(/[\s=]/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30) + offset));
  const h = createHmac('sha1', bytes).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

const admins = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '../../api/.dev/demo-admins.json'), 'utf8'),
).admins;
const who = admins.find((a) => a.email.startsWith(`${ADMIN}@`));
if (!who) throw new Error(`Unknown DEMO admin ${ADMIN}`);

async function apiLogin() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: who.email,
        password: who.password,
        totpCode: totp(who.totpSecret),
      }),
    });
    if (res.ok) return res.json();
    // replay-protected codes: wait for the next 30 s step and retry
    await new Promise((r) => setTimeout(r, 31_000 - (Date.now() % 30_000)));
  }
  throw new Error('admin login failed');
}

const browser = await chromium.launch();
const problems = [];
for (const width of WIDTHS) {
  const noAuth = process.env.NOAUTH === '1';
  const session = noAuth ? null : await apiLogin();
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1024 },
  });
  if (session)
    await context.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, value);
      },
      [
        'gp.admin.session',
        JSON.stringify({
          refreshToken: session.refreshToken,
          sessionExpiresAt: session.sessionExpiresAt,
          email: session.admin.email,
          name: session.admin.name,
        }),
      ],
    );
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Download the React DevTools/.test(m.text()))
      errors.push(m.text());
  });
  for (const p of PAGES) {
    errors.length = 0;
    await page.goto(`${BASE}${p}`, { waitUntil: 'load', timeout: 180_000 });
    await page
      .waitForSelector(process.env.READY_SELECTOR ?? '#main', { timeout: 60_000 })
      .catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(Number(process.env.SETTLE_MS ?? 1500));
    if (process.env.PALETTE_QUERY) {
      await page.keyboard.press('Control+k');
      await page.keyboard.type(process.env.PALETTE_QUERY, { delay: 40 });
      await page.waitForTimeout(1500);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1) problems.push(`${p} @${width}: horizontal overflow ${overflow}px`);
    for (const e of errors) problems.push(`${p} @${width}: console error ${e.slice(0, 200)}`);
    const name = `${process.env.PALETTE_QUERY ? 'palette_' : ''}${noAuth ? 'guest' : ADMIN}_${p.replace(/^\/admin\/?/, '').replace(/[/?=&]+/g, '-') || 'overview'}_${width}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: FULL });
    console.info('saved', name);
  }
  await context.close();
}
await browser.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
