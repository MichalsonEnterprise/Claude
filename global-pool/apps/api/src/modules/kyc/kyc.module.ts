import { Global, Module } from '@nestjs/common';

import { DevKycFlowController, KycFlowController } from './kyc-flow.controller';
import { KycFlowService } from './kyc-flow.service';
import { DevKycController, KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Global()
@Module({
  controllers: [KycController, DevKycController, KycFlowController, DevKycFlowController],
  providers: [KycService, KycFlowService],
  exports: [KycService, KycFlowService],
})
export class KycModule {}
