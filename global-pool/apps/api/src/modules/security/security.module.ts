import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SecurityController } from './security.controller';
import { StepUpService } from './step-up.service';
import { TotpService } from './totp.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [SecurityController],
  providers: [TotpService, StepUpService],
  exports: [TotpService, StepUpService],
})
export class SecurityModule {}
