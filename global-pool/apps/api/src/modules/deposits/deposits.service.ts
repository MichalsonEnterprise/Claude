import { Injectable } from '@nestjs/common';
import type { Deposit } from '@prisma/client';
import { CHAINS, type ChainKey } from '@gp/shared/chains';
import { money, toUSDTString } from '@gp/shared/money';
import { paginate, type PaginationQuery } from '@gp/shared/schemas';
import { randomBytes } from 'node:crypto';

import { AppError } from '../../common/errors';
import { usdt } from '../../common/money';
import { periodStart } from '../../common/time';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ResponsibleGamingService } from '../compliance/responsible-gaming.service';
import { RestrictionsService } from '../compliance/restrictions.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  depositCreditedLines,
  depositDetectedLines,
  depositReversedLines,
} from '../ledger/posting';
import { NotificationsService } from '../notifications/notifications.service';
import { DepositAddressService } from './deposit-address.service';

export interface DetectedTransfer {
  network: ChainKey;
  userId: string;
  txHash: string;
  logIndex: number;
  blockNumber: bigint | null;
  /** Block hash of the log (re-org detection by the chain watcher). */
  blockHash?: string | null;
  from: string | null;
  to: string;
  tokenAddress: string | null;
  /** USDT amount (decimal string, ≤ 6 dp). */
  amount: string;
  isDemo?: boolean;
}

/**
 * Hybrid custody deposits: per-user addresses (HD), on-chain detection (test-USDT Transfer logs), confirmation
 * tracking, then ledger CHAIN_CLEARING → PENDING (detected) → AVAILABLE (after N confirmations).
 * The chain is the authority; the ledger mirrors it and is reconciled against it. The re-org-safe chain scan lives
 * in DepositChainWatcherService; this service owns the posting rules shared with the DEMO simulations.
 */
@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly blockchain: BlockchainService,
    private readonly notifications: NotificationsService,
    private readonly addresses: DepositAddressService,
    private readonly rg: ResponsibleGamingService,
    private readonly idempotency: IdempotencyService,
    private readonly flags: FeatureFlagsService,
    private readonly restrictions: RestrictionsService,
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
    return paginate(
      rows.map((d) => this.view(d)),
      total,
      query,
    );
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
          blockHash: t.blockHash ?? null,
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
      where: {
        network_txHash_logIndex: { network: t.network, txHash: t.txHash, logIndex: t.logIndex },
      },
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
          metadata: {
            statusDetail: `Credited · ${confirmations} / ${deposit.requiredConfirmations} confirmations`,
          },
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
   * Why a confirmed ON-CHAIN deposit must not become stakeable now (null = credit it). On-chain funds cannot be
   * refused, but the same server-side rules as the deposit routes apply before they reach Available: account
   * restrictions (`account_suspended`, `deposits_blocked`), a break / self-exclusion, the `deposits.enabled` kill
   * switch and the player's RG deposit limits. Deposit limits count deposits CREDITED in the current period (in
   * credit order, so a deposit held over into a new period counts there). Instant DEMO simulations check before
   * recording; a progressive DEMO deposit credited later passes `includeDemo` so it is held exactly like a real one.
   */
  async creditHold(
    tx: Tx,
    deposit: Deposit,
    now = new Date(),
    opts: { includeDemo?: boolean } = {},
  ): Promise<string | null> {
    if (deposit.isDemo && !opts.includeDemo) return null;
    const restrictions = await this.restrictions.active(deposit.userId, tx);
    if (restrictions.includes('account_suspended')) return 'the account is suspended';
    if (restrictions.includes('deposits_blocked')) return 'deposits are blocked on this account';
    try {
      await this.rg.assertNotSelfExcluded(deposit.userId, tx);
    } catch (err) {
      if (err instanceof AppError && err.code === 'SELF_EXCLUDED')
        return 'a break or self-exclusion is active';
      throw err;
    }
    if (!(await this.flags.isEnabled('deposits.enabled')))
      return 'deposits are paused by the operator';
    const limits = await tx.rgLimit.findMany({
      where: { userId: deposit.userId, type: 'deposit' },
    });
    for (const l of limits) {
      // Read-only view of the effective limit: a due increase / removal applies (RG applies it lazily too).
      const due = l.pendingEffectiveAt !== null && l.pendingEffectiveAt <= now;
      const limit = due ? (l.pendingRemoval ? null : (l.pendingAmount ?? l.amount)) : l.amount;
      if (limit === null) continue;
      const credited = await tx.deposit.aggregate({
        where: {
          userId: deposit.userId,
          status: 'credited',
          creditedAt: { gte: periodStart(l.period, now) },
          id: { not: deposit.id },
        },
        _sum: { amount: true },
      });
      const used = money(credited._sum.amount?.toFixed() ?? '0');
      if (used.plus(money(deposit.amount.toFixed())).gt(money(limit.toFixed()))) {
        const label = l.period === 'day' ? 'daily' : `${l.period}ly`;
        return `it would exceed your ${label} deposit limit of ${usdt(limit)} USDT`;
      }
    }
    return null;
  }

  /**
   * Keep a confirmed deposit in PENDING (never stakeable) while `reason` applies; re-evaluated on every watcher pass
   * and credited by the regular path once it no longer applies. The player is notified when a hold starts.
   * Returns true when the hold is new (or its reason changed).
   */
  async markHeld(
    tx: Tx,
    deposit: Deposit,
    confirmations: number,
    reason: string,
  ): Promise<boolean> {
    await tx.deposit.update({ where: { id: deposit.id }, data: { confirmations } });
    const record = await tx.transaction.findFirst({ where: { depositId: deposit.id } });
    const meta = (record?.metadata ?? {}) as Record<string, unknown>;
    const changed = meta.held !== reason;
    if (record) {
      await tx.transaction.update({
        where: { id: record.id },
        data: {
          status: 'under_review',
          metadata: {
            ...meta,
            held: reason,
            statusDetail: `On hold — ${reason}. Not available for play`,
          },
        },
      });
    }
    if (changed) {
      const reference = `DP-${deposit.number}`;
      await this.notifications.notify(tx, {
        userId: deposit.userId,
        type: 'deposit.held',
        title: 'Deposit on hold',
        body: `${usdt(deposit.amount)} USDT (${reference}) arrived but is on hold because ${reason}. It is not available for play and stays in Pending until this no longer applies. Contact support with any questions.`,
        data: { reference },
      });
    }
    return changed;
  }

  /**
   * A deposit that was reversed (re-orged out) and whose transfer is back in a canonical block: reopen the SAME row
   * (one transfer = one deposit, never two credits) — status confirming, confirmations restart, CHAIN_CLEARING →
   * PENDING posted again under a new event key. The regular confirmation / credit path then runs.
   */
  async reopen(
    tx: Tx,
    deposit: Deposit,
    at: { blockNumber: bigint; blockHash: string | null; logIndex: number },
  ): Promise<boolean> {
    const claimed = await tx.deposit.updateMany({
      where: { id: deposit.id, status: 'rejected' },
      data: {
        status: 'confirming',
        confirmations: 0,
        reorgSeenAtBlock: null,
        blockNumber: at.blockNumber,
        blockHash: at.blockHash,
        logIndex: at.logIndex,
      },
    });
    if (claimed.count === 0) return false;
    const generation = await this.detectionGeneration(tx, deposit.id);
    const reference = `DP-${deposit.number}`;
    const record = await tx.transaction.findFirst({ where: { depositId: deposit.id } });
    await this.ledger.post(tx, {
      kind: 'deposit_detected',
      description: `${reference} re-included on ${CHAINS[deposit.network].testnet.name}`,
      reference,
      eventKey: `deposit:${deposit.id}:detected:${generation}`,
      transactionId: record?.id ?? null,
      lines: depositDetectedLines(deposit.userId, deposit.network, deposit.amount.toFixed()),
      isDemo: deposit.isDemo,
      metadata: { txHash: deposit.txHash, logIndex: at.logIndex, reopened: true },
    });
    if (record) {
      await tx.transaction.update({
        where: { id: record.id },
        data: {
          status: 'confirming',
          completedAt: null,
          metadata: {
            statusDetail: `Back on the chain — 0 / ${deposit.requiredConfirmations} confirmations`,
          },
        },
      });
    }
    await this.notifications.notify(tx, {
      userId: deposit.userId,
      type: 'deposit.detected',
      title: 'Deposit detected again',
      body: `${usdt(deposit.amount)} USDT (${reference}) is back on the chain — waiting for ${deposit.requiredConfirmations} confirmations.`,
      data: { reference },
      isDemo: deposit.isDemo,
    });
    return true;
  }

  /** Detected but never credited, and gone from the chain: PENDING → CHAIN_CLEARING, status rejected. */
  async reverse(tx: Tx, deposit: Deposit, reason: string): Promise<boolean> {
    const claimed = await tx.deposit.updateMany({
      where: { id: deposit.id, status: { in: ['detected', 'confirming'] } },
      data: { status: 'rejected', confirmations: 0 },
    });
    if (claimed.count === 0) return false;
    const reference = `DP-${deposit.number}`;
    const record = await tx.transaction.findFirst({ where: { depositId: deposit.id } });
    // Event keys are per detection generation: a reopened deposit can be reversed again (one posting each time).
    const generation = (await this.detectionGeneration(tx, deposit.id)) - 1;
    await this.ledger.post(tx, {
      kind: 'deposit_reversed',
      description: `${reference} reversed — ${reason}`,
      reference,
      eventKey:
        generation > 0
          ? `deposit:${deposit.id}:reversed:${generation}`
          : `deposit:${deposit.id}:reversed`,
      transactionId: record?.id ?? null,
      lines: depositReversedLines(deposit.userId, deposit.network, deposit.amount.toFixed()),
      isDemo: deposit.isDemo,
      metadata: { txHash: deposit.txHash, logIndex: deposit.logIndex, reason },
    });
    await tx.transaction.updateMany({
      where: { depositId: deposit.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        metadata: { statusDetail: `Not credited — ${reason}` },
      },
    });
    await this.notifications.notify(tx, {
      userId: deposit.userId,
      type: 'deposit.reversed',
      title: 'Deposit not credited',
      body: `${toUSDTString(deposit.amount.toFixed())} USDT (${reference}) is no longer on the chain (${reason}), so it was not credited.`,
      data: { reference },
      isDemo: deposit.isDemo,
    });
    return true;
  }

  /** Number of deposit_detected postings of a deposit so far (1 = never reopened). */
  private async detectionGeneration(tx: Tx, depositId: string): Promise<number> {
    return tx.ledgerPosting.count({
      where: {
        kind: 'deposit_detected',
        eventKey: { startsWith: `deposit:${depositId}:detected` },
      },
    });
  }

  /**
   * DEMO-only: simulate a confirmed test-USDT deposit. Posts exactly the same ledger entries as a real deposit
   * (detected → credited) so balances and reconciliation behave identically.
   */
  async simulate(
    userId: string,
    input: { network: ChainKey; amount: string; idempotencyKey: string },
  ) {
    await this.flags.assertEnabled('deposits.enabled', 'Deposits');
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
        return { ...this.view(fresh), simulated: true };
      },
    );
  }
}
