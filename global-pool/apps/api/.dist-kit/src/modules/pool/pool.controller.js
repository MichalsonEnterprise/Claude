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
exports.PoolController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fees_1 = require("@gp/shared/fees");
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const errors_1 = require("../../common/errors");
const request_1 = require("../../common/request");
const zod_2 = require("../../common/zod");
const guards_1 = require("../auth/guards");
const entries_service_1 = require("./entries.service");
const entry_history_service_1 = require("./entry-history.service");
const rounds_service_1 = require("./rounds.service");
class EnterRoundDto extends (0, zod_2.createZodDto)(schemas_1.enterRoundSchema.omit({ roundId: true })) {
}
class PaginationDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema) {
}
const HISTORY_STATUSES = ['closed', 'drawing', 'settled', 'cancelled'];
/** GET /pool/rounds filters (additive): ?status=settled,cancelled&number=1245 */
class RoundHistoryDto extends (0, zod_2.createZodDto)(schemas_1.paginationQuerySchema.extend({
    status: zod_1.z
        .string()
        .optional()
        .transform((v) => v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [])
        .pipe(zod_1.z.array(zod_1.z.enum(HISTORY_STATUSES))),
    number: zod_1.z.coerce.number().int().min(1).optional(),
})) {
}
class QuoteDto extends (0, zod_2.createZodDto)(zod_1.z.object({
    entries: zod_1.z.coerce.number().int().min(fees_1.MIN_ENTRIES_PER_PURCHASE).max(fees_1.MAX_ENTRIES_PER_PURCHASE),
})) {
}
class LimitDto extends (0, zod_2.createZodDto)(zod_1.z.object({ limit: zod_1.z.coerce.number().int().min(1).max(50).default(10) })) {
}
let PoolController = class PoolController {
    rounds;
    entries;
    entryHistory;
    constructor(rounds, entries, entryHistory) {
        this.rounds = rounds;
        this.entries = entries;
        this.entryHistory = entryHistory;
    }
    async current() {
        const round = await this.rounds.current();
        if (!round)
            throw (0, errors_1.notFound)('Round');
        return this.rounds.view(round);
    }
    history(query) {
        return this.rounds.history({ page: query.page, pageSize: query.pageSize }, { statuses: query.status, number: query.number });
    }
    myEntryHistory(user, query) {
        return this.entryHistory.history(user.id, query);
    }
    quote(query) {
        return this.entries.quote(query.entries);
    }
    winners(query) {
        return this.rounds.recentWinners(query.limit);
    }
    async byNumber(number) {
        return this.rounds.view(await this.rounds.byNumber(number));
    }
    verify(number) {
        return this.rounds.verification(number);
    }
    async feed(number, query) {
        const round = await this.rounds.byNumber(number);
        return this.rounds.feed(round.id, query.limit);
    }
    enter(user, roundId, body) {
        return this.entries.enter(user, roundId, body.entries, body.idempotencyKey);
    }
    myEntries(user, roundId) {
        return this.rounds.myEntries(user.id, roundId);
    }
};
exports.PoolController = PoolController;
__decorate([
    (0, common_1.Get)('rounds/current'),
    (0, swagger_1.ApiOperation)({
        summary: 'Current round (open → next scheduled → latest) with pool, thresholds and prize table',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PoolController.prototype, "current", null);
__decorate([
    (0, common_1.Get)('rounds'),
    (0, swagger_1.ApiOperation)({ summary: 'Round history (closed, drawing, settled, cancelled)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RoundHistoryDto]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('me/entries'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Your entry history: one row per purchase (entries + separate platform fee) with its result, plus lifetime summary',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PaginationDto]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "myEntryHistory", null);
__decorate([
    (0, common_1.Get)('quote'),
    (0, swagger_1.ApiOperation)({
        summary: 'Entry quote: n × 10.00 + platform fee n × 0.05 (separate line) + network fee 0.00',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QuoteDto]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "quote", null);
__decorate([
    (0, common_1.Get)('winners'),
    (0, swagger_1.ApiOperation)({ summary: 'Recent winners' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LimitDto]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "winners", null);
__decorate([
    (0, common_1.Get)('rounds/:number'),
    (0, swagger_1.ApiOperation)({ summary: 'Round by public number (e.g. 1248)' }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PoolController.prototype, "byNumber", null);
__decorate([
    (0, common_1.Get)('rounds/:number/verify'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verification bundle: VRF word, algorithm, recomputed winners vs stored winners',
    }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('rounds/:number/feed'),
    (0, swagger_1.ApiOperation)({ summary: 'Latest entry purchases in a round' }),
    __param(0, (0, common_1.Param)('number', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, LimitDto]),
    __metadata("design:returntype", Promise)
], PoolController.prototype, "feed", null);
__decorate([
    (0, common_1.Post)('rounds/:roundId/entries'),
    (0, common_1.HttpCode)(201),
    (0, guards_1.PlayerAuth)(guards_1.GAMING_POLICY),
    (0, swagger_1.ApiOperation)({
        summary: 'Buy entries (idempotent): RG limits, balance check, AVAILABLE → POOL + FEES in one DB transaction',
    }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('roundId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, EnterRoundDto]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "enter", null);
__decorate([
    (0, common_1.Get)('rounds/:roundId/my-entries'),
    (0, guards_1.PlayerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Your entries in a round + odds disclosure' }),
    __param(0, (0, request_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('roundId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PoolController.prototype, "myEntries", null);
exports.PoolController = PoolController = __decorate([
    (0, swagger_1.ApiTags)('pool'),
    (0, common_1.Controller)('pool'),
    __metadata("design:paramtypes", [rounds_service_1.RoundsService,
        entries_service_1.EntriesService,
        entry_history_service_1.EntryHistoryService])
], PoolController);
//# sourceMappingURL=pool.controller.js.map