import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { randomInt } from 'node:crypto';

import { AppError } from '../../common/errors';
import { deviceLabel, type AuthUser, type RequestMeta } from '../../common/request';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PrivyService, type PrivyLinkedAccounts, type VerifiedPrivyToken } from './privy.service';

const LAST_SEEN_RESOLUTION_MS = 5 * 60_000;

/** Session flag for AUTH-21: a sign-in from a device label this player has never used before. */
export const NEW_DEVICE_REASON = 'new_device';
/** New-device alerts are shown on the player's other devices for this many days. */
export const NEW_DEVICE_ALERT_WINDOW_DAYS = 14;

/**
 * Maps a verified Privy token to our user + session rows: upsert by `privy_user_id` (Privy DID), sync linked email
 * and wallets, track the Privy session (`sid`) as a device session that the player can revoke.
 */
@Injectable()
export class PlayerIdentityService {
  private readonly logger = new Logger(PlayerIdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly privy: PrivyService,
  ) {}

  async authenticate(
    token: string,
    meta: RequestMeta,
    options: { forceSync?: boolean } = {},
  ): Promise<{ user: AuthUser; created: boolean }> {
    const verified = await this.privy.verify(token);
    let user = await this.prisma.user.findUnique({
      where: { privyUserId: verified.did },
      include: { profile: { select: { country: true } } },
    });
    let created = false;
    if (!user) {
      user = await this.createUser(verified);
      created = true;
    }
    if (user.status === 'closed') throw new AppError('UNAUTHENTICATED', 'This account is closed');
    if (created || options.forceSync) {
      const linked = await this.privy.linkedAccounts(verified);
      if (linked) await this.syncLinkedAccounts(user, linked);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { profile: { select: { country: true } } },
      });
    }
    const session = await this.touchSession(user.id, verified, meta);
    return {
      created,
      user: {
        id: user.id,
        privyUserId: verified.did,
        publicId: user.publicId,
        handle: user.handle,
        email: user.email,
        status: user.status,
        onboarded: user.onboardedAt !== null,
        country: user.profile?.country ?? null,
        sessionId: session.id,
        privySessionId: verified.sessionId,
        isDemo: user.isDemo,
      },
    };
  }

  private async createUser(verified: VerifiedPrivyToken) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await this.prisma.user.create({
          data: {
            privyUserId: verified.did,
            publicId: `GP-${randomInt(100_000, 1_000_000)}`,
            profile: { create: {} },
          },
          include: { profile: { select: { country: true } } },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await this.prisma.user.findUnique({
            where: { privyUserId: verified.did },
            include: { profile: { select: { country: true } } },
          });
          if (existing) return existing; // concurrent first login
          continue; // public id collision → retry
        }
        throw err;
      }
    }
    throw new AppError('INTERNAL_ERROR', 'Could not allocate a user id');
  }

  /** Sync linked email + wallets from Privy (wallets are upserted, never deleted here). */
  async syncLinkedAccounts(
    user: Pick<User, 'id' | 'email'>,
    linked: PrivyLinkedAccounts,
  ): Promise<void> {
    if (linked.email && linked.email !== user.email) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { email: linked.email, emailVerified: linked.emailVerified },
      });
    }
    for (const w of linked.wallets) {
      const network = w.chainType === 'solana' ? 'solana' : 'arbitrum';
      const address = w.chainType === 'solana' ? w.address : w.address.toLowerCase();
      await this.prisma.userWallet.upsert({
        where: { userId_network_address: { userId: user.id, network, address } },
        create: {
          userId: user.id,
          network,
          address,
          source: w.embedded ? 'privy_embedded' : 'privy_linked',
          walletClient: w.walletClient,
          verifiedAt: new Date(),
        },
        update: { walletClient: w.walletClient, removedAt: null },
      });
    }
  }

  private async touchSession(userId: string, verified: VerifiedPrivyToken, meta: RequestMeta) {
    const existing = await this.prisma.session.findUnique({
      where: { userId_privySessionId: { userId, privySessionId: verified.sessionId } },
    });
    if (existing) {
      if (existing.revokedAt) throw new AppError('UNAUTHENTICATED', 'This session was signed out');
      if (Date.now() - existing.lastSeenAt.getTime() > LAST_SEEN_RESOLUTION_MS) {
        await this.prisma.session.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date(), ip: meta.ip },
        });
      }
      return existing;
    }
    const label = deviceLabel(meta.userAgent);
    // AUTH-21: flag a sign-in from a device this player has never used (not their very first session).
    const [sessionCount, sameDevice] = await Promise.all([
      this.prisma.session.count({ where: { userId, subject: 'user' } }),
      this.prisma.session.count({ where: { userId, subject: 'user', deviceLabel: label } }),
    ]);
    const newDevice = sessionCount > 0 && sameDevice === 0;
    try {
      return await this.prisma.session.create({
        data: {
          subject: 'user',
          userId,
          privySessionId: verified.sessionId,
          expiresAt: verified.expiresAt,
          deviceLabel: label,
          userAgent: meta.userAgent?.slice(0, 512) ?? null,
          ip: meta.ip,
          ...(newDevice ? { flagged: true, flaggedReason: NEW_DEVICE_REASON } : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const row = await this.prisma.session.findUnique({
          where: { userId_privySessionId: { userId, privySessionId: verified.sessionId } },
        });
        if (row) return row;
      }
      this.logger.error(`Session create failed: ${String(err)}`);
      throw err;
    }
  }
}
