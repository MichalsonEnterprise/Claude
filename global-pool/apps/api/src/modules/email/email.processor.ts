import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Job } from 'bullmq';

import { AppConfig } from '../../config/app-config';
import { JOBS, QUEUES } from '../../infra/queues/queues';
import { EmailService } from './email.service';

/** Email delivery worker (queue `emails`); runs only with JOBS_ENABLED=true. */
@Processor(QUEUES.EMAILS, { autorun: false, concurrency: 2 })
export class EmailProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly email: EmailService,
    private readonly config: AppConfig,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    if (this.config.env.JOBS_ENABLED) void this.worker.run();
  }

  async process(job: Job<{ notificationId: string }>): Promise<unknown> {
    if (job.name !== JOBS.EMAIL_NOTIFICATION) {
      this.logger.warn(`Unknown job ${job.name}`);
      return null;
    }
    return this.email.sendNotification(job.data.notificationId);
  }
}
