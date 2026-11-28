import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/** Unit tests (no DB / Redis). SWC is required for Nest decorator metadata. */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
  },
});
