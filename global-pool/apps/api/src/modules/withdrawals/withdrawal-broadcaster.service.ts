import { Injectable, Logger } from '@nestjs/common';
import type { ChainTransaction, Withdrawal, WithdrawalStatus } from '@prisma/client';
import { CHAINS } from '@gp/shared/chains';
import { toBaseUnits } from '@gp/shared/money';
import { encodeFunctionData, erc20Abi, parseAbi, type Abi, type Address } from 'viem';

import { AppConfig } from '../../config/app-config';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ChainRevertError, ChainUnavailableError, errorSummary } from '../blockchain/chain-errors';
import { ChainSignerService } from '../blockchain/chain-signer.service';
import { WithdrawalsService } from './withdrawals.service';

/** ERC-20 + common custom errors (OZ 5 ERC20 errors, test-token blocklist) for readable revert reasons. */
const TOKEN_ABI: Abi = [
  ...erc20Abi,
  ...parseAbi([
    'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
    'error ERC20InvalidReceiver(address receiver)',
    'error RecipientBlocked(address to)',
  ]),
];

export interface TrackSummary {
  confirmed: number;
  failed: number;
  pending: number;
  broadcast: number;
}

/**
 * Test-USDT withdrawal broadcaster (TESTNET ONLY; on when WITHDRAWAL_BROADCASTER_ENABLED=true).
 *
 * queued → [hot-wallet liquidity check] → simulate transfer(to, net) → sign + store in the outbox (same DB tx moves
 * the withdrawal to `broadcast` with its tx hash) → broadcast → track: mined with WITHDRAWAL_CONFIRMATIONS →
 * `confirmed` (ledger LOCKED → CHAIN_CLEARING + network fee); reverted / dropped → `failed` and the full amount goes
 * back to Available. A transfer whose simulation reverts never gets a nonce and fails from `queued` (funds back).
 * Missing liquidity or an unreachable RPC keeps the withdrawal queued (retried; never silently failed).
 * Nonces come from the DB-backed manager in ChainSignerService (safe across processes and restarts).
 */
@Injectable()
export class WithdrawalBroadcasterService {
  private readonly logger = new Logger(WithdrawalBroadcasterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
    private readonly signer: ChainSignerService,
    private readonly withdrawals: WithdrawalsService,
  ) {}

  get enabled(): boolean {
    return (
      this.config.env.WITHDRAWAL_BROADCASTER_ENABLED && Boolean(this.signer.address('withdrawal'))
    );
  }

  /** Broadcast one queued withdrawal (idempotent). Returns its status afterwards. */
  async broadcast(id: string): Promise<WithdrawalStatus> {
    if (!this.enabled) return this.withdrawals.broadcast(id);
    const w = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    if (w.status !== 'queued' || w.isDemo) return w.status;
    if (w.network !== 'arbitrum') {
      this.logger.log(
        `WD-${w.number}: ${CHAINS[w.network].name} broadcasting is not available yet (stays queued)`,
      );
      return w.status;
    }
    const live = await this.prisma.chainTransaction.findFirst({
      where: { purpose: 'withdrawal', refId: id, status: { in: ['signed', 'broadcast', 'mined'] } },
    });
    if (live) return w.status;
    const token = this.blockchain.tokenAddress('arbitrum');
    const hot = this.signer.address('withdrawal');
    if (!token || !hot) return w.status;
    const units = toBaseUnits(w.netAmount.toFixed(), CHAINS.arbitrum.usdtDecimals);

    try {
      const client = await this.signer.client();
      const [balance, gasBalance] = await Promise.all([
        client.readContract({
          address: token,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [hot],
        }),
        client.getBalance({ address: hot }),
      ]);
      if (balance < units || gasBalance === 0n) {
        this.logger.warn(
          `ALERT WD-${w.number}: hot wallet ${hot} lacks ${balance < units ? 'test-USDT' : 'gas'} — withdrawal stays queued`,
        );
        return w.status;
      }
      await this.signer.send({
        role: 'withdrawal',
        to: token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [w.toAddress as Address, units],
        }),
        purpose: 'withdrawal',
        refId: w.id,
        abi: TOKEN_ABI,
        onStored: (tx, row) => this.markBroadcast(tx, w.id, row),
      });
    } catch (err) {
      if (err instanceof ChainRevertError) {
        await this.failWithdrawal(w.id, `transfer would revert (${err.message})`);
        return 'failed';
      }
      const level = err instanceof ChainUnavailableError ? 'warn' : 'error';
      this.logger[level](`WD-${w.number}: broadcast postponed — ${errorSummary(err)}`);
      return (await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
    }
    return (await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
  }

  /** Inside the outbox transaction: queued → broadcast with the (deterministic) tx hash. */
  private async markBroadcast(tx: Tx, id: string, row: ChainTransaction): Promise<void> {
    await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
    const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
    if (w.status !== 'queued') {
      throw new Error(`WD-${w.number} is ${w.status}; not broadcasting`);
    }
    await tx.withdrawal.update({
      where: { id },
      data: { txHash: row.txHash, broadcastAt: new Date() },
    });
    await this.withdrawals.transition(
      tx,
      w,
      'broadcast',
      { type: 'system', id: null },
      `Sent on-chain · ${row.txHash.slice(0, 6)}…${row.txHash.slice(-4)} (nonce ${row.nonce})`,
    );
  }

  private async failWithdrawal(id: string, reason: string): Promise<void> {
    await this.prisma.tx(async (tx) => {
      await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
      const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
      if (w.status !== 'queued' && w.status !== 'broadcast') return;
      await this.withdrawals.fail(tx, w, reason);
      await tx.transaction.updateMany({
        where: { withdrawalId: id },
        data: {
          metadata: {
            address: w.toAddress,
            statusDetail: `Failed — ${reason}. Funds returned to Available`,
          },
        },
      });
    });
    this.logger.warn(`WD-${id}: failed — ${reason} (funds returned to Available)`);
  }

  /** One tracker pass: settle / fail broadcast withdrawals, retry queued ones that could not be sent yet. */
  async trackAll(): Promise<TrackSummary> {
    const summary: TrackSummary = { confirmed: 0, failed: 0, pending: 0, broadcast: 0 };
    if (!this.enabled) return summary;
    const sent = await this.prisma.withdrawal.findMany({
      where: { status: 'broadcast', network: 'arbitrum', isDemo: false },
      orderBy: { broadcastAt: 'asc' },
      take: 100,
    });
    for (const w of sent) {
      try {
        const outcome = await this.track(w);
        summary[outcome]++;
      } catch (err) {
        summary.pending++;
        this.logger.warn(`WD-${w.number}: tracking failed — ${errorSummary(err)}`);
      }
    }
    const queued = await this.prisma.withdrawal.findMany({
      where: { status: 'queued', network: 'arbitrum', isDemo: false },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const w of queued) {
      if ((await this.broadcast(w.id)) === 'broadcast') summary.broadcast++;
    }
    return summary;
  }

  /** Track one broadcast withdrawal by id. */
  async trackOne(id: string): Promise<'confirmed' | 'failed' | 'pending'> {
    const w = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
    if (w.status !== 'broadcast')
      return w.status === 'confirmed' ? 'confirmed' : w.status === 'failed' ? 'failed' : 'pending';
    return this.track(w);
  }

  private async track(w: Withdrawal): Promise<'confirmed' | 'failed' | 'pending'> {
    const row = await this.prisma.chainTransaction.findFirst({
      where: { purpose: 'withdrawal', refId: w.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return 'pending';
    const res = await this.signer.track(row, this.config.env.WITHDRAWAL_CONFIRMATIONS);
    if (res.state === 'pending') return 'pending';
    if (res.state === 'mined') {
      await this.prisma.tx(async (tx) => {
        await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${w.id}::uuid FOR UPDATE`;
        const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: w.id } });
        if (current.status === 'broadcast') await this.withdrawals.confirm(tx, current, row.txHash);
      });
      return 'confirmed';
    }
    await this.failWithdrawal(
      w.id,
      res.state === 'reverted'
        ? 'token transfer reverted on-chain'
        : 'transaction dropped (nonce replaced)',
    );
    return 'failed';
  }
}
