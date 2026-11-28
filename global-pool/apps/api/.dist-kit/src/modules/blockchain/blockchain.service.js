"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BlockchainService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const viem_1 = require("viem");
const app_config_1 = require("../../config/app-config");
const evm_chain_1 = require("./evm-chain");
/**
 * Read-only chain access (TESTNETS ONLY). The MVP chain is Arbitrum Sepolia (421614) — or a local Anvil devnet
 * (31337, dev / e2e) when EVM_CHAIN_ID says so; other networks stay "coming soon" in @gp/shared/chains and have no
 * client here. Signing lives in ChainSignerService (testnet keys from env, checked against eth_chainId).
 */
let BlockchainService = BlockchainService_1 = class BlockchainService {
    config;
    logger = new common_1.Logger(BlockchainService_1.name);
    clients = new Map();
    constructor(config) {
        this.config = config;
    }
    /** viem public client for an enabled testnet with a configured RPC, else null (callers skip gracefully). */
    client(network) {
        const cached = this.clients.get(network);
        if (cached)
            return cached;
        if (network !== 'arbitrum' || !chains_1.CHAINS.arbitrum.enabled)
            return null;
        const rpc = this.config.env.ARBITRUM_SEPOLIA_RPC_URL;
        if (!rpc)
            return null;
        const client = (0, viem_1.createPublicClient)({
            chain: this.chain(),
            transport: (0, viem_1.http)(rpc, { timeout: 15_000, retryCount: 2 }),
            pollingInterval: this.config.env.EVM_CHAIN_ID === 31_337 ? 250 : 4_000,
            // A cached head can only under-count confirmations; the local devnet mines on demand, so never cache there.
            ...(this.config.env.EVM_CHAIN_ID === 31_337 ? { cacheTime: 0 } : {}),
        });
        this.clients.set(network, client);
        return client;
    }
    /** viem chain for the configured EVM_CHAIN_ID (Arbitrum Sepolia or local Anvil). */
    chain() {
        return (0, evm_chain_1.evmChain)(this.config.env.EVM_CHAIN_ID);
    }
    get chainId() {
        return this.config.env.EVM_CHAIN_ID;
    }
    /** Test-USDT contract for a network (env), or null when deposits are disabled. */
    tokenAddress(network) {
        if (network !== 'arbitrum')
            return null;
        return this.config.env.TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA ?? null;
    }
    poolContract() {
        return this.config.env.POOL_CONTRACT_ADDRESS ?? null;
    }
    requiredConfirmations(network) {
        return network === 'arbitrum'
            ? this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM
            : chains_1.CHAINS[network].confirmations;
    }
    /** Configuration overview (no secrets). */
    status() {
        return chains_1.CHAIN_DISPLAY_ORDER.map((key) => {
            const chain = chains_1.CHAINS[key];
            return {
                network: key,
                name: chain.name,
                testnet: chain.testnet.name,
                chainId: chain.testnet.chainId,
                enabled: chain.enabled,
                status: chain.status,
                rpcConfigured: key === 'arbitrum' ? Boolean(this.config.env.ARBITRUM_SEPOLIA_RPC_URL) : false,
                tokenConfigured: Boolean(this.tokenAddress(key)),
                poolContractConfigured: key === 'arbitrum' ? Boolean(this.poolContract()) : false,
                confirmations: this.requiredConfirmations(key),
            };
        });
    }
    async headBlock(network) {
        const client = this.client(network);
        if (!client)
            return null;
        try {
            return await client.getBlockNumber();
        }
        catch (err) {
            this.logger.warn(`getBlockNumber(${network}) failed: ${String(err)}`);
            return null;
        }
    }
};
exports.BlockchainService = BlockchainService;
exports.BlockchainService = BlockchainService = BlockchainService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], BlockchainService);
//# sourceMappingURL=blockchain.service.js.map