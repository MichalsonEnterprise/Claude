import { Module } from '@nestjs/common';

import { DevWithdrawalsController, WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsProcessor } from './withdrawals.processor';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  controllers: [WithdrawalsController, DevWithdrawalsController],
  providers: [WithdrawalsService, WithdrawalsProcessor],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
