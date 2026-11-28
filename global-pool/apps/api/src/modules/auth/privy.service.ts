import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrivyClient } from '@privy-io/server-auth';
import { randomUUID } from 'node:crypto';

import { AppError } from '../../common/errors';
import { AppConfig } from '../../config/app-config';

/** Linked accounts we sync from Privy (email + wallets). */
export interface PrivyLinkedAccounts {
  email: string | null;
  emailVerified: boolean;
  wallets: { address: string; chainType: 'ethereum' | 'solana'; walletClient: string | null; embedded: boolean }[];
}

export interface VerifiedPrivyToken {
  /** Privy DID, e.g. did:privy:cm3x… */
  did: string;
  /** Privy session id (`sid`). */
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  mock: boolean;
  /** Only present for DEV MOCK tokens (real Privy tokens carry no profile data). */
  mockLinked?: PrivyLinkedAccounts;
}

export const MOCK_ISSUER = 'privy.io';
export const MOCK_AUDIENCE = 'gp-dev-mock';

interface MockClaims {
  sub: string;
  sid: string;
  gp_mock: true;
  email?: string;
  wallets?: { address: string; chainType: 'ethereum' | 'solana' }[];
}

/**
 * Verifies player access tokens.
 * - `privy` mode: ES256 Privy access tokens via @privy-io/server-auth (PRIVY_APP_ID / PRIVY_APP_SECRET,
 *   optional PRIVY_VERIFICATION_KEY to verify offline without fetching the key).
 * - `mock` mode (PRIVY_MOCK=true or no app id, never in production): HS256 tokens signed locally with
 *   PRIVY_MOCK_SIGNING_SECRET, so dev and e2e run fully offline.
 */
@Injectable()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
  private client: PrivyClient | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly jwt: JwtService,
  ) {
    const mode = config.playerAuthMode;
    if (mode === 'disabled') {
      this.logger.error(
        'Player auth is DISABLED: PRIVY_APP_ID is not set (or PRIVY_MOCK=true) and the DEV MOCK is refused in production.',
      );
    } else if (mode === 'mock') {
      this.logger.warn('Player auth runs in DEV MOCK mode (locally signed tokens) — never use in production.');
    }
  }

  get mode() {
    return this.config.playerAuthMode;
  }

  async verify(token: string): Promise<VerifiedPrivyToken> {
    switch (this.mode) {
      case 'disabled':
        throw new AppError('SERVICE_UNAVAILABLE', 'Player sign-in is not configured');
      case 'mock':
        return this.verifyMock(token);
      case 'privy':
        return this.verifyPrivy(token);
    }
  }

  /** Linked email / wallets for a Privy user (real mode: Privy REST API; mock mode: from the token claims). */
  async linkedAccounts(verified: VerifiedPrivyToken): Promise<PrivyLinkedAccounts | null> {
    if (verified.mock) return verified.mockLinked ?? null;
    try {
      const user = await this.privy().getUserById(verified.did);
      const email = user.linkedAccounts.find((a) => a.type === 'email');
      const wallets = user.linkedAccounts.filter((a) => a.type === 'wallet');
      return {
        email: email && 'address' in email ? email.address.toLowerCase() : null,
        emailVerified: Boolean(email),
        wallets: wallets.flatMap((w) =>
          'address' in w && (w.chainType === 'ethereum' || w.chainType === 'solana')
            ? [
                {
                  address: w.address,
                  chainType: w.chainType,
                  walletClient: w.walletClientType ?? null,
                  embedded: w.walletClientType === 'privy',
                },
              ]
            : [],
        ),
      };
    } catch (err) {
      // Sync is best effort: never block login because the Privy API is slow / rate-limited.
      this.logger.warn(`Privy linked-account sync failed for ${verified.did}: ${String(err)}`);
      return null;
    }
  }

  /** Issue a DEV MOCK access token (mock mode only). */
  async issueMockToken(input: {
    did?: string;
    email?: string;
    wallets?: { address: string; chainType: 'ethereum' | 'solana' }[];
    sessionId?: string;
    ttlSeconds?: number;
  }): Promise<{ token: string; did: string; sessionId: string; expiresAt: string }> {
    if (this.mode !== 'mock') throw new AppError('FORBIDDEN', 'Mock tokens are only available in DEV MOCK mode');
    const did = input.did ?? `did:privy:mock-${randomUUID()}`;
    const sessionId = input.sessionId ?? `mock-sid-${randomUUID()}`;
    const ttl = input.ttlSeconds ?? 3600;
    const claims: MockClaims = {
      sub: did,
      sid: sessionId,
      gp_mock: true,
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.wallets?.length ? { wallets: input.wallets } : {}),
    };
    const token = await this.jwt.signAsync(claims, {
      secret: this.config.env.PRIVY_MOCK_SIGNING_SECRET,
      algorithm: 'HS256',
      issuer: MOCK_ISSUER,
      audience: MOCK_AUDIENCE,
      expiresIn: ttl,
    });
    return { token, did, sessionId, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
  }

  private async verifyMock(token: string): Promise<VerifiedPrivyToken> {
    let claims: MockClaims & { iat: number; exp: number };
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: this.config.env.PRIVY_MOCK_SIGNING_SECRET,
        algorithms: ['HS256'],
        issuer: MOCK_ISSUER,
        audience: MOCK_AUDIENCE,
      });
    } catch {
      throw new AppError('UNAUTHENTICATED', 'Invalid or expired session token');
    }
    if (!claims.sub?.startsWith('did:privy:') || !claims.sid || claims.gp_mock !== true) {
      throw new AppError('UNAUTHENTICATED', 'Invalid session token');
    }
    return {
      did: claims.sub,
      sessionId: claims.sid,
      issuedAt: new Date(claims.iat * 1000),
      expiresAt: new Date(claims.exp * 1000),
      mock: true,
      mockLinked: {
        email: claims.email ?? null,
        emailVerified: Boolean(claims.email),
        wallets: (claims.wallets ?? []).map((w) => ({ ...w, walletClient: 'mock', embedded: false })),
      },
    };
  }

  private async verifyPrivy(token: string): Promise<VerifiedPrivyToken> {
    try {
      const claims = await this.privy().verifyAuthToken(
        token,
        this.config.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, '\n'),
      );
      if (claims.appId !== this.config.env.PRIVY_APP_ID) throw new Error('aud mismatch');
      return {
        did: claims.userId,
        sessionId: claims.sessionId,
        issuedAt: new Date(claims.issuedAt * 1000),
        expiresAt: new Date(claims.expiration * 1000),
        mock: false,
      };
    } catch {
      throw new AppError('UNAUTHENTICATED', 'Invalid or expired session token');
    }
  }

  private privy(): PrivyClient {
    if (!this.client) {
      const { PRIVY_APP_ID, PRIVY_APP_SECRET } = this.config.env;
      if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
        throw new AppError('SERVICE_UNAVAILABLE', 'Privy is not configured (PRIVY_APP_ID / PRIVY_APP_SECRET)');
      }
      this.client = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
    }
    return this.client;
  }
}
