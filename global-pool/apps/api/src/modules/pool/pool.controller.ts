import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_ENTRIES_PER_PURCHASE, MIN_ENTRIES_PER_PURCHASE } from '@gp/shared/fees';
import { enterRoundSchema, paginationQuerySchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { notFound } from '../../common/errors';
import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { GAMING_POLICY, PlayerAuth } from '../auth/guards';
import { EntriesService } from './entries.service';
import { EntryHistoryService } from './entry-history.service';
import { RoundsService } from './rounds.service';

class EnterRoundDto extends createZodDto(enterRoundSchema.omit({ roundId: true })) {}
class PaginationDto extends createZodDto(paginationQuerySchema) {}
const HISTORY_STATUSES = ['closed', 'drawing', 'settled', 'cancelled'] as const;
/** GET /pool/rounds filters (additive): ?status=settled,cancelled&number=1245 */
class RoundHistoryDto extends createZodDto(
  paginationQuerySchema.extend({
    status: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      )
      .pipe(z.array(z.enum(HISTORY_STATUSES))),
    number: z.coerce.number().int().min(1).optional(),
  }),
) {}
class QuoteDto extends createZodDto(
  z.object({
    entries: z.coerce.number().int().min(MIN_ENTRIES_PER_PURCHASE).max(MAX_ENTRIES_PER_PURCHASE),
  }),
) {}
class LimitDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
) {}

@ApiTags('pool')
@Controller('pool')
export class PoolController {
  constructor(
    private readonly rounds: RoundsService,
    private readonly entries: EntriesService,
    private readonly entryHistory: EntryHistoryService,
  ) {}

  @Get('rounds/current')
  @ApiOperation({
    summary: 'Current round (open → next scheduled → latest) with pool, thresholds and prize table',
  })
  async current() {
    const round = await this.rounds.current();
    if (!round) throw notFound('Round');
    return this.rounds.view(round);
  }

  @Get('rounds')
  @ApiOperation({ summary: 'Round history (closed, drawing, settled, cancelled)' })
  history(@Query() query: RoundHistoryDto) {
    return this.rounds.history(
      { page: query.page, pageSize: query.pageSize },
      { statuses: query.status, number: query.number },
    );
  }

  @Get('me/entries')
  @PlayerAuth()
  @ApiOperation({
    summary:
      'Your entry history: one row per purchase (entries + separate platform fee) with its result, plus lifetime summary',
  })
  myEntryHistory(@CurrentUser() user: AuthUser, @Query() query: PaginationDto) {
    return this.entryHistory.history(user.id, query);
  }

  @Get('quote')
  @ApiOperation({
    summary: 'Entry quote: n × 10.00 + platform fee n × 0.05 (separate line) + network fee 0.00',
  })
  quote(@Query() query: QuoteDto) {
    return this.entries.quote(query.entries);
  }

  @Get('winners')
  @ApiOperation({ summary: 'Recent winners' })
  winners(@Query() query: LimitDto) {
    return this.rounds.recentWinners(query.limit);
  }

  @Get('rounds/:number')
  @ApiOperation({ summary: 'Round by public number (e.g. 1248)' })
  async byNumber(@Param('number', ParseIntPipe) number: number) {
    return this.rounds.view(await this.rounds.byNumber(number));
  }

  @Get('rounds/:number/verify')
  @ApiOperation({
    summary: 'Verification bundle: VRF word, algorithm, recomputed winners vs stored winners',
  })
  verify(@Param('number', ParseIntPipe) number: number) {
    return this.rounds.verification(number);
  }

  @Get('rounds/:number/feed')
  @ApiOperation({ summary: 'Latest entry purchases in a round' })
  async feed(@Param('number', ParseIntPipe) number: number, @Query() query: LimitDto) {
    const round = await this.rounds.byNumber(number);
    return this.rounds.feed(round.id, query.limit);
  }

  @Post('rounds/:roundId/entries')
  @HttpCode(201)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({
    summary:
      'Buy entries (idempotent): RG limits, balance check, AVAILABLE → POOL + FEES in one DB transaction',
  })
  enter(
    @CurrentUser() user: AuthUser,
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @Body() body: EnterRoundDto,
  ) {
    return this.entries.enter(user, roundId, body.entries, body.idempotencyKey);
  }

  @Get('rounds/:roundId/my-entries')
  @PlayerAuth()
  @ApiOperation({ summary: 'Your entries in a round + odds disclosure' })
  myEntries(@CurrentUser() user: AuthUser, @Param('roundId', ParseUUIDPipe) roundId: string) {
    return this.rounds.myEntries(user.id, roundId);
  }
}
