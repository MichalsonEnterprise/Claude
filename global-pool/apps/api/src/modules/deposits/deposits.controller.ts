import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  demoDepositAdvanceSchema,
  demoDepositSimulationSchema,
  depositAddressRequestSchema,
  paginationQuerySchema,
} from '@gp/shared/schemas';

import { DemoOnly } from '../../common/demo-only.guard';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { DEPOSIT_POLICY, PlayerAuth, PlayerPolicy } from '../auth/guards';
import { DemoDepositsService } from './demo-deposits.service';
import { DepositAddressService } from './deposit-address.service';
import { DepositsService } from './deposits.service';

class DepositAddressQueryDto extends createZodDto(depositAddressRequestSchema) {}
class PaginationDto extends createZodDto(paginationQuerySchema) {}
class SimulateDepositDto extends createZodDto(demoDepositSimulationSchema) {}
class AdvanceDepositDto extends createZodDto(demoDepositAdvanceSchema) {}

/**
 * Only NEW deposits (the address, the DEMO simulation) need the deposit policy (region, not self-excluded, no
 * `deposits_blocked`). History and tracking of deposits already sent stay available during a break, abroad or under
 * a deposit block, like withdrawals (API.md: "withdrawals and history stay available").
 */
@ApiTags('deposits')
@PlayerAuth()
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly addresses: DepositAddressService,
    private readonly deposits: DepositsService,
    private readonly demo: DemoDepositsService,
  ) {}

  @Get('address')
  @PlayerPolicy(DEPOSIT_POLICY)
  @ApiOperation({
    summary: 'Your per-user deposit address (HD-derived, Arbitrum Sepolia test-USDT)',
  })
  address(@CurrentUser() user: AuthUser, @Query() query: DepositAddressQueryDto) {
    return this.addresses.forUser(user.id, query.network);
  }

  @Get()
  @ApiOperation({ summary: 'Your deposits with confirmation progress' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.deposits.list(user.id, query);
  }

  @Get('ref/:reference')
  @ApiOperation({ summary: 'One deposit by its reference (DP-77412) with confirmation progress' })
  byReference(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.demo.byReference(user.id, reference);
  }
}

@DemoOnly()
@PlayerAuth()
@Controller('dev/deposits')
export class DevDepositsController {
  constructor(
    private readonly deposits: DepositsService,
    private readonly demo: DemoDepositsService,
  ) {}

  @Post('simulate')
  @HttpCode(200)
  @PlayerPolicy(DEPOSIT_POLICY)
  @ApiOperation({
    summary:
      'DEMO only: simulate a confirmed test-USDT deposit (same ledger postings as a real one; idempotent)',
  })
  async simulate(@CurrentUser() user: AuthUser, @Body() body: SimulateDepositDto) {
    if (body.mode === 'progressive') {
      const { replayed, value } = await this.demo.simulateDetected(user.id, body);
      return { ...value, replayed };
    }
    const { replayed, value } = await this.deposits.simulate(user.id, body);
    return { ...value, replayed };
  }

  @Post(':reference/confirmations')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'DEMO only: add simulated confirmations to a progressive DEMO deposit (credited once the requirement is met)',
  })
  advance(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @Body() body: AdvanceDepositDto,
  ) {
    return this.demo.advance(user.id, reference, body.confirmations);
  }
}
