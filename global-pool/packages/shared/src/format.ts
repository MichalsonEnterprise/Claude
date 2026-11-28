/**
 * Display helpers shared by web and api (emails, notifications). Deterministic: UTC only, no locale lookups.
 * Money formatting lives in ./money (formatUSDT).
 */
import { groupThousands, roundDown, type MoneyInput } from './money';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(value)}`);
  return d;
}

/** '27 Nov 2026' */
export function formatDateUTC(value: string | Date): string {
  const d = toDate(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** '18:42 UTC' (or '18:42:07 UTC' with seconds) */
export function formatTimeUTC(value: string | Date, options: { seconds?: boolean } = {}): string {
  const d = toDate(value);
  const s = options.seconds ? `:${pad2(d.getUTCSeconds())}` : '';
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}${s} UTC`;
}

/** '27 Nov 2026, 18:42 UTC' — the date format used across the designs. */
export function formatDateTimeUTC(
  value: string | Date,
  options: { seconds?: boolean } = {},
): string {
  return `${formatDateUTC(value)}, ${formatTimeUTC(value, options)}`;
}

/** 'Fri 27 Nov 2026' */
export function formatWeekdayDateUTC(value: string | Date): string {
  const d = toDate(value);
  return `${WEEKDAYS[d.getUTCDay()]} ${formatDateUTC(d)}`;
}

/**
 * Countdown 'HH:MM:SS' from an absolute target time (never a fake timer). Hours may exceed 24.
 * Returns '00:00:00' once the target has passed.
 */
export function formatCountdown(target: string | Date, now: string | Date = new Date()): string {
  const ms = Math.max(0, toDate(target).getTime() - toDate(now).getTime());
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** Session duration 'HH:MM:SS' from seconds (e.g. 2538 → '00:42:18'). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('seconds must be ≥ 0');
  const t = Math.floor(seconds);
  return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:${pad2(t % 60)}`;
}

/** Integer count with thousands separators: 18640 → '18,640'. */
export function formatCount(value: number | bigint): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value))
    throw new RangeError('count must be an integer');
  const s = value.toString();
  return s.startsWith('-') ? `−${groupThousands(s.slice(1))}` : groupThousands(s);
}

/** Round number label: 1248 → '#1,248'. */
export const formatRoundNumber = (n: number): string => `#${formatCount(n)}`;

/** Handle with '@': 'nova.k' → '@nova.k' (idempotent). */
export const formatHandle = (handle: string): string =>
  handle.startsWith('@') ? handle : `@${handle}`;

/** Percent from a decimal-string percentage: formatPercent('2.441', 2) → '2.44%'. Truncates. */
export function formatPercent(percent: MoneyInput, decimals = 2): string {
  return `${roundDown(percent, decimals).toFixed(decimals)}%`;
}

/**
 * Truncate an address or hash for display: '0x12ab…9f3C' (EVM: 0x + 4, last 4), '7Hq3…Xk9P' (Solana: 4 + 4).
 * Already-truncated values are returned unchanged.
 */
export function truncateAddress(
  address: string,
  options: { lead?: number; tail?: number } = {},
): string {
  if (address.includes('…')) return address;
  const isHex = address.startsWith('0x');
  const lead = options.lead ?? (isHex ? 6 : 4);
  const tail = options.tail ?? 4;
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}
