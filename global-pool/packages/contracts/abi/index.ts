/**
 * @gp/contracts/abi — typed ABIs and on-chain constants for the GLOBAL POOL round registry.
 * DEMO / testnet only: the MVP chain is Arbitrum Sepolia (421614); no mainnet addresses exist.
 */
export { globalPoolRoundsAbi, type GlobalPoolRoundsAbi } from './GlobalPoolRounds';

/** `GlobalPoolRounds.RoundStatus` (uint8 on the wire). */
export const RoundStatus = {
  None: 0,
  Open: 1,
  Committed: 2,
  DrawRequested: 3,
  Fulfilled: 4,
  Settled: 5,
  Cancelled: 6,
} as const;
export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus];

/** `GlobalPoolRounds.REASON_*` cancel reason codes. */
export const CancelReason = {
  ThresholdsNotMet: 1,
  Operational: 2,
  Compliance: 3,
  Other: 4,
} as const;
export type CancelReason = (typeof CancelReason)[keyof typeof CancelReason];

/** All amounts in the contract are USDT base units with this many decimals (accounting only, no token custody). */
export const ACCOUNTING_DECIMALS = 6;

/** Target chain for the MVP. */
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
