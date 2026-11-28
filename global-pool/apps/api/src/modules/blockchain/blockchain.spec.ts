import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/app-config';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import { DepositChainWatcherService } from '../deposits/deposit-chain-watcher.service';
import type { DepositsService } from '../deposits/deposits.service';
import { BlockchainService } from './blockchain.service';
import { ChainUnavailableError } from './chain-errors';

const TOKEN = `0x${'aa'.repeat(20)}`;
const DEPOSIT_ADDRESS = `0x${'bb'.repeat(20)}`;

function chainWith(chainId: number) {
  const config = {
    env: {
      EVM_CHAIN_ID: 421_614,
      ARBITRUM_SEPOLIA_RPC_URL: 'http://rpc.invalid',
      TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA: TOKEN,
      DEPOSIT_CONFIRMATIONS_ARBITRUM: 20,
      DEPOSIT_WATCHER_MAX_BLOCK_RANGE: 5_000,
    },
  } as unknown as AppConfig;
  const client = {
    getChainId: vi.fn(() => Promise.resolve(chainId)),
    getBlockNumber: vi.fn(() => Promise.resolve(5_000n)),
    getLogs: vi.fn(() =>
      Promise.resolve([
        {
          args: { from: `0x${'cc'.repeat(20)}`, to: DEPOSIT_ADDRESS, value: 5_000_000_000n },
          transactionHash: `0x${'dd'.repeat(32)}`,
          logIndex: 0,
          blockNumber: 4_990n,
          blockHash: `0x${'ee'.repeat(32)}`,
        },
      ]),
    ),
    getTransactionReceipt: vi.fn(),
  };
  const blockchain = new BlockchainService(config);
  // Inject the fake RPC (as if ARBITRUM_SEPOLIA_RPC_URL pointed at it).
  (blockchain as unknown as { clients: Map<string, unknown> }).clients.set('arbitrum', client);
  return { blockchain, client, config };
}

describe('eth_chainId verification (R31)', () => {
  it('verifiedClient refuses an RPC that serves another chain (e.g. Arbitrum One 42161)', async () => {
    const { blockchain } = chainWith(42_161);
    await expect(blockchain.verifiedClient('arbitrum')).rejects.toBeInstanceOf(
      ChainUnavailableError,
    );
    // never cached as verified: still refused on the next call
    await expect(blockchain.verifiedClient('arbitrum')).rejects.toThrow(/serves chain 42161/);
  });

  it('verifiedClient returns the client when the RPC serves EVM_CHAIN_ID (checked once)', async () => {
    const { blockchain, client } = chainWith(421_614);
    await blockchain.verifiedClient('arbitrum');
    await blockchain.verifiedClient('arbitrum');
    expect(client.getChainId).toHaveBeenCalledTimes(1);
  });

  it('the deposit watcher skips (records nothing) when the RPC is not the configured testnet', async () => {
    const { blockchain, client, config } = chainWith(42_161);
    const recordDetected = vi.fn(() => Promise.resolve({ id: 'dep-1' }));
    const prisma = {
      deposit: {
        findMany: vi.fn(() => Promise.resolve([])),
        findFirst: vi.fn(() => Promise.resolve(null)),
      },
      chainCursor: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        upsert: vi.fn(() => Promise.resolve({})),
      },
      depositAddress: {
        findMany: vi.fn(() => Promise.resolve([{ address: DEPOSIT_ADDRESS, userId: 'user-1' }])),
      },
      tx: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({})),
    };
    const watcher = new DepositChainWatcherService(
      prisma as unknown as PrismaService,
      blockchain,
      { recordDetected } as unknown as DepositsService,
      config,
    );
    const res = await watcher.watch('arbitrum');
    expect(res.status).toBe('skipped');
    expect(res.reason).toMatch(/serves chain 42161/);
    expect(client.getLogs).not.toHaveBeenCalled();
    expect(recordDetected).not.toHaveBeenCalled();
  });
});
