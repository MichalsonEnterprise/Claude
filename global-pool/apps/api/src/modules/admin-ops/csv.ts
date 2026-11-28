import { createHash } from 'node:crypto';

export type CsvValue = string | number | boolean | null | undefined;

/** RFC 4180 cell: quote when needed, double inner quotes; neutralise spreadsheet formulas (CSV injection). */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // A leading = + - @ (or tab/CR) would be evaluated as a formula by spreadsheet apps — prefix with a quote,
  // except for plain signed numbers ("-12.40") which must stay numeric.
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export const sha256Hex = (content: string) =>
  createHash('sha256').update(content, 'utf8').digest('hex');

/** Mask a handle for exports without personal data: "@nova.k" → "@n•••k". */
export function maskHandle(handle: string | null | undefined): string {
  if (!handle) return '';
  const h = handle.replace(/^@/, '');
  if (h.length <= 2) return '@••';
  return `@${h[0]}•••${h[h.length - 1]}`;
}

/** Mask an address for exports without personal data: keep the first 6 and the last 4 characters. */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
