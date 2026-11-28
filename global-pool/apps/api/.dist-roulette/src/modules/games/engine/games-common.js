"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAIR_GAMES = exports.GameClock = exports.credits = exports.DEMO = exports.refOf = void 0;
exports.fairToAppError = fairToAppError;
exports.rules = rules;
exports.assertDemoOnly = assertDemoOnly;
exports.gameInfo = gameInfo;
exports.refNumberOf = refNumberOf;
/**
 * Shared helpers of the games engine (DEMO credits only — no cash value, never USDT).
 */
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
Object.defineProperty(exports, "FAIR_GAMES", { enumerable: true, get: function () { return fair_1.FAIR_GAMES; } });
const errors_1 = require("../../../common/errors");
/** Map a rule error from @gp/shared/fair to the shared API error envelope. */
function fairToAppError(err) {
    if (!(err instanceof fair_1.FairError))
        return err;
    switch (err.code) {
        case 'ACTION_NOT_ALLOWED':
        case 'ROUND_OVER':
            return new errors_1.AppError('CONFLICT', err.message, { reason: err.code });
        case 'INTERNAL':
            return new errors_1.AppError('INTERNAL_ERROR', 'Game engine error');
        default:
            return new errors_1.AppError('BAD_REQUEST', err.message, { reason: err.code });
    }
}
/** Run a pure rule function and translate FairErrors. */
function rules(fn) {
    try {
        return fn();
    }
    catch (err) {
        throw fairToAppError(err);
    }
}
/**
 * REAL_MONEY guard. Games accept DEMO credits only: a request naming any other currency, or a game row that is not
 * in simulation mode, is refused with 403 REAL_MONEY_DISABLED. REAL_MONEY_ENABLED=true cannot even boot (env.ts),
 * and no code path in the games engine reads or writes the USDT ledger.
 */
function assertDemoOnly(currency, game) {
    if (currency !== undefined && currency !== fair_1.DEMO_CREDITS_CURRENCY) {
        throw new errors_1.AppError('REAL_MONEY_DISABLED', 'Real-money play is not available — games use DEMO credits (no cash value)', { currency, accepted: fair_1.DEMO_CREDITS_CURRENCY });
    }
    if (game && game.mode !== 'simulation') {
        throw new errors_1.AppError('REAL_MONEY_DISABLED', 'This game is not available for DEMO play', {
            mode: game.mode,
        });
    }
}
function gameInfo(slug) {
    const info = (0, fair_1.fairGame)(slug);
    if (!info)
        throw new errors_1.AppError('NOT_FOUND', 'Game not found or not playable', { slug });
    return info;
}
const refOf = (slug, n) => `${(0, fair_1.fairGame)(slug)?.refPrefix ?? 'G'}-${n}`;
exports.refOf = refOf;
/** Parse "D-10482" → 10482 (null when malformed). */
function refNumberOf(ref) {
    const m = /^[A-Z]{1,3}-(\d{1,9})$/.exec(ref);
    return m ? Number(m[1]) : null;
}
exports.DEMO = {
    currency: fair_1.DEMO_CREDITS_CURRENCY,
    label: fair_1.DEMO_CREDITS_LABEL,
    cashValue: false,
    isDemo: true,
};
/** Decimal(20, 6) → API credit string ('19.60', '19.603960' → '19.60396'). */
const credits = (v) => v === null || v === undefined ? '0.00' : (0, fair_1.creditString)(typeof v === 'string' ? v : v.toFixed());
exports.credits = credits;
/** Server clock for the games engine; tests pin it to drive crash rounds deterministically. */
let GameClock = class GameClock {
    fixed = null;
    now() {
        return this.fixed ? new Date(this.fixed.getTime()) : new Date();
    }
    /** TEST ONLY: pin the clock (null = real time). */
    set(date) {
        this.fixed = date;
    }
};
exports.GameClock = GameClock;
exports.GameClock = GameClock = __decorate([
    (0, common_1.Injectable)()
], GameClock);
//# sourceMappingURL=games-common.js.map