/**
 * Shared Prettier config for every GLOBAL POOL package (Prettier resolves it by walking up from each file).
 * @type {import('prettier').Config}
 */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  overrides: [{ files: '*.sol', options: { tabWidth: 4, printWidth: 120 } }],
};

export default config;
