import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

import { randomToken, sha256Hex } from '../../common/crypto';
import { AppError } from '../../common/errors';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { addMinutes } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InjectRedis } from '../../infra/redis/redis.module';
import { AuditService } from '../audit/audit.service';
import { TotpService } from '../security/totp.service';

/** argon2id parameters (OWASP 2024 baseline: m=19 MiB, t=2, p=1). */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;
const INVALID = 'Invalid email, password or authenticator code';

interface AdminAccessClaims {
  sub: string;
  sid: string;
  typ: 'admin_access';
}

export const hashAdminPassword = (password: string) => argon2.hash(password, ARGON2_OPTIONS);

/** Audit-safe reference for a refresh-token family (the raw id is the `sid` of admin access tokens). */
export const sessionRef = (familyId: string) => `as_${sha256Hex(familyId).slice(0, 16)}`;

/** `sessions.last_seen_at` is written at most once a minute per admin session. */
const LAST_SEEN_WRITE_MS = 60_000;

/** Sliding expiry of an unknown email's failed-attempt counter (see reserveUnknownEmailAttempt). */
const UNKNOWN_EMAIL_COUNTER_TTL_MS = 30 * 86_400_000;
/**
 * KEYS[1] counter, KEYS[2] lock (value = locked-until epoch ms) · ARGV now ms, max attempts, locked-until ms, lock
 * TTL ms, counter TTL ms. Returns {0, until} = still locked (not counted), {1, until} = this attempt locks,
 * {2, attempts} = counted, not locked.
 */
const RESERVE_UNKNOWN_EMAIL_ATTEMPT = `
local locked = redis.call('GET', KEYS[2])
if locked and tonumber(locked) and tonumber(locked) > tonumber(ARGV[1]) then
  return {0, locked}
end
local attempts = redis.call('INCR', KEYS[1])
if attempts >= tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], ARGV[3], 'PX', ARGV[4])
  redis.call('DEL', KEYS[1])
  return {1, ARGV[3]}
end
redis.call('PEXPIRE', KEYS[1], ARGV[5])
return {2, tostring(attempts)}
`;

/**
 * Admin authentication — fully separate from players (no Privy): email + argon2id password + MANDATORY TOTP in one
 * step, lockout after ADMIN_LOGIN_MAX_ATTEMPTS failures, short-lived access JWT (ADMIN_JWT_ACCESS_SECRET) and an
 * opaque rotating refresh token whose family is revoked on reuse.
 */
@Injectable()
export class AdminAuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly totp: TotpService,
    private readonly audit: AuditService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async login(input: { email: string; password: string; totpCode: string }, meta: RequestMeta) {
    const emailHash = sha256Hex(input.email);
    const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    const now = new Date();
    if (!admin || admin.status !== 'active') {
      // Unknown / disabled emails get exactly the responses a real account gets (same lockout after the same
      // number of attempts, counted per email hash), so neither the 401 nor the 403 reveals which emails exist.
      const slot = await this.reserveUnknownEmailAttempt(emailHash, now);
      // Equalise timing so responses do not reveal which emails exist.
      await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
      if (slot.lockedUntil && !slot.lockedNow) throw this.lockedError(slot.lockedUntil);
      await this.audit.record({
        actorType: 'system',
        action: 'admin.login.failed',
        reason: 'unknown_or_disabled',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        outcome: 'failure',
        metadata: { emailHash },
      });
      throw new AppError('UNAUTHENTICATED', INVALID, slot.lockedNow ? { locked: true } : undefined);
    }
    // Count the attempt BEFORE checking anything (row lock on the fresh row): parallel guesses cannot share one
    // stale counter, the lock lands on the last allowed attempt and a slow request can never clear it.
    const slot = await this.reserveAdminAttempt(admin.id, now);
    if (slot.lockedUntil && !slot.lockedNow) {
      await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
      throw this.lockedError(slot.lockedUntil);
    }
    const passwordOk = await argon2.verify(admin.passwordHash, input.password).catch(() => false);
    let totpOk = false;
    if (passwordOk) {
      const secret = await this.totp.find({ adminUserId: admin.id });
      if (secret?.status === 'active') {
        // A locked TOTP factor is a plain failure here (generic 401), never a 423 that would confirm the password.
        totpOk = (await this.totp.verifyRow(secret, input.totpCode, { allowBackup: false })).ok;
      }
    }
    if (!passwordOk || !totpOk) {
      await this.audit.record({
        actorType: 'admin',
        actorId: admin.id,
        actorLabel: admin.name,
        action: slot.lockedNow ? 'admin.login.locked' : 'admin.login.failed',
        reason: passwordOk ? 'invalid_totp' : 'invalid_password',
        outcome: 'failure',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { attempts: slot.attempts },
      });
      throw new AppError('UNAUTHENTICATED', INVALID, slot.lockedNow ? { locked: true } : undefined);
    }
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    });
    const familyId = randomUUID();
    const tokens = await this.issue(
      admin.id,
      familyId,
      null,
      new Date(now.getTime() + this.config.env.ADMIN_SESSION_TTL * 1000),
      meta,
    );
    await this.audit.record({
      actorType: 'admin',
      actorId: admin.id,
      actorLabel: admin.name,
      action: 'admin.login',
      ip: meta.ip,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      // Never the raw family id: it is the `sid` of the admin access token (audit readers must not learn it).
      metadata: { sessionRef: sessionRef(familyId) },
    });
    return { ...tokens, admin: await this.profile(admin.id) };
  }

  private lockedError(lockedUntil: Date) {
    return new AppError('FORBIDDEN', 'This admin account is temporarily locked after failed sign-ins', {
      lockedUntil: lockedUntil.toISOString(),
    });
  }

  /** One login attempt against an admin row (see login). The 5th attempt sets the lock and still gets checked. */
  private reserveAdminAttempt(
    adminId: string,
    now: Date,
  ): Promise<{ attempts: number; lockedUntil: Date | null; lockedNow: boolean }> {
    const { ADMIN_LOGIN_MAX_ATTEMPTS: max, ADMIN_LOCKOUT_MINUTES: minutes } = this.config.env;
    return this.prisma.tx(async (tx) => {
      await tx.$queryRaw`SELECT id FROM admin_users WHERE id = ${adminId}::uuid FOR UPDATE`;
      const fresh = await tx.adminUser.findUniqueOrThrow({
        where: { id: adminId },
        select: { failedLoginAttempts: true, lockedUntil: true },
      });
      if (fresh.lockedUntil && fresh.lockedUntil > now) {
        return { attempts: 0, lockedUntil: fresh.lockedUntil, lockedNow: false };
      }
      const attempts = fresh.failedLoginAttempts + 1;
      const lockedUntil = attempts >= max ? addMinutes(now, minutes) : null;
      await tx.adminUser.update({
        where: { id: adminId },
        data: lockedUntil
          ? { failedLoginAttempts: 0, lockedUntil }
          : { failedLoginAttempts: attempts, lockedUntil: null },
      });
      return { attempts, lockedUntil, lockedNow: lockedUntil !== null };
    });
  }

  /**
   * Same bookkeeping for an email with no active admin, kept in Redis per email hash. One Lua script does the whole
   * step atomically (lock check → INCR → lock on the max-th attempt + counter reset), so parallel guesses give
   * exactly the sequence of the row-locked admin path (n−1 × 401, one 401 `locked`, then 403). The counter has a
   * sliding 30-day expiry (bounded Redis memory) instead of the admin row's none — resetting it would take a gap
   * of over 30 days between guesses at one email.
   */
  private async reserveUnknownEmailAttempt(
    emailHash: string,
    now: Date,
  ): Promise<{ lockedUntil: Date | null; lockedNow: boolean }> {
    const { ADMIN_LOGIN_MAX_ATTEMPTS: max, ADMIN_LOCKOUT_MINUTES: minutes } = this.config.env;
    const key = `gp:admin-login:unknown:${emailHash}`;
    const lockKey = `${key}:locked-until`;
    const until = addMinutes(now, minutes);
    const [state, value] = (await this.redis.eval(
      RESERVE_UNKNOWN_EMAIL_ATTEMPT,
      2,
      key,
      lockKey,
      String(now.getTime()),
      String(max),
      String(until.getTime()),
      String(minutes * 60_000),
      String(UNKNOWN_EMAIL_COUNTER_TTL_MS),
    )) as [number, string];
    if (state === 0) return { lockedUntil: new Date(Number(value)), lockedNow: false };
    if (state === 1) return { lockedUntil: new Date(Number(value)), lockedNow: true };
    return { lockedUntil: null, lockedNow: false };
  }

  /** Rotate the refresh token. Re-using a rotated token revokes the whole family (token theft signal). */
  async refresh(refreshToken: string, meta: RequestMeta) {
    const row = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256Hex(refreshToken) },
    });
    if (!row || row.subject !== 'admin' || !row.adminUserId || !row.familyId) {
      throw new AppError('UNAUTHENTICATED', 'Invalid refresh token');
    }
    if (row.rotatedAt) {
      await this.revokeFamily(row.familyId, 'refresh_token_reuse');
      await this.audit.record({
        actorType: 'admin',
        actorId: row.adminUserId,
        action: 'admin.session.reuse_detected',
        targetType: 'session',
        targetId: sessionRef(row.familyId),
        outcome: 'failure',
        ip: meta.ip,
        requestId: meta.requestId,
      });
      throw new AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
    }
    if (row.revokedAt || (row.expiresAt && row.expiresAt <= new Date())) {
      throw new AppError('UNAUTHENTICATED', 'Session expired — sign in again');
    }
    // Server-side idle timeout (ADM-01: 15 min) — a closed / restored tab cannot revive an idle session.
    await this.assertNotIdle(row.familyId, row.adminUserId, row.lastSeenAt, meta);
    const rotated = await this.prisma.session.updateMany({
      where: { id: row.id, rotatedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (rotated.count !== 1)
      throw new AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
    return this.issue(row.adminUserId, row.familyId, row.id, row.expiresAt!, meta);
  }

  async logout(admin: AuthAdmin) {
    await this.revokeFamily(admin.sessionFamilyId, 'logout');
    return { signedOut: true };
  }

  /** Verify an access token → admin with live roles/permissions (revocation takes effect immediately). */
  async authenticate(token: string): Promise<AuthAdmin> {
    let claims: AdminAccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AdminAccessClaims>(token, {
        secret: this.config.env.ADMIN_JWT_ACCESS_SECRET,
        algorithms: ['HS256'],
        issuer: 'globalpool-api',
        audience: 'admin',
      });
    } catch {
      throw new AppError('UNAUTHENTICATED', 'Admin session expired — sign in again');
    }
    if (claims.typ !== 'admin_access') throw new AppError('UNAUTHENTICATED', 'Invalid admin token');
    const now = new Date();
    const live = await this.prisma.session.findFirst({
      where: {
        familyId: claims.sid,
        adminUserId: claims.sub,
        revokedAt: null,
        rotatedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, lastSeenAt: true },
    });
    if (!live) throw new AppError('UNAUTHENTICATED', 'Admin session revoked — sign in again');
    await this.assertNotIdle(claims.sid, claims.sub, live.lastSeenAt);
    // Activity = authenticated admin requests (throttled write). Refresh rotation starts a new row at "now".
    if (now.getTime() - live.lastSeenAt.getTime() > LAST_SEEN_WRITE_MS) {
      await this.prisma.session.updateMany({
        where: { id: live.id, lastSeenAt: { lt: now } },
        data: { lastSeenAt: now },
      });
    }
    const profile = await this.profile(claims.sub);
    if (profile.status !== 'active')
      throw new AppError('UNAUTHENTICATED', 'Admin account disabled');
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      roles: profile.roles,
      permissions: profile.permissions,
      sessionFamilyId: claims.sid,
    };
  }

  async profile(adminId: string) {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: adminId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const permissions = [
      ...new Set(admin.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key))),
    ].sort();
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      title: admin.title,
      status: admin.status,
      roles: admin.roles.map((r) => r.role.key),
      permissions,
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
      isDemo: admin.isDemo,
    };
  }

  private async issue(
    adminId: string,
    familyId: string,
    parentId: string | null,
    expiresAt: Date,
    meta: RequestMeta,
  ) {
    const refreshToken = randomToken(48);
    await this.prisma.session.create({
      data: {
        subject: 'admin',
        adminUserId: adminId,
        familyId,
        parentId,
        refreshTokenHash: sha256Hex(refreshToken),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
      },
    });
    const ttl = Math.min(
      this.config.env.ADMIN_ACCESS_TTL,
      Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    );
    const claims: AdminAccessClaims = { sub: adminId, sid: familyId, typ: 'admin_access' };
    const accessToken = await this.jwt.signAsync(claims, {
      secret: this.config.env.ADMIN_JWT_ACCESS_SECRET,
      algorithm: 'HS256',
      issuer: 'globalpool-api',
      audience: 'admin',
      expiresIn: ttl,
    });
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: ttl,
      sessionExpiresAt: expiresAt.toISOString(),
    };
  }

  /** Revoke the family and refuse when the session saw no admin request for ADMIN_IDLE_TIMEOUT. */
  private async assertNotIdle(
    familyId: string,
    adminId: string,
    lastSeenAt: Date,
    meta?: RequestMeta,
  ): Promise<void> {
    const idleMs = this.config.env.ADMIN_IDLE_TIMEOUT * 1000;
    if (Date.now() - lastSeenAt.getTime() <= idleMs) return;
    await this.revokeFamily(familyId, 'idle_timeout');
    await this.audit.record({
      actorType: 'system',
      action: 'admin.session.idle_timeout',
      targetType: 'session',
      targetId: sessionRef(familyId),
      outcome: 'failure',
      ip: meta?.ip ?? null,
      requestId: meta?.requestId ?? null,
      metadata: { adminId, lastSeenAt: lastSeenAt.toISOString() },
    });
    throw new AppError('UNAUTHENTICATED', 'Admin session ended after inactivity — sign in again', {
      reason: 'idle_timeout',
    });
  }

  private async revokeFamily(familyId: string, reason: string) {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomToken(16), ARGON2_OPTIONS);
    return this.dummyHash;
  }
}
