import { Injectable, Logger } from '@nestjs/common';
import type { Round } from '@prisma/client';
import { formatRoundNumber } from '@gp/shared/format';
import { MoneyDecimal, money, toUSDTString } from '@gp/shared/money';
import type { Hex } from 'viem';

import { AppError } from '../../common/errors';
import { addHours } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { prizeAwardLines, roundRefundLines, roundSettlementLines } from '../ledger/posting';
import { NotificationsService } from '../notifications/notifications.service';
import { MirrorMismatchError, RoundMirrorService } from '../onchain-rounds/round-mirror.service';
import { RandomnessNotReadyError } from '../randomness/chainlink-vrf.provider';
import { RandomnessService } from '../randomness/randomness.service';
import { selectWinners } from '../randomness/selection';
import { PoolEventsService } from './pool-events.service';
import { RoundsService } from './rounds.service';

export interface TickReport {
  opened: number[];
  closed: number[];
  drawing: number[];
  settled: number[];
  cancelled: number[];
  scheduled: number | null;
  errors: string[];
}

/** Next daily round window (08:00–20:00 UTC) that has not closed yet. */
export function nextDailyWindow(now: Date): { opensAt: Date; closesAt: Date } {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let opensAt = new Date(day + 8 * 3_600_000);
  let closesAt = new Date(day + 20 * 3_600_000);
  if (now >= closesAt) {
    opensAt = new Date(opensAt.getTime() + 86_400_000);
    closesAt = new Date(closesAt.getTime() + 86_400_000);
  }
  return { opensAt, closesAt };
}

/**
 * Round lifecycle: scheduled → open → closed → drawing (randomness requested) → settled, or → cancelled (threshold
 * not met / VRF timeout → stakes refunded to Owed). Settlement uses ONLY the fulfilled random word + the canonical
 * entry list; nothing (and nobody) can supply winners. Runs from the BullMQ `rounds` queue.
 */
@Injectable()
export class RoundLifecycleService {
  private readonly logger = new Logger(RoundLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly rounds: RoundsService,
    private readonly randomness: RandomnessService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly events: PoolEventsService,
    private readonly config: AppConfig,
    private readonly mirror: RoundMirrorService,
  ) {}

  /** The round is mirrored on GlobalPoolRounds (on-chain commit / VRF draw / settlement record). */
  private mirrored(round: Round): boolean {
    return round.chainMirror && this.mirror.enabled;
  }

  private autoSettle(round: Round): boolean {
    return !round.isDemo || this.config.env.DEMO_ROUNDS_AUTO_SETTLE;
  }

  async tick(now = new Date()): Promise<TickReport> {
    const report: TickReport = {
      opened: [],
      closed: [],
      drawing: [],
      settled: [],
      cancelled: [],
      scheduled: null,
      errors: [],
    };
    const run = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        if (!(err instanceof RandomnessNotReadyError))
          this.logger.error(`${label}: ${String(err)}`);
        report.errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    for (const r of await this.prisma.round.findMany({
      where: { status: 'scheduled', opensAt: { lte: now } },
    })) {
      await run(`open #${r.number}`, async () => {
        const res = await this.prisma.round.updateMany({
          where: { id: r.id, status: 'scheduled' },
          data: { status: 'open', openedAt: now },
        });
        if (res.count) {
          report.opened.push(r.number);
          this.emitStatus(r, 'open');
        }
      });
    }
    // On-chain mirror housekeeping: publish rules of open rounds, record settlements / cancellations.
    for (const r of await this.mirror.pendingRounds()) {
      await run(`mirror #${r.number}`, () => this.mirror.sync(r));
    }
    for (const r of await this.prisma.round.findMany({
      where: { status: 'open', closesAt: { lte: now } },
    })) {
      await run(`close #${r.number}`, async () => {
        await this.close(r.id, now);
        report.closed.push(r.number);
      });
    }
    for (const r of await this.prisma.round.findMany({ where: { status: 'closed' } })) {
      if (!this.autoSettle(r)) continue;
      await run(`draw #${r.number}`, async () => {
        const status = await this.startDraw(r.id);
        if (status !== 'waiting') {
          (status === 'cancelled' ? report.cancelled : report.drawing).push(r.number);
        }
      });
    }
    for (const r of await this.prisma.round.findMany({ where: { status: 'drawing' } })) {
      if (!this.autoSettle(r)) continue;
      await run(`settle #${r.number}`, async () => {
        const outcome = await this.pollAndSettle(r.id, now);
        if (outcome === 'settled') report.settled.push(r.number);
        if (outcome === 'cancelled') report.cancelled.push(r.number);
      });
    }
    if (this.config.env.ROUND_AUTO_SCHEDULE) {
      await run('schedule', async () => {
        const upcoming = await this.prisma.round.count({
          where: { status: { in: ['open', 'scheduled'] }, closesAt: { gt: now } },
        });
        if (upcoming === 0) {
          const round = await this.rounds.open(nextDailyWindow(now));
          report.scheduled = round.number;
        }
      });
    }
    return report;
  }

  /** open → closed: freeze the entry list; thresholds are evaluated from the frozen numbers. */
  async close(roundId: string, now = new Date()): Promise<Round> {
    const round = await this.prisma.tx(async (tx) => {
      const r = await this.lock(tx, roundId);
      if (r.status !== 'open')
        throw new AppError('CONFLICT', `Round ${formatRoundNumber(r.number)} is ${r.status}`);
      const met =
        r.participantsCount >= r.minParticipants &&
        money(r.poolAmount.toFixed()).gte(money(r.minPool.toFixed()));
      return tx.round.update({
        where: { id: r.id },
        data: { status: 'closed', closedAt: now, thresholdsMet: met },
      });
    });
    this.emitStatus(round, 'closed');
    return round;
  }

  /**
   * closed → drawing (randomness requested) when thresholds are met, else → cancelled with refunds.
   * Mirrored rounds first commit the frozen entry list on-chain; the CONTRACT's threshold check decides, then the
   * keeper sends requestDraw (or cancelRound). 'waiting' = an on-chain transaction is still pending (next tick).
   */
  async startDraw(roundId: string): Promise<'drawing' | 'cancelled' | 'waiting'> {
    const round = await this.prisma.round.findUniqueOrThrow({ where: { id: roundId } });
    if (round.status !== 'closed')
      throw new AppError('CONFLICT', `Round ${formatRoundNumber(round.number)} is ${round.status}`);
    if (this.mirrored(round)) {
      const committed = await this.mirror.commit(round);
      if (!committed.done) return 'waiting';
      const dbMet = Boolean(round.thresholdsMet) && round.entriesCount > 0;
      if (committed.thresholdsMet && !dbMet) {
        throw new MirrorMismatchError('Contract says thresholds are met but the database does not');
      }
      if (!committed.thresholdsMet) {
        const cancelled = await this.mirror.cancelForThresholds(round);
        if (!cancelled.done) return 'waiting';
        await this.cancel(roundId, 'threshold_not_met');
        return 'cancelled';
      }
      const requested = await this.mirror.requestDraw(round);
      if (!requested.done) return 'waiting';
    } else if (!round.thresholdsMet || round.entriesCount === 0) {
      await this.cancel(roundId, 'threshold_not_met');
      return 'cancelled';
    }
    await this.randomness.request(round);
    const res = await this.prisma.round.updateMany({
      where: { id: roundId, status: 'closed' },
      data: { status: 'drawing' },
    });
    if (res.count) this.emitStatus(round, 'drawing');
    return 'drawing';
  }

  async pollAndSettle(
    roundId: string,
    now = new Date(),
  ): Promise<'settled' | 'waiting' | 'cancelled'> {
    const round = await this.prisma.round.findUniqueOrThrow({ where: { id: roundId } });
    const request = await this.prisma.randomnessRequest.findFirst({
      where: { roundId, status: { in: ['requested', 'fulfilled'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!request) {
      await this.randomness.request(round);
      return 'waiting';
    }
    const polled = await this.randomness.poll(round, request);
    if (polled.status === 'fulfilled') {
      if (this.mirrored(round)) await this.mirror.verifyDraw(round, polled.randomWord as Hex);
      const settled = await this.settle(roundId);
      if (this.mirrored(settled)) {
        await this.mirror.tryStep(`record settlement #${settled.number}`, () =>
          this.mirror.recordSettlement(settled),
        );
      }
      return 'settled';
    }
    if (this.mirrored(round)) {
      // A requested on-chain draw can never be cancelled: after the contract's 24 h timeout the keeper re-requests
      // (same committed entries; whichever request is fulfilled first is final). Disclosed in the audit log.
      if (
        addHours(polled.requestedAt, this.config.env.VRF_TIMEOUT_HOURS) < now &&
        (await this.mirror.canReRequest(round))
      ) {
        const res = await this.mirror.requestDraw(round, { reRequest: true });
        if (res.done || res.op?.status === 'sent') {
          await this.prisma.randomnessRequest.update({
            where: { id: polled.id },
            data: { status: 'timed_out' },
          });
          await this.audit.record({
            actorType: 'system',
            actorLabel: 'round-lifecycle',
            action: 'round.draw_rerequested',
            targetType: 'round',
            targetId: round.id,
            reason: 'VRF request unfulfilled for 24 h',
            metadata: { roundNumber: round.number, previousRequestId: polled.requestId },
          });
          if (res.done) await this.randomness.request(round);
        }
      }
      return 'waiting';
    }
    if (addHours(polled.requestedAt, this.config.env.VRF_TIMEOUT_HOURS) < now) {
      await this.prisma.randomnessRequest.update({
        where: { id: polled.id },
        data: { status: 'timed_out' },
      });
      await this.cancel(roundId, 'vrf_timeout');
      return 'cancelled';
    }
    return 'waiting';
  }

  /**
   * drawing → settled. Winners come exclusively from `selectWinners(randomWord, canonical entries)`; prizes move
   * POOL → PRIZE_LIABILITY → each winner's OWED bucket in balanced postings, all in one transaction.
   */
  async settle(roundId: string): Promise<Round> {
    const settled = await this.prisma.tx(
      async (tx) => {
        const round = await this.lock(tx, roundId);
        if (round.status !== 'drawing')
          throw new AppError(
            'CONFLICT',
            `Round ${formatRoundNumber(round.number)} is ${round.status}`,
          );
        const request = await tx.randomnessRequest.findFirst({
          where: { roundId, status: 'fulfilled', randomWord: { not: null } },
          orderBy: { fulfilledAt: 'asc' },
        });
        if (!request?.randomWord) throw new AppError('CONFLICT', 'Randomness not fulfilled yet');
        const poolOnLedger = await this.ledger.balanceOf({ type: 'pool', roundId }, tx);
        if (!money(poolOnLedger).eq(money(round.poolAmount.toFixed()))) {
          throw new AppError(
            'CONFLICT',
            `Pool reconciliation failed (ledger ${poolOnLedger} ≠ projection ${round.poolAmount.toFixed()})`,
          );
        }
        const entries = await tx.entry.findMany({
          where: { roundId },
          orderBy: { seq: 'asc' },
          select: { id: true, seq: true, userId: true },
        });
        if (entries.length !== round.entriesCount)
          throw new AppError('CONFLICT', 'Entry list does not match the round counters');
        const winners = selectWinners({
          roundId: round.onchainRoundId ?? BigInt(round.number),
          randomWord: request.randomWord as Hex,
          entries: entries.map((e) => ({ seq: e.seq, entryId: e.id, userId: e.userId })),
          pool: round.poolAmount.toFixed(),
          prizeSplitBps: round.prizeSplitBps,
        });
        const label = formatRoundNumber(round.number);
        const settlement = await this.ledger.post(tx, {
          kind: 'round_settlement',
          description: `Round ${label} settled — pool to prize liability`,
          reference: `round:${round.number}`,
          eventKey: `round:${round.id}:settlement`,
          roundId,
          isDemo: round.isDemo,
          lines: roundSettlementLines(roundId, round.poolAmount.toFixed()),
          metadata: { randomnessRequestId: request.requestId, randomWord: request.randomWord },
        });
        await tx.poolLedger.create({
          data: {
            roundId,
            postingId: settlement.id,
            kind: 'settlement',
            entryCount: round.entriesCount,
            amount: money(round.poolAmount.toFixed()).negated().toFixed(),
          },
        });
        await this.ledger.post(tx, {
          kind: 'prize_award',
          description: `Round ${label} prizes credited to Owed`,
          reference: `round:${round.number}`,
          eventKey: `round:${round.id}:prizes`,
          roundId,
          isDemo: round.isDemo,
          lines: prizeAwardLines(winners.map((w) => ({ userId: w.userId, amount: w.amount }))),
        });
        const users = await tx.user.findMany({
          where: { id: { in: [...new Set(winners.map((w) => w.userId))] } },
          select: { id: true, handle: true },
        });
        for (const w of winners) {
          const winner = await tx.winner.create({
            data: {
              roundId,
              rank: w.rank,
              tier: w.tier,
              entryId: w.entryId,
              entrySeq: w.entrySeq,
              userId: w.userId,
              handleSnapshot: users.find((u) => u.id === w.userId)?.handle ?? null,
              amount: w.amount,
              isDemo: round.isDemo,
            },
          });
          await tx.prizeClaim.create({
            data: { winnerId: winner.id, userId: w.userId, amount: w.amount, isDemo: round.isDemo },
          });
          await tx.transaction.create({
            data: {
              userId: w.userId,
              type: 'prize',
              status: 'pending',
              reference: `PZ-${round.number}-${w.rank}`,
              amount: w.amount,
              platformFee: '0',
              netAmount: w.amount,
              direction: 'in',
              description: `Prize #${w.rank} · Round ${label}`,
              roundId,
              isDemo: round.isDemo,
              metadata: {
                rank: w.rank,
                tier: w.tier,
                statusDetail: 'Owed — claim to move it to Available',
              },
            },
          });
          await this.notifications.notify(tx, {
            userId: w.userId,
            type: 'round.prize_won',
            title: 'You won a prize',
            body: `Rank #${w.rank} in round ${label}: ${w.amount} USDT (in Owed — claim anytime).`,
            data: { roundNumber: round.number, rank: w.rank },
            isDemo: round.isDemo,
          });
        }
        const winningIds = winners.map((w) => w.entryId);
        await tx.entry.updateMany({ where: { id: { in: winningIds } }, data: { status: 'won' } });
        await tx.entry.updateMany({
          where: { roundId, status: 'active' },
          data: { status: 'not_won' },
        });
        const done = await tx.round.update({
          where: { id: roundId },
          data: { status: 'settled', settledAt: new Date() },
        });
        await this.audit.record(
          {
            actorType: 'system',
            actorLabel: 'round-lifecycle',
            action: 'round.settled',
            targetType: 'round',
            targetId: roundId,
            metadata: {
              roundNumber: round.number,
              provider: request.provider,
              requestId: request.requestId,
              randomWord: request.randomWord,
              totalEntries: round.entriesCount,
              pool: round.poolAmount.toFixed(),
              winners: winners.map((w) => ({ rank: w.rank, seq: w.entrySeq, amount: w.amount })),
            },
          },
          tx,
        );
        return done;
      },
      { timeoutMs: 120_000 },
    );
    this.emitStatus(settled, 'settled');
    return settled;
  }

  /** Cancel (threshold not met / VRF timeout): each player's stake goes back to their OWED bucket. */
  async cancel(roundId: string, reason: 'threshold_not_met' | 'vrf_timeout'): Promise<Round> {
    const cancelled = await this.prisma.tx(
      async (tx) => {
        const round = await this.lock(tx, roundId);
        if (!['open', 'closed', 'drawing'].includes(round.status)) {
          throw new AppError(
            'CONFLICT',
            `Round ${formatRoundNumber(round.number)} is ${round.status}`,
          );
        }
        const label = formatRoundNumber(round.number);
        const stakes = await tx.entry.groupBy({
          by: ['userId'],
          where: { roundId },
          _count: { _all: true },
        });
        const refunds = stakes.map((s) => ({
          userId: s.userId,
          entries: s._count._all,
          amount: toUSDTString(money(round.entryPrice.toFixed()).times(s._count._all)),
        }));
        const total = refunds.reduce((a, r) => a.plus(money(r.amount)), new MoneyDecimal(0));
        if (!total.eq(money(round.poolAmount.toFixed()))) {
          throw new AppError(
            'CONFLICT',
            `Refund total ${total.toFixed()} ≠ pool ${round.poolAmount.toFixed()}`,
          );
        }
        if (refunds.length > 0) {
          const posting = await this.ledger.post(tx, {
            kind: 'round_refund',
            description: `Round ${label} cancelled (${reason}) — stakes refunded to Owed`,
            reference: `round:${round.number}`,
            eventKey: `round:${round.id}:refund`,
            roundId,
            isDemo: round.isDemo,
            lines: roundRefundLines(roundId, refunds),
          });
          await tx.poolLedger.create({
            data: {
              roundId,
              postingId: posting.id,
              kind: 'refund',
              entryCount: round.entriesCount,
              amount: total.negated().toFixed(),
            },
          });
          await tx.transaction.createMany({
            data: refunds.map((r) => ({
              userId: r.userId,
              type: 'refund' as const,
              status: 'pending' as const,
              reference: `RF-${round.number}-${r.userId}`,
              amount: r.amount,
              platformFee: '0',
              netAmount: r.amount,
              direction: 'in',
              description: `Refund · cancelled round ${label} (${r.entries} entries)`,
              roundId,
              isDemo: round.isDemo,
              metadata: {
                entries: r.entries,
                reason,
                statusDetail: 'Owed — claim to move it to Available',
              },
            })),
          });
          await tx.notification.createMany({
            data: refunds.map((r) => ({
              userId: r.userId,
              type: 'round.cancelled',
              title: `Round ${label} cancelled`,
              body: `${reason === 'threshold_not_met' ? 'The round did not reach its thresholds' : 'The draw timed out'} — ${r.amount} USDT is owed back to you.`,
              data: { roundNumber: round.number },
              isDemo: round.isDemo,
            })),
          });
        }
        await tx.entry.updateMany({ where: { roundId }, data: { status: 'refund_owed' } });
        const done = await tx.round.update({
          where: { id: roundId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: reason,
            thresholdsMet: reason === 'vrf_timeout' ? round.thresholdsMet : false,
          },
        });
        await this.audit.record(
          {
            actorType: 'system',
            actorLabel: 'round-lifecycle',
            action: 'round.cancelled',
            targetType: 'round',
            targetId: roundId,
            reason,
            metadata: {
              roundNumber: round.number,
              refunded: total.toFixed(),
              players: refunds.length,
            },
          },
          tx,
        );
        return done;
      },
      { timeoutMs: 120_000 },
    );
    this.emitStatus(cancelled, 'cancelled');
    return cancelled;
  }

  private async lock(tx: Tx, roundId: string): Promise<Round> {
    await tx.$queryRaw`SELECT id FROM rounds WHERE id = ${roundId}::uuid FOR UPDATE`;
    const round = await tx.round.findUnique({ where: { id: roundId } });
    if (!round) throw new AppError('NOT_FOUND', 'Round not found');
    return round;
  }

  private emitStatus(round: Round, status: string) {
    this.events.emit({
      type: 'round.status',
      roundId: round.id,
      roundNumber: round.number,
      status,
      at: new Date().toISOString(),
    });
  }
}
