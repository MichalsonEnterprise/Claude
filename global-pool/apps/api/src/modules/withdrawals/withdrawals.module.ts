import { Module } from '@nestjs/common';

import { DevWithdrawalsController, WithdrawalsController } from './withdrawals.controller';
import { WithdrawalBroadcasterService } from './withdrawal-broadcaster.service';
import { WithdrawalPrecheckService } from './withdrawal-precheck.service';
import { WithdrawalsProcessor } from './withdrawals.processor';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  controllers: [WithdrawalsController, DevWithdrawalsController],
  providers: [
    WithdrawalsService,
    WithdrawalBroadcasterService,
    WithdrawalsProcessor,
    WithdrawalPrecheckService,
  ],
  exports: [WithdrawalsService, WithdrawalBroadcasterService],
})
export class WithdrawalsModule {}
