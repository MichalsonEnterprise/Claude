/**
 * rg-history: responsible-gaming enforcement (limits removal / cancel, time limits, quiet hours, cooling-off,
 * long self-exclusion with typed confirmation + step-up) and the player history endpoints (/history/*).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  openRound,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const buy = (p: TestPlayer, roundId: string, entries: number) =>
  t
    .http()
    .post(`/pool/rounds/${roundId}/entries`)
    .set(bearer(p.token))
    .send({ entries, idempotencyKey: `rgh-${uid()}` });

describe('responsible gaming — limits, cool-downs and history', () => {
  let p: TestPlayer;
  beforeAll(async () => {
    p = await newPlayer(t);
  });

  it('a removal waits 24 h and can be cancelled; the change log comes from the audit trail', async () => {
    await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'week', amount: '5000.00' })
      .expect(200);
    const removed = await t
      .http()
      .post('/responsible-gaming/limits/remove')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'week' })
      .expect(200);
    const dep = removed.body.limits.find((l: { type: string }) => l.type === 'deposit');
    expect(dep).toMatchObject({ limit: '5000.00', pendingIncrease: null });
    expect(dep.pendingRemoval.effectiveAt).toBeTruthy();
    expect(new Date(dep.resetsAt).getUTCDay()).toBe(1); // weekly limits reset on Monday 00:00 UTC

    const cancelled = await t
      .http()
      .post('/responsible-gaming/limits/cancel-pending')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'week' })
      .expect(200);
    expect(cancelled.body.limits.find((l: { type: string }) => l.type === 'deposit')).toMatchObject(
      {
        limit: '5000.00',
        pendingRemoval: null,
        pendingIncrease: null,
      },
    );
    await t
      .http()
      .post('/responsible-gaming/limits/cancel-pending')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'week' })
      .expect(404);

    const history = await t
      .http()
      .get('/responsible-gaming/history?kind=limits')
      .set(bearer(p.token))
      .expect(200);
    expect(history.body.map((h: { label: string }) => h.label)).toEqual([
      'Weekly deposit limit change cancelled',
      'Weekly deposit limit removal requested',
      'Weekly deposit limit set',
    ]);
  });

  it('heartbeats track the play session; the daily time limit blocks new entries', async () => {
    const beat = await t
      .http()
      .post('/responsible-gaming/session/heartbeat')
      .set(bearer(p.token))
      .expect(200);
    expect(beat.body).toMatchObject({
      sessionsToday: 1,
      netSession: '0.00',
      blockedReason: null,
      realityCheck: { intervalMinutes: 60, due: false },
    });
    expect(beat.body.startedAt).toBeTruthy();

    await demoDeposit(t, p, '500.00');
    const round = await openRound(t);
    await buy(p, round.id, 1).expect(201);

    await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'session_time', period: 'day', minutes: 15 })
      .expect(200);
    // simulate 15 minutes of play today
    await t.prisma.rgSettings.update({
      where: { userId: p.userId },
      data: { playedTodaySeconds: 15 * 60 },
    });
    const blocked = await buy(p, round.id, 1).expect(422);
    expect(blocked.body.error).toMatchObject({
      code: 'RG_LIMIT_EXCEEDED',
      details: { type: 'daily_time_limit' },
    });
    const session = await t
      .http()
      .get('/responsible-gaming/session')
      .set(bearer(p.token))
      .expect(200);
    expect(session.body.blockedReason).toBe('daily_time_limit');
    expect(session.body.netToday).toBe('-10.05');
    // withdrawals are never blocked by RG
    await t.http().get('/withdrawals').set(bearer(p.token)).expect(200);
  });

  it('reality-check answers are recorded and restart the interval', async () => {
    await t
      .http()
      .put('/responsible-gaming/reality-check')
      .set(bearer(p.token))
      .send({ intervalMinutes: 30, pauseGame: true, pushNotification: false })
      .expect(200);
    const ack = await t
      .http()
      .post('/responsible-gaming/reality-check/ack')
      .set(bearer(p.token))
      .send({ action: 'history' })
      .expect(200);
    expect(ack.body).toMatchObject({ action: 'history', intervalMinutes: 30 });
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.settings).toMatchObject({
      realityCheckMinutes: 30,
      realityCheckPause: true,
      realityCheckPush: false,
    });
    const nextAt = new Date(state.body.session.realityCheck.nextAt).getTime();
    expect(nextAt - new Date(ack.body.acknowledgedAt).getTime()).toBe(30 * 60_000);
    const log = await t
      .http()
      .get('/responsible-gaming/history?kind=reality_checks')
      .set(bearer(p.token))
      .expect(200);
    expect(log.body[0]).toMatchObject({ label: 'Viewed history', detail: '30 min' });
  });
});

describe('responsible gaming — quiet hours and session length', () => {
  it('quiet hours apply at once; switching them off waits 24 h (cancellable)', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '100.00');
    const round = await openRound(t);
    const now = new Date();
    const hh = (m: number) =>
      `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const window = { start: hh((minute + 1439) % 1440), end: hh((minute + 60) % 1440) };
    const on = await t
      .http()
      .put('/responsible-gaming/quiet-hours')
      .set(bearer(p.token))
      .send({ enabled: true, ...window })
      .expect(200);
    expect(on.body.settings.quietHours).toMatchObject({
      enabled: true,
      ...window,
      pendingOffAt: null,
    });
    const blocked = await buy(p, round.id, 1).expect(422);
    expect(blocked.body.error.details.type).toBe('quiet_hours');

    const off = await t
      .http()
      .put('/responsible-gaming/quiet-hours')
      .set(bearer(p.token))
      .send({ enabled: false, ...window })
      .expect(200);
    expect(off.body.settings.quietHours.enabled).toBe(true);
    expect(off.body.settings.quietHours.pendingOffAt).toBeTruthy();
    await buy(p, round.id, 1).expect(422); // still on during the cool-down
    const kept = await t
      .http()
      .post('/responsible-gaming/settings/cancel-pending')
      .set(bearer(p.token))
      .send({ target: 'quiet_hours' })
      .expect(200);
    expect(kept.body.settings.quietHours.pendingOffAt).toBeNull();
  });

  it('a new session limit applies now, a higher one waits 24 h', async () => {
    const p = await newPlayer(t);
    const set = await t
      .http()
      .put('/responsible-gaming/session-limit')
      .set(bearer(p.token))
      .send({ minutes: 90 })
      .expect(200);
    expect(set.body.settings.sessionLimit).toMatchObject({ minutes: 90, pending: null });
    const raised = await t
      .http()
      .put('/responsible-gaming/session-limit')
      .set(bearer(p.token))
      .send({ minutes: 120 })
      .expect(200);
    expect(raised.body.settings.sessionLimit.minutes).toBe(90);
    expect(raised.body.settings.sessionLimit.pending.minutes).toBe(120);
    const lowered = await t
      .http()
      .put('/responsible-gaming/session-limit')
      .set(bearer(p.token))
      .send({ minutes: 60 })
      .expect(200);
    expect(lowered.body.settings.sessionLimit).toMatchObject({ minutes: 60, pending: null });
  });
});

describe('breaks and self-exclusion', () => {
  it('a cooling-off break blocks entries and deposits, never withdrawals, and cannot be shortened', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '100.00');
    const round = await openRound(t);
    const res = await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '7d', confirm: true })
      .expect(200);
    expect(res.body).toMatchObject({ kind: 'cooling_off', duration: '7d' });
    const blocked = await buy(p, round.id, 1).expect(403);
    expect(blocked.body.error).toMatchObject({
      code: 'SELF_EXCLUDED',
      details: { kind: 'cooling_off' },
    });
    await t
      .http()
      .post('/dev/deposits/simulate')
      .set(bearer(p.token))
      .send({ network: 'arbitrum', amount: '50.00', idempotencyKey: `dep-${uid()}` })
      .expect(403);
    await t.http().get('/deposits/address?network=arbitrum').set(bearer(p.token)).expect(403);
    await t.http().get('/withdrawals').set(bearer(p.token)).expect(200);
    await t.http().get('/history/transactions').set(bearer(p.token)).expect(200);

    const shorter = await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(409);
    expect(shorter.body.error.code).toBe('CONFLICT');
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion).toMatchObject({
      active: true,
      kind: 'cooling_off',
      duration: '7d',
    });
    expect(state.body.session.blockedReason).toBe('excluded');
  });

  it('long self-exclusion needs the typed phrase, the acknowledgement and step-up TOTP when 2FA is on', async () => {
    const p = await newPlayer(t);
    const secret = await enrol2fa(t, p);
    const base = { duration: '5y', confirm: true };
    const noPhrase = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ ...base, acknowledged: true })
      .expect(400);
    expect(noPhrase.body.error.details.field).toBe('phrase');
    const noAck = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ ...base, phrase: 'SELF-EXCLUDE' })
      .expect(400);
    expect(noAck.body.error.details.field).toBe('acknowledged');
    const noCode = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ ...base, phrase: 'SELF-EXCLUDE', acknowledged: true })
      .expect(401);
    expect(noCode.body.error.code).toBe('STEP_UP_REQUIRED');
    const ok = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({
        ...base,
        phrase: 'SELF-EXCLUDE',
        acknowledged: true,
        totpCode: await totp(secret, 1),
      })
      .expect(200);
    expect(ok.body).toMatchObject({ kind: 'self_exclusion', duration: '5y' });
    const years =
      (new Date(ok.body.endsAt).getTime() - new Date(ok.body.startsAt).getTime()) / 86_400_000;
    expect(Math.round(years / 365)).toBe(5);
    const audit = await t.prisma.auditLog.findFirst({
      where: { actorId: p.userId, action: 'user.rg.self_excluded' },
    });
    expect(audit?.metadata).toMatchObject({ duration: '5y' });
  });

  it('players without 2FA can still self-exclude with the typed confirmation (never obstructed)', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: 'permanent', confirm: true, phrase: 'SELF-EXCLUDE', acknowledged: true })
      .expect(200);
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion).toMatchObject({
      active: true,
      kind: 'self_exclusion',
      endsAt: null,
    });
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '30d', confirm: true })
      .expect(409);
  });
});

describe('player history', () => {
  let p: TestPlayer;
  let roundId: string;
  let roundNumber: number;
  beforeAll(async () => {
    p = await newPlayer(t);
    await demoDeposit(t, p, '1000.00');
    const round = await openRound(t);
    roundId = round.id;
    roundNumber = round.number;
    await buy(p, roundId, 5).expect(201);
    await buy(p, roundId, 3).expect(201);
  });

  it('summary KPIs come from the transaction history (fees as their own line)', async () => {
    const res = await t.http().get('/history/summary').set(bearer(p.token)).expect(200);
    expect(res.body.deposits).toMatchObject({ lifetime: '1000.00', count: 1, pendingCount: 0 });
    expect(res.body.fees).toMatchObject({
      platformLifetime: '0.40',
      entriesLifetime: 8,
      currentRound: { number: roundNumber, entries: 8, platformFee: '0.40' },
    });
    expect(res.body.withdrawals).toMatchObject({ lifetime: '0.00', dailyLimit: '0.00' });
  });

  it('lists transactions by several types, searches references and exports an audited CSV', async () => {
    const res = await t
      .http()
      .get('/history/transactions?types=deposit,entry_purchase&pageSize=10')
      .set(bearer(p.token))
      .expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items[0]).toMatchObject({
      type: 'entry_purchase',
      roundNumber,
      netAmount: '30.15',
    });
    const ref = res.body.items[0].id as string;
    const search = await t
      .http()
      .get(`/history/transactions?q=${encodeURIComponent(ref)}`)
      .set(bearer(p.token))
      .expect(200);
    expect(search.body.items.map((i: { id: string }) => i.id)).toEqual([ref]);

    const csv = await t
      .http()
      .get('/history/transactions/export?types=entry_purchase&format=csv_semicolon')
      .set(bearer(p.token))
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(
      /attachment; filename="globalpool_transactions_/,
    );
    const lines = csv.text.trim().split('\r\n');
    expect(lines[0]).toMatch(
      /^date_utc;reference;type;status;direction;amount_usdt;platform_fee_usdt/,
    );
    expect(lines).toHaveLength(3);
    const audit = await t.prisma.auditLog.findFirst({
      where: { actorId: p.userId, action: 'user.history.exported' },
    });
    expect(audit?.metadata).toMatchObject({ kind: 'transactions', rows: 2 });
  });

  it('fee lines show 0.05 USDT per entry, separate from the stake', async () => {
    const res = await t.http().get('/history/fees').set(bearer(p.token)).expect(200);
    expect(res.body.items.map((f: { amount: string; kind: string }) => [f.kind, f.amount])).toEqual(
      [
        ['platform_fee', '0.15'],
        ['platform_fee', '0.25'],
      ],
    );
  });

  it('groups my entries by round with the odds share, and lists active rounds', async () => {
    const res = await t.http().get('/history/entries').set(bearer(p.token)).expect(200);
    expect(res.body.totals).toMatchObject({ entries: 8, rounds: 1, won: 0 });
    expect(res.body.items[0]).toMatchObject({
      entries: 8,
      stake: '80.00',
      platformFee: '0.40',
      result: 'active',
      round: { number: roundNumber, status: 'open' },
      share: '1.000000',
    });
    expect(res.body.items[0].firstCode).toMatch(/^E-\d+-00001$/);
    const filtered = await t
      .http()
      .get('/history/entries?status=won,refunded')
      .set(bearer(p.token))
      .expect(200);
    expect(filtered.body.total).toBe(0);
    const active = await t.http().get('/history/rounds/active').set(bearer(p.token)).expect(200);
    expect(active.body).toHaveLength(1);
    await t.http().get('/history/rounds/results').set(bearer(p.token)).expect(200);
    const winnings = await t.http().get('/history/winnings').set(bearer(p.token)).expect(200);
    expect(winnings.body).toMatchObject({ owed: { total: '0.00' }, lifetimePrizes: '0.00' });
    const games = await t.http().get('/history/games').set(bearer(p.token)).expect(200);
    expect(games.body.last30d).toMatchObject({ poolEntries: 8, poolSpent: '80.40', net: '-80.40' });
  });

  it('favourites can be added (idempotent) and removed; game history starts empty', async () => {
    await t.http().put('/history/favourites/pool-dice').set(bearer(p.token)).expect(200);
    const twice = await t
      .http()
      .put('/history/favourites/pool-dice')
      .set(bearer(p.token))
      .expect(200);
    expect(twice.body.map((f: { slug: string }) => f.slug)).toEqual(['pool-dice']);
    await t.http().put('/history/favourites/no-such-game').set(bearer(p.token)).expect(404);
    const removed = await t
      .http()
      .delete('/history/favourites/pool-dice')
      .set(bearer(p.token))
      .expect(200);
    expect(removed.body).toEqual([]);
    const rounds = await t.http().get('/history/game-rounds').set(bearer(p.token)).expect(200);
    expect(rounds.body).toMatchObject({ items: [], total: 0 });
  });

  it('history is private to its owner', async () => {
    const other = await newPlayer(t);
    const res = await t.http().get('/history/entries').set(bearer(other.token)).expect(200);
    expect(res.body.total).toBe(0);
    await t.http().get('/history/summary').expect(401);
  });
});
