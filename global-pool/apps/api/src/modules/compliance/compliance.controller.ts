import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MIN_AGE } from '@gp/shared/limits';
import { z } from 'zod';

import type { GpRequest } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { GeoService } from './geo.service';

class GeoQueryDto extends createZodDto(
  z.object({
    declared: z
      .string()
      .regex(/^[A-Za-z]{2}$/, { error: 'Use a 2-letter country code' })
      .transform((v) => v.toUpperCase())
      .optional()
      .describe('Optional declared country of residence (ISO 3166-1 alpha-2) to check as well'),
  }),
) {}

@ApiTags('compliance')
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly geo: GeoService) {}

  @Get('region')
  @ApiOperation({
    summary: 'Is the platform available from the current location? (no bypass hints, by design)',
  })
  async region(@Req() req: GpRequest) {
    const check = await this.geo.checkRequest(req);
    return { ...check, minAge: MIN_AGE };
  }

  /**
   * PUB-21 / PUB-22 / ERR-05: the geo decision the web gate shows before any gaming or financial page. Same rules
   * as the server-side enforcement (geo_rules + RESTRICTED_COUNTRIES; CDN header only with TRUST_PROXY=true;
   * fail-closed in production when the location is unknown). Public and read-only.
   */
  @Get('geo')
  @ApiOperation({
    summary:
      'Geo decision for the current request (permitted / restricted), optional declared-country check, what stays available — no bypass hints',
  })
  geoDecision(@Req() req: GpRequest, @Query() query: GeoQueryDto) {
    return this.geo.decide(req, query.declared ?? null);
  }
}
