import { Module } from '@nestjs/common';

import { DemoDepositsService } from './demo-deposits.service';
import { DepositChainWatcherService } from './deposit-chain-watcher.service';
import { DepositAddressService } from './deposit-address.service';
import { DepositWatcherProcessor } from './deposit-watcher.processor';
import { DepositsController, DevDepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';

@Module({
  controllers: [DepositsController, DevDepositsController],
  providers: [
    DepositAddressService,
    DepositsService,
    DepositChainWatcherService,
    DepositWatcherProcessor,
    DemoDepositsService,
  ],
  exports: [DepositsService, DepositAddressService, DepositChainWatcherService],
})
export class DepositsModule {}
