/**
 * @gp/shared — contracts shared by apps/web and apps/api: money & fee helpers (decimal.js, never floats),
 * chain config (testnet only), enums, zod schemas, domain types and typed DEMO data.
 *
 * Sub-path imports are available for smaller bundles: @gp/shared/money, /fees, /chains, /enums, /pool,
 * /limits, /format, /schemas, /types, /demo.
 */
export * from './chains';
export * from './demo';
export * from './enums';
export * from './fees';
export * from './format';
export * from './limits';
export * from './money';
export * from './pool';
export * from './schemas';
export type * from './types';
