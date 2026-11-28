/* global document -- used inside page.evaluate() callbacks, which run in the browser */
// Visual QA: Playwright screenshots of the design system and the live shell at the token breakpoints.
// Usage: pnpm --filter @gp/web start  (in another shell)  →  pnpm --filter @gp/web visual
// Env: BASE_URL (default http://localhost:3000). Output: test-results/visual/*.png (git-ignored).
// Uses the globally installed `playwright` (chromium preinstalled — do not run `playwright install`).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { presetAgeGate } from './lib/age-gate.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = path.join(import.meta.dirname, '..', 'test-results', 'visual');
mkdirSync(OUT, { recursive: true });

/** [name, path, width, height, options] */
const SHOTS = [
  ['design-system_1440', '/design-system', 1440, 1024, { fullPage: true }],
  ['design-system_390', '/design-system', 390, 844, { fullPage: true }],
  ['shell-guest_1440', '/design-system/shell?auth=guest', 1440, 1024, {}],
  ['shell-member_1440', '/design-system/shell?auth=member', 1440, 1024, {}],
  ['shell-member-full_1440', '/design-system/shell?auth=member', 1440, 1024, { fullPage: true }],
  ['shell-member-rail_1180', '/design-system/shell?auth=member', 1180, 900, {}],
  ['shell-member-drawer-topbar_900', '/design-system/shell?auth=member', 900, 900, {}],
  [
    'shell-wrong-network_1440',
    '/design-system/shell?auth=member&state=wrong-network',
    1440,
    600,
    {},
  ],
  ['shell-restricted_1440', '/design-system/shell?auth=guest&state=restricted', 1440, 900, {}],
  ['shell-guest_390', '/design-system/shell?auth=guest', 390, 844, {}],
  ['shell-member_390', '/design-system/shell?auth=member', 390, 844, {}],
  ['shell-member-full_390', '/design-system/shell?auth=member', 390, 844, { fullPage: true }],
  ['shell-drawer-open_390', '/design-system/shell?auth=member', 390, 844, { openDrawer: true }],
  ['lobby_1440', '/', 1440, 1024, {}],
  ['lobby_390', '/', 390, 844, {}],
];

const browser = await chromium.launch();
const problems = [];
const missingRoutes = new Set();
for (const [name, url, width, height, opts] of SHOTS) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  // PUB-22: guest shots show the page, not the age-gate modal (members never get the gate).
  await presetAgeGate(context, BASE);
  const page = await context.newPage();
  const errors = [];
  const missing = new Set();
  // 404s from <Link> prefetches of routes later agents will build are expected; list them separately.
  page.on('response', (r) => r.status() === 404 && missing.add(new URL(r.url()).pathname));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource'))
      errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);
  if (opts.openDrawer) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.waitForTimeout(450);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 0) problems.push(`${name}: horizontal overflow ${overflow}px`);
  if (errors.length) problems.push(`${name}: console errors → ${errors.slice(0, 3).join(' | ')}`);
  for (const m of missing) missingRoutes.add(m);
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: Boolean(opts.fullPage),
    animations: 'disabled',
  });
  console.info(`✓ ${name} (${width}×${height})`);
  await context.close();
}
await browser.close();
if (missingRoutes.size) {
  console.info(
    `\nRoutes not built yet (404 on prefetch, expected): ${[...missingRoutes].sort().join(', ')}`,
  );
}
if (problems.length) {
  console.warn(`\n${problems.length} issue(s):\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.info('\nNo horizontal overflow or console errors.');
}
