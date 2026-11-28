import { describe, expect, it } from 'vitest';

import { buildCsv, csvCell, csvFileName } from './csv';

describe('CSV export', () => {
  it('quotes delimiters, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a;b', ';')).toBe('"a;b"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('neutralises formula injection but keeps signed amounts numeric', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-351.75')).toBe('-351.75');
    expect(csvCell('+1,000')).toBe(`"'+1,000"`);
  });

  it('builds CRLF rows with a header and a dated file name', () => {
    const csv = buildCsv(
      [{ a: '1', b: 'x' }],
      [
        { header: 'a', value: (r) => r.a },
        { header: 'b', value: (r) => r.b },
      ],
    );
    expect(csv).toBe('a,b\r\n1,x\r\n');
    expect(csvFileName('t', '2026-01-01T00:00:00Z', '2026-11-27T23:59:59Z')).toBe(
      't_2026-01-01_2026-11-27.csv',
    );
  });
});
