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
exports.AdminConsoleService = void 0;
exports.maskIp = maskIp;
exports.amlRiskScore = amlRiskScore;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const limits_1 = require("@gp/shared/limits");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_1 = require("../../common/money");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const queues_1 = require("../../infra/queues/queues");
const redis_module_1 = require("../../infra/redis/redis.module");
const audit_service_1 = require("../audit/audit.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const responsible_gaming_service_1 = require("../compliance/responsible-gaming.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const kyc_service_1 = require("../kyc/kyc.service");
const ledger_service_1 = require("../ledger/ledger.service");
const users_service_1 = require("../users/users.service");
const admin_security_service_1 = require("./admin-security.service");
const four_eyes_service_1 = require("./four-eyes.service");
async function timed(fn) {
    const started = performance.now();
    try {
        await Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
        ]);
        return { status: 'up', latencyMs: Math.round(performance.now() - started) };
    }
    catch (err) {
        return {
            status: 'down',
            latencyMs: Math.round(performance.now() - started),
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
/** a.b.c.d → a.b.•••.••• ; IPv6 keeps the first two groups. */
function maskIp(ip) {
    if (!ip)
        return null;
    if (ip.includes('.')) {
        const parts = ip.replace(/^::ffff:/, '').split('.');
        return parts.length === 4 ? `${parts[0]}.${parts[1]}.•••.•••` : '•••';
    }
    const groups = ip.split(':').filter(Boolean);
    return `${groups.slice(0, 2).join(':')}:••••`;
}
const AML_WEIGHT = { low: 5, medium: 15, high: 30, critical: 50 };
const OPEN_AML = ['open', 'under_review', 'escalated'];
/** Rule-based, read-only AML risk score (0–100) with its full breakdown. Admins can never override it. */
function amlRiskScore(input) {
    const factors = [];
    for (const a of input.openAlerts) {
        factors.push({
            factor: `Open ${a.riskLevel} alert`,
            points: AML_WEIGHT[a.riskLevel],
            detail: a.rule,
        });
    }
    if (input.closedAlerts90d > 0) {
        factors.push({
            factor: 'Closed alerts · 90 d',
            points: Math.min(10, input.closedAlerts90d * 2),
            detail: `${input.closedAlerts90d} closed`,
        });
    }
    if (input.kycLevel === 'none')
        factors.push({ factor: 'Not verified (KYC)', points: 10, detail: 'No KYC level' });
    else if (input.kycLevel === 'level_1')
        factors.push({ factor: 'Basic KYC only', points: 5, detail: 'Level 1' });
    if (input.accountAgeDays < 7)
        factors.push({ factor: 'New account', points: 5, detail: `${input.accountAgeDays} d old` });
    if (input.activeRestrictions > 0) {
        factors.push({
            factor: 'Active restrictions',
            points: 5 * input.activeRestrictions,
            detail: `${input.activeRestrictions} active`,
        });
    }
    const score = Math.min(100, factors.reduce((acc, f) => acc + f.points, 0));
    const level = score >= 85 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
    return {
        score,
        level,
        factors,
        bands: { low: [0, 29], medium: [30, 59], high: [60, 84], critical: [85, 100] },
    };
}
/**
 * Admin console reads for ADM-00/02, U1…U10 and S1…S3 plus the few audited writes they need (PII reveal, role
 * change REQUESTS, alert acknowledgements). Money is read from the ledger; nothing here moves funds, edits ledger
 * rows, changes results or adjusts balances.
 */
let AdminConsoleService = class AdminConsoleService {
    prisma;
    ledger;
    audit;
    security;
    fourEyes;
    rg;
    kyc;
    flags;
    blockchain;
    config;
    redis;
    depositsQueue;
    withdrawalsQueue;
    roundsQueue;
    startedAt = Date.now();
    constructor(prisma, ledger, audit, security, fourEyes, rg, kyc, flags, blockchain, config, redis, depositsQueue, withdrawalsQueue, roundsQueue) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.audit = audit;
        this.security = security;
        this.fourEyes = fourEyes;
        this.rg = rg;
        this.kyc = kyc;
        this.flags = flags;
        this.blockchain = blockchain;
        this.config = config;
        this.redis = redis;
        this.depositsQueue = depositsQueue;
        this.withdrawalsQueue = withdrawalsQueue;
        this.roundsQueue = roundsQueue;
    }
    // ── U1 ────────────────────────────────────────────────────────────────────────────────────────
    async userStats(now = new Date()) {
        const since = (0, time_1.addDays)(now, -30);
        const [total, active, verified, newUsers, restricted, suspended] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
            this.prisma.userProfile.count({ where: { kycLevel: { not: 'none' } } }),
            this.prisma.user.count({ where: { createdAt: { gte: since } } }),
            this.prisma.userRestriction.findMany({
                where: { liftedAt: null },
                distinct: ['userId'],
                select: { userId: true },
            }),
            this.prisma.user.count({ where: { status: { not: 'active' } } }),
        ]);
        return {
            totalUsers: total,
            activeUsers30d: active,
            kycVerified: verified,
            newUsers30d: newUsers,
            restrictedAccounts: restricted.length,
            nonActiveAccounts: suspended,
            generatedAt: now.toISOString(),
        };
    }
    // ── U3 account details ────────────────────────────────────────────────────────────────────────
    async userAccount(admin, id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
                totpSecret: { select: { status: true, createdAt: true } },
                sessions: { orderBy: { lastSeenAt: 'desc' }, take: 20 },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const backupCodesLeft = await this.prisma.backupCode.count({
            where: { totpSecret: { userId: id }, usedAt: null },
        });
        const p = user.profile;
        return {
            id: user.id,
            publicId: user.publicId,
            handle: user.handle,
            displayName: p?.displayName ?? null,
            emailMasked: (0, users_service_1.maskEmail)(user.email),
            emailVerified: user.emailVerified,
            dateOfBirthMasked: p?.dateOfBirth ? `••/••/${p.dateOfBirth.getUTCFullYear()}` : null,
            country: p?.country ?? null,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
            onboardedAt: user.onboardedAt?.toISOString() ?? null,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
            consents: {
                ageConfirmedAt: p?.ageConfirmedAt?.toISOString() ?? null,
                jurisdictionConfirmedAt: p?.jurisdictionConfirmedAt?.toISOString() ?? null,
                termsAcceptedAt: p?.termsAcceptedAt?.toISOString() ?? null,
                termsVersion: p?.termsVersion ?? null,
                privacyAcceptedAt: p?.privacyAcceptedAt?.toISOString() ?? null,
                privacyVersion: p?.privacyVersion ?? null,
                marketingOptIn: p?.marketingOptIn ?? false,
                marketingOptInAt: p?.marketingOptInAt?.toISOString() ?? null,
            },
            security: {
                twoFactor: user.totpSecret?.status ?? 'off',
                twoFactorSince: user.totpSecret?.createdAt.toISOString() ?? null,
                backupCodesLeft,
                antiPhishingCodeSet: Boolean(p?.antiPhishingCode),
            },
            sessions: user.sessions.map((s) => ({
                id: s.id,
                device: s.deviceLabel ?? summariseAgent(s.userAgent),
                ipMasked: maskIp(s.ip),
                location: s.location,
                flagged: s.flagged,
                flaggedReason: s.flaggedReason,
                createdAt: s.createdAt.toISOString(),
                lastSeenAt: s.lastSeenAt.toISOString(),
                revokedAt: s.revokedAt?.toISOString() ?? null,
                isDemo: s.isDemo,
            })),
            canRevealPii: admin.permissions.includes('users.pii.read'),
            isDemo: user.isDemo,
        };
    }
    /** One field, one logged reason (policy users.pii.read = reason required). The value is never cached. */
    async revealPii(admin, id, input, meta) {
        await this.security.assertSensitive(admin, 'users.pii.read', input);
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: { select: { dateOfBirth: true } },
                sessions: { orderBy: { lastSeenAt: 'desc' }, take: 1, select: { ip: true } },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const value = input.field === 'email'
            ? user.email
            : input.field === 'date_of_birth'
                ? (user.profile?.dateOfBirth?.toISOString().slice(0, 10) ?? null)
                : (user.sessions[0]?.ip ?? null);
        const entry = await this.audit.record({
            actorType: 'admin',
            actorId: admin.id,
            actorLabel: admin.name,
            action: 'user.pii.revealed',
            targetType: 'user',
            targetId: id,
            reason: input.reason,
            ip: meta.ip,
            userAgent: meta.userAgent,
            requestId: meta.requestId,
            metadata: { field: input.field },
        });
        return {
            field: input.field,
            value,
            revealedAt: new Date().toISOString(),
            auditSeq: entry.seq,
            isDemo: user.isDemo,
        };
    }
    // ── U4 wallets ────────────────────────────────────────────────────────────────────────────────
    async userWallets(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                isDemo: true,
                wallets: { orderBy: { createdAt: 'asc' } },
                depositAddresses: { orderBy: { createdAt: 'asc' } },
                withdrawals: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: {
                        toAddress: true,
                        network: true,
                        status: true,
                        createdAt: true,
                        riskFlags: true,
                    },
                },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const now = new Date();
        const usage = new Map();
        for (const w of user.withdrawals) {
            const k = `${w.network}:${w.toAddress.toLowerCase()}`;
            const u = usage.get(k);
            if (u)
                u.count += 1;
            else
                usage.set(k, {
                    count: 1,
                    last: w.createdAt,
                    flags: Array.isArray(w.riskFlags) ? w.riskFlags.map(String) : [],
                });
        }
        return {
            wallets: user.wallets.map((w) => {
                const u = usage.get(`${w.network}:${w.address.toLowerCase()}`);
                const coolingDown = Boolean(w.whitelistAvailableAt && w.whitelistAvailableAt > now);
                return {
                    id: w.id,
                    network: w.network,
                    address: w.address,
                    source: w.source,
                    walletClient: w.walletClient,
                    label: w.label,
                    isPrimary: w.isPrimary,
                    verifiedAt: w.verifiedAt?.toISOString() ?? null,
                    whitelistedAt: w.whitelistedAt?.toISOString() ?? null,
                    whitelistAvailableAt: w.whitelistAvailableAt?.toISOString() ?? null,
                    removedAt: w.removedAt?.toISOString() ?? null,
                    status: w.removedAt
                        ? 'removed'
                        : coolingDown
                            ? 'cooldown'
                            : w.whitelistedAt
                                ? 'whitelisted'
                                : 'linked',
                    withdrawalsCount: u?.count ?? 0,
                    lastWithdrawalAt: u?.last.toISOString() ?? null,
                    isDemo: w.isDemo,
                };
            }),
            depositAddresses: user.depositAddresses.map((d) => ({
                id: d.id,
                network: d.network,
                address: d.addressChecksum,
                derivationPath: d.derivationPath,
                createdAt: d.createdAt.toISOString(),
            })),
            isDemo: user.isDemo,
        };
    }
    // ── U5 KYC / U6 AML ───────────────────────────────────────────────────────────────────────────
    async userKyc(id) {
        await this.assertUser(id);
        const status = await this.kyc.status(id);
        return {
            ...status,
            limitsByLevel: enums_1.KYC_LEVELS.map((level) => ({
                level,
                label: enums_1.KYC_LEVEL_LABEL[level],
                dailyWithdrawalLimit: limits_1.DAILY_WITHDRAWAL_LIMIT[level],
            })),
        };
    }
    async userAml(id, now = new Date()) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: { select: { kycLevel: true } },
                amlAlerts: { orderBy: { createdAt: 'desc' }, take: 50 },
                restrictions: { where: { liftedAt: null }, select: { id: true } },
            },
        });
        if (!user)
            throw (0, errors_1.notFound)('User');
        const open = user.amlAlerts.filter((a) => OPEN_AML.includes(a.status));
        const closed90 = user.amlAlerts.filter((a) => !OPEN_AML.includes(a.status) && a.createdAt >= (0, time_1.addDays)(now, -90)).length;
        const score = amlRiskScore({
            openAlerts: open.map((a) => ({ riskLevel: a.riskLevel, rule: a.rule })),
            closedAlerts90d: closed90,
            kycLevel: user.profile?.kycLevel ?? 'none',
            accountAgeDays: Math.floor((now.getTime() - user.createdAt.getTime()) / 86_400_000),
            activeRestrictions: user.restrictions.length,
        });
        return {
            score,
            model: 'rules-v1 (read-only)',
            alerts: user.amlAlerts.map((a) => ({
                id: a.id,
                riskLevel: a.riskLevel,
                rule: a.rule,
                status: a.status,
                resolution: a.resolution,
                withdrawalId: a.withdrawalId,
                depositId: a.depositId,
                details: a.details,
                createdAt: a.createdAt.toISOString(),
                resolvedAt: a.resolvedAt?.toISOString() ?? null,
                isDemo: a.isDemo,
            })),
            isDemo: user.isDemo,
        };
    }
    // ── U7 transactions ───────────────────────────────────────────────────────────────────────────
    async userTransactions(id, query) {
        await this.assertUser(id);
        const where = {
            userId: id,
            ...(query.type ? { type: query.type } : {}),
        };
        const [rows, total, sums] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.transaction.count({ where }),
            this.prisma.transaction.groupBy({
                by: ['type'],
                where: { userId: id, status: 'completed' },
                _sum: { amount: true, platformFee: true, networkFee: true },
                _count: true,
            }),
        ]);
        return {
            ...(0, schemas_1.paginate)(rows.map((t) => ({
                id: t.id,
                reference: t.reference,
                type: t.type,
                status: t.status,
                direction: t.direction,
                amount: (0, money_1.usdt)(t.amount),
                platformFee: (0, money_1.usdt)(t.platformFee),
                networkFee: t.networkFee ? (0, money_1.usdt)(t.networkFee) : null,
                netAmount: (0, money_1.usdt)(t.netAmount),
                network: t.network,
                txHash: t.txHash,
                description: t.description,
                createdAt: t.createdAt.toISOString(),
                completedAt: t.completedAt?.toISOString() ?? null,
                isDemo: t.isDemo,
            })), total, query),
            lifetime: sums.map((s) => ({
                type: s.type,
                count: s._count,
                amount: (0, money_1.usdt)(s._sum.amount),
                platformFees: (0, money_1.usdt)(s._sum.platformFee),
                networkFees: (0, money_1.usdt)(s._sum.networkFee),
            })),
            balances: await this.ledger.userBalances(id),
        };
    }
    // ── U9 responsible gaming ─────────────────────────────────────────────────────────────────────
    async userResponsibleGaming(id) {
        await this.assertUser(id);
        const [state, exclusions, limits] = await Promise.all([
            this.rg.state(id),
            this.prisma.rgSelfExclusion.findMany({
                where: { userId: id },
                orderBy: { startsAt: 'desc' },
                take: 20,
            }),
            this.prisma.rgLimit.findMany({ where: { userId: id }, orderBy: { updatedAt: 'desc' } }),
        ]);
        return {
            ...state,
            exclusionHistory: exclusions.map((e) => ({
                id: e.id,
                duration: e.duration,
                startsAt: e.startsAt.toISOString(),
                endsAt: e.endsAt?.toISOString() ?? null,
            })),
            limitsUpdatedAt: limits.map((l) => ({
                type: l.type,
                period: l.period,
                updatedAt: l.updatedAt.toISOString(),
                isDemo: l.isDemo,
            })),
            adminCanLoosen: false,
        };
    }
    // ── S1 / S2 roles & permissions ───────────────────────────────────────────────────────────────
    async roles() {
        const [roles, pending] = await Promise.all([
            this.prisma.adminRole.findMany({
                orderBy: { createdAt: 'asc' },
                include: {
                    permissions: { include: { permission: { select: { key: true } } } },
                    users: {
                        include: {
                            adminUser: {
                                select: {
                                    id: true,
                                    name: true,
                                    title: true,
                                    status: true,
                                    lastLoginAt: true,
                                    isDemo: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.adminApproval.findMany({
                where: { action: 'admin.role.permissions.change', status: 'pending' },
                include: { requestedBy: { select: { name: true } } },
            }),
        ]);
        const order = Object.keys(enums_1.ADMIN_ROLE_LABEL);
        return {
            roles: roles
                .map((r) => ({
                key: r.key,
                name: r.name,
                label: enums_1.ADMIN_ROLE_LABEL[r.key] ?? r.name,
                description: r.description,
                fixed: r.key === 'super_admin',
                permissions: r.permissions.map((p) => p.permission.key).sort(),
                members: r.users.map((u) => ({
                    id: u.adminUser.id,
                    name: u.adminUser.name,
                    title: u.adminUser.title,
                    status: u.adminUser.status,
                    lastLoginAt: u.adminUser.lastLoginAt?.toISOString() ?? null,
                    isDemo: u.adminUser.isDemo,
                })),
            }))
                .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)),
            pendingChanges: pending.map((a) => {
                const p = (a.payload ?? {});
                return {
                    approvalId: a.id,
                    roleKey: String(p.roleKey),
                    grant: p.grant ?? [],
                    revoke: p.revoke ?? [],
                    requestedBy: a.requestedBy.name,
                    createdAt: a.createdAt.toISOString(),
                    expiresAt: typeof p.expiresAt === 'string' ? p.expiresAt : null,
                };
            }),
        };
    }
    permissions() {
        return enums_1.PERMISSIONS.map((key) => ({
            key,
            label: enums_1.PERMISSION_LABEL[key],
            group: key.split('.')[0],
            policy: enums_1.PERMISSION_POLICY[key],
        }));
    }
    async requestRoleChange(admin, roleKey, input, meta) {
        const role = await this.prisma.adminRole.findUnique({
            where: { key: roleKey },
            include: { permissions: { include: { permission: { select: { key: true } } } } },
        });
        if (!role)
            throw (0, errors_1.notFound)('Role');
        if (role.key === 'super_admin') {
            throw new errors_1.AppError('FORBIDDEN', 'The Super Admin role is fixed and cannot be changed');
        }
        const held = new Set(role.permissions.map((p) => p.permission.key));
        const grant = [...new Set(input.grant)].filter((k) => !held.has(k));
        const revoke = [...new Set(input.revoke)].filter((k) => held.has(k));
        if (grant.length + revoke.length === 0) {
            throw new errors_1.AppError('VALIDATION_FAILED', 'Nothing would change for this role', {
                field: 'grant',
            });
        }
        await this.security.assertSensitive(admin, 'admins.manage', input);
        return this.fourEyes.request(admin, {
            action: 'admin.role.permissions.change',
            targetType: 'admin_role',
            targetId: role.key,
            reason: input.reason,
            reasonCategory: input.reasonCategory,
            payload: {
                roleKey: role.key,
                roleLabel: enums_1.ADMIN_ROLE_LABEL[role.key] ?? role.name,
                grant,
                revoke,
            },
            dedupeKey: `${role.key}:+${[...grant].sort().join(',')}:-${[...revoke].sort().join(',')}`,
        }, meta);
    }
    // ── ADM-02 system health ──────────────────────────────────────────────────────────────────────
    async systemHealth() {
        const [database, redis, flags, reconciliation, lastVrf, pendingVrf, cursors, ...queues] = await Promise.all([
            timed(() => this.prisma.$queryRaw `SELECT 1`),
            timed(() => this.redis.ping()),
            this.flags.list(),
            this.ledger.reconcile(),
            this.prisma.randomnessRequest.findFirst({
                where: { status: 'fulfilled' },
                orderBy: { fulfilledAt: 'desc' },
                select: { provider: true, fulfilledAt: true, requestedAt: true, network: true },
            }),
            this.prisma.randomnessRequest.count({ where: { status: 'requested' } }),
            this.prisma.chainCursor.findMany({ orderBy: { key: 'asc' } }),
            ...[this.depositsQueue, this.withdrawalsQueue, this.roundsQueue].map((q) => q
                .getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed')
                .then((c) => ({ name: q.name, status: 'up', counts: c }))
                .catch((err) => ({
                name: q.name,
                status: 'down',
                counts: null,
                error: err instanceof Error ? err.message : String(err),
            }))),
        ]);
        const env = this.config.env;
        const services = [
            { key: 'database', name: 'PostgreSQL ledger', ...database },
            { key: 'redis', name: 'Redis (queues, step-up replay)', ...redis },
        ];
        const allUp = services.every((s) => s.status === 'up') && queues.every((q) => q.status === 'up');
        return {
            status: allUp && reconciliation.ok ? 'operational' : allUp ? 'degraded' : 'down',
            environment: env.NODE_ENV,
            demoMode: env.DEMO_MODE,
            realMoneyEnabled: env.REAL_MONEY_ENABLED,
            chainEnv: env.CHAIN_ENV,
            jobsEnabled: env.JOBS_ENABLED,
            version: process.env.npm_package_version ?? '0.1.0',
            uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
            services,
            queues,
            randomness: {
                provider: env.RANDOMNESS_PROVIDER,
                lastFulfilledAt: lastVrf?.fulfilledAt?.toISOString() ?? null,
                pendingRequests: pendingVrf,
            },
            chains: this.blockchain.status(),
            chainCursors: cursors.map((c) => ({
                key: c.key,
                lastBlock: c.lastBlock.toString(),
                updatedAt: c.updatedAt.toISOString(),
            })),
            featureFlags: flags,
            ledger: reconciliation,
            checkedAt: new Date().toISOString(),
        };
    }
    // ── MOB-11 / topbar alerts ────────────────────────────────────────────────────────────────────
    /**
     * Live alerts computed from real state (nothing is invented): ledger reconciliation, kill switches, queue failures,
     * failed withdrawals, VRF requests waiting, AML alerts and withdrawals waiting for review. Acknowledgements are
     * audit rows (`admin.alert.acknowledged`) for the alert key — they change nothing else.
     */
    async alerts(admin, now = new Date()) {
        const since24h = (0, time_1.addDays)(now, -1);
        const [health, amlOpen, amlCritical, underReview, failedWd, confirmingDeposits, kycPending, acks,] = await Promise.all([
            this.systemHealth(),
            this.prisma.amlAlert.count({ where: { status: { in: [...OPEN_AML] } } }),
            this.prisma.amlAlert.count({
                where: { status: { in: [...OPEN_AML] }, riskLevel: { in: ['high', 'critical'] } },
            }),
            this.prisma.withdrawal.count({ where: { status: 'under_review' } }),
            this.prisma.withdrawal.count({ where: { status: 'failed', updatedAt: { gte: since24h } } }),
            this.prisma.deposit.count({ where: { status: 'confirming' } }),
            this.prisma.kycRecord.count({ where: { status: { in: ['pending', 'in_review'] } } }),
            this.prisma.auditLog.findMany({
                where: { action: 'admin.alert.acknowledged', createdAt: { gte: since24h } },
                orderBy: { seq: 'desc' },
                select: { targetId: true, actorLabel: true, createdAt: true },
            }),
        ]);
        const list = [];
        if (!health.ledger.ok) {
            list.push({
                key: 'ledger.reconciliation',
                category: 'operations',
                severity: 'high',
                title: 'Ledger reconciliation mismatch',
                body: `Ledger total ${health.ledger.ledgerTotal} USDT, ${health.ledger.unbalancedPostings} unbalanced postings, ${health.ledger.poolMismatches.length} pool mismatches. Investigate — the ledger is never edited; corrections are new postings.`,
                href: null,
                permission: 'reconciliation.read',
            });
        }
        for (const s of health.services) {
            if (s.status !== 'up') {
                list.push({
                    key: `service.${s.key}`,
                    category: 'operations',
                    severity: 'high',
                    title: `${s.name} is down`,
                    body: s.error ?? 'Health check failed.',
                    href: null,
                    permission: null,
                });
            }
        }
        for (const q of health.queues) {
            if (q.status !== 'up') {
                list.push({
                    key: `queue.${q.name}.down`,
                    category: 'operations',
                    severity: 'high',
                    title: `Queue ${q.name} unreachable`,
                    body: 'error' in q && q.error ? q.error : 'BullMQ did not answer.',
                    href: null,
                    permission: null,
                });
            }
            else if (q.counts && (q.counts.failed ?? 0) > 0) {
                list.push({
                    key: `queue.${q.name}.failed`,
                    category: 'operations',
                    severity: 'warning',
                    title: `${q.counts.failed} failed ${q.name} job(s)`,
                    body: 'Jobs are idempotent and retried with back-off; failed jobs are kept for 7 days for inspection.',
                    href: null,
                    permission: null,
                });
            }
        }
        if (!health.jobsEnabled) {
            list.push({
                key: 'jobs.disabled',
                category: 'operations',
                severity: 'info',
                title: 'Background workers are off on this API instance',
                body: 'JOBS_ENABLED=false: deposit watching, withdrawal processing and the round lifecycle run on another instance or are paused.',
                href: null,
                permission: null,
            });
        }
        for (const f of health.featureFlags) {
            if (!f.enabled && f.key !== 'real_money.enabled') {
                list.push({
                    key: `flag.${f.key}`,
                    category: 'operations',
                    severity: 'warning',
                    title: `Kill switch active · ${f.key}`,
                    body: f.description ?? 'This operational feature is paused.',
                    href: null,
                    permission: null,
                });
            }
        }
        if (health.randomness.pendingRequests > 0) {
            list.push({
                key: 'vrf.pending',
                category: 'operations',
                severity: 'info',
                title: `${health.randomness.pendingRequests} randomness request(s) waiting`,
                body: `Provider ${health.randomness.provider}. Draws settle only from a fulfilled random word — nobody can change the result from here.`,
                href: null,
                permission: 'rounds.read',
            });
        }
        if (failedWd > 0) {
            list.push({
                key: 'withdrawals.failed24h',
                category: 'operations',
                severity: 'warning',
                title: `${failedWd} failed withdrawal(s) · last 24 h`,
                body: 'Funds of failed withdrawals are back in the players’ Available balance; no network fee was charged.',
                href: null,
                permission: 'withdrawals.read',
            });
        }
        if (confirmingDeposits > 0) {
            list.push({
                key: 'deposits.confirming',
                category: 'operations',
                severity: 'info',
                title: `${confirmingDeposits} deposit(s) confirming`,
                body: 'Credited automatically after the required confirmations.',
                href: null,
                permission: 'deposits.read',
            });
        }
        if (amlOpen > 0) {
            list.push({
                key: 'aml.open',
                category: 'compliance',
                severity: amlCritical > 0 ? 'high' : 'warning',
                title: `${amlOpen} open AML alert(s)`,
                body: `${amlCritical} high or critical. Each resolution needs a reason and a fresh 2FA code.`,
                href: null,
                permission: 'aml.read',
            });
        }
        if (underReview > 0) {
            list.push({
                key: 'withdrawals.under_review',
                category: 'compliance',
                severity: 'warning',
                title: `${underReview} withdrawal(s) under review`,
                body: 'Flagged withdrawals need two different admins (four eyes), each with a reason and 2FA.',
                href: '/admin/approvals',
                permission: 'withdrawals.read',
            });
        }
        if (kycPending > 0) {
            list.push({
                key: 'kyc.pending',
                category: 'compliance',
                severity: 'info',
                title: `${kycPending} KYC review(s) pending`,
                body: 'Verification requests waiting for the provider or a reviewer.',
                href: null,
                permission: 'kyc.read',
            });
        }
        const visible = list.filter((a) => !a.permission || admin.permissions.includes(a.permission));
        const ackOf = (key) => acks.find((a) => a.targetId === key);
        const items = visible.map((a) => {
            const ack = ackOf(a.key);
            return {
                ...a,
                acknowledged: ack ? { by: ack.actorLabel, at: ack.createdAt.toISOString() } : null,
            };
        });
        const sev = { high: 0, warning: 1, info: 2 };
        items.sort((a, b) => sev[a.severity] - sev[b.severity]);
        return {
            items,
            counts: {
                total: items.length,
                unacknowledged: items.filter((a) => !a.acknowledged).length,
                operations: items.filter((a) => a.category === 'operations').length,
                compliance: items.filter((a) => a.category === 'compliance').length,
            },
            generatedAt: now.toISOString(),
        };
    }
    async acknowledgeAlert(admin, key, note, meta) {
        const current = await this.alerts(admin);
        if (!current.items.some((a) => a.key === key))
            throw (0, errors_1.notFound)('Alert');
        const entry = await this.audit.record({
            actorType: 'admin',
            actorId: admin.id,
            actorLabel: admin.name,
            action: 'admin.alert.acknowledged',
            targetType: 'alert',
            targetId: key,
            reason: note ?? null,
            ip: meta.ip,
            userAgent: meta.userAgent,
            requestId: meta.requestId,
        });
        return { key, acknowledgedAt: new Date().toISOString(), auditSeq: entry.seq };
    }
    // ── helpers ───────────────────────────────────────────────────────────────────────────────────
    async assertUser(id) {
        const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
        if (!u)
            throw (0, errors_1.notFound)('User');
    }
};
exports.AdminConsoleService = AdminConsoleService;
exports.AdminConsoleService = AdminConsoleService = __decorate([
    (0, common_1.Injectable)(),
    __param(10, (0, redis_module_1.InjectRedis)()),
    __param(11, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.DEPOSITS)),
    __param(12, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.WITHDRAWALS)),
    __param(13, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.ROUNDS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        audit_service_1.AuditService,
        admin_security_service_1.AdminSecurityService,
        four_eyes_service_1.FourEyesService,
        responsible_gaming_service_1.ResponsibleGamingService,
        kyc_service_1.KycService,
        feature_flags_service_1.FeatureFlagsService,
        blockchain_service_1.BlockchainService,
        app_config_1.AppConfig, Function, Function, Function, Function])
], AdminConsoleService);
function summariseAgent(ua) {
    if (!ua)
        return 'Unknown device';
    const os = /Mac OS X|Macintosh/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
            ? 'Windows'
            : /iPhone|iPad/.test(ua)
                ? 'iOS'
                : /Android/.test(ua)
                    ? 'Android'
                    : /Linux/.test(ua)
                        ? 'Linux'
                        : 'Unknown OS';
    const browser = /Edg\//.test(ua)
        ? 'Edge'
        : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Firefox\//.test(ua)
                ? 'Firefox'
                : /Safari\//.test(ua)
                    ? 'Safari'
                    : 'Browser';
    return `${os} · ${browser}`;
}
//# sourceMappingURL=admin-console.service.js.map