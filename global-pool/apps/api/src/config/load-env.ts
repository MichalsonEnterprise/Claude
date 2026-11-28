import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Find the @gp/api package root by walking up from `start` (works from src/ and from dist/src/). */
export function findApiRoot(start = __dirname): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const pkg = resolve(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if ((JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }).name === '@gp/api')
          return dir;
      } catch {
        // keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Load apps/api/.env and global-pool/.env WITHOUT overriding variables that are already set
 * (docker / CI / test env wins). Missing files are skipped (production uses real env vars).
 */
export function loadEnvFiles(apiRoot = findApiRoot()): void {
  for (const file of [resolve(apiRoot, '.env'), resolve(apiRoot, '../../.env')]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
