import { RoundStatus as OnchainStatus, globalPoolRoundsAbi } from '@gp/contracts/abi';
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
  /** Public client getter that verifies eth_chainId (BlockchainService.verifiedClient); null = no RPC configured. */
  client: (() => Promise<PublicClient>) | null;
  poolContract: Address | null;
  /**
   * First block for the (best-effort) event scans that find tx hashes (contract deployment block); undefined = last
   * ~50k blocks. The draw itself never depends on this window: request id and VRF word are read from getRound().
   */
  fromBlock?: bigint;
  /** Confirmations a DrawFulfilled event needs before its word is used (VRF_FULFILLMENT_CONFIRMATIONS). */
  requestConfirmations: number;
}

export class RandomnessNotReadyError extends Error {
  override readonly name = 'RandomnessNotReadyError';
}

/**
 * Chainlink VRF v2.5 adapter for the GlobalPoolRounds contract on Arbitrum Sepolia / local Anvil (read-only).
 * The contract's `requestDraw(roundId)` is permissionless once entries are committed; the round mirror's keeper
 * (RoundMirrorService) sends it ONCE. This adapter is the VRF fulfilment watcher: it reads the round's request id
 * and stored VRF word from `getRound()` (contract storage, at a block with the configured confirmations); events are
 * only used for tx hashes. It never signs transactions.
 */
export class ChainlinkVrfProvider implements RandomnessProvider {
  readonly kind = 'chainlink_vrf_v2_5' as const;

  constructor(private readonly cfg: ChainlinkVrfConfig) {}

  private async ready(): Promise<{ client: PublicClient; contract: Address }> {
    if (!this.cfg.client || !this.cfg.poolContract) {
      throw new RandomnessNotReadyError(
        'Chainlink VRF provider needs ARBITRUM_SEPOLIA_RPC_URL and POOL_CONTRACT_ADDRESS (pool contract not deployed yet)',
      );
    }
    return { client: await this.cfg.client(), contract: this.cfg.poolContract };
  }

  private async fromBlock(client: PublicClient): Promise<bigint> {
    if (this.cfg.fromBlock !== undefined) return this.cfg.fromBlock;
    const head = await client.getBlockNumber();
    return head > 50_000n ? head - 50_000n : 0n;
  }

  private readRound(
    client: PublicClient,
    contract: Address,
    roundId: bigint,
    blockNumber?: bigint,
  ) {
    return client.readContract({
      address: contract,
      abi: globalPoolRoundsAbi,
      functionName: 'getRound',
      args: [roundId],
      ...(blockNumber !== undefined ? { blockNumber } : {}),
    });
  }

  /** DrawRequested / DrawFulfilled logs of the round in the scan window; [] when the RPC refuses the range. */
  private async requestedLogs(client: PublicClient, contract: Address, roundId: bigint) {
    try {
      return await client.getLogs({
        address: contract,
        event: DRAW_REQUESTED_EVENT,
        args: { roundId },
        fromBlock: await this.fromBlock(client),
        toBlock: 'latest',
      });
    } catch {
      return [];
    }
  }

  private async fulfilledLogs(client: PublicClient, contract: Address, roundId: bigint) {
    try {
      return await client.getLogs({
        address: contract,
        event: DRAW_FULFILLED_EVENT,
        args: { roundId },
        fromBlock: await this.fromBlock(client),
        toBlock: 'latest',
      });
    } catch {
      return [];
    }
  }

  async request(round: RandomnessRoundInfo): Promise<RandomnessRequestResult> {
    const { client, contract } = await this.ready();
    const last = (await this.requestedLogs(client, contract, round.onchainRoundId)).at(-1);
    if (last?.args.requestId) {
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
    // The event may be older than the scan window: the contract state is the authority for the request id.
    const state = await this.readRound(client, contract, round.onchainRoundId);
    const requested =
      state.status === OnchainStatus.DrawRequested ||
      state.status === OnchainStatus.Fulfilled ||
      state.status === OnchainStatus.Settled;
    if (!requested || state.lastRequestId === 0n) {
      throw new RandomnessNotReadyError(
        `No DrawRequested for round ${round.roundNumber} yet (requestDraw not sent)`,
      );
    }
    return {
      requestId: state.lastRequestId.toString(),
      network: 'arbitrum',
      requestTxHash: null,
      metadata: {
        attempt: state.drawAttempts,
        entriesMerkleRoot: state.entriesRoot,
        totalEntries: state.totalEntries.toString(),
        source: 'getRound',
      },
    };
  }

  async fulfillment(request: {
    requestId: string;
    round: RandomnessRoundInfo;
  }): Promise<RandomnessFulfillment | null> {
    const { client, contract } = await this.ready();
    // The VRF word is read from CONTRACT STORAGE at a block that already has the required confirmations — never from
    // a bounded log scan, so a watcher outage of any length cannot leave a fulfilled round in 'drawing' forever.
    const head = await client.getBlockNumber();
    const depth = BigInt(Math.max(1, this.cfg.requestConfirmations));
    const confirmedAt = head + 1n > depth ? head + 1n - depth : 0n;
    const state = await this.readRound(client, contract, request.round.onchainRoundId, confirmedAt);
    if (state.status !== OnchainStatus.Fulfilled && state.status !== OnchainStatus.Settled)
      return null;
    const fulfilledRequestId = state.fulfilledRequestId.toString();
    // Tx hash / block of the fulfilment for display only (best effort within the scan window).
    const log = (await this.fulfilledLogs(client, contract, request.round.onchainRoundId))[0];
    const blockNumber = log?.blockNumber ?? null;
    return {
      ...(fulfilledRequestId !== request.requestId ? { requestId: fulfilledRequestId } : {}),
      randomWord: toHex(state.randomWord, { size: 32 }),
      fulfilledAt: new Date(Number(state.fulfilledAt) * 1000),
      fulfillTxHash: log?.transactionHash ?? null,
      blockNumber,
      confirmations: blockNumber !== null ? Number(head - blockNumber + 1n) : Number(depth),
    };
  }
}
