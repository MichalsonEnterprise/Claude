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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetsService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../../common/errors");
const money_2 = require("../../../common/money");
const prisma_service_1 = require("../../../infra/prisma/prisma.service");
const idempotency_service_1 = require("../../idempotency/idempotency.service");
const credits_service_1 = require("./credits.service");
const games_common_1 = require("./games-common");
const policy_service_1 = require("./policy.service");
const seeds_service_1 = require("./seeds.service");
/** Instant games (Pool Dice, Double Side, Pool Roulette, Skyline, Fortune Ring, Pool Keno, Pinfall) + bet views. */
let BetsService = class BetsService {
    prisma;
    idempotency;
    credits;
    seeds;
    policy;
    clock;
    constructor(prisma, idempotency, credits, seeds, policy, clock) {
        this.prisma = prisma;
        this.idempotency = idempotency;
        this.credits = credits;
        this.seeds = seeds;
        this.policy = policy;
        this.clock = clock;
    }
    /** POST /games/:slug/bets — settles in the same DB transaction (stake out, payout in, one nonce). */
    async placeInstant(user, slug, body) {
        const info = (0, games_common_1.gameInfo)(slug);
        if (info.mode !== 'instant') {
            throw new errors_1.AppError('BAD_REQUEST', `${info.name} is not an instant game — use its round endpoints`, {
                slug,
            });
        }
        const game = await this.seeds.gameRow(this.prisma, slug);
        (0, games_common_1.assertDemoOnly)(body.currency, game);
        const { value, replayed } = await this.idempotency.run({ scope: `games.bet:${slug}`, ownerId: user.id, key: body.idempotencyKey, request: body }, async (tx) => {
            const now = this.clock.now();
            const pair = await this.seeds.lockActive(tx, user.id, game.id);
            const seed = await this.seeds.takeNonce(tx, pair);
            const result = (0, games_common_1.rules)(() => (0, fair_1.playInstant)(info.slug, seed, body.params, body.stake));
            await this.policy.assertCanPlay(tx, user.id, result.stake, now);
            const betId = (0, node_crypto_1.randomUUID)();
            await this.credits.debit(tx, user.id, result.stake, { gameSlug: slug, betId });
            const row = await tx.gameResult.create({
                data: {
                    id: betId,
                    sessionId: pair.session.id,
                    nonce: seed.nonce,
                    userId: user.id,
                    gameId: game.id,
                    status: 'settled',
                    stake: result.stake,
                    payout: result.payout,
                    multiplier: result.multiplier,
                    currency: games_common_1.DEMO.currency,
                    params: (0, money_2.toJson)(body.params),
                    outcome: (0, money_2.toJson)({ ...result.outcome, win: result.win }),
                    rulesVersion: info.rulesVersion,
                    idempotencyKey: body.idempotencyKey,
                    settledAt: now,
                },
                include: { session: { include: { game: { select: { slug: true, name: true } } } } },
            });
            const balance = await this.credits.credit(tx, user.id, result.payout, {
                gameSlug: slug,
                betId,
            });
            return (0, money_2.toJson)({ ...this.view(row), balance });
        });
        return { ...value, replayed };
    }
    view(r) {
        const slug = r.session.game.slug;
        const stake = (0, games_common_1.credits)(r.stake);
        const payout = (0, games_common_1.credits)(r.payout);
        return {
            id: r.id,
            ref: (0, games_common_1.refOf)(slug, r.refNumber),
            game: { slug, name: r.session.game.name },
            status: r.status,
            stake,
            payout,
            net: (0, games_common_1.credits)((0, money_1.money)(payout).minus((0, money_1.money)(stake)).toFixed()),
            multiplier: r.multiplier ? (0, money_1.money)(r.multiplier.toFixed()).toFixed(4) : null,
            win: r.status === 'settled' ? (0, money_1.money)(payout).gt((0, money_1.money)(stake)) : null,
            fee: fair_1.GAME_BET_FEE,
            params: (r.params ?? null),
            outcome: r.outcome,
            fairness: {
                seedPairId: r.sessionId,
                serverSeedHash: r.session.serverSeedHash,
                clientSeed: r.session.clientSeed,
                nonce: r.nonce,
                revealed: r.session.status !== 'active',
            },
            rulesVersion: r.rulesVersion,
            currency: games_common_1.DEMO.currency,
            createdAt: r.createdAt.toISOString(),
            settledAt: r.settledAt?.toISOString() ?? null,
            isDemo: true,
        };
    }
    /** GET /games/:slug/bets — my bets for one game, newest first. */
    async history(userId, slug, page, pageSize) {
        const game = await this.seeds.gameRow(this.prisma, slug);
        const where = { userId, gameId: game.id };
        const [rows, total] = await Promise.all([
            this.prisma.gameResult.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { session: { include: { game: { select: { slug: true, name: true } } } } },
            }),
            this.prisma.gameResult.count({ where }),
        ]);
        const settled = await this.prisma.gameResult.aggregate({
            where: { ...where, status: 'settled' },
            _sum: { stake: true, payout: true },
            _count: true,
        });
        const wagered = (0, games_common_1.credits)(settled._sum.stake);
        const returned = (0, games_common_1.credits)(settled._sum.payout);
        return {
            items: rows.map((r) => this.view(r)),
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            summary: {
                bets: settled._count,
                wagered,
                returned,
                net: (0, games_common_1.credits)((0, money_1.money)(returned).minus((0, money_1.money)(wagered)).toFixed()),
            },
            currency: games_common_1.DEMO.currency,
            isDemo: true,
        };
    }
    async byId(userId, id) {
        const row = await this.prisma.gameResult.findUnique({
            where: { id },
            include: { session: { include: { game: { select: { slug: true, name: true } } } } },
        });
        if (!row || row.userId !== userId)
            throw (0, errors_1.notFound)('Bet');
        return row;
    }
    /**
     * GET /games/bets/:id/verify — everything needed to re-derive the bet in the browser with @gp/shared/fair. Once the
     * seed pair is rotated the server seed is revealed and the API re-derives the outcome itself (`recomputed`).
     */
    async verification(userId, id) {
        const r = await this.byId(userId, id);
        const slug = r.session.game.slug;
        if (!(0, fair_1.isFairGameSlug)(slug))
            throw (0, errors_1.notFound)('Bet');
        const revealed = r.session.status !== 'active' && !!r.session.serverSeed;
        const params = this.verifyParams(slug, r);
        let recomputed = null;
        let matches = null;
        let commitmentValid = null;
        if (revealed && r.status === 'settled') {
            const v = (0, games_common_1.rules)(() => (0, fair_1.verifyBet)({
                slug,
                serverSeed: r.session.serverSeed,
                serverSeedHash: r.session.serverSeedHash,
                clientSeed: r.session.clientSeed,
                nonce: r.nonce,
                stake: (0, games_common_1.credits)(this.baseStake(slug, r)),
                params,
            }));
            recomputed = v.outcome;
            commitmentValid = v.commitmentValid;
            matches = (0, money_1.money)(v.payout).eq((0, money_1.money)(r.payout.toFixed()));
        }
        return {
            bet: this.view(r),
            verify: {
                game: slug,
                rulesVersion: r.rulesVersion ?? fair_1.FAIR_GAMES[slug].rulesVersion,
                serverSeedHash: r.session.serverSeedHash,
                serverSeed: revealed ? r.session.serverSeed : null,
                clientSeed: r.session.clientSeed,
                nonce: r.nonce,
                stake: (0, games_common_1.credits)(this.baseStake(slug, r)),
                params,
                stream: 'HMAC-SHA256(key = serverSeed, message = `${clientSeed}:${nonce}:${cursor}`), cursor = 0, 1, 2 …',
                library: '@gp/shared/fair → verifyBet()',
            },
            revealed,
            commitmentValid,
            recomputed,
            matches,
            message: revealed
                ? 'Re-derived from the revealed server seed.'
                : 'The server seed of this pair is still secret. Rotate your seed pair to reveal it, then verify.',
            isDemo: true,
        };
    }
    /** Stake the verifier replays with: the base bet (Twenty-One doubles / splits / insurance are part of the replay). */
    baseStake(slug, r) {
        if (slug === 'twenty-one') {
            const s = r.state;
            return s?.baseStake ?? (0, games_common_1.credits)(r.stake);
        }
        return (0, games_common_1.credits)(r.stake);
    }
    /** Verifier input params per game (stateful games: their recorded actions). */
    verifyParams(slug, r) {
        const p = (r.params ?? {});
        const st = (r.state ?? {});
        if (slug === 'vault-sweeper') {
            return { mines: p.mines, picks: st.picks ?? [], cashedOut: st.status === 'cashed_out' };
        }
        if (slug === 'high-card') {
            return { actions: st.actions ?? [], cashedOut: st.status === 'cashed_out' };
        }
        if (slug === 'twenty-one') {
            return { actions: fair_1.blackjack.actionsOf(st), decks: st.decks ?? 6 };
        }
        return p;
    }
};
exports.BetsService = BetsService;
exports.BetsService = BetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        idempotency_service_1.IdempotencyService,
        credits_service_1.CreditsService,
        seeds_service_1.SeedsService,
        policy_service_1.GamesPolicyService,
        games_common_1.GameClock])
], BetsService);
//# sourceMappingURL=bets.service.js.map