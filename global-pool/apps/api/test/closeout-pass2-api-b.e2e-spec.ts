import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { sha256Hex } from '../src/common/crypto';
import { AppConfig } from '../src/config/app-config';
import { parseEnv } from '../src/config/env';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { REDIS } from '../src/infra/redis/redis.module';
import { AdminAuthService } from '../src/modules/admin/admin-auth.service';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  newPlayer,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

/**
 * Close-out pass 2 (api-b): Q04 Q18 Q22 Q24 Q27 R18b R27b R50b. Every test here failed on the code before its fix
 * (Q24 / R27 API part: already fixed in pass 1, re-checked here for the travelling case).
 */
let t: TestApp;
/** Behind a CDN: the country header is trusted, so a request can come from a restricted country (travelling). */
let cdn: TestApp;
const CDN = 'x-country';

async function appWith(env: Record<string, string>): Promise<TestApp> {
  const config = new AppConfig(parseEnv({ ...process.env, ...env }));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AppConfig)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return {
    app,
    http: () => request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    close: () => app.close(),
  };
}

beforeAll(async () => {
  t = await createTestApp();
  cdn = await appWith({ TRUST_PROXY: 'true', GEO_COUNTRY_HEADER: CDN });
});
afterAll(async () => {
  await t?.close();
  await cdn?.close();
});

/** A real admin row for restrictions applied straight in the DB (the gate / hold logic is what is tested). */
async function restrict(p: TestPlayer, type: 'withdrawals_frozen' | 'deposits_blocked') {
  const admin = await createAdmin(t, 'compliance');
  return t.prisma.userRestriction.create({
    data: { userId: p.userId, type, reason: 'e2e pass-2 check', appliedByAdminId: admin.id },
  });
}

const progressiveDeposit = async (app: TestApp, p: TestPlayer, amount: string) => {
  const res = await app
    .http()
    .post('/dev/deposits/simulate')
    .set(bearer(p.token))
    .send({ network: 'arbitrum', amount, idempotencyKey: `dep-${uid()}`, mode: 'progressive' })
    .expect(200);
  return res.body.reference as string;
};

describe('Q04 responsible-gaming tools work before onboarding', () => {
  it('a signed-in, not-onboarded player reads and sets limits and can take a break', async () => {
    const p = await newPlayer(t, { onboard: false });
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion).toMatchObject({ active: false });
    await t.http().get('/responsible-gaming/session').set(bearer(p.token)).expect(200);
    await t.http().get('/responsible-gaming/history').set(bearer(p.token)).expect(200);
    const limit = await t
      .http()
      .put('/responsible-gaming/limits')
      .set(bearer(p.token))
      .send({ type: 'deposit', period: 'day', amount: '50.00' })
      .expect(200);
    expect(
      limit.body.limits.find((l: { type: string; period: string }) => l.type === 'deposit'),
    ).toMatchObject({ period: 'day' });
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);
    // Money and gaming routes still need onboarding.
    const money = await t.http().get('/deposits').set(bearer(p.token)).expect(403);
    expect(money.body.error.code).toBe('ONBOARDING_REQUIRED');
  });
});

describe('Q18 a withdrawals freeze is never "no restrictions"', () => {
  it('GET /auth/account-status answers gate under_review with withdrawals paused', async () => {
    const p = await newPlayer(t);
    await restrict(p, 'withdrawals_frozen');
    const res = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(res.body).toMatchObject({
      gate: 'under_review',
      paused: { gaming: false, deposits: false, withdrawals: true },
    });
    expect(res.body.restrictions).toEqual([
      expect.objectContaining({
        type: 'withdrawals_frozen',
        reference: expect.stringMatching(/^FRZ-/),
      }),
    ]);
    expect(JSON.stringify(res.body)).not.toContain('e2e pass-2 check');
  });
});

describe('Q22 real one- and two-letter names pass KYC Level 1 details', () => {
  const DETAILS = {
    firstNames: 'Wei',
    lastNames: 'Li',
    dateOfBirth: '1994-03-14',
    nationality: 'PT',
    country: 'PT',
    addressLine: 'Rua do Exemplo 12, 3.º Esq.',
    city: 'Lisboa',
    postalCode: '1100-001',
    occupation: 'Software developer',
    pep: 'not_pep',
    accuracyConfirmed: true,
  };

  it('accepts Li, Ng, Jo and O; refuses initials such as "J."', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/kyc/application')
      .set(bearer(p.token))
      .send({ level: 'level_1' })
      .expect(200);
    for (const [firstNames, lastNames] of [
      ['Wei', 'Li'],
      ['Anna', 'Ng'],
      ['Jo', 'Silva'],
      ['Min', 'O'],
    ]) {
      await t
        .http()
        .put('/kyc/application/details')
        .set(bearer(p.token))
        .send({ ...DETAILS, firstNames, lastNames })
        .expect(200);
    }
    const bad = await t
      .http()
      .put('/kyc/application/details')
      .set(bearer(p.token))
      .send({ ...DETAILS, firstNames: 'J.' })
      .expect(400);
    expect(bad.body.error.issues).toEqual([
      expect.objectContaining({
        path: ['firstNames'],
        message: 'First name(s) — initials aren’t enough, enter it in full',
      }),
    ]);
  });
});

describe('Q27 repeating an equal break answers 409', () => {
  it('a second 24 h break while one is running is refused and endsAt does not move; longer still extends', async () => {
    const p = await newPlayer(t);
    const first = await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);
    const again = await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(409);
    expect(again.body.error).toMatchObject({
      code: 'CONFLICT',
      details: { kind: 'cooling_off', endsAt: first.body.endsAt },
    });
    const state = await t.http().get('/responsible-gaming').set(bearer(p.token)).expect(200);
    expect(state.body.exclusion.endsAt).toBe(first.body.endsAt);
    expect(await t.prisma.rgSelfExclusion.count({ where: { userId: p.userId } })).toBe(1);
    // A longer break extends it.
    const longer = await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '7d', confirm: true })
      .expect(200);
    expect(new Date(longer.body.endsAt).getTime()).toBeGreaterThan(
      new Date(first.body.endsAt).getTime(),
    );
  });

  it('a break near the end of a longer running break is refused too (equal or longer = by length)', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '7d', confirm: true })
      .expect(200);
    // ... almost seven days later: one hour left.
    await t.prisma.rgSelfExclusion.updateMany({
      where: { userId: p.userId },
      data: {
        startsAt: new Date(Date.now() - 7 * 86_400_000 + 3_600_000),
        endsAt: new Date(Date.now() + 3_600_000),
      },
    });
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(409);
    // Self-exclusion can always extend a break.
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: '6m', confirm: true, phrase: 'SELF-EXCLUDE', acknowledged: true })
      .expect(200);
  });
});

describe('R18b GET /admin/approvals follows the module read permission per request', () => {
  it('a role without system.read does not see a pending role-permission change (reason, payload)', async () => {
    const [s1, finance] = await Promise.all([
      createAdmin(t, 'super_admin'),
      createAdmin(t, 'finance'),
    ]);
    const [t1, fToken] = await Promise.all([adminLogin(t, s1, -1), adminLogin(t, finance)]);
    const key = `qa_${uid().replace(/[^a-z]/g, 'x')}`;
    const role = await t.prisma.adminRole.create({ data: { key, name: 'QA pass-2 role' } });
    let approvalId: string | null = null;
    try {
      const req = await t
        .http()
        .post(`/admin/roles/${key}/change-requests`)
        .set(bearer(t1))
        .send({
          grant: ['kyc.read'],
          reason: 'R18b confidential reason text',
          mfaCode: await totp(s1.secret, 0),
        })
        .expect(202);
      approvalId = req.body.approval.id as string;

      const all = await t.http().get('/admin/approvals').set(bearer(t1)).expect(200);
      expect(all.body.map((a: { id: string }) => a.id)).toContain(approvalId);

      const scoped = await t.http().get('/admin/approvals').set(bearer(fToken)).expect(200);
      expect(scoped.body.map((a: { id: string }) => a.id)).not.toContain(approvalId);
      expect(JSON.stringify(scoped.body)).not.toContain('R18b confidential reason text');
      expect(
        scoped.body.filter((a: { action: string }) => a.action === 'admin.role.permissions.change'),
      ).toEqual([]);
      // ...and it matches the inbox for the same viewer.
      const inbox = await t
        .http()
        .get('/admin/approvals/inbox?view=open')
        .set(bearer(fToken))
        .expect(200);
      expect(inbox.body.items.map((i: { id: string }) => i.id)).not.toContain(approvalId);
    } finally {
      if (approvalId) {
        await t
          .http()
          .post(`/admin/approvals/${approvalId}/withdraw`)
          .set(bearer(t1))
          .send({ reason: 'Test clean-up, not needed' });
      }
      await t.prisma.adminRole.deleteMany({ where: { id: role.id } });
    }
  });
});

describe('R27b deposits already sent stay trackable abroad; DEMO credits follow the real holds', () => {
  it('a travelling player (restricted location) lists, tracks and advances a confirming deposit', async () => {
    const p = await newPlayer(cdn);
    const ref = await progressiveDeposit(cdn, p, '30.00');
    const abroad = (r: request.Test) => r.set(bearer(p.token)).set(CDN, 'US');
    const list = await abroad(cdn.http().get('/deposits')).expect(200);
    expect(list.body.items.map((d: { reference: string }) => d.reference)).toContain(ref);
    await abroad(cdn.http().get(`/deposits/ref/${ref}`)).expect(200);
    await abroad(cdn.http().post(`/dev/deposits/${ref}/confirmations`))
      .send({ confirmations: 2 })
      .expect(200);
    // Only NEW deposits are refused from there.
    const address = await abroad(cdn.http().get('/deposits/address?network=arbitrum')).expect(451);
    expect(address.body.error.code).toBe('GEO_RESTRICTED');
  });

  it('a progressive DEMO deposit under deposits_blocked stays in Pending (held), then credits once lifted', async () => {
    const p = await newPlayer(t);
    const ref = await progressiveDeposit(t, p, '25.00');
    const restriction = await restrict(p, 'deposits_blocked');
    const held = await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 100 })
      .expect(200);
    expect(held.body.status).not.toBe('credited');
    expect(held.body.confirmations.current).toBe(held.body.confirmations.required);
    let bal = await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200);
    expect(bal.body).toMatchObject({ available: '0.00', pending: '25.00' });
    expect(
      await t.prisma.notification.count({ where: { userId: p.userId, type: 'deposit.held' } }),
    ).toBe(1);

    await t.prisma.userRestriction.update({
      where: { id: restriction.id },
      data: { liftedAt: new Date() },
    });
    const credited = await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 1 })
      .expect(200);
    expect(credited.body.status).toBe('credited');
    bal = await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200);
    expect(bal.body).toMatchObject({ available: '25.00', pending: '0.00' });
  });

  it('during a break a progressive DEMO deposit is held like an on-chain one (never credited to Available)', async () => {
    const p = await newPlayer(t);
    const ref = await progressiveDeposit(t, p, '15.00');
    await t
      .http()
      .post('/responsible-gaming/cooling-off')
      .set(bearer(p.token))
      .send({ duration: '24h', confirm: true })
      .expect(200);
    const res = await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 100 })
      .expect(200);
    expect(res.body.status).not.toBe('credited');
    const bal = await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200);
    expect(bal.body).toMatchObject({ available: '0.00', pending: '15.00' });
  });
});

describe('R50b an unknown admin email gives the same sequence as a real one, also in parallel', () => {
  const attempt = (email: string) =>
    t
      .http()
      .post('/admin/auth/login')
      .send({ email, password: 'Wrong-Password-1', totpCode: '000000' });
  const shape = (rs: request.Response[]) => ({
    unlocked401: rs.filter((r) => r.status === 401 && !r.body.error.details?.locked).length,
    locked401: rs.filter((r) => r.status === 401 && r.body.error.details?.locked === true).length,
    forbidden403: rs.filter((r) => r.status === 403).length,
  });

  it('8 parallel wrong logins: 4 × 401 + 1 × 401 locked + 3 × 403 for unknown and real emails', async () => {
    const real = await createAdmin(t, 'support');
    const known = shape(await Promise.all(Array.from({ length: 8 }, () => attempt(real.email))));
    expect(known).toEqual({ unlocked401: 4, locked401: 1, forbidden403: 3 });
    // Several bursts: the old GET → INCR → SET race showed up in most of them.
    for (let i = 0; i < 3; i++) {
      const email = `nobody-${uid()}@globalpool.test`;
      const unknown = shape(await Promise.all(Array.from({ length: 8 }, () => attempt(email))));
      expect(unknown, `burst ${i}`).toEqual(known);
    }
  });

  it('parallel reservations for one unknown email are atomic: exactly one locks, the rest wait', async () => {
    // Straight at the bookkeeping, so the requests really overlap (over HTTP the DB lookup spreads them out).
    const auth = t.app.get<
      AdminAuthService,
      {
        reserveUnknownEmailAttempt: (
          hash: string,
          now: Date,
        ) => Promise<{ lockedUntil: Date | null; lockedNow: boolean }>;
      }
    >(AdminAuthService);
    const hash = sha256Hex(`nobody-${uid()}@globalpool.test`);
    const now = new Date();
    const slots = await Promise.all(
      Array.from({ length: 8 }, () => auth.reserveUnknownEmailAttempt(hash, now)),
    );
    expect(slots.filter((s) => !s.lockedUntil)).toHaveLength(4);
    expect(slots.filter((s) => s.lockedNow)).toHaveLength(1);
    expect(slots.filter((s) => s.lockedUntil && !s.lockedNow)).toHaveLength(3);
  });

  it('the unknown-email counter does not reset after 24 h (sliding 30-day window)', async () => {
    const email = `nobody-${uid()}@globalpool.test`;
    await attempt(email).expect(401);
    const redis = t.app.get<Redis>(REDIS);
    const ttl = await redis.pttl(`gp:admin-login:unknown:${sha256Hex(email)}`);
    expect(ttl).toBeGreaterThan(29 * 86_400_000);
  });
});
