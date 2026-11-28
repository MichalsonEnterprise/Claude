import { Injectable } from '@nestjs/common';
import type { RgLimit, RgLimitType, RgPeriod, RgSettings } from '@prisma/client';
import { isCoolingOffDuration, type SelfExclusionDuration } from '@gp/shared/enums';
import {
  REALITY_CHECK_DEFAULT_MINUTES,
  RG_LIMIT_INCREASE_COOLDOWN_HOURS,
  SELF_EXCLUSION_CONFIRM_PHRASE,
} from '@gp/shared/limits';
import { gt, money, sub, toUSDTString, type MoneyInput } from '@gp/shared/money';
import type {
  RealityCheckAction,
  RgExclusionView,
  RgHistoryItem,
  RgLimitRef,
  RgLimitUpdate,
  RgLimitView,
  RgQuietHours,
  RgReopenView,
  RgSessionView,
  RgSettingsView,
  RgStateView,
  SelfExclusion,
} from '@gp/shared/schemas';

import { AppError, conflict, notFound } from '../../common/errors';
import { usdtOrNull } from '../../common/money';
import type { AuthUser } from '../../common/request';
import { addHours, periodStart, selfExclusionEnd } from '../../common/time';
import { PrismaService, type Db } from '../../infra/prisma/prisma.service';
import { StepUpService } from '../security/step-up.service';
import { TotpService } from '../security/totp.service';
import {
  applyHeartbeat,
  hhmm,
  inQuietHours,
  isSessionLive,
  minuteOfDay,
  nextPeriodStart,
  nextRealityCheckAt,
  sameUtcDay,
  type SessionCounters,
} from './rg-session';

export type { RgLimitView, RgStateView as RgState } from '@gp/shared/schemas';

/** What a limit change did (for the audit row / limit history). */
export interface RgLimitChange {
  type: RgLimitType;
  period: RgPeriod;
  from: string | null;
  to: string | null;
  applied: 'immediately' | 'after_cooldown';
  effectiveAt: string;
}

/**
 * Long self-exclusions whose end date passes do NOT reopen by themselves (R06): the player asks, waits the 24 h
 * cool-down, sets a deposit and a loss limit and confirms. Breaks (24h / 7d / 30d) end on their date; permanent never
 * ends here.
 */
export const REOPEN_REQUIRED_DURATIONS = ['6m', '1y', '5y'] as const;
export const REOPEN_COOLDOWN_HOURS = 24;
/** Limit types that must be set before a reopened account can play or deposit again. */
const REOPEN_REQUIRED_LIMITS = ['deposit', 'loss'] as const;
/** Advisory-lock class (two-key form) that serialises a player's RG usage checks with their writes. */
const RG_USER_LOCK_CLASS = 7_262_101;

const DEFAULT_SETTINGS = {
  realityCheckMinutes: REALITY_CHECK_DEFAULT_MINUTES,
  realityCheckPause: true,
  realityCheckPush: false,
  sessionStartedAt: null,
  lastActivityAt: null,
  lastRealityCheckAt: null,
  playedDay: null,
  playedTodaySeconds: 0,
  sessionsToday: 0,
  sessionLimitMinutes: null,
  pendingSessionLimitMinutes: null,
  pendingSessionLimitRemoval: false,
  pendingSessionLimitAt: null,
  quietHoursEnabled: false,
  quietStartMinute: 60,
  quietEndMinute: 420,
  pendingQuietOffAt: null,
} satisfies Partial<RgSettings>;
type SettingsLike = typeof DEFAULT_SETTINGS | RgSettings;

/**
 * Responsible gaming — enforced server-side. Decreases apply immediately; increases and removals wait for the 24 h
 * cool-down (stored as pending, applied lazily once due). Breaks (cooling-off) and self-exclusion are immediate,
 * never obstructed and cannot be shortened; withdrawals stay available throughout. Time limits (daily play time,
 * session length, quiet hours) are tracked from activity heartbeats and block NEW entries / bets.
 */
@Injectable()
export class ResponsibleGamingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stepUp: StepUpService,
    private readonly totp: TotpService,
  ) {}

  // ── state ─────────────────────────────────────────────────────────────────────────────────────

  async state(userId: string, now = new Date()): Promise<RgStateView> {
    const settings = await this.effectiveSettings(userId, now);
    const rows = await this.effectiveLimits(userId, now);
    const playedToday = playedTodaySeconds(settings, now);
    const limits: RgLimitView[] = [];
    for (const row of rows) {
      const isTime = row.type === 'session_time';
      const used = isTime ? null : await this.usage(userId, row.type, row.period, now);
      const limit = usdtOrNull(row.amount);
      limits.push({
        type: row.type,
        period: row.period,
        limit,
        minutes: row.minutes,
        used,
        usedMinutes: isTime ? Math.floor(playedToday / 60) : null,
        remaining: limit !== null && used !== null ? toUSDTString(maxZero(sub(limit, used))) : null,
        resetsAt: nextPeriodStart(row.period, now).toISOString(),
        pendingIncrease:
          row.pendingEffectiveAt && !row.pendingRemoval
            ? {
                amount: usdtOrNull(row.pendingAmount),
                minutes: row.pendingMinutes,
                effectiveAt: row.pendingEffectiveAt.toISOString(),
              }
            : null,
        pendingRemoval:
          row.pendingEffectiveAt && row.pendingRemoval
            ? { effectiveAt: row.pendingEffectiveAt.toISOString() }
            : null,
      });
    }
    const exclusion = await this.exclusion(userId, this.prisma, now);
    const session = await this.sessionView(userId, settings, rows, exclusion, now);
    const twoFactor = await this.totp.status({ userId });
    return {
      limits,
      selfExclusion: {
        active: exclusion.active,
        duration: exclusion.duration,
        endsAt: exclusion.endsAt,
      },
      exclusion,
      realityCheckMinutes: settings.realityCheckMinutes,
      settings: settingsView(settings),
      session,
      twoFactorEnabled: twoFactor.enabled,
    };
  }

  // ── limits ────────────────────────────────────────────────────────────────────────────────────

  /** Set / change a limit. Lower (stricter) or new → immediate. Higher → pending for 24 h. */
  async updateLimit(userId: string, input: RgLimitUpdate, now = new Date()): Promise<RgStateView> {
    await this.changeLimit(userId, input, now);
    return this.state(userId, now);
  }

  async changeLimit(
    userId: string,
    input: RgLimitUpdate,
    now = new Date(),
  ): Promise<RgLimitChange> {
    const existing = (await this.effectiveLimits(userId, now)).find(
      (l) => l.type === input.type && l.period === input.period,
    );
    const isMinutes = input.type === 'session_time';
    const newValue = isMinutes ? String(input.minutes) : input.amount;
    const current = existing ? limitValue(existing) : null;
    const increase = current !== null && gt(newValue, current);
    const effectiveAt = increase ? addHours(now, RG_LIMIT_INCREASE_COOLDOWN_HOURS) : now;
    const data = increase
      ? {
          pendingAmount: isMinutes ? null : newValue,
          pendingMinutes: isMinutes ? Number(newValue) : null,
          pendingEffectiveAt: effectiveAt,
          pendingRemoval: false,
        }
      : {
          amount: isMinutes ? null : newValue,
          minutes: isMinutes ? Number(newValue) : null,
          pendingAmount: null,
          pendingMinutes: null,
          pendingEffectiveAt: null,
          pendingRemoval: false,
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
    return {
      type: input.type,
      period: input.period,
      from: current,
      to: isMinutes ? newValue : toUSDTString(newValue),
      applied: increase ? 'after_cooldown' : 'immediately',
      effectiveAt: effectiveAt.toISOString(),
    };
  }

  /** Remove a limit: like an increase, it only takes effect after the 24 h cool-down (cancellable). */
  async removeLimit(userId: string, ref: RgLimitRef, now = new Date()): Promise<RgLimitChange> {
    const existing = (await this.effectiveLimits(userId, now)).find(
      (l) => l.type === ref.type && l.period === ref.period,
    );
    if (!existing) throw notFound('Limit', { ...ref });
    const effectiveAt = addHours(now, RG_LIMIT_INCREASE_COOLDOWN_HOURS);
    await this.prisma.rgLimit.update({
      where: { id: existing.id },
      data: {
        pendingRemoval: true,
        pendingAmount: null,
        pendingMinutes: null,
        pendingEffectiveAt: effectiveAt,
      },
    });
    return {
      ...ref,
      from: limitValue(existing),
      to: null,
      applied: 'after_cooldown',
      effectiveAt: effectiveAt.toISOString(),
    };
  }

  /** Cancel a pending increase or removal — the current limit simply stays. */
  async cancelPending(userId: string, ref: RgLimitRef, now = new Date()) {
    const existing = (await this.effectiveLimits(userId, now)).find(
      (l) => l.type === ref.type && l.period === ref.period,
    );
    if (!existing?.pendingEffectiveAt) throw notFound('Pending limit change', { ...ref });
    await this.prisma.rgLimit.update({
      where: { id: existing.id },
      data: {
        pendingAmount: null,
        pendingMinutes: null,
        pendingEffectiveAt: null,
        pendingRemoval: false,
      },
    });
    return {
      ...ref,
      kept: limitValue(existing),
      cancelled: existing.pendingRemoval
        ? 'removal'
        : (usdtOrNull(existing.pendingAmount) ?? String(existing.pendingMinutes)),
    };
  }

  // ── time settings (RG4) ───────────────────────────────────────────────────────────────────────

  /** Session-length limit: new / lower → now; higher / removal → after 24 h. */
  async setSessionLimit(userId: string, minutes: number | null, now = new Date()) {
    const s = await this.effectiveSettings(userId, now);
    const current = s.sessionLimitMinutes;
    const delayed = current !== null && (minutes === null || minutes > current);
    const data = delayed
      ? {
          pendingSessionLimitMinutes: minutes,
          pendingSessionLimitRemoval: minutes === null,
          pendingSessionLimitAt: addHours(now, RG_LIMIT_INCREASE_COOLDOWN_HOURS),
        }
      : {
          sessionLimitMinutes: minutes,
          pendingSessionLimitMinutes: null,
          pendingSessionLimitRemoval: false,
          pendingSessionLimitAt: null,
        };
    await this.upsertSettings(userId, data);
    return {
      from: current,
      to: minutes,
      applied: delayed ? ('after_cooldown' as const) : ('immediately' as const),
    };
  }

  /** Quiet hours: turning them on applies at once; turning them off waits 24 h. */
  async setQuietHours(userId: string, input: RgQuietHours, now = new Date()) {
    const s = await this.effectiveSettings(userId, now);
    const start = minuteOfDay(input.start);
    const end = minuteOfDay(input.end);
    if (input.enabled) {
      if (s.quietHoursEnabled && (s.quietStartMinute !== start || s.quietEndMinute !== end)) {
        throw conflict(
          'Turn quiet hours off first to change the times (turning off waits 24 hours)',
        );
      }
      await this.upsertSettings(userId, {
        quietHoursEnabled: true,
        quietStartMinute: start,
        quietEndMinute: end,
        pendingQuietOffAt: null,
      });
      return { enabled: true, applied: 'immediately' as const };
    }
    if (!s.quietHoursEnabled) return { enabled: false, applied: 'immediately' as const };
    const at = s.pendingQuietOffAt ?? addHours(now, RG_LIMIT_INCREASE_COOLDOWN_HOURS);
    await this.upsertSettings(userId, { pendingQuietOffAt: at });
    return { enabled: true, applied: 'after_cooldown' as const, effectiveAt: at.toISOString() };
  }

  async cancelPendingSetting(
    userId: string,
    target: 'session_limit' | 'quiet_hours',
    now = new Date(),
  ) {
    const s = await this.effectiveSettings(userId, now);
    if (target === 'session_limit') {
      if (!s.pendingSessionLimitAt) throw notFound('Pending session-limit change');
      await this.upsertSettings(userId, {
        pendingSessionLimitMinutes: null,
        pendingSessionLimitRemoval: false,
        pendingSessionLimitAt: null,
      });
    } else {
      if (!s.pendingQuietOffAt) throw notFound('Pending quiet-hours change');
      await this.upsertSettings(userId, { pendingQuietOffAt: null });
    }
    return { target, cancelled: true };
  }

  // ── breaks & self-exclusion (RG6 / RG7) ───────────────────────────────────────────────────────

  /**
   * Start a break or self-exclusion. Immediate and never obstructed. Long periods need the typed phrase and the
   * acknowledgement, plus step-up TOTP when the player has 2FA on (Privy players have no password). An existing
   * exclusion can be extended but never shortened.
   */
  async selfExclude(
    user: AuthUser | string,
    input: SelfExclusion,
    now = new Date(),
    proof: { stepUpToken?: string | null } = {},
  ) {
    const userId = typeof user === 'string' ? user : user.id;
    const duration = input.duration;
    if (!isCoolingOffDuration(duration)) {
      if ((input.phrase ?? '').trim() !== SELF_EXCLUSION_CONFIRM_PHRASE) {
        throw new AppError(
          'VALIDATION_FAILED',
          `Type ${SELF_EXCLUSION_CONFIRM_PHRASE} to confirm`,
          {
            field: 'phrase',
          },
        );
      }
      if (input.acknowledged !== true) {
        throw new AppError(
          'VALIDATION_FAILED',
          'Confirm that you understand this cannot be reversed',
          {
            field: 'acknowledged',
          },
        );
      }
      if (typeof user !== 'string' && (await this.totp.status({ userId })).enabled) {
        await this.stepUp.assert(user, 'security_settings', {
          totpCode: input.totpCode,
          stepUpToken: proof.stepUpToken,
        });
      }
    }
    const endsAt = selfExclusionEnd(duration, now);
    const current = await this.exclusion(userId, this.prisma, now);
    if (current.active) {
      const currentEnd = current.endsAt ? new Date(current.endsAt) : null;
      const notLonger = currentEnd === null || (endsAt !== null && endsAt <= currentEnd);
      if (notLonger) {
        throw conflict(
          'You already have an active break or self-exclusion that lasts at least as long. It cannot be shortened.',
          { endsAt: current.endsAt, kind: current.kind },
        );
      }
    }
    const row = await this.prisma.rgSelfExclusion.create({
      data: { userId, duration, startsAt: now, endsAt },
    });
    return {
      kind: isCoolingOffDuration(duration) ? ('cooling_off' as const) : ('self_exclusion' as const),
      duration: row.duration,
      startsAt: row.startsAt.toISOString(),
      endsAt: endsAt?.toISOString() ?? null,
    };
  }

  /**
   * Effective exclusion = the active row that ends last (permanent wins). A long self-exclusion whose period is over
   * stays active (with `reopen`) until the player has asked to reopen, waited the cool-down and confirmed.
   */
  async exclusion(
    userId: string,
    db: Db = this.prisma,
    now = new Date(),
  ): Promise<RgExclusionView> {
    const rows = await db.rgSelfExclusion.findMany({
      where: {
        userId,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gt: now } },
          { duration: { in: [...REOPEN_REQUIRED_DURATIONS] }, reopenedAt: null },
        ],
      },
      orderBy: { startsAt: 'asc' },
    });
    if (rows.length === 0) {
      return {
        active: false,
        kind: null,
        duration: null,
        startsAt: null,
        endsAt: null,
        reopen: null,
      };
    }
    const running = rows.filter((r) => r.endsAt === null || r.endsAt > now);
    if (running.length > 0) {
      const longest = running.reduce((a, b) =>
        a.endsAt === null ? a : b.endsAt === null || b.endsAt > a.endsAt ? b : a,
      );
      const duration = longest.duration as SelfExclusionDuration;
      return {
        active: true,
        kind: isCoolingOffDuration(duration) ? 'cooling_off' : 'self_exclusion',
        duration,
        startsAt: rows[0]!.startsAt.toISOString(),
        endsAt: longest.endsAt?.toISOString() ?? null,
        reopen: null,
      };
    }
    // Every remaining row is a long self-exclusion whose period is over: closed until reopened.
    const last = rows.reduce((a, b) => (b.endsAt! > a.endsAt! ? b : a));
    const requestedAt = rows.every((r) => r.reopenRequestedAt)
      ? rows.reduce((a, r) => (r.reopenRequestedAt! > a ? r.reopenRequestedAt! : a), new Date(0))
      : null;
    const availableAt = requestedAt ? addHours(requestedAt, REOPEN_COOLDOWN_HOURS) : null;
    const reopen: RgReopenView = {
      status: !availableAt ? 'awaiting_request' : now < availableAt ? 'cooling_down' : 'ready',
      endedAt: last.endsAt!.toISOString(),
      requestedAt: requestedAt?.toISOString() ?? null,
      availableAt: availableAt?.toISOString() ?? null,
      missingLimits: await this.missingReopenLimits(userId, db, now),
    };
    return {
      active: true,
      kind: 'self_exclusion',
      duration: last.duration as SelfExclusionDuration,
      startsAt: rows[0]!.startsAt.toISOString(),
      endsAt: last.endsAt!.toISOString(),
      reopen,
    };
  }

  /** Ask to reopen after a long self-exclusion ended: starts the 24 h cool-down (idempotent). */
  async requestReopen(userId: string, now = new Date()): Promise<RgReopenView> {
    return this.prisma.tx(async (tx) => {
      await this.lockUser(userId, tx);
      const ex = await this.exclusion(userId, tx, now);
      if (!ex.reopen) throw this.nothingToReopen(ex);
      if (ex.reopen.status === 'awaiting_request') {
        await tx.rgSelfExclusion.updateMany({
          where: {
            userId,
            duration: { in: [...REOPEN_REQUIRED_DURATIONS] },
            reopenedAt: null,
            reopenRequestedAt: null,
            endsAt: { lte: now },
          },
          data: { reopenRequestedAt: now },
        });
      }
      return (await this.exclusion(userId, tx, now)).reopen!;
    });
  }

  /** Finish reopening: only after the cool-down and with a deposit limit and a loss limit in place. */
  async confirmReopen(userId: string, now = new Date()): Promise<{ reopenedAt: string }> {
    return this.prisma.tx(async (tx) => {
      await this.lockUser(userId, tx);
      const ex = await this.exclusion(userId, tx, now);
      const r = ex.reopen;
      if (!r) throw this.nothingToReopen(ex);
      if (r.status === 'awaiting_request') {
        throw conflict('Ask to reopen first — a 24-hour cool-down follows your request', {
          reopen: r,
        });
      }
      if (r.status === 'cooling_down') {
        throw conflict('The 24-hour cool-down is still running', {
          availableAt: r.availableAt,
          reopen: r,
        });
      }
      if (r.missingLimits.length > 0) {
        throw new AppError(
          'VALIDATION_FAILED',
          'Set a deposit limit and a loss limit before your account reopens',
          { missingLimits: r.missingLimits, reopen: r },
        );
      }
      await tx.rgSelfExclusion.updateMany({
        where: {
          userId,
          duration: { in: [...REOPEN_REQUIRED_DURATIONS] },
          reopenedAt: null,
          reopenRequestedAt: { not: null },
          endsAt: { lte: now },
        },
        data: { reopenedAt: now },
      });
      return { reopenedAt: now.toISOString() };
    });
  }

  private nothingToReopen(ex: RgExclusionView) {
    return conflict(
      ex.active
        ? ex.endsAt === null
          ? 'A permanent self-exclusion cannot be reopened here'
          : 'Your break or self-exclusion is still running — it cannot be ended early'
        : 'There is no self-exclusion to reopen',
      { kind: ex.kind, endsAt: ex.endsAt },
    );
  }

  private async missingReopenLimits(
    userId: string,
    db: Db,
    now: Date,
  ): Promise<RgReopenView['missingLimits']> {
    const limits = await this.effectiveLimits(userId, now, db);
    return REOPEN_REQUIRED_LIMITS.filter(
      (type) => !limits.some((l) => l.type === type && l.amount !== null),
    );
  }

  async assertNotSelfExcluded(userId: string, db: Db = this.prisma): Promise<void> {
    const ex = await this.exclusion(userId, db);
    if (ex.active) {
      const message = ex.reopen
        ? ex.reopen.status === 'awaiting_request'
          ? 'Your self-exclusion period is over, but nothing reopens automatically — ask to reopen first'
          : ex.reopen.status === 'cooling_down'
            ? 'Reopening is in its 24-hour cool-down — gaming and deposits stay paused until then'
            : 'Set a deposit limit and a loss limit, then confirm reopening your account'
        : ex.kind === 'cooling_off'
          ? 'You are on a break — gaming and deposits are paused until it ends'
          : 'You are self-excluded — gaming and deposits are paused';
      throw new AppError('SELF_EXCLUDED', message, {
        endsAt: ex.endsAt,
        kind: ex.kind,
        ...(ex.reopen ? { reopen: ex.reopen } : {}),
      });
    }
  }

  /**
   * Serialise this player's RG checks inside the caller's transaction (R29): two parallel deposits / purchases can
   * no longer both read the usage before either commits. Transaction-scoped; a no-op outside a transaction.
   */
  async lockUser(userId: string, db: Db): Promise<void> {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(${RG_USER_LOCK_CLASS}::int, hashtext(${userId}))`;
  }

  /**
   * Server-observed play (R55): an entry purchase counts as activity exactly like a heartbeat, in the purchase
   * transaction, so daily play time and session length accrue even when the client never sends heartbeats.
   */
  async recordActivity(userId: string, db: Db, now = new Date()): Promise<void> {
    await db.rgSettings.upsert({ where: { userId }, create: { userId }, update: {} });
    await db.$queryRaw`SELECT id FROM responsible_gaming_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
    const s = await db.rgSettings.findUniqueOrThrow({ where: { userId } });
    await db.rgSettings.update({ where: { userId }, data: applyHeartbeat(countersOf(s), now) });
  }

  // ── reality checks & sessions (RG5) ───────────────────────────────────────────────────────────

  async setRealityCheck(
    userId: string,
    intervalMinutes: number,
    toggles: { pauseGame?: boolean; pushNotification?: boolean } = {},
  ) {
    await this.upsertSettings(userId, {
      realityCheckMinutes: intervalMinutes,
      ...(toggles.pauseGame !== undefined ? { realityCheckPause: toggles.pauseGame } : {}),
      ...(toggles.pushNotification !== undefined
        ? { realityCheckPush: toggles.pushNotification }
        : {}),
    });
    return this.state(userId);
  }

  async acknowledgeRealityCheck(
    userId: string,
    action: RealityCheckAction = 'continue',
    now = new Date(),
  ) {
    const s = await this.effectiveSettings(userId, now);
    const minutes = isSessionLive(s, now)
      ? Math.round((now.getTime() - s.sessionStartedAt!.getTime()) / 60_000)
      : 0;
    await this.upsertSettings(userId, { lastRealityCheckAt: now });
    return {
      acknowledgedAt: now.toISOString(),
      action,
      sessionMinutes: minutes,
      intervalMinutes: s.realityCheckMinutes,
    };
  }

  /** Activity heartbeat from the web (every 60 s while the tab is visible and signed in). */
  async heartbeat(userId: string, now = new Date()): Promise<RgSessionView> {
    await this.prisma.tx((tx) => this.recordActivity(userId, tx, now));
    return this.session(userId, now);
  }

  async session(userId: string, now = new Date()): Promise<RgSessionView> {
    const settings = await this.effectiveSettings(userId, now);
    const rows = await this.effectiveLimits(userId, now);
    const exclusion = await this.exclusion(userId, this.prisma, now);
    return this.sessionView(userId, settings, rows, exclusion, now);
  }

  /** Limit changes and reality-check answers, newest first (from the hash-chained audit log). */
  async history(
    userId: string,
    kind: 'limits' | 'reality_checks' | 'all',
    limit = 20,
  ): Promise<RgHistoryItem[]> {
    const actions =
      kind === 'limits'
        ? LIMIT_ACTIONS
        : kind === 'reality_checks'
          ? ['user.rg.reality_check']
          : [
              ...LIMIT_ACTIONS,
              'user.rg.reality_check',
              'user.rg.self_excluded',
              'user.rg.cooling_off',
              'user.rg.reopen_requested',
              'user.rg.reopened',
            ];
    const rows = await this.prisma.auditLog.findMany({
      where: { actorType: 'user', actorId: userId, action: { in: actions } },
      orderBy: { seq: 'desc' },
      take: limit,
    });
    return rows.map((r) =>
      historyItem(r.action, (r.metadata ?? {}) as Record<string, unknown>, r.createdAt),
    );
  }

  // ── enforcement ───────────────────────────────────────────────────────────────────────────────

  /** Global Pool entries + game stakes: exclusion, money limits and time rules. Call inside the purchase tx. */
  async assertCanParticipate(userId: string, total: MoneyInput, db: Db, now = new Date()) {
    await this.lockUser(userId, db);
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
            resetsAt: nextPeriodStart(l.period, now).toISOString(),
          },
        );
      }
    }
    // This purchase is play the server observed: count it before the time rules (rolled back if anything fails).
    await this.recordActivity(userId, db, now);
    await this.assertTimeRules(userId, limits, db, now);
  }

  /** Daily play-time limit, session-length limit and quiet hours (new entries / bets only). */
  async assertTimeRules(userId: string, limits: RgLimit[], db: Db, now = new Date()) {
    const row = await db.rgSettings.findUnique({ where: { userId } });
    if (!row) return;
    const reason = timeBlock(row, limits, now);
    if (!reason) return;
    const messages = {
      daily_time_limit: 'You have reached your daily time limit — play resumes at 00:00 UTC',
      session_limit:
        'You have reached your session length limit — take a 15-minute pause to start a new session',
      quiet_hours: `Quiet hours are on (${hhmm(row.quietStartMinute)}–${hhmm(row.quietEndMinute)} UTC) — play is paused`,
    } as const;
    throw new AppError('RG_LIMIT_EXCEEDED', messages[reason], { type: reason });
  }

  async assertCanDeposit(userId: string, amount: MoneyInput, db: Db, now = new Date()) {
    await this.lockUser(userId, db);
    await this.assertNotSelfExcluded(userId, db);
    const limits = await this.effectiveLimits(userId, now, db);
    for (const l of limits) {
      if (l.type !== 'deposit' || l.amount === null) continue;
      const used = await this.usage(userId, 'deposit', l.period, now, db);
      if (money(used).plus(money(amount)).gt(money(l.amount))) {
        throw new AppError(
          'RG_LIMIT_EXCEEDED',
          `This would exceed your ${l.period}ly deposit limit`,
          {
            type: 'deposit',
            period: l.period,
            limit: toUSDTString(l.amount.toFixed()),
            used,
          },
        );
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
    if (type === 'deposit') return toUSDTString(await this.sumOf(db, userId, 'deposit', since));
    // Refunds only offset stakes bought IN this period (R13): a refund today for yesterday's cancelled round must not
    // free up today's limit.
    const spent = (await this.sumOf(db, userId, 'entry_purchase', since)).minus(
      await this.refundedStakesSince(db, userId, since),
    );
    if (type === 'participation') return toUSDTString(maxZero(spent));
    // loss = stakes − prizes won in the period (never below zero)
    return toUSDTString(maxZero(spent.minus(await this.sumOf(db, userId, 'prize', since))));
  }

  /** Signed net result since `since`: prizes + refunds − entry purchases (incl. platform fees). */
  async netSince(userId: string, since: Date, db: Db = this.prisma): Promise<string> {
    const won = (await this.sumOf(db, userId, 'prize', since)).plus(
      await this.sumOf(db, userId, 'refund', since),
    );
    const spent = await this.sumOf(db, userId, 'entry_purchase', since);
    return toUSDTString(won.minus(spent));
  }

  /** Stake (without fees) of this period's entry purchases whose round has been refunded to the player. */
  private async refundedStakesSince(db: Db, userId: string, since: Date) {
    const purchases = await db.transaction.groupBy({
      by: ['roundId'],
      where: {
        userId,
        type: 'entry_purchase',
        createdAt: { gte: since },
        status: { notIn: ['failed', 'rejected', 'cancelled'] },
        roundId: { not: null },
      },
      _sum: { amount: true },
    });
    if (purchases.length === 0) return money(0);
    const refunded = await db.transaction.findMany({
      where: {
        userId,
        type: 'refund',
        status: { notIn: ['failed', 'rejected', 'cancelled'] },
        roundId: { in: purchases.map((p) => p.roundId!) },
      },
      select: { roundId: true },
      distinct: ['roundId'],
    });
    const rounds = new Set(refunded.map((r) => r.roundId));
    return purchases
      .filter((p) => rounds.has(p.roundId))
      .reduce((acc, p) => acc.plus(money(p._sum.amount?.toFixed() ?? '0')), money(0));
  }

  private async sumOf(
    db: Db,
    userId: string,
    txType: 'deposit' | 'entry_purchase' | 'prize' | 'refund',
    since: Date,
  ) {
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
  }

  private async sessionView(
    userId: string,
    s: SettingsLike,
    limits: RgLimit[],
    exclusion: RgExclusionView,
    now: Date,
  ): Promise<RgSessionView> {
    const counters = countersOf(s);
    const live = isSessionLive(counters, now);
    const startedAt = live ? counters.sessionStartedAt : null;
    const nextAt = nextRealityCheckAt(counters, s.realityCheckMinutes, now);
    return {
      startedAt: startedAt?.toISOString() ?? null,
      durationSeconds: startedAt
        ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))
        : 0,
      lastActivityAt: counters.lastActivityAt?.toISOString() ?? null,
      playedTodaySeconds: playedTodaySeconds(s, now),
      sessionsToday: sameUtcDay(counters.playedDay, now) ? counters.sessionsToday : 0,
      netSession: startedAt ? await this.netSince(userId, startedAt) : '0.00',
      netToday: await this.netSince(userId, periodStart('day', now)),
      realityCheck: {
        intervalMinutes: s.realityCheckMinutes,
        nextAt: nextAt?.toISOString() ?? null,
        due: nextAt !== null && now >= nextAt,
      },
      blockedReason: exclusion.active ? 'excluded' : timeBlock(s, limits, now),
    };
  }

  private upsertSettings(userId: string, data: Partial<Omit<RgSettings, 'id' | 'userId'>>) {
    return this.prisma.rgSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  /** Settings with due pending changes applied (and persisted). */
  private async effectiveSettings(userId: string, now: Date): Promise<SettingsLike> {
    const row = await this.prisma.rgSettings.findUnique({ where: { userId } });
    if (!row) return DEFAULT_SETTINGS;
    const patch: Partial<RgSettings> = {};
    if (row.pendingSessionLimitAt && row.pendingSessionLimitAt <= now) {
      Object.assign(patch, {
        sessionLimitMinutes: row.pendingSessionLimitRemoval ? null : row.pendingSessionLimitMinutes,
        pendingSessionLimitMinutes: null,
        pendingSessionLimitRemoval: false,
        pendingSessionLimitAt: null,
      });
    }
    if (row.pendingQuietOffAt && row.pendingQuietOffAt <= now) {
      Object.assign(patch, { quietHoursEnabled: false, pendingQuietOffAt: null });
    }
    if (Object.keys(patch).length === 0) return row;
    return this.prisma.rgSettings.update({ where: { id: row.id }, data: patch });
  }

  /** Limits with due pending increases / removals applied (and persisted). */
  private async effectiveLimits(
    userId: string,
    now: Date,
    db: Db = this.prisma,
  ): Promise<RgLimit[]> {
    const rows = await db.rgLimit.findMany({ where: { userId }, orderBy: { type: 'asc' } });
    const out: RgLimit[] = [];
    for (const row of rows) {
      if (row.pendingEffectiveAt && row.pendingEffectiveAt <= now) {
        if (row.pendingRemoval) {
          await db.rgLimit.delete({ where: { id: row.id } });
          continue;
        }
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

const LIMIT_ACTIONS = [
  'user.rg.limit_updated',
  'user.rg.limit_removal_requested',
  'user.rg.limit_pending_cancelled',
  'user.rg.session_limit_updated',
  'user.rg.quiet_hours_updated',
];

function countersOf(s: SettingsLike): SessionCounters {
  return {
    sessionStartedAt: s.sessionStartedAt,
    lastActivityAt: s.lastActivityAt,
    lastRealityCheckAt: s.lastRealityCheckAt,
    playedDay: s.playedDay,
    playedTodaySeconds: s.playedTodaySeconds,
    sessionsToday: s.sessionsToday,
  };
}

function playedTodaySeconds(s: SettingsLike, now: Date): number {
  return sameUtcDay(s.playedDay, now) ? s.playedTodaySeconds : 0;
}

function timeBlock(
  s: SettingsLike,
  limits: RgLimit[],
  now: Date,
): 'daily_time_limit' | 'session_limit' | 'quiet_hours' | null {
  const daily = limits.find((l) => l.type === 'session_time' && l.minutes !== null);
  if (daily && playedTodaySeconds(s, now) >= daily.minutes! * 60) return 'daily_time_limit';
  const counters = countersOf(s);
  if (
    s.sessionLimitMinutes !== null &&
    isSessionLive(counters, now) &&
    now.getTime() - counters.sessionStartedAt!.getTime() >= s.sessionLimitMinutes * 60_000
  ) {
    return 'session_limit';
  }
  if (s.quietHoursEnabled && inQuietHours(s.quietStartMinute, s.quietEndMinute, now)) {
    return 'quiet_hours';
  }
  return null;
}

function settingsView(s: SettingsLike): RgSettingsView {
  return {
    realityCheckMinutes: s.realityCheckMinutes,
    realityCheckPause: s.realityCheckPause,
    realityCheckPush: s.realityCheckPush,
    sessionLimit: {
      minutes: s.sessionLimitMinutes,
      pending: s.pendingSessionLimitAt
        ? {
            minutes: s.pendingSessionLimitRemoval ? null : s.pendingSessionLimitMinutes,
            effectiveAt: s.pendingSessionLimitAt.toISOString(),
          }
        : null,
    },
    quietHours: {
      enabled: s.quietHoursEnabled,
      start: hhmm(s.quietStartMinute),
      end: hhmm(s.quietEndMinute),
      pendingOffAt: s.pendingQuietOffAt?.toISOString() ?? null,
    },
  };
}

function limitValue(l: RgLimit): string | null {
  if (l.type === 'session_time') return l.minutes !== null ? String(l.minutes) : null;
  return l.amount !== null ? toUSDTString(l.amount.toFixed()) : null;
}

/** Stringify primitives from audit metadata (objects become ''). */
function str(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}

const TYPE_LABEL: Record<string, string> = {
  deposit: 'deposit',
  participation: 'participation',
  loss: 'loss',
  session_time: 'time',
};
const PERIOD_LABEL: Record<string, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

function fmtValue(type: unknown, v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (type === 'session_time') return `${str(v)} min`;
  return `${str(v)} USDT`;
}

function historyItem(action: string, m: Record<string, unknown>, at: Date): RgHistoryItem {
  const period = PERIOD_LABEL[str(m.period)] ?? '';
  const type = TYPE_LABEL[str(m.type)] ?? str(m.type ?? '');
  switch (action) {
    case 'user.rg.limit_updated': {
      const from = m.from as string | null | undefined;
      const verb =
        from === null || from === undefined
          ? 'set'
          : m.applied === 'after_cooldown'
            ? 'increase requested'
            : 'lowered';
      return {
        at: at.toISOString(),
        action: m.applied === 'after_cooldown' ? 'pending' : 'applied',
        label: `${period} ${type} limit ${verb}`.trim(),
        detail: `${fmtValue(m.type, from)} → ${fmtValue(m.type, m.to ?? m.amount ?? m.minutes)}`,
      };
    }
    case 'user.rg.limit_removal_requested':
      return {
        at: at.toISOString(),
        action: 'pending',
        label: `${period} ${type} limit removal requested`.trim(),
        detail: `${fmtValue(m.type, m.from)} → no limit`,
      };
    case 'user.rg.limit_pending_cancelled':
      return {
        at: at.toISOString(),
        action: 'cancelled',
        label: `${period} ${type} limit change cancelled`.trim(),
        detail: `Kept ${fmtValue(m.type, m.kept)}`,
      };
    case 'user.rg.session_limit_updated':
      return {
        at: at.toISOString(),
        action: m.applied === 'after_cooldown' ? 'pending' : 'applied',
        label: 'Session length limit changed',
        detail: `${m.from ? `${str(m.from)} min` : '—'} → ${m.to ? `${str(m.to)} min` : 'no limit'}`,
      };
    case 'user.rg.quiet_hours_updated':
      return {
        at: at.toISOString(),
        action: m.applied === 'after_cooldown' ? 'pending' : 'applied',
        label:
          m.enabled === false || m.applied === 'after_cooldown'
            ? 'Quiet hours off requested'
            : 'Quiet hours on',
        detail: typeof m.start === 'string' ? `${m.start}–${str(m.end)} UTC` : null,
      };
    case 'user.rg.reality_check':
      return {
        at: at.toISOString(),
        action: str(m.action ?? 'continue'),
        label:
          m.action === 'break'
            ? 'Took a break'
            : m.action === 'history'
              ? 'Viewed history'
              : 'Continued',
        detail: `${str(m.intervalMinutes ?? '')} min`,
      };
    case 'user.rg.reopen_requested':
      return {
        at: at.toISOString(),
        action: 'pending',
        label: 'Reopening requested',
        detail: typeof m.availableAt === 'string' ? `Cool-down until ${m.availableAt}` : null,
      };
    case 'user.rg.reopened':
      return {
        at: at.toISOString(),
        action: 'applied',
        label: 'Account reopened after self-exclusion',
        detail: null,
      };
    default:
      return {
        at: at.toISOString(),
        action: 'applied',
        label: action === 'user.rg.cooling_off' ? 'Break started' : 'Self-exclusion started',
        detail: typeof m.duration === 'string' ? m.duration : null,
      };
  }
}

function maxZero(v: MoneyInput) {
  const d = money(v);
  return d.isNegative() ? money(0) : d;
}
