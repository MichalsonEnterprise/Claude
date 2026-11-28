import { defineConfig, devices } from '@playwright/test';

/**
 * E2E flows (apps/web/e2e/<module>.spec.ts) against an already running web + API — nothing is started here, so
 * parallel agents / CI can point at their own ports:
 *   E2E_BASE_URL=http://localhost:3101 E2E_API_URL=http://localhost:4101 pnpm --filter @gp/web test:e2e -- e2e/auth.spec.ts
 * Chromium comes from the preinstalled PLAYWRIGHT_BROWSERS_PATH (do not run `playwright install`).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    navigationTimeout: 90_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
  ],
});
