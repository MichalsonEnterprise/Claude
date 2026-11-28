import { describe, expect, it } from 'vitest';

import { csvCell, maskAddress, maskHandle, sha256Hex, toCsv } from './csv';

describe('admin CSV export helpers', () => {
  it('quotes cells with commas, quotes and newlines (RFC 4180)', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('neutralises spreadsheet formulas but keeps signed decimal amounts numeric', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(csvCell('-12.40')).toBe('-12.40');
    expect(csvCell('+5')).toBe('+5');
    expect(csvCell('-cmd')).toBe(`'-cmd`);
  });

  it('builds a CRLF CSV with a stable SHA-256', () => {
    const csv = toCsv(['ref', 'amount'], [
      ['DP-77412', '1000.00'],
      ['WD-20931', '1500.00'],
    ]);
    expect(csv).toBe('ref,amount\r\nDP-77412,1000.00\r\nWD-20931,1500.00\r\n');
    expect(sha256Hex(csv)).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex(csv)).toBe(sha256Hex(csv));
  });

  it('masks personal data when an export excludes it', () => {
    expect(maskHandle('@nova.k')).toBe('@n•••k');
    expect(maskHandle('nova.k')).toBe('@n•••k');
    expect(maskHandle(null)).toBe('');
    expect(maskAddress('0x7c4e00000000000000000000000000000000a21d')).toBe('0x7c4e…a21d');
  });
});
