import type { ChainTransaction } from '@prisma/client';
import { TransactionReceiptNotFoundError, type Hex } from 'viem';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/app-config';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { BlockchainService } from './blockchain.service';
import { ChainSignerService } from './chain-signer.service';

const HASH: Hex = `0x${'ab'.repeat(32)}`;
const FROM = `0x${'11'.repeat(20)}`;

function outboxRow(over: Partial<ChainTransaction> = {}): ChainTransaction {
  const row: ChainTransaction = {
    id: 'tx-1',
    chainId: 421_614,
    fromAddress: FROM,
    nonce: 7,
    toAddress: `0x${'22'.repeat(20)}`,
    purpose: 'withdrawal',
    refId: 'wd-1',
    txHash: HASH,
    rawTx: '0x00',
    status: 'broadcast',
    gasLimit: '100000',
    maxFeePerGas: '1',
    gasUsed: null,
    blockNumber: null,
    blockHash: null,
    broadcastAttempts: 1,
    lastBroadcastAt: new Date(),
    minedAt: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { ...row, ...over };
}

interface FakeChain {
  head: bigint;
  /** Receipts returned by successive getTransactionReceipt calls (null = not found). */
  receipts: ({ blockNumber: bigint; status: 'success' | 'reverted' } | null)[];
  /** Nonce (transaction count) of the sender at a block (undefined blockNumber = latest). */
  nonceAt: (blockNumber: bigint | undefined) => number;
}

function signerWith(chain: FakeChain) {
  const nonceCalls: (bigint | string | undefined)[] = [];
  const client = {
    getChainId: vi.fn(() => Promise.resolve(421_614)),
    getBlockNumber: vi.fn(() => Promise.resolve(chain.head)),
    getTransactionReceipt: vi.fn(() => {
      const next = chain.receipts.length > 1 ? chain.receipts.shift()! : chain.receipts[0]!;
      if (!next) return Promise.reject(new TransactionReceiptNotFoundError({ hash: HASH }));
      return Promise.resolve({
        blockNumber: next.blockNumber,
        blockHash: `0x${'cd'.repeat(32)}`,
        status: next.status,
        gasUsed: 21_000n,
      });
    }),
    getTransactionCount: vi.fn(
      (args: { address: string; blockTag?: string; blockNumber?: bigint }) => {
        nonceCalls.push(args.blockNumber ?? args.blockTag);
        return Promise.resolve(chain.nonceAt(args.blockNumber));
      },
    ),
    sendRawTransaction: vi.fn(() => Promise.resolve(HASH)),
  };
  const prisma = {
    chainTransaction: {
      update: vi.fn(({ data }: { data: Partial<ChainTransaction> }) =>
        Promise.resolve({ ...outboxRow(), ...data }),
      ),
    },
  };
  const config = { env: { CHAIN_REBROADCAST_SECONDS: 120 } };
  const blockchain = {
    client: () => client,
    verifiedClient: () => Promise.resolve(client),
    chainId: 421_614,
  };
  const signer = new ChainSignerService(
    prisma as unknown as PrismaService,
    config as unknown as AppConfig,
    blockchain as unknown as BlockchainService,
  );
  return { signer, client, prisma, nonceCalls };
}

describe('ChainSignerService.track — dropped detection (R01)', () => {
  it('a transfer mined right after the receipt lookup is NOT dropped (nonce used, receipt appears on re-check)', async () => {
    // 1st lookup: not found (mempool / lagging node); the tx is mined in the next block → nonce n+1 everywhere.
    const { signer, prisma } = signerWith({
      head: 1_000n,
      receipts: [null, { blockNumber: 1_000n, status: 'success' }],
      nonceAt: () => 8,
    });
    const res = await signer.track(outboxRow(), 20);
    expect(res.state).toBe('pending');
    expect(res.confirmations).toBe(1);
    expect(prisma.chainTransaction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'dropped' }) }),
    );
  });

  it('a nonce used only near the head (fewer than `confirmations` blocks deep) stays pending', async () => {
    const { signer, nonceCalls } = signerWith({
      head: 1_000n,
      receipts: [null],
      // consumed at block 995: visible at latest, not at head − 20 + 1 = 981
      nonceAt: (b) => (b === undefined || b >= 995n ? 8 : 7),
    });
    const res = await signer.track(outboxRow(), 20);
    expect(res.state).toBe('pending');
    expect(nonceCalls).toContain(981n);
  });

  it('dropped only once the nonce is consumed ≥ confirmations deep and the receipt is still missing', async () => {
    const { signer, prisma, client } = signerWith({
      head: 1_000n,
      receipts: [null],
      nonceAt: () => 8,
    });
    const res = await signer.track(outboxRow(), 20);
    expect(res.state).toBe('dropped');
    expect(client.getTransactionReceipt).toHaveBeenCalledTimes(2);
    expect(prisma.chainTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'dropped' }) }),
    );
  });

  it('a receipt with enough confirmations resolves mined / reverted as before', async () => {
    const mined = signerWith({
      head: 1_000n,
      receipts: [{ blockNumber: 980n, status: 'success' }],
      nonceAt: () => 8,
    });
    expect((await mined.signer.track(outboxRow(), 20)).state).toBe('mined');
    const reverted = signerWith({
      head: 1_000n,
      receipts: [{ blockNumber: 980n, status: 'reverted' }],
      nonceAt: () => 8,
    });
    expect((await reverted.signer.track(outboxRow(), 20)).state).toBe('reverted');
  });
});
