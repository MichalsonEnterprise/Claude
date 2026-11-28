import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { enabledChainKeySchema, paginationQuerySchema, positiveUsdtAmountSchema, withdrawalRequestSchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { DemoOnly } from '../../common/demo-only.guard';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth, WITHDRAWAL_POLICY } from '../auth/guards';
import { STEP_UP_HEADER } from '../security/step-up.service';
import { WithdrawalsService } from './withdrawals.service';

class WithdrawalRequestDto extends createZodDto(withdrawalRequestSchema) {}
class QuoteQueryDto extends createZodDto(z.object({ amount: positiveUsdtAmountSchema, network: enabledChainKeySchema })) {}
class PaginationDto extends createZodDto(paginationQuerySchema) {}

@ApiTags('withdrawals')
@PlayerAuth(WITHDRAWAL_POLICY)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(
    private readonly withdrawals: WithdrawalsService,
    private readonly audit: AuditService,
  ) {}

  @Get('quote')
  @ApiOperation({ summary: 'Fee breakdown: network fee (deducted), platform fee 0.00, you receive' })
  quote(@Query() query: QuoteQueryDto) {
    return this.withdrawals.quote(query.amount, query.network);
  }

  @Post()
  @HttpCode(201)
  @ApiHeader({ name: STEP_UP_HEADER, required: false, description: 'Step-up token (purpose withdrawal) — or send totpCode' })
  @ApiOperation({
    summary: 'Request a withdrawal (idempotent): step-up 2FA, KYC daily limit, AVAILABLE → LOCKED, risk/AML screening',
  })
  async request(
    @CurrentUser() user: AuthUser,
    @Body() body: WithdrawalRequestDto,
    @Headers(STEP_UP_HEADER) stepUpToken?: string,
  ) {
    const result = await this.withdrawals.request(user, body, stepUpToken ?? null);
    if (!result.replayed) {
      await this.audit.record({
        actorType: 'user',
        actorId: user.id,
        actorLabel: user.handle,
        action: 'withdrawal.requested',
        targetType: 'withdrawal',
        targetId: result.id,
        metadata: { reference: result.reference, amount: result.amount, network: result.network, status: result.status },
      });
    }
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Your withdrawals' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.withdrawals.list(user.id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawals.get(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel before sending — funds return to Available' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawals.cancel(user, id);
  }
}

@DemoOnly()
@PlayerAuth(WITHDRAWAL_POLICY)
@Controller('dev/withdrawals')
export class DevWithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Post(':id/simulate-confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'DEMO only: simulate broadcast + on-chain confirmation of a QUEUED withdrawal' })
  simulate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawals.simulateConfirm(user.id, id);
  }
}
