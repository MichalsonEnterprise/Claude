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
exports.AffiliatesService = void 0;
const common_1 = require("@nestjs/common");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
/** Referral / affiliate STUB: read-only stats; commission accrual & payouts are a later batch. */
let AffiliatesService = class AffiliatesService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async myReferrals(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { handle: true, publicId: true },
        });
        const code = (user.handle ?? user.publicId)
            .replace(/[^a-z0-9]/gi, '')
            .toUpperCase()
            .slice(0, 10);
        const [signUps, qualified] = await Promise.all([
            this.prisma.referral.count({ where: { referrerUserId: userId } }),
            this.prisma.referral.count({ where: { referrerUserId: userId, qualifiedAt: { not: null } } }),
        ]);
        return {
            code,
            link: `${this.config.env.APP_URL}/r/${code}`,
            program: { commissionPercentOfPlatformFee: '20', durationMonths: 12, minimumPayout: '20.00' },
            stats: { signUps, qualified, earned: '0.00', available: '0.00', pending: '0.00' },
            stub: true,
        };
    }
    async listAffiliates() {
        const rows = await this.prisma.affiliate.findMany({ orderBy: { code: 'asc' } });
        return rows.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            plan: a.plan,
            status: a.status,
            isDemo: a.isDemo,
        }));
    }
};
exports.AffiliatesService = AffiliatesService;
exports.AffiliatesService = AffiliatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig])
], AffiliatesService);
//# sourceMappingURL=affiliates.service.js.map