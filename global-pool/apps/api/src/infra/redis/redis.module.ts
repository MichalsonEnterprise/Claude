import { Global, Inject, Injectable, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import IORedis, { type Redis } from 'ioredis';

import { AppConfig } from '../../config/app-config';

export const REDIS = Symbol('REDIS');
export const InjectRedis = () => Inject(REDIS);

@Injectable()
class RedisCloser implements OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (err) {
      this.logger.warn(`Redis quit failed: ${String(err)}`);
    }
  }
}

/** Shared ioredis connection (health checks, rate limits, short-lived security state). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Redis =>
        new IORedis(config.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          enableOfflineQueue: true,
        }),
    },
    RedisCloser,
  ],
  exports: [REDIS],
})
export class RedisModule {}
