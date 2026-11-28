import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { DepositChainWatcherService } from './deposit-chain-watcher.service';

/** Repeating deposit-watcher job (every DEPOSIT_WATCHER_POLL_SECONDS). Skips gracefully without RPC / token. */
@Processor(QUEUES.DEPOSITS, { autorun: false, concurrency: 1 })
export class DepositWatcherProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(DepositWatcherProcessor.name);
  private warned = false;

  constructor(
    private readonly watcher: DepositChainWatcherService,
    private readonly config: AppConfig,
    @InjectQueue(QUEUES.DEPOSITS) private readonly queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.env.JOBS_ENABLED) return;
    await this.queue.upsertJobScheduler(
      'deposit-watcher',
      { every: this.config.env.DEPOSIT_WATCHER_POLL_SECONDS * 1000 },
      {
        name: JOBS.DEPOSIT_WATCH,
        opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 },
      },
    );
    void this.worker.run();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== JOBS.DEPOSIT_WATCH) return null;
    const result = await this.watcher.watch('arbitrum');
    if (result.status === 'skipped') {
      if (!this.warned) this.logger.warn(`Deposit watcher skipped: ${result.reason}`);
      this.warned = true;
    } else if (result.detected || result.credited || result.reorged || result.reversed) {
      this.logger.log(
        `Deposit watcher: +${result.detected} detected, ${result.credited} credited, ${result.reorged} re-org pending, ${result.reversed} reversed`,
      );
    }
    return result;
  }
}
