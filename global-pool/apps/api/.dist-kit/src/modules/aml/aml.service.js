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
exports.AmlService = void 0;
const common_1 = require("@nestjs/common");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const aml_provider_1 = require("./aml.provider");
let AmlService = class AmlService {
    prisma;
    provider = new aml_provider_1.MockAmlProvider();
    constructor(prisma) {
        this.prisma = prisma;
    }
    get providerName() {
        return this.provider.name;
    }
    /** Read-only screening preview (withdrawal pre-check before 2FA): no alert is written. */
    previewWithdrawal(input) {
        return this.provider.screenWithdrawal(input);
    }
    async screenWithdrawal(db, input) {
        const started = performance.now();
        const result = await this.provider.screenWithdrawal(input);
        if (result.riskLevel !== 'low') {
            await db.amlAlert.create({
                data: {
                    userId: input.userId,
                    withdrawalId: input.withdrawalId,
                    riskLevel: result.riskLevel,
                    rule: result.flags.join(',') || 'manual_review',
                    status: result.decision === 'reject' ? 'resolved' : 'open',
                    resolution: result.decision === 'reject' ? 'auto_rejected' : null,
                    resolvedAt: result.decision === 'reject' ? new Date() : null,
                    details: {
                        provider: result.provider,
                        decision: result.decision,
                        reason: result.reason,
                        checks: result.checks,
                        durationMs: Math.round(performance.now() - started),
                    },
                },
            });
        }
        return result;
    }
    async list(query) {
        const where = query.status ? { status: query.status } : {};
        const [rows, total] = await Promise.all([
            this.prisma.amlAlert.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    user: { select: { publicId: true, handle: true } },
                    withdrawal: { select: { number: true } },
                },
            }),
            this.prisma.amlAlert.count({ where }),
        ]);
        return (0, schemas_1.paginate)(rows.map((a) => ({
            id: a.id,
            riskLevel: a.riskLevel,
            rule: a.rule,
            status: a.status,
            user: a.user ? { publicId: a.user.publicId, handle: a.user.handle } : null,
            withdrawal: a.withdrawal ? `WD-${a.withdrawal.number}` : null,
            details: a.details,
            resolution: a.resolution,
            createdAt: a.createdAt.toISOString(),
            isDemo: a.isDemo,
        })), total, query);
    }
    async resolve(id, adminId, resolution, note, db = this.prisma) {
        const alert = await db.amlAlert.findUnique({ where: { id } });
        if (!alert)
            throw (0, errors_1.notFound)('AML alert');
        return db.amlAlert.update({
            where: { id },
            data: {
                status: resolution,
                resolution: note,
                resolvedAt: new Date(),
                resolvedByAdminId: adminId,
            },
        });
    }
};
exports.AmlService = AmlService;
exports.AmlService = AmlService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AmlService);
//# sourceMappingURL=aml.service.js.map