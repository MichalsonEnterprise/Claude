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
var CrashEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashEngineService = exports.CRASH_CHAIN_LENGTH = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const money_1 = require("@gp/shared/money");
const rxjs_1 = require("rxjs");
const crypto_1 = require("../../../common/crypto");
const errors_1 = require("../../../common/errors");
const app_config_1 = require("../../../config/app-config");
const prisma_service_1 = require("../../../infra/prisma/prisma.service");
const redis_module_1 = require("../../../infra/redis/redis.module");
const idempotency_service_1 = require("../../idempotency/idempotency.service");
const credits_service_1 = require("./credits.service");
const games_common_1 = require("./games-common");
const policy_service_1 = require("./policy.service");
/** Rounds per hash chain (a new chain is committed when one is used up). */
exports.CRASH_CHAIN_LENGTH = 10_000;
const SLUG = 'orbit-rush';
const OPEN_LOCK = 47110042n;
const LEADER_KEY = 'gp:crash:leader';
/**
 * Orbit Rush — server-authoritative crash rounds (DEMO credits only).
 *
 * Phases: betting (10 s) → running (multiplier m(t) = e^(0.1117 t) in 100 ms frames) → crashed (4 s pause) → next.
 * Every crash point comes from a SHA-256 hash chain committed before the round (see @gp/shared/fair crash.ts); the
 * round seed is revealed when the round crashes. Auto cash-outs run here, on the server, so they still work when a
 * player's connection drops. `tick(now)` is the single state transition (the loop calls it every 100 ms when
 * JOBS_ENABLED=true; tests call it directly with a pinned clock). Nothing can choose or change a crash point.
 */
let CrashEngineService = CrashEngineService_1 = class CrashEngineService {
    prisma;
    config;
    idempotency;
    credits;
    policy;
    clock;
    redis;
    logger = new common_1.Logger(CrashEngineService_1.name);
    events$ = new rxjs_1.Subject();
    secrets = new Map();
    timer = null;
    ticking = false;
    instanceId = (0, node_crypto_1.randomUUID)();
    leaderUntil = 0;
    constructor(prisma, config, idempotency, credits, policy, clock, redis) {
        this.prisma = prisma;
        this.config = config;
        this.idempotency = idempotency;
        this.credits = credits;
        this.policy = policy;
        this.clock = clock;
        this.redis = redis;
    }
    onApplicationBootstrap() {
        if (!this.config.env.JOBS_ENABLED)
            return;
        this.timer = setInterval(() => void this.loop(), fair_1.crash.CRASH_RULES.frameMs);
        this.logger.log('Orbit Rush loop started (100 ms frames)');
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
        this.events$.complete();
    }
    /** One replica runs the loop: a 3 s Redis lease renewed every second. */
    async isLeader() {
        const nowMs = Date.now();
        if (nowMs < this.leaderUntil - 2_000)
            return true;
        try {
            const got = await this.redis.set(LEADER_KEY, this.instanceId, 'PX', 3_000, 'NX');
            if (got === 'OK') {
                this.leaderUntil = nowMs + 3_000;
                return true;
            }
            if ((await this.redis.get(LEADER_KEY)) === this.instanceId) {
                await this.redis.pexpire(LEADER_KEY, 3_000);
                this.leaderUntil = nowMs + 3_000;
                return true;
            }
        }
        catch (err) {
            this.logger.warn(`leader lease failed: ${String(err)}`);
        }
        return false;
    }
    async loop() {
        if (this.ticking)
            return;
        this.ticking = true;
        try {
            if (await this.isLeader())
                await this.tick();
        }
        catch (err) {
            this.logger.error(`crash tick failed: ${String(err)}`);
        }
        finally {
            this.ticking = false;
        }
    }
    // ── chain & secrets ───────────────────────────────────────────────────────────────────────────
    async activeChain(tx) {
        const chain = await tx.crashChain.findFirst({
            where: { active: true },
            orderBy: { createdAt: 'desc' },
        });
        if (chain && chain.nextIndex <= chain.length)
            return chain;
        if (chain)
            await tx.crashChain.update({ where: { id: chain.id }, data: { active: false } });
        const terminal = (0, node_crypto_1.randomBytes)(32).toString('hex');
        const commitment = fair_1.crash.chainSeedAt(terminal, exports.CRASH_CHAIN_LENGTH, 1);
        return tx.crashChain.create({
            data: {
                length: exports.CRASH_CHAIN_LENGTH,
                terminalSeedEnc: (0, crypto_1.encryptSecret)(terminal, this.config.totpKey),
                // public chain commitment = seeds[0] = sha256(seeds[1])
                commitment: fair_1.crash.crashCommitment(commitment),
                salt: (0, node_crypto_1.randomBytes)(16).toString('hex'),
            },
        });
    }
    async secretOf(db, round) {
        const cached = this.secrets.get(round.id);
        if (cached)
            return cached;
        const chain = await db.crashChain.findUniqueOrThrow({ where: { id: round.chainId } });
        const terminal = (0, crypto_1.decryptSecret)(chain.terminalSeedEnc, this.config.totpKey);
        const seed = fair_1.crash.chainSeedAt(terminal, chain.length, round.chainIndex);
        if (fair_1.crash.crashCommitment(seed) !== round.commitment) {
            throw new errors_1.AppError('INTERNAL_ERROR', 'Crash round commitment mismatch');
        }
        const cp = fair_1.crash.crashPointOf(seed, chain.salt);
        const secret = {
            seed,
            crashPoint: cp.crashPoint,
            instant: cp.instant,
            crashAtMs: cp.instant ? 0 : fair_1.crash.timeToReachMs(cp.crashPoint),
        };
        this.secrets.set(round.id, secret);
        if (this.secrets.size > 50)
            this.secrets.delete(this.secrets.keys().next().value);
        return secret;
    }
    // ── state machine ─────────────────────────────────────────────────────────────────────────────
    async lockLive(tx) {
        const rows = await tx.$queryRaw `
      SELECT id::text AS id FROM crash_rounds WHERE status <> 'crashed' FOR UPDATE`;
        return rows[0] ? tx.crashRound.findUnique({ where: { id: rows[0].id } }) : null;
    }
    /** Advance the live round to `now` (open, start, auto cash-outs, crash). Returns the public snapshot. */
    async tick(now = this.clock.now()) {
        const emitted = [];
        await this.prisma.tx(async (tx) => {
            let live = await this.lockLive(tx);
            if (!live) {
                await tx.$executeRaw `SELECT pg_advisory_xact_lock(${OPEN_LOCK})`;
                live = await this.lockLive(tx);
                if (!live) {
                    const last = await tx.crashRound.findFirst({ orderBy: { number: 'desc' } });
                    if (last?.nextRoundAt && last.nextRoundAt > now)
                        return;
                    live = await this.openRound(tx, now);
                    emitted.push({ type: 'phase', round: this.publicRound(live, null) });
                }
            }
            await this.advance(tx, live, now, emitted);
        });
        for (const e of emitted)
            this.events$.next(e);
        return this.snapshot(now);
    }
    async openRound(tx, now) {
        const chain = await this.activeChain(tx);
        const index = chain.nextIndex;
        await tx.crashChain.update({ where: { id: chain.id }, data: { nextIndex: index + 1 } });
        const terminal = (0, crypto_1.decryptSecret)(chain.terminalSeedEnc, this.config.totpKey);
        const seed = fair_1.crash.chainSeedAt(terminal, chain.length, index);
        return tx.crashRound.create({
            data: {
                chainId: chain.id,
                chainIndex: index,
                status: 'betting',
                commitment: fair_1.crash.crashCommitment(seed),
                bettingOpensAt: now,
                startedAt: new Date(now.getTime() + fair_1.crash.CRASH_RULES.bettingMs),
            },
        });
    }
    /** Moves a locked live round forward to `now`. Mutates nothing outside this round and its bets. */
    async advance(tx, round, now, emitted) {
        let r = round;
        if (r.status === 'betting') {
            if (now < r.startedAt)
                return r;
            r = await tx.crashRound.update({ where: { id: r.id }, data: { status: 'running' } });
            emitted.push({ type: 'phase', round: this.publicRound(r, null) });
        }
        if (r.status !== 'running')
            return r;
        const secret = await this.secretOf(tx, r);
        const elapsed = Math.max(0, now.getTime() - r.startedAt.getTime());
        const crashed = elapsed >= secret.crashAtMs;
        const reach = crashed ? secret.crashPoint : fair_1.crash.multiplierAt(elapsed);
        // auto cash-outs at exactly their target, in target order, for every target the curve has reached
        const autos = await tx.crashBet.findMany({
            where: { roundId: r.id, status: 'active', autoCashOut: { lte: reach } },
            include: { user: { select: { handle: true, publicId: true } } },
            orderBy: { autoCashOut: 'asc' },
        });
        for (const b of autos) {
            const target = (0, money_1.money)(b.autoCashOut.toFixed()).toFixed(2);
            const at = new Date(r.startedAt.getTime() + fair_1.crash.timeToReachMs(target));
            emitted.push({
                type: 'cashout',
                roundId: r.id,
                bet: await this.cashOutBet(tx, b, target, 'auto', at),
            });
        }
        if (!crashed) {
            emitted.push({
                type: 'tick',
                roundId: r.id,
                number: r.number,
                multiplier: reach,
                elapsedMs: elapsed,
            });
            return r;
        }
        const crashedAt = new Date(r.startedAt.getTime() + secret.crashAtMs);
        const open = await tx.crashBet.findMany({
            where: { roundId: r.id, status: 'active' },
            include: { user: { select: { handle: true, publicId: true } } },
        });
        const capped = (0, money_1.money)(secret.crashPoint).gte(fair_1.crash.CRASH_RULES.maxMultiplier);
        for (const b of open) {
            if (capped) {
                emitted.push({
                    type: 'cashout',
                    roundId: r.id,
                    bet: await this.cashOutBet(tx, b, secret.crashPoint, 'cap', crashedAt),
                });
            }
            else {
                await tx.crashBet.update({ where: { id: b.id }, data: { status: 'lost', payout: '0' } });
            }
        }
        r = await tx.crashRound.update({
            where: { id: r.id },
            data: {
                status: 'crashed',
                seed: secret.seed,
                crashPoint: secret.crashPoint,
                crashedAt,
                nextRoundAt: new Date(crashedAt.getTime() + fair_1.crash.CRASH_RULES.crashedPauseMs),
            },
        });
        emitted.push({ type: 'crashed', round: this.publicRound(r, secret) });
        return r;
    }
    async cashOutBet(tx, b, multiplier, kind, at) {
        const payout = fair_1.crash.crashPayout((0, games_common_1.credits)(b.stake), multiplier);
        const updated = await tx.crashBet.update({
            where: { id: b.id },
            data: {
                status: 'cashed_out',
                cashOutMultiplier: multiplier,
                payout,
                cashOutKind: kind,
                cashedOutAt: at,
            },
            include: { user: { select: { handle: true, publicId: true } } },
        });
        await this.credits.credit(tx, b.userId, payout, { gameSlug: SLUG, betId: b.id });
        return this.publicBet(updated);
    }
    // ── player actions ────────────────────────────────────────────────────────────────────────────
    /** Place a bet in the betting window of the live round (one bet per player per round). */
    async placeBet(user, body) {
        const info = fair_1.FAIR_GAMES[SLUG];
        const game = await this.prisma.game.findUnique({ where: { slug: SLUG } });
        if (!game || !game.enabled)
            throw (0, errors_1.notFound)('Game');
        (0, games_common_1.assertDemoOnly)(body.currency, game);
        const stake = (0, games_common_1.rules)(() => (0, fair_1.creditString)((0, fair_1.parseStake)(body.stake, info.minBet, info.maxBet)));
        const autoCashOut = (0, games_common_1.rules)(() => fair_1.crash.validateCrashTarget(body.autoCashOut ?? null));
        const emitted = [];
        const { value, replayed } = await this.idempotency.run({ scope: 'games.crash.bet', ownerId: user.id, key: body.idempotencyKey, request: body }, async (tx) => {
            const now = this.clock.now();
            const live = await this.lockLive(tx);
            if (!live || live.status !== 'betting' || now >= live.startedAt) {
                throw new errors_1.AppError('ROUND_NOT_OPEN', 'Bets are closed for this round — wait for the next betting window', {
                    roundNumber: live?.number ?? null,
                    status: live?.status ?? null,
                });
            }
            await this.policy.assertCanPlay(tx, user.id, stake, now);
            const existing = await tx.crashBet.findUnique({
                where: { roundId_userId: { roundId: live.id, userId: user.id } },
            });
            if (existing) {
                throw new errors_1.AppError('CONFLICT', 'You already have a bet in this round', {
                    reason: 'ALREADY_BET',
                });
            }
            const id = (0, node_crypto_1.randomUUID)();
            const balance = await this.credits.debit(tx, user.id, stake, { gameSlug: SLUG, betId: id });
            const bet = await tx.crashBet.create({
                data: {
                    id,
                    roundId: live.id,
                    userId: user.id,
                    stake,
                    autoCashOut,
                    idempotencyKey: body.idempotencyKey,
                },
                include: { user: { select: { handle: true, publicId: true } } },
            });
            emitted.push({ type: 'bet', roundId: live.id, bet: this.publicBet(bet) });
            return { ...this.myBet(bet, live), balance };
        });
        for (const e of emitted)
            this.events$.next(e);
        return { ...value, replayed };
    }
    /** Manual cash-out at the current server multiplier (refused once the round has crashed). */
    async cashOut(user, betId, body) {
        const emitted = [];
        const { value, replayed } = await this.idempotency.run({
            scope: `games.crash.cashout:${betId}`,
            ownerId: user.id,
            key: body.idempotencyKey,
            request: body,
        }, async (tx) => {
            const now = this.clock.now();
            const bet = await tx.crashBet.findUnique({ where: { id: betId } });
            if (!bet || bet.userId !== user.id)
                throw (0, errors_1.notFound)('Bet');
            const locked = await this.lockLive(tx);
            let round = await tx.crashRound.findUniqueOrThrow({ where: { id: bet.roundId } });
            if (locked && locked.id === round.id)
                round = await this.advance(tx, round, now, emitted);
            const fresh = await tx.crashBet.findUniqueOrThrow({
                where: { id: betId },
                include: { user: { select: { handle: true, publicId: true } } },
            });
            if (fresh.status === 'active' && round.status === 'running') {
                const m = fair_1.crash.multiplierAt(Math.max(0, now.getTime() - round.startedAt.getTime()));
                const pub = await this.cashOutBet(tx, fresh, m, 'manual', now);
                emitted.push({ type: 'cashout', roundId: round.id, bet: pub });
            }
            else if (fresh.status === 'active') {
                throw new errors_1.AppError('CONFLICT', 'The round has not started yet', {
                    reason: 'NOT_RUNNING',
                });
            }
            const final = await tx.crashBet.findUniqueOrThrow({ where: { id: betId } });
            const balance = (await tx.demoCreditAccount.findUnique({ where: { userId: user.id } }))
                ?.balance;
            return {
                ...this.myBet(final, round),
                balance: (0, games_common_1.credits)(balance),
            };
        });
        for (const e of emitted)
            this.events$.next(e);
        return { ...value, replayed };
    }
    // ── views ─────────────────────────────────────────────────────────────────────────────────────
    publicRound(r, secret) {
        const crashed = r.status === 'crashed';
        return {
            id: r.id,
            number: r.number,
            ref: `CR-${r.number}`,
            status: r.status,
            commitment: r.commitment,
            chainIndex: r.chainIndex,
            bettingOpensAt: r.bettingOpensAt.toISOString(),
            startedAt: r.startedAt.toISOString(),
            crashedAt: r.crashedAt?.toISOString() ?? null,
            nextRoundAt: r.nextRoundAt?.toISOString() ?? null,
            crashPoint: crashed
                ? (0, money_1.money)((r.crashPoint ?? secret?.crashPoint ?? '0').toString()).toFixed(2)
                : null,
            instant: crashed ? (0, money_1.money)((r.crashPoint ?? '0').toString()).eq(1) : null,
            seed: crashed ? (r.seed ?? secret?.seed ?? null) : null,
            isDemo: true,
        };
    }
    publicBet(b) {
        return {
            id: b.id,
            ref: `CRB-${b.refNumber}`,
            player: b.user.handle ? `@${b.user.handle}` : b.user.publicId,
            stake: (0, games_common_1.credits)(b.stake),
            autoCashOut: b.autoCashOut ? (0, money_1.money)(b.autoCashOut.toFixed()).toFixed(2) : null,
            status: b.status,
            cashOutMultiplier: b.cashOutMultiplier
                ? (0, money_1.money)(b.cashOutMultiplier.toFixed()).toFixed(2)
                : null,
            payout: (0, games_common_1.credits)(b.payout),
            cashOutKind: b.cashOutKind,
            currency: games_common_1.DEMO.currency,
        };
    }
    myBet(b, round) {
        return {
            id: b.id,
            ref: `CRB-${b.refNumber}`,
            round: { id: round.id, number: round.number, status: round.status },
            stake: (0, games_common_1.credits)(b.stake),
            autoCashOut: b.autoCashOut ? (0, money_1.money)(b.autoCashOut.toFixed()).toFixed(2) : null,
            status: b.status,
            cashOutMultiplier: b.cashOutMultiplier
                ? (0, money_1.money)(b.cashOutMultiplier.toFixed()).toFixed(2)
                : null,
            payout: (0, games_common_1.credits)(b.payout),
            net: (0, games_common_1.credits)((0, money_1.money)((0, games_common_1.credits)(b.payout))
                .minus((0, money_1.money)((0, games_common_1.credits)(b.stake)))
                .toFixed()),
            cashOutKind: b.cashOutKind,
            cashedOutAt: b.cashedOutAt?.toISOString() ?? null,
            currency: games_common_1.DEMO.currency,
            createdAt: b.createdAt.toISOString(),
            isDemo: true,
        };
    }
    /** Public snapshot: live round (no crash point before the crash), current multiplier, live bets, last 20 points. */
    async snapshot(now = this.clock.now()) {
        const live = (await this.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } })) ??
            (await this.prisma.crashRound.findFirst({ orderBy: { number: 'desc' } }));
        const history = await this.prisma.crashRound.findMany({
            where: { status: 'crashed' },
            orderBy: { number: 'desc' },
            take: 20,
            select: { number: true, crashPoint: true },
        });
        const bets = live
            ? await this.prisma.crashBet.findMany({
                where: { roundId: live.id },
                include: { user: { select: { handle: true, publicId: true } } },
                orderBy: { createdAt: 'asc' },
                take: 100,
            })
            : [];
        const elapsed = live && live.status === 'running' ? Math.max(0, now.getTime() - live.startedAt.getTime()) : 0;
        return {
            round: live ? this.publicRound(live, null) : null,
            multiplier: live?.status === 'running'
                ? fair_1.crash.multiplierAt(elapsed)
                : live?.status === 'crashed'
                    ? (0, money_1.money)(live.crashPoint.toFixed()).toFixed(2)
                    : '1.00',
            elapsedMs: elapsed,
            bets: bets.map((b) => this.publicBet(b)),
            history: history.map((h) => ({
                number: h.number,
                crashPoint: (0, money_1.money)(h.crashPoint.toFixed()).toFixed(2),
            })),
            rules: { ...fair_1.crash.CRASH_RULES, houseEdgePercent: fair_1.FAIR_GAMES[SLUG].houseEdgePercent },
            serverTime: now.toISOString(),
            currency: games_common_1.DEMO.currency,
            isDemo: true,
        };
    }
    async rounds(page, pageSize) {
        const [rows, total] = await Promise.all([
            this.prisma.crashRound.findMany({
                where: { status: 'crashed' },
                orderBy: { number: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { _count: { select: { bets: true } } },
            }),
            this.prisma.crashRound.count({ where: { status: 'crashed' } }),
        ]);
        return {
            items: rows.map((r) => ({ ...this.publicRound(r, null), bets: r._count.bets })),
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            isDemo: true,
        };
    }
    async roundByNumber(number) {
        const r = await this.prisma.crashRound.findUnique({ where: { number } });
        if (!r)
            throw (0, errors_1.notFound)('Round');
        return r;
    }
    /** Public verification of a crashed round: seed → commitment → chain commitment, and the crash point. */
    async verify(number) {
        const r = await this.roundByNumber(number);
        const chain = await this.prisma.crashChain.findUniqueOrThrow({ where: { id: r.chainId } });
        const base = {
            round: this.publicRound(r, null),
            chain: {
                commitment: chain.commitment,
                salt: chain.salt,
                length: chain.length,
                index: r.chainIndex,
            },
            formula: 'stream = HMAC-SHA256(key = round seed, message = `${salt}:0:${cursor}`); instant crash when uniformInt(0, 99) = 0; otherwise crash = floor(100·2^52 / (2^52 − H)) / 100 with H = next 52 bits, capped at 1,000.00×',
            library: '@gp/shared/fair → crash.crashPointOf(seed, salt)',
            isDemo: true,
        };
        if (r.status !== 'crashed' || !r.seed) {
            return { ...base, revealed: false, message: 'The seed is revealed when the round crashes.' };
        }
        const recomputed = fair_1.crash.crashPointOf(r.seed, chain.salt);
        return {
            ...base,
            revealed: true,
            seed: r.seed,
            commitmentValid: fair_1.crash.crashCommitment(r.seed) === r.commitment,
            chainValid: fair_1.crash.verifyChainSeed(r.seed, r.chainIndex, chain.commitment),
            recomputed,
            matches: recomputed.crashPoint === (0, money_1.money)(r.crashPoint.toFixed()).toFixed(2),
        };
    }
    async myBets(userId, page, pageSize) {
        const [rows, total] = await Promise.all([
            this.prisma.crashBet.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { round: true },
            }),
            this.prisma.crashBet.count({ where: { userId } }),
        ]);
        return {
            items: rows.map((b) => this.myBet(b, b.round)),
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            currency: games_common_1.DEMO.currency,
            isDemo: true,
        };
    }
    /** My bet in the live round (reconnect). */
    async myCurrentBet(userId) {
        const live = await this.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } });
        if (!live)
            return { bet: null };
        const bet = await this.prisma.crashBet.findUnique({
            where: { roundId_userId: { roundId: live.id, userId } },
        });
        return { bet: bet ? this.myBet(bet, live) : null };
    }
};
exports.CrashEngineService = CrashEngineService;
exports.CrashEngineService = CrashEngineService = CrashEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)(redis_module_1.REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_config_1.AppConfig,
        idempotency_service_1.IdempotencyService,
        credits_service_1.CreditsService,
        policy_service_1.GamesPolicyService,
        games_common_1.GameClock, Function])
], CrashEngineService);
//# sourceMappingURL=crash.service.js.map