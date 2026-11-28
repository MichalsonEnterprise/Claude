import { defineConfig } from 'tsup';

/** One entry per public sub-path (see package.json "exports"). */
const entries = ['money', 'fees', 'chains', 'enums', 'pool', 'limits', 'format', 'types'] as const;

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    schemas: 'src/schemas/index.ts',
    demo: 'src/demo/index.ts',
    ...Object.fromEntries(entries.map((e) => [e, `src/${e}.ts`])),
  },
  format: ['esm', 'cjs'],
  dts: true,
  // Shared chunks so every entry point uses the same module instances (instanceof MoneyError works across imports).
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  platform: 'neutral',
  external: ['decimal.js', 'viem', 'zod'],
});
