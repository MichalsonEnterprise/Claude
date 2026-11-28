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
exports.AdminPoolService = exports.IMMUTABLE_POLICY = exports.BREAKER_ROLE_LABEL = exports.BREAKER_ROLES = exports.BREAKER_REQUEST_TTL_MINUTES = exports.ENTRIES_FLAG = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const money_1 = require("@gp/shared/money");
const pool_1 = require("@gp/shared/pool");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const ledger_service_1 = require("../ledger/ledger.service");
const rounds_service_1 = require("../pool/rounds.service");
const totp_service_1 = require("../security/totp.service");
const admin_finance_service_1 = require("./admin-finance.service");
exports.ENTRIES_FLAG = 'pool.entries.enabled';
/** A circuit-breaker request expires (and changes nothing) if no second admin approves it in time. */
exports.BREAKER_REQUEST_TTL_MINUTES = 30;
/**
 * Circuit-breaker dual control (ADM-P10): a Super Admin, Finance or Compliance admin may request; the second approver
 * must be a DIFFERENT person holding a DIFFERENT one of these roles (e.g. Super Admin requests, Compliance
 * approves). Both re-authenticate with 2FA and give a reason. Role-based on purpose: it is a dual-control policy.
 */
exports.BREAKER_ROLES = ['super_admin', 'finance', 'compliance'];
exports.BREAKER_ROLE_LABEL = {
    super_admin: 'Super Admin',
    finance: 'Finance',
    compliance: 'Compliance',
};
const breakerRolesOf = (roles) => roles.filter((r) => exports.BREAKER_ROLES.includes(r));
const expiryOf = (created) => (0, time_1.addMinutes)(created, exports.BREAKER_REQUEST_TTL_MINUTES);
const ACTIVE = ['open', 'closed', 'drawing'];
const m = (v) => (0, money_1.money)((v ?? '0'));
/** The things no admin can do — rendered on every pool screen ("Immutable by design"). */
exports.IMMUTABLE_POLICY = {
    cannot: [
        'Edit or choose a draw result',
        'Pick, replace or exclude winners',
        'Change the prize split of a live round',
        'Pay out from the pool to any address',
        'Edit ledger entries or balances',
        'Move the close time',
    ],
    allowed: 'Allowed — audited and contract-defined: pause NEW entries (dual approval), contract refunds of cancelled rounds, re-submitting a failed claim batch unchanged, exporting reports.',
};
/**
 * Global Pool monitoring (ADM-P1…P10). Read-only views of rounds, pools, participants, prizes, VRF and settlement.
 * The only control is the circuit breaker for NEW entries (request + a second, different approver; reason + MFA;
 * audited). Results, winners, prize splits and payouts cannot be touched by design.
 */
let AdminPoolService = class AdminPoolService {
    prisma;
    ledger;
    rounds;
    flags;
    audit;
    totp;
    config;
    constructor(prisma, ledger, rounds, flags, audit, totp, config) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.rounds = rounds;
        this.flags = flags;
        this.audit = audit;
        this.totp = totp;
        this.config = config;
    }
    env() {
        return this.config.env;
    }
    /** P1 overview + P3 monitoring data for the current round. */
    async overview(now = new Date()) {
        const round = await this.rounds.current();
        const [owed, refunds, reconcile, breaker, recent, lastHour, vrf] = await Promise.all([
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
            this.ledger.reconcile(),
            this.breakerState(),
            this.roundRows(5),
            round
                ? this.prisma.entry.count({
                    where: { roundId: round.id, createdAt: { gte: (0, time_1.addHours)(now, -1) } },
                })
                : Promise.resolve(0),
            this.prisma.randomnessRequest.findFirst({ orderBy: { requestedAt: 'desc' } }),
        ]);
        const view = round ? this.rounds.view(round) : null;
        const previous = round
            ? await this.prisma.round.findFirst({
                where: { number: { lt: round.number }, status: 'settled' },
                orderBy: { number: 'desc' },
            })
            : null;
        return {
            round: view,
            serverNow: now.toISOString(),
            previous: previous
                ? {
                    number: previous.number,
                    pool: (0, money_2.usdt)(previous.poolAmount),
                    entries: previous.entriesCount,
                }
                : null,
            kpis: {
                pool: view?.poolBalance ?? '0.00',
                entries: view?.entries ?? 0,
                participants: view?.participants ?? 0,
                fees: view?.platformFees ?? '0.00',
                owedPrizes: (0, money_2.usdt)(owed._sum.amount),
                owedPrizesCount: owed._count,
                refundsOutstanding: (0, money_2.usdt)(refunds._sum.amount),
                refundsOutstandingCount: refunds._count,
                entriesLastHour: lastHour,
            },
            pipeline: {
                contract: {
                    address: this.env().POOL_CONTRACT_ADDRESS ?? null,
                    network: 'arbitrum',
                    configured: Boolean(this.env().POOL_CONTRACT_ADDRESS),
                },
                randomness: {
                    provider: this.env().RANDOMNESS_PROVIDER ?? 'mock',
                    timeoutHours: Number(this.env().VRF_TIMEOUT_HOURS ?? 24),
                    lastRequest: vrf
                        ? {
                            status: vrf.status,
                            requestedAt: vrf.requestedAt.toISOString(),
                            fulfilledAt: vrf.fulfilledAt?.toISOString() ?? null,
                        }
                        : null,
                },
                newEntries: breaker.entriesEnabled ? 'open' : 'paused',
                breakerLastChange: breaker.lastChange,
                ledger: {
                    ok: reconcile.ok,
                    poolMismatches: reconcile.poolMismatches.length,
                    checkedAt: now.toISOString(),
                },
            },
            recent,
            policy: exports.IMMUTABLE_POLICY,
        };
    }
    /** P2 pool balance: ledger vs projection per active round + hourly growth of the current round. */
    async balance(now = new Date()) {
        const round = await this.rounds.current();
        const [byType, owed, refunds, perRound, hourly, movements] = await Promise.all([
            this.ledger.balancesByType(),
            this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
            this.prisma.transaction.aggregate({
                where: { type: 'refund', status: 'pending' },
                _sum: { amount: true },
            }),
            this.prisma.$queryRaw `
        SELECT r.number, r.status::text AS status, COALESCE(SUM(e.amount), 0)::text AS ledger,
               r.pool_amount::text AS projection, r.platform_fees::text AS fees, r.is_demo
        FROM rounds r JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
          LEFT JOIN ledger_entries e ON e.account_id = a.id
        WHERE r.status IN ('open', 'closed', 'drawing')
        GROUP BY r.id ORDER BY r.number`,
            round
                ? this.prisma.$queryRaw `
            SELECT date_trunc('hour', created_at) AS hour, SUM(amount)::text AS amount, SUM(entry_count)::bigint AS entries
            FROM pool_ledger WHERE round_id = ${round.id}::uuid AND kind = 'entry'
            GROUP BY 1 ORDER BY 1`
                : Promise.resolve([]),
            round
                ? this.prisma.poolLedger.findMany({
                    where: { roundId: round.id },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                })
                : Promise.resolve([]),
        ]);
        const userIds = [...new Set(movements.map((x) => x.userId).filter(Boolean))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, handle: true },
        });
        const handle = new Map(users.map((u) => [u.id, (0, admin_finance_service_1.atHandle)(u.handle)]));
        const escrow = perRound.reduce((a, r) => a.plus(m(r.ledger)), (0, money_1.money)(0));
        let running = (0, money_1.money)(0);
        return {
            round: round ? this.rounds.view(round) : null,
            escrow: (0, money_1.toUSDTString)(escrow),
            poolAccountsTotal: (0, money_2.usdt)(byType.pool),
            owedPrizes: (0, money_2.usdt)(owed._sum.amount),
            refundsOutstanding: (0, money_2.usdt)(refunds._sum.amount),
            contractLiabilities: (0, money_1.toUSDTString)(escrow.plus(m(owed._sum.amount)).plus(m(refunds._sum.amount))),
            feesSeparate: (0, money_2.usdt)(byType.fees),
            perRound: perRound.map((r) => ({
                number: r.number,
                status: r.status,
                ledger: (0, money_2.usdt)(r.ledger),
                projection: (0, money_2.usdt)(r.projection),
                fees: (0, money_2.usdt)(r.fees),
                matches: m(r.ledger).eq(m(r.projection)),
                isDemo: r.is_demo,
            })),
            hourly: hourly.map((h) => {
                running = running.plus(m(h.amount));
                return {
                    hour: h.hour.toISOString(),
                    added: (0, money_2.usdt)(h.amount),
                    entries: Number(h.entries),
                    cumulative: (0, money_1.toUSDTString)(running),
                };
            }),
            movements: movements.map((x) => ({
                id: x.id,
                kind: x.kind,
                handle: x.userId ? (handle.get(x.userId) ?? null) : null,
                entries: x.entryCount,
                amount: (0, money_2.usdt)(x.amount),
                at: x.createdAt.toISOString(),
            })),
            generatedAt: now.toISOString(),
        };
    }
    /** P3 active-round monitor: thresholds, feed, concentration. */
    async activeRound(now = new Date()) {
        const round = await this.prisma.round.findFirst({
            where: { status: { in: [...ACTIVE] } },
            orderBy: { closesAt: 'asc' },
        });
        const current = round ? await this.rounds.byId(round.id) : await this.rounds.current();
        if (!current)
            return { round: null, serverNow: now.toISOString() };
        const [feed, top, perHour] = await Promise.all([
            this.rounds.feed(current.id, 12),
            this.prisma.$queryRaw `
        SELECT e.user_id::text AS user_id, u.handle, count(*)::bigint AS entries
        FROM entries e JOIN users u ON u.id = e.user_id
        WHERE e.round_id = ${current.id}::uuid GROUP BY e.user_id, u.handle ORDER BY entries DESC LIMIT 5`,
            this.prisma.$queryRaw `
        SELECT date_trunc('hour', created_at) AS hour, count(*)::bigint AS entries
        FROM entries WHERE round_id = ${current.id}::uuid GROUP BY 1 ORDER BY 1`,
        ]);
        const total = current.entriesCount || 1;
        return {
            round: this.rounds.view(current),
            serverNow: now.toISOString(),
            feed: feed.map((f) => ({ ...f, handle: (0, admin_finance_service_1.atHandle)(f.handle) })),
            topParticipants: top.map((t) => ({
                handle: (0, admin_finance_service_1.atHandle)(t.handle),
                entries: Number(t.entries),
                sharePercent: ((Number(t.entries) / total) * 100).toFixed(2),
            })),
            entriesPerHour: perHour.map((h) => ({
                hour: h.hour.toISOString(),
                entries: Number(h.entries),
            })),
            progress: {
                participantsPercent: Math.min(100, Math.round((current.participantsCount / current.minParticipants) * 100)),
                poolPercent: Math.min(100, Math.round(m(current.poolAmount.toFixed()).div(m(current.minPool.toFixed())).times(100).toNumber())),
            },
            policy: exports.IMMUTABLE_POLICY,
        };
    }
    /** P4 historical rounds with settlement / refund progress. */
    async history(query) {
        const where = {
            status: {
                in: (query.status
                    ? [query.status]
                    : ['settled', 'cancelled', 'closed', 'drawing']),
            },
        };
        const [rows, total] = await Promise.all([
            this.prisma.round.findMany({
                where,
                orderBy: { number: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: { randomnessRequests: { orderBy: { requestedAt: 'desc' }, take: 1 } },
            }),
            this.prisma.round.count({ where }),
        ]);
        const items = await Promise.all(rows.map((r) => this.roundRow(r)));
        return (0, schemas_1.paginate)(items, total, query);
    }
    async roundRows(limit) {
        const rows = await this.prisma.round.findMany({
            orderBy: { number: 'desc' },
            take: limit,
            include: { randomnessRequests: { orderBy: { requestedAt: 'desc' }, take: 1 } },
        });
        return Promise.all(rows.map((r) => this.roundRow(r)));
    }
    async roundRow(r) {
        const [winners, credited, refunds] = await Promise.all([
            this.prisma.winner.count({ where: { roundId: r.id } }),
            this.prisma.prizeClaim.count({ where: { winner: { roundId: r.id } } }),
            r.status === 'cancelled'
                ? this.prisma.transaction.groupBy({
                    by: ['status'],
                    where: { roundId: r.id, type: 'refund' },
                    _count: true,
                })
                : Promise.resolve([]),
        ]);
        const refundsClaimed = refunds.find((x) => x.status === 'completed')?._count ?? 0;
        const refundsTotal = refunds.reduce((n, x) => n + x._count, 0);
        const first = await this.prisma.winner.findFirst({ where: { roundId: r.id, rank: 1 } });
        return {
            id: r.id,
            number: r.number,
            status: r.status,
            statusLabel: enums_1.ROUND_STATUS_LABEL[r.status],
            closesAt: r.closesAt.toISOString(),
            settledAt: r.settledAt?.toISOString() ?? null,
            participants: r.participantsCount,
            entries: r.entriesCount,
            pool: (0, money_2.usdt)(r.poolAmount),
            fees: (0, money_2.usdt)(r.platformFees),
            firstPrize: first ? (0, money_2.usdt)(first.amount) : null,
            thresholdsMet: r.thresholdsMet,
            vrf: r.randomnessRequests?.[0]
                ? { status: r.randomnessRequests[0].status, provider: r.randomnessRequests[0].provider }
                : null,
            settlement: r.status === 'settled'
                ? {
                    winners,
                    of: pool_1.PRIZES_PER_ROUND,
                    credited,
                    label: `${credited} / ${winners || pool_1.PRIZES_PER_ROUND} credited`,
                }
                : r.status === 'cancelled'
                    ? {
                        refundsClaimed,
                        refundsTotal,
                        label: `Refunds ${refundsClaimed} / ${refundsTotal} claimed`,
                    }
                    : null,
            isDemo: r.isDemo,
        };
    }
    /** P5 participants of a round (grouped by player). */
    async participants(number, query) {
        const round = await this.prisma.round.findUnique({ where: { number } });
        if (!round)
            throw (0, errors_1.notFound)(`Round #${number}`);
        const q = query.q?.replace(/^@/, '').toLowerCase() ?? null;
        const like = q ? `%${q}%` : null;
        const offset = (query.page - 1) * query.pageSize;
        const [rows, countRow, totals] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT e.user_id::text AS user_id, u.handle, u.public_id, count(*)::bigint AS entries,
               min(e.seq) AS first_seq, max(e.seq) AS last_seq, min(e.created_at) AS first_at, max(e.created_at) AS last_at,
               p.kyc_level::text AS kyc_level, p.country,
               EXISTS (SELECT 1 FROM user_restrictions ur WHERE ur.user_id = e.user_id AND ur.lifted_at IS NULL) AS restricted,
               u.is_demo
        FROM entries e JOIN users u ON u.id = e.user_id LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE e.round_id = ${round.id}::uuid AND (${like}::text IS NULL OR u.handle LIKE ${like} OR u.public_id ILIKE ${like})
        GROUP BY e.user_id, u.handle, u.public_id, p.kyc_level, p.country, u.is_demo
        ORDER BY entries DESC, first_seq ASC
        LIMIT ${query.pageSize} OFFSET ${offset}`,
            this.prisma.$queryRaw `
        SELECT count(DISTINCT e.user_id)::bigint AS n FROM entries e JOIN users u ON u.id = e.user_id
        WHERE e.round_id = ${round.id}::uuid AND (${like}::text IS NULL OR u.handle LIKE ${like} OR u.public_id ILIKE ${like})`,
            this.prisma.$queryRaw `
        SELECT max(c)::bigint AS max, percentile_cont(0.5) WITHIN GROUP (ORDER BY c) AS median,
               count(*) FILTER (WHERE c = 1)::bigint AS single
        FROM (SELECT count(*) AS c FROM entries WHERE round_id = ${round.id}::uuid GROUP BY user_id) x`,
        ]);
        const totalEntries = round.entriesCount || 1;
        const price = m(round.entryPrice.toFixed());
        const fee = m(round.platformFeePerEntry.toFixed());
        return {
            round: {
                id: round.id,
                number: round.number,
                status: round.status,
                entries: round.entriesCount,
                participants: round.participantsCount,
                pool: (0, money_2.usdt)(round.poolAmount),
                isDemo: round.isDemo,
            },
            stats: {
                maxEntries: Number(totals[0]?.max ?? 0),
                medianEntries: Number(totals[0]?.median ?? 0),
                singleEntryPlayers: Number(totals[0]?.single ?? 0),
                maxSharePercent: ((Number(totals[0]?.max ?? 0) / totalEntries) * 100).toFixed(2),
            },
            ...(0, schemas_1.paginate)(rows.map((r) => {
                const entries = Number(r.entries);
                return {
                    userId: r.user_id,
                    handle: (0, admin_finance_service_1.atHandle)(r.handle),
                    publicId: r.public_id,
                    entries,
                    stake: (0, money_1.toUSDTString)(price.times(entries)),
                    fees: (0, money_1.toUSDTString)(fee.times(entries)),
                    sharePercent: ((entries / totalEntries) * 100).toFixed(2),
                    firstEntry: `E-${round.number}-${String(r.first_seq).padStart(5, '0')}`,
                    lastEntry: `E-${round.number}-${String(r.last_seq).padStart(5, '0')}`,
                    firstAt: r.first_at.toISOString(),
                    lastAt: r.last_at.toISOString(),
                    kycLevel: r.kyc_level ?? 'none',
                    country: r.country,
                    restricted: r.restricted,
                    isDemo: r.is_demo,
                };
            }), Number(countRow[0]?.n ?? 0), query),
        };
    }
    /** P6 prize distribution + P8 settlement status for one round. */
    async prizes(number) {
        const round = await this.rounds.byNumber(number);
        const view = this.rounds.view(round);
        const claims = await this.prisma.prizeClaim.findMany({
            where: { winner: { roundId: round.id } },
            include: { winner: { select: { rank: true } } },
        });
        const postings = await this.prisma.ledgerPosting.findMany({
            where: {
                roundId: round.id,
                kind: { in: ['round_settlement', 'prize_award', 'round_refund'] },
            },
            orderBy: { createdAt: 'asc' },
            select: { id: true, kind: true, description: true, createdAt: true, reference: true },
        });
        const breakdown = (0, pool_1.prizeBreakdown)(view.poolBalance);
        const winners = view.winners.map((w) => {
            const claim = claims.find((c) => c.winner.rank === w.place);
            return {
                ...w,
                claimStatus: claim
                    ? claim.status
                    : view.status === 'settled'
                        ? 'not_materialised'
                        : null,
                claimedAt: claim?.claimedAt?.toISOString() ?? null,
            };
        });
        const credited = claims.length;
        return {
            round: view,
            breakdown,
            winners,
            settlement: {
                status: view.status === 'settled'
                    ? 'settled'
                    : view.status === 'cancelled'
                        ? 'cancelled'
                        : view.status === 'drawing'
                            ? 'awaiting_randomness'
                            : 'not_started',
                prizes: pool_1.PRIZES_PER_ROUND,
                winnersRecorded: view.winners.length,
                creditedToOwed: credited,
                claimed: claims.filter((c) => c.status === 'claimed').length,
                owed: claims.filter((c) => c.status === 'owed').length,
                owedAmount: (0, money_1.toUSDTString)(claims
                    .filter((c) => c.status === 'owed')
                    .reduce((a, c) => a.plus(m(c.amount.toFixed())), (0, money_1.money)(0))),
                postings: postings.map((p) => ({
                    id: p.id,
                    kind: p.kind,
                    description: p.description,
                    reference: p.reference,
                    at: p.createdAt.toISOString(),
                })),
                note: 'Settlement takes only the fulfilled random word and the canonical entry list; prizes are credited to Owed in one transaction per round.',
            },
            policy: exports.IMMUTABLE_POLICY,
        };
    }
    /** P7 VRF requests. */
    async vrf(query) {
        const [rows, total, byStatus] = await Promise.all([
            this.prisma.randomnessRequest.findMany({
                orderBy: { requestedAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: { round: { select: { number: true, status: true, closesAt: true } } },
            }),
            this.prisma.randomnessRequest.count(),
            this.prisma.randomnessRequest.groupBy({ by: ['status'], _count: true }),
        ]);
        const next = await this.prisma.round.findFirst({
            where: { status: { in: ['open', 'closed', 'drawing'] } },
            orderBy: { closesAt: 'asc' },
        });
        const env = this.env();
        return {
            config: {
                provider: env.RANDOMNESS_PROVIDER ?? 'mock',
                network: 'Arbitrum Sepolia (421614)',
                timeoutHours: Number(env.VRF_TIMEOUT_HOURS ?? 24),
                contract: env.POOL_CONTRACT_ADDRESS ?? null,
                algorithm: 'GLOBAL_POOL_WINNERS_V1 (mirror of DrawMath.sol)',
            },
            nextDraw: next
                ? { roundNumber: next.number, status: next.status, closesAt: next.closesAt.toISOString() }
                : null,
            counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
            ...(0, schemas_1.paginate)(rows.map((r) => ({
                id: r.id,
                roundNumber: r.round.number,
                roundStatus: r.round.status,
                provider: r.provider,
                status: r.status,
                requestId: r.requestId,
                attempt: r.attempt,
                requestTxHash: r.requestTxHash,
                fulfillTxHash: r.fulfillTxHash,
                randomWord: r.randomWord,
                confirmations: r.confirmations,
                requestedAt: r.requestedAt.toISOString(),
                fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
                latencySeconds: r.fulfilledAt
                    ? Math.round((r.fulfilledAt.getTime() - r.requestedAt.getTime()) / 1000)
                    : null,
                failureReason: r.failureReason,
                isDemo: r.isDemo,
            })), total, query),
        };
    }
    // ── P10 circuit breaker (NEW entries only) ────────────────────────────────────────────────────
    async breakerState(adminId, now = new Date()) {
        const [entriesEnabled, pending, history, lastAudit] = await Promise.all([
            this.flags.isEnabled(exports.ENTRIES_FLAG),
            this.prisma.adminApproval.findFirst({
                where: { targetType: 'feature_flag', targetId: exports.ENTRIES_FLAG, status: 'pending' },
                orderBy: { createdAt: 'desc' },
                include: { requestedBy: { select: { name: true } } },
            }),
            this.prisma.adminApproval.findMany({
                where: { targetType: 'feature_flag', targetId: exports.ENTRIES_FLAG, status: { not: 'pending' } },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { requestedBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
            }),
            this.prisma.auditLog.findFirst({
                where: { action: 'pool.circuit_breaker.applied' },
                orderBy: { seq: 'desc' },
            }),
        ]);
        const expiresAt = pending ? expiryOf(pending.createdAt) : null;
        const expired = Boolean(expiresAt && expiresAt <= now);
        return {
            flag: exports.ENTRIES_FLAG,
            entriesEnabled,
            state: entriesEnabled ? 'open' : 'paused',
            scope: 'Pauses NEW entry purchases only. Existing entries, the draw, settlement, refunds, claims and withdrawals are not affected.',
            lastChange: lastAudit
                ? {
                    at: lastAudit.createdAt.toISOString(),
                    by: lastAudit.actorLabel,
                    action: lastAudit.metadata?.action ?? null,
                    seq: lastAudit.seq.toString(),
                }
                : null,
            pending: pending && !expired
                ? {
                    id: pending.id,
                    reference: `AR-${pending.id.slice(0, 4).toUpperCase()}`,
                    action: pending.action,
                    requestedBy: pending.requestedBy.name,
                    requestedByMe: adminId ? pending.requestedByAdminId === adminId : false,
                    reason: pending.requestReason,
                    reasonCategory: pending.payload?.reasonCategory ?? null,
                    createdAt: pending.createdAt.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                }
                : null,
            history: history.map((h) => ({
                id: h.id,
                reference: `AR-${h.id.slice(0, 4).toUpperCase()}`,
                action: h.action,
                status: h.status,
                requestedBy: h.requestedBy.name,
                decidedBy: h.decidedBy?.name ?? null,
                reason: h.requestReason,
                decisionReason: h.decisionReason,
                createdAt: h.createdAt.toISOString(),
                decidedAt: h.decidedAt?.toISOString() ?? null,
            })),
            rules: {
                roles: exports.BREAKER_ROLES.map((r) => exports.BREAKER_ROLE_LABEL[r]),
                secondApprover: 'Different person and different role',
                reauth: '2FA for requester and approver',
                ttlMinutes: exports.BREAKER_REQUEST_TTL_MINUTES,
                resume: 'Same dual-approval flow',
            },
            policy: exports.IMMUTABLE_POLICY,
        };
    }
    async verifyMfa(admin, code) {
        await this.totp.verifyActive({ adminUserId: admin.id }, code, { allowBackup: false });
    }
    async requestBreaker(admin, input, meta) {
        if (breakerRolesOf(admin.roles).length === 0) {
            throw new errors_1.AppError('FORBIDDEN', 'Only Super Admin, Finance or Compliance can request a breaker change', {
                allowedRoles: [...exports.BREAKER_ROLES],
            });
        }
        const enabled = await this.flags.isEnabled(exports.ENTRIES_FLAG);
        if (input.action === 'pause_new_entries' && !enabled)
            throw new errors_1.AppError('CONFLICT', 'New entries are already paused');
        if (input.action === 'resume_new_entries' && enabled)
            throw new errors_1.AppError('CONFLICT', 'New entries are already open');
        const existing = await this.prisma.adminApproval.findFirst({
            where: { targetType: 'feature_flag', targetId: exports.ENTRIES_FLAG, status: 'pending' },
        });
        if (existing && expiryOf(existing.createdAt) > new Date()) {
            throw new errors_1.AppError('CONFLICT', 'A circuit-breaker request is already waiting for a second approver');
        }
        await this.verifyMfa(admin, input.mfaCode);
        return this.prisma.tx(async (tx) => {
            if (existing) {
                await tx.adminApproval.update({ where: { id: existing.id }, data: { status: 'expired' } });
            }
            const approval = await tx.adminApproval.create({
                data: {
                    action: input.action === 'pause_new_entries' ? 'pool.entries.pause' : 'pool.entries.resume',
                    targetType: 'feature_flag',
                    targetId: exports.ENTRIES_FLAG,
                    requestedByAdminId: admin.id,
                    requestReason: input.reason,
                    payload: {
                        reasonCategory: input.reasonCategory ?? null,
                        flag: exports.ENTRIES_FLAG,
                        // Same shape as the four-eyes inbox (admin approvals): decided at POST /admin/pool/circuit-breaker/:id/decision.
                        expiresAt: expiryOf(new Date()).toISOString(),
                        requesterRoles: breakerRolesOf(admin.roles),
                        decideAt: '/admin/pool/policy',
                    },
                },
            });
            const audit = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'pool.circuit_breaker.requested',
                targetType: 'feature_flag',
                targetId: exports.ENTRIES_FLAG,
                reason: input.reason,
                outcome: 'pending_approval',
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { approvalId: approval.id, action: input.action },
            }, tx);
            return {
                approvalId: approval.id,
                reference: `AR-${approval.id.slice(0, 4).toUpperCase()}`,
                status: 'pending_approval',
                approvals: 1,
                of: 2,
                expiresAt: expiryOf(approval.createdAt).toISOString(),
                auditSeq: audit.seq,
            };
        });
    }
    async decideBreaker(admin, approvalId, input, meta) {
        const myRoles = breakerRolesOf(admin.roles);
        if (myRoles.length === 0) {
            throw new errors_1.AppError('FORBIDDEN', 'Only Super Admin, Finance or Compliance can approve a breaker change', {
                allowedRoles: [...exports.BREAKER_ROLES],
            });
        }
        const approval = await this.prisma.adminApproval.findUnique({ where: { id: approvalId } });
        if (!approval || approval.targetType !== 'feature_flag' || approval.targetId !== exports.ENTRIES_FLAG)
            throw (0, errors_1.notFound)('Circuit-breaker request');
        if (approval.status !== 'pending')
            throw new errors_1.AppError('CONFLICT', `This request is ${approval.status}`);
        if (approval.requestedByAdminId === admin.id) {
            throw new errors_1.AppError('FORBIDDEN', 'Four-eyes rule: a different admin must give the second approval');
        }
        const requesterRoles = await this.prisma.adminUserRole.findMany({
            where: { adminUserId: approval.requestedByAdminId },
            select: { role: { select: { key: true } } },
        });
        const shared = myRoles.filter((r) => requesterRoles.some((x) => x.role.key === r));
        if (shared.length === myRoles.length) {
            throw new errors_1.AppError('FORBIDDEN', 'Dual control: the second approver must hold a different role than the requester', { requesterRoles: requesterRoles.map((x) => x.role.key) });
        }
        if (expiryOf(approval.createdAt) <= new Date()) {
            await this.prisma.adminApproval.update({
                where: { id: approval.id },
                data: { status: 'expired' },
            });
            throw new errors_1.AppError('CONFLICT', 'This request expired — ask for a new one');
        }
        await this.verifyMfa(admin, input.mfaCode);
        const pause = approval.action === 'pool.entries.pause';
        const result = await this.prisma.tx(async (tx) => {
            const updated = await tx.adminApproval.updateMany({
                where: { id: approval.id, status: 'pending' },
                data: {
                    status: input.decision === 'approve' ? 'approved' : 'rejected',
                    decidedByAdminId: admin.id,
                    decisionReason: input.reason,
                    decidedAt: new Date(),
                },
            });
            if (updated.count !== 1)
                throw new errors_1.AppError('CONFLICT', 'This request was already decided');
            if (input.decision === 'approve') {
                await tx.featureFlag.upsert({
                    where: { key: exports.ENTRIES_FLAG },
                    create: {
                        key: exports.ENTRIES_FLAG,
                        enabled: !pause,
                        description: 'Players can buy Global Pool entries',
                    },
                    update: { enabled: !pause },
                });
            }
            const audit = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: input.decision === 'approve'
                    ? 'pool.circuit_breaker.applied'
                    : 'pool.circuit_breaker.declined',
                targetType: 'feature_flag',
                targetId: exports.ENTRIES_FLAG,
                reason: input.reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: {
                    approvalId: approval.id,
                    action: pause ? 'pause_new_entries' : 'resume_new_entries',
                    requestedByAdminId: approval.requestedByAdminId,
                },
            }, tx);
            return { auditSeq: audit.seq };
        });
        this.flags.invalidate();
        return {
            approvalId: approval.id,
            decision: input.decision,
            entriesEnabled: input.decision === 'approve' ? !pause : await this.flags.isEnabled(exports.ENTRIES_FLAG),
            auditSeq: result.auditSeq,
        };
    }
    /**
     * P9 / F7: remind players of a cancelled round that a refund is waiting in Owed (in-app notification only —
     * it never moves money). Reason required, audited, at most once per round per 24 h.
     */
    async remindRefunds(admin, number, reason, meta) {
        if (!admin.permissions.includes('notifications.send')) {
            throw new errors_1.AppError('FORBIDDEN', 'Your role does not allow this action', {
                missingPermissions: ['notifications.send'],
            });
        }
        const round = await this.prisma.round.findUnique({ where: { number } });
        if (!round)
            throw (0, errors_1.notFound)(`Round #${number}`);
        if (round.status !== 'cancelled')
            throw new errors_1.AppError('CONFLICT', 'Only cancelled rounds have refunds');
        const recent = await this.prisma.auditLog.findFirst({
            where: {
                action: 'refunds.reminder.sent',
                targetType: 'round',
                targetId: round.id,
                createdAt: { gte: (0, time_1.addHours)(new Date(), -24) },
            },
        });
        if (recent)
            throw new errors_1.AppError('CONFLICT', 'A reminder for this round was already sent in the last 24 hours');
        const pending = await this.prisma.transaction.findMany({
            where: { roundId: round.id, type: 'refund', status: 'pending' },
            select: { userId: true, amount: true },
        });
        if (pending.length === 0)
            throw new errors_1.AppError('CONFLICT', 'Every refund of this round has been claimed');
        const label = `#${round.number.toLocaleString('en-US')}`;
        return this.prisma.tx(async (tx) => {
            await tx.notification.createMany({
                data: pending.map((p) => ({
                    userId: p.userId,
                    type: 'round.cancelled',
                    title: `Refund waiting — round ${label}`,
                    body: `${(0, money_2.usdt)(p.amount)} USDT from cancelled round ${label} is in your Owed balance. Claim it to Available any time.`,
                    data: { roundNumber: round.number },
                    isDemo: round.isDemo,
                })),
            });
            const audit = await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'refunds.reminder.sent',
                targetType: 'round',
                targetId: round.id,
                reason,
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
                metadata: { roundNumber: round.number, players: pending.length },
            }, tx);
            return { roundNumber: round.number, players: pending.length, auditSeq: audit.seq };
        });
    }
};
exports.AdminPoolService = AdminPoolService;
exports.AdminPoolService = AdminPoolService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        rounds_service_1.RoundsService,
        feature_flags_service_1.FeatureFlagsService,
        audit_service_1.AuditService,
        totp_service_1.TotpService,
        app_config_1.AppConfig])
], AdminPoolService);
//# sourceMappingURL=admin-pool.service.js.map