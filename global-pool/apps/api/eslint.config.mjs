import { createConfig } from '../../eslint.config.mjs';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  typeChecked: true,
  extra: [
    {
      files: ['**/*.ts'],
      languageOptions: {
        // Nest relies on decorator metadata: imports used in decorated signatures must stay value imports.
        parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
      },
      rules: {
        // Nest DI classes + zod DTO classes are often "empty" or static-only by design.
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/unbound-method': 'off',
      },
    },
    {
      files: ['**/*.spec.ts', 'test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    { ignores: ['dist/**', 'coverage/**', '.dev/**'] },
  ],
});
