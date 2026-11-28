"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsibleGamingService = void 0;
const common_1 = require("@nestjs/common");
const enums_1 = require("@gp/shared/enums");
const limits_1 = require("@gp/shared/limits");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const step_up_service_1 = require("../security/step-up.service");
const totp_service_1 = require("../security/totp.service");
const rg_session_1 = require("./rg-session");
const DEFAULT_SETTINGS = {
    realityCheckMinutes: limits_1.REALITY_CHECK_DEFAULT_MINUTES,
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
};
/**
 * Responsible gaming — enforced server-side. Decreases apply immediately; increases and removals wait for the 24 h
 * cool-down (stored as pending, applied lazily once due). Breaks (cooling-off) and self-exclusion are immediate,
 * never obstructed and cannot be shortened; withdrawals stay available throughout. Time limits (daily play time,
 * session length, quiet hours) are tracked from activity heartbeats and block NEW entries / bets.
 */
let ResponsibleGamingService = class ResponsibleGamingService {
    prisma;
    stepUp;
    totp;
    constructor(prisma, stepUp, totp) {
        this.prisma = prisma;
        this.stepUp = stepUp;
        this.totp = totp;
    }
    // ── state ─────────────────────────────────────────────────────────────────────────────────────
    async state(userId, now = new Date()) {
        const settings = await this.effectiveSettings(userId, now);
        const rows = await this.effectiveLimits(userId, now);
        const playedToday = playedTodaySeconds(settings, now);
        const limits = [];
        for (const row of rows) {
            const isTime = row.type === 'session_time';
            const used = isTime ? null : await this.usage(userId, row.type, row.period, now);
            const limit = (0, money_2.usdtOrNull)(row.amount);
            limits.push({
                type: row.type,
                period: row.period,
                limit,
                minutes: row.minutes,
                used,
                usedMinutes: isTime ? Math.floor(playedToday / 60) : null,
                remaining: limit !== null && used !== null ? (0, money_1.toUSDTString)(maxZero((0, money_1.sub)(limit, used))) : null,
                resetsAt: (0, rg_session_1.nextPeriodStart)(row.period, now).toISOString(),
                pendingIncrease: row.pendingEffectiveAt && !row.pendingRemoval
                    ? {
                        amount: (0, money_2.usdtOrNull)(row.pendingAmount),
                        minutes: row.pendingMinutes,
                        effectiveAt: row.pendingEffectiveAt.toISOString(),
                    }
                    : null,
                pendingRemoval: row.pendingEffectiveAt && row.pendingRemoval
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
    async updateLimit(userId, input, now = new Date()) {
        await this.changeLimit(userId, input, now);
        return this.state(userId, now);
    }
    async changeLimit(userId, input, now = new Date()) {
        const existing = (await this.effectiveLimits(userId, now)).find((l) => l.type === input.type && l.period === input.period);
        const isMinutes = input.type === 'session_time';
        const newValue = isMinutes ? String(input.minutes) : input.amount;
        const current = existing ? limitValue(existing) : null;
        const increase = current !== null && (0, money_1.gt)(newValue, current);
        const effectiveAt = increase ? (0, time_1.addHours)(now, limits_1.RG_LIMIT_INCREASE_COOLDOWN_HOURS) : now;
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
            to: isMinutes ? newValue : (0, money_1.toUSDTString)(newValue),
            applied: increase ? 'after_cooldown' : 'immediately',
            effectiveAt: effectiveAt.toISOString(),
        };
    }
    /** Remove a limit: like an increase, it only takes effect after the 24 h cool-down (cancellable). */
    async removeLimit(userId, ref, now = new Date()) {
        const existing = (await this.effectiveLimits(userId, now)).find((l) => l.type === ref.type && l.period === ref.period);
        if (!existing)
            throw (0, errors_1.notFound)('Limit', { ...ref });
        const effectiveAt = (0, time_1.addHours)(now, limits_1.RG_LIMIT_INCREASE_COOLDOWN_HOURS);
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
    async cancelPending(userId, ref, now = new Date()) {
        const existing = (await this.effectiveLimits(userId, now)).find((l) => l.type === ref.type && l.period === ref.period);
        if (!existing?.pendingEffectiveAt)
            throw (0, errors_1.notFound)('Pending limit change', { ...ref });
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
                : ((0, money_2.usdtOrNull)(existing.pendingAmount) ?? String(existing.pendingMinutes)),
        };
    }
    // ── time settings (RG4) ───────────────────────────────────────────────────────────────────────
    /** Session-length limit: new / lower → now; higher / removal → after 24 h. */
    async setSessionLimit(userId, minutes, now = new Date()) {
        const s = await this.effectiveSettings(userId, now);
        const current = s.sessionLimitMinutes;
        const delayed = current !== null && (minutes === null || minutes > current);
        const data = delayed
            ? {
                pendingSessionLimitMinutes: minutes,
                pendingSessionLimitRemoval: minutes === null,
                pendingSessionLimitAt: (0, time_1.addHours)(now, limits_1.RG_LIMIT_INCREASE_COOLDOWN_HOURS),
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
            applied: delayed ? 'after_cooldown' : 'immediately',
        };
    }
    /** Quiet hours: turning them on applies at once; turning them off waits 24 h. */
    async setQuietHours(userId, input, now = new Date()) {
        const s = await this.effectiveSettings(userId, now);
        const start = (0, rg_session_1.minuteOfDay)(input.start);
        const end = (0, rg_session_1.minuteOfDay)(input.end);
        if (input.enabled) {
            if (s.quietHoursEnabled && (s.quietStartMinute !== start || s.quietEndMinute !== end)) {
                throw (0, errors_1.conflict)('Turn quiet hours off first to change the times (turning off waits 24 hours)');
            }
            await this.upsertSettings(userId, {
                quietHoursEnabled: true,
                quietStartMinute: start,
                quietEndMinute: end,
                pendingQuietOffAt: null,
            });
            return { enabled: true, applied: 'immediately' };
        }
        if (!s.quietHoursEnabled)
            return { enabled: false, applied: 'immediately' };
        const at = s.pendingQuietOffAt ?? (0, time_1.addHours)(now, limits_1.RG_LIMIT_INCREASE_COOLDOWN_HOURS);
        await this.upsertSettings(userId, { pendingQuietOffAt: at });
        return { enabled: true, applied: 'after_cooldown', effectiveAt: at.toISOString() };
    }
    async cancelPendingSetting(userId, target, now = new Date()) {
        const s = await this.effectiveSettings(userId, now);
        if (target === 'session_limit') {
            if (!s.pendingSessionLimitAt)
                throw (0, errors_1.notFound)('Pending session-limit change');
            await this.upsertSettings(userId, {
                pendingSessionLimitMinutes: null,
                pendingSessionLimitRemoval: false,
                pendingSessionLimitAt: null,
            });
        }
        else {
            if (!s.pendingQuietOffAt)
                throw (0, errors_1.notFound)('Pending quiet-hours change');
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
    async selfExclude(user, input, now = new Date(), proof = {}) {
        const userId = typeof user === 'string' ? user : user.id;
        const duration = input.duration;
        if (!(0, enums_1.isCoolingOffDuration)(duration)) {
            if ((input.phrase ?? '').trim() !== limits_1.SELF_EXCLUSION_CONFIRM_PHRASE) {
                throw new errors_1.AppError('VALIDATION_FAILED', `Type ${limits_1.SELF_EXCLUSION_CONFIRM_PHRASE} to confirm`, {
                    field: 'phrase',
                });
            }
            if (input.acknowledged !== true) {
                throw new errors_1.AppError('VALIDATION_FAILED', 'Confirm that you understand this cannot be reversed', {
                    field: 'acknowledged',
                });
            }
            if (typeof user !== 'string' && (await this.totp.status({ userId })).enabled) {
                await this.stepUp.assert(user, 'security_settings', {
                    totpCode: input.totpCode,
                    stepUpToken: proof.stepUpToken,
                });
            }
        }
        const endsAt = (0, time_1.selfExclusionEnd)(duration, now);
        const current = await this.exclusion(userId, this.prisma, now);
        if (current.active) {
            const currentEnd = current.endsAt ? new Date(current.endsAt) : null;
            const notLonger = currentEnd === null || (endsAt !== null && endsAt <= currentEnd);
            if (notLonger) {
                throw (0, errors_1.conflict)('You already have an active break or self-exclusion that lasts at least as long. It cannot be shortened.', { endsAt: current.endsAt, kind: current.kind });
            }
        }
        const row = await this.prisma.rgSelfExclusion.create({
            data: { userId, duration, startsAt: now, endsAt },
        });
        return {
            kind: (0, enums_1.isCoolingOffDuration)(duration) ? 'cooling_off' : 'self_exclusion',
            duration: row.duration,
            startsAt: row.startsAt.toISOString(),
            endsAt: endsAt?.toISOString() ?? null,
        };
    }
    /** Effective exclusion = the active row that ends last (permanent wins). */
    async exclusion(userId, db = this.prisma, now = new Date()) {
        const rows = await db.rgSelfExclusion.findMany({
            where: { userId, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            orderBy: { startsAt: 'asc' },
        });
        if (rows.length === 0) {
            return { active: false, kind: null, duration: null, startsAt: null, endsAt: null };
        }
        const longest = rows.reduce((a, b) => a.endsAt === null ? a : b.endsAt === null || b.endsAt > a.endsAt ? b : a);
        const duration = longest.duration;
        return {
            active: true,
            kind: (0, enums_1.isCoolingOffDuration)(duration) ? 'cooling_off' : 'self_exclusion',
            duration,
            startsAt: rows[0].startsAt.toISOString(),
            endsAt: longest.endsAt?.toISOString() ?? null,
        };
    }
    async activeSelfExclusion(userId, db = this.prisma, now = new Date()) {
        return db.rgSelfExclusion.findFirst({
            where: { userId, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            orderBy: { startsAt: 'desc' },
        });
    }
    async assertNotSelfExcluded(userId, db = this.prisma) {
        const ex = await this.exclusion(userId, db);
        if (ex.active) {
            throw new errors_1.AppError('SELF_EXCLUDED', ex.kind === 'cooling_off'
                ? 'You are on a break — gaming and deposits are paused until it ends'
                : 'You are self-excluded — gaming and deposits are paused', { endsAt: ex.endsAt, kind: ex.kind });
        }
    }
    // ── reality checks & sessions (RG5) ───────────────────────────────────────────────────────────
    async setRealityCheck(userId, intervalMinutes, toggles = {}) {
        await this.upsertSettings(userId, {
            realityCheckMinutes: intervalMinutes,
            ...(toggles.pauseGame !== undefined ? { realityCheckPause: toggles.pauseGame } : {}),
            ...(toggles.pushNotification !== undefined
                ? { realityCheckPush: toggles.pushNotification }
                : {}),
        });
        return this.state(userId);
    }
    async acknowledgeRealityCheck(userId, action = 'continue', now = new Date()) {
        const s = await this.effectiveSettings(userId, now);
        const minutes = (0, rg_session_1.isSessionLive)(s, now)
            ? Math.round((now.getTime() - s.sessionStartedAt.getTime()) / 60_000)
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
    async heartbeat(userId, now = new Date()) {
        await this.prisma.tx(async (tx) => {
            await tx.rgSettings.upsert({ where: { userId }, create: { userId }, update: {} });
            await tx.$queryRaw `SELECT id FROM responsible_gaming_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
            const s = await tx.rgSettings.findUniqueOrThrow({ where: { userId } });
            const next = (0, rg_session_1.applyHeartbeat)(countersOf(s), now);
            await tx.rgSettings.update({ where: { userId }, data: next });
        });
        return this.session(userId, now);
    }
    async session(userId, now = new Date()) {
        const settings = await this.effectiveSettings(userId, now);
        const rows = await this.effectiveLimits(userId, now);
        const exclusion = await this.exclusion(userId, this.prisma, now);
        return this.sessionView(userId, settings, rows, exclusion, now);
    }
    /** Limit changes and reality-check answers, newest first (from the hash-chained audit log). */
    async history(userId, kind, limit = 20) {
        const actions = kind === 'limits'
            ? LIMIT_ACTIONS
            : kind === 'reality_checks'
                ? ['user.rg.reality_check']
                : [
                    ...LIMIT_ACTIONS,
                    'user.rg.reality_check',
                    'user.rg.self_excluded',
                    'user.rg.cooling_off',
                ];
        const rows = await this.prisma.auditLog.findMany({
            where: { actorType: 'user', actorId: userId, action: { in: actions } },
            orderBy: { seq: 'desc' },
            take: limit,
        });
        return rows.map((r) => historyItem(r.action, (r.metadata ?? {}), r.createdAt));
    }
    // ── enforcement ───────────────────────────────────────────────────────────────────────────────
    /** Global Pool entries + game stakes: exclusion, money limits and time rules. Call inside the purchase tx. */
    async assertCanParticipate(userId, total, db, now = new Date()) {
        await this.assertNotSelfExcluded(userId, db);
        const limits = await this.effectiveLimits(userId, now, db);
        for (const l of limits) {
            if ((l.type !== 'participation' && l.type !== 'loss') || l.amount === null)
                continue;
            const used = await this.usage(userId, l.type, l.period, now, db);
            const after = (0, money_1.money)(used).plus((0, money_1.money)(total));
            if (after.gt((0, money_1.money)(l.amount))) {
                throw new errors_1.AppError('RG_LIMIT_EXCEEDED', `This would exceed your ${l.period === 'day' ? 'daily' : `${l.period}ly`} ${l.type} limit`, {
                    type: l.type,
                    period: l.period,
                    limit: (0, money_1.toUSDTString)(l.amount.toFixed()),
                    used,
                    remaining: (0, money_1.toUSDTString)(maxZero((0, money_1.sub)(l.amount.toFixed(), used))),
                    resetsAt: (0, rg_session_1.nextPeriodStart)(l.period, now).toISOString(),
                });
            }
        }
        await this.assertTimeRules(userId, limits, db, now);
    }
    /** Daily play-time limit, session-length limit and quiet hours (new entries / bets only). */
    async assertTimeRules(userId, limits, db, now = new Date()) {
        const row = await db.rgSettings.findUnique({ where: { userId } });
        if (!row)
            return;
        const reason = timeBlock(row, limits, now);
        if (!reason)
            return;
        const messages = {
            daily_time_limit: 'You have reached your daily time limit — play resumes at 00:00 UTC',
            session_limit: 'You have reached your session length limit — take a 15-minute pause to start a new session',
            quiet_hours: `Quiet hours are on (${(0, rg_session_1.hhmm)(row.quietStartMinute)}–${(0, rg_session_1.hhmm)(row.quietEndMinute)} UTC) — play is paused`,
        };
        throw new errors_1.AppError('RG_LIMIT_EXCEEDED', messages[reason], { type: reason });
    }
    async assertCanDeposit(userId, amount, db, now = new Date()) {
        await this.assertNotSelfExcluded(userId, db);
        const limits = await this.effectiveLimits(userId, now, db);
        for (const l of limits) {
            if (l.type !== 'deposit' || l.amount === null)
                continue;
            const used = await this.usage(userId, 'deposit', l.period, now, db);
            if ((0, money_1.money)(used).plus((0, money_1.money)(amount)).gt((0, money_1.money)(l.amount))) {
                throw new errors_1.AppError('RG_LIMIT_EXCEEDED', `This would exceed your ${l.period}ly deposit limit`, {
                    type: 'deposit',
                    period: l.period,
                    limit: (0, money_1.toUSDTString)(l.amount.toFixed()),
                    used,
                });
            }
        }
    }
    /** Usage in the current UTC period from the user-facing transaction history. */
    async usage(userId, type, period, now = new Date(), db = this.prisma) {
        const since = (0, time_1.periodStart)(period, now);
        if (type === 'deposit')
            return (0, money_1.toUSDTString)(await this.sumOf(db, userId, 'deposit', since));
        const spent = (await this.sumOf(db, userId, 'entry_purchase', since)).minus(await this.sumOf(db, userId, 'refund', since));
        if (type === 'participation')
            return (0, money_1.toUSDTString)(maxZero(spent));
        // loss = stakes − prizes won in the period (never below zero)
        return (0, money_1.toUSDTString)(maxZero(spent.minus(await this.sumOf(db, userId, 'prize', since))));
    }
    /** Signed net result since `since`: prizes + refunds − entry purchases (incl. platform fees). */
    async netSince(userId, since, db = this.prisma) {
        const won = (await this.sumOf(db, userId, 'prize', since)).plus(await this.sumOf(db, userId, 'refund', since));
        const spent = await this.sumOf(db, userId, 'entry_purchase', since);
        return (0, money_1.toUSDTString)(won.minus(spent));
    }
    async sumOf(db, userId, txType, since) {
        const agg = await db.transaction.aggregate({
            where: {
                userId,
                type: txType,
                createdAt: { gte: since },
                status: { notIn: ['failed', 'rejected', 'cancelled'] },
            },
            _sum: { netAmount: true },
        });
        return (0, money_1.money)(agg._sum.netAmount?.toFixed() ?? '0');
    }
    async sessionView(userId, s, limits, exclusion, now) {
        const counters = countersOf(s);
        const live = (0, rg_session_1.isSessionLive)(counters, now);
        const startedAt = live ? counters.sessionStartedAt : null;
        const nextAt = (0, rg_session_1.nextRealityCheckAt)(counters, s.realityCheckMinutes, now);
        return {
            startedAt: startedAt?.toISOString() ?? null,
            durationSeconds: startedAt
                ? Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))
                : 0,
            lastActivityAt: counters.lastActivityAt?.toISOString() ?? null,
            playedTodaySeconds: playedTodaySeconds(s, now),
            sessionsToday: (0, rg_session_1.sameUtcDay)(counters.playedDay, now) ? counters.sessionsToday : 0,
            netSession: startedAt ? await this.netSince(userId, startedAt) : '0.00',
            netToday: await this.netSince(userId, (0, time_1.periodStart)('day', now)),
            realityCheck: {
                intervalMinutes: s.realityCheckMinutes,
                nextAt: nextAt?.toISOString() ?? null,
                due: nextAt !== null && now >= nextAt,
            },
            blockedReason: exclusion.active ? 'excluded' : timeBlock(s, limits, now),
        };
    }
    upsertSettings(userId, data) {
        return this.prisma.rgSettings.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
    }
    /** Settings with due pending changes applied (and persisted). */
    async effectiveSettings(userId, now) {
        const row = await this.prisma.rgSettings.findUnique({ where: { userId } });
        if (!row)
            return DEFAULT_SETTINGS;
        const patch = {};
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
        if (Object.keys(patch).length === 0)
            return row;
        return this.prisma.rgSettings.update({ where: { id: row.id }, data: patch });
    }
    /** Limits with due pending increases / removals applied (and persisted). */
    async effectiveLimits(userId, now, db = this.prisma) {
        const rows = await db.rgLimit.findMany({ where: { userId }, orderBy: { type: 'asc' } });
        const out = [];
        for (const row of rows) {
            if (row.pendingEffectiveAt && row.pendingEffectiveAt <= now) {
                if (row.pendingRemoval) {
                    await db.rgLimit.delete({ where: { id: row.id } });
                    continue;
                }
                out.push(await db.rgLimit.update({
                    where: { id: row.id },
                    data: {
                        amount: row.pendingAmount ?? row.amount,
                        minutes: row.pendingMinutes ?? row.minutes,
                        pendingAmount: null,
                        pendingMinutes: null,
                        pendingEffectiveAt: null,
                    },
                }));
            }
            else {
                out.push(row);
            }
        }
        return out;
    }
};
exports.ResponsibleGamingService = ResponsibleGamingService;
exports.ResponsibleGamingService = ResponsibleGamingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        step_up_service_1.StepUpService,
        totp_service_1.TotpService])
], ResponsibleGamingService);
const LIMIT_ACTIONS = [
    'user.rg.limit_updated',
    'user.rg.limit_removal_requested',
    'user.rg.limit_pending_cancelled',
    'user.rg.session_limit_updated',
    'user.rg.quiet_hours_updated',
];
function countersOf(s) {
    return {
        sessionStartedAt: s.sessionStartedAt,
        lastActivityAt: s.lastActivityAt,
        lastRealityCheckAt: s.lastRealityCheckAt,
        playedDay: s.playedDay,
        playedTodaySeconds: s.playedTodaySeconds,
        sessionsToday: s.sessionsToday,
    };
}
function playedTodaySeconds(s, now) {
    return (0, rg_session_1.sameUtcDay)(s.playedDay, now) ? s.playedTodaySeconds : 0;
}
function timeBlock(s, limits, now) {
    const daily = limits.find((l) => l.type === 'session_time' && l.minutes !== null);
    if (daily && playedTodaySeconds(s, now) >= daily.minutes * 60)
        return 'daily_time_limit';
    const counters = countersOf(s);
    if (s.sessionLimitMinutes !== null &&
        (0, rg_session_1.isSessionLive)(counters, now) &&
        now.getTime() - counters.sessionStartedAt.getTime() >= s.sessionLimitMinutes * 60_000) {
        return 'session_limit';
    }
    if (s.quietHoursEnabled && (0, rg_session_1.inQuietHours)(s.quietStartMinute, s.quietEndMinute, now)) {
        return 'quiet_hours';
    }
    return null;
}
function settingsView(s) {
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
            start: (0, rg_session_1.hhmm)(s.quietStartMinute),
            end: (0, rg_session_1.hhmm)(s.quietEndMinute),
            pendingOffAt: s.pendingQuietOffAt?.toISOString() ?? null,
        },
    };
}
function limitValue(l) {
    if (l.type === 'session_time')
        return l.minutes !== null ? String(l.minutes) : null;
    return l.amount !== null ? (0, money_1.toUSDTString)(l.amount.toFixed()) : null;
}
/** Stringify primitives from audit metadata (objects become ''). */
function str(v) {
    return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}
const TYPE_LABEL = {
    deposit: 'deposit',
    participation: 'participation',
    loss: 'loss',
    session_time: 'time',
};
const PERIOD_LABEL = { day: 'Daily', week: 'Weekly', month: 'Monthly' };
function fmtValue(type, v) {
    if (v === null || v === undefined)
        return '—';
    if (type === 'session_time')
        return `${str(v)} min`;
    return `${str(v)} USDT`;
}
function historyItem(action, m, at) {
    const period = PERIOD_LABEL[str(m.period)] ?? '';
    const type = TYPE_LABEL[str(m.type)] ?? str(m.type ?? '');
    switch (action) {
        case 'user.rg.limit_updated': {
            const from = m.from;
            const verb = from === null || from === undefined
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
                label: m.enabled === false || m.applied === 'after_cooldown'
                    ? 'Quiet hours off requested'
                    : 'Quiet hours on',
                detail: typeof m.start === 'string' ? `${m.start}–${str(m.end)} UTC` : null,
            };
        case 'user.rg.reality_check':
            return {
                at: at.toISOString(),
                action: str(m.action ?? 'continue'),
                label: m.action === 'break'
                    ? 'Took a break'
                    : m.action === 'history'
                        ? 'Viewed history'
                        : 'Continued',
                detail: `${str(m.intervalMinutes ?? '')} min`,
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
function maxZero(v) {
    const d = (0, money_1.money)(v);
    return d.isNegative() ? (0, money_1.money)(0) : d;
}
//# sourceMappingURL=responsible-gaming.service.js.map