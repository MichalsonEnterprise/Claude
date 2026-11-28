import { Injectable } from '@nestjs/common';
import type { Prisma, RandomnessRequest, Round, Winner } from '@prisma/client';
import { ENTRY_PRICE, PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import { ROUND_STATUS_LABEL } from '@gp/shared/enums';
import { formatRoundNumber, truncateAddress } from '@gp/shared/format';
import { money } from '@gp/shared/money';
import { ROUND_THRESHOLDS, oddsDisclosure, prizeBreakdown } from '@gp/shared/pool';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import { usdt } from '../../common/money';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { DEFAULT_PRIZE_SPLIT_BPS, WINNERS_DOMAIN, selectWinners } from '../randomness/selection';
import { PoolEventsService } from './pool-events.service';

type RoundWith = Round & {
  winners?: (Winner & { user: { handle: string | null } | null; entry: { code: string } | null })[];
  randomnessRequests?: RandomnessRequest[];
};

export const entryCode = (roundNumber: number, seq: number) => `E-${roundNumber}-${String(seq).padStart(5, '0')}`;

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly events: PoolEventsService,
  ) {}

  /** Open a round with immutable rules (+ its POOL ledger account). Admins cannot change rules or outcomes later. */
  async open(input: {
    opensAt: Date;
    closesAt: Date;
    number?: number;
    minParticipants?: number;
    minPool?: string;
    isDemo?: boolean;
  }) {
    const round = await this.prisma.tx(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7262201)`;
      const last = await tx.round.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
      const number = input.number ?? (last?.number ?? 0) + 1;
      const now = new Date();
      const created = await tx.round.create({
        data: {
          number,
          status: input.opensAt <= now ? 'open' : 'scheduled',
          opensAt: input.opensAt,
          closesAt: input.closesAt,
          openedAt: input.opensAt <= now ? now : null,
          entryPrice: ENTRY_PRICE,
          platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
          minParticipants: input.minParticipants ?? ROUND_THRESHOLDS.minParticipants,
          minPool: input.minPool ?? ROUND_THRESHOLDS.minPool,
          prizeSplitBps: [...DEFAULT_PRIZE_SPLIT_BPS],
          onchainRoundId: BigInt(number),
          isDemo: input.isDemo ?? false,
        },
      });
      await this.ledger.ensureAccounts(tx, [{ type: 'pool', roundId: created.id }]);
      return created;
    });
    this.events.emit({ type: 'round.status', roundId: round.id, roundNumber: round.number, status: round.status, at: new Date().toISOString() });
    return round;
  }

  /** The round players should see: open → next scheduled → most recent. */
  async current(db: Db = this.prisma): Promise<RoundWith | null> {
    const include = this.include();
    return (
      (await db.round.findFirst({ where: { status: 'open' }, orderBy: { closesAt: 'asc' }, include })) ??
      (await db.round.findFirst({ where: { status: 'scheduled' }, orderBy: { opensAt: 'asc' }, include })) ??
      (await db.round.findFirst({ orderBy: { number: 'desc' }, include }))
    );
  }

  async byNumber(number: number): Promise<RoundWith> {
    const round = await this.prisma.round.findUnique({ where: { number }, include: this.include() });
    if (!round) throw notFound(`Round ${formatRoundNumber(number)}`);
    return round;
  }

  async byId(id: string): Promise<RoundWith> {
    const round = await this.prisma.round.findUnique({ where: { id }, include: this.include() });
    if (!round) throw notFound('Round');
    return round;
  }

  async history(query: PaginationQuery) {
    const where: Prisma.RoundWhereInput = { status: { in: ['settled', 'cancelled', 'closed', 'drawing'] } };
    const [rows, total] = await Promise.all([
      this.prisma.round.findMany({
        where,
        orderBy: { number: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: this.include(),
      }),
      this.prisma.round.count({ where }),
    ]);
    return paginate(rows.map((r) => this.view(r)), total, query);
  }

  async myEntries(userId: string, roundId: string) {
    const round = await this.byId(roundId);
    const entries = await this.prisma.entry.findMany({
      where: { roundId, userId },
      orderBy: { seq: 'asc' },
      select: { code: true, seq: true, status: true, createdAt: true },
    });
    const purchases = await this.prisma.transaction.findMany({
      where: { userId, roundId, type: 'entry_purchase' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      roundId,
      roundNumber: round.number,
      entries: entries.length,
      entryIds: entries.map((e) => e.code),
      firstEntryId: entries[0]?.code ?? null,
      lastEntryId: entries.at(-1)?.code ?? null,
      entryAmount: usdt(money(round.entryPrice.toFixed()).times(entries.length)),
      platformFee: usdt(purchases.reduce((a, p) => a.plus(money(p.platformFee.toFixed())), money(0))),
      purchases: purchases.map((p) => ({ reference: p.reference, total: usdt(p.netAmount), at: p.createdAt.toISOString() })),
      odds: round.entriesCount > 0 ? oddsDisclosure(entries.length, round.entriesCount, Math.min(13, round.entriesCount)) : null,
    };
  }

  async feed(roundId: string, limit = 10) {
    const rows = await this.prisma.transaction.findMany({
      where: { roundId, type: 'entry_purchase' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { handle: true } } },
    });
    return rows.map((r) => {
      const entries = Number((r.metadata as { entries?: number } | null)?.entries ?? 0);
      return { id: r.id, handle: r.user.handle, entries, amount: usdt(r.amount), at: r.createdAt.toISOString(), isDemo: r.isDemo };
    });
  }

  async recentWinners(limit = 10) {
    const rows = await this.prisma.winner.findMany({
      orderBy: [{ createdAt: 'desc' }, { rank: 'asc' }],
      take: limit,
      include: { round: { select: { number: true, settledAt: true } }, user: { select: { handle: true } } },
    });
    return rows.map((w) => ({
      id: w.id,
      handle: w.user?.handle ?? w.handleSnapshot,
      roundNumber: w.round.number,
      tier: w.tier,
      rank: w.rank,
      amount: usdt(w.amount),
      settledAt: w.round.settledAt?.toISOString() ?? null,
      isDemo: w.isDemo,
    }));
  }

  /** Public verification bundle: anyone can recompute the winners from the VRF word + entry list. */
  async verification(number: number) {
    const round = await this.byNumber(number);
    const request = round.randomnessRequests?.find((r) => r.status === 'fulfilled') ?? null;
    const base = {
      round: { id: round.id, number: round.number, status: round.status, totalEntries: round.entriesCount, pool: usdt(round.poolAmount) },
      algorithm: {
        name: 'GLOBAL_POOL_WINNERS_V1',
        domain: WINNERS_DOMAIN,
        description:
          'candidate_k = keccak256(abi.encode(domain, roundId, randomWord, k)); reject candidate < 2^256 mod N; index = candidate mod N; skip duplicates. Rank i = i-th distinct index. Prizes: floor(pool*bps/10000) for ranks ≥ 2, remainder to 1st.',
        roundIdUsed: (round.onchainRoundId ?? BigInt(round.number)).toString(),
        prizeSplitBps: round.prizeSplitBps,
        entryOrder: 'entries ordered by seq ascending (index = seq − 1)',
      },
      randomness: request
        ? {
            provider: request.provider,
            requestId: request.requestId,
            randomWord: request.randomWord,
            requestedAt: request.requestedAt.toISOString(),
            fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
            fulfillTxHash: request.fulfillTxHash,
          }
        : null,
    };
    if (!request?.randomWord || round.status !== 'settled' || round.entriesCount === 0) {
      return { ...base, winners: this.winnerViews(round), recomputed: null };
    }
    const entries = await this.prisma.entry.findMany({
      where: { roundId: round.id },
      orderBy: { seq: 'asc' },
      select: { id: true, seq: true, userId: true },
    });
    let matches: boolean | null = null;
    if (entries.length === round.entriesCount) {
      const recomputed = selectWinners({
        roundId: round.onchainRoundId ?? BigInt(round.number),
        randomWord: request.randomWord as `0x${string}`,
        entries: entries.map((e) => ({ seq: e.seq, entryId: e.id, userId: e.userId })),
        pool: round.poolAmount.toFixed(),
        prizeSplitBps: round.prizeSplitBps,
      });
      const stored = [...(round.winners ?? [])].sort((a, b) => a.rank - b.rank);
      matches =
        stored.length === recomputed.length &&
        recomputed.every((r, i) => stored[i]?.entrySeq === r.entrySeq && money(stored[i].amount.toFixed()).eq(money(r.amount)));
    }
    return { ...base, winners: this.winnerViews(round), recomputed: { matchesStoredWinners: matches } };
  }

  view(round: RoundWith) {
    const pool = usdt(round.poolAmount);
    const req = round.randomnessRequests?.at(-1) ?? null;
    const met =
      round.thresholdsMet ??
      (round.participantsCount >= round.minParticipants && money(pool).gte(money(round.minPool.toFixed())) ? true : round.status === 'open' ? false : null);
    return {
      id: round.id,
      number: round.number,
      numberLabel: formatRoundNumber(round.number),
      status: round.status,
      statusLabel: ROUND_STATUS_LABEL[round.status],
      opensAt: round.opensAt.toISOString(),
      openedAt: (round.openedAt ?? round.opensAt).toISOString(),
      closesAt: round.closesAt.toISOString(),
      closedAt: round.closedAt?.toISOString() ?? null,
      entryPrice: usdt(round.entryPrice),
      platformFeePerEntry: usdt(round.platformFeePerEntry),
      participants: round.participantsCount,
      entries: round.entriesCount,
      poolBalance: pool,
      platformFees: usdt(round.platformFees),
      thresholds: { minParticipants: round.minParticipants, minPool: usdt(round.minPool), met },
      prizeDistribution: prizeBreakdown(pool).tiers,
      draw: req
        ? {
            provider: req.provider,
            network: req.network,
            requestId: req.requestId,
            requestIdDisplay: req.requestId.length > 14 ? truncateAddress(req.requestId) : req.requestId,
            requestedAt: req.requestedAt.toISOString(),
            fulfilledAt: req.fulfilledAt?.toISOString() ?? null,
            confirmations: req.confirmations,
            status: req.status,
            settledAt: round.settledAt?.toISOString() ?? null,
          }
        : null,
      winners: this.winnerViews(round),
      cancellation:
        round.status === 'cancelled'
          ? { reason: (round.cancelReason ?? 'threshold_not_met') as 'threshold_not_met' | 'vrf_timeout', refundsTo: 'owed' as const }
          : null,
      settledAt: round.settledAt?.toISOString() ?? null,
      isDemo: round.isDemo,
    };
  }

  private winnerViews(round: RoundWith) {
    return [...(round.winners ?? [])]
      .sort((a, b) => a.rank - b.rank)
      .map((w) => ({
        place: w.rank,
        tier: w.tier,
        handle: w.user?.handle ?? w.handleSnapshot,
        entryId: w.entry?.code ?? null,
        entrySeq: w.entrySeq,
        amount: usdt(w.amount),
      }));
  }

  private include() {
    return {
      winners: { include: { user: { select: { handle: true } }, entry: { select: { code: true } } } },
      randomnessRequests: { orderBy: { createdAt: 'asc' as const } },
    };
  }
}
