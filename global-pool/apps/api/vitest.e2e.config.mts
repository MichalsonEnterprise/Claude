import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * E2E tests: the full Nest app over HTTP (supertest) against the `globalpool_test` database (migrations re-applied
 * from scratch by the global setup) and local Redis (separate BullMQ prefix).
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-env.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
