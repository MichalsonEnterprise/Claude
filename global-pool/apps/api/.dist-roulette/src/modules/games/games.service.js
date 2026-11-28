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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesService = void 0;
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** Game catalogue (DB). Games are NON-MONETARY simulations until separately approved (mode = simulation). */
let GamesService = class GamesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(category) {
        const rows = await this.prisma.game.findMany({
            where: { enabled: true, ...(category ? { category } : {}) },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        return rows.map((g) => this.view(g));
    }
    async bySlug(slug) {
        const game = await this.prisma.game.findUnique({ where: { slug } });
        if (!game || !game.enabled)
            throw (0, errors_1.notFound)('Game');
        return this.view(game);
    }
    view(g) {
        return {
            id: g.id,
            slug: g.slug,
            name: g.name,
            category: g.category,
            mechanic: g.mechanic,
            houseEdgePercent: g.houseEdgePercent?.toFixed(2) ?? null,
            edgeLabel: g.edgeLabel,
            icon: g.icon,
            players: g.playersDemo,
            details: g.details,
            mode: g.mode,
            realMoney: false,
            isDemo: g.isDemo,
            play: this.play(g),
        };
    }
    /** Playable engine games: published limits, edge and rules (DEMO credits, no cash value). */
    play(g) {
        const info = (0, fair_1.fairGame)(g.slug);
        if (!info || g.mode !== 'simulation')
            return { playable: false };
        return {
            playable: true,
            kind: info.kind,
            mode: info.mode,
            currency: fair_1.DEMO_CREDITS_CURRENCY,
            creditsLabel: fair_1.DEMO_CREDITS_LABEL,
            fee: fair_1.GAME_BET_FEE,
            minBet: info.minBet,
            maxBet: info.maxBet,
            tableMax: info.tableMax ?? null,
            maxPayout: info.maxPayout ?? null,
            houseEdgePercent: info.houseEdgePercent,
            rtpPercent: info.rtpPercent,
            rulesVersion: info.rulesVersion,
            rules: info.rules,
            provablyFair: true,
            realMoney: false,
        };
    }
};
exports.GamesService = GamesService;
exports.GamesService = GamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamesService);
//# sourceMappingURL=games.service.js.map