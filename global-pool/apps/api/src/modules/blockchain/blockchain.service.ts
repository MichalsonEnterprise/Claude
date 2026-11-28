import { Injectable, Logger } from '@nestjs/common';
import { CHAINS, CHAIN_DISPLAY_ORDER, type ChainKey } from '@gp/shared/chains';
import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

import { AppConfig } from '../../config/app-config';

/**
 * Read-only chain access (TESTNETS ONLY). The MVP chain is Arbitrum Sepolia (421614); other networks stay
 * "coming soon" in @gp/shared/chains and have no client here. No signing keys live in this module.
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
      chain: arbitrumSepolia,
      transport: http(rpc, { timeout: 15_000, retryCount: 2 }),
    }) as PublicClient;
    this.clients.set(network, client);
    return client;
  }

  /** Test-USDT contract for a network (env), or null when deposits are disabled. */
  tokenAddress(network: ChainKey): Address | null {
    if (network !== 'arbitrum') return null;
    return (this.config.env.TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA as Address | undefined) ?? null;
  }

  poolContract(): Address | null {
    return (this.config.env.POOL_CONTRACT_ADDRESS as Address | undefined) ?? null;
  }

  requiredConfirmations(network: ChainKey): number {
    return network === 'arbitrum' ? this.config.env.DEPOSIT_CONFIRMATIONS_ARBITRUM : CHAINS[network].confirmations;
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
        rpcConfigured: key === 'arbitrum' ? Boolean(this.config.env.ARBITRUM_SEPOLIA_RPC_URL) : false,
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
