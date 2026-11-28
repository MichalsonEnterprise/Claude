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
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  blackjackActionSchema,
  cashOutSchema,
  clientSeedSchema,
  crashBetSchema,
  gameBetsQuerySchema,
  hiloActionSchema,
  minesRevealSchema,
  placeBetSchema,
  resetCreditsSchema,
  startBlackjackSchema,
  startHiloSchema,
  startMinesSchema,
} from '@gp/shared/fair';

import { CurrentUser, ReqMeta, type AuthUser, type RequestMeta } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { GAMING_POLICY, PlayerAuth, type PlayerPolicyOptions } from '../auth/guards';
import { BetsService } from './engine/bets.service';
import { CreditsService } from './engine/credits.service';
import { CrashEngineService } from './engine/crash.service';
import { SeedsService } from './engine/seeds.service';
import { StatefulGamesService } from './engine/stateful.service';

class PlaceBetDto extends createZodDto(placeBetSchema) {}
class ClientSeedDto extends createZodDto(clientSeedSchema) {}
class ResetDto extends createZodDto(resetCreditsSchema) {}
class BetsQueryDto extends createZodDto(gameBetsQuerySchema) {}
class StartBlackjackDto extends createZodDto(startBlackjackSchema) {}
class BlackjackActionDto extends createZodDto(blackjackActionSchema) {}
class StartMinesDto extends createZodDto(startMinesSchema) {}
class MinesRevealDto extends createZodDto(minesRevealSchema) {}
class StartHiloDto extends createZodDto(startHiloSchema) {}
class HiloActionDto extends createZodDto(hiloActionSchema) {}
class CashOutDto extends createZodDto(cashOutSchema) {}
class CrashBetDto extends createZodDto(crashBetSchema) {}
class CrashStatsQueryDto extends createZodDto(
  z.object({ period: z.enum(['24h', '7d', '30d']).default('24h') }),
) {}

/** Bets per IP per minute on the game write routes (on top of the global throttler). */
const betLimit = () => Number(process.env.GAMES_BET_THROTTLE_LIMIT ?? 600);
const BET_THROTTLE = { default: { limit: betLimit, ttl: 60_000 } };

/**
 * Continuing an open round (hit / stand / reveal / cash out) needs a signed-in, onboarded, not suspended player.
 * Actions that add a stake (double, split, insurance) re-check self-exclusion in the service; NEW rounds use the
 * full GAMING_POLICY (region, self-exclusion, gaming_blocked).
 */
const CONTINUE_POLICY: PlayerPolicyOptions = { onboarded: true, blockedBy: ['account_suspended'] };

@ApiTags('games · play (DEMO credits)')
@Controller('games')
export class GamesPlayController {
  constructor(
    private readonly credits: CreditsService,
    private readonly bets: BetsService,
    private readonly stateful: StatefulGamesService,
  ) {}

  @Get('credits')
  @PlayerAuth()
  @ApiOperation({
    summary: 'DEMO credits (no cash value): balance, reset availability, DEMO session summary',
  })
  getCredits(@CurrentUser() user: AuthUser) {
    return this.credits.view(user.id);
  }

  @Post('credits/reset')
  @HttpCode(200)
  @PlayerAuth()
  @ApiOperation({ summary: 'Reset DEMO credits to 1,000.00 — at most once per hour; audited' })
  reset(@CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta, @Body() _body: ResetDto) {
    return this.credits.reset(user.id, meta);
  }

  @Get('bets/:id')
  @PlayerAuth()
  @ApiOperation({ summary: 'One of my bets (any game except Orbit Rush)' })
  async bet(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bets.view(await this.bets.byId(user.id, id));
  }

  @Get('bets/:id/verify')
  @PlayerAuth()
  @ApiOperation({
    summary:
      'Everything needed to re-derive a bet (seeds, nonce, params / actions); re-derived once the seed is revealed',
  })
  verify(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bets.verification(user.id, id);
  }

  // ── Twenty-One ─────────────────────────────────────────────────────────────────────────────────

  @Get('twenty-one/hands/current')
  @PlayerAuth()
  @ApiOperation({ summary: 'My open Twenty-One hand (reconnect / recovery), or null' })
  currentHand(@CurrentUser() user: AuthUser) {
    return this.stateful.current(user.id, 'twenty-one');
  }

  @Post('twenty-one/hands')
  @HttpCode(201)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({ summary: 'Deal a Twenty-One hand (idempotent; stake in DEMO credits)' })
  deal(@CurrentUser() user: AuthUser, @Body() body: StartBlackjackDto) {
    return this.stateful.startBlackjack(user, body);
  }

  @Post('twenty-one/hands/:id/action')
  @HttpCode(200)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(CONTINUE_POLICY)
  @ApiOperation({ summary: 'hit | stand | double | split | insurance {accept} (idempotent)' })
  handAction(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: BlackjackActionDto,
  ) {
    return this.stateful.blackjackAction(user, id, body);
  }

  // ── Vault Sweeper ──────────────────────────────────────────────────────────────────────────────

  @Get('vault-sweeper/rounds/current')
  @PlayerAuth()
  currentMines(@CurrentUser() user: AuthUser) {
    return this.stateful.current(user.id, 'vault-sweeper');
  }

  @Post('vault-sweeper/rounds')
  @HttpCode(201)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({
    summary: 'Start a Vault Sweeper board (mines fixed by the seeds before the first pick)',
  })
  startMines(@CurrentUser() user: AuthUser, @Body() body: StartMinesDto) {
    return this.stateful.startMines(user, body);
  }

  @Post('vault-sweeper/rounds/:id/reveal')
  @HttpCode(200)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(CONTINUE_POLICY)
  reveal(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MinesRevealDto,
  ) {
    return this.stateful.minesReveal(user, id, body);
  }

  @Post('vault-sweeper/rounds/:id/cashout')
  @HttpCode(200)
  @PlayerAuth(CONTINUE_POLICY)
  minesCashOut(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CashOutDto,
  ) {
    return this.stateful.minesCashOut(user, id, body);
  }

  // ── High Card ──────────────────────────────────────────────────────────────────────────────────

  @Get('high-card/rounds/current')
  @PlayerAuth()
  currentHilo(@CurrentUser() user: AuthUser) {
    return this.stateful.current(user.id, 'high-card');
  }

  @Post('high-card/rounds')
  @HttpCode(201)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({ summary: 'Start a High Card run (card sequence fixed by the seeds)' })
  startHilo(@CurrentUser() user: AuthUser, @Body() body: StartHiloDto) {
    return this.stateful.startHilo(user, body);
  }

  @Post('high-card/rounds/:id/action')
  @HttpCode(200)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(CONTINUE_POLICY)
  @ApiOperation({ summary: 'higher_or_same | lower_or_same | skip' })
  hiloAction(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: HiloActionDto,
  ) {
    return this.stateful.hiloAction(user, id, body);
  }

  @Post('high-card/rounds/:id/cashout')
  @HttpCode(200)
  @PlayerAuth(CONTINUE_POLICY)
  hiloCashOut(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CashOutDto,
  ) {
    return this.stateful.hiloCashOut(user, id, body);
  }
}

@ApiTags('games · Orbit Rush (crash)')
@Controller('games/orbit-rush')
export class CrashController {
  constructor(private readonly crash: CrashEngineService) {}

  @Get('state')
  @ApiOperation({
    summary:
      'Live round (commitment, phase, multiplier — never the crash point before the crash), live bets, last 20 crash points',
  })
  state() {
    return this.crash.snapshot();
  }

  @Get('rounds')
  @ApiOperation({
    summary:
      'Crashed rounds with revealed seeds and crash points, players / wagered / paid out (DEMO); optional `from` (crashed at / after) and `search` (round "CR-55102" or "55102")',
  })
  rounds(@Query() q: BetsQueryDto) {
    const number = q.search ? Number(q.search.replace(/^[A-Za-z]*-?/, '')) : undefined;
    return this.crash.rounds(q.page, q.pageSize, {
      from: q.from ? new Date(q.from) : undefined,
      number: number !== undefined && Number.isSafeInteger(number) ? number : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Public statistics of crashed rounds (24h / 7d / 30d): count, median, share reaching 2.00×, highest crash, distribution vs the published expectation',
  })
  stats(@Query() q: CrashStatsQueryDto) {
    return this.crash.stats(q.period);
  }

  @Get('rounds/:number')
  async round(@Param('number', ParseIntPipe) number: number) {
    return this.crash.publicRound(await this.crash.roundByNumber(number), null);
  }

  @Get('rounds/:number/verify')
  @ApiOperation({
    summary:
      'Public verification: seed → round commitment → chain commitment, recomputed crash point',
  })
  verify(@Param('number', ParseIntPipe) number: number) {
    return this.crash.verify(number);
  }

  @Get('bets')
  @PlayerAuth()
  myBets(@CurrentUser() user: AuthUser, @Query() q: BetsQueryDto) {
    return this.crash.myBets(user.id, q.page, q.pageSize, {
      from: q.from ? new Date(q.from) : undefined,
      result: q.result,
    });
  }

  @Get('bets/current')
  @PlayerAuth()
  myCurrent(@CurrentUser() user: AuthUser) {
    return this.crash.myCurrentBet(user.id);
  }

  @Post('bets')
  @HttpCode(201)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({
    summary:
      'Bet in the betting window (idempotent); optional auto cash-out 1.01×–1,000.00× runs server-side',
  })
  placeBet(@CurrentUser() user: AuthUser, @Body() body: CrashBetDto) {
    return this.crash.placeBet(user, body);
  }

  @Post('bets/:id/cashout')
  @HttpCode(200)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(CONTINUE_POLICY)
  @ApiOperation({
    summary: 'Cash out at the current server multiplier (the response shows the final bet state)',
  })
  cashOut(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CashOutDto,
  ) {
    return this.crash.cashOut(user, id, body);
  }
}

/** Generic per-game routes (registered after the specific ones above). */
@ApiTags('games · play (DEMO credits)')
@Controller('games')
export class GameSeedsBetsController {
  constructor(
    private readonly seeds: SeedsService,
    private readonly bets: BetsService,
  ) {}

  @Get(':slug/seeds')
  @PlayerAuth()
  @ApiOperation({
    summary: 'Active seed pair (server seed hash, client seed, nonce) + revealed pairs',
  })
  getSeeds(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.seeds.view(user.id, slug);
  }

  @Post(':slug/seeds/client')
  @HttpCode(200)
  @PlayerAuth()
  @ApiOperation({
    summary: 'Change the client seed: reveals the current server seed and commits a new one',
  })
  setClientSeed(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() body: ClientSeedDto,
  ) {
    return this.seeds.rotate(user.id, slug, body.clientSeed);
  }

  @Post(':slug/seeds/rotate')
  @HttpCode(200)
  @PlayerAuth()
  @ApiOperation({
    summary: 'Reveal the current server seed and commit a new one (same client seed)',
  })
  rotate(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.seeds.rotate(user.id, slug);
  }

  @Post(':slug/bets')
  @HttpCode(201)
  @Throttle(BET_THROTTLE)
  @PlayerAuth(GAMING_POLICY)
  @ApiOperation({
    summary:
      'Instant bet (Pool Dice, Double Side, Pool Roulette, Skyline, Fortune Ring, Pool Keno, Pinfall) — idempotent, DEMO credits only',
  })
  place(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: PlaceBetDto) {
    return this.bets.placeInstant(user, slug, body);
  }

  @Get(':slug/bets')
  @PlayerAuth()
  @ApiOperation({
    summary:
      'My bets for a game (newest first) + DEMO totals; optional filters from / to / result / pick / search apply to both',
  })
  history(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Query() q: BetsQueryDto) {
    return this.bets.history(user.id, slug, q.page, q.pageSize, q);
  }
}
