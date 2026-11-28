/** Display helpers for the rg-history module (money via @gp/shared/money — never floats). */
import { formatDateTimeUTC, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, isNegative, isZero, money } from '@gp/shared/money';

/** '5,000.00' (no symbol). */
export const num = (v: string | null | undefined) => formatUSDT(v ?? '0', { symbol: false });
/** '5,000.00 USDT'. */
export const usdt = (v: string | null | undefined) => formatUSDT(v ?? '0');
/** Signed '+300.00' / '−351.75' / '0.00'. */
export const signed = (v: string | null | undefined, symbol = false) =>
  formatUSDT(v ?? '0', { symbol, sign: isZero(v ?? '0') ? 'auto' : 'always' });
export const toneOf = (v: string | null | undefined) =>
  isZero(v ?? '0')
    ? 'text-text-primary'
    : isNegative(v ?? '0')
      ? 'text-text-danger'
      : 'text-text-success';

/** 120 → '2 h 00 min', 72 → '1 h 12 min', 45 → '45 min'. */
export function minutesLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** Share used (0–1) as a CSS width percentage, decimal-safe. */
export function ratio(
  used: string | number | null | undefined,
  limit: string | number | null | undefined,
): number {
  if (used === null || used === undefined || limit === null || limit === undefined) return 0;
  const l = money(limit);
  if (l.lte(0)) return 0;
  const r = money(used).div(l);
  return Math.min(1, Math.max(0, Number(r.toFixed(4))));
}

export const dateTime = (v: string) => formatDateTimeUTC(v);
export const date = (v: string) => formatDateUTC(v);
export const time = (v: string) => formatTimeUTC(v);

/** '28 Nov, 16:42 UTC' */
export function shortDateTime(v: string): string {
  const d = formatDateUTC(v).split(' ');
  return `${d[0]} ${d[1]}, ${formatTimeUTC(v)}`;
}

export const PERIOD_WORD = { day: 'day', week: 'week', month: 'month' } as const;
export const PERIOD_ADJ = { day: 'Daily', week: 'Weekly', month: 'Monthly' } as const;
