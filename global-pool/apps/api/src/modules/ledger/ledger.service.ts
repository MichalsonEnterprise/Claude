import { Injectable } from '@nestjs/common';
import { Prisma, type LedgerPostingKind } from '@prisma/client';
import { MoneyDecimal, money, toUSDTString } from '@gp/shared/money';

import { AppError } from '../../common/errors';
import { PrismaService, type Db, type Tx } from '../../infra/prisma/prisma.service';
import {
  accountCode,
  isUserBucket,
  normalizePosting,
  type AccountRef,
  type NormalizedLine,
  type PostingLineInput,
} from './posting';

export interface PostInput {
  kind: LedgerPostingKind;
  description: string;
  lines: readonly PostingLineInput[];
  reference?: string | null;
  /** Unique business-event key: the same event can never be posted twice (DB unique constraint). */
  eventKey?: string | null;
  transactionId?: string | null;
  roundId?: string | null;
  metadata?: Prisma.InputJsonValue;
  isDemo?: boolean;
  /** Skip the non-negative check for user buckets (never used by player-facing flows). */
  allowNegativeUserBalances?: boolean;
}

export interface PostedPosting {
  id: string;
  lines: NormalizedLine[];
}

export interface UserBalances {
  currency: 'USDT';
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  breakdown: {
    /** USER_LOCKED account (pending withdrawals). */
    lockedWithdrawals: string;
    /** Stakes in rounds that are not settled / cancelled yet (POOL lines attributed to the user). */
    lockedEntries: string;
    lockedEntriesByRound: { roundId: string; roundNumber: number; amount: string }[];
  };
}

/**
 * The append-only double-entry ledger. All money movements go through `post()` inside the caller's DB transaction.
 * Rows are never updated or deleted (DB triggers enforce it) and every posting must sum to zero (validated here
 * and again by a deferred constraint trigger at COMMIT).
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Post a balanced journal entry. MUST be called inside a transaction (`tx`). */
  async post(tx: Tx, input: PostInput): Promise<PostedPosting> {
    const lines = normalizePosting(input.lines);
    const accounts = await this.ensureAccounts(
      tx,
      lines.map((l) => l.account),
    );

    // Lock every user bucket touched (deterministic order → no deadlocks) and check debits don't overdraw.
    const userAccountIds = [
      ...new Set(lines.filter((l) => isUserBucket(l.account)).map((l) => accounts.get(l.code)!)),
    ].sort();
    if (userAccountIds.length > 0) {
      await tx.$queryRaw`SELECT id FROM ledger_accounts WHERE id IN (${Prisma.join(
        userAccountIds.map((id) => Prisma.sql`${id}::uuid`),
      )}) ORDER BY id FOR UPDATE`;
    }
    if (!input.allowNegativeUserBalances) {
      const deltas = new Map<string, InstanceType<typeof MoneyDecimal>>();
      for (const l of lines) {
        if (!isUserBucket(l.account)) continue;
        const id = accounts.get(l.code)!;
        deltas.set(id, (deltas.get(id) ?? new MoneyDecimal(0)).plus(money(l.amount)));
      }
      const debited = [...deltas.entries()].filter(([, d]) => d.isNegative()).map(([id]) => id);
      if (debited.length > 0) {
        const balances = await this.balancesByAccountId(tx, debited);
        for (const id of debited) {
          const after = (balances.get(id) ?? new MoneyDecimal(0)).plus(deltas.get(id)!);
          if (after.isNegative()) {
            throw new AppError('INSUFFICIENT_FUNDS', 'Insufficient balance for this operation', {
              shortBy: toUSDTString(after.negated()),
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
              accountId: accounts.get(l.code)!,
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
  async ensureAccounts(db: Db, refs: readonly AccountRef[]): Promise<Map<string, string>> {
    const byCode = new Map<string, AccountRef>();
    for (const ref of refs) byCode.set(accountCode(ref), ref);
    const codes = [...byCode.keys()];
    await db.ledgerAccount.createMany({
      data: codes.map((code) => {
        const ref = byCode.get(code)!;
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

  async balancesByAccountId(
    db: Db,
    accountIds: readonly string[],
  ): Promise<Map<string, InstanceType<typeof MoneyDecimal>>> {
    if (accountIds.length === 0) return new Map();
    const rows = await db.$queryRaw<{ account_id: string; balance: string }[]>`
      SELECT account_id::text AS account_id, COALESCE(SUM(amount), 0)::text AS balance
      FROM ledger_entries
      WHERE account_id IN (${Prisma.join(accountIds.map((id) => Prisma.sql`${id}::uuid`))})
      GROUP BY account_id`;
    return new Map(rows.map((r) => [r.account_id, money(r.balance)]));
  }

  /** Balance of one account by code ('0.00' when it does not exist yet). */
  async balanceOf(ref: AccountRef, db: Db = this.prisma): Promise<string> {
    const rows = await db.$queryRaw<{ balance: string }[]>`
      SELECT COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id
      WHERE a.code = ${accountCode(ref)}`;
    return toUSDTString(money(rows[0]?.balance ?? '0'));
  }

  /** Player balances computed from the ledger: Available / Locked / Pending / Owed / Total. */
  async userBalances(userId: string, db: Db = this.prisma): Promise<UserBalances> {
    const buckets = await db.$queryRaw<{ type: string; balance: string }[]>`
      SELECT a.type::text AS type, COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE a.user_id = ${userId}::uuid
        AND a.type IN ('user_available', 'user_locked', 'user_pending', 'user_owed')
      GROUP BY a.type`;
    const stakes = await db.$queryRaw<{ round_id: string; number: number; amount: string }[]>`
      SELECT r.id::text AS round_id, r.number AS number, COALESCE(SUM(e.amount), 0)::text AS amount
      FROM ledger_entries e
        JOIN ledger_accounts a ON a.id = e.account_id
        JOIN rounds r ON r.id = a.round_id
      WHERE a.type = 'pool' AND e.user_id = ${userId}::uuid AND r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id, r.number
      HAVING COALESCE(SUM(e.amount), 0) <> 0
      ORDER BY r.number`;
    const get = (t: string) => money(buckets.find((b) => b.type === t)?.balance ?? '0');
    const available = get('user_available');
    const lockedWithdrawals = get('user_locked');
    const pending = get('user_pending');
    const owed = get('user_owed');
    const lockedEntries = stakes.reduce((acc, s) => acc.plus(money(s.amount)), new MoneyDecimal(0));
    const locked = lockedWithdrawals.plus(lockedEntries);
    return {
      currency: 'USDT',
      available: toUSDTString(available),
      locked: toUSDTString(locked),
      pending: toUSDTString(pending),
      owed: toUSDTString(owed),
      total: toUSDTString(available.plus(locked).plus(pending).plus(owed)),
      breakdown: {
        lockedWithdrawals: toUSDTString(lockedWithdrawals),
        lockedEntries: toUSDTString(lockedEntries),
        lockedEntriesByRound: stakes.map((s) => ({
          roundId: s.round_id,
          roundNumber: Number(s.number),
          amount: toUSDTString(money(s.amount)),
        })),
      },
    };
  }

  /** System-wide balances per account type (reporting / reconciliation). */
  async balancesByType(db: Db = this.prisma): Promise<Record<string, string>> {
    const rows = await db.$queryRaw<{ type: string; balance: string }[]>`
      SELECT a.type::text AS type, COALESCE(SUM(e.amount), 0)::text AS balance
      FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
      GROUP BY a.type`;
    return Object.fromEntries(rows.map((r) => [r.type, toUSDTString(money(r.balance))]));
  }

  /**
   * Reconciliation: the whole ledger sums to zero, every posting sums to zero, and every round's pool account equals
   * its pool_amount projection while open.
   */
  async reconcile(db: Db = this.prisma): Promise<{
    ok: boolean;
    ledgerTotal: string;
    unbalancedPostings: number;
    poolMismatches: { roundNumber: number; ledger: string; projection: string }[];
  }> {
    const [total] = await db.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(amount), 0)::text AS total FROM ledger_entries`;
    const [unbalanced] = await db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM (
        SELECT posting_id FROM ledger_entries GROUP BY posting_id HAVING SUM(amount) <> 0
      ) x`;
    const pools = await db.$queryRaw<{ number: number; ledger: string; projection: string }[]>`
      SELECT r.number AS number, COALESCE(SUM(e.amount), 0)::text AS ledger, r.pool_amount::text AS projection
      FROM rounds r
        JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
        LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id, r.number, r.pool_amount`;
    const poolMismatches = pools
      .filter((p) => !money(p.ledger).eq(money(p.projection)))
      .map((p) => ({
        roundNumber: Number(p.number),
        ledger: toUSDTString(money(p.ledger)),
        projection: toUSDTString(money(p.projection)),
      }));
    const ledgerTotal = toUSDTString(money(total?.total ?? '0'));
    const unbalancedPostings = Number(unbalanced?.n ?? 0n);
    return {
      ok: money(ledgerTotal).isZero() && unbalancedPostings === 0 && poolMismatches.length === 0,
      ledgerTotal,
      unbalancedPostings,
      poolMismatches,
    };
  }
}
