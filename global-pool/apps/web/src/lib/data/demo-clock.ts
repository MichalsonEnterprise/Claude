/**
 * DEMO clock (mock data source only). The @gp/shared DEMO snapshot is dated 27 Nov 2026 (round #1,248 closes
 * 20:00 UTC). Exactly like the API seed (apps/api/prisma/seed.ts, `DEMO_SEED_SHIFT_DAYS`), mock data is shifted
 * by WHOLE days so the current round closes at the next 20:00 UTC — every countdown then runs against the REAL
 * clock and the real close time; nothing is anchored to a fake "now".
 */
import { DEMO_CURRENT_ROUND } from '@gp/shared/demo';

export const DAY_MS = 86_400_000;

/** 27 Nov 2026, 20:00 UTC — close of DEMO round #1,248 in the unshifted snapshot. */
export const DEMO_BASE_CLOSE_MS = Date.parse(DEMO_CURRENT_ROUND.closesAt);

/** Whole days to add so the DEMO round closes at the next 20:00 UTC after `nowMs` (same formula as the seed). */
export function demoShiftDays(nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((nowMs + 60_000 - DEMO_BASE_CLOSE_MS) / DAY_MS));
}

/** Shift a DEMO ISO timestamp by `days` whole days (null passes through). */
export function shiftIso<T extends string | null | undefined>(iso: T, days: number): T {
  if (!iso) return iso;
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString() as T;
}

/**
 * Whole days for the "between rounds" DEMO scenario: the next round (#1,249, 28 Nov 2026 08:00 UTC in the
 * snapshot) opens at the next 08:00 UTC after `nowMs`.
 */
export function demoBetweenRoundsShiftDays(nowMs: number = Date.now()): number {
  const nextOpen = DEMO_BASE_CLOSE_MS + 12 * 3_600_000; // 28 Nov 2026, 08:00 UTC
  return Math.max(0, Math.ceil((nowMs - nextOpen) / DAY_MS));
}
