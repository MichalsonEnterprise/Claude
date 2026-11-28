import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  realityCheckSchema,
  rgLimitUpdateSchema,
  selfExclusionSchema,
  type RgLimitUpdate,
} from '@gp/shared/schemas';
import { ZodValidationPipe } from 'nestjs-zod';

import { ZodBody } from '../../common/zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth } from '../auth/guards';
import { ResponsibleGamingService } from './responsible-gaming.service';

class SelfExclusionDto extends createZodDto(selfExclusionSchema) {}
class RealityCheckDto extends createZodDto(realityCheckSchema) {}

@ApiTags('responsible-gaming')
@PlayerAuth()
@Controller('responsible-gaming')
export class ResponsibleGamingController {
  constructor(
    private readonly rg: ResponsibleGamingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Limits (effective + pending increases + usage), self-exclusion, reality check' })
  state(@CurrentUser() user: AuthUser) {
    return this.rg.state(user.id);
  }

  @Put('limits')
  @ZodBody(rgLimitUpdateSchema)
  @ApiOperation({ summary: 'Set a limit — decreases apply now, increases after a 24 h cool-down' })
  async setLimit(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(rgLimitUpdateSchema)) body: RgLimitUpdate,
  ) {
    const state = await this.rg.updateLimit(user.id, body);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.rg.limit_updated',
      targetType: 'user',
      targetId: user.id,
      metadata: { ...body },
    });
    return state;
  }

  @Post('self-exclusion')
  @HttpCode(200)
  @ApiOperation({ summary: 'Self-exclude immediately (withdrawals remain available)' })
  async selfExclude(@CurrentUser() user: AuthUser, @Body() body: SelfExclusionDto) {
    const result = await this.rg.selfExclude(user.id, body);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.rg.self_excluded',
      targetType: 'user',
      targetId: user.id,
      metadata: { duration: body.duration, endsAt: result.endsAt },
    });
    return result;
  }

  @Put('reality-check')
  @ApiOperation({ summary: 'Reality-check reminder interval (minutes)' })
  realityCheck(@CurrentUser() user: AuthUser, @Body() body: RealityCheckDto) {
    return this.rg.setRealityCheck(user.id, body.intervalMinutes);
  }

  @Post('reality-check/ack')
  @HttpCode(200)
  @ApiOperation({ summary: 'Acknowledge a reality-check reminder' })
  ack(@CurrentUser() user: AuthUser) {
    return this.rg.acknowledgeRealityCheck(user.id);
  }
}
