"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = void 0;
exports.csvCell = csvCell;
exports.toCsv = toCsv;
exports.maskHandle = maskHandle;
exports.maskAddress = maskAddress;
const node_crypto_1 = require("node:crypto");
/** RFC 4180 cell: quote when needed, double inner quotes; neutralise spreadsheet formulas (CSV injection). */
function csvCell(value) {
    if (value === null || value === undefined)
        return '';
    let s = String(value);
    // A leading = + - @ (or tab/CR) would be evaluated as a formula by spreadsheet apps — prefix with a quote,
    // except for plain signed numbers ("-12.40") which must stay numeric.
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s))
        s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(header, rows) {
    const lines = [header.map(csvCell).join(',')];
    for (const r of rows)
        lines.push(r.map(csvCell).join(','));
    return `${lines.join('\r\n')}\r\n`;
}
const sha256Hex = (content) => (0, node_crypto_1.createHash)('sha256').update(content, 'utf8').digest('hex');
exports.sha256Hex = sha256Hex;
/** Mask a handle for exports without personal data: "@nova.k" → "@n•••k". */
function maskHandle(handle) {
    if (!handle)
        return '';
    const h = handle.replace(/^@/, '');
    if (h.length <= 2)
        return '@••';
    return `@${h[0]}•••${h[h.length - 1]}`;
}
/** Mask an address for exports without personal data: keep the first 6 and the last 4 characters. */
function maskAddress(address) {
    if (!address)
        return '';
    return address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;
}
//# sourceMappingURL=csv.js.map