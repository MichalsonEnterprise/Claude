import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { createConfig } from '../../eslint.config.mjs';

const TSX = ['**/*.{ts,tsx}'];

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  typeChecked: true,
  extra: [
    {
      files: TSX,
      languageOptions: { globals: { ...globals.browser } },
    },
    { ...nextPlugin.flatConfig.coreWebVitals, files: TSX },
    { ...reactHooks.configs['recommended-latest'], files: TSX },
    { ...jsxA11y.flatConfigs.recommended, files: ['**/*.tsx'] },
    {
      files: TSX,
      rules: {
        // React event handlers may return promises (form submit, async onClick).
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
        // Money is never a JS float (DEV_CONVENTIONS): use @gp/shared/money helpers.
        'no-restricted-globals': [
          'error',
          { name: 'parseFloat', message: 'Money is never a JS float — use @gp/shared/money.' },
        ],
      },
    },
  ],
});
