import { Injectable } from '@nestjs/common';
import type { RgLimit, RgLimitType, RgPeriod } from '@prisma/client';
import { RG_LIMIT_INCREASE_COOLDOWN_HOURS } from '@gp/shared/limits';
import { gt, money, sub, toUSDTString, type MoneyInput } from '@gp/shared/money';
import type { RgLimitUpdate, SelfExclusion } from '@gp/shared/schemas';

import { AppError } from '../../common/errors';
import { usdtOrNull } from '../../common/money';
import { addHours, periodStart, selfExclusionEnd } from '../../common/time';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';

export interface RgLimitView {
  type: RgLimitType;
  period: RgPeriod;
  /** Effective limit now (amount for money limits, minutes for session_time). */
  limit: string | null;
  minutes: number | null;
  used: string | null;
  remaining: string | null;
  pendingIncrease: { amount: string | null; minutes: number | null; effectiveAt: string } | null;
}

export interface RgState {
  limits: RgLimitView[];
  selfExclusion: { active: boolean; duration: string | null; endsAt: string | null };
  realityCheckMinutes: number;
}

/**
 * Responsible gaming — enforced server-side. Decreases apply immediately; increases wait for the 24 h cool-down
 * (stored as pending, applied lazily once due). Self-exclusion is immediate and never obstructed; withdrawals stay
 * available while self-excluded.
 */
@Injectable()
export class ResponsibleGamingService {
  constructor(private readonly prisma: PrismaService) {}

  async state(userId: string, now = new Date()): Promise<RgState> {
    const rows = await this.effectiveLimits(userId, now);
    const limits: RgLimitView[] = [];
    for (const row of rows) {
      const used =
        row.type === 'session_time' ? null : await this.usage(userId, row.type, row.period, now);
      const limit = usdtOrNull(row.amount);
      limits.push({
        type: row.type,
        period: row.period,
        limit,
        minutes: row.minutes,
        used,
        remaining:
          limit !== null && used !== null ? toUSDTString(maxZero(sub(limit, used))) : null,
        pendingIncrease: row.pendingEffectiveAt
          ? {
              amount: usdtOrNull(row.pendingAmount),
              minutes: row.pendingMinutes,
              effectiveAt: row.pendingEffectiveAt.toISOString(),
            }
          : null,
      });
    }
    const exclusion = await this.activeSelfExclusion(userId, this.prisma, now);
    const settings = await this.prisma.rgSettings.findUnique({ where: { userId } });
    return {
      limits,
      selfExclusion: {
        active: Boolean(exclusion),
        duration: exclusion?.duration ?? null,
        endsAt: exclusion?.endsAt?.toISOString() ?? null,
      },
      realityCheckMinutes: settings?.realityCheckMinutes ?? 60,
    };
  }

  /** Set / change a limit. Lower (stricter) → immediate. Higher → pending for RG_LIMIT_INCREASE_COOLDOWN_HOURS. */
  async updateLimit(userId: string, input: RgLimitUpdate, now = new Date()): Promise<RgState> {
    const existing = (await this.effectiveLimits(userId, now)).find(
      (l) => l.type === input.type && l.period === input.period,
    );
    const isMinutes = input.type === 'session_time';
    const newValue = isMinutes ? String(input.minutes) : input.amount;
    const current = existing
      ? isMinutes
        ? existing.minutes !== null
          ? String(existing.minutes)
          : null
        : existing.amount !== null
          ? existing.amount.toFixed()
          : null
      : null;
    const increase = current !== null && gt(newValue, current);
    const data = increase
      ? {
          pendingAmount: isMinutes ? null : newValue,
          pendingMinutes: isMinutes ? Number(newValue) : null,
          pendingEffectiveAt: addHours(now, RG_LIMIT_INCREASE_COOLDOWN_HOURS),
        }
      : {
          amount: isMinutes ? null : newValue,
          minutes: isMinutes ? Number(newValue) : null,
          pendingAmount: null,
          pendingMinutes: null,
          pendingEffectiveAt: null,
        };
    await this.prisma.rgLimit.upsert({
      where: { userId_type_period: { userId, type: input.type, period: input.period } },
      create: {
        userId,
        type: input.type,
        period: input.period,
        amount: isMinutes ? null : newValue,
        minutes: isMinutes ? Number(newValue) : null,
      },
      update: data,
    });
    return this.state(userId, now);
  }

  async selfExclude(userId: string, input: SelfExclusion, now = new Date()) {
    const endsAt = selfExclusionEnd(input.duration, now);
    const row = await this.prisma.rgSelfExclusion.create({
      data: { userId, duration: input.duration, startsAt: now, endsAt },
    });
    return { duration: row.duration, startsAt: row.startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null };
  }

  async setRealityCheck(userId: string, intervalMinutes: number) {
    await this.prisma.rgSettings.upsert({
      where: { userId },
      create: { userId, realityCheckMinutes: intervalMinutes },
      update: { realityCheckMinutes: intervalMinutes },
    });
    return this.state(userId);
  }

  async acknowledgeRealityCheck(userId: string, now = new Date()) {
    await this.prisma.rgSettings.upsert({
      where: { userId },
      create: { userId, lastRealityCheckAt: now, sessionStartedAt: now },
      update: { lastRealityCheckAt: now },
    });
    return { acknowledgedAt: now.toISOString() };
  }

  async activeSelfExclusion(userId: string, db: Db = this.prisma, now = new Date()) {
    return db.rgSelfExclusion.findFirst({
      where: { userId, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: { startsAt: 'desc' },
    });
  }

  async assertNotSelfExcluded(userId: string, db: Db = this.prisma): Promise<void> {
    const ex = await this.activeSelfExclusion(userId, db);
    if (ex) {
      throw new AppError('SELF_EXCLUDED', 'You are self-excluded — gaming and deposits are paused', {
        endsAt: ex.endsAt?.toISOString() ?? null,
      });
    }
  }

  /** Global Pool entries + game stakes: participation and loss limits. Call inside the purchase transaction. */
  async assertCanParticipate(userId: string, total: MoneyInput, db: Db, now = new Date()) {
    await this.assertNotSelfExcluded(userId, db);
    const limits = await this.effectiveLimits(userId, now, db);
    for (const l of limits) {
      if ((l.type !== 'participation' && l.type !== 'loss') || l.amount === null) continue;
      const used = await this.usage(userId, l.type, l.period, now, db);
      const after = money(used).plus(money(total));
      if (after.gt(money(l.amount))) {
        throw new AppError(
          'RG_LIMIT_EXCEEDED',
          `This would exceed your ${l.period === 'day' ? 'daily' : `${l.period}ly`} ${l.type} limit`,
          {
            type: l.type,
            period: l.period,
            limit: toUSDTString(l.amount.toFixed()),
            used,
            remaining: toUSDTString(maxZero(sub(l.amount.toFixed(), used))),
          },
        );
      }
    }
  }

  async assertCanDeposit(userId: string, amount: MoneyInput, db: Db, now = new Date()) {
    await this.assertNotSelfExcluded(userId, db);
    const limits = await this.effectiveLimits(userId, now, db);
    for (const l of limits) {
      if (l.type !== 'deposit' || l.amount === null) continue;
      const used = await this.usage(userId, 'deposit', l.period, now, db);
      if (money(used).plus(money(amount)).gt(money(l.amount))) {
        throw new AppError('RG_LIMIT_EXCEEDED', `This would exceed your ${l.period}ly deposit limit`, {
          type: 'deposit',
          period: l.period,
          limit: toUSDTString(l.amount.toFixed()),
          used,
        });
      }
    }
  }

  /** Usage in the current UTC period from the user-facing transaction history. */
  async usage(
    userId: string,
    type: RgLimitType,
    period: RgPeriod,
    now = new Date(),
    db: Db = this.prisma,
  ): Promise<string> {
    const since = periodStart(period, now);
    const sumOf = async (txType: 'deposit' | 'entry_purchase' | 'prize' | 'refund') => {
      const agg = await db.transaction.aggregate({
        where: {
          userId,
          type: txType,
          createdAt: { gte: since },
          status: { notIn: ['failed', 'rejected', 'cancelled'] },
        },
        _sum: { netAmount: true },
      });
      return money(agg._sum.netAmount?.toFixed() ?? '0');
    };
    if (type === 'deposit') return toUSDTString(await sumOf('deposit'));
    const spent = (await sumOf('entry_purchase')).minus(await sumOf('refund'));
    if (type === 'participation') return toUSDTString(maxZero(spent));
    // loss = stakes − prizes won in the period (never below zero)
    return toUSDTString(maxZero(spent.minus(await sumOf('prize'))));
  }

  /** Limits with due pending increases applied (and persisted). */
  private async effectiveLimits(userId: string, now: Date, db: Db = this.prisma): Promise<RgLimit[]> {
    const rows = await db.rgLimit.findMany({ where: { userId }, orderBy: { type: 'asc' } });
    const out: RgLimit[] = [];
    for (const row of rows) {
      if (row.pendingEffectiveAt && row.pendingEffectiveAt <= now) {
        out.push(
          await db.rgLimit.update({
            where: { id: row.id },
            data: {
              amount: row.pendingAmount ?? row.amount,
              minutes: row.pendingMinutes ?? row.minutes,
              pendingAmount: null,
              pendingMinutes: null,
              pendingEffectiveAt: null,
            },
          }),
        );
      } else {
        out.push(row);
      }
    }
    return out;
  }
}

function maxZero(v: MoneyInput) {
  const d = money(v);
  return d.isNegative() ? money(0) : d;
}
