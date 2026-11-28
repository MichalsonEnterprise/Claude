/**
 * Deterministic DEMO ids. Valid RFC 4122 v4-format UUIDs (so they pass `z.uuid()` and Postgres uuid columns) that
 * start with "de0000" so they are recognisable as DEMO everywhere — the API seed reuses them.
 */
const KIND = {
  user: '01',
  round: '02',
  entry: '03',
  transaction: '04',
  game: '05',
  promotion: '06',
  winner: '07',
  wallet: '08',
  device: '09',
  admin: '0a',
  feed: '0b',
} as const;
export type DemoIdKind = keyof typeof KIND;

export function demoId(kind: DemoIdKind, n: number): string {
  if (!Number.isSafeInteger(n) || n < 0 || n > 999_999_999_999)
    throw new RangeError('demoId: n out of range');
  return `de0000${KIND[kind]}-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function isDemoId(id: string): boolean {
  return /^de0000[0-9a-f]{2}-0000-4000-8000-\d{12}$/.test(id);
}
