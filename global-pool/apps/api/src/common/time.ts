/** UTC period helpers (responsible-gaming windows, KPIs). */
export type Period = 'day' | 'week' | 'month';

/** Start of the current UTC day / ISO week (Monday) / month. */
export function periodStart(period: Period, now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'week') {
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - dow);
  } else if (period === 'month') {
    d.setUTCDate(1);
  }
  return d;
}

export const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/** Self-exclusion end from a SelfExclusionDuration ('24h' | '7d' | '30d' | '6m' | '1y' | '5y' | 'permanent'). */
export function selfExclusionEnd(duration: string, from: Date): Date | null {
  switch (duration) {
    case '24h':
      return addHours(from, 24);
    case '7d':
      return addDays(from, 7);
    case '30d':
      return addDays(from, 30);
    case '6m': {
      const d = new Date(from);
      d.setUTCMonth(d.getUTCMonth() + 6);
      return d;
    }
    case '1y': {
      const d = new Date(from);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return d;
    }
    case '5y': {
      const d = new Date(from);
      d.setUTCFullYear(d.getUTCFullYear() + 5);
      return d;
    }
    case 'permanent':
      return null;
    default:
      throw new RangeError(`Unknown self-exclusion duration ${duration}`);
  }
}
