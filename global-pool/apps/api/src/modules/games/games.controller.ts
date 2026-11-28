import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GAME_CATEGORIES } from '@gp/shared/enums';
import { z } from 'zod';

import { createZodDto } from '../../common/zod';
import { GamesService } from './games.service';

class GamesQueryDto extends createZodDto(z.object({ category: z.enum(GAME_CATEGORIES).optional() })) {}

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'Game catalogue (house edge disclosed; simulation mode — no real-money play)' })
  list(@Query() query: GamesQueryDto) {
    return this.games.list(query.category);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.games.bySlug(slug);
  }
}
