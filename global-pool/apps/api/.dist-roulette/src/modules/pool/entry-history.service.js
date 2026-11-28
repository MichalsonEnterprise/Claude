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
exports.EntryHistoryService = void 0;
const common_1 = require("@nestjs/common");
const money_1 = require("@gp/shared/money");
const schemas_1 = require("@gp/shared/schemas");
const money_2 = require("../../common/money");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const ACTIVE = ['open', 'closed', 'drawing'];
/**
 * Player's Global Pool entry history (GP-10): one row per purchase with what it cost (entries + separate platform
 * fee) and what happened to it. Read-only projection over transactions / entries / winners — never a balance source.
 */
let EntryHistoryService = class EntryHistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async history(userId, query) {
        const where = { userId, type: 'entry_purchase', roundId: { not: null } };
        const [rows, total, summary] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: {
                    round: {
                        select: { id: true, number: true, status: true, closesAt: true, entryPrice: true },
                    },
                },
            }),
            this.prisma.transaction.count({ where }),
            this.summary(userId),
        ]);
        const roundIds = [...new Set(rows.map((r) => r.roundId))];
        const [winners, refundEntries] = await Promise.all([
            this.prisma.winner.findMany({
                where: { userId, roundId: { in: roundIds } },
                include: { entry: { select: { code: true, transactionId: true } } },
                orderBy: { rank: 'asc' },
            }),
            this.prisma.entry.groupBy({
                by: ['roundId', 'transactionId', 'status'],
                where: { userId, roundId: { in: roundIds }, status: { in: ['refund_owed', 'refunded'] } },
                _count: { _all: true },
            }),
        ]);
        // Results belong to the PURCHASE whose entries they concern (entries carry their purchase transaction id), so a
        // second purchase in the same round never repeats the first one's refund or prize. Entries without a purchase
        // link (legacy rows) fall back to the round.
        const ofPurchase = (t, txId, roundId) => (txId ? txId === t.id : roundId === t.roundId);
        const items = rows.map((t) => {
            const round = t.round;
            const meta = (t.metadata ?? {});
            const entries = Number(meta.entries ?? 0);
            const mine = winners.filter((w) => ofPurchase(t, w.entry?.transactionId, w.roundId));
            const refunds = refundEntries.filter((g) => ofPurchase(t, g.transactionId, g.roundId));
            const countOf = (status) => refunds.filter((g) => g.status === status).reduce((n, g) => n + g._count._all, 0);
            const owed = countOf('refund_owed');
            const back = countOf('refunded');
            const price = (0, money_1.money)(round.entryPrice.toFixed());
            let kind;
            if (round.status === 'open' || round.status === 'scheduled')
                kind = 'in_draw';
            else if (round.status === 'closed' || round.status === 'drawing')
                kind = 'drawing';
            else if (round.status === 'settled')
                kind = mine.length > 0 ? 'won' : 'not_selected';
            else
                kind = owed > 0 || back === 0 ? 'refund_owed' : 'refunded';
            return {
                reference: t.reference,
                transactionId: t.id,
                roundId: round.id,
                roundNumber: round.number,
                roundStatus: round.status,
                roundClosesAt: round.closesAt.toISOString(),
                entries,
                firstEntryId: meta.firstEntryId ?? null,
                lastEntryId: meta.lastEntryId ?? null,
                entryAmount: (0, money_2.usdt)(t.amount),
                platformFee: (0, money_2.usdt)(t.platformFee),
                networkFee: (0, money_2.usdt)(t.networkFee ?? 0),
                total: (0, money_2.usdt)(t.netAmount),
                purchasedAt: t.createdAt.toISOString(),
                result: {
                    kind,
                    prize: kind === 'won'
                        ? (0, money_2.usdt)(mine.reduce((a, w) => a.plus((0, money_1.money)(w.amount.toFixed())), new money_1.MoneyDecimal(0)))
                        : null,
                    winningEntryIds: mine.map((w) => w.entry?.code).filter((c) => Boolean(c)),
                    refund: kind === 'refund_owed' || kind === 'refunded'
                        ? (0, money_2.usdt)(price.times(kind === 'refund_owed' ? owed || entries : back))
                        : null,
                },
                isDemo: t.isDemo,
            };
        });
        return { summary, ...(0, schemas_1.paginate)(items, total, query) };
    }
    async summary(userId) {
        const [purchases, fees, byStatus, prizes, owed] = await Promise.all([
            this.prisma.transaction.count({ where: { userId, type: 'entry_purchase' } }),
            this.prisma.transaction.aggregate({
                where: { userId, type: 'entry_purchase' },
                _sum: { platformFee: true },
            }),
            this.prisma.$queryRaw `
        SELECT r.status AS status, COUNT(*)::bigint AS n
        FROM entries e JOIN rounds r ON r.id = e.round_id
        WHERE e.user_id = ${userId}::uuid
        GROUP BY r.status`,
            this.prisma.winner.aggregate({ where: { userId }, _sum: { amount: true } }),
            this.prisma.$queryRaw `
        SELECT SUM(r.entry_price)::text AS amount
        FROM entries e JOIN rounds r ON r.id = e.round_id
        WHERE e.user_id = ${userId}::uuid AND e.status = 'refund_owed'`,
        ]);
        const count = (pred) => byStatus.filter((r) => pred(r.status)).reduce((n, r) => n + Number(r.n), 0);
        return {
            purchases,
            qualifyingEntries: count((s) => s !== 'cancelled'),
            activeEntries: count((s) => ACTIVE.includes(s)),
            platformFeesPaid: (0, money_2.usdt)(fees._sum.platformFee ?? 0),
            prizesWon: (0, money_2.usdt)(prizes._sum.amount ?? 0),
            refundOwed: (0, money_2.usdt)(owed[0]?.amount ?? 0),
        };
    }
};
exports.EntryHistoryService = EntryHistoryService;
exports.EntryHistoryService = EntryHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntryHistoryService);
//# sourceMappingURL=entry-history.service.js.map