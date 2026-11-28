import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { emailSchema, onboardingSchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { AppError } from '../../common/errors';
import {
  CurrentUser,
  ReqMeta,
  type AuthUser,
  type GpRequest,
  type RequestMeta,
} from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AppConfig } from '../../config/app-config';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PlayerAuth, extractBearer } from './guards';
import { PlayerIdentityService } from './player-identity.service';
import { PrivyService } from './privy.service';

class OnboardingDto extends createZodDto(onboardingSchema) {}
class DevTokenDto extends createZodDto(
  z.object({
    did: z
      .string()
      .regex(/^did:privy:[A-Za-z0-9:_-]{3,120}$/)
      .optional(),
    email: emailSchema.optional(),
    wallet: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional(),
    ttlSeconds: z.number().int().min(60).max(86_400).optional(),
  }),
) {}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly identity: PlayerIdentityService,
    private readonly privy: PrivyService,
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: AppConfig,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Player auth mode: privy | mock (DEV MOCK, offline) | disabled' })
  authConfig() {
    return {
      mode: this.privy.mode,
      privyAppId: this.privy.mode === 'privy' ? this.config.env.PRIVY_APP_ID : null,
      devTokenEndpoint: this.privy.mode === 'mock' ? '/auth/dev/token' : null,
    };
  }

  @Post('session')
  @HttpCode(200)
  @ApiBearerAuth('player')
  @ApiOperation({
    summary:
      'Call after Privy login: verifies the token, upserts the user (privy_user_id), syncs linked email/wallets',
  })
  async session(@Req() req: GpRequest, @ReqMeta() meta: RequestMeta) {
    const token = extractBearer(req);
    if (!token) throw new AppError('UNAUTHENTICATED', 'Sign in to continue');
    const { user, created } = await this.identity.authenticate(token, meta, { forceSync: true });
    return {
      created,
      onboardingRequired: !user.onboarded,
      sessionId: user.sessionId,
      user: await this.users.me(user.id),
    };
  }

  @Post('onboarding')
  @HttpCode(200)
  @PlayerAuth({ onboarded: false })
  @ApiOperation({
    summary: 'First-login onboarding: consents (never pre-checked) + country + handle',
  })
  async onboarding(
    @CurrentUser() user: AuthUser,
    @Body() body: OnboardingDto,
    @Req() req: GpRequest,
  ) {
    await this.auth.onboard(user, body, req);
    return this.users.me(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  @PlayerAuth({ onboarded: false })
  @ApiOperation({
    summary: 'Revoke the current session for this API (call Privy logout on the client too)',
  })
  logout(@CurrentUser() user: AuthUser) {
    return this.users.revokeSession(user, user.sessionId, 'logout');
  }

  @Post('dev/token')
  @HttpCode(200)
  @Throttle({
    default: { limit: () => Number(process.env.DEV_TOKEN_THROTTLE_LIMIT ?? 30), ttl: 60_000 },
  })
  @ApiOperation({
    summary:
      'DEV MOCK only (never in production): issue a locally signed player token. DEMO user: did:privy:demo-nova-k',
  })
  devToken(@Body() body: DevTokenDto) {
    if (this.privy.mode !== 'mock') throw new AppError('NOT_FOUND', 'Cannot POST /auth/dev/token');
    return this.privy.issueMockToken({
      did: body.did,
      email: body.email,
      wallets: body.wallet ? [{ address: body.wallet, chainType: 'ethereum' }] : undefined,
      ttlSeconds: body.ttlSeconds,
    });
  }
}
