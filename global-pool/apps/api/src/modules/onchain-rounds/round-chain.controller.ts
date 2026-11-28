import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { RoundMirrorService } from './round-mirror.service';

class ManifestQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(5000).default(1000),
  }),
) {}

/** Provable-fairness data of the on-chain mirror (GlobalPoolRounds). Read-only: nothing here changes a round. */
@ApiTags('pool')
@Controller('pool/rounds/:number')
export class RoundChainController {
  constructor(private readonly mirror: RoundMirrorService) {}

  @Get('chain')
  @ApiOperation({
    summary:
      'On-chain mirror status: contract, steps (open / commit / draw / settle) with tx links, rules hash and roots',
  })
  status(@Param('number', ParseIntPipe) number: number) {
    return this.mirror.status(number);
  }

  @Get('manifest')
  @ApiOperation({
    summary: 'Committed entry leaves in index order (anyone can rebuild the on-chain entries root)',
  })
  manifest(@Param('number', ParseIntPipe) number: number, @Query() query: ManifestQueryDto) {
    return this.mirror.manifest(number, query.page, query.pageSize);
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Payout leaves + Merkle proofs (check each with verifyPayout on-chain)' })
  payouts(@Param('number', ParseIntPipe) number: number) {
    return this.mirror.payouts(number);
  }

  @Get('my-proofs')
  @PlayerAuth()
  @ApiOperation({
    summary:
      'Your entry receipts: index, entry id, secret salt, commitment and Merkle proof (verifyEntry on-chain)',
  })
  myProofs(@CurrentUser() user: AuthUser, @Param('number', ParseIntPipe) number: number) {
    return this.mirror.myProofs(user.id, number);
  }
}
