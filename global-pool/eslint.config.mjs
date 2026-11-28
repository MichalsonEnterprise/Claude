// GLOBAL POOL — shared ESLint flat config (typescript-eslint).
//
// Packages re-use it from their own eslint.config.mjs:
//
//   import { createConfig } from '../../eslint.config.mjs';
//   export default createConfig({ tsconfigRootDir: import.meta.dirname, typeChecked: true });
//
// `typeChecked: true` enables type-aware rules (no-floating-promises, no-misused-promises, …) for
// the package's TS files via the project service; JS/MJS files are always linted without types.
// Extra flat-config objects can be appended with `extra` (e.g. Next.js / React plugins in apps/web).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  // per-agent / per-job Next dist dirs (NEXT_DIST_DIR=.next-<key>)
  '**/.next-*/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.dev/**',
  '**/test-results/**',
  '**/playwright-report/**',
  '**/next-env.d.ts',
  'packages/contracts/lib/**',
  'packages/contracts/cache/**',
  'packages/contracts/out/**',
  'scripts/workflows/**',
];

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];
const JS_FILES = ['**/*.{js,jsx,mjs,cjs}'];

/** Rules every package shares (non type-aware). */
const baseRules = {
  eqeqeq: ['error', 'smart'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
};

/** Extra rules that need type information. */
const typeCheckedRules = {
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    { allowNumber: true, allowBoolean: true },
  ],
};

/**
 * @param {{
 *   tsconfigRootDir?: string,
 *   typeChecked?: boolean,
 *   extra?: import('eslint').Linter.Config[],
 * }} [options]
 */
export function createConfig(options = {}) {
  const { tsconfigRootDir, typeChecked = false, extra = [] } = options;

  return defineConfig(
    globalIgnores(ignores),
    js.configs.recommended,
    typeChecked ? tseslint.configs.recommendedTypeChecked : tseslint.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        globals: { ...globals.node, ...globals.es2021 },
        ...(typeChecked ? { parserOptions: { projectService: true, tsconfigRootDir } } : {}),
      },
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      rules: baseRules,
    },
    ...(typeChecked ? [{ files: TS_FILES, rules: typeCheckedRules }] : []),
    {
      // Plain JS (config files, build scripts): no type information.
      files: JS_FILES,
      extends: [tseslint.configs.disableTypeChecked],
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    ...extra,
    // Must stay last: turns off stylistic rules that Prettier owns.
    prettier,
  );
}

export default createConfig();
