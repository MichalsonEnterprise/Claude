// Loads env files WITHOUT overriding variables that are already set (CI / docker / test env wins).
// Order: apps/api/.env, then the workspace root global-pool/.env (both git-ignored; template: .env.example).
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Same default as test/setup-env.ts (the e2e workers). */
export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://postgres@127.0.0.1:5432/globalpool_test?schema=public';

/** Database name of a postgres URL ('' when it cannot be parsed). */
export function databaseName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
}

/**
 * The test database URL: DATABASE_URL_TEST, else the e2e default. Never falls back to DATABASE_URL (the dev DB), and
 * refuses any database whose name does not end in `_test` — `migrate reset --test-db` drops everything in it.
 */
export function testDatabaseUrl(env = process.env) {
  const url = env.DATABASE_URL_TEST || DEFAULT_TEST_DATABASE_URL;
  if (!/_test$/.test(databaseName(url))) {
    throw new Error(
      `Refusing to use a non-test database for --test-db: "${databaseName(url) || url}" (DATABASE_URL_TEST must name a database ending in _test)`,
    );
  }
  return url;
}

export function loadEnvFiles() {
  for (const file of [resolve(apiRoot, '.env'), resolve(apiRoot, '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  if (process.env.GP_USE_TEST_DB === '1') {
    process.env.DATABASE_URL = testDatabaseUrl();
  }
}

export { apiRoot };
