#!/usr/bin/env node
/**
 * Games kit visual QA (key "kit"): screenshots of the lobby, catalogue, details and Pool Dice states at 1440 / 390
 * against a RUNNING web + API (DEV MOCK auth, fresh DEMO player per run). Fails on horizontal overflow and console
 * errors. Output: test-results/visual/games/kit/<screen>_<width>.png
 *
 *   BASE_URL=http://localhost:3112 API_URL=http://localhost:4212 node scripts/games-kit-qa.mjs [screen…]
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3112';
const API = process.env.API_URL ?? 'http://localhost:4212';
const OUT = path.resolve(import.meta.dirname, '../test-results/visual/games/kit');
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const uniq = () => Math.random().toString(36).slice(2, 9);

async function api(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function newPlayer({ lossLimit } = {}) {
  const did = `did:privy:qa-kit-${uniq()}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `kit_${uniq()}`,
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
  if (lossLimit)
    await api('/responsible-gaming/limits', {
      method: 'PUT',
      token,
      body: { type: 'loss', period: 'day', amount: lossLimit },
    });
  return { did, token };
}

async function bets(token, n, target = '50.50', condition = 'over', stake = '10.00') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await api('/games/pool-dice/bets', {
        method: 'POST',
        token,
        body: { stake, params: { target, condition }, idempotencyKey: `qa-kit-${uniq()}-${i}` },
      }),
    );
  }
  return out;
}

async function contextFor(browser, width, player) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1024 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  if (player) {
    const host = new URL(BASE).hostname;
    await ctx.addCookies([{ name: 'privy-token', value: player.token, domain: host, path: '/' }]);
    await ctx.addInitScript((did) => {
      window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
    }, player.did);
  }
  await ctx.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  return ctx;
}

const SCREENS = [
  { id: 'PUB-03_lobby', url: '/games', player: null },
  { id: 'GM-02_catalogue-table', url: '/games?category=table', player: null },
  { id: 'PUB-03_search-empty', url: '/games?q=baccarat&category=originals', player: null },
  { id: 'PUB-04_details-pool-dice', url: '/games/pool-dice/details', player: null },
  { id: 'PUB-04_details-coming-soon', url: '/games/neon-koi', player: null },
  { id: 'PUB-04_details-engine-only', url: '/games/skyline', player: null },
  { id: 'DI-01_guest', url: '/games/pool-dice', player: null },
  {
    id: 'DI-01_default',
    url: '/games/pool-dice',
    player: 'fresh',
    lossLimit: '200.00',
    wait: '[data-testid="dice-roll"]',
  },
  {
    id: 'DI-04_result',
    url: '/games/pool-dice',
    player: 'fresh',
    lossLimit: '200.00',
    roll: true,
    wait: '[data-testid="dice-roll"]',
  },
  { id: 'DI-05_history', url: '/games/pool-dice#my-bets', player: 'played', lossLimit: '200.00', scroll: '#my-bets' },
  { id: 'DI-06_verify', url: '/games/pool-dice', player: 'played-rotated', verify: true },
  {
    id: 'DI-07_out-of-range',
    url: '/games/pool-dice',
    player: 'fresh',
    target: '1.50',
    wait: '[data-testid="dice-roll"]',
  },
  { id: 'DI-07_insufficient', url: '/games/pool-dice', player: 'fresh', stake: '1500.00', wait: '[data-testid="dice-roll"]' },
  { id: 'DI-07_loss-limit', url: '/games/pool-dice', player: 'loss-limit' },
  { id: 'DI-07_self-excluded', url: '/games/pool-dice', player: 'excluded' },
];

async function playerFor(kind, lossLimit) {
  if (!kind) return null;
  const p = await newPlayer({ lossLimit });
  if (kind === 'played' || kind === 'played-rotated') await bets(p.token, 6);
  if (kind === 'played-rotated') await api('/games/pool-dice/seeds/rotate', { method: 'POST', token: p.token, body: {} });
  if (kind === 'loss-limit') {
    await api('/responsible-gaming/limits', { method: 'PUT', token: p.token, body: { type: 'loss', period: 'day', amount: '1.00' } });
    // lose until the DEMO loss limit is used up (each bet is checked server-side; the over-limit bet is refused)
    for (let i = 0; i < 40; i++) {
      try {
        await bets(p.token, 1, '98.00', 'over', '0.10');
      } catch {
        break;
      }
    }
  }
  if (kind === 'excluded')
    await api('/responsible-gaming/cooling-off', { method: 'POST', token: p.token, body: { duration: '24h', confirm: true } });
  return p;
}

const browser = await chromium.launch();
const problems = [];
try {
  for (const s of SCREENS) {
    if (only.length && !only.some((o) => s.id.startsWith(o))) continue;
    const player = await playerFor(s.player, s.lossLimit);
    for (const width of WIDTHS) {
      const ctx = await contextFor(browser, width, player);
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}${s.url}`, { waitUntil: 'networkidle', timeout: 120_000 });
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(1200);
      if (s.target) {
        const t = page.getByTestId('dice-target').locator('visible=true').first();
        await t.fill(s.target);
      }
      if (s.stake) {
        await page.getByRole('textbox', { name: /bet amount in demo credits/i }).first().fill(s.stake);
        await page.keyboard.press('Tab');
      }
      if (s.roll) {
        await page.getByTestId('dice-roll').locator('visible=true').first().click();
        await page.getByTestId('result-banner').waitFor({ timeout: 30_000 });
        await page.waitForTimeout(600);
      }
      if (s.verify) {
        await page.getByRole('button', { name: /^Verify D-\d+/ }).first().or(page.getByRole('button', { name: /Verify D-/ }).first()).click().catch(async () => {
          await page.locator('#my-bets button').filter({ hasText: /D-/ }).first().click();
        });
        await page.getByText(/verified|doesn’t match/).first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(500);
      }
      if (s.scroll) await page.locator(s.scroll).scrollIntoViewIfNeeded();
      else if (!s.verify) await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      const file = path.join(OUT, `${s.id}_${width}.png`);
      await page.screenshot({ path: file, fullPage: !s.verify });
      const real = errors.filter((e) => !/Download the React DevTools|favicon|401|Failed to load resource/.test(e));
      if (overflow > 1) problems.push(`${s.id}@${width}: horizontal overflow ${overflow}px`);
      if (real.length) problems.push(`${s.id}@${width}: console errors: ${real.slice(0, 3).join(' | ')}`);
      console.log(`${s.id}_${width}.png${overflow > 1 ? ` (overflow ${overflow})` : ''}${real.length ? ` (${real.length} errors)` : ''}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exitCode = 1;
}
