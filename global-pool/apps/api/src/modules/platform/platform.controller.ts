import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CHAINS, CHAIN_DISPLAY_ORDER, MVP_CHAIN_ID } from '@gp/shared/chains';
import {
  ENTRY_NETWORK_FEE,
  ENTRY_PRICE,
  MAX_ENTRIES_PER_PURCHASE,
  PLATFORM_FEE_PER_ENTRY,
  PLATFORM_WITHDRAWAL_FEE,
} from '@gp/shared/fees';
import {
  DAILY_WITHDRAWAL_LIMIT,
  MIN_AGE,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  NEW_ADDRESS_COOLDOWN_HOURS,
  RG_LIMIT_INCREASE_COOLDOWN_HOURS,
} from '@gp/shared/limits';
import { PRIZE_DISTRIBUTION, ROUND_THRESHOLDS } from '@gp/shared/pool';

import { AppConfig } from '../../config/app-config';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrivyService } from '../auth/privy.service';
import { RandomnessService } from '../randomness/randomness.service';

@ApiTags('platform')
@Controller('config')
export class PlatformController {
  constructor(
    private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
    private readonly privy: PrivyService,
    private readonly randomness: RandomnessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Public platform configuration: DEMO flags, chains, fees, limits, round rules',
  })
  publicConfig() {
    return {
      demoMode: this.config.env.DEMO_MODE,
      realMoneyEnabled: this.config.env.REAL_MONEY_ENABLED,
      chainEnv: this.config.env.CHAIN_ENV,
      mvpChainId: MVP_CHAIN_ID,
      playerAuth: this.privy.mode,
      randomnessProvider: this.randomness.provider.kind,
      chains: CHAIN_DISPLAY_ORDER.map((k) => CHAINS[k]),
      fees: {
        entryPrice: ENTRY_PRICE,
        platformFeePerEntry: PLATFORM_FEE_PER_ENTRY,
        entryNetworkFee: ENTRY_NETWORK_FEE,
        platformWithdrawalFee: PLATFORM_WITHDRAWAL_FEE,
        maxEntriesPerPurchase: MAX_ENTRIES_PER_PURCHASE,
      },
      limits: {
        minAge: MIN_AGE,
        minDeposit: MIN_DEPOSIT,
        minWithdrawal: MIN_WITHDRAWAL,
        dailyWithdrawalLimit: DAILY_WITHDRAWAL_LIMIT,
        newAddressCooldownHours: NEW_ADDRESS_COOLDOWN_HOURS,
        rgLimitIncreaseCooldownHours: RG_LIMIT_INCREASE_COOLDOWN_HOURS,
      },
      round: {
        thresholds: ROUND_THRESHOLDS,
        prizeDistribution: PRIZE_DISTRIBUTION,
        schedule: 'daily 08:00–20:00 UTC',
      },
    };
  }

  @Get('chains')
  @ApiOperation({ summary: 'Chain configuration status (testnets only; no secrets)' })
  chains() {
    return this.blockchain.status();
  }
}
