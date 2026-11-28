#!/usr/bin/env node
/* global document, window -- used inside page.evaluate() / addInitScript callbacks, which run in the browser */
/**
 * Pool Roulette visual QA (key "roulette", RL-01 … RL-09) against a RUNNING web + API (DEV MOCK auth, fresh DEMO
 * player per screen). Fails on horizontal overflow and console errors. Output:
 * test-results/visual/games/roulette/<screen>_<width>.png (+ `_vp` viewport shots on mobile, where the sticky chip
 * tray is fixed above the tab bar).
 *
 *   BASE_URL=http://localhost:3114 API_URL=http://localhost:4214 node scripts/games-roulette-qa.mjs [screen-prefix…]
 *   WIDTHS=1280,768 … to add the in-between widths.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3114';
const API = process.env.API_URL ?? 'http://localhost:4214';
const OUT = path.resolve(import.meta.dirname, '../test-results/visual/games/roulette');
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const uniq = () => Math.random().toString(36).slice(2, 9);
/** Decision #35 demo bets (DEMO credits): Straight 19 5.00 + Red 10.00 + 2nd dozen 5.00. */
const DEMO_BETS = [
  { type: 'straight', numbers: [19], amount: '5.00' },
  { type: 'red', amount: '10.00' },
  { type: 'dozen', numbers: [2], amount: '5.00' },
];
const OVER_BETS = [{ type: 'straight', numbers: [19], amount: '1200.00' }, DEMO_BETS[1], DEMO_BETS[2]];

async function api(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function newPlayer({ lossLimit } = {}) {
  const did = `did:privy:qa-rl-${uniq()}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `rl_${uniq()}`,
      country: 'PT',
      consents: { ageConfirmed: true, jurisdictionConfirmed: true, termsAccepted: true, privacyAccepted: true, marketingOptIn: false },
    },
  });
  if (lossLimit)
    await api('/responsible-gaming/limits', { method: 'PUT', token, body: { type: 'loss', period: 'day', amount: lossLimit } });
  return { did, token };
}

const spin = (token, bets = DEMO_BETS) =>
  api('/games/pool-roulette/bets', { method: 'POST', token, body: { params: { bets }, idempotencyKey: `qa-rl-${uniq()}` } });

async function playerFor(kind, lossLimit) {
  if (!kind) return null;
  const p = await newPlayer({ lossLimit });
  if (kind === 'played' || kind === 'played-rotated') {
    for (let i = 0; i < 8; i++) await spin(p.token, i % 3 === 2 ? [{ type: 'black', amount: '10.00' }] : DEMO_BETS);
  }
  if (kind === 'played-rotated') await api('/games/pool-roulette/seeds/rotate', { method: 'POST', token: p.token, body: {} });
  if (kind === 'loss-limit') {
    await api('/responsible-gaming/limits', { method: 'PUT', token: p.token, body: { type: 'loss', period: 'day', amount: '1.00' } });
    for (let i = 0; i < 40; i++) {
      try {
        await spin(p.token, [{ type: 'straight', numbers: [0], amount: '0.10' }]);
      } catch {
        break;
      }
    }
  }
  if (kind === 'broke') {
    // DEMO credits only (no cash value): lose the balance with 2 %-chance dice rolls, then play roulette with 4.20 left
    for (let i = 0; i < 3; i++) {
      const b = await api('/games/pool-dice/bets', {
        method: 'POST',
        token: p.token,
        body: { stake: '995.80', params: { target: '98.00', condition: 'over' }, idempotencyKey: `qa-rl-${uniq()}` },
      }).catch(() => null);
      if (!b || !b.win) break;
    }
  }
  if (kind === 'excluded')
    await api('/responsible-gaming/cooling-off', { method: 'POST', token: p.token, body: { duration: '24h', confirm: true } });
  return p;
}

async function contextFor(browser, width, player, s) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1024 },
    deviceScaleFactor: 1,
    reducedMotion: s.motion ? 'no-preference' : 'reduce',
  });
  // a returning visitor who already answered the 18+ gate (PUB-22, components/compliance) — members use onboarding
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem('gp.ageGate', JSON.stringify({ confirmedAt: new Date().toISOString(), country: 'PT' }));
    } catch {
      // storage unavailable: the gate simply asks
    }
  });
  if (player) {
    await ctx.addCookies([{ name: 'privy-token', value: player.token, domain: new URL(BASE).hostname, path: '/' }]);
    await ctx.addInitScript(
      ([did, bets]) => {
        window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
        if (bets) window.sessionStorage.setItem('gp.roulette.lastBets', bets);
      },
      [player.did, s.bets ? JSON.stringify(s.bets) : null],
    );
  }
  if (s.region)
    // UI preview of the region gate (the API refuses restricted countries at onboarding)
    await ctx.route('**/auth/account-status', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      const us = { code: 'US', name: 'United States', permitted: false };
      await r.fulfill({ response: res, json: { ...body, gate: 'region', region: { current: us, declared: body.region?.declared ?? null, permitted: false } } });
    });
  if (s.slowCredits) await ctx.route('**/games/credits', async (r) => { await new Promise((res) => setTimeout(res, 15_000)); await r.continue().catch(() => undefined); });
  await ctx.route('**/auth/new-device-alerts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  return ctx;
}

const P = '/games/pool-roulette';
const SCREENS = [
  { id: 'RL-01_guest', url: P, player: null },
  { id: 'RL-01_loading', url: P, player: 'fresh', slowCredits: true, noWait: true },
  { id: 'RL-01_empty', url: P, player: 'fresh', lossLimit: '200.00' },
  { id: 'RL-01_bets-placed', url: P, player: 'fresh', lossLimit: '200.00', bets: DEMO_BETS, repeat: true },
  { id: 'RL-02_inside-split', url: P, player: 'fresh', bets: DEMO_BETS, repeat: true, inside: true },
  { id: 'RL-03_outside-column', url: P, player: 'fresh', bets: DEMO_BETS, repeat: true, outside: true },
  { id: 'RL-04_spinning', url: P, player: 'fresh', bets: DEMO_BETS, repeat: true, spinning: true, motion: true },
  { id: 'RL-05_result', url: P, player: 'fresh', lossLimit: '200.00', bets: DEMO_BETS, repeat: true, spin: true },
  { id: 'RL-06_my-bets', url: `${P}/my-bets`, player: 'played', lossLimit: '200.00', expand: true },
  { id: 'RL-07_rules', url: `${P}/rules`, player: null },
  { id: 'RL-08_fairness', url: `${P}/fairness`, player: 'played-rotated', waitText: /Verified/ },
  { id: 'RL-09_connection-lost', url: P, player: 'fresh', bets: DEMO_BETS, repeat: true, dropBets: true },
  { id: 'RL-09_insufficient', url: P, player: 'broke', bets: DEMO_BETS, repeat: true },
  { id: 'RL-09_over-limit', url: P, player: 'fresh', bets: OVER_BETS, repeat: true },
  { id: 'RL-09_loss-limit', url: P, player: 'loss-limit' },
  { id: 'RL-09_region', url: P, player: 'fresh', region: true },
  { id: 'RL-09_self-excluded', url: P, player: 'excluded' },
];

const visible = (page, sel) => page.locator(sel).locator('visible=true').first();

const browser = await chromium.launch();
const problems = [];
try {
  for (const s of SCREENS) {
    if (only.length && !only.some((o) => s.id.startsWith(o))) continue;
    const player = await playerFor(s.player, s.lossLimit);
    for (const width of WIDTHS) {
      const mobile = width < 768;
      const ctx = await contextFor(browser, width, player, s);
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}${s.url}`, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      if (s.url === P && !s.noWait && s.player && !s.region && s.player !== 'excluded' && s.player !== 'loss-limit')
        await page.waitForSelector('[data-testid="roulette-stage"]', { timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(s.noWait ? 1500 : 2000);
      if (s.repeat) {
        await visible(page, '[data-testid="roulette-repeat-cta"], button[aria-label^="Repeat last bets"]').click();
        await page.waitForTimeout(400);
      }
      const hoverShot = !mobile && (s.inside || s.outside);
      if (hoverShot) {
        // hover states: no full-page resize / scroll after hovering (both fire pointerleave)
        await page.setViewportSize({ width, height: 1700 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
      }
      if (s.inside) {
        if (mobile) {
          await page.getByTestId('mfelt-19').click();
          await page.getByRole('dialog').waitFor();
        } else {
          await page.getByRole('radio', { name: 'Chip 1 DEMO credits' }).first().click();
          await page.getByTestId('zone-split:17-20').hover();
        }
        await page.waitForTimeout(400);
      }
      if (s.outside) {
        if (mobile) await page.getByRole('radio', { name: 'Outside bets' }).click();
        else await page.getByTestId('felt-column:2').hover();
        await page.waitForTimeout(400);
      }
      if (s.dropBets) {
        await page.route('**/games/pool-roulette/bets', (r) => (r.request().method() === 'POST' ? r.abort('connectionreset') : r.continue()));
        await visible(page, '[data-testid="roulette-spin"]').click();
        await page.getByText('Connection lost — reconnecting').waitFor({ timeout: 30_000 });
        await page.waitForTimeout(400);
      }
      if (s.spinning) {
        await visible(page, '[data-testid="roulette-spin"]').click();
        await page.locator('[data-testid="roulette-wheel"][data-phase="spinning"]').first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(1500);
      }
      if (s.spin) {
        await visible(page, '[data-testid="roulette-spin"]').click();
        await page.getByTestId('result-banner').first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(600);
      }
      if (s.expand) {
        await page.getByRole('button', { name: /^Details/ }).first().click({ timeout: 30_000 });
        await page.waitForTimeout(400);
      }
      if (s.waitText) await page.getByText(s.waitText).first().waitFor({ timeout: 30_000 }).catch(() => undefined);
      if (!hoverShot && !(s.inside && mobile)) await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const file = path.join(OUT, `${s.id}_${width}.png`);
      await page.screenshot({ path: file, fullPage: !(mobile && s.inside) && !hoverShot });
      if (mobile && s.url === P && !s.inside) {
        const stage = page.getByTestId('roulette-stage');
        if (await stage.count()) {
          await stage.scrollIntoViewIfNeeded();
          await page.evaluate(() => window.scrollBy(0, -72));
        }
        await page.screenshot({ path: path.join(OUT, `${s.id}_${width}_vp.png`) });
      }
      const real = errors.filter((e) => !/Download the React DevTools|favicon|401|Failed to load resource|ERR_CONNECTION_RESET|net::ERR/.test(e));
      if (overflow > 1) problems.push(`${s.id}@${width}: horizontal overflow ${overflow}px`);
      if (real.length) problems.push(`${s.id}@${width}: console errors: ${real.slice(0, 3).join(' | ')}`);
      console.info(`${s.id}_${width}.png${overflow > 1 ? ` (overflow ${overflow})` : ''}${real.length ? ` (${real.length} errors: ${real[0].slice(0, 300)})` : ''}`);
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
