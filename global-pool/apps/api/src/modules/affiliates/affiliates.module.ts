import { Global, Module } from '@nestjs/common';

import { ReferralsController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';

@Global()
@Module({
  controllers: [ReferralsController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
