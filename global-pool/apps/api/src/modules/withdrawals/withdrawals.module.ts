import { Module } from '@nestjs/common';

import { DevWithdrawalsController, WithdrawalsController } from './withdrawals.controller';
import { WithdrawalPrecheckService } from './withdrawal-precheck.service';
import { WithdrawalsProcessor } from './withdrawals.processor';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  controllers: [WithdrawalsController, DevWithdrawalsController],
  providers: [WithdrawalsService, WithdrawalsProcessor, WithdrawalPrecheckService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
