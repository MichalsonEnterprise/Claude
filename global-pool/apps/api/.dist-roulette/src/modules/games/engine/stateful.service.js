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
exports.StatefulGamesService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const fair_1 = require("@gp/shared/fair");
const money_1 = require("@gp/shared/money");
const errors_1 = require("../../../common/errors");
const money_2 = require("../../../common/money");
const prisma_service_1 = require("../../../infra/prisma/prisma.service");
const responsible_gaming_service_1 = require("../../compliance/responsible-gaming.service");
const idempotency_service_1 = require("../../idempotency/idempotency.service");
const bets_service_1 = require("./bets.service");
const credits_service_1 = require("./credits.service");
const games_common_1 = require("./games-common");
const policy_service_1 = require("./policy.service");
const seeds_service_1 = require("./seeds.service");
/**
 * Stateful rounds held on the server: Twenty-One hands, Vault Sweeper boards and High Card runs. The whole round is
 * fixed by the seed pair + nonce when it starts (shoe order, mine positions, card sequence); the stored state holds
 * only what the player has seen plus the action log. Each step runs in one DB transaction with the bet row locked,
 * is idempotent, and the round can be resumed after a disconnect with GET …/current.
 */
let StatefulGamesService = class StatefulGamesService {
    prisma;
    idempotency;
    credits;
    seeds;
    policy;
    bets;
    rg;
    clock;
    constructor(prisma, idempotency, credits, seeds, policy, bets, rg, clock) {
        this.prisma = prisma;
        this.idempotency = idempotency;
        this.credits = credits;
        this.seeds = seeds;
        this.policy = policy;
        this.bets = bets;
        this.rg = rg;
        this.clock = clock;
    }
    // ── generic round plumbing ────────────────────────────────────────────────────────────────────
    async open(user, slug, input, init) {
        const info = (0, games_common_1.gameInfo)(slug);
        const game = await this.seeds.gameRow(this.prisma, slug);
        (0, games_common_1.assertDemoOnly)(input.currency, game);
        const stake = (0, games_common_1.rules)(() => (0, fair_1.creditString)((0, fair_1.parseStake)(input.stake, info.minBet, info.maxBet)));
        const { value, replayed } = await this.idempotency.run({ scope: `games.round:${slug}`, ownerId: user.id, key: input.idempotencyKey, request: input }, async (tx) => {
            const now = this.clock.now();
            const pair = await this.seeds.lockActive(tx, user.id, game.id);
            const open = await tx.gameResult.findFirst({
                where: { userId: user.id, gameId: game.id, status: 'active' },
                select: { id: true },
            });
            if (open) {
                throw new errors_1.AppError('CONFLICT', 'You already have a round in progress — finish it first', {
                    reason: 'ROUND_IN_PROGRESS',
                    betId: open.id,
                });
            }
            await this.policy.assertCanPlay(tx, user.id, stake, now);
            const seed = await this.seeds.takeNonce(tx, pair);
            const step = (0, games_common_1.rules)(() => init(seed, stake));
            const betId = (0, node_crypto_1.randomUUID)();
            await this.credits.debit(tx, user.id, step.totalStake, { gameSlug: slug, betId });
            await tx.gameResult.create({
                data: {
                    id: betId,
                    sessionId: pair.session.id,
                    nonce: seed.nonce,
                    userId: user.id,
                    gameId: game.id,
                    status: 'active',
                    stake: step.totalStake,
                    payout: '0',
                    currency: 'DEMO',
                    params: (0, money_2.toJson)(input.params),
                    state: (0, money_2.toJson)(step.state),
                    outcome: {},
                    rulesVersion: info.rulesVersion,
                    idempotencyKey: input.idempotencyKey,
                },
            });
            if (step.done)
                await this.settle(tx, user.id, slug, betId, step, now);
            return (0, money_2.toJson)(await this.viewTx(tx, betId));
        });
        return { ...value, replayed };
    }
    async step(user, slug, betId, input, fn, stakeAdding = () => false) {
        const { value, replayed } = await this.idempotency.run({ scope: `games.step:${betId}`, ownerId: user.id, key: input.idempotencyKey, request: input }, async (tx) => {
            const now = this.clock.now();
            const locked = await tx.$queryRaw `
          SELECT id::text AS id FROM game_results WHERE id = ${betId}::uuid FOR UPDATE`;
            const bet = locked[0]
                ? await tx.gameResult.findUnique({
                    where: { id: betId },
                    include: { session: { include: { game: true } } },
                })
                : null;
            if (!bet || bet.userId !== user.id || bet.session.game.slug !== slug) {
                throw new errors_1.AppError('NOT_FOUND', 'Round not found');
            }
            if (bet.status !== 'active') {
                throw new errors_1.AppError('CONFLICT', 'This round is already settled', { reason: 'ROUND_OVER' });
            }
            const state = bet.state;
            if (stakeAdding(state))
                await this.rg.assertNotSelfExcluded(user.id, tx);
            const seed = {
                serverSeed: this.seeds.serverSeedOf(bet.session),
                clientSeed: bet.session.clientSeed,
                nonce: bet.nonce,
            };
            const step = (0, games_common_1.rules)(() => fn(structuredClone(state), seed, (0, games_common_1.credits)(bet.stake)));
            if ((0, money_1.money)(step.extraStake).gt(0)) {
                await this.credits.debit(tx, user.id, step.extraStake, { gameSlug: slug, betId });
            }
            await tx.gameResult.update({
                where: { id: betId },
                data: { state: (0, money_2.toJson)(step.state), stake: step.totalStake },
            });
            if (step.done)
                await this.settle(tx, user.id, slug, betId, step, now);
            return (0, money_2.toJson)(await this.viewTx(tx, betId));
        });
        return { ...value, replayed };
    }
    async settle(tx, userId, slug, betId, step, now) {
        const stake = (0, money_1.money)(step.totalStake);
        const payout = (0, money_1.money)(step.payout);
        await tx.gameResult.update({
            where: { id: betId },
            data: {
                status: 'settled',
                payout: payout.toFixed(),
                stake: stake.toFixed(),
                multiplier: stake.gt(0) ? payout.div(stake).toDecimalPlaces(4, 1).toFixed() : '0',
                outcome: (0, money_2.toJson)(step.outcome ?? step.state),
                settledAt: now,
            },
        });
        await this.credits.credit(tx, userId, payout.toFixed(), { gameSlug: slug, betId });
    }
    async viewTx(tx, betId) {
        const row = await tx.gameResult.findUniqueOrThrow({
            where: { id: betId },
            include: { session: { include: { game: { select: { slug: true, name: true } } } } },
        });
        const base = this.bets.view(row);
        const slug = row.session.game.slug;
        const balance = (await tx.demoCreditAccount.findUnique({ where: { userId: row.userId } }))
            ?.balance;
        return {
            ...base,
            round: this.publicState(slug, row.state, row.status === 'settled', base.stake),
            balance: (0, games_common_1.credits)(balance),
        };
    }
    /** GET …/current — the open round of a game (reconnect / recovery), or null. */
    async current(userId, slug) {
        const game = await this.seeds.gameRow(this.prisma, slug);
        const bet = await this.prisma.gameResult.findFirst({
            where: { userId, gameId: game.id, status: 'active' },
            select: { id: true },
        });
        return {
            active: bet ? await this.prisma.tx((tx) => this.viewTx(tx, bet.id)) : null,
            isDemo: true,
        };
    }
    /** What the player may see of a round (hole card and mines stay hidden until the round is settled). */
    publicState(slug, state, settled, stake) {
        if (slug === 'twenty-one') {
            const s = state;
            const hidden = !s.holeRevealed;
            const dealerVisible = hidden ? [s.dealer[0]] : s.dealer;
            return {
                phase: s.phase,
                dealer: {
                    cards: hidden ? [s.dealer[0], null] : s.dealer,
                    total: fair_1.blackjack.handValue(dealerVisible).total,
                    soft: fair_1.blackjack.handValue(dealerVisible).soft,
                    blackjack: s.holeRevealed ? s.dealerBlackjack : null,
                },
                hands: s.hands.map((h) => ({
                    ...h,
                    total: fair_1.blackjack.handValue(h.cards).total,
                    soft: fair_1.blackjack.handValue(h.cards).soft,
                })),
                active: s.active,
                allowedActions: fair_1.blackjack.allowedActions(s),
                insurance: s.insurance,
                baseStake: s.baseStake,
                totalStake: s.totalStake,
                totalPayout: s.totalPayout,
                cardsDealt: s.position,
                decks: s.decks,
                rules: fair_1.blackjack.BLACKJACK_RULES,
            };
        }
        if (slug === 'vault-sweeper') {
            const s = state;
            const gems = s.revealed.length;
            const active = s.status === 'active';
            const next = active && gems < 25 - s.mines
                ? {
                    multiplier: fair_1.mines.minesMultiplier(s.mines, gems + 1),
                    chance: fair_1.mines.minesNextChance(s.mines, gems),
                }
                : null;
            return {
                status: s.status,
                mines: s.mines,
                gems,
                revealed: s.revealed,
                hitMine: s.hitMine,
                multiplier: s.multiplier,
                cashOutValue: active && gems > 0
                    ? (0, fair_1.creditString)((0, money_1.money)(stake).times(s.multiplier).toDecimalPlaces(6, 1))
                    : null,
                next,
                board: settled ? (s.board ?? null) : null,
                maxPayout: fair_1.mines.MINES_RULES.maxPayout,
            };
        }
        const s = state;
        const current = fair_1.hilo.hiloCurrent(s);
        const active = s.status === 'active';
        return {
            status: s.status,
            start: s.start,
            current,
            steps: s.steps,
            multiplier: s.multiplier,
            rightCalls: s.steps.filter((x) => x.win === true).length,
            offer: active ? fair_1.hilo.hiloOffer(fair_1.hilo.rankOf(current)) : null,
            cashOutValue: active && s.steps.some((x) => x.win)
                ? (0, fair_1.creditString)((0, money_1.money)(stake).times(s.multiplier).toDecimalPlaces(6, 1))
                : null,
            maxPayout: fair_1.hilo.HILO_RULES.maxPayout,
        };
    }
    // ── Twenty-One ────────────────────────────────────────────────────────────────────────────────
    startBlackjack(user, body) {
        return this.open(user, 'twenty-one', { ...body, params: { decks: fair_1.blackjack.BLACKJACK_RULES.decks } }, (seed, stake) => {
            const shoe = new fair_1.blackjack.Shoe(seed, fair_1.blackjack.BLACKJACK_RULES.decks);
            const s = fair_1.blackjack.bjDeal(shoe, stake);
            return this.bjResult(s, '0');
        });
    }
    blackjackAction(user, betId, body) {
        const action = body.action === 'insurance'
            ? { type: 'insurance', accept: body.accept === true }
            : { type: body.action };
        return this.step(user, 'twenty-one', betId, body, (state, seed) => {
            const s = state;
            const cost = fair_1.blackjack.actionCost(s, action);
            const shoe = new fair_1.blackjack.Shoe(seed, s.decks, s.position);
            fair_1.blackjack.bjApply(s, shoe, action);
            return this.bjResult(s, cost);
        }, () => action.type === 'double' ||
            action.type === 'split' ||
            (action.type === 'insurance' && action.accept));
    }
    bjResult(s, extraStake) {
        const done = s.phase === 'settled';
        return {
            state: s,
            extraStake,
            done,
            payout: s.totalPayout,
            totalStake: s.totalStake,
            outcome: done ? { ...s, actions: fair_1.blackjack.actionsOf(s) } : undefined,
        };
    }
    // ── Vault Sweeper ─────────────────────────────────────────────────────────────────────────────
    startMines(user, body) {
        return this.open(user, 'vault-sweeper', { ...body, params: { mines: body.mines } }, (_seed, stake) => {
            const s = { ...fair_1.mines.minesStart(body.mines), picks: [] };
            return {
                state: s,
                extraStake: '0',
                done: false,
                payout: '0',
                totalStake: stake,
            };
        });
    }
    minesReveal(user, betId, body) {
        return this.step(user, 'vault-sweeper', betId, body, (state, seed, stake) => {
            const s = state;
            const board = fair_1.mines.minePositions(seed, s.mines);
            s.picks.push(body.tile);
            fair_1.mines.minesReveal(s, board, body.tile, stake);
            return this.minesResult(s, board, stake);
        });
    }
    minesCashOut(user, betId, body) {
        return this.step(user, 'vault-sweeper', betId, body, (state, seed, stake) => {
            const s = state;
            const board = fair_1.mines.minePositions(seed, s.mines);
            fair_1.mines.minesCashOut(s, stake);
            return this.minesResult(s, board, stake);
        });
    }
    minesResult(s, board, stake) {
        const done = s.status !== 'active';
        const state = done ? { ...s, board } : s;
        return {
            state: state,
            extraStake: '0',
            done,
            payout: s.payout,
            totalStake: stake,
        };
    }
    // ── High Card ─────────────────────────────────────────────────────────────────────────────────
    startHilo(user, body) {
        return this.open(user, 'high-card', { ...body, params: {} }, (seed, stake) => {
            const deck = new fair_1.hilo.HiloDeck(seed);
            const s = { ...fair_1.hilo.hiloStart(deck), actions: [] };
            return {
                state: s,
                extraStake: '0',
                done: false,
                payout: '0',
                totalStake: stake,
            };
        });
    }
    hiloAction(user, betId, body) {
        return this.step(user, 'high-card', betId, body, (state, seed, stake) => {
            const s = state;
            const deck = new fair_1.hilo.HiloDeck(seed, s.cardsDrawn);
            s.actions.push(body.action);
            fair_1.hilo.hiloPlay(s, deck, body.action, stake);
            return {
                state: s,
                extraStake: '0',
                done: s.status !== 'active',
                payout: s.payout,
                totalStake: stake,
            };
        });
    }
    hiloCashOut(user, betId, body) {
        return this.step(user, 'high-card', betId, body, (state, _seed, stake) => {
            const s = state;
            fair_1.hilo.hiloCashOut(s, stake);
            return {
                state: s,
                extraStake: '0',
                done: true,
                payout: s.payout,
                totalStake: stake,
            };
        });
    }
};
exports.StatefulGamesService = StatefulGamesService;
exports.StatefulGamesService = StatefulGamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        idempotency_service_1.IdempotencyService,
        credits_service_1.CreditsService,
        seeds_service_1.SeedsService,
        policy_service_1.GamesPolicyService,
        bets_service_1.BetsService,
        responsible_gaming_service_1.ResponsibleGamingService,
        games_common_1.GameClock])
], StatefulGamesService);
//# sourceMappingURL=stateful.service.js.map