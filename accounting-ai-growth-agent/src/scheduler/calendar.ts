import { config } from '../config.js';
import type { PlatformKey } from '../content/writers/types.js';

/**
 * Builds a week's worth of publishing slots per platform, spread across the
 * configured posting-hour window so we never fire N posts in the same
 * second (brief #17). Deterministic given a start date, so tests are stable.
 */
export interface PublishingSlot {
  platform: PlatformKey;
  date: Date; // in the configured TIMEZONE, represented as a UTC instant
}

const PLATFORM_TO_FREQUENCY_KEY: Record<PlatformKey, keyof typeof config.publishing.postsPerWeek> = {
  linkedin: 'linkedin',
  'linkedin-page': 'linkedin',
  x: 'x',
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
};

// Simple deterministic pseudo-random spread (no external dependency): hashes
// (platform, index) into a stable offset within the hour window.
function pseudoRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * Weekdays only for LinkedIn/Facebook/LinkedIn-page (B2B audience), every
 * day allowed for X/Instagram/TikTok. This is an editable heuristic, not a
 * hard architectural constraint.
 */
function allowedDaysFor(platform: PlatformKey): number[] {
  if (platform === 'linkedin' || platform === 'linkedin-page' || platform === 'facebook') {
    return [1, 2, 3, 4, 5]; // Mon-Fri
  }
  return [0, 1, 2, 3, 4, 5, 6];
}

export function buildWeeklyCalendar(platforms: PlatformKey[], weekStart: Date): PublishingSlot[] {
  const slots: PublishingSlot[] = [];

  for (const platform of platforms) {
    const freqKey = PLATFORM_TO_FREQUENCY_KEY[platform];
    const perWeek = config.publishing.postsPerWeek[freqKey];
    const days = allowedDaysFor(platform);

    // Evenly distribute `perWeek` posts across the allowed days of the week.
    const chosenDays: number[] = [];
    for (let i = 0; i < perWeek; i++) {
      chosenDays.push(days[Math.floor((i * days.length) / perWeek)]);
    }

    chosenDays.forEach((dayOffsetIndex, i) => {
      const date = new Date(weekStart);
      // weekStart is assumed to be the Monday of the target week at 00:00.
      const dayDelta = (dayOffsetIndex - weekStart.getDay() + 7) % 7;
      date.setDate(date.getDate() + dayDelta);

      const windowSpan = config.publishing.hourEnd - config.publishing.hourStart;
      const rand = pseudoRandom(`${platform}-${weekStart.toISOString()}-${i}`);
      const hour = config.publishing.hourStart + Math.floor(rand * windowSpan);
      const minute = Math.floor(pseudoRandom(`${platform}-min-${i}`) * 60);
      date.setHours(hour, minute, 0, 0);

      slots.push({ platform, date });
    });
  }

  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function nextMonday(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + (day === 0 ? 1 : daysUntilMonday === 7 && day === 1 ? 0 : daysUntilMonday));
  d.setHours(0, 0, 0, 0);
  return d;
}
