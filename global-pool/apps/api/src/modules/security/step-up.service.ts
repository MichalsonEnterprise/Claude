import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { StepUpPurpose } from '@gp/shared/enums';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

import { AppError } from '../../common/errors';
import type { AuthUser } from '../../common/request';
import { AppConfig } from '../../config/app-config';
import { InjectRedis } from '../../infra/redis/redis.module';
import { TotpService } from './totp.service';

interface StepUpClaims {
  sub: string;
  sid: string;
  purpose: StepUpPurpose;
  typ: 'step_up';
  jti: string;
}

export const STEP_UP_HEADER = 'x-step-up-token';

/**
 * Step-up 2FA for withdrawals, whitelist changes and security settings: either a fresh TOTP / backup code in the
 * request, or a single-use step-up token (5 min, bound to user + session + purpose) from POST /auth/2fa/challenge.
 */
@Injectable()
export class StepUpService {
  constructor(
    private readonly totp: TotpService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async challenge(user: AuthUser, purpose: StepUpPurpose, code: string) {
    const outcome = await this.totp.verifyActive({ userId: user.id }, code);
    const ttl = this.config.env.STEP_UP_TOKEN_TTL;
    const claims: StepUpClaims = { sub: user.id, sid: user.sessionId, purpose, typ: 'step_up', jti: randomUUID() };
    const token = await this.jwt.signAsync(claims, {
      secret: this.config.env.JWT_ACCESS_SECRET,
      algorithm: 'HS256',
      expiresIn: ttl,
      issuer: 'globalpool-api',
      audience: 'step-up',
    });
    return {
      stepUpToken: token,
      purpose,
      method: outcome.method,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  /** Throws STEP_UP_REQUIRED / STEP_UP_LOCKED unless the request carries valid step-up proof. */
  async assert(
    user: AuthUser,
    purpose: StepUpPurpose,
    proof: { totpCode?: string | null; stepUpToken?: string | null },
  ): Promise<{ method: 'totp' | 'backup_code' | 'step_up_token' }> {
    if (proof.stepUpToken) {
      let claims: StepUpClaims;
      try {
        claims = await this.jwt.verifyAsync<StepUpClaims>(proof.stepUpToken, {
          secret: this.config.env.JWT_ACCESS_SECRET,
          algorithms: ['HS256'],
          issuer: 'globalpool-api',
          audience: 'step-up',
        });
      } catch {
        throw new AppError('STEP_UP_REQUIRED', 'Your security confirmation expired — confirm again', {
          reason: 'invalid_token',
          purpose,
        });
      }
      if (claims.typ !== 'step_up' || claims.sub !== user.id || claims.sid !== user.sessionId || claims.purpose !== purpose) {
        throw new AppError('STEP_UP_REQUIRED', 'Security confirmation does not match this action', {
          reason: 'invalid_token',
          purpose,
        });
      }
      const fresh = await this.redis.set(`gp:stepup:used:${claims.jti}`, '1', 'EX', this.config.env.STEP_UP_TOKEN_TTL + 60, 'NX');
      if (fresh !== 'OK') {
        throw new AppError('STEP_UP_REQUIRED', 'This security confirmation was already used', {
          reason: 'token_reused',
          purpose,
        });
      }
      return { method: 'step_up_token' };
    }
    if (proof.totpCode) {
      const outcome = await this.totp.verifyActive({ userId: user.id }, proof.totpCode);
      return { method: outcome.method ?? 'totp' };
    }
    const status = await this.totp.status({ userId: user.id });
    throw new AppError(
      'STEP_UP_REQUIRED',
      status.enabled ? 'Confirm this action with your authenticator code' : 'Set up two-factor authentication first',
      { reason: status.enabled ? 'code_required' : 'enroll_2fa', purpose },
    );
  }
}
