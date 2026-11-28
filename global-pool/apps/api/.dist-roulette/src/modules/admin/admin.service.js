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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_1 = require("../../common/money");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const ledger_service_1 = require("../ledger/ledger.service");
const notifications_service_1 = require("../notifications/notifications.service");
const users_service_1 = require("../users/users.service");
const withdrawals_service_1 = require("../withdrawals/withdrawals.service");
const admin_security_service_1 = require("./admin-security.service");
const four_eyes_service_1 = require("./four-eyes.service");
/**
 * Admin back-office. By design there is NO capability to edit round results, choose winners, move funds
 * arbitrarily, edit ledger rows or silently adjust balances — only reviewed, audited workflow actions.
 */
let AdminService = class AdminService {
    prisma;
    ledger;
    audit;
    security;
    withdrawals;
    notifications;
    fourEyes;
    constructor(prisma, ledger, audit, security, withdrawals, notifications, fourEyes) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.audit = audit;
        this.security = security;
        this.withdrawals = withdrawals;
        this.notifications = notifications;
        this.fourEyes = fourEyes;
    }
    async listUsers(query) {
        const and = [];
        if (query.q) {
            and.push({
                OR: [
                    { handle: { contains: query.q.toLowerCase().replace(/^@/, '') } },
                    { publicId: { equals: query.q.toUpperCase() } },
                    { email: { contains: query.q.toLowerCase() } },
                ],
            });
        }
        if (query.status)
            and.push({ status: query.status });
        if (query.kycLevel) {
            and.push(query.kycLevel === 'none'
                ? { OR: [{ profile: { is: null } }, { profile: { kycLevel: 'none' } }] }
                : { profile: { kycLevel: query.kycLevel } });
        }
        if (query.restricted === 'yes')
            and.push({ restrictions: { some: { liftedAt: null } } });
        if (query.restricted === 'no')
            and.push({ restrictions: { none: { liftedAt: null } } });
        const where = and.length > 0 ? { AND: and } : {};
        const [rows, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    profile: true,
                    restrictions: { where: { liftedAt: null } },
                    amlAlerts: {
                        where: { status: { in: ['open', 'under_review', 'escalated'] } },
                        select: { riskLevel: true },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        // Ledger-derived totals (read-only) for the page — one query per row, page size ≤ 100.
        const balances = await Promise.all(rows.map((u) => this.ledger.userBalances(u.id)));
        const RANK = { low: 1, medium: 2, high: 3, critical: 4 };
        return (0, schemas_1.paginate)(rows.map((u, i) => ({
            id: u.id,
            publicId: u.publicId,
            handle: u.handle,
            emailMasked: (0, users_service_1.maskEmail)(u.email),
            country: u.profile?.country ?? null,
            kycLevel: u.profile?.kycLevel ?? 'none',
            vipTier: u.profile?.vipTier ?? 'bronze',
            status: u.status,
            onboarded: u.onboardedAt !== null,
            restrictions: u.restrictions.map((r) => r.type),
            createdAt: u.createdAt.toISOString(),
            lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
            totalBalance: balances[i]?.total ?? '0.00',
            amlOpenAlerts: u.amlAlerts.length,
            amlRiskLevel: u.amlAlerts.reduce((acc, a) => (acc === null || RANK[a.riskLevel] > RANK[acc] ? a.riskLevel : acc), null) ?? null,
            isDemo: u.isDemo,
        })), total, query);
    }
    async userDetail(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
                restrictions: { orderBy: { appliedAt: 'desc' } },
                kycRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
                amlAlerts: { orderBy: { createdAt: 'desc' }, take: 10 },
                totpSecret: { select: { status: true } },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const [balances, transactions, sessions] = await Promise.all([
            this.ledger.userBalances(id),
            this.prisma.transaction.findMany({
                where: { userId: id },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.session.count({ where: { userId: id, revokedAt: null } }),
        ]);
        return {
            id: user.id,
            publicId: user.publicId,
            handle: user.handle,
            emailMasked: (0, users_service_1.maskEmail)(user.email),
            status: user.status,
            country: user.profile?.country ?? null,
            kycLevel: user.profile?.kycLevel ?? 'none',
            vip: { tier: user.profile?.vipTier ?? 'bronze', level: user.profile?.vipLevel ?? 1 },
            twoFactorEnabled: user.totpSecret?.status === 'active',
            onboardedAt: user.onboardedAt?.toISOString() ?? null,
            balances,
            activeSessions: sessions,
            restrictions: user.restrictions.map((r) => ({
                id: r.id,
                type: r.type,
                reason: r.reason,
                appliedAt: r.appliedAt.toISOString(),
                liftedAt: r.liftedAt?.toISOString() ?? null,
                liftReason: r.liftReason,
            })),
            kyc: user.kycRecords.map((k) => ({
                id: k.id,
                level: k.level,
                status: k.status,
                provider: k.provider,
                createdAt: k.createdAt.toISOString(),
            })),
            amlAlerts: user.amlAlerts.map((a) => ({
                id: a.id,
                riskLevel: a.riskLevel,
                rule: a.rule,
                status: a.status,
                createdAt: a.createdAt.toISOString(),
            })),
            recentTransactions: transactions.map((t) => ({
                reference: t.reference,
                type: t.type,
                status: t.status,
                amount: (0, money_1.usdt)(t.amount),
                netAmount: (0, money_1.usdt)(t.netAmount),
                createdAt: t.createdAt.toISOString(),
            })),
            isDemo: user.isDemo,
        };
    }
    async applyRestriction(admin, userId, input, meta) {
        await this.security.assertSensitive(admin, 'users.restrict', input);
        if (enums_1.RESTRICTION_REQUIRES_FOUR_EYES[input.type]) {
            // Withdrawal holds and account suspensions need a second admin (ADM-X1): store a request, change nothing yet.
            const target = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!target)
                throw (0, errors_1.notFound)('User');
            const active = await this.prisma.userRestriction.findFirst({
                where: { userId, type: input.type, liftedAt: null },
            });
            if (active)
                throw new errors_1.AppError('CONFLICT', `Restriction ${input.type} is already active`);
            return this.fourEyes.request(admin, {
                action: 'user.restriction.apply',
                targetType: 'user',
                targetId: userId,
                reason: input.reason,
                reasonCategory: input.reasonCategory,
                payload: {
                    type: input.type,
                    userHandle: target.handle,
                    userPublicId: target.publicId,
                },
                dedupeKey: input.type,
            }, meta);
        }
        return this.prisma.tx(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user)
                throw (0, errors_1.notFound)('User');
            const existing = await tx.userRestriction.findFirst({
                where: { userId, type: input.type, liftedAt: null },
            });
            if (existing)
                throw new errors_1.AppError('CONFLICT', `Restriction ${input.type} is already active`);
            const restriction = await tx.userRestriction.create({
                data: { userId, type: input.type, reason: input.reason, appliedByAdminId: admin.id },
            });
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'user.restriction.applied',
                targetType: 'user',
                targetId: userId,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: {
                    restrictionId: restriction.id,
                    type: input.type,
                    reasonCategory: input.reasonCategory ?? null,
                    fourEyes: false,
                },
            }, tx);
            await this.notifications.notify(tx, {
                userId,
                type: 'account.restriction',
                title: 'Account restriction applied',
                body: 'Some actions on your account are restricted. Contact support for details.',
                data: { type: input.type },
            });
            return {
                status: 'active',
                id: restriction.id,
                type: restriction.type,
                appliedAt: restriction.appliedAt.toISOString(),
            };
        });
    }
    async liftRestriction(admin, userId, restrictionId, input, meta) {
        await this.security.assertSensitive(admin, 'users.restrict', input);
        return this.prisma.tx(async (tx) => {
            const r = await tx.userRestriction.findFirst({
                where: { id: restrictionId, userId, liftedAt: null },
            });
            if (!r)
                throw (0, errors_1.notFound)('Active restriction');
            const lifted = await tx.userRestriction.update({
                where: { id: r.id },
                data: { liftedAt: new Date(), liftedByAdminId: admin.id, liftReason: input.reason },
            });
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'user.restriction.lifted',
                targetType: 'user',
                targetId: userId,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { restrictionId, type: r.type, reasonCategory: input.reasonCategory ?? null },
            }, tx);
            return { id: lifted.id, type: lifted.type, liftedAt: lifted.liftedAt.toISOString() };
        });
    }
    async withdrawalQueue(query) {
        const where = {
            status: query.status ?? {
                in: ['under_review', 'queued', 'requested', 'risk_check', 'broadcast'],
            },
        };
        const [rows, total] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    user: { select: { publicId: true, handle: true } },
                    events: { orderBy: { createdAt: 'asc' } },
                },
            }),
            this.prisma.withdrawal.count({ where }),
        ]);
        const approvals = await this.prisma.adminApproval.findMany({
            where: {
                targetType: 'withdrawal',
                targetId: { in: rows.map((r) => r.id) },
                status: 'pending',
            },
        });
        return (0, schemas_1.paginate)(rows.map((w) => ({
            ...this.withdrawals.view(w),
            user: { publicId: w.user.publicId, handle: w.user.handle },
            riskFlags: w.riskFlags,
            pendingApproval: approvals.find((a) => a.targetId === w.id)
                ? {
                    approvals: 1,
                    of: 2,
                    requestedByAdminId: approvals.find((a) => a.targetId === w.id).requestedByAdminId,
                }
                : null,
        })), total, query);
    }
    async approveWithdrawal(admin, id, input, meta) {
        // Four-eyes pre-check before consuming an MFA code: the first approver can never give the second approval.
        const mine = await this.prisma.adminApproval.findFirst({
            where: {
                targetType: 'withdrawal',
                targetId: id,
                action: 'withdrawal.approve',
                status: 'pending',
                requestedByAdminId: admin.id,
            },
        });
        if (mine)
            throw new errors_1.AppError('FORBIDDEN', 'Four-eyes rule: a different admin must give the second approval');
        await this.security.assertSensitive(admin, 'withdrawals.approve', input);
        return this.withdrawals.adminApprove(admin, id, input.reason, meta);
    }
    async rejectWithdrawal(admin, id, input, meta) {
        await this.security.assertSensitive(admin, 'withdrawals.reject', input);
        return this.withdrawals.adminReject(admin, id, input.reason, meta);
    }
    async approvals(status = 'pending') {
        const rows = await this.prisma.adminApproval.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { requestedBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
        });
        return rows.map((a) => ({
            id: a.id,
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId,
            status: a.status,
            requestedBy: a.requestedBy.name,
            requestReason: a.requestReason,
            decidedBy: a.decidedBy?.name ?? null,
            decisionReason: a.decisionReason,
            payload: a.payload,
            createdAt: a.createdAt.toISOString(),
            decidedAt: a.decidedAt?.toISOString() ?? null,
        }));
    }
    async auditLogs(query) {
        const where = {
            ...(query.action ? { action: { startsWith: query.action } } : {}),
            ...(query.actorId ? { actorId: query.actorId } : {}),
            ...(query.targetType ? { targetType: query.targetType } : {}),
            ...(query.targetId ? { targetId: query.targetId } : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { seq: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return (0, schemas_1.paginate)(rows.map((r) => ({
            id: r.id,
            seq: r.seq.toString(),
            actorType: r.actorType,
            actorId: r.actorId,
            actorLabel: r.actorLabel,
            action: r.action,
            targetType: r.targetType,
            targetId: r.targetId,
            reason: r.reason,
            outcome: r.outcome,
            ip: r.ip,
            requestId: r.requestId,
            metadata: r.metadata,
            prevHash: r.prevHash,
            hash: r.hash,
            createdAt: r.createdAt.toISOString(),
        })), total, query);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        audit_service_1.AuditService,
        admin_security_service_1.AdminSecurityService,
        withdrawals_service_1.WithdrawalsService,
        notifications_service_1.NotificationsService,
        four_eyes_service_1.FourEyesService])
], AdminService);
//# sourceMappingURL=admin.service.js.map