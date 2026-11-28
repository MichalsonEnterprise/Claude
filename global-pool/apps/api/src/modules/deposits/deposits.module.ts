import { Module } from '@nestjs/common';

import { DemoDepositsService } from './demo-deposits.service';
import { DepositAddressService } from './deposit-address.service';
import { DepositWatcherProcessor } from './deposit-watcher.processor';
import { DepositsController, DevDepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';

@Module({
  controllers: [DepositsController, DevDepositsController],
  providers: [DepositAddressService, DepositsService, DepositWatcherProcessor, DemoDepositsService],
  exports: [DepositsService, DepositAddressService],
})
export class DepositsModule {}
