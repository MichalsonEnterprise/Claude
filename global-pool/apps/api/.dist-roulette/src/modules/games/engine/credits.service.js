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
exports.CreditsService = void 0;
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../../common/errors");
const time_1 = require("../../../common/time");
const prisma_service_1 = require("../../../infra/prisma/prisma.service");
const audit_service_1 = require("../../audit/audit.service");
const responsible_gaming_service_1 = require("../../compliance/responsible-gaming.service");
const games_common_1 = require("./games-common");
/**
 * DEMO credits: the per-user PLAY balance (no cash value). It is never bought, withdrawn or converted to / from
 * USDT and never touches the USDT ledger, wallet balances, pool or fee ledgers — this service only reads and writes
 * demo_credit_accounts / demo_credit_entries. Every change is one row lock + one entry with the running balance.
 */
let CreditsService = class CreditsService {
    prisma;
    audit;
    rg;
    clock;
    constructor(prisma, audit, rg, clock) {
        this.prisma = prisma;
        this.audit = audit;
        this.rg = rg;
        this.clock = clock;
    }
    /** Creates the account (1,000.00 opening grant) on first use. Idempotent and race-safe. */
    async ensureAccount(tx, userId) {
        const inserted = await tx.$queryRaw `
      INSERT INTO demo_credit_accounts (id, user_id, balance, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${fair_1.DEMO_CREDITS_START}::numeric, now(), now())
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id::text AS id`;
        const row = inserted[0];
        if (row) {
            await tx.demoCreditEntry.create({
                data: {
                    accountId: row.id,
                    userId,
                    kind: 'opening',
                    amount: fair_1.DEMO_CREDITS_START,
                    balanceAfter: fair_1.DEMO_CREDITS_START,
                },
            });
        }
    }
    /** Row-locks the account (FOR UPDATE) and returns it. Always lock the seed pair / round BEFORE the account. */
    async lock(tx, userId) {
        await this.ensureAccount(tx, userId);
        const rows = await tx.$queryRaw `
      SELECT id::text AS id, balance::text AS balance, last_reset_at
      FROM demo_credit_accounts WHERE user_id = ${userId}::uuid FOR UPDATE`;
        return rows[0];
    }
    /** Takes a stake from the play balance (422 INSUFFICIENT_FUNDS when it is not covered). Returns the new balance. */
    async debit(tx, userId, amount, ref) {
        const acc = await this.lock(tx, userId);
        const value = (0, money_1.money)(amount);
        if (value.lte(0))
            return (0, games_common_1.credits)(acc.balance);
        if ((0, money_1.money)(acc.balance).lt(value)) {
            throw new errors_1.AppError('INSUFFICIENT_FUNDS', 'Not enough DEMO credits for this bet', {
                currency: games_common_1.DEMO.currency,
                available: (0, games_common_1.credits)(acc.balance),
                required: (0, games_common_1.credits)(value.toFixed()),
                shortBy: (0, games_common_1.credits)(value.minus((0, money_1.money)(acc.balance)).toFixed()),
            });
        }
        return this.move(tx, userId, acc, value.negated().toFixed(), 'stake', ref);
    }
    /** Pays a return into the play balance (no-op for 0). Returns the new balance. */
    async credit(tx, userId, amount, ref) {
        const acc = await this.lock(tx, userId);
        if ((0, money_1.money)(amount).lte(0))
            return (0, games_common_1.credits)(acc.balance);
        return this.move(tx, userId, acc, (0, money_1.money)(amount).toFixed(), 'payout', ref);
    }
    async move(tx, userId, acc, signed, kind, ref) {
        const after = (0, money_1.money)(acc.balance).plus((0, money_1.money)(signed));
        await tx.demoCreditAccount.update({
            where: { id: acc.id },
            data: { balance: after.toFixed() },
        });
        await tx.demoCreditEntry.create({
            data: {
                accountId: acc.id,
                userId,
                kind,
                amount: signed,
                balanceAfter: after.toFixed(),
                gameSlug: ref.gameSlug,
                betId: ref.betId ?? null,
            },
        });
        acc.balance = after.toFixed();
        return (0, games_common_1.credits)(after.toFixed());
    }
    async balance(userId) {
        await this.prisma.tx((tx) => this.ensureAccount(tx, userId));
        const acc = await this.prisma.demoCreditAccount.findUniqueOrThrow({ where: { userId } });
        return (0, games_common_1.credits)(acc.balance);
    }
    /** GET /games/credits — balance, reset availability and the DEMO session summary for the RG/Session Bar. */
    async view(userId) {
        await this.prisma.tx((tx) => this.ensureAccount(tx, userId));
        const now = this.clock.now();
        const acc = await this.prisma.demoCreditAccount.findUniqueOrThrow({ where: { userId } });
        const resetAt = acc.lastResetAt
            ? new Date(acc.lastResetAt.getTime() + fair_1.DEMO_CREDITS_RESET_COOLDOWN_MINUTES * 60_000)
            : null;
        return {
            ...games_common_1.DEMO,
            balance: (0, games_common_1.credits)(acc.balance),
            startingBalance: fair_1.DEMO_CREDITS_START,
            fee: fair_1.GAME_BET_FEE,
            reset: {
                to: fair_1.DEMO_CREDITS_START,
                cooldownMinutes: fair_1.DEMO_CREDITS_RESET_COOLDOWN_MINUTES,
                lastResetAt: acc.lastResetAt?.toISOString() ?? null,
                availableAt: resetAt && resetAt > now ? resetAt.toISOString() : now.toISOString(),
                available: !resetAt || resetAt <= now,
            },
            session: await this.session(userId),
            notice: 'DEMO credits have no cash value. They cannot be bought, withdrawn or exchanged for USDT or anything else.',
        };
    }
    /** DEMO play since the RG session started (session net shown in the RG/Session Bar) and since 00:00 UTC. */
    async session(userId) {
        const now = this.clock.now();
        const rg = await this.rg.session(userId, now);
        const since = rg.startedAt ? new Date(rg.startedAt) : null;
        const session = since
            ? await this.playSince(userId, since)
            : { bets: 0, wagered: '0.00', returned: '0.00', net: '0.00' };
        return {
            startedAt: rg.startedAt,
            durationSeconds: rg.durationSeconds,
            ...session,
            today: await this.playSince(userId, (0, time_1.periodStart)('day', now)),
            realityCheck: rg.realityCheck,
            blockedReason: rg.blockedReason,
            currency: games_common_1.DEMO.currency,
        };
    }
    /** Bets, wagered, returned and net (DEMO credits) since `since`. */
    async playSince(userId, since) {
        const where = { userId, createdAt: { gte: since } };
        const [stakes, payouts, bets] = await Promise.all([
            this.prisma.demoCreditEntry.aggregate({
                where: { ...where, kind: 'stake' },
                _sum: { amount: true },
            }),
            this.prisma.demoCreditEntry.aggregate({
                where: { ...where, kind: 'payout' },
                _sum: { amount: true },
            }),
            this.prisma.demoCreditEntry.count({ where: { ...where, kind: 'stake' } }),
        ]);
        const staked = (0, money_1.money)(stakes._sum.amount?.toFixed() ?? '0').negated();
        const paid = (0, money_1.money)(payouts._sum.amount?.toFixed() ?? '0');
        return {
            bets,
            wagered: (0, games_common_1.credits)(staked.toFixed()),
            returned: (0, games_common_1.credits)(paid.toFixed()),
            net: (0, games_common_1.credits)(paid.minus(staked).toFixed()),
        };
    }
    /** POST /games/credits/reset — back to 1,000.00 at most once per hour; audited. */
    async reset(userId, meta) {
        const now = this.clock.now();
        const result = await this.prisma.tx(async (tx) => {
            const acc = await this.lock(tx, userId);
            if (acc.last_reset_at) {
                const next = new Date(acc.last_reset_at.getTime() + fair_1.DEMO_CREDITS_RESET_COOLDOWN_MINUTES * 60_000);
                if (next > now) {
                    throw new errors_1.AppError('RATE_LIMITED', 'DEMO credits can be reset once per hour', {
                        availableAt: next.toISOString(),
                    });
                }
            }
            const open = (await tx.gameResult.count({ where: { userId, status: 'active' } })) +
                (await tx.crashBet.count({ where: { userId, status: 'active' } }));
            if (open > 0) {
                throw new errors_1.AppError('CONFLICT', 'Finish your open rounds before resetting DEMO credits', {
                    reason: 'ROUND_IN_PROGRESS',
                });
            }
            const before = (0, games_common_1.credits)(acc.balance);
            const delta = (0, money_1.money)(fair_1.DEMO_CREDITS_START).minus((0, money_1.money)(acc.balance));
            await tx.demoCreditAccount.update({
                where: { id: acc.id },
                data: { balance: fair_1.DEMO_CREDITS_START, lastResetAt: now, resets: { increment: 1 } },
            });
            await tx.demoCreditEntry.create({
                data: {
                    accountId: acc.id,
                    userId,
                    kind: 'reset',
                    amount: delta.toFixed(),
                    balanceAfter: fair_1.DEMO_CREDITS_START,
                },
            });
            await this.audit.record({
                actorType: 'user',
                actorId: userId,
                action: 'user.games.demo_credits_reset',
                targetType: 'demo_credit_account',
                targetId: acc.id,
                metadata: {
                    from: before,
                    to: fair_1.DEMO_CREDITS_START,
                    currency: games_common_1.DEMO.currency,
                    cashValue: false,
                },
                ip: meta.ip,
                userAgent: meta.userAgent,
                requestId: meta.requestId,
            }, tx);
            return { before };
        });
        return { ...(await this.view(userId)), resetFrom: result.before };
    }
};
exports.CreditsService = CreditsService;
exports.CreditsService = CreditsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        responsible_gaming_service_1.ResponsibleGamingService,
        games_common_1.GameClock])
], CreditsService);
//# sourceMappingURL=credits.service.js.map