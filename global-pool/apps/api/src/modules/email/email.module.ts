import { Global, Module } from '@nestjs/common';

import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

/** Outbound email adapter (console in dev, SMTP via env). Global so notifications can queue emails. */
@Global()
@Module({ providers: [EmailService, EmailProcessor], exports: [EmailService] })
export class EmailModule {}
