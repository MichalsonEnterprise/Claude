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
exports.LedgerService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../common/errors");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const posting_1 = require("./posting");
/**
 * The append-only double-entry ledger. All money movements go through `post()` inside the caller's DB transaction.
 * Rows are never updated or deleted (DB triggers enforce it) and every posting must sum to zero (validated here
 * and again by a deferred constraint trigger at COMMIT).
 */
let LedgerService = class LedgerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Post a balanced journal entry. MUST be called inside a transaction (`tx`). */
    async post(tx, input) {
        const lines = (0, posting_1.normalizePosting)(input.lines);
        const accounts = await this.ensureAccounts(tx, lines.map((l) => l.account));
        // Lock every user bucket touched (deterministic order → no deadlocks) and check debits don't overdraw.
        const userAccountIds = [
            ...new Set(lines.filter((l) => (0, posting_1.isUserBucket)(l.account)).map((l) => accounts.get(l.code))),
        ].sort();
        if (userAccountIds.length > 0) {
            await tx.$queryRaw `SELECT id FROM ledger_accounts WHERE id IN (${client_1.Prisma.join(userAccountIds.map((id) => client_1.Prisma.sql `${id}::uuid`))}) ORDER BY id FOR UPDATE`;
        }
        if (!input.allowNegativeUserBalances) {
            const deltas = new Map();
            for (const l of lines) {
                if (!(0, posting_1.isUserBucket)(l.account))
                    continue;
                const id = accounts.get(l.code);
                deltas.set(id, (deltas.get(id) ?? new money_1.MoneyDecimal(0)).plus((0, money_1.money)(l.amount)));
            }
            const debited = [...deltas.entries()].filter(([, d]) => d.isNegative()).map(([id]) => id);
            if (debited.length > 0) {
                const balances = await this.balancesByAccountId(tx, debited);
                for (const id of debited) {
                    const after = (balances.get(id) ?? new money_1.MoneyDecimal(0)).plus(deltas.get(id));
                    if (after.isNegative()) {
                        throw new errors_1.AppError('INSUFFICIENT_FUNDS', 'Insufficient balance for this operation', {
                            shortBy: (0, money_1.toUSDTString)(after.negated()),
                        });
                    }
                }
            }
        }
        const posting = await tx.ledgerPosting.create({
            data: {
                kind: input.kind,
                description: input.description,
                reference: input.reference ?? null,
                eventKey: input.eventKey ?? null,
                transactionId: input.transactionId ?? null,
                roundId: input.roundId ?? null,
                metadata: input.metadata ?? {},
                isDemo: input.isDemo ?? false,
                entries: {
                    createMany: {
                        data: lines.map((l) => ({
                            accountId: accounts.get(l.code),
                            amount: l.amount,
                            userId: l.userId,
                        })),
                    },
                },
            },
            select: { id: true },
        });
        return { id: posting.id, lines };
    }
    /** Create missing accounts (idempotent) and return code → id. */
    async ensureAccounts(db, refs) {
        const byCode = new Map();
        for (const ref of refs)
            byCode.set((0, posting_1.accountCode)(ref), ref);
        const codes = [...byCode.keys()];
        await db.ledgerAccount.createMany({
            data: codes.map((code) => {
                const ref = byCode.get(code);
                return {
                    code,
                    type: ref.type,
                    userId: 'userId' in ref ? ref.userId : null,
                    roundId: ref.type === 'pool' ? ref.roundId : null,
                    network: ref.type === 'chain_clearing' ? ref.network : null,
                };
            }),
            skipDuplicates: true,
        });
        const rows = await db.ledgerAccount.findMany({
            where: { code: { in: codes } },
            select: { id: true, code: true },
        });
        return new Map(rows.map((r) => [r.code, r.id]));
    }
    async balancesByAccountId(db, accountIds) {
        if (accountIds.length === 0)
            return new Map();
        const rows = await db.$queryRaw `
      SELECT account_id::text AS account_id, COALESCE(SUM(amount), 0)::text AS balance
      FROM ledger_entries
      WHERE account_id IN (${client_1.Prisma.join(accountIds.map((id) => client_1.Prisma.sql `${id}::uuid`))})
      GROUP BY account_id`;
        return new Map(rows.map((r) => [r.account_id, (0, money_1.money)(r.balance)]));
    }
    /** Balance of one account by code ('0.00' when it does not exist yet). */
    async balanceOf(ref, db = this.prisma) {
        const rows = await db.$queryRaw `
      SELECT COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id
      WHERE a.code = ${(0, posting_1.accountCode)(ref)}`;
        return (0, money_1.toUSDTString)((0, money_1.money)(rows[0]?.balance ?? '0'));
    }
    /** Player balances computed from the ledger: Available / Locked / Pending / Owed / Total. */
    async userBalances(userId, db = this.prisma) {
        const buckets = await db.$queryRaw `
      SELECT a.type::text AS type, COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE a.user_id = ${userId}::uuid
        AND a.type IN ('user_available', 'user_locked', 'user_pending', 'user_owed')
      GROUP BY a.type`;
        const stakes = await db.$queryRaw `
      SELECT r.id::text AS round_id, r.number AS number, COALESCE(SUM(e.amount), 0)::text AS amount
      FROM ledger_entries e
        JOIN ledger_accounts a ON a.id = e.account_id
        JOIN rounds r ON r.id = a.round_id
      WHERE a.type = 'pool' AND e.user_id = ${userId}::uuid AND r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id, r.number
      HAVING COALESCE(SUM(e.amount), 0) <> 0
      ORDER BY r.number`;
        const get = (t) => (0, money_1.money)(buckets.find((b) => b.type === t)?.balance ?? '0');
        const available = get('user_available');
        const lockedWithdrawals = get('user_locked');
        const pending = get('user_pending');
        const owed = get('user_owed');
        const lockedEntries = stakes.reduce((acc, s) => acc.plus((0, money_1.money)(s.amount)), new money_1.MoneyDecimal(0));
        const locked = lockedWithdrawals.plus(lockedEntries);
        return {
            currency: 'USDT',
            available: (0, money_1.toUSDTString)(available),
            locked: (0, money_1.toUSDTString)(locked),
            pending: (0, money_1.toUSDTString)(pending),
            owed: (0, money_1.toUSDTString)(owed),
            total: (0, money_1.toUSDTString)(available.plus(locked).plus(pending).plus(owed)),
            breakdown: {
                lockedWithdrawals: (0, money_1.toUSDTString)(lockedWithdrawals),
                lockedEntries: (0, money_1.toUSDTString)(lockedEntries),
                lockedEntriesByRound: stakes.map((s) => ({
                    roundId: s.round_id,
                    roundNumber: Number(s.number),
                    amount: (0, money_1.toUSDTString)((0, money_1.money)(s.amount)),
                })),
            },
        };
    }
    /** System-wide balances per account type (reporting / reconciliation). */
    async balancesByType(db = this.prisma) {
        const rows = await db.$queryRaw `
      SELECT a.type::text AS type, COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
      GROUP BY a.type`;
        return Object.fromEntries(rows.map((r) => [r.type, (0, money_1.toUSDTString)((0, money_1.money)(r.balance))]));
    }
    /**
     * Reconciliation: the whole ledger sums to zero, every posting sums to zero, and every round's pool account equals
     * its pool_amount projection while open.
     */
    async reconcile(db = this.prisma) {
        const [total] = await db.$queryRaw `
      SELECT COALESCE(SUM(amount), 0)::text AS total FROM ledger_entries`;
        const [unbalanced] = await db.$queryRaw `
      SELECT count(*)::bigint AS n FROM (
        SELECT posting_id FROM ledger_entries GROUP BY posting_id HAVING SUM(amount) <> 0
      ) x`;
        const pools = await db.$queryRaw `
      SELECT r.number AS number, COALESCE(SUM(e.amount), 0)::text AS ledger, r.pool_amount::text AS projection
      FROM rounds r
        JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
        LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id, r.number, r.pool_amount`;
        const poolMismatches = pools
            .filter((p) => !(0, money_1.money)(p.ledger).eq((0, money_1.money)(p.projection)))
            .map((p) => ({
            roundNumber: Number(p.number),
            ledger: (0, money_1.toUSDTString)((0, money_1.money)(p.ledger)),
            projection: (0, money_1.toUSDTString)((0, money_1.money)(p.projection)),
        }));
        const ledgerTotal = (0, money_1.toUSDTString)((0, money_1.money)(total?.total ?? '0'));
        const unbalancedPostings = Number(unbalanced?.n ?? 0n);
        return {
            ok: (0, money_1.money)(ledgerTotal).isZero() && unbalancedPostings === 0 && poolMismatches.length === 0,
            ledgerTotal,
            unbalancedPostings,
            poolMismatches,
        };
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LedgerService);
//# sourceMappingURL=ledger.service.js.map