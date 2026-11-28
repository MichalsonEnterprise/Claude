import { Global, Module } from '@nestjs/common';

import { ReportingService } from './reporting.service';

@Global()
@Module({ providers: [ReportingService], exports: [ReportingService] })
export class ReportingModule {}
