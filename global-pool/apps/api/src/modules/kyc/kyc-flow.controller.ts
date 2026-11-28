import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  kycDetailsSchema,
  kycDevRejectSchema,
  kycDocumentUploadSchema,
  kycLivenessSchema,
  kycStartSchema,
  kycSubmitSchema,
} from '@gp/shared/schemas';

import { DemoOnly } from '../../common/demo-only.guard';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { KycFlowService } from './kyc-flow.service';

class KycStartDto extends createZodDto(kycStartSchema) {}
class KycDetailsDto extends createZodDto(kycDetailsSchema) {}
class KycDocumentDto extends createZodDto(kycDocumentUploadSchema) {}
class KycLivenessDto extends createZodDto(kycLivenessSchema) {}
class KycSubmitDto extends createZodDto(kycSubmitSchema) {}
class KycDevRejectDto extends createZodDto(kycDevRejectSchema) {}

/**
 * KYC flow (AUTH-11…17, A4/A5) through the provider interface — mock provider in dev. Documents are sent to the
 * provider; the API keeps metadata and check results only.
 */
@ApiTags('kyc')
@PlayerAuth()
@Controller('kyc')
export class KycFlowController {
  constructor(private readonly flow: KycFlowService) {}

  @Get('application')
  @ApiOperation({
    summary: 'Your open (or latest) verification with requirements and the next step',
  })
  view(@CurrentUser() user: AuthUser) {
    return this.flow.view(user.id);
  }

  @Post('application')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start or resume verification for a level (AUTH-11)' })
  start(@CurrentUser() user: AuthUser, @Body() body: KycStartDto) {
    return this.flow.start(user.id, body.level);
  }

  @Put('application/details')
  @ApiOperation({
    summary: 'AUTH-12: personal details exactly as on the ID (18+, permitted country)',
  })
  details(@CurrentUser() user: AuthUser, @Body() body: KycDetailsDto) {
    return this.flow.saveDetails(user.id, body);
  }

  @Post('application/documents')
  @HttpCode(200)
  @ApiOperation({
    summary: 'AUTH-13: add one document side (metadata + SHA-256; mock quality check)',
  })
  document(@CurrentUser() user: AuthUser, @Body() body: KycDocumentDto) {
    return this.flow.addDocument(user.id, body);
  }

  @Post('application/liveness')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-14: liveness result (mock) — 3 attempts, then a manual review' })
  liveness(@CurrentUser() user: AuthUser, @Body() body: KycLivenessDto) {
    return this.flow.liveness(user.id, body);
  }

  @Post('application/submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'AUTH-15: submit for review (Level 1 is approved instantly)' })
  submit(@CurrentUser() user: AuthUser, @Body() _body: KycSubmitDto) {
    return this.flow.submit(user.id, user.handle);
  }

  @Get('documents')
  @ApiOperation({ summary: 'A5: documents shared for identity checks (metadata only)' })
  documents(@CurrentUser() user: AuthUser) {
    return this.flow.documents(user.id);
  }
}

@DemoOnly()
@PlayerAuth()
@Controller('dev/kyc')
export class DevKycFlowController {
  constructor(private readonly flow: KycFlowService) {}

  @Post('reject')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'DEMO only: mock-provider rejection of your submitted verification (resubmission required)',
  })
  reject(@CurrentUser() user: AuthUser, @Body() body: KycDevRejectDto) {
    return this.flow.devReject(user.id, body.level, body.reasons);
  }
}
