import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MIN_AGE } from '@gp/shared/limits';

import type { GpRequest } from '../../common/request';
import { GeoService } from './geo.service';

@ApiTags('compliance')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly geo: GeoService) {}

  @Get('region')
  @ApiOperation({ summary: 'Is the platform available from the current location? (no bypass hints, by design)' })
  async region(@Req() req: GpRequest) {
    const check = await this.geo.checkRequest(req);
    return { ...check, minAge: MIN_AGE };
  }
}
