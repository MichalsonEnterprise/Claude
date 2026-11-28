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
var DepositChainWatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositChainWatcherService = exports.TRANSFER_EVENT = void 0;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const money_1 = require("@gp/shared/money");
const viem_1 = require("viem");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const chain_errors_1 = require("../blockchain/chain-errors");
const ledger_service_1 = require("../ledger/ledger.service");
const posting_1 = require("../ledger/posting");
const notifications_service_1 = require("../notifications/notifications.service");
const deposits_service_1 = require("./deposits.service");
exports.TRANSFER_EVENT = (0, viem_1.parseAbiItem)('event Transfer(address indexed from, address indexed to, uint256 value)');
const ADDRESS_CHUNK = 200;
const minBig = (a, b) => (a < b ? a : b);
const maxBig = (a, b) => (a > b ? a : b);
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
let DepositChainWatcherService = DepositChainWatcherService_1 = class DepositChainWatcherService {
    prisma;
    ledger;
    blockchain;
    deposits;
    notifications;
    config;
    logger = new common_1.Logger(DepositChainWatcherService_1.name);
    constructor(prisma, ledger, blockchain, deposits, notifications, config) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.blockchain = blockchain;
        this.deposits = deposits;
        this.notifications = notifications;
        this.config = config;
    }
    async watch(network = 'arbitrum') {
        const client = this.blockchain.client(network);
        const token = this.blockchain.tokenAddress(network);
        if (!client)
            return { status: 'skipped', reason: 'RPC not configured' };
        if (!token)
            return { status: 'skipped', reason: 'test-USDT address not configured' };
        let head;
        try {
            head = await client.getBlockNumber();
        }
        catch (err) {
            return { status: 'skipped', reason: `RPC unavailable: ${(0, chain_errors_1.errorSummary)(err)}` };
        }
        const required = this.blockchain.requiredConfirmations(network);
        const tally = { credited: 0, reorged: 0, reversed: 0 };
        try {
            await this.reconcile(network, client, token, head, tally);
        }
        catch (err) {
            return { status: 'skipped', reason: `reconcile failed: ${(0, chain_errors_1.errorSummary)(err)}` };
        }
        const cursorKey = `deposits:${network}:${token.toLowerCase()}`;
        const cursor = await this.prisma.chainCursor.findUnique({ where: { key: cursorKey } });
        const window = BigInt(required);
        const start = cursor !== null
            ? maxBig(0n, minBig(cursor.lastBlock, head) + 1n - window)
            : (this.config.env.DEPOSIT_WATCHER_START_BLOCK ?? (head > 1000n ? head - 1000n : 0n));
        const end = minBig(head, start + BigInt(this.config.env.DEPOSIT_WATCHER_MAX_BLOCK_RANGE) - 1n);
        const fresh = [];
        if (start <= end) {
            const assigned = await this.prisma.depositAddress.findMany({
                where: { network },
                select: { address: true, userId: true },
            });
            const owner = new Map(assigned.map((a) => [a.address.toLowerCase(), a.userId]));
            const addresses = [...owner.keys()];
            for (let i = 0; i < addresses.length; i += ADDRESS_CHUNK) {
                let logs;
                try {
                    logs = await client.getLogs({
                        address: token,
                        event: exports.TRANSFER_EVENT,
                        args: { to: addresses.slice(i, i + ADDRESS_CHUNK) },
                        fromBlock: start,
                        toBlock: end,
                    });
                }
                catch (err) {
                    this.logger.warn(`getLogs ${start}-${end} failed: ${(0, chain_errors_1.errorSummary)(err)}`);
                    return {
                        status: 'skipped',
                        reason: 'RPC getLogs failed (will retry from the same block)',
                    };
                }
                for (const log of logs) {
                    const to = log.args.to?.toLowerCase();
                    const userId = to ? owner.get(to) : undefined;
                    if (!to || !userId || log.args.value === undefined || !log.transactionHash)
                        continue;
                    const amount = (0, money_1.toUSDTString)((0, money_1.fromBaseUnits)(log.args.value, chains_1.CHAINS[network].usdtDecimals));
                    if (amount === '0.00')
                        continue;
                    // A re-included transaction may carry a new log index: the reconcile step owns that row.
                    const known = await this.prisma.deposit.findFirst({
                        where: {
                            network,
                            txHash: log.transactionHash,
                            toAddress: to,
                            amount,
                            logIndex: { not: log.logIndex ?? 0 },
                        },
                        select: { id: true },
                    });
                    if (known)
                        continue;
                    const created = await this.prisma.tx((tx) => this.deposits.recordDetected(tx, {
                        network,
                        userId,
                        txHash: log.transactionHash,
                        logIndex: log.logIndex ?? 0,
                        blockNumber: log.blockNumber ?? null,
                        blockHash: log.blockHash ?? null,
                        from: log.args.from?.toLowerCase() ?? null,
                        to,
                        tokenAddress: token.toLowerCase(),
                        amount,
                    }));
                    if (created)
                        fresh.push(created.id);
                }
            }
            await this.prisma.chainCursor.upsert({
                where: { key: cursorKey },
                create: { key: cursorKey, lastBlock: end },
                update: { lastBlock: end },
            });
        }
        if (fresh.length > 0)
            await this.reconcile(network, client, token, head, tally, fresh);
        return {
            status: 'ok',
            fromBlock: start.toString(),
            toBlock: end.toString(),
            detected: fresh.length,
            ...tally,
        };
    }
    /** Check unconfirmed deposits against their receipts: update / credit / mark re-org / reverse. */
    async reconcile(network, client, token, head, tally, only) {
        const open = await this.prisma.deposit.findMany({
            where: {
                network,
                status: { in: ['detected', 'confirming'] },
                blockNumber: { not: null },
                isDemo: false,
                ...(only ? { id: { in: only } } : {}),
            },
            orderBy: { blockNumber: 'asc' },
        });
        for (const d of open) {
            let receipt = null;
            try {
                receipt = await client.getTransactionReceipt({ hash: d.txHash });
            }
            catch (err) {
                if (!(err instanceof viem_1.TransactionReceiptNotFoundError))
                    throw err;
            }
            if (!receipt) {
                if (d.reorgSeenAtBlock === null) {
                    tally.reorged++;
                    this.logger.warn(`DP-${d.number}: transaction ${d.txHash} left the canonical chain (re-org)`);
                    await this.setProgress(d, {
                        confirmations: 0,
                        reorgSeenAtBlock: head,
                        detail: 'Network re-organisation detected — waiting for the transaction to be re-included',
                    });
                }
                else if (head - d.reorgSeenAtBlock >= BigInt(d.requiredConfirmations)) {
                    if (await this.reverse(d, 're-orged out of the canonical chain'))
                        tally.reversed++;
                }
                else {
                    tally.reorged++;
                }
                continue;
            }
            if (receipt.status !== 'success') {
                if (await this.reverse(d, 'transaction reverted'))
                    tally.reversed++;
                continue;
            }
            const logIndex = this.matchTransfer(receipt, token, d);
            if (logIndex === null) {
                if (await this.reverse(d, 'transfer not found in the transaction'))
                    tally.reversed++;
                continue;
            }
            const moved = receipt.blockHash !== d.blockHash ||
                receipt.blockNumber !== d.blockNumber ||
                logIndex !== d.logIndex;
            if (moved || d.reorgSeenAtBlock !== null) {
                this.logger.warn(`DP-${d.number}: transaction re-included in block ${receipt.blockNumber} (confirmations restart)`);
                await this.prisma.deposit.update({
                    where: { id: d.id },
                    data: {
                        blockNumber: receipt.blockNumber,
                        blockHash: receipt.blockHash,
                        logIndex,
                        reorgSeenAtBlock: null,
                    },
                });
            }
            const confirmations = Number(head - receipt.blockNumber + 1n);
            if (confirmations >= d.requiredConfirmations) {
                const current = await this.prisma.deposit.findUniqueOrThrow({ where: { id: d.id } });
                if (await this.prisma.tx((tx) => this.deposits.credit(tx, current, confirmations))) {
                    tally.credited++;
                }
            }
            else {
                await this.setProgress(d, {
                    confirmations: Math.max(confirmations, 0),
                    detail: `${Math.max(confirmations, 0)} / ${d.requiredConfirmations} confirmations`,
                });
            }
        }
    }
    /** Log index of the Transfer in `receipt` that matches the deposit (token, recipient, exact amount). */
    matchTransfer(receipt, token, d) {
        const units = (0, money_1.toBaseUnits)(d.amount.toFixed(), chains_1.CHAINS[d.network].usdtDecimals);
        const candidates = [];
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== token.toLowerCase())
                continue;
            try {
                const ev = (0, viem_1.decodeEventLog)({ abi: [exports.TRANSFER_EVENT], data: log.data, topics: log.topics });
                if (ev.args.to.toLowerCase() === d.toAddress.toLowerCase() && ev.args.value === units) {
                    candidates.push(log.logIndex);
                }
            }
            catch {
                // not a Transfer
            }
        }
        if (candidates.includes(d.logIndex))
            return d.logIndex;
        return candidates[0] ?? null;
    }
    async setProgress(d, p) {
        if (d.confirmations === p.confirmations && p.reorgSeenAtBlock === undefined)
            return;
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
    /** Detected but never credited, and gone from the chain: PENDING → CHAIN_CLEARING, status rejected. */
    async reverse(d, reason) {
        const done = await this.prisma.tx(async (tx) => {
            const claimed = await tx.deposit.updateMany({
                where: { id: d.id, status: { in: ['detected', 'confirming'] } },
                data: { status: 'rejected', confirmations: 0 },
            });
            if (claimed.count === 0)
                return false;
            const reference = `DP-${d.number}`;
            const record = await tx.transaction.findFirst({ where: { depositId: d.id } });
            await this.ledger.post(tx, {
                kind: 'deposit_reversed',
                description: `${reference} reversed — ${reason}`,
                reference,
                eventKey: `deposit:${d.id}:reversed`,
                transactionId: record?.id ?? null,
                lines: (0, posting_1.depositReversedLines)(d.userId, d.network, d.amount.toFixed()),
                isDemo: d.isDemo,
                metadata: { txHash: d.txHash, logIndex: d.logIndex, reason },
            });
            await tx.transaction.updateMany({
                where: { depositId: d.id },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    metadata: { statusDetail: `Not credited — ${reason}` },
                },
            });
            await this.notifications.notify(tx, {
                userId: d.userId,
                type: 'deposit.reversed',
                title: 'Deposit not credited',
                body: `${(0, money_1.toUSDTString)(d.amount.toFixed())} USDT (${reference}) is no longer on the chain (${reason}), so it was not credited.`,
                data: { reference },
                isDemo: d.isDemo,
            });
            return true;
        });
        if (done)
            this.logger.warn(`DP-${d.number} reversed: ${reason}`);
        return done;
    }
};
exports.DepositChainWatcherService = DepositChainWatcherService;
exports.DepositChainWatcherService = DepositChainWatcherService = DepositChainWatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        blockchain_service_1.BlockchainService,
        deposits_service_1.DepositsService,
        notifications_service_1.NotificationsService,
        app_config_1.AppConfig])
], DepositChainWatcherService);
//# sourceMappingURL=deposit-chain-watcher.service.js.map