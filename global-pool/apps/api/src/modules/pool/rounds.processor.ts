import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { RoundLifecycleService } from './round-lifecycle.service';

/** Round lifecycle + settlement queue: a repeating tick (every 30 s) and on-demand settle jobs. */
@Processor(QUEUES.ROUNDS, { autorun: false, concurrency: 1 })
export class RoundsProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoundsProcessor.name);

  constructor(
    private readonly lifecycle: RoundLifecycleService,
    private readonly config: AppConfig,
    @InjectQueue(QUEUES.ROUNDS) private readonly queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.env.JOBS_ENABLED) return;
    await this.queue.upsertJobScheduler(
      'round-tick',
      { every: 30_000 },
      { name: JOBS.ROUND_TICK, opts: { attempts: 1, removeOnComplete: true, removeOnFail: 100 } },
    );
    void this.worker.run();
  }

  async process(job: Job<{ roundId?: string }>): Promise<unknown> {
    if (job.name === JOBS.ROUND_TICK) {
      const report = await this.lifecycle.tick();
      const changed = report.opened.length + report.closed.length + report.settled.length + report.cancelled.length;
      if (changed || report.scheduled) this.logger.log(`Round tick: ${JSON.stringify(report)}`);
      return report;
    }
    if (job.name === JOBS.ROUND_SETTLE && job.data.roundId) {
      return this.lifecycle.pollAndSettle(job.data.roundId);
    }
    return null;
  }
}
