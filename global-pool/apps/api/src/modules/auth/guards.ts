import {
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RestrictionType } from '@prisma/client';

import { AppError } from '../../common/errors';
import type { GpRequest } from '../../common/request';
import { GeoService } from '../compliance/geo.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { RestrictionsService } from '../compliance/restrictions.service';
import { PlayerIdentityService } from './player-identity.service';

export const PLAYER_POLICY = 'gp:player-policy';

export interface PlayerPolicyOptions {
  /** Require completed onboarding (consents + country). Default true. */
  onboarded?: boolean;
  /** Require a permitted region (request location + declared country). Default false. */
  region?: boolean;
  /** Reject self-excluded players (gaming / deposits). Default false. */
  notSelfExcluded?: boolean;
  /** Admin restrictions that block this route. */
  blockedBy?: RestrictionType[];
}

/** Gaming routes (entries, game sessions). */
export const GAMING_POLICY: PlayerPolicyOptions = {
  onboarded: true,
  region: true,
  notSelfExcluded: true,
  blockedBy: ['account_suspended', 'gaming_blocked'],
};
/** Deposit routes. */
export const DEPOSIT_POLICY: PlayerPolicyOptions = {
  onboarded: true,
  region: true,
  notSelfExcluded: true,
  blockedBy: ['account_suspended', 'deposits_blocked'],
};
/** Withdrawals stay available while self-excluded or travelling (no obstruction); AML freezes still apply. */
export const WITHDRAWAL_POLICY: PlayerPolicyOptions = {
  onboarded: true,
  blockedBy: ['withdrawals_frozen'],
};

export function extractBearer(req: GpRequest): string | null {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;
  const cookie = req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('privy-token='));
  return cookie ? decodeURIComponent(cookie.slice('privy-token='.length)) : null;
}

/** Verifies the Privy access token (or DEV MOCK token) and attaches `req.user`. */
@Injectable()
export class PrivyAuthGuard implements CanActivate {
  constructor(private readonly identity: PlayerIdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GpRequest>();
    const token = extractBearer(req);
    if (!token) throw new AppError('UNAUTHENTICATED', 'Sign in to continue');
    const { user } = await this.identity.authenticate(token, {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      requestId: typeof req.id === 'string' ? req.id : null,
    });
    req.user = user;
    return true;
  }
}

/** Enforces onboarding, geo, self-exclusion and admin restrictions per route policy. */
@Injectable()
export class PlayerPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly geo: GeoService,
    private readonly rg: ResponsibleGamingService,
    private readonly restrictions: RestrictionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GpRequest>();
    const user = req.user;
    if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in to continue');
    const policy =
      this.reflector.getAllAndOverride<PlayerPolicyOptions | undefined>(PLAYER_POLICY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};
    if ((policy.onboarded ?? true) && !user.onboarded) {
      throw new AppError('ONBOARDING_REQUIRED', 'Finish setting up your account first');
    }
    if (policy.blockedBy?.length) {
      const active = await this.restrictions.active(user.id);
      const hit = active.find((r) => policy.blockedBy!.includes(r));
      if (hit) {
        throw new AppError('FORBIDDEN', 'This action is restricted on your account — contact support', {
          restriction: hit,
        });
      }
    }
    if (policy.region) await this.geo.assertPermitted(req, user.country);
    if (policy.notSelfExcluded) await this.rg.assertNotSelfExcluded(user.id);
    return true;
  }
}

/** Route/class metadata only (use on methods to override the class policy). */
export const PlayerPolicy = (policy: PlayerPolicyOptions) => SetMetadata(PLAYER_POLICY, policy);

/** Player-authenticated controller/route: Privy (or DEV MOCK) bearer token + policy checks. */
export const PlayerAuth = (policy: PlayerPolicyOptions = {}) =>
  applyDecorators(
    SetMetadata(PLAYER_POLICY, policy),
    UseGuards(PrivyAuthGuard, PlayerPolicyGuard),
    ApiBearerAuth('player'),
  );
