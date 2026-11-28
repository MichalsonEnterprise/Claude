import { Injectable } from '@nestjs/common';
import { money, toUSDTString } from '@gp/shared/money';

import { usdt } from '../../common/money';
import { addDays } from '../../common/time';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

/** KPIs for the admin dashboard — money figures come from the ledger (never from UI projections). */
@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async kpis(now = new Date()) {
    const since = addDays(now, -30);
    const [
      totalUsers,
      activeUsers,
      deposits,
      withdrawals,
      fees30d,
      byType,
      poolLiabilities,
      owedPrizes,
      activeRounds,
      pendingWithdrawals,
      underReview,
      kycPending,
      amlOpen,
      reconciliation,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { OR: [{ lastLoginAt: { gte: since } }, { entries: { some: { createdAt: { gte: since } } } }] } }),
      this.prisma.deposit.aggregate({ where: { status: 'credited', creditedAt: { gte: since } }, _sum: { amount: true }, _count: true }),
      this.prisma.withdrawal.aggregate({ where: { status: 'confirmed', confirmedAt: { gte: since } }, _sum: { amount: true }, _count: true }),
      this.prisma.feeLedger.aggregate({ where: { createdAt: { gte: since } }, _sum: { amount: true, entryCount: true } }),
      this.ledger.balancesByType(),
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN rounds r ON r.id = a.round_id
        WHERE a.type = 'pool' AND r.status IN ('open', 'closed', 'drawing')`,
      this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
      this.prisma.round.count({ where: { status: { in: ['open', 'closed', 'drawing'] } } }),
      this.prisma.withdrawal.count({ where: { status: { in: ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'] } } }),
      this.prisma.withdrawal.count({ where: { status: 'under_review' } }),
      this.prisma.kycRecord.count({ where: { status: { in: ['pending', 'in_review'] } } }),
      this.prisma.amlAlert.count({ where: { status: { in: ['open', 'under_review', 'escalated'] } } }),
      this.ledger.reconcile(),
    ]);
    const bucket = (t: string) => money(byType[t] ?? '0');
    const customerLiabilities = bucket('user_available').plus(bucket('user_locked')).plus(bucket('user_pending')).plus(bucket('user_owed'));
    return {
      windowDays: 30,
      totalUsers,
      activeUsers,
      totalDeposits: usdt(deposits._sum.amount),
      depositsCount: deposits._count,
      totalWithdrawals: usdt(withdrawals._sum.amount),
      withdrawalsCount: withdrawals._count,
      platformFees: usdt(fees30d._sum.amount),
      qualifyingEntries: fees30d._sum.entryCount ?? 0,
      platformFeesAllTime: toUSDTString(bucket('fees')),
      poolLiabilities: toUSDTString(money(poolLiabilities[0]?.total ?? '0')),
      owedPrizes: usdt(owedPrizes._sum.amount),
      owedTotal: toUSDTString(bucket('user_owed')),
      customerLiabilities: toUSDTString(customerLiabilities),
      chainClearing: toUSDTString(bucket('chain_clearing')),
      operatorRevenue: toUSDTString(bucket('operator_revenue')),
      activeRounds,
      pendingWithdrawals,
      withdrawalsUnderReview: underReview,
      kycPending,
      amlOpenAlerts: amlOpen,
      ledger: reconciliation,
      generatedAt: now.toISOString(),
    };
  }
}
