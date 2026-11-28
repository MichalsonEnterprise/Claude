import { describe, expect, it } from 'vitest';

import {
  applyHeartbeat,
  inQuietHours,
  isSessionLive,
  nextPeriodStart,
  nextRealityCheckAt,
  type SessionCounters,
} from './rg-session';

const EMPTY: SessionCounters = {
  sessionStartedAt: null,
  lastActivityAt: null,
  lastRealityCheckAt: null,
  playedDay: null,
  playedTodaySeconds: 0,
  sessionsToday: 0,
};
const at = (iso: string) => new Date(iso);

describe('RG session tracking (heartbeats)', () => {
  it('starts a session on the first heartbeat and credits capped gaps while it is live', () => {
    let c = applyHeartbeat(EMPTY, at('2026-11-28T16:00:00Z'));
    expect(c).toMatchObject({ sessionsToday: 1, playedTodaySeconds: 0 });
    expect(c.sessionStartedAt?.toISOString()).toBe('2026-11-28T16:00:00.000Z');
    c = applyHeartbeat(c, at('2026-11-28T16:01:00Z'));
    expect(c.playedTodaySeconds).toBe(60);
    // a 10-minute gap keeps the session (idle < 15 min) but only credits the heartbeat cap (120 s)
    c = applyHeartbeat(c, at('2026-11-28T16:11:00Z'));
    expect(c.playedTodaySeconds).toBe(180);
    expect(c.sessionStartedAt?.toISOString()).toBe('2026-11-28T16:00:00.000Z');
  });

  it('a gap of more than 15 minutes ends the session; the next heartbeat starts a new one', () => {
    const live = applyHeartbeat(EMPTY, at('2026-11-28T16:00:00Z'));
    expect(isSessionLive(live, at('2026-11-28T16:15:00Z'))).toBe(true);
    expect(isSessionLive(live, at('2026-11-28T16:15:01Z'))).toBe(false);
    const next = applyHeartbeat(live, at('2026-11-28T16:30:00Z'));
    expect(next.sessionsToday).toBe(2);
    expect(next.sessionStartedAt?.toISOString()).toBe('2026-11-28T16:30:00.000Z');
  });

  it('resets daily counters at 00:00 UTC', () => {
    const late = { ...applyHeartbeat(EMPTY, at('2026-11-27T23:59:30Z')), playedTodaySeconds: 3600 };
    const next = applyHeartbeat(late, at('2026-11-28T00:00:20Z'));
    expect(next.playedTodaySeconds).toBe(20); // only the seconds after midnight count today
    expect(next.sessionsToday).toBe(1);
  });

  it('reality checks are due one interval after the session start or the last answer', () => {
    const c = applyHeartbeat(EMPTY, at('2026-11-28T16:00:00Z'));
    const live = { ...c, lastActivityAt: at('2026-11-28T16:59:00Z') };
    expect(nextRealityCheckAt(live, 60, at('2026-11-28T16:59:30Z'))?.toISOString()).toBe(
      '2026-11-28T17:00:00.000Z',
    );
    const acked = { ...live, lastRealityCheckAt: at('2026-11-28T17:00:10Z') };
    expect(nextRealityCheckAt(acked, 60, at('2026-11-28T17:01:00Z'))?.toISOString()).toBe(
      '2026-11-28T18:00:10.000Z',
    );
    expect(nextRealityCheckAt(EMPTY, 60, at('2026-11-28T17:01:00Z'))).toBeNull();
  });

  it('quiet hours wrap past midnight', () => {
    expect(inQuietHours(60, 420, at('2026-11-28T01:00:00Z'))).toBe(true);
    expect(inQuietHours(60, 420, at('2026-11-28T07:00:00Z'))).toBe(false);
    expect(inQuietHours(23 * 60, 6 * 60, at('2026-11-28T23:30:00Z'))).toBe(true);
    expect(inQuietHours(23 * 60, 6 * 60, at('2026-11-28T05:59:00Z'))).toBe(true);
    expect(inQuietHours(23 * 60, 6 * 60, at('2026-11-28T12:00:00Z'))).toBe(false);
  });

  it('periods reset at the next UTC day, Monday and 1st of the month', () => {
    const now = at('2026-11-28T16:42:00Z'); // Saturday
    expect(nextPeriodStart('day', now).toISOString()).toBe('2026-11-29T00:00:00.000Z');
    expect(nextPeriodStart('week', now).toISOString()).toBe('2026-11-30T00:00:00.000Z');
    expect(nextPeriodStart('month', now).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});
