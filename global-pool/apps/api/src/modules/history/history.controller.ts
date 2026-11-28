import { Controller, Delete, Get, Header, Param, Put, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import {
  favouriteSlugSchema,
  historyEntriesQuerySchema,
  historyExportQuerySchema,
  historyGameRoundsQuerySchema,
  historyTransactionsQuerySchema,
  paginationQuerySchema,
} from '@gp/shared/schemas';
import type { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { AuditService } from '../audit/audit.service';
import { PlayerAuth } from '../auth/guards';
import { HistoryService } from './history.service';

class TxQueryDto extends createZodDto(historyTransactionsQuerySchema) {}
class ExportQueryDto extends createZodDto(historyExportQuerySchema) {}
class EntriesQueryDto extends createZodDto(historyEntriesQuerySchema) {}
class GameRoundsQueryDto extends createZodDto(historyGameRoundsQuerySchema) {}
class PageQueryDto extends createZodDto(paginationQuerySchema) {}

/**
 * Player history (USR-F1..F6, USR-G1..G7): read-only views over transactions, entries, winners and game sessions.
 * Available while self-excluded (history must stay visible). CSV exports are written to the audit log.
 */
@ApiTags('history')
@PlayerAuth()
@Controller('history')
export class HistoryController {
  constructor(
    private readonly history: HistoryService,
    private readonly audit: AuditService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Financial KPIs: deposits, withdrawals, fees, rewards, refunds' })
  summary(@CurrentUser() user: AuthUser) {
    return this.history.financeSummary(user.id);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Transactions with several types at once and search on reference / hash',
  })
  transactions(@CurrentUser() user: AuthUser, @Query() q: TxQueryDto) {
    return this.history.transactionsList(user.id, q);
  }

  @Get('transactions/export')
  @ApiProduces('text/csv')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'CSV export of the filtered transaction history (logged in the audit trail)',
  })
  async exportTransactions(
    @CurrentUser() user: AuthUser,
    @Query() q: ExportQueryDto,
    @Res() res: Response,
  ) {
    const out = await this.history.transactionsCsv(user.id, q);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.history.exported',
      targetType: 'user',
      targetId: user.id,
      metadata: { kind: 'transactions', rows: out.rows, filters: { ...q } },
    });
    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${out.fileName}"`)
      .setHeader('X-Export-Rows', String(out.rows))
      .send(out.csv);
  }

  @Get('fees')
  @ApiOperation({
    summary: 'Fee lines: 0.05 USDT platform fee per entry + network fees (separate lines)',
  })
  fees(@CurrentUser() user: AuthUser, @Query() q: PageQueryDto) {
    return this.history.fees(user.id, q.page, q.pageSize);
  }

  @Get('entries')
  @ApiOperation({
    summary: 'My Global Pool entries grouped by round (filters: status, round range)',
  })
  entries(@CurrentUser() user: AuthUser, @Query() q: EntriesQueryDto) {
    return this.history.entries(user.id, q);
  }

  @Get('rounds/active')
  @ApiOperation({ summary: 'Rounds still open / drawing in which you hold entries (+ odds share)' })
  activeRounds(@CurrentUser() user: AuthUser) {
    return this.history.activeRounds(user.id);
  }

  @Get('rounds/results')
  @ApiOperation({ summary: 'Settled and cancelled rounds you took part in, with your result' })
  results(@CurrentUser() user: AuthUser) {
    return this.history.results(user.id);
  }

  @Get('winnings')
  @ApiOperation({ summary: 'Prizes, refunds and rewards — owed vs settled' })
  winnings(@CurrentUser() user: AuthUser) {
    return this.history.winnings(user.id);
  }

  @Get('games')
  @ApiOperation({
    summary: 'My games overview: active rounds, recently played games, 30-day totals',
  })
  games(@CurrentUser() user: AuthUser) {
    return this.history.gamesOverview(user.id);
  }

  @Get('game-rounds')
  @ApiOperation({ summary: 'Game history (commit–reveal seeds; simulation mode)' })
  gameRounds(@CurrentUser() user: AuthUser, @Query() q: GameRoundsQueryDto) {
    return this.history.gameRounds(user.id, q);
  }

  @Get('game-rounds/export')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'CSV export of game history with seeds and nonces (logged in the audit trail)',
  })
  async exportGameRounds(
    @CurrentUser() user: AuthUser,
    @Query() q: GameRoundsQueryDto,
    @Res() res: Response,
  ) {
    const out = await this.history.gameRoundsCsv(user.id, q);
    await this.audit.record({
      actorType: 'user',
      actorId: user.id,
      action: 'user.history.exported',
      targetType: 'user',
      targetId: user.id,
      metadata: { kind: 'game_rounds', rows: out.rows },
    });
    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${out.fileName}"`)
      .setHeader('X-Export-Rows', String(out.rows))
      .send(out.csv);
  }

  @Get('favourites')
  @ApiOperation({ summary: 'Favourite games' })
  favourites(@CurrentUser() user: AuthUser) {
    return this.history.favourites(user.id);
  }

  @Put('favourites/:slug')
  @ApiOperation({ summary: 'Add a game to favourites (idempotent)' })
  addFavourite(
    @CurrentUser() user: AuthUser,
    @Param('slug', new ZodValidationPipe(favouriteSlugSchema)) slug: string,
  ) {
    return this.history.addFavourite(user.id, slug);
  }

  @Delete('favourites/:slug')
  @ApiOperation({ summary: 'Remove a game from favourites' })
  removeFavourite(
    @CurrentUser() user: AuthUser,
    @Param('slug', new ZodValidationPipe(favouriteSlugSchema)) slug: string,
  ) {
    return this.history.removeFavourite(user.id, slug);
  }
}
