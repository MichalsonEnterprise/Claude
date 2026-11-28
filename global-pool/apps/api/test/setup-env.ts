/**
 * Per-worker env for e2e: set test values FIRST (loadEnvFiles never overrides), then fill the rest (secrets) from
 * the .env files. Targets the dedicated test database (DATABASE_URL_TEST → globalpool_test).
 */
import { loadEnvFiles } from '../src/config/load-env';

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: process.env.E2E_LOG_LEVEL ?? 'silent',
  DEMO_MODE: 'true',
  REAL_MONEY_ENABLED: 'false',
  PRIVY_MOCK: 'true',
  JOBS_ENABLED: 'false',
  ROUND_AUTO_SCHEDULE: 'false',
  BULLMQ_PREFIX: 'gp-test',
  THROTTLE_LIMIT: '100000',
  ADMIN_LOGIN_THROTTLE_LIMIT: '100000',
  DEV_TOKEN_THROTTLE_LIMIT: '100000',
  DEV_COUNTRY_OVERRIDE: 'PT',
  TRUST_PROXY: 'false',
  RANDOMNESS_PROVIDER: 'mock',
  // No email jobs pile up in the test Redis; test/infra.e2e-spec.ts turns the console / SMTP transports on.
  MAIL_TRANSPORT: process.env.MAIL_TRANSPORT ?? 'disabled',
});
loadEnvFiles();
const testUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://postgres@127.0.0.1:5432/globalpool_test?schema=public';
process.env.DATABASE_URL = testUrl;
if (!/\/[A-Za-z0-9_]*_test(\?|$)/.test(testUrl)) {
  throw new Error(`Refusing to run e2e tests against a non-test database: ${testUrl}`);
}
