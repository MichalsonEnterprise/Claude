import { Global, Module } from '@nestjs/common';

import { DevRoundsController, DevRoundsService } from './dev-rounds.controller';
import { EntriesService } from './entries.service';
import { EntryHistoryService } from './entry-history.service';
import { PoolController } from './pool.controller';
import { PoolEventsService } from './pool-events.service';
import { PoolGateway } from './pool.gateway';
import { RoundLifecycleService } from './round-lifecycle.service';
import { RoundsProcessor } from './rounds.processor';
import { RoundsService } from './rounds.service';

@Global()
@Module({
  controllers: [PoolController, DevRoundsController],
  providers: [
    PoolEventsService,
    RoundsService,
    EntriesService,
    EntryHistoryService,
    RoundLifecycleService,
    PoolGateway,
    RoundsProcessor,
    DevRoundsService,
  ],
  exports: [RoundsService, EntriesService, RoundLifecycleService, PoolEventsService],
})
export class PoolModule {}
