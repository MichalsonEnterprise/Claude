import { Injectable, Logger } from '@nestjs/common';
import { CHAINS, CHAIN_DISPLAY_ORDER, type ChainKey } from '@gp/shared/chains';
import { createPublicClient, http, type Address, type Chain, type PublicClient } from 'viem';

import { AppConfig } from '../../config/app-config';
import { evmChain } from './evm-chain';

/**
 * Read-only chain access (TESTNETS ONLY). The MVP chain is Arbitrum Sepolia (421614) — or a local Anvil devnet
 * (31337, dev / e2e) when EVM_CHAIN_ID says so; other networks stay "coming soon" in @gp/shared/chains and have no
 * client here. Signing lives in ChainSignerService (testnet keys from env, checked against eth_chainId).
 */
@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly clients = new Map<ChainKey, PublicClient>();

  constructor(private readonly config: AppConfig) {}

  /** viem public client for an enabled testnet with a configured RPC, else null (callers skip gracefully). */
  client(network: ChainKey): PublicClient | null {
    const cached = this.clients.get(network);
    if (cached) return cached;
    if (network !== 'arbitrum' || !CHAINS.arbitrum.enabled) return null;
    const rpc = this.config.env.ARBITRUM_SEPOLIA_RPC_URL;
    if (!rpc) return null;
    const client = createPublicClient({
      chain: this.chain(),
      transport: http(rpc, { timeout: 15_000, retryCount: 2 }),
      pollingInterval: this.config.env.EVM_CHAIN_ID === 31_337 ? 250 : 4_000,
      // A cached head can only under-count confirmations; the local devnet mines on demand, so never cache there.
      ...(this.config.env.EVM_CHAIN_ID === 31_337 ? { cacheTime: 0 } : {}),
    }) as PublicClient;
    this.clients.set(network, client);
    return client;
  }

  /** viem chain for the configured EVM_CHAIN_ID (Arbitrum Sepolia or local Anvil). */
  chain(): Chain {
    return evmChain(this.config.env.EVM_CHAIN_ID);
  }

  get chainId(): number {
    return this.config.env.EVM_CHAIN_ID;
  }

  /** Test-USDT contract for a network (env), or null when deposits are disabled. */
  tokenAddress(network: ChainKey): Address | null {
    if (network !== 'arbitrum') return null;
    return this.config.env.TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA ?? null;
  }

  poolContract(): Address | null {
    return this.config.env.POOL_CONTRACT_ADDRESS ?? null;
  }

  requiredConfirmations(network: ChainKey): number {
    return network === 'arbitrum'
      ? this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM
      : CHAINS[network].confirmations;
  }

  /** Configuration overview (no secrets). */
  status() {
    return CHAIN_DISPLAY_ORDER.map((key) => {
      const chain = CHAINS[key];
      return {
        network: key,
        name: chain.name,
        testnet: chain.testnet.name,
        chainId: chain.testnet.chainId,
        enabled: chain.enabled,
        status: chain.status,
        rpcConfigured:
          key === 'arbitrum' ? Boolean(this.config.env.ARBITRUM_SEPOLIA_RPC_URL) : false,
        tokenConfigured: Boolean(this.tokenAddress(key)),
        poolContractConfigured: key === 'arbitrum' ? Boolean(this.poolContract()) : false,
        confirmations: this.requiredConfirmations(key),
      };
    });
  }

  async headBlock(network: ChainKey): Promise<bigint | null> {
    const client = this.client(network);
    if (!client) return null;
    try {
      return await client.getBlockNumber();
    } catch (err) {
      this.logger.warn(`getBlockNumber(${network}) failed: ${String(err)}`);
      return null;
    }
  }
}
