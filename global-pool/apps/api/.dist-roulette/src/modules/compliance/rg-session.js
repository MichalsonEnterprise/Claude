"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEARTBEAT_MAX_CREDIT_SECONDS = void 0;
exports.utcDay = utcDay;
exports.sameUtcDay = sameUtcDay;
exports.isSessionLive = isSessionLive;
exports.applyHeartbeat = applyHeartbeat;
exports.nextRealityCheckAt = nextRealityCheckAt;
exports.inQuietHours = inQuietHours;
exports.hhmm = hhmm;
exports.minuteOfDay = minuteOfDay;
exports.nextPeriodStart = nextPeriodStart;
/**
 * Pure helpers for responsible-gaming session tracking (RG4 time limits, RG5 reality checks).
 * Kept free of Nest / Prisma so they are unit-tested directly.
 */
const limits_1 = require("@gp/shared/limits");
/** Longest gap between two heartbeats that still counts as play time (the web sends one every 60 s). */
exports.HEARTBEAT_MAX_CREDIT_SECONDS = 120;
function utcDay(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function sameUtcDay(a, b) {
    return !!a && utcDay(a).getTime() === utcDay(b).getTime();
}
/** A session is live while the last activity is within the idle window. */
function isSessionLive(c, now) {
    return (!!c.lastActivityAt &&
        !!c.sessionStartedAt &&
        now.getTime() - c.lastActivityAt.getTime() <= limits_1.RG_SESSION_IDLE_MINUTES * 60_000);
}
/**
 * Apply one activity heartbeat. Continuing a live session credits the gap since the last heartbeat (capped);
 * otherwise a new session starts. Daily counters reset at 00:00 UTC.
 */
function applyHeartbeat(c, now) {
    const live = isSessionLive(c, now);
    let played = sameUtcDay(c.playedDay, now) ? c.playedTodaySeconds : 0;
    let sessions = sameUtcDay(c.playedDay, now) ? c.sessionsToday : 0;
    if (live) {
        const gap = Math.max(0, Math.floor((now.getTime() - c.lastActivityAt.getTime()) / 1000));
        const sinceMidnight = Math.floor((now.getTime() - utcDay(now).getTime()) / 1000);
        played += Math.min(gap, exports.HEARTBEAT_MAX_CREDIT_SECONDS, sinceMidnight);
        if (!sameUtcDay(c.playedDay, now))
            sessions = 1; // a session that crossed midnight counts today too
    }
    else {
        sessions += 1;
    }
    return {
        sessionStartedAt: live ? c.sessionStartedAt : now,
        lastActivityAt: now,
        lastRealityCheckAt: live ? c.lastRealityCheckAt : null,
        playedDay: utcDay(now),
        playedTodaySeconds: played,
        sessionsToday: sessions,
    };
}
/** Next reality-check time: counted from the session start or the last acknowledged reminder. */
function nextRealityCheckAt(c, intervalMinutes, now) {
    if (!isSessionLive(c, now))
        return null;
    const anchor = c.lastRealityCheckAt && c.lastRealityCheckAt > c.sessionStartedAt
        ? c.lastRealityCheckAt
        : c.sessionStartedAt;
    return new Date(anchor.getTime() + intervalMinutes * 60_000);
}
/** Minutes of the day (UTC) inside a quiet-hours window [start, end), which may wrap past midnight. */
function inQuietHours(startMinute, endMinute, now) {
    const m = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (startMinute === endMinute)
        return false;
    return startMinute < endMinute
        ? m >= startMinute && m < endMinute
        : m >= startMinute || m < endMinute;
}
function hhmm(minuteOfDay) {
    const h = Math.floor(minuteOfDay / 60);
    const m = minuteOfDay % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function minuteOfDay(value) {
    const [h, m] = value.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}
/** Start of the NEXT UTC day / ISO week (Monday) / month — when a limit period resets. */
function nextPeriodStart(period, now) {
    const d = utcDay(now);
    if (period === 'day')
        return new Date(d.getTime() + 86_400_000);
    if (period === 'week') {
        const dow = (d.getUTCDay() + 6) % 7;
        return new Date(d.getTime() + (7 - dow) * 86_400_000);
    }
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
//# sourceMappingURL=rg-session.js.map