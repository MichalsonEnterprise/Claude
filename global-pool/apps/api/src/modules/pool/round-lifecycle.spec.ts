import { describe, expect, it } from 'vitest';

import { nextDailyWindow } from './round-lifecycle.service';

describe('daily round schedule (08:00–20:00 UTC)', () => {
  it('uses today when before the close, tomorrow after it', () => {
    expect(nextDailyWindow(new Date('2026-11-28T03:00:00Z'))).toEqual({
      opensAt: new Date('2026-11-28T08:00:00Z'),
      closesAt: new Date('2026-11-28T20:00:00Z'),
    });
    expect(nextDailyWindow(new Date('2026-11-28T20:00:00Z')).closesAt).toEqual(
      new Date('2026-11-29T20:00:00Z'),
    );
  });
});
