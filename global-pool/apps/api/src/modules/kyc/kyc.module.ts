import { Global, Module } from '@nestjs/common';

import { DevKycController, KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Global()
@Module({
  controllers: [KycController, DevKycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
