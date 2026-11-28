import { createConfig } from '../../eslint.config.mjs';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  typeChecked: true,
  extra: [
    { ignores: ['lib/**', 'out/**', 'cache/**', 'broadcast/**', 'dist/**', 'node_modules/**'] },
    {
      // node:test's describe()/it() return promises that the test runner itself awaits.
      files: ['scripts/test/**/*.ts'],
      rules: { '@typescript-eslint/no-floating-promises': 'off' },
    },
  ],
});
