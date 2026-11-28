"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainlinkVrfProvider = exports.RandomnessNotReadyError = exports.DRAW_FULFILLED_EVENT = exports.DRAW_REQUESTED_EVENT = void 0;
const viem_1 = require("viem");
/** Events of GlobalPoolRounds (packages/contracts) the adapter reads. */
exports.DRAW_REQUESTED_EVENT = (0, viem_1.parseAbiItem)('event DrawRequested(uint256 indexed roundId, uint256 indexed requestId, uint32 attempt, bytes32 keyHash, uint256 subscriptionId, uint16 requestConfirmations, uint32 callbackGasLimit, bytes32 entriesMerkleRoot, uint64 totalEntries)');
exports.DRAW_FULFILLED_EVENT = (0, viem_1.parseAbiItem)('event DrawFulfilled(uint256 indexed roundId, uint256 indexed requestId, uint256 randomWord)');
class RandomnessNotReadyError extends Error {
    name = 'RandomnessNotReadyError';
}
exports.RandomnessNotReadyError = RandomnessNotReadyError;
/**
 * Chainlink VRF v2.5 adapter for the GlobalPoolRounds contract on Arbitrum Sepolia / local Anvil (read-only).
 * The contract's `requestDraw(roundId)` is permissionless once entries are committed; the round mirror's keeper
 * (RoundMirrorService) sends it. This adapter is the VRF fulfilment watcher: it reads `DrawRequested` /
 * `DrawFulfilled` events for the round and returns the stored VRF word once the event has the configured
 * confirmations. It never signs transactions.
 */
class ChainlinkVrfProvider {
    cfg;
    kind = 'chainlink_vrf_v2_5';
    constructor(cfg) {
        this.cfg = cfg;
    }
    ready() {
        if (!this.cfg.client || !this.cfg.poolContract) {
            throw new RandomnessNotReadyError('Chainlink VRF provider needs ARBITRUM_SEPOLIA_RPC_URL and POOL_CONTRACT_ADDRESS (pool contract not deployed yet)');
        }
        return { client: this.cfg.client, contract: this.cfg.poolContract };
    }
    async fromBlock(client) {
        if (this.cfg.fromBlock !== undefined)
            return this.cfg.fromBlock;
        const head = await client.getBlockNumber();
        return head > 50000n ? head - 50000n : 0n;
    }
    async request(round) {
        const { client, contract } = this.ready();
        const logs = await client.getLogs({
            address: contract,
            event: exports.DRAW_REQUESTED_EVENT,
            args: { roundId: round.onchainRoundId },
            fromBlock: await this.fromBlock(client),
            toBlock: 'latest',
        });
        const last = logs.at(-1);
        if (!last?.args.requestId) {
            throw new RandomnessNotReadyError(`No DrawRequested event for round ${round.roundNumber} yet (requestDraw not sent)`);
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
    async fulfillment(request) {
        const { client, contract } = this.ready();
        // Any request of the round: after a 24 h re-request, whichever outstanding request is fulfilled FIRST is final
        // (the contract stores exactly one word per round and ignores later callbacks).
        const logs = await client.getLogs({
            address: contract,
            event: exports.DRAW_FULFILLED_EVENT,
            args: { roundId: request.round.onchainRoundId },
            fromBlock: await this.fromBlock(client),
            toBlock: 'latest',
        });
        const log = logs[0];
        if (!log || log.args.randomWord === undefined || log.blockNumber === null)
            return null;
        const fulfilledRequestId = log.args.requestId?.toString();
        const head = await client.getBlockNumber();
        const confirmations = Number(head - log.blockNumber + 1n);
        if (confirmations < this.cfg.requestConfirmations)
            return null;
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        return {
            ...(fulfilledRequestId && fulfilledRequestId !== request.requestId
                ? { requestId: fulfilledRequestId }
                : {}),
            randomWord: (0, viem_1.toHex)(log.args.randomWord, { size: 32 }),
            fulfilledAt: new Date(Number(block.timestamp) * 1000),
            fulfillTxHash: log.transactionHash ?? null,
            blockNumber: log.blockNumber,
            confirmations,
        };
    }
}
exports.ChainlinkVrfProvider = ChainlinkVrfProvider;
//# sourceMappingURL=chainlink-vrf.provider.js.map