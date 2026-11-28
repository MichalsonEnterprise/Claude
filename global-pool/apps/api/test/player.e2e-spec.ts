import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LedgerService } from '../src/modules/ledger/ledger.service';
import {
  CONSENTS,
  bearer,
  createTestApp,
  enrol2fa,
  newPlayer,
  openRound,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

let t: TestApp;
let ledger: LedgerService;

beforeAll(async () => {
  t = await createTestApp();
  ledger = t.app.get(LedgerService);
});
afterAll(async () => {
  await t?.close();
});

describe('platform', () => {
  it('GET /health checks PostgreSQL + Redis', async () => {
    const res = await t.http().get('/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      realMoneyEnabled: false,
      checks: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

  it('serves the OpenAPI document at /docs-json', async () => {
    const res = await t.http().get('/docs-json').expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/pool/rounds/{roundId}/entries',
        '/withdrawals',
        '/admin/auth/login',
      ]),
    );
  });

  it('returns the shared error envelope for unknown routes', async () => {
    const res = await t.http().get('/nope').expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    expect(res.body.error.requestId).toBeTruthy();
  });
});

describe('player auth (Privy DEV MOCK) → onboarding → /me', () => {
  it('rejects requests without / with a forged token', async () => {
    await t.http().get('/me').expect(401);
    const res = await t
      .http()
      .get('/me')
      .set(bearer('eyJhbGciOiJIUzI1NiJ9.e30.forged'))
      .expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('dev token → session upsert → onboarding consents → /me', async () => {
    const suffix = uid();
    const dev = await t
      .http()
      .post('/auth/dev/token')
      .send({ did: `did:privy:e2e-${suffix}`, email: `E2E-${suffix}@Example.com` })
      .expect(200);
    const token = dev.body.token as string;

    const session = await t.http().post('/auth/session').set(bearer(token)).expect(200);
    expect(session.body).toMatchObject({ created: true, onboardingRequired: true });
    expect(session.body.user.email).toBe(`e2e-${suffix}@example.com`);

    const me0 = await t.http().get('/me').set(bearer(token)).expect(200);
    expect(me0.body).toMatchObject({ onboarded: false, onboardingRequired: true, handle: null });

    // gaming/financial routes are blocked until onboarding is complete
    const blocked = await t
      .http()
      .get('/deposits/address?network=arbitrum')
      .set(bearer(token))
      .expect(403);
    expect(blocked.body.error.code).toBe('ONBOARDING_REQUIRED');

    // consents are never implied: a missing / false consent fails validation
    const bad = await t
      .http()
      .post('/auth/onboarding')
      .set(bearer(token))
      .send({
        handle: `e2e_${suffix}`,
        country: 'PT',
        consents: { ...CONSENTS, ageConfirmed: false },
      })
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_FAILED');
    expect(bad.body.error.issues[0].path).toEqual(['consents', 'ageConfirmed']);

    // restricted country of residence
    const geo = await t
      .http()
      .post('/auth/onboarding')
      .set(bearer(token))
      .send({ handle: `e2e_${suffix}`, country: 'US', consents: CONSENTS })
      .expect(451);
    expect(geo.body.error.code).toBe('GEO_RESTRICTED');

    await t
      .http()
      .post('/auth/onboarding')
      .set(bearer(token))
      .send({ handle: `e2e_${suffix}`, country: 'PT', consents: CONSENTS })
      .expect(200);
    const me = await t.http().get('/me').set(bearer(token)).expect(200);
    expect(me.body).toMatchObject({
      handle: `e2e_${suffix}`,
      displayHandle: `@e2e_${suffix}`,
      onboarded: true,
      country: { code: 'PT', permitted: true },
      consents: { termsVersion: '2026-11-demo', marketingOptIn: false },
    });
    expect(me.body.consents.ageConfirmedAt).toBeTruthy();

    const sessions = await t.http().get('/me/sessions').set(bearer(token)).expect(200);
    expect(sessions.body).toHaveLength(1);
    expect(sessions.body[0].current).toBe(true);
  });
});

describe('money flows (ledger-backed)', () => {
  let p: TestPlayer;
  let roundId: string;

  beforeAll(async () => {
    p = await newPlayer(t);
    roundId = (await openRound(t)).id;
  });

  const balances = async () =>
    (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body;

  it('DEMO deposit → Available (same postings as a real deposit; idempotent)', async () => {
    const key = `dep-${uid()}`;
    const first = await t
      .http()
      .post('/dev/deposits/simulate')
      .set(bearer(p.token))
      .send({ network: 'arbitrum', amount: '1000.00', idempotencyKey: key })
      .expect(200);
    expect(first.body).toMatchObject({
      status: 'credited',
      amount: '1000.00',
      replayed: false,
      isDemo: true,
    });
    const replay = await t
      .http()
      .post('/dev/deposits/simulate')
      .set(bearer(p.token))
      .send({ network: 'arbitrum', amount: '1000.00', idempotencyKey: key })
      .expect(200);
    expect(replay.body).toMatchObject({ reference: first.body.reference, replayed: true });
    expect(await balances()).toMatchObject({
      available: '1000.00',
      locked: '0.00',
      pending: '0.00',
      owed: '0.00',
      total: '1000.00',
    });
  });

  it('enter round: 35 entries → Available −351.75, Locked +350.00, FEES +1.75; replay returns the same result', async () => {
    const feesBefore = await ledger.balanceOf({ type: 'fees' });
    const key = `enter-${uid()}`;
    const res = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 35, idempotencyKey: key })
      .expect(201);
    expect(res.body).toMatchObject({
      entries: 35,
      entryAmount: '350.00',
      platformFee: '1.75',
      networkFee: '0.00',
      total: '351.75',
      replayed: false,
    });
    expect(res.body.firstEntryId).toMatch(/^E-\d+-00001$/);
    expect(res.body.lastEntryId).toMatch(/^E-\d+-00035$/);
    expect(await balances()).toMatchObject({
      available: '648.25',
      locked: '350.00',
      total: '998.25',
    });
    const feesAfter = await ledger.balanceOf({ type: 'fees' });
    expect(Number(feesAfter) - Number(feesBefore)).toBeCloseTo(1.75, 6);
    expect(await ledger.balanceOf({ type: 'pool', roundId })).toBe('350.00');

    const replay = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 35, idempotencyKey: key })
      .expect(201);
    const { replayed, ...rest } = replay.body as Record<string, unknown>;
    const { replayed: _r, ...original } = res.body as Record<string, unknown>;
    expect(replayed).toBe(true);
    expect(rest).toEqual(original);
    expect(await balances()).toMatchObject({ available: '648.25', locked: '350.00' });
    expect(await t.prisma.entry.count({ where: { roundId } })).toBe(35);

    const conflict = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 36, idempotencyKey: key })
      .expect(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');

    const round = (await t.http().get(`/pool/rounds/${res.body.roundNumber}`).expect(200)).body;
    expect(round).toMatchObject({
      entries: 35,
      participants: 1,
      poolBalance: '350.00',
      platformFees: '1.75',
    });
  });

  it('rejects purchases above the balance (no partial writes)', async () => {
    const res = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 1000, idempotencyKey: `big-${uid()}` })
      .expect(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(await t.prisma.entry.count({ where: { roundId } })).toBe(35);
  });

  it('enforces the RG participation limit (decrease immediate, increase pending)', async () => {
    await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'participation', period: 'day', amount: '400.00' })
      .expect(200);
    const res = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 10, idempotencyKey: `rg-${uid()}` })
      .expect(422);
    expect(res.body.error).toMatchObject({
      code: 'RG_LIMIT_EXCEEDED',
      details: { type: 'participation', used: '351.75', remaining: '48.25' },
    });
    const raised = await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'participation', period: 'day', amount: '1000.00' })
      .expect(200);
    const limit = raised.body.limits.find((l: { type: string }) => l.type === 'participation');
    expect(limit).toMatchObject({ limit: '400.00', pendingIncrease: { amount: '1000.00' } });
    await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 4, idempotencyKey: `rg-ok-${uid()}` })
      .expect(201);
  });

  it('withdrawal request needs step-up 2FA + KYC, then AVAILABLE → LOCKED with a status', async () => {
    const secret = await enrol2fa(t, p); // consumes the current TOTP step
    const address = '0x2222222222222222222222222222222222222222';
    const body = { network: 'arbitrum', address, amount: '100.00', idempotencyKey: `wd-${uid()}` };

    const noKyc = await t.http().post('/withdrawals').set(bearer(p.token)).send(body).expect(403);
    expect(noKyc.body.error.code).toBe('KYC_REQUIRED');
    await t
      .http()
      .post('/dev/kyc/approve')
      .set(bearer(p.token))
      .send({ level: 'level_2' })
      .expect(200);

    const noCode = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({ ...body, idempotencyKey: `wd-${uid()}` })
      .expect(401);
    expect(noCode.body.error).toMatchObject({
      code: 'STEP_UP_REQUIRED',
      details: { reason: 'code_required' },
    });

    const wrong = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({ ...body, idempotencyKey: `wd-${uid()}`, totpCode: '000000' })
      .expect(401);
    expect(wrong.body.error.details.reason).toBe('invalid_code');

    const before = await balances();
    const res = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({ ...body, totpCode: await totp(secret, 1) })
      .expect(201);
    expect(res.body).toMatchObject({
      amount: '100.00',
      networkFee: '0.08',
      platformFee: '0.00',
      youReceive: '99.92',
      status: 'under_review',
      flagged: true,
      requiresFourEyes: true,
    });
    expect(res.body.timeline.map((s: { status: string }) => s.status)).toEqual([
      'requested',
      'risk_check',
      'under_review',
    ]);
    const after = await balances();
    expect(Number(after.available)).toBeCloseTo(Number(before.available) - 100, 6);
    expect(Number(after.locked)).toBeCloseTo(Number(before.locked) + 100, 6);
    expect(after.breakdown.lockedWithdrawals).toBe('100.00');

    const replay = await t.http().post('/withdrawals').set(bearer(p.token)).send(body).expect(201);
    expect(replay.body).toMatchObject({ id: res.body.id, replayed: true });

    const history = await t
      .http()
      .get('/transactions?type=withdrawal')
      .set(bearer(p.token))
      .expect(200);
    expect(history.body.items[0]).toMatchObject({
      id: res.body.reference,
      status: 'under_review',
      withdrawalStatus: 'under_review',
    });
  });

  it('self-exclusion blocks entries immediately but never withdrawals', async () => {
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);
    const res = await t
      .http()
      .post(`/pool/rounds/${roundId}/entries`)
      .set(bearer(p.token))
      .send({ entries: 1, idempotencyKey: `se-${uid()}` })
      .expect(403);
    expect(res.body.error.code).toBe('SELF_EXCLUDED');
    await t.http().get('/withdrawals').set(bearer(p.token)).expect(200);
  });

  it('keeps the ledger balanced: Σ entries = 0 and every posting sums to zero', async () => {
    const rec = await ledger.reconcile();
    expect(rec).toMatchObject({
      ok: true,
      ledgerTotal: '0.00',
      unbalancedPostings: 0,
      poolMismatches: [],
    });
  });

  it('the database itself refuses to edit or delete ledger rows', async () => {
    await expect(
      t.prisma.$executeRawUnsafe(
        `UPDATE ledger_entries SET amount = amount + 1 WHERE id = (SELECT id FROM ledger_entries LIMIT 1)`,
      ),
    ).rejects.toThrow(/GP_APPEND_ONLY/);
    await expect(
      t.prisma.$executeRawUnsafe(
        `DELETE FROM ledger_postings WHERE id = (SELECT id FROM ledger_postings LIMIT 1)`,
      ),
    ).rejects.toThrow(/GP_APPEND_ONLY/);
  });
});
