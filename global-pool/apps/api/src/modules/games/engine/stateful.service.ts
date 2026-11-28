import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  blackjack,
  creditString,
  hilo,
  mines,
  parseStake,
  type BjAction,
  type BjState,
  type HiloCall,
  type HiloState,
  type MinesState,
  type SeedInput,
} from '@gp/shared/fair';
import { money } from '@gp/shared/money';

import { AppError } from '../../../common/errors';
import type { AuthUser } from '../../../common/request';
import { toJson } from '../../../common/money';
import { PrismaService, type Tx } from '../../../infra/prisma/prisma.service';
import { ResponsibleGamingService } from '../../compliance/responsible-gaming.service';
import { IdempotencyService } from '../../idempotency/idempotency.service';
import { BetsService } from './bets.service';
import { CreditsService } from './credits.service';
import { GameClock, assertDemoOnly, credits, gameInfo, rules } from './games-common';
import { GamesPolicyService } from './policy.service';
import { SeedsService } from './seeds.service';

type StatefulSlug = 'twenty-one' | 'vault-sweeper' | 'high-card';

interface StepResult {
  state: Record<string, unknown>;
  /** DEMO credits the step adds to the stake (double / split / insurance). */
  extraStake: string;
  done: boolean;
  payout: string;
  totalStake: string;
  outcome?: Record<string, unknown>;
}

/** Mines state as stored (the board itself is NEVER stored: it is re-derived from the seed when needed). */
type MinesStored = MinesState & { picks: number[] };
/** Hi-lo state as stored, with the action list for the verifier. */
type HiloStored = HiloState & { actions: (HiloCall | 'skip')[] };

/**
 * Stateful rounds held on the server: Twenty-One hands, Vault Sweeper boards and High Card runs. The whole round is
 * fixed by the seed pair + nonce when it starts (shoe order, mine positions, card sequence); the stored state holds
 * only what the player has seen plus the action log. Each step runs in one DB transaction with the bet row locked,
 * is idempotent, and the round can be resumed after a disconnect with GET …/current.
 */
@Injectable()
export class StatefulGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly credits: CreditsService,
    private readonly seeds: SeedsService,
    private readonly policy: GamesPolicyService,
    private readonly bets: BetsService,
    private readonly rg: ResponsibleGamingService,
    private readonly clock: GameClock,
  ) {}

  // ── generic round plumbing ────────────────────────────────────────────────────────────────────

  private async open(
    user: AuthUser,
    slug: StatefulSlug,
    input: {
      stake: string;
      currency?: string;
      idempotencyKey: string;
      params: Record<string, unknown>;
    },
    init: (seed: SeedInput, stake: string) => StepResult,
  ) {
    const info = gameInfo(slug);
    const game = await this.seeds.gameRow(this.prisma, slug);
    assertDemoOnly(input.currency, game);
    const stake = rules(() => creditString(parseStake(input.stake, info.minBet, info.maxBet)));
    const { value, replayed } = await this.idempotency.run(
      { scope: `games.round:${slug}`, ownerId: user.id, key: input.idempotencyKey, request: input },
      async (tx) => {
        const now = this.clock.now();
        const pair = await this.seeds.lockActive(tx, user.id, game.id);
        const open = await tx.gameResult.findFirst({
          where: { userId: user.id, gameId: game.id, status: 'active' },
          select: { id: true },
        });
        if (open) {
          throw new AppError('CONFLICT', 'You already have a round in progress — finish it first', {
            reason: 'ROUND_IN_PROGRESS',
            betId: open.id,
          });
        }
        await this.policy.assertCanPlay(tx, user.id, stake, now);
        const seed = await this.seeds.takeNonce(tx, pair);
        const step = rules(() => init(seed, stake));
        const betId = randomUUID();
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
            params: toJson(input.params),
            state: toJson(step.state),
            outcome: {},
            rulesVersion: info.rulesVersion,
            idempotencyKey: input.idempotencyKey,
          },
        });
        if (step.done) await this.settle(tx, user.id, slug, betId, step, now);
        return toJson(await this.viewTx(tx, betId));
      },
    );
    return { ...(value as Record<string, unknown>), replayed };
  }

  private async step(
    user: AuthUser,
    slug: StatefulSlug,
    betId: string,
    input: { idempotencyKey: string } & Record<string, unknown>,
    fn: (state: Record<string, unknown>, seed: SeedInput, stake: string) => StepResult,
    stakeAdding: (state: Record<string, unknown>) => boolean = () => false,
  ) {
    const { value, replayed } = await this.idempotency.run(
      { scope: `games.step:${betId}`, ownerId: user.id, key: input.idempotencyKey, request: input },
      async (tx) => {
        const now = this.clock.now();
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id::text AS id FROM game_results WHERE id = ${betId}::uuid FOR UPDATE`;
        const bet = locked[0]
          ? await tx.gameResult.findUnique({
              where: { id: betId },
              include: { session: { include: { game: true } } },
            })
          : null;
        if (!bet || bet.userId !== user.id || bet.session.game.slug !== slug) {
          throw new AppError('NOT_FOUND', 'Round not found');
        }
        if (bet.status !== 'active') {
          throw new AppError('CONFLICT', 'This round is already settled', { reason: 'ROUND_OVER' });
        }
        const state = bet.state as Record<string, unknown>;
        if (stakeAdding(state)) await this.rg.assertNotSelfExcluded(user.id, tx);
        const seed: SeedInput = {
          serverSeed: this.seeds.serverSeedOf(bet.session),
          clientSeed: bet.session.clientSeed,
          nonce: bet.nonce,
        };
        const step = rules(() => fn(structuredClone(state), seed, credits(bet.stake)));
        if (money(step.extraStake).gt(0)) {
          await this.credits.debit(tx, user.id, step.extraStake, { gameSlug: slug, betId });
        }
        await tx.gameResult.update({
          where: { id: betId },
          data: { state: toJson(step.state), stake: step.totalStake },
        });
        if (step.done) await this.settle(tx, user.id, slug, betId, step, now);
        return toJson(await this.viewTx(tx, betId));
      },
    );
    return { ...(value as Record<string, unknown>), replayed };
  }

  private async settle(
    tx: Tx,
    userId: string,
    slug: StatefulSlug,
    betId: string,
    step: StepResult,
    now: Date,
  ) {
    const stake = money(step.totalStake);
    const payout = money(step.payout);
    await tx.gameResult.update({
      where: { id: betId },
      data: {
        status: 'settled',
        payout: payout.toFixed(),
        stake: stake.toFixed(),
        multiplier: stake.gt(0) ? payout.div(stake).toDecimalPlaces(4, 1).toFixed() : '0',
        outcome: toJson(step.outcome ?? step.state),
        settledAt: now,
      },
    });
    await this.credits.credit(tx, userId, payout.toFixed(), { gameSlug: slug, betId });
  }

  private async viewTx(tx: Tx, betId: string) {
    const row = await tx.gameResult.findUniqueOrThrow({
      where: { id: betId },
      include: { session: { include: { game: { select: { slug: true, name: true } } } } },
    });
    const base = this.bets.view(row);
    const slug = row.session.game.slug as StatefulSlug;
    const balance = (await tx.demoCreditAccount.findUnique({ where: { userId: row.userId! } }))
      ?.balance;
    return {
      ...base,
      round: this.publicState(
        slug,
        row.state as Record<string, unknown>,
        row.status === 'settled',
        base.stake,
      ),
      balance: credits(balance),
    };
  }

  /** GET …/current — the open round of a game (reconnect / recovery), or null. */
  async current(userId: string, slug: StatefulSlug) {
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
  publicState(slug: StatefulSlug, state: Record<string, unknown>, settled: boolean, stake: string) {
    if (slug === 'twenty-one') {
      const s = state as unknown as BjState;
      const hidden = !s.holeRevealed;
      const dealerVisible = hidden ? [s.dealer[0]!] : s.dealer;
      return {
        phase: s.phase,
        dealer: {
          cards: hidden ? [s.dealer[0]!, null] : s.dealer,
          total: blackjack.handValue(dealerVisible).total,
          soft: blackjack.handValue(dealerVisible).soft,
          blackjack: s.holeRevealed ? s.dealerBlackjack : null,
        },
        hands: s.hands.map((h) => ({
          ...h,
          total: blackjack.handValue(h.cards).total,
          soft: blackjack.handValue(h.cards).soft,
        })),
        active: s.active,
        allowedActions: blackjack.allowedActions(s),
        insurance: s.insurance,
        baseStake: s.baseStake,
        totalStake: s.totalStake,
        totalPayout: s.totalPayout,
        cardsDealt: s.position,
        decks: s.decks,
        rules: blackjack.BLACKJACK_RULES,
      };
    }
    if (slug === 'vault-sweeper') {
      const s = state as unknown as MinesStored & { board?: number[] };
      const gems = s.revealed.length;
      const active = s.status === 'active';
      const next =
        active && gems < 25 - s.mines
          ? {
              multiplier: mines.minesMultiplier(s.mines, gems + 1),
              chance: mines.minesNextChance(s.mines, gems),
            }
          : null;
      return {
        status: s.status,
        mines: s.mines,
        gems,
        revealed: s.revealed,
        hitMine: s.hitMine,
        multiplier: s.multiplier,
        cashOutValue:
          active && gems > 0
            ? creditString(money(stake).times(s.multiplier).toDecimalPlaces(6, 1))
            : null,
        next,
        board: settled ? (s.board ?? null) : null,
        maxPayout: mines.MINES_RULES.maxPayout,
      };
    }
    const s = state as unknown as HiloStored;
    const current = hilo.hiloCurrent(s);
    const active = s.status === 'active';
    return {
      status: s.status,
      start: s.start,
      current,
      steps: s.steps,
      multiplier: s.multiplier,
      rightCalls: s.steps.filter((x) => x.win === true).length,
      offer: active ? hilo.hiloOffer(hilo.rankOf(current)) : null,
      cashOutValue:
        active && s.steps.some((x) => x.win)
          ? creditString(money(stake).times(s.multiplier).toDecimalPlaces(6, 1))
          : null,
      maxPayout: hilo.HILO_RULES.maxPayout,
    };
  }

  // ── Twenty-One ────────────────────────────────────────────────────────────────────────────────

  startBlackjack(
    user: AuthUser,
    body: { stake: string; currency?: string; idempotencyKey: string },
  ) {
    return this.open(
      user,
      'twenty-one',
      { ...body, params: { decks: blackjack.BLACKJACK_RULES.decks } },
      (seed, stake) => {
        const shoe = new blackjack.Shoe(seed, blackjack.BLACKJACK_RULES.decks);
        const s = blackjack.bjDeal(shoe, stake);
        return this.bjResult(s, '0');
      },
    );
  }

  blackjackAction(
    user: AuthUser,
    betId: string,
    body: { action: BjAction['type']; accept?: boolean; idempotencyKey: string },
  ) {
    const action: BjAction =
      body.action === 'insurance'
        ? { type: 'insurance', accept: body.accept === true }
        : { type: body.action };
    return this.step(
      user,
      'twenty-one',
      betId,
      body,
      (state, seed) => {
        const s = state as unknown as BjState;
        const cost = blackjack.actionCost(s, action);
        const shoe = new blackjack.Shoe(seed, s.decks, s.position);
        blackjack.bjApply(s, shoe, action);
        return this.bjResult(s, cost);
      },
      () =>
        action.type === 'double' ||
        action.type === 'split' ||
        (action.type === 'insurance' && action.accept),
    );
  }

  private bjResult(s: BjState, extraStake: string): StepResult {
    const done = s.phase === 'settled';
    return {
      state: s as unknown as Record<string, unknown>,
      extraStake,
      done,
      payout: s.totalPayout,
      totalStake: s.totalStake,
      outcome: done ? { ...s, actions: blackjack.actionsOf(s) } : undefined,
    };
  }

  // ── Vault Sweeper ─────────────────────────────────────────────────────────────────────────────

  startMines(
    user: AuthUser,
    body: { stake: string; mines: number; currency?: string; idempotencyKey: string },
  ) {
    return this.open(
      user,
      'vault-sweeper',
      { ...body, params: { mines: body.mines } },
      (_seed, stake) => {
        const s: MinesStored = { ...mines.minesStart(body.mines), picks: [] };
        return {
          state: s as unknown as Record<string, unknown>,
          extraStake: '0',
          done: false,
          payout: '0',
          totalStake: stake,
        };
      },
    );
  }

  minesReveal(user: AuthUser, betId: string, body: { tile: number; idempotencyKey: string }) {
    return this.step(user, 'vault-sweeper', betId, body, (state, seed, stake) => {
      const s = state as unknown as MinesStored;
      const board = mines.minePositions(seed, s.mines);
      s.picks.push(body.tile);
      mines.minesReveal(s, board, body.tile, stake);
      return this.minesResult(s, board, stake);
    });
  }

  minesCashOut(user: AuthUser, betId: string, body: { idempotencyKey: string }) {
    return this.step(user, 'vault-sweeper', betId, body, (state, seed, stake) => {
      const s = state as unknown as MinesStored;
      const board = mines.minePositions(seed, s.mines);
      mines.minesCashOut(s, stake);
      return this.minesResult(s, board, stake);
    });
  }

  private minesResult(s: MinesStored, board: number[], stake: string): StepResult {
    const done = s.status !== 'active';
    const state = done ? { ...s, board } : s;
    return {
      state: state as unknown as Record<string, unknown>,
      extraStake: '0',
      done,
      payout: s.payout,
      totalStake: stake,
    };
  }

  // ── High Card ─────────────────────────────────────────────────────────────────────────────────

  startHilo(user: AuthUser, body: { stake: string; currency?: string; idempotencyKey: string }) {
    return this.open(user, 'high-card', { ...body, params: {} }, (seed, stake) => {
      const deck = new hilo.HiloDeck(seed);
      const s: HiloStored = { ...hilo.hiloStart(deck), actions: [] };
      return {
        state: s as unknown as Record<string, unknown>,
        extraStake: '0',
        done: false,
        payout: '0',
        totalStake: stake,
      };
    });
  }

  hiloAction(
    user: AuthUser,
    betId: string,
    body: { action: HiloCall | 'skip'; idempotencyKey: string },
  ) {
    return this.step(user, 'high-card', betId, body, (state, seed, stake) => {
      const s = state as unknown as HiloStored;
      const deck = new hilo.HiloDeck(seed, s.cardsDrawn);
      s.actions.push(body.action);
      hilo.hiloPlay(s, deck, body.action, stake);
      return {
        state: s as unknown as Record<string, unknown>,
        extraStake: '0',
        done: s.status !== 'active',
        payout: s.payout,
        totalStake: stake,
      };
    });
  }

  hiloCashOut(user: AuthUser, betId: string, body: { idempotencyKey: string }) {
    return this.step(user, 'high-card', betId, body, (state, _seed, stake) => {
      const s = state as unknown as HiloStored;
      hilo.hiloCashOut(s, stake);
      return {
        state: s as unknown as Record<string, unknown>,
        extraStake: '0',
        done: true,
        payout: s.payout,
        totalStake: stake,
      };
    });
  }
}
