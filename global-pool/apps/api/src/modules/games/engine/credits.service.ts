import { Injectable } from '@nestjs/common';
import {
  DEMO_CREDITS_RESET_COOLDOWN_MINUTES,
  DEMO_CREDITS_START,
  GAME_BET_FEE,
} from '@gp/shared/fair';
import { money, type MoneyInput } from '@gp/shared/money';
import type { DemoCreditEntryKind } from '@prisma/client';

import { AppError } from '../../../common/errors';
import { periodStart } from '../../../common/time';
import type { RequestMeta } from '../../../common/request';
import { PrismaService, type Tx } from '../../../infra/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ResponsibleGamingService } from '../../compliance/responsible-gaming.service';
import { DEMO, GameClock, credits } from './games-common';

interface AccountRow {
  id: string;
  balance: string;
  last_reset_at: Date | null;
}

/**
 * DEMO credits: the per-user PLAY balance (no cash value). It is never bought, withdrawn or converted to / from
 * USDT and never touches the USDT ledger, wallet balances, pool or fee ledgers — this service only reads and writes
 * demo_credit_accounts / demo_credit_entries. Every change is one row lock + one entry with the running balance.
 */
@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rg: ResponsibleGamingService,
    private readonly clock: GameClock,
  ) {}

  /** Creates the account (1,000.00 opening grant) on first use. Idempotent and race-safe. */
  async ensureAccount(tx: Tx, userId: string): Promise<void> {
    const inserted = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO demo_credit_accounts (id, user_id, balance, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${DEMO_CREDITS_START}::numeric, now(), now())
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id::text AS id`;
    const row = inserted[0];
    if (row) {
      await tx.demoCreditEntry.create({
        data: {
          accountId: row.id,
          userId,
          kind: 'opening',
          amount: DEMO_CREDITS_START,
          balanceAfter: DEMO_CREDITS_START,
        },
      });
    }
  }

  /** Row-locks the account (FOR UPDATE) and returns it. Always lock the seed pair / round BEFORE the account. */
  async lock(tx: Tx, userId: string): Promise<AccountRow> {
    await this.ensureAccount(tx, userId);
    const rows = await tx.$queryRaw<AccountRow[]>`
      SELECT id::text AS id, balance::text AS balance, last_reset_at
      FROM demo_credit_accounts WHERE user_id = ${userId}::uuid FOR UPDATE`;
    return rows[0]!;
  }

  /** Takes a stake from the play balance (422 INSUFFICIENT_FUNDS when it is not covered). Returns the new balance. */
  async debit(
    tx: Tx,
    userId: string,
    amount: MoneyInput,
    ref: { gameSlug: string; betId?: string | null },
  ): Promise<string> {
    const acc = await this.lock(tx, userId);
    const value = money(amount);
    if (value.lte(0)) return credits(acc.balance);
    if (money(acc.balance).lt(value)) {
      throw new AppError('INSUFFICIENT_FUNDS', 'Not enough DEMO credits for this bet', {
        currency: DEMO.currency,
        available: credits(acc.balance),
        required: credits(value.toFixed()),
        shortBy: credits(value.minus(money(acc.balance)).toFixed()),
      });
    }
    return this.move(tx, userId, acc, value.negated().toFixed(), 'stake', ref);
  }

  /** Pays a return into the play balance (no-op for 0). Returns the new balance. */
  async credit(
    tx: Tx,
    userId: string,
    amount: MoneyInput,
    ref: { gameSlug: string; betId?: string | null },
  ): Promise<string> {
    const acc = await this.lock(tx, userId);
    if (money(amount).lte(0)) return credits(acc.balance);
    return this.move(tx, userId, acc, money(amount).toFixed(), 'payout', ref);
  }

  private async move(
    tx: Tx,
    userId: string,
    acc: AccountRow,
    signed: string,
    kind: DemoCreditEntryKind,
    ref: { gameSlug: string; betId?: string | null },
  ): Promise<string> {
    const after = money(acc.balance).plus(money(signed));
    await tx.demoCreditAccount.update({
      where: { id: acc.id },
      data: { balance: after.toFixed() },
    });
    await tx.demoCreditEntry.create({
      data: {
        accountId: acc.id,
        userId,
        kind,
        amount: signed,
        balanceAfter: after.toFixed(),
        gameSlug: ref.gameSlug,
        betId: ref.betId ?? null,
      },
    });
    acc.balance = after.toFixed();
    return credits(after.toFixed());
  }

  async balance(userId: string): Promise<string> {
    await this.prisma.tx((tx) => this.ensureAccount(tx, userId));
    const acc = await this.prisma.demoCreditAccount.findUniqueOrThrow({ where: { userId } });
    return credits(acc.balance);
  }

  /** GET /games/credits — balance, reset availability and the DEMO session summary for the RG/Session Bar. */
  async view(userId: string) {
    await this.prisma.tx((tx) => this.ensureAccount(tx, userId));
    const now = this.clock.now();
    const acc = await this.prisma.demoCreditAccount.findUniqueOrThrow({ where: { userId } });
    const resetAt = acc.lastResetAt
      ? new Date(acc.lastResetAt.getTime() + DEMO_CREDITS_RESET_COOLDOWN_MINUTES * 60_000)
      : null;
    return {
      ...DEMO,
      balance: credits(acc.balance),
      startingBalance: DEMO_CREDITS_START,
      fee: GAME_BET_FEE,
      reset: {
        to: DEMO_CREDITS_START,
        cooldownMinutes: DEMO_CREDITS_RESET_COOLDOWN_MINUTES,
        lastResetAt: acc.lastResetAt?.toISOString() ?? null,
        availableAt: resetAt && resetAt > now ? resetAt.toISOString() : now.toISOString(),
        available: !resetAt || resetAt <= now,
      },
      session: await this.session(userId),
      notice:
        'DEMO credits have no cash value. They cannot be bought, withdrawn or exchanged for USDT or anything else.',
    };
  }

  /** DEMO play since the RG session started (session net shown in the RG/Session Bar) and since 00:00 UTC. */
  async session(userId: string) {
    const now = this.clock.now();
    const rg = await this.rg.session(userId, now);
    const since = rg.startedAt ? new Date(rg.startedAt) : null;
    const session = since
      ? await this.playSince(userId, since)
      : { bets: 0, wagered: '0.00', returned: '0.00', net: '0.00' };
    return {
      startedAt: rg.startedAt,
      durationSeconds: rg.durationSeconds,
      ...session,
      today: await this.playSince(userId, periodStart('day', now)),
      realityCheck: rg.realityCheck,
      blockedReason: rg.blockedReason,
      currency: DEMO.currency,
    };
  }

  /** Bets, wagered, returned and net (DEMO credits) since `since`. */
  async playSince(userId: string, since: Date) {
    const where = { userId, createdAt: { gte: since } };
    const [stakes, payouts, bets] = await Promise.all([
      this.prisma.demoCreditEntry.aggregate({
        where: { ...where, kind: 'stake' },
        _sum: { amount: true },
      }),
      this.prisma.demoCreditEntry.aggregate({
        where: { ...where, kind: 'payout' },
        _sum: { amount: true },
      }),
      this.prisma.demoCreditEntry.count({ where: { ...where, kind: 'stake' } }),
    ]);
    const staked = money(stakes._sum.amount?.toFixed() ?? '0').negated();
    const paid = money(payouts._sum.amount?.toFixed() ?? '0');
    return {
      bets,
      wagered: credits(staked.toFixed()),
      returned: credits(paid.toFixed()),
      net: credits(paid.minus(staked).toFixed()),
    };
  }

  /** POST /games/credits/reset — back to 1,000.00 at most once per hour; audited. */
  async reset(userId: string, meta: RequestMeta) {
    const now = this.clock.now();
    const result = await this.prisma.tx(async (tx) => {
      const acc = await this.lock(tx, userId);
      if (acc.last_reset_at) {
        const next = new Date(
          acc.last_reset_at.getTime() + DEMO_CREDITS_RESET_COOLDOWN_MINUTES * 60_000,
        );
        if (next > now) {
          throw new AppError('RATE_LIMITED', 'DEMO credits can be reset once per hour', {
            availableAt: next.toISOString(),
          });
        }
      }
      const open =
        (await tx.gameResult.count({ where: { userId, status: 'active' } })) +
        (await tx.crashBet.count({ where: { userId, status: 'active' } }));
      if (open > 0) {
        throw new AppError('CONFLICT', 'Finish your open rounds before resetting DEMO credits', {
          reason: 'ROUND_IN_PROGRESS',
        });
      }
      const before = credits(acc.balance);
      const delta = money(DEMO_CREDITS_START).minus(money(acc.balance));
      await tx.demoCreditAccount.update({
        where: { id: acc.id },
        data: { balance: DEMO_CREDITS_START, lastResetAt: now, resets: { increment: 1 } },
      });
      await tx.demoCreditEntry.create({
        data: {
          accountId: acc.id,
          userId,
          kind: 'reset',
          amount: delta.toFixed(),
          balanceAfter: DEMO_CREDITS_START,
        },
      });
      await this.audit.record(
        {
          actorType: 'user',
          actorId: userId,
          action: 'user.games.demo_credits_reset',
          targetType: 'demo_credit_account',
          targetId: acc.id,
          metadata: {
            from: before,
            to: DEMO_CREDITS_START,
            currency: DEMO.currency,
            cashValue: false,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
        },
        tx,
      );
      return { before };
    });
    return { ...(await this.view(userId)), resetFrom: result.before };
  }
}
