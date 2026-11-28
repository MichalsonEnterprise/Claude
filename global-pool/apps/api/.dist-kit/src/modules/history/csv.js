"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvCell = csvCell;
exports.buildCsv = buildCsv;
exports.csvFileName = csvFileName;
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Quote when needed; neutralise cells that a spreadsheet would treat as a formula (=, +, -, @, tab, CR). */
function csvCell(raw, delimiter = ',') {
    let v = raw ?? '';
    if (/^[=+\-@\t\r]/.test(v) && !NUMERIC.test(v))
        v = `'${v}`;
    if (v.includes('"') || v.includes(delimiter) || v.includes('\n') || v.includes('\r')) {
        v = `"${v.replace(/"/g, '""')}"`;
    }
    return v;
}
function buildCsv(rows, columns, delimiter = ',') {
    const lines = [columns.map((c) => csvCell(c.header, delimiter)).join(delimiter)];
    for (const row of rows)
        lines.push(columns.map((c) => csvCell(c.value(row), delimiter)).join(delimiter));
    return `${lines.join('\r\n')}\r\n`;
}
function csvFileName(prefix, from, to) {
    const d = (v) => (v ? v.slice(0, 10) : 'all');
    return `${prefix}_${d(from)}_${d(to)}.csv`;
}
//# sourceMappingURL=csv.js.map