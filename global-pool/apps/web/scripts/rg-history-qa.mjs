/* global document, window -- used inside page callbacks, which run in the browser */
// rg-history visual QA: full-page screenshots of the RG + history screens at 1440 and 390 against a running API.
// Usage: BASE_URL=http://localhost:3103 node scripts/rg-history-qa.mjs [filter]
// Env: QA_DID (default the seeded DEMO player did:privy:demo-nova-k), QA_WIDTHS (default "1440,390").
// Output: test-results/visual/rg-history/<name>_<width>.png (git-ignored). Fails on horizontal overflow / console errors.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3103';
const DID = process.env.QA_DID ?? 'did:privy:demo-nova-k';
const EMAIL = process.env.QA_EMAIL ?? 'nova.k@example.com';
const WIDTHS = (process.env.QA_WIDTHS ?? '1440,390').split(',').map(Number);
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual', 'rg-history');
mkdirSync(OUT, { recursive: true });
const filter = process.argv[2];

const PAGES = [
  ['rg1-hub', '/responsible-gaming'],
  ['rg2-deposit-limits', '/responsible-gaming/deposit-limits'],
  ['rg3-participation-limits', '/responsible-gaming/participation-limits'],
  ['rg4-time-limits', '/responsible-gaming/time-limits'],
  ['rg5-reality-checks', '/responsible-gaming/reality-checks'],
  ['rg6-cooling-off', '/responsible-gaming/cooling-off'],
  ['rg7-self-exclusion', '/responsible-gaming/self-exclusion'],
  ['f1-deposits', '/history/deposits'],
  ['f2-withdrawals', '/history/withdrawals'],
  ['f3-fees', '/history/fees'],
  ['f4-rewards', '/history/rewards'],
  ['f5-refunds', '/history/refunds'],
  ['f6-transactions', '/history/transactions'],
  ['g1-my-games', '/history/games'],
  ['g2-my-entries', '/history/games/entries'],
  ['g3-active-rounds', '/history/games/active'],
  ['g4-results', '/history/games/results'],
  ['g5-winnings', '/history/games/winnings'],
  ['g6-game-history', '/history/games/rounds'],
  ['g7-favourites', '/history/games/favourites'],
].filter(([name]) => !filter || name.includes(filter));

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
let failures = 0;
for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1000 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(
    ([did, email]) => {
      try {
        localStorage.setItem('gp.devMockSession', JSON.stringify({ did, email, wallet: null }));
      } catch {
        /* ignore */
      }
    },
    [DID, EMAIL],
  );
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    // resource failures are judged from the responses below (shell link prefetches of planned, not-yet-built
    // routes 404 by design and are not errors of these screens)
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('_rsc=')) errors.push(`${r.status()} ${r.url()}`);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [name, url] of PAGES) {
    errors.length = 0;
    // dev servers may abort a navigation while hot-reloading files other agents edit — retry once
    await page
      .goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 240_000 })
      .catch(() => page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 240_000 }));
    await page.waitForSelector('main h1', { timeout: 120_000 });
    // wait until loading skeletons are gone (auth + queries resolved)
    await page
      .waitForFunction(() => !document.querySelector('main [aria-busy="true"]'), null, { timeout: 60_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    const file = path.join(OUT, `${name}_${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const bad = overflow > 1 || errors.length > 0;
    if (bad) failures += 1;
    console.info(
      `${bad ? 'FAIL' : 'ok  '} ${name}_${width}${overflow > 1 ? ` overflow=${overflow}px` : ''}${
        errors.length ? ` errors=${JSON.stringify(errors.slice(0, 3))}` : ''
      }`,
    );
  }
  await context.close();
}
await browser.close();
if (failures) {
  console.error(`${failures} screen(s) failed`);
  process.exitCode = 1;
}
