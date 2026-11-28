"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesModule = void 0;
const common_1 = require("@nestjs/common");
const admin_module_1 = require("../admin/admin.module");
const admin_games_controller_1 = require("./admin-games.controller");
const bets_service_1 = require("./engine/bets.service");
const crash_gateway_1 = require("./engine/crash.gateway");
const crash_service_1 = require("./engine/crash.service");
const credits_service_1 = require("./engine/credits.service");
const games_common_1 = require("./engine/games-common");
const policy_service_1 = require("./engine/policy.service");
const seeds_service_1 = require("./engine/seeds.service");
const stateful_service_1 = require("./engine/stateful.service");
const games_controller_1 = require("./games.controller");
const games_service_1 = require("./games.service");
const play_controller_1 = require("./play.controller");
/**
 * Games: catalogue + the provably-fair games engine (DEMO credits only, no cash value — never the USDT ledger).
 * Controller order matters: specific routes (/games/credits, /games/orbit-rush/…) are registered before the generic
 * /games/:slug/… and /games/:slug routes.
 */
let GamesModule = class GamesModule {
};
exports.GamesModule = GamesModule;
exports.GamesModule = GamesModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_module_1.AdminModule],
        controllers: [
            play_controller_1.GamesPlayController,
            play_controller_1.CrashController,
            play_controller_1.GameSeedsBetsController,
            games_controller_1.GamesController,
            admin_games_controller_1.AdminGamesController,
        ],
        providers: [
            games_service_1.GamesService,
            games_common_1.GameClock,
            credits_service_1.CreditsService,
            seeds_service_1.SeedsService,
            policy_service_1.GamesPolicyService,
            bets_service_1.BetsService,
            stateful_service_1.StatefulGamesService,
            crash_service_1.CrashEngineService,
            crash_gateway_1.CrashGateway,
        ],
        exports: [games_service_1.GamesService, credits_service_1.CreditsService, crash_service_1.CrashEngineService, games_common_1.GameClock],
    })
], GamesModule);
//# sourceMappingURL=games.module.js.map