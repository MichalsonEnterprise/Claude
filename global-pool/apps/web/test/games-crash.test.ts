/**
 * Orbit Rush (key "crash", CR-01 … CR-08) — pure display maths (published odds, payouts, axis ticks, curve samples on
 * the server's frames), browser verification of a crashed round with the SAME shared code the API settles with, and
 * the live socket store (phases, real bets only, my bet settling, ack errors, idempotent retries / REST fallback).
 * DEMO credits only — amounts are decimal strings, never floats.
 */
import { EventEmitter } from 'node:events';

import { crash } from '@gp/shared/fair';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── socket.io-client mock ──────────────────────────────────────────────────────────────────────
class FakeSocket extends EventEmitter {
  connected = false;
  io = new EventEmitter();
  acks: { event: string; payload: unknown }[] = [];
  ackReply: unknown = null;
  ackThrows = false;
  emitted: string[] = [];
  connect() {
    return this;
  }
  disconnect() {
    this.connected = false;
    return this;
  }
  timeout() {
    return {
      emitWithAck: (event: string, payload: unknown): Promise<unknown> => {
        this.acks.push({ event, payload });
        return this.ackThrows ? Promise.reject(new Error('operation has timed out')) : Promise.resolve(this.ackReply);
      },
    };
  }
  override emit(event: string | symbol, ...args: unknown[]): boolean {
    if (typeof event === 'string' && event.startsWith('crash:')) this.emitted.push(event);
    return super.emit(event, ...args);
  }
  /** server → client event */
  server(event: string, payload: unknown) {
    super.emit(event, payload);
  }
}
let socket: FakeSocket;
vi.mock('socket.io-client', () => ({ io: () => socket }));

const rest = {
  state: vi.fn<() => Promise<unknown>>(),
  current: vi.fn<() => Promise<unknown>>(),
  placeBet: vi.fn<(i: unknown) => Promise<unknown>>(),
};
vi.mock('@/lib/api/orbit-rush', () => ({
  orbitRushApi: {
    state: (): Promise<unknown> => rest.state(),
    current: (): Promise<unknown> => rest.current(),
    placeBet: (i: unknown): Promise<unknown> => rest.placeBet(i),
  },
}));

const { ApiNetworkError, ApiRequestError } = await import('@/lib/api/client');
const { CrashLiveClient } = await import('@/components/games/crash/live-client');
const m = await import('@/components/games/crash/crash-math');

const round = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  number: 55102,
  ref: 'CR-55102',
  status: 'betting',
  commitment: 'c'.repeat(64),
  chainIndex: 7,
  bettingOpensAt: '2026-11-28T18:41:55.000Z',
  startedAt: '2026-11-28T18:42:05.000Z',
  crashedAt: null,
  nextRoundAt: null,
  crashPoint: null,
  instant: null,
  seed: null,
  isDemo: true,
  ...over,
});
const snapshot = (over: Record<string, unknown> = {}) => ({
  round: round(),
  multiplier: '1.00',
  elapsedMs: 0,
  bets: [],
  history: [{ number: 55101, crashPoint: '1.24' }],
  rules: crash.CRASH_RULES,
  serverTime: new Date().toISOString(),
  currency: 'DEMO',
  isDemo: true,
  ...over,
});
const liveBet = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  ref: 'CRB-1',
  player: '@nova.k',
  stake: '10.00',
  autoCashOut: '2.00',
  status: 'active',
  cashOutMultiplier: null,
  payout: '0.00',
  cashOutKind: null,
  currency: 'DEMO',
  ...over,
});
const myBet = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  ref: 'CRB-1',
  round: { id: 'r1', number: 55102, status: 'betting' },
  stake: '10.00',
  autoCashOut: '2.00',
  status: 'active',
  cashOutMultiplier: null,
  payout: '0.00',
  net: '-10.00',
  cashOutKind: null,
  cashedOutAt: null,
  currency: 'DEMO',
  createdAt: '2026-11-28T18:42:00.000Z',
  isDemo: true,
  ...over,
});

// ── published odds & display maths ─────────────────────────────────────────────────────────────
describe('crash-math (published odds, DEMO credits)', () => {
  it('win chance = 99 ÷ target %, truncated (decision #42: 2.00× → 49.50 %)', () => {
    expect(m.winChancePercent('2.00')).toBe('49.50');
    expect(m.winChancePercent('5.00')).toBe('19.80');
    expect(m.winChancePercent('1.01')).toBe('98.01');
    expect(m.winChancePercent('1000.00')).toBe('0.09');
  });

  it('chance to reach the target from a running multiplier (CR-02: 1.64× → 2.00× = 82.00 %)', () => {
    expect(m.chanceToReachPercent('1.64', '2.00')).toBe('82.00');
    expect(m.chanceToReachPercent('1.00', '2.00')).toBe('49.50');
    expect(m.chanceToReachPercent('2.10', '2.00')).toBe('100.00');
  });

  it('payout / profit with decimal maths, truncated to 2 dp (10.00 at 2.00× → 20.00 / +10.00)', () => {
    expect(m.payoutAt('10.00', '2.00')).toBe('20.00');
    expect(m.profitAt('10.00', '2.00')).toBe('10.00');
    expect(m.payoutAt('0.10', '1.01')).toBe('0.10');
    expect(m.payoutAt('3.33', '1.57')).toBe('5.22');
  });

  it('targets mirror the server rule (1.01× – 1,000.00×, 2 dp)', () => {
    expect(m.parseTarget('2')).toBe('2.00');
    expect(m.parseTarget('2.')).toBe('2.00');
    expect(m.parseTarget('1.00')).toBeNull();
    expect(m.parseTarget('1000.01')).toBeNull();
    expect(m.targetProblem('')).toBe('empty');
    expect(m.targetProblem('1')).toBe('below');
    expect(m.targetProblem('5000')).toBe('above');
    expect(m.targetProblem('2.005')).toBe('format');
    expect(m.sanitizeTargetInput('2,5x')).toBe('2.5');
    expect(m.sanitizeTargetInput('2.555')).toBe('2.55');
    for (const t of ['1.01', '2.00', '1000.00']) expect(crash.validateCrashTarget(m.parseTarget(t))).toBe(t);
  });

  it('median, pill tones (value always shown) and short hashes', () => {
    expect(m.medianOf(['3.82', '1.24', '4.16', '1.00'])).toBe('1.24');
    expect(m.medianOf([])).toBeNull();
    expect(m.pointTone('1.00')).toBe('instant');
    expect(m.pointTone('1.57')).toBe('low');
    expect(m.pointTone('2.10')).toBe('mid');
    expect(m.pointTone('12.40')).toBe('high');
    expect(m.fmtX('1000.00')).toBe('1,000.00×');
    expect(m.shortHash('8f3c1e9a7b52d0c4e6a19f2b7d3085c1a4e7f90b26d8c35e1f4a7b09c2d6e813')).toBe('8f3c1e9a…c2d6e813');
    expect(m.initialsOf('@orbit_77')).toBe('OR');
  });

  it('axis ticks are round numbers', () => {
    expect(m.multiplierTicks(4)).toEqual([1, 2, 3, 4]);
    expect(m.multiplierTicks(15)).toEqual([1, 5, 10, 15]);
    expect(m.multiplierTicks(2.4)).toEqual([1, 1.5, 2]);
    expect(m.timeTicks(12)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(m.niceAxisMax(3.1)).toBe(4);
    expect(m.niceAxisMax(11.6)).toBe(15);
  });

  it('the curve uses the server frames only and never runs past the last frame received', () => {
    const s = m.curveSamples(4_450);
    expect(s[0]).toEqual({ t: 0, m: '1.00' });
    expect(s[s.length - 1]).toEqual({ t: 4_400, m: crash.multiplierAt(4_400) });
    expect(s.every((p) => p.t <= 4_450)).toBe(true);
    expect(crash.multiplierAt(4_400)).toBe('1.63');
    expect(m.timeAt('2.00')).toBe(crash.timeToReachMs('2.00'));
  });
});

// ── CR-07 browser verification = the shared maths ─────────────────────────────────────────────
describe('verifyRoundInBrowser (shared @gp/shared/fair code, no duplicated maths)', () => {
  const terminal = 'a'.repeat(64);
  const chain = crash.buildHashChain(terminal, 20);
  const salt = '4b6f0e2d91c7a3f8';
  const index = 7;
  const seed = chain[index]!;
  const v = { round: { commitment: crash.crashCommitment(seed) }, chain: { salt, index, commitment: chain[0]! } };

  it('re-derives the crash point, the commitment and the chain position', () => {
    const r = m.verifyRoundInBrowser(seed, v);
    expect(r.commitmentOk).toBe(true);
    expect(r.chainOk).toBe(true);
    expect(r.computed).toEqual(crash.crashPointOf(seed, salt));
  });

  it('an edited seed shows the mismatch (commitment and chain fail)', () => {
    const r = m.verifyRoundInBrowser(`${seed.slice(0, 63)}0` === seed ? `${seed.slice(0, 63)}1` : `${seed.slice(0, 63)}0`, v);
    expect(r.commitmentOk).toBe(false);
    expect(r.chainOk).toBe(false);
    const short = m.verifyRoundInBrowser(seed.slice(0, 63), v);
    expect(short.chainOk).toBe(false);
  });
});

// ── live store ───────────────────────────────────────────────────────────────────────────────
describe('CrashLiveClient (socket /crash)', () => {
  beforeEach(() => {
    socket = new FakeSocket();
    rest.state.mockReset().mockRejectedValue(new Error('down'));
    rest.current.mockReset().mockResolvedValue({ bet: null });
    rest.placeBet.mockReset();
  });

  const start = async (token: string | null = 'tok') => {
    const c = new CrashLiveClient(() => Promise.resolve(token));
    c.start();
    await new Promise((r) => setTimeout(r, 0));
    return c;
  };

  it('starts from the server snapshot and measures the server clock offset', async () => {
    const c = await start();
    const serverTime = new Date(Date.now() + 1_500).toISOString();
    socket.server('crash:snapshot', snapshot({ serverTime }));
    const s = c.getSnapshot();
    expect(s.loaded).toBe(true);
    expect(s.round?.ref).toBe('CR-55102');
    expect(Math.abs(s.offsetMs - 1_500)).toBeLessThan(200);
    expect(s.history[0]?.crashPoint).toBe('1.24');
  });

  it('a failed first snapshot is an error state, not an endless skeleton', async () => {
    const c = await start(null);
    await new Promise((r) => setTimeout(r, 0));
    expect(c.getSnapshot().loadError).toBe(true);
  });

  it('lists only bets the server sent; ticks move the multiplier; the crash settles open bets as lost', async () => {
    const c = await start();
    socket.server('crash:snapshot', snapshot());
    expect(c.getSnapshot().bets).toEqual([]);
    socket.server('crash:bet', { roundId: 'r1', bet: liveBet() });
    socket.server('crash:bet', { roundId: 'other', bet: liveBet({ id: 'x' }) });
    expect(c.getSnapshot().bets.map((b) => b.id)).toEqual(['b1']);
    socket.server('crash:phase', round({ status: 'running' }));
    socket.server('crash:tick', { roundId: 'r1', number: 55102, multiplier: '1.64', elapsedMs: 4_500 });
    expect(c.getSnapshot().multiplier).toBe('1.64');
    expect(c.getSnapshot().lastFrameAt).toBe('2026-11-28T18:42:09.500Z');
    socket.server('crash:crashed', round({ status: 'crashed', crashPoint: '1.80', seed: 'd'.repeat(64), nextRoundAt: '2026-11-28T18:42:20.000Z' }));
    const s = c.getSnapshot();
    expect(s.multiplier).toBe('1.80');
    expect(s.bets[0]?.status).toBe('lost');
    expect(s.history[0]).toEqual({ number: 55102, crashPoint: '1.80' });
  });

  it('a tick for an unknown round asks the server for a fresh snapshot', async () => {
    await start();
    socket.server('crash:snapshot', snapshot());
    socket.server('crash:tick', { roundId: 'r2', number: 55103, multiplier: '1.10', elapsedMs: 900 });
    expect(socket.emitted).toContain('crash:subscribe');
  });

  it('places the bet over the socket with the idempotency key; my bet follows server cash-outs', async () => {
    const c = await start();
    socket.connected = true;
    socket.server('crash:snapshot', snapshot());
    socket.ackReply = { ok: true, bet: myBet({ balance: '990.00' }) };
    const bet = await c.placeBet({ stake: '10.00', autoCashOut: '2.00', idempotencyKey: 'k-1' });
    expect(bet.balance).toBe('990.00');
    expect(socket.acks[0]).toEqual({
      event: 'crash:bet',
      payload: { stake: '10.00', autoCashOut: '2.00', currency: 'DEMO', idempotencyKey: 'k-1' },
    });
    expect(c.getSnapshot().myBet?.status).toBe('active');
    // the server-side auto cash-out fires (also while this tab is offline)
    socket.server('crash:cashout', {
      roundId: 'r1',
      bet: liveBet({ status: 'cashed_out', cashOutMultiplier: '2.00', payout: '20.000000', cashOutKind: 'auto' }),
    });
    const mine = c.getSnapshot().myBet!;
    expect(mine.status).toBe('cashed_out');
    expect(mine.net).toBe('10.00');
  });

  it('my open bet is lost with the crash (net = −stake)', async () => {
    const c = await start();
    socket.connected = true;
    socket.server('crash:snapshot', snapshot());
    socket.ackReply = { ok: true, bet: myBet({ autoCashOut: '5.00' }) };
    await c.placeBet({ stake: '10.00', autoCashOut: '5.00', idempotencyKey: 'k-2' });
    socket.server('crash:crashed', round({ status: 'crashed', crashPoint: '3.82' }));
    expect(c.getSnapshot().myBet).toMatchObject({ status: 'lost', payout: '0.00', net: '-10.00' });
  });

  it('a refusal comes back as the same ApiRequestError the REST client throws', async () => {
    const c = await start();
    socket.connected = true;
    socket.ackReply = {
      ok: false,
      error: { code: 'INSUFFICIENT_FUNDS', message: 'Not enough DEMO credits', statusCode: 422, details: { currency: 'DEMO' } },
    };
    const err = await c.placeBet({ stake: '10.00', autoCashOut: null, idempotencyKey: 'k-3' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 422, code: 'INSUFFICIENT_FUNDS', details: { currency: 'DEMO' } });
  });

  it('a lost ack is an unknown outcome (network error → retry with the same key), never a refusal', async () => {
    const c = await start();
    socket.connected = true;
    socket.ackThrows = true;
    const err = await c.placeBet({ stake: '10.00', autoCashOut: null, idempotencyKey: 'k-4' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiNetworkError);
  });

  it('without a live socket the bet goes over REST with the same key; manual cash-out needs the live connection', async () => {
    const c = await start();
    socket.connected = false;
    socket.server('crash:snapshot', snapshot());
    rest.placeBet.mockResolvedValue(myBet());
    await c.placeBet({ stake: '10.00', autoCashOut: '2.00', idempotencyKey: 'k-5' });
    expect(rest.placeBet).toHaveBeenCalledWith({ stake: '10.00', autoCashOut: '2.00', idempotencyKey: 'k-5' });
    await expect(c.cashOut('b1', 'k-6')).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('connection states: reconnect attempts, then offline', async () => {
    const c = await start();
    socket.server('crash:snapshot', snapshot());
    socket.server('disconnect', 'transport close');
    expect(c.getSnapshot().link).toBe('reconnecting');
    socket.io.emit('reconnect_attempt', 2);
    expect(c.getSnapshot().attempt).toBe(2);
    socket.io.emit('reconnect_failed');
    expect(c.getSnapshot().link).toBe('offline');
    socket.server('connect', undefined);
    expect(c.getSnapshot().link).toBe('live');
  });

  it('waitFor resolves on the next matching state (auto-play: next betting window)', async () => {
    const c = await start();
    socket.server('crash:snapshot', snapshot({ round: round({ status: 'running' }) }));
    const p = c.waitFor((s) => s.round?.status === 'betting' && s.round.id === 'r2');
    socket.server('crash:phase', round({ id: 'r2', number: 55103, ref: 'CR-55103', status: 'betting' }));
    const s = await p;
    expect(s.round?.ref).toBe('CR-55103');
    expect(s.bets).toEqual([]);
  });
});
