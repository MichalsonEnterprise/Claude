/**
 * Platform limits & compliance constants (DEMO values from design/figma-build/demo-data.md).
 * Server-side enforcement lives in apps/api; the web only displays them.
 */
import type { KycLevel } from './enums';

/** Minimum age to use the platform. */
export const MIN_AGE = 18;

export const MIN_DEPOSIT = '10.00';
export const MIN_WITHDRAWAL = '20.00';

/**
 * Daily withdrawal limit by KYC level (USDT). L2 = 25,000.00 (demo-data); L1 2,000.00 / L3 100,000.00 come
 * from the Figma build notes. `none` = 0: KYC L1 is required before withdrawing (assumption — confirm with
 * compliance).
 */
export const DAILY_WITHDRAWAL_LIMIT: Readonly<Record<KycLevel, string>> = {
  none: '0.00',
  level_1: '2000.00',
  level_2: '25000.00',
  level_3: '100000.00',
};

/** Cool-down before a newly whitelisted withdrawal address can be used. */
export const NEW_ADDRESS_COOLDOWN_HOURS = 24;

/** Cool-down before an INCREASE of a responsible-gaming limit takes effect (decreases apply immediately). */
export const RG_LIMIT_INCREASE_COOLDOWN_HOURS = 24;

/** Default reality-check reminder interval. */
export const REALITY_CHECK_DEFAULT_MINUTES = 60;

/** Wrong step-up codes before withdrawals are paused, and for how long. */
export const STEP_UP_MAX_ATTEMPTS = 5;
export const STEP_UP_LOCK_MINUTES = 15;

/** Admin login lockout. */
export const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
export const ADMIN_LOCKOUT_MINUTES = 15;

/** Real-money operation is disabled by default (server-side flag REAL_MONEY_ENABLED). */
export const REAL_MONEY_ENABLED_DEFAULT = false;
