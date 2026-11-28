import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { PoolModule } from '../pool/pool.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { AdminComplianceService } from './admin-compliance.service';
import { AdminExportsService } from './admin-exports.service';
import { AdminFinanceService } from './admin-finance.service';
import {
  AdminComplianceController,
  AdminFinanceController,
  AdminPoolController,
} from './admin-ops.controller';
import { AdminPoolService } from './admin-pool.service';

/**
 * Back-office module for Finance (ADM-F1…F9), Global Pool monitoring (ADM-P1…P10) and Compliance (ADM-C1, C2).
 * Uses the admin guards (bearer + RBAC) exported by AdminModule.
 */
@Module({
  imports: [AdminModule, WithdrawalsModule, PoolModule],
  controllers: [AdminFinanceController, AdminPoolController, AdminComplianceController],
  providers: [AdminFinanceService, AdminPoolService, AdminComplianceService, AdminExportsService],
})
export class AdminOpsModule {}
