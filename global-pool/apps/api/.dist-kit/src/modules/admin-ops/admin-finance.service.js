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
exports.AdminFinanceService = exports.atHandle = exports.APPEND_ONLY_TRIGGERS = exports.FOUR_EYES_AMOUNT = exports.WITHDRAWAL_SLA_HOURS = void 0;
exports.riskScoreOf = riskScoreOf;
exports.startOfUtcDay = startOfUtcDay;
exports.accountLabel = accountLabel;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const fees_1 = require("@gp/shared/fees");
const enums_1 = require("@gp/shared/enums");
const money_1 = require("@gp/shared/money");
const pool_1 = require("@gp/shared/pool");
const schemas_1 = require("@gp/shared/schemas");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const ledger_service_1 = require("../ledger/ledger.service");
const withdrawals_service_1 = require("../withdrawals/withdrawals.service");
/** Withdrawal review SLA (hours from request). */
exports.WITHDRAWAL_SLA_HOURS = 4;
/** Four-eyes threshold (policy FIN-2.3): flagged by AML, or at/above this amount. */
exports.FOUR_EYES_AMOUNT = '10000.00';
/** Append-only triggers that must exist on the money tables (checked on the ledger page). */
exports.APPEND_ONLY_TRIGGERS = [
    'ledger_postings_append_only',
    'ledger_entries_append_only',
    'ledger_entries_balanced',
    'pool_ledger_append_only',
    'fee_ledger_append_only',
    'audit_logs_append_only',
    'withdrawal_events_append_only',
];
const OPEN_WITHDRAWAL = [
    'requested',
    'risk_check',
    'under_review',
    'queued',
    'broadcast',
];
/** Read-only risk score (0–100) for a risk level — the same bands as the Admin/Risk Score Meter. */
function riskScoreOf(level) {
    return level === 'critical'
        ? 91
        : level === 'high'
            ? 72
            : level === 'medium'
                ? 46
                : level === 'low'
                    ? 18
                    : 0;
}
/** "@nova.k" from a stored handle ("nova.k"). */
const atHandle = (h) => (h ? `@${h.replace(/^@/, '')}` : null);
exports.atHandle = atHandle;
const m = (v) => (0, money_1.money)((v ?? '0'));
/**
 * Finance back-office (ADM-F1…F8): read-only aggregates computed from the append-only ledger and its
 * sub-ledgers. Nothing here writes money — withdrawal decisions go through WithdrawalsService (four-eyes),
 * and corrections are always new reviewed postings (no edit path exists).
 */
let AdminFinanceService = class AdminFinanceService {
    prisma;
    ledger;
    audit;
    withdrawals;
    config;
    constructor(prisma, ledger, audit, withdrawals, config) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.audit = audit;
        this.withdrawals = withdrawals;
        this.config = config;
    }
    // ── F1 Deposits ─────────────────────────────────────────────────────────────────────────────
    async deposits(query, now = new Date()) {
        const q = query.q?.replace(/^@/, '');
        const refNumber = q && /^DP-?\d+$/i.test(q) ? Number(q.replace(/\D/g, '')) : null;
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.network ? { network: query.network } : {}),
            ...(q
                ? refNumber !== null
                    ? { number: refNumber }
                    : {
                        OR: [
                            { txHash: { startsWith: q.toLowerCase() } },
                            { user: { handle: { contains: q.toLowerCase() } } },
                            { user: { publicId: { equals: q.toUpperCase() } } },
                        ],
                    }
                : {}),
        };
        const since24h = (0, time_1.addHours)(now, -24);
        const [rows, total, byStatus, credited24h, held, perNetwork] = await Promise.all([
            this.prisma.deposit.findMany({
                where,
                orderBy: { detectedAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    user: { select: { id: true, publicId: true, handle: true } },
                    amlAlerts: { select: { id: true, riskLevel: true, status: true, rule: true } },
                },
            }),
            this.prisma.deposit.count({ where }),
            this.prisma.deposit.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
            this.prisma.deposit.aggregate({
                where: { status: 'credited', creditedAt: { gte: since24h } },
                _count: true,
                _sum: { amount: true },
            }),
            this.prisma.deposit.count({
                where: { amlAlerts: { some: { status: { in: ['open', 'under_review', 'escalated'] } } } },
            }),
            this.prisma.deposit.groupBy({
                by: ['network', 'status'],
                _count: true,
                _sum: { amount: true },
            }),
        ]);
        const [cursors, creditedToday, unsupported24h, heldRows] = await Promise.all([
            this.prisma.chainCursor.findMany(),
            this.prisma.deposit.groupBy({
                by: ['network'],
                where: { status: 'credited', creditedAt: { gte: startOfUtcDay(now) } },
                _count: true,
            }),
            this.prisma.deposit.aggregate({
                where: { status: 'rejected', detectedAt: { gte: since24h } },
                _count: true,
                _sum: { amount: true },
            }),
            this.prisma.deposit.findMany({
                where: { amlAlerts: { some: { status: { in: ['open', 'under_review', 'escalated'] } } } },
                orderBy: { detectedAt: 'desc' },
                take: 5,
                include: {
                    user: { select: { handle: true } },
                    amlAlerts: { select: { id: true, rule: true, riskLevel: true }, take: 1 },
                },
            }),
        ]);
        const stat = (s) => {
            const r = byStatus.find((b) => b.status === s);
            return { count: r?._count ?? 0, amount: (0, money_2.usdt)(r?._sum.amount) };
        };
        const env = this.config.env;
        const networks = Object.keys(chains_1.CHAINS).map((key) => {
            const chain = chains_1.CHAINS[key];
            const rowsFor = perNetwork.filter((p) => p.network === key);
            const confirming = rowsFor.find((p) => p.status === 'confirming');
            const cursor = cursors.find((c) => c.key.includes(key));
            const configured = key === 'arbitrum' && Boolean(env.ARBITRUM_SEPOLIA_RPC_URL);
            return {
                network: key,
                name: chain.name,
                enabled: chain.enabled,
                requiredConfirmations: chain.confirmations,
                watcher: chain.enabled
                    ? configured
                        ? 'running'
                        : 'not_configured'
                    : 'coming_soon',
                lastBlock: cursor ? cursor.lastBlock.toString() : null,
                confirming: confirming?._count ?? 0,
                confirmingAmount: (0, money_2.usdt)(confirming?._sum.amount),
                deposits: rowsFor.reduce((n, r) => n + r._count, 0),
                creditedToday: creditedToday.find((c) => c.network === key)?._count ?? 0,
            };
        });
        return {
            summary: {
                credited24h: { count: credited24h._count, amount: (0, money_2.usdt)(credited24h._sum.amount) },
                confirming: stat('confirming'),
                detected: stat('detected'),
                credited: stat('credited'),
                rejected: stat('rejected'),
                heldForCompliance: held,
                unsupported24h: { count: unsupported24h._count, amount: (0, money_2.usdt)(unsupported24h._sum.amount) },
            },
            networks,
            held: heldRows.map((d) => ({
                id: d.id,
                reference: `DP-${d.number}`,
                handle: (0, exports.atHandle)(d.user.handle),
                network: d.network,
                networkName: chains_1.CHAINS[d.network].name,
                amount: (0, money_2.usdt)(d.amount),
                alert: d.amlAlerts[0]
                    ? {
                        id: d.amlAlerts[0].id,
                        rule: d.amlAlerts[0].rule,
                        riskLevel: d.amlAlerts[0].riskLevel,
                    }
                    : null,
                isDemo: d.isDemo,
            })),
            ...(0, schemas_1.paginate)(rows.map((d) => ({
                id: d.id,
                reference: `DP-${d.number}`,
                user: { id: d.user.id, publicId: d.user.publicId, handle: (0, exports.atHandle)(d.user.handle) },
                network: d.network,
                networkName: chains_1.CHAINS[d.network].name,
                amount: (0, money_2.usdt)(d.amount),
                confirmations: d.confirmations,
                requiredConfirmations: d.requiredConfirmations,
                status: d.status,
                txHash: d.txHash,
                fromAddress: d.fromAddress,
                toAddress: d.toAddress,
                detectedAt: d.detectedAt.toISOString(),
                creditedAt: d.creditedAt?.toISOString() ?? null,
                amlAlert: d.amlAlerts[0]
                    ? {
                        id: d.amlAlerts[0].id,
                        riskLevel: d.amlAlerts[0].riskLevel,
                        status: d.amlAlerts[0].status,
                        rule: d.amlAlerts[0].rule,
                    }
                    : null,
                isDemo: d.isDemo,
            })), total, query),
            generatedAt: now.toISOString(),
        };
    }
    // ── F2 Withdrawals queue + detail ─────────────────────────────────────────────────────────────
    async withdrawalQueue(query, adminId, now = new Date()) {
        const pendingApprovals = await this.prisma.adminApproval.findMany({
            where: { targetType: 'withdrawal', action: 'withdrawal.approve', status: 'pending' },
            include: { requestedBy: { select: { name: true } } },
        });
        const awaitingIds = pendingApprovals.map((a) => a.targetId);
        const view = query.view ?? (query.status ? 'all' : 'queue');
        const statusWhere = view === 'queue'
            ? { status: { in: ['requested', 'risk_check', 'under_review', 'queued'] } }
            : view === 'awaiting_second'
                ? { id: { in: awaitingIds } }
                : view === 'broadcasting'
                    ? { status: 'broadcast' }
                    : view === 'completed'
                        ? { status: 'confirmed' }
                        : view === 'rejected'
                            ? { status: { in: ['rejected', 'failed', 'cancelled'] } }
                            : {};
        const q = query.q?.replace(/^@/, '');
        const refNumber = q && /^WD-?\d+$/i.test(q) ? Number(q.replace(/\D/g, '')) : null;
        const where = {
            ...statusWhere,
            ...(query.status ? { status: query.status } : {}),
            ...(q
                ? refNumber !== null
                    ? { number: refNumber }
                    : {
                        OR: [
                            { toAddress: { startsWith: q.toLowerCase() } },
                            { user: { handle: { contains: q.toLowerCase() } } },
                        ],
                    }
                : {}),
        };
        const [rows, total, counts, held, oldestOpen, paid24h, openRows] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where,
                orderBy: { createdAt: view === 'queue' ? 'asc' : 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    user: { select: { id: true, publicId: true, handle: true } },
                    amlAlerts: { select: { id: true, rule: true, status: true, riskLevel: true } },
                },
            }),
            this.prisma.withdrawal.count({ where }),
            this.prisma.withdrawal.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
            this.prisma.withdrawal.aggregate({
                where: { status: 'under_review' },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.withdrawal.findFirst({
                where: { status: { in: ['requested', 'risk_check', 'under_review', 'queued'] } },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
            }),
            this.prisma.withdrawal.aggregate({
                where: { status: 'confirmed', confirmedAt: { gte: (0, time_1.addHours)(now, -24) } },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.withdrawal.findMany({
                where: { status: { in: ['requested', 'risk_check', 'under_review', 'queued'] } },
                orderBy: { createdAt: 'asc' },
                take: 200,
                select: {
                    id: true,
                    number: true,
                    createdAt: true,
                    amount: true,
                    status: true,
                    riskLevel: true,
                    requiresFourEyes: true,
                    user: { select: { handle: true } },
                },
            }),
        ]);
        const slaLeft = (created) => Math.floor(((0, time_1.addHours)(created, exports.WITHDRAWAL_SLA_HOURS).getTime() - now.getTime()) / 60_000);
        const withinSla = openRows.filter((r) => slaLeft(r.createdAt) >= 0).length;
        const count = (...s) => counts.filter((c) => s.includes(c.status)).reduce((n, c) => n + c._count, 0);
        return {
            policy: {
                slaHours: exports.WITHDRAWAL_SLA_HOURS,
                fourEyesAmount: exports.FOUR_EYES_AMOUNT,
                fourEyesRule: 'Four-eyes on any AML flag or from 10,000.00 USDT (policy FIN-2.3)',
                immutable: 'Amount and destination can’t be changed by any admin',
            },
            summary: {
                open: count('requested', 'risk_check', 'under_review', 'queued'),
                oldestOpenMinutes: oldestOpen
                    ? Math.max(0, Math.floor((now.getTime() - oldestOpen.createdAt.getTime()) / 60_000))
                    : null,
                awaitingSecond: pendingApprovals.length,
                underReview: held._count,
                onHold: (0, money_2.usdt)(held._sum.amount),
                broadcasting: count('broadcast'),
                completed: count('confirmed'),
                rejected: count('rejected', 'failed', 'cancelled'),
                withinSlaPercent: openRows.length === 0 ? 100 : Math.round((withinSla / openRows.length) * 100),
                paid24h: { count: paid24h._count, amount: (0, money_2.usdt)(paid24h._sum.amount) },
            },
            slaWatch: openRows.slice(0, 3).map((r) => ({
                id: r.id,
                reference: `WD-${r.number}`,
                handle: (0, exports.atHandle)(r.user.handle),
                amount: (0, money_2.usdt)(r.amount),
                status: r.status,
                statusLabel: enums_1.WITHDRAWAL_STATUS_LABEL[r.status],
                riskLevel: r.riskLevel,
                requiresFourEyes: r.requiresFourEyes,
                slaMinutesLeft: slaLeft(r.createdAt),
            })),
            view,
            ...(0, schemas_1.paginate)(rows.map((w) => {
                const approval = pendingApprovals.find((a) => a.targetId === w.id);
                const due = (0, time_1.addHours)(w.createdAt, exports.WITHDRAWAL_SLA_HOURS);
                return {
                    id: w.id,
                    reference: `WD-${w.number}`,
                    status: w.status,
                    statusLabel: enums_1.WITHDRAWAL_STATUS_LABEL[w.status],
                    user: { id: w.user.id, publicId: w.user.publicId, handle: (0, exports.atHandle)(w.user.handle) },
                    network: w.network,
                    networkName: chains_1.CHAINS[w.network].name,
                    toAddress: w.toAddress,
                    amount: (0, money_2.usdt)(w.amount),
                    networkFee: (0, money_2.usdt)(w.networkFee),
                    youReceive: (0, money_2.usdt)(w.netAmount),
                    riskLevel: w.riskLevel,
                    riskScore: riskScoreOf(w.riskLevel),
                    riskFlags: w.riskFlags,
                    flagged: w.flagged,
                    requiresFourEyes: w.requiresFourEyes,
                    amlAlert: w.amlAlerts[0] ? { id: w.amlAlerts[0].id, rule: w.amlAlerts[0].rule } : null,
                    approval: approval
                        ? {
                            id: approval.id,
                            approvals: 1,
                            of: 2,
                            requestedBy: approval.requestedBy.name,
                            requestedByMe: approval.requestedByAdminId === adminId,
                        }
                        : null,
                    createdAt: w.createdAt.toISOString(),
                    slaDueAt: due.toISOString(),
                    slaMinutesLeft: OPEN_WITHDRAWAL.includes(w.status)
                        ? Math.floor((due.getTime() - now.getTime()) / 60_000)
                        : null,
                    isDemo: w.isDemo,
                };
            }), total, query),
            generatedAt: now.toISOString(),
        };
    }
    async withdrawalDetail(id, adminId, now = new Date()) {
        const w = await this.prisma.withdrawal.findUnique({
            where: { id },
            include: {
                events: { orderBy: { createdAt: 'asc' } },
                user: { include: { profile: true, totpSecret: { select: { status: true } } } },
                amlAlerts: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!w)
            throw (0, errors_1.notFound)('Withdrawal');
        const reference = `WD-${w.number}`;
        const [balances, approvals, auditRows, postings, sameAddress, wallet, previousCount] = await Promise.all([
            this.ledger.userBalances(w.userId),
            this.prisma.adminApproval.findMany({
                where: { targetType: 'withdrawal', targetId: id },
                orderBy: { createdAt: 'asc' },
                include: {
                    requestedBy: { select: { name: true } },
                    decidedBy: { select: { name: true } },
                },
            }),
            this.prisma.auditLog.findMany({
                where: { targetType: 'withdrawal', targetId: id },
                orderBy: { seq: 'asc' },
            }),
            this.prisma.ledgerPosting.findMany({
                where: { reference },
                orderBy: { createdAt: 'asc' },
                include: { entries: { include: { account: { select: { code: true, type: true } } } } },
            }),
            this.prisma.withdrawal.count({
                where: {
                    userId: w.userId,
                    toAddress: w.toAddress,
                    status: 'confirmed',
                    id: { not: w.id },
                },
            }),
            this.prisma.userWallet.findFirst({
                where: { userId: w.userId, address: { equals: w.toAddress, mode: 'insensitive' } },
            }),
            this.prisma.withdrawal.count({
                where: { userId: w.userId, status: 'confirmed', id: { not: w.id } },
            }),
        ]);
        const view = this.withdrawals.view(w);
        const pending = approvals.find((a) => a.status === 'pending') ?? null;
        const due = (0, time_1.addHours)(w.createdAt, exports.WITHDRAWAL_SLA_HOURS);
        const fourEyes = {
            required: w.requiresFourEyes,
            approvals: pending ? 1 : approvals.some((a) => a.status === 'approved') ? 2 : 0,
            of: w.requiresFourEyes ? 2 : 1,
            pendingApprovalId: pending?.id ?? null,
            firstApprover: pending?.requestedBy.name ?? null,
            firstApprovedByMe: pending?.requestedByAdminId === adminId,
        };
        return {
            ...view,
            user: {
                id: w.user.id,
                publicId: w.user.publicId,
                handle: (0, exports.atHandle)(w.user.handle),
                status: w.user.status,
                country: w.user.profile?.country ?? null,
                kycLevel: w.user.profile?.kycLevel ?? 'none',
                vipTier: w.user.profile?.vipTier ?? 'bronze',
                twoFactorEnabled: w.user.totpSecret?.status === 'active',
                memberSince: w.user.createdAt.toISOString(),
                confirmedWithdrawals: previousCount,
                isDemo: w.user.isDemo,
            },
            balances,
            destination: {
                address: w.toAddress,
                network: w.network,
                networkName: chains_1.CHAINS[w.network].name,
                whitelistedAt: wallet?.whitelistedAt?.toISOString() ?? null,
                source: wallet?.source ?? null,
                previousPayouts: sameAddress,
                firstPayout: sameAddress === 0,
            },
            sla: {
                hours: exports.WITHDRAWAL_SLA_HOURS,
                dueAt: due.toISOString(),
                minutesLeft: OPEN_WITHDRAWAL.includes(w.status)
                    ? Math.floor((due.getTime() - now.getTime()) / 60_000)
                    : null,
            },
            fourEyes,
            risk: {
                score: riskScoreOf(w.riskLevel),
                level: w.riskLevel ?? 'low',
                factors: [
                    ...(Array.isArray(w.riskFlags) ? w.riskFlags : []),
                    `KYC ${(w.user.profile?.kycLevel ?? 'none').replace('level_', 'L')}`,
                ],
            },
            canDecide: w.status === 'under_review',
            canApprove: w.status === 'under_review' && !fourEyes.firstApprovedByMe,
            amlAlerts: w.amlAlerts.map((a) => ({
                id: a.id,
                reference: `AML-${a.id.slice(0, 4).toUpperCase()}`,
                riskLevel: a.riskLevel,
                rule: a.rule,
                status: a.status,
                details: a.details,
                createdAt: a.createdAt.toISOString(),
                isDemo: a.isDemo,
            })),
            approvals: approvals.map((a) => ({
                id: a.id,
                status: a.status,
                requestedBy: a.requestedBy.name,
                requestReason: a.requestReason,
                decidedBy: a.decidedBy?.name ?? null,
                decisionReason: a.decisionReason,
                createdAt: a.createdAt.toISOString(),
                decidedAt: a.decidedAt?.toISOString() ?? null,
            })),
            audit: auditRows.map((r) => ({
                seq: r.seq.toString(),
                action: r.action,
                actorLabel: r.actorLabel,
                actorType: r.actorType,
                reason: r.reason,
                outcome: r.outcome,
                hash: r.hash,
                createdAt: r.createdAt.toISOString(),
            })),
            postings: postings.map((p) => this.postingView(p, new Map([[w.userId, (0, exports.atHandle)(w.user.handle)]]))),
            fees: {
                networkFee: (0, money_2.usdt)(w.networkFee),
                platformFee: (0, money_2.usdt)(w.platformFee),
                note: 'Network fee is deducted from the amount; platform withdrawal fee 0.00',
            },
        };
    }
    // ── F3 Platform fees ──────────────────────────────────────────────────────────────────────────
    async fees(now = new Date()) {
        const since30 = (0, time_1.addDays)(startOfUtcDay(now), -29);
        const [allTime, last30, last24, daily, byRound, feeAccount, cancelledEntries] = await Promise.all([
            this.prisma.feeLedger.aggregate({ _sum: { amount: true, entryCount: true } }),
            this.prisma.feeLedger.aggregate({
                where: { createdAt: { gte: since30 } },
                _sum: { amount: true, entryCount: true },
            }),
            this.prisma.feeLedger.aggregate({
                where: { createdAt: { gte: (0, time_1.addHours)(now, -24) } },
                _sum: { amount: true, entryCount: true },
            }),
            this.prisma.$queryRaw `
          SELECT date_trunc('day', created_at) AS day, SUM(amount)::text AS amount, SUM(entry_count)::bigint AS entries
          FROM fee_ledger WHERE created_at >= ${since30}
          GROUP BY 1 ORDER BY 1`,
            this.prisma.$queryRaw `
          SELECT f.round_id::text AS round_id, r.number, r.status::text AS status, SUM(f.amount)::text AS amount,
                 SUM(f.entry_count)::bigint AS entries, r.is_demo, r.closes_at
          FROM fee_ledger f LEFT JOIN rounds r ON r.id = f.round_id
          GROUP BY f.round_id, r.number, r.status, r.is_demo, r.closes_at
          ORDER BY r.number DESC NULLS LAST LIMIT 20`,
            this.ledger.balanceOf({ type: 'fees' }),
            this.prisma.round.aggregate({
                where: { status: 'cancelled' },
                _sum: { platformFees: true },
            }),
        ]);
        const series = [];
        for (let i = 0; i < 30; i++) {
            const d = (0, time_1.addDays)(since30, i);
            const row = daily.find((r) => r.day.getTime() === d.getTime());
            series.push({
                day: d.toISOString().slice(0, 10),
                amount: (0, money_2.usdt)(row?.amount ?? '0'),
                entries: Number(row?.entries ?? 0),
            });
        }
        return {
            rule: {
                perEntry: fees_1.PLATFORM_FEE_PER_ENTRY,
                entryPrice: fees_1.ENTRY_PRICE,
                description: 'Platform fee 0.05 USDT per qualifying entry, charged on top of the 10.00 entry price and posted to the fees account — never to a pool.',
                changePolicy: 'Fee changes need dual approval and apply only from the next round (rules are copied into a round when it opens).',
                cancelledRounds: 'Stakes of cancelled rounds are refunded in full; platform fees stay in the fees account (shown separately below).',
            },
            totals: {
                allTime: (0, money_2.usdt)(allTime._sum.amount),
                allTimeEntries: allTime._sum.entryCount ?? 0,
                last30d: (0, money_2.usdt)(last30._sum.amount),
                last30dEntries: last30._sum.entryCount ?? 0,
                last24h: (0, money_2.usdt)(last24._sum.amount),
                last24hEntries: last24._sum.entryCount ?? 0,
                feesAccountBalance: feeAccount,
                subLedgerMatchesAccount: m(allTime._sum.amount).eq(m(feeAccount)),
                cancelledRoundFees: (0, money_2.usdt)(cancelledEntries._sum.platformFees),
            },
            series,
            byRound: byRound.map((r) => ({
                roundId: r.round_id,
                roundNumber: r.number,
                status: r.status,
                amount: (0, money_2.usdt)(r.amount),
                entries: Number(r.entries),
                state: r.status === 'open' || r.status === 'closed' || r.status === 'drawing'
                    ? 'accruing'
                    : r.status === 'cancelled'
                        ? 'retained_cancelled'
                        : 'earned',
                closesAt: r.closes_at?.toISOString() ?? null,
                isDemo: r.is_demo ?? false,
            })),
            generatedAt: now.toISOString(),
        };
    }
    // ── F4 Pool accounting ────────────────────────────────────────────────────────────────────────
    async poolAccounting(now = new Date()) {
        const [byType, poolRows, owedPrizes, refundsOutstanding, rewardsOwed, current] = await Promise.all([
            this.ledger.balancesByType(),
            this.prisma.$queryRaw `
          SELECT r.id::text AS id, r.number, r.status::text AS status, r.pool_amount::text AS pool_amount,
                 COALESCE(SUM(e.amount), 0)::text AS ledger,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'entry'), 0)::text AS entries_in,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'refund'), 0)::text AS refunded,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'settlement'), 0)::text AS settled,
                 r.is_demo
          FROM rounds r
            LEFT JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
            LEFT JOIN ledger_entries e ON e.account_id = a.id
          GROUP BY r.id ORDER BY r.number DESC LIMIT 12`,
            this.prisma.prizeClaim.aggregate({
                where: { status: 'owed' },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.transaction.aggregate({
                where: { type: 'refund', status: 'pending' },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.transaction.aggregate({
                where: { type: { in: ['reward', 'rakeback', 'cashback'] }, status: 'pending' },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.round.findFirst({
                where: { status: { in: ['open', 'closed', 'drawing'] } },
                orderBy: { closesAt: 'asc' },
            }),
        ]);
        const b = (t) => m(byType[t] ?? '0');
        const escrow = poolRows
            .filter((r) => ['open', 'closed', 'drawing'].includes(r.status))
            .reduce((acc, r) => acc.plus(m(r.ledger)), (0, money_1.money)(0));
        const owedPrizesAmt = m(owedPrizes._sum.amount);
        const refundsAmt = m(refundsOutstanding._sum.amount);
        const liabilities = escrow.plus(owedPrizesAmt).plus(refundsAmt);
        const custody = b('chain_clearing').negated();
        const customer = b('user_available')
            .plus(b('user_locked'))
            .plus(b('user_pending'))
            .plus(b('user_owed'));
        return {
            liabilities: {
                total: (0, money_1.toUSDTString)(liabilities),
                poolEscrow: (0, money_1.toUSDTString)(escrow),
                owedPrizes: (0, money_1.toUSDTString)(owedPrizesAmt),
                owedPrizesCount: owedPrizes._count,
                refundsOutstanding: (0, money_1.toUSDTString)(refundsAmt),
                refundsOutstandingCount: refundsOutstanding._count,
                rewardsOwed: (0, money_2.usdt)(rewardsOwed._sum.amount),
            },
            accounts: {
                pool: (0, money_1.toUSDTString)(b('pool')),
                prizeLiability: (0, money_1.toUSDTString)(b('prize_liability')),
                refundsClearing: (0, money_1.toUSDTString)(b('refunds')),
                fees: (0, money_1.toUSDTString)(b('fees')),
                operatorRevenue: (0, money_1.toUSDTString)(b('operator_revenue')),
                userOwed: (0, money_1.toUSDTString)(b('user_owed')),
                customerBalances: (0, money_1.toUSDTString)(customer),
                custodyMirror: (0, money_1.toUSDTString)(custody),
            },
            currentRound: current
                ? {
                    number: current.number,
                    status: current.status,
                    entries: current.entriesCount,
                    participants: current.participantsCount,
                    entryPrice: (0, money_2.usdt)(current.entryPrice),
                    pool: (0, money_2.usdt)(current.poolAmount),
                    fees: (0, money_2.usdt)(current.platformFees),
                    closesAt: current.closesAt.toISOString(),
                    waterfall: (0, pool_1.prizeBreakdown)((0, money_2.usdt)(current.poolAmount)),
                    isDemo: current.isDemo,
                }
                : null,
            rounds: poolRows.map((r) => ({
                number: r.number,
                status: r.status,
                projection: (0, money_2.usdt)(r.pool_amount),
                ledger: (0, money_2.usdt)(r.ledger),
                entriesIn: (0, money_2.usdt)(r.entries_in),
                refunded: (0, money_2.usdt)(m(r.refunded).negated()),
                settledOut: (0, money_2.usdt)(m(r.settled).negated()),
                matches: !['open', 'closed', 'drawing'].includes(r.status) || m(r.ledger).eq(m(r.pool_amount)),
                isDemo: r.is_demo,
            })),
            policy: 'Immutable by design: no role can move pool funds, edit balances or change a round’s prize split. Pools leave escrow only through contract-defined settlement or refunds.',
            generatedAt: now.toISOString(),
        };
    }
    // ── F5 Financial ledger ───────────────────────────────────────────────────────────────────────
    async ledgerJournal(query) {
        const q = query.q?.trim();
        let userIds = null;
        if (q && !/^(WD|DP|RF|RW|E)-/i.test(q) && !q.startsWith('round:')) {
            const users = await this.prisma.user.findMany({
                where: { handle: { contains: q.replace(/^@/, '').toLowerCase() } },
                select: { id: true },
                take: 50,
            });
            userIds = users.map((u) => u.id);
        }
        const where = {
            ...(query.kind ? { kind: query.kind } : {}),
            ...(q
                ? userIds
                    ? { entries: { some: { userId: { in: userIds } } } }
                    : {
                        reference: {
                            startsWith: q.toUpperCase().startsWith('ROUND:')
                                ? q.toLowerCase()
                                : q.toUpperCase(),
                        },
                    }
                : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.ledgerPosting.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    entries: {
                        include: {
                            account: { select: { code: true, type: true, network: true, roundId: true } },
                        },
                    },
                },
            }),
            this.prisma.ledgerPosting.count({ where }),
        ]);
        const userIdsOnPage = [
            ...new Set(rows.flatMap((p) => p.entries.map((e) => e.userId).filter(Boolean))),
        ];
        const roundIds = [
            ...new Set(rows.flatMap((p) => p.entries.map((e) => e.account.roundId).filter(Boolean))),
        ];
        const [users, rounds] = await Promise.all([
            this.prisma.user.findMany({
                where: { id: { in: userIdsOnPage } },
                select: { id: true, handle: true },
            }),
            this.prisma.round.findMany({
                where: { id: { in: roundIds } },
                select: { id: true, number: true },
            }),
        ]);
        const handleOf = new Map(users.map((u) => [u.id, (0, exports.atHandle)(u.handle)]));
        const roundOf = new Map(rounds.map((r) => [r.id, r.number]));
        let debits = (0, money_1.money)(0);
        let credits = (0, money_1.money)(0);
        const chain = await this.journalDigest(new Set(rows.map((p) => p.id)));
        const items = rows.map((p) => {
            const v = this.postingView(p, handleOf, roundOf);
            debits = debits.plus(m(v.debits));
            credits = credits.plus(m(v.credits));
            const link = chain.links.get(p.id);
            return {
                ...v,
                journalSeq: link?.seq ?? null,
                prevHash: link?.prevHash ?? null,
                chainHash: link?.hash ?? null,
            };
        });
        return {
            ...(0, schemas_1.paginate)(items, total, query),
            journal: { postings: chain.postings, headHash: chain.headHash },
            pageTotals: {
                debits: (0, money_1.toUSDTString)(debits),
                credits: (0, money_1.toUSDTString)(credits),
                balanced: debits.eq(credits),
            },
        };
    }
    /** Integrity panel for the ledger page: triggers, balance invariants, a digest of the journal, audit chain. */
    async ledgerIntegrity(now = new Date()) {
        const [triggers, reconcile, auditChain, digest] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY(${[...exports.APPEND_ONLY_TRIGGERS]}::text[])`,
            this.ledger.reconcile(),
            this.audit.verify(),
            this.journalDigest(),
        ]);
        const present = new Set(triggers.map((t) => t.tgname));
        return {
            appendOnly: {
                ok: exports.APPEND_ONLY_TRIGGERS.every((t) => present.has(t)),
                triggers: exports.APPEND_ONLY_TRIGGERS.map((name) => ({ name, present: present.has(name) })),
            },
            balanced: {
                ok: reconcile.unbalancedPostings === 0 && m(reconcile.ledgerTotal).isZero(),
                ledgerTotal: reconcile.ledgerTotal,
                unbalancedPostings: reconcile.unbalancedPostings,
            },
            journal: {
                postings: digest.postings,
                headHash: digest.headHash,
                algorithm: digest.algorithm,
            },
            auditChain: {
                ok: auditChain.ok,
                checked: auditChain.checked,
                headHash: auditChain.headHash,
                firstBrokenSeq: auditChain.firstBrokenSeq,
                problem: auditChain.problem,
            },
            generatedAt: now.toISOString(),
        };
    }
    /**
     * Running SHA-256 over every posting in commit order (id, kind, reference, createdAt, sorted lines). Any edit or
     * deletion of history would change it; DB triggers already make both impossible.
     */
    async journalDigest(withLinks) {
        const links = new Map();
        const rows = await this.prisma.$queryRaw `
      SELECT p.id::text AS id, p.kind::text AS kind, p.reference, p.created_at,
             string_agg(a.code || '=' || e.amount::text, ';' ORDER BY a.code, e.amount) AS lines
      FROM ledger_postings p JOIN ledger_entries e ON e.posting_id = p.id JOIN ledger_accounts a ON a.id = e.account_id
      GROUP BY p.id ORDER BY p.created_at, p.id`;
        let head = (0, node_crypto_1.createHash)('sha256').update('GLOBAL_POOL_LEDGER_V1').digest('hex');
        rows.forEach((r, i) => {
            const prev = head;
            head = (0, node_crypto_1.createHash)('sha256')
                .update(`${head}|${r.id}|${r.kind}|${r.reference ?? ''}|${r.created_at.toISOString()}|${r.lines}`)
                .digest('hex');
            if (withLinks?.has(r.id))
                links.set(r.id, { seq: i + 1, prevHash: prev, hash: head });
        });
        return {
            links,
            postings: rows.length,
            headHash: head,
            algorithm: 'sha256(prev | id | kind | reference | createdAt | lines)',
        };
    }
    postingView(p, handleOf, roundOf) {
        let debits = (0, money_1.money)(0);
        let credits = (0, money_1.money)(0);
        const lines = p.entries
            .map((e) => {
            const amt = m(e.amount.toFixed());
            if (amt.isNegative())
                debits = debits.plus(amt.negated());
            else
                credits = credits.plus(amt);
            const handle = e.userId ? (handleOf?.get(e.userId) ?? null) : null;
            const roundNumber = e.account.roundId ? (roundOf?.get(e.account.roundId) ?? null) : null;
            return {
                accountType: e.account.type,
                account: accountLabel(e.account.type, handle, roundNumber, e.account.network ?? null),
                handle,
                amount: (0, money_1.toUSDTString)(amt),
                side: amt.isNegative() ? 'debit' : 'credit',
            };
        })
            .sort((a, b) => (a.side === b.side ? 0 : a.side === 'debit' ? -1 : 1));
        return {
            id: p.id,
            kind: p.kind,
            kindLabel: schemas_1.LEDGER_POSTING_KIND_LABEL[p.kind] ?? p.kind,
            reference: p.reference,
            description: p.description,
            createdAt: p.createdAt.toISOString(),
            debits: (0, money_1.toUSDTString)(debits),
            credits: (0, money_1.toUSDTString)(credits),
            balanced: debits.eq(credits),
            lines,
            isDemo: p.isDemo,
        };
    }
    // ── F6 Reconciliation ─────────────────────────────────────────────────────────────────────────
    async reconciliation(now = new Date()) {
        const [base, byType, feeSub, poolSub, owedBreakdown, lockedOpen, negatives, confirming, prizeOwed,] = await Promise.all([
            this.ledger.reconcile(),
            this.ledger.balancesByType(),
            this.prisma.feeLedger.aggregate({ _sum: { amount: true } }),
            this.prisma.poolLedger.aggregate({ _sum: { amount: true } }),
            this.prisma.transaction.aggregate({
                where: { type: { in: ['refund', 'reward', 'rakeback', 'cashback'] }, status: 'pending' },
                _sum: { amount: true },
            }),
            this.prisma.withdrawal.aggregate({
                where: { status: { in: OPEN_WITHDRAWAL } },
                _sum: { amount: true },
            }),
            this.prisma.$queryRaw `
          SELECT count(*)::bigint AS n FROM (
            SELECT a.id FROM ledger_accounts a JOIN ledger_entries e ON e.account_id = a.id
            WHERE a.type IN ('user_available','user_locked','user_pending','user_owed')
            GROUP BY a.id HAVING SUM(e.amount) < 0) x`,
            this.prisma.deposit.findMany({
                where: { status: { in: ['detected', 'confirming'] } },
                orderBy: { detectedAt: 'asc' },
            }),
            this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
        ]);
        const b = (t) => m(byType[t] ?? '0');
        const scope = (s) => {
            const diff = m(s.actual).minus(m(s.expected));
            return {
                ...s,
                difference: (0, money_1.toUSDTString)(diff),
                status: s.status ?? (diff.isZero() ? 'match' : 'mismatch'),
            };
        };
        const scopes = [
            scope({
                key: 'ledger_total',
                scope: 'Whole ledger sums to zero',
                group: 'ledger',
                expected: '0.00',
                actual: base.ledgerTotal,
                expectedLabel: 'Expected',
                actualLabel: 'Σ all lines',
                note: 'Double entry: every value in has a value out.',
            }),
            scope({
                key: 'postings_balanced',
                scope: 'Every posting balanced',
                group: 'ledger',
                expected: '0',
                actual: String(base.unbalancedPostings),
                expectedLabel: 'Unbalanced postings',
                actualLabel: 'Found',
                note: 'Also enforced by a deferred constraint trigger at COMMIT.',
            }),
            scope({
                key: 'fee_sub_ledger',
                scope: 'Fee sub-ledger = fees account',
                group: 'sub_ledger',
                expected: (0, money_1.toUSDTString)(b('fees')),
                actual: (0, money_2.usdt)(feeSub._sum.amount),
                expectedLabel: 'Fees account',
                actualLabel: 'fee_ledger Σ',
                note: '0.05 USDT per qualifying entry, mirrored line by line.',
            }),
            scope({
                key: 'pool_sub_ledger',
                scope: 'Pool sub-ledger = pool accounts',
                group: 'sub_ledger',
                expected: (0, money_1.toUSDTString)(b('pool')),
                actual: (0, money_2.usdt)(poolSub._sum.amount),
                expectedLabel: 'Pool accounts',
                actualLabel: 'pool_ledger Σ',
                note: 'Entries in minus settlements and refunds out.',
            }),
            scope({
                key: 'owed',
                scope: 'Owed = prizes + refunds + rewards due',
                group: 'sub_ledger',
                expected: (0, money_1.toUSDTString)(b('user_owed')),
                actual: (0, money_1.toUSDTString)(m(prizeOwed._sum.amount).plus(m(owedBreakdown._sum.amount))),
                expectedLabel: 'Owed accounts',
                actualLabel: 'Open claims',
                note: 'Owed prize claims plus pending refunds and rewards.',
            }),
            scope({
                key: 'locked_withdrawals',
                scope: 'Locked = open withdrawals',
                group: 'sub_ledger',
                expected: (0, money_1.toUSDTString)(b('user_locked')),
                actual: (0, money_2.usdt)(lockedOpen._sum.amount),
                expectedLabel: 'Locked accounts',
                actualLabel: 'Open withdrawals',
                note: 'Requested → broadcast withdrawals hold their amount in Locked.',
            }),
            scope({
                key: 'no_negative_buckets',
                scope: 'No player bucket below zero',
                group: 'ledger',
                expected: '0',
                actual: String(Number(negatives[0]?.n ?? 0)),
                expectedLabel: 'Negative buckets',
                actualLabel: 'Found',
                note: 'Debits that would overdraw fail with INSUFFICIENT_FUNDS.',
            }),
        ];
        const pools = await this.prisma.$queryRaw `
      SELECT r.number, COALESCE(SUM(e.amount), 0)::text AS ledger, r.pool_amount::text AS projection, r.is_demo
      FROM rounds r JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
        LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id ORDER BY r.number`;
        for (const p of pools) {
            scopes.push(scope({
                key: `round_${p.number}`,
                scope: `Round #${p.number.toLocaleString('en-US')} pool`,
                group: 'pool',
                expected: (0, money_2.usdt)(p.projection),
                actual: (0, money_2.usdt)(p.ledger),
                expectedLabel: 'Projection',
                actualLabel: 'Ledger',
                note: 'Settlement refuses to run while these differ.',
            }));
        }
        for (const net of ['arbitrum', 'bnb', 'ethereum', 'polygon', 'solana']) {
            const clearing = await this.ledger.balanceOf({ type: 'chain_clearing', network: net });
            if (m(clearing).isZero())
                continue;
            scopes.push(scope({
                key: `custody_${net}`,
                scope: `Custody ${chains_1.CHAINS[net].name}`,
                group: 'custody',
                expected: (0, money_1.toUSDTString)(m(clearing).negated()),
                actual: (0, money_1.toUSDTString)(m(clearing).negated()),
                expectedLabel: 'Ledger mirror',
                actualLabel: 'On-chain',
                status: 'pending',
                note: net === 'arbitrum' &&
                    this.config.env.ARBITRUM_SEPOLIA_RPC_URL
                    ? 'Compared with the hot-wallet balance read over RPC.'
                    : 'No RPC configured for this network in DEMO — on-chain balance not read.',
            }));
        }
        for (const d of confirming) {
            scopes.push(scope({
                key: `deposit_${d.number}`,
                scope: `DP-${d.number} in flight`,
                group: 'in_flight',
                expected: (0, money_2.usdt)(d.amount),
                actual: (0, money_2.usdt)(d.amount),
                expectedLabel: 'Detected',
                actualLabel: 'Pending',
                status: 'pending',
                note: `${d.confirmations}/${d.requiredConfirmations} confirmations — credited to Available after the last one.`,
            }));
        }
        const summary = {
            total: scopes.length,
            match: scopes.filter((s) => s.status === 'match').length,
            mismatch: scopes.filter((s) => s.status === 'mismatch').length,
            pending: scopes.filter((s) => s.status === 'pending').length,
        };
        return {
            ok: summary.mismatch === 0,
            summary,
            scopes,
            policy: 'A mismatch is investigated and fixed with a reviewed correcting entry (a new posting with four-eyes) — ledger rows are never edited or deleted.',
            runAt: now.toISOString(),
        };
    }
    // ── F7 Refunds ────────────────────────────────────────────────────────────────────────────────
    async refunds(now = new Date()) {
        const cancelled = await this.prisma.round.findMany({
            where: { status: 'cancelled' },
            orderBy: { number: 'desc' },
            take: 20,
        });
        const rounds = await Promise.all(cancelled.map(async (r) => {
            const [byStatus, outstanding] = await Promise.all([
                this.prisma.transaction.groupBy({
                    by: ['status'],
                    where: { roundId: r.id, type: 'refund' },
                    _count: true,
                    _sum: { amount: true },
                }),
                this.prisma.transaction.findMany({
                    where: { roundId: r.id, type: 'refund', status: 'pending' },
                    orderBy: { amount: 'desc' },
                    take: 10,
                    include: { user: { select: { id: true, handle: true, publicId: true } } },
                }),
            ]);
            const sumOf = (s) => byStatus.find((x) => x.status === s);
            const claimed = sumOf('completed');
            const pending = sumOf('pending');
            const refunded = m(claimed?._sum.amount).plus(m(pending?._sum.amount));
            // DEMO snapshot rounds may hold their historic totals only in the projection (pool = entries × price).
            const stakes = m(r.entryPrice.toFixed()).times(r.entriesCount);
            return {
                number: r.number,
                cancelledAt: r.cancelledAt?.toISOString() ?? r.closesAt.toISOString(),
                closesAt: r.closesAt.toISOString(),
                reason: r.cancelReason ?? 'threshold_not_met',
                participants: r.participantsCount,
                entries: r.entriesCount,
                minParticipants: r.minParticipants,
                minPool: (0, money_2.usdt)(r.minPool),
                stakes: (0, money_1.toUSDTString)(stakes),
                platformFees: (0, money_2.usdt)(r.platformFees),
                refundedToOwed: (0, money_1.toUSDTString)(refunded),
                claimed: (0, money_2.usdt)(claimed?._sum.amount),
                claimedPlayers: claimed?._count ?? 0,
                outstanding: (0, money_2.usdt)(pending?._sum.amount),
                outstandingPlayers: pending?._count ?? 0,
                players: (claimed?._count ?? 0) + (pending?._count ?? 0),
                topOutstanding: outstanding.map((t) => ({
                    userId: t.user.id,
                    handle: (0, exports.atHandle)(t.user.handle),
                    publicId: t.user.publicId,
                    amount: (0, money_2.usdt)(t.amount),
                    entries: Number(t.metadata?.entries ?? 0),
                    reference: t.reference,
                    since: t.createdAt.toISOString(),
                    isDemo: t.isDemo,
                })),
                isDemo: r.isDemo,
            };
        }));
        const returns = await this.prisma.withdrawal.findMany({
            where: { status: { in: ['rejected', 'failed', 'cancelled'] } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            include: { user: { select: { handle: true } } },
        });
        return {
            rounds,
            totals: {
                outstanding: (0, money_1.toUSDTString)(rounds.reduce((a, r) => a.plus(m(r.outstanding)), (0, money_1.money)(0))),
                outstandingPlayers: rounds.reduce((n, r) => n + r.outstandingPlayers, 0),
                claimed: (0, money_1.toUSDTString)(rounds.reduce((a, r) => a.plus(m(r.claimed)), (0, money_1.money)(0))),
            },
            notRefunds: returns.map((w) => ({
                reference: `WD-${w.number}`,
                kind: 'withdrawal_release',
                handle: (0, exports.atHandle)(w.user.handle),
                amount: (0, money_2.usdt)(w.amount),
                status: w.status,
                reason: w.rejectionReason ??
                    w.failureReason ??
                    (w.status === 'cancelled' ? 'Cancelled by the player' : null),
                at: (w.rejectedAt ?? w.failedAt ?? w.cancelledAt ?? w.updatedAt).toISOString(),
                isDemo: w.isDemo,
            })),
            policy: 'Refunds are contract-defined: a cancelled round returns every stake to the players’ Owed balance. There is no manual refund — admins can remind players and export reports only.',
            generatedAt: now.toISOString(),
        };
    }
    // ── F8 Revenue reports ────────────────────────────────────────────────────────────────────────
    async revenue(days, now = new Date()) {
        const since = (0, time_1.addDays)(startOfUtcDay(now), -(days - 1));
        const [fees, rewards, networkFees, weekly] = await Promise.all([
            this.prisma.feeLedger.aggregate({
                where: { createdAt: { gte: since } },
                _sum: { amount: true, entryCount: true },
            }),
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN ledger_postings p ON p.id = e.posting_id
        WHERE p.kind = 'reward' AND a.type = 'operator_revenue' AND p.created_at >= ${since}`,
            this.prisma.$queryRaw `
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN ledger_postings p ON p.id = e.posting_id
        WHERE p.kind = 'withdrawal_settle' AND a.type = 'operator_revenue' AND p.created_at >= ${since}`,
            this.prisma.$queryRaw `
        SELECT date_trunc('week', created_at) AS week, SUM(amount)::text AS fees
        FROM fee_ledger WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
        ]);
        const gross = m(fees._sum.amount);
        const rewardsPaid = m(rewards[0]?.total).negated();
        const net = gross.minus(rewardsPaid);
        return {
            period: { days, from: since.toISOString(), to: now.toISOString() },
            gross: (0, money_1.toUSDTString)(gross),
            rewards: (0, money_1.toUSDTString)(rewardsPaid),
            net: (0, money_1.toUSDTString)(net),
            qualifyingEntries: fees._sum.entryCount ?? 0,
            networkFeesRecovered: (0, money_1.toUSDTString)(m(networkFees[0]?.total)),
            products: [
                {
                    key: 'global_pool',
                    name: 'Global Pool platform fees',
                    amount: (0, money_1.toUSDTString)(gross),
                    share: gross.isZero() ? '0' : '100',
                },
                {
                    key: 'games',
                    name: 'Games (non-monetary simulation)',
                    amount: '0.00',
                    share: '0',
                },
            ],
            weekly: weekly.map((w) => ({
                weekStart: w.week.toISOString().slice(0, 10),
                net: (0, money_2.usdt)(w.fees),
            })),
            statement: [
                {
                    line: 'Platform fees (0.05 × qualifying entries)',
                    source: 'fees account · fee_ledger',
                    amount: (0, money_1.toUSDTString)(gross),
                },
                {
                    line: 'Rewards funded (VIP, rakeback, cashback)',
                    source: 'operator_revenue · reward postings',
                    amount: (0, money_1.toUSDTString)(rewardsPaid.negated()),
                },
                { line: 'Net revenue', source: 'computed', amount: (0, money_1.toUSDTString)(net) },
            ],
            excluded: [
                {
                    line: 'Network fees recovered on withdrawals',
                    amount: (0, money_1.toUSDTString)(m(networkFees[0]?.total)),
                    why: 'Pass-through cost recovery, not revenue',
                },
                {
                    line: 'Pool stakes and prizes',
                    amount: null,
                    why: 'Player money held in escrow — never revenue',
                },
            ],
            generatedAt: now.toISOString(),
        };
    }
};
exports.AdminFinanceService = AdminFinanceService;
exports.AdminFinanceService = AdminFinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        audit_service_1.AuditService,
        withdrawals_service_1.WithdrawalsService,
        app_config_1.AppConfig])
], AdminFinanceService);
function startOfUtcDay(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function accountLabel(type, handle, roundNumber, network) {
    switch (type) {
        case 'user_available':
            return `${handle ?? 'player'} · Available`;
        case 'user_locked':
            return `${handle ?? 'player'} · Locked`;
        case 'user_pending':
            return `${handle ?? 'player'} · Pending`;
        case 'user_owed':
            return `${handle ?? 'player'} · Owed`;
        case 'pool':
            return roundNumber ? `Pool #${roundNumber.toLocaleString('en-US')}` : 'Pool';
        case 'fees':
            return 'Platform fees';
        case 'prize_liability':
            return 'Prize liability';
        case 'refunds':
            return 'Refunds clearing';
        case 'operator_revenue':
            return 'Operator revenue';
        case 'chain_clearing':
            return `Chain clearing · ${network ? (chains_1.CHAINS[network]?.name ?? network) : '—'}`;
        default:
            return type;
    }
}
//# sourceMappingURL=admin-finance.service.js.map