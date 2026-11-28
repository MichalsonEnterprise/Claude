import { describe, expect, it } from 'vitest';

import {
  DAY_MS,
  demoPurchaseClock,
  demoRoundSeedStatus,
  demoSeedShiftDays,
} from './demo-round-clock';

const at = (iso: string) => new Date(iso);
const ms = (iso: string) => Date.parse(iso);
const SNAPSHOT_OPENS = ms('2026-11-27T08:00:00Z');
const OPENS = '2026-11-28T08:00:00Z';
const CLOSES = '2026-11-28T20:00:00Z';
const LAST = ms('2026-11-28T18:44:12Z');

/** Round #1,248's window once shifted for a seed run at `now`. */
const windowAt = (now: string) => {
  const days = demoSeedShiftDays(SNAPSHOT_OPENS, ms(now));
  const opensAt = new Date(SNAPSHOT_OPENS + days * DAY_MS);
  const closesAt = new Date(opensAt.getTime() + 12 * 3_600_000);
  return { opensAt, closesAt, status: demoRoundSeedStatus(opensAt, closesAt, at(now)) };
};

describe('DEMO seed clock for the current round (Q20 / Q07)', () => {
  it('seeded before 08:00 UTC the round is never "open" with a future opening (QA probe at 03:55)', () => {
    // Old rule: closes at the next 20:00 → opens 08:00 today (future) but status "open" → every entry 409.
    const w = windowAt('2026-11-28T03:55:00Z');
    expect(w.opensAt.getTime()).toBeLessThanOrEqual(ms('2026-11-28T03:55:00Z'));
    expect(w).toMatchObject({ status: 'closed', closesAt: at('2026-11-27T20:00:00Z') });
  });

  it('seeded during the window it is open and closes at 20:00 today; after 20:00 it is the round just closed', () => {
    expect(windowAt('2026-11-28T08:00:00Z')).toMatchObject({ status: 'open', opensAt: at(OPENS) });
    expect(windowAt('2026-11-28T13:00:00Z')).toMatchObject({
      status: 'open',
      opensAt: at(OPENS),
      closesAt: at(CLOSES),
    });
    expect(windowAt('2026-11-28T21:30:00Z')).toMatchObject({
      status: 'closed',
      closesAt: at(CLOSES),
    });
    expect(demoRoundSeedStatus(at(OPENS), at(CLOSES), at('2026-11-28T07:59:59Z'))).toBe(
      'scheduled',
    );
  });

  it('never dates a purchase in the future: an unfinished timeline is compressed into [opensAt, now − 1 min]', () => {
    const now = ms('2026-11-28T10:00:00Z');
    const clock = demoPurchaseClock(ms(OPENS), LAST, now);
    const planned = [ms(OPENS), ms('2026-11-28T09:14:00Z'), ms('2026-11-28T14:06:00Z'), LAST];
    const seeded = planned.map(clock);
    expect(seeded[0]).toBe(ms(OPENS));
    expect(Math.max(...seeded)).toBeLessThanOrEqual(now - 60_000);
    expect([...seeded].sort((a, b) => a - b)).toEqual(seeded); // order kept
    expect(new Set(seeded).size).toBe(planned.length);
  });

  it('keeps the snapshot times once the timeline is over', () => {
    const after = demoPurchaseClock(ms(OPENS), LAST, ms('2026-11-28T19:30:00Z'));
    expect(after(ms('2026-11-28T14:06:00Z'))).toBe(ms('2026-11-28T14:06:00Z'));
  });
});
