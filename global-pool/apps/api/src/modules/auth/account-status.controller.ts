import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { notFound } from '../../common/errors';
import { CurrentUser, type AuthUser, type GpRequest } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GeoService } from '../compliance/geo.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { PlayerAuth } from './guards';
import { NEW_DEVICE_ALERT_WINDOW_DAYS, NEW_DEVICE_REASON } from './player-identity.service';

/** Player-facing case reference for a restriction row (never exposes the internal admin reason). */
export function restrictionRef(type: string, id: string): string {
  const prefix =
    type === 'account_suspended' ? 'SUS' : type === 'withdrawals_frozen' ? 'FRZ' : 'REV';
  return `${prefix}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

type Gate = 'ok' | 'onboarding' | 'suspended' | 'self_excluded' | 'region' | 'under_review';

/**
 * Account status for route guards and the AUTH-18 restricted pages: onboarding, admin restrictions (type, since,
 * case reference — never the internal reason), self-exclusion and the region check. Read-only; the API still
 * enforces every policy on each gaming / financial route.
 */
@ApiTags('auth')
@PlayerAuth({ onboarded: false })
@Controller('auth')
export class AccountStatusController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly rg: ResponsibleGamingService,
    private readonly audit: AuditService,
  ) {}

  @Get('account-status')
  @ApiOperation({
    summary:
      'Account gate for the web: onboarding, restrictions (no internal reasons), self-exclusion, region — read-only',
  })
  async accountStatus(@CurrentUser() user: AuthUser, @Req() req: GpRequest) {
    const [rows, exclusion, region] = await Promise.all([
      this.prisma.userRestriction.findMany({
        where: { userId: user.id, liftedAt: null },
        orderBy: { appliedAt: 'asc' },
        select: { id: true, type: true, appliedAt: true },
      }),
      this.rg.exclusion(user.id),
      this.geo.checkRequest(req),
    ]);
    const declared = user.country
      ? {
          code: user.country,
          name: this.geo.countryName(user.country),
          permitted: await this.geo.isPermitted(user.country),
        }
      : null;
    const restrictions = rows.map((r) => ({
      type: r.type,
      since: r.appliedAt.toISOString(),
      reference: restrictionRef(r.type, r.id),
    }));
    const types = new Set(rows.map((r) => r.type));
    const regionPermitted = region.permitted && (declared?.permitted ?? true);
    const gate: Gate = !user.onboarded
      ? 'onboarding'
      : types.has('account_suspended')
        ? 'suspended'
        : exclusion.active
          ? 'self_excluded'
          : !regionPermitted
            ? 'region'
            : types.has('gaming_blocked') || types.has('deposits_blocked')
              ? 'under_review'
              : 'ok';
    return {
      gate,
      onboarded: user.onboarded,
      status: user.status,
      restrictions,
      paused: {
        gaming:
          types.has('account_suspended') ||
          types.has('gaming_blocked') ||
          exclusion.active ||
          !regionPermitted,
        deposits:
          types.has('account_suspended') ||
          types.has('deposits_blocked') ||
          exclusion.active ||
          !regionPermitted,
        // Withdrawals stay available while self-excluded or abroad (no obstruction); only AML freezes pause them.
        withdrawals: types.has('withdrawals_frozen'),
      },
      // `kind` tells a short break (cooling_off) from a self-exclusion; `reopen` is set once a long self-exclusion's
      // period is over but the account has not been reopened yet (nothing reopens automatically).
      selfExclusion: {
        active: exclusion.active,
        kind: exclusion.kind,
        duration: exclusion.duration,
        startsAt: exclusion.startsAt,
        endsAt: exclusion.endsAt,
        reopen: exclusion.reopen ?? null,
      },
      region: {
        current: region.country
          ? { code: region.country, name: region.countryName, permitted: region.permitted }
          : null,
        declared,
        permitted: regionPermitted,
      },
      isDemo: user.isDemo,
    };
  }

  @Get('new-device-alerts')
  @ApiOperation({
    summary:
      'AUTH-21: sign-ins from a device we have not seen before, shown on your OTHER signed-in devices',
  })
  async newDeviceAlerts(@CurrentUser() user: AuthUser) {
    const since = new Date(Date.now() - NEW_DEVICE_ALERT_WINDOW_DAYS * 86_400_000);
    const rows = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        subject: 'user',
        revokedAt: null,
        flagged: true,
        flaggedReason: NEW_DEVICE_REASON,
        createdAt: { gte: since },
        id: { not: user.sessionId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return rows.map((s) => ({
      sessionId: s.id,
      device: s.deviceLabel ?? 'Unknown device',
      location: s.location,
      ipMasked: maskIp(s.ip),
      signedInAt: s.createdAt.toISOString(),
      isDemo: s.isDemo,
    }));
  }

  @Post('new-device-alerts/:sessionId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-21 “Yes, it was me”: keep that device signed in (audited)' })
  async confirmDevice(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const row = await this.findAlert(user, sessionId);
    await this.prisma.session.update({
      where: { id: row.id },
      data: { flagged: false, flaggedReason: 'new_device_confirmed' },
    });
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.new_device.confirmed',
      targetType: 'session',
      targetId: row.id,
    });
    return { confirmed: true };
  }

  @Post('new-device-alerts/:sessionId/secure')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'AUTH-21 “No, secure my account”: signs that device and every other session except this one out (audited)',
  })
  async secureAccount(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const row = await this.findAlert(user, sessionId);
    const now = new Date();
    const result = await this.prisma.session.updateMany({
      where: { userId: user.id, subject: 'user', revokedAt: null, id: { not: user.sessionId } },
      data: { revokedAt: now, revokedReason: 'secured_by_user' },
    });
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.new_device.secured',
      targetType: 'session',
      targetId: row.id,
      metadata: { revokedSessions: result.count },
    });
    return { secured: true, revokedSessions: result.count };
  }

  private async findAlert(user: AuthUser, sessionId: string) {
    const row = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: user.id, subject: 'user', revokedAt: null },
    });
    if (!row || row.id === user.sessionId) throw notFound('Session');
    return row;
  }
}

/** 85.48.201.12 → 85.48.•••.12 · IPv6 keeps the first two groups. */
export function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const v4 = ip.replace(/^::ffff:/, '');
  const parts = v4.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.•••.${parts[3]}`;
  const groups = ip.split(':').filter(Boolean);
  return groups.length > 2 ? `${groups[0]}:${groups[1]}:•••` : ip;
}
