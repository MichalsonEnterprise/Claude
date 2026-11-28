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
var WithdrawalBroadcasterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalBroadcasterService = void 0;
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const money_1 = require("@gp/shared/money");
const viem_1 = require("viem");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const chain_errors_1 = require("../blockchain/chain-errors");
const chain_signer_service_1 = require("../blockchain/chain-signer.service");
const withdrawals_service_1 = require("./withdrawals.service");
/** ERC-20 + common custom errors (OZ 5 ERC20 errors, test-token blocklist) for readable revert reasons. */
const TOKEN_ABI = [
    ...viem_1.erc20Abi,
    ...(0, viem_1.parseAbi)([
        'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
        'error ERC20InvalidReceiver(address receiver)',
        'error RecipientBlocked(address to)',
    ]),
];
/** The hot wallet cannot cover a transfer once in-flight transfers are reserved (the withdrawal stays queued). */
class HotWalletShortError extends Error {
    name = 'HotWalletShortError';
}
/**
 * Test-USDT withdrawal broadcaster (TESTNET ONLY; on when WITHDRAWAL_BROADCASTER_ENABLED=true).
 *
 * queued → [hot-wallet liquidity check] → simulate transfer(to, net) → sign + store in the outbox (same DB tx moves
 * the withdrawal to `broadcast` with its tx hash) → broadcast → track: mined with WITHDRAWAL_CONFIRMATIONS →
 * `confirmed` (ledger LOCKED → CHAIN_CLEARING + network fee); reverted / dropped → `failed` and the full amount goes
 * back to Available. A transfer whose simulation reverts never gets a nonce and fails from `queued` (funds back).
 * Missing liquidity (balance minus the transfers already signed but not mined yet, checked under the signer's nonce
 * lock) or an unreachable RPC keeps the withdrawal queued (retried; never silently failed).
 * Nonces come from the DB-backed manager in ChainSignerService (safe across processes and restarts).
 */
let WithdrawalBroadcasterService = WithdrawalBroadcasterService_1 = class WithdrawalBroadcasterService {
    prisma;
    config;
    blockchain;
    signer;
    withdrawals;
    logger = new common_1.Logger(WithdrawalBroadcasterService_1.name);
    constructor(prisma, config, blockchain, signer, withdrawals) {
        this.prisma = prisma;
        this.config = config;
        this.blockchain = blockchain;
        this.signer = signer;
        this.withdrawals = withdrawals;
    }
    get enabled() {
        return (this.config.env.WITHDRAWAL_BROADCASTER_ENABLED && Boolean(this.signer.address('withdrawal')));
    }
    /** Broadcast one queued withdrawal (idempotent). Returns its status afterwards. */
    async broadcast(id) {
        if (!this.enabled)
            return this.withdrawals.broadcast(id);
        const w = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
        if (w.status !== 'queued' || w.isDemo)
            return w.status;
        if (w.network !== 'arbitrum') {
            this.logger.log(`WD-${w.number}: ${chains_1.CHAINS[w.network].name} broadcasting is not available yet (stays queued)`);
            return w.status;
        }
        const live = await this.prisma.chainTransaction.findFirst({
            where: { purpose: 'withdrawal', refId: id, status: { in: ['signed', 'broadcast', 'mined'] } },
        });
        if (live)
            return w.status;
        const token = this.blockchain.tokenAddress('arbitrum');
        const hot = this.signer.address('withdrawal');
        if (!token || !hot)
            return w.status;
        const units = (0, money_1.toBaseUnits)(w.netAmount.toFixed(), chains_1.CHAINS.arbitrum.usdtDecimals);
        try {
            const client = await this.signer.client();
            // Balance and nonce of the hot wallet at ONE block: transfers we signed with a nonce ≥ that block's nonce are
            // not reflected in that balance yet (still in flight), so they are subtracted under the signer's nonce lock.
            const block = await client.getBlockNumber();
            const [balance, gasBalance, minedNonce] = await Promise.all([
                client.readContract({
                    address: token,
                    abi: viem_1.erc20Abi,
                    functionName: 'balanceOf',
                    args: [hot],
                    blockNumber: block,
                }),
                client.getBalance({ address: hot, blockNumber: block }),
                client.getTransactionCount({ address: hot, blockNumber: block }),
            ]);
            if (balance < units || gasBalance === 0n) {
                this.logger.warn(`ALERT WD-${w.number}: hot wallet ${hot} lacks ${balance < units ? 'test-USDT' : 'gas'} — withdrawal stays queued`);
                return w.status;
            }
            await this.signer.send({
                role: 'withdrawal',
                to: token,
                data: (0, viem_1.encodeFunctionData)({
                    abi: viem_1.erc20Abi,
                    functionName: 'transfer',
                    args: [w.toAddress, units],
                }),
                purpose: 'withdrawal',
                refId: w.id,
                abi: TOKEN_ABI,
                onStored: async (tx, row) => {
                    await this.assertLiquidity(tx, w.number, row, balance, minedNonce, units);
                    await this.markBroadcast(tx, w.id, row);
                },
            });
        }
        catch (err) {
            if (err instanceof HotWalletShortError) {
                this.logger.warn(`ALERT WD-${w.number}: ${err.message} — withdrawal stays queued`);
                return (await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
            }
            if (err instanceof chain_errors_1.ChainRevertError) {
                await this.failWithdrawal(w.id, `transfer would revert (${err.message})`);
                return 'failed';
            }
            const level = err instanceof chain_errors_1.ChainUnavailableError ? 'warn' : 'error';
            this.logger[level](`WD-${w.number}: broadcast postponed — ${(0, chain_errors_1.errorSummary)(err)}`);
            return (await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
        }
        return (await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status;
    }
    /**
     * Inside the outbox transaction, i.e. under the signer's nonce row lock (sends from the hot wallet are serialised):
     * the balance read at `block` minus every withdrawal transfer we signed that is not mined at that block (nonce ≥
     * `minedNonce`, not dropped / reverted) must still cover this transfer. Otherwise nothing is stored or sent — the
     * withdrawal stays queued instead of reverting on-chain later (concurrent broadcasts, worker concurrency 4).
     */
    async assertLiquidity(tx, number, row, balance, minedNonce, units) {
        const inFlight = await tx.chainTransaction.findMany({
            where: {
                purpose: 'withdrawal',
                chainId: row.chainId,
                fromAddress: row.fromAddress,
                status: { in: ['signed', 'broadcast', 'mined'] },
                nonce: { gte: minedNonce },
                id: { not: row.id },
            },
            select: { refId: true },
        });
        const ids = inFlight.map((r) => r.refId).filter((r) => Boolean(r));
        const pending = ids.length
            ? await tx.withdrawal.aggregate({ where: { id: { in: ids } }, _sum: { netAmount: true } })
            : null;
        const reserved = (0, money_1.toBaseUnits)(pending?._sum.netAmount?.toFixed() ?? '0', chains_1.CHAINS.arbitrum.usdtDecimals);
        if (balance - reserved < units) {
            throw new HotWalletShortError(`hot wallet holds ${balance} base units, ${reserved} already reserved by ${ids.length} unmined withdrawal(s); WD-${number} needs ${units}`);
        }
    }
    /** Inside the outbox transaction: queued → broadcast with the (deterministic) tx hash. */
    async markBroadcast(tx, id, row) {
        await tx.$queryRaw `SELECT id FROM withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
        const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
        if (w.status !== 'queued') {
            throw new Error(`WD-${w.number} is ${w.status}; not broadcasting`);
        }
        await tx.withdrawal.update({
            where: { id },
            data: { txHash: row.txHash, broadcastAt: new Date() },
        });
        await this.withdrawals.transition(tx, w, 'broadcast', { type: 'system', id: null }, `Sent on-chain · ${row.txHash.slice(0, 6)}…${row.txHash.slice(-4)} (nonce ${row.nonce})`);
    }
    async failWithdrawal(id, reason) {
        await this.prisma.tx(async (tx) => {
            await tx.$queryRaw `SELECT id FROM withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
            const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
            if (w.status !== 'queued' && w.status !== 'broadcast')
                return;
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
    async trackAll() {
        const summary = { confirmed: 0, failed: 0, pending: 0, broadcast: 0 };
        if (!this.enabled)
            return summary;
        const sent = await this.prisma.withdrawal.findMany({
            where: { status: 'broadcast', network: 'arbitrum', isDemo: false },
            orderBy: { broadcastAt: 'asc' },
            take: 100,
        });
        for (const w of sent) {
            try {
                const outcome = await this.track(w);
                summary[outcome]++;
            }
            catch (err) {
                summary.pending++;
                this.logger.warn(`WD-${w.number}: tracking failed — ${(0, chain_errors_1.errorSummary)(err)}`);
            }
        }
        const queued = await this.prisma.withdrawal.findMany({
            where: { status: 'queued', network: 'arbitrum', isDemo: false },
            orderBy: { createdAt: 'asc' },
            take: 20,
        });
        for (const w of queued) {
            if ((await this.broadcast(w.id)) === 'broadcast')
                summary.broadcast++;
        }
        return summary;
    }
    /** Track one broadcast withdrawal by id. */
    async trackOne(id) {
        const w = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
        if (w.status !== 'broadcast')
            return w.status === 'confirmed' ? 'confirmed' : w.status === 'failed' ? 'failed' : 'pending';
        return this.track(w);
    }
    async track(w) {
        const row = await this.prisma.chainTransaction.findFirst({
            where: { purpose: 'withdrawal', refId: w.id },
            orderBy: { createdAt: 'desc' },
        });
        if (!row)
            return 'pending';
        const res = await this.signer.track(row, this.config.env.WITHDRAWAL_CONFIRMATIONS);
        if (res.state === 'pending')
            return 'pending';
        if (res.state === 'mined') {
            await this.prisma.tx(async (tx) => {
                await tx.$queryRaw `SELECT id FROM withdrawals WHERE id = ${w.id}::uuid FOR UPDATE`;
                const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: w.id } });
                if (current.status === 'broadcast')
                    await this.withdrawals.confirm(tx, current, row.txHash);
            });
            return 'confirmed';
        }
        await this.failWithdrawal(w.id, res.state === 'reverted'
            ? 'token transfer reverted on-chain'
            : 'transaction dropped (nonce replaced)');
        return 'failed';
    }
};
exports.WithdrawalBroadcasterService = WithdrawalBroadcasterService;
exports.WithdrawalBroadcasterService = WithdrawalBroadcasterService = WithdrawalBroadcasterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig,
        blockchain_service_1.BlockchainService,
        chain_signer_service_1.ChainSignerService,
        withdrawals_service_1.WithdrawalsService])
], WithdrawalBroadcasterService);
//# sourceMappingURL=withdrawal-broadcaster.service.js.map