import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { transactionsQuerySchema } from '@gp/shared/schemas';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { TransactionsService } from './transactions.service';

class TransactionsQueryDto extends createZodDto(transactionsQuerySchema) {}

@ApiTags('transactions')
@PlayerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated, filtered activity history (type, status, network, from/to)' })
  list(@CurrentUser() user: AuthUser, @Query() query: TransactionsQueryDto) {
    return this.transactions.list(user.id, query);
  }

  @Get(':reference')
  @ApiOperation({ summary: 'One transaction by reference (DP-…, WD-…, EP-…) with its timeline' })
  get(@CurrentUser() user: AuthUser, @Param('reference') reference: string) {
    return this.transactions.get(user.id, reference);
  }
}
