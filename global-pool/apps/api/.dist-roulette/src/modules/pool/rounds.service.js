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
exports.RoundsService = exports.entryCode = void 0;
const common_1 = require("@nestjs/common");
const fees_1 = require("@gp/shared/fees");
const enums_1 = require("@gp/shared/enums");
const format_1 = require("@gp/shared/format");
const money_1 = require("@gp/shared/money");
const pool_1 = require("@gp/shared/pool");
const schemas_1 = require("@gp/shared/schemas");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const ledger_service_1 = require("../ledger/ledger.service");
const selection_1 = require("../randomness/selection");
const pool_events_service_1 = require("./pool-events.service");
const entryCode = (roundNumber, seq) => `E-${roundNumber}-${String(seq).padStart(5, '0')}`;
exports.entryCode = entryCode;
let RoundsService = class RoundsService {
    prisma;
    ledger;
    events;
    constructor(prisma, ledger, events) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.events = events;
    }
    /** Open a round with immutable rules (+ its POOL ledger account). Admins cannot change rules or outcomes later. */
    async open(input) {
        const round = await this.prisma.tx(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(7262201)`;
            const last = await tx.round.findFirst({
                orderBy: { number: 'desc' },
                select: { number: true },
            });
            const number = input.number ?? (last?.number ?? 0) + 1;
            const now = new Date();
            const created = await tx.round.create({
                data: {
                    number,
                    status: input.opensAt <= now ? 'open' : 'scheduled',
                    opensAt: input.opensAt,
                    closesAt: input.closesAt,
                    openedAt: input.opensAt <= now ? now : null,
                    entryPrice: fees_1.ENTRY_PRICE,
                    platformFeePerEntry: fees_1.PLATFORM_FEE_PER_ENTRY,
                    minParticipants: input.minParticipants ?? pool_1.ROUND_THRESHOLDS.minParticipants,
                    minPool: input.minPool ?? pool_1.ROUND_THRESHOLDS.minPool,
                    prizeSplitBps: [...selection_1.DEFAULT_PRIZE_SPLIT_BPS],
                    onchainRoundId: BigInt(number),
                    isDemo: input.isDemo ?? false,
                },
            });
            await this.ledger.ensureAccounts(tx, [{ type: 'pool', roundId: created.id }]);
            return created;
        });
        this.events.emit({
            type: 'round.status',
            roundId: round.id,
            roundNumber: round.number,
            status: round.status,
            at: new Date().toISOString(),
        });
        return round;
    }
    /** The round players should see: open → next scheduled → most recent. */
    async current(db = this.prisma) {
        const include = this.include();
        return ((await db.round.findFirst({
            where: { status: 'open' },
            orderBy: { closesAt: 'asc' },
            include,
        })) ??
            (await db.round.findFirst({
                where: { status: 'scheduled' },
                orderBy: { opensAt: 'asc' },
                include,
            })) ??
            (await db.round.findFirst({ orderBy: { number: 'desc' }, include })));
    }
    async byNumber(number) {
        const round = await this.prisma.round.findUnique({
            where: { number },
            include: this.include(),
        });
        if (!round)
            throw (0, errors_1.notFound)(`Round ${(0, format_1.formatRoundNumber)(number)}`);
        return round;
    }
    async byId(id) {
        const round = await this.prisma.round.findUnique({ where: { id }, include: this.include() });
        if (!round)
            throw (0, errors_1.notFound)('Round');
        return round;
    }
    /** Past rounds. Optional filters (additive): `statuses` ⊆ closed/drawing/settled/cancelled, exact round `number`. */
    async history(query, filters = {}) {
        const past = ['settled', 'cancelled', 'closed', 'drawing'];
        const statuses = filters.statuses?.length
            ? past.filter((s) => filters.statuses.includes(s))
            : past;
        const where = {
            status: { in: statuses },
            ...(filters.number !== undefined ? { number: filters.number } : {}),
        };
        const [rows, total] = await Promise.all([
            this.prisma.round.findMany({
                where,
                orderBy: { number: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: this.include(),
            }),
            this.prisma.round.count({ where }),
        ]);
        return (0, schemas_1.paginate)(rows.map((r) => this.view(r)), total, query);
    }
    async myEntries(userId, roundId) {
        const round = await this.byId(roundId);
        const entries = await this.prisma.entry.findMany({
            where: { roundId, userId },
            orderBy: { seq: 'asc' },
            select: { code: true, seq: true, status: true, createdAt: true },
        });
        const purchases = await this.prisma.transaction.findMany({
            where: { userId, roundId, type: 'entry_purchase' },
            orderBy: { createdAt: 'asc' },
        });
        return {
            roundId,
            roundNumber: round.number,
            entries: entries.length,
            entryIds: entries.map((e) => e.code),
            firstEntryId: entries[0]?.code ?? null,
            lastEntryId: entries.at(-1)?.code ?? null,
            entryAmount: (0, money_2.usdt)((0, money_1.money)(round.entryPrice.toFixed()).times(entries.length)),
            platformFee: (0, money_2.usdt)(purchases.reduce((a, p) => a.plus((0, money_1.money)(p.platformFee.toFixed())), (0, money_1.money)(0))),
            purchases: purchases.map((p) => ({
                reference: p.reference,
                total: (0, money_2.usdt)(p.netAmount),
                at: p.createdAt.toISOString(),
            })),
            odds: round.entriesCount > 0
                ? // 6 dp, rounded down: clients round down again for display, never from an already rounded value
                    (0, pool_1.oddsDisclosure)(entries.length, round.entriesCount, Math.min(13, round.entriesCount), 6)
                : null,
        };
    }
    async feed(roundId, limit = 10) {
        const rows = await this.prisma.transaction.findMany({
            where: { roundId, type: 'entry_purchase' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { user: { select: { handle: true } } },
        });
        return rows.map((r) => {
            const entries = Number(r.metadata?.entries ?? 0);
            return {
                id: r.id,
                handle: r.user.handle,
                entries,
                amount: (0, money_2.usdt)(r.amount),
                at: r.createdAt.toISOString(),
                isDemo: r.isDemo,
            };
        });
    }
    async recentWinners(limit = 10) {
        const rows = await this.prisma.winner.findMany({
            orderBy: [{ createdAt: 'desc' }, { rank: 'asc' }],
            take: limit,
            include: {
                round: { select: { number: true, settledAt: true } },
                user: { select: { handle: true } },
            },
        });
        return rows.map((w) => ({
            id: w.id,
            handle: w.user?.handle ?? w.handleSnapshot,
            roundNumber: w.round.number,
            tier: w.tier,
            rank: w.rank,
            amount: (0, money_2.usdt)(w.amount),
            settledAt: w.round.settledAt?.toISOString() ?? null,
            isDemo: w.isDemo,
        }));
    }
    /** Public verification bundle: anyone can recompute the winners from the VRF word + entry list. */
    async verification(number) {
        const round = await this.byNumber(number);
        const request = round.randomnessRequests?.find((r) => r.status === 'fulfilled') ?? null;
        const base = {
            round: {
                id: round.id,
                number: round.number,
                status: round.status,
                totalEntries: round.entriesCount,
                pool: (0, money_2.usdt)(round.poolAmount),
            },
            algorithm: {
                name: 'GLOBAL_POOL_WINNERS_V1',
                domain: selection_1.WINNERS_DOMAIN,
                description: 'candidate_k = keccak256(abi.encode(domain, roundId, randomWord, k)); reject candidate < 2^256 mod N; index = candidate mod N; skip duplicates. Rank i = i-th distinct index. Prizes: floor(pool*bps/10000) for ranks ≥ 2, remainder to 1st.',
                roundIdUsed: (round.onchainRoundId ?? BigInt(round.number)).toString(),
                prizeSplitBps: round.prizeSplitBps,
                entryOrder: 'entries ordered by seq ascending (index = seq − 1)',
            },
            randomness: request
                ? {
                    provider: request.provider,
                    requestId: request.requestId,
                    randomWord: request.randomWord,
                    requestedAt: request.requestedAt.toISOString(),
                    fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
                    fulfillTxHash: request.fulfillTxHash,
                }
                : null,
        };
        if (!request?.randomWord || round.status !== 'settled' || round.entriesCount === 0) {
            return { ...base, winners: this.winnerViews(round), recomputed: null };
        }
        const entries = await this.prisma.entry.findMany({
            where: { roundId: round.id },
            orderBy: { seq: 'asc' },
            select: { id: true, seq: true, userId: true },
        });
        let matches = null;
        if (entries.length === round.entriesCount) {
            const recomputed = (0, selection_1.selectWinners)({
                roundId: round.onchainRoundId ?? BigInt(round.number),
                randomWord: request.randomWord,
                entries: entries.map((e) => ({ seq: e.seq, entryId: e.id, userId: e.userId })),
                pool: round.poolAmount.toFixed(),
                prizeSplitBps: round.prizeSplitBps,
            });
            const stored = [...(round.winners ?? [])].sort((a, b) => a.rank - b.rank);
            matches =
                stored.length === recomputed.length &&
                    recomputed.every((r, i) => stored[i]?.entrySeq === r.entrySeq &&
                        (0, money_1.money)(stored[i].amount.toFixed()).eq((0, money_1.money)(r.amount)));
        }
        return {
            ...base,
            winners: this.winnerViews(round),
            recomputed: { matchesStoredWinners: matches },
        };
    }
    view(round) {
        const pool = (0, money_2.usdt)(round.poolAmount);
        const req = round.randomnessRequests?.at(-1) ?? null;
        const met = round.thresholdsMet ??
            (round.participantsCount >= round.minParticipants &&
                (0, money_1.money)(pool).gte((0, money_1.money)(round.minPool.toFixed()))
                ? true
                : round.status === 'open'
                    ? false
                    : null);
        return {
            id: round.id,
            number: round.number,
            numberLabel: (0, format_1.formatRoundNumber)(round.number),
            status: round.status,
            statusLabel: enums_1.ROUND_STATUS_LABEL[round.status],
            opensAt: round.opensAt.toISOString(),
            openedAt: (round.openedAt ?? round.opensAt).toISOString(),
            closesAt: round.closesAt.toISOString(),
            closedAt: round.closedAt?.toISOString() ?? null,
            entryPrice: (0, money_2.usdt)(round.entryPrice),
            platformFeePerEntry: (0, money_2.usdt)(round.platformFeePerEntry),
            participants: round.participantsCount,
            entries: round.entriesCount,
            poolBalance: pool,
            platformFees: (0, money_2.usdt)(round.platformFees),
            thresholds: { minParticipants: round.minParticipants, minPool: (0, money_2.usdt)(round.minPool), met },
            prizeDistribution: (0, pool_1.prizeBreakdown)(pool).tiers,
            draw: req
                ? {
                    provider: req.provider,
                    network: req.network,
                    requestId: req.requestId,
                    requestIdDisplay: req.requestId.length > 14 ? (0, format_1.truncateAddress)(req.requestId) : req.requestId,
                    requestedAt: req.requestedAt.toISOString(),
                    fulfilledAt: req.fulfilledAt?.toISOString() ?? null,
                    confirmations: req.confirmations,
                    status: req.status,
                    settledAt: round.settledAt?.toISOString() ?? null,
                }
                : null,
            winners: this.winnerViews(round),
            cancellation: round.status === 'cancelled'
                ? {
                    reason: (round.cancelReason ?? 'threshold_not_met'),
                    refundsTo: 'owed',
                }
                : null,
            settledAt: round.settledAt?.toISOString() ?? null,
            isDemo: round.isDemo,
        };
    }
    winnerViews(round) {
        return [...(round.winners ?? [])]
            .sort((a, b) => a.rank - b.rank)
            .map((w) => ({
            place: w.rank,
            tier: w.tier,
            handle: w.user?.handle ?? w.handleSnapshot,
            entryId: w.entry?.code ?? null,
            entrySeq: w.entrySeq,
            amount: (0, money_2.usdt)(w.amount),
        }));
    }
    include() {
        return {
            winners: {
                include: { user: { select: { handle: true } }, entry: { select: { code: true } } },
            },
            randomnessRequests: { orderBy: { createdAt: 'asc' } },
        };
    }
};
exports.RoundsService = RoundsService;
exports.RoundsService = RoundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        pool_events_service_1.PoolEventsService])
], RoundsService);
//# sourceMappingURL=rounds.service.js.map