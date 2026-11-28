import { Injectable } from '@nestjs/common';
import { money, toUSDTString, type MoneyInput } from '@gp/shared/money';

import { AppError } from '../../../common/errors';
import { periodStart } from '../../../common/time';
import type { Tx } from '../../../infra/prisma/prisma.service';
import { ResponsibleGamingService } from '../../compliance/responsible-gaming.service';
import { isSessionLive, nextPeriodStart, nextRealityCheckAt } from '../../compliance/rg-session';
import { DEMO } from './games-common';

/**
 * Server-side play policy for NEW bets (on top of the route guard GAMING_POLICY: onboarding, permitted region,
 * not self-excluded, no `gaming_blocked` / `account_suspended` restriction):
 * - self-exclusion / cooling-off (403 SELF_EXCLUDED) — re-checked inside the bet transaction;
 * - time rules: daily play time, session length, quiet hours (422 RG_LIMIT_EXCEEDED);
 * - a reality check that is due with "pause game" on blocks the next bet until it is answered (409) — reminders
 *   therefore only ever appear BETWEEN bets;
 * - the player's loss limit also applies to DEMO play, counted separately in DEMO credits (never mixed with USDT).
 */
@Injectable()
export class GamesPolicyService {
  constructor(private readonly rg: ResponsibleGamingService) {}

  async assertCanPlay(tx: Tx, userId: string, stake: MoneyInput, now: Date): Promise<void> {
    await this.rg.assertNotSelfExcluded(userId, tx);
    const limits = await tx.rgLimit.findMany({ where: { userId } });
    await this.rg.assertTimeRules(userId, limits, tx, now);
    await this.assertRealityCheckAnswered(tx, userId, now);
    for (const l of limits) {
      if (l.type !== 'loss' || l.amount === null) continue;
      const since = periodStart(l.period, now);
      const used = await this.demoLossSince(tx, userId, since);
      if (money(used).plus(money(stake)).gt(money(l.amount.toFixed()))) {
        throw new AppError(
          'RG_LIMIT_EXCEEDED',
          `This bet could take you past your ${l.period === 'day' ? 'daily' : `${l.period}ly`} loss limit`,
          {
            type: 'loss',
            period: l.period,
            limit: toUSDTString(l.amount.toFixed()),
            used,
            currency: DEMO.currency,
            resetsAt: nextPeriodStart(l.period, now).toISOString(),
          },
        );
      }
    }
  }

  private async assertRealityCheckAnswered(tx: Tx, userId: string, now: Date) {
    const s = await tx.rgSettings.findUnique({ where: { userId } });
    if (!s || !s.realityCheckPause) return;
    const counters = {
      sessionStartedAt: s.sessionStartedAt,
      lastActivityAt: s.lastActivityAt,
      lastRealityCheckAt: s.lastRealityCheckAt,
      playedDay: s.playedDay,
      playedTodaySeconds: s.playedTodaySeconds,
      sessionsToday: s.sessionsToday,
    };
    if (!isSessionLive(counters, now)) return;
    const due = nextRealityCheckAt(counters, s.realityCheckMinutes, now);
    if (due && now >= due) {
      throw new AppError('CONFLICT', 'Reality check — answer the reminder to keep playing', {
        reason: 'REALITY_CHECK_DUE',
        dueAt: due.toISOString(),
      });
    }
  }

  /** DEMO credits lost since `since` (stakes − returns, never below 0). */
  async demoLossSince(tx: Tx, userId: string, since: Date): Promise<string> {
    const [st, po] = await Promise.all([
      tx.demoCreditEntry.aggregate({
        where: { userId, kind: 'stake', createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      tx.demoCreditEntry.aggregate({
        where: { userId, kind: 'payout', createdAt: { gte: since } },
        _sum: { amount: true },
      }),
    ]);
    const lost = money(st._sum.amount?.toFixed() ?? '0')
      .negated()
      .minus(money(po._sum.amount?.toFixed() ?? '0'));
    return toUSDTString(lost.lt(0) ? '0' : lost.toFixed(6));
  }
}
