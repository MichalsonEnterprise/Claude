import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_KEYS,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreferencesUpdate,
  type ProfileUpdate,
} from '@gp/shared/schemas';

import { notFound } from '../../common/errors';
import type { AuthUser } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { maskIp } from '../auth/account-status.controller';
import { TotpService } from '../security/totp.service';

/** Stored shape of `user_profiles.preferences` (JSONB). Every field optional — defaults are resolved on read. */
interface StoredPreferences {
  language?: string;
  timeZone?: string;
  notifications?: {
    categories?: Partial<
      Record<NotificationCategory, Partial<Record<NotificationChannel, boolean>>>
    >;
    quietHours?: { enabled: boolean; from: string; to: string };
    updatedAt?: string;
  };
  profileUpdatedAt?: string;
}

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_TIME_ZONE = 'UTC';
const DEFAULT_QUIET_HOURS = { enabled: false, from: '23:00', to: '08:00' };
/** Ended sessions are listed for this long (A7 "Removed in the last 90 days", A8 "Recently ended"). */
const ENDED_SESSION_DAYS = 90;
/** Platform default — the player cannot lengthen it (A8 session settings card). */
export const SESSION_IDLE_TIMEOUT_MINUTES = 30;

type ChannelMatrix = Record<NotificationChannel, boolean | null>;

export interface ResolvedNotificationCategory {
  key: NotificationCategory;
  group: (typeof NOTIFICATION_CATEGORIES)[NotificationCategory]['group'];
  locked: boolean;
  channels: ChannelMatrix;
}

function asPrefs(value: Prisma.JsonValue | null | undefined): StoredPreferences {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as StoredPreferences)
    : {};
}

/** Defaults + stored choices; locked categories and channels that are not offered can never change. */
export function resolveNotificationCategories(
  stored: StoredPreferences['notifications'],
): ResolvedNotificationCategory[] {
  return NOTIFICATION_CATEGORY_KEYS.map((key) => {
    const spec = NOTIFICATION_CATEGORIES[key];
    const saved = stored?.categories?.[key] ?? {};
    const channels = {} as ChannelMatrix;
    for (const ch of ['email', 'push', 'inApp'] as const) {
      const def = spec.channels[ch];
      channels[ch] = def === null ? null : spec.locked ? def : (saved[ch] ?? def);
    }
    return { key, group: spec.group, locked: spec.locked, channels };
  });
}

/** Human labels for the player's own audit trail (A2 "Recent security events"). */
const SECURITY_EVENT_LABELS: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'info' }
> = {
  'user.2fa.enabled': { label: 'Two-factor authentication turned on', tone: 'success' },
  'user.2fa.disabled': { label: 'Two-factor authentication turned off', tone: 'warning' },
  'user.2fa.backup_codes_regenerated': { label: 'New backup codes generated', tone: 'info' },
  'user.anti_phishing.updated': { label: 'Anti-phishing code changed', tone: 'info' },
  'user.whitelist.added': { label: 'Withdrawal address whitelisted', tone: 'success' },
  'user.whitelist.removed': {
    label: 'Withdrawal address removed from the whitelist',
    tone: 'info',
  },
  'user.session.revoked': { label: 'A device was signed out', tone: 'info' },
  'user.sessions.revoked_others': { label: 'All other sessions ended', tone: 'info' },
  'user.new_device.confirmed': { label: 'New device confirmed as yours', tone: 'success' },
  'user.new_device.secured': {
    label: 'Account secured — other sessions signed out',
    tone: 'warning',
  },
  'user.onboarding.completed': { label: 'Account created and consents recorded', tone: 'info' },
  'user.profile.updated': { label: 'Profile details updated', tone: 'info' },
  'user.notification_prefs.updated': { label: 'Notification preferences updated', tone: 'info' },
  'user.kyc.submitted': { label: 'Identity documents submitted', tone: 'info' },
  'withdrawal.requested': { label: 'Withdrawal confirmed with your 2FA code', tone: 'success' },
};

/** "MacBook Pro · Chrome" → { device: 'MacBook Pro', browser: 'Chrome' }. */
export function splitDeviceLabel(label: string | null): { device: string; browser: string | null } {
  if (!label) return { device: 'Unknown device', browser: null };
  const [device, browser] = label.split(' · ');
  return { device: device?.trim() || 'Unknown device', browser: browser?.trim() || null };
}

/** How the session signed in, derived from the Privy session id (no secrets). */
function signInMethod(privySessionId: string | null, isDemo: boolean): string {
  if (isDemo) return 'Email code + 2FA (DEMO)';
  if (privySessionId?.startsWith('mock-sid-')) return 'Email code (DEV MOCK)';
  return 'Privy sign-in';
}

/**
 * Account module (USR-A1…A10): preferences, sessions & devices, login history and the security overview. Reads
 * only the player's own rows; protective actions (ending sessions) never need a 2FA code.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
  ) {}

  private async storedPrefs(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { preferences: true, displayName: true, marketingOptIn: true },
    });
    if (!profile) throw notFound('Profile');
    return { profile, prefs: asPrefs(profile.preferences) };
  }

  async preferences(userId: string) {
    const { profile, prefs } = await this.storedPrefs(userId);
    return {
      displayName: profile.displayName,
      language: prefs.language ?? DEFAULT_LANGUAGE,
      timeZone: prefs.timeZone ?? DEFAULT_TIME_ZONE,
      profileUpdatedAt: prefs.profileUpdatedAt ?? null,
      marketingOptIn: profile.marketingOptIn,
      notifications: {
        categories: resolveNotificationCategories(prefs.notifications),
        quietHours: prefs.notifications?.quietHours ?? DEFAULT_QUIET_HOURS,
        updatedAt: prefs.notifications?.updatedAt ?? null,
      },
      sessions: { idleTimeoutMinutes: SESSION_IDLE_TIMEOUT_MINUTES },
    };
  }

  async updateProfile(userId: string, input: ProfileUpdate) {
    const { prefs } = await this.storedPrefs(userId);
    const next: StoredPreferences = {
      ...prefs,
      ...(input.language ? { language: input.language } : {}),
      ...(input.timeZone ? { timeZone: input.timeZone } : {}),
      profileUpdatedAt: new Date().toISOString(),
    };
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        preferences: next as Prisma.InputJsonObject,
      },
    });
    return this.preferences(userId);
  }

  /**
   * A9 — save notification choices. Locked categories (security, RG) stay on whatever is sent. Marketing stays an
   * explicit opt-in: `marketingOptIn` mirrors the "Promotions" category and is never switched on by default.
   */
  async updateNotifications(userId: string, input: NotificationPreferencesUpdate) {
    const { prefs } = await this.storedPrefs(userId);
    const categories = { ...(prefs.notifications?.categories ?? {}) };
    for (const [key, value] of Object.entries(input.categories ?? {}) as [
      NotificationCategory,
      Partial<Record<NotificationChannel, boolean>>,
    ][]) {
      const spec = NOTIFICATION_CATEGORIES[key];
      if (spec.locked || !value) continue;
      const clean: Partial<Record<NotificationChannel, boolean>> = { ...(categories[key] ?? {}) };
      for (const ch of ['email', 'push', 'inApp'] as const) {
        if (spec.channels[ch] !== null && typeof value[ch] === 'boolean') clean[ch] = value[ch];
      }
      categories[key] = clean;
    }
    const notifications = {
      categories,
      quietHours: input.quietHours ?? prefs.notifications?.quietHours ?? DEFAULT_QUIET_HOURS,
      updatedAt: new Date().toISOString(),
    };
    const resolved = resolveNotificationCategories(notifications);
    const promo = resolved.find((c) => c.key === 'offers_promotions')!;
    const marketingOptIn = Object.values(promo.channels).some((v) => v === true);
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        preferences: { ...prefs, notifications } as Prisma.InputJsonObject,
        marketingOptIn,
        marketingOptInAt: marketingOptIn ? new Date() : null,
      },
    });
    return this.preferences(userId);
  }

  /** Session rows as devices (A7) / sessions (A8). `all` adds sessions ended in the last 90 days. */
  async sessions(user: AuthUser, include: 'active' | 'all' = 'active') {
    const since = new Date(Date.now() - ENDED_SESSION_DAYS * 86_400_000);
    const rows = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        subject: 'user',
        ...(include === 'all'
          ? { OR: [{ revokedAt: null }, { revokedAt: { gte: since } }] }
          : { revokedAt: null }),
      },
      orderBy: [{ revokedAt: { sort: 'desc', nulls: 'first' } }, { lastSeenAt: 'desc' }],
      take: 100,
    });
    return rows.map((s) => {
      const { device, browser } = splitDeviceLabel(s.deviceLabel);
      return {
        id: s.id,
        device: s.deviceLabel ?? 'Unknown device',
        deviceName: device,
        browser,
        ip: s.ip,
        ipMasked: maskIp(s.ip),
        location: s.location,
        current: s.id === user.sessionId,
        flagged: s.flagged,
        flaggedReason: s.flaggedReason,
        status: s.revokedAt ? ('ended' as const) : ('active' as const),
        endedAt: s.revokedAt?.toISOString() ?? null,
        endedReason: s.revokedReason,
        method: signInMethod(s.privySessionId, s.isDemo),
        lastSeenAt: s.lastSeenAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        isDemo: s.isDemo,
      };
    });
  }

  /** A8 "End all other sessions" — protective, so no 2FA code is needed. The current session stays. */
  async revokeOtherSessions(user: AuthUser) {
    const result = await this.prisma.session.updateMany({
      where: { userId: user.id, subject: 'user', revokedAt: null, id: { not: user.sessionId } },
      data: { revokedAt: new Date(), revokedReason: 'ended_by_user' },
    });
    return { revoked: result.count };
  }

  /** A6 — sign-ins (one row per Privy session) for the last `days` days, newest first. */
  async loginHistory(
    user: AuthUser,
    query: {
      filter: 'all' | 'success' | 'flagged' | 'ended';
      days: number;
      page: number;
      pageSize: number;
    },
  ) {
    const since = new Date(Date.now() - query.days * 86_400_000);
    const base: Prisma.SessionWhereInput = {
      userId: user.id,
      subject: 'user',
      createdAt: { gte: since },
    };
    const where: Prisma.SessionWhereInput =
      query.filter === 'flagged'
        ? { ...base, flagged: true }
        : query.filter === 'success'
          ? { ...base, flagged: false }
          : query.filter === 'ended'
            ? { ...base, revokedAt: { not: null } }
            : base;
    const [rows, total, all, flagged, ended] = await Promise.all([
      this.prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.session.count({ where }),
      this.prisma.session.count({ where: base }),
      this.prisma.session.count({ where: { ...base, flagged: true } }),
      this.prisma.session.count({ where: { ...base, revokedAt: { not: null } } }),
    ]);
    return {
      items: rows.map((s) => {
        const { device, browser } = splitDeviceLabel(s.deviceLabel);
        return {
          id: s.id,
          signedInAt: s.createdAt.toISOString(),
          device,
          browser,
          method: signInMethod(s.privySessionId, s.isDemo),
          location: s.location,
          ipMasked: maskIp(s.ip),
          result: s.flagged ? ('flagged' as const) : ('success' as const),
          flaggedReason: s.flaggedReason,
          current: s.id === user.sessionId,
          active: s.revokedAt === null,
          endedAt: s.revokedAt?.toISOString() ?? null,
          endedReason: s.revokedReason,
          isDemo: s.isDemo,
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      counts: { all, success: all - flagged, flagged, ended },
      days: query.days,
    };
  }

  /**
   * A2 — security score (0–100) from the protections that are actually on, plus the player's own recent security
   * events from the audit log. Players sign in passwordless through Privy, so there is no password item.
   */
  async securityOverview(user: AuthUser) {
    const [me, totp, wallets, sessions, events] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          emailVerified: true,
          email: true,
          profile: { select: { antiPhishingCode: true } },
        },
      }),
      this.totp.status({ userId: user.id }),
      this.prisma.userWallet.findMany({
        where: { userId: user.id, removedAt: null, whitelistedAt: { not: null } },
        orderBy: { whitelistedAt: 'asc' },
        select: { id: true, network: true, address: true, whitelistedAt: true, isDemo: true },
      }),
      this.prisma.session.findMany({
        where: { userId: user.id, subject: 'user', revokedAt: null },
        select: {
          id: true,
          flagged: true,
          deviceLabel: true,
          location: true,
          createdAt: true,
          isDemo: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          actorType: 'user',
          actorId: user.id,
          createdAt: { gte: new Date(Date.now() - 365 * 86_400_000) },
        },
        orderBy: { seq: 'desc' },
        take: 8,
        select: { id: true, action: true, createdAt: true, targetId: true, metadata: true },
      }),
    ]);
    const toReview = sessions.filter((s) => s.flagged && s.id !== user.sessionId);
    const items = [
      { key: 'two_factor', label: 'Authenticator 2FA on', points: 30, ok: totp.enabled },
      {
        key: 'anti_phishing',
        label: 'Anti-phishing code set',
        points: 15,
        ok: Boolean(me.profile?.antiPhishingCode),
      },
      { key: 'whitelist', label: 'Withdrawal whitelist on', points: 15, ok: wallets.length > 0 },
      { key: 'email_verified', label: 'Email verified', points: 10, ok: me.emailVerified },
      {
        key: 'backup_codes',
        label: 'Backup codes available',
        points: 10,
        ok: totp.enabled && totp.backupCodesRemaining > 0,
      },
      {
        key: 'devices_recognised',
        label: toReview.length
          ? `All devices recognised — ${toReview.length} to review`
          : 'All devices recognised',
        points: 20,
        ok: toReview.length === 0,
      },
    ].map((i) => ({ ...i, earned: i.ok ? i.points : 0 }));
    const score = items.reduce((s, i) => s + i.earned, 0);
    return {
      score,
      max: 100,
      status:
        score >= 90
          ? ('strong' as const)
          : score >= 60
            ? ('needs_review' as const)
            : ('at_risk' as const),
      items,
      twoFactor: totp,
      antiPhishingCode: me.profile?.antiPhishingCode ?? null,
      email: {
        verified: me.emailVerified,
        masked: me.email ? `${me.email[0]}•••@${me.email.split('@')[1]}` : null,
      },
      whitelist: wallets.map((w) => ({
        id: w.id,
        network: w.network,
        address: w.address,
        whitelistedAt: w.whitelistedAt?.toISOString() ?? null,
        isDemo: w.isDemo,
      })),
      sessions: { active: sessions.length, toReview: toReview.length },
      devicesToReview: toReview.map((s) => ({
        sessionId: s.id,
        device: s.deviceLabel ?? 'Unknown device',
        location: s.location,
        signedInAt: s.createdAt.toISOString(),
        isDemo: s.isDemo,
      })),
      events: events.map((e) => {
        const known = SECURITY_EVENT_LABELS[e.action];
        return {
          id: e.id,
          at: e.createdAt.toISOString(),
          action: e.action,
          label: known?.label ?? e.action.replace(/^user\./, '').replace(/[._]/g, ' '),
          tone: known?.tone ?? ('info' as const),
        };
      }),
    };
  }
}
