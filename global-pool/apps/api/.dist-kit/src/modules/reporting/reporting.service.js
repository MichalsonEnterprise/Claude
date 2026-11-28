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
exports.ReportingService = void 0;
const common_1 = require("@nestjs/common");
const money_1 = require("@gp/shared/money");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const ledger_service_1 = require("../ledger/ledger.service");
/** KPIs for the admin dashboard — money figures come from the ledger (never from UI projections). */
let ReportingService = class ReportingService {
    prisma;
    ledger;
    constructor(prisma, ledger) {
        this.prisma = prisma;
        this.ledger = ledger;
    }
    async kpis(now = new Date()) {
        const since = (0, time_1.addDays)(now, -30);
        const [totalUsers, activeUsers, deposits, withdrawals, fees30d, byType, poolLiabilities, owedPrizes, activeRounds, pendingWithdrawals, underReview, kycPending, amlOpen, reconciliation,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({
                where: {
                    OR: [
                        { lastLoginAt: { gte: since } },
                        { entries: { some: { createdAt: { gte: since } } } },
                    ],
                },
            }),
            this.prisma.deposit.aggregate({
                where: { status: 'credited', creditedAt: { gte: since } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.withdrawal.aggregate({
                where: { status: 'confirmed', confirmedAt: { gte: since } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.feeLedger.aggregate({
                where: { createdAt: { gte: since } },
                _sum: { amount: true, entryCount: true },
            }),
            this.ledger.balancesByType(),
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN rounds r ON r.id = a.round_id
        WHERE a.type = 'pool' AND r.status IN ('open', 'closed', 'drawing')`,
            this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
            this.prisma.round.count({ where: { status: { in: ['open', 'closed', 'drawing'] } } }),
            this.prisma.withdrawal.count({
                where: {
                    status: { in: ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'] },
                },
            }),
            this.prisma.withdrawal.count({ where: { status: 'under_review' } }),
            this.prisma.kycRecord.count({ where: { status: { in: ['pending', 'in_review'] } } }),
            this.prisma.amlAlert.count({
                where: { status: { in: ['open', 'under_review', 'escalated'] } },
            }),
            this.ledger.reconcile(),
        ]);
        const bucket = (t) => (0, money_1.money)(byType[t] ?? '0');
        const customerLiabilities = bucket('user_available')
            .plus(bucket('user_locked'))
            .plus(bucket('user_pending'))
            .plus(bucket('user_owed'));
        return {
            windowDays: 30,
            totalUsers,
            activeUsers,
            totalDeposits: (0, money_2.usdt)(deposits._sum.amount),
            depositsCount: deposits._count,
            totalWithdrawals: (0, money_2.usdt)(withdrawals._sum.amount),
            withdrawalsCount: withdrawals._count,
            platformFees: (0, money_2.usdt)(fees30d._sum.amount),
            qualifyingEntries: fees30d._sum.entryCount ?? 0,
            platformFeesAllTime: (0, money_1.toUSDTString)(bucket('fees')),
            poolLiabilities: (0, money_1.toUSDTString)((0, money_1.money)(poolLiabilities[0]?.total ?? '0')),
            owedPrizes: (0, money_2.usdt)(owedPrizes._sum.amount),
            owedTotal: (0, money_1.toUSDTString)(bucket('user_owed')),
            customerLiabilities: (0, money_1.toUSDTString)(customerLiabilities),
            chainClearing: (0, money_1.toUSDTString)(bucket('chain_clearing')),
            operatorRevenue: (0, money_1.toUSDTString)(bucket('operator_revenue')),
            activeRounds,
            pendingWithdrawals,
            withdrawalsUnderReview: underReview,
            kycPending,
            amlOpenAlerts: amlOpen,
            ledger: reconciliation,
            generatedAt: now.toISOString(),
        };
    }
};
exports.ReportingService = ReportingService;
exports.ReportingService = ReportingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService])
], ReportingService);
//# sourceMappingURL=reporting.service.js.map