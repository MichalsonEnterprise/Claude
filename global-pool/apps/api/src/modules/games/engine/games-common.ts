/**
 * Shared helpers of the games engine (DEMO credits only — no cash value, never USDT).
 */
import { Injectable } from '@nestjs/common';
import {
  DEMO_CREDITS_CURRENCY,
  DEMO_CREDITS_LABEL,
  FAIR_GAMES,
  FairError,
  creditString,
  fairGame,
  type FairGameInfo,
  type FairGameSlug,
} from '@gp/shared/fair';
import type { Game } from '@prisma/client';

import { AppError } from '../../../common/errors';

/** Map a rule error from @gp/shared/fair to the shared API error envelope. */
export function fairToAppError(err: unknown): unknown {
  if (!(err instanceof FairError)) return err;
  switch (err.code) {
    case 'ACTION_NOT_ALLOWED':
    case 'ROUND_OVER':
      return new AppError('CONFLICT', err.message, { reason: err.code });
    case 'INTERNAL':
      return new AppError('INTERNAL_ERROR', 'Game engine error');
    default:
      return new AppError('BAD_REQUEST', err.message, { reason: err.code });
  }
}

/** Run a pure rule function and translate FairErrors. */
export function rules<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    throw fairToAppError(err);
  }
}

/**
 * REAL_MONEY guard. Games accept DEMO credits only: a request naming any other currency, or a game row that is not
 * in simulation mode, is refused with 403 REAL_MONEY_DISABLED. REAL_MONEY_ENABLED=true cannot even boot (env.ts),
 * and no code path in the games engine reads or writes the USDT ledger.
 */
export function assertDemoOnly(
  currency: string | undefined,
  game?: Pick<Game, 'mode'> | null,
): void {
  if (currency !== undefined && currency !== DEMO_CREDITS_CURRENCY) {
    throw new AppError(
      'REAL_MONEY_DISABLED',
      'Real-money play is not available — games use DEMO credits (no cash value)',
      { currency, accepted: DEMO_CREDITS_CURRENCY },
    );
  }
  if (game && game.mode !== 'simulation') {
    throw new AppError('REAL_MONEY_DISABLED', 'This game is not available for DEMO play', {
      mode: game.mode,
    });
  }
}

export function gameInfo(slug: string): FairGameInfo & { slug: FairGameSlug } {
  const info = fairGame(slug);
  if (!info) throw new AppError('NOT_FOUND', 'Game not found or not playable', { slug });
  return info as FairGameInfo & { slug: FairGameSlug };
}

export const refOf = (slug: string, n: number): string =>
  `${fairGame(slug)?.refPrefix ?? 'G'}-${n}`;

/** Parse "D-10482" → 10482 (null when malformed). */
export function refNumberOf(ref: string): number | null {
  const m = /^[A-Z]{1,3}-(\d{1,9})$/.exec(ref);
  return m ? Number(m[1]) : null;
}

export const DEMO = {
  currency: DEMO_CREDITS_CURRENCY,
  label: DEMO_CREDITS_LABEL,
  cashValue: false as const,
  isDemo: true as const,
};

/** Decimal(20, 6) → API credit string ('19.60', '19.603960' → '19.60396'). */
export const credits = (v: { toFixed(): string } | string | null | undefined): string =>
  v === null || v === undefined ? '0.00' : creditString(typeof v === 'string' ? v : v.toFixed());

/** Server clock for the games engine; tests pin it to drive crash rounds deterministically. */
@Injectable()
export class GameClock {
  private fixed: Date | null = null;
  now(): Date {
    return this.fixed ? new Date(this.fixed.getTime()) : new Date();
  }
  /** TEST ONLY: pin the clock (null = real time). */
  set(date: Date | null): void {
    this.fixed = date;
  }
}

export { FAIR_GAMES };
