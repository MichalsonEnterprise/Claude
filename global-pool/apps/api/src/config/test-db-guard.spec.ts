import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * R46: `--test-db` (e2e global setup, `db:migrate:test` = migrate RESET) must never fall back to the dev
 * DATABASE_URL, and must refuse any database whose name does not end in `_test`. Runs the real wrapper scripts in
 * a child process; prisma itself is never reached when the guard refuses.
 */
const apiRoot = resolve(__dirname, '../..');
const DEV_URL = 'postgresql://postgres@127.0.0.1:5432/globalpool?schema=public';

function run(args: string[], env: Record<string, string>) {
  return spawnSync(process.execPath, args, {
    cwd: apiRoot,
    // Explicit values win over the .env files (loadEnvFiles never overrides a set variable).
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

describe('prisma wrapper --test-db guard (R46)', () => {
  it('refuses a DATABASE_URL_TEST that is not a *_test database, before prisma runs', () => {
    const res = run(['scripts/prisma.mjs', 'migrate', 'status', '--test-db'], {
      DATABASE_URL: DEV_URL,
      DATABASE_URL_TEST: DEV_URL,
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Refusing to use a non-test database for --test-db: "globalpool"/);
    expect(res.stdout).not.toMatch(/migrations? found/i);
  });

  it('uses the e2e default test database (never the dev DATABASE_URL) when DATABASE_URL_TEST is unset', () => {
    const script = [
      "process.env.GP_USE_TEST_DB = '1';",
      `const m = await import(${JSON.stringify(resolve(apiRoot, 'scripts/env.mjs'))});`,
      'm.loadEnvFiles();',
      'console.log(process.env.DATABASE_URL);',
    ].join('\n');
    const res = run(['--input-type=module', '-e', script], {
      DATABASE_URL: DEV_URL,
      DATABASE_URL_TEST: '',
    });
    expect(res.stderr).toBe('');
    expect(res.stdout.trim()).toBe(
      'postgresql://postgres@127.0.0.1:5432/globalpool_test?schema=public',
    );
  });
});
