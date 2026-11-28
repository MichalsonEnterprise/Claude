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
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const limits_1 = require("@gp/shared/limits");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const kyc_flow_service_1 = require("./kyc-flow.service");
const kyc_provider_1 = require("./kyc.provider");
let KycService = class KycService {
    prisma;
    provider = new kyc_provider_1.MockKycProvider();
    constructor(prisma) {
        this.prisma = prisma;
    }
    async status(userId) {
        const [profile, records] = await Promise.all([
            this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }),
            this.prisma.kycRecord.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const level = profile?.kycLevel ?? 'none';
        return {
            level,
            label: enums_1.KYC_LEVEL_LABEL[level],
            status: records[0]?.status ?? 'not_started',
            dailyWithdrawalLimit: limits_1.DAILY_WITHDRAWAL_LIMIT[level],
            provider: this.provider.name,
            records: records.map((r) => ({
                id: r.id,
                level: r.level,
                status: r.status,
                provider: r.provider,
                submittedAt: r.submittedAt?.toISOString() ?? null,
                reviewedAt: r.reviewedAt?.toISOString() ?? null,
                rejectionReason: r.rejectionReason,
            })),
        };
    }
    async start(userId, level) {
        const current = (await this.prisma.userProfile.findUnique({ where: { userId } }))?.kycLevel ?? 'none';
        if (enums_1.KYC_LEVEL_RANK[current] >= enums_1.KYC_LEVEL_RANK[level]) {
            throw new errors_1.AppError('CONFLICT', `You are already verified at ${enums_1.KYC_LEVEL_LABEL[current]}`);
        }
        const session = await this.provider.startVerification({ userId, level });
        const record = await this.prisma.kycRecord.create({
            data: {
                userId,
                level,
                status: 'pending',
                provider: session.provider,
                providerRef: session.providerRef,
                submittedAt: new Date(),
            },
        });
        return {
            recordId: record.id,
            status: record.status,
            level,
            redirectUrl: session.redirectUrl,
            provider: session.provider,
        };
    }
    /** Mock provider callback / DEMO approval: mark the latest pending record verified and raise the level. */
    async approve(userId, level, isDemo = true) {
        const now = new Date();
        await this.prisma.tx(async (tx) => {
            const pending = await tx.kycRecord.findFirst({
                where: { userId, level, status: { in: ['pending', 'in_review'] } },
                orderBy: { createdAt: 'desc' },
            });
            if (pending) {
                const details = (0, kyc_flow_service_1.approveFlowDetails)(pending.details, now);
                await tx.kycRecord.update({
                    where: { id: pending.id },
                    data: { status: 'verified', reviewedAt: now, ...(details ? { details } : {}) },
                });
            }
            else {
                await tx.kycRecord.create({
                    data: {
                        userId,
                        level,
                        status: 'verified',
                        provider: this.provider.name,
                        submittedAt: now,
                        reviewedAt: now,
                        isDemo,
                    },
                });
            }
            await tx.userProfile.update({ where: { userId }, data: { kycLevel: level } });
        });
        return this.status(userId);
    }
};
exports.KycService = KycService;
exports.KycService = KycService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KycService);
//# sourceMappingURL=kyc.service.js.map