import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AdminGamesController } from './admin-games.controller';
import { BetsService } from './engine/bets.service';
import { CrashGateway } from './engine/crash.gateway';
import { CrashEngineService } from './engine/crash.service';
import { CreditsService } from './engine/credits.service';
import { GameClock } from './engine/games-common';
import { GamesPolicyService } from './engine/policy.service';
import { SeedsService } from './engine/seeds.service';
import { StatefulGamesService } from './engine/stateful.service';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { CrashController, GameSeedsBetsController, GamesPlayController } from './play.controller';

/**
 * Games: catalogue + the provably-fair games engine (DEMO credits only, no cash value — never the USDT ledger).
 * Controller order matters: specific routes (/games/credits, /games/orbit-rush/…) are registered before the generic
 * /games/:slug/… and /games/:slug routes.
 */
@Module({
  imports: [AdminModule],
  controllers: [
    GamesPlayController,
    CrashController,
    GameSeedsBetsController,
    GamesController,
    AdminGamesController,
  ],
  providers: [
    GamesService,
    GameClock,
    CreditsService,
    SeedsService,
    GamesPolicyService,
    BetsService,
    StatefulGamesService,
    CrashEngineService,
    CrashGateway,
  ],
  exports: [GamesService, CreditsService, CrashEngineService, GameClock],
})
export class GamesModule {}
