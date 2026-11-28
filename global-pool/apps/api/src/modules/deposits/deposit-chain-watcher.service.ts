import { Injectable, Logger } from '@nestjs/common';
import type { Deposit } from '@prisma/client';
import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { fromBaseUnits, toUSDTString } from '@gp/shared/money';
import {
  TransactionReceiptNotFoundError,
  decodeEventLog,
  parseAbiItem,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from 'viem';

import { AppConfig } from '../../config/app-config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { errorSummary } from '../blockchain/chain-errors';
import { DepositsService } from './deposits.service';

export const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);
const ADDRESS_CHUNK = 200;

export interface WatchResult {
  status: 'ok' | 'skipped';
  reason?: string;
  fromBlock?: string;
  toBlock?: string;
  detected?: number;
  credited?: number;
  /** Deposits whose transaction is (currently) missing from the canonical chain. */
  reorged?: number;
  /** Deposits reversed (re-orged out for good, or reverted) before they were credited. */
  reversed?: number;
  /** Reversed deposits whose transfer is back on the canonical chain (reopened, credited by the normal path). */
  reopened?: number;
  /** Confirmed deposits kept in Pending (not stakeable) by a compliance / RG hold. */
  held?: number;
}

interface Tally {
  credited: number;
  reorged: number;
  reversed: number;
  /** Reversed deposits whose transfer came back on the canonical chain (reopened). */
  reopened: number;
  /** Confirmed deposits kept in Pending by a compliance / RG hold. */
  held: number;
}

interface ScannedTransfer {
  txHash: string;
  logIndex: number;
  blockNumber: bigint | null;
  blockHash: string | null;
  from: string | null;
  to: string;
  userId: string;
  amount: string;
}

/** Recipient + exact amount: what identifies "the same transfer" inside one transaction. */
const transferKey = (to: string, amount: string) => `${to.toLowerCase()}|${amount}`;

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

const minBig = (a: bigint, b: bigint) => (a < b ? a : b);
const maxBig = (a: bigint, b: bigint) => (a > b ? a : b);

/**
 * Re-org-safe deposit watcher (test-USDT Transfer logs → confirmations → ledger PENDING → AVAILABLE).
 *
 * - Idempotent by (network, txHash, logIndex): re-scans never double-post (unique index + posting event keys).
 * - Every pass first RECONCILES each unconfirmed deposit against the canonical chain via its receipt: a transaction
 *   re-included in another block has its block number / hash / log index updated (and its confirmations restart);
 *   one that disappeared is marked "re-org detected" and, if still missing once the required confirmation depth has
 *   passed, reversed (PENDING → CHAIN_CLEARING, status rejected); a reverted one is reversed at once.
 * - Credit happens only from a fresh receipt with ≥ N confirmations (N = DEPOSIT_CONFIRMATIONS_ARBITRUM).
 * - The scan re-reads the last N blocks every pass (re-org window), so a log that moved blocks is still seen.
 * Credited deposits are final (that is what the confirmation depth is for).
 */
@Injectable()
export class DepositChainWatcherService {
  private readonly logger = new Logger(DepositChainWatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly deposits: DepositsService,
    private readonly config: AppConfig,
  ) {}

  async watch(network: ChainKey = 'arbitrum'): Promise<WatchResult> {
    const token = this.blockchain.tokenAddress(network);
    if (!this.blockchain.client(network))
      return { status: 'skipped', reason: 'RPC not configured' };
    if (!token) return { status: 'skipped', reason: 'test-USDT address not configured' };
    let client: PublicClient;
    let head: bigint;
    try {
      // eth_chainId must equal EVM_CHAIN_ID (testnet): a mainnet RPC URL must never make real funds creditable.
      client = await this.blockchain.verifiedClient(network);
      head = await client.getBlockNumber();
    } catch (err) {
      return { status: 'skipped', reason: `RPC unavailable: ${errorSummary(err)}` };
    }
    const required = this.blockchain.requiredConfirmations(network);
    const tally: Tally = { credited: 0, reorged: 0, reversed: 0, reopened: 0, held: 0 };
    try {
      await this.reconcile(network, client, token, head, tally);
    } catch (err) {
      return { status: 'skipped', reason: `reconcile failed: ${errorSummary(err)}` };
    }

    const cursorKey = `deposits:${network}:${token.toLowerCase()}`;
    const cursor = await this.prisma.chainCursor.findUnique({ where: { key: cursorKey } });
    const window = BigInt(required);
    const start =
      cursor !== null
        ? maxBig(0n, minBig(cursor.lastBlock, head) + 1n - window)
        : (this.config.env.DEPOSIT_WATCHER_START_BLOCK ?? (head > 1000n ? head - 1000n : 0n));
    const end = minBig(head, start + BigInt(this.config.env.DEPOSIT_WATCHER_MAX_BLOCK_RANGE) - 1n);
    const fresh: string[] = [];
    if (start <= end) {
      const assigned = await this.prisma.depositAddress.findMany({
        where: { network },
        select: { address: true, userId: true },
      });
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
          this.logger.warn(`getLogs ${start}-${end} failed: ${errorSummary(err)}`);
          return {
            status: 'skipped',
            reason: 'RPC getLogs failed (will retry from the same block)',
          };
        }
        const transfers: ScannedTransfer[] = [];
        for (const log of logs) {
          const to = log.args.to?.toLowerCase();
          const userId = to ? owner.get(to) : undefined;
          if (!to || !userId || log.args.value === undefined || !log.transactionHash) continue;
          const amount = toUSDTString(fromBaseUnits(log.args.value, CHAINS[network].usdtDecimals));
          if (amount === '0.00') continue;
          transfers.push({
            txHash: log.transactionHash,
            logIndex: log.logIndex ?? 0,
            blockNumber: log.blockNumber ?? null,
            blockHash: log.blockHash ?? null,
            from: log.args.from?.toLowerCase() ?? null,
            to,
            userId,
            amount,
          });
        }
        const byTx = groupBy(transfers, (x) => x.txHash);
        for (const [txHash, txTransfers] of byTx) {
          try {
            fresh.push(...(await this.recordTransfers(network, token, txHash, txTransfers, tally)));
          } catch (err) {
            // One bad transaction never stops the watcher for everyone else (retried on the next pass).
            this.logger.error(`ALERT deposits of tx ${txHash}: ${errorSummary(err)}`);
          }
        }
      }
      await this.prisma.chainCursor.upsert({
        where: { key: cursorKey },
        create: { key: cursorKey, lastBlock: end },
        update: { lastBlock: end },
      });
    }
    if (fresh.length > 0) await this.reconcile(network, client, token, head, tally, fresh);
    return {
      status: 'ok',
      fromBlock: start.toString(),
      toBlock: end.toString(),
      detected: fresh.length,
      ...tally,
    };
  }

  /**
   * Scanned Transfer logs of ONE transaction → deposits. Every distinct (txHash, logIndex) transfer is its own deposit
   * (a batch payout may send the same amount to the same address twice). A log is skipped as a "moved copy" only
   * when a live deposit of the same transfer (recipient + amount) lost its own log index in this transaction — the
   * reconcile step re-indexes that row. A transfer whose deposit was reversed (re-orged out) and is back on the
   * canonical chain reopens that SAME deposit (never a second one).
   */
  private async recordTransfers(
    network: ChainKey,
    token: Address,
    txHash: string,
    scanned: ScannedTransfer[],
    tally: Tally,
  ): Promise<string[]> {
    const fresh: string[] = [];
    let rows = await this.prisma.deposit.findMany({ where: { network, txHash } });
    // Every reopen / park below moves a row (status, log index): re-read before the next log, so a later log of the
    // same group never acts on a stale copy (R15b: a batch re-included at shifted indices reopens every deposit).
    const refresh = async () => {
      rows = await this.prisma.deposit.findMany({ where: { network, txHash } });
    };
    for (const [, group] of groupBy(scanned, (x) => transferKey(x.to, x.amount))) {
      const logs = [...group].sort((a, b) => a.logIndex - b.logIndex);
      const same = (d: Deposit) =>
        transferKey(d.toAddress, toUSDTString(d.amount.toFixed())) ===
        transferKey(logs[0]!.to, logs[0]!.amount);
      const live = rows.filter((d) => d.status !== 'rejected' && same(d));
      const scannedIdx = new Set(logs.map((l) => l.logIndex));
      const movedLive = live.filter((d) => !scannedIdx.has(d.logIndex)).length;
      const unmatched = logs.filter((l) => !live.some((d) => d.logIndex === l.logIndex));
      for (const [i, log] of unmatched.entries()) {
        if (i < movedLive) continue; // a moved copy of a live deposit: reconcile re-indexes that row
        const slot = rows.find((d) => d.logIndex === log.logIndex);
        let reopenable: Deposit | undefined;
        if (slot && slot.status !== 'rejected') {
          // The log index is still held by a live deposit of another transfer (a re-org shifted the indices): the
          // reconcile step moves that row first; this transfer is picked up on a later pass (re-org window).
          continue;
        }
        if (slot && same(slot)) {
          reopenable = slot;
        } else {
          if (slot) await this.park(slot); // a reversed deposit of another transfer: free its stale slot
          reopenable = rows
            .filter((d) => d.status === 'rejected' && same(d) && d.id !== slot?.id)
            .sort((a, b) => a.logIndex - b.logIndex)[0];
        }
        if (reopenable) {
          const reopened = await this.prisma.tx((tx) =>
            this.deposits.reopen(tx, reopenable, {
              blockNumber: log.blockNumber ?? 0n,
              blockHash: log.blockHash,
              logIndex: log.logIndex,
            }),
          );
          if (reopened) {
            tally.reopened++;
            fresh.push(reopenable.id);
            this.logger.warn(
              `DP-${reopenable.number}: reversed deposit is back on the chain (reopened)`,
            );
          }
          await refresh();
          continue;
        }
        const created = await this.prisma.tx((tx) =>
          this.deposits.recordDetected(tx, {
            network,
            userId: log.userId,
            txHash,
            logIndex: log.logIndex,
            blockNumber: log.blockNumber,
            blockHash: log.blockHash,
            from: log.from,
            to: log.to,
            tokenAddress: token.toLowerCase(),
            amount: log.amount,
          }),
        );
        if (created) fresh.push(created.id);
        await refresh();
      }
    }
    return fresh;
  }

  /** Check unconfirmed deposits against their receipts: update / credit / hold / mark re-org / reverse. */
  private async reconcile(
    network: ChainKey,
    client: PublicClient,
    token: Address,
    head: bigint,
    tally: Tally,
    only?: string[],
  ): Promise<void> {
    const open = await this.prisma.deposit.findMany({
      where: {
        network,
        status: { in: ['detected', 'confirming'] },
        blockNumber: { not: null },
        isDemo: false,
        ...(only ? { id: { in: only } } : {}),
      },
      orderBy: [{ blockNumber: 'asc' }, { logIndex: 'asc' }],
    });
    for (const [txHash, rows] of groupBy(open, (d) => d.txHash)) {
      // RPC failures abort the pass (retried next tick); anything else is contained to this transaction.
      let receipt: TransactionReceipt | null = null;
      try {
        receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
      } catch (err) {
        if (!(err instanceof TransactionReceiptNotFoundError)) throw err;
      }
      try {
        await this.reconcileTx(network, token, head, tally, rows, receipt);
      } catch (err) {
        this.logger.error(
          `ALERT deposits ${rows.map((d) => `DP-${d.number}`).join(', ')} (tx ${txHash}): ${errorSummary(err)} — other deposits continue`,
        );
      }
    }
  }

  private async reconcileTx(
    network: ChainKey,
    token: Address,
    head: bigint,
    tally: Tally,
    rows: Deposit[],
    receipt: TransactionReceipt | null,
  ): Promise<void> {
    if (!receipt) {
      for (const d of rows) {
        if (d.reorgSeenAtBlock === null) {
          tally.reorged++;
          this.logger.warn(
            `DP-${d.number}: transaction ${d.txHash} left the canonical chain (re-org)`,
          );
          await this.setProgress(d, {
            confirmations: 0,
            reorgSeenAtBlock: head,
            detail:
              'Network re-organisation detected — waiting for the transaction to be re-included',
          });
        } else if (head - d.reorgSeenAtBlock >= BigInt(d.requiredConfirmations)) {
          if (await this.reverse(d, 're-orged out of the canonical chain')) tally.reversed++;
        } else {
          tally.reorged++;
        }
      }
      return;
    }
    if (receipt.status !== 'success') {
      for (const d of rows) if (await this.reverse(d, 'transaction reverted')) tally.reversed++;
      return;
    }
    const indexOf = await this.reindex(network, token, receipt, rows);
    for (const row of rows) {
      const logIndex = indexOf.get(row.id) ?? null;
      if (logIndex === null) {
        if (await this.reverse(row, 'transfer not found in the transaction')) tally.reversed++;
        continue;
      }
      const d = await this.prisma.deposit.findUniqueOrThrow({ where: { id: row.id } });
      const moved = receipt.blockHash !== d.blockHash || receipt.blockNumber !== d.blockNumber;
      if (moved || d.reorgSeenAtBlock !== null || row.logIndex !== logIndex) {
        this.logger.warn(
          `DP-${d.number}: transaction re-included in block ${receipt.blockNumber} (confirmations restart)`,
        );
        await this.prisma.deposit.update({
          where: { id: d.id },
          data: {
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            reorgSeenAtBlock: null,
          },
        });
      }
      const confirmations = Number(head - receipt.blockNumber + 1n);
      if (confirmations >= d.requiredConfirmations) {
        const outcome = await this.prisma.tx(async (tx) => {
          const current = await tx.deposit.findUniqueOrThrow({ where: { id: d.id } });
          const hold = await this.deposits.creditHold(tx, current);
          if (hold) {
            const fresh = await this.deposits.markHeld(tx, current, confirmations, hold);
            return { kind: 'held' as const, fresh, hold };
          }
          return {
            kind: (await this.deposits.credit(tx, current, confirmations))
              ? ('credited' as const)
              : ('none' as const),
          };
        });
        if (outcome.kind === 'credited') tally.credited++;
        if (outcome.kind === 'held') {
          tally.held++;
          if (outcome.fresh)
            this.logger.warn(`ALERT DP-${d.number} held (not credited): ${outcome.hold}`);
        }
      } else {
        await this.setProgress(d, {
          confirmations: Math.max(confirmations, 0),
          detail: `${Math.max(confirmations, 0)} / ${d.requiredConfirmations} confirmations`,
        });
      }
    }
  }

  /**
   * Give every open deposit of a transaction a DISTINCT matching Transfer log of its receipt (same token, recipient
   * and exact amount): a deposit keeps its own log index while it still matches, the others take the remaining
   * matching indices in order. Indices held by credited deposits are never reused; a reversed deposit holding a needed
   * index, or an open one whose transfer is gone (about to be reversed), is parked on a negative index. All changes are applied in ONE DB transaction through temporary negative
   * indices, so a re-org that shifts the indices of several deposits can never collide with the unique
   * (network, txHash, logIndex) key. Returns deposit id → log index (null = no matching transfer left).
   */
  private async reindex(
    network: ChainKey,
    token: Address,
    receipt: TransactionReceipt,
    open: Deposit[],
  ): Promise<Map<string, number | null>> {
    const all = await this.prisma.deposit.findMany({
      where: { network, txHash: open[0]!.txHash },
    });
    const transfers: { logIndex: number; key: string }[] = [];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== token.toLowerCase()) continue;
      try {
        const ev = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
        transfers.push({
          logIndex: log.logIndex,
          key: transferKey(
            ev.args.to.toLowerCase(),
            toUSDTString(fromBaseUnits(ev.args.value, CHAINS[network].usdtDecimals)),
          ),
        });
      } catch {
        // not a Transfer
      }
    }
    const keyOf = (d: Deposit) =>
      transferKey(d.toAddress.toLowerCase(), toUSDTString(d.amount.toFixed()));
    const matches = (d: Deposit, idx: number) =>
      transfers.some((x) => x.logIndex === idx && x.key === keyOf(d));
    const openIds = new Set(open.map((d) => d.id));
    const claimed = new Set<number>();
    const result = new Map<string, number | null>();
    // Credited deposits are final and open deposits outside this pass keep their slot: their indices stay theirs.
    for (const d of all) if (d.status !== 'rejected' && !openIds.has(d.id)) claimed.add(d.logIndex);
    // Open deposits that still match their own index keep it.
    for (const d of open) {
      if (!claimed.has(d.logIndex) && matches(d, d.logIndex)) {
        claimed.add(d.logIndex);
        result.set(d.id, d.logIndex);
      }
    }
    for (const d of [...open].sort((a, b) => a.logIndex - b.logIndex)) {
      if (result.has(d.id)) continue;
      const next = transfers.find((x) => x.key === keyOf(d) && !claimed.has(x.logIndex));
      if (next) claimed.add(next.logIndex);
      result.set(d.id, next?.logIndex ?? null);
    }
    const moves = [...result.entries()].filter(
      ([id, idx]) => idx !== null && idx !== all.find((d) => d.id === id)!.logIndex,
    ) as [string, number][];
    if (moves.length === 0) return result;
    const targets = new Set(moves.map(([, idx]) => idx));
    // A target index may still be held by a reversed deposit, or by an open deposit of this pass whose transfer is gone
    // from the receipt (result null — reconcileTx reverses it right after): both move out of the way (R35b).
    const parked = all.filter(
      (d) =>
        targets.has(d.logIndex) &&
        (openIds.has(d.id) ? result.get(d.id) === null : d.status === 'rejected'),
    );
    const minIndex = Math.min(0, ...all.map((d) => d.logIndex));
    await this.prisma.tx(async (tx) => {
      let temp = minIndex - 1;
      for (const [id] of moves)
        await tx.deposit.update({ where: { id }, data: { logIndex: temp-- } });
      // Reversed deposits keep their history; only their (meaningless) slot moves out of the way.
      for (const d of parked)
        await tx.deposit.update({ where: { id: d.id }, data: { logIndex: temp-- } });
      for (const [id, idx] of moves)
        await tx.deposit.update({ where: { id }, data: { logIndex: idx } });
    });
    return result;
  }

  private async setProgress(
    d: Deposit,
    p: { confirmations: number; detail: string; reorgSeenAtBlock?: bigint },
  ): Promise<void> {
    if (d.confirmations === p.confirmations && p.reorgSeenAtBlock === undefined) return;
    await this.prisma.deposit.update({
      where: { id: d.id },
      data: {
        confirmations: p.confirmations,
        ...(p.reorgSeenAtBlock !== undefined ? { reorgSeenAtBlock: p.reorgSeenAtBlock } : {}),
      },
    });
    await this.prisma.transaction.updateMany({
      where: { depositId: d.id },
      data: { metadata: { statusDetail: p.detail } },
    });
  }

  /** Move a reversed deposit's stale log index out of the way (negative, unique per transaction). */
  private async park(d: Deposit): Promise<void> {
    const lowest = await this.prisma.deposit.aggregate({
      where: { network: d.network, txHash: d.txHash },
      _min: { logIndex: true },
    });
    await this.prisma.deposit.update({
      where: { id: d.id },
      data: { logIndex: Math.min(0, lowest._min.logIndex ?? 0) - 1 },
    });
  }

  /** Detected but never credited, and gone from the chain: PENDING → CHAIN_CLEARING, status rejected. */
  private async reverse(d: Deposit, reason: string): Promise<boolean> {
    const done = await this.prisma.tx((tx) => this.deposits.reverse(tx, d, reason));
    if (done) this.logger.warn(`DP-${d.number} reversed: ${reason}`);
    return done;
  }
}
