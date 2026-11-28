/**
 * Pure helpers for responsible-gaming session tracking (RG4 time limits, RG5 reality checks).
 * Kept free of Nest / Prisma so they are unit-tested directly.
 */
import { RG_SESSION_IDLE_MINUTES } from '@gp/shared/limits';

/** Longest gap between two heartbeats that still counts as play time (the web sends one every 60 s). */
export const HEARTBEAT_MAX_CREDIT_SECONDS = 120;

export interface SessionCounters {
  sessionStartedAt: Date | null;
  lastActivityAt: Date | null;
  lastRealityCheckAt: Date | null;
  playedDay: Date | null;
  playedTodaySeconds: number;
  sessionsToday: number;
}

export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function sameUtcDay(a: Date | null, b: Date): boolean {
  return !!a && utcDay(a).getTime() === utcDay(b).getTime();
}

/** A session is live while the last activity is within the idle window. */
export function isSessionLive(
  c: Pick<SessionCounters, 'lastActivityAt' | 'sessionStartedAt'>,
  now: Date,
) {
  return (
    !!c.lastActivityAt &&
    !!c.sessionStartedAt &&
    now.getTime() - c.lastActivityAt.getTime() <= RG_SESSION_IDLE_MINUTES * 60_000
  );
}

/**
 * Apply one activity heartbeat. Continuing a live session credits the gap since the last heartbeat (capped);
 * otherwise a new session starts. Daily counters reset at 00:00 UTC.
 */
export function applyHeartbeat(c: SessionCounters, now: Date): SessionCounters {
  const live = isSessionLive(c, now);
  let played = sameUtcDay(c.playedDay, now) ? c.playedTodaySeconds : 0;
  let sessions = sameUtcDay(c.playedDay, now) ? c.sessionsToday : 0;
  if (live) {
    const gap = Math.max(0, Math.floor((now.getTime() - c.lastActivityAt!.getTime()) / 1000));
    const sinceMidnight = Math.floor((now.getTime() - utcDay(now).getTime()) / 1000);
    played += Math.min(gap, HEARTBEAT_MAX_CREDIT_SECONDS, sinceMidnight);
    if (!sameUtcDay(c.playedDay, now)) sessions = 1; // a session that crossed midnight counts today too
  } else {
    sessions += 1;
  }
  return {
    sessionStartedAt: live ? c.sessionStartedAt : now,
    lastActivityAt: now,
    lastRealityCheckAt: live ? c.lastRealityCheckAt : null,
    playedDay: utcDay(now),
    playedTodaySeconds: played,
    sessionsToday: sessions,
  };
}

/** Next reality-check time: counted from the session start or the last acknowledged reminder. */
export function nextRealityCheckAt(
  c: SessionCounters,
  intervalMinutes: number,
  now: Date,
): Date | null {
  if (!isSessionLive(c, now)) return null;
  const anchor =
    c.lastRealityCheckAt && c.lastRealityCheckAt > c.sessionStartedAt!
      ? c.lastRealityCheckAt
      : c.sessionStartedAt!;
  return new Date(anchor.getTime() + intervalMinutes * 60_000);
}

/** Minutes of the day (UTC) inside a quiet-hours window [start, end), which may wrap past midnight. */
export function inQuietHours(startMinute: number, endMinute: number, now: Date): boolean {
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (startMinute === endMinute) return false;
  return startMinute < endMinute
    ? m >= startMinute && m < endMinute
    : m >= startMinute || m < endMinute;
}

export function hhmm(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minuteOfDay(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Start of the NEXT UTC day / ISO week (Monday) / month — when a limit period resets. */
export function nextPeriodStart(period: 'day' | 'week' | 'month', now: Date): Date {
  const d = utcDay(now);
  if (period === 'day') return new Date(d.getTime() + 86_400_000);
  if (period === 'week') {
    const dow = (d.getUTCDay() + 6) % 7;
    return new Date(d.getTime() + (7 - dow) * 86_400_000);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
