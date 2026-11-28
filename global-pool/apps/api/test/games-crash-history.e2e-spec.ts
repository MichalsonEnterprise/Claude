/**
 * Orbit Rush history & statistics (web key "crash", CR-05): additive read views on top of the crash engine —
 * crashed rounds with players / wagered / paid out (DEMO credits) and `from` / round search filters, public statistics
 * against the published odds, and the player's bet summary. Rounds are driven with a pinned GameClock + manual ticks
 * (the crash loop is off in tests). Read-only: nothing here can choose, change or bias a crash point.
 */
import { DEMO } from '@gp/shared/demo';
import { crash } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decryptSecret } from '../src/common/crypto';
import { AppConfig } from '../src/config/app-config';
import { CrashEngineService } from '../src/modules/games/engine/crash.service';
import { GameClock } from '../src/modules/games/engine/games-common';
import { bearer, createTestApp, newPlayer, uid, type TestApp, type TestPlayer } from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
  const g = DEMO.games.find((x) => x.slug === 'orbit-rush')!;
  await t.prisma.game.upsert({
    where: { slug: g.slug },
    create: {
      slug: g.slug,
      name: g.name,
      category: g.category,
      mechanic: g.mechanic,
      houseEdgePercent: g.houseEdgePercent,
      edgeLabel: g.edgeLabel,
      icon: g.icon,
      details: g.details,
      mode: 'simulation',
      isDemo: true,
    },
    update: { enabled: true, mode: 'simulation' },
  });
});
afterAll(async () => {
  t.app.get(GameClock).set(null);
  await t.close();
});

const key = () => `k-${uid()}`;
const post = (p: TestPlayer, path: string, body: object) =>
  t.http().post(path).set(bearer(p.token)).send(body);
const get = (p: TestPlayer, path: string) => t.http().get(path).set(bearer(p.token));

describe('Orbit Rush rounds / stats / my-bets summary (CR-05)', () => {
  it('reports per-round totals, filters, statistics vs the published odds and my summary', async () => {
    const clock = t.app.get(GameClock);
    const engine = t.app.get(CrashEngineService);
    const key32 = t.app.get(AppConfig).totpKey;
    const secretPoint = async (roundId: string) => {
      const r = await t.prisma.crashRound.findUniqueOrThrow({ where: { id: roundId }, include: { chain: true } });
      const seed = crash.chainSeedAt(decryptSecret(r.chain.terminalSeedEnc, key32), r.chain.length, r.chainIndex);
      return crash.crashPointOf(seed, r.chain.salt).crashPoint;
    };

    // start after anything a previous run left behind
    let T = Date.now();
    const leftover = await t.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } });
    if (leftover) {
      T = Math.max(T, leftover.startedAt.getTime() + 200_000);
      clock.set(new Date(T));
      await engine.tick(new Date(T));
    }
    const last = await t.prisma.crashRound.findFirst({ orderBy: { number: 'desc' } });
    T = Math.max(T, (last?.nextRoundAt?.getTime() ?? 0) + 1);

    // a round whose committed crash point is ≥ 1.50× (so a 1.20× auto cash-out wins and a 1.40× manual one is possible)
    let round: { id: string; number: number; startedAt: string } | null = null;
    let cp = '0';
    for (let i = 0; i < 60 && !round; i++) {
      clock.set(new Date(T));
      const r = (await engine.tick(new Date(T))).round!;
      cp = await secretPoint(r.id);
      if (money(cp).gte('1.50') && money(cp).lt(900)) {
        round = r;
        break;
      }
      const s = await engine.tick(new Date(new Date(r.startedAt).getTime() + 200_000));
      T = new Date(s.round!.nextRoundAt!).getTime() + 1;
    }
    expect(round).not.toBeNull();

    const a = await newPlayer(t);
    const b = await newPlayer(t);
    await post(a, '/games/orbit-rush/bets', { stake: '10.00', autoCashOut: '1.20', idempotencyKey: key() }).expect(201);
    const lose = await post(b, '/games/orbit-rush/bets', { stake: '5.00', autoCashOut: '900.00', idempotencyKey: key() }).expect(201);
    expect(lose.body.status).toBe('active');

    const start = new Date(round!.startedAt).getTime();
    const crashAt = start + crash.timeToReachMs(cp);
    clock.set(new Date(crashAt + 1));
    await engine.tick(new Date(crashAt + 1));
    const crashed = await t.prisma.crashRound.findUniqueOrThrow({ where: { id: round!.id } });
    expect(crashed.status).toBe('crashed');

    // round history: players / wagered / paid out of THIS round (DEMO credits), newest first
    const page = await t.http().get('/games/orbit-rush/rounds?pageSize=5').expect(200);
    const row = page.body.items.find((r: { number: number }) => r.number === round!.number);
    expect(row).toMatchObject({ players: 2, bets: 2, wagered: '15.00', paidOut: '12.00', crashPoint: cp, status: 'crashed' });
    expect(row.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(page.body.currency).toBe('DEMO');

    // search by round reference, or by number; a future `from` returns nothing
    const byRef = await t.http().get(`/games/orbit-rush/rounds?search=CR-${round!.number}`).expect(200);
    expect(byRef.body.items.map((r: { number: number }) => r.number)).toEqual([round!.number]);
    const byNum = await t.http().get(`/games/orbit-rush/rounds?search=${round!.number}`).expect(200);
    expect(byNum.body.total).toBe(1);
    const future = new Date(crashAt + 3_600_000).toISOString();
    const none = await t.http().get(`/games/orbit-rush/rounds?from=${encodeURIComponent(future)}`).expect(200);
    expect(none.body.total).toBe(0);
    await t.http().get('/games/orbit-rush/rounds?search=DROP%20TABLE').expect(400);

    // statistics: counts agree with the table, buckets add up, expectations are the published 0.99 ÷ m
    const stats = await t.http().get('/games/orbit-rush/stats?period=24h').expect(200);
    const since = new Date(Date.now() - 24 * 3_600_000);
    const count = await t.prisma.crashRound.count({ where: { status: 'crashed', crashedAt: { gte: since } } });
    expect(stats.body.rounds).toBeGreaterThanOrEqual(1);
    expect(Math.abs(stats.body.rounds - count)).toBeLessThanOrEqual(1);
    expect(stats.body.buckets.reduce((s: number, x: { count: number }) => s + x.count, 0)).toBe(stats.body.rounds);
    expect(stats.body.buckets.map((x: { expected: string }) => x.expected)).toEqual(['34.00', '16.50', '29.70', '9.90', '8.91', '0.99']);
    expect(
      stats.body.buckets.reduce((s: ReturnType<typeof money>, x: { expected: string }) => s.plus(money(x.expected)), money(0)).toFixed(2),
    ).toBe('100.00');
    expect(stats.body).toMatchObject({ period: '24h', expectedMedian: '1.98', reach2: { expected: '49.50' }, houseEdgePercent: '1.00' });
    expect(stats.body.median).toMatch(/^\d+\.\d{2}$/);
    expect(money(stats.body.highest.crashPoint).gte(money(cp))).toBe(true);
    await t.http().get('/games/orbit-rush/stats?period=1y').expect(400);
    for (const p of ['7d', '30d']) expect((await t.http().get(`/games/orbit-rush/stats?period=${p}`).expect(200)).body.rounds).toBeGreaterThanOrEqual(stats.body.rounds);

    // my bets: summary over the same filters (DEMO credits)
    const mineA = await get(a, '/games/orbit-rush/bets').expect(200);
    expect(mineA.body.summary).toEqual({
      bets: 1,
      wagered: '10.00',
      returned: '12.00',
      net: '2.00',
      wins: 1,
      losses: 0,
      bestCashOut: '1.20',
    });
    const mineB = await get(b, '/games/orbit-rush/bets?result=lose').expect(200);
    expect(mineB.body.summary).toMatchObject({ bets: 1, wagered: '5.00', returned: '0.00', net: '-5.00', wins: 0, losses: 1, bestCashOut: null });
    expect((await get(b, '/games/orbit-rush/bets?result=win').expect(200)).body.total).toBe(0);
    const later = await get(a, `/games/orbit-rush/bets?from=${encodeURIComponent(future)}`).expect(200);
    expect(later.body.summary.bets).toBe(0);
    await t.http().get('/games/orbit-rush/bets').expect(401);

    // read-only: the views never expose the crash point of a live round
    clock.set(new Date(crashed.nextRoundAt!.getTime() + 1));
    const live = (await engine.tick(new Date(crashed.nextRoundAt!.getTime() + 1))).round!;
    expect(live.status).toBe('betting');
    const list = await t.http().get('/games/orbit-rush/rounds?pageSize=50').expect(200);
    expect(list.body.items.some((r: { id: string }) => r.id === live.id)).toBe(false);
    clock.set(null);
  });
});
