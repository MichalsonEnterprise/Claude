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
var RoundMirrorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundMirrorService = exports.MirrorMismatchError = void 0;
const common_1 = require("@nestjs/common");
const abi_1 = require("@gp/contracts/abi");
const verify_1 = require("@gp/contracts/verify");
const format_1 = require("@gp/shared/format");
const money_1 = require("@gp/shared/money");
const viem_1 = require("viem");
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("../../common/crypto");
const errors_1 = require("../../common/errors");
const app_config_1 = require("../../config/app-config");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const blockchain_service_1 = require("../blockchain/blockchain.service");
const chain_errors_1 = require("../blockchain/chain-errors");
const chain_signer_service_1 = require("../blockchain/chain-signer.service");
const evm_chain_1 = require("../blockchain/evm-chain");
const selection_1 = require("../randomness/selection");
const commitments_1 = require("./commitments");
const STATUS_NAME = Object.fromEntries(Object.entries(abi_1.RoundStatus).map(([name, v]) => [v, name]));
class MirrorMismatchError extends Error {
    name = 'MirrorMismatchError';
}
exports.MirrorMismatchError = MirrorMismatchError;
const COMMIT_CHUNK = 2_000;
/**
 * Mirrors Global Pool rounds on the GlobalPoolRounds contract (TESTNET ONLY) so every draw is publicly verifiable:
 *   open    → openRound(rules, rulesHash)                     OPERATOR key
 *   close   → per-entry salts + commitments → entries Merkle root → commitEntries(root, totals, pool)   OPERATOR
 *   failed thresholds → cancelRound(roundId, THRESHOLDS_NOT_MET) KEEPER (permissionless)
 *   draw    → requestDraw(roundId) → Chainlink VRF v2.5 → DrawFulfilled (read by ChainlinkVrfProvider)  KEEPER
 *   settle  → DB winners must equal computeWinners() → payouts Merkle root → recordSettlement(root, pool)  SETTLER
 *
 * Every step is idempotent and crash-safe: the CHAIN state decides whether a step is done (a step whose effect is
 * already on-chain is marked confirmed without sending), transactions go through the signer outbox, and frozen data
 * (salts, commitments, payout leaves) is written once inside the same DB transaction as its root. Nothing here can
 * choose or alter an outcome: winners come only from the VRF word, and settlement refuses to run if the database
 * and the contract disagree.
 */
let RoundMirrorService = RoundMirrorService_1 = class RoundMirrorService {
    prisma;
    config;
    blockchain;
    signer;
    audit;
    logger = new common_1.Logger(RoundMirrorService_1.name);
    saltKeyCache = null;
    constructor(prisma, config, blockchain, signer, audit) {
        this.prisma = prisma;
        this.config = config;
        this.blockchain = blockchain;
        this.signer = signer;
        this.audit = audit;
    }
    get enabled() {
        return this.config.env.POOL_ONCHAIN_MIRROR;
    }
    /** Rounds the lifecycle draws (non-DEMO, or DEMO with DEMO_ROUNDS_AUTO_SETTLE) are mirrored when enabled. */
    shouldMirror(round) {
        return this.enabled && (!round.isDemo || this.config.env.DEMO_ROUNDS_AUTO_SETTLE);
    }
    contract() {
        const address = this.config.env.POOL_CONTRACT_ADDRESS;
        if (!address)
            throw new chain_errors_1.ChainUnavailableError('POOL_CONTRACT_ADDRESS is not configured');
        return address;
    }
    onchainId(round) {
        return round.onchainRoundId ?? BigInt(round.number);
    }
    saltKey() {
        if (this.saltKeyCache)
            return this.saltKeyCache;
        const explicit = this.config.env.ENTRY_SALT_ENCRYPTION_KEY;
        this.saltKeyCache = explicit
            ? Buffer.from(explicit, 'base64')
            : Buffer.from((0, node_crypto_1.hkdfSync)('sha256', this.config.totpKey, Buffer.alloc(0), 'gp:entry-salt:v1', 32));
        return this.saltKeyCache;
    }
    decryptSalt(saltEnc) {
        return (0, crypto_1.decryptSecret)(saltEnc, this.saltKey());
    }
    rules(round) {
        return {
            roundId: this.onchainId(round),
            closesAt: round.closesAt,
            entryPrice: round.entryPrice.toFixed(),
            feePerEntry: round.platformFeePerEntry.toFixed(),
            minParticipants: round.minParticipants,
            minPool: round.minPool.toFixed(),
            prizeSplitBps: round.prizeSplitBps,
        };
    }
    // ── chain reads ───────────────────────────────────────────────────────────────────────────
    async read(round) {
        const client = await this.signer.client();
        return client.readContract({
            address: this.contract(),
            abi: abi_1.globalPoolRoundsAbi,
            functionName: 'getRound',
            args: [this.onchainId(round)],
        });
    }
    async readView(functionName, round) {
        const client = await this.signer.client();
        return (await client.readContract({
            address: this.contract(),
            abi: abi_1.globalPoolRoundsAbi,
            functionName,
            args: [this.onchainId(round)],
        }));
    }
    async recordStatus(round, state) {
        const name = STATUS_NAME[state.status] ?? String(state.status);
        if (round.onchainStatus !== name) {
            await this.prisma.round.update({ where: { id: round.id }, data: { onchainStatus: name } });
            round.onchainStatus = name;
        }
    }
    // ── generic idempotent step ───────────────────────────────────────────────────────────────
    async step(round, step, spec) {
        const latest = await this.prisma.roundChainOp.findFirst({
            where: { roundId: round.id, step },
            orderBy: { attempt: 'desc' },
            include: { chainTx: true },
        });
        if (latest?.status === 'confirmed' && !spec.newAttempt) {
            return { done: true, op: latest, changed: false };
        }
        let state = await this.read(round);
        await this.recordStatus(round, state);
        if (spec.done(state)) {
            spec.check?.(state);
            const existing = spec.newAttempt && latest?.status === 'confirmed' ? null : latest;
            const next = (latest?.attempt ?? 0) + 1;
            return { done: true, op: await this.confirmOp(round, step, existing, next), changed: true };
        }
        let op = latest;
        if (op?.status === 'sent' && op.chainTxId) {
            const res = await this.signer.waitFor(await this.prisma.chainTransaction.findUniqueOrThrow({ where: { id: op.chainTxId } }), this.config.env.CHAIN_WRITE_CONFIRMATIONS, this.config.env.CHAIN_TX_WAIT_SECONDS * 1000);
            if (res.state === 'pending')
                return { done: false, op, changed: false };
            state = await this.read(round);
            await this.recordStatus(round, state);
            if (res.state === 'mined' && spec.done(state)) {
                spec.check?.(state);
                const confirmed = await this.prisma.roundChainOp.update({
                    where: { id: op.id },
                    data: { status: 'confirmed', blockNumber: res.row.blockNumber, error: null },
                });
                return { done: true, op: confirmed, changed: true };
            }
            op = await this.prisma.roundChainOp.update({
                where: { id: op.id },
                data: { status: 'failed', error: `transaction ${res.state}` },
            });
            if (spec.done(state)) {
                // Someone else's transaction achieved the effect (e.g. a permissionless cancel / draw request).
                spec.check?.(state);
                return {
                    done: true,
                    op: await this.confirmOp(round, step, null, op.attempt + 1),
                    changed: true,
                };
            }
        }
        const attempt = !op || op.status === 'failed' || (spec.newAttempt && op.status === 'confirmed')
            ? (op?.attempt ?? 0) + 1
            : op.attempt;
        const pending = op && op.attempt === attempt
            ? op
            : await this.prisma.roundChainOp.create({
                data: { roundId: round.id, step, attempt, status: 'pending' },
            });
        let sent;
        try {
            sent = await this.signer.send({
                role: spec.role,
                to: this.contract(),
                data: spec.data(),
                purpose: 'round_op',
                refId: pending.id,
                abi: abi_1.globalPoolRoundsAbi,
                onStored: async (tx, row) => {
                    await tx.roundChainOp.update({
                        where: { id: pending.id },
                        data: { status: 'sent', chainTxId: row.id, txHash: row.txHash, error: null },
                    });
                },
            });
        }
        catch (err) {
            await this.prisma.roundChainOp.update({
                where: { id: pending.id },
                data: { error: (0, chain_errors_1.errorSummary)(err).slice(0, 500) },
            });
            throw err;
        }
        const res = await this.signer.waitFor(sent, this.config.env.CHAIN_WRITE_CONFIRMATIONS, this.config.env.CHAIN_TX_WAIT_SECONDS * 1000);
        const current = await this.prisma.roundChainOp.findUniqueOrThrow({ where: { id: pending.id } });
        if (res.state === 'pending')
            return { done: false, op: current, changed: false };
        state = await this.read(round);
        await this.recordStatus(round, state);
        if (res.state === 'mined' && spec.done(state)) {
            spec.check?.(state);
            return {
                done: true,
                op: await this.prisma.roundChainOp.update({
                    where: { id: pending.id },
                    data: { status: 'confirmed', blockNumber: res.row.blockNumber, error: null },
                }),
                changed: true,
            };
        }
        return {
            done: false,
            op: await this.prisma.roundChainOp.update({
                where: { id: pending.id },
                data: { status: 'failed', error: `transaction ${res.state}` },
            }),
            changed: false,
        };
    }
    async confirmOp(round, step, existing, attempt = 1) {
        if (existing && existing.status !== 'failed') {
            return this.prisma.roundChainOp.update({
                where: { id: existing.id },
                data: { status: 'confirmed', error: null },
            });
        }
        const at = existing ? existing.attempt + 1 : attempt;
        return this.prisma.roundChainOp.upsert({
            where: { roundId_step_attempt: { roundId: round.id, step, attempt: at } },
            create: {
                roundId: round.id,
                step,
                attempt: at,
                status: 'confirmed',
                metadata: { note: 'effect already on-chain' },
            },
            update: { status: 'confirmed' },
        });
    }
    // ── lifecycle steps ───────────────────────────────────────────────────────────────────────
    /** Adopt the round for mirroring (once) and publish its rules with openRound. */
    async ensureOpened(round) {
        if (!round.chainMirror) {
            if (round.closesAt.getTime() <= Date.now() + 60_000 ||
                !['scheduled', 'open'].includes(round.status)) {
                throw new errors_1.AppError('CONFLICT', `Round ${(0, format_1.formatRoundNumber)(round.number)} cannot be mirrored any more (closes too soon or not open)`);
            }
            const params = (0, commitments_1.onchainRoundParams)(this.rules(round));
            await this.prisma.round.updateMany({
                where: { id: round.id, chainMirror: false },
                data: {
                    chainMirror: true,
                    chainId: this.blockchain.chainId,
                    contractAddress: this.contract().toLowerCase(),
                    rulesHash: params.rulesHash,
                    onchainRoundId: params.roundId,
                },
            });
            Object.assign(round, await this.prisma.round.findUniqueOrThrow({ where: { id: round.id } }));
        }
        const p = (0, commitments_1.onchainRoundParams)(this.rules(round));
        return this.step(round, 'open', {
            role: 'operator',
            done: (s) => s.status !== abi_1.RoundStatus.None,
            check: (s) => {
                const same = s.closesAt === p.closesAt &&
                    s.entryPrice === p.entryPrice &&
                    s.feePerEntry === p.feePerEntry &&
                    s.minParticipants === p.minParticipants &&
                    s.minPool === p.minPool &&
                    s.rulesHash.toLowerCase() === p.rulesHash.toLowerCase() &&
                    s.prizeSplitBps.length === p.prizeSplitBps.length &&
                    s.prizeSplitBps.every((b, i) => b === p.prizeSplitBps[i]);
                if (!same) {
                    throw new MirrorMismatchError(`On-chain round ${p.roundId} exists with different rules than ${(0, format_1.formatRoundNumber)(round.number)}`);
                }
            },
            data: () => (0, viem_1.encodeFunctionData)({
                abi: abi_1.globalPoolRoundsAbi,
                functionName: 'openRound',
                args: [
                    p.roundId,
                    p.closesAt,
                    p.entryPrice,
                    p.feePerEntry,
                    p.minParticipants,
                    p.minPool,
                    p.prizeSplitBps,
                    p.rulesHash,
                ],
            }),
        });
    }
    /**
     * Freeze the canonical entry list (once): random per-entry salts (encrypted at rest), commitments and the entries
     * Merkle root, written in ONE DB transaction together with the root on the round. Only after the DB close.
     */
    async prepareCommitments(round) {
        if (round.status === 'open' || round.status === 'scheduled') {
            throw new errors_1.AppError('CONFLICT', `Round ${(0, format_1.formatRoundNumber)(round.number)} is still open`);
        }
        if (round.entriesMerkleRoot)
            return round.entriesMerkleRoot;
        const root = await this.prisma.tx(async (tx) => {
            await tx.$queryRaw `SELECT id FROM rounds WHERE id = ${round.id}::uuid FOR UPDATE`;
            const fresh = await tx.round.findUniqueOrThrow({ where: { id: round.id } });
            if (fresh.entriesMerkleRoot)
                return fresh.entriesMerkleRoot;
            const entries = await tx.entry.findMany({
                where: { roundId: round.id },
                orderBy: { seq: 'asc' },
                select: { id: true, seq: true, code: true, user: { select: { publicId: true } } },
            });
            if (entries.length !== fresh.entriesCount) {
                throw new errors_1.AppError('CONFLICT', 'Entry list does not match the round counters');
            }
            const built = (0, commitments_1.buildEntryCommitments)(entries.map((e) => ({
                id: e.id,
                seq: e.seq,
                code: e.code,
                userPublicId: e.user.publicId,
            })));
            const key = this.saltKey();
            for (let i = 0; i < built.rows.length; i += COMMIT_CHUNK) {
                await tx.entryCommitment.createMany({
                    data: built.rows.slice(i, i + COMMIT_CHUNK).map((r) => ({
                        entryId: r.entryId,
                        roundId: round.id,
                        index: r.index,
                        entryIdBytes32: r.entryIdBytes32,
                        userCommitment: r.userCommitment,
                        saltEnc: (0, crypto_1.encryptSecret)(r.salt, key),
                        leaf: r.leaf,
                    })),
                });
            }
            await tx.round.update({ where: { id: round.id }, data: { entriesMerkleRoot: built.root } });
            return built.root;
        }, { timeoutMs: 120_000 });
        round.entriesMerkleRoot = root;
        return root;
    }
    /** commitEntries (after closesAt). Returns whether the on-chain thresholds are met once committed. */
    async commit(round) {
        const root = await this.prepareCommitments(round);
        const totalEntries = BigInt(round.entriesCount);
        const pool = (0, money_1.toBaseUnits)(round.poolAmount.toFixed());
        const res = await this.step(round, 'commit', {
            role: 'operator',
            done: (s) => s.status !== abi_1.RoundStatus.None && s.status !== abi_1.RoundStatus.Open,
            check: (s) => {
                if (s.status === abi_1.RoundStatus.Cancelled &&
                    s.entriesRoot === commitments_1.ZERO_ROOT &&
                    round.entriesCount > 0) {
                    throw new MirrorMismatchError(`On-chain round was cancelled before its entries were committed`);
                }
                if (s.entriesRoot.toLowerCase() !== root.toLowerCase() ||
                    s.totalEntries !== totalEntries ||
                    s.totalParticipants !== BigInt(round.participantsCount) ||
                    s.poolAmount !== pool) {
                    throw new MirrorMismatchError(`On-chain commitment of ${(0, format_1.formatRoundNumber)(round.number)} differs from the database`);
                }
            },
            data: () => (0, viem_1.encodeFunctionData)({
                abi: abi_1.globalPoolRoundsAbi,
                functionName: 'commitEntries',
                args: [this.onchainId(round), root, totalEntries, BigInt(round.participantsCount), pool],
            }),
        });
        if (!res.done)
            return { ...res, thresholdsMet: null };
        const met = await this.readView('thresholdsMet', round);
        if (res.changed) {
            await this.auditStep(round, 'round.entries_committed_onchain', res, {
                entriesRoot: root,
                totalEntries: round.entriesCount,
                thresholdsMet: met,
            });
        }
        return { ...res, thresholdsMet: met };
    }
    /** cancelRound(roundId, THRESHOLDS_NOT_MET) — permissionless once the committed totals miss the thresholds. */
    cancelForThresholds(round) {
        return this.step(round, 'cancel', {
            role: 'keeper',
            done: (s) => s.status === abi_1.RoundStatus.Cancelled,
            data: () => (0, viem_1.encodeFunctionData)({
                abi: abi_1.globalPoolRoundsAbi,
                functionName: 'cancelRound',
                args: [this.onchainId(round), abi_1.CancelReason.ThresholdsNotMet],
            }),
        });
    }
    /**
     * requestDraw(roundId) → Chainlink VRF v2.5 (permissionless keeper call). A re-request (`knownAttempts` = draw
     * attempts the database already tracks) is done once the contract counts more attempts, or the draw is fulfilled.
     */
    requestDraw(round, options = {}) {
        const reRequest = options.knownAttempts !== undefined;
        return this.step(round, 'request_draw', {
            role: 'keeper',
            newAttempt: reRequest,
            done: (s) => s.status === abi_1.RoundStatus.Fulfilled ||
                s.status === abi_1.RoundStatus.Settled ||
                (reRequest
                    ? s.drawAttempts > (options.knownAttempts ?? 0)
                    : s.status === abi_1.RoundStatus.DrawRequested),
            data: () => (0, viem_1.encodeFunctionData)({
                abi: abi_1.globalPoolRoundsAbi,
                functionName: 'requestDraw',
                args: [this.onchainId(round)],
            }),
        });
    }
    /** True when the contract allows a VRF re-request (unfulfilled ≥ 24 h, measured in block time). */
    async canReRequest(round) {
        const state = await this.read(round);
        if (state.status !== abi_1.RoundStatus.DrawRequested)
            return false;
        const client = await this.signer.client();
        const block = await client.getBlock();
        return block.timestamp >= state.lastRequestAt + 24n * 3600n;
    }
    /**
     * Before any prize is credited: the winners the database derives from the VRF word must be exactly the contract's
     * computeWinners(), with the same prize amounts and random word. Throws (blocking settlement) otherwise.
     */
    async verifyDraw(round, randomWord) {
        const state = await this.read(round);
        await this.recordStatus(round, state);
        if (state.status !== abi_1.RoundStatus.Fulfilled && state.status !== abi_1.RoundStatus.Settled) {
            throw new MirrorMismatchError(`Round ${round.number} is not fulfilled on-chain`);
        }
        if (state.randomWord !== (0, viem_1.hexToBigInt)(randomWord)) {
            throw new MirrorMismatchError('Random word differs from the on-chain VRF word');
        }
        const [onchainWinners, onchainAmounts] = await Promise.all([
            this.readView('computeWinners', round),
            this.readView('prizeAmounts', round),
        ]);
        const entries = await this.prisma.entry.findMany({
            where: { roundId: round.id },
            orderBy: { seq: 'asc' },
            select: { id: true, seq: true, userId: true },
        });
        const local = (0, selection_1.selectWinners)({
            roundId: this.onchainId(round),
            randomWord,
            entries: entries.map((e) => ({ seq: e.seq, entryId: e.id, userId: e.userId })),
            pool: round.poolAmount.toFixed(),
            prizeSplitBps: round.prizeSplitBps,
        });
        const same = local.length === onchainWinners.length &&
            local.every((w, i) => BigInt(w.entryIndex) === onchainWinners[i] && (0, money_1.toBaseUnits)(w.amount) === onchainAmounts[i]);
        if (!same) {
            this.logger.error(`ALERT round #${round.number}: database winners differ from GlobalPoolRounds.computeWinners — settlement blocked`);
            throw new MirrorMismatchError('Database winners differ from the on-chain winners');
        }
    }
    /** Build (once) and record the payouts Merkle root for a DB-settled round: recordSettlement(root, pool). */
    async recordSettlement(round) {
        if (round.status !== 'settled') {
            throw new errors_1.AppError('CONFLICT', `Round ${(0, format_1.formatRoundNumber)(round.number)} is not settled`);
        }
        const root = await this.preparePayouts(round);
        const pool = (0, money_1.toBaseUnits)(round.poolAmount.toFixed());
        const res = await this.step(round, 'settle', {
            role: 'settler',
            done: (s) => s.status === abi_1.RoundStatus.Settled,
            check: (s) => {
                if (s.payoutsRoot.toLowerCase() !== root.toLowerCase() || s.totalPaid !== pool) {
                    throw new MirrorMismatchError('On-chain settlement differs from the database payouts');
                }
            },
            data: () => (0, viem_1.encodeFunctionData)({
                abi: abi_1.globalPoolRoundsAbi,
                functionName: 'recordSettlement',
                args: [this.onchainId(round), root, pool],
            }),
        });
        if (res.changed)
            await this.auditStep(round, 'round.settlement_recorded_onchain', res, { payoutsRoot: root });
        return res;
    }
    async preparePayouts(round) {
        if (round.payoutsMerkleRoot)
            return round.payoutsMerkleRoot;
        const root = await this.prisma.tx(async (tx) => {
            await tx.$queryRaw `SELECT id FROM rounds WHERE id = ${round.id}::uuid FOR UPDATE`;
            const fresh = await tx.round.findUniqueOrThrow({ where: { id: round.id } });
            if (fresh.payoutsMerkleRoot)
                return fresh.payoutsMerkleRoot;
            const winners = await tx.winner.findMany({
                where: { roundId: round.id },
                orderBy: { rank: 'asc' },
                include: { entry: { include: { commitment: true } } },
            });
            if (winners.length === 0 || winners.some((w) => !w.entry?.commitment)) {
                throw new errors_1.AppError('CONFLICT', 'Winners or entry commitments missing for the payouts tree');
            }
            const built = (0, commitments_1.buildPayouts)(this.onchainId(round), winners.map((w) => ({
                rank: w.rank,
                entryIndex: w.entry.commitment.index,
                entryIdBytes32: w.entry.commitment.entryIdBytes32,
                userCommitment: w.entry.commitment.userCommitment,
                amount: w.amount.toFixed(),
            })));
            if (built.totalUnits !== (0, money_1.toBaseUnits)(fresh.poolAmount.toFixed())) {
                throw new errors_1.AppError('CONFLICT', 'Payouts do not sum to the pool');
            }
            await tx.roundPayout.createMany({
                data: built.rows.map((p) => ({
                    roundId: round.id,
                    rank: p.rank,
                    entryIndex: p.entryIndex,
                    entryIdBytes32: p.entryIdBytes32,
                    userCommitment: p.userCommitment,
                    amount: p.amount,
                    amountUnits: p.amountUnits.toString(),
                    leaf: p.leaf,
                    proof: p.proof,
                })),
            });
            await tx.round.update({ where: { id: round.id }, data: { payoutsMerkleRoot: built.root } });
            return built.root;
        });
        round.payoutsMerkleRoot = root;
        return root;
    }
    /**
     * Housekeeping for one round (called from the lifecycle tick): publish rules of open rounds, record settlement
     * of settled rounds and on-chain cancellation of rounds cancelled for missed thresholds.
     */
    async sync(round) {
        if (!this.shouldMirror(round))
            return;
        if ((round.status === 'open' || round.status === 'scheduled') &&
            (round.chainMirror || round.closesAt.getTime() > Date.now() + 60_000)) {
            await this.ensureOpened(round);
        }
        else if (round.chainMirror && round.status === 'settled') {
            await this.recordSettlement(round);
        }
        else if (round.chainMirror &&
            round.status === 'cancelled' &&
            round.cancelReason === 'threshold_not_met') {
            const state = await this.read(round);
            if (state.status === abi_1.RoundStatus.Committed)
                await this.cancelForThresholds(round);
        }
    }
    /** Rounds whose mirror needs work (keeps the tick cheap). */
    async pendingRounds() {
        if (!this.enabled)
            return [];
        const cutoff = new Date(Date.now() + 60_000);
        return this.prisma.round.findMany({
            where: {
                OR: [
                    { status: { in: ['scheduled', 'open'] }, chainMirror: false, closesAt: { gt: cutoff } },
                    {
                        status: { in: ['scheduled', 'open'] },
                        chainMirror: true,
                        chainOps: { none: { step: 'open', status: 'confirmed' } },
                    },
                    {
                        status: 'settled',
                        chainMirror: true,
                        chainOps: { none: { step: 'settle', status: 'confirmed' } },
                    },
                    {
                        status: 'cancelled',
                        chainMirror: true,
                        cancelReason: 'threshold_not_met',
                        chainOps: { none: { step: 'cancel', status: 'confirmed' } },
                    },
                ],
            },
            orderBy: { number: 'asc' },
            take: 20,
        });
    }
    // ── public views ──────────────────────────────────────────────────────────────────────────
    /** Public on-chain mirror status of a round (contract, steps, tx links, roots). */
    async status(number) {
        const round = await this.prisma.round.findUnique({
            where: { number },
            include: { chainOps: { orderBy: [{ createdAt: 'asc' }] } },
        });
        if (!round)
            throw new errors_1.AppError('NOT_FOUND', `Round ${(0, format_1.formatRoundNumber)(number)} not found`);
        const chainId = round.chainId ?? this.blockchain.chainId;
        return {
            roundNumber: round.number,
            mirrored: round.chainMirror,
            network: chainId === 31_337 ? 'Anvil (local devnet)' : 'Arbitrum Sepolia',
            chainId,
            contract: round.contractAddress,
            contractUrl: (0, evm_chain_1.explorerAddressUrl)(chainId, round.contractAddress),
            onchainRoundId: (round.onchainRoundId ?? BigInt(round.number)).toString(),
            onchainStatus: round.onchainStatus,
            rulesHash: round.rulesHash,
            entriesMerkleRoot: round.entriesMerkleRoot,
            payoutsMerkleRoot: round.payoutsMerkleRoot,
            steps: round.chainOps.map((op) => ({
                step: op.step,
                attempt: op.attempt,
                status: op.status,
                txHash: op.txHash,
                txUrl: (0, evm_chain_1.explorerTxUrl)(chainId, op.txHash),
                blockNumber: op.blockNumber?.toString() ?? null,
                at: op.updatedAt.toISOString(),
            })),
            isDemo: round.isDemo,
            note: 'DEMO / testnet: the contract holds no funds; it records the rules, the committed entry list, the VRF word and the payouts root.',
        };
    }
    /** Public manifest: the committed leaves (index order), enough for anyone to rebuild the entries root. */
    async manifest(number, page, pageSize) {
        const round = await this.prisma.round.findUnique({ where: { number } });
        if (!round)
            throw new errors_1.AppError('NOT_FOUND', `Round ${(0, format_1.formatRoundNumber)(number)} not found`);
        const [rows, total] = await Promise.all([
            this.prisma.entryCommitment.findMany({
                where: { roundId: round.id },
                orderBy: { index: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: { index: true, entryIdBytes32: true, userCommitment: true, leaf: true },
            }),
            this.prisma.entryCommitment.count({ where: { roundId: round.id } }),
        ]);
        return {
            roundNumber: round.number,
            entriesMerkleRoot: round.entriesMerkleRoot,
            leafEncoding: 'keccak256(abi.encode(uint256 index, bytes32 entryId, bytes32 userCommitment))',
            tree: 'OpenZeppelin SimpleMerkleTree, leaves in index order, sorted-pair keccak256',
            items: rows,
            page,
            pageSize,
            total,
        };
    }
    /** The owner's entry receipts: index, entry id, salt, commitment and Merkle proof (verifyEntry on-chain). */
    async myProofs(userId, number) {
        const round = await this.prisma.round.findUnique({ where: { number } });
        if (!round)
            throw new errors_1.AppError('NOT_FOUND', `Round ${(0, format_1.formatRoundNumber)(number)} not found`);
        const mine = await this.prisma.entryCommitment.findMany({
            where: { roundId: round.id, entry: { userId } },
            orderBy: { index: 'asc' },
            include: { entry: { select: { code: true } } },
        });
        if (mine.length === 0) {
            return { roundNumber: round.number, entriesMerkleRoot: round.entriesMerkleRoot, entries: [] };
        }
        const leaves = await this.prisma.entryCommitment.findMany({
            where: { roundId: round.id },
            orderBy: { index: 'asc' },
            select: { leaf: true },
        });
        const tree = (0, verify_1.buildTree)(leaves.map((l) => l.leaf));
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { publicId: true },
        });
        return {
            roundNumber: round.number,
            onchainRoundId: (round.onchainRoundId ?? BigInt(round.number)).toString(),
            entriesMerkleRoot: round.entriesMerkleRoot,
            userPublicId: user.publicId,
            commitment: 'userCommitment = keccak256(abi.encode(keccak256(utf8(userPublicId)), salt))',
            entries: mine.map((c) => ({
                entryId: c.entry.code,
                index: c.index,
                entryIdBytes32: c.entryIdBytes32,
                salt: this.decryptSalt(c.saltEnc),
                userCommitment: c.userCommitment,
                leaf: c.leaf,
                proof: tree.getProof(c.index),
            })),
        };
    }
    /** Public payouts with proofs (verifyPayout on-chain). */
    async payouts(number) {
        const round = await this.prisma.round.findUnique({
            where: { number },
            include: { payouts: { orderBy: { rank: 'asc' } } },
        });
        if (!round)
            throw new errors_1.AppError('NOT_FOUND', `Round ${(0, format_1.formatRoundNumber)(number)} not found`);
        return {
            roundNumber: round.number,
            payoutsMerkleRoot: round.payoutsMerkleRoot,
            leafEncoding: 'keccak256(abi.encode(uint256 roundId, uint256 rank, uint256 entryIndex, bytes32 entryId, bytes32 userCommitment, uint256 amount))',
            items: round.payouts.map((p) => ({
                rank: p.rank,
                onchainRank: p.rank - 1,
                entryIndex: p.entryIndex,
                entryIdBytes32: p.entryIdBytes32,
                userCommitment: p.userCommitment,
                amount: (0, money_1.toUSDTString)(p.amount.toFixed()),
                amountUnits: p.amountUnits,
                leaf: p.leaf,
                proof: p.proof,
            })),
        };
    }
    async auditStep(round, action, res, extra) {
        await this.audit.record({
            actorType: 'system',
            actorLabel: 'round-mirror',
            action,
            targetType: 'round',
            targetId: round.id,
            metadata: {
                roundNumber: round.number,
                chainId: this.blockchain.chainId,
                contract: round.contractAddress,
                txHash: res.op?.txHash ?? null,
                ...extra,
            },
        });
    }
    /** Logged-and-swallowed wrapper for best-effort calls from the lifecycle. */
    async tryStep(label, fn) {
        try {
            return await fn();
        }
        catch (err) {
            const level = err instanceof chain_errors_1.ChainUnavailableError || err instanceof chain_errors_1.ChainRevertError ? 'warn' : 'error';
            this.logger[level](`${label}: ${(0, chain_errors_1.errorSummary)(err)}`);
            return null;
        }
    }
};
exports.RoundMirrorService = RoundMirrorService;
exports.RoundMirrorService = RoundMirrorService = RoundMirrorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig,
        blockchain_service_1.BlockchainService,
        chain_signer_service_1.ChainSignerService,
        audit_service_1.AuditService])
], RoundMirrorService);
//# sourceMappingURL=round-mirror.service.js.map