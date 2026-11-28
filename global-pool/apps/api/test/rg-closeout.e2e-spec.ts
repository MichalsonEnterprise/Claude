import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import {
  bearer,
  demoDeposit,
  enrol2fa,
  newPlayer,
  openRound,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
  createTestApp,
} from './helpers';

/**
 * Close-out (api-b): responsible-gaming fixes — R06 R13 R27 R28 R29 R55. Every test here failed on the code before
 * its fix.
 */
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
    .send({ entries, idempotencyKey: `e-${uid()}` });

const deposit = (p: TestPlayer, amount: string) =>
  t
    .http()
    .post('/dev/deposits/simulate')
    .set(bearer(p.token))
    .send({ network: 'arbitrum', amount, idempotencyKey: `dep-${uid()}` });

const setLimit = (p: TestPlayer, body: Record<string, unknown>) =>
  t.http().put('/responsible-gaming/limits').set(bearer(p.token)).send(body).expect(200);

describe('R06 a long self-exclusion never reopens by itself', () => {
  it('after the end date: ask → 24 h cool-down → deposit + loss limits → confirm', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '200.00');
    const round = await openRound(t);
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: '6m', confirm: true, phrase: 'SELF-EXCLUDE', acknowledged: true })
      .expect(200);
    // ... six months later: the period is over.
    await t.prisma.rgSelfExclusion.updateMany({
      where: { userId: p.userId },
      data: {
        startsAt: new Date(Date.now() - 200 * 86_400_000),
        endsAt: new Date(Date.now() - 60_000),
      },
    });

    let state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion).toMatchObject({
      active: true,
      kind: 'self_exclusion',
      reopen: { status: 'awaiting_request', requestedAt: null, missingLimits: ['deposit', 'loss'] },
    });
    const blocked = await buy(p, round.id, 1).expect(403);
    expect(blocked.body.error).toMatchObject({
      code: 'SELF_EXCLUDED',
      details: { kind: 'self_exclusion', reopen: { status: 'awaiting_request' } },
    });
    await deposit(p, '50.00').expect(403);
    const gate = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(gate.body.gate).toBe('self_excluded');
    expect(gate.body.selfExclusion).toMatchObject({
      active: true,
      kind: 'self_exclusion',
      reopen: { status: 'awaiting_request' },
    });
    // Withdrawals and history are never obstructed.
    await t.http().get('/withdrawals').set(bearer(p.token)).expect(200);

    // Confirming before asking is refused.
    await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen/confirm')
      .set(bearer(p.token))
      .expect(409);

    // Ask: the 24 h cool-down starts; still closed.
    state = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen')
      .set(bearer(p.token))
      .expect(200);
    const reopen = state.body.exclusion.reopen;
    expect(reopen.status).toBe('cooling_down');
    expect(new Date(reopen.availableAt).getTime() - new Date(reopen.requestedAt).getTime()).toBe(
      24 * 3_600_000,
    );
    await buy(p, round.id, 1).expect(403);
    const early = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen/confirm')
      .set(bearer(p.token))
      .expect(409);
    expect(early.body.error.details.availableAt).toBe(reopen.availableAt);
    // Asking again changes nothing (idempotent).
    const again = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen')
      .set(bearer(p.token))
      .expect(200);
    expect(again.body.exclusion.reopen.requestedAt).toBe(reopen.requestedAt);

    // 25 hours later: limits first.
    await t.prisma.rgSelfExclusion.updateMany({
      where: { userId: p.userId },
      data: { reopenRequestedAt: new Date(Date.now() - 25 * 3_600_000) },
    });
    state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion.reopen).toMatchObject({
      status: 'ready',
      missingLimits: ['deposit', 'loss'],
    });
    await buy(p, round.id, 1).expect(403);
    const noLimits = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen/confirm')
      .set(bearer(p.token))
      .expect(400);
    expect(noLimits.body.error.details.missingLimits).toEqual(['deposit', 'loss']);
    await setLimit(p, { type: 'deposit', period: 'month', amount: '500.00' });
    await setLimit(p, { type: 'loss', period: 'week', amount: '100.00' });

    state = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen/confirm')
      .set(bearer(p.token))
      .expect(200);
    expect(state.body.exclusion).toMatchObject({ active: false, reopen: null });
    await buy(p, round.id, 1).expect(201);
    await deposit(p, '50.00').expect(200);
    const actions = (
      await t.prisma.auditLog.findMany({
        where: { actorId: p.userId, action: { startsWith: 'user.rg.reopen' } },
        orderBy: { seq: 'asc' },
      })
    ).map((a) => a.action);
    expect(actions).toContain('user.rg.reopen_requested');
    expect(actions.at(-1)).toBe('user.rg.reopened');
  });

  it('a cooling-off break still ends on its date and the account status says it is a break', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);
    const during = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(during.body.selfExclusion).toMatchObject({
      active: true,
      kind: 'cooling_off',
      reopen: null,
    });
    await t.prisma.rgSelfExclusion.updateMany({
      where: { userId: p.userId },
      data: { startsAt: new Date(Date.now() - 2 * 86_400_000), endsAt: new Date(Date.now() - 1000) },
    });
    const after = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(after.body).toMatchObject({ gate: 'ok', selfExclusion: { active: false } });
  });

  it('a permanent self-exclusion cannot be reopened', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: 'permanent', confirm: true, phrase: 'SELF-EXCLUDE', acknowledged: true })
      .expect(200);
    const res = await t
      .http()
      .post('/responsible-gaming/self-exclusion/reopen')
      .set(bearer(p.token))
      .expect(409);
    expect(res.body.error.message).toMatch(/permanent/i);
  });
});

describe('R28 long self-exclusion accepts a backup code (lost phone)', () => {
  it('self-excludes with one of the player’s backup codes', async () => {
    const p = await newPlayer(t);
    const enrol = await t.http().post('/auth/2fa/enroll').set(bearer(p.token)).expect(200);
    const confirm = await t
      .http()
      .post('/auth/2fa/confirm')
      .set(bearer(p.token))
      .send({ code: await totp(enrol.body.secret as string) })
      .expect(200);
    const backup = (confirm.body.backupCodes as string[])[0]!;
    const ok = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({
        duration: '1y',
        confirm: true,
        phrase: 'SELF-EXCLUDE',
        acknowledged: true,
        totpCode: backup.toLowerCase(),
      })
      .expect(200);
    expect(ok.body).toMatchObject({ kind: 'self_exclusion', duration: '1y' });
    // The backup code is single-use.
    const used = await t.prisma.backupCode.count({
      where: { totpSecret: { userId: p.userId }, usedAt: { not: null } },
    });
    expect(used).toBe(1);
  });

  it('still refuses a wrong code (2FA stays the proof for a long self-exclusion)', async () => {
    const p = await newPlayer(t);
    await enrol2fa(t, p);
    const res = await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({
        duration: '1y',
        confirm: true,
        phrase: 'SELF-EXCLUDE',
        acknowledged: true,
        totpCode: 'ZZZZ-9999',
      })
      .expect(401);
    expect(res.body.error.code).toBe('STEP_UP_REQUIRED');
  });
});

describe('R13 refunds only offset stakes bought in the same period', () => {
  it('a refund today for yesterday’s purchase does not free up today’s participation limit', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '1000.00');
    await setLimit(p, { type: 'participation', period: 'day', amount: '100.00' });

    // Yesterday: 9 entries (90.45) in round A …
    const a = await openRound(t);
    await buy(p, a.id, 9).expect(201);
    await t.prisma.transaction.updateMany({
      where: { userId: p.userId, type: 'entry_purchase', roundId: a.id },
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });
    // … round A is cancelled today: a 90.00 refund dated today.
    await t.app.get(RoundLifecycleService).cancel(a.id, 'threshold_not_met');
    expect(
      await t.prisma.transaction.count({ where: { userId: p.userId, type: 'refund', roundId: a.id } }),
    ).toBe(1);

    // Today: 9 entries in round B (90.45 ≤ 100.00).
    const b = await openRound(t);
    await buy(p, b.id, 9).expect(201);
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    const limit = state.body.limits.find(
      (l: { type: string; period: string }) => l.type === 'participation' && l.period === 'day',
    );
    expect(limit).toMatchObject({ used: '90.45', remaining: '9.55' });
    // Before the fix the refund made today's usage 0.45 and this second 90.45 went through.
    const over = await buy(p, b.id, 9).expect(422);
    expect(over.body.error).toMatchObject({
      code: 'RG_LIMIT_EXCEEDED',
      details: { type: 'participation', used: '90.45' },
    });

    // A refund of a purchase made in the SAME period still offsets it.
    await t.app.get(RoundLifecycleService).cancel(b.id, 'threshold_not_met');
    const after = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(
      after.body.limits.find(
        (l: { type: string; period: string }) => l.type === 'participation' && l.period === 'day',
      ),
    ).toMatchObject({ used: '0.45' });
  });
});

describe('R29 parallel deposits cannot exceed the deposit limit', () => {
  it('only one of five parallel 100.00 simulations passes a 100.00 daily limit', async () => {
    const p = await newPlayer(t);
    await setLimit(p, { type: 'deposit', period: 'day', amount: '100.00' });
    const results = await Promise.all(Array.from({ length: 5 }, () => deposit(p, '100.00')));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 422)).toHaveLength(4);
    const credited = await t.prisma.transaction.aggregate({
      where: { userId: p.userId, type: 'deposit' },
      _sum: { netAmount: true },
    });
    expect(credited._sum.netAmount?.toFixed(2)).toBe('100.00');
  });
});

describe('R55 entry purchases count as play time on the server', () => {
  it('a purchase starts the session and accrues time without any client heartbeat', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '200.00');
    const round = await openRound(t);
    await setLimit(p, { type: 'session_time', period: 'day', minutes: 15 });
    await buy(p, round.id, 1).expect(201);
    const s = await t.http().get('/responsible-gaming/session').set(bearer(p.token)).expect(200);
    expect(s.body.startedAt).toBeTruthy();
    expect(s.body.sessionsToday).toBe(1);

    // 14.5 minutes played so far, last activity a minute ago: the next purchase accrues the gap and hits 15 min.
    await t.prisma.rgSettings.update({
      where: { userId: p.userId },
      data: {
        playedTodaySeconds: 14 * 60 + 30,
        lastActivityAt: new Date(Date.now() - 60_000),
      },
    });
    const blocked = await buy(p, round.id, 1).expect(422);
    expect(blocked.body.error).toMatchObject({
      code: 'RG_LIMIT_EXCEEDED',
      details: { type: 'daily_time_limit' },
    });
    // A refused purchase is rolled back, activity included.
    const row = await t.prisma.rgSettings.findUniqueOrThrow({ where: { userId: p.userId } });
    expect(row.playedTodaySeconds).toBe(14 * 60 + 30);
  });
});

describe('R27 deposit history and tracking stay available during a break', () => {
  it('lists, tracks and advances a confirming deposit while only NEW deposits are paused', async () => {
    const p = await newPlayer(t);
    const pending = await t
      .http()
      .post('/dev/deposits/simulate')
      .set(bearer(p.token))
      .send({
        network: 'arbitrum',
        amount: '40.00',
        idempotencyKey: `dep-${uid()}`,
        mode: 'progressive',
      })
      .expect(200);
    const ref = pending.body.reference as string;
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);

    const list = await t.http().get('/deposits').set(bearer(p.token)).expect(200);
    expect(list.body.items.map((d: { reference: string }) => d.reference)).toContain(ref);
    await t.http().get(`/deposits/ref/${ref}`).set(bearer(p.token)).expect(200);
    await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 5 })
      .expect(200);

    // NEW deposits stay paused.
    const address = await t
      .http()
      .get('/deposits/address?network=arbitrum')
      .set(bearer(p.token))
      .expect(403);
    expect(address.body.error.code).toBe('SELF_EXCLUDED');
    await deposit(p, '20.00').expect(403);
  });
});
