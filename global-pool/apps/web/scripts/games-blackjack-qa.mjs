#!/usr/bin/env node
/* global document, window -- used inside page.evaluate() / addInitScript callbacks, which run in the browser */
/**
 * Twenty-One visual QA (key "blackjack"): BJ-01 … BJ-09 screenshots at 1440 / 390 (WIDTHS) against a RUNNING web + API
 * (DEV MOCK auth, fresh DEMO player per screen). DEMO credits only — no cash value. Every hand is a real hand dealt by
 * the API from commit–reveal seeds (result variants are found by playing real hands until each one comes up).
 * Fails on horizontal overflow and console errors. Output: test-results/visual/games/blackjack/<screen>_<width>.png
 *
 *   BASE_URL=http://localhost:3116 API_URL=http://localhost:4216 node scripts/games-blackjack-qa.mjs [screen-prefix…]
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { presetAgeGate } from './lib/age-gate.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3116';
const API = process.env.API_URL ?? 'http://localhost:4216';
const OUT = path.resolve(import.meta.dirname, '../test-results/visual/games/blackjack');
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const uniq = () => Math.random().toString(36).slice(2, 9);

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

async function newPlayer() {
  const did = `did:privy:qa-bj-${uniq()}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `bj_${uniq()}`,
      country: 'PT',
      consents: { ageConfirmed: true, jurisdictionConfirmed: true, termsAccepted: true, privacyAccepted: true, marketingOptIn: false },
    },
  });
  return { did, token };
}

const deal = (token, stake = '10.00') =>
  api('/games/twenty-one/hands', { method: 'POST', token, body: { stake, idempotencyKey: `qa-bj-${uniq()}` } });
const act = (token, id, action, extra = {}) =>
  api(`/games/twenty-one/hands/${id}/action`, { method: 'POST', token, body: { action, ...extra, idempotencyKey: `qa-bj-${uniq()}` } });

/** Finish a hand with a simple strategy (decline insurance, hit below 17). */
async function finish(token, h) {
  for (let i = 0; i < 12 && h.status === 'active'; i++) {
    const r = h.round;
    if (r.allowedActions.includes('insurance')) h = await act(token, h.id, 'insurance', { accept: false });
    else h = await act(token, h.id, r.hands[r.active].total < 17 ? 'hit' : 'stand');
  }
  return h;
}

/** Deal real hands until `want(hand)` holds for an OPEN hand (others are finished first). */
async function openHand(token, want, stake = '10.00') {
  for (let i = 0; i < 160; i++) {
    const h = await deal(token, stake);
    if (h.status === 'active' && want(h)) return h;
    await finish(token, h);
  }
  throw new Error('no matching hand in 160 deals');
}

async function contextFor(browser, width, player, motion = false) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1024 },
    deviceScaleFactor: 1,
    reducedMotion: motion ? 'no-preference' : 'reduce',
  });
  // PUB-22: guest shots show the page, not the age-gate modal (members never get the gate).
  await presetAgeGate(ctx, BASE);
  if (player) {
    const host = new URL(BASE).hostname;
    await ctx.addCookies([{ name: 'privy-token', value: player.token, domain: host, path: '/' }]);
    await ctx.addInitScript((did) => {
      window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null }));
    }, player.did);
  }
  if (player?.region)
    // UI preview of the region gate (the API refuses restricted countries at onboarding, so a real US player can't be made)
    await ctx.route('**/auth/account-status', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      const us = { code: 'US', name: 'United States', permitted: false };
      await r.fulfill({ response: res, json: { ...body, gate: 'region', region: { current: us, declared: body.region?.declared ?? null, permitted: false } } });
    });
  await ctx.route('**/auth/new-device-alerts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  return ctx;
}

const playerPhase = (h) => h.round.phase === 'player';
const SCREENS = [
  { id: 'BJ-01_guest', player: null },
  { id: 'BJ-01_ready-to-deal', player: 'fresh', lossLimit: '200.00' },
  { id: 'BJ-02_dealing', player: 'fresh', holdDeal: true },
  { id: 'BJ-03_your-move', player: 'open', want: (h) => playerPhase(h) && h.round.hands[0].total >= 12 && h.round.hands[0].total <= 16, dismiss: true },
  { id: 'BJ-03_insurance', player: 'open', want: (h) => h.round.phase === 'insurance', dismiss: true },
  { id: 'BJ-03_split', player: 'split', dismiss: true },
  { id: 'BJ-04_dealer-turn', player: 'open', want: (h) => playerPhase(h) && h.round.dealer.total <= 6 && h.round.hands[0].total >= 12, dismiss: true, motion: true, standCapture: 900 },
  { id: 'BJ-05_results', player: 'fresh', results: true },
  { id: 'BJ-06_my-hands', url: '/games/twenty-one/my-hands', player: 'played', expand: true },
  { id: 'BJ-07_rules', url: '/games/twenty-one/rules', player: 'fresh' },
  { id: 'BJ-08_verified', url: '/games/twenty-one/fairness', player: 'played-rotated', wait: '[data-testid="bj-verified"]' },
  { id: 'BJ-08_failed', url: '/games/twenty-one/fairness', player: 'played-rotated', wait: '[data-testid="bj-verified"]', tamper: true },
  { id: 'BJ-09_connection-lost', player: 'open', want: playerPhase, dismiss: true, dropAction: true },
  { id: 'BJ-09_restored', player: 'open', want: playerPhase },
  { id: 'BJ-09_loading', player: 'fresh', holdCredits: true },
  { id: 'BJ-09_insufficient', player: 'below-1000', stake: '1000.00' },
  { id: 'BJ-09_loss-limit', player: 'loss-limit' },
  { id: 'BJ-09_region', player: 'fresh', region: true },
  { id: 'BJ-09_self-excluded', player: 'excluded' },
];

async function playerFor(s) {
  if (!s.player) return null;
  const p = await newPlayer();
  if (s.lossLimit)
    await api('/responsible-gaming/limits', { method: 'PUT', token: p.token, body: { type: 'loss', period: 'day', amount: s.lossLimit } });
  if (s.player === 'open') await openHand(p.token, s.want);
  if (s.player === 'split') {
    const h = await openHand(p.token, (x) => x.round.allowedActions.includes('split') && x.round.hands[0].cards[0][0] !== 'A');
    await act(p.token, h.id, 'split');
  }
  if (s.player === 'played' || s.player === 'played-rotated') {
    for (let i = 0; i < 12; i++) await finish(p.token, await deal(p.token, i % 4 === 3 ? '20.00' : '10.00'));
    if (s.player === 'played-rotated') await api('/games/twenty-one/seeds/rotate', { method: 'POST', token: p.token, body: {} });
  }
  if (s.player === 'below-1000') {
    for (let i = 0; i < 40; i++) {
      await finish(p.token, await deal(p.token, '5.00'));
      const c = await api('/games/credits', { token: p.token });
      if (Number(String(c.balance).split('.')[0]) < 1000) break; // integer part only (a QA loop guard, not money maths)
    }
  }
  if (s.player === 'loss-limit') {
    for (let i = 0; i < 40; i++) {
      await finish(p.token, await deal(p.token, '5.00'));
      const c = await api('/games/credits', { token: p.token });
      if (String(c.session.today.net).startsWith('-')) {
        await api('/responsible-gaming/limits', {
          method: 'PUT',
          token: p.token,
          body: { type: 'loss', period: 'day', amount: String(c.session.today.net).slice(1) },
        });
        break;
      }
    }
  }
  if (s.player === 'excluded')
    await api('/responsible-gaming/cooling-off', { method: 'POST', token: p.token, body: { duration: '24h', confirm: true } });
  return p;
}

const visible = (page, sel) => page.locator(sel).locator('visible=true').first();
const amountInput = (page) => page.getByRole('textbox', { name: /bet amount in demo credits/i }).locator('visible=true').first();

const browser = await chromium.launch();
const problems = [];
const shot = async (page, name, errors, full = true) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  const real = errors.filter((e) => !/Download the React DevTools|favicon|401|Failed to load resource|ERR_CONNECTION_RESET|status of 50[03]/.test(e));
  if (overflow > 1) problems.push(`${name}: horizontal overflow ${overflow}px`);
  if (real.length) problems.push(`${name}: console errors: ${real.slice(0, 3).join(' | ')}`);
  console.info(`${name}.png${overflow > 1 ? ` (overflow ${overflow})` : ''}${real.length ? ` (${real.length} errors: ${real[0].slice(0, 300)})` : ''}`);
};

try {
  for (const s of SCREENS) {
    if (only.length && !only.some((o) => s.id.startsWith(o))) continue;
    for (const width of WIDTHS) {
      const player = await playerFor(s);
      if (player && s.region) player.region = true;
      const ctx = await contextFor(browser, width, player, s.motion);
      if (s.holdCredits) await ctx.route('**/games/credits', () => undefined);
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}${s.url ?? '/games/twenty-one'}`, { waitUntil: s.holdCredits ? 'domcontentloaded' : 'load', timeout: 180_000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      // dev server: a chunk can fail while another agent's edit recompiles — reload once if the page never hydrated
      if (!s.holdCredits && !(await page.locator('h1').count())) {
        await page.waitForTimeout(3000);
        if (!(await page.locator('h1').count())) await page.reload({ waitUntil: 'load' });
        await page.locator('h1').first().waitFor({ timeout: 60_000 }).catch(() => undefined);
      }
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
      if (s.dismiss) await page.getByRole('button', { name: 'Dismiss' }).first().click({ timeout: 5000 }).catch(() => undefined);
      if (s.stake) {
        await amountInput(page).fill(s.stake);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }
      if (s.holdDeal) {
        await page.route('**/games/twenty-one/hands', () => undefined);
        await visible(page, '[data-testid="bj-deal"]').click();
        await page.waitForTimeout(700);
      }
      if (s.dropAction) {
        await page.route('**/games/twenty-one/hands/*/action', (r) => r.abort('connectionreset'));
        await visible(page, '[data-testid="bj-hit"]').click();
        await page.getByTestId('bj-connection-lost').waitFor({ timeout: 30_000 });
        await page.waitForTimeout(400);
      }
      if (s.standCapture) {
        await visible(page, '[data-testid="bj-stand"]').click();
        await page.waitForTimeout(s.standCapture);
        await page.evaluate(() => window.scrollTo(0, 0));
        await shot(page, `${s.id}_${width}`, errors, false);
        await ctx.close();
        continue;
      }
      if (s.expand) {
        await page.getByRole('button', { name: /^Show details of BJ-/ }).first().click({ timeout: 15_000 }).catch(() => undefined);
        await page.getByRole('button', { name: /^BJ-\d+/ }).first().click({ timeout: 3_000 }).catch(() => undefined);
        await page.waitForTimeout(400);
      }
      if (s.tamper) {
        const seed = page.getByRole('textbox', { name: 'Server seed (revealed)' });
        const v = await seed.inputValue();
        await seed.fill(v.slice(0, 63));
        await page.getByTestId('bj-verify-failed').waitFor({ timeout: 10_000 });
      }
      if (s.results) {
        // play real hands from the UI until each result variant has come up once
        const want = width < 768 ? new Set(['win']) : new Set(['win', 'lose', 'push', 'blackjack', 'bust']);
        await amountInput(page).fill('10.00').catch(async (e) => {
          await page.screenshot({ path: path.join(OUT, `debug_${width}.png`) });
          throw e;
        });
        for (let i = 0; i < 220 && want.size; i++) {
          const before = (await page.locator('[data-testid="bj-result"]').first().getAttribute('data-ref', { timeout: 500 }).catch(() => null)) ?? '';
          const dealBtn = page.locator('[data-testid="bj-deal"]:not([disabled]), [data-testid="bj-rebet-deal"]:not([disabled])').locator('visible=true').first();
          await dealBtn.click({ timeout: 20_000 });
          await page.waitForFunction(
            (prev) => {
              const r = document.querySelector('[data-testid="bj-result"]');
              return (
                (r && r.getAttribute('data-ref') !== prev) ||
                document.querySelector('[data-testid="bj-stand"]:not([disabled])') ||
                document.querySelector('[data-testid="bj-insurance-no"]:not([disabled])')
              );
            },
            before,
            { timeout: 20_000 },
          );
          for (let k = 0; k < 10; k++) {
            if (await page.locator('[data-testid="bj-result"]').count()) break;
            if (await page.locator('[data-testid="bj-insurance-no"]:not([disabled])').count()) {
              await page.locator('[data-testid="bj-insurance-no"]').locator('visible=true').first().click();
            } else {
              const total = Number(await page.locator('[data-testid="bj-hand-0"]').getAttribute('data-total', { timeout: 2000 }).catch(() => '0'));
              const btn = want.has('bust') && total >= 13 ? 'bj-hit' : total < 12 ? 'bj-hit' : 'bj-stand';
              await visible(page, `[data-testid="${btn}"]:not([disabled])`).click({ timeout: 3_000 }).catch(() => undefined);
            }
            await page.waitForTimeout(250);
          }
          const res = page.locator('[data-testid="bj-result"]').locator('visible=true').first();
          await res.waitFor({ timeout: 20_000 });
          const kind = await res.getAttribute('data-kind');
          if (kind && want.has(kind)) {
            want.delete(kind);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(300);
            await shot(page, `BJ-05_${kind}_${width}`, errors);
          }
        }
        if (want.size) problems.push(`BJ-05@${width}: variants not reached: ${[...want].join(', ')}`);
        await ctx.close();
        continue;
      }
      if (!s.holdCredits) await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, `${s.id}_${width}`, errors);
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
