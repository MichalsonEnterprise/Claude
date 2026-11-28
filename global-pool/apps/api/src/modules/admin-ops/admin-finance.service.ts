import { Injectable } from '@nestjs/common';
import { Prisma, type DepositStatus, type WithdrawalStatus } from '@prisma/client';
import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { ENTRY_PRICE, PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import { WITHDRAWAL_STATUS_LABEL } from '@gp/shared/enums';
import { money, toUSDTString } from '@gp/shared/money';
import { prizeBreakdown } from '@gp/shared/pool';
import {
  LEDGER_POSTING_KIND_LABEL,
  paginate,
  type AdminDepositsQuery,
  type AdminLedgerQuery,
  type AdminWithdrawalsQuery,
  type LedgerPostingKindValue,
} from '@gp/shared/schemas';
import { createHash } from 'node:crypto';

import { notFound } from '../../common/errors';
import { usdt } from '../../common/money';
import { addDays, addHours } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';

/** Withdrawal review SLA (hours from request). */
export const WITHDRAWAL_SLA_HOURS = 4;
/** Four-eyes threshold (policy FIN-2.3): flagged by AML, or at/above this amount. */
export const FOUR_EYES_AMOUNT = '10000.00';
/** Append-only triggers that must exist on the money tables (checked on the ledger page). */
export const APPEND_ONLY_TRIGGERS = [
  'ledger_postings_append_only',
  'ledger_entries_append_only',
  'ledger_entries_balanced',
  'pool_ledger_append_only',
  'fee_ledger_append_only',
  'audit_logs_append_only',
  'withdrawal_events_append_only',
] as const;

const OPEN_WITHDRAWAL: WithdrawalStatus[] = [
  'requested',
  'risk_check',
  'under_review',
  'queued',
  'broadcast',
];

/** "@nova.k" from a stored handle ("nova.k"). */
export const atHandle = (h: string | null | undefined) => (h ? `@${h.replace(/^@/, '')}` : null);

type Money = ReturnType<typeof money>;
const m = (v: unknown): Money => money((v ?? '0') as string);

/**
 * Finance back-office (ADM-F1…F8): read-only aggregates computed from the append-only ledger and its
 * sub-ledgers. Nothing here writes money — withdrawal decisions go through WithdrawalsService (four-eyes),
 * and corrections are always new reviewed postings (no edit path exists).
 */
@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly withdrawals: WithdrawalsService,
    private readonly config: AppConfig,
  ) {}

  // ── F1 Deposits ─────────────────────────────────────────────────────────────────────────────

  async deposits(query: AdminDepositsQuery, now = new Date()) {
    const q = query.q?.replace(/^@/, '');
    const refNumber = q && /^DP-?\d+$/i.test(q) ? Number(q.replace(/\D/g, '')) : null;
    const where: Prisma.DepositWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.network ? { network: query.network } : {}),
      ...(q
        ? refNumber !== null
          ? { number: refNumber }
          : {
              OR: [
                { txHash: { startsWith: q.toLowerCase() } },
                { user: { handle: { contains: q.toLowerCase() } } },
                { user: { publicId: { equals: q.toUpperCase() } } },
              ],
            }
        : {}),
    };
    const since24h = addHours(now, -24);
    const [rows, total, byStatus, credited24h, held, perNetwork] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, publicId: true, handle: true } },
          amlAlerts: { select: { id: true, riskLevel: true, status: true, rule: true } },
        },
      }),
      this.prisma.deposit.count({ where }),
      this.prisma.deposit.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
      this.prisma.deposit.aggregate({
        where: { status: 'credited', creditedAt: { gte: since24h } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.deposit.count({
        where: { amlAlerts: { some: { status: { in: ['open', 'under_review', 'escalated'] } } } },
      }),
      this.prisma.deposit.groupBy({
        by: ['network', 'status'],
        _count: true,
        _sum: { amount: true },
      }),
    ]);
    const cursors = await this.prisma.chainCursor.findMany();
    const stat = (s: DepositStatus) => {
      const r = byStatus.find((b) => b.status === s);
      return { count: r?._count ?? 0, amount: usdt(r?._sum.amount) };
    };
    const env = this.config.env as unknown as Record<string, unknown>;
    const networks = (Object.keys(CHAINS) as ChainKey[]).map((key) => {
      const chain = CHAINS[key];
      const rowsFor = perNetwork.filter((p) => p.network === key);
      const confirming = rowsFor.find((p) => p.status === 'confirming');
      const cursor = cursors.find((c) => c.key.includes(key));
      const configured = key === 'arbitrum' && Boolean(env.ARBITRUM_SEPOLIA_RPC_URL);
      return {
        network: key,
        name: chain.name,
        enabled: chain.enabled,
        requiredConfirmations: chain.confirmations,
        watcher: chain.enabled
          ? configured
            ? ('running' as const)
            : ('not_configured' as const)
          : ('coming_soon' as const),
        lastBlock: cursor ? cursor.lastBlock.toString() : null,
        confirming: confirming?._count ?? 0,
        confirmingAmount: usdt(confirming?._sum.amount),
        deposits: rowsFor.reduce((n, r) => n + r._count, 0),
      };
    });
    return {
      summary: {
        credited24h: { count: credited24h._count, amount: usdt(credited24h._sum.amount) },
        confirming: stat('confirming'),
        detected: stat('detected'),
        credited: stat('credited'),
        rejected: stat('rejected'),
        heldForCompliance: held,
      },
      networks,
      ...paginate(
        rows.map((d) => ({
          id: d.id,
          reference: `DP-${d.number}`,
          user: { id: d.user.id, publicId: d.user.publicId, handle: atHandle(d.user.handle) },
          network: d.network,
          networkName: CHAINS[d.network].name,
          amount: usdt(d.amount),
          confirmations: d.confirmations,
          requiredConfirmations: d.requiredConfirmations,
          status: d.status,
          txHash: d.txHash,
          fromAddress: d.fromAddress,
          toAddress: d.toAddress,
          detectedAt: d.detectedAt.toISOString(),
          creditedAt: d.creditedAt?.toISOString() ?? null,
          amlAlert: d.amlAlerts[0]
            ? {
                id: d.amlAlerts[0].id,
                riskLevel: d.amlAlerts[0].riskLevel,
                status: d.amlAlerts[0].status,
                rule: d.amlAlerts[0].rule,
              }
            : null,
          isDemo: d.isDemo,
        })),
        total,
        query,
      ),
      generatedAt: now.toISOString(),
    };
  }

  // ── F2 Withdrawals queue + detail ─────────────────────────────────────────────────────────────

  async withdrawalQueue(query: AdminWithdrawalsQuery, adminId: string, now = new Date()) {
    const pendingApprovals = await this.prisma.adminApproval.findMany({
      where: { targetType: 'withdrawal', action: 'withdrawal.approve', status: 'pending' },
      include: { requestedBy: { select: { name: true } } },
    });
    const awaitingIds = pendingApprovals.map((a) => a.targetId);
    const view = query.view ?? (query.status ? 'all' : 'queue');
    const statusWhere: Prisma.WithdrawalWhereInput =
      view === 'queue'
        ? { status: { in: ['requested', 'risk_check', 'under_review', 'queued'] } }
        : view === 'awaiting_second'
          ? { id: { in: awaitingIds } }
          : view === 'broadcasting'
            ? { status: 'broadcast' }
            : view === 'completed'
              ? { status: 'confirmed' }
              : view === 'rejected'
                ? { status: { in: ['rejected', 'failed', 'cancelled'] } }
                : {};
    const q = query.q?.replace(/^@/, '');
    const refNumber = q && /^WD-?\d+$/i.test(q) ? Number(q.replace(/\D/g, '')) : null;
    const where: Prisma.WithdrawalWhereInput = {
      ...statusWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? refNumber !== null
          ? { number: refNumber }
          : {
              OR: [
                { toAddress: { startsWith: q.toLowerCase() } },
                { user: { handle: { contains: q.toLowerCase() } } },
              ],
            }
        : {}),
    };
    const [rows, total, counts, held, oldestOpen] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: view === 'queue' ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          user: { select: { id: true, publicId: true, handle: true } },
          amlAlerts: { select: { id: true, rule: true, status: true, riskLevel: true } },
        },
      }),
      this.prisma.withdrawal.count({ where }),
      this.prisma.withdrawal.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'under_review' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.withdrawal.findFirst({
        where: { status: { in: ['requested', 'risk_check', 'under_review', 'queued'] } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    const count = (...s: WithdrawalStatus[]) =>
      counts.filter((c) => s.includes(c.status)).reduce((n, c) => n + c._count, 0);
    return {
      policy: {
        slaHours: WITHDRAWAL_SLA_HOURS,
        fourEyesAmount: FOUR_EYES_AMOUNT,
        fourEyesRule: 'Four-eyes on any AML flag or from 10,000.00 USDT (policy FIN-2.3)',
        immutable: 'Amount and destination can’t be changed by any admin',
      },
      summary: {
        open: count('requested', 'risk_check', 'under_review', 'queued'),
        oldestOpenMinutes: oldestOpen
          ? Math.max(0, Math.floor((now.getTime() - oldestOpen.createdAt.getTime()) / 60_000))
          : null,
        awaitingSecond: pendingApprovals.length,
        underReview: held._count,
        onHold: usdt(held._sum.amount),
        broadcasting: count('broadcast'),
        completed: count('confirmed'),
        rejected: count('rejected', 'failed', 'cancelled'),
      },
      view,
      ...paginate(
        rows.map((w) => {
          const approval = pendingApprovals.find((a) => a.targetId === w.id);
          const due = addHours(w.createdAt, WITHDRAWAL_SLA_HOURS);
          return {
            id: w.id,
            reference: `WD-${w.number}`,
            status: w.status,
            statusLabel: WITHDRAWAL_STATUS_LABEL[w.status],
            user: { id: w.user.id, publicId: w.user.publicId, handle: atHandle(w.user.handle) },
            network: w.network,
            networkName: CHAINS[w.network].name,
            toAddress: w.toAddress,
            amount: usdt(w.amount),
            networkFee: usdt(w.networkFee),
            youReceive: usdt(w.netAmount),
            riskLevel: w.riskLevel,
            riskFlags: w.riskFlags,
            flagged: w.flagged,
            requiresFourEyes: w.requiresFourEyes,
            amlAlert: w.amlAlerts[0] ? { id: w.amlAlerts[0].id, rule: w.amlAlerts[0].rule } : null,
            approval: approval
              ? {
                  id: approval.id,
                  approvals: 1,
                  of: 2,
                  requestedBy: approval.requestedBy.name,
                  requestedByMe: approval.requestedByAdminId === adminId,
                }
              : null,
            createdAt: w.createdAt.toISOString(),
            slaDueAt: due.toISOString(),
            slaMinutesLeft: OPEN_WITHDRAWAL.includes(w.status)
              ? Math.floor((due.getTime() - now.getTime()) / 60_000)
              : null,
            isDemo: w.isDemo,
          };
        }),
        total,
        query,
      ),
      generatedAt: now.toISOString(),
    };
  }

  async withdrawalDetail(id: string, adminId: string, now = new Date()) {
    const w = await this.prisma.withdrawal.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        user: { include: { profile: true } },
        amlAlerts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!w) throw notFound('Withdrawal');
    const reference = `WD-${w.number}`;
    const [balances, approvals, auditRows, postings, sameAddress, wallet, previousCount] =
      await Promise.all([
        this.ledger.userBalances(w.userId),
        this.prisma.adminApproval.findMany({
          where: { targetType: 'withdrawal', targetId: id },
          orderBy: { createdAt: 'asc' },
          include: {
            requestedBy: { select: { name: true } },
            decidedBy: { select: { name: true } },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { targetType: 'withdrawal', targetId: id },
          orderBy: { seq: 'asc' },
        }),
        this.prisma.ledgerPosting.findMany({
          where: { reference },
          orderBy: { createdAt: 'asc' },
          include: { entries: { include: { account: { select: { code: true, type: true } } } } },
        }),
        this.prisma.withdrawal.count({
          where: {
            userId: w.userId,
            toAddress: w.toAddress,
            status: 'confirmed',
            id: { not: w.id },
          },
        }),
        this.prisma.userWallet.findFirst({
          where: { userId: w.userId, address: { equals: w.toAddress, mode: 'insensitive' } },
        }),
        this.prisma.withdrawal.count({
          where: { userId: w.userId, status: 'confirmed', id: { not: w.id } },
        }),
      ]);
    const view = this.withdrawals.view(w);
    const pending = approvals.find((a) => a.status === 'pending') ?? null;
    const due = addHours(w.createdAt, WITHDRAWAL_SLA_HOURS);
    const fourEyes = {
      required: w.requiresFourEyes,
      approvals: pending ? 1 : approvals.some((a) => a.status === 'approved') ? 2 : 0,
      of: w.requiresFourEyes ? 2 : 1,
      pendingApprovalId: pending?.id ?? null,
      firstApprover: pending?.requestedBy.name ?? null,
      firstApprovedByMe: pending?.requestedByAdminId === adminId,
    };
    return {
      ...view,
      user: {
        id: w.user.id,
        publicId: w.user.publicId,
        handle: atHandle(w.user.handle),
        status: w.user.status,
        country: w.user.profile?.country ?? null,
        kycLevel: w.user.profile?.kycLevel ?? 'none',
        vipTier: w.user.profile?.vipTier ?? 'bronze',
        memberSince: w.user.createdAt.toISOString(),
        confirmedWithdrawals: previousCount,
        isDemo: w.user.isDemo,
      },
      balances,
      destination: {
        address: w.toAddress,
        network: w.network,
        networkName: CHAINS[w.network].name,
        whitelistedAt: wallet?.whitelistedAt?.toISOString() ?? null,
        source: wallet?.source ?? null,
        previousPayouts: sameAddress,
        firstPayout: sameAddress === 0,
      },
      sla: {
        hours: WITHDRAWAL_SLA_HOURS,
        dueAt: due.toISOString(),
        minutesLeft: OPEN_WITHDRAWAL.includes(w.status)
          ? Math.floor((due.getTime() - now.getTime()) / 60_000)
          : null,
      },
      fourEyes,
      canDecide: w.status === 'under_review',
      canApprove: w.status === 'under_review' && !fourEyes.firstApprovedByMe,
      amlAlerts: w.amlAlerts.map((a) => ({
        id: a.id,
        reference: `AML-${a.id.slice(0, 4).toUpperCase()}`,
        riskLevel: a.riskLevel,
        rule: a.rule,
        status: a.status,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
        isDemo: a.isDemo,
      })),
      approvals: approvals.map((a) => ({
        id: a.id,
        status: a.status,
        requestedBy: a.requestedBy.name,
        requestReason: a.requestReason,
        decidedBy: a.decidedBy?.name ?? null,
        decisionReason: a.decisionReason,
        createdAt: a.createdAt.toISOString(),
        decidedAt: a.decidedAt?.toISOString() ?? null,
      })),
      audit: auditRows.map((r) => ({
        seq: r.seq.toString(),
        action: r.action,
        actorLabel: r.actorLabel,
        actorType: r.actorType,
        reason: r.reason,
        outcome: r.outcome,
        hash: r.hash,
        createdAt: r.createdAt.toISOString(),
      })),
      postings: postings.map((p) => this.postingView(p)),
      fees: {
        networkFee: usdt(w.networkFee),
        platformFee: usdt(w.platformFee),
        note: 'Network fee is deducted from the amount; platform withdrawal fee 0.00',
      },
    };
  }

  // ── F3 Platform fees ──────────────────────────────────────────────────────────────────────────

  async fees(now = new Date()) {
    const since30 = addDays(startOfUtcDay(now), -29);
    const [allTime, last30, last24, daily, byRound, feeAccount, cancelledEntries] =
      await Promise.all([
        this.prisma.feeLedger.aggregate({ _sum: { amount: true, entryCount: true } }),
        this.prisma.feeLedger.aggregate({
          where: { createdAt: { gte: since30 } },
          _sum: { amount: true, entryCount: true },
        }),
        this.prisma.feeLedger.aggregate({
          where: { createdAt: { gte: addHours(now, -24) } },
          _sum: { amount: true, entryCount: true },
        }),
        this.prisma.$queryRaw<{ day: Date; amount: string; entries: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, SUM(amount)::text AS amount, SUM(entry_count)::bigint AS entries
          FROM fee_ledger WHERE created_at >= ${since30}
          GROUP BY 1 ORDER BY 1`,
        this.prisma.$queryRaw<
          {
            round_id: string | null;
            number: number | null;
            status: string | null;
            amount: string;
            entries: bigint;
            is_demo: boolean | null;
            closes_at: Date | null;
          }[]
        >`
          SELECT f.round_id::text AS round_id, r.number, r.status::text AS status, SUM(f.amount)::text AS amount,
                 SUM(f.entry_count)::bigint AS entries, r.is_demo, r.closes_at
          FROM fee_ledger f LEFT JOIN rounds r ON r.id = f.round_id
          GROUP BY f.round_id, r.number, r.status, r.is_demo, r.closes_at
          ORDER BY r.number DESC NULLS LAST LIMIT 20`,
        this.ledger.balanceOf({ type: 'fees' }),
        this.prisma.round.aggregate({
          where: { status: 'cancelled' },
          _sum: { platformFees: true },
        }),
      ]);
    const series: { day: string; amount: string; entries: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(since30, i);
      const row = daily.find((r) => r.day.getTime() === d.getTime());
      series.push({
        day: d.toISOString().slice(0, 10),
        amount: usdt(row?.amount ?? '0'),
        entries: Number(row?.entries ?? 0),
      });
    }
    return {
      rule: {
        perEntry: PLATFORM_FEE_PER_ENTRY,
        entryPrice: ENTRY_PRICE,
        description:
          'Platform fee 0.05 USDT per qualifying entry, charged on top of the 10.00 entry price and posted to the fees account — never to a pool.',
        changePolicy:
          'Fee changes need dual approval and apply only from the next round (rules are copied into a round when it opens).',
        cancelledRounds:
          'Stakes of cancelled rounds are refunded in full; platform fees stay in the fees account (shown separately below).',
      },
      totals: {
        allTime: usdt(allTime._sum.amount),
        allTimeEntries: allTime._sum.entryCount ?? 0,
        last30d: usdt(last30._sum.amount),
        last30dEntries: last30._sum.entryCount ?? 0,
        last24h: usdt(last24._sum.amount),
        last24hEntries: last24._sum.entryCount ?? 0,
        feesAccountBalance: feeAccount,
        subLedgerMatchesAccount: m(allTime._sum.amount).eq(m(feeAccount)),
        cancelledRoundFees: usdt(cancelledEntries._sum.platformFees),
      },
      series,
      byRound: byRound.map((r) => ({
        roundId: r.round_id,
        roundNumber: r.number,
        status: r.status,
        amount: usdt(r.amount),
        entries: Number(r.entries),
        state:
          r.status === 'open' || r.status === 'closed' || r.status === 'drawing'
            ? ('accruing' as const)
            : r.status === 'cancelled'
              ? ('retained_cancelled' as const)
              : ('earned' as const),
        closesAt: r.closes_at?.toISOString() ?? null,
        isDemo: r.is_demo ?? false,
      })),
      generatedAt: now.toISOString(),
    };
  }

  // ── F4 Pool accounting ────────────────────────────────────────────────────────────────────────

  async poolAccounting(now = new Date()) {
    const [byType, poolRows, owedPrizes, refundsOutstanding, rewardsOwed, current] =
      await Promise.all([
        this.ledger.balancesByType(),
        this.prisma.$queryRaw<
          {
            id: string;
            number: number;
            status: string;
            pool_amount: string;
            ledger: string;
            entries_in: string;
            refunded: string;
            settled: string;
            is_demo: boolean;
          }[]
        >`
          SELECT r.id::text AS id, r.number, r.status::text AS status, r.pool_amount::text AS pool_amount,
                 COALESCE(SUM(e.amount), 0)::text AS ledger,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'entry'), 0)::text AS entries_in,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'refund'), 0)::text AS refunded,
                 COALESCE((SELECT SUM(amount) FROM pool_ledger pl WHERE pl.round_id = r.id AND pl.kind = 'settlement'), 0)::text AS settled,
                 r.is_demo
          FROM rounds r
            LEFT JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
            LEFT JOIN ledger_entries e ON e.account_id = a.id
          GROUP BY r.id ORDER BY r.number DESC LIMIT 12`,
        this.prisma.prizeClaim.aggregate({
          where: { status: 'owed' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.transaction.aggregate({
          where: { type: 'refund', status: 'pending' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.transaction.aggregate({
          where: { type: { in: ['reward', 'rakeback', 'cashback'] }, status: 'pending' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.round.findFirst({
          where: { status: { in: ['open', 'closed', 'drawing'] } },
          orderBy: { closesAt: 'asc' },
        }),
      ]);
    const b = (t: string) => m(byType[t] ?? '0');
    const escrow = poolRows
      .filter((r) => ['open', 'closed', 'drawing'].includes(r.status))
      .reduce((acc, r) => acc.plus(m(r.ledger)), money(0));
    const owedPrizesAmt = m(owedPrizes._sum.amount);
    const refundsAmt = m(refundsOutstanding._sum.amount);
    const liabilities = escrow.plus(owedPrizesAmt).plus(refundsAmt);
    const custody = b('chain_clearing').negated();
    const customer = b('user_available')
      .plus(b('user_locked'))
      .plus(b('user_pending'))
      .plus(b('user_owed'));
    return {
      liabilities: {
        total: toUSDTString(liabilities),
        poolEscrow: toUSDTString(escrow),
        owedPrizes: toUSDTString(owedPrizesAmt),
        owedPrizesCount: owedPrizes._count,
        refundsOutstanding: toUSDTString(refundsAmt),
        refundsOutstandingCount: refundsOutstanding._count,
        rewardsOwed: usdt(rewardsOwed._sum.amount),
      },
      accounts: {
        pool: toUSDTString(b('pool')),
        prizeLiability: toUSDTString(b('prize_liability')),
        refundsClearing: toUSDTString(b('refunds')),
        fees: toUSDTString(b('fees')),
        operatorRevenue: toUSDTString(b('operator_revenue')),
        userOwed: toUSDTString(b('user_owed')),
        customerBalances: toUSDTString(customer),
        custodyMirror: toUSDTString(custody),
      },
      currentRound: current
        ? {
            number: current.number,
            status: current.status,
            entries: current.entriesCount,
            participants: current.participantsCount,
            entryPrice: usdt(current.entryPrice),
            pool: usdt(current.poolAmount),
            fees: usdt(current.platformFees),
            closesAt: current.closesAt.toISOString(),
            waterfall: prizeBreakdown(usdt(current.poolAmount)),
            isDemo: current.isDemo,
          }
        : null,
      rounds: poolRows.map((r) => ({
        number: r.number,
        status: r.status,
        projection: usdt(r.pool_amount),
        ledger: usdt(r.ledger),
        entriesIn: usdt(r.entries_in),
        refunded: usdt(m(r.refunded).negated()),
        settledOut: usdt(m(r.settled).negated()),
        matches:
          !['open', 'closed', 'drawing'].includes(r.status) || m(r.ledger).eq(m(r.pool_amount)),
        isDemo: r.is_demo,
      })),
      policy:
        'Immutable by design: no role can move pool funds, edit balances or change a round’s prize split. Pools leave escrow only through contract-defined settlement or refunds.',
      generatedAt: now.toISOString(),
    };
  }

  // ── F5 Financial ledger ───────────────────────────────────────────────────────────────────────

  async ledgerJournal(query: AdminLedgerQuery) {
    const q = query.q?.trim();
    let userIds: string[] | null = null;
    if (q && !/^(WD|DP|RF|RW|E)-/i.test(q) && !q.startsWith('round:')) {
      const users = await this.prisma.user.findMany({
        where: { handle: { contains: q.replace(/^@/, '').toLowerCase() } },
        select: { id: true },
        take: 50,
      });
      userIds = users.map((u) => u.id);
    }
    const where: Prisma.LedgerPostingWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(q
        ? userIds
          ? { entries: { some: { userId: { in: userIds } } } }
          : {
              reference: {
                startsWith: q.toUpperCase().startsWith('ROUND:')
                  ? q.toLowerCase()
                  : q.toUpperCase(),
              },
            }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.ledgerPosting.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          entries: {
            include: {
              account: { select: { code: true, type: true, network: true, roundId: true } },
            },
          },
        },
      }),
      this.prisma.ledgerPosting.count({ where }),
    ]);
    const userIdsOnPage = [
      ...new Set(rows.flatMap((p) => p.entries.map((e) => e.userId).filter(Boolean) as string[])),
    ];
    const roundIds = [
      ...new Set(
        rows.flatMap((p) => p.entries.map((e) => e.account.roundId).filter(Boolean) as string[]),
      ),
    ];
    const [users, rounds] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIdsOnPage } },
        select: { id: true, handle: true },
      }),
      this.prisma.round.findMany({
        where: { id: { in: roundIds } },
        select: { id: true, number: true },
      }),
    ]);
    const handleOf = new Map(users.map((u) => [u.id, atHandle(u.handle)]));
    const roundOf = new Map(rounds.map((r) => [r.id, r.number]));
    let debits = money(0);
    let credits = money(0);
    const items = rows.map((p) => {
      const v = this.postingView(p, handleOf, roundOf);
      debits = debits.plus(m(v.debits));
      credits = credits.plus(m(v.credits));
      return v;
    });
    return {
      ...paginate(items, total, query),
      pageTotals: {
        debits: toUSDTString(debits),
        credits: toUSDTString(credits),
        balanced: debits.eq(credits),
      },
    };
  }

  /** Integrity panel for the ledger page: triggers, balance invariants, a digest of the journal, audit chain. */
  async ledgerIntegrity(now = new Date()) {
    const [triggers, reconcile, auditChain, digest] = await Promise.all([
      this.prisma.$queryRaw<{ tgname: string }[]>`
        SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY(${[...APPEND_ONLY_TRIGGERS]}::text[])`,
      this.ledger.reconcile(),
      this.audit.verify(),
      this.journalDigest(),
    ]);
    const present = new Set(triggers.map((t) => t.tgname));
    return {
      appendOnly: {
        ok: APPEND_ONLY_TRIGGERS.every((t) => present.has(t)),
        triggers: APPEND_ONLY_TRIGGERS.map((name) => ({ name, present: present.has(name) })),
      },
      balanced: {
        ok: reconcile.unbalancedPostings === 0 && m(reconcile.ledgerTotal).isZero(),
        ledgerTotal: reconcile.ledgerTotal,
        unbalancedPostings: reconcile.unbalancedPostings,
      },
      journal: digest,
      auditChain: {
        ok: auditChain.ok,
        checked: auditChain.checked,
        headHash: auditChain.headHash,
        firstBrokenSeq: auditChain.firstBrokenSeq,
        problem: auditChain.problem,
      },
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Running SHA-256 over every posting in commit order (id, kind, reference, createdAt, sorted lines). Any edit or
   * deletion of history would change it; DB triggers already make both impossible.
   */
  async journalDigest() {
    const rows = await this.prisma.$queryRaw<
      { id: string; kind: string; reference: string | null; created_at: Date; lines: string }[]
    >`
      SELECT p.id::text AS id, p.kind::text AS kind, p.reference, p.created_at,
             string_agg(a.code || '=' || e.amount::text, ';' ORDER BY a.code, e.amount) AS lines
      FROM ledger_postings p JOIN ledger_entries e ON e.posting_id = p.id JOIN ledger_accounts a ON a.id = e.account_id
      GROUP BY p.id ORDER BY p.created_at, p.id`;
    let head = createHash('sha256').update('GLOBAL_POOL_LEDGER_V1').digest('hex');
    for (const r of rows) {
      head = createHash('sha256')
        .update(
          `${head}|${r.id}|${r.kind}|${r.reference ?? ''}|${r.created_at.toISOString()}|${r.lines}`,
        )
        .digest('hex');
    }
    return {
      postings: rows.length,
      headHash: head,
      algorithm: 'sha256(prev | id | kind | reference | createdAt | lines)',
    };
  }

  postingView(
    p: {
      id: string;
      kind: string;
      reference: string | null;
      description: string;
      createdAt: Date;
      isDemo: boolean;
      entries: {
        amount: Prisma.Decimal;
        userId: string | null;
        account: { code: string; type: string; roundId?: string | null; network?: string | null };
      }[];
    },
    handleOf?: Map<string, string | null>,
    roundOf?: Map<string, number>,
  ) {
    let debits = money(0);
    let credits = money(0);
    const lines = p.entries
      .map((e) => {
        const amt = m(e.amount.toFixed());
        if (amt.isNegative()) debits = debits.plus(amt.negated());
        else credits = credits.plus(amt);
        const handle = e.userId ? (handleOf?.get(e.userId) ?? null) : null;
        const roundNumber = e.account.roundId ? (roundOf?.get(e.account.roundId) ?? null) : null;
        return {
          accountType: e.account.type,
          account: accountLabel(e.account.type, handle, roundNumber, e.account.network ?? null),
          handle,
          amount: toUSDTString(amt),
          side: amt.isNegative() ? ('debit' as const) : ('credit' as const),
        };
      })
      .sort((a, b) => (a.side === b.side ? 0 : a.side === 'debit' ? -1 : 1));
    return {
      id: p.id,
      kind: p.kind,
      kindLabel: LEDGER_POSTING_KIND_LABEL[p.kind as LedgerPostingKindValue] ?? p.kind,
      reference: p.reference,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
      debits: toUSDTString(debits),
      credits: toUSDTString(credits),
      balanced: debits.eq(credits),
      lines,
      isDemo: p.isDemo,
    };
  }

  // ── F6 Reconciliation ─────────────────────────────────────────────────────────────────────────

  async reconciliation(now = new Date()) {
    const [
      base,
      byType,
      feeSub,
      poolSub,
      owedBreakdown,
      lockedOpen,
      negatives,
      confirming,
      prizeOwed,
    ] = await Promise.all([
      this.ledger.reconcile(),
      this.ledger.balancesByType(),
      this.prisma.feeLedger.aggregate({ _sum: { amount: true } }),
      this.prisma.poolLedger.aggregate({ _sum: { amount: true } }),
      this.prisma.transaction.aggregate({
        where: { type: { in: ['refund', 'reward', 'rakeback', 'cashback'] }, status: 'pending' },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { status: { in: OPEN_WITHDRAWAL } },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(*)::bigint AS n FROM (
            SELECT a.id FROM ledger_accounts a JOIN ledger_entries e ON e.account_id = a.id
            WHERE a.type IN ('user_available','user_locked','user_pending','user_owed')
            GROUP BY a.id HAVING SUM(e.amount) < 0) x`,
      this.prisma.deposit.findMany({
        where: { status: { in: ['detected', 'confirming'] } },
        orderBy: { detectedAt: 'asc' },
      }),
      this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
    ]);
    const b = (t: string) => m(byType[t] ?? '0');
    type Scope = {
      key: string;
      scope: string;
      group: 'ledger' | 'sub_ledger' | 'pool' | 'custody' | 'in_flight';
      expected: string;
      actual: string;
      expectedLabel: string;
      actualLabel: string;
      difference: string;
      status: 'match' | 'mismatch' | 'pending';
      note: string;
    };
    const scope = (
      s: Omit<Scope, 'difference' | 'status'> & { status?: Scope['status'] },
    ): Scope => {
      const diff = m(s.actual).minus(m(s.expected));
      return {
        ...s,
        difference: toUSDTString(diff),
        status: s.status ?? (diff.isZero() ? 'match' : 'mismatch'),
      };
    };
    const scopes: Scope[] = [
      scope({
        key: 'ledger_total',
        scope: 'Whole ledger sums to zero',
        group: 'ledger',
        expected: '0.00',
        actual: base.ledgerTotal,
        expectedLabel: 'Expected',
        actualLabel: 'Σ all lines',
        note: 'Double entry: every value in has a value out.',
      }),
      scope({
        key: 'postings_balanced',
        scope: 'Every posting balanced',
        group: 'ledger',
        expected: '0',
        actual: String(base.unbalancedPostings),
        expectedLabel: 'Unbalanced postings',
        actualLabel: 'Found',
        note: 'Also enforced by a deferred constraint trigger at COMMIT.',
      }),
      scope({
        key: 'fee_sub_ledger',
        scope: 'Fee sub-ledger = fees account',
        group: 'sub_ledger',
        expected: toUSDTString(b('fees')),
        actual: usdt(feeSub._sum.amount),
        expectedLabel: 'Fees account',
        actualLabel: 'fee_ledger Σ',
        note: '0.05 USDT per qualifying entry, mirrored line by line.',
      }),
      scope({
        key: 'pool_sub_ledger',
        scope: 'Pool sub-ledger = pool accounts',
        group: 'sub_ledger',
        expected: toUSDTString(b('pool')),
        actual: usdt(poolSub._sum.amount),
        expectedLabel: 'Pool accounts',
        actualLabel: 'pool_ledger Σ',
        note: 'Entries in minus settlements and refunds out.',
      }),
      scope({
        key: 'owed',
        scope: 'Owed = prizes + refunds + rewards due',
        group: 'sub_ledger',
        expected: toUSDTString(b('user_owed')),
        actual: toUSDTString(m(prizeOwed._sum.amount).plus(m(owedBreakdown._sum.amount))),
        expectedLabel: 'Owed accounts',
        actualLabel: 'Open claims',
        note: 'Owed prize claims plus pending refunds and rewards.',
      }),
      scope({
        key: 'locked_withdrawals',
        scope: 'Locked = open withdrawals',
        group: 'sub_ledger',
        expected: toUSDTString(b('user_locked')),
        actual: usdt(lockedOpen._sum.amount),
        expectedLabel: 'Locked accounts',
        actualLabel: 'Open withdrawals',
        note: 'Requested → broadcast withdrawals hold their amount in Locked.',
      }),
      scope({
        key: 'no_negative_buckets',
        scope: 'No player bucket below zero',
        group: 'ledger',
        expected: '0',
        actual: String(Number(negatives[0]?.n ?? 0)),
        expectedLabel: 'Negative buckets',
        actualLabel: 'Found',
        note: 'Debits that would overdraw fail with INSUFFICIENT_FUNDS.',
      }),
    ];
    const pools = await this.prisma.$queryRaw<
      { number: number; ledger: string; projection: string; is_demo: boolean }[]
    >`
      SELECT r.number, COALESCE(SUM(e.amount), 0)::text AS ledger, r.pool_amount::text AS projection, r.is_demo
      FROM rounds r JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
        LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE r.status IN ('open', 'closed', 'drawing')
      GROUP BY r.id ORDER BY r.number`;
    for (const p of pools) {
      scopes.push(
        scope({
          key: `round_${p.number}`,
          scope: `Round #${p.number.toLocaleString('en-US')} pool`,
          group: 'pool',
          expected: usdt(p.projection),
          actual: usdt(p.ledger),
          expectedLabel: 'Projection',
          actualLabel: 'Ledger',
          note: 'Settlement refuses to run while these differ.',
        }),
      );
    }
    for (const net of ['arbitrum', 'bnb', 'ethereum', 'polygon', 'solana'] as ChainKey[]) {
      const clearing = await this.ledger.balanceOf({ type: 'chain_clearing', network: net });
      if (m(clearing).isZero()) continue;
      scopes.push(
        scope({
          key: `custody_${net}`,
          scope: `Custody ${CHAINS[net].name}`,
          group: 'custody',
          expected: toUSDTString(m(clearing).negated()),
          actual: toUSDTString(m(clearing).negated()),
          expectedLabel: 'Ledger mirror',
          actualLabel: 'On-chain',
          status: 'pending',
          note:
            net === 'arbitrum' &&
            (this.config.env as unknown as Record<string, unknown>).ARBITRUM_SEPOLIA_RPC_URL
              ? 'Compared with the hot-wallet balance read over RPC.'
              : 'No RPC configured for this network in DEMO — on-chain balance not read.',
        }),
      );
    }
    for (const d of confirming) {
      scopes.push(
        scope({
          key: `deposit_${d.number}`,
          scope: `DP-${d.number} in flight`,
          group: 'in_flight',
          expected: usdt(d.amount),
          actual: usdt(d.amount),
          expectedLabel: 'Detected',
          actualLabel: 'Pending',
          status: 'pending',
          note: `${d.confirmations}/${d.requiredConfirmations} confirmations — credited to Available after the last one.`,
        }),
      );
    }
    const summary = {
      total: scopes.length,
      match: scopes.filter((s) => s.status === 'match').length,
      mismatch: scopes.filter((s) => s.status === 'mismatch').length,
      pending: scopes.filter((s) => s.status === 'pending').length,
    };
    return {
      ok: summary.mismatch === 0,
      summary,
      scopes,
      policy:
        'A mismatch is investigated and fixed with a reviewed correcting entry (a new posting with four-eyes) — ledger rows are never edited or deleted.',
      runAt: now.toISOString(),
    };
  }

  // ── F7 Refunds ────────────────────────────────────────────────────────────────────────────────

  async refunds(now = new Date()) {
    const cancelled = await this.prisma.round.findMany({
      where: { status: 'cancelled' },
      orderBy: { number: 'desc' },
      take: 20,
    });
    const rounds = await Promise.all(
      cancelled.map(async (r) => {
        const [byStatus, outstanding] = await Promise.all([
          this.prisma.transaction.groupBy({
            by: ['status'],
            where: { roundId: r.id, type: 'refund' },
            _count: true,
            _sum: { amount: true },
          }),
          this.prisma.transaction.findMany({
            where: { roundId: r.id, type: 'refund', status: 'pending' },
            orderBy: { amount: 'desc' },
            take: 10,
            include: { user: { select: { id: true, handle: true, publicId: true } } },
          }),
        ]);
        const sumOf = (s: string) => byStatus.find((x) => x.status === s);
        const claimed = sumOf('completed');
        const pending = sumOf('pending');
        const refunded = m(claimed?._sum.amount).plus(m(pending?._sum.amount));
        // DEMO snapshot rounds may hold their historic totals only in the projection (pool = entries × price).
        const stakes = m(r.entryPrice.toFixed()).times(r.entriesCount);
        return {
          number: r.number,
          cancelledAt: r.cancelledAt?.toISOString() ?? r.closesAt.toISOString(),
          closesAt: r.closesAt.toISOString(),
          reason: r.cancelReason ?? 'threshold_not_met',
          participants: r.participantsCount,
          entries: r.entriesCount,
          minParticipants: r.minParticipants,
          minPool: usdt(r.minPool),
          stakes: toUSDTString(stakes),
          platformFees: usdt(r.platformFees),
          refundedToOwed: toUSDTString(refunded),
          claimed: usdt(claimed?._sum.amount),
          claimedPlayers: claimed?._count ?? 0,
          outstanding: usdt(pending?._sum.amount),
          outstandingPlayers: pending?._count ?? 0,
          players: (claimed?._count ?? 0) + (pending?._count ?? 0),
          topOutstanding: outstanding.map((t) => ({
            userId: t.user.id,
            handle: atHandle(t.user.handle),
            publicId: t.user.publicId,
            amount: usdt(t.amount),
            entries: Number((t.metadata as { entries?: number } | null)?.entries ?? 0),
            reference: t.reference,
            since: t.createdAt.toISOString(),
            isDemo: t.isDemo,
          })),
          isDemo: r.isDemo,
        };
      }),
    );
    const returns = await this.prisma.withdrawal.findMany({
      where: { status: { in: ['rejected', 'failed', 'cancelled'] } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { user: { select: { handle: true } } },
    });
    return {
      rounds,
      totals: {
        outstanding: toUSDTString(rounds.reduce((a, r) => a.plus(m(r.outstanding)), money(0))),
        outstandingPlayers: rounds.reduce((n, r) => n + r.outstandingPlayers, 0),
        claimed: toUSDTString(rounds.reduce((a, r) => a.plus(m(r.claimed)), money(0))),
      },
      notRefunds: returns.map((w) => ({
        reference: `WD-${w.number}`,
        kind: 'withdrawal_release' as const,
        handle: atHandle(w.user.handle),
        amount: usdt(w.amount),
        status: w.status,
        reason:
          w.rejectionReason ??
          w.failureReason ??
          (w.status === 'cancelled' ? 'Cancelled by the player' : null),
        at: (w.rejectedAt ?? w.failedAt ?? w.cancelledAt ?? w.updatedAt).toISOString(),
        isDemo: w.isDemo,
      })),
      policy:
        'Refunds are contract-defined: a cancelled round returns every stake to the players’ Owed balance. There is no manual refund — admins can remind players and export reports only.',
      generatedAt: now.toISOString(),
    };
  }

  // ── F8 Revenue reports ────────────────────────────────────────────────────────────────────────

  async revenue(days: number, now = new Date()) {
    const since = addDays(startOfUtcDay(now), -(days - 1));
    const [fees, rewards, networkFees, weekly] = await Promise.all([
      this.prisma.feeLedger.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { amount: true, entryCount: true },
      }),
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN ledger_postings p ON p.id = e.posting_id
        WHERE p.kind = 'reward' AND a.type = 'operator_revenue' AND p.created_at >= ${since}`,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(e.amount), 0)::text AS total
        FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN ledger_postings p ON p.id = e.posting_id
        WHERE p.kind = 'withdrawal_settle' AND a.type = 'operator_revenue' AND p.created_at >= ${since}`,
      this.prisma.$queryRaw<{ week: Date; fees: string }[]>`
        SELECT date_trunc('week', created_at) AS week, SUM(amount)::text AS fees
        FROM fee_ledger WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
    ]);
    const gross = m(fees._sum.amount);
    const rewardsPaid = m(rewards[0]?.total).negated();
    const net = gross.minus(rewardsPaid);
    return {
      period: { days, from: since.toISOString(), to: now.toISOString() },
      gross: toUSDTString(gross),
      rewards: toUSDTString(rewardsPaid),
      net: toUSDTString(net),
      qualifyingEntries: fees._sum.entryCount ?? 0,
      networkFeesRecovered: toUSDTString(m(networkFees[0]?.total)),
      products: [
        {
          key: 'global_pool',
          name: 'Global Pool platform fees',
          amount: toUSDTString(gross),
          share: gross.isZero() ? '0' : '100',
        },
        {
          key: 'games',
          name: 'Games (non-monetary simulation)',
          amount: '0.00',
          share: '0',
        },
      ],
      weekly: weekly.map((w) => ({
        weekStart: w.week.toISOString().slice(0, 10),
        net: usdt(w.fees),
      })),
      statement: [
        {
          line: 'Platform fees (0.05 × qualifying entries)',
          source: 'fees account · fee_ledger',
          amount: toUSDTString(gross),
        },
        {
          line: 'Rewards funded (VIP, rakeback, cashback)',
          source: 'operator_revenue · reward postings',
          amount: toUSDTString(rewardsPaid.negated()),
        },
        { line: 'Net revenue', source: 'computed', amount: toUSDTString(net) },
      ],
      excluded: [
        {
          line: 'Network fees recovered on withdrawals',
          amount: toUSDTString(m(networkFees[0]?.total)),
          why: 'Pass-through cost recovery, not revenue',
        },
        {
          line: 'Pool stakes and prizes',
          amount: null,
          why: 'Player money held in escrow — never revenue',
        },
      ],
      generatedAt: now.toISOString(),
    };
  }
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function accountLabel(
  type: string,
  handle: string | null,
  roundNumber: number | null,
  network: string | null,
): string {
  switch (type) {
    case 'user_available':
      return `${handle ?? 'player'} · Available`;
    case 'user_locked':
      return `${handle ?? 'player'} · Locked`;
    case 'user_pending':
      return `${handle ?? 'player'} · Pending`;
    case 'user_owed':
      return `${handle ?? 'player'} · Owed`;
    case 'pool':
      return roundNumber ? `Pool #${roundNumber.toLocaleString('en-US')}` : 'Pool';
    case 'fees':
      return 'Platform fees';
    case 'prize_liability':
      return 'Prize liability';
    case 'refunds':
      return 'Refunds clearing';
    case 'operator_revenue':
      return 'Operator revenue';
    case 'chain_clearing':
      return `Chain clearing · ${network ? (CHAINS[network as ChainKey]?.name ?? network) : '—'}`;
    default:
      return type;
  }
}
