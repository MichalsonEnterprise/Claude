#!/usr/bin/env node
/* global document, window -- used inside page.evaluate() / addInitScript callbacks, which run in the browser */
/**
 * Orbit Rush visual QA (key "crash", CR-01 … CR-08) against a RUNNING web + API whose crash loop runs
 * (CRASH_LOOP_ENABLED=true): live rounds over socket.io /crash, DEV MOCK auth, a fresh DEMO player per screen. Live
 * states (bets open, running, cashed out, crashed) are captured from REAL rounds — nothing is mocked except the
 * region gate preview. Fails on horizontal overflow and console errors.
 * Output: test-results/visual/games/crash/<screen>_<width>.png
 *
 *   BASE_URL=http://localhost:3115 API_URL=http://localhost:4215 node scripts/games-crash-qa.mjs [screen-prefix…]
 *   WIDTHS=1440,1280,768,390 … for the in-between widths.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3115';
const API = process.env.API_URL ?? 'http://localhost:4215';
const OUT = path.resolve(import.meta.dirname, '../test-results/visual/games/crash');
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

async function newPlayer({ lossLimit } = {}) {
  const did = `did:privy:qa-cr-${uniq()}`;
  const { token } = await api('/auth/dev/token', { method: 'POST', body: { did } });
  await api('/auth/session', { method: 'POST', token });
  await api('/auth/onboarding', {
    method: 'POST',
    token,
    body: {
      handle: `cr_${uniq()}`,
      country: 'PT',
      consents: { ageConfirmed: true, jurisdictionConfirmed: true, termsAccepted: true, privacyAccepted: true, marketingOptIn: false },
    },
  });
  if (lossLimit)
    await api('/responsible-gaming/limits', { method: 'PUT', token, body: { type: 'loss', period: 'day', amount: lossLimit } });
  return { did, token };
}

const dice = (token, stake) =>
  api('/games/pool-dice/bets', {
    method: 'POST',
    token,
    body: { stake, params: { target: '98.00', condition: 'over' }, idempotencyKey: `qa-cr-${uniq()}` },
  });

async function playerFor(kind) {
  if (!kind) return null;
  const p = await newPlayer({ lossLimit: kind === 'fresh' ? '200.00' : undefined });
  if (kind === 'broke') {
    // DEMO credits only (no cash value): lose all but 4.20 with 2 %-chance dice rolls (re-tries the rare win)
    for (let i = 0; i < 4; i++) {
      const b = await dice(p.token, '995.80').catch(() => null);
      if (!b || !b.win) break;
    }
  }
  if (kind === 'loss-limit') {
    await api('/responsible-gaming/limits', { method: 'PUT', token: p.token, body: { type: 'loss', period: 'day', amount: '1.00' } });
    for (let i = 0; i < 40; i++) {
      try {
        await dice(p.token, '0.50');
      } catch {
        break;
      }
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
    reducedMotion: 'reduce',
  });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem('gp.ageGate', JSON.stringify({ confirmedAt: new Date().toISOString(), country: 'PT' }));
    } catch {
      // storage unavailable: the gate simply asks
    }
  });
  if (player) {
    await ctx.addCookies([{ name: 'privy-token', value: player.token, domain: new URL(BASE).hostname, path: '/' }]);
    await ctx.addInitScript(([did]) => window.localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email: null, wallet: null })), [
      player.did,
    ]);
  }
  if (s.region)
    await ctx.route('**/auth/account-status', async (r) => {
      const res = await r.fetch();
      const body = await res.json();
      const us = { code: 'US', name: 'United States', permitted: false };
      await r.fulfill({ response: res, json: { ...body, gate: 'region', region: { current: us, declared: body.region?.declared ?? null, permitted: false } } });
    });
  if (s.slow) {
    await ctx.route('**/games/orbit-rush/state', async (r) => {
      await new Promise((res) => setTimeout(res, 20_000));
      await r.continue().catch(() => undefined);
    });
    await ctx.routeWebSocket(/\/socket\.io\//, () => undefined); // never answers → no live snapshot yet
  }
  if (s.offline) {
    // proxy the live socket so the test can really drop it later (Chromium's offline mode keeps open WebSockets)
    ctx.qaSockets = [];
    ctx.qaDropped = false;
    await ctx.routeWebSocket(/\/socket\.io\//, (ws) => {
      if (ctx.qaDropped) return ws.close({ code: 4000, reason: 'qa: connection lost' });
      ws.connectToServer();
      ctx.qaSockets.push(ws);
    });
  }
  await ctx.route('**/auth/new-device-alerts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  return ctx;
}

const P = '/games/orbit-rush';
const SCREENS = [
  { id: 'CR-01_bets-open', url: P, player: 'fresh', live: 'betting' },
  { id: 'CR-01_guest', url: P, player: null, live: 'any' },
  { id: 'CR-01_loading', url: P, player: 'fresh', slow: true },
  { id: 'CR-02_running', url: P, player: 'fresh', bet: '50.00', until: 'running' },
  { id: 'CR-03_cashed-out', url: P, player: 'fresh', bet: '1.20', until: 'cashed' },
  { id: 'CR-04_result-win', url: P, player: 'fresh', bet: '1.10', until: 'crashed-win' },
  { id: 'CR-04_result-lost', url: P, player: 'fresh', bet: '50.00', until: 'crashed-lose' },
  { id: 'CR-05_history', url: `${P}/rounds`, player: 'fresh' },
  { id: 'CR-05_my-bets', url: `${P}/my-bets`, player: 'fresh', preBet: true },
  { id: 'CR-06_autoplay', url: P, player: 'fresh', autoplay: true },
  { id: 'CR-07_verified', url: `${P}/fairness`, player: 'fresh', waitText: /Verified — the crash point/ },
  { id: 'CR-07_mismatch', url: `${P}/fairness`, player: 'fresh', waitText: /Verified — the crash point/, tamper: true },
  { id: 'CR-08_connection-lost', url: P, player: 'fresh', bet: '50.00', until: 'running', offline: true },
  { id: 'CR-08_insufficient', url: P, player: 'broke', live: 'any' },
  { id: 'CR-08_loss-limit', url: P, player: 'loss-limit' },
  { id: 'CR-08_region', url: P, player: 'fresh', region: true },
  { id: 'CR-08_self-excluded', url: P, player: 'excluded' },
];

const visible = (page, sel) => page.locator(sel).locator('visible=true').first();

/** Wait for a betting window with at least `minS` seconds left (real server rounds). */
async function bettingWindow(page, minS = 3) {
  for (let i = 0; i < 12; i++) {
    await page.waitForSelector('[data-testid="crash-game"][data-phase="betting"][data-link="live"]', { timeout: 90_000 });
    const t = await page.getByTestId('betting-countdown').first().textContent().catch(() => '');
    const left = Number(/([\d.]+) s/.exec(t ?? '')?.[1] ?? '0');
    if (left >= minS) return;
    await page.waitForSelector('[data-testid="crash-game"]:not([data-phase="betting"])', { timeout: 60_000 });
  }
  throw new Error('no betting window');
}

async function placeBet(page, target) {
  await bettingWindow(page);
  const input = visible(page, '[data-testid="target-input"]');
  await input.fill(target);
  await input.blur();
  await visible(page, '[data-testid="crash-cta"]').click();
  await page.waitForSelector('[data-testid="my-live-bet"]', { timeout: 15_000 });
}

/** Place bets until the wanted live state shows (a round may crash before the state we want — try the next one). */
async function reach(page, s) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await placeBet(page, s.bet);
    // poll the game root: phase, my bet in THIS round (data-my) and the multiplier readout
    const outcome = await page.waitForFunction(
      (until) => {
        const g = document.querySelector('[data-testid="crash-game"]');
        if (!g) return null;
        const phase = g.getAttribute('data-phase');
        const my = g.getAttribute('data-my');
        const m = Number(document.querySelector('[data-testid="crash-multiplier"]')?.textContent?.replace(/[^\d.]/g, '') ?? '0');
        if (until === 'running') {
          if (phase === 'running' && my === 'active' && m >= 1.5) return 'ok';
          if (my === 'lost' || my === 'cashed_out') return 'retry';
        } else if (until === 'cashed') {
          if (phase === 'running' && my === 'cashed_out') return 'ok';
          if (my === 'lost') return 'retry';
        } else {
          const want = until === 'crashed-win' ? 'cashed_out' : 'lost';
          if (phase === 'crashed' && my === want && document.querySelector('[data-testid="crash-result"]')) return 'ok';
          if (phase === 'crashed' && my && my !== 'active' && my !== 'none' && my !== want) return 'retry';
        }
        return null;
      },
      s.until,
      { timeout: 150_000, polling: 100 },
    );
    if ((await outcome.jsonValue()) === 'ok') {
      if (s.until === 'cashed') await page.waitForTimeout(800);
      return;
    }
    await page.waitForSelector('[data-testid="crash-game"][data-phase="crashed"]', { timeout: 120_000 }).catch(() => undefined);
  }
  throw new Error(`state ${s.until} not reached`);
}

const browser = await chromium.launch();
const problems = [];
try {
  for (const s of SCREENS) {
    if (only.length && !only.some((o) => s.id.startsWith(o))) continue;
    for (const width of WIDTHS) {
      const mobile = width < 768;
      const player = await playerFor(s.player);
      if (s.preBet && player) {
        // two real crash bets in two betting windows (REST, same rules as the socket)
        for (let i = 0; i < 2; i++) {
          for (;;) {
            const st = await api('/games/orbit-rush/state');
            const left = st.round && st.round.status === 'betting' ? Date.parse(st.round.startedAt) - Date.parse(st.serverTime) : 0;
            if (left > 1500) break;
            await new Promise((r) => setTimeout(r, 500));
          }
          await api('/games/orbit-rush/bets', {
            method: 'POST',
            token: player.token,
            body: { stake: i ? '5.00' : '10.00', autoCashOut: i ? '1.01' : '50.00', currency: 'DEMO', idempotencyKey: `qa-cr-${uniq()}` },
          });
          await new Promise((r) => setTimeout(r, 11_000));
        }
      }
      const ctx = await contextFor(browser, width, player, s);
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      try {
        await page.goto(`${BASE}${s.url}`, { waitUntil: 'load', timeout: 120_000 });
        if (s.url === P && !s.slow) await page.waitForSelector('[data-testid="crash-game"][data-link="live"]', { timeout: 60_000 });
        if (s.live === 'betting') {
          await bettingWindow(page, 4);
          await page.waitForTimeout(800);
        } else if (s.live === 'any') {
          await page.waitForTimeout(2000);
        }
        if (s.bet) await reach(page, s);
        if (s.offline) {
          ctx.qaDropped = true;
          await ctx.setOffline(true);
          for (const ws of ctx.qaSockets) await ws.close({ code: 4000, reason: 'qa: connection lost' }).catch(() => undefined);
          await page.getByTestId('crash-connection-banner').waitFor({ timeout: 30_000 });
          await page.waitForTimeout(2500);
        }
        if (s.autoplay) {
          await page.getByRole('radio', { name: 'auto' }).first().click();
          await visible(page, '[data-testid="autoplay-open"]').click();
          await page.getByRole('dialog').waitFor();
          await page.waitForTimeout(500);
        }
        if (s.waitText) await page.getByText(s.waitText).first().waitFor({ timeout: 60_000 });
        if (s.tamper) {
          const seed = page.getByTestId('verify-seed');
          const v = await seed.inputValue();
          await seed.fill(`${v.slice(0, -1)}${v.endsWith('0') ? '1' : '0'}`);
          await page.waitForTimeout(300);
        }
        if (s.slow || (!s.url.endsWith(P) && !s.live && !s.bet)) await page.waitForTimeout(s.slow ? 2500 : 2000);
        if (!s.autoplay) await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (mobile && s.url === P) {
          // live states first (a round moves on while a full page is captured): the viewport with the stage
          const stage = page.getByTestId('crash-multiplier');
          if (await stage.count()) {
            await stage.first().scrollIntoViewIfNeeded();
            await page.evaluate(() => window.scrollBy(0, -140));
          }
          await page.screenshot({ path: path.join(OUT, `${s.id}_${width}_vp.png`) });
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        await page.screenshot({ path: path.join(OUT, `${s.id}_${width}.png`), fullPage: !s.autoplay && !(mobile && s.offline) });
        const real = errors.filter(
          (e) => !/Download the React DevTools|favicon|401|Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION|net::ERR|WebSocket/.test(e),
        );
        if (overflow > 1) problems.push(`${s.id}@${width}: horizontal overflow ${overflow}px`);
        if (real.length) problems.push(`${s.id}@${width}: console errors: ${real.slice(0, 3).join(' | ')}`);
        console.info(`${s.id}_${width}.png${overflow > 1 ? ` (overflow ${overflow})` : ''}${real.length ? ` (${real.length} errors: ${real[0].slice(0, 2000)})` : ''}`);
      } catch (err) {
        problems.push(`${s.id}@${width}: ${String(err).slice(0, 300)}`);
        await page.screenshot({ path: path.join(OUT, `${s.id}_${width}_FAILED.png`), fullPage: true }).catch(() => undefined);
        console.info(`${s.id}_${width} FAILED: ${String(err).slice(0, 200)}`);
      } finally {
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exitCode = 1;
}
