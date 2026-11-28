import { Global, Module } from '@nestjs/common';

import { BlockchainService } from './blockchain.service';
import { ChainSignerService } from './chain-signer.service';

@Global()
@Module({
  providers: [BlockchainService, ChainSignerService],
  exports: [BlockchainService, ChainSignerService],
})
export class BlockchainModule {}
