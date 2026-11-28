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
exports.HistoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schemas_1 = require("@gp/shared/schemas");
const nestjs_zod_1 = require("nestjs-zod");
const request_1 = require("../../common/request");
const zod_1 = require("../../common/zod");
const audit_service_1 = require("../audit/audit.service");
const guards_1 = require("../auth/guards");
const history_service_1 = require("./history.service");
class TxQueryDto extends (0, zod_1.createZodDto)(schemas_1.historyTransactionsQuerySchema) {
}
class ExportQueryDto extends (0, zod_1.createZodDto)(schemas_1.historyExportQuerySchema) {
}
class EntriesQueryDto extends (0, zod_1.createZodDto)(schemas_1.historyEntriesQuerySchema) {
}
class GameRoundsQueryDto extends (0, zod_1.createZodDto)(schemas_1.historyGameRoundsQuerySchema) {
}
class PageQueryDto extends (0, zod_1.createZodDto)(schemas_1.paginationQuerySchema) {
}
/**
 * Player history (USR-F1..F6, USR-G1..G7): read-only views over transactions, entries, winners and game sessions.
 * Available while self-excluded (history must stay visible). CSV exports are written to the audit log.
 */
let HistoryController = class HistoryController {
    history;
    audit;
    constructor(history, audit) {
        this.history = history;
        this.audit = audit;
    }
    summary(user) {
        return this.history.financeSummary(user.id);
    }
    transactions(user, q) {
        return this.history.transactionsList(user.id, q);
    }
    async exportTransactions(user, q, res) {
        const out = await this.history.transactionsCsv(user.id, q);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.history.exported',
            targetType: 'user',
            targetId: user.id,
            metadata: { kind: 'transactions', rows: out.rows, filters: { ...q } },
        });
        res
            .status(200)
            .type('text/csv; charset=utf-8')
            .setHeader('Content-Disposition', `attachment; filename="${out.fileName}"`)
            .setHeader('X-Export-Rows', String(out.rows))
            .send(out.csv);
    }
    fees(user, q) {
        return this.history.fees(user.id, q.page, q.pageSize);
    }
    entries(user, q) {
        return this.history.entries(user.id, q);
    }
    activeRounds(user) {
        return this.history.activeRounds(user.id);
    }
    results(user) {
        return this.history.results(user.id);
    }
    winnings(user) {
        return this.history.winnings(user.id);
    }
    games(user) {
        return this.history.gamesOverview(user.id);
    }
    gameRounds(user, q) {
        return this.history.gameRounds(user.id, q);
    }
    async exportGameRounds(user, q, res) {
        const out = await this.history.gameRoundsCsv(user.id, q);
        await this.audit.record({
            actorType: 'user',
            actorId: user.id,
            action: 'user.history.exported',
            targetType: 'user',
            targetId: user.id,
            metadata: { kind: 'game_rounds', rows: out.rows },
        });
        res
            .status(200)
            .type('text/csv; charset=utf-8')
            .setHeader('Content-Disposition', `attachment; filename="${out.fileName}"`)
            .setHeader('X-Export-Rows', String(out.rows))
            .send(out.csv);
    }
    favourites(user) {
        return this.history.favourites(user.id);
    }
    addFavourite(user, slug) {
        return this.history.addFavourite(user.id, slug);
    }
    removeFavourite(user, slug) {
        return this.history.removeFavourite(user.id, slug);
    }
};
exports.HistoryController = HistoryController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Financial KPIs: deposits, withdrawals, fees, rewards, refunds' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transactions with several types at once and search on reference / hash',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, TxQueryDto]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "transactions", null);
__decorate([
    (0, common_1.Get)('transactions/export'),
    (0, swagger_1.ApiProduces)('text/csv'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    (0, swagger_1.ApiOperation)({
        summary: 'CSV export of the filtered transaction history (logged in the audit trail)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "exportTransactions", null);
__decorate([
    (0, common_1.Get)('fees'),
    (0, swagger_1.ApiOperation)({
        summary: 'Fee lines: 0.05 USDT platform fee per entry + network fees (separate lines)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PageQueryDto]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "fees", null);
__decorate([
    (0, common_1.Get)('entries'),
    (0, swagger_1.ApiOperation)({
        summary: 'My Global Pool entries grouped by round (filters: status, round range)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, EntriesQueryDto]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "entries", null);
__decorate([
    (0, common_1.Get)('rounds/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Rounds still open / drawing in which you hold entries (+ odds share)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "activeRounds", null);
__decorate([
    (0, common_1.Get)('rounds/results'),
    (0, swagger_1.ApiOperation)({ summary: 'Settled and cancelled rounds you took part in, with your result' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "results", null);
__decorate([
    (0, common_1.Get)('winnings'),
    (0, swagger_1.ApiOperation)({ summary: 'Prizes, refunds and rewards — owed vs settled' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "winnings", null);
__decorate([
    (0, common_1.Get)('games'),
    (0, swagger_1.ApiOperation)({
        summary: 'My games overview: active rounds, recently played games, 30-day totals',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "games", null);
__decorate([
    (0, common_1.Get)('game-rounds'),
    (0, swagger_1.ApiOperation)({ summary: 'Game history (commit–reveal seeds; simulation mode)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GameRoundsQueryDto]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "gameRounds", null);
__decorate([
    (0, common_1.Get)('game-rounds/export'),
    (0, swagger_1.ApiProduces)('text/csv'),
    (0, swagger_1.ApiOperation)({
        summary: 'CSV export of game history with seeds and nonces (logged in the audit trail)',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GameRoundsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], HistoryController.prototype, "exportGameRounds", null);
__decorate([
    (0, common_1.Get)('favourites'),
    (0, swagger_1.ApiOperation)({ summary: 'Favourite games' }),
    __param(0, (0, request_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "favourites", null);
__decorate([
    (0, common_1.Put)('favourites/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a game to favourites (idempotent)' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug', new nestjs_zod_1.ZodValidationPipe(schemas_1.favouriteSlugSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "addFavourite", null);
__decorate([
    (0, common_1.Delete)('favourites/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a game from favourites' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('slug', new nestjs_zod_1.ZodValidationPipe(schemas_1.favouriteSlugSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HistoryController.prototype, "removeFavourite", null);
exports.HistoryController = HistoryController = __decorate([
    (0, swagger_1.ApiTags)('history'),
    (0, guards_1.PlayerAuth)(),
    (0, common_1.Controller)('history'),
    __metadata("design:paramtypes", [history_service_1.HistoryService,
        audit_service_1.AuditService])
], HistoryController);
//# sourceMappingURL=history.controller.js.map