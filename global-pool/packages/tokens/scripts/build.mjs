#!/usr/bin/env node
// @ts-check
// Build @gp/tokens: tokens.json → dist/{tokens.css, theme.css, text-styles.css, index.js, index.cjs, index.d.ts, index.d.cts}
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateAll } from './generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const outDir = join(root, 'dist');
mkdirSync(outDir, { recursive: true });

const files = generateAll(tokens);
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content);
}
console.info(
  `@gp/tokens: wrote ${Object.keys(files).length} files to dist/ (${Object.keys(files).join(', ')})`,
);
