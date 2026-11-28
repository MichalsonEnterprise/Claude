import { Injectable } from '@nestjs/common';
import { ROUND_STATUS_LABEL } from '@gp/shared/enums';
import { money, toUSDTString } from '@gp/shared/money';
import { PRIZES_PER_ROUND, prizeBreakdown } from '@gp/shared/pool';
import {
  paginate,
  type AdminParticipantsQuery,
  type CircuitBreakerDecision,
  type CircuitBreakerRequest,
  type PaginationQuery,
} from '@gp/shared/schemas';

import { AppError, notFound } from '../../common/errors';
import { usdt } from '../../common/money';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { addHours, addMinutes } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { LedgerService } from '../ledger/ledger.service';
import { RoundsService } from '../pool/rounds.service';
import { TotpService } from '../security/totp.service';
import { atHandle } from './admin-finance.service';

export const ENTRIES_FLAG = 'pool.entries.enabled';
/** A circuit-breaker request expires (and changes nothing) if no second admin approves it in time. */
export const BREAKER_REQUEST_TTL_MINUTES = 30;
/**
 * Circuit-breaker dual control (ADM-P10): a Super Admin, Finance or Compliance admin may request; the second approver
 * must be a DIFFERENT person holding a DIFFERENT one of these roles (e.g. Super Admin requests, Compliance
 * approves). Both re-authenticate with 2FA and give a reason. Role-based on purpose: it is a dual-control policy.
 */
export const BREAKER_ROLES = ['super_admin', 'finance', 'compliance'] as const;
export const BREAKER_ROLE_LABEL: Record<(typeof BREAKER_ROLES)[number], string> = {
  super_admin: 'Super Admin',
  finance: 'Finance',
  compliance: 'Compliance',
};
const breakerRolesOf = (roles: readonly string[]) =>
  roles.filter((r): r is (typeof BREAKER_ROLES)[number] =>
    (BREAKER_ROLES as readonly string[]).includes(r),
  );
const expiryOf = (created: Date) => addMinutes(created, BREAKER_REQUEST_TTL_MINUTES);

const ACTIVE = ['open', 'closed', 'drawing'] as const;
const m = (v: unknown) => money((v ?? '0') as string);

/** The things no admin can do — rendered on every pool screen ("Immutable by design"). */
export const IMMUTABLE_POLICY = {
  cannot: [
    'Edit or choose a draw result',
    'Pick, replace or exclude winners',
    'Change the prize split of a live round',
    'Pay out from the pool to any address',
    'Edit ledger entries or balances',
    'Move the close time',
  ],
  allowed:
    'Allowed — audited and contract-defined: pause NEW entries (dual approval), contract refunds of cancelled rounds, re-submitting a failed claim batch unchanged, exporting reports.',
};

/**
 * Global Pool monitoring (ADM-P1…P10). Read-only views of rounds, pools, participants, prizes, VRF and settlement.
 * The only control is the circuit breaker for NEW entries (request + a second, different approver; reason + MFA;
 * audited). Results, winners, prize splits and payouts cannot be touched by design.
 */
@Injectable()
export class AdminPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly rounds: RoundsService,
    private readonly flags: FeatureFlagsService,
    private readonly audit: AuditService,
    private readonly totp: TotpService,
    private readonly config: AppConfig,
  ) {}

  private env() {
    return this.config.env as unknown as Record<string, unknown>;
  }

  /** P1 overview + P3 monitoring data for the current round. */
  async overview(now = new Date()) {
    const round = await this.rounds.current();
    const [owed, refunds, reconcile, breaker, recent, lastHour, vrf] = await Promise.all([
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
      this.ledger.reconcile(),
      this.breakerState(),
      this.roundRows(5),
      round
        ? this.prisma.entry.count({
            where: { roundId: round.id, createdAt: { gte: addHours(now, -1) } },
          })
        : Promise.resolve(0),
      this.prisma.randomnessRequest.findFirst({ orderBy: { requestedAt: 'desc' } }),
    ]);
    const view = round ? this.rounds.view(round) : null;
    const previous = round
      ? await this.prisma.round.findFirst({
          where: { number: { lt: round.number }, status: 'settled' },
          orderBy: { number: 'desc' },
        })
      : null;
    return {
      round: view,
      serverNow: now.toISOString(),
      previous: previous
        ? {
            number: previous.number,
            pool: usdt(previous.poolAmount),
            entries: previous.entriesCount,
          }
        : null,
      kpis: {
        pool: view?.poolBalance ?? '0.00',
        entries: view?.entries ?? 0,
        participants: view?.participants ?? 0,
        fees: view?.platformFees ?? '0.00',
        owedPrizes: usdt(owed._sum.amount),
        owedPrizesCount: owed._count,
        refundsOutstanding: usdt(refunds._sum.amount),
        refundsOutstandingCount: refunds._count,
        entriesLastHour: lastHour,
      },
      pipeline: {
        contract: {
          address: (this.env().POOL_CONTRACT_ADDRESS as string | undefined) ?? null,
          network: 'arbitrum',
          configured: Boolean(this.env().POOL_CONTRACT_ADDRESS),
        },
        randomness: {
          provider: (this.env().RANDOMNESS_PROVIDER as string | undefined) ?? 'mock',
          timeoutHours: Number(this.env().VRF_TIMEOUT_HOURS ?? 24),
          lastRequest: vrf
            ? {
                status: vrf.status,
                requestedAt: vrf.requestedAt.toISOString(),
                fulfilledAt: vrf.fulfilledAt?.toISOString() ?? null,
              }
            : null,
        },
        newEntries: breaker.entriesEnabled ? ('open' as const) : ('paused' as const),
        breakerLastChange: breaker.lastChange,
        ledger: {
          ok: reconcile.ok,
          poolMismatches: reconcile.poolMismatches.length,
          checkedAt: now.toISOString(),
        },
      },
      recent,
      policy: IMMUTABLE_POLICY,
    };
  }

  /** P2 pool balance: ledger vs projection per active round + hourly growth of the current round. */
  async balance(now = new Date()) {
    const round = await this.rounds.current();
    const [byType, owed, refunds, perRound, hourly, movements] = await Promise.all([
      this.ledger.balancesByType(),
      this.prisma.prizeClaim.aggregate({ where: { status: 'owed' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({
        where: { type: 'refund', status: 'pending' },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<
        {
          number: number;
          status: string;
          ledger: string;
          projection: string;
          fees: string;
          is_demo: boolean;
        }[]
      >`
        SELECT r.number, r.status::text AS status, COALESCE(SUM(e.amount), 0)::text AS ledger,
               r.pool_amount::text AS projection, r.platform_fees::text AS fees, r.is_demo
        FROM rounds r JOIN ledger_accounts a ON a.round_id = r.id AND a.type = 'pool'
          LEFT JOIN ledger_entries e ON e.account_id = a.id
        WHERE r.status IN ('open', 'closed', 'drawing')
        GROUP BY r.id ORDER BY r.number`,
      round
        ? this.prisma.$queryRaw<{ hour: Date; amount: string; entries: bigint }[]>`
            SELECT date_trunc('hour', created_at) AS hour, SUM(amount)::text AS amount, SUM(entry_count)::bigint AS entries
            FROM pool_ledger WHERE round_id = ${round.id}::uuid AND kind = 'entry'
            GROUP BY 1 ORDER BY 1`
        : Promise.resolve([]),
      round
        ? this.prisma.poolLedger.findMany({
            where: { roundId: round.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
    ]);
    const userIds = [...new Set(movements.map((x) => x.userId).filter(Boolean) as string[])];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, handle: true },
    });
    const handle = new Map(users.map((u) => [u.id, atHandle(u.handle)]));
    const escrow = perRound.reduce((a, r) => a.plus(m(r.ledger)), money(0));
    let running = money(0);
    return {
      round: round ? this.rounds.view(round) : null,
      escrow: toUSDTString(escrow),
      poolAccountsTotal: usdt(byType.pool),
      owedPrizes: usdt(owed._sum.amount),
      refundsOutstanding: usdt(refunds._sum.amount),
      contractLiabilities: toUSDTString(
        escrow.plus(m(owed._sum.amount)).plus(m(refunds._sum.amount)),
      ),
      feesSeparate: usdt(byType.fees),
      perRound: perRound.map((r) => ({
        number: r.number,
        status: r.status,
        ledger: usdt(r.ledger),
        projection: usdt(r.projection),
        fees: usdt(r.fees),
        matches: m(r.ledger).eq(m(r.projection)),
        isDemo: r.is_demo,
      })),
      hourly: hourly.map((h) => {
        running = running.plus(m(h.amount));
        return {
          hour: h.hour.toISOString(),
          added: usdt(h.amount),
          entries: Number(h.entries),
          cumulative: toUSDTString(running),
        };
      }),
      movements: movements.map((x) => ({
        id: x.id,
        kind: x.kind,
        handle: x.userId ? (handle.get(x.userId) ?? null) : null,
        entries: x.entryCount,
        amount: usdt(x.amount),
        at: x.createdAt.toISOString(),
      })),
      generatedAt: now.toISOString(),
    };
  }

  /** P3 active-round monitor: thresholds, feed, concentration. */
  async activeRound(now = new Date()) {
    const round = await this.prisma.round.findFirst({
      where: { status: { in: [...ACTIVE] } },
      orderBy: { closesAt: 'asc' },
    });
    const current = round ? await this.rounds.byId(round.id) : await this.rounds.current();
    if (!current) return { round: null, serverNow: now.toISOString() };
    const [feed, top, perHour] = await Promise.all([
      this.rounds.feed(current.id, 12),
      this.prisma.$queryRaw<{ user_id: string; handle: string | null; entries: bigint }[]>`
        SELECT e.user_id::text AS user_id, u.handle, count(*)::bigint AS entries
        FROM entries e JOIN users u ON u.id = e.user_id
        WHERE e.round_id = ${current.id}::uuid GROUP BY e.user_id, u.handle ORDER BY entries DESC LIMIT 5`,
      this.prisma.$queryRaw<{ hour: Date; entries: bigint }[]>`
        SELECT date_trunc('hour', created_at) AS hour, count(*)::bigint AS entries
        FROM entries WHERE round_id = ${current.id}::uuid GROUP BY 1 ORDER BY 1`,
    ]);
    const total = current.entriesCount || 1;
    return {
      round: this.rounds.view(current),
      serverNow: now.toISOString(),
      feed: feed.map((f) => ({ ...f, handle: atHandle(f.handle) })),
      topParticipants: top.map((t) => ({
        handle: atHandle(t.handle),
        entries: Number(t.entries),
        sharePercent: ((Number(t.entries) / total) * 100).toFixed(2),
      })),
      entriesPerHour: perHour.map((h) => ({
        hour: h.hour.toISOString(),
        entries: Number(h.entries),
      })),
      progress: {
        participantsPercent: Math.min(
          100,
          Math.round((current.participantsCount / current.minParticipants) * 100),
        ),
        poolPercent: Math.min(
          100,
          Math.round(
            m(current.poolAmount.toFixed()).div(m(current.minPool.toFixed())).times(100).toNumber(),
          ),
        ),
      },
      policy: IMMUTABLE_POLICY,
    };
  }

  /** P4 historical rounds with settlement / refund progress. */
  async history(query: PaginationQuery & { status?: string }) {
    const where = {
      status: {
        in: (query.status
          ? [query.status]
          : ['settled', 'cancelled', 'closed', 'drawing']) as never[],
      },
    };
    const [rows, total] = await Promise.all([
      this.prisma.round.findMany({
        where,
        orderBy: { number: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { randomnessRequests: { orderBy: { requestedAt: 'desc' }, take: 1 } },
      }),
      this.prisma.round.count({ where }),
    ]);
    const items = await Promise.all(rows.map((r) => this.roundRow(r)));
    return paginate(items, total, query);
  }

  private async roundRows(limit: number) {
    const rows = await this.prisma.round.findMany({
      orderBy: { number: 'desc' },
      take: limit,
      include: { randomnessRequests: { orderBy: { requestedAt: 'desc' }, take: 1 } },
    });
    return Promise.all(rows.map((r) => this.roundRow(r)));
  }

  private async roundRow(
    r: Awaited<ReturnType<PrismaService['round']['findFirstOrThrow']>> & {
      randomnessRequests?: { status: string; provider: string }[];
    },
  ) {
    const [winners, credited, refunds] = await Promise.all([
      this.prisma.winner.count({ where: { roundId: r.id } }),
      this.prisma.prizeClaim.count({ where: { winner: { roundId: r.id } } }),
      r.status === 'cancelled'
        ? this.prisma.transaction.groupBy({
            by: ['status'],
            where: { roundId: r.id, type: 'refund' },
            _count: true,
          })
        : Promise.resolve([]),
    ]);
    const refundsClaimed = refunds.find((x) => x.status === 'completed')?._count ?? 0;
    const refundsTotal = refunds.reduce((n, x) => n + x._count, 0);
    const first = await this.prisma.winner.findFirst({ where: { roundId: r.id, rank: 1 } });
    return {
      id: r.id,
      number: r.number,
      status: r.status,
      statusLabel: ROUND_STATUS_LABEL[r.status],
      closesAt: r.closesAt.toISOString(),
      settledAt: r.settledAt?.toISOString() ?? null,
      participants: r.participantsCount,
      entries: r.entriesCount,
      pool: usdt(r.poolAmount),
      fees: usdt(r.platformFees),
      firstPrize: first ? usdt(first.amount) : null,
      thresholdsMet: r.thresholdsMet,
      vrf: r.randomnessRequests?.[0]
        ? { status: r.randomnessRequests[0].status, provider: r.randomnessRequests[0].provider }
        : null,
      settlement:
        r.status === 'settled'
          ? {
              winners,
              of: PRIZES_PER_ROUND,
              credited,
              label: `${credited} / ${winners || PRIZES_PER_ROUND} credited`,
            }
          : r.status === 'cancelled'
            ? {
                refundsClaimed,
                refundsTotal,
                label: `Refunds ${refundsClaimed} / ${refundsTotal} claimed`,
              }
            : null,
      isDemo: r.isDemo,
    };
  }

  /** P5 participants of a round (grouped by player). */
  async participants(number: number, query: AdminParticipantsQuery) {
    const round = await this.prisma.round.findUnique({ where: { number } });
    if (!round) throw notFound(`Round #${number}`);
    const q = query.q?.replace(/^@/, '').toLowerCase() ?? null;
    const like = q ? `%${q}%` : null;
    const offset = (query.page - 1) * query.pageSize;
    const [rows, countRow, totals] = await Promise.all([
      this.prisma.$queryRaw<
        {
          user_id: string;
          handle: string | null;
          public_id: string;
          entries: bigint;
          first_seq: number;
          last_seq: number;
          first_at: Date;
          last_at: Date;
          kyc_level: string | null;
          country: string | null;
          restricted: boolean;
          is_demo: boolean;
        }[]
      >`
        SELECT e.user_id::text AS user_id, u.handle, u.public_id, count(*)::bigint AS entries,
               min(e.seq) AS first_seq, max(e.seq) AS last_seq, min(e.created_at) AS first_at, max(e.created_at) AS last_at,
               p.kyc_level::text AS kyc_level, p.country,
               EXISTS (SELECT 1 FROM user_restrictions ur WHERE ur.user_id = e.user_id AND ur.lifted_at IS NULL) AS restricted,
               u.is_demo
        FROM entries e JOIN users u ON u.id = e.user_id LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE e.round_id = ${round.id}::uuid AND (${like}::text IS NULL OR u.handle LIKE ${like} OR u.public_id ILIKE ${like})
        GROUP BY e.user_id, u.handle, u.public_id, p.kyc_level, p.country, u.is_demo
        ORDER BY entries DESC, first_seq ASC
        LIMIT ${query.pageSize} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(DISTINCT e.user_id)::bigint AS n FROM entries e JOIN users u ON u.id = e.user_id
        WHERE e.round_id = ${round.id}::uuid AND (${like}::text IS NULL OR u.handle LIKE ${like} OR u.public_id ILIKE ${like})`,
      this.prisma.$queryRaw<{ max: bigint | null; median: number | null; single: bigint }[]>`
        SELECT max(c)::bigint AS max, percentile_cont(0.5) WITHIN GROUP (ORDER BY c) AS median,
               count(*) FILTER (WHERE c = 1)::bigint AS single
        FROM (SELECT count(*) AS c FROM entries WHERE round_id = ${round.id}::uuid GROUP BY user_id) x`,
    ]);
    const totalEntries = round.entriesCount || 1;
    const price = m(round.entryPrice.toFixed());
    const fee = m(round.platformFeePerEntry.toFixed());
    return {
      round: {
        id: round.id,
        number: round.number,
        status: round.status,
        entries: round.entriesCount,
        participants: round.participantsCount,
        pool: usdt(round.poolAmount),
        isDemo: round.isDemo,
      },
      stats: {
        maxEntries: Number(totals[0]?.max ?? 0),
        medianEntries: Number(totals[0]?.median ?? 0),
        singleEntryPlayers: Number(totals[0]?.single ?? 0),
        maxSharePercent: ((Number(totals[0]?.max ?? 0) / totalEntries) * 100).toFixed(2),
      },
      ...paginate(
        rows.map((r) => {
          const entries = Number(r.entries);
          return {
            userId: r.user_id,
            handle: atHandle(r.handle),
            publicId: r.public_id,
            entries,
            stake: toUSDTString(price.times(entries)),
            fees: toUSDTString(fee.times(entries)),
            sharePercent: ((entries / totalEntries) * 100).toFixed(2),
            firstEntry: `E-${round.number}-${String(r.first_seq).padStart(5, '0')}`,
            lastEntry: `E-${round.number}-${String(r.last_seq).padStart(5, '0')}`,
            firstAt: r.first_at.toISOString(),
            lastAt: r.last_at.toISOString(),
            kycLevel: r.kyc_level ?? 'none',
            country: r.country,
            restricted: r.restricted,
            isDemo: r.is_demo,
          };
        }),
        Number(countRow[0]?.n ?? 0),
        query,
      ),
    };
  }

  /** P6 prize distribution + P8 settlement status for one round. */
  async prizes(number: number) {
    const round = await this.rounds.byNumber(number);
    const view = this.rounds.view(round);
    const claims = await this.prisma.prizeClaim.findMany({
      where: { winner: { roundId: round.id } },
      include: { winner: { select: { rank: true } } },
    });
    const postings = await this.prisma.ledgerPosting.findMany({
      where: {
        roundId: round.id,
        kind: { in: ['round_settlement', 'prize_award', 'round_refund'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, kind: true, description: true, createdAt: true, reference: true },
    });
    const breakdown = prizeBreakdown(view.poolBalance);
    const winners = view.winners.map((w) => {
      const claim = claims.find((c) => c.winner.rank === w.place);
      return {
        ...w,
        claimStatus: claim
          ? claim.status
          : view.status === 'settled'
            ? ('not_materialised' as const)
            : null,
        claimedAt: claim?.claimedAt?.toISOString() ?? null,
      };
    });
    const credited = claims.length;
    return {
      round: view,
      breakdown,
      winners,
      settlement: {
        status:
          view.status === 'settled'
            ? ('settled' as const)
            : view.status === 'cancelled'
              ? ('cancelled' as const)
              : view.status === 'drawing'
                ? ('awaiting_randomness' as const)
                : ('not_started' as const),
        prizes: PRIZES_PER_ROUND,
        winnersRecorded: view.winners.length,
        creditedToOwed: credited,
        claimed: claims.filter((c) => c.status === 'claimed').length,
        owed: claims.filter((c) => c.status === 'owed').length,
        owedAmount: toUSDTString(
          claims
            .filter((c) => c.status === 'owed')
            .reduce((a, c) => a.plus(m(c.amount.toFixed())), money(0)),
        ),
        postings: postings.map((p) => ({
          id: p.id,
          kind: p.kind,
          description: p.description,
          reference: p.reference,
          at: p.createdAt.toISOString(),
        })),
        note: 'Settlement takes only the fulfilled random word and the canonical entry list; prizes are credited to Owed in one transaction per round.',
      },
      policy: IMMUTABLE_POLICY,
    };
  }

  /** P7 VRF requests. */
  async vrf(query: PaginationQuery) {
    const [rows, total, byStatus] = await Promise.all([
      this.prisma.randomnessRequest.findMany({
        orderBy: { requestedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { round: { select: { number: true, status: true, closesAt: true } } },
      }),
      this.prisma.randomnessRequest.count(),
      this.prisma.randomnessRequest.groupBy({ by: ['status'], _count: true }),
    ]);
    const next = await this.prisma.round.findFirst({
      where: { status: { in: ['open', 'closed', 'drawing'] } },
      orderBy: { closesAt: 'asc' },
    });
    const env = this.env();
    return {
      config: {
        provider: (env.RANDOMNESS_PROVIDER as string | undefined) ?? 'mock',
        network: 'Arbitrum Sepolia (421614)',
        timeoutHours: Number(env.VRF_TIMEOUT_HOURS ?? 24),
        contract: (env.POOL_CONTRACT_ADDRESS as string | undefined) ?? null,
        algorithm: 'GLOBAL_POOL_WINNERS_V1 (mirror of DrawMath.sol)',
      },
      nextDraw: next
        ? { roundNumber: next.number, status: next.status, closesAt: next.closesAt.toISOString() }
        : null,
      counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      ...paginate(
        rows.map((r) => ({
          id: r.id,
          roundNumber: r.round.number,
          roundStatus: r.round.status,
          provider: r.provider,
          status: r.status,
          requestId: r.requestId,
          attempt: r.attempt,
          requestTxHash: r.requestTxHash,
          fulfillTxHash: r.fulfillTxHash,
          randomWord: r.randomWord,
          confirmations: r.confirmations,
          requestedAt: r.requestedAt.toISOString(),
          fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
          latencySeconds: r.fulfilledAt
            ? Math.round((r.fulfilledAt.getTime() - r.requestedAt.getTime()) / 1000)
            : null,
          failureReason: r.failureReason,
          isDemo: r.isDemo,
        })),
        total,
        query,
      ),
    };
  }

  // ── P10 circuit breaker (NEW entries only) ────────────────────────────────────────────────────

  async breakerState(adminId?: string, now = new Date()) {
    const [entriesEnabled, pending, history, lastAudit] = await Promise.all([
      this.flags.isEnabled(ENTRIES_FLAG),
      this.prisma.adminApproval.findFirst({
        where: { targetType: 'feature_flag', targetId: ENTRIES_FLAG, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: { requestedBy: { select: { name: true } } },
      }),
      this.prisma.adminApproval.findMany({
        where: { targetType: 'feature_flag', targetId: ENTRIES_FLAG, status: { not: 'pending' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { requestedBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
      }),
      this.prisma.auditLog.findFirst({
        where: { action: 'pool.circuit_breaker.applied' },
        orderBy: { seq: 'desc' },
      }),
    ]);
    const expiresAt = pending ? expiryOf(pending.createdAt) : null;
    const expired = Boolean(expiresAt && expiresAt <= now);
    return {
      flag: ENTRIES_FLAG,
      entriesEnabled,
      state: entriesEnabled ? ('open' as const) : ('paused' as const),
      scope:
        'Pauses NEW entry purchases only. Existing entries, the draw, settlement, refunds, claims and withdrawals are not affected.',
      lastChange: lastAudit
        ? {
            at: lastAudit.createdAt.toISOString(),
            by: lastAudit.actorLabel,
            action: (lastAudit.metadata as { action?: string } | null)?.action ?? null,
            seq: lastAudit.seq.toString(),
          }
        : null,
      pending:
        pending && !expired
          ? {
              id: pending.id,
              reference: `AR-${pending.id.slice(0, 4).toUpperCase()}`,
              action: pending.action,
              requestedBy: pending.requestedBy.name,
              requestedByMe: adminId ? pending.requestedByAdminId === adminId : false,
              reason: pending.requestReason,
              reasonCategory:
                (pending.payload as { reasonCategory?: string } | null)?.reasonCategory ?? null,
              createdAt: pending.createdAt.toISOString(),
              expiresAt: expiresAt!.toISOString(),
            }
          : null,
      history: history.map((h) => ({
        id: h.id,
        reference: `AR-${h.id.slice(0, 4).toUpperCase()}`,
        action: h.action,
        status: h.status,
        requestedBy: h.requestedBy.name,
        decidedBy: h.decidedBy?.name ?? null,
        reason: h.requestReason,
        decisionReason: h.decisionReason,
        createdAt: h.createdAt.toISOString(),
        decidedAt: h.decidedAt?.toISOString() ?? null,
      })),
      rules: {
        roles: BREAKER_ROLES.map((r) => BREAKER_ROLE_LABEL[r]),
        secondApprover: 'Different person and different role',
        reauth: '2FA for requester and approver',
        ttlMinutes: BREAKER_REQUEST_TTL_MINUTES,
        resume: 'Same dual-approval flow',
      },
      policy: IMMUTABLE_POLICY,
    };
  }

  /**
   * Mark a lapsed breaker request expired — only while it is still pending (compare-and-set, so a concurrent
   * approval is never overwritten) — with its system audit row. Returns false when it was no longer pending.
   */
  private async expireRequest(
    tx: Tx,
    a: { id: string; action: string; targetType: string; targetId: string },
  ): Promise<boolean> {
    const res = await tx.adminApproval.updateMany({
      where: { id: a.id, status: 'pending' },
      data: { status: 'expired' },
    });
    if (res.count !== 1) return false;
    await this.audit.record(
      {
        actorType: 'system',
        action: 'approval.expired',
        targetType: a.targetType,
        targetId: a.targetId,
        metadata: { approvalId: a.id, requestedAction: a.action, expired: true },
      },
      tx,
    );
    return true;
  }

  private async verifyMfa(admin: AuthAdmin, code: string) {
    await this.totp.verifyActive({ adminUserId: admin.id }, code, { allowBackup: false });
  }

  async requestBreaker(admin: AuthAdmin, input: CircuitBreakerRequest, meta: RequestMeta) {
    if (breakerRolesOf(admin.roles).length === 0) {
      throw new AppError(
        'FORBIDDEN',
        'Only Super Admin, Finance or Compliance can request a breaker change',
        {
          allowedRoles: [...BREAKER_ROLES],
        },
      );
    }
    const enabled = await this.flags.isEnabled(ENTRIES_FLAG);
    if (input.action === 'pause_new_entries' && !enabled)
      throw new AppError('CONFLICT', 'New entries are already paused');
    if (input.action === 'resume_new_entries' && enabled)
      throw new AppError('CONFLICT', 'New entries are already open');
    const existing = await this.prisma.adminApproval.findFirst({
      where: { targetType: 'feature_flag', targetId: ENTRIES_FLAG, status: 'pending' },
    });
    if (existing && expiryOf(existing.createdAt) > new Date()) {
      throw new AppError(
        'CONFLICT',
        'A circuit-breaker request is already waiting for a second approver',
      );
    }
    await this.verifyMfa(admin, input.mfaCode);
    return this.prisma.tx(async (tx) => {
      if (existing && !(await this.expireRequest(tx, existing))) {
        // It was decided (or expired) concurrently: never overwrite that outcome.
        throw new AppError('CONFLICT', 'The previous circuit-breaker request just changed — reload');
      }
      const approval = await tx.adminApproval.create({
        data: {
          action:
            input.action === 'pause_new_entries' ? 'pool.entries.pause' : 'pool.entries.resume',
          targetType: 'feature_flag',
          targetId: ENTRIES_FLAG,
          requestedByAdminId: admin.id,
          requestReason: input.reason,
          payload: {
            reasonCategory: input.reasonCategory ?? null,
            flag: ENTRIES_FLAG,
            // Same shape as the four-eyes inbox (admin approvals): decided at POST /admin/pool/circuit-breaker/:id/decision.
            expiresAt: expiryOf(new Date()).toISOString(),
            requesterRoles: breakerRolesOf(admin.roles),
            decideAt: '/admin/pool/policy',
          },
        },
      });
      const audit = await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action: 'pool.circuit_breaker.requested',
          targetType: 'feature_flag',
          targetId: ENTRIES_FLAG,
          reason: input.reason,
          outcome: 'pending_approval',
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { approvalId: approval.id, action: input.action },
        },
        tx,
      );
      return {
        approvalId: approval.id,
        reference: `AR-${approval.id.slice(0, 4).toUpperCase()}`,
        status: 'pending_approval' as const,
        approvals: 1,
        of: 2,
        expiresAt: expiryOf(approval.createdAt).toISOString(),
        auditSeq: audit.seq,
      };
    });
  }

  async decideBreaker(
    admin: AuthAdmin,
    approvalId: string,
    input: CircuitBreakerDecision,
    meta: RequestMeta,
  ) {
    const myRoles = breakerRolesOf(admin.roles);
    if (myRoles.length === 0) {
      throw new AppError(
        'FORBIDDEN',
        'Only Super Admin, Finance or Compliance can approve a breaker change',
        {
          allowedRoles: [...BREAKER_ROLES],
        },
      );
    }
    const approval = await this.prisma.adminApproval.findUnique({ where: { id: approvalId } });
    if (!approval || approval.targetType !== 'feature_flag' || approval.targetId !== ENTRIES_FLAG)
      throw notFound('Circuit-breaker request');
    if (approval.status !== 'pending')
      throw new AppError('CONFLICT', `This request is ${approval.status}`);
    if (approval.requestedByAdminId === admin.id) {
      throw new AppError(
        'FORBIDDEN',
        'Four-eyes rule: a different admin must give the second approval',
      );
    }
    const requesterRoles = await this.prisma.adminUserRole.findMany({
      where: { adminUserId: approval.requestedByAdminId },
      select: { role: { select: { key: true } } },
    });
    const shared = myRoles.filter((r) => requesterRoles.some((x) => x.role.key === r));
    if (shared.length === myRoles.length) {
      throw new AppError(
        'FORBIDDEN',
        'Dual control: the second approver must hold a different role than the requester',
        { requesterRoles: requesterRoles.map((x) => x.role.key) },
      );
    }
    if (expiryOf(approval.createdAt) <= new Date()) {
      await this.prisma.tx((tx) => this.expireRequest(tx, approval));
      throw new AppError('CONFLICT', 'This request expired — ask for a new one');
    }
    await this.verifyMfa(admin, input.mfaCode);
    const pause = approval.action === 'pool.entries.pause';
    const result = await this.prisma.tx(async (tx) => {
      // The claim re-checks the TTL at decision time (the MFA check above takes time): a request created more
      // than BREAKER_REQUEST_TTL_MINUTES ago can never be approved.
      const updated = await tx.adminApproval.updateMany({
        where: {
          id: approval.id,
          status: 'pending',
          createdAt: { gt: addMinutes(new Date(), -BREAKER_REQUEST_TTL_MINUTES) },
        },
        data: {
          status: input.decision === 'approve' ? 'approved' : 'rejected',
          decidedByAdminId: admin.id,
          decisionReason: input.reason,
          decidedAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        const now = await tx.adminApproval.findUnique({
          where: { id: approval.id },
          select: { status: true },
        });
        throw new AppError(
          'CONFLICT',
          now?.status === 'pending'
            ? 'This request expired — ask for a new one'
            : 'This request was already decided',
        );
      }
      if (input.decision === 'approve') {
        await tx.featureFlag.upsert({
          where: { key: ENTRIES_FLAG },
          create: {
            key: ENTRIES_FLAG,
            enabled: !pause,
            description: 'Players can buy Global Pool entries',
          },
          update: { enabled: !pause },
        });
      }
      const audit = await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action:
            input.decision === 'approve'
              ? 'pool.circuit_breaker.applied'
              : 'pool.circuit_breaker.declined',
          targetType: 'feature_flag',
          targetId: ENTRIES_FLAG,
          reason: input.reason,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: {
            approvalId: approval.id,
            action: pause ? 'pause_new_entries' : 'resume_new_entries',
            requestedByAdminId: approval.requestedByAdminId,
          },
        },
        tx,
      );
      return { auditSeq: audit.seq };
    });
    this.flags.invalidate();
    return {
      approvalId: approval.id,
      decision: input.decision,
      entriesEnabled:
        input.decision === 'approve' ? !pause : await this.flags.isEnabled(ENTRIES_FLAG),
      auditSeq: result.auditSeq,
    };
  }

  /**
   * P9 / F7: remind players of a cancelled round that a refund is waiting in Owed (in-app notification only —
   * it never moves money). Reason required, audited, at most once per round per 24 h.
   */
  async remindRefunds(admin: AuthAdmin, number: number, reason: string, meta: RequestMeta) {
    if (!admin.permissions.includes('notifications.send')) {
      throw new AppError('FORBIDDEN', 'Your role does not allow this action', {
        missingPermissions: ['notifications.send'],
      });
    }
    const round = await this.prisma.round.findUnique({ where: { number } });
    if (!round) throw notFound(`Round #${number}`);
    if (round.status !== 'cancelled')
      throw new AppError('CONFLICT', 'Only cancelled rounds have refunds');
    const recent = await this.prisma.auditLog.findFirst({
      where: {
        action: 'refunds.reminder.sent',
        targetType: 'round',
        targetId: round.id,
        createdAt: { gte: addHours(new Date(), -24) },
      },
    });
    if (recent)
      throw new AppError(
        'CONFLICT',
        'A reminder for this round was already sent in the last 24 hours',
      );
    const pending = await this.prisma.transaction.findMany({
      where: { roundId: round.id, type: 'refund', status: 'pending' },
      select: { userId: true, amount: true },
    });
    if (pending.length === 0)
      throw new AppError('CONFLICT', 'Every refund of this round has been claimed');
    const label = `#${round.number.toLocaleString('en-US')}`;
    return this.prisma.tx(async (tx) => {
      await tx.notification.createMany({
        data: pending.map((p) => ({
          userId: p.userId,
          type: 'round.cancelled',
          title: `Refund waiting — round ${label}`,
          body: `${usdt(p.amount)} USDT from cancelled round ${label} is in your Owed balance. Claim it to Available any time.`,
          data: { roundNumber: round.number },
          isDemo: round.isDemo,
        })),
      });
      const audit = await this.audit.record(
        {
          actorType: 'admin',
          actorId: admin.id,
          actorLabel: admin.name,
          action: 'refunds.reminder.sent',
          targetType: 'round',
          targetId: round.id,
          reason,
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { roundNumber: round.number, players: pending.length },
        },
        tx,
      );
      return { roundNumber: round.number, players: pending.length, auditSeq: audit.seq };
    });
  }
}
