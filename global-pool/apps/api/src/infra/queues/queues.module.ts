import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { AppConfig } from '../../config/app-config';
import { redisOptionsFromUrl } from '../redis/redis-options';
import { QUEUES } from './queues';

/**
 * BullMQ scaffold: deposit watcher, withdrawal processing, round lifecycle/settlement. Workers are created with
 * autorun=false and only started when JOBS_ENABLED=true (see each processor's onApplicationBootstrap).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        connection: redisOptionsFromUrl(config.env.REDIS_URL),
        prefix: config.env.BULLMQ_PREFIX,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: { age: 3_600, count: 1_000 },
          removeOnFail: { age: 7 * 86_400 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUES.DEPOSITS }, { name: QUEUES.WITHDRAWALS }, { name: QUEUES.ROUNDS }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
