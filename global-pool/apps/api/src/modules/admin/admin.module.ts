import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { AdminAuthService } from './admin-auth.service';
import { AdminConsoleController } from './admin-console.controller';
import { AdminConsoleService } from './admin-console.service';
import { AdminSecurityService } from './admin-security.service';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminAuthGuard, PermissionsGuard } from './admin.guards';
import { AdminService } from './admin.service';
import { FourEyesService } from './four-eyes.service';

@Module({
  imports: [JwtModule.register({}), WithdrawalsModule],
  controllers: [AdminAuthController, AdminController, AdminConsoleController],
  providers: [
    AdminAuthService,
    AdminSecurityService,
    AdminService,
    AdminConsoleService,
    FourEyesService,
    AdminAuthGuard,
    PermissionsGuard,
  ],
  // Exported so other back-office modules (e.g. admin-ops) can use the admin guards + MFA checks.
  exports: [AdminAuthService, AdminSecurityService, AdminAuthGuard, PermissionsGuard],
})
export class AdminModule {}
