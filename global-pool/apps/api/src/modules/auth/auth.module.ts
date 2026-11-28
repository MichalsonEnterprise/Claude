import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { AccountStatusController } from './account-status.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PlayerPolicyGuard, PrivyAuthGuard } from './guards';
import { PlayerIdentityService } from './player-identity.service';
import { PrivyService } from './privy.service';

/** Player auth (Privy / DEV MOCK). Global so every feature module can use @PlayerAuth() guards. */
@Global()
@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController, AccountStatusController],
  providers: [PrivyService, PlayerIdentityService, AuthService, PrivyAuthGuard, PlayerPolicyGuard],
  exports: [PrivyService, PlayerIdentityService, PrivyAuthGuard, PlayerPolicyGuard],
})
export class AuthModule {}
