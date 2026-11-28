/** Minimal RFC 4180 CSV writer with spreadsheet formula-injection protection. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string;
}

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Quote when needed; neutralise cells that a spreadsheet would treat as a formula (=, +, -, @, tab, CR). */
export function csvCell(raw: string, delimiter = ','): string {
  let v = raw ?? '';
  if (/^[=+\-@\t\r]/.test(v) && !NUMERIC.test(v)) v = `'${v}`;
  if (v.includes('"') || v.includes(delimiter) || v.includes('\n') || v.includes('\r')) {
    v = `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[], delimiter = ','): string {
  const lines = [columns.map((c) => csvCell(c.header, delimiter)).join(delimiter)];
  for (const row of rows)
    lines.push(columns.map((c) => csvCell(c.value(row), delimiter)).join(delimiter));
  return `${lines.join('\r\n')}\r\n`;
}

export function csvFileName(prefix: string, from?: string | null, to?: string | null): string {
  const d = (v?: string | null) => (v ? v.slice(0, 10) : 'all');
  return `${prefix}_${d(from)}_${d(to)}.csv`;
}
