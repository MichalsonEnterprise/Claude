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
exports.FourEyesService = exports.approvalRef = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const errors_1 = require("../../common/errors");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const withdrawals_service_1 = require("../withdrawals/withdrawals.service");
const admin_security_service_1 = require("./admin-security.service");
const MODULE_OF = {
    withdrawal: 'Finance',
    user: 'Users',
    admin_role: 'System',
    feature_flag: 'Global Pool',
};
/**
 * Requests owned by other modules (e.g. admin-b's NEW-entries circuit breaker, `pool.entries.pause|resume`) are
 * listed in the inbox but decided only at their own endpoint (`payload.decideAt`); this service never executes or
 * expires them.
 */
const EXTERNAL_ACTION_LABEL = {
    'pool.entries.pause': 'Pause new pool entries (circuit breaker)',
    'pool.entries.resume': 'Resume new pool entries (circuit breaker)',
};
const isOwnAction = (action) => action in enums_1.FOUR_EYES_ACTION_PERMISSION;
/** Human reference for an approval request (AR-XXXXXX, derived from the UUID — display only). */
const approvalRef = (id) => `AR-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
exports.approvalRef = approvalRef;
const startOfUtcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
function payloadOf(a) {
    return a.payload && typeof a.payload === 'object' && !Array.isArray(a.payload) ? a.payload : {};
}
function expiresAtOf(a) {
    const v = payloadOf(a).expiresAt;
    return typeof v === 'string' ? new Date(v) : null;
}
/**
 * Four-eyes approvals (ADM-X1). A request stores WHAT was asked (action + target + payload), WHO asked and WHY. A
 * second, different admin holding the action's permission decides it with their own reason and a fresh 2FA code;
 * only then the requested action runs — inside the same DB transaction as the decision and its hash-chained audit
 * rows. Requests expire after FOUR_EYES_EXPIRY_HOURS and then change nothing. The requester can withdraw a request.
 *
 * Executable actions are a closed list (FOUR_EYES_ACTION_PERMISSION): releasing a flagged withdrawal (delegated to
 * the withdrawals service), applying an account restriction and changing a role's permissions. None of them can
 * edit results, choose winners, pay out, edit ledger rows or adjust balances.
 */
let FourEyesService = class FourEyesService {
    prisma;
    audit;
    security;
    notifications;
    withdrawals;
    constructor(prisma, audit, security, notifications, withdrawals) {
        this.prisma = prisma;
        this.audit = audit;
        this.security = security;
        this.notifications = notifications;
        this.withdrawals = withdrawals;
    }
    // ── create ────────────────────────────────────────────────────────────────────────────────────
    /**
     * Create a request. The caller has already checked the requester's permission, reason and MFA
     * (AdminSecurityService.assertSensitive) before calling this.
     */
    async request(admin, input, meta) {
        return this.prisma.tx(async (tx) => {
            await this.expireStale(tx);
            const pending = await tx.adminApproval.findMany({
                where: {
                    action: input.action,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    status: 'pending',
                },
            });
            const dup = pending.find((p) => payloadOf(p).dedupeKey === input.dedupeKey);
            if (dup) {
                throw new errors_1.AppError('CONFLICT', 'An identical request is already waiting for a second admin', {
                    approvalId: dup.id,
                    ref: (0, exports.approvalRef)(dup.id),
                });
            }
            const now = new Date();
            const expiresAt = (0, time_1.addHours)(now, enums_1.FOUR_EYES_EXPIRY_HOURS);
            const approval = await tx.adminApproval.create({
                data: {
                    action: input.action,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    requestedByAdminId: admin.id,
                    requestReason: input.reason,
                    payload: {
                        ...input.payload,
                        dedupeKey: input.dedupeKey,
                        reasonCategory: input.reasonCategory ?? null,
                        expiresAt: expiresAt.toISOString(),
                    },
                },
            });
            const entry = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'approval.requested',
                targetType: input.targetType,
                targetId: input.targetId,
                reason: input.reason,
                outcome: 'pending_approval',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: {
                    approvalId: approval.id,
                    ref: (0, exports.approvalRef)(approval.id),
                    requestedAction: input.action,
                    reasonCategory: input.reasonCategory ?? null,
                    ...input.payload,
                },
            }, tx);
            return {
                status: 'pending_approval',
                approval: {
                    id: approval.id,
                    ref: (0, exports.approvalRef)(approval.id),
                    action: input.action,
                    expiresAt: expiresAt.toISOString(),
                    auditSeq: entry.seq,
                },
            };
        });
    }
    // ── read ──────────────────────────────────────────────────────────────────────────────────────
    async inbox(admin, view = 'open') {
        await this.prisma.tx((tx) => this.expireStale(tx));
        const now = new Date();
        const today = startOfUtcDay(now);
        const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
        const include = {
            requestedBy: {
                select: {
                    id: true,
                    name: true,
                    title: true,
                    roles: { select: { role: { select: { key: true } } } },
                },
            },
            decidedBy: { select: { id: true, name: true, title: true } },
        };
        const [pending, decidedToday, expired] = await Promise.all([
            this.prisma.adminApproval.findMany({
                where: { status: 'pending' },
                include,
                orderBy: { createdAt: 'asc' },
                take: 200,
            }),
            this.prisma.adminApproval.findMany({
                where: { status: { in: ['approved', 'rejected', 'cancelled'] }, decidedAt: { gte: today } },
                include,
                orderBy: { decidedAt: 'desc' },
                take: 100,
            }),
            this.prisma.adminApproval.findMany({
                where: { status: 'expired', updatedAt: { gte: weekAgo } },
                include,
                orderBy: { updatedAt: 'desc' },
                take: 100,
            }),
        ]);
        const pendingViews = pending.map((a) => this.view(a, admin));
        const views = {
            open: pendingViews.filter((a) => a.status === 'pending'),
            decided_today: decidedToday.map((a) => this.view(a, admin)),
            expired: [
                ...pendingViews.filter((a) => a.status === 'expired'),
                ...expired.map((a) => this.view(a, admin)),
            ],
        };
        const waiting = views.open.filter((a) => a.yourRole === 'can_decide');
        const mine = views.open.filter((a) => a.yourRole === 'requester');
        const byView = {
            open: views.open,
            waiting_for_me: waiting,
            created_by_me: mine,
            decided_today: views.decided_today,
            expired: views.expired,
        };
        // Soonest expiry first (no-expiry items last), like the inbox design.
        const items = [...byView[view]];
        if (view === 'open' || view === 'waiting_for_me' || view === 'created_by_me') {
            items.sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'));
        }
        return {
            view,
            items,
            counts: {
                open: views.open.length,
                waiting_for_me: waiting.length,
                created_by_me: mine.length,
                decided_today: views.decided_today.length,
                expired: views.expired.length,
            },
            generatedAt: now.toISOString(),
        };
    }
    async detail(admin, id) {
        await this.prisma.tx((tx) => this.expireStale(tx));
        const a = await this.load(id);
        const eligible = await this.eligibleApprovers(a);
        const auditTrail = await this.prisma.auditLog.findMany({
            where: { metadata: { path: ['approvalId'], equals: a.id } },
            orderBy: { seq: 'asc' },
            select: {
                seq: true,
                action: true,
                actorLabel: true,
                reason: true,
                createdAt: true,
                hash: true,
            },
        });
        return {
            ...this.view(a, admin),
            eligibleApprovers: eligible.filter((e) => e.id !== a.requestedByAdminId),
            auditTrail: auditTrail.map((r) => ({
                seq: r.seq.toString(),
                action: r.action,
                actor: r.actorLabel,
                reason: r.reason,
                hash: r.hash,
                createdAt: r.createdAt.toISOString(),
            })),
        };
    }
    // ── decide ────────────────────────────────────────────────────────────────────────────────────
    async approve(admin, id, input, meta) {
        const a = await this.assertDecidable(admin, id);
        const action = a.action;
        if (action === 'withdrawal.approve') {
            // Same path as POST /admin/withdrawals/:id/approve (its own four-eyes bookkeeping and audit rows).
            await this.security.assertSensitive(admin, 'withdrawals.approve', input);
            const res = await this.withdrawals.adminApprove(admin, a.targetId, input.reason, meta);
            return { status: 'approved', approvalId: a.id, ref: (0, exports.approvalRef)(a.id), result: res };
        }
        await this.security.assertSensitive(admin, enums_1.FOUR_EYES_ACTION_PERMISSION[action], input);
        return this.prisma.tx(async (tx) => {
            const claimed = await tx.adminApproval.updateMany({
                where: { id: a.id, status: 'pending' },
                data: {
                    status: 'approved',
                    decidedByAdminId: admin.id,
                    decisionReason: input.reason,
                    decidedAt: new Date(),
                },
            });
            if (claimed.count !== 1)
                throw new errors_1.AppError('CONFLICT', 'This request was already decided');
            const result = await this.execute(tx, a, admin, meta);
            const entry = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'approval.approved',
                targetType: a.targetType,
                targetId: a.targetId,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: {
                    approvalId: a.id,
                    ref: (0, exports.approvalRef)(a.id),
                    requestedAction: a.action,
                    requestedBy: a.requestedBy.name,
                    requestReason: a.requestReason,
                    reasonCategory: input.reasonCategory ?? null,
                },
            }, tx);
            return {
                status: 'approved',
                approvalId: a.id,
                ref: (0, exports.approvalRef)(a.id),
                auditSeq: entry.seq,
                result,
            };
        });
    }
    async reject(admin, id, input, meta) {
        const a = await this.assertDecidable(admin, id);
        const action = a.action;
        if (action === 'withdrawal.approve') {
            // Declining a flagged release rejects the withdrawal: funds return to the player's Available balance.
            await this.security.assertSensitive(admin, 'withdrawals.reject', input);
            const res = await this.withdrawals.adminReject(admin, a.targetId, input.reason, meta);
            return { status: 'rejected', approvalId: a.id, ref: (0, exports.approvalRef)(a.id), result: res };
        }
        await this.security.assertSensitive(admin, enums_1.FOUR_EYES_ACTION_PERMISSION[action], input);
        return this.prisma.tx(async (tx) => {
            const claimed = await tx.adminApproval.updateMany({
                where: { id: a.id, status: 'pending' },
                data: {
                    status: 'rejected',
                    decidedByAdminId: admin.id,
                    decisionReason: input.reason,
                    decidedAt: new Date(),
                },
            });
            if (claimed.count !== 1)
                throw new errors_1.AppError('CONFLICT', 'This request was already decided');
            const entry = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'approval.rejected',
                targetType: a.targetType,
                targetId: a.targetId,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: {
                    approvalId: a.id,
                    ref: (0, exports.approvalRef)(a.id),
                    requestedAction: a.action,
                    requestedBy: a.requestedBy.name,
                    reasonCategory: input.reasonCategory ?? null,
                },
            }, tx);
            return {
                status: 'rejected',
                approvalId: a.id,
                ref: (0, exports.approvalRef)(a.id),
                auditSeq: entry.seq,
            };
        });
    }
    /** The requester withdraws their own pending request. Nothing else changes (no MFA needed). */
    async withdraw(admin, id, input, meta) {
        const a = await this.load(id);
        if (a.requestedByAdminId !== admin.id) {
            throw new errors_1.AppError('FORBIDDEN', 'Only the requester can withdraw a request');
        }
        return this.prisma.tx(async (tx) => {
            const claimed = await tx.adminApproval.updateMany({
                where: { id: a.id, status: 'pending' },
                data: {
                    status: 'cancelled',
                    decidedByAdminId: admin.id,
                    decisionReason: input.reason,
                    decidedAt: new Date(),
                },
            });
            if (claimed.count !== 1)
                throw new errors_1.AppError('CONFLICT', 'This request is no longer pending');
            const entry = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'approval.withdrawn',
                targetType: a.targetType,
                targetId: a.targetId,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { approvalId: a.id, ref: (0, exports.approvalRef)(a.id), requestedAction: a.action },
            }, tx);
            return {
                status: 'cancelled',
                approvalId: a.id,
                ref: (0, exports.approvalRef)(a.id),
                auditSeq: entry.seq,
            };
        });
    }
    // ── internals ─────────────────────────────────────────────────────────────────────────────────
    /** Lazy expiry: pending requests past their expiry become `expired` (system audit row), changing nothing. */
    async expireStale(tx, now = new Date()) {
        const pending = await tx.adminApproval.findMany({ where: { status: 'pending' } });
        for (const a of pending) {
            if (!isOwnAction(a.action))
                continue; // other modules expire their own requests
            const exp = expiresAtOf(a);
            if (!exp || exp > now)
                continue;
            const res = await tx.adminApproval.updateMany({
                where: { id: a.id, status: 'pending' },
                data: { status: 'expired' },
            });
            if (res.count !== 1)
                continue;
            await this.audit.record({
                actorType: 'system',
                action: 'approval.expired',
                targetType: a.targetType,
                targetId: a.targetId,
                metadata: {
                    approvalId: a.id,
                    ref: (0, exports.approvalRef)(a.id),
                    requestedAction: a.action,
                    expired: true,
                },
            }, tx);
        }
    }
    async load(id) {
        const a = await this.prisma.adminApproval.findUnique({
            where: { id },
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        name: true,
                        title: true,
                        roles: { select: { role: { select: { key: true } } } },
                    },
                },
                decidedBy: { select: { id: true, name: true, title: true } },
            },
        });
        if (!a)
            throw (0, errors_1.notFound)('Approval request');
        return a;
    }
    /** Cheap checks BEFORE an MFA code is consumed: pending, not expired, not the requester, right permission. */
    async assertDecidable(admin, id) {
        await this.prisma.tx((tx) => this.expireStale(tx));
        const a = await this.load(id);
        if (a.status === 'expired') {
            throw new errors_1.AppError('CONFLICT', 'This request expired — nothing was changed', {
                status: a.status,
            });
        }
        if (a.status !== 'pending') {
            throw new errors_1.AppError('CONFLICT', `This request is already ${a.status}`, { status: a.status });
        }
        if (a.requestedByAdminId === admin.id) {
            throw new errors_1.AppError('FORBIDDEN', 'Four-eyes rule: a different admin must decide this request', {
                reason: 'self_approval',
            });
        }
        const permission = this.permissionFor(a.action);
        if (!permission) {
            const decideAt = payloadOf(a).decideAt;
            throw new errors_1.AppError('BAD_REQUEST', typeof decideAt === 'string'
                ? `This request is decided in its own module (${decideAt})`
                : `Unknown request action ${a.action}`, typeof decideAt === 'string' ? { decideAt } : undefined);
        }
        if (!admin.permissions.includes(permission)) {
            throw new errors_1.AppError('FORBIDDEN', 'Your role does not allow this action', {
                missingPermissions: [permission],
            });
        }
        return a;
    }
    permissionFor(action) {
        return enums_1.FOUR_EYES_ACTION_PERMISSION[action] ?? null;
    }
    async eligibleApprovers(a) {
        const permission = this.permissionFor(a.action);
        if (!permission)
            return [];
        const admins = await this.prisma.adminUser.findMany({
            where: {
                status: 'active',
                roles: { some: { role: { permissions: { some: { permission: { key: permission } } } } } },
            },
            select: {
                id: true,
                name: true,
                title: true,
                lastLoginAt: true,
                roles: { select: { role: { select: { key: true } } } },
            },
            orderBy: { name: 'asc' },
        });
        return admins.map((x) => ({
            id: x.id,
            name: x.name,
            title: x.title,
            roles: x.roles.map((r) => r.role.key),
            lastLoginAt: x.lastLoginAt?.toISOString() ?? null,
        }));
    }
    /** Runs the approved action inside the decision transaction. */
    async execute(tx, a, approver, meta) {
        const p = payloadOf(a);
        switch (a.action) {
            case 'user.restriction.apply': {
                const type = p.type;
                const user = await tx.user.findUnique({ where: { id: a.targetId } });
                if (!user)
                    throw (0, errors_1.notFound)('User');
                const existing = await tx.userRestriction.findFirst({
                    where: { userId: a.targetId, type, liftedAt: null },
                });
                if (existing)
                    throw new errors_1.AppError('CONFLICT', `Restriction ${type} is already active`);
                const restriction = await tx.userRestriction.create({
                    data: {
                        userId: a.targetId,
                        type,
                        reason: a.requestReason,
                        appliedByAdminId: a.requestedByAdminId,
                    },
                });
                await this.audit.record({
                    actorType: 'admin',
                    actorId: approver.id,
                    actorLabel: approver.name,
                    action: 'user.restriction.applied',
                    targetType: 'user',
                    targetId: a.targetId,
                    reason: a.requestReason,
                    ip: meta.ip,
                    userAgent: meta.userAgent,
                    requestId: meta.requestId,
                    metadata: {
                        restrictionId: restriction.id,
                        type,
                        approvalId: a.id,
                        ref: (0, exports.approvalRef)(a.id),
                        requestedBy: a.requestedBy.name,
                        approvedBy: approver.name,
                        fourEyes: true,
                    },
                }, tx);
                await this.notifications.notify(tx, {
                    userId: a.targetId,
                    type: 'account.restriction',
                    title: 'Account restriction applied',
                    body: 'Some actions on your account are restricted. Contact support for details.',
                    data: { type },
                });
                return {
                    restriction: {
                        id: restriction.id,
                        type,
                        label: enums_1.RESTRICTION_LABEL[type],
                        appliedAt: restriction.appliedAt.toISOString(),
                    },
                };
            }
            case 'admin.role.permissions.change': {
                const roleKey = String(p.roleKey);
                const grant = (Array.isArray(p.grant) ? p.grant : []);
                const revoke = (Array.isArray(p.revoke) ? p.revoke : []);
                const role = await tx.adminRole.findUnique({ where: { key: roleKey } });
                if (!role)
                    throw (0, errors_1.notFound)('Role');
                if (role.key === 'super_admin') {
                    throw new errors_1.AppError('FORBIDDEN', 'The Super Admin role is fixed and cannot be changed');
                }
                const perms = await tx.adminPermission.findMany({
                    where: { key: { in: [...grant, ...revoke] } },
                });
                const idOf = (k) => perms.find((x) => x.key === k)?.id;
                for (const k of grant) {
                    const pid = idOf(k);
                    if (!pid)
                        throw (0, errors_1.notFound)(`Permission ${k}`);
                    await tx.adminRolePermission.upsert({
                        where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
                        create: { roleId: role.id, permissionId: pid },
                        update: {},
                    });
                }
                for (const k of revoke) {
                    const pid = idOf(k);
                    if (!pid)
                        continue;
                    await tx.adminRolePermission.deleteMany({
                        where: { roleId: role.id, permissionId: pid },
                    });
                }
                await this.audit.record({
                    actorType: 'admin',
                    actorId: approver.id,
                    actorLabel: approver.name,
                    action: 'admin.role.permissions.changed',
                    targetType: 'admin_role',
                    targetId: role.key,
                    reason: a.requestReason,
                    ip: meta.ip,
                    userAgent: meta.userAgent,
                    requestId: meta.requestId,
                    metadata: {
                        grant,
                        revoke,
                        approvalId: a.id,
                        ref: (0, exports.approvalRef)(a.id),
                        requestedBy: a.requestedBy.name,
                        approvedBy: approver.name,
                        fourEyes: true,
                    },
                }, tx);
                return { role: role.key, granted: grant, revoked: revoke };
            }
            case 'withdrawal.approve':
            default:
                throw new errors_1.AppError('BAD_REQUEST', `Action ${a.action} cannot be executed here`);
        }
    }
    view(a, admin) {
        const p = payloadOf(a);
        const permission = this.permissionFor(a.action);
        const expiresAt = expiresAtOf(a);
        const isRequester = a.requestedByAdminId === admin.id;
        const canDecide = !isRequester && permission !== null && admin.permissions.includes(permission);
        const decideAt = !isOwnAction(a.action) && typeof p.decideAt === 'string' ? p.decideAt : null;
        // A foreign request past its expiry is shown as expired (its module records the real transition).
        const lapsed = a.status === 'pending' && expiresAt !== null && expiresAt <= new Date();
        return {
            id: a.id,
            ref: (0, exports.approvalRef)(a.id),
            action: a.action,
            actionLabel: enums_1.FOUR_EYES_ACTION_LABEL[a.action] ??
                EXTERNAL_ACTION_LABEL[a.action] ??
                a.action.replace(/[._]/g, ' '),
            decideAt,
            module: MODULE_OF[a.targetType] ?? 'System',
            targetType: a.targetType,
            targetId: a.targetId,
            summary: this.summary(a, p),
            status: lapsed ? 'expired' : a.status,
            requiredPermission: permission,
            requestedBy: {
                id: a.requestedBy.id,
                name: a.requestedBy.name,
                title: a.requestedBy.title,
                roles: a.requestedBy.roles.map((r) => r.role.key),
            },
            requestReason: a.requestReason,
            requestCategory: typeof p.reasonCategory === 'string' ? p.reasonCategory : null,
            decidedBy: a.decidedBy
                ? { id: a.decidedBy.id, name: a.decidedBy.name, title: a.decidedBy.title }
                : null,
            decisionReason: a.decisionReason,
            payload: Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'dedupeKey')),
            createdAt: a.createdAt.toISOString(),
            expiresAt: expiresAt?.toISOString() ?? null,
            decidedAt: a.decidedAt?.toISOString() ?? null,
            yourRole: a.status !== 'pending' || lapsed
                ? 'decided'
                : decideAt
                    ? 'external'
                    : isRequester
                        ? 'requester'
                        : canDecide
                            ? 'can_decide'
                            : 'not_eligible',
        };
    }
    summary(a, p) {
        switch (a.action) {
            case 'withdrawal.approve': {
                const ref = typeof p.reference === 'string' ? p.reference : 'withdrawal';
                const amount = typeof p.amount === 'string' ? ` · ${p.amount} USDT` : '';
                return `Release flagged withdrawal ${ref}${amount}`;
            }
            case 'user.restriction.apply': {
                const label = enums_1.RESTRICTION_LABEL[p.type] ?? String(p.type);
                const who = typeof p.userHandle === 'string'
                    ? `@${p.userHandle}`
                    : (p.userPublicId ?? 'user');
                return `${label} · ${who}`;
            }
            case 'admin.role.permissions.change': {
                const g = Array.isArray(p.grant) ? p.grant.length : 0;
                const r = Array.isArray(p.revoke) ? p.revoke.length : 0;
                return `Role ${String(p.roleLabel ?? p.roleKey)} · +${g} / −${r} permissions`;
            }
            default: {
                const label = EXTERNAL_ACTION_LABEL[a.action];
                return label ? `${label} · ${a.targetId}` : a.action;
            }
        }
    }
};
exports.FourEyesService = FourEyesService;
exports.FourEyesService = FourEyesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        admin_security_service_1.AdminSecurityService,
        notifications_service_1.NotificationsService,
        withdrawals_service_1.WithdrawalsService])
], FourEyesService);
//# sourceMappingURL=four-eyes.service.js.map