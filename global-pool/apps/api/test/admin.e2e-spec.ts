import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestAdmin,
  type TestApp,
} from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

describe('admin auth (separate from players: email + argon2id password + mandatory TOTP)', () => {
  let admin: TestAdmin;
  beforeAll(async () => {
    admin = await createAdmin(t, 'finance', 'A. Test Finance');
  });

  it('requires the TOTP code (schema) and rejects a wrong code / password with one generic message', async () => {
    const missing = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(400);
    expect(missing.body.error.code).toBe('VALIDATION_FAILED');
    const wrongCode = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: admin.email, password: admin.password, totpCode: '000000' })
      .expect(401);
    const wrongPassword = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: admin.email, password: 'nope-nope-nope', totpCode: await totp(admin.secret) })
      .expect(401);
    expect(wrongCode.body.error.message).toBe(wrongPassword.body.error.message);
    const unknown = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: `x-${uid()}@globalpool.test`, password: 'whatever-123', totpCode: '123456' })
      .expect(401);
    expect(unknown.body.error.message).toBe(wrongCode.body.error.message);
  });

  it('logs in with password + TOTP, rotates refresh tokens and revokes the family on reuse', async () => {
    const login = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: admin.email, password: admin.password, totpCode: await totp(admin.secret) })
      .expect(200);
    expect(login.body).toMatchObject({
      tokenType: 'Bearer',
      admin: { email: admin.email, roles: ['finance'] },
    });
    expect(login.body.admin.permissions).toContain('withdrawals.approve');
    await t.http().get('/admin/auth/me').set(bearer(login.body.accessToken)).expect(200);

    // a player token is not an admin token
    const player = await newPlayer(t, { onboard: false });
    await t.http().get('/admin/dashboard').set(bearer(player.token)).expect(401);

    const rotated = await t
      .http()
      .post('/admin/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    await t.http().get('/admin/auth/me').set(bearer(rotated.body.accessToken)).expect(200);
    // reuse of the first refresh token → whole family revoked
    await t
      .http()
      .post('/admin/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    await t.http().get('/admin/auth/me').set(bearer(rotated.body.accessToken)).expect(401);
  });

  it('locks the account after 5 failed attempts', async () => {
    const victim = await createAdmin(t, 'support');
    for (let i = 0; i < 5; i++) {
      await t
        .http()
        .post('/admin/auth/login')
        .send({ email: victim.email, password: 'wrong-password-1', totpCode: '123456' })
        .expect(401);
    }
    const locked = await t
      .http()
      .post('/admin/auth/login')
      .send({ email: victim.email, password: victim.password, totpCode: await totp(victim.secret) })
      .expect(403);
    expect(locked.body.error.details.lockedUntil).toBeTruthy();
  });
});

describe('admin RBAC, MFA re-auth and the hash-chained audit log', () => {
  it('applying a restriction needs permission + reason + MFA and writes an audit row', async () => {
    const compliance = await createAdmin(t, 'compliance', 'K. Test Compliance');
    const support = await createAdmin(t, 'support', 'R. Test Support');
    const player = await newPlayer(t);
    const token = await adminLogin(t, compliance, 0);

    const noMfa = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(token))
      .send({ type: 'gaming_blocked', reason: 'Suspicious play pattern' })
      .expect(400);
    expect(noMfa.body.error.code).toBe('VALIDATION_FAILED');

    const supportToken = await adminLogin(t, support, 0);
    const denied = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(supportToken))
      .send({
        type: 'gaming_blocked',
        reason: 'Suspicious play pattern',
        mfaCode: await totp(support.secret, 1),
      })
      .expect(403);
    expect(denied.body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: { missingPermissions: ['users.restrict'] },
    });

    const res = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(token))
      .send({
        type: 'gaming_blocked',
        reason: 'Suspicious play pattern',
        mfaCode: await totp(compliance.secret, 1),
      })
      .expect(201);
    const row = await t.prisma.auditLog.findFirst({
      where: { action: 'user.restriction.applied', targetId: player.userId },
    });
    expect(row).toMatchObject({
      actorType: 'admin',
      actorId: compliance.id,
      reason: 'Suspicious play pattern',
      outcome: 'success',
    });
    expect(row!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect((row!.metadata as Record<string, unknown>).restrictionId).toBe(res.body.id);

    // the restriction is enforced on gaming routes
    const round = await t
      .http()
      .post(`/pool/rounds/00000000-0000-4000-8000-000000000000/entries`)
      .set(bearer(player.token))
      .send({ entries: 1, idempotencyKey: `r-${uid()}` })
      .expect(403);
    expect(round.body.error.details.restriction).toBe('gaming_blocked');

    const verify = await t.http().get('/admin/audit-logs/verify').set(bearer(token)).expect(200);
    expect(verify.body).toMatchObject({ ok: true, firstBrokenSeq: null });
    const list = await t
      .http()
      .get('/admin/audit-logs?action=user.restriction')
      .set(bearer(token))
      .expect(200);
    expect(list.body.items[0]).toMatchObject({ action: 'user.restriction.applied' });

    // audit rows are append-only at the database level
    await expect(
      t.prisma.$executeRawUnsafe(`UPDATE audit_logs SET reason = 'edited' WHERE id = '${row!.id}'`),
    ).rejects.toThrow(/GP_APPEND_ONLY/);
  });

  it('flagged withdrawals need FOUR EYES: two different admins with MFA', async () => {
    const player = await newPlayer(t);
    await demoDeposit(t, player, '500.00');
    await t
      .http()
      .post('/dev/kyc/approve')
      .set(bearer(player.token))
      .send({ level: 'level_2' })
      .expect(200);
    const secret = await enrol2fa(t, player);
    const wd = await t
      .http()
      .post('/withdrawals')
      .set(bearer(player.token))
      .send({
        network: 'arbitrum',
        address: '0x3333333333333333333333333333333333333333',
        amount: '200.00',
        idempotencyKey: `wd-${uid()}`,
        totpCode: await totp(secret, 1),
      })
      .expect(201);
    expect(wd.body).toMatchObject({ status: 'under_review', requiresFourEyes: true });

    const a = await createAdmin(t, 'finance', 'A. First');
    const b = await createAdmin(t, 'compliance', 'B. Second');
    const ta = await adminLogin(t, a, 0);
    const first = await t
      .http()
      .post(`/admin/withdrawals/${wd.body.id}/approve`)
      .set(bearer(ta))
      .send({ reason: 'Destination verified with player', mfaCode: await totp(a.secret, 1) })
      .expect(200);
    expect(first.body).toMatchObject({
      status: 'under_review',
      fourEyes: { required: true, approvals: 1, of: 2 },
    });

    const same = await t
      .http()
      .post(`/admin/withdrawals/${wd.body.id}/approve`)
      .set(bearer(ta))
      .send({ reason: 'Approving again myself', mfaCode: '123456' })
      .expect(403);
    expect(same.body.error.message).toMatch(/different admin/);

    const queue = await t
      .http()
      .get('/admin/withdrawals?status=under_review')
      .set(bearer(ta))
      .expect(200);
    expect(
      queue.body.items.find((w: { id: string }) => w.id === wd.body.id).pendingApproval,
    ).toMatchObject({ approvals: 1, of: 2 });

    const tb = await adminLogin(t, b, 0);
    const second = await t
      .http()
      .post(`/admin/withdrawals/${wd.body.id}/approve`)
      .set(bearer(tb))
      .send({ reason: 'Second approval after review', mfaCode: await totp(b.secret, 1) })
      .expect(200);
    expect(second.body).toMatchObject({ status: 'queued', fourEyes: { approvals: 2, of: 2 } });

    const actions = await t.prisma.auditLog.findMany({
      where: { targetId: wd.body.id },
      orderBy: { seq: 'asc' },
    });
    expect(actions.map((x) => x.action)).toEqual(
      expect.arrayContaining(['withdrawal.approve.first', 'withdrawal.approve']),
    );

    // DEMO: simulate the on-chain confirmation → Locked released, chain clearing + network fee posted
    const done = await t
      .http()
      .post(`/dev/withdrawals/${wd.body.id}/simulate-confirm`)
      .set(bearer(player.token))
      .expect(200);
    expect(done.body.status).toBe('confirmed');
    const bal = (await t.http().get('/wallet/balances').set(bearer(player.token)).expect(200)).body;
    expect(bal).toMatchObject({ available: '300.00', locked: '0.00', total: '300.00' });
  });

  it('rejecting a withdrawal returns the funds and is audited', async () => {
    const player = await newPlayer(t);
    await demoDeposit(t, player, '100.00');
    await t
      .http()
      .post('/dev/kyc/approve')
      .set(bearer(player.token))
      .send({ level: 'level_1' })
      .expect(200);
    const secret = await enrol2fa(t, player);
    const wd = await t
      .http()
      .post('/withdrawals')
      .set(bearer(player.token))
      .send({
        network: 'arbitrum',
        address: '0x4444444444444444444444444444444444444444',
        amount: '50.00',
        idempotencyKey: `wd-${uid()}`,
        totpCode: await totp(secret, 1),
      })
      .expect(201);
    const a = await createAdmin(t, 'compliance');
    const ta = await adminLogin(t, a, 0);
    await t
      .http()
      .post(`/admin/withdrawals/${wd.body.id}/reject`)
      .set(bearer(ta))
      .send({ reason: 'Could not verify destination', mfaCode: await totp(a.secret, 1) })
      .expect(200);
    const bal = (await t.http().get('/wallet/balances').set(bearer(player.token)).expect(200)).body;
    expect(bal).toMatchObject({ available: '100.00', locked: '0.00' });
    expect(
      await t.prisma.auditLog.count({
        where: { action: 'withdrawal.reject', targetId: wd.body.id },
      }),
    ).toBe(1);
  });

  it('dashboard KPIs come from the ledger', async () => {
    const a = await createAdmin(t, 'read_only');
    const token = await adminLogin(t, a);
    const res = await t.http().get('/admin/dashboard').set(bearer(token)).expect(200);
    expect(res.body).toMatchObject({ windowDays: 30, ledger: { ok: true, ledgerTotal: '0.00' } });
    expect(res.body.platformFeesAllTime).toMatch(/^\d+\.\d{2,6}$/);
  });
});

describe('no admin capability to alter results, pick winners or edit the ledger', () => {
  it.each([
    ['post', '/admin/rounds/00000000-0000-4000-8000-000000000000/winner'],
    ['post', '/admin/rounds/1248/set-winner'],
    ['put', '/admin/rounds/1248/result'],
    ['post', '/admin/rounds/1248/settle'],
    ['patch', '/admin/ledger/entries/00000000-0000-4000-8000-000000000000'],
    ['post', '/admin/users/00000000-0000-4000-8000-000000000000/balance'],
  ] as const)('%s %s → 404', async (method, path) => {
    const a = await createAdmin(t, 'super_admin');
    const token = await adminLogin(t, a);
    const res = await t
      .http()
      [method](path)
      .set(bearer(token))
      .send({ winner: 'me', reason: 'test', mfaCode: '123456' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
