import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Deposit } from '@prisma/client';
import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { fromBaseUnits, toUSDTString } from '@gp/shared/money';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';
import { parseAbiItem, type Address, type Hex } from 'viem';
import { randomBytes } from 'node:crypto';

import { usdt } from '../../common/money';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import { depositCreditedLines, depositDetectedLines } from '../ledger/posting';
import { NotificationsService } from '../notifications/notifications.service';
import { AppConfig } from '../../config/app-config';
import { DepositAddressService } from './deposit-address.service';

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const ADDRESS_CHUNK = 200;

export interface DetectedTransfer {
  network: ChainKey;
  userId: string;
  txHash: string;
  logIndex: number;
  blockNumber: bigint | null;
  from: string | null;
  to: string;
  tokenAddress: string | null;
  /** USDT amount (decimal string, ≤ 6 dp). */
  amount: string;
  isDemo?: boolean;
}

export interface WatchResult {
  status: 'ok' | 'skipped';
  reason?: string;
  fromBlock?: string;
  toBlock?: string;
  detected?: number;
  credited?: number;
}

/**
 * Hybrid custody deposits: per-user addresses (HD), on-chain detection (test-USDT Transfer logs), confirmation
 * tracking, then ledger CHAIN_CLEARING → PENDING (detected) → AVAILABLE (after N confirmations).
 * The chain is the authority; the ledger mirrors it and is reconciled against it.
 */
@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly blockchain: BlockchainService,
    private readonly notifications: NotificationsService,
    private readonly addresses: DepositAddressService,
    private readonly rg: ResponsibleGamingService,
    private readonly idempotency: IdempotencyService,
    private readonly config: AppConfig,
  ) {}

  async list(userId: string, query: PaginationQuery) {
    const [rows, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.deposit.count({ where: { userId } }),
    ]);
    return paginate(rows.map((d) => this.view(d)), total, query);
  }

  view(d: Deposit) {
    return {
      id: d.id,
      reference: `DP-${d.number}`,
      network: d.network,
      status: d.status,
      amount: usdt(d.amount),
      txHash: d.txHash,
      toAddress: d.toAddress,
      confirmations: { current: d.confirmations, required: d.requiredConfirmations },
      detectedAt: d.detectedAt.toISOString(),
      creditedAt: d.creditedAt?.toISOString() ?? null,
      isDemo: d.isDemo,
    };
  }

  /** Record a detected transfer (idempotent on network + txHash + logIndex) and post CHAIN_CLEARING → PENDING. */
  async recordDetected(tx: Tx, t: DetectedTransfer): Promise<Deposit | null> {
    const required = this.blockchain.requiredConfirmations(t.network);
    const inserted = await tx.deposit.createMany({
      data: [
        {
          userId: t.userId,
          network: t.network,
          tokenAddress: t.tokenAddress,
          txHash: t.txHash,
          logIndex: t.logIndex,
          blockNumber: t.blockNumber,
          fromAddress: t.from,
          toAddress: t.to,
          amount: t.amount,
          amountOnchain: t.amount,
          confirmations: 0,
          requiredConfirmations: required,
          status: 'confirming',
          isDemo: t.isDemo ?? false,
        },
      ],
      skipDuplicates: true,
    });
    if (inserted.count === 0) return null;
    const deposit = await tx.deposit.findUniqueOrThrow({
      where: { network_txHash_logIndex: { network: t.network, txHash: t.txHash, logIndex: t.logIndex } },
    });
    const reference = `DP-${deposit.number}`;
    const record = await tx.transaction.create({
      data: {
        userId: t.userId,
        type: 'deposit',
        status: 'confirming',
        reference,
        amount: t.amount,
        platformFee: '0',
        netAmount: t.amount,
        direction: 'in',
        network: t.network,
        txHash: t.txHash,
        description: `Deposit · ${CHAINS[t.network].name}`,
        depositId: deposit.id,
        isDemo: t.isDemo ?? false,
        metadata: { statusDetail: `0 / ${required} confirmations` },
      },
    });
    await this.ledger.post(tx, {
      kind: 'deposit_detected',
      description: `${reference} detected on ${CHAINS[t.network].testnet.name}`,
      reference,
      eventKey: `deposit:${deposit.id}:detected`,
      transactionId: record.id,
      lines: depositDetectedLines(t.userId, t.network, t.amount),
      isDemo: t.isDemo ?? false,
      metadata: { txHash: t.txHash, logIndex: t.logIndex },
    });
    await this.notifications.notify(tx, {
      userId: t.userId,
      type: 'deposit.detected',
      title: 'Deposit detected',
      body: `${toUSDTString(t.amount)} USDT detected — waiting for ${required} confirmations.`,
      data: { reference },
      isDemo: t.isDemo ?? false,
    });
    return deposit;
  }

  /** PENDING → AVAILABLE once confirmations are reached (idempotent via the posting event key). */
  async credit(tx: Tx, deposit: Deposit, confirmations: number): Promise<boolean> {
    const claimed = await tx.deposit.updateMany({
      where: { id: deposit.id, status: { in: ['detected', 'confirming'] } },
      data: { status: 'credited', confirmations, creditedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    const reference = `DP-${deposit.number}`;
    const record = await tx.transaction.findFirst({ where: { depositId: deposit.id } });
    await this.ledger.post(tx, {
      kind: 'deposit_credited',
      description: `${reference} credited after ${confirmations} confirmations`,
      reference,
      eventKey: `deposit:${deposit.id}:credited`,
      transactionId: record?.id ?? null,
      lines: depositCreditedLines(deposit.userId, deposit.amount.toFixed()),
      isDemo: deposit.isDemo,
    });
    if (record) {
      await tx.transaction.update({
        where: { id: record.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: { statusDetail: `Credited · ${confirmations} / ${deposit.requiredConfirmations} confirmations` },
        },
      });
    }
    await this.notifications.notify(tx, {
      userId: deposit.userId,
      type: 'deposit.credited',
      title: 'Deposit credited',
      body: `${usdt(deposit.amount)} USDT is now available.`,
      data: { reference },
      isDemo: deposit.isDemo,
    });
    return true;
  }

  /**
   * DEMO-only: simulate a confirmed test-USDT deposit. Posts exactly the same ledger entries as a real deposit
   * (detected → credited) so balances and reconciliation behave identically.
   */
  async simulate(userId: string, input: { network: ChainKey; amount: string; idempotencyKey: string }) {
    return this.idempotency.run(
      { scope: 'deposit.simulate', ownerId: userId, key: input.idempotencyKey, request: input },
      async (tx) => {
        await this.rg.assertCanDeposit(userId, input.amount, tx);
        const address = await this.addresses.forUser(userId, input.network);
        const txHash = `0x${randomBytes(32).toString('hex')}`;
        const deposit = await this.recordDetected(tx, {
          network: input.network,
          userId,
          txHash,
          logIndex: 0,
          blockNumber: null,
          from: null,
          to: address.address.toLowerCase(),
          tokenAddress: null,
          amount: toUSDTString(input.amount),
          isDemo: true,
        });
        const required = this.blockchain.requiredConfirmations(input.network);
        await this.credit(tx, deposit!, required);
        const fresh = await tx.deposit.findUniqueOrThrow({ where: { id: deposit!.id } });
        return { ...this.view(fresh), simulated: true } as Prisma.InputJsonObject;
      },
    );
  }

  /** One watcher pass: scan new Transfer logs to assigned addresses, then update confirmations / credit. */
  async watch(network: ChainKey = 'arbitrum'): Promise<WatchResult> {
    const client = this.blockchain.client(network);
    const token = this.blockchain.tokenAddress(network);
    if (!client) return { status: 'skipped', reason: 'RPC not configured' };
    if (!token) return { status: 'skipped', reason: 'test-USDT address not configured' };
    let head: bigint;
    try {
      head = await client.getBlockNumber();
    } catch (err) {
      return { status: 'skipped', reason: `RPC unavailable: ${String(err)}` };
    }
    const cursorKey = `deposits:${network}:${token.toLowerCase()}`;
    const cursor = await this.prisma.chainCursor.findUnique({ where: { key: cursorKey } });
    const start =
      cursor !== null
        ? cursor.lastBlock + 1n
        : (this.config.env.DEPOSIT_WATCHER_START_BLOCK ?? (head > 1000n ? head - 1000n : 0n));
    const end = minBig(head, start + BigInt(this.config.env.DEPOSIT_WATCHER_MAX_BLOCK_RANGE) - 1n);
    let detected = 0;
    if (start <= end) {
      const assigned = await this.prisma.depositAddress.findMany({ where: { network }, select: { address: true, userId: true } });
      const owner = new Map(assigned.map((a) => [a.address.toLowerCase(), a.userId]));
      const addresses = [...owner.keys()] as Address[];
      for (let i = 0; i < addresses.length; i += ADDRESS_CHUNK) {
        let logs;
        try {
          logs = await client.getLogs({
            address: token,
            event: TRANSFER_EVENT,
            args: { to: addresses.slice(i, i + ADDRESS_CHUNK) },
            fromBlock: start,
            toBlock: end,
          });
        } catch (err) {
          this.logger.warn(`getLogs ${start}-${end} failed: ${String(err)}`);
          return { status: 'skipped', reason: 'RPC getLogs failed (will retry from the same block)' };
        }
        for (const log of logs) {
          const to = log.args.to?.toLowerCase();
          const userId = to ? owner.get(to) : undefined;
          if (!to || !userId || log.args.value === undefined || !log.transactionHash) continue;
          const amount = toUSDTString(fromBaseUnits(log.args.value, CHAINS[network].usdtDecimals));
          if (amount === '0.00') continue;
          const created = await this.prisma.tx((tx) =>
            this.recordDetected(tx, {
              network,
              userId,
              txHash: log.transactionHash as Hex,
              logIndex: log.logIndex ?? 0,
              blockNumber: log.blockNumber ?? null,
              from: log.args.from?.toLowerCase() ?? null,
              to,
              tokenAddress: token.toLowerCase(),
              amount,
            }),
          );
          if (created) detected++;
        }
      }
      await this.prisma.chainCursor.upsert({
        where: { key: cursorKey },
        create: { key: cursorKey, lastBlock: end },
        update: { lastBlock: end },
      });
    }
    const credited = await this.updateConfirmations(network, head);
    return { status: 'ok', fromBlock: start.toString(), toBlock: end.toString(), detected, credited };
  }

  async updateConfirmations(network: ChainKey, head: bigint): Promise<number> {
    const open = await this.prisma.deposit.findMany({
      where: { network, status: { in: ['detected', 'confirming'] }, blockNumber: { not: null }, isDemo: false },
    });
    let credited = 0;
    for (const d of open) {
      const conf = Number(head - d.blockNumber! + 1n);
      if (conf >= d.requiredConfirmations) {
        if (await this.prisma.tx((tx) => this.credit(tx, d, conf))) credited++;
      } else if (conf !== d.confirmations) {
        await this.prisma.deposit.update({ where: { id: d.id }, data: { confirmations: Math.max(conf, 0) } });
        await this.prisma.transaction.updateMany({
          where: { depositId: d.id },
          data: { metadata: { statusDetail: `${Math.max(conf, 0)} / ${d.requiredConfirmations} confirmations` } },
        });
      }
    }
    return credited;
  }
}

const minBig = (a: bigint, b: bigint) => (a < b ? a : b);
