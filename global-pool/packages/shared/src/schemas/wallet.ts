import { z } from 'zod';

import { CHAIN_KEYS, getChain, isChainKey } from '../chains';
import { TX_STATUSES, TX_TYPES } from '../enums';
import { gte, isUSDTAmount } from '../money';
import { isValidAddressForChain } from './address';
import {
  idempotencyKeySchema,
  isoDateTimeSchema,
  paginationQuerySchema,
  positiveUsdtAmountSchema,
} from './common';
import { totpCodeSchema } from './auth';

/** Refinement helpers never throw, even when other fields already failed validation. */
function addressMatchesNetwork(network: unknown, address: unknown): boolean {
  return (
    isChainKey(network) && typeof address === 'string' && isValidAddressForChain(network, address)
  );
}
function meetsMinimum(
  network: unknown,
  amount: unknown,
  key: 'minWithdrawal' | 'minDeposit',
): boolean {
  if (!isChainKey(network) || !isUSDTAmount(amount)) return true; // field-level errors already reported
  return gte(amount, getChain(network)[key]);
}

export const chainKeySchema = z.enum(CHAIN_KEYS, { error: 'Choose a supported network' });

/** Only networks enabled in this deployment (MVP: Arbitrum Sepolia). */
export const enabledChainKeySchema = chainKeySchema.refine(
  (k) => isChainKey(k) && getChain(k).enabled,
  {
    error: 'This network is coming soon',
  },
);

/**
 * Withdrawal request. Address is validated per network family (EVM checksum via viem / Solana base58),
 * the network must be enabled and the amount must meet the minimum withdrawal.
 * Step-up 2FA: `totpCode` is required by the API whenever step-up is enforced.
 */
export const withdrawalRequestSchema = z
  .object({
    network: enabledChainKeySchema,
    address: z.string().trim().min(1, { error: 'Enter a destination address' }),
    amount: positiveUsdtAmountSchema,
    idempotencyKey: idempotencyKeySchema,
    totpCode: totpCodeSchema.optional(),
  })
  .refine((v) => addressMatchesNetwork(v.network, v.address), {
    error: 'This address is not valid for the selected network',
    path: ['address'],
  })
  .refine((v) => meetsMinimum(v.network, v.amount, 'minWithdrawal'), {
    error: `Minimum withdrawal is ${getChain('arbitrum').minWithdrawal} USDT`,
    path: ['amount'],
  });
export type WithdrawalRequest = z.infer<typeof withdrawalRequestSchema>;

/** Add a withdrawal address to the whitelist (24 h cool-down before first use; step-up 2FA). */
export const whitelistAddressSchema = z
  .object({
    network: enabledChainKeySchema,
    address: z.string().trim().min(1),
    label: z.string().trim().max(40).optional(),
    totpCode: totpCodeSchema.optional(),
  })
  .refine((v) => addressMatchesNetwork(v.network, v.address), {
    error: 'This address is not valid for the selected network',
    path: ['address'],
  });
export type WhitelistAddress = z.infer<typeof whitelistAddressSchema>;

/** Request (or fetch) the user's deposit address for a network. */
export const depositAddressRequestSchema = z.object({
  network: enabledChainKeySchema,
});

/**
 * DEMO-only dev endpoint: simulate a test-USDT deposit (never available with REAL_MONEY_ENABLED).
 * `mode: 'instant'` (default) credits at once; `'progressive'` records it as detected with 0 confirmations so the
 * pending → confirmation flow can be exercised (advance it with POST /dev/deposits/:reference/confirmations).
 */
export const demoDepositSimulationSchema = z
  .object({
    network: enabledChainKeySchema,
    amount: positiveUsdtAmountSchema,
    idempotencyKey: idempotencyKeySchema,
    mode: z.enum(['instant', 'progressive']).optional(),
  })
  .refine((v) => meetsMinimum(v.network, v.amount, 'minDeposit'), {
    error: `Minimum deposit is ${getChain('arbitrum').minDeposit} USDT`,
    path: ['amount'],
  });

/** DEMO-only: add simulated block confirmations to a progressive DEMO deposit (credited once N are reached). */
export const demoDepositAdvanceSchema = z.object({
  confirmations: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * GET /withdrawals/precheck — read-only risk validation (WAL-15) before step-up 2FA. The address is checked by the
 * service (an invalid address is reported as a failed check, not a 400).
 */
export const withdrawalPrecheckQuerySchema = z.object({
  network: enabledChainKeySchema,
  address: z.string().trim().min(1, { error: 'Enter a destination address' }).max(128),
  amount: positiveUsdtAmountSchema,
});
export type WithdrawalPrecheckQuery = z.infer<typeof withdrawalPrecheckQuerySchema>;

/** GET /transactions filters (+ pagination). */
export const transactionsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(TX_TYPES).optional(),
  status: z.enum(TX_STATUSES).optional(),
  network: chainKeySchema.optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
});
export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;
