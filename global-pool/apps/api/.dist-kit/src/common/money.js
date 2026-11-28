"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usdt = usdt;
exports.usdtOrNull = usdtOrNull;
exports.toJson = toJson;
const money_1 = require("@gp/shared/money");
/** Canonical USDT string for API responses ('351.75', at least 2 dp) from a Prisma.Decimal / string / bigint. */
function usdt(value) {
    if (value === null || value === undefined)
        return '0.00';
    return (0, money_1.toUSDTString)((0, money_1.money)(value));
}
/** Same as usdt() but keeps null. */
function usdtOrNull(value) {
    return value === null || value === undefined ? null : usdt(value);
}
/** Plain JSON copy for Prisma Json columns (drops undefined; bigints must already be strings). */
function toJson(value) {
    return JSON.parse(JSON.stringify(value ?? {}));
}
//# sourceMappingURL=money.js.map