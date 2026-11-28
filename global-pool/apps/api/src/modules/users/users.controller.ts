import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { totpCodeSchema, whitelistAddressSchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth, PlayerPolicy } from '../auth/guards';
import { STEP_UP_HEADER, StepUpService } from '../security/step-up.service';
import { UsersService } from './users.service';

class UpdateProfileDto extends createZodDto(
  z
    .object({
      displayName: z.string().trim().min(1).max(40).optional(),
      marketingOptIn: z.boolean().optional(),
    })
    .strict(),
) {}
class WhitelistDto extends createZodDto(whitelistAddressSchema) {}
class StepUpBodyDto extends createZodDto(z.object({ totpCode: totpCodeSchema.optional() })) {}

@ApiTags('users')
@PlayerAuth({ onboarded: false })
@Controller('me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly stepUp: StepUpService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Current player profile (onboardingRequired = consents still missing)' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch()
  @PlayerPolicy({ onboarded: true })
  @ApiOperation({ summary: 'Update display name / marketing opt-in' })
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileDto) {
    return this.users.updateProfile(user.id, body);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Signed-in devices / sessions' })
  sessions(@CurrentUser() user: AuthUser) {
    return this.users.sessions(user);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Sign a device out (revokes that Privy session for this API)' })
  async revoke(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.users.revokeSession(user, id);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.session.revoked',
      targetType: 'session',
      targetId: id,
    });
    return result;
  }

  @Get('wallets')
  @ApiOperation({ summary: 'Linked wallets (Privy) and whitelisted withdrawal addresses' })
  wallets(@CurrentUser() user: AuthUser) {
    return this.users.wallets(user.id);
  }

  @Post('wallets/whitelist')
  @PlayerPolicy({ onboarded: true })
  @ApiHeader({ name: STEP_UP_HEADER, required: false })
  @ApiOperation({
    summary: 'Whitelist a withdrawal address (step-up: whitelist_change; 24 h cool-down)',
  })
  async whitelist(
    @CurrentUser() user: AuthUser,
    @Body() body: WhitelistDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    await this.stepUp.assert(user, 'whitelist_change', { totpCode: body.totpCode, stepUpToken });
    const wallet = await this.users.whitelist(user.id, body);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.whitelist.added',
      targetType: 'user_wallet',
      targetId: wallet.id,
      metadata: { network: body.network, address: wallet.address },
    });
    return wallet;
  }

  @Delete('wallets/:id/whitelist')
  @ApiHeader({ name: STEP_UP_HEADER, required: false })
  @ApiOperation({ summary: 'Remove an address from the whitelist (step-up: whitelist_change)' })
  async unwhitelist(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StepUpBodyDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    await this.stepUp.assert(user, 'whitelist_change', { totpCode: body.totpCode, stepUpToken });
    const result = await this.users.removeFromWhitelist(user.id, id);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.whitelist.removed',
      targetType: 'user_wallet',
      targetId: id,
    });
    return result;
  }
}
