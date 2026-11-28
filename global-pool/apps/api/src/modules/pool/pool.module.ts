import { Global, Module } from '@nestjs/common';

import { EntriesService } from './entries.service';
import { PoolController } from './pool.controller';
import { PoolEventsService } from './pool-events.service';
import { PoolGateway } from './pool.gateway';
import { RoundLifecycleService } from './round-lifecycle.service';
import { RoundsProcessor } from './rounds.processor';
import { RoundsService } from './rounds.service';

@Global()
@Module({
  controllers: [PoolController],
  providers: [
    PoolEventsService,
    RoundsService,
    EntriesService,
    RoundLifecycleService,
    PoolGateway,
    RoundsProcessor,
  ],
  exports: [RoundsService, EntriesService, RoundLifecycleService, PoolEventsService],
})
export class PoolModule {}
