/**
 * DEMO seed clock for the current round (prisma/seed.ts, Q20 / Q07). The DEMO snapshot (round #1,248, 08:00–20:00 UTC
 * with 18,640 entries bought during the day) is shifted by WHOLE days onto the real clock:
 *
 * - The shift picks the latest daily window that has already OPENED, so the seeded entries never precede their
 *   round's opening (a round is never `open` while it refuses entries, and no round holds stakes before it opens).
 * - Seeded during the window (08:00–20:00 UTC) the round is `open`; seeded between rounds it is the round that closed
 *   at the last 20:00 UTC (`closed`, awaiting its draw) and the next round is `scheduled` for the next 08:00 UTC.
 * - Purchase times never lie in the future: while the snapshot's purchase timeline (08:00 … 18:44) is not over yet it
 *   is compressed, in order, into [opensAt, now − 1 min].
 */
export const DAY_MS = 86_400_000;

export type DemoRoundSeedStatus = 'scheduled' | 'open' | 'closed';

/** Whole days that move the snapshot's opening onto the latest daily opening at or before `nowMs`. */
export function demoSeedShiftDays(snapshotOpensAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - snapshotOpensAtMs) / DAY_MS));
}

export function demoRoundSeedStatus(opensAt: Date, closesAt: Date, now: Date): DemoRoundSeedStatus {
  if (now.getTime() < opensAt.getTime()) return 'scheduled';
  return now.getTime() < closesAt.getTime() ? 'open' : 'closed';
}

/** Maps a planned DEMO purchase time (ms) to a seeded one that is not in the future (order preserved). */
export function demoPurchaseClock(
  opensAtMs: number,
  plannedLastMs: number,
  nowMs: number,
): (plannedMs: number) => number {
  const cap = nowMs - 60_000;
  if (nowMs < opensAtMs || cap >= plannedLastMs || plannedLastMs <= opensAtMs) return (t) => t;
  const span = Math.max(0, cap - opensAtMs);
  return (t) =>
    opensAtMs +
    Math.floor(
      (Math.min(Math.max(t, opensAtMs), plannedLastMs) - opensAtMs) *
        (span / (plannedLastMs - opensAtMs)),
    );
}
