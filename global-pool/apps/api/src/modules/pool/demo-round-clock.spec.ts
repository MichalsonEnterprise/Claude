import { describe, expect, it } from 'vitest';

import { demoPurchaseClock, demoRoundSeedStatus } from './demo-round-clock';

const at = (iso: string) => new Date(iso);
const ms = (iso: string) => Date.parse(iso);
const OPENS = '2026-11-28T08:00:00Z';
const LAST = ms('2026-11-28T18:44:12Z');

describe('DEMO seed clock for the current round (Q20 / Q07)', () => {
  it('is open only once its opening time has passed, otherwise scheduled', () => {
    // QA probe: seeded ~03:55 UTC, the round opens 08:00 → it must not be "open" while it refuses entries.
    expect(demoRoundSeedStatus(at(OPENS), at('2026-11-28T03:55:00Z'))).toBe('scheduled');
    expect(demoRoundSeedStatus(at(OPENS), at('2026-11-28T07:59:59Z'))).toBe('scheduled');
    expect(demoRoundSeedStatus(at(OPENS), at(OPENS))).toBe('open');
    expect(demoRoundSeedStatus(at(OPENS), at('2026-11-28T13:00:00Z'))).toBe('open');
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

  it('keeps the snapshot times once the timeline is over, and before the round opens (scheduled)', () => {
    const after = demoPurchaseClock(ms(OPENS), LAST, ms('2026-11-28T19:30:00Z'));
    expect(after(ms('2026-11-28T14:06:00Z'))).toBe(ms('2026-11-28T14:06:00Z'));
    const before = demoPurchaseClock(ms(OPENS), LAST, ms('2026-11-28T03:55:00Z'));
    expect(before(ms('2026-11-28T14:06:00Z'))).toBe(ms('2026-11-28T14:06:00Z'));
  });
});
