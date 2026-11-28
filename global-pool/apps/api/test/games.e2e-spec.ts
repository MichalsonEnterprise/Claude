/**
 * games engine (P1): DEMO credits, commit–reveal seeds, every instant game bet → verify round trip, Twenty-One full
 * hands, Vault Sweeper / High Card rounds, Orbit Rush rounds with manual ticks (auto cash-out, disconnect),
 * RG enforcement, the REAL_MONEY guard, idempotency and read-only admin monitoring.
 */
import type { AddressInfo } from 'node:net';

import { DEMO } from '@gp/shared/demo';
import { FAIR_GAME_SLUGS, crash } from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decryptSecret } from '../src/common/crypto';
import { AppConfig } from '../src/config/app-config';
import { CrashEngineService } from '../src/modules/games/engine/crash.service';
import { GameClock } from '../src/modules/games/engine/games-common';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  newPlayer,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

let t: TestApp;

async function ensureGames() {
  for (const g of DEMO.games.filter((x) => (FAIR_GAME_SLUGS as string[]).includes(x.slug))) {
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
  }
}

beforeAll(async () => {
  t = await createTestApp();
  await ensureGames();
});
afterAll(async () => {
  t.app.get(GameClock).set(null);
  await t.close();
});

const key = () => `k-${uid()}`;
const post = (p: TestPlayer, path: string, body: object) =>
  t.http().post(path).set(bearer(p.token)).send(body);
const get = (p: TestPlayer, path: string) => t.http().get(path).set(bearer(p.token));
const balanceOf = async (p: TestPlayer) =>
  (await get(p, '/games/credits').expect(200)).body.balance as string;
const usdtFootprint = async (p: TestPlayer) => ({
  ledgerAccounts: await t.prisma.ledgerAccount.count({ where: { userId: p.userId } }),
  transactions: await t.prisma.transaction.count({ where: { userId: p.userId } }),
});

const INSTANT: { slug: string; body: Record<string, unknown> }[] = [
  { slug: 'pool-dice', body: { stake: '10.00', params: { target: '50.50', condition: 'over' } } },
  { slug: 'double-side', body: { stake: '10.00', params: { pick: 'heads' } } },
  {
    slug: 'pool-roulette',
    body: {
      params: {
        bets: [
          { type: 'straight', numbers: [19], amount: '5.00' },
          { type: 'red', amount: '10.00' },
          { type: 'dozen', numbers: [2], amount: '5.00' },
        ],
      },
    },
  },
  { slug: 'skyline', body: { stake: '10.00', params: { target: '2.00' } } },
  { slug: 'fortune-ring', body: { stake: '10.00', params: { risk: 'medium', segments: 30 } } },
  {
    slug: 'pool-keno',
    body: { stake: '1.00', params: { picks: [3, 11, 17, 24, 30, 38], risk: 'classic' } },
  },
  { slug: 'pinfall', body: { stake: '1.00', params: { rows: 16, risk: 'medium' } } },
];

describe('catalogue + DEMO credits', () => {
  it('publishes playable rules with DEMO currency and no fee', async () => {
    const res = await t.http().get('/games/pool-dice').expect(200);
    expect(res.body.play).toMatchObject({
      playable: true,
      currency: 'DEMO',
      creditsLabel: 'DEMO credits · no cash value',
      fee: '0.00',
      houseEdgePercent: '1.00',
      minBet: '0.10',
      maxBet: '1000.00',
      realMoney: false,
    });
    const roulette = await t.http().get('/games/pool-roulette').expect(200);
    expect(roulette.body.play).toMatchObject({ houseEdgePercent: '2.70', tableMax: '5000.00' });
  });

  it('starts at 1,000.00 DEMO credits with no cash value', async () => {
    const p = await newPlayer(t);
    const res = await get(p, '/games/credits').expect(200);
    expect(res.body).toMatchObject({
      currency: 'DEMO',
      label: 'DEMO credits · no cash value',
      cashValue: false,
      balance: '1000.00',
      fee: '0.00',
      reset: { to: '1000.00', available: true, cooldownMinutes: 60 },
    });
    await t.http().get('/games/credits').expect(401);
  });
});

describe('instant games: bet → rotate → verify round trip', () => {
  it('every instant game settles, moves only DEMO credits and re-derives from the revealed seed', async () => {
    const p = await newPlayer(t);
    const before = await usdtFootprint(p);
    let expected = money('1000.00');
    const betIds: { slug: string; id: string; outcome: unknown; payout: string }[] = [];
    for (const g of INSTANT) {
      const seeds = await get(p, `/games/${g.slug}/seeds`).expect(200);
      expect(seeds.body.active.serverSeed).toBeNull();
      expect(seeds.body.active.serverSeedHash).toMatch(/^[0-9a-f]{64}$/);
      const res = await post(p, `/games/${g.slug}/bets`, {
        ...g.body,
        idempotencyKey: key(),
      }).expect(201);
      const b = res.body;
      expect(b).toMatchObject({
        currency: 'DEMO',
        fee: '0.00',
        isDemo: true,
        replayed: false,
        status: 'settled',
      });
      expect(b.fairness.serverSeedHash).toBe(seeds.body.active.serverSeedHash);
      expect(b.fairness.nonce).toBe(0);
      expect(b.ref).toMatch(/^[A-Z]{1,2}-\d+$/);
      expected = expected.minus(money(b.stake)).plus(money(b.payout));
      expect(money(b.balance).eq(expected)).toBe(true);
      betIds.push({ slug: g.slug, id: b.id, outcome: b.outcome, payout: b.payout });
      // not verifiable yet: the server seed is still secret
      const early = await get(p, `/games/bets/${b.id}/verify`).expect(200);
      expect(early.body).toMatchObject({ revealed: false, recomputed: null });
      expect(early.body.verify.serverSeed).toBeNull();
    }
    expect(money(await balanceOf(p)).eq(expected)).toBe(true);
    for (const g of INSTANT) await post(p, `/games/${g.slug}/seeds/rotate`, {}).expect(200);
    for (const b of betIds) {
      const v = await get(p, `/games/bets/${b.id}/verify`).expect(200);
      expect(v.body).toMatchObject({ revealed: true, commitmentValid: true, matches: true });
      expect(v.body.verify.serverSeed).toMatch(/^[0-9a-f]{64}$/);
      const { win: _win, ...stored } = b.outcome as Record<string, unknown>;
      expect(v.body.recomputed).toMatchObject(stored);
    }
    // the USDT side is untouched: no ledger accounts, no transactions
    expect(await usdtFootprint(p)).toEqual(before);
    const hist = await get(p, '/games/pool-dice/bets?page=1&pageSize=5').expect(200);
    expect(hist.body.items).toHaveLength(1);
    expect(hist.body.summary).toMatchObject({ bets: 1 });
  });

  it('nonce counts bets of a pair; the client seed can be changed (reveals the old pair)', async () => {
    const p = await newPlayer(t);
    const first = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(201);
    const second = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(201);
    expect([first.body.fairness.nonce, second.body.fairness.nonce]).toEqual([0, 1]);
    const changed = await post(p, '/games/pool-dice/seeds/client', {
      clientSeed: 'nova-k-7f2a91',
    }).expect(200);
    expect(changed.body.revealed).toMatchObject({ nonce: 2, status: 'finished' });
    expect(changed.body.revealed.serverSeed).toMatch(/^[0-9a-f]{64}$/);
    expect(changed.body.active).toMatchObject({
      clientSeed: 'nova-k-7f2a91',
      nonce: 0,
      serverSeed: null,
    });
    await post(p, '/games/pool-dice/seeds/client', { clientSeed: 'bad:seed' }).expect(400);
    const third = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(201);
    expect(third.body.fairness).toMatchObject({ clientSeed: 'nova-k-7f2a91', nonce: 0 });
  });

  it('is idempotent: a replay returns the same bet; a different body with the same key is refused', async () => {
    const p = await newPlayer(t);
    const body = { ...INSTANT[0]!.body, idempotencyKey: key() };
    const a = await post(p, '/games/pool-dice/bets', body).expect(201);
    const b = await post(p, '/games/pool-dice/bets', body).expect(201);
    expect(b.body.replayed).toBe(true);
    expect(b.body.id).toBe(a.body.id);
    expect(await t.prisma.gameResult.count({ where: { userId: p.userId } })).toBe(1);
    expect(await balanceOf(p)).toBe(a.body.balance);
    const conflict = await post(p, '/games/pool-dice/bets', { ...body, stake: '2.00' }).expect(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('validates parameters, limits and the DEMO balance', async () => {
    const p = await newPlayer(t);
    const bad = await post(p, '/games/pool-dice/bets', {
      stake: '10.00',
      params: { target: '1.50', condition: 'over' },
      idempotencyKey: key(),
    }).expect(400);
    expect(bad.body.error.details).toMatchObject({ reason: 'OUT_OF_RANGE' });
    await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      stake: '0.05',
      idempotencyKey: key(),
    }).expect(400);
    await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      stake: '1000.01',
      idempotencyKey: key(),
    }).expect(400);
    const overTable = await post(p, '/games/pool-roulette/bets', {
      params: {
        bets: Array.from({ length: 6 }, (_, i) => ({
          type: 'straight',
          numbers: [i + 1],
          amount: '1000.00',
        })),
      },
      idempotencyKey: key(),
    }).expect(400);
    expect(overTable.body.error.details).toMatchObject({ reason: 'BET_ABOVE_MAX' });
    await post(p, '/games/twenty-one/bets', {
      stake: '1.00',
      params: {},
      idempotencyKey: key(),
    }).expect(400);
    await post(p, '/games/global-pool/bets', {
      stake: '1.00',
      params: {},
      idempotencyKey: key(),
    }).expect(404);
    // insufficient DEMO credits (DEMO account · Available 4.20)
    await get(p, '/games/credits').expect(200);
    await t.prisma.demoCreditAccount.update({
      where: { userId: p.userId },
      data: { balance: '4.20' },
    });
    const poor = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(422);
    expect(poor.body.error).toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      details: { currency: 'DEMO', available: '4.20', required: '10.00', shortBy: '5.80' },
    });
  });
});

describe('REAL_MONEY guard + responsible gaming', () => {
  it('refuses any non-DEMO currency and any non-simulation game (REAL_MONEY_ENABLED=false)', async () => {
    const p = await newPlayer(t);
    const before = await usdtFootprint(p);
    const usdt = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      currency: 'USDT',
      idempotencyKey: key(),
    }).expect(403);
    expect(usdt.body.error.code).toBe('REAL_MONEY_DISABLED');
    await post(p, '/games/twenty-one/hands', {
      stake: '10.00',
      currency: 'USDT',
      idempotencyKey: key(),
    }).expect(403);
    await post(p, '/games/orbit-rush/bets', {
      stake: '1.00',
      currency: 'USDT',
      idempotencyKey: key(),
    }).expect(403);
    await t.prisma.game.update({ where: { slug: 'pinfall' }, data: { mode: 'real_money' } });
    try {
      const real = await post(p, '/games/pinfall/bets', {
        ...INSTANT[6]!.body,
        idempotencyKey: key(),
      }).expect(403);
      expect(real.body.error.code).toBe('REAL_MONEY_DISABLED');
      expect((await t.http().get('/games/pinfall').expect(200)).body.play).toEqual({
        playable: false,
      });
    } finally {
      await t.prisma.game.update({ where: { slug: 'pinfall' }, data: { mode: 'simulation' } });
    }
    expect(t.app.get(AppConfig).env.REAL_MONEY_ENABLED).toBe(false);
    expect(await t.prisma.gameResult.count({ where: { userId: p.userId } })).toBe(0);
    expect(await usdtFootprint(p)).toEqual(before);
  });

  it('cooling-off and self-exclusion block game play server-side', async () => {
    const p = await newPlayer(t);
    await post(p, '/responsible-gaming/cooling-off', { duration: '24h', confirm: true }).expect(
      200,
    );
    const res = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(403);
    expect(res.body.error).toMatchObject({
      code: 'SELF_EXCLUDED',
      details: { kind: 'cooling_off' },
    });
    await post(p, '/games/twenty-one/hands', { stake: '10.00', idempotencyKey: key() }).expect(403);
    await post(p, '/games/orbit-rush/bets', { stake: '1.00', idempotencyKey: key() }).expect(403);
    // the balance and history stay readable
    await get(p, '/games/credits').expect(200);
  });

  it('a restricted country of residence blocks play (451)', async () => {
    const p = await newPlayer(t);
    await t.prisma.userProfile.update({ where: { userId: p.userId }, data: { country: 'US' } });
    const res = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(451);
    expect(res.body.error.code).toBe('GEO_RESTRICTED');
  });

  it('the loss limit applies to DEMO play (counted in DEMO credits); time rules and reality checks gate new bets', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'loss', period: 'day', amount: '5.00' })
      .expect(200);
    const res = await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(422);
    expect(res.body.error).toMatchObject({
      code: 'RG_LIMIT_EXCEEDED',
      details: { type: 'loss', period: 'day', limit: '5.00', currency: 'DEMO' },
    });
    await post(p, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      stake: '5.00',
      idempotencyKey: key(),
    }).expect(201);

    const q = await newPlayer(t);
    const now = Date.now();
    await t.prisma.rgSettings.upsert({
      where: { userId: q.userId },
      create: {
        userId: q.userId,
        sessionStartedAt: new Date(now - 61 * 60_000),
        lastActivityAt: new Date(now - 60_000),
        realityCheckMinutes: 60,
        realityCheckPause: true,
      },
      update: {},
    });
    const due = await post(q, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(409);
    expect(due.body.error.details).toMatchObject({ reason: 'REALITY_CHECK_DUE' });
    await post(q, '/responsible-gaming/reality-check/ack', { action: 'continue' }).expect(200);
    await post(q, '/games/pool-dice/bets', { ...INSTANT[0]!.body, idempotencyKey: key() }).expect(
      201,
    );

    await t.prisma.rgSettings.update({
      where: { userId: q.userId },
      data: { sessionLimitMinutes: 30, lastRealityCheckAt: new Date() },
    });
    const limit = await post(q, '/games/pool-dice/bets', {
      ...INSTANT[0]!.body,
      idempotencyKey: key(),
    }).expect(422);
    expect(limit.body.error.details).toMatchObject({ type: 'session_limit' });
  });

  it('DEMO credits reset to 1,000.00 at most once per hour (audited)', async () => {
    const p = await newPlayer(t);
    await post(p, '/games/pool-dice/bets', { ...INSTANT[0]!.body, idempotencyKey: key() }).expect(
      201,
    );
    const reset = await post(p, '/games/credits/reset', {}).expect(200);
    expect(reset.body).toMatchObject({ balance: '1000.00', reset: { available: false } });
    const again = await post(p, '/games/credits/reset', {}).expect(429);
    expect(again.body.error.code).toBe('RATE_LIMITED');
    expect(
      await t.prisma.auditLog.count({
        where: { actorId: p.userId, action: 'user.games.demo_credits_reset' },
      }),
    ).toBe(1);
  });
});

describe('Twenty-One', () => {
  type Hand = {
    id: string;
    status: string;
    stake: string;
    payout: string;
    round: {
      allowedActions: string[];
      hands: { total: number; cards: string[] }[];
      active: number;
      dealer: { cards: (string | null)[] };
    };
  };
  const choose = (h: Hand) => {
    const a = h.round.allowedActions;
    if (a.includes('insurance')) return { action: 'insurance', accept: true };
    const hand = h.round.hands[h.round.active]!;
    if (a.includes('split')) return { action: 'split' };
    if (a.includes('double') && (hand.total === 10 || hand.total === 11))
      return { action: 'double' };
    return { action: hand.total < 17 ? 'hit' : 'stand' };
  };

  it('plays full hands (hole card hidden until settled), recovers the open hand and verifies every hand', async () => {
    const p = await newPlayer(t);
    let expected = money('1000.00');
    const ids: string[] = [];
    for (let n = 0; n < 6; n++) {
      let h = (
        await post(p, '/games/twenty-one/hands', { stake: '10.00', idempotencyKey: key() }).expect(
          201,
        )
      ).body as Hand;
      if (h.status === 'active') {
        expect(h.round.dealer.cards[1]).toBeNull();
        const current = await get(p, '/games/twenty-one/hands/current').expect(200);
        expect(current.body.active.id).toBe(h.id);
        await post(p, '/games/twenty-one/hands', { stake: '10.00', idempotencyKey: key() }).expect(
          409,
        );
        await post(p, '/games/twenty-one/seeds/rotate', {}).expect(409);
      }
      let guard = 0;
      while (h.status === 'active' && guard++ < 20) {
        h = (
          await post(p, `/games/twenty-one/hands/${h.id}/action`, {
            ...choose(h),
            idempotencyKey: key(),
          }).expect(200)
        ).body as Hand;
      }
      expect(h.status).toBe('settled');
      expect(h.round.dealer.cards.every((c) => c !== null)).toBe(true);
      expected = expected.minus(money(h.stake)).plus(money(h.payout));
      ids.push(h.id);
    }
    expect(money(await balanceOf(p)).eq(expected)).toBe(true);
    expect((await get(p, '/games/twenty-one/hands/current').expect(200)).body.active).toBeNull();
    await post(p, '/games/twenty-one/seeds/rotate', {}).expect(200);
    for (const id of ids) {
      const v = await get(p, `/games/bets/${id}/verify`).expect(200);
      expect(v.body).toMatchObject({ revealed: true, commitmentValid: true, matches: true });
    }
  });

  it('refuses illegal actions and actions on settled hands', async () => {
    const p = await newPlayer(t);
    let h = (
      await post(p, '/games/twenty-one/hands', { stake: '1.00', idempotencyKey: key() }).expect(201)
    ).body as Hand;
    if (h.status === 'active' && !h.round.allowedActions.includes('split')) {
      const res = await post(p, `/games/twenty-one/hands/${h.id}/action`, {
        action: 'split',
        idempotencyKey: key(),
      }).expect(409);
      expect(res.body.error.details).toMatchObject({ reason: 'ACTION_NOT_ALLOWED' });
    }
    let guard = 0;
    while (h.status === 'active' && guard++ < 20) {
      h = (
        await post(p, `/games/twenty-one/hands/${h.id}/action`, {
          ...choose(h),
          idempotencyKey: key(),
        }).expect(200)
      ).body as Hand;
    }
    await post(p, `/games/twenty-one/hands/${h.id}/action`, {
      action: 'stand',
      idempotencyKey: key(),
    }).expect(409);
  });
});

describe('Vault Sweeper and High Card', () => {
  it('Vault Sweeper: board fixed by the seeds, cash-out pays stake × multiplier, verifiable', async () => {
    const p = await newPlayer(t);
    const ids: string[] = [];
    for (let n = 0; n < 3; n++) {
      let r = (
        await post(p, '/games/vault-sweeper/rounds', {
          stake: '10.00',
          mines: 3,
          idempotencyKey: key(),
        }).expect(201)
      ).body;
      expect(r.round).toMatchObject({ status: 'active', mines: 3, gems: 0, board: null });
      for (const tile of [0, 1]) {
        if (r.status !== 'active') break;
        r = (
          await post(p, `/games/vault-sweeper/rounds/${r.id}/reveal`, {
            tile,
            idempotencyKey: key(),
          }).expect(200)
        ).body;
      }
      if (r.status === 'active') {
        expect(r.round.cashOutValue).toBe(money('10').times(r.round.multiplier).toFixed(2));
        r = (
          await post(p, `/games/vault-sweeper/rounds/${r.id}/cashout`, {
            idempotencyKey: key(),
          }).expect(200)
        ).body;
        expect(r.payout).toBe(money('10').times(r.round.multiplier).toFixed(2));
      }
      expect(r.status).toBe('settled');
      expect(r.round.board).toHaveLength(3);
      ids.push(r.id);
    }
    await post(p, '/games/vault-sweeper/seeds/rotate', {}).expect(200);
    for (const id of ids) {
      expect((await get(p, `/games/bets/${id}/verify`).expect(200)).body).toMatchObject({
        matches: true,
        commitmentValid: true,
      });
    }
  });

  it('High Card: calls, skips and cash-out; verifiable', async () => {
    const p = await newPlayer(t);
    const pick = (offer: Record<string, { chance: string } | null>) =>
      !offer.higher_or_same
        ? 'lower_or_same'
        : !offer.lower_or_same
          ? 'higher_or_same'
          : Number(offer.higher_or_same.chance) >= 50
            ? 'higher_or_same'
            : 'lower_or_same';
    const ids: string[] = [];
    for (let n = 0; n < 3; n++) {
      let r = (
        await post(p, '/games/high-card/rounds', { stake: '5.00', idempotencyKey: key() }).expect(
          201,
        )
      ).body;
      r = (
        await post(p, `/games/high-card/rounds/${r.id}/action`, {
          action: 'skip',
          idempotencyKey: key(),
        }).expect(200)
      ).body;
      expect(r.round.multiplier).toBe('1.00');
      await post(p, `/games/high-card/rounds/${r.id}/cashout`, { idempotencyKey: key() }).expect(
        409,
      );
      r = (
        await post(p, `/games/high-card/rounds/${r.id}/action`, {
          action: pick(r.round.offer),
          idempotencyKey: key(),
        }).expect(200)
      ).body;
      if (r.status === 'active') {
        r = (
          await post(p, `/games/high-card/rounds/${r.id}/cashout`, {
            idempotencyKey: key(),
          }).expect(200)
        ).body;
        expect(r.payout).toBe(money('5').times(r.round.multiplier).toFixed(2));
      }
      expect(r.status).toBe('settled');
      ids.push(r.id);
    }
    await post(p, '/games/high-card/seeds/rotate', {}).expect(200);
    for (const id of ids) {
      expect((await get(p, `/games/bets/${id}/verify`).expect(200)).body).toMatchObject({
        matches: true,
        commitmentValid: true,
      });
    }
  });
});

describe('Orbit Rush (crash) with manual ticks', () => {
  it('commits before betting, runs auto cash-outs on the server (also after a disconnect), crashes and verifies', async () => {
    const clock = t.app.get(GameClock);
    const engine = t.app.get(CrashEngineService);
    const key32 = t.app.get(AppConfig).totpKey;
    const secretPoint = async (roundId: string) => {
      const r = await t.prisma.crashRound.findUniqueOrThrow({
        where: { id: roundId },
        include: { chain: true },
      });
      const seed = crash.chainSeedAt(
        decryptSecret(r.chain.terminalSeedEnc, key32),
        r.chain.length,
        r.chainIndex,
      );
      return crash.crashPointOf(seed, r.chain.salt).crashPoint; // the test acts as an independent verifier
    };
    // start after anything a previous run left behind
    let T = Date.now();
    const leftover = await t.prisma.crashRound.findFirst({ where: { status: { not: 'crashed' } } });
    if (leftover) {
      T = Math.max(T, leftover.startedAt.getTime() + 200_000);
      clock.set(new Date(T));
      await engine.tick(new Date(T));
    }
    const lastRound = await t.prisma.crashRound.findFirst({ orderBy: { number: 'desc' } });
    T = Math.max(T, (lastRound?.nextRoundAt?.getTime() ?? 0) + 1);

    // find a round whose (pre-committed) crash point lets us exercise both cash-out paths
    let round: { id: string; number: number; startedAt: string; commitment: string } | null = null;
    let cp = '0';
    for (let i = 0; i < 60 && !round; i++) {
      clock.set(new Date(T));
      const snap = await engine.tick(new Date(T));
      const r = snap.round!;
      expect(r.status).toBe('betting');
      expect(r.crashPoint).toBeNull();
      expect(r.seed).toBeNull();
      cp = await secretPoint(r.id);
      if (money(cp).gte(2) && money(cp).lt(900)) {
        round = r;
        break;
      }
      const crashedSnap = await engine.tick(new Date(new Date(r.startedAt).getTime() + 200_000));
      expect(crashedSnap.round!.status).toBe('crashed');
      T = new Date(crashedSnap.round!.nextRoundAt!).getTime() + 1;
    }
    expect(round).not.toBeNull();
    const start = new Date(round!.startedAt).getTime();
    expect((await t.http().get('/games/orbit-rush/state').expect(200)).body.round).toMatchObject({
      id: round!.id,
      status: 'betting',
      crashPoint: null,
    });

    // spectator socket + a betting socket that disconnects after betting
    const server = await t.app.listen(0, '127.0.0.1');
    const { port } = server.address() as AddressInfo;
    const events: string[] = [];
    const watcher: Socket = io(`http://127.0.0.1:${port}/crash`, {
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      watcher.once('crash:snapshot', resolve);
      watcher.once('connect_error', reject);
    });
    for (const e of ['crash:phase', 'crash:tick', 'crash:bet', 'crash:cashout', 'crash:crashed']) {
      watcher.on(e, () => events.push(e));
    }

    const [a, b, c, d] = await Promise.all([
      newPlayer(t),
      newPlayer(t),
      newPlayer(t),
      newPlayer(t),
    ]);
    const betA = await post(a, '/games/orbit-rush/bets', {
      stake: '10.00',
      autoCashOut: '2.00',
      idempotencyKey: key(),
    }).expect(201);
    expect(betA.body).toMatchObject({ status: 'active', autoCashOut: '2.00', balance: '990.00' });
    const betB = await post(b, '/games/orbit-rush/bets', {
      stake: '5.00',
      idempotencyKey: key(),
    }).expect(201);
    await post(b, '/games/orbit-rush/bets', { stake: '5.00', idempotencyKey: key() }).expect(409);
    const above = money(cp).plus(1).toFixed(2);
    const betD = await post(d, '/games/orbit-rush/bets', {
      stake: '2.00',
      autoCashOut: above,
      idempotencyKey: key(),
    }).expect(201);

    const player: Socket = io(`http://127.0.0.1:${port}/crash`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: c.token },
    });
    await new Promise((resolve) => player.once('crash:snapshot', resolve));
    const ack = await player.emitWithAck('crash:bet', {
      stake: '3.00',
      autoCashOut: '1.50',
      idempotencyKey: key(),
    });
    expect(ack).toMatchObject({ ok: true, bet: { status: 'active', autoCashOut: '1.50' } });
    const betC = (ack as { bet: { id: string } }).bet;
    player.disconnect(); // connection lost — the armed auto cash-out must still run on the server

    // take-off: bets close
    clock.set(new Date(start));
    await engine.tick(new Date(start));
    const late = await post(b, '/games/orbit-rush/bets', {
      stake: '1.00',
      idempotencyKey: key(),
    }).expect(409);
    expect(late.body.error.code).toBe('ROUND_NOT_OPEN');

    // manual cash-out at ~1.20× (server multiplier)
    const t120 = start + crash.timeToReachMs('1.20');
    clock.set(new Date(t120));
    const cashB = await post(b, `/games/orbit-rush/bets/${betB.body.id}/cashout`, {
      idempotencyKey: key(),
    }).expect(200);
    const m = crash.multiplierAt(t120 - start);
    expect(cashB.body).toMatchObject({
      status: 'cashed_out',
      cashOutMultiplier: m,
      cashOutKind: 'manual',
    });
    expect(cashB.body.payout).toBe(money('5').times(m).toFixed(2));

    // the curve reaches 2.00× → both armed auto cash-outs run at exactly their targets
    const t2 = start + crash.timeToReachMs('2.00');
    clock.set(new Date(t2));
    await engine.tick(new Date(t2));
    const aBet = await t.prisma.crashBet.findUniqueOrThrow({ where: { id: betA.body.id } });
    const cBet = await t.prisma.crashBet.findUniqueOrThrow({ where: { id: betC.id } });
    expect([
      aBet.status,
      aBet.cashOutKind,
      aBet.cashOutMultiplier?.toFixed(2),
      aBet.payout.toFixed(2),
    ]).toEqual(['cashed_out', 'auto', '2.00', '20.00']);
    expect([cBet.status, cBet.cashOutMultiplier?.toFixed(2), cBet.payout.toFixed(2)]).toEqual([
      'cashed_out',
      '1.50',
      '4.50',
    ]);

    // crash
    const tc = start + 200_000;
    clock.set(new Date(tc));
    const after = await engine.tick(new Date(tc));
    const crashed = await t.prisma.crashRound.findUniqueOrThrow({ where: { id: round!.id } });
    expect(crashed.status).toBe('crashed');
    expect(crashed.crashPoint!.toFixed(2)).toBe(cp);
    expect(after.history[0]).toMatchObject({ number: round!.number, crashPoint: cp });
    expect(
      (await t.prisma.crashBet.findUniqueOrThrow({ where: { id: betD.body.id } })).status,
    ).toBe('lost');

    expect(await balanceOf(a)).toBe('1010.00');
    expect(await balanceOf(b)).toBe(money('995').plus(money(cashB.body.payout)).toFixed(2));
    expect(await balanceOf(c)).toBe('1001.50');
    expect(await balanceOf(d)).toBe('998.00');

    const v = await t.http().get(`/games/orbit-rush/rounds/${round!.number}/verify`).expect(200);
    expect(v.body).toMatchObject({
      revealed: true,
      commitmentValid: true,
      chainValid: true,
      matches: true,
    });
    expect(v.body.recomputed.crashPoint).toBe(cp);
    expect(crash.crashCommitment(v.body.seed)).toBe(round!.commitment);

    const mine = await get(c, '/games/orbit-rush/bets').expect(200);
    expect(mine.body.items[0]).toMatchObject({
      status: 'cashed_out',
      cashOutKind: 'auto',
      payout: '4.50',
    });

    await new Promise((r) => setTimeout(r, 100));
    for (const e of ['crash:phase', 'crash:bet', 'crash:cashout', 'crash:crashed'])
      expect(events).toContain(e);
    watcher.disconnect();
    clock.set(null);
  });
});

describe('admin monitoring is read-only', () => {
  it('shows measured vs published RTP and never a live crash point; no outcome controls exist', async () => {
    const admin = await createAdmin(t, 'support');
    const token = await adminLogin(t, admin);
    const ov = await t.http().get('/admin/games/overview').set(bearer(token)).expect(200);
    expect(ov.body).toMatchObject({ currency: 'DEMO', controls: 'none' });
    const dice = (ov.body.games as { slug: string }[]).find((g) => g.slug === 'pool-dice');
    expect(dice).toMatchObject({ publishedHouseEdgePercent: '1.00', publishedRtpPercent: '99.00' });
    const bets = await t
      .http()
      .get('/admin/games/bets?game=pool-dice&pageSize=5')
      .set(bearer(token))
      .expect(200);
    expect(bets.body.items.length).toBeGreaterThan(0);
    const rounds = await t
      .http()
      .get('/admin/games/orbit-rush/rounds')
      .set(bearer(token))
      .expect(200);
    if (rounds.body.live && rounds.body.live.status !== 'crashed')
      expect(rounds.body.live.crashPoint).toBeNull();
    for (const [method, path] of [
      ['post', '/admin/games/bets/00000000-0000-0000-0000-000000000000/outcome'],
      ['patch', '/admin/games/bets/00000000-0000-0000-0000-000000000000'],
      ['post', '/admin/games/orbit-rush/rounds/1/crash-point'],
      ['post', '/admin/games/credits/adjust'],
    ] as const) {
      await t.http()[method](path).set(bearer(token)).send({}).expect(404);
    }
    await t.http().get('/admin/games/overview').expect(401);
  });
});
