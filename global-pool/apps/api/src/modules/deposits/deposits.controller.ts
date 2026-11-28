import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  demoDepositSimulationSchema,
  depositAddressRequestSchema,
  paginationQuerySchema,
} from '@gp/shared/schemas';

import { DemoOnly } from '../../common/demo-only.guard';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { DEPOSIT_POLICY, PlayerAuth } from '../auth/guards';
import { DepositAddressService } from './deposit-address.service';
import { DepositsService } from './deposits.service';

class DepositAddressQueryDto extends createZodDto(depositAddressRequestSchema) {}
class PaginationDto extends createZodDto(paginationQuerySchema) {}
class SimulateDepositDto extends createZodDto(demoDepositSimulationSchema) {}

@ApiTags('deposits')
@PlayerAuth(DEPOSIT_POLICY)
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly addresses: DepositAddressService,
    private readonly deposits: DepositsService,
  ) {}

  @Get('address')
  @ApiOperation({ summary: 'Your per-user deposit address (HD-derived, Arbitrum Sepolia test-USDT)' })
  address(@CurrentUser() user: AuthUser, @Query() query: DepositAddressQueryDto) {
    return this.addresses.forUser(user.id, query.network);
  }

  @Get()
  @ApiOperation({ summary: 'Your deposits with confirmation progress' })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.deposits.list(user.id, query);
  }
}

@DemoOnly()
@PlayerAuth(DEPOSIT_POLICY)
@Controller('dev/deposits')
export class DevDepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Post('simulate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'DEMO only: simulate a confirmed test-USDT deposit (same ledger postings as a real one; idempotent)',
  })
  async simulate(@CurrentUser() user: AuthUser, @Body() body: SimulateDepositDto) {
    const { replayed, value } = await this.deposits.simulate(user.id, body);
    return { ...value, replayed };
  }
}
