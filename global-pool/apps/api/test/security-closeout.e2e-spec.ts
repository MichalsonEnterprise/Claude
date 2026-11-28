import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { sha256Hex } from '../src/common/crypto';
import { FeatureFlagsService } from '../src/modules/feature-flags/feature-flags.service';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestApp,
} from './helpers';

/**
 * Close-out (api-b): auth, admin and test-infra fixes — R04 R17 R18 R19 R45 R50 R51 R54.
 * Every test here failed on the code before its fix.
 */
let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const ENTRIES_FLAG = 'pool.entries.enabled';

describe('R17 lockout counters are atomic (no stale read-modify-write)', () => {
  it('parallel wrong step-up codes are each counted and the lock holds against a correct code', async () => {
    const p = await newPlayer(t);
    const secret = await enrol2fa(t, p);
    const wrong = () =>
      t
        .http()
        .post('/auth/2fa/challenge')
        .set(bearer(p.token))
        .send({ purpose: 'withdrawal', code: '000000' });

    // 4 parallel guesses: before the fix every request read failedAttempts=0 and wrote 1.
    const first = await Promise.all(Array.from({ length: 4 }, wrong));
    expect(first.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    const row = await t.prisma.totpSecret.findUniqueOrThrow({ where: { userId: p.userId } });
    expect(row.failedAttempts).toBe(4);
    expect(
      first.map((r) => r.body.error.details.attemptsRemaining as number).sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4]);

    // 3 more in parallel: the 5th attempt locks, the others are refused without being checked.
    const second = await Promise.all(Array.from({ length: 3 }, wrong));
    expect(second.map((r) => r.status)).toEqual([423, 423, 423]);
    const locked = await t.prisma.totpSecret.findUniqueOrThrow({ where: { userId: p.userId } });
    expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);

    // A correct code during the lock is not even checked (and cannot clear the lock).
    const ok = await t
      .http()
      .post('/auth/2fa/challenge')
      .set(bearer(p.token))
      .send({ purpose: 'withdrawal', code: await totp(secret, 1) })
      .expect(423);
    expect(ok.body.error.code).toBe('STEP_UP_LOCKED');
    const after = await t.prisma.totpSecret.findUniqueOrThrow({ where: { userId: p.userId } });
    expect(after.lockedUntil?.getTime()).toBe(locked.lockedUntil!.getTime());
  });

  it('parallel wrong admin passwords lock the account after 5 attempts', async () => {
    const a = await createAdmin(t, 'support');
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        t
          .http()
          .post('/admin/auth/login')
          .send({ email: a.email, password: 'Wrong-Password-1', totpCode: '000000' }),
      ),
    );
    // 5 counted failures (the 5th carries `locked`), the rest answer the lock without being checked.
    expect(results.filter((r) => r.status === 401)).toHaveLength(5);
    expect(results.filter((r) => r.status === 401 && r.body.error.details?.locked)).toHaveLength(1);
    expect(results.filter((r) => r.status === 403)).toHaveLength(3);
    const row = await t.prisma.adminUser.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    // Even the right password + code is refused while locked.
    await t
      .http()
      .post('/admin/auth/login')
      .send({ email: a.email, password: a.password, totpCode: await totp(a.secret) })
      .expect(403);
  });
});

describe('R50 admin login reveals neither a correct password nor which emails exist', () => {
  it('a locked TOTP factor + the right password answers the generic 401, not 423', async () => {
    const a = await createAdmin(t, 'support');
    await t.prisma.totpSecret.update({
      where: { adminUserId: a.id },
      data: { lockedUntil: new Date(Date.now() + 10 * 60_000), failedAttempts: 0 },
    });
    const wrongPw = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: a.email, password: 'Wrong-Password-1', totpCode: await totp(a.secret) })
      .expect(401);
    const rightPw = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: a.email, password: a.password, totpCode: await totp(a.secret) })
      .expect(401);
    expect(rightPw.body.error).toMatchObject({
      code: 'UNAUTHENTICATED',
      message: wrongPw.body.error.message,
    });
    // ...and the attempt is counted like any other failure.
    expect(
      (await t.prisma.adminUser.findUniqueOrThrow({ where: { id: a.id } })).failedLoginAttempts,
    ).toBe(2);
  });

  it('an unknown email locks after the same number of attempts as a real account', async () => {
    const email = `nobody-${uid()}@globalpool.test`;
    const real = await createAdmin(t, 'support');
    const attempt = (e: string) =>
      t
        .http()
        .post('/admin/auth/login')
        .send({ email: e, password: 'Wrong-Password-1', totpCode: '000000' });
    const shape = async (e: string) => {
      const out: { status: number; locked: boolean; hasUntil: boolean }[] = [];
      for (let i = 0; i < 6; i++) {
        const r = await attempt(e);
        out.push({
          status: r.status,
          locked: r.body.error.details?.locked === true,
          hasUntil: typeof r.body.error.details?.lockedUntil === 'string',
        });
      }
      return out;
    };
    const unknown = await shape(email);
    const known = await shape(real.email);
    expect(unknown).toEqual(known);
    expect(unknown.at(-1)).toEqual({ status: 403, locked: false, hasUntil: true });
  });
});

describe('R04 the admin login audit row never carries the raw session family id', () => {
  it('stores a hashed session reference instead of the access-token sid', async () => {
    const a = await createAdmin(t, 'read_only');
    await adminLogin(t, a);
    const session = await t.prisma.session.findFirstOrThrow({ where: { adminUserId: a.id } });
    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'admin.login', actorId: a.id },
      orderBy: { seq: 'desc' },
    });
    const meta = audit.metadata as Record<string, unknown>;
    expect(meta.familyId).toBeUndefined();
    expect(JSON.stringify(meta)).not.toContain(session.familyId!);
    expect(audit.targetId).not.toBe(session.familyId);
    expect(meta.sessionRef).toBe(`as_${sha256Hex(session.familyId!).slice(0, 16)}`);
  });
});

describe('R19 server-side admin idle timeout', () => {
  it('refuses to refresh an idle session and revokes its family', async () => {
    const a = await createAdmin(t, 'support');
    const login = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: a.email, password: a.password, totpCode: await totp(a.secret) })
      .expect(200);
    // Active use keeps it alive: a refresh right away works.
    const fresh = await t
      .http()
      .post('/admin/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    // The tab is closed: no admin request for 16 minutes.
    await t.prisma.session.updateMany({
      where: { adminUserId: a.id, rotatedAt: null },
      data: { lastSeenAt: new Date(Date.now() - 16 * 60_000) },
    });
    const idle = await t
      .http()
      .post('/admin/auth/refresh')
      .send({ refreshToken: fresh.body.refreshToken })
      .expect(401);
    expect(idle.body.error.details).toMatchObject({ reason: 'idle_timeout' });
    const live = await t.prisma.session.count({ where: { adminUserId: a.id, revokedAt: null } });
    expect(live).toBe(0);
  });

  it('refuses an access token of an idle session and keeps active sessions fresh', async () => {
    const a = await createAdmin(t, 'support');
    const token = await adminLogin(t, a);
    await t.http().get('/admin/auth/me').set(bearer(token)).expect(200);
    await t.prisma.session.updateMany({
      where: { adminUserId: a.id },
      data: { lastSeenAt: new Date(Date.now() - 5 * 60_000) },
    });
    await t.http().get('/admin/auth/me').set(bearer(token)).expect(200);
    const seen = await t.prisma.session.findFirstOrThrow({
      where: { adminUserId: a.id, rotatedAt: null },
    });
    expect(Date.now() - seen.lastSeenAt.getTime()).toBeLessThan(30_000);

    await t.prisma.session.updateMany({
      where: { adminUserId: a.id },
      data: { lastSeenAt: new Date(Date.now() - 16 * 60_000) },
    });
    const res = await t.http().get('/admin/auth/me').set(bearer(token)).expect(401);
    expect(res.body.error.details).toMatchObject({ reason: 'idle_timeout' });
  });
});

describe('R18 four-eyes inbox and detail follow the module read permission', () => {
  it('hides a pending account restriction from roles without users.read', async () => {
    const [compliance, marketing, superAdmin] = await Promise.all([
      createAdmin(t, 'compliance'),
      createAdmin(t, 'marketing'),
      createAdmin(t, 'super_admin'),
    ]);
    const [cToken, mToken, sToken] = await Promise.all([
      adminLogin(t, compliance),
      adminLogin(t, marketing),
      adminLogin(t, superAdmin),
    ]);
    const player = await newPlayer(t);
    const req = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(cToken))
      .send({
        type: 'withdrawals_frozen',
        reason: 'AML investigation opened for this player',
        mfaCode: await totp(compliance.secret, 1),
      })
      .expect(201);
    const approvalId = req.body.approval.id as string;

    const seen = await t
      .http()
      .get('/admin/approvals/inbox?view=open')
      .set(bearer(sToken))
      .expect(200);
    expect(seen.body.items.map((i: { id: string }) => i.id)).toContain(approvalId);

    const hidden = await t
      .http()
      .get('/admin/approvals/inbox?view=open')
      .set(bearer(mToken))
      .expect(200);
    expect(hidden.body.items.map((i: { id: string }) => i.id)).not.toContain(approvalId);
    expect(
      hidden.body.items.filter((i: { action: string }) =>
        ['user.restriction.apply', 'withdrawal.approve', 'admin.role.permissions.change'].includes(
          i.action,
        ),
      ),
    ).toEqual([]);
    const detail = await t
      .http()
      .get(`/admin/approvals/${approvalId}`)
      .set(bearer(mToken))
      .expect(403);
    expect(detail.body.error.details.missingPermissions).toEqual(['users.read']);
    expect(JSON.stringify(detail.body)).not.toContain('AML investigation');

    // Leave nothing pending behind: the requester withdraws it.
    await t
      .http()
      .post(`/admin/approvals/${approvalId}/withdraw`)
      .set(bearer(cToken))
      .send({ reason: 'Test clean-up, not needed' })
      .expect(200);
  });
});

describe('R51 AML alert resolution: one transaction with its audit row, never re-decided', () => {
  it('decides an open alert once (audited) and refuses to re-decide a closed one', async () => {
    const [compliance, second] = await Promise.all([
      createAdmin(t, 'compliance'),
      createAdmin(t, 'compliance'),
    ]);
    const [token, secondToken] = await Promise.all([
      adminLogin(t, compliance),
      adminLogin(t, second),
    ]);
    const player = await newPlayer(t);
    const alert = await t.prisma.amlAlert.create({
      data: { userId: player.userId, riskLevel: 'medium', rule: 'velocity', status: 'open' },
    });
    const res = await t
      .http()
      .post(`/admin/aml/alerts/${alert.id}/resolve`)
      .set(bearer(token))
      .send({
        resolution: 'dismissed',
        reason: 'Velocity explained by payroll',
        mfaCode: await totp(compliance.secret, 1),
      })
      .expect(200);
    expect(res.body).toMatchObject({ id: alert.id, status: 'dismissed' });
    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'aml.alert.resolved', targetId: alert.id },
    });
    expect(audit.metadata).toMatchObject({ resolution: 'dismissed', previousStatus: 'open' });

    const again = await t
      .http()
      .post(`/admin/aml/alerts/${alert.id}/resolve`)
      .set(bearer(secondToken))
      .send({
        resolution: 'escalated',
        reason: 'Trying to re-decide a closed alert',
        mfaCode: await totp(second.secret, 1),
      })
      .expect(409);
    expect(again.body.error.details).toMatchObject({ status: 'dismissed' });
    const row = await t.prisma.amlAlert.findUniqueOrThrow({ where: { id: alert.id } });
    expect(row.status).toBe('dismissed');
    expect(
      await t.prisma.auditLog.count({ where: { action: 'aml.alert.resolved', targetId: alert.id } }),
    ).toBe(1);
  });
});

describe('R54 circuit-breaker request expiry is guarded and audited', () => {
  const repair = async () => {
    await t.prisma.featureFlag.upsert({
      where: { key: ENTRIES_FLAG },
      create: { key: ENTRIES_FLAG, enabled: true, description: 'Players can buy Global Pool entries' },
      update: { enabled: true },
    });
    await t.prisma.adminApproval.updateMany({
      where: { targetType: 'feature_flag', targetId: ENTRIES_FLAG, status: 'pending' },
      data: { status: 'expired' },
    });
    t.app.get(FeatureFlagsService).invalidate();
  };
  afterEach(repair);

  it('an expired request is never approved and its expiry writes an audit row', async () => {
    await repair();
    const [finance, compliance] = await Promise.all([
      createAdmin(t, 'finance'),
      createAdmin(t, 'compliance'),
    ]);
    const [fToken, cToken] = await Promise.all([adminLogin(t, finance), adminLogin(t, compliance)]);
    const req = await t
      .http()
      .post('/admin/pool/circuit-breaker')
      .set(bearer(fToken))
      .send({
        action: 'pause_new_entries',
        reason: 'Expiry test request',
        mfaCode: await totp(finance.secret, 1),
      })
      .expect(201);
    const id = req.body.approvalId as string;
    // 31 minutes later (TTL 30).
    await t.prisma.adminApproval.update({
      where: { id },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    });
    const late = await t
      .http()
      .post(`/admin/pool/circuit-breaker/${id}/decision`)
      .set(bearer(cToken))
      .send({ decision: 'approve', reason: 'Too late approval', mfaCode: '000000' })
      .expect(409);
    expect(late.body.error.message).toMatch(/expired/);
    expect((await t.prisma.adminApproval.findUniqueOrThrow({ where: { id } })).status).toBe(
      'expired',
    );
    expect(await t.app.get(FeatureFlagsService).isEnabled(ENTRIES_FLAG)).toBe(true);
    const audits = await t.prisma.auditLog.findMany({
      where: { action: 'approval.expired', metadata: { path: ['approvalId'], equals: id } },
    });
    expect(audits).toHaveLength(1);
  });

  it('a new request expires the lapsed one exactly once (audited) and never overwrites a decision', async () => {
    await repair();
    const [a1, a2] = await Promise.all([createAdmin(t, 'finance'), createAdmin(t, 'finance')]);
    const [t1, t2] = await Promise.all([adminLogin(t, a1), adminLogin(t, a2)]);
    const first = await t
      .http()
      .post('/admin/pool/circuit-breaker')
      .set(bearer(t1))
      .send({
        action: 'pause_new_entries',
        reason: 'First request (lapses)',
        mfaCode: await totp(a1.secret, 1),
      })
      .expect(201);
    await t.prisma.adminApproval.update({
      where: { id: first.body.approvalId as string },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    });
    const second = await t
      .http()
      .post('/admin/pool/circuit-breaker')
      .set(bearer(t2))
      .send({
        action: 'pause_new_entries',
        reason: 'Second request after expiry',
        mfaCode: await totp(a2.secret, 1),
      })
      .expect(201);
    expect(second.body.approvalId).not.toBe(first.body.approvalId);
    expect(
      (await t.prisma.adminApproval.findUniqueOrThrow({ where: { id: first.body.approvalId } }))
        .status,
    ).toBe('expired');
    expect(
      await t.prisma.auditLog.count({
        where: {
          action: 'approval.expired',
          metadata: { path: ['approvalId'], equals: first.body.approvalId },
        },
      }),
    ).toBe(1);
  });
});

describe('R45 ensureRbac tolerates roles that are not built in', () => {
  it('createAdmin works while a custom (qa_) role exists', async () => {
    const key = `qa_${uid().replace(/[^a-z]/g, 'x')}`;
    const role = await t.prisma.adminRole.create({ data: { key, name: 'QA custom role' } });
    try {
      const a = await createAdmin(t, 'support');
      expect(a.id).toBeTruthy();
    } finally {
      await t.prisma.adminRole.deleteMany({ where: { id: role.id } });
    }
  });
});
