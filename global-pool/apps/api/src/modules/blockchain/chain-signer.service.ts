import { Injectable, Logger } from '@nestjs/common';
import type { ChainTransaction } from '@prisma/client';
import {
  TransactionReceiptNotFoundError,
  keccak256,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

import { AppConfig } from '../../config/app-config';
import { PrismaService, type Tx } from '../../infra/prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { ChainUnavailableError, decodeRevert, errorSummary } from './chain-errors';

/** Signer roles. Pool roles mirror GlobalPoolRounds (OPERATOR / SETTLER / permissionless keeper). */
export type SignerRole = 'operator' | 'settler' | 'keeper' | 'withdrawal';
export type ChainTxPurpose = 'round_op' | 'withdrawal';

export interface SendRequest {
  role: SignerRole;
  to: Address;
  data: Hex;
  purpose: ChainTxPurpose;
  refId: string;
  /** ABI used to decode a revert into a readable custom error. */
  abi?: Abi;
  /**
   * Runs inside the DB transaction that stores the signed tx (before it is broadcast), e.g. to link it to a round
   * op or move a withdrawal to `broadcast`. If it throws, nothing is stored and nothing is sent.
   */
  onStored?: (tx: Tx, row: ChainTransaction) => Promise<void>;
}

export type TrackState = 'pending' | 'mined' | 'reverted' | 'dropped';

export interface TrackResult {
  state: TrackState;
  confirmations: number;
  receipt: TransactionReceipt | null;
  row: ChainTransaction;
}

const GAS_HEADROOM_NUM = 12n; // +20 % over the estimate
const GAS_HEADROOM_DEN = 10n;

/**
 * Testnet transaction signer with a DB-backed nonce manager and an outbox (`chain_transactions`).
 *
 * send(): simulate (eth_call, decoded revert → nothing stored) → estimate gas/fees → in ONE DB transaction lock the
 * signer's nonce row, take max(stored next nonce, chain pending nonce), sign locally, store the raw tx + hash, bump
 * the nonce → broadcast after commit. A crash at any point leaves either nothing or a stored signed tx that the
 * tracker re-broadcasts byte-for-byte (same hash), so a transaction is never lost, duplicated or re-signed with a
 * different nonce. Keys come from env (TESTNET / throwaway only) and are never logged; every signer refuses to sign
 * unless eth_chainId equals EVM_CHAIN_ID (Arbitrum Sepolia 421614 or local Anvil 31337).
 */
@Injectable()
export class ChainSignerService {
  private readonly logger = new Logger(ChainSignerService.name);
  private readonly accounts = new Map<SignerRole, PrivateKeyAccount | null>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly blockchain: BlockchainService,
  ) {}

  account(role: SignerRole): PrivateKeyAccount | null {
    if (this.accounts.has(role)) return this.accounts.get(role)!;
    const env = this.config.env;
    const key =
      role === 'withdrawal'
        ? env.WITHDRAWAL_SIGNER_PRIVATE_KEY
        : role === 'operator'
          ? env.POOL_OPERATOR_PRIVATE_KEY
          : role === 'settler'
            ? (env.POOL_SETTLER_PRIVATE_KEY ?? env.POOL_OPERATOR_PRIVATE_KEY)
            : (env.POOL_KEEPER_PRIVATE_KEY ?? env.POOL_OPERATOR_PRIVATE_KEY);
    const account = key ? privateKeyToAccount(key as Hex) : null;
    this.accounts.set(role, account);
    return account;
  }

  address(role: SignerRole): Address | null {
    return this.account(role)?.address ?? null;
  }

  /** Public client after checking the RPC serves the configured testnet (BlockchainService.verifiedClient). */
  async client(): Promise<PublicClient> {
    if (!this.blockchain.client('arbitrum'))
      throw new ChainUnavailableError('ARBITRUM_SEPOLIA_RPC_URL is not configured');
    return this.blockchain.verifiedClient('arbitrum');
  }

  /** Simulate, sign, store in the outbox and broadcast. Throws ChainRevertError if the call would revert. */
  async send(req: SendRequest): Promise<ChainTransaction> {
    const account = this.account(req.role);
    if (!account) throw new ChainUnavailableError(`No ${req.role} signer key configured`);
    const client = await this.client();
    const chainId = this.blockchain.chainId;
    const from = account.address;
    try {
      await client.call({ account: from, to: req.to, data: req.data });
    } catch (err) {
      throw (req.abi ? decodeRevert(err, req.abi) : null) ?? err;
    }
    const [gas, fees, pendingNonce] = await Promise.all([
      client.estimateGas({ account: from, to: req.to, data: req.data }),
      client.estimateFeesPerGas(),
      client.getTransactionCount({ address: from, blockTag: 'pending' }),
    ]);
    const gasLimit = (gas * GAS_HEADROOM_NUM) / GAS_HEADROOM_DEN;
    const fromKey = from.toLowerCase();

    const row = await this.prisma.tx(async (tx) => {
      await tx.chainSignerNonce.createMany({
        data: [{ chainId, address: fromKey, nextNonce: pendingNonce }],
        skipDuplicates: true,
      });
      const [locked] = await tx.$queryRaw<{ next_nonce: number }[]>`
        SELECT next_nonce FROM chain_signer_nonces WHERE chain_id = ${chainId} AND address = ${fromKey} FOR UPDATE`;
      const nonce = Math.max(locked?.next_nonce ?? 0, pendingNonce);
      const raw = await account.signTransaction({
        chainId,
        type: 'eip1559',
        nonce,
        to: req.to,
        data: req.data,
        gas: gasLimit,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      const stored = await tx.chainTransaction.create({
        data: {
          chainId,
          fromAddress: fromKey,
          nonce,
          toAddress: req.to.toLowerCase(),
          purpose: req.purpose,
          refId: req.refId,
          txHash: keccak256(raw),
          rawTx: raw,
          status: 'signed',
          gasLimit: gasLimit.toString(),
          maxFeePerGas: fees.maxFeePerGas.toString(),
        },
      });
      await tx.chainSignerNonce.update({
        where: { chainId_address: { chainId, address: fromKey } },
        data: { nextNonce: nonce + 1 },
      });
      if (req.onStored) await req.onStored(tx, stored);
      return stored;
    });
    return this.broadcast(row);
  }

  /** (Re-)broadcast the stored raw transaction. Never throws: failures are recorded and retried by track(). */
  async broadcast(row: ChainTransaction): Promise<ChainTransaction> {
    const client = await this.client();
    let error: string | null = null;
    try {
      await client.sendRawTransaction({ serializedTransaction: row.rawTx as Hex });
    } catch (err) {
      const msg = errorSummary(err);
      // The node already has it (or it was mined): not an error for an idempotent re-broadcast.
      if (!/already known|known transaction|nonce too low|already imported/i.test(msg)) error = msg;
    }
    if (error) this.logger.warn(`broadcast ${row.txHash} failed: ${error}`);
    const accepted = row.status === 'signed' && !error;
    return this.prisma.chainTransaction.update({
      where: { id: row.id },
      data: {
        status: accepted ? 'broadcast' : row.status,
        broadcastAttempts: { increment: 1 },
        lastBroadcastAt: new Date(),
        error,
      },
    });
  }

  /**
   * Resolve one outbox transaction: mined / reverted once it has `confirmations`, dropped only if its nonce was
   * consumed `confirmations` blocks deep by another transaction (and a re-check still finds no receipt), else pending
   * (re-broadcast after CHAIN_REBROADCAST_SECONDS).
   */
  async track(rowOrId: ChainTransaction | string, confirmations: number): Promise<TrackResult> {
    let row =
      typeof rowOrId === 'string'
        ? await this.prisma.chainTransaction.findUniqueOrThrow({ where: { id: rowOrId } })
        : rowOrId;
    if (row.status === 'mined' || row.status === 'reverted' || row.status === 'dropped') {
      return {
        state: row.status,
        confirmations: Number.MAX_SAFE_INTEGER,
        receipt: null,
        row,
      };
    }
    const client = await this.client();
    const receipt = await this.receiptOf(client, row.txHash as Hex);
    if (receipt) return this.fromReceipt(client, row, receipt, confirmations);
    // No receipt (yet). A used nonce alone is NOT proof that another transaction replaced ours: the transfer may have
    // been mined right after the receipt lookup, or a load-balanced RPC node answered from behind. 'dropped' is
    // terminal (a withdrawal's funds are released), so it needs (1) the nonce consumed at least `confirmations`
    // blocks deep and (2) a second receipt lookup, made AFTER that nonce read, that still finds nothing.
    const head = await client.getBlockNumber();
    const depth = BigInt(Math.max(1, confirmations));
    const deepBlock = head + 1n > depth ? head + 1n - depth : 0n;
    const deepNonce = await client.getTransactionCount({
      address: row.fromAddress as Address,
      blockNumber: deepBlock,
    });
    if (deepNonce > row.nonce) {
      const again = await this.receiptOf(client, row.txHash as Hex);
      if (again) return this.fromReceipt(client, row, again, confirmations);
      row = await this.prisma.chainTransaction.update({
        where: { id: row.id },
        data: {
          status: 'dropped',
          error: `nonce ${row.nonce} consumed by another transaction (≥ ${depth} blocks deep at block ${deepBlock})`,
        },
      });
      return { state: 'dropped', confirmations: 0, receipt: null, row };
    }
    const stale =
      !row.lastBroadcastAt ||
      Date.now() - row.lastBroadcastAt.getTime() > this.config.env.CHAIN_REBROADCAST_SECONDS * 1000;
    if (row.status === 'signed' || stale) row = await this.broadcast(row);
    return { state: 'pending', confirmations: 0, receipt: null, row };
  }

  private async receiptOf(client: PublicClient, hash: Hex): Promise<TransactionReceipt | null> {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch (err) {
      if (err instanceof TransactionReceiptNotFoundError) return null;
      throw err;
    }
  }

  /** mined / reverted once the receipt has `confirmations`, else pending (block recorded for re-org tracking). */
  private async fromReceipt(
    client: PublicClient,
    row: ChainTransaction,
    receipt: TransactionReceipt,
    confirmations: number,
  ): Promise<TrackResult> {
    const head = await client.getBlockNumber();
    const conf = Number(head - receipt.blockNumber + 1n);
    if (conf < confirmations) {
      if (row.blockNumber !== receipt.blockNumber) {
        row = await this.prisma.chainTransaction.update({
          where: { id: row.id },
          data: { blockNumber: receipt.blockNumber, blockHash: receipt.blockHash },
        });
      }
      return { state: 'pending', confirmations: conf, receipt, row };
    }
    const state = receipt.status === 'success' ? 'mined' : 'reverted';
    row = await this.prisma.chainTransaction.update({
      where: { id: row.id },
      data: {
        status: state,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        minedAt: new Date(),
        error: state === 'reverted' ? 'transaction reverted on-chain' : null,
      },
    });
    return { state, confirmations: conf, receipt, row };
  }

  /** Poll track() until the transaction resolves or `timeoutMs` passes (then it stays pending for the next tick). */
  async waitFor(
    row: ChainTransaction,
    confirmations: number,
    timeoutMs: number,
  ): Promise<TrackResult> {
    const deadline = Date.now() + timeoutMs;
    const interval = this.blockchain.chainId === 31_337 ? 150 : 2_000;
    let result = await this.track(row, confirmations);
    while (result.state === 'pending' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, interval));
      result = await this.track(result.row, confirmations);
    }
    return result;
  }
}
