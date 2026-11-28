import { defineConfig } from 'tsup';

/**
 * Builds the consumer-facing entry points (see package.json "exports"):
 *   @gp/contracts/abi     typed `as const` ABI + status/reason enums
 *   @gp/contracts/verify  leaf encodings, Merkle trees, winner derivation, prize split (mirror of DrawMath.sol)
 */
export default defineConfig({
  entry: {
    abi: 'abi/index.ts',
    verify: 'scripts/lib/verify.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  platform: 'neutral',
  external: ['viem', '@openzeppelin/merkle-tree'],
});
