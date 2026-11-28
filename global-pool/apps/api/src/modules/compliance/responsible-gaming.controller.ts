import { Body, Controller, Get, Headers, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  coolingOffSchema,
  realityCheckAckSchema,
  realityCheckSchema,
  rgCancelSettingSchema,
  rgHistoryQuerySchema,
  rgLimitRefSchema,
  rgLimitUpdateSchema,
  rgQuietHoursSchema,
  rgSessionLimitSchema,
  selfExclusionSchema,
  type RgLimitUpdate,
  type RgQuietHours,
} from '@gp/shared/schemas';
import { ZodValidationPipe } from 'nestjs-zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto, ZodBody } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth } from '../auth/guards';
import { STEP_UP_HEADER } from '../security/step-up.service';
import { ResponsibleGamingService } from './responsible-gaming.service';

class SelfExclusionDto extends createZodDto(selfExclusionSchema) {}
class CoolingOffDto extends createZodDto(coolingOffSchema) {}
class RealityCheckDto extends createZodDto(realityCheckSchema) {}
class RealityCheckAckDto extends createZodDto(realityCheckAckSchema) {}
class LimitRefDto extends createZodDto(rgLimitRefSchema) {}
class SessionLimitDto extends createZodDto(rgSessionLimitSchema) {}
class CancelSettingDto extends createZodDto(rgCancelSettingSchema) {}
class HistoryQueryDto extends createZodDto(rgHistoryQuerySchema) {}

/**
 * Responsible gaming (USR-RG1..RG7). Every change is enforced server-side and written to the hash-chained audit log;
 * the same rows feed the player's limit history. Nothing here can ever block a withdrawal.
 */
@ApiTags('responsible-gaming')
@PlayerAuth()
@Controller('responsible-gaming')
export class ResponsibleGamingController {
  constructor(
    private readonly rg: ResponsibleGamingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Limits (effective + pending increases/removals + usage), break / self-exclusion, reality check, time settings, session',
  })
  state(@CurrentUser() user: AuthUser) {
    return this.rg.state(user.id);
  }

  @Put('limits')
  @ZodBody(rgLimitUpdateSchema)
  @ApiOperation({
    summary: 'Set a limit — new or lower limits apply now, increases after a 24 h cool-down',
  })
  async setLimit(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(rgLimitUpdateSchema)) body: RgLimitUpdate,
  ) {
    const change = await this.rg.changeLimit(user.id, body);
    await this.record(user, 'user.rg.limit_updated', { ...change });
    return this.rg.state(user.id);
  }

  @Post('limits/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a limit — takes effect after the 24 h cool-down (cancellable)' })
  async removeLimit(@CurrentUser() user: AuthUser, @Body() body: LimitRefDto) {
    const change = await this.rg.removeLimit(user.id, body);
    await this.record(user, 'user.rg.limit_removal_requested', { ...change });
    return this.rg.state(user.id);
  }

  @Post('limits/cancel-pending')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a pending limit increase or removal — the current limit stays' })
  async cancelPending(@CurrentUser() user: AuthUser, @Body() body: LimitRefDto) {
    const result = await this.rg.cancelPending(user.id, body);
    await this.record(user, 'user.rg.limit_pending_cancelled', { ...result });
    return this.rg.state(user.id);
  }

  @Put('session-limit')
  @ApiOperation({
    summary: 'Session length limit (minutes, null = remove) — increases/removal wait 24 h',
  })
  async sessionLimit(@CurrentUser() user: AuthUser, @Body() body: SessionLimitDto) {
    const change = await this.rg.setSessionLimit(user.id, body.minutes);
    await this.record(user, 'user.rg.session_limit_updated', { ...change });
    return this.rg.state(user.id);
  }

  @Put('quiet-hours')
  @ZodBody(rgQuietHoursSchema)
  @ApiOperation({ summary: 'Quiet hours (UTC) — turning on applies now; turning off waits 24 h' })
  async quietHours(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(rgQuietHoursSchema)) body: RgQuietHours,
  ) {
    const change = await this.rg.setQuietHours(user.id, body);
    await this.record(user, 'user.rg.quiet_hours_updated', {
      ...change,
      start: body.start,
      end: body.end,
    });
    return this.rg.state(user.id);
  }

  @Post('settings/cancel-pending')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel a pending session-limit increase/removal or quiet-hours switch-off',
  })
  async cancelSetting(@CurrentUser() user: AuthUser, @Body() body: CancelSettingDto) {
    const result = await this.rg.cancelPendingSetting(user.id, body.target);
    await this.record(user, 'user.rg.limit_pending_cancelled', { ...result, type: body.target });
    return this.rg.state(user.id);
  }

  @Post('cooling-off')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Start a break (24 h / 7 d / 30 d) immediately — cannot be shortened; withdrawals stay open',
  })
  async coolingOff(@CurrentUser() user: AuthUser, @Body() body: CoolingOffDto) {
    const result = await this.rg.selfExclude(user, { ...body });
    await this.record(user, 'user.rg.cooling_off', {
      duration: body.duration,
      endsAt: result.endsAt,
    });
    return result;
  }

  @Post('self-exclusion')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Self-exclude immediately (withdrawals remain available). 6m/1y/5y/permanent need phrase SELF-EXCLUDE + acknowledgement (+ TOTP when 2FA is on)',
  })
  async selfExclude(
    @CurrentUser() user: AuthUser,
    @Body() body: SelfExclusionDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    const result = await this.rg.selfExclude(user, body, new Date(), { stepUpToken });
    await this.record(
      user,
      result.kind === 'cooling_off' ? 'user.rg.cooling_off' : 'user.rg.self_excluded',
      { duration: body.duration, endsAt: result.endsAt },
    );
    return result;
  }

  @Post('self-exclusion/reopen')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'After a 6m / 1y / 5y self-exclusion ended: ask to reopen (nothing reopens automatically). Starts a 24 h cool-down; idempotent',
  })
  async requestReopen(@CurrentUser() user: AuthUser) {
    const reopen = await this.rg.requestReopen(user.id);
    await this.record(user, 'user.rg.reopen_requested', {
      requestedAt: reopen.requestedAt,
      availableAt: reopen.availableAt,
    });
    return this.rg.state(user.id);
  }

  @Post('self-exclusion/reopen/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Finish reopening after the 24 h cool-down — only with a deposit limit and a loss limit set (400 / 409 otherwise)',
  })
  async confirmReopen(@CurrentUser() user: AuthUser) {
    const result = await this.rg.confirmReopen(user.id);
    await this.record(user, 'user.rg.reopened', { ...result });
    return this.rg.state(user.id);
  }

  @Put('reality-check')
  @ApiOperation({ summary: 'Reality-check reminder interval (minutes) + pause / push toggles' })
  async realityCheck(@CurrentUser() user: AuthUser, @Body() body: RealityCheckDto) {
    const state = await this.rg.setRealityCheck(user.id, body.intervalMinutes, body);
    await this.record(user, 'user.rg.reality_check_settings', { ...body });
    return state;
  }

  @Post('reality-check/ack')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Answer a reality-check reminder (continue / view history / take a break)',
  })
  async ack(@CurrentUser() user: AuthUser, @Body() body: RealityCheckAckDto) {
    const result = await this.rg.acknowledgeRealityCheck(user.id, body?.action ?? 'continue');
    await this.record(user, 'user.rg.reality_check', { ...result });
    return result;
  }

  @Get('session')
  @ApiOperation({
    summary: 'Current play session: time played, net result, next reality check, play pauses',
  })
  session(@CurrentUser() user: AuthUser) {
    return this.rg.session(user.id);
  }

  @Post('session/heartbeat')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Activity heartbeat (every 60 s while signed in and visible) — drives time limits and reality checks',
  })
  heartbeat(@CurrentUser() user: AuthUser) {
    return this.rg.heartbeat(user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Your limit changes and reality-check answers (from the audit log), newest first',
  })
  history(@CurrentUser() user: AuthUser, @Query() query: HistoryQueryDto) {
    return this.rg.history(user.id, query.kind, query.limit);
  }

  private record(user: AuthUser, action: string, metadata: Record<string, unknown>) {
    return this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action,
      targetType: 'user',
      targetId: user.id,
      metadata,
    });
  }
}
