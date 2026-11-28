/**
 * DEMO seed clock for the current round (prisma/seed.ts). The DEMO snapshot is shifted by whole days so round #1,248
 * closes at the next 20:00 UTC; seeded before 08:00 UTC its window has not opened yet.
 *
 * - Status follows the real clock (Q20): `open` only once `opensAt` has passed, otherwise `scheduled` — the regular
 *   lifecycle tick opens it at `opensAt`, exactly like any other round. A round is never `open` while it refuses
 *   entries.
 * - Purchase times never lie in the future (Q07): when the snapshot's purchase timeline (08:00 … 18:42) is not over
 *   yet, it is compressed, in order, into [opensAt, now − 1 min]. Before `opensAt` (scheduled) it is kept as is: a
 *   DEMO snapshot of a round that has not opened yet.
 */
export type DemoRoundSeedStatus = 'open' | 'scheduled';

export function demoRoundSeedStatus(opensAt: Date, now: Date): DemoRoundSeedStatus {
  return opensAt.getTime() <= now.getTime() ? 'open' : 'scheduled';
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
