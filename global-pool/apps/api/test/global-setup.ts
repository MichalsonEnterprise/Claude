/**
 * Applies the Prisma migrations to the dedicated test database (globalpool_test) before the e2e run.
 * Non-destructive (`migrate deploy`): tests create uniquely named users / rounds, so no reset is needed.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function setup(): void {
  const apiRoot = resolve(__dirname, '..');
  const res = spawnSync(
    process.execPath,
    ['scripts/prisma.mjs', 'migrate', 'deploy', '--test-db'],
    {
      cwd: apiRoot,
      env: { ...process.env, GP_USE_TEST_DB: '1' },
      encoding: 'utf8',
    },
  );
  if (res.status !== 0) {
    throw new Error(`prisma migrate deploy (test DB) failed:\n${res.stdout}\n${res.stderr}`);
  }
}
