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
exports.EntriesService = void 0;
const common_1 = require("@nestjs/common");
const fees_1 = require("@gp/shared/fees");
const format_1 = require("@gp/shared/format");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const responsible_gaming_service_1 = require("../compliance/responsible-gaming.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const ledger_service_1 = require("../ledger/ledger.service");
const posting_1 = require("../ledger/posting");
const notifications_service_1 = require("../notifications/notifications.service");
const pool_events_service_1 = require("./pool-events.service");
const rounds_service_1 = require("./rounds.service");
/**
 * Buying entries: ONE database transaction that (1) locks the round row, (2) checks the round is open,
 * (3) enforces responsible-gaming participation / loss limits and self-exclusion, (4) posts
 * AVAILABLE −(n×10.05) → POOL(round) +n×10.00 and FEES +n×0.05 (balance-checked under row locks), (5) allocates
 * sequential entry tickets and updates the round projections. Wrapped in an idempotency key so retries replay.
 */
let EntriesService = class EntriesService {
    prisma;
    ledger;
    idempotency;
    rg;
    notifications;
    events;
    flags;
    constructor(prisma, ledger, idempotency, rg, notifications, events, flags) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.idempotency = idempotency;
        this.rg = rg;
        this.notifications = notifications;
        this.events = events;
        this.flags = flags;
    }
    quote(entries) {
        return (0, fees_1.entryQuote)(entries);
    }
    async enter(user, roundId, entries, idempotencyKey) {
        const quote = (0, fees_1.entryQuote)(entries);
        await this.flags.assertEnabled('pool.entries.enabled', 'Global Pool entry sales');
        const result = await this.idempotency.run({ scope: 'pool.enter', ownerId: user.id, key: idempotencyKey, request: { roundId, entries } }, async (tx) => {
            await tx.$queryRaw `SELECT id FROM rounds WHERE id = ${roundId}::uuid FOR UPDATE`;
            const round = await tx.round.findUnique({ where: { id: roundId } });
            if (!round)
                throw new errors_1.AppError('NOT_FOUND', 'Round not found');
            const now = new Date();
            if (round.status !== 'open' || now < round.opensAt || now >= round.closesAt) {
                throw new errors_1.AppError('ROUND_NOT_OPEN', `Round ${(0, format_1.formatRoundNumber)(round.number)} is not accepting entries`, {
                    status: round.status,
                    closesAt: round.closesAt.toISOString(),
                });
            }
            await this.rg.assertCanParticipate(user.id, quote.total, tx, now);
            const firstSeq = round.entriesCount + 1;
            const lastSeq = round.entriesCount + entries;
            const firstEntryId = (0, rounds_service_1.entryCode)(round.number, firstSeq);
            const lastEntryId = (0, rounds_service_1.entryCode)(round.number, lastSeq);
            const reference = `EP-${round.number}-${String(firstSeq).padStart(5, '0')}-${String(lastSeq).padStart(5, '0')}`;
            const isNewParticipant = !(await tx.entry.findFirst({
                where: { roundId, userId: user.id },
                select: { id: true },
            }));
            const record = await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'entry_purchase',
                    status: 'completed',
                    reference,
                    amount: quote.entryAmount,
                    networkFee: quote.networkFee,
                    platformFee: quote.platformFee,
                    netAmount: quote.total,
                    direction: 'out',
                    description: `${entries} ${entries === 1 ? 'entry' : 'entries'} · Round ${(0, format_1.formatRoundNumber)(round.number)}`,
                    roundId,
                    completedAt: now,
                    metadata: {
                        entries,
                        firstEntryId,
                        lastEntryId,
                        statusDetail: `Entries ${quote.entryAmount} + platform fee ${quote.platformFee}`,
                    },
                },
            });
            const posting = await this.ledger.post(tx, {
                kind: 'entry_purchase',
                description: `${entries} entries in round ${(0, format_1.formatRoundNumber)(round.number)}`,
                reference,
                eventKey: `entry_purchase:${record.id}`,
                transactionId: record.id,
                roundId,
                lines: (0, posting_1.entryPurchaseLines)(user.id, roundId, quote),
                metadata: { entries, entryAmount: quote.entryAmount, platformFee: quote.platformFee },
            });
            await tx.entry.createMany({
                data: Array.from({ length: entries }, (_, i) => ({
                    roundId,
                    userId: user.id,
                    seq: firstSeq + i,
                    code: (0, rounds_service_1.entryCode)(round.number, firstSeq + i),
                    transactionId: record.id,
                })),
            });
            await tx.poolLedger.create({
                data: {
                    roundId,
                    postingId: posting.id,
                    userId: user.id,
                    kind: 'entry',
                    entryCount: entries,
                    amount: quote.entryAmount,
                },
            });
            await tx.feeLedger.create({
                data: {
                    postingId: posting.id,
                    userId: user.id,
                    roundId,
                    kind: 'platform_entry_fee',
                    entryCount: entries,
                    amount: quote.platformFee,
                },
            });
            const updated = await tx.round.update({
                where: { id: roundId },
                data: {
                    entriesCount: { increment: entries },
                    participantsCount: { increment: isNewParticipant ? 1 : 0 },
                    poolAmount: { increment: quote.entryAmount },
                    platformFees: { increment: quote.platformFee },
                },
            });
            await this.notifications.notify(tx, {
                userId: user.id,
                type: 'round.entries_confirmed',
                title: 'Entries confirmed',
                body: `${entries} entries in round ${(0, format_1.formatRoundNumber)(round.number)} (${firstEntryId} … ${lastEntryId}).`,
                data: { reference, roundNumber: round.number },
            });
            return {
                roundId,
                roundNumber: updated.number,
                entries,
                firstEntryId,
                lastEntryId,
                entryPrice: quote.entryPrice,
                entryAmount: quote.entryAmount,
                platformFee: quote.platformFee,
                networkFee: quote.networkFee,
                total: quote.total,
                reference,
                transactionId: record.id,
                postingId: posting.id,
                status: 'active',
                purchasedAt: now.toISOString(),
            };
        });
        if (!result.replayed) {
            const round = await this.prisma.round.findUniqueOrThrow({ where: { id: roundId } });
            this.events.emit({
                type: 'pool.update',
                roundId,
                roundNumber: round.number,
                status: round.status,
                entries: round.entriesCount,
                participants: round.participantsCount,
                poolBalance: round.poolAmount.toFixed(2),
                platformFees: round.platformFees.toFixed(2),
                closesAt: round.closesAt.toISOString(),
                lastPurchase: {
                    handle: user.handle,
                    entries,
                    amount: result.value.entryAmount,
                    at: result.value.purchasedAt,
                },
                isDemo: round.isDemo,
            });
        }
        return { ...result.value, replayed: result.replayed };
    }
};
exports.EntriesService = EntriesService;
exports.EntriesService = EntriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        idempotency_service_1.IdempotencyService,
        responsible_gaming_service_1.ResponsibleGamingService,
        notifications_service_1.NotificationsService,
        pool_events_service_1.PoolEventsService,
        feature_flags_service_1.FeatureFlagsService])
], EntriesService);
//# sourceMappingURL=entries.service.js.map