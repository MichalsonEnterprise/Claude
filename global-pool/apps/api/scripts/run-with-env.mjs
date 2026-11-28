#!/usr/bin/env node
// Runs a command (e.g. `tsx prisma/seed.ts`) with the .env files loaded (no override).
import { spawnSync } from 'node:child_process';

import { apiRoot, loadEnvFiles } from './env.mjs';

loadEnvFiles();
const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: run-with-env.mjs <command> [...args]');
  process.exit(2);
}
const res = spawnSync(cmd, rest, { stdio: 'inherit', cwd: apiRoot, env: process.env, shell: false });
process.exit(res.status ?? 1);
