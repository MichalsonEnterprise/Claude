import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { WithdrawalsService } from './withdrawals.service';

/** Withdrawal processing queue: risk-check retries and the broadcast step. */
@Processor(QUEUES.WITHDRAWALS, { autorun: false, concurrency: 4 })
export class WithdrawalsProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(WithdrawalsProcessor.name);

  constructor(
    private readonly withdrawals: WithdrawalsService,
    private readonly config: AppConfig,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (this.config.env.JOBS_ENABLED) void this.worker.run();
  }

  async process(job: Job<{ withdrawalId: string }>): Promise<unknown> {
    switch (job.name) {
      case JOBS.WITHDRAWAL_RISK_CHECK:
        return this.withdrawals.runRiskCheck(job.data.withdrawalId);
      case JOBS.WITHDRAWAL_BROADCAST:
        return this.withdrawals.broadcast(job.data.withdrawalId);
      default:
        this.logger.warn(`Unknown job ${job.name}`);
        return null;
    }
  }
}
