import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { idempotencyKeySchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { WalletService } from './wallet.service';

class ClaimOwedDto extends createZodDto(z.object({ idempotencyKey: idempotencyKeySchema })) {}

@ApiTags('wallet')
@PlayerAuth({ onboarded: false })
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('balances')
  @ApiOperation({
    summary: 'Available / Locked / Pending / Owed / Total — computed from the append-only double-entry ledger',
  })
  balances(@CurrentUser() user: AuthUser) {
    return this.wallet.balances(user.id);
  }

  @Get('lifetime')
  @ApiOperation({ summary: 'Lifetime deposits, withdrawals, entries, platform fees paid, rewards' })
  lifetime(@CurrentUser() user: AuthUser) {
    return this.wallet.lifetime(user.id);
  }

  @Post('owed/claim')
  @HttpCode(200)
  @ApiOperation({ summary: 'Claim everything owed (refunds, prizes, rewards) to Available (idempotent)' })
  async claim(@CurrentUser() user: AuthUser, @Body() body: ClaimOwedDto) {
    const { replayed, value } = await this.wallet.claimOwed(user.id, body.idempotencyKey);
    return { ...value, replayed };
  }
}
