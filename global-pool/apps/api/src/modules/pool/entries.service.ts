import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { entryQuote } from '@gp/shared/fees';
import { formatRoundNumber } from '@gp/shared/format';

import { AppError } from '../../common/errors';
import type { AuthUser } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import { entryPurchaseLines } from '../ledger/posting';
import { NotificationsService } from '../notifications/notifications.service';
import { PoolEventsService } from './pool-events.service';
import { entryCode } from './rounds.service';

export interface EntryPurchaseResult {
  roundId: string;
  roundNumber: number;
  entries: number;
  firstEntryId: string;
  lastEntryId: string;
  entryPrice: string;
  entryAmount: string;
  platformFee: string;
  networkFee: string;
  total: string;
  reference: string;
  transactionId: string;
  postingId: string;
  status: 'active';
  purchasedAt: string;
}

/**
 * Buying entries: ONE database transaction that (1) locks the round row, (2) checks the round is open,
 * (3) enforces responsible-gaming participation / loss limits and self-exclusion, (4) posts
 * AVAILABLE −(n×10.05) → POOL(round) +n×10.00 and FEES +n×0.05 (balance-checked under row locks), (5) allocates
 * sequential entry tickets and updates the round projections. Wrapped in an idempotency key so retries replay.
 */
@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly idempotency: IdempotencyService,
    private readonly rg: ResponsibleGamingService,
    private readonly notifications: NotificationsService,
    private readonly events: PoolEventsService,
  ) {}

  quote(entries: number) {
    return entryQuote(entries);
  }

  async enter(user: AuthUser, roundId: string, entries: number, idempotencyKey: string) {
    const quote = entryQuote(entries);
    const result = await this.idempotency.run<EntryPurchaseResult & Prisma.InputJsonObject>(
      { scope: 'pool.enter', ownerId: user.id, key: idempotencyKey, request: { roundId, entries } },
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM rounds WHERE id = ${roundId}::uuid FOR UPDATE`;
        const round = await tx.round.findUnique({ where: { id: roundId } });
        if (!round) throw new AppError('NOT_FOUND', 'Round not found');
        const now = new Date();
        if (round.status !== 'open' || now < round.opensAt || now >= round.closesAt) {
          throw new AppError('ROUND_NOT_OPEN', `Round ${formatRoundNumber(round.number)} is not accepting entries`, {
            status: round.status,
            closesAt: round.closesAt.toISOString(),
          });
        }
        await this.rg.assertCanParticipate(user.id, quote.total, tx, now);

        const firstSeq = round.entriesCount + 1;
        const lastSeq = round.entriesCount + entries;
        const firstEntryId = entryCode(round.number, firstSeq);
        const lastEntryId = entryCode(round.number, lastSeq);
        const reference = `EP-${round.number}-${String(firstSeq).padStart(5, '0')}-${String(lastSeq).padStart(5, '0')}`;
        const isNewParticipant = !(await tx.entry.findFirst({ where: { roundId, userId: user.id }, select: { id: true } }));

        const record = await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'entry_purchase',
            status: 'completed',
            reference,
            amount: quote.entryAmount,
            networkFee: quote.networkFee,
            platformFee: quote.platformFee,
            netAmount: quote.total,
            direction: 'out',
            description: `${entries} ${entries === 1 ? 'entry' : 'entries'} · Round ${formatRoundNumber(round.number)}`,
            roundId,
            completedAt: now,
            metadata: {
              entries,
              firstEntryId,
              lastEntryId,
              statusDetail: `Entries ${quote.entryAmount} + platform fee ${quote.platformFee}`,
            },
          },
        });
        const posting = await this.ledger.post(tx, {
          kind: 'entry_purchase',
          description: `${entries} entries in round ${formatRoundNumber(round.number)}`,
          reference,
          eventKey: `entry_purchase:${record.id}`,
          transactionId: record.id,
          roundId,
          lines: entryPurchaseLines(user.id, roundId, quote),
          metadata: { entries, entryAmount: quote.entryAmount, platformFee: quote.platformFee },
        });
        await tx.entry.createMany({
          data: Array.from({ length: entries }, (_, i) => ({
            roundId,
            userId: user.id,
            seq: firstSeq + i,
            code: entryCode(round.number, firstSeq + i),
            transactionId: record.id,
          })),
        });
        await tx.poolLedger.create({
          data: { roundId, postingId: posting.id, userId: user.id, kind: 'entry', entryCount: entries, amount: quote.entryAmount },
        });
        await tx.feeLedger.create({
          data: { postingId: posting.id, userId: user.id, roundId, kind: 'platform_entry_fee', entryCount: entries, amount: quote.platformFee },
        });
        const updated = await tx.round.update({
          where: { id: roundId },
          data: {
            entriesCount: { increment: entries },
            participantsCount: { increment: isNewParticipant ? 1 : 0 },
            poolAmount: { increment: quote.entryAmount },
            platformFees: { increment: quote.platformFee },
          },
        });
        await this.notifications.notify(tx, {
          userId: user.id,
          type: 'round.entries_confirmed',
          title: 'Entries confirmed',
          body: `${entries} entries in round ${formatRoundNumber(round.number)} (${firstEntryId} … ${lastEntryId}).`,
          data: { reference, roundNumber: round.number },
        });
        return {
          roundId,
          roundNumber: updated.number,
          entries,
          firstEntryId,
          lastEntryId,
          entryPrice: quote.entryPrice,
          entryAmount: quote.entryAmount,
          platformFee: quote.platformFee,
          networkFee: quote.networkFee,
          total: quote.total,
          reference,
          transactionId: record.id,
          postingId: posting.id,
          status: 'active' as const,
          purchasedAt: now.toISOString(),
        };
      },
    );
    if (!result.replayed) {
      const round = await this.prisma.round.findUniqueOrThrow({ where: { id: roundId } });
      this.events.emit({
        type: 'pool.update',
        roundId,
        roundNumber: round.number,
        status: round.status,
        entries: round.entriesCount,
        participants: round.participantsCount,
        poolBalance: round.poolAmount.toFixed(2),
        platformFees: round.platformFees.toFixed(2),
        closesAt: round.closesAt.toISOString(),
        lastPurchase: { handle: user.handle, entries, amount: result.value.entryAmount, at: result.value.purchasedAt },
        isDemo: round.isDemo,
      });
    }
    return { ...result.value, replayed: result.replayed };
  }
}
