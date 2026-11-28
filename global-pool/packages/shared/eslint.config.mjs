import { createConfig } from '../../eslint.config.mjs';

// Money guardrail: no float parsing in shared money/fee code — use decimal.js helpers from src/money.ts.
const noFloatMoney = {
  files: ['src/**/*.ts'],
  rules: {
    'no-restricted-globals': [
      'error',
      {
        name: 'parseFloat',
        message: 'Money is never a JS float — use money()/parseUSDT() from src/money.ts.',
      },
    ],
    'no-restricted-properties': [
      'error',
      {
        object: 'Number',
        property: 'parseFloat',
        message: 'Money is never a JS float — use parseUSDT().',
      },
    ],
  },
};

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  typeChecked: true,
  extra: [noFloatMoney],
});
