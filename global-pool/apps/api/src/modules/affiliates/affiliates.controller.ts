import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from '../../common/request';
import { PlayerAuth } from '../auth/guards';
import { AffiliatesService } from './affiliates.service';

@ApiTags('referrals')
@PlayerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly affiliates: AffiliatesService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Your referral code / link and stats (STUB — accrual not implemented yet)',
  })
  me(@CurrentUser() user: AuthUser) {
    return this.affiliates.myReferrals(user.id);
  }
}
