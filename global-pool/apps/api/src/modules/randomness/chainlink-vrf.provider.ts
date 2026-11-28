import { parseAbiItem, toHex, type Address, type PublicClient } from 'viem';

import type {
  RandomnessFulfillment,
  RandomnessProvider,
  RandomnessRequestResult,
  RandomnessRoundInfo,
} from './randomness.provider';

/** Events of GlobalPoolRounds (packages/contracts) the adapter reads. */
export const DRAW_REQUESTED_EVENT = parseAbiItem(
  'event DrawRequested(uint256 indexed roundId, uint256 indexed requestId, uint32 attempt, bytes32 keyHash, uint256 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, bytes32 entriesMerkleRoot, uint64 totalEntries)',
);
export const DRAW_FULFILLED_EVENT = parseAbiItem(
  'event DrawFulfilled(uint256 indexed roundId, uint256 indexed requestId, uint256 randomWord)',
);

export interface ChainlinkVrfConfig {
  client: PublicClient | null;
  poolContract: Address | null;
  /** First block to scan (contract deployment block); undefined = last ~50k blocks. */
  fromBlock?: bigint;
  requestConfirmations: number;
}

export class RandomnessNotReadyError extends Error {
  override readonly name = 'RandomnessNotReadyError';
}

/**
 * Chainlink VRF v2.5 adapter for the GlobalPoolRounds contract on Arbitrum Sepolia (read-only).
 * The contract's `requestDraw(roundId)` is permissionless once entries are committed; a keeper (later batch) sends
 * it. This adapter reads `DrawRequested` / `DrawFulfilled` events for the round and returns the stored VRF word.
 * It never signs transactions.
 */
export class ChainlinkVrfProvider implements RandomnessProvider {
  readonly kind = 'chainlink_vrf_v2_5' as const;

  constructor(private readonly cfg: ChainlinkVrfConfig) {}

  private ready(): { client: PublicClient; contract: Address } {
    if (!this.cfg.client || !this.cfg.poolContract) {
      throw new RandomnessNotReadyError(
        'Chainlink VRF provider needs ARBITRUM_SEPOLIA_RPC_URL and POOL_CONTRACT_ADDRESS (pool contract not deployed yet)',
      );
    }
    return { client: this.cfg.client, contract: this.cfg.poolContract };
  }

  private async fromBlock(client: PublicClient): Promise<bigint> {
    if (this.cfg.fromBlock !== undefined) return this.cfg.fromBlock;
    const head = await client.getBlockNumber();
    return head > 50_000n ? head - 50_000n : 0n;
  }

  async request(round: RandomnessRoundInfo): Promise<RandomnessRequestResult> {
    const { client, contract } = this.ready();
    const logs = await client.getLogs({
      address: contract,
      event: DRAW_REQUESTED_EVENT,
      args: { roundId: round.onchainRoundId },
      fromBlock: await this.fromBlock(client),
      toBlock: 'latest',
    });
    const last = logs.at(-1);
    if (!last?.args.requestId) {
      throw new RandomnessNotReadyError(
        `No DrawRequested event for round ${round.roundNumber} yet (requestDraw not sent)`,
      );
    }
    return {
      requestId: last.args.requestId.toString(),
      network: 'arbitrum',
      requestTxHash: last.transactionHash ?? null,
      metadata: {
        attempt: last.args.attempt,
        entriesMerkleRoot: last.args.entriesMerkleRoot,
        totalEntries: last.args.totalEntries?.toString(),
      },
    };
  }

  async fulfillment(request: {
    requestId: string;
    round: RandomnessRoundInfo;
  }): Promise<RandomnessFulfillment | null> {
    const { client, contract } = this.ready();
    const logs = await client.getLogs({
      address: contract,
      event: DRAW_FULFILLED_EVENT,
      args: { roundId: request.round.onchainRoundId, requestId: BigInt(request.requestId) },
      fromBlock: await this.fromBlock(client),
      toBlock: 'latest',
    });
    const log = logs[0];
    if (!log || log.args.randomWord === undefined || log.blockNumber === null) return null;
    const head = await client.getBlockNumber();
    const confirmations = Number(head - log.blockNumber + 1n);
    if (confirmations < this.cfg.requestConfirmations) return null;
    const block = await client.getBlock({ blockNumber: log.blockNumber });
    return {
      randomWord: toHex(log.args.randomWord, { size: 32 }),
      fulfilledAt: new Date(Number(block.timestamp) * 1000),
      fulfillTxHash: log.transactionHash ?? null,
      blockNumber: log.blockNumber,
      confirmations,
    };
  }
}
