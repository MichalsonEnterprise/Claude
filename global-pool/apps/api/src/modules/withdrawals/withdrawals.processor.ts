import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { WithdrawalBroadcasterService } from './withdrawal-broadcaster.service';
import { WithdrawalsService } from './withdrawals.service';

/**
 * Withdrawal processing queue: risk-check retries, the broadcast step and (with the testnet broadcaster on) a
 * repeating tracker that settles confirmed transfers and returns the funds of failed ones.
 */
@Processor(QUEUES.WITHDRAWALS, { autorun: false, concurrency: 4 })
export class WithdrawalsProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(WithdrawalsProcessor.name);

  constructor(
    private readonly withdrawals: WithdrawalsService,
    private readonly broadcaster: WithdrawalBroadcasterService,
    private readonly config: AppConfig,
    @InjectQueue(QUEUES.WITHDRAWALS) private readonly queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.env.JOBS_ENABLED) return;
    if (this.broadcaster.enabled) {
      await this.queue.upsertJobScheduler(
        'withdrawal-tracker',
        { every: this.config.env.WITHDRAWAL_TRACK_POLL_SECONDS * 1000 },
        {
          name: JOBS.WITHDRAWAL_TRACK,
          opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 },
        },
      );
    }
    void this.worker.run();
  }

  async process(job: Job<{ withdrawalId: string }>): Promise<unknown> {
    switch (job.name) {
      case JOBS.WITHDRAWAL_RISK_CHECK:
        return this.withdrawals.runRiskCheck(job.data.withdrawalId);
      case JOBS.WITHDRAWAL_BROADCAST:
        return this.broadcaster.broadcast(job.data.withdrawalId);
      case JOBS.WITHDRAWAL_TRACK: {
        const summary = await this.broadcaster.trackAll();
        if (summary.confirmed || summary.failed || summary.broadcast) {
          this.logger.log(`Withdrawal tracker: ${JSON.stringify(summary)}`);
        }
        return summary;
      }
      default:
        this.logger.warn(`Unknown job ${job.name}`);
        return null;
    }
  }
}
