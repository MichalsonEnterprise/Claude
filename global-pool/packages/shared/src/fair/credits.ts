/**
 * DEMO credits — the only currency games accept.
 *
 * DEMO credits are a per-user PLAY balance with NO cash value: never bought, never withdrawn, never converted
 * to / from USDT and never written to the USDT ledger, wallet balances, pool or fee ledgers. There is no
 * platform fee on game bets (the 0.05 USDT fee is Global Pool only), so every bet panel shows "Fees 0.00".
 */
import { Decimal } from 'decimal.js';

import { money, roundDown, type Money, type MoneyInput } from '../money';
import { FairError } from './stream';

export const DEMO_CREDITS_CURRENCY = 'DEMO' as const;
export type DemoCreditsCurrency = typeof DEMO_CREDITS_CURRENCY;
/** Label every UI surface must show next to DEMO credit amounts. */
export const DEMO_CREDITS_LABEL = 'DEMO credits · no cash value';
/** Starting balance and the value of a reset. */
export const DEMO_CREDITS_START = '1000.00';
/** A reset to the starting balance is allowed at most once per this many minutes. */
export const DEMO_CREDITS_RESET_COOLDOWN_MINUTES = 60;
/** Game bets carry no platform fee and no network fee. */
export const GAME_BET_FEE = '0.00';
/** Stakes have at most 2 decimals (0.10 …). */
export const STAKE_DECIMALS = 2;
/** Stored precision of DEMO credit amounts (Decimal(20, 6)). */
export const CREDIT_DECIMALS = 6;

/** Parse a stake: positive decimal string with ≤ 2 decimals inside [min, max]. */
export function parseStake(value: MoneyInput, min: string, max: string, what = 'Stake'): Money {
  let d: Money;
  try {
    d = money(value);
  } catch {
    throw new FairError(`${what} must be a decimal amount`, 'INVALID_STAKE');
  }
  if (d.decimalPlaces() > STAKE_DECIMALS) {
    throw new FairError(`${what} has at most ${STAKE_DECIMALS} decimals`, 'INVALID_STAKE');
  }
  if (d.lt(money(min))) throw new FairError(`${what} is below the minimum of ${min}`, 'BET_BELOW_MIN');
  if (d.gt(money(max))) throw new FairError(`${what} is above the maximum of ${max}`, 'BET_ABOVE_MAX');
  return d;
}

/** Payout = stake × multiplier, truncated to 6 decimals (never rounds up). */
export function payoutOf(stake: MoneyInput, multiplier: MoneyInput): Money {
  return roundDown(money(stake).times(money(multiplier)), CREDIT_DECIMALS);
}

/** Canonical credit string (2–6 decimals), e.g. '19.60', '19.603960'. */
export function creditString(value: MoneyInput): string {
  const d = roundDown(value, CREDIT_DECIMALS);
  const dp = Math.max(2, d.decimalPlaces());
  return (d.isZero() ? d.abs() : d).toFixed(dp);
}

/** Truncate a multiplier to `dp` decimals and print it with exactly `dp` decimals ('1.9603'). */
export function multiplierString(value: MoneyInput, dp: number): string {
  return money(value).toDecimalPlaces(dp, Decimal.ROUND_DOWN).toFixed(dp);
}

/** Chance in percent for display, rounded half-up to 2 decimals ('30.77'). */
export function percentString(value: MoneyInput): string {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
