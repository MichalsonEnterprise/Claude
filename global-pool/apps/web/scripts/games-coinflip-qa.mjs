#!/usr/bin/env node
/* global document, window -- used inside page.evaluate() / addInitScript callbacks, which run in the browser */
/**
 * Double Side visual QA (key "dice-coinflip"): CF-01 … CF-06 screenshots at 1440 / 390 (WIDTHS) against a RUNNING
 * web + API (DEV MOCK auth, fresh DEMO player per screen). DEMO credits only — no cash value. Fails on horizontal
 * overflow and console errors. Output: test-results/visual/games/dice-coinflip/<screen>_<width>.png
 *
 *   BASE_URL=http://localhost:3113 API_URL=http://localhost:4213 node scripts/games-coinflip-qa.mjs [screen-prefix…]
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { presetAgeGate } from './lib/age-gate.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3113';
const API = process.env.API_URL ?? 'http://localhost:4213';
const OUT = path.resolve(import.meta.dirname, '../test-results/visual/games/dice-coinflip');
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
  const did = `did:privy:qa-cf-${uniq()}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `cf_${uniq()}`,
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

async function flips(token, n, stake = '10.00') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(
      await api('/games/double-side/bets', {
        method: 'POST',
        token,
        body: {
          stake,
          params: { pick: i % 3 === 2 ? 'tails' : 'heads' },
          idempotencyKey: `qa-cf-${uniq()}-${i}`,
        },
      }),
    );
  }
  return out;
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
      window.localStorage.setItem(
        'gp.devMockSession',
        JSON.stringify({ did, email: null, wallet: null }),
      );
    }, player.did);
  }
  if (player?.region)
    // UI preview of the region gate (the API refuses restricted countries at onboarding, so a real US player can't be made)
    await ctx.route('**/auth/account-status', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      const us = { code: 'US', name: 'United States', permitted: false };
      await r.fulfill({
        response: res,
        json: {
          ...body,
          gate: 'region',
          region: { current: us, declared: body.region?.declared ?? null, permitted: false },
        },
      });
    });
  await ctx.route('**/auth/new-device-alerts', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  return ctx;
}

const FLIP = '[data-testid="coinflip-flip"]';
const SCREENS = [
  { id: 'CF-01_guest', url: '/games/double-side', player: null },
  {
    id: 'CF-01_default',
    url: '/games/double-side',
    player: 'played',
    lossLimit: '200.00',
    wait: FLIP,
  },
  {
    id: 'CF-01_tails-picked',
    url: '/games/double-side',
    player: 'fresh',
    lossLimit: '200.00',
    wait: FLIP,
    press: 't',
  },
  { id: 'CF-01_loading', url: '/games/double-side', player: 'fresh', holdCredits: true },
  {
    id: 'CF-02_flipping-motion',
    url: '/games/double-side',
    player: 'played',
    lossLimit: '200.00',
    wait: FLIP,
    motion: true,
  },
  {
    id: 'CF-02_flipping',
    url: '/games/double-side',
    player: 'played',
    lossLimit: '200.00',
    wait: FLIP,
    holdBet: true,
  },
  {
    id: 'CF-03_result',
    url: '/games/double-side',
    player: 'played',
    lossLimit: '200.00',
    wait: FLIP,
    flip: true,
  },
  {
    id: 'CF-04_my-flips',
    url: '/games/double-side/my-flips',
    player: 'played',
    lossLimit: '200.00',
    wait: 'text=CF-',
    expand: true,
  },
  {
    id: 'CF-04_my-flips-empty',
    url: '/games/double-side/my-flips',
    player: 'fresh',
    wait: 'text=No flips',
  },
  {
    id: 'CF-05_fairness-verified',
    url: '/games/double-side/fairness',
    player: 'played-rotated',
    wait: '[data-testid="verify-ok"]',
  },
  {
    id: 'CF-05_fairness-failed',
    url: '/games/double-side/fairness',
    player: 'played-rotated',
    wait: '[data-testid="verify-ok"]',
    tamper: true,
  },
  {
    id: 'CF-05_fairness-secret',
    url: '/games/double-side/fairness',
    player: 'played',
    wait: 'text=still secret',
  },
  {
    id: 'CF-05_verify-drawer',
    url: '/games/double-side',
    player: 'played-rotated',
    wait: FLIP,
    drawer: true,
  },
  { id: 'CF-06_insufficient', url: '/games/double-side', player: 'broke', wait: FLIP },
  {
    id: 'CF-06_above-max',
    url: '/games/double-side',
    player: 'fresh',
    stake: '1500.00',
    wait: FLIP,
  },
  { id: 'CF-06_loss-limit', url: '/games/double-side', player: 'loss-limit' },
  {
    id: 'CF-06_connection-lost',
    url: '/games/double-side',
    player: 'fresh',
    dropBets: true,
    wait: FLIP,
  },
  { id: 'CF-06_region', url: '/games/double-side', player: 'fresh', region: true },
  { id: 'CF-06_self-excluded', url: '/games/double-side', player: 'excluded' },
  {
    id: 'CF-06_credits-error',
    url: '/games/double-side',
    player: 'fresh',
    failCredits: true,
    wait: 'text=Connection lost',
  },
  { id: 'CF-06_auto-play', url: '/games/double-side', player: 'fresh', wait: FLIP, auto: true },
];

async function playerFor(kind, lossLimit) {
  if (!kind) return null;
  const p = await newPlayer({ lossLimit });
  if (kind === 'played' || kind === 'played-rotated') await flips(p.token, 12);
  if (kind === 'played-rotated')
    await api('/games/double-side/seeds/rotate', { method: 'POST', token: p.token, body: {} });
  if (kind === 'loss-limit') {
    // lose a little first (DEMO credits), then set the daily loss limit to exactly the DEMO loss so far → "reached"
    for (let i = 0; i < 20; i++) {
      await flips(p.token, 1, '1.00');
      const c = await api('/games/credits', { token: p.token });
      if (String(c.session.today.net).startsWith('-')) {
        const amount = String(c.session.today.net).slice(1);
        await api('/responsible-gaming/limits', {
          method: 'PUT',
          token: p.token,
          body: { type: 'loss', period: 'day', amount },
        });
        break;
      }
    }
  }
  if (kind === 'broke') {
    // DEMO credits only: stake the whole balance until a flip loses (then 0.00 left → insufficient state)
    for (let i = 0; i < 12; i++) {
      const c = await api('/games/credits', { token: p.token });
      const [whole, frac = ''] = String(c.balance).split('.');
      const cents = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2)); // decimal string → cents (no floats)
      if (cents < 1000n) break;
      const stake =
        cents > 100000n ? '1000.00' : `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
      await flips(p.token, 1, stake).catch(() => undefined);
    }
  }
  if (kind === 'excluded')
    await api('/responsible-gaming/cooling-off', {
      method: 'POST',
      token: p.token,
      body: { duration: '24h', confirm: true },
    });
  return p;
}

const browser = await chromium.launch();
const problems = [];
try {
  for (const s of SCREENS) {
    if (only.length && !only.some((o) => s.id.startsWith(o))) continue;
    const player = await playerFor(s.player, s.lossLimit);
    if (player && s.region) player.region = true;
    for (const width of WIDTHS) {
      const ctx = await contextFor(browser, width, player, s.motion);
      if (s.holdCredits) await ctx.route('**/games/credits', () => undefined); // never answers → loading skeleton
      if (s.failCredits)
        await ctx.route('**/games/credits', (r) =>
          r.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable', statusCode: 503 },
            }),
          }),
        );
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${BASE}${s.url}`, {
        waitUntil: s.holdCredits ? 'domcontentloaded' : 'load',
        timeout: 180_000,
      });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(2000);
      const flipBtn = page.locator(FLIP).locator('visible=true').first();
      if (s.press) {
        await page
          .locator('body')
          .click({ position: { x: 5, y: 300 } })
          .catch(() => undefined);
        await page.keyboard.press(s.press);
        await page.waitForTimeout(400);
      }
      if (s.stake) {
        await page
          .getByRole('textbox', { name: /bet amount in demo credits/i })
          .first()
          .fill(s.stake);
        await page.keyboard.press('Tab');
      }
      if (s.auto) {
        await page.getByRole('radio', { name: 'auto' }).first().click();
        await page.waitForTimeout(300);
      }
      if (s.holdBet) {
        // hold the request so the "flipping — stake locked" state stays on screen (the real bet is never sent)
        await page.route('**/games/double-side/bets', () => undefined);
        await flipBtn.click();
        await page.waitForTimeout(600);
      }
      if (s.dropBets) {
        await page.route('**/games/double-side/bets', (r) =>
          r.request().method() === 'POST' ? r.abort('connectionreset') : r.continue(),
        );
        await flipBtn.click();
        await page.getByText('Connection lost — reconnecting').waitFor({ timeout: 30_000 });
        await page.waitForTimeout(400);
      }
      if (s.motion) {
        // real flip with motion on: capture the coin mid-turn (the result is already settled on the server)
        const answered = page.waitForResponse(
          (r) => r.request().method() === 'POST' && r.url().endsWith('/games/double-side/bets'),
        );
        // Space = keyboard flip (the page doesn't scroll to the button, so the coin stays in view)
        await page.locator('h1').first().click();
        await page.keyboard.press('Space');
        await answered;
        await page.waitForTimeout(650);
      }
      if (s.flip) {
        await flipBtn.click();
        await page.getByTestId('result-banner').waitFor({ timeout: 30_000 });
        await page.waitForTimeout(600);
      }
      if (s.expand) {
        await page
          .getByRole('button', { name: /^(Verify CF-\d+|CF-\d+)/ })
          .first()
          .click({ timeout: 30_000 })
          .catch(() => undefined);
        await page.waitForTimeout(400);
      }
      if (s.tamper) {
        const seed = page.getByTestId('verify-server-seed');
        const v = await seed.inputValue();
        await seed.fill(v.slice(0, 63));
        await page.getByTestId('verify-failed').waitFor({ timeout: 10_000 });
      }
      if (s.drawer) {
        await page
          .getByRole('button', { name: /CF-\d+: landed/ })
          .first()
          .click({ timeout: 30_000 });
        await page
          .getByText(/verified|doesn’t match/)
          .first()
          .waitFor({ timeout: 30_000 });
        await page.waitForTimeout(500);
      }
      if (!s.drawer && !s.motion) await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      const file = path.join(OUT, `${s.id}_${width}.png`);
      await page.screenshot({ path: file, fullPage: !s.drawer && !s.motion });
      const real = errors.filter(
        (e) =>
          !/Download the React DevTools|favicon|401|Failed to load resource|ERR_CONNECTION_RESET|status of 50[03]/.test(
            e,
          ),
      );
      if (overflow > 1) problems.push(`${s.id}@${width}: horizontal overflow ${overflow}px`);
      if (real.length)
        problems.push(`${s.id}@${width}: console errors: ${real.slice(0, 3).join(' | ')}`);
      console.info(
        `${s.id}_${width}.png${overflow > 1 ? ` (overflow ${overflow})` : ''}${real.length ? ` (${real.length} errors: ${real[0].slice(0, 300)})` : ''}`,
      );
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
