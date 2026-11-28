import { Body, Controller, Get, Headers, HttpCode, Post, Put } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  antiPhishingCodeSchema,
  backupCodeSchema,
  totpChallengeSchema,
  totpCodeSchema,
  totpEnrollConfirmSchema,
} from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth } from '../auth/guards';
import { STEP_UP_HEADER, StepUpService } from './step-up.service';
import { TotpService } from './totp.service';

class ConfirmTotpDto extends createZodDto(totpEnrollConfirmSchema) {}
class ChallengeDto extends createZodDto(totpChallengeSchema) {}
const stepUpCode = z.object({ code: z.union([totpCodeSchema, backupCodeSchema]).optional() });
class StepUpCodeDto extends createZodDto(stepUpCode) {}
class AntiPhishingDto extends createZodDto(
  stepUpCode.extend({ antiPhishingCode: antiPhishingCodeSchema }),
) {}

@ApiTags('auth · 2FA')
@PlayerAuth({ onboarded: false })
@Controller('auth')
export class SecurityController {
  constructor(
    private readonly totp: TotpService,
    private readonly stepUp: StepUpService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('2fa')
  @ApiOperation({ summary: 'Two-factor status (+ whether an anti-phishing code is set)' })
  async status(@CurrentUser() user: AuthUser) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: user.id } });
    return { ...(await this.totp.status({ userId: user.id })), antiPhishingCodeSet: Boolean(profile?.antiPhishingCode) };
  }

  @Post('2fa/enroll')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start TOTP enrolment — returns the secret + otpauth:// URI for the QR code' })
  enroll(@CurrentUser() user: AuthUser) {
    return this.totp.enroll({ userId: user.id }, user.handle ? `@${user.handle}` : user.publicId);
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm enrolment with the first code — returns 10 single-use backup codes (once)' })
  async confirm(@CurrentUser() user: AuthUser, @Body() body: ConfirmTotpDto) {
    const result = await this.totp.confirm({ userId: user.id }, body.code);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      actorLabel: user.handle,
      action: 'user.2fa.enabled',
      targetType: 'user',
      targetId: user.id,
    });
    return { enabled: true, ...result };
  }

  @Post('2fa/challenge')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Step-up challenge: verify a TOTP / backup code for a purpose → single-use step-up token (5 min)',
  })
  challenge(@CurrentUser() user: AuthUser, @Body() body: ChallengeDto) {
    return this.stepUp.challenge(user, body.purpose, body.code);
  }

  @Post('2fa/backup-codes')
  @HttpCode(200)
  @ApiHeader({ name: STEP_UP_HEADER, required: false })
  @ApiOperation({ summary: 'Regenerate backup codes (step-up: security_settings)' })
  async regenerate(
    @CurrentUser() user: AuthUser,
    @Body() body: StepUpCodeDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
    const row = await this.totp.find({ userId: user.id });
    const backupCodes = await this.totp.regenerateBackupCodes(row!.id);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.2fa.backup_codes_regenerated',
      targetType: 'user',
      targetId: user.id,
    });
    return { backupCodes };
  }

  @Post('2fa/disable')
  @HttpCode(200)
  @ApiHeader({ name: STEP_UP_HEADER, required: false })
  @ApiOperation({ summary: 'Disable 2FA (step-up: security_settings)' })
  async disable(
    @CurrentUser() user: AuthUser,
    @Body() body: StepUpCodeDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
    await this.totp.disable({ userId: user.id });
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.2fa.disabled',
      targetType: 'user',
      targetId: user.id,
    });
    return { enabled: false };
  }

  @Put('anti-phishing')
  @ApiHeader({ name: STEP_UP_HEADER, required: false })
  @ApiOperation({ summary: 'Set the anti-phishing code shown in every email (step-up: security_settings)' })
  async antiPhishing(
    @CurrentUser() user: AuthUser,
    @Body() body: AntiPhishingDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    await this.stepUp.assert(user, 'security_settings', { totpCode: body.code, stepUpToken });
    await this.prisma.userProfile.update({
      where: { userId: user.id },
      data: { antiPhishingCode: body.antiPhishingCode },
    });
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.anti_phishing.updated',
      targetType: 'user',
      targetId: user.id,
    });
    return { antiPhishingCode: body.antiPhishingCode };
  }
}
