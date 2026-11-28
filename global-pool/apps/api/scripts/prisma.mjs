#!/usr/bin/env node
// Prisma CLI wrapper: loads .env files (no override) so `DATABASE_URL` comes from global-pool/.env.
// `--test-db` targets DATABASE_URL_TEST (globalpool_test) instead of DATABASE_URL.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { apiRoot, loadEnvFiles } from './env.mjs';

const args = process.argv.slice(2);
const testIdx = args.indexOf('--test-db');
if (testIdx >= 0) {
  args.splice(testIdx, 1);
  process.env.GP_USE_TEST_DB = '1';
}
try {
  loadEnvFiles();
} catch (err) {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
}

const require = createRequire(import.meta.url);
const cli = require.resolve('prisma/build/index.js', { paths: [apiRoot] });
process.env.PRISMA_HIDE_UPDATE_MESSAGE ??= '1';
const res = spawnSync(process.execPath, [cli, ...args], {
  stdio: 'inherit',
  cwd: apiRoot,
  env: process.env,
});
process.exit(res.status ?? 1);
