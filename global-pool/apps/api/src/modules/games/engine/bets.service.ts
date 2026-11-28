import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  FAIR_GAMES,
  blackjack,
  type BjState,
  GAME_BET_FEE,
  isFairGameSlug,
  playInstant,
  verifyBet,
  type FairGameSlug,
  type GameBetsQuery,
  type PlaceBetInput,
} from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import type { Game, GameResult, GameSession, Prisma } from '@prisma/client';

import { AppError, notFound } from '../../../common/errors';
import type { AuthUser } from '../../../common/request';
import { toJson } from '../../../common/money';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { IdempotencyService } from '../../idempotency/idempotency.service';
import { CreditsService } from './credits.service';
import { DEMO, GameClock, assertDemoOnly, credits, gameInfo, refOf, rules } from './games-common';
import { GamesPolicyService } from './policy.service';
import { SeedsService } from './seeds.service';

type BetRow = GameResult & { session: GameSession & { game: Pick<Game, 'slug' | 'name'> } };

/** Instant games (Pool Dice, Double Side, Pool Roulette, Skyline, Fortune Ring, Pool Keno, Pinfall) + bet views. */
@Injectable()
export class BetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly credits: CreditsService,
    private readonly seeds: SeedsService,
    private readonly policy: GamesPolicyService,
    private readonly clock: GameClock,
  ) {}

  /** POST /games/:slug/bets — settles in the same DB transaction (stake out, payout in, one nonce). */
  async placeInstant(user: AuthUser, slug: string, body: PlaceBetInput) {
    const info = gameInfo(slug);
    if (info.mode !== 'instant') {
      throw new AppError(
        'BAD_REQUEST',
        `${info.name} is not an instant game — use its round endpoints`,
        {
          slug,
        },
      );
    }
    const game = await this.seeds.gameRow(this.prisma, slug);
    assertDemoOnly(body.currency, game);
    const { value, replayed } = await this.idempotency.run(
      { scope: `games.bet:${slug}`, ownerId: user.id, key: body.idempotencyKey, request: body },
      async (tx) => {
        const now = this.clock.now();
        const pair = await this.seeds.lockActive(tx, user.id, game.id);
        const seed = await this.seeds.takeNonce(tx, pair);
        const result = rules(() => playInstant(info.slug, seed, body.params, body.stake));
        await this.policy.assertCanPlay(tx, user.id, result.stake, now);
        const betId = randomUUID();
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
            currency: DEMO.currency,
            params: toJson(body.params),
            outcome: toJson({ ...result.outcome, win: result.win }),
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
        return toJson({ ...this.view(row), balance });
      },
    );
    return { ...(value as Record<string, unknown>), replayed };
  }

  view(r: BetRow) {
    const slug = r.session.game.slug;
    const stake = credits(r.stake);
    const payout = credits(r.payout);
    return {
      id: r.id,
      ref: refOf(slug, r.refNumber),
      game: { slug, name: r.session.game.name },
      status: r.status,
      stake,
      payout,
      net: credits(money(payout).minus(money(stake)).toFixed()),
      multiplier: r.multiplier ? money(r.multiplier.toFixed()).toFixed(4) : null,
      win: r.status === 'settled' ? money(payout).gt(money(stake)) : null,
      fee: GAME_BET_FEE,
      params: (r.params ?? null) as Record<string, unknown> | null,
      outcome: r.outcome as Record<string, unknown>,
      fairness: {
        seedPairId: r.sessionId,
        serverSeedHash: r.session.serverSeedHash,
        clientSeed: r.session.clientSeed,
        nonce: r.nonce,
        revealed: r.session.status !== 'active',
      },
      rulesVersion: r.rulesVersion,
      currency: DEMO.currency,
      createdAt: r.createdAt.toISOString(),
      settledAt: r.settledAt?.toISOString() ?? null,
      isDemo: true,
    };
  }

  /**
   * GET /games/:slug/bets — my bets for one game, newest first. Optional filters (period, win / lose, Double Side
   * pick, reference or nonce search) apply to the page AND the summary, so KPIs always describe the listed bets.
   */
  async history(
    userId: string,
    slug: string,
    page: number,
    pageSize: number,
    filters: Pick<GameBetsQuery, 'from' | 'to' | 'result' | 'pick' | 'search'> = {},
  ) {
    const game = await this.seeds.gameRow(this.prisma, slug);
    const where = this.historyWhere(userId, game.id, filters);
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
    const settledWhere: Prisma.GameResultWhereInput = { AND: [where, { status: 'settled' }] };
    const [settled, wins, landedHeads, landedTails] = await Promise.all([
      this.prisma.gameResult.aggregate({
        where: settledWhere,
        _sum: { stake: true, payout: true },
        _count: true,
      }),
      this.prisma.gameResult.count({ where: { AND: [settledWhere, { payout: { gt: 0 } }] } }),
      // Double Side: how the coin landed (a record, not a pattern — every flip is 50 / 50)
      slug === 'double-side'
        ? this.prisma.gameResult.count({
            where: { AND: [settledWhere, { outcome: { path: ['side'], equals: 'heads' } }] },
          })
        : Promise.resolve(null),
      slug === 'double-side'
        ? this.prisma.gameResult.count({
            where: { AND: [settledWhere, { outcome: { path: ['side'], equals: 'tails' } }] },
          })
        : Promise.resolve(null),
    ]);
    const wagered = credits(settled._sum.stake);
    const returned = credits(settled._sum.payout);
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
        net: credits(money(returned).minus(money(wagered)).toFixed()),
        wins,
        losses: settled._count - wins,
        ...(landedHeads !== null && landedTails !== null
          ? { landed: { heads: landedHeads, tails: landedTails } }
          : {}),
      },
      currency: DEMO.currency,
      isDemo: true,
    };
  }

  private historyWhere(
    userId: string,
    gameId: string,
    f: Pick<GameBetsQuery, 'from' | 'to' | 'result' | 'pick' | 'search'>,
  ): Prisma.GameResultWhereInput {
    const and: Prisma.GameResultWhereInput[] = [{ userId, gameId }];
    if (f.from || f.to) {
      and.push({
        createdAt: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) },
      });
    }
    if (f.result === 'win') and.push({ status: 'settled', payout: { gt: 0 } });
    if (f.result === 'lose') and.push({ status: 'settled', payout: { lte: 0 } });
    if (f.pick) and.push({ params: { path: ['pick'], equals: f.pick } });
    if (f.search) {
      const digits = /(\d{1,9})$/.exec(f.search)?.[1];
      const n = digits ? Number(digits) : NaN;
      if (Number.isSafeInteger(n)) {
        // "CF-52107" names a reference; a bare number may be a reference or a nonce
        and.push(/[A-Za-z-]/.test(f.search) ? { refNumber: n } : { OR: [{ refNumber: n }, { nonce: n }] });
      }
    }
    return { AND: and };
  }

  async byId(userId: string, id: string): Promise<BetRow> {
    const row = await this.prisma.gameResult.findUnique({
      where: { id },
      include: { session: { include: { game: { select: { slug: true, name: true } } } } },
    });
    if (!row || row.userId !== userId) throw notFound('Bet');
    return row;
  }

  /**
   * GET /games/bets/:id/verify — everything needed to re-derive the bet in the browser with @gp/shared/fair. Once the
   * seed pair is rotated the server seed is revealed and the API re-derives the outcome itself (`recomputed`).
   */
  async verification(userId: string, id: string) {
    const r = await this.byId(userId, id);
    const slug = r.session.game.slug;
    if (!isFairGameSlug(slug)) throw notFound('Bet');
    const revealed = r.session.status !== 'active' && !!r.session.serverSeed;
    const params = this.verifyParams(slug, r);
    let recomputed: Record<string, unknown> | null = null;
    let matches: boolean | null = null;
    let commitmentValid: boolean | null = null;
    if (revealed && r.status === 'settled') {
      const v = rules(() =>
        verifyBet({
          slug,
          serverSeed: r.session.serverSeed!,
          serverSeedHash: r.session.serverSeedHash,
          clientSeed: r.session.clientSeed,
          nonce: r.nonce,
          stake: credits(this.baseStake(slug, r)),
          params,
        }),
      );
      recomputed = v.outcome;
      commitmentValid = v.commitmentValid;
      matches = money(v.payout).eq(money(r.payout.toFixed()));
    }
    return {
      bet: this.view(r),
      verify: {
        game: slug,
        rulesVersion: r.rulesVersion ?? FAIR_GAMES[slug].rulesVersion,
        serverSeedHash: r.session.serverSeedHash,
        serverSeed: revealed ? r.session.serverSeed : null,
        clientSeed: r.session.clientSeed,
        nonce: r.nonce,
        stake: credits(this.baseStake(slug, r)),
        params,
        stream:
          'HMAC-SHA256(key = serverSeed, message = `${clientSeed}:${nonce}:${cursor}`), cursor = 0, 1, 2 …',
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
  private baseStake(slug: FairGameSlug, r: GameResult): string {
    if (slug === 'twenty-one') {
      const s = r.state as { baseStake?: string } | null;
      return s?.baseStake ?? credits(r.stake);
    }
    return credits(r.stake);
  }

  /** Verifier input params per game (stateful games: their recorded actions). */
  private verifyParams(slug: FairGameSlug, r: GameResult): Record<string, unknown> {
    const p = (r.params ?? {}) as Record<string, unknown>;
    const st = (r.state ?? {}) as Record<string, unknown>;
    if (slug === 'vault-sweeper') {
      return { mines: p.mines, picks: st.picks ?? [], cashedOut: st.status === 'cashed_out' };
    }
    if (slug === 'high-card') {
      return { actions: st.actions ?? [], cashedOut: st.status === 'cashed_out' };
    }
    if (slug === 'twenty-one') {
      return { actions: blackjack.actionsOf(st as unknown as BjState), decks: st.decks ?? 6 };
    }
    return p;
  }
}
