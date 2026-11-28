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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WithdrawalsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalsService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const chains_1 = require("@gp/shared/chains");
const enums_1 = require("@gp/shared/enums");
const fees_1 = require("@gp/shared/fees");
const limits_1 = require("@gp/shared/limits");
const money_1 = require("@gp/shared/money");
const schemas_1 = require("@gp/shared/schemas");
const node_crypto_1 = require("node:crypto");
const errors_1 = require("../../common/errors");
const money_2 = require("../../common/money");
const time_1 = require("../../common/time");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const queues_1 = require("../../infra/queues/queues");
const aml_service_1 = require("../aml/aml.service");
const audit_service_1 = require("../audit/audit.service");
const feature_flags_service_1 = require("../feature-flags/feature-flags.service");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const ledger_service_1 = require("../ledger/ledger.service");
const posting_1 = require("../ledger/posting");
const notifications_service_1 = require("../notifications/notifications.service");
const step_up_service_1 = require("../security/step-up.service");
const TX_STATUS = {
    requested: 'processing',
    risk_check: 'processing',
    under_review: 'under_review',
    queued: 'processing',
    broadcast: 'processing',
    confirmed: 'completed',
    failed: 'failed',
    rejected: 'rejected',
    cancelled: 'cancelled',
};
const COUNTS_TOWARDS_LIMIT = [
    'requested',
    'risk_check',
    'under_review',
    'queued',
    'broadcast',
    'confirmed',
];
/**
 * Withdrawals: request (zod-validated, step-up 2FA, KYC daily limit, balance) moves AVAILABLE → LOCKED, then the
 * risk/AML screening routes it to `queued` or `under_review` (four-eyes for flagged). Every status change follows
 * WITHDRAWAL_TRANSITIONS and is recorded in withdrawal_events. Rejection / failure / cancellation return the funds.
 */
let WithdrawalsService = WithdrawalsService_1 = class WithdrawalsService {
    prisma;
    ledger;
    idempotency;
    stepUp;
    aml;
    audit;
    notifications;
    queue;
    flags;
    logger = new common_1.Logger(WithdrawalsService_1.name);
    constructor(prisma, ledger, idempotency, stepUp, aml, audit, notifications, queue, flags) {
        this.prisma = prisma;
        this.ledger = ledger;
        this.idempotency = idempotency;
        this.stepUp = stepUp;
        this.aml = aml;
        this.audit = audit;
        this.notifications = notifications;
        this.queue = queue;
        this.flags = flags;
    }
    quote(amount, network) {
        return (0, fees_1.withdrawalQuote)(amount, network);
    }
    async request(user, input, stepUpToken) {
        await this.flags.assertEnabled('withdrawals.enabled', 'Withdrawals');
        const quote = (0, fees_1.withdrawalQuote)(input.amount, input.network);
        if (!quote.meetsMinimum) {
            throw new errors_1.AppError('VALIDATION_FAILED', `Minimum withdrawal is ${quote.minWithdrawal} USDT (after network fees)`, {
                quote,
            });
        }
        const address = (0, schemas_1.normalizeAddress)(input.network, input.address);
        const addressKey = chains_1.CHAINS[input.network].family === 'evm' ? address.toLowerCase() : address;
        const request = { network: input.network, address: addressKey, amount: quote.amount };
        const existing = await this.prisma.withdrawal.findUnique({
            where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } },
        });
        if (!existing) {
            // Cheap policy checks first, so no 2FA code is consumed for a request that cannot proceed.
            const profile = await this.prisma.userProfile.findUnique({
                where: { userId: user.id },
                select: { kycLevel: true },
            });
            if ((0, money_1.money)(limits_1.DAILY_WITHDRAWAL_LIMIT[profile?.kycLevel ?? 'none']).isZero()) {
                throw new errors_1.AppError('KYC_REQUIRED', 'Verify your identity (KYC Level 1) before withdrawing', {
                    kycLevel: profile?.kycLevel ?? 'none',
                });
            }
            await this.stepUp.assert(user, 'withdrawal', { totpCode: input.totpCode, stepUpToken });
        }
        const result = await this.idempotency.run({ scope: 'withdrawal.request', ownerId: user.id, key: input.idempotencyKey, request }, async (tx) => {
            const profile = await tx.userProfile.findUnique({
                where: { userId: user.id },
                select: { kycLevel: true },
            });
            const level = profile?.kycLevel ?? 'none';
            const limit = limits_1.DAILY_WITHDRAWAL_LIMIT[level];
            if ((0, money_1.money)(limit).isZero()) {
                throw new errors_1.AppError('KYC_REQUIRED', 'Verify your identity (KYC Level 1) before withdrawing', { kycLevel: level });
            }
            const today = await tx.withdrawal.aggregate({
                where: {
                    userId: user.id,
                    createdAt: { gte: (0, time_1.periodStart)('day') },
                    status: { in: COUNTS_TOWARDS_LIMIT },
                },
                _sum: { amount: true },
            });
            const usedToday = (0, money_1.money)(today._sum.amount?.toFixed() ?? '0');
            if (usedToday.plus((0, money_1.money)(quote.amount)).gt((0, money_1.money)(limit))) {
                throw new errors_1.AppError('VALIDATION_FAILED', `This exceeds your daily withdrawal limit of ${limit} USDT`, {
                    dailyLimit: limit,
                    usedToday: (0, money_1.toUSDTString)(usedToday),
                    kycLevel: level,
                });
            }
            const wallet = await tx.userWallet.findUnique({
                where: {
                    userId_network_address: {
                        userId: user.id,
                        network: input.network,
                        address: addressKey,
                    },
                },
            });
            if (wallet?.whitelistedAt &&
                wallet.whitelistAvailableAt &&
                wallet.whitelistAvailableAt > new Date()) {
                throw new errors_1.AppError('ADDRESS_NOT_WHITELISTED', 'This address is in its 24 h new-address cool-down', {
                    availableAt: wallet.whitelistAvailableAt.toISOString(),
                });
            }
            const withdrawal = await tx.withdrawal.create({
                data: {
                    userId: user.id,
                    network: input.network,
                    toAddress: addressKey,
                    amount: quote.amount,
                    networkFee: quote.networkFee,
                    platformFee: quote.platformFee,
                    netAmount: quote.youReceive,
                    status: 'requested',
                    idempotencyKey: input.idempotencyKey,
                    events: {
                        create: {
                            toStatus: 'requested',
                            actorType: 'user',
                            actorId: user.id,
                            note: 'Submitted',
                        },
                    },
                },
            });
            const reference = `WD-${withdrawal.number}`;
            const record = await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'withdrawal',
                    status: 'processing',
                    reference,
                    amount: quote.amount,
                    networkFee: quote.networkFee,
                    platformFee: quote.platformFee,
                    netAmount: quote.youReceive,
                    direction: 'out',
                    network: input.network,
                    description: `Withdrawal · ${chains_1.CHAINS[input.network].name}`,
                    withdrawalId: withdrawal.id,
                    metadata: { address: addressKey, statusDetail: 'Security checks' },
                },
            });
            await this.ledger.post(tx, {
                kind: 'withdrawal_lock',
                description: `${reference} requested — funds locked`,
                reference,
                eventKey: `withdrawal:${withdrawal.id}:lock`,
                transactionId: record.id,
                lines: (0, posting_1.withdrawalLockLines)(user.id, quote.amount),
            });
            await this.notifications.notify(tx, {
                userId: user.id,
                type: 'withdrawal.requested',
                title: 'Withdrawal requested',
                body: `${quote.amount} USDT to ${addressKey.slice(0, 6)}…${addressKey.slice(-4)} — you receive ${quote.youReceive} USDT.`,
                data: { reference },
            });
            return { id: withdrawal.id };
        });
        if (!result.replayed) {
            try {
                await this.runRiskCheck(result.value.id);
            }
            catch (err) {
                // Never lose a request: the queued job retries the screening.
                this.logger.warn(`Inline risk check failed for ${result.value.id}: ${String(err)} — queued for retry`);
                await this.queue.add(queues_1.JOBS.WITHDRAWAL_RISK_CHECK, { withdrawalId: result.value.id }, { jobId: `risk-${result.value.id}` });
            }
        }
        return { ...(await this.get(user.id, result.value.id)), replayed: result.replayed };
    }
    /** requested → risk_check → queued | under_review | rejected (funds returned). */
    async runRiskCheck(withdrawalId) {
        const w = await this.prisma.withdrawal.findUniqueOrThrow({
            where: { id: withdrawalId },
            include: { user: true },
        });
        if (w.status !== 'requested' && w.status !== 'risk_check')
            return w.status;
        if (w.status === 'requested') {
            await this.prisma.tx((tx) => this.transition(tx, w, 'risk_check', { type: 'system', id: null }, 'Security checks started'));
        }
        const [wallet, priorConfirmed, last24h] = await Promise.all([
            this.prisma.userWallet.findUnique({
                where: {
                    userId_network_address: { userId: w.userId, network: w.network, address: w.toAddress },
                },
            }),
            this.prisma.withdrawal.count({
                where: { userId: w.userId, toAddress: w.toAddress, status: 'confirmed' },
            }),
            this.prisma.withdrawal.count({
                where: {
                    userId: w.userId,
                    createdAt: { gte: new Date(Date.now() - 86_400_000) },
                    id: { not: w.id },
                },
            }),
        ]);
        const whitelisted = Boolean(wallet?.whitelistedAt);
        const result = await this.prisma.tx(async (tx) => {
            const screening = await this.aml.screenWithdrawal(tx, {
                withdrawalId: w.id,
                userId: w.userId,
                network: w.network,
                address: w.toAddress,
                amount: w.amount.toFixed(),
                newDestination: !whitelisted || priorConfirmed === 0,
                whitelisted,
                withdrawalsLast24h: last24h,
                accountAgeDays: (Date.now() - w.user.createdAt.getTime()) / 86_400_000,
            });
            const current = await tx.withdrawal.findUniqueOrThrow({ where: { id: w.id } });
            await tx.withdrawal.update({
                where: { id: w.id },
                data: {
                    riskLevel: screening.riskLevel,
                    riskFlags: screening.flags,
                    flagged: screening.decision !== 'approve',
                    requiresFourEyes: screening.decision === 'review',
                },
            });
            const note = `${screening.checks.length} checks · risk ${screening.riskLevel}${screening.reason ? ` — ${screening.reason}` : ''}`;
            if (screening.decision === 'reject') {
                await this.transition(tx, current, 'rejected', { type: 'system', id: null }, `Rejected — ${screening.reason ?? 'screening'}`);
                await this.release(tx, current, 'rejected');
                await tx.withdrawal.update({
                    where: { id: w.id },
                    data: { rejectedAt: new Date(), rejectionReason: screening.reason },
                });
                return 'rejected';
            }
            const next = screening.decision === 'review' ? 'under_review' : 'queued';
            await this.transition(tx, current, next, { type: 'system', id: null }, note);
            await this.notifications.notify(tx, {
                userId: w.userId,
                type: next === 'queued' ? 'withdrawal.queued' : 'withdrawal.under_review',
                title: next === 'queued' ? 'Withdrawal queued' : 'Withdrawal under review',
                body: next === 'queued'
                    ? 'Your withdrawal passed security checks and is queued for sending.'
                    : (screening.reason ?? 'Manual review'),
                data: { reference: `WD-${w.number}` },
            });
            return next;
        });
        if (result === 'queued')
            await this.enqueueBroadcast(w.id);
        return result;
    }
    async cancel(user, id) {
        const w = await this.prisma.withdrawal.findFirst({ where: { id, userId: user.id } });
        if (!w)
            throw (0, errors_1.notFound)('Withdrawal');
        if (!(0, enums_1.canTransitionWithdrawal)(w.status, 'cancelled')) {
            throw new errors_1.AppError('CONFLICT', `A withdrawal that is ${enums_1.WITHDRAWAL_STATUS_LABEL[w.status].toLowerCase()} cannot be cancelled`);
        }
        await this.prisma.tx(async (tx) => {
            await this.transition(tx, w, 'cancelled', { type: 'user', id: user.id }, 'Cancelled by you — funds returned to Available');
            await this.release(tx, w, 'cancelled');
            await tx.withdrawal.update({ where: { id }, data: { cancelledAt: new Date() } });
            await tx.adminApproval.updateMany({
                where: { targetType: 'withdrawal', targetId: id, status: 'pending' },
                data: { status: 'cancelled' },
            });
        });
        return this.get(user.id, id);
    }
    /**
     * Admin approval of an under-review withdrawal. Flagged ones need FOUR EYES: the first approval records a pending
     * admin_approvals row; a DIFFERENT admin must approve to queue it.
     */
    async adminApprove(admin, id, reason, meta) {
        return this.prisma
            .tx(async (tx) => {
            const w = await this.lockRow(tx, id);
            if (w.status !== 'under_review')
                throw new errors_1.AppError('CONFLICT', `Withdrawal is ${w.status}, not under review`);
            if (w.requiresFourEyes) {
                const pending = await tx.adminApproval.findFirst({
                    where: {
                        targetType: 'withdrawal',
                        targetId: id,
                        action: 'withdrawal.approve',
                        status: 'pending',
                    },
                });
                if (!pending) {
                    const approval = await tx.adminApproval.create({
                        data: {
                            action: 'withdrawal.approve',
                            targetType: 'withdrawal',
                            targetId: id,
                            requestedByAdminId: admin.id,
                            requestReason: reason,
                            payload: { reference: `WD-${w.number}`, amount: w.amount.toFixed() },
                        },
                    });
                    await this.audit.record({
                        actorType: 'admin',
                        actorId: admin.id,
                        actorLabel: admin.name,
                        action: 'withdrawal.approve.first',
                        targetType: 'withdrawal',
                        targetId: id,
                        reason,
                        outcome: 'pending_approval',
                        ip: meta.ip,
                        requestId: meta.requestId,
                        metadata: { approvalId: approval.id, reference: `WD-${w.number}` },
                    }, tx);
                    return {
                        status: w.status,
                        fourEyes: { required: true, approvals: 1, of: 2, approvalId: approval.id },
                    };
                }
                if (pending.requestedByAdminId === admin.id) {
                    throw new errors_1.AppError('FORBIDDEN', 'Four-eyes rule: a different admin must give the second approval');
                }
                await tx.adminApproval.update({
                    where: { id: pending.id },
                    data: {
                        status: 'approved',
                        decidedByAdminId: admin.id,
                        decisionReason: reason,
                        decidedAt: new Date(),
                    },
                });
            }
            await this.transition(tx, w, 'queued', { type: 'admin', id: admin.id }, `Approved after review — ${reason}`);
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'withdrawal.approve',
                targetType: 'withdrawal',
                targetId: id,
                reason,
                ip: meta.ip,
                requestId: meta.requestId,
                metadata: { reference: `WD-${w.number}`, fourEyes: w.requiresFourEyes },
            }, tx);
            await this.notifications.notify(tx, {
                userId: w.userId,
                type: 'withdrawal.queued',
                title: 'Withdrawal approved',
                body: 'Your withdrawal was reviewed and is queued for sending.',
                data: { reference: `WD-${w.number}` },
            });
            return {
                status: 'queued',
                fourEyes: {
                    required: w.requiresFourEyes,
                    approvals: w.requiresFourEyes ? 2 : 1,
                    of: w.requiresFourEyes ? 2 : 1,
                },
            };
        })
            .then(async (r) => {
            if (r.status === 'queued')
                await this.enqueueBroadcast(id);
            return r;
        });
    }
    async adminReject(admin, id, reason, meta) {
        return this.prisma.tx(async (tx) => {
            const w = await this.lockRow(tx, id);
            if (!(0, enums_1.canTransitionWithdrawal)(w.status, 'rejected'))
                throw new errors_1.AppError('CONFLICT', `Withdrawal is ${w.status} and cannot be rejected`);
            await this.transition(tx, w, 'rejected', { type: 'admin', id: admin.id }, `Rejected — ${reason}`);
            await this.release(tx, w, 'rejected');
            await tx.withdrawal.update({
                where: { id },
                data: { rejectedAt: new Date(), rejectionReason: reason },
            });
            await tx.adminApproval.updateMany({
                where: { targetType: 'withdrawal', targetId: id, status: 'pending' },
                data: {
                    status: 'rejected',
                    decidedByAdminId: admin.id,
                    decisionReason: reason,
                    decidedAt: new Date(),
                },
            });
            await this.audit.record({
                actorType: 'admin',
                actorId: admin.id,
                actorLabel: admin.name,
                action: 'withdrawal.reject',
                targetType: 'withdrawal',
                targetId: id,
                reason,
                ip: meta.ip,
                requestId: meta.requestId,
                metadata: { reference: `WD-${w.number}`, amount: w.amount.toFixed() },
            }, tx);
            await this.notifications.notify(tx, {
                userId: w.userId,
                type: 'withdrawal.rejected',
                title: 'Withdrawal rejected',
                body: `Funds (${(0, money_2.usdt)(w.amount)} USDT) were returned to Available.`,
                data: { reference: `WD-${w.number}` },
            });
            return { status: 'rejected' };
        });
    }
    /**
     * Broadcast step WITHOUT a signer (WITHDRAWAL_BROADCASTER_ENABLED=false): queued withdrawals stay queued; DEMO
     * builds can simulate the on-chain confirmation (POST /dev/withdrawals/:id/simulate-confirm). With the testnet
     * broadcaster on, WithdrawalBroadcasterService sends and tracks the transfer instead.
     */
    async broadcast(id) {
        const w = await this.prisma.withdrawal.findUniqueOrThrow({ where: { id } });
        if (w.status !== 'queued')
            return w.status;
        this.logger.log(`WD-${w.number} queued — no testnet signer configured, waiting (no broadcast).`);
        return w.status;
    }
    /** DEMO: queued → broadcast → confirmed with a fake testnet tx hash, posting the real settlement entries. */
    async simulateConfirm(userId, id) {
        const txHash = `0x${(0, node_crypto_1.randomBytes)(32).toString('hex')}`;
        await this.prisma.tx(async (tx) => {
            const w = await this.lockRow(tx, id);
            if (w.userId !== userId)
                throw (0, errors_1.notFound)('Withdrawal');
            if (w.status !== 'queued')
                throw new errors_1.AppError('CONFLICT', `Withdrawal is ${w.status}; only queued withdrawals can be sent`);
            await tx.withdrawal.update({
                where: { id },
                data: { txHash, broadcastAt: new Date(), isDemo: true },
            });
            const sent = await this.transition(tx, w, 'broadcast', { type: 'system', id: null }, 'Sent (DEMO simulation)');
            await this.confirm(tx, sent, txHash);
        });
        return this.get(userId, id);
    }
    /** broadcast → confirmed: LOCKED −amount → CHAIN_CLEARING +net, OPERATOR_REVENUE +network fee. */
    async confirm(tx, w, txHash) {
        const done = await this.transition(tx, w, 'confirmed', { type: 'system', id: null }, `Confirmed on-chain · ${txHash.slice(0, 6)}…${txHash.slice(-4)}`);
        await tx.withdrawal.update({ where: { id: w.id }, data: { confirmedAt: new Date(), txHash } });
        const record = await tx.transaction.findFirst({ where: { withdrawalId: w.id } });
        await this.ledger.post(tx, {
            kind: 'withdrawal_settle',
            description: `WD-${w.number} confirmed`,
            reference: `WD-${w.number}`,
            eventKey: `withdrawal:${w.id}:settle`,
            transactionId: record?.id ?? null,
            isDemo: w.isDemo,
            lines: (0, posting_1.withdrawalSettleLines)(w.userId, w.network, {
                amount: w.amount.toFixed(),
                networkFee: w.networkFee.toFixed(),
                platformFee: w.platformFee.toFixed(),
            }),
        });
        await tx.transaction.updateMany({
            where: { withdrawalId: w.id },
            data: { txHash, completedAt: new Date() },
        });
        await this.notifications.notify(tx, {
            userId: w.userId,
            type: 'withdrawal.confirmed',
            title: 'Withdrawal completed',
            body: `${(0, money_2.usdt)(w.netAmount)} USDT sent.`,
            data: { reference: `WD-${w.number}`, txHash },
        });
        return done;
    }
    /** broadcast → failed: funds back to Available, no network fee charged. */
    async fail(tx, w, reason) {
        await this.transition(tx, w, 'failed', { type: 'system', id: null }, `Failed — ${reason}. Funds returned to Available`);
        await this.release(tx, w, 'failed');
        await tx.withdrawal.update({
            where: { id: w.id },
            data: { failedAt: new Date(), failureReason: reason },
        });
    }
    async list(userId, query) {
        const [rows, total] = await Promise.all([
            this.prisma.withdrawal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                include: { events: { orderBy: { createdAt: 'asc' } } },
            }),
            this.prisma.withdrawal.count({ where: { userId } }),
        ]);
        return (0, schemas_1.paginate)(rows.map((w) => this.view(w)), total, query);
    }
    async get(userId, id) {
        const w = await this.prisma.withdrawal.findFirst({
            where: { id, ...(userId ? { userId } : {}) },
            include: { events: { orderBy: { createdAt: 'asc' } } },
        });
        if (!w)
            throw (0, errors_1.notFound)('Withdrawal');
        return this.view(w);
    }
    view(w) {
        return {
            id: w.id,
            reference: `WD-${w.number}`,
            network: w.network,
            toAddress: w.toAddress,
            amount: (0, money_2.usdt)(w.amount),
            networkFee: (0, money_2.usdt)(w.networkFee),
            platformFee: (0, money_2.usdt)(w.platformFee),
            youReceive: (0, money_2.usdt)(w.netAmount),
            status: w.status,
            statusLabel: enums_1.WITHDRAWAL_STATUS_LABEL[w.status],
            flagged: w.flagged,
            requiresFourEyes: w.requiresFourEyes,
            riskLevel: w.riskLevel,
            txHash: w.txHash,
            rejectionReason: w.rejectionReason,
            failureReason: w.failureReason,
            timeline: (w.events ?? []).map((e) => ({
                status: e.toStatus,
                label: e.note ?? enums_1.WITHDRAWAL_STATUS_LABEL[e.toStatus],
                at: e.createdAt.toISOString(),
            })),
            createdAt: w.createdAt.toISOString(),
            updatedAt: w.updatedAt.toISOString(),
            isDemo: w.isDemo,
        };
    }
    async enqueueBroadcast(id) {
        try {
            await this.queue.add(queues_1.JOBS.WITHDRAWAL_BROADCAST, { withdrawalId: id }, { jobId: `broadcast-${id}` });
        }
        catch (err) {
            this.logger.warn(`Could not enqueue broadcast for ${id}: ${String(err)}`);
        }
    }
    async lockRow(tx, id) {
        await tx.$queryRaw `SELECT id FROM withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
        const w = await tx.withdrawal.findUnique({ where: { id } });
        if (!w)
            throw (0, errors_1.notFound)('Withdrawal');
        return w;
    }
    /** Guarded status change: allowed edge + compare-and-set on the current status + event row + tx status. */
    async transition(tx, w, to, actor, note) {
        if (!(0, enums_1.canTransitionWithdrawal)(w.status, to)) {
            throw new errors_1.AppError('CONFLICT', `Illegal withdrawal transition ${w.status} → ${to}`);
        }
        const res = await tx.withdrawal.updateMany({
            where: { id: w.id, status: w.status },
            data: { status: to },
        });
        if (res.count !== 1)
            throw new errors_1.AppError('CONFLICT', 'Withdrawal changed concurrently — retry');
        await tx.withdrawalEvent.create({
            data: {
                withdrawalId: w.id,
                fromStatus: w.status,
                toStatus: to,
                actorType: actor.type,
                actorId: actor.id,
                note,
            },
        });
        await tx.transaction.updateMany({
            where: { withdrawalId: w.id },
            data: {
                status: TX_STATUS[to],
                metadata: { address: w.toAddress, statusDetail: note },
                ...(to === 'rejected' || to === 'cancelled' || to === 'failed'
                    ? { completedAt: new Date() }
                    : {}),
            },
        });
        return { ...w, status: to };
    }
    async release(tx, w, why) {
        await this.ledger.post(tx, {
            kind: 'withdrawal_release',
            description: `WD-${w.number} ${why} — funds returned to Available`,
            reference: `WD-${w.number}`,
            eventKey: `withdrawal:${w.id}:release`,
            lines: (0, posting_1.withdrawalReleaseLines)(w.userId, w.amount.toFixed()),
            isDemo: w.isDemo,
        });
    }
};
exports.WithdrawalsService = WithdrawalsService;
exports.WithdrawalsService = WithdrawalsService = WithdrawalsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(7, (0, bullmq_1.InjectQueue)(queues_1.QUEUES.WITHDRAWALS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ledger_service_1.LedgerService,
        idempotency_service_1.IdempotencyService,
        step_up_service_1.StepUpService,
        aml_service_1.AmlService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService, Function, feature_flags_service_1.FeatureFlagsService])
], WithdrawalsService);
//# sourceMappingURL=withdrawals.service.js.map