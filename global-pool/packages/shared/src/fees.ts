/**
 * Fee rules. The platform fee (0.05 USDT per qualifying entry) is ALWAYS its own line item, separate from the
 * network fee. Pool balance = Σ entry amounts; platform fees go to the fee ledger, never to the pool.
 */
import { getChain, isChainKey, type ChainKey } from './chains';
import {
  MoneyError,
  USDT_SYMBOL,
  gte,
  isPositive,
  max,
  money,
  mul,
  parseUSDT,
  sub,
  toUSDTString,
  type MoneyInput,
} from './money';

/** Price of one Global Pool entry (USDT). */
export const ENTRY_PRICE = '10.00';
/** Platform fee per qualifying entry (USDT). */
export const PLATFORM_FEE_PER_ENTRY = '0.05';
/** Entries are paid from the platform balance: no network fee. */
export const ENTRY_NETWORK_FEE = '0.00';
/** Platform fee on withdrawals. */
export const PLATFORM_WITHDRAWAL_FEE = '0.00';
/** Cost of one entry including the platform fee (10.00 + 0.05 + 0.00 network). */
export const ENTRY_TOTAL_PER_ENTRY = '10.05';

export const MIN_ENTRIES_PER_PURCHASE = 1;
export const MAX_ENTRIES_PER_PURCHASE = 1000;

export type QuoteErrorCode = 'ENTRIES_OUT_OF_RANGE' | 'INVALID_AMOUNT' | 'UNKNOWN_NETWORK';

export class QuoteError extends Error {
  override readonly name = 'QuoteError';
  constructor(
    readonly code: QuoteErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface EntryQuote {
  entries: number;
  entryPrice: string;
  /** entries × entry price — goes to the round pool. */
  entryAmount: string;
  platformFeePerEntry: string;
  /** entries × 0.05 — goes to the fee ledger (never to the pool). */
  platformFee: string;
  networkFee: string;
  /** entryAmount + platformFee + networkFee — debited from Available. */
  total: string;
  currency: typeof USDT_SYMBOL;
}

/**
 * Quote a Global Pool entry purchase.
 * @example entryQuote(35) // { entryAmount: '350.00', platformFee: '1.75', networkFee: '0.00', total: '351.75', … }
 */
export function entryQuote(entries: number): EntryQuote {
  if (
    !Number.isInteger(entries) ||
    entries < MIN_ENTRIES_PER_PURCHASE ||
    entries > MAX_ENTRIES_PER_PURCHASE
  ) {
    throw new QuoteError(
      'ENTRIES_OUT_OF_RANGE',
      `Entries must be a whole number between ${MIN_ENTRIES_PER_PURCHASE} and ${MAX_ENTRIES_PER_PURCHASE}`,
    );
  }
  const entryAmount = mul(ENTRY_PRICE, entries);
  const platformFee = mul(PLATFORM_FEE_PER_ENTRY, entries);
  const total = entryAmount.plus(platformFee).plus(money(ENTRY_NETWORK_FEE));
  return {
    entries,
    entryPrice: ENTRY_PRICE,
    entryAmount: toUSDTString(entryAmount),
    platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
    platformFee: toUSDTString(platformFee),
    networkFee: ENTRY_NETWORK_FEE,
    total: toUSDTString(total),
    currency: USDT_SYMBOL,
  };
}

export interface WithdrawalQuote {
  network: ChainKey;
  amount: string;
  networkFee: string;
  platformFee: string;
  /** amount − networkFee − platformFee (never below 0.00). */
  youReceive: string;
  minWithdrawal: string;
  /** false when amount < minimum withdrawal or does not cover the fees — the request must be blocked. */
  meetsMinimum: boolean;
  currency: typeof USDT_SYMBOL;
}

export interface WithdrawalQuoteOptions {
  /** Live network-fee estimate from the API; defaults to the chain's typical (DEMO) fee. */
  networkFee?: MoneyInput;
}

/**
 * Quote a withdrawal: the network fee is deducted from the amount, the platform fee is 0.00.
 * @example withdrawalQuote('1500.00', 'arbitrum') // { networkFee: '0.08', platformFee: '0.00', youReceive: '1499.92', … }
 */
export function withdrawalQuote(
  amount: MoneyInput,
  network: ChainKey,
  options: WithdrawalQuoteOptions = {},
): WithdrawalQuote {
  if (!isChainKey(network))
    throw new QuoteError('UNKNOWN_NETWORK', `Unknown network "${String(network)}"`);
  let value;
  try {
    value = parseUSDT(amount);
  } catch (err) {
    throw new QuoteError(
      'INVALID_AMOUNT',
      err instanceof MoneyError ? err.message : 'Invalid amount',
    );
  }
  if (value.isNegative()) throw new QuoteError('INVALID_AMOUNT', 'Amount must not be negative');
  const chain = getChain(network);
  const networkFee = parseUSDT(options.networkFee ?? chain.typicalNetworkFee);
  const fees = networkFee.plus(money(PLATFORM_WITHDRAWAL_FEE));
  const receive = max(sub(value, fees), 0);
  return {
    network,
    amount: toUSDTString(value),
    networkFee: toUSDTString(networkFee),
    platformFee: PLATFORM_WITHDRAWAL_FEE,
    youReceive: toUSDTString(receive),
    minWithdrawal: chain.minWithdrawal,
    meetsMinimum: gte(value, chain.minWithdrawal) && isPositive(sub(value, fees)),
    currency: USDT_SYMBOL,
  };
}
