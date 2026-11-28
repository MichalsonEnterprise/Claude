/* global document, window, getComputedStyle -- used inside page.evaluate() / addInitScript callbacks (browser) */
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GLOBAL POOL — integration route crawler (QA "crawler"). DEMO / testnet only.
//
// Enumerates EVERY route from src/app/**/page.tsx, resolves dynamic segments with real ids from the running API
// (round numbers, a withdrawal reference/id, a user id, a KYC case id, restricted variants), and visits each route
// with Playwright at 1440×900 and 390×844 for each identity:
//   guest · nova (@nova.k, did:privy:demo-nova-k) · new-player (fresh DID, NOT onboarded)
//   super-admin · finance · compliance · support   (credentials + TOTP from apps/api/.dev/demo-admins.json)
// Per visit it records: HTTP status (+ redirect chain, final URL), page errors, console errors, failed network
// requests (4xx/5xx; 401/403 marked expected only where the identity lacks access), horizontal overflow
// (documentElement.scrollWidth > innerWidth), visible error states ("Application error", "Something went wrong",
// "We couldn’t load…", not-found, admin "module not built"), skeletons still visible after 10 s, and every <a href>
// that points to a route that does not exist. On 3 representative pages per identity it also opens the sidebar /
// topbar / footer / mobile tab bar / mobile drawer / user menu and checks their links.
//
// Run (API + web must be running; web built with NEXT_PUBLIC_DATA_SOURCE=api pointing at API_URL):
//   bash scripts/dev-services.sh start
//   (cd apps/api && pnpm exec tsc -p tsconfig.build.json --outDir .dev/dist-qa-crawler && \
//     API_PORT=4301 JOBS_ENABLED=false THROTTLE_LIMIT=3000 DEV_TOKEN_THROTTLE_LIMIT=2000 \
//     CORS_ORIGINS=http://localhost:3301 node .dev/dist-qa-crawler/src/main.js &)
//   flock /tmp/gp-web-build.lock env NEXT_DIST_DIR=.next-qa-crawler NEXT_PUBLIC_DATA_SOURCE=api \
//     NEXT_PUBLIC_API_URL=http://localhost:4301 NEXT_PUBLIC_WS_URL=ws://localhost:4301 pnpm --filter @gp/web build
//   NEXT_DIST_DIR=.next-qa-crawler pnpm --filter @gp/web exec next start -p 3301 &
//   node apps/web/scripts/qa-crawler.mjs
// Env:
//   BASE_URL (http://localhost:3301) · API_URL (http://localhost:4301)
//   ROLES  comma list (default: guest,nova,new-player,super-admin,finance,compliance,support)
//   WIDTHS comma list (default 1440,390) · ONLY regex on the route path · CONCURRENCY identities in parallel (3)
//   SKELETON_MS (10000) · SETTLE_MS (1200) · SHOTS=false to skip screenshots · SHELL=false to skip shell checks
//   DRY=1 only resolves ids and prints the URL list
// Output: apps/web/test-results/visual/qa-crawl/<role>/<route-slug>_<w>.png, report.json (every visit),
//         summary.txt (issues + coverage table). Exit code 1 when any unexpected problem was found.
// Notes: `next build` with NEXT_DIST_DIR appends "<dist>/types/**/*.ts" to apps/web/tsconfig.json — revert that
//        line after building. Each run creates one throwaway, never-onboarded DEV MOCK player
//        (did:privy:qa-crawler-…) in the target DB; the crawler only reads (no onboarding, entries or limits).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { createHmac, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { presetAgeGate } from './lib/age-gate.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const WEB_ROOT = path.join(import.meta.dirname, '..');
const APP_DIR = path.join(WEB_ROOT, 'src', 'app');
const BASE = (process.env.BASE_URL ?? 'http://localhost:3301').replace(/\/$/, '');
const API = (process.env.API_URL ?? 'http://localhost:4301').replace(/\/$/, '');
const OUT = path.join(WEB_ROOT, 'test-results', 'visual', 'qa-crawl');
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ROLES = (
  process.env.ROLES ?? 'guest,nova,new-player,super-admin,finance,compliance,support'
).split(',');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 3);
const SKELETON_MS = Number(process.env.SKELETON_MS ?? 10_000);
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 1200);
const SHOTS = process.env.SHOTS !== 'false';
const SHELL = process.env.SHELL !== 'false';
const NOVA_DID = 'did:privy:demo-nova-k';
const ADMIN_ROLE_KEYS = {
  'super-admin': 'super_admin',
  finance: 'finance',
  compliance: 'compliance',
  support: 'support',
};
mkdirSync(OUT, { recursive: true });

// ── TOTP (RFC 6238, SHA-1, 30 s) — same helper as scripts/admin-a-qa.mjs ───────────────────────────────────
function totp(secretBase32, offset = 0) {
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

// ── Route discovery ──────────────────────────────────────────────────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}

/** Route patterns from the file system: `(group)` dropped, `[x]` dynamic, `[...x]` catch-all. */
const ROUTES = walk(APP_DIR)
  .map((file) => {
    const segs = path
      .relative(APP_DIR, path.dirname(file))
      .split(path.sep)
      .filter((s) => s && !/^\(.*\)$/.test(s));
    const pattern = `/${segs.join('/')}`;
    const re = new RegExp(
      `^/${segs
        .map((s) =>
          s.startsWith('[...')
            ? '.+'
            : s.startsWith('[')
              ? '[^/]+'
              : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        )
        .join('/')}/?$`.replace('^//?$', '^/$'),
    );
    return {
      pattern: pattern === '/' ? '/' : pattern,
      file: path.relative(WEB_ROOT, file),
      re,
      dynamic: segs.some((s) => s.startsWith('[')),
      catchAll: segs.some((s) => s.startsWith('[...')),
    };
  })
  .sort((a, b) => a.pattern.localeCompare(b.pattern));

/** The most specific route a path resolves to (static beats dynamic beats catch-all), or null. */
function matchRoute(p) {
  const hits = ROUTES.filter((r) => r.re.test(p));
  if (!hits.length) return null;
  return hits.sort(
    (a, b) => Number(a.catchAll) - Number(b.catchAll) || Number(a.dynamic) - Number(b.dynamic),
  )[0];
}

// ── API helpers (ids for dynamic segments) ───────────────────────────────────────────────────────────────────
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
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = totp(who.totpSecret);
    const key = `${who.email}:${code}`;
    if (!usedCodes.has(key)) {
      usedCodes.add(key);
      const res = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: who.email, password: who.password, totpCode: code }),
      });
      if (res.ok) return { ...(await res.json()), who };
    }
    // replay-protected codes: wait for the next 30 s step and retry
    await new Promise((r) => setTimeout(r, 31_000 - (Date.now() % 30_000)));
  }
  throw new Error(`admin login failed for ${who.email}`);
}

async function resolveIds() {
  const ids = {};
  const current = await api('/pool/rounds/current').catch(() => null);
  const rounds = (await api('/pool/rounds?pageSize=20').catch(() => ({ items: [] }))).items ?? [];
  ids.roundCurrent = current?.number ?? null;
  ids.roundSettled = rounds.find((r) => r.status === 'settled')?.number ?? null;
  ids.roundCancelled = rounds.find((r) => r.status === 'cancelled')?.number ?? null;
  const nova = await api('/auth/dev/token', { method: 'POST', body: { did: NOVA_DID } });
  const novaToken = nova.accessToken ?? nova.token;
  const me = await api('/me', { token: novaToken });
  ids.novaUserId = me.id;
  const wds = await api('/withdrawals', { token: novaToken });
  const wdItems = Array.isArray(wds) ? wds : (wds.items ?? []);
  ids.withdrawalRef = wdItems[0]?.reference ?? null;
  ids.withdrawalId = wdItems[0]?.id ?? null;
  const sa = await adminLogin('super_admin');
  const kyc = await api('/admin/compliance/kyc', { token: sa.accessToken });
  ids.kycCaseId = kyc.items?.[0]?.id ?? null;
  const fw = await api('/admin/finance/withdrawals', { token: sa.accessToken }).catch(() => null);
  ids.adminWithdrawalId = ids.withdrawalId ?? fw?.items?.[0]?.id ?? fw?.slaWatch?.[0]?.id ?? null;
  await fetch(`${API}/admin/auth/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${sa.accessToken}` },
  }).catch(() => undefined);
  const variants = readFileSync(
    path.join(WEB_ROOT, 'src', 'components', 'auth', 'restricted-variants.ts'),
    'utf8',
  )
    .match(/RESTRICTED_VARIANTS = \[([^\]]+)\]/)[1]
    .match(/'([^']+)'/g)
    .map((s) => s.replaceAll("'", ''));
  ids.restrictedVariants = variants;
  return ids;
}

/** Concrete URLs for every route pattern. */
function instancesFor(route, ids) {
  const p = route.pattern;
  if (!route.dynamic) return [p];
  if (p === '/pool/rounds/[number]')
    return [ids.roundCurrent, ids.roundSettled, ids.roundCancelled]
      .filter(Boolean)
      .map((n) => `/pool/rounds/${n}`);
  if (p === '/pool/rounds/[number]/verify')
    return [ids.roundSettled, ids.roundCurrent]
      .filter(Boolean)
      .map((n) => `/pool/rounds/${n}/verify`);
  if (p === '/restricted/[variant]') return ids.restrictedVariants.map((v) => `/restricted/${v}`);
  if (p === '/wallet/withdraw/[reference]')
    return ids.withdrawalRef ? [`/wallet/withdraw/${ids.withdrawalRef}`] : [];
  if (p.startsWith('/admin/users/[id]')) return [p.replace('[id]', ids.novaUserId)];
  if (p === '/admin/compliance/kyc/[id]')
    return ids.kycCaseId ? [p.replace('[id]', ids.kycCaseId)] : [];
  if (p === '/admin/finance/withdrawals/[id]')
    return ids.adminWithdrawalId ? [p.replace('[id]', ids.adminWithdrawalId)] : [];
  if (p === '/admin/[...slug]') return ['/admin/games']; // a nav group without a page → "module not built"
  return [];
}

// ── Identities ───────────────────────────────────────────────────────────────────────────────────────────────
const isAdminPath = (u) => u === '/admin' || u.startsWith('/admin/');
const isPlayerPath = (u) => !isAdminPath(u) && !u.startsWith('/design-system');

function routesFor(role, all) {
  if (role === 'guest')
    // every player page, the design system, admin login + two admin guard samples
    return all.filter(
      (u) =>
        !isAdminPath(u) || ['/admin/login', '/admin', '/admin/finance/withdrawals'].includes(u),
    );
  if (role === 'nova' || role === 'new-player') return all.filter(isPlayerPath);
  return all.filter(isAdminPath); // admin roles (incl. /admin/login while signed in)
}

const REPRESENTATIVE = {
  player: ['/', '/wallet', '/pool'],
  admin: ['/admin', '/admin/users', '/admin/finance/withdrawals'],
};

// ── Per-visit checks ─────────────────────────────────────────────────────────────────────────────────────────
const ERROR_PATTERNS = [
  ['client-exception', /Application error: a (client|server)-side exception/i],
  ['something-went-wrong', /Something went wrong/i],
  ['couldnt-load', /(We|we) couldn[’']t load[^\n]*/],
  ['could-not-be-loaded', /could not be loaded[^\n]*/i],
  ['not-found', /Page not found/],
  ['module-not-built', /isn[’']t (part of|in) this build|not in this build|Module not available/i],
];

/** HTTP status cache for link targets (SSR status of the path without auth). */
const linkStatus = new Map();
async function pathStatus(request, p) {
  if (linkStatus.has(p)) return linkStatus.get(p);
  const pr = request
    .get(`${BASE}${p}`, { maxRedirects: 5, timeout: 60_000 })
    .then((r) => r.status())
    .catch((e) => `ERR ${String(e).slice(0, 80)}`);
  linkStatus.set(p, pr);
  return pr;
}

async function checkLinks(request, hrefs) {
  const out = [];
  for (const raw of hrefs) {
    let u;
    try {
      u = new URL(raw, BASE);
    } catch {
      out.push({ href: raw, problem: 'unparseable href' });
      continue;
    }
    if (u.origin !== new URL(BASE).origin) continue; // external / mailto / tel
    const p = u.pathname.replace(/\/$/, '') || '/';
    const route = matchRoute(p);
    if (!route) {
      out.push({ href: raw, path: p, problem: 'no route (no page.tsx matches)' });
      continue;
    }
    if (route.pattern === '/admin/[...slug]') {
      out.push({ href: raw, path: p, problem: 'admin catch-all ("module not built")' });
      continue;
    }
    if (route.dynamic) {
      const st = await pathStatus(request, p);
      if (st !== 200) out.push({ href: raw, path: p, problem: `dynamic route returns ${st}` });
    }
  }
  return out;
}

function classifyNet(role, entry) {
  // 401/403 are expected only where the identity lacks access
  if (entry.status !== 401 && entry.status !== 403) return false;
  if (!entry.url.startsWith(API)) return false;
  const apiPath = new URL(entry.url).pathname;
  const code = entry.body?.error?.code;
  if (role === 'guest') return true; // a guest has no player/admin session
  if (role === 'new-player' && code === 'ONBOARDING_REQUIRED') return true;
  if (
    ADMIN_ROLE_KEYS[role] &&
    apiPath.startsWith('/admin/') &&
    entry.body?.error?.details?.missingPermissions
  )
    return true;
  return false;
}

async function visit(page, ctx, role, url, width) {
  const net = [];
  const consoleErrors = [];
  const pageErrors = [];
  const onResponse = async (r) => {
    const status = r.status();
    if (status < 400) return;
    const req = r.request();
    const e = {
      status,
      method: req.method(),
      url: r.url(),
      type: req.resourceType(),
      rsc: r.url().includes('_rsc=') || (await req.headerValue('rsc').catch(() => null)) === '1',
    };
    if (r.url().startsWith(API)) {
      try {
        e.body = JSON.parse(await r.text());
      } catch {
        /* no body */
      }
    }
    net.push(e);
  };
  const onFailed = (req) => {
    const f = req.failure()?.errorText ?? 'failed';
    if (/ERR_ABORTED/.test(f)) return; // navigations / prefetches cancelled by the next goto
    net.push({
      status: 0,
      method: req.method(),
      url: req.url(),
      type: req.resourceType(),
      failure: f,
    });
  };
  const onConsole = (m) => {
    if (m.type() !== 'error') return;
    consoleErrors.push({ text: m.text().slice(0, 400), at: m.location()?.url ?? '' });
  };
  const onPageError = (e) => pageErrors.push(String(e?.stack ?? e).slice(0, 600));
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  const rec = { role, width, url, started: new Date().toISOString() };
  try {
    const resp = await page.goto(`${BASE}${url}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    rec.status = resp?.status() ?? null;
    const chain = [];
    let r = resp?.request()?.redirectedFrom();
    while (r) {
      chain.unshift(r.url().replace(BASE, ''));
      r = r.redirectedFrom();
    }
    rec.redirects = chain;
    await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => undefined);
    // settle: until no visible skeletons (or SKELETON_MS since load), at least SETTLE_MS
    const t0 = Date.now();
    let clean = 0;
    let skel = 0;
    while (Date.now() - t0 < SKELETON_MS) {
      await page.waitForTimeout(400);
      skel = await page
        .evaluate(
          () =>
            [...document.querySelectorAll('[data-slot="skeleton"]')].filter((el) => {
              const b = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              return (
                b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
              );
            }).length,
        )
        .catch(() => -1);
      clean = skel === 0 ? clean + 1 : 0;
      if (clean >= 3 && Date.now() - t0 >= SETTLE_MS) break;
    }
    rec.skeletonsAfterWait = skel;
    rec.skeletonStuck = skel > 0;
    rec.waitedMs = Date.now() - t0;
    rec.finalUrl = page.url().replace(BASE, '');
    const info = await page.evaluate(() => {
      const text = document.body?.innerText ?? '';
      const h1 = [...document.querySelectorAll('h1')]
        .map((h) => h.innerText.trim())
        .filter(Boolean);
      const alerts = [...document.querySelectorAll('[role="alert"]')]
        .map((a) => a.innerText.trim().replace(/\s+/g, ' ').slice(0, 200))
        .filter(Boolean);
      const links = [...document.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        label: (a.getAttribute('aria-label') || a.innerText || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 60),
      }));
      // widest offending element (for overflow diagnosis)
      let culprit = null;
      const iw = window.innerWidth;
      if (document.documentElement.scrollWidth > iw) {
        let max = iw;
        for (const el of document.querySelectorAll('body *')) {
          const b = el.getBoundingClientRect();
          if (b.right > max + 1 && b.width > 0) {
            max = b.right;
            culprit = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(el.className).split(' ').slice(0, 3).join('.')} right=${Math.round(b.right)}`;
          }
        }
      }
      return {
        title: document.title,
        h1,
        alerts,
        links,
        overflow: document.documentElement.scrollWidth - iw,
        culprit,
        text: text.slice(0, 20000),
      };
    });
    rec.title = info.title;
    rec.h1 = info.h1;
    rec.alerts = info.alerts;
    rec.overflowPx = info.overflow;
    rec.overflowCulprit = info.culprit;
    rec.errorStates = ERROR_PATTERNS.filter(([, re]) => re.test(info.text)).map(([k, re]) => ({
      kind: k,
      text: info.text.match(re)?.[0]?.slice(0, 160),
    }));
    const labels = new Map(info.links.map((l) => [l.href, l.label]));
    rec.badLinks = (await checkLinks(ctx.request, [...labels.keys()])).map((b) => ({
      ...b,
      label: labels.get(b.href),
    }));
    if (SHOTS) {
      const dir = path.join(OUT, role);
      mkdirSync(dir, { recursive: true });
      const slug = url.replace(/^\//, '').replace(/[^a-zA-Z0-9-]+/g, '_') || 'home';
      rec.screenshot = path.join(dir, `${slug}_${width}.png`);
      await page
        .screenshot({ path: rec.screenshot, fullPage: true, timeout: 60_000 })
        .catch((e) => (rec.screenshotError = String(e).slice(0, 200)));
    }
  } catch (e) {
    rec.crawlError = String(e).slice(0, 400);
  }
  page.off('response', onResponse);
  page.off('requestfailed', onFailed);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  rec.network = net.map((n) => ({ ...n, expected: classifyNet(role, n) }));
  rec.consoleErrors = consoleErrors;
  rec.pageErrors = pageErrors;
  return rec;
}

// ── Shell link checks (sidebar, topbar, footer, tab bar, drawer, user menu) ──────────────────────────────────
async function collect(page, selector) {
  return page
    .evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)].flatMap((root) =>
          [...root.querySelectorAll('a[href]')].map((a) => ({
            href: a.getAttribute('href'),
            label: (a.getAttribute('aria-label') || a.innerText || '')
              .trim()
              .replace(/\s+/g, ' ')
              .slice(0, 60),
          })),
        ),
      selector,
    )
    .catch(() => []);
}

async function shellCheck(page, ctx, role, url, width, admin) {
  const parts = {};
  if (!admin) {
    parts.sidebar = await collect(page, 'aside[aria-label="Sidebar"]');
    parts.topbar = await collect(page, 'header');
    parts.footer = await collect(page, 'footer');
    parts.tabBar = await collect(page, 'nav[aria-label="Primary"]');
    const menuBtn = page.locator('button[aria-label^="Account menu for"]:visible').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click().catch(() => undefined);
      await page.waitForSelector('[role="menu"]', { timeout: 5000 }).catch(() => undefined);
      parts.userMenu = await collect(page, '[role="menu"]');
      await page.keyboard.press('Escape');
    }
    const burger = page
      .locator(
        'button[aria-label="Open menu"]:visible, button[aria-label="Toggle navigation"]:visible',
      )
      .first();
    if (width < 1024 && (await burger.isVisible().catch(() => false))) {
      await burger.click().catch(() => undefined);
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => undefined);
      parts.drawer = await collect(page, '[role="dialog"]');
      await page.keyboard.press('Escape');
    }
  } else {
    parts.sidebar = await collect(page, 'nav[aria-label="Admin navigation"]');
    parts.topbar = await collect(page, 'header');
    parts.tabBar = await collect(page, 'nav[aria-label="Admin sections"]');
    const menuBtn = page.locator('button[aria-label^="Admin menu"]:visible').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click().catch(() => undefined);
      await page.waitForSelector('[role="menu"]', { timeout: 5000 }).catch(() => undefined);
      parts.userMenu = await collect(page, '[role="menu"]');
      await page.keyboard.press('Escape');
    }
    const burger = page.locator('button[aria-label="Open admin navigation"]:visible').first();
    if (await burger.isVisible().catch(() => false)) {
      await burger.click().catch(() => undefined);
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => undefined);
      parts.drawer = await collect(page, '[role="dialog"]');
      await page.keyboard.press('Escape');
    }
  }
  const result = { role, width, url, parts: {} };
  for (const [k, links] of Object.entries(parts)) {
    const uniq = [...new Map(links.map((l) => [l.href, l])).values()];
    const bad = [];
    for (const l of uniq) {
      const [b] = await checkLinks(ctx.request, [l.href]);
      let st = null;
      try {
        const u = new URL(l.href, BASE);
        if (u.origin === new URL(BASE).origin) st = await pathStatus(ctx.request, u.pathname);
      } catch {
        /* ignore */
      }
      if (b || (st !== null && st !== 200))
        bad.push({ ...l, problem: b?.problem ?? `HTTP ${st}`, status: st });
    }
    result.parts[k] = { count: uniq.length, bad };
  }
  return result;
}

// ── Crawl one identity ───────────────────────────────────────────────────────────────────────────────────────
async function crawlRole(browser, role, urls, results, shells) {
  const context = await browser.newContext({
    viewport: { width: WIDTHS[0], height: 900 },
    deviceScaleFactor: 1,
  });
  // PUB-22: guest shots show the page, not the age-gate modal (members never get the gate).
  await presetAgeGate(context, BASE);
  const adminKey = ADMIN_ROLE_KEYS[role];
  let session = null;
  if (role === 'nova' || role === 'new-player') {
    const stamp = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
    const did = role === 'nova' ? NOVA_DID : `did:privy:qa-crawler-${stamp}`;
    const email = role === 'nova' ? 'nova.k@example.com' : `qa-crawler-${stamp}@example.com`;
    await context.addInitScript(
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
      [did, email],
    );
    results.meta[role] = { did };
  } else if (adminKey) {
    session = await adminLogin(adminKey);
    results.meta[role] = {
      email: session.admin?.email,
      roles: session.admin?.roles ?? session.admin?.role,
      permissions: (session.admin?.permissions ?? []).length,
    };
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
  }
  const page = await context.newPage();
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const url of urls) {
      const rec = await visit(page, context, role, url, width);
      results.visits.push(rec);
      const flags = [
        rec.status && rec.status >= 400 ? `HTTP ${rec.status}` : '',
        rec.pageErrors.length ? `${rec.pageErrors.length} pageerror` : '',
        rec.consoleErrors.length ? `${rec.consoleErrors.length} console` : '',
        rec.network.filter((n) => !n.expected && !n.rsc).length ? 'net' : '',
        rec.overflowPx > 0 ? `overflow ${rec.overflowPx}` : '',
        rec.skeletonStuck ? 'skeleton' : '',
        rec.errorStates?.length ? rec.errorStates.map((e) => e.kind).join('+') : '',
        rec.badLinks?.length ? `${rec.badLinks.length} badlinks` : '',
        rec.crawlError ? 'CRAWL-ERROR' : '',
      ].filter(Boolean);
      console.info(
        `[${role} ${width}] ${url} → ${rec.status} ${rec.finalUrl ?? ''} ${flags.join(' · ')}`,
      );
      const kind = adminKey ? 'admin' : 'player';
      if (SHELL && REPRESENTATIVE[kind].includes(url) && !rec.crawlError)
        shells.push(await shellCheck(page, context, role, url, width, kind === 'admin'));
      // keep the admin idle timer alive (pointer activity)
      if (adminKey) await page.mouse.move(10 + (Date.now() % 50), 10).catch(() => undefined);
    }
  }
  await context.close();
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ids = await resolveIds();
const allUrls = ROUTES.flatMap((r) => instancesFor(r, ids).map((u) => ({ u, r })));
const unresolved = ROUTES.filter((r) => r.dynamic && instancesFor(r, ids).length === 0).map(
  (r) => r.pattern,
);
const urls = allUrls.map((x) => x.u).filter((u) => !ONLY || ONLY.test(u));
console.info(
  `routes: ${ROUTES.length} page.tsx · ${urls.length} URLs · ids ${JSON.stringify(ids)}`,
);
if (unresolved.length) console.warn('unresolved dynamic routes:', unresolved);
if (process.env.DRY === '1') {
  for (const role of ROLES) console.info(role, routesFor(role, urls).length, 'URLs');
  console.info(urls.join('\n'));
  process.exit(0);
}

const results = {
  base: BASE,
  api: API,
  ids,
  routes: ROUTES.map((r) => ({ pattern: r.pattern, file: r.file })),
  meta: {},
  visits: [],
  shells: [],
  unresolved,
};
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const queue = [...ROLES];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const role = queue.shift();
      try {
        await crawlRole(browser, role, routesFor(role, urls), results, results.shells);
      } catch (e) {
        console.error(`role ${role} failed:`, e);
        results.meta[role] = { ...(results.meta[role] ?? {}), error: String(e) };
      }
    }
  }),
);
await browser.close();
writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));

// ── Summary ──────────────────────────────────────────────────────────────────────────────────────────────────
// Problems that repeat on every page (dead shell links, the same failing endpoint, the same console error) are
// aggregated once with the pages/roles they appear on; per-visit sections list everything else.
const normApi = (u) =>
  new URL(u).pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:n');
const agg = (map, key, v, extra) => {
  const e = map.get(key) ?? {
    count: 0,
    roles: new Set(),
    pages: new Set(),
    widths: new Set(),
    ...extra,
  };
  e.count += 1;
  e.roles.add(v.role);
  e.pages.add(v.url);
  e.widths.add(v.width);
  map.set(key, e);
};
const deadLinks = new Map();
const apiFails = new Map();
const consoleAgg = new Map();
const pageErrAgg = new Map();
const lines = ['# Per-visit problems (aggregated ones below are omitted here)'];
let unexpected = 0;
for (const v of results.visits) {
  const probs = [];
  if (v.crawlError) probs.push(`crawl error: ${v.crawlError}`);
  if (v.status >= 400) probs.push(`HTTP ${v.status}`);
  for (const e of v.pageErrors) agg(pageErrAgg, e.split('\n')[0].slice(0, 200), v);
  for (const e of v.consoleErrors) {
    if (/^Failed to load resource/.test(e.text)) continue; // mirrored by the network entries
    agg(consoleAgg, e.text.split('\n')[0].slice(0, 220), v);
  }
  for (const n of v.network) {
    if (n.rsc) continue; // RSC prefetch 404s = dead links (reported via the link check)
    if (n.url.startsWith(API)) {
      const key = `${n.status || n.failure} ${n.method} ${normApi(n.url)}${n.body?.error?.code ? ` ${n.body.error.code}` : ''}${n.expected ? ' [expected for role]' : ''}`;
      agg(apiFails, key, v, {
        message: n.body?.error?.message,
        missing: n.body?.error?.details?.missingPermissions,
      });
    } else if (!n.expected)
      probs.push(`${n.status || n.failure} ${n.method} ${n.url.replace(BASE, '')}`);
  }
  if (v.overflowPx > 0)
    probs.push(`horizontal overflow ${v.overflowPx}px (${v.overflowCulprit ?? '?'})`);
  if (v.skeletonStuck)
    probs.push(`${v.skeletonsAfterWait} skeleton(s) still visible after ${SKELETON_MS / 1000}s`);
  for (const e of v.errorStates ?? []) probs.push(`visible error state [${e.kind}]: ${e.text}`);
  for (const b of v.badLinks ?? [])
    agg(deadLinks, `${b.path ?? b.href} — ${b.problem}`, v, { label: b.label });
  if (probs.length) {
    unexpected += 1;
    lines.push(
      `## ${v.role} @${v.width} ${v.url}${v.finalUrl && v.finalUrl !== v.url ? ` → ${v.finalUrl}` : ''}  [HTTP ${v.status}]`,
    );
    for (const p of probs) lines.push(`  - ${p}`);
  }
}
const dump = (title, map) => {
  lines.push('', `# ${title} (${map.size})`);
  for (const [k, e] of [...map.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const pages = [...e.pages];
    lines.push(
      `- ${k}${e.label ? ` ("${e.label}")` : ''}${e.message ? ` — "${e.message}"` : ''}${e.missing ? ` missing=${e.missing.join(',')}` : ''}\n    ${e.count}× · roles ${[...e.roles].join(',')} · widths ${[...e.widths].join(',')} · pages ${pages.slice(0, 8).join(' ')}${pages.length > 8 ? ` …(+${pages.length - 8})` : ''}`,
    );
  }
};
dump('API request failures (status method path code)', apiFails);
dump('Page errors (uncaught exceptions)', pageErrAgg);
dump('Console errors', consoleAgg);
dump('Links to routes that do not exist', deadLinks);
lines.push('', '# Shell links (representative pages)');
for (const s of results.shells)
  lines.push(
    `- ${s.role} @${s.width} ${s.url}: ${Object.entries(s.parts)
      .map(
        ([k, p]) =>
          `${k} ${p.count} links / ${p.bad.length} bad${p.bad.length ? ` [${p.bad.map((b) => b.href).join(' ')}]` : ''}`,
      )
      .join(' · ')}`,
  );
lines.push('', '# Coverage (route × role → width:HTTP status; ↪ = ended on another URL)');
lines.push(['route', ...ROLES].join(' | '));
for (const u of urls) {
  const row = [u];
  for (const role of ROLES) {
    const vs = results.visits.filter((v) => v.role === role && v.url === u);
    row.push(
      vs.length
        ? vs
            .map(
              (v) =>
                `${v.width}:${v.status ?? 'x'}${v.finalUrl && v.finalUrl.split('?')[0] !== u ? `↪${v.finalUrl.split('?')[0]}` : ''}`,
            )
            .join(',')
        : '—',
    );
  }
  lines.push(row.join(' | '));
}
writeFileSync(path.join(OUT, 'summary.txt'), lines.join('\n'));
const totalProblems =
  unexpected + apiFails.size + pageErrAgg.size + consoleAgg.size + deadLinks.size;
console.info(
  `\n${results.visits.length} visits · ${unexpected} visits with page-specific problems · ${apiFails.size} API failure kinds · ${pageErrAgg.size} page-error kinds · ${consoleAgg.size} console-error kinds · ${deadLinks.size} dead link targets\nreport ${path.join(OUT, 'report.json')} · summary ${path.join(OUT, 'summary.txt')}`,
);
if (totalProblems) process.exitCode = 1;
