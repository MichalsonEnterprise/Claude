/* global document, window -- used inside page.evaluate() callbacks, which run in the browser */
// Homepage (PUB-01 / MOB-03) visual QA: full-page screenshots of every state at 1440 and 390, plus
// side-by-side section crops against the Figma reference render.
// Usage: NEXT_PUBLIC_STATE_PREVIEW=true pnpm --filter @gp/web build && pnpm --filter @gp/web start
//        → pnpm --filter @gp/web visual:home        (env BASE_URL, REF=path to the 1440 reference PNG)
// Output: test-results/visual/home-*.png (git-ignored). Uses the global `playwright` (chromium preinstalled).
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual');
const REF =
  process.env.REF ??
  path.join(
    import.meta.dirname,
    '../../../../design/reference/home/PUB-01_home_1440_guest_active-round_full.png',
  );
mkdirSync(OUT, { recursive: true });

const STATES = [
  ['guest', '/'],
  ['member', '/?state=member'],
  ['restricted', '/?state=restricted'],
  ['no-round', '/?state=no-round'],
];
const WIDTHS = (process.env.WIDTHS ?? '1440,390').split(',').map(Number);
const ONLY = process.env.ONLY?.split(',');

const browser = await chromium.launch();
const problems = [];
const sections = {};
for (const [state, url] of STATES) {
  if (ONLY && !ONLY.includes(state)) continue;
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 1024 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource'))
        errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 0) problems.push(`${state}@${width}: horizontal overflow ${overflow}px`);
    if (errors.length)
      problems.push(`${state}@${width}: console errors → ${errors.slice(0, 3).join(' | ')}`);
    if (state === 'guest' && width === 1440) {
      sections.y = await page.evaluate(() =>
        Object.fromEntries(
          [
            ...document.querySelectorAll(
              'main section, main [aria-roledescription=carousel], footer',
            ),
          ].map((el) => [
            el.id || el.getAttribute('aria-labelledby') || el.tagName,
            Math.round(el.getBoundingClientRect().top + window.scrollY),
          ]),
        ),
      );
      sections.height = await page.evaluate(() => document.documentElement.scrollHeight);
    }
    const file = path.join(OUT, `home-${state}_${width}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
    console.info(`✓ home-${state}_${width}`);
    await context.close();
  }
}
await browser.close();
console.info('section tops (guest 1440):', JSON.stringify(sections));
if (!existsSync(REF)) console.info(`(reference not found at ${REF})`);
if (problems.length) {
  console.error('\nProblems:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exitCode = 1;
} else console.info('\nNo horizontal overflow, no console errors.');
