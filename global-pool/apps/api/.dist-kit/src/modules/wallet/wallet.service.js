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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const fees_1 = require("@gp/shared/fees");
const format_1 = require("@gp/shared/format");
const limits_1 = require("@gp/shared/limits");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const ledger_service_1 = require("../ledger/ledger.service");
const posting_1 = require("../ledger/posting");
const OPEN_WITHDRAWAL = ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'];
/** Same statuses the withdrawal service counts towards the daily limit. */
const COUNTS_TOWARDS_LIMIT = [...OPEN_WITHDRAWAL, 'confirmed'];
let WalletService = class WalletService {
    prisma;
    ledger;
    idempotency;
    flags;
    config;
    constructor(prisma, ledger, idempotency, flags, config) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.idempotency = idempotency;
        this.flags = flags;
        this.config = config;
    }
    /** Operational switches + withdrawal limits for the wallet screens (banners, limit meters). Read-only. */
    async status(userId) {
        const now = new Date();
        const dayStart = (0, time_1.periodStart)('day', now);
        const [depositsEnabled, withdrawalsEnabled, profile, today] = await Promise.all([
            this.flags.isEnabled('deposits.enabled'),
            this.flags.isEnabled('withdrawals.enabled'),
            this.prisma.userProfile.findUnique({ where: { userId }, select: { kycLevel: true } }),
            this.prisma.withdrawal.aggregate({
                where: { userId, createdAt: { gte: dayStart }, status: { in: [...COUNTS_TOWARDS_LIMIT] } },
                _sum: { amount: true },
            }),
        ]);
        const kycLevel = profile?.kycLevel ?? 'none';
        const dailyLimit = limits_1.DAILY_WITHDRAWAL_LIMIT[kycLevel];
        const used = (0, money_1.money)(today._sum.amount?.toFixed() ?? '0');
        return {
            depositsEnabled,
            withdrawalsEnabled,
            kycLevel,
            withdrawal: {
                dailyLimit,
                usedToday: (0, money_1.toUSDTString)(used),
                remainingToday: (0, money_1.toUSDTString)((0, money_1.max)((0, money_1.money)(dailyLimit).minus(used), 0)),
                resetsAt: (0, time_1.addDays)(dayStart, 1).toISOString(),
                minWithdrawal: limits_1.MIN_WITHDRAWAL,
                platformFee: fees_1.PLATFORM_WITHDRAWAL_FEE,
            },
            minDeposit: limits_1.MIN_DEPOSIT,
            newAddressCooldownHours: limits_1.NEW_ADDRESS_COOLDOWN_HOURS,
            depositConfirmations: this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM,
            serverTime: now.toISOString(),
        };
    }
    /** Balances from the ledger + human-readable breakdown of Locked / Pending / Owed. */
    async balances(userId) {
        const b = await this.ledger.userBalances(userId);
        const [withdrawals, deposits, prizes, refunds] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where: { userId, status: { in: [...OPEN_WITHDRAWAL] } },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.deposit.findMany({
                where: { userId, status: { in: ['detected', 'confirming'] } },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.prizeClaim.findMany({
                where: { userId, status: 'owed' },
                include: { winner: { include: { round: { select: { number: true } } } } },
            }),
            this.prisma.entry.groupBy({
                by: ['roundId'],
                where: { userId, status: 'refund_owed' },
                _count: { _all: true },
            }),
        ]);
        const refundRounds = await this.prisma.round.findMany({
            where: { id: { in: refunds.map((r) => r.roundId) } },
            select: { id: true, number: true, entryPrice: true },
        });
        const owedItems = [
            ...refunds.map((r) => {
                const round = refundRounds.find((x) => x.id === r.roundId);
                return {
                    label: `Refund — cancelled round ${(0, format_1.formatRoundNumber)(round.number)} (${r._count._all} entries)`,
                    amount: (0, money_1.toUSDTString)((0, money_1.money)(round.entryPrice.toFixed()).times(r._count._all)),
                    reference: `round:${round.number}`,
                };
            }),
            ...prizes.map((p) => ({
                label: `Prize — round ${(0, format_1.formatRoundNumber)(p.winner.round.number)}`,
                amount: (0, money_2.usdt)(p.amount),
                reference: `prize:${p.id}`,
            })),
        ];
        const rewards = await this.prisma.transaction.findMany({
            where: { userId, type: 'reward', status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });
        owedItems.push(...rewards.map((r) => ({
            label: r.description,
            amount: (0, money_2.usdt)(r.amount),
            reference: r.reference,
        })));
        const itemized = owedItems.reduce((acc, i) => acc.plus((0, money_1.money)(i.amount)), new money_1.MoneyDecimal(0));
        const otherOwed = (0, money_1.money)(b.owed).minus(itemized);
        if (otherOwed.gt(0)) {
            owedItems.push({
                label: 'Rewards owed',
                amount: (0, money_1.toUSDTString)(otherOwed),
                reference: 'rewards',
            });
        }
        return {
            ...b,
            breakdown: {
                ...b.breakdown,
                locked: [
                    ...b.breakdown.lockedEntriesByRound.map((r) => ({
                        label: `Active entries — round ${(0, format_1.formatRoundNumber)(r.roundNumber)}`,
                        amount: r.amount,
                        reference: `round:${r.roundNumber}`,
                    })),
                    ...withdrawals.map((w) => ({
                        label: `Pending withdrawal WD-${w.number}`,
                        amount: (0, money_2.usdt)(w.amount),
                        reference: `WD-${w.number}`,
                    })),
                ],
                pending: deposits.map((d) => ({
                    label: `Deposit DP-${d.number} · ${d.confirmations} / ${d.requiredConfirmations} confirmations`,
                    amount: (0, money_2.usdt)(d.amount),
                    reference: `DP-${d.number}`,
                })),
                owed: owedItems,
            },
        };
    }
    /** Move everything owed (refunds, prizes, rewards) to Available — one balanced posting, idempotent. */
    async claimOwed(userId, idempotencyKey) {
        return this.idempotency.run({ scope: 'wallet.claim_owed', ownerId: userId, key: idempotencyKey, request: { userId } }, async (tx) => {
            const owedAccount = { type: 'user_owed', userId };
            const ids = await this.ledger.ensureAccounts(tx, [owedAccount]);
            const id = [...ids.values()][0];
            await tx.$queryRaw `SELECT id FROM ledger_accounts WHERE id = ${id}::uuid FOR UPDATE`;
            const owed = await this.ledger.balanceOf(owedAccount, tx);
            if (!(0, money_1.money)(owed).gt(0))
                throw new errors_1.AppError('BAD_REQUEST', 'Nothing to claim');
            const posting = await this.ledger.post(tx, {
                kind: 'owed_claim',
                description: 'Owed balance claimed to Available',
                lines: (0, posting_1.owedClaimLines)(userId, owed),
                metadata: { amount: owed },
            });
            const now = new Date();
            await tx.prizeClaim.updateMany({
                where: { userId, status: 'owed' },
                data: { status: 'claimed', claimedAt: now },
            });
            await tx.entry.updateMany({
                where: { userId, status: 'refund_owed' },
                data: { status: 'refunded' },
            });
            await tx.transaction.updateMany({
                where: { userId, type: { in: ['prize', 'refund', 'reward'] }, status: 'pending' },
                data: { status: 'completed', completedAt: now },
            });
            return { claimed: owed, postingId: posting.id, claimedAt: now.toISOString() };
        });
    }
    async lifetime(userId) {
        const sumOf = async (type, status) => {
            const agg = await this.prisma.transaction.aggregate({
                where: { userId, type, status },
                _sum: { amount: true },
            });
            return (0, money_2.usdt)(agg._sum.amount);
        };
        const [deposits, withdrawals, rewards, entries, fees] = await Promise.all([
            sumOf('deposit', 'completed'),
            sumOf('withdrawal', 'completed'),
            sumOf('reward', 'completed'),
            this.prisma.entry.count({ where: { userId } }),
            this.prisma.feeLedger.aggregate({ where: { userId }, _sum: { amount: true } }),
        ]);
        return { deposits, withdrawals, entries, platformFeesPaid: (0, money_2.usdt)(fees._sum.amount), rewards };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        idempotency_service_1.IdempotencyService,
        feature_flags_service_1.FeatureFlagsService,
        app_config_1.AppConfig])
], WalletService);
//# sourceMappingURL=wallet.service.js.map