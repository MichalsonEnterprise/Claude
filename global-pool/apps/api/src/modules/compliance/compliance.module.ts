import { Global, Module } from '@nestjs/common';

import { ComplianceController } from './compliance.controller';
import { GeoService } from './geo.service';
import { ResponsibleGamingController } from './responsible-gaming.controller';
import { ResponsibleGamingService } from './responsible-gaming.service';
import { RestrictionsService } from './restrictions.service';

@Global()
@Module({
  controllers: [ComplianceController, ResponsibleGamingController],
  providers: [GeoService, RestrictionsService, ResponsibleGamingService],
  exports: [GeoService, RestrictionsService, ResponsibleGamingService],
})
export class ComplianceModule {}
