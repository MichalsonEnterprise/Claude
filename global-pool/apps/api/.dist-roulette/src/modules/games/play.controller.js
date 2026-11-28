"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSeedsBetsController = exports.CrashController = exports.GamesPlayController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const fair_1 = require("@gp/shared/fair");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const bets_service_1 = require("./engine/bets.service");
const credits_service_1 = require("./engine/credits.service");
const crash_service_1 = require("./engine/crash.service");
const seeds_service_1 = require("./engine/seeds.service");
const stateful_service_1 = require("./engine/stateful.service");
class PlaceBetDto extends (0, zod_1.createZodDto)(fair_1.placeBetSchema) {
}
class ClientSeedDto extends (0, zod_1.createZodDto)(fair_1.clientSeedSchema) {
}
class ResetDto extends (0, zod_1.createZodDto)(fair_1.resetCreditsSchema) {
}
class BetsQueryDto extends (0, zod_1.createZodDto)(fair_1.gameBetsQuerySchema) {
}
class StartBlackjackDto extends (0, zod_1.createZodDto)(fair_1.startBlackjackSchema) {
}
class BlackjackActionDto extends (0, zod_1.createZodDto)(fair_1.blackjackActionSchema) {
}
class StartMinesDto extends (0, zod_1.createZodDto)(fair_1.startMinesSchema) {
}
class MinesRevealDto extends (0, zod_1.createZodDto)(fair_1.minesRevealSchema) {
}
class StartHiloDto extends (0, zod_1.createZodDto)(fair_1.startHiloSchema) {
}
class HiloActionDto extends (0, zod_1.createZodDto)(fair_1.hiloActionSchema) {
}
class CashOutDto extends (0, zod_1.createZodDto)(fair_1.cashOutSchema) {
}
class CrashBetDto extends (0, zod_1.createZodDto)(fair_1.crashBetSchema) {
}
/** Bets per IP per minute on the game write routes (on top of the global throttler). */
const betLimit = () => Number(process.env.GAMES_BET_THROTTLE_LIMIT ?? 600);
const BET_THROTTLE = { default: { limit: betLimit, ttl: 60_000 } };
/**
 * Continuing an open round (hit / stand / reveal / cash out) needs a signed-in, onboarded, not suspended player.
 * Actions that add a stake (double, split, insurance) re-check self-exclusion in the service; NEW rounds use the
 * full GAMING_POLICY (region, self-exclusion, gaming_blocked).
 */
const CONTINUE_POLICY = { onboarded: true, blockedBy: ['account_suspended'] };
let GamesPlayController = class GamesPlayController {
    credits;
    bets;
    stateful;
    constructor(credits, bets, stateful) {
        this.credits = credits;
        this.bets = bets;
        this.stateful = stateful;
    }
    getCredits(user) {
        return this.credits.view(user.id);
    }
    reset(user, meta, _body) {
        return this.credits.reset(user.id, meta);
    }
    async bet(user, id) {
        return this.bets.view(await this.bets.byId(user.id, id));
    }
    verify(user, id) {
        return this.bets.verification(user.id, id);
    }
    // ── Twenty-One ─────────────────────────────────────────────────────────────────────────────────
    currentHand(user) {
        return this.stateful.current(user.id, 'twenty-one');
    }
    deal(user, body) {
        return this.stateful.startBlackjack(user, body);
    }
    handAction(user, id, body) {
        return this.stateful.blackjackAction(user, id, body);
    }
    // ── Vault Sweeper ──────────────────────────────────────────────────────────────────────────────
    currentMines(user) {
        return this.stateful.current(user.id, 'vault-sweeper');
    }
    startMines(user, body) {
        return this.stateful.startMines(user, body);
    }
    reveal(user, id, body) {
        return this.stateful.minesReveal(user, id, body);
    }
    minesCashOut(user, id, body) {
        return this.stateful.minesCashOut(user, id, body);
    }
    // ── High Card ──────────────────────────────────────────────────────────────────────────────────
    currentHilo(user) {
        return this.stateful.current(user.id, 'high-card');
    }
    startHilo(user, body) {
        return this.stateful.startHilo(user, body);
    }
    hiloAction(user, id, body) {
        return this.stateful.hiloAction(user, id, body);
    }
    hiloCashOut(user, id, body) {
        return this.stateful.hiloCashOut(user, id, body);
    }
};
exports.GamesPlayController = GamesPlayController;
__decorate([
    (0, common_1.Get)('credits'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'DEMO credits (no cash value): balance, reset availability, DEMO session summary',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "getCredits", null);
__decorate([
    (0, common_1.Post)('credits/reset'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reset DEMO credits to 1,000.00 — at most once per hour; audited' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, request_1.ReqMeta)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, ResetDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "reset", null);
__decorate([
    (0, common_1.Get)('bets/:id'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'One of my bets (any game except Orbit Rush)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GamesPlayController.prototype, "bet", null);
__decorate([
    (0, common_1.Get)('bets/:id/verify'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Everything needed to re-derive a bet (seeds, nonce, params / actions); re-derived once the seed is revealed',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('twenty-one/hands/current'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'My open Twenty-One hand (reconnect / recovery), or null' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "currentHand", null);
__decorate([
    (0, common_1.Post)('twenty-one/hands'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({ summary: 'Deal a Twenty-One hand (idempotent; stake in DEMO credits)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StartBlackjackDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "deal", null);
__decorate([
    (0, common_1.Post)('twenty-one/hands/:id/action'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    (0, swagger_1.ApiOperation)({ summary: 'hit | stand | double | split | insurance {accept} (idempotent)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, BlackjackActionDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "handAction", null);
__decorate([
    (0, common_1.Get)('vault-sweeper/rounds/current'),
    (0, guards_1.PlayerAuth)(),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "currentMines", null);
__decorate([
    (0, common_1.Post)('vault-sweeper/rounds'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Start a Vault Sweeper board (mines fixed by the seeds before the first pick)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StartMinesDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "startMines", null);
__decorate([
    (0, common_1.Post)('vault-sweeper/rounds/:id/reveal'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, MinesRevealDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "reveal", null);
__decorate([
    (0, common_1.Post)('vault-sweeper/rounds/:id/cashout'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, CashOutDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "minesCashOut", null);
__decorate([
    (0, common_1.Get)('high-card/rounds/current'),
    (0, guards_1.PlayerAuth)(),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "currentHilo", null);
__decorate([
    (0, common_1.Post)('high-card/rounds'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({ summary: 'Start a High Card run (card sequence fixed by the seeds)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, StartHiloDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "startHilo", null);
__decorate([
    (0, common_1.Post)('high-card/rounds/:id/action'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    (0, swagger_1.ApiOperation)({ summary: 'higher_or_same | lower_or_same | skip' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, HiloActionDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "hiloAction", null);
__decorate([
    (0, common_1.Post)('high-card/rounds/:id/cashout'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, CashOutDto]),
    __metadata("design:returntype", void 0)
], GamesPlayController.prototype, "hiloCashOut", null);
exports.GamesPlayController = GamesPlayController = __decorate([
    (0, swagger_1.ApiTags)('games · play (DEMO credits)'),
    (0, common_1.Controller)('games'),
    __metadata("design:paramtypes", [credits_service_1.CreditsService,
        bets_service_1.BetsService,
        stateful_service_1.StatefulGamesService])
], GamesPlayController);
let CrashController = class CrashController {
    crash;
    constructor(crash) {
        this.crash = crash;
    }
    state() {
        return this.crash.snapshot();
    }
    rounds(q) {
        return this.crash.rounds(q.page, q.pageSize);
    }
    async round(number) {
        return this.crash.publicRound(await this.crash.roundByNumber(number), null);
    }
    verify(number) {
        return this.crash.verify(number);
    }
    myBets(user, q) {
        return this.crash.myBets(user.id, q.page, q.pageSize);
    }
    myCurrent(user) {
        return this.crash.myCurrentBet(user.id);
    }
    placeBet(user, body) {
        return this.crash.placeBet(user, body);
    }
    cashOut(user, id, body) {
        return this.crash.cashOut(user, id, body);
    }
};
exports.CrashController = CrashController;
__decorate([
    (0, common_1.Get)('state'),
    (0, swagger_1.ApiOperation)({
        summary: 'Live round (commitment, phase, multiplier — never the crash point before the crash), live bets, last 20 crash points',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "state", null);
__decorate([
    (0, common_1.Get)('rounds'),
    (0, swagger_1.ApiOperation)({ summary: 'Crashed rounds with revealed seeds and crash points' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BetsQueryDto]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "rounds", null);
__decorate([
    (0, common_1.Get)('rounds/:number'),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CrashController.prototype, "round", null);
__decorate([
    (0, common_1.Get)('rounds/:number/verify'),
    (0, swagger_1.ApiOperation)({
        summary: 'Public verification: seed → round commitment → chain commitment, recomputed crash point',
    }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('bets'),
    (0, guards_1.PlayerAuth)(),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BetsQueryDto]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "myBets", null);
__decorate([
    (0, common_1.Get)('bets/current'),
    (0, guards_1.PlayerAuth)(),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "myCurrent", null);
__decorate([
    (0, common_1.Post)('bets'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Bet in the betting window (idempotent); optional auto cash-out 1.01×–1,000.00× runs server-side',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CrashBetDto]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "placeBet", null);
__decorate([
    (0, common_1.Post)('bets/:id/cashout'),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(CONTINUE_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Cash out at the current server multiplier (the response shows the final bet state)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, CashOutDto]),
    __metadata("design:returntype", void 0)
], CrashController.prototype, "cashOut", null);
exports.CrashController = CrashController = __decorate([
    (0, swagger_1.ApiTags)('games · Orbit Rush (crash)'),
    (0, common_1.Controller)('games/orbit-rush'),
    __metadata("design:paramtypes", [crash_service_1.CrashEngineService])
], CrashController);
/** Generic per-game routes (registered after the specific ones above). */
let GameSeedsBetsController = class GameSeedsBetsController {
    seeds;
    bets;
    constructor(seeds, bets) {
        this.seeds = seeds;
        this.bets = bets;
    }
    getSeeds(user, slug) {
        return this.seeds.view(user.id, slug);
    }
    setClientSeed(user, slug, body) {
        return this.seeds.rotate(user.id, slug, body.clientSeed);
    }
    rotate(user, slug) {
        return this.seeds.rotate(user.id, slug);
    }
    place(user, slug, body) {
        return this.bets.placeInstant(user, slug, body);
    }
    history(user, slug, q) {
        return this.bets.history(user.id, slug, q.page, q.pageSize);
    }
};
exports.GameSeedsBetsController = GameSeedsBetsController;
__decorate([
    (0, common_1.Get)(':slug/seeds'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Active seed pair (server seed hash, client seed, nonce) + revealed pairs',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GameSeedsBetsController.prototype, "getSeeds", null);
__decorate([
    (0, common_1.Post)(':slug/seeds/client'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Change the client seed: reveals the current server seed and commits a new one',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ClientSeedDto]),
    __metadata("design:returntype", void 0)
], GameSeedsBetsController.prototype, "setClientSeed", null);
__decorate([
    (0, common_1.Post)(':slug/seeds/rotate'),
    (0, common_1.HttpCode)(200),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Reveal the current server seed and commit a new one (same client seed)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GameSeedsBetsController.prototype, "rotate", null);
__decorate([
    (0, common_1.Post)(':slug/bets'),
    (0, common_1.HttpCode)(201),
    (0, throttler_1.Throttle)(BET_THROTTLE),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Instant bet (Pool Dice, Double Side, Pool Roulette, Skyline, Fortune Ring, Pool Keno, Pinfall) — idempotent, DEMO credits only',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, PlaceBetDto]),
    __metadata("design:returntype", void 0)
], GameSeedsBetsController.prototype, "place", null);
__decorate([
    (0, common_1.Get)(':slug/bets'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'My bets for a game (newest first) + DEMO totals' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, BetsQueryDto]),
    __metadata("design:returntype", void 0)
], GameSeedsBetsController.prototype, "history", null);
exports.GameSeedsBetsController = GameSeedsBetsController = __decorate([
    (0, swagger_1.ApiTags)('games · play (DEMO credits)'),
    (0, common_1.Controller)('games'),
    __metadata("design:paramtypes", [seeds_service_1.SeedsService,
        bets_service_1.BetsService])
], GameSeedsBetsController);
//# sourceMappingURL=play.controller.js.map