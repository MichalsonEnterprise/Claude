import { Injectable } from '@nestjs/common';
import type { RoundStatus } from '@prisma/client';
import { MoneyDecimal, money } from '@gp/shared/money';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';

import { usdt } from '../../common/money';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** What happened to a purchase's entries (per round — a player may buy several times in one round). */
export type EntryResultKind =
  'in_draw' | 'drawing' | 'won' | 'not_selected' | 'refund_owed' | 'refunded';

export interface EntryHistoryItem {
  reference: string;
  transactionId: string;
  roundId: string;
  roundNumber: number;
  roundStatus: RoundStatus;
  roundClosesAt: string;
  entries: number;
  firstEntryId: string | null;
  lastEntryId: string | null;
  entryAmount: string;
  platformFee: string;
  networkFee: string;
  total: string;
  purchasedAt: string;
  result: {
    kind: EntryResultKind;
    /** Σ prizes won by THIS purchase's entries (won only). */
    prize: string | null;
    winningEntryIds: string[];
    /** Stake of THIS purchase refunded to Owed for a cancelled round (platform fees are not refunded — docs/API.md). */
    refund: string | null;
  };
  isDemo: boolean;
}

export interface EntryHistorySummary {
  purchases: number;
  /** Entries in rounds that were not cancelled. */
  qualifyingEntries: number;
  /** Entries in rounds that are open, closed or drawing. */
  activeEntries: number;
  platformFeesPaid: string;
  prizesWon: string;
  refundOwed: string;
}

const ACTIVE: RoundStatus[] = ['open', 'closed', 'drawing'];

/**
 * Player's Global Pool entry history (GP-10): one row per purchase with what it cost (entries + separate platform
 * fee) and what happened to it. Read-only projection over transactions / entries / winners — never a balance source.
 */
@Injectable()
export class EntryHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async history(userId: string, query: PaginationQuery) {
    const where = { userId, type: 'entry_purchase' as const, roundId: { not: null } };
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

    const roundIds = [...new Set(rows.map((r) => r.roundId!))];
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
    const ofPurchase = (
      t: { id: string; roundId: string | null },
      txId: string | null | undefined,
      roundId: string,
    ) => (txId ? txId === t.id : roundId === t.roundId);

    const items: EntryHistoryItem[] = rows.map((t) => {
      const round = t.round!;
      const meta = (t.metadata ?? {}) as {
        entries?: number;
        firstEntryId?: string;
        lastEntryId?: string;
      };
      const entries = Number(meta.entries ?? 0);
      const mine = winners.filter((w) => ofPurchase(t, w.entry?.transactionId, w.roundId));
      const refunds = refundEntries.filter((g) => ofPurchase(t, g.transactionId, g.roundId));
      const countOf = (status: 'refund_owed' | 'refunded') =>
        refunds.filter((g) => g.status === status).reduce((n, g) => n + g._count._all, 0);
      const owed = countOf('refund_owed');
      const back = countOf('refunded');
      const price = money(round.entryPrice.toFixed());
      let kind: EntryResultKind;
      if (round.status === 'open' || round.status === 'scheduled') kind = 'in_draw';
      else if (round.status === 'closed' || round.status === 'drawing') kind = 'drawing';
      else if (round.status === 'settled') kind = mine.length > 0 ? 'won' : 'not_selected';
      else kind = owed > 0 || back === 0 ? 'refund_owed' : 'refunded';
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
        entryAmount: usdt(t.amount),
        platformFee: usdt(t.platformFee),
        networkFee: usdt(t.networkFee ?? 0),
        total: usdt(t.netAmount),
        purchasedAt: t.createdAt.toISOString(),
        result: {
          kind,
          prize:
            kind === 'won'
              ? usdt(mine.reduce((a, w) => a.plus(money(w.amount.toFixed())), new MoneyDecimal(0)))
              : null,
          winningEntryIds: mine.map((w) => w.entry?.code).filter((c): c is string => Boolean(c)),
          refund:
            kind === 'refund_owed' || kind === 'refunded'
              ? usdt(price.times(kind === 'refund_owed' ? owed || entries : back))
              : null,
        },
        isDemo: t.isDemo,
      };
    });

    return { summary, ...paginate(items, total, query) };
  }

  async summary(userId: string): Promise<EntryHistorySummary> {
    const [purchases, fees, byStatus, prizes, owed] = await Promise.all([
      this.prisma.transaction.count({ where: { userId, type: 'entry_purchase' } }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'entry_purchase' },
        _sum: { platformFee: true },
      }),
      this.prisma.$queryRaw<{ status: RoundStatus; n: bigint }[]>`
        SELECT r.status AS status, COUNT(*)::bigint AS n
        FROM entries e JOIN rounds r ON r.id = e.round_id
        WHERE e.user_id = ${userId}::uuid
        GROUP BY r.status`,
      this.prisma.winner.aggregate({ where: { userId }, _sum: { amount: true } }),
      this.prisma.$queryRaw<{ amount: string | null }[]>`
        SELECT SUM(r.entry_price)::text AS amount
        FROM entries e JOIN rounds r ON r.id = e.round_id
        WHERE e.user_id = ${userId}::uuid AND e.status = 'refund_owed'`,
    ]);
    const count = (pred: (s: RoundStatus) => boolean) =>
      byStatus.filter((r) => pred(r.status)).reduce((n, r) => n + Number(r.n), 0);
    return {
      purchases,
      qualifyingEntries: count((s) => s !== 'cancelled'),
      activeEntries: count((s) => ACTIVE.includes(s)),
      platformFeesPaid: usdt(fees._sum.platformFee ?? 0),
      prizesWon: usdt(prizes._sum.amount ?? 0),
      refundOwed: usdt(owed[0]?.amount ?? 0),
    };
  }
}
