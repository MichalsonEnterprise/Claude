import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { AdminAuthService } from './admin-auth.service';
import { AdminSecurityService } from './admin-security.service';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminAuthGuard, PermissionsGuard } from './admin.guards';
import { AdminService } from './admin.service';

@Module({
  imports: [JwtModule.register({}), WithdrawalsModule],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminAuthService,
    AdminSecurityService,
    AdminService,
    AdminAuthGuard,
    PermissionsGuard,
  ],
})
export class AdminModule {}
