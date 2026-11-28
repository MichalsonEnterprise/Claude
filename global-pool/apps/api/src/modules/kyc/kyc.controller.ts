import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { DemoOnly } from '../../common/demo-only.guard';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { KycService } from './kyc.service';

const levelSchema = z.object({ level: z.enum(['level_1', 'level_2', 'level_3']) });
class KycLevelDto extends createZodDto(levelSchema) {}

@ApiTags('kyc')
@PlayerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get()
  @ApiOperation({ summary: 'KYC level, status and the resulting daily withdrawal limit' })
  status(@CurrentUser() user: AuthUser) {
    return this.kyc.status(user.id);
  }

  @Post('start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start verification for a level (provider interface; mock in dev)' })
  start(@CurrentUser() user: AuthUser, @Body() body: KycLevelDto) {
    return this.kyc.start(user.id, body.level);
  }
}

@DemoOnly()
@PlayerAuth()
@Controller('dev/kyc')
export class DevKycController {
  constructor(private readonly kyc: KycService) {}

  @Post('approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'DEMO only: mock-provider approval of your KYC level' })
  approve(@CurrentUser() user: AuthUser, @Body() body: KycLevelDto) {
    return this.kyc.approve(user.id, body.level);
  }
}
