/**
 * Applies the Prisma migrations to the dedicated test database (globalpool_test) before the e2e run.
 * Non-destructive (`migrate deploy`): tests create uniquely named users / rounds, so no reset is needed.
 * The prisma wrapper's `--test-db` refuses any database whose name does not end in `_test`.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Shared-state repair before the run: the NEW-entries kill switch is a single global row. A run killed while it was
 * paused (circuit-breaker e2e) would otherwise make every entry purchase in every later run answer 503.
 */
const RESET_SQL = `UPDATE "feature_flags" SET "enabled" = true, "updated_at" = now()
  WHERE "key" = 'pool.entries.enabled' AND "enabled" = false;`;

function prisma(apiRoot: string, args: string[], input?: string) {
  const res = spawnSync(process.execPath, ['scripts/prisma.mjs', ...args, '--test-db'], {
    cwd: apiRoot,
    env: { ...process.env, GP_USE_TEST_DB: '1' },
    encoding: 'utf8',
    ...(input !== undefined ? { input } : {}),
  });
  if (res.status !== 0) {
    throw new Error(`prisma ${args.join(' ')} (test DB) failed:\n${res.stdout}\n${res.stderr}`);
  }
}

export default function setup(): void {
  const apiRoot = resolve(__dirname, '..');
  prisma(apiRoot, ['migrate', 'deploy']);
  prisma(apiRoot, ['db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'], RESET_SQL);
}
