"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDays = exports.addMinutes = exports.addHours = void 0;
exports.periodStart = periodStart;
exports.selfExclusionEnd = selfExclusionEnd;
/** Start of the current UTC day / ISO week (Monday) / month. */
function periodStart(period, now = new Date()) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (period === 'week') {
        const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
        d.setUTCDate(d.getUTCDate() - dow);
    }
    else if (period === 'month') {
        d.setUTCDate(1);
    }
    return d;
}
const addHours = (d, h) => new Date(d.getTime() + h * 3_600_000);
exports.addHours = addHours;
const addMinutes = (d, m) => new Date(d.getTime() + m * 60_000);
exports.addMinutes = addMinutes;
const addDays = (d, days) => new Date(d.getTime() + days * 86_400_000);
exports.addDays = addDays;
/** Self-exclusion end from a SelfExclusionDuration ('24h' | '7d' | '30d' | '6m' | '1y' | '5y' | 'permanent'). */
function selfExclusionEnd(duration, from) {
    switch (duration) {
        case '24h':
            return (0, exports.addHours)(from, 24);
        case '7d':
            return (0, exports.addDays)(from, 7);
        case '30d':
            return (0, exports.addDays)(from, 30);
        case '6m': {
            const d = new Date(from);
            d.setUTCMonth(d.getUTCMonth() + 6);
            return d;
        }
        case '1y': {
            const d = new Date(from);
            d.setUTCFullYear(d.getUTCFullYear() + 1);
            return d;
        }
        case '5y': {
            const d = new Date(from);
            d.setUTCFullYear(d.getUTCFullYear() + 5);
            return d;
        }
        case 'permanent':
            return null;
        default:
            throw new RangeError(`Unknown self-exclusion duration ${duration}`);
    }
}
//# sourceMappingURL=time.js.map