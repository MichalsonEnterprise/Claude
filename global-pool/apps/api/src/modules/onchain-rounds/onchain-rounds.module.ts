import { Global, Module } from '@nestjs/common';

import { RoundChainController } from './round-chain.controller';
import { RoundMirrorService } from './round-mirror.service';

/** On-chain mirroring of Global Pool rounds on GlobalPoolRounds (TESTNET ONLY; off unless POOL_ONCHAIN_MIRROR=true). */
@Global()
@Module({
  controllers: [RoundChainController],
  providers: [RoundMirrorService],
  exports: [RoundMirrorService],
})
export class OnchainRoundsModule {}
