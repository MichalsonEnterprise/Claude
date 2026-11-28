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
exports.AdminGamesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fair_1 = require("@gp/shared/fair");
const money_1 = require("@gp/shared/money");
const zod_1 = require("zod");
const zod_2 = require("../../common/zod");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const admin_guards_1 = require("../admin/admin.guards");
const crash_service_1 = require("./engine/crash.service");
const games_common_1 = require("./engine/games-common");
class AdminBetsQueryDto extends (0, zod_2.createZodDto)(zod_1.z.object({
    game: zod_1.z.string().optional(),
    userId: zod_1.z.string().uuid().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(25),
})) {
}
const NO_CONTROLS = 'Read-only monitoring. Outcomes come only from committed seeds: there is no endpoint, flag or tool to choose, edit, re-roll or bias a result, change odds per player or adjust DEMO balances.';
/**
 * Admin game monitoring (permission games.read) — READ-ONLY. Measured RTP is shown next to the published RTP;
 * the live Orbit Rush round never exposes its crash point before the crash.
 */
let AdminGamesController = class AdminGamesController {
    prisma;
    crash;
    constructor(prisma, crash) {
        this.prisma = prisma;
        this.crash = crash;
    }
    async overview() {
        const now = Date.now();
        const d1 = new Date(now - 86_400_000);
        const d30 = new Date(now - 30 * 86_400_000);
        const games = await this.prisma.game.findMany({ where: { slug: { in: fair_1.FAIR_GAME_SLUGS } } });
        const rows = await Promise.all(games.map(async (g) => {
            const info = fair_1.FAIR_GAMES[g.slug];
            const window = async (since) => {
                if (g.slug === 'orbit-rush') {
                    const a = await this.prisma.crashBet.aggregate({
                        where: { createdAt: { gte: since }, status: { not: 'active' } },
                        _sum: { stake: true, payout: true },
                        _count: true,
                    });
                    return { bets: a._count, stake: a._sum.stake, payout: a._sum.payout };
                }
                const a = await this.prisma.gameResult.aggregate({
                    where: { gameId: g.id, status: 'settled', createdAt: { gte: since } },
                    _sum: { stake: true, payout: true },
                    _count: true,
                });
                return { bets: a._count, stake: a._sum.stake, payout: a._sum.payout };
            };
            const view = (w) => {
                const staked = (0, money_1.money)((0, games_common_1.credits)(w.stake));
                const paid = (0, money_1.money)((0, games_common_1.credits)(w.payout));
                return {
                    bets: w.bets,
                    wagered: (0, games_common_1.credits)(w.stake),
                    returned: (0, games_common_1.credits)(w.payout),
                    measuredRtpPercent: staked.gt(0) ? paid.div(staked).times(100).toFixed(2) : null,
                };
            };
            const open = g.slug === 'orbit-rush'
                ? await this.prisma.crashBet.count({ where: { status: 'active' } })
                : await this.prisma.gameResult.count({ where: { gameId: g.id, status: 'active' } });
            return {
                slug: g.slug,
                name: g.name,
                enabled: g.enabled,
                mode: g.mode,
                publishedHouseEdgePercent: info.houseEdgePercent,
                publishedRtpPercent: info.rtpPercent,
                limits: {
                    minBet: info.minBet,
                    maxBet: info.maxBet,
                    tableMax: info.tableMax ?? null,
                    maxPayout: info.maxPayout ?? null,
                },
                rulesVersion: info.rulesVersion,
                last24h: view(await window(d1)),
                last30d: view(await window(d30)),
                openRounds: open,
            };
        }));
        return { games: rows, currency: 'DEMO', controls: 'none', note: NO_CONTROLS, isDemo: true };
    }
    async bets(q) {
        const where = {
            ...(q.userId ? { userId: q.userId } : {}),
            ...(q.game ? { session: { game: { slug: q.game } } } : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.gameResult.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (q.page - 1) * q.pageSize,
                take: q.pageSize,
                include: {
                    session: {
                        include: {
                            game: { select: { slug: true, name: true } },
                            user: { select: { publicId: true, handle: true } },
                        },
                    },
                },
            }),
            this.prisma.gameResult.count({ where }),
        ]);
        return {
            items: rows.map((r) => ({
                id: r.id,
                ref: (0, games_common_1.refOf)(r.session.game.slug, r.refNumber),
                game: r.session.game,
                player: {
                    id: r.session.userId,
                    publicId: r.session.user.publicId,
                    handle: r.session.user.handle,
                },
                status: r.status,
                stake: (0, games_common_1.credits)(r.stake),
                payout: (0, games_common_1.credits)(r.payout),
                nonce: r.nonce,
                serverSeedHash: r.session.serverSeedHash,
                seedRevealed: r.session.status !== 'active',
                createdAt: r.createdAt.toISOString(),
            })),
            page: q.page,
            pageSize: q.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
            controls: 'none',
            note: NO_CONTROLS,
            isDemo: true,
        };
    }
    async crashRounds(q) {
        const snapshot = await this.crash.snapshot();
        return {
            live: snapshot.round,
            history: await this.crash.rounds(q.page, q.pageSize),
            controls: 'none',
            note: NO_CONTROLS,
        };
    }
};
exports.AdminGamesController = AdminGamesController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Per game (24 h / 30 d): bets, wagered, returned, measured vs published RTP, open rounds',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGamesController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('bets'),
    (0, swagger_1.ApiOperation)({ summary: 'Recent settled / open bets (filter by game slug or user id)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminBetsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminGamesController.prototype, "bets", null);
__decorate([
    (0, common_1.Get)('orbit-rush/rounds'),
    (0, swagger_1.ApiOperation)({
        summary: 'Orbit Rush rounds: live round (commitment only) + crashed rounds with seeds',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminBetsQueryDto]),
    __metadata("design:returntype", Promise)
], AdminGamesController.prototype, "crashRounds", null);
exports.AdminGamesController = AdminGamesController = __decorate([
    (0, swagger_1.ApiTags)('admin · games (read-only)'),
    (0, common_1.Controller)('admin/games'),
    (0, admin_guards_1.AdminAuth)(),
    (0, admin_guards_1.RequirePermissions)('games.read'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        crash_service_1.CrashEngineService])
], AdminGamesController);
//# sourceMappingURL=admin-games.controller.js.map