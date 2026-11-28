// Loads env files WITHOUT overriding variables that are already set (CI / docker / test env wins).
// Order: apps/api/.env, then the workspace root global-pool/.env (both git-ignored; template: .env.example).
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvFiles() {
  for (const file of [resolve(apiRoot, '.env'), resolve(apiRoot, '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  if (process.env.GP_USE_TEST_DB === '1' && process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  }
}

export { apiRoot };
