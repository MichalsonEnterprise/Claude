import { Injectable, Logger } from '@nestjs/common';
import type { RandomnessRequest, Round } from '@prisma/client';

import { toJson } from '../../common/money';
import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ChainlinkVrfProvider } from './chainlink-vrf.provider';
import { MockVrfProvider } from './mock-vrf.provider';
import type { RandomnessProvider, RandomnessRoundInfo } from './randomness.provider';

@Injectable()
export class RandomnessService {
  private readonly logger = new Logger(RandomnessService.name);
  readonly provider: RandomnessProvider;

  constructor(
    private readonly prisma: PrismaService,
    config: AppConfig,
    blockchain: BlockchainService,
  ) {
    if (config.env.RANDOMNESS_PROVIDER === 'chainlink') {
      this.provider = new ChainlinkVrfProvider({
        // eth_chainId is verified before every first read (never a mainnet RPC)
        client: blockchain.client('arbitrum') ? () => blockchain.verifiedClient('arbitrum') : null,
        poolContract: config.env.POOL_CONTRACT_ADDRESS ?? null,
        fromBlock: config.env.POOL_CONTRACT_START_BLOCK,
        requestConfirmations: config.env.VRF_FULFILLMENT_CONFIRMATIONS,
      });
    } else {
      if (config.isProduction)
        throw new Error('RANDOMNESS_PROVIDER=mock is not allowed in production');
      this.provider = new MockVrfProvider();
    }
  }

  info(round: Round): RandomnessRoundInfo {
    return {
      roundId: round.id,
      roundNumber: round.number,
      onchainRoundId: round.onchainRoundId ?? BigInt(round.number),
      totalEntries: round.entriesCount,
    };
  }

  /** Create the request (or return the open one). */
  async request(round: Round): Promise<RandomnessRequest> {
    const open = await this.prisma.randomnessRequest.findFirst({
      where: { roundId: round.id, status: { in: ['requested', 'fulfilled'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return open;
    const attempts = await this.prisma.randomnessRequest.count({ where: { roundId: round.id } });
    const res = await this.provider.request(this.info(round));
    return this.prisma.randomnessRequest.create({
      data: {
        roundId: round.id,
        provider: this.provider.kind,
        status: 'requested',
        requestId: res.requestId,
        attempt: attempts + 1,
        network: res.network,
        requestTxHash: res.requestTxHash,
        requestedAt: new Date(),
        metadata: toJson(res.metadata),
        isDemo: round.isDemo,
      },
    });
  }

  /** Poll the provider; persists the word once fulfilled. */
  async poll(round: Round, request: RandomnessRequest): Promise<RandomnessRequest> {
    if (request.status !== 'requested') return request;
    const f = await this.provider.fulfillment({
      requestId: request.requestId,
      round: this.info(round),
      requestedAt: request.requestedAt,
    });
    if (!f) return request;
    this.logger.log(`Round #${round.number}: randomness fulfilled (${this.provider.kind})`);
    if (f.requestId && f.requestId !== request.requestId) {
      // The contract stored the word of another request of this round (the contract's fulfilledRequestId is final).
      const earlier = await this.prisma.randomnessRequest.findFirst({
        where: { roundId: round.id, requestId: f.requestId },
      });
      await this.prisma.randomnessRequest.update({
        where: { id: request.id },
        data: {
          status: 'failed',
          failureReason: `superseded: request ${f.requestId} was fulfilled first`,
        },
      });
      if (!earlier)
        throw new Error(`Fulfilled VRF request ${f.requestId} is unknown to the database`);
      request = earlier;
    }
    return this.prisma.randomnessRequest.update({
      where: { id: request.id },
      data: {
        status: 'fulfilled',
        randomWord: f.randomWord,
        fulfilledAt: f.fulfilledAt,
        fulfillTxHash: f.fulfillTxHash,
        blockNumber: f.blockNumber,
        confirmations: f.confirmations,
      },
    });
  }

  fulfilledFor(roundId: string) {
    return this.prisma.randomnessRequest.findFirst({
      where: { roundId, status: 'fulfilled', randomWord: { not: null } },
      orderBy: { fulfilledAt: 'asc' },
    });
  }
}
