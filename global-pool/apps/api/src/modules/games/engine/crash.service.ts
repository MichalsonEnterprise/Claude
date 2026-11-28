import { randomBytes, randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { FAIR_GAMES, crash, creditString, parseStake } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import type { CrashBet, CrashRound } from '@prisma/client';
import type Redis from 'ioredis';
import { Subject } from 'rxjs';

import { decryptSecret, encryptSecret } from '../../../common/crypto';
import { AppError, notFound } from '../../../common/errors';
import type { AuthUser } from '../../../common/request';
import { AppConfig } from '../../../config/app-config';
import { PrismaService, type Tx } from '../../../infra/prisma/prisma.service';
import { REDIS } from '../../../infra/redis/redis.module';
import { IdempotencyService } from '../../idempotency/idempotency.service';
import { CreditsService } from './credits.service';
import { DEMO, GameClock, assertDemoOnly, credits, rules } from './games-common';
import { GamesPolicyService } from './policy.service';

/** Rounds per hash chain (a new chain is committed when one is used up). */
export const CRASH_CHAIN_LENGTH = 10_000;
const SLUG = 'orbit-rush';
const OPEN_LOCK = 47_110_042n;
const LEADER_KEY = 'gp:crash:leader';

export type CrashEvent =
  | { type: 'phase'; round: Record<string, unknown> }
  | { type: 'tick'; roundId: string; number: number; multiplier: string; elapsedMs: number }
  | { type: 'bet'; roundId: string; bet: Record<string, unknown> }
  | { type: 'cashout'; roundId: string; bet: Record<string, unknown> }
  | { type: 'crashed'; round: Record<string, unknown> };

interface RoundSecret {
  seed: string;
  crashPoint: string;
  instant: boolean;
  crashAtMs: number;
}

type BetWithUser = CrashBet & { user: { handle: string | null; publicId: string } };

/**
 * Orbit Rush — server-authoritative crash rounds (DEMO credits only).
 *
 * Phases: betting (10 s) → running (multiplier m(t) = e^(0.1117 t) in 100 ms frames) → crashed (4 s pause) → next.
 * Every crash point comes from a SHA-256 hash chain committed before the round (see @gp/shared/fair crash.ts); the
 * round seed is revealed when the round crashes. Auto cash-outs run here, on the server, so they still work when a
 * player's connection drops. `tick(now)` is the single state transition (the loop calls it every 100 ms when
 * JOBS_ENABLED=true; tests call it directly with a pinned clock). Nothing can choose or change a crash point.
 */
@Injectable()
export class CrashEngineService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CrashEngineService.name);
  readonly events$ = new Subject<CrashEvent>();
  private readonly secrets = new Map<string, RoundSecret>();
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private readonly instanceId = randomUUID();
  private leaderUntil = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly idempotency: IdempotencyService,
    private readonly credits: CreditsService,
    private readonly policy: GamesPolicyService,
    private readonly clock: GameClock,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.env.JOBS_ENABLED) return;
    this.timer = setInterval(() => void this.loop(), crash.CRASH_RULES.frameMs);
    this.logger.log('Orbit Rush loop started (100 ms frames)');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.events$.complete();
  }

  /** One replica runs the loop: a 3 s Redis lease renewed every second. */
  private async isLeader(): Promise<boolean> {
    const nowMs = Date.now();
    if (nowMs < this.leaderUntil - 2_000) return true;
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
    } catch (err) {
      this.logger.warn(`leader lease failed: ${String(err)}`);
    }
    return false;
  }

  private async loop(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      if (await this.isLeader()) await this.tick();
    } catch (err) {
      this.logger.error(`crash tick failed: ${String(err)}`);
    } finally {
      this.ticking = false;
    }
  }

  // ── chain & secrets ───────────────────────────────────────────────────────────────────────────

  private async activeChain(tx: Tx) {
    const chain = await tx.crashChain.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (chain && chain.nextIndex <= chain.length) return chain;
    if (chain) await tx.crashChain.update({ where: { id: chain.id }, data: { active: false } });
    const terminal = randomBytes(32).toString('hex');
    const commitment = crash.chainSeedAt(terminal, CRASH_CHAIN_LENGTH, 1);
    return tx.crashChain.create({
      data: {
        length: CRASH_CHAIN_LENGTH,
        terminalSeedEnc: encryptSecret(terminal, this.config.totpKey),
        // public chain commitment = seeds[0] = sha256(seeds[1])
        commitment: crash.crashCommitment(commitment),
        salt: randomBytes(16).toString('hex'),
      },
    });
  }

  private async secretOf(db: Tx, round: CrashRound): Promise<RoundSecret> {
    const cached = this.secrets.get(round.id);
    if (cached) return cached;
    const chain = await db.crashChain.findUniqueOrThrow({ where: { id: round.chainId } });
    const terminal = decryptSecret(chain.terminalSeedEnc, this.config.totpKey);
    const seed = crash.chainSeedAt(terminal, chain.length, round.chainIndex);
    if (crash.crashCommitment(seed) !== round.commitment) {
      throw new AppError('INTERNAL_ERROR', 'Crash round commitment mismatch');
    }
    const cp = crash.crashPointOf(seed, chain.salt);
    const secret: RoundSecret = {
      seed,
      crashPoint: cp.crashPoint,
      instant: cp.instant,
      crashAtMs: cp.instant ? 0 : crash.timeToReachMs(cp.crashPoint),
    };
    this.secrets.set(round.id, secret);
    if (this.secrets.size > 50) this.secrets.delete(this.secrets.keys().next().value!);
    return secret;
  }

  // ── state machine ─────────────────────────────────────────────────────────────────────────────

  private async lockLive(tx: Tx): Promise<CrashRound | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM crash_rounds WHERE status <> 'crashed' FOR UPDATE`;
    return rows[0] ? tx.crashRound.findUnique({ where: { id: rows[0].id } }) : null;
  }

  /** Advance the live round to `now` (open, start, auto cash-outs, crash). Returns the public snapshot. */
  async tick(now: Date = this.clock.now()) {
    const emitted: CrashEvent[] = [];
    await this.prisma.tx(async (tx) => {
      let live = await this.lockLive(tx);
      if (!live) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${OPEN_LOCK})`;
        live = await this.lockLive(tx);
        if (!live) {
          const last = await tx.crashRound.findFirst({ orderBy: { number: 'desc' } });
          if (last?.nextRoundAt && last.nextRoundAt > now) return;
          live = await this.openRound(tx, now);
          emitted.push({ type: 'phase', round: this.publicRound(live, null) });
        }
      }
      await this.advance(tx, live, now, emitted);
    });
    for (const e of emitted) this.events$.next(e);
    return this.snapshot(now);
  }

  private async openRound(tx: Tx, now: Date): Promise<CrashRound> {
    const chain = await this.activeChain(tx);
    const index = chain.nextIndex;
    await tx.crashChain.update({ where: { id: chain.id }, data: { nextIndex: index + 1 } });
    const terminal = decryptSecret(chain.terminalSeedEnc, this.config.totpKey);
    const seed = crash.chainSeedAt(terminal, chain.length, index);
    return tx.crashRound.create({
      data: {
        chainId: chain.id,
        chainIndex: index,
        status: 'betting',
        commitment: crash.crashCommitment(seed),
        bettingOpensAt: now,
        startedAt: new Date(now.getTime() + crash.CRASH_RULES.bettingMs),
      },
    });
  }

  /** Moves a locked live round forward to `now`. Mutates nothing outside this round and its bets. */
  private async advance(
    tx: Tx,
    round: CrashRound,
    now: Date,
    emitted: CrashEvent[],
  ): Promise<CrashRound> {
    let r = round;
    if (r.status === 'betting') {
      if (now < r.startedAt) return r;
      r = await tx.crashRound.update({ where: { id: r.id }, data: { status: 'running' } });
      emitted.push({ type: 'phase', round: this.publicRound(r, null) });
    }
    if (r.status !== 'running') return r;
    const secret = await this.secretOf(tx, r);
    const elapsed = Math.max(0, now.getTime() - r.startedAt.getTime());
    const crashed = elapsed >= secret.crashAtMs;
    const reach = crashed ? secret.crashPoint : crash.multiplierAt(elapsed);
    // auto cash-outs at exactly their target, in target order, for every target the curve has reached
    const autos = await tx.crashBet.findMany({
      where: { roundId: r.id, status: 'active', autoCashOut: { lte: reach } },
      include: { user: { select: { handle: true, publicId: true } } },
      orderBy: { autoCashOut: 'asc' },
    });
    for (const b of autos) {
      const target = money(b.autoCashOut!.toFixed()).toFixed(2);
      const at = new Date(r.startedAt.getTime() + crash.timeToReachMs(target));
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
    const capped = money(secret.crashPoint).gte(crash.CRASH_RULES.maxMultiplier);
    for (const b of open) {
      if (capped) {
        emitted.push({
          type: 'cashout',
          roundId: r.id,
          bet: await this.cashOutBet(tx, b, secret.crashPoint, 'cap', crashedAt),
        });
      } else {
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
        nextRoundAt: new Date(crashedAt.getTime() + crash.CRASH_RULES.crashedPauseMs),
      },
    });
    emitted.push({ type: 'crashed', round: this.publicRound(r, secret) });
    return r;
  }

  private async cashOutBet(
    tx: Tx,
    b: BetWithUser,
    multiplier: string,
    kind: 'manual' | 'auto' | 'cap',
    at: Date,
  ) {
    const payout = crash.crashPayout(credits(b.stake), multiplier);
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
  async placeBet(
    user: AuthUser,
    body: { stake: string; autoCashOut?: string | null; currency?: string; idempotencyKey: string },
  ) {
    const info = FAIR_GAMES[SLUG];
    const game = await this.prisma.game.findUnique({ where: { slug: SLUG } });
    if (!game || !game.enabled) throw notFound('Game');
    assertDemoOnly(body.currency, game);
    const stake = rules(() => creditString(parseStake(body.stake, info.minBet, info.maxBet)));
    const autoCashOut = rules(() => crash.validateCrashTarget(body.autoCashOut ?? null));
    const emitted: CrashEvent[] = [];
    const { value, replayed } = await this.idempotency.run(
      { scope: 'games.crash.bet', ownerId: user.id, key: body.idempotencyKey, request: body },
      async (tx) => {
        const now = this.clock.now();
        const live = await this.lockLive(tx);
        if (!live || live.status !== 'betting' || now >= live.startedAt) {
          throw new AppError(
            'ROUND_NOT_OPEN',
            'Bets are closed for this round — wait for the next betting window',
            {
              roundNumber: live?.number ?? null,
              status: live?.status ?? null,
            },
          );
        }
        await this.policy.assertCanPlay(tx, user.id, stake, now);
        const existing = await tx.crashBet.findUnique({
          where: { roundId_userId: { roundId: live.id, userId: user.id } },
        });
        if (existing) {
          throw new AppError('CONFLICT', 'You already have a bet in this round', {
            reason: 'ALREADY_BET',
          });
        }
        const id = randomUUID();
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
      },
    );
    for (const e of emitted) this.events$.next(e);
    return { ...(value as Record<string, unknown>), replayed };
  }

  /** Manual cash-out at the current server multiplier (refused once the round has crashed). */
  async cashOut(user: AuthUser, betId: string, body: { idempotencyKey: string }) {
    const emitted: CrashEvent[] = [];
    const { value, replayed } = await this.idempotency.run(
      {
        scope: `games.crash.cashout:${betId}`,
        ownerId: user.id,
        key: body.idempotencyKey,
        request: body,
      },
      async (tx) => {
        const now = this.clock.now();
        const bet = await tx.crashBet.findUnique({ where: { id: betId } });
        if (!bet || bet.userId !== user.id) throw notFound('Bet');
        const locked = await this.lockLive(tx);
        let round = await tx.crashRound.findUniqueOrThrow({ where: { id: bet.roundId } });
        if (locked && locked.id === round.id) round = await this.advance(tx, round, now, emitted);
        const fresh = await tx.crashBet.findUniqueOrThrow({
          where: { id: betId },
          include: { user: { select: { handle: true, publicId: true } } },
        });
        if (fresh.status === 'active' && round.status === 'running') {
          const m = crash.multiplierAt(Math.max(0, now.getTime() - round.startedAt.getTime()));
          const pub = await this.cashOutBet(tx, fresh, m, 'manual', now);
          emitted.push({ type: 'cashout', roundId: round.id, bet: pub });
        } else if (fresh.status === 'active') {
          throw new AppError('CONFLICT', 'The round has not started yet', {
            reason: 'NOT_RUNNING',
          });
        }
        const final = await tx.crashBet.findUniqueOrThrow({ where: { id: betId } });
        const balance = (await tx.demoCreditAccount.findUnique({ where: { userId: user.id } }))
          ?.balance;
        return {
          ...this.myBet(final, round),
          balance: credits(balance),
        };
      },
    );
    for (const e of emitted) this.events$.next(e);
    return { ...(value as Record<string, unknown>), replayed };
  }

  // ── views ─────────────────────────────────────────────────────────────────────────────────────

  publicRound(r: CrashRound, secret: RoundSecret | null) {
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
        ? money((r.crashPoint ?? secret?.crashPoint ?? '0').toString()).toFixed(2)
        : null,
      instant: crashed ? money((r.crashPoint ?? '0').toString()).eq(1) : null,
      seed: crashed ? (r.seed ?? secret?.seed ?? null) : null,
      isDemo: true,
    };
  }

  publicBet(b: BetWithUser) {
    return {
      id: b.id,
      ref: `CRB-${b.refNumber}`,
      player: b.user.handle ? `@${b.user.handle}` : b.user.publicId,
      stake: credits(b.stake),
      autoCashOut: b.autoCashOut ? money(b.autoCashOut.toFixed()).toFixed(2) : null,
      status: b.status,
      cashOutMultiplier: b.cashOutMultiplier
        ? money(b.cashOutMultiplier.toFixed()).toFixed(2)
        : null,
      payout: credits(b.payout),
      cashOutKind: b.cashOutKind,
      currency: DEMO.currency,
    };
  }

  myBet(b: CrashBet, round: CrashRound) {
    return {
      id: b.id,
      ref: `CRB-${b.refNumber}`,
      round: { id: round.id, number: round.number, status: round.status },
      stake: credits(b.stake),
      autoCashOut: b.autoCashOut ? money(b.autoCashOut.toFixed()).toFixed(2) : null,
      status: b.status,
      cashOutMultiplier: b.cashOutMultiplier
        ? money(b.cashOutMultiplier.toFixed()).toFixed(2)
        : null,
      payout: credits(b.payout),
      net: credits(
        money(credits(b.payout))
          .minus(money(credits(b.stake)))
          .toFixed(),
      ),
      cashOutKind: b.cashOutKind,
      cashedOutAt: b.cashedOutAt?.toISOString() ?? null,
      currency: DEMO.currency,
      createdAt: b.createdAt.toISOString(),
      isDemo: true,
    };
  }

  /** Public snapshot: live round (no crash point before the crash), current multiplier, live bets, last 20 points. */
  async snapshot(now: Date = this.clock.now()) {
    const live =
      (await this.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } })) ??
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
    const elapsed =
      live && live.status === 'running' ? Math.max(0, now.getTime() - live.startedAt.getTime()) : 0;
    return {
      round: live ? this.publicRound(live, null) : null,
      multiplier:
        live?.status === 'running'
          ? crash.multiplierAt(elapsed)
          : live?.status === 'crashed'
            ? money(live.crashPoint!.toFixed()).toFixed(2)
            : '1.00',
      elapsedMs: elapsed,
      bets: bets.map((b) => this.publicBet(b)),
      history: history.map((h) => ({
        number: h.number,
        crashPoint: money(h.crashPoint!.toFixed()).toFixed(2),
      })),
      rules: { ...crash.CRASH_RULES, houseEdgePercent: FAIR_GAMES[SLUG].houseEdgePercent },
      serverTime: now.toISOString(),
      currency: DEMO.currency,
      isDemo: true,
    };
  }

  async rounds(page: number, pageSize: number) {
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

  async roundByNumber(number: number) {
    const r = await this.prisma.crashRound.findUnique({ where: { number } });
    if (!r) throw notFound('Round');
    return r;
  }

  /** Public verification of a crashed round: seed → commitment → chain commitment, and the crash point. */
  async verify(number: number) {
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
      formula:
        'stream = HMAC-SHA256(key = round seed, message = `${salt}:0:${cursor}`); instant crash when uniformInt(0, 99) = 0; otherwise crash = floor(100·2^52 / (2^52 − H)) / 100 with H = next 52 bits, capped at 1,000.00×',
      library: '@gp/shared/fair → crash.crashPointOf(seed, salt)',
      isDemo: true,
    };
    if (r.status !== 'crashed' || !r.seed) {
      return { ...base, revealed: false, message: 'The seed is revealed when the round crashes.' };
    }
    const recomputed = crash.crashPointOf(r.seed, chain.salt);
    return {
      ...base,
      revealed: true,
      seed: r.seed,
      commitmentValid: crash.crashCommitment(r.seed) === r.commitment,
      chainValid: crash.verifyChainSeed(r.seed, r.chainIndex, chain.commitment),
      recomputed,
      matches: recomputed.crashPoint === money(r.crashPoint!.toFixed()).toFixed(2),
    };
  }

  async myBets(userId: string, page: number, pageSize: number) {
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
      currency: DEMO.currency,
      isDemo: true,
    };
  }

  /** My bet in the live round (reconnect). */
  async myCurrentBet(userId: string) {
    const live = await this.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } });
    if (!live) return { bet: null };
    const bet = await this.prisma.crashBet.findUnique({
      where: { roundId_userId: { roundId: live.id, userId } },
    });
    return { bet: bet ? this.myBet(bet, live) : null };
  }
}
