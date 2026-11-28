import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import { randomToken, sha256Hex } from '../../common/crypto';
import { AppError } from '../../common/errors';
import type { AuthAdmin, RequestMeta } from '../../common/request';
import { addMinutes } from '../../common/time';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
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
  ) {}

  async login(input: { email: string; password: string; totpCode: string }, meta: RequestMeta) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    if (!admin || admin.status !== 'active') {
      // Equalise timing so responses do not reveal which emails exist.
      await argon2.verify(await this.getDummyHash(), input.password).catch(() => false);
      await this.audit.record({
        actorType: 'system',
        action: 'admin.login.failed',
        reason: 'unknown_or_disabled',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        outcome: 'failure',
        metadata: { emailHash: sha256Hex(input.email) },
      });
      throw new AppError('UNAUTHENTICATED', INVALID);
    }
    const now = new Date();
    if (admin.lockedUntil && admin.lockedUntil > now) {
      throw new AppError(
        'FORBIDDEN',
        'This admin account is temporarily locked after failed sign-ins',
        {
          lockedUntil: admin.lockedUntil.toISOString(),
        },
      );
    }
    const passwordOk = await argon2.verify(admin.passwordHash, input.password).catch(() => false);
    let totpOk = false;
    if (passwordOk) {
      const secret = await this.totp.find({ adminUserId: admin.id });
      if (secret?.status === 'active') {
        totpOk = (await this.totp.verifyRow(secret, input.totpCode, { allowBackup: false })).ok;
      }
    }
    if (!passwordOk || !totpOk) {
      const attempts = admin.failedLoginAttempts + 1;
      const lock = attempts >= this.config.env.ADMIN_LOGIN_MAX_ATTEMPTS;
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: lock ? 0 : attempts,
          lockedUntil: lock
            ? addMinutes(now, this.config.env.ADMIN_LOCKOUT_MINUTES)
            : admin.lockedUntil,
        },
      });
      await this.audit.record({
        actorType: 'admin',
        actorId: admin.id,
        actorLabel: admin.name,
        action: lock ? 'admin.login.locked' : 'admin.login.failed',
        reason: passwordOk ? 'invalid_totp' : 'invalid_password',
        outcome: 'failure',
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { attempts },
      });
      throw new AppError('UNAUTHENTICATED', INVALID, lock ? { locked: true } : undefined);
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
      metadata: { familyId },
    });
    return { ...tokens, admin: await this.profile(admin.id) };
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
        targetId: row.familyId,
        outcome: 'failure',
        ip: meta.ip,
        requestId: meta.requestId,
      });
      throw new AppError('UNAUTHENTICATED', 'Session revoked — sign in again');
    }
    if (row.revokedAt || (row.expiresAt && row.expiresAt <= new Date())) {
      throw new AppError('UNAUTHENTICATED', 'Session expired — sign in again');
    }
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
    const live = await this.prisma.session.findFirst({
      where: {
        familyId: claims.sid,
        adminUserId: claims.sub,
        revokedAt: null,
        rotatedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!live) throw new AppError('UNAUTHENTICATED', 'Admin session revoked — sign in again');
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
