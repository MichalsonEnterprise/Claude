import { Injectable } from '@nestjs/common';
import { formatRoundNumber } from '@gp/shared/format';
import { MoneyDecimal, money, toUSDTString } from '@gp/shared/money';

import { AppError } from '../../common/errors';
import { usdt } from '../../common/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import { owedClaimLines } from '../ledger/posting';

const OPEN_WITHDRAWAL = ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'] as const;

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly idempotency: IdempotencyService,
  ) {}

  /** Balances from the ledger + human-readable breakdown of Locked / Pending / Owed. */
  async balances(userId: string) {
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
        const round = refundRounds.find((x) => x.id === r.roundId)!;
        return {
          label: `Refund — cancelled round ${formatRoundNumber(round.number)} (${r._count._all} entries)`,
          amount: toUSDTString(money(round.entryPrice.toFixed()).times(r._count._all)),
          reference: `round:${round.number}`,
        };
      }),
      ...prizes.map((p) => ({
        label: `Prize — round ${formatRoundNumber(p.winner.round.number)}`,
        amount: usdt(p.amount),
        reference: `prize:${p.id}`,
      })),
    ];
    const rewards = await this.prisma.transaction.findMany({
      where: { userId, type: 'reward', status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    owedItems.push(
      ...rewards.map((r) => ({
        label: r.description,
        amount: usdt(r.amount),
        reference: r.reference,
      })),
    );
    const itemized = owedItems.reduce((acc, i) => acc.plus(money(i.amount)), new MoneyDecimal(0));
    const otherOwed = money(b.owed).minus(itemized);
    if (otherOwed.gt(0)) {
      owedItems.push({
        label: 'Rewards owed',
        amount: toUSDTString(otherOwed),
        reference: 'rewards',
      });
    }
    return {
      ...b,
      breakdown: {
        ...b.breakdown,
        locked: [
          ...b.breakdown.lockedEntriesByRound.map((r) => ({
            label: `Active entries — round ${formatRoundNumber(r.roundNumber)}`,
            amount: r.amount,
            reference: `round:${r.roundNumber}`,
          })),
          ...withdrawals.map((w) => ({
            label: `Pending withdrawal WD-${w.number}`,
            amount: usdt(w.amount),
            reference: `WD-${w.number}`,
          })),
        ],
        pending: deposits.map((d) => ({
          label: `Deposit DP-${d.number} · ${d.confirmations} / ${d.requiredConfirmations} confirmations`,
          amount: usdt(d.amount),
          reference: `DP-${d.number}`,
        })),
        owed: owedItems,
      },
    };
  }

  /** Move everything owed (refunds, prizes, rewards) to Available — one balanced posting, idempotent. */
  async claimOwed(userId: string, idempotencyKey: string) {
    return this.idempotency.run(
      { scope: 'wallet.claim_owed', ownerId: userId, key: idempotencyKey, request: { userId } },
      async (tx) => {
        const owedAccount = { type: 'user_owed' as const, userId };
        const ids = await this.ledger.ensureAccounts(tx, [owedAccount]);
        const id = [...ids.values()][0]!;
        await tx.$queryRaw`SELECT id FROM ledger_accounts WHERE id = ${id}::uuid FOR UPDATE`;
        const owed = await this.ledger.balanceOf(owedAccount, tx);
        if (!money(owed).gt(0)) throw new AppError('BAD_REQUEST', 'Nothing to claim');
        const posting = await this.ledger.post(tx, {
          kind: 'owed_claim',
          description: 'Owed balance claimed to Available',
          lines: owedClaimLines(userId, owed),
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
      },
    );
  }

  async lifetime(userId: string) {
    const sumOf = async (type: 'deposit' | 'withdrawal' | 'reward', status: 'completed') => {
      const agg = await this.prisma.transaction.aggregate({
        where: { userId, type, status },
        _sum: { amount: true },
      });
      return usdt(agg._sum.amount);
    };
    const [deposits, withdrawals, rewards, entries, fees] = await Promise.all([
      sumOf('deposit', 'completed'),
      sumOf('withdrawal', 'completed'),
      sumOf('reward', 'completed'),
      this.prisma.entry.count({ where: { userId } }),
      this.prisma.feeLedger.aggregate({ where: { userId }, _sum: { amount: true } }),
    ]);
    return { deposits, withdrawals, entries, platformFeesPaid: usdt(fees._sum.amount), rewards };
  }
}
