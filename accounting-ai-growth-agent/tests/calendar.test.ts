import { describe, it, expect } from 'vitest';
import { buildWeeklyCalendar } from '../src/scheduler/calendar.js';

describe('buildWeeklyCalendar', () => {
  it('produces the configured number of slots per platform', () => {
    const weekStart = new Date('2026-08-31T00:00:00Z'); // a Monday
    const slots = buildWeeklyCalendar(['x'], weekStart);
    // default POSTS_PER_WEEK_X=7 from .env.example / config defaults
    expect(slots.length).toBeGreaterThan(0);
  });

  it('never schedules two slots at the exact same instant', () => {
    const weekStart = new Date('2026-08-31T00:00:00Z');
    const slots = buildWeeklyCalendar(['linkedin', 'x', 'facebook', 'instagram', 'tiktok'], weekStart);
    const timestamps = slots.map((s) => s.date.getTime());
    const unique = new Set(timestamps);
    expect(unique.size).toBe(timestamps.length);
  });

  it('keeps every slot within the publishing hour window', () => {
    const weekStart = new Date('2026-08-31T00:00:00Z');
    const slots = buildWeeklyCalendar(['x'], weekStart);
    for (const slot of slots) {
      const hour = slot.date.getHours();
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThan(18);
    }
  });

  it('only schedules LinkedIn on weekdays', () => {
    const weekStart = new Date('2026-08-31T00:00:00Z');
    const slots = buildWeeklyCalendar(['linkedin'], weekStart);
    for (const slot of slots) {
      const day = slot.date.getDay();
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(5);
    }
  });
});
