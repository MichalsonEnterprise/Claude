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
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const limits_1 = require("@gp/shared/limits");
const money_1 = require("@gp/shared/money");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const rounds_service_1 = require("../pool/rounds.service");
const transactions_service_1 = require("../transactions/transactions.service");
const csv_1 = require("./csv");
const OPEN_STATUSES = ['scheduled', 'open', 'closed', 'drawing'];
const DONE_TX = {
    notIn: ['failed', 'rejected', 'cancelled'],
};
/**
 * Player history: financial (F1–F6) and gaming (G1–G7). Read-only projections of the transaction history, entries,
 * winners and game sessions. Balances never come from here — only from the ledger.
 */
let HistoryService = class HistoryService {
    prisma;
    transactions;
    constructor(prisma, transactions) {
        this.prisma = prisma;
        this.transactions = transactions;
    }
    // ── financial ─────────────────────────────────────────────────────────────────────────────────
    txWhere(userId, q) {
        const where = {
            userId,
            ...(q.types?.length ? { type: { in: q.types } } : {}),
            ...(q.status ? { status: q.status } : {}),
            ...(q.network ? { network: q.network } : {}),
            ...(q.from || q.to
                ? {
                    createdAt: {
                        ...(q.from ? { gte: new Date(q.from) } : {}),
                        ...(q.to ? { lte: new Date(q.to) } : {}),
                    },
                }
                : {}),
            ...(q.q
                ? {
                    OR: [
                        { reference: { contains: q.q, mode: 'insensitive' } },
                        { txHash: { contains: q.q, mode: 'insensitive' } },
                        { description: { contains: q.q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        return where;
    }
    async transactionsList(userId, q) {
        const where = this.txWhere(userId, q);
        const [rows, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (q.page - 1) * q.pageSize,
                take: q.pageSize,
                include: { withdrawal: true, deposit: true, round: { select: { number: true } } },
            }),
            this.prisma.transaction.count({ where }),
        ]);
        return (0, schemas_1.paginate)(rows.map((r) => ({ ...this.transactions.view(r), roundNumber: r.round?.number ?? null })), total, q);
    }
    /** CSV export of the filtered history (all pages). Exports are audited by the controller. */
    async transactionsCsv(userId, q) {
        const rows = await this.prisma.transaction.findMany({
            where: this.txWhere(userId, q),
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 10_000,
            include: { withdrawal: true, deposit: true },
        });
        const views = rows.map((r) => this.transactions.view(r));
        const columns = [
            { header: 'date_utc', value: (v) => v.createdAt },
            { header: 'reference', value: (v) => v.id },
            { header: 'type', value: (v) => v.type },
            { header: 'status', value: (v) => v.status },
            { header: 'direction', value: (v) => v.direction },
            { header: 'amount_usdt', value: (v) => v.amount },
            { header: 'platform_fee_usdt', value: (v) => v.platformFee },
            { header: 'network_fee_usdt', value: (v) => v.networkFee ?? '' },
            { header: 'net_usdt', value: (v) => v.netAmount },
            { header: 'network', value: (v) => v.network ?? '' },
            { header: 'description', value: (v) => v.description },
            ...(q.includeHashes
                ? [
                    { header: 'tx_hash', value: (v) => v.txHash ?? '' },
                    { header: 'address', value: (v) => v.addressDisplay ?? '' },
                ]
                : []),
            { header: 'demo', value: (v) => (v.isDemo ? 'DEMO' : '') },
        ];
        const csv = (0, csv_1.buildCsv)(views, columns, q.format === 'csv_semicolon' ? ';' : ',');
        const dates = views.map((v) => v.createdAt).sort();
        return {
            csv,
            rows: views.length,
            fileName: (0, csv_1.csvFileName)('globalpool_transactions', q.from ?? dates[0], q.to ?? dates.at(-1)),
        };
    }
    async financeSummary(userId, now = new Date()) {
        const sum = async (where, field = 'amount') => {
            const agg = await this.prisma.transaction.aggregate({
                where: { userId, ...where },
                _sum: { [field]: true },
                _count: { _all: true },
            });
            const s = agg._sum;
            return { total: (0, money_2.usdt)(s[field]), count: agg._count._all };
        };
        const weekStart = (0, time_1.periodStart)('week', now);
        const dayStart = (0, time_1.periodStart)('day', now);
        const d30 = new Date(now.getTime() - 30 * 86_400_000);
        const [depLife, depWeek, depPending, wdLife, wdAll, wdOpen, wdToday, feeLife, fee30, netFees, rewards, rewardsOwed, refundsOwed, refundsAll, profile, demo,] = await Promise.all([
            sum({ type: 'deposit', status: 'completed' }),
            sum({ type: 'deposit', createdAt: { gte: weekStart }, status: DONE_TX }),
            sum({ type: 'deposit', status: { in: ['pending', 'confirming', 'processing'] } }),
            sum({ type: 'withdrawal', status: 'completed' }),
            sum({ type: 'withdrawal' }),
            sum({ type: 'withdrawal', status: { in: ['pending', 'under_review', 'processing'] } }),
            sum({ type: 'withdrawal', createdAt: { gte: dayStart }, status: DONE_TX }),
            sum({ type: 'entry_purchase', status: DONE_TX }, 'platformFee'),
            sum({ type: 'entry_purchase', createdAt: { gte: d30 }, status: DONE_TX }, 'platformFee'),
            sum({ type: 'withdrawal', status: 'completed' }, 'networkFee'),
            sum({ type: { in: ['reward', 'rakeback', 'cashback'] }, status: DONE_TX }),
            sum({ type: { in: ['reward', 'rakeback', 'cashback'] }, status: 'pending' }),
            sum({ type: 'refund', status: 'pending' }),
            sum({ type: 'refund', status: DONE_TX }),
            this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }),
            this.prisma.transaction.findFirst({ where: { userId, isDemo: true }, select: { id: true } }),
        ]);
        const [entriesLife, entries30, current] = await Promise.all([
            this.prisma.entry.count({ where: { userId } }),
            this.prisma.entry.count({ where: { userId, createdAt: { gte: d30 } } }),
            this.prisma.round.findFirst({
                where: { status: 'open', entries: { some: { userId } } },
                orderBy: { number: 'desc' },
            }),
        ]);
        let currentRound = null;
        if (current) {
            const n = await this.prisma.entry.count({ where: { userId, roundId: current.id } });
            currentRound = {
                number: current.number,
                entries: n,
                platformFee: (0, money_1.toUSDTString)((0, money_1.money)(current.platformFeePerEntry.toFixed()).times(n)),
            };
        }
        return {
            deposits: {
                lifetime: depLife.total,
                count: depLife.count,
                thisWeek: depWeek.total,
                pending: depPending.total,
                pendingCount: depPending.count,
            },
            withdrawals: {
                lifetime: wdLife.total,
                completedCount: wdLife.count,
                count: wdAll.count,
                openCount: wdOpen.count,
                open: wdOpen.total,
                dailyLimit: limits_1.DAILY_WITHDRAWAL_LIMIT[profile?.kycLevel ?? 'none'],
                usedToday: wdToday.total,
            },
            fees: {
                platformLifetime: feeLife.total,
                entriesLifetime: entriesLife,
                platformLast30d: fee30.total,
                entriesLast30d: entries30,
                networkLifetime: netFees.total,
                currentRound,
            },
            rewards: {
                lifetime: rewards.total,
                count: rewards.count,
                owed: rewardsOwed.total,
                owedCount: rewardsOwed.count,
            },
            refunds: {
                owed: refundsOwed.total,
                owedCount: refundsOwed.count,
                lifetime: refundsAll.total,
                count: refundsAll.count,
            },
            isDemo: Boolean(demo),
        };
    }
    /** Fee lines (F3): platform fees per entry purchase + network fees per withdrawal. */
    async fees(userId, page, pageSize) {
        const where = {
            userId,
            OR: [
                { type: 'entry_purchase', platformFee: { gt: 0 } },
                {
                    type: 'withdrawal',
                    networkFee: { gt: 0 },
                    status: { notIn: ['rejected', 'cancelled', 'failed'] },
                },
            ],
        };
        const [rows, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { round: { select: { number: true, status: true } } },
            }),
            this.prisma.transaction.count({ where }),
        ]);
        const items = rows.map((r) => {
            const meta = (r.metadata ?? {});
            if (r.type === 'entry_purchase') {
                const n = typeof meta.entries === 'number' ? meta.entries : null;
                return {
                    id: r.id,
                    kind: 'platform_fee',
                    reference: r.reference,
                    title: r.round
                        ? `Round #${r.round.number.toLocaleString('en-US')}${n ? ` · ${n} entries` : ''}`
                        : r.description,
                    detail: n ? `Platform fee · ${n} × 0.05` : 'Platform fee',
                    amount: (0, money_2.usdt)(r.platformFee),
                    entries: n,
                    roundNumber: r.round?.number ?? null,
                    network: null,
                    status: r.round?.status === 'cancelled' ? 'round_cancelled' : 'charged',
                    createdAt: r.createdAt.toISOString(),
                    isDemo: r.isDemo,
                };
            }
            return {
                id: r.id,
                kind: 'network_fee',
                reference: r.reference,
                title: `${r.reference} · network fee`,
                detail: 'Paid to the blockchain network — not a platform fee',
                amount: (0, money_2.usdt)(r.networkFee),
                entries: null,
                roundNumber: null,
                network: r.network,
                status: r.status === 'completed' ? 'charged' : 'reserved',
                createdAt: r.createdAt.toISOString(),
                isDemo: r.isDemo,
            };
        });
        return (0, schemas_1.paginate)(items, total, { page, pageSize });
    }
    // ── gaming: Global Pool entries ───────────────────────────────────────────────────────────────
    async myRounds(userId, filter) {
        const roundWhere = {
            ...(filter.roundFrom || filter.roundTo
                ? {
                    number: {
                        ...(filter.roundFrom ? { gte: filter.roundFrom } : {}),
                        ...(filter.roundTo ? { lte: filter.roundTo } : {}),
                    },
                }
                : {}),
            ...(filter.roundStatuses ? { status: { in: filter.roundStatuses } } : {}),
        };
        const groups = await this.prisma.entry.groupBy({
            by: ['roundId', 'status'],
            where: {
                userId,
                ...(filter.statuses?.length ? { status: { in: filter.statuses } } : {}),
                ...(Object.keys(roundWhere).length ? { round: roundWhere } : {}),
            },
            _count: { _all: true },
            _min: { seq: true, createdAt: true },
            _max: { seq: true },
        });
        const roundIds = [...new Set(groups.map((g) => g.roundId))];
        if (roundIds.length === 0)
            return [];
        const [rounds, purchases, wins] = await Promise.all([
            this.prisma.round.findMany({ where: { id: { in: roundIds } } }),
            this.prisma.transaction.groupBy({
                by: ['roundId'],
                where: { userId, type: 'entry_purchase', roundId: { in: roundIds } },
                _sum: { amount: true, platformFee: true },
            }),
            this.prisma.winner.findMany({ where: { userId, roundId: { in: roundIds } } }),
        ]);
        return rounds.map((round) => {
            const gs = groups.filter((g) => g.roundId === round.id);
            const counts = {};
            let total = 0;
            let minSeq = Number.MAX_SAFE_INTEGER;
            let maxSeq = 0;
            let firstAt = new Date();
            for (const g of gs) {
                counts[g.status] = (counts[g.status] ?? 0) + g._count._all;
                total += g._count._all;
                minSeq = Math.min(minSeq, g._min.seq ?? minSeq);
                maxSeq = Math.max(maxSeq, g._max.seq ?? 0);
                if (g._min.createdAt && g._min.createdAt < firstAt)
                    firstAt = g._min.createdAt;
            }
            const p = purchases.find((x) => x.roundId === round.id);
            const myWins = wins.filter((w) => w.roundId === round.id);
            const prize = myWins.reduce((a, w) => a.plus((0, money_1.money)(w.amount.toFixed())), (0, money_1.money)(0));
            const stake = p?._sum.amount
                ? (0, money_2.usdt)(p._sum.amount)
                : (0, money_1.toUSDTString)((0, money_1.money)(round.entryPrice.toFixed()).times(total));
            const fee = p?._sum.platformFee
                ? (0, money_2.usdt)(p._sum.platformFee)
                : (0, money_1.toUSDTString)((0, money_1.money)(round.platformFeePerEntry.toFixed()).times(total));
            const result = myWins.length
                ? 'won'
                : counts.refund_owed
                    ? 'refund_owed'
                    : counts.refunded
                        ? 'refunded'
                        : counts.active
                            ? 'active'
                            : 'not_won';
            const open = OPEN_STATUSES.includes(round.status);
            return {
                round: roundRef(round),
                entries: total,
                firstCode: (0, rounds_service_1.entryCode)(round.number, minSeq),
                lastCode: (0, rounds_service_1.entryCode)(round.number, maxSeq),
                stake,
                platformFee: fee,
                statusCounts: counts,
                result,
                prize: myWins.length ? (0, money_1.toUSDTString)(prize) : null,
                bestRank: myWins.length ? Math.min(...myWins.map((w) => w.rank)) : null,
                share: open && round.entriesCount > 0 ? (0, money_1.money)(total).div(round.entriesCount).toFixed(6) : null,
                purchasedAt: firstAt.toISOString(),
                isDemo: round.isDemo,
            };
        });
    }
    async entries(userId, q) {
        const all = await this.myRounds(userId, {
            statuses: q.status,
            roundFrom: q.roundFrom,
            roundTo: q.roundTo,
        });
        all.sort((a, b) => q.sort === 'oldest' ? a.round.number - b.round.number : b.round.number - a.round.number);
        const start = (q.page - 1) * q.pageSize;
        const totals = {
            entries: all.reduce((a, r) => a + r.entries, 0),
            rounds: all.length,
            won: all.filter((r) => r.result === 'won').length,
        };
        return { ...(0, schemas_1.paginate)(all.slice(start, start + q.pageSize), all.length, q), totals };
    }
    async activeRounds(userId) {
        const rows = await this.myRounds(userId, { roundStatuses: [...OPEN_STATUSES] });
        return rows.sort((a, b) => a.round.closesAt.localeCompare(b.round.closesAt));
    }
    async results(userId) {
        const rows = await this.myRounds(userId, { roundStatuses: ['settled', 'cancelled'] });
        return rows.sort((a, b) => b.round.number - a.round.number);
    }
    /** G5: prizes, refunds and rewards — what is owed and what was settled (claimed or automatic). */
    async winnings(userId) {
        const [claims, owedTx] = await Promise.all([
            this.prisma.prizeClaim.findMany({
                where: { userId },
                include: { winner: { include: { round: { select: { number: true } } } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.transaction.findMany({
                where: { userId, type: { in: ['refund', 'reward', 'rakeback', 'cashback', 'prize'] } },
                orderBy: { createdAt: 'desc' },
                include: { round: { select: { number: true } } },
            }),
        ]);
        const items = [];
        for (const c of claims) {
            const n = c.winner.round.number;
            items.push({
                id: c.id,
                kind: 'prize',
                reference: `PZ-${n}-${String(c.winner.rank).padStart(2, '0')}`,
                title: `Round #${n.toLocaleString('en-US')} · ${ordinal(c.winner.rank)} prize`,
                detail: c.status === 'claimed'
                    ? 'Moved from Owed to Available'
                    : 'Owed — claim to move it to Available',
                amount: (0, money_2.usdt)(c.amount),
                settlement: c.status === 'claimed' ? 'settled' : 'owed',
                roundNumber: n,
                rank: c.winner.rank,
                createdAt: c.createdAt.toISOString(),
                settledAt: c.claimedAt?.toISOString() ?? null,
                autoSettlesAt: null,
                isDemo: c.isDemo,
            });
        }
        for (const t of owedTx) {
            if (t.type === 'prize')
                continue; // prizes come from prize_claims (one row per winning entry)
            const meta = (t.metadata ?? {});
            const auto = typeof meta.statusDetail === 'string'
                ? /auto-settles (.+)$/i.exec(meta.statusDetail)
                : null;
            items.push({
                id: t.id,
                kind: t.type === 'refund' ? 'refund' : 'reward',
                reference: t.reference,
                title: t.description,
                detail: typeof meta.statusDetail === 'string' ? meta.statusDetail : t.status,
                amount: (0, money_2.usdt)(t.netAmount),
                settlement: t.status === 'pending' ? 'owed' : t.status === 'processing' ? 'processing' : 'settled',
                roundNumber: t.round?.number ?? null,
                rank: null,
                createdAt: t.createdAt.toISOString(),
                settledAt: t.completedAt?.toISOString() ?? null,
                autoSettlesAt: auto ? (auto[1] ?? null) : null,
                isDemo: t.isDemo,
            });
        }
        const owed = items.filter((i) => i.settlement !== 'settled');
        const settled = items.filter((i) => i.settlement === 'settled');
        const total = (xs) => (0, money_1.toUSDTString)(xs.reduce((a, i) => a.plus((0, money_1.money)(i.amount)), (0, money_1.money)(0)));
        const prizes = items.filter((i) => i.kind === 'prize');
        return {
            owed: { total: total(owed), items: owed },
            settled: { total: total(settled), items: settled },
            lifetimePrizes: total(prizes),
            prizesCount: prizes.length,
            isDemo: items.some((i) => i.isDemo),
        };
    }
    // ── gaming: games (simulation) ────────────────────────────────────────────────────────────────
    async gamesActivity(userId, since) {
        const [sessions, favs] = await Promise.all([
            this.prisma.gameSession.findMany({
                where: { userId, ...(since ? { startedAt: { gte: since } } : {}) },
                include: {
                    game: true,
                    results: { select: { stake: true, payout: true, createdAt: true } },
                },
                orderBy: { startedAt: 'desc' },
            }),
            this.prisma.userFavouriteGame.findMany({ where: { userId }, select: { gameId: true } }),
        ]);
        const fav = new Set(favs.map((f) => f.gameId));
        const byGame = new Map();
        for (const s of sessions) {
            const g = byGame.get(s.gameId) ?? {
                slug: s.game.slug,
                name: s.game.name,
                category: s.game.category,
                edgeLabel: s.game.edgeLabel,
                favourite: fav.has(s.gameId),
                sessions: 0,
                bets: 0,
                wagered: '0.00',
                net: '0.00',
                lastPlayedAt: null,
                isSimulation: s.isSimulation,
            };
            g.sessions += 1;
            for (const r of s.results) {
                g.bets += 1;
                g.wagered = (0, money_1.toUSDTString)((0, money_1.money)(g.wagered).plus((0, money_1.money)(r.stake.toFixed())));
                g.net = (0, money_1.toUSDTString)((0, money_1.money)(g.net).plus((0, money_1.money)(r.payout.toFixed())).minus((0, money_1.money)(r.stake.toFixed())));
                const at = r.createdAt.toISOString();
                if (!g.lastPlayedAt || at > g.lastPlayedAt)
                    g.lastPlayedAt = at;
            }
            if (!g.lastPlayedAt)
                g.lastPlayedAt = s.startedAt.toISOString();
            byGame.set(s.gameId, g);
        }
        return [...byGame.values()].sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''));
    }
    async gamesOverview(userId, now = new Date()) {
        const d30 = new Date(now.getTime() - 30 * 86_400_000);
        const [activeRounds, recentGames, pool, prizes, refunds] = await Promise.all([
            this.activeRounds(userId),
            this.gamesActivity(userId, d30),
            this.prisma.transaction.aggregate({
                where: { userId, type: 'entry_purchase', createdAt: { gte: d30 }, status: DONE_TX },
                _sum: { netAmount: true },
            }),
            this.prisma.transaction.aggregate({
                where: { userId, type: 'prize', createdAt: { gte: d30 }, status: DONE_TX },
                _sum: { netAmount: true },
            }),
            this.prisma.transaction.aggregate({
                where: { userId, type: 'refund', createdAt: { gte: d30 }, status: DONE_TX },
                _sum: { netAmount: true },
            }),
        ]);
        const poolEntries = await this.prisma.entry.count({
            where: { userId, createdAt: { gte: d30 } },
        });
        const simWagered = recentGames.reduce((a, g) => a.plus((0, money_1.money)(g.wagered)), (0, money_1.money)(0));
        const simNet = recentGames.reduce((a, g) => a.plus((0, money_1.money)(g.net)), (0, money_1.money)(0));
        const poolSpent = (0, money_1.money)(pool._sum.netAmount?.toFixed() ?? '0');
        const returned = (0, money_1.money)(prizes._sum.netAmount?.toFixed() ?? '0').plus((0, money_1.money)(refunds._sum.netAmount?.toFixed() ?? '0'));
        return {
            activeRounds,
            recentGames,
            last30d: {
                poolEntries,
                poolSpent: (0, money_1.toUSDTString)(poolSpent),
                poolReturned: (0, money_1.toUSDTString)(returned),
                poolNet: (0, money_1.toUSDTString)(returned.minus(poolSpent)),
                gameBets: recentGames.reduce((a, g) => a + g.bets, 0),
                simWagered: (0, money_1.toUSDTString)(simWagered),
                simNet: (0, money_1.toUSDTString)(simNet),
            },
            isDemo: activeRounds.some((r) => r.isDemo),
        };
    }
    gameRoundsWhere(userId, q) {
        return {
            session: { userId, ...(q.game ? { game: { slug: q.game } } : {}) },
            ...(q.from || q.to
                ? {
                    createdAt: {
                        ...(q.from ? { gte: new Date(q.from) } : {}),
                        ...(q.to ? { lte: new Date(q.to) } : {}),
                    },
                }
                : {}),
        };
    }
    async gameRounds(userId, q) {
        const where = this.gameRoundsWhere(userId, q);
        const [rows, total] = await Promise.all([
            this.prisma.gameResult.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (q.page - 1) * q.pageSize,
                take: q.pageSize,
                include: { session: { include: { game: { select: { slug: true, name: true } } } } },
            }),
            this.prisma.gameResult.count({ where }),
        ]);
        const items = rows.map((r) => ({
            id: r.id,
            game: { slug: r.session.game.slug, name: r.session.game.name },
            nonce: r.nonce,
            stake: (0, money_2.usdt)(r.stake),
            payout: (0, money_2.usdt)(r.payout),
            net: (0, money_1.toUSDTString)((0, money_1.money)(r.payout.toFixed()).minus((0, money_1.money)(r.stake.toFixed()))),
            outcome: (r.outcome ?? {}),
            serverSeedHash: r.session.serverSeedHash,
            // the server seed is only revealed once the session has ended (commit–reveal)
            serverSeed: r.session.status === 'active' ? null : r.session.serverSeed,
            clientSeed: r.session.clientSeed,
            isSimulation: r.session.isSimulation,
            createdAt: r.createdAt.toISOString(),
        }));
        return (0, schemas_1.paginate)(items, total, q);
    }
    async gameRoundsCsv(userId, q) {
        const page = await this.gameRounds(userId, { ...q, page: 1, pageSize: 100 });
        const all = [...page.items];
        for (let p = 2; p <= Math.min(page.totalPages, 100); p++) {
            all.push(...(await this.gameRounds(userId, { ...q, page: p, pageSize: 100 })).items);
        }
        const csv = (0, csv_1.buildCsv)(all, [
            { header: 'date_utc', value: (r) => r.createdAt },
            { header: 'game', value: (r) => r.game.name },
            { header: 'nonce', value: (r) => String(r.nonce) },
            { header: 'stake', value: (r) => r.stake },
            { header: 'payout', value: (r) => r.payout },
            { header: 'net', value: (r) => r.net },
            { header: 'server_seed_hash', value: (r) => r.serverSeedHash },
            { header: 'server_seed', value: (r) => r.serverSeed ?? '(not revealed yet)' },
            { header: 'client_seed', value: (r) => r.clientSeed },
            { header: 'mode', value: (r) => (r.isSimulation ? 'simulation' : 'real') },
        ]);
        return {
            csv,
            rows: all.length,
            fileName: (0, csv_1.csvFileName)('globalpool_game-history', q.from, q.to),
        };
    }
    // ── favourites (G7) ───────────────────────────────────────────────────────────────────────────
    async favourites(userId) {
        const rows = await this.prisma.userFavouriteGame.findMany({
            where: { userId, game: { enabled: true } },
            include: { game: true },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({
            slug: r.game.slug,
            name: r.game.name,
            category: r.game.category,
            edgeLabel: r.game.edgeLabel,
            playersDemo: r.game.playersDemo,
            addedAt: r.createdAt.toISOString(),
        }));
    }
    async addFavourite(userId, slug) {
        const game = await this.prisma.game.findUnique({ where: { slug } });
        if (!game || !game.enabled)
            throw (0, errors_1.notFound)('Game');
        await this.prisma.userFavouriteGame.upsert({
            where: { userId_gameId: { userId, gameId: game.id } },
            create: { userId, gameId: game.id },
            update: {},
        });
        return this.favourites(userId);
    }
    async removeFavourite(userId, slug) {
        const game = await this.prisma.game.findUnique({ where: { slug } });
        if (game)
            await this.prisma.userFavouriteGame.deleteMany({ where: { userId, gameId: game.id } });
        return this.favourites(userId);
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        transactions_service_1.TransactionsService])
], HistoryService);
function roundRef(r) {
    return {
        id: r.id,
        number: r.number,
        status: r.status,
        closesAt: r.closesAt.toISOString(),
        settledAt: r.settledAt?.toISOString() ?? null,
        cancelledAt: r.cancelledAt?.toISOString() ?? null,
        cancelReason: r.cancelReason,
        entriesCount: r.entriesCount,
        participantsCount: r.participantsCount,
        poolAmount: (0, money_2.usdt)(r.poolAmount),
        isDemo: r.isDemo,
    };
}
function ordinal(n) {
    if (n === 1)
        return '1st';
    if (n === 2)
        return '2nd';
    if (n === 3)
        return '3rd';
    return `Runner-up (${n}th)`;
}
//# sourceMappingURL=history.service.js.map