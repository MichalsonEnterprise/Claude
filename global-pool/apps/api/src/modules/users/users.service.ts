import { Injectable } from '@nestjs/common';
import { KYC_LEVEL_LABEL } from '@gp/shared/enums';
import { NEW_ADDRESS_COOLDOWN_HOURS } from '@gp/shared/limits';
import { normalizeAddress, type WhitelistAddress } from '@gp/shared/schemas';

import { AppError, notFound } from '../../common/errors';
import type { AuthUser } from '../../common/request';
import { addHours } from '../../common/time';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GeoService } from '../compliance/geo.service';

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  return `${local[0]}•••@${domain}`;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        totpSecret: { select: { status: true } },
        kycRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) throw notFound('User');
    const p = user.profile;
    const country = p?.country ?? null;
    const kycLevel = p?.kycLevel ?? 'none';
    const kycStatus = user.kycRecords[0]?.status ?? 'not_started';
    return {
      id: user.id,
      publicId: user.publicId,
      handle: user.handle,
      displayHandle: user.handle ? `@${user.handle}` : null,
      displayName: p?.displayName ?? null,
      email: user.email,
      emailMasked: maskEmail(user.email),
      emailVerified: user.emailVerified,
      status: user.status,
      onboarded: user.onboardedAt !== null,
      onboardingRequired: user.onboardedAt === null,
      onboardedAt: user.onboardedAt?.toISOString() ?? null,
      country: country
        ? { code: country, name: this.geo.countryName(country), permitted: await this.geo.isPermitted(country) }
        : null,
      kyc: {
        level: kycLevel,
        status: kycStatus,
        label: kycLevel === 'none' ? 'Not verified' : `${KYC_LEVEL_LABEL[kycLevel].split(' — ')[0]} — ${kycStatus === 'verified' ? 'Verified' : kycStatus}`,
      },
      vip: { tier: p?.vipTier ?? 'bronze', level: p?.vipLevel ?? 1, points: p?.vipPoints ?? 0 },
      security: {
        twoFactorEnabled: user.totpSecret?.status === 'active',
        twoFactorMethod: user.totpSecret?.status === 'active' ? 'authenticator_app' : null,
        antiPhishingCode: p?.antiPhishingCode ?? null,
      },
      consents: {
        ageConfirmedAt: p?.ageConfirmedAt?.toISOString() ?? null,
        jurisdictionConfirmedAt: p?.jurisdictionConfirmedAt?.toISOString() ?? null,
        termsAcceptedAt: p?.termsAcceptedAt?.toISOString() ?? null,
        termsVersion: p?.termsVersion ?? null,
        privacyAcceptedAt: p?.privacyAcceptedAt?.toISOString() ?? null,
        privacyVersion: p?.privacyVersion ?? null,
        marketingOptIn: p?.marketingOptIn ?? false,
      },
      isDemo: user.isDemo,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, input: { displayName?: string; marketingOptIn?: boolean }) {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.marketingOptIn !== undefined
          ? { marketingOptIn: input.marketingOptIn, marketingOptInAt: input.marketingOptIn ? new Date() : null }
          : {}),
      },
    });
    return this.me(userId);
  }

  async sessions(user: AuthUser) {
    const rows = await this.prisma.session.findMany({
      where: { userId: user.id, subject: 'user', revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
    });
    return rows.map((s) => ({
      id: s.id,
      device: s.deviceLabel ?? 'Unknown device',
      ip: s.ip,
      location: s.location,
      current: s.id === user.sessionId,
      flagged: s.flagged,
      flaggedReason: s.flaggedReason,
      lastSeenAt: s.lastSeenAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isDemo: s.isDemo,
    }));
  }

  async revokeSession(user: AuthUser, sessionId: string, reason = 'revoked_by_user') {
    const row = await this.prisma.session.findFirst({ where: { id: sessionId, userId: user.id, revokedAt: null } });
    if (!row) throw notFound('Session');
    await this.prisma.session.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return { revoked: true, current: row.id === user.sessionId };
  }

  async wallets(userId: string) {
    const rows = await this.prisma.userWallet.findMany({
      where: { userId, removedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    const now = new Date();
    return rows.map((w) => ({
      id: w.id,
      network: w.network,
      address: w.address,
      source: w.source,
      walletClient: w.walletClient,
      label: w.label,
      isPrimary: w.isPrimary,
      verified: w.verifiedAt !== null,
      whitelisted: w.whitelistedAt !== null,
      whitelistedAt: w.whitelistedAt?.toISOString() ?? null,
      usableForWithdrawalsFrom: w.whitelistAvailableAt?.toISOString() ?? null,
      inCooldown: Boolean(w.whitelistAvailableAt && w.whitelistAvailableAt > now),
      isDemo: w.isDemo,
    }));
  }

  /** Whitelist a withdrawal destination (step-up checked by the controller). New addresses cool down 24 h. */
  async whitelist(userId: string, input: WhitelistAddress) {
    const address = normalizeAddress(input.network, input.address);
    const key = input.network === 'solana' ? address : address.toLowerCase();
    const now = new Date();
    const row = await this.prisma.userWallet.upsert({
      where: { userId_network_address: { userId, network: input.network, address: key } },
      create: {
        userId,
        network: input.network,
        address: key,
        source: 'manual',
        label: input.label ?? null,
        whitelistedAt: now,
        whitelistAvailableAt: addHours(now, NEW_ADDRESS_COOLDOWN_HOURS),
      },
      update: {
        label: input.label ?? undefined,
        removedAt: null,
        whitelistedAt: now,
        whitelistAvailableAt: addHours(now, NEW_ADDRESS_COOLDOWN_HOURS),
      },
    });
    return (await this.wallets(userId)).find((w) => w.id === row.id)!;
  }

  async removeFromWhitelist(userId: string, walletId: string) {
    const row = await this.prisma.userWallet.findFirst({ where: { id: walletId, userId } });
    if (!row) throw notFound('Wallet');
    if (!row.whitelistedAt) throw new AppError('BAD_REQUEST', 'This address is not whitelisted');
    await this.prisma.userWallet.update({
      where: { id: row.id },
      data: { whitelistedAt: null, whitelistAvailableAt: null, ...(row.source === 'manual' ? { removedAt: new Date() } : {}) },
    });
    return { removed: true };
  }
}
