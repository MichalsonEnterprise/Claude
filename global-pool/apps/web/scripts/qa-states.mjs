/* global document, window, getComputedStyle -- used inside page.evaluate() callbacks (browser) */
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GLOBAL POOL — cross-module STATE audit (ERR-01 empty · ERR-02 errors · ERR-03 loading). DEMO / testnet only.
//
// Visits every P0 route (player + admin; NOT games — other agents own those) with Playwright at 1440 and 390 and
// forces each state with request interception on API_URL:
//   ok        no interception (baseline: guest / @nova.k / super admin)
//   empty     a fresh, onboarded DEV MOCK player with no data (ERR-01)
//   down      every API request fails with "connection refused" (API down / offline)
//   500       data requests → 500 INTERNAL_ERROR in the shared error envelope
//   502       data requests → 502 from a proxy: HTML body, no envelope (raw status text must never be shown)
//   429       data requests → 429 RATE_LIMITED + Retry-After: 20
//   503       data requests → 503 SERVICE_UNAVAILABLE ("temporarily paused", maintenance)
//   slow      every API response delayed SLOW_MS (slow 3G latency): early screenshot must show a skeleton / loading
//             state (never a blank area or a premature empty state), and the page must finish loading
//   timeout   data requests never answer: after TIMEOUT_WAIT_MS the page must show an error with retry, never an
//             infinite skeleton (runs on TIMEOUT_ROUTES only — every visit takes ~TIMEOUT_WAIT_MS)
//   validation  form scenarios (client-side + server 400 VALIDATION_FAILED); see VALIDATION below
// "Data requests" = every API call except the auth bootstrap (dev token, /auth/session, GET /me, /auth/config,
// /admin/auth/*) and the geo gate (GET /compliance/geo), so the identity stays signed in while the page's own data
// fails. `down` fails everything. The PUB-22 age gate is pre-confirmed in every context (gates.spec.ts tests it).
//
// Per visit it flags: crash (page error / "Application error"), blank (no content, no skeleton, no message),
// raw (raw error strings: "Failed to fetch", "502 Bad Gateway", HTTP_ERROR, TypeError, [object Object], NaN,
// undefined, aborted signals, HTML), skeleton (skeletons still visible after the wait), no-retry (an error is shown
// without a Try again / Retry / Reload action), silent (the API failed but the page shows no error at all — e.g.
// an empty state "No transactions yet" for a failed request), overflow (horizontal scroll), empty-table (a table
// with headers and no rows and no empty state).
//
// Run (API + web must be running; web built with NEXT_PUBLIC_DATA_SOURCE=api pointing at API_URL):
//   bash scripts/dev-services.sh start
//   (cd apps/api && pnpm exec tsc -p tsconfig.build.json --outDir .dev/dist-co-states && \
//     API_PORT=4314 JOBS_ENABLED=false THROTTLE_LIMIT=5000 DEV_TOKEN_THROTTLE_LIMIT=3000 \
//     CORS_ORIGINS=http://localhost:3314 node .dev/dist-co-states/src/main.js &)
//   flock /tmp/gp-web-build.lock env NEXT_DIST_DIR=.next-co-states NEXT_PUBLIC_DATA_SOURCE=api \
//     NEXT_PUBLIC_API_URL=http://localhost:4314 NEXT_PUBLIC_WS_URL=ws://localhost:4314 pnpm --filter @gp/web build
//   NEXT_DIST_DIR=.next-co-states pnpm --filter @gp/web exec next start -p 3314 &
//   BASE_URL=http://localhost:3314 API_URL=http://localhost:4314 node apps/web/scripts/qa-states.mjs
// Env:
//   STATES   comma list (default ok,empty,down,500,502,429,503,slow,timeout,validation)
//   WIDTHS   (1440,390) · ONLY regex on the route path · CONCURRENCY parallel pages (4) · SHOTS=false
//   SKELETON_MS (15000) · SLOW_MS (4000) · TIMEOUT_WAIT_MS (65000) · TIMEOUT_ROUTES regex (representative set)
//   BASELINE=path/to/report.json → cells that failed there and pass now are marked "fixed" in the matrix
//   OUT (default apps/web/test-results/visual/qa-states)
// Output: <OUT>/<state>/<route-slug>_<w>.png (+ _early for slow), report.json, matrix.md (route × state),
// summary.txt (every problem). Exit code 1 when any problem was found.
// Notes: creates throwaway DEV MOCK players (did:privy:qa-states-…) in the target DB; only reads otherwise
// (validation scenarios stop at client-side errors or answer the write themselves with an intercepted 400).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const WEB_ROOT = path.join(import.meta.dirname, '..');
const APP_DIR = path.join(WEB_ROOT, 'src', 'app');
const BASE = (process.env.BASE_URL ?? 'http://localhost:3314').replace(/\/$/, '');
const API = (process.env.API_URL ?? 'http://localhost:4314').replace(/\/$/, '');
const OUT = process.env.OUT ?? path.join(WEB_ROOT, 'test-results', 'visual', 'qa-states');
const ALL_STATES = [
  'ok',
  'empty',
  'down',
  '500',
  '502',
  '429',
  '503',
  'slow',
  'timeout',
  'validation',
];
const STATES = (process.env.STATES ?? ALL_STATES.join(',')).split(',').filter(Boolean);
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4);
const SKELETON_MS = Number(process.env.SKELETON_MS ?? 15_000);
const SLOW_MS = Number(process.env.SLOW_MS ?? 4_000);
// > 2 × the 20 s client timeout: with more than 6 requests to a hung API the browser queues the rest (HTTP/1.1
// per-host limit) until the first ones time out, so a busy page's last error appears after ~2 × 20 s.
const TIMEOUT_WAIT_MS = Number(process.env.TIMEOUT_WAIT_MS ?? 65_000);
const TIMEOUT_ROUTES = new RegExp(
  process.env.TIMEOUT_ROUTES ??
    '^/(pool|wallet|wallet/history|dashboard|account|history/transactions|responsible-gaming|notifications|admin|admin/users|admin/finance/withdrawals|admin/pool/rounds)$',
);
const SHOTS = process.env.SHOTS !== 'false';
const BASELINE = process.env.BASELINE
  ? JSON.parse(readFileSync(process.env.BASELINE, 'utf8'))
  : null;
const NOVA_DID = 'did:privy:demo-nova-k';
/** Set when the web server itself stops answering — the run is aborted instead of recording false gaps. */
let webDown = false;
mkdirSync(OUT, { recursive: true });

// ── TOTP (RFC 6238, SHA-1, 30 s) — same helper as scripts/qa-crawler.mjs ────────────────────────────────────
function totp(secretBase32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = secretBase32.replace(/[\s=]/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac('sha1', bytes).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

// ── Routes (src/app/**/page.tsx; games, design system, dev previews excluded) ──────────────────────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}
const EXCLUDED = /^\/(games|design-system|auth-preview)(\/|$)/;
const ROUTES = walk(APP_DIR)
  .map((file) => {
    const segs = path
      .relative(APP_DIR, path.dirname(file))
      .split(path.sep)
      .filter((s) => s && !/^\(.*\)$/.test(s));
    return { pattern: `/${segs.join('/')}`, dynamic: segs.some((s) => s.startsWith('[')) };
  })
  .filter((r) => !EXCLUDED.test(r.pattern))
  .sort((a, b) => a.pattern.localeCompare(b.pattern));
/** Steps that are their own screen but share a route (URL state): audited like routes. */
const EXTRA_URLS = ['/wallet/deposit?step=address', '/wallet/withdraw?step=address'];

// ── API helpers ──────────────────────────────────────────────────────────────────────────────────────────────
async function api(p, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text.slice(0, 200)}`);
  return json;
}

const admins = JSON.parse(
  readFileSync(path.join(WEB_ROOT, '..', 'api', '.dev', 'demo-admins.json'), 'utf8'),
).admins;
const usedCodes = new Set();
async function adminLogin(roleKey) {
  const who = admins.find((a) => (a.roles ?? []).includes(roleKey));
  if (!who) throw new Error(`No DEMO admin with role ${roleKey}`);
  // every accepted TOTP step is single-use, so parallel workers each wait for a fresh 30 s window
  for (let attempt = 0; attempt < 14; attempt++) {
    const code = totp(who.totpSecret);
    const key = `${who.email}:${code}`;
    if (!usedCodes.has(key)) {
      usedCodes.add(key);
      const res = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: who.email, password: who.password, totpCode: code }),
      });
      if (res.ok) return await res.json();
    }
    await new Promise((r) => setTimeout(r, 31_000 - (Date.now() % 30_000)));
  }
  throw new Error(`admin login failed for ${who.email}`);
}

/** Fresh onboarded player with no deposits, entries, limits, KYC or 2FA (ERR-01 empty states). */
async function freshPlayer() {
  const stamp = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
  const did = `did:privy:qa-states-${stamp}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `qa_${stamp}`.slice(0, 20),
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
  return { did, email: `qa-states-${stamp}@example.com` };
}

async function resolveIds() {
  const ids = {};
  const rounds = (await api('/pool/rounds?pageSize=20').catch(() => ({ items: [] }))).items ?? [];
  const current = await api('/pool/rounds/current').catch(() => null);
  ids.roundCurrent = current?.number ?? rounds[0]?.number ?? null;
  ids.roundSettled = rounds.find((r) => r.status === 'settled')?.number ?? ids.roundCurrent;
  const nova = await api('/auth/dev/token', { method: 'POST', body: { did: NOVA_DID } });
  const novaToken = nova.accessToken ?? nova.token;
  ids.novaUserId = (await api('/me', { token: novaToken })).id;
  const wds = await api('/withdrawals', { token: novaToken });
  const wdItems = Array.isArray(wds) ? wds : (wds.items ?? []);
  ids.withdrawalRef = wdItems[0]?.reference ?? null;
  ids.withdrawalId = wdItems[0]?.id ?? null;
  const sa = await adminLogin('super_admin');
  const kyc = await api('/admin/compliance/kyc', { token: sa.accessToken }).catch(() => null);
  ids.kycCaseId = kyc?.items?.[0]?.id ?? null;
  const fw = await api('/admin/finance/withdrawals', { token: sa.accessToken }).catch(() => null);
  ids.adminWithdrawalId = ids.withdrawalId ?? fw?.items?.[0]?.id ?? null;
  await fetch(`${API}/admin/auth/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${sa.accessToken}` },
  }).catch(() => undefined);
  return ids;
}

/** One concrete URL per route pattern (dynamic segments resolved with real ids). */
function urlFor(pattern, ids) {
  const map = {
    '/pool/rounds/[number]': ids.roundSettled && `/pool/rounds/${ids.roundSettled}`,
    '/pool/rounds/[number]/verify': ids.roundSettled && `/pool/rounds/${ids.roundSettled}/verify`,
    '/restricted/[variant]': '/restricted/region',
    '/legal/[doc]': '/legal/terms',
    '/wallet/withdraw/[reference]': ids.withdrawalRef && `/wallet/withdraw/${ids.withdrawalRef}`,
    '/admin/compliance/kyc/[id]': ids.kycCaseId && `/admin/compliance/kyc/${ids.kycCaseId}`,
    '/admin/finance/withdrawals/[id]':
      ids.adminWithdrawalId && `/admin/finance/withdrawals/${ids.adminWithdrawalId}`,
    '/admin/[...slug]': '/admin/games',
  };
  if (pattern in map) return map[pattern] || null;
  if (pattern.startsWith('/admin/users/[id]')) return pattern.replace('[id]', ids.novaUserId);
  return pattern.includes('[') ? null : pattern;
}

const isAdmin = (u) => u === '/admin' || u.startsWith('/admin/');
/** Public pages (rendered for guests); everything else is member-only. */
const PUBLIC = new RegExp(
  '^/($|pool($|/history|/rounds/|/prizes)|provably-fair|legal/|support|promotions|status|about|' +
    'official-channels|security|winners|vip|affiliates|sign-in|sign-up|verify$|restricted|admin/login)',
);
/** Pages that only exist for guests / signed-out flows (fresh member is not meaningful there). */
const GUEST_ONLY = /^\/(sign-in|sign-up|verify|admin\/login)$/;

/** Identity per URL × state: guest for public pages, @nova.k / fresh player for member pages, super admin. */
function identityFor(url, state) {
  if (url === '/admin/login') return 'guest';
  if (isAdmin(url)) return state === 'empty' ? null : 'admin';
  if (state === 'empty') return GUEST_ONLY.test(url) ? null : 'fresh';
  if (url === '/onboarding') return 'fresh-unonboarded';
  if (PUBLIC.test(url) && !/^\/(pool\/entries)$/.test(url)) return 'guest';
  return 'nova';
}

// ── Interception ─────────────────────────────────────────────────────────────────────────────────────────────
const BOOTSTRAP = [
  /^POST \/auth\/dev\/token$/,
  /^POST \/auth\/session$/,
  /^GET \/me$/,
  /^GET \/auth\/config$/,
  /^(GET|POST) \/admin\/auth\//,
  // PUB-21 geo gate (app/(app)/layout.tsx): fails open on an error (the API enforces), but it holds the page while
  // pending — kept answering so a page's own states are measured, not the gate's sequencing (gates.spec.ts owns it).
  /^GET \/compliance\/geo$/,
];
/** Requests made by the shell chrome on every page (balance pill, pool tile, entries count, unread count). */
const SHELL_DATA = [
  /^GET \/wallet\/balances$/,
  /^GET \/pool\/rounds\/current$/,
  /^GET \/pool\/rounds\/[^/]+\/my-entries$/,
  /^GET \/notifications$/,
  /^GET \/auth\/new-device-alerts$/,
  // region banner + per-page region notes (RegionCheck / onboarding show a readable fallback when it fails)
  /^GET \/compliance\/region$/,
  /^(GET|POST) \/responsible-gaming\/(session|play-heartbeat|reality-check)/,
];
/** Admin console chrome (nav badges, environment label) — page data only on the pages that show it. */
const ADMIN_SHELL_DATA = /^GET \/admin\/(dashboard|system\/health|alerts|approvals\/inbox)$/;
const ADMIN_SHELL_OWNERS = /^\/admin(\/alerts|\/approvals)?$/;
const envelope = (code, message, statusCode, details) =>
  JSON.stringify({
    error: { code, message, statusCode, requestId: `qa-states-${statusCode}`, details },
  });

async function installRoutes(page, state, counters, pageUrl = '') {
  await page.route(
    (u) => u.href.startsWith(API),
    async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const key = `${req.method()} ${u.pathname}`;
      if (u.pathname === '/auth/new-device-alerts' && req.method() === 'GET')
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      if (req.method() === 'OPTIONS') return route.continue();
      const bootstrap = BOOTSTRAP.some((re) => re.test(key));
      const socket = u.pathname.startsWith('/socket.io');
      if (!bootstrap && !socket) {
        counters.data += 1;
        const shell =
          SHELL_DATA.some((re) => re.test(key)) ||
          (ADMIN_SHELL_DATA.test(key) && !ADMIN_SHELL_OWNERS.test(pageUrl));
        if (!shell) counters.page += 1;
      }
      if (state === 'down') return route.abort('connectionrefused');
      if (state === 'slow') {
        await new Promise((r) => setTimeout(r, SLOW_MS));
        return route.continue().catch(() => undefined);
      }
      if (bootstrap || !['500', '502', '429', '503', 'timeout'].includes(state))
        return route.continue().catch(() => undefined);
      if (socket) return route.abort('connectionrefused');
      if (state === 'timeout') return; // never answered
      const cors = {
        'access-control-allow-origin': BASE,
        'access-control-allow-credentials': 'true',
      };
      if (state === '500')
        return route.fulfill({
          status: 500,
          headers: cors,
          contentType: 'application/json',
          body: envelope('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500),
        });
      if (state === '502')
        return route.fulfill({
          status: 502,
          headers: cors,
          contentType: 'text/html',
          body: '<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center></body></html>',
        });
      if (state === '429')
        return route.fulfill({
          status: 429,
          headers: { ...cors, 'retry-after': '20', 'access-control-expose-headers': 'retry-after' },
          contentType: 'application/json',
          body: envelope('RATE_LIMITED', 'Too many requests — please slow down', 429),
        });
      return route.fulfill({
        status: 503,
        headers: cors,
        contentType: 'application/json',
        body: envelope('SERVICE_UNAVAILABLE', 'This service is temporarily paused', 503, {
          flag: 'maintenance',
        }),
      });
    },
  );
}

// ── Detection ────────────────────────────────────────────────────────────────────────────────────────────────
const RAW = [
  ['fetch', /Failed to fetch|NetworkError when attempting|Load failed|net::ERR_[A-Z_]+/],
  ['js-error', /\b(TypeError|SyntaxError|ReferenceError|AbortError|TimeoutError)\b/],
  [
    'http-status',
    /\b\d{3} (Bad Request|Unauthorized|Forbidden|Not Found|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout|Too Many Requests)\b/,
  ],
  ['code', /\b(HTTP_ERROR|INTERNAL_ERROR|RATE_LIMITED|SERVICE_UNAVAILABLE|ThrottlerException)\b/],
  ['object', /\[object Object\]|\bundefined\b|\bNaN\b/],
  ['aborted', /signal is aborted|operation was aborted|user aborted|signal timed out/i],
  ['json', /Unexpected token|JSON\.parse|is not valid JSON/],
  ['html', /<html|<!DOCTYPE|<center>/i],
];
const ERRORISH =
  /couldn[’']t|could not|can[’']t (load|reach|connect)|unable to|unreachable|reconnecting|went wrong|unavailable|offline|no connection|connection (lost|problem)|try again|temporarily|paused|maintenance|too many|slow down|taking longer|timed out|not responding|server error|retry/i;
const RETRY = /^(try again|retry|reload|refresh|reload page|retry now)\b/i;

async function inspect(page) {
  return page.evaluate(
    ([erroSrc, retrySrc]) => {
      const visible = (el) => {
        const b = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const main = document.querySelector('main') ?? document.body;
      const text = (main.innerText ?? '').trim();
      const bodyText = (document.body.innerText ?? '').trim();
      const skeletons = [...document.querySelectorAll('[data-slot="skeleton"]')].filter(visible);
      const busy = [...document.querySelectorAll('[aria-busy="true"]')].filter(visible).length;
      const alerts = [...document.querySelectorAll('[role="alert"]')]
        .filter(visible)
        .map((a) => a.innerText.trim().replace(/\s+/g, ' ').slice(0, 240))
        .filter(Boolean);
      const errRe = new RegExp(erroSrc, 'i');
      const retryRe = new RegExp(retrySrc, 'i');
      const actions = [...document.querySelectorAll('button, a[href]')]
        .filter(visible)
        .map((b) =>
          (b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' '),
        );
      const tables = [...main.querySelectorAll('table')].filter(visible).map((t) => ({
        head: t.querySelectorAll('thead th').length,
        rows: t.querySelectorAll('tbody tr').length,
      }));
      return {
        title: document.title,
        h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()).filter(Boolean),
        mainLength: text.length,
        text: bodyText.slice(0, 30_000),
        skeletons: skeletons.length,
        busy,
        alerts,
        errorish: errRe.test(text) || alerts.some((a) => errRe.test(a)),
        hasRetry: actions.some((a) => retryRe.test(a)),
        tables,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    },
    [ERRORISH.source, RETRY.source],
  );
}

async function settle(page, maxMs) {
  const t0 = Date.now();
  let clean = 0;
  let info = await inspect(page);
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(500);
    info = await inspect(page).catch(() => info);
    clean = info.skeletons === 0 && info.busy === 0 ? clean + 1 : 0;
    if (clean >= 3 && Date.now() - t0 >= 1500) break;
  }
  return { info, waited: Date.now() - t0 };
}

const slug = (url) => url.replace(/^\//, '').replace(/[^a-zA-Z0-9-]+/g, '_') || 'home';

async function shot(page, state, url, width, suffix = '') {
  if (!SHOTS) return null;
  const dir = path.join(OUT, state);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug(url)}_${width}${suffix}.png`);
  await page.screenshot({ path: file, fullPage: true, timeout: 60_000 }).catch(() => undefined);
  return path.relative(WEB_ROOT, file);
}

async function visit(page, state, url, width) {
  const counters = { data: 0, page: 0 };
  const pageErrors = [];
  const onErr = (e) => pageErrors.push(String(e?.message ?? e).slice(0, 300));
  page.on('pageerror', onErr);
  await page.unroute('**/*').catch(() => undefined);
  await installRoutes(page, state, counters, url);
  const rec = { state, url, width, problems: [] };
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    if (state === 'slow') {
      await page.waitForTimeout(Math.min(1500, SLOW_MS / 2));
      const early = await inspect(page);
      rec.early = { skeletons: early.skeletons, busy: early.busy, mainLength: early.mainLength };
      rec.earlyShot = await shot(page, state, url, width, '_early');
      if (early.skeletons === 0 && early.busy === 0 && early.mainLength < 40)
        rec.problems.push('blank-while-loading');
    }
    const wait =
      state === 'timeout'
        ? TIMEOUT_WAIT_MS
        : state === 'slow'
          ? SKELETON_MS + 4 * SLOW_MS
          : SKELETON_MS;
    const { info, waited } = await settle(page, wait);
    rec.waited = waited;
    rec.finalUrl = page.url().replace(BASE, '');
    rec.h1 = info.h1;
    rec.alerts = info.alerts;
    rec.dataRequests = counters.data;
    rec.pageRequests = counters.page;
    const failing = ['down', '500', '502', '429', '503', 'timeout'].includes(state);
    if (pageErrors.length || /Application error: a (client|server)-side exception/i.test(info.text))
      rec.problems.push('crash');
    if (info.mainLength < 40 && info.skeletons === 0 && info.alerts.length === 0)
      rec.problems.push('blank');
    for (const [k, re] of RAW) {
      const m = info.text.match(re);
      if (m) rec.problems.push(`raw:${k}:${m[0].slice(0, 60)}`);
    }
    if (info.skeletons > 0) rec.problems.push(`skeleton:${info.skeletons}`);
    if (failing && info.errorish && !info.hasRetry) rec.problems.push('no-retry');
    // the shell's own figures show "—" (+ the connection banner when unreachable); "silent" = the PAGE's data failed
    if (failing && counters.page > 0 && !info.errorish) rec.problems.push('silent');
    if (info.overflow > 0) rec.problems.push(`overflow:${info.overflow}`);
    if (state === 'empty' && info.tables.some((t) => t.head > 0 && t.rows === 0))
      rec.problems.push('empty-table');
    rec.shot = await shot(page, state, url, width);
  } catch (e) {
    if (String(e).includes(`ERR_CONNECTION_REFUSED at ${BASE}`)) webDown = true;
    rec.problems.push(`visit-error:${String(e).slice(0, 160)}`);
  }
  rec.pageErrors = pageErrors;
  page.off('pageerror', onErr);
  return rec;
}

// ── Validation scenarios (client-side errors + a server 400 envelope) ───────────────────────────────────────
const VALIDATION = [
  {
    url: '/onboarding',
    identity: 'fresh-unonboarded',
    name: 'onboarding: submit with nothing filled',
    run: async (page) => {
      await page
        .getByRole('button', { name: /continue|create account|finish|start/i })
        .first()
        .click();
    },
    expect: /required|choose|enter|accept|confirm|must/i,
  },
  {
    url: '/responsible-gaming/deposit-limits',
    identity: 'fresh',
    name: 'deposit limit: server answers 400 VALIDATION_FAILED',
    // limits are saved with PUT /responsible-gaming/limits (rgApi.setLimit)
    intercept: { method: 'PUT', path: /\/responsible-gaming\/limits$/ },
    run: async (page) => {
      const input = page.locator('input[inputmode="decimal"], input[type="text"]').first();
      await input.fill('250');
      await page
        .getByRole('button', { name: /set limit|save|confirm|apply/i })
        .first()
        .click();
      const confirm = page.getByRole('button', { name: /confirm|set limit/i });
      if (await confirm.count())
        await confirm
          .last()
          .click()
          .catch(() => undefined);
    },
    expect: /Amount must be at most 1,000,000\.00/,
  },
  {
    url: '/wallet/withdraw?step=address',
    identity: 'nova',
    name: 'withdraw: malformed address',
    run: async (page) => {
      // a player with saved addresses picks "Use a new address" first (WAL-12)
      const fresh = page.getByText('Use a new address').first();
      if (await fresh.count()) await fresh.click();
      const input = page.locator('main input[type="text"], main input:not([type])').first();
      await input.fill('0x123-not-an-address');
      await input.blur();
    },
    expect: /valid|address|format|check/i,
  },
];

async function runValidation(page, scenario, width) {
  const rec = { state: 'validation', url: scenario.url, width, name: scenario.name, problems: [] };
  const pageErrors = [];
  const onErr = (e) => pageErrors.push(String(e?.message ?? e).slice(0, 300));
  page.on('pageerror', onErr);
  await page.unroute('**/*').catch(() => undefined);
  await installRoutes(page, 'ok', { data: 0, page: 0 });
  if (scenario.intercept)
    await page.route(
      (u) => u.href.startsWith(API) && scenario.intercept.path.test(u.pathname),
      (route) =>
        route.request().method() === scenario.intercept.method
          ? route.fulfill({
              status: 400,
              // credentialed requests: without allow-credentials the browser hides the response (a network error)
              headers: {
                'access-control-allow-origin': BASE,
                'access-control-allow-credentials': 'true',
              },
              contentType: 'application/json',
              body: JSON.stringify({
                error: {
                  code: 'VALIDATION_FAILED',
                  message: 'Request validation failed',
                  statusCode: 400,
                  requestId: 'qa-states-400',
                  issues: [{ path: ['amount'], message: 'Amount must be at most 1,000,000.00' }],
                },
              }),
            })
          : route.continue(),
    );
  try {
    await page.goto(`${BASE}${scenario.url}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await settle(page, SKELETON_MS);
    await scenario.run(page);
    await page.waitForTimeout(1500);
    const info = await inspect(page);
    rec.alerts = info.alerts;
    // field errors: the message an invalid control points at (Field wires aria-describedby → `${id}-message`)
    const messages = await page
      .evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('[aria-invalid="true"]')) {
          for (const id of (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean))
            out.push(document.getElementById(id)?.innerText ?? '');
        }
        for (const el of document.querySelectorAll('[role="alert"], [data-slot="field-error"]'))
          out.push(el.innerText);
        return out;
      })
      .catch(() => []);
    rec.messages = messages
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (!scenario.expect.test(`${rec.messages.join(' ')} ${info.alerts.join(' ')}`))
      rec.problems.push('no-validation-message');
    for (const [k, re] of RAW) {
      const m = info.text.match(re);
      if (m) rec.problems.push(`raw:${k}:${m[0].slice(0, 60)}`);
    }
    if (pageErrors.length) rec.problems.push('crash');
    rec.shot = await shot(page, 'validation', scenario.url, width);
  } catch (e) {
    rec.problems.push(`scenario-error:${String(e).slice(0, 160)}`);
  }
  rec.pageErrors = pageErrors;
  page.off('pageerror', onErr);
  return rec;
}

// ── Contexts per identity ────────────────────────────────────────────────────────────────────────────────────
async function newContext(browser, identity, sessions) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  // PUB-22 age gate (tested by e2e/gates.spec.ts): confirmed up front so its modal doesn't cover every state shot.
  await ctx.addInitScript((key) => {
    try {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ confirmedAt: new Date().toISOString(), country: 'PT' }),
        );
    } catch {
      /* ignore */
    }
  }, 'gp.ageGate');
  if (identity === 'nova' || identity === 'fresh' || identity === 'fresh-unonboarded') {
    let who;
    if (identity === 'nova') who = { did: NOVA_DID, email: 'nova.k@example.com' };
    else if (identity === 'fresh') who = sessions.fresh ?? (sessions.fresh = await freshPlayer());
    else {
      const stamp = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
      who = {
        did: `did:privy:qa-states-new-${stamp}`,
        email: `qa-states-new-${stamp}@example.com`,
      };
    }
    await ctx.addInitScript(
      ([d, e]) => {
        try {
          if (!localStorage.getItem('gp.devMockSession'))
            localStorage.setItem(
              'gp.devMockSession',
              JSON.stringify({ did: d, email: e, wallet: null }),
            );
        } catch {
          /* ignore */
        }
      },
      [who.did, who.email],
    );
  } else if (identity === 'admin') {
    const s = await adminLogin('super_admin');
    // The latest refresh token (rotated on every refresh) is tracked and re-seeded before each admin visit, so a
    // state that knocks the console's session out (e.g. "down" on an unfixed build) cannot spoil later visits.
    ctx.adminSession = {
      refreshToken: s.refreshToken,
      sessionExpiresAt: s.sessionExpiresAt,
      email: s.admin.email,
      name: s.admin.name,
    };
    ctx.on('response', async (r) => {
      if (r.url() !== `${API}/admin/auth/refresh` || r.status() !== 200) return;
      const j = await r.json().catch(() => null);
      if (j?.refreshToken)
        Object.assign(ctx.adminSession, {
          refreshToken: j.refreshToken,
          sessionExpiresAt: j.sessionExpiresAt,
        });
    });
    await ctx.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, value);
      },
      ['gp.admin.session', JSON.stringify(ctx.adminSession)],
    );
  }
  return ctx;
}

/** Before an admin visit: put the latest refresh token back if the console dropped it. */
async function reseedAdmin(slot) {
  if (!slot.ctx.adminSession || !slot.page.url().startsWith(BASE)) return;
  await slot.page
    .evaluate(
      ([key, value]) => sessionStorage.setItem(key, value),
      ['gp.admin.session', JSON.stringify(slot.ctx.adminSession)],
    )
    .catch(() => undefined);
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ids = await resolveIds();
const urls = [
  ...ROUTES.map((r) => ({ pattern: r.pattern, url: urlFor(r.pattern, ids) })),
  ...EXTRA_URLS.map((u) => ({ pattern: u, url: u })),
].filter((r) => r.url && (!ONLY || ONLY.test(r.url)));
console.info(
  `qa-states: ${urls.length} routes · states ${STATES.join(',')} · widths ${WIDTHS.join(',')}`,
);

const jobs = [];
for (const state of STATES) {
  if (state === 'validation') {
    for (const sc of VALIDATION)
      if (!ONLY || ONLY.test(sc.url))
        for (const w of WIDTHS) jobs.push({ state, scenario: sc, width: w });
    continue;
  }
  for (const { pattern, url } of urls) {
    if (state === 'timeout' && !TIMEOUT_ROUTES.test(url)) continue;
    const identity = identityFor(url, state);
    if (!identity) continue;
    for (const w of WIDTHS) jobs.push({ state, pattern, url, width: w, identity });
  }
}
console.info(`${jobs.length} visits`);

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const sessions = {};
const results = [];
// One worker = one context per identity; admin contexts re-login once per worker.
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async (_, worker) => {
    const ctxs = new Map();
    const pageFor = async (identity) => {
      // fresh-unonboarded always gets a brand-new context (it must stay un-onboarded)
      const key = identity === 'fresh-unonboarded' ? `${identity}-${Date.now()}` : identity;
      if (!ctxs.has(key)) {
        const ctx = await newContext(browser, identity, sessions);
        ctxs.set(key, { ctx, page: await ctx.newPage() });
      }
      return ctxs.get(key);
    };
    while (jobs.length && !webDown) {
      const job = jobs.shift();
      const identity = job.scenario?.identity ?? job.identity;
      let slot;
      try {
        slot = await pageFor(identity);
      } catch (e) {
        results.push({ ...job, scenario: job.scenario?.name, problems: [`identity-error:${e}`] });
        continue;
      }
      let rec;
      try {
        await slot.page.setViewportSize({ width: job.width, height: job.width < 768 ? 844 : 900 });
        if (identity === 'admin') await reseedAdmin(slot);
        rec = job.scenario
          ? await runValidation(slot.page, job.scenario, job.width)
          : await visit(slot.page, job.state, job.url, job.width);
        if (
          rec.problems.some((p) =>
            /Target crashed|Target page, context or browser has been closed/.test(p),
          )
        )
          throw new Error(rec.problems.join(' · '));
      } catch (e) {
        // A crashed tab (memory pressure) is not a finding: drop this context and retry the visit once.
        const [k] = [...ctxs.entries()].find(([, v]) => v === slot) ?? [];
        if (k !== undefined) {
          await slot.ctx.close().catch(() => undefined);
          ctxs.delete(k);
        }
        if (!job.retried) {
          job.retried = true;
          jobs.unshift(job);
          console.info(
            `[w${worker} ${job.state} ${job.width}] ${job.url ?? job.scenario?.url} ↻ retry (${String(e).slice(0, 80)})`,
          );
          continue;
        }
        rec = {
          state: job.state,
          url: job.url ?? job.scenario?.url,
          width: job.width,
          name: job.scenario?.name,
          problems: [`visit-error:${String(e).slice(0, 160)}`],
        };
      }
      rec.pattern = job.pattern ?? job.scenario?.url;
      rec.identity = identity;
      results.push(rec);
      console.info(
        `[w${worker} ${job.state} ${job.width}] ${rec.url} (${identity}) ${rec.problems.length ? `✗ ${rec.problems.join(' · ')}` : '✓'}`,
      );
      if (identity === 'fresh-unonboarded') {
        const found = [...ctxs.entries()].find(([, v]) => v === slot);
        if (found) {
          await found[1].ctx.close().catch(() => undefined);
          ctxs.delete(found[0]);
        }
      }
    }
    for (const { ctx } of ctxs.values()) await ctx.close().catch(() => undefined);
  }),
);
await browser.close();
if (webDown) {
  console.error(`\nThe web server at ${BASE} stopped answering — run aborted, no report written.`);
  process.exit(2);
}

// ── Report + matrix ──────────────────────────────────────────────────────────────────────────────────────────
writeFileSync(
  path.join(OUT, 'report.json'),
  JSON.stringify({ base: BASE, api: API, ids, results }, null, 2),
);
const cellKey = (r) => `${r.pattern}|${r.state}`;
const cells = new Map();
for (const r of results) {
  const k = cellKey(r);
  const c = cells.get(k) ?? { problems: new Set() };
  for (const p of r.problems) c.problems.add(p.split(':').slice(0, 2).join(':'));
  cells.set(k, c);
}
const before = new Map();
if (BASELINE)
  for (const r of BASELINE.results) {
    const k = cellKey(r);
    before.set(k, (before.get(k) ?? 0) + r.problems.length);
  }
const statesShown = STATES.filter((s) => s !== 'validation');
const patterns = [
  ...new Set(results.filter((r) => r.state !== 'validation').map((r) => r.pattern)),
].sort();
const lines = [
  `| Route | ${statesShown.join(' | ')} |`,
  `| --- | ${statesShown.map(() => '---').join(' | ')} |`,
];
for (const p of patterns) {
  const row = statesShown.map((s) => {
    const c = cells.get(`${p}|${s}`);
    if (!c) return 'n/a';
    if (c.problems.size === 0) return before.get(`${p}|${s}`) ? 'fixed' : 'OK';
    return `gap: ${[...c.problems].join(', ')}`;
  });
  lines.push(`| \`${p}\` | ${row.join(' | ')} |`);
}
const val = results.filter((r) => r.state === 'validation');
if (val.length) {
  lines.push(
    '',
    '| Validation scenario | Width | Result | Messages |',
    '| --- | --- | --- | --- |',
  );
  for (const r of val)
    lines.push(
      `| ${r.name} | ${r.width} | ${r.problems.length ? `gap: ${r.problems.join(', ')}` : 'OK'} | ${(r.messages ?? []).join(' / ').replace(/\|/g, '/').slice(0, 160)} |`,
    );
}
writeFileSync(path.join(OUT, 'matrix.md'), `${lines.join('\n')}\n`);
const problems = results.filter((r) => r.problems.length);
writeFileSync(
  path.join(OUT, 'summary.txt'),
  problems
    .map((r) => `${r.state} ${r.width} ${r.url} (${r.identity}): ${r.problems.join(' · ')}`)
    .join('\n') + '\n',
);
const counts = {};
for (const r of problems)
  for (const p of r.problems) counts[p.split(':')[0]] = (counts[p.split(':')[0]] ?? 0) + 1;
console.info(
  `\n${results.length} visits · ${problems.length} with problems · ${JSON.stringify(counts)}`,
);
console.info(`matrix: ${path.join(OUT, 'matrix.md')}`);
if (existsSync(path.join(OUT, 'report.json'))) process.exitCode = problems.length ? 1 : 0;
