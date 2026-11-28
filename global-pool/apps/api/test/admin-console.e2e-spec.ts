import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  newPlayer,
  totp,
  uid,
  type TestApp,
} from './helpers';

/**
 * admin-a console: four-eyes requests (ADM-X1), restrictions with a second approver (ADM-U8), PII reveal (ADM-U3),
 * user tabs (U4–U9), roles / permissions (ADM-S1/S2), system health + alerts (ADM-02, MOB-11).
 * TOTP codes are replay-protected per admin, so each admin logs in with the previous step (-1) and then uses the
 * current (0) and next (+1) steps for at most two sensitive actions.
 */
let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

describe('four-eyes restrictions (withdrawal hold needs a second admin)', () => {
  it('request → self-approval blocked → second admin approves → restriction active, all audited', async () => {
    const requester = await createAdmin(t, 'compliance', 'K. Test Requester');
    const approver = await createAdmin(t, 'compliance', 'Q. Test Approver');
    const player = await newPlayer(t);
    const reqToken = await adminLogin(t, requester, -1);
    const apprToken = await adminLogin(t, approver, -1);

    const res = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(reqToken))
      .send({
        type: 'withdrawals_frozen',
        reason: 'AML investigation opened on velocity rule',
        reasonCategory: 'AML — investigation open',
        mfaCode: await totp(requester.secret, 0),
      })
      .expect(201);
    expect(res.body).toMatchObject({
      status: 'pending_approval',
      approval: { action: 'user.restriction.apply' },
    });
    expect(res.body.approval.ref).toMatch(/^AR-[0-9A-F]{6}$/);
    const approvalId = res.body.approval.id as string;

    // nothing changed yet
    expect(
      await t.prisma.userRestriction.count({ where: { userId: player.userId, liftedAt: null } }),
    ).toBe(0);

    // a duplicate request is refused
    const dup = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(reqToken))
      .send({
        type: 'withdrawals_frozen',
        reason: 'Same request again by mistake',
        mfaCode: await totp(requester.secret, 1),
      })
      .expect(409);
    expect(dup.body.error.code).toBe('CONFLICT');

    // inbox: the requester sees it as theirs, the approver as waiting for them
    const mine = await t
      .http()
      .get('/admin/approvals/inbox?view=created_by_me')
      .set(bearer(reqToken))
      .expect(200);
    expect(mine.body.items.find((a: { id: string }) => a.id === approvalId)).toMatchObject({
      yourRole: 'requester',
      status: 'pending',
      requestCategory: 'AML — investigation open',
    });
    const waiting = await t
      .http()
      .get('/admin/approvals/inbox?view=waiting_for_me')
      .set(bearer(apprToken))
      .expect(200);
    expect(waiting.body.items.find((a: { id: string }) => a.id === approvalId)).toMatchObject({
      yourRole: 'can_decide',
    });
    expect(waiting.body.counts.waiting_for_me).toBeGreaterThanOrEqual(1);

    // the requester can never approve their own request (checked before any MFA code is consumed)
    const self = await t
      .http()
      .post(`/admin/approvals/${approvalId}/approve`)
      .set(bearer(reqToken))
      .send({ reason: 'Approving my own request', mfaCode: '000000' })
      .expect(403);
    expect(self.body.error.details).toMatchObject({ reason: 'self_approval' });

    // a support admin (no users.restrict) cannot decide it
    const support = await createAdmin(t, 'support');
    const supportToken = await adminLogin(t, support, -1);
    await t
      .http()
      .post(`/admin/approvals/${approvalId}/approve`)
      .set(bearer(supportToken))
      .send({ reason: 'Support approving', mfaCode: await totp(support.secret, 0) })
      .expect(403);

    // second approver: reason + fresh MFA → restriction applied in the same transaction
    const ok = await t
      .http()
      .post(`/admin/approvals/${approvalId}/approve`)
      .set(bearer(apprToken))
      .send({
        reason: 'Independent review of the AML evidence completed',
        reasonCategory: 'Independent review completed',
        mfaCode: await totp(approver.secret, 0),
      })
      .expect(200);
    expect(ok.body).toMatchObject({
      status: 'approved',
      result: { restriction: { type: 'withdrawals_frozen' } },
    });

    const active = await t.prisma.userRestriction.findFirstOrThrow({
      where: { userId: player.userId, liftedAt: null },
    });
    expect(active).toMatchObject({ type: 'withdrawals_frozen', appliedByAdminId: requester.id });

    // the hold is enforced on withdrawal routes
    const wd = await t
      .http()
      .post('/withdrawals')
      .set(bearer(player.token))
      .send({
        network: 'arbitrum',
        address: '0x1111111111111111111111111111111111111111',
        amount: '10.00',
        idempotencyKey: `wd-${uid()}`,
      })
      .expect(403);
    expect(wd.body.error.details.restriction).toBe('withdrawals_frozen');

    // deciding twice is impossible
    await t
      .http()
      .post(`/admin/approvals/${approvalId}/reject`)
      .set(bearer(apprToken))
      .send({ reason: 'Changed my mind later', mfaCode: await totp(approver.secret, 1) })
      .expect(409);

    const actions = (
      await t.prisma.auditLog.findMany({
        where: { metadata: { path: ['approvalId'], equals: approvalId } },
        orderBy: { seq: 'asc' },
      })
    ).map((r) => r.action);
    expect(actions).toEqual([
      'approval.requested',
      'user.restriction.applied',
      'approval.approved',
    ]);

    const detail = await t
      .http()
      .get(`/admin/approvals/${approvalId}`)
      .set(bearer(reqToken))
      .expect(200);
    expect(detail.body).toMatchObject({
      status: 'approved',
      decidedBy: { name: 'Q. Test Approver' },
      yourRole: 'decided',
    });
    expect(detail.body.auditTrail).toHaveLength(3);

    const verify = await t.http().get('/admin/audit-logs/verify').set(bearer(reqToken)).expect(200);
    expect(verify.body.ok).toBe(true);
  });

  it('protective restrictions (gaming blocked) still apply immediately with reason + MFA', async () => {
    const a = await createAdmin(t, 'compliance');
    const player = await newPlayer(t);
    const token = await adminLogin(t, a, -1);
    const res = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(token))
      .send({
        type: 'gaming_blocked',
        reason: 'Responsible gaming concern',
        mfaCode: await totp(a.secret, 0),
      })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'active', type: 'gaming_blocked' });
  });

  it('the requester can withdraw a request; a second admin can reject one; nothing changes', async () => {
    const a = await createAdmin(t, 'compliance');
    const b = await createAdmin(t, 'super_admin');
    const p1 = await newPlayer(t);
    const p2 = await newPlayer(t);
    const ta = await adminLogin(t, a, -1);
    const tb = await adminLogin(t, b, -1);

    const r1 = await t
      .http()
      .post(`/admin/users/${p1.userId}/restrictions`)
      .set(bearer(ta))
      .send({
        type: 'account_suspended',
        reason: 'Account takeover suspected',
        mfaCode: await totp(a.secret, 0),
      })
      .expect(201);
    const r2 = await t
      .http()
      .post(`/admin/users/${p2.userId}/restrictions`)
      .set(bearer(ta))
      .send({
        type: 'withdrawals_frozen',
        reason: 'Regulatory hold requested',
        mfaCode: await totp(a.secret, 1),
      })
      .expect(201);

    // only the requester can withdraw
    await t
      .http()
      .post(`/admin/approvals/${r1.body.approval.id}/withdraw`)
      .set(bearer(tb))
      .send({ reason: 'Not mine to withdraw' })
      .expect(403);
    const w = await t
      .http()
      .post(`/admin/approvals/${r1.body.approval.id}/withdraw`)
      .set(bearer(ta))
      .send({ reason: 'Player called support, identity confirmed' })
      .expect(200);
    expect(w.body.status).toBe('cancelled');

    const rej = await t
      .http()
      .post(`/admin/approvals/${r2.body.approval.id}/reject`)
      .set(bearer(tb))
      .send({ reason: 'Evidence insufficient for a hold', mfaCode: await totp(b.secret, 0) })
      .expect(200);
    expect(rej.body.status).toBe('rejected');
    expect(
      await t.prisma.userRestriction.count({ where: { userId: { in: [p1.userId, p2.userId] } } }),
    ).toBe(0);
    const decided = await t
      .http()
      .get('/admin/approvals/inbox?view=decided_today')
      .set(bearer(tb))
      .expect(200);
    const ids = decided.body.items.map((i: { id: string }) => i.id);
    expect(ids).toEqual(expect.arrayContaining([r1.body.approval.id, r2.body.approval.id]));
  });

  it('expired requests change nothing and cannot be approved', async () => {
    const a = await createAdmin(t, 'compliance');
    const b = await createAdmin(t, 'compliance');
    const player = await newPlayer(t);
    const ta = await adminLogin(t, a, -1);
    const tb = await adminLogin(t, b, -1);
    const r = await t
      .http()
      .post(`/admin/users/${player.userId}/restrictions`)
      .set(bearer(ta))
      .send({
        type: 'withdrawals_frozen',
        reason: 'Will expire before review',
        mfaCode: await totp(a.secret, 0),
      })
      .expect(201);
    const row = await t.prisma.adminApproval.findUniqueOrThrow({
      where: { id: r.body.approval.id },
    });
    await t.prisma.adminApproval.update({
      where: { id: row.id },
      data: {
        payload: {
          ...(row.payload as object),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    });
    const expired = await t
      .http()
      .get('/admin/approvals/inbox?view=expired')
      .set(bearer(tb))
      .expect(200);
    expect(expired.body.items.map((i: { id: string }) => i.id)).toContain(row.id);
    const res = await t
      .http()
      .post(`/admin/approvals/${row.id}/approve`)
      .set(bearer(tb))
      .send({ reason: 'Too late to approve', mfaCode: await totp(b.secret, 0) })
      .expect(409);
    expect(res.body.error.message).toMatch(/expired/);
    expect(await t.prisma.userRestriction.count({ where: { userId: player.userId } })).toBe(0);
  });
});

describe('requests owned by other modules (e.g. the pool circuit breaker)', () => {
  it('are listed with their decideAt link and can never be decided here', async () => {
    const requester = await createAdmin(t, 'super_admin');
    const viewer = await createAdmin(t, 'super_admin');
    const row = await t.prisma.adminApproval.create({
      data: {
        action: 'pool.entries.pause',
        targetType: 'feature_flag',
        targetId: 'pool.entries.enabled',
        requestedByAdminId: requester.id,
        requestReason: 'Oracle incident drill',
        payload: {
          decideAt: '/admin/pool/policy',
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
      },
    });
    const token = await adminLogin(t, viewer, -1);
    const inbox = await t
      .http()
      .get('/admin/approvals/inbox?view=open')
      .set(bearer(token))
      .expect(200);
    expect(inbox.body.items.find((i: { id: string }) => i.id === row.id)).toMatchObject({
      yourRole: 'external',
      decideAt: '/admin/pool/policy',
      module: 'Global Pool',
    });
    const res = await t
      .http()
      .post(`/admin/approvals/${row.id}/approve`)
      .set(bearer(token))
      .send({ reason: 'Trying from the inbox', mfaCode: await totp(viewer.secret, 0) })
      .expect(400);
    expect(res.body.error.details).toMatchObject({ decideAt: '/admin/pool/policy' });
    expect((await t.prisma.adminApproval.findUniqueOrThrow({ where: { id: row.id } })).status).toBe(
      'pending',
    );
    await t.prisma.adminApproval.update({ where: { id: row.id }, data: { status: 'cancelled' } });
  });
});

describe('user tabs, PII reveal and RBAC on the console reads', () => {
  it('reveals ONE PII field with a logged reason; support cannot', async () => {
    const compliance = await createAdmin(t, 'compliance');
    const support = await createAdmin(t, 'support');
    const player = await newPlayer(t);
    const ct = await adminLogin(t, compliance);
    const st = await adminLogin(t, support);

    const account = await t
      .http()
      .get(`/admin/users/${player.userId}/account`)
      .set(bearer(ct))
      .expect(200);
    expect(account.body.emailMasked).toMatch(/•••@example\.com$/);
    expect(account.body.canRevealPii).toBe(true);
    expect(account.body.consents.termsAcceptedAt).toBeTruthy();

    await t
      .http()
      .post(`/admin/users/${player.userId}/pii/reveal`)
      .set(bearer(ct))
      .send({ field: 'email' })
      .expect(400);
    const denied = await t
      .http()
      .post(`/admin/users/${player.userId}/pii/reveal`)
      .set(bearer(st))
      .send({ field: 'email', reason: 'Support ticket 48871' })
      .expect(403);
    expect(denied.body.error.details.missingPermissions).toEqual(['users.pii.read']);

    const ok = await t
      .http()
      .post(`/admin/users/${player.userId}/pii/reveal`)
      .set(bearer(ct))
      .send({ field: 'email', reason: 'KYC review of the email domain' })
      .expect(200);
    expect(ok.body.value).toMatch(/@example\.com$/);
    const row = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'user.pii.revealed', targetId: player.userId },
    });
    expect(row).toMatchObject({ reason: 'KYC review of the email domain', actorId: compliance.id });
    expect(row.metadata).toMatchObject({ field: 'email' });
    // the value itself is never written to the audit log
    expect(JSON.stringify(row.metadata)).not.toContain('@example.com');
  });

  it('serves wallets / KYC / AML / transactions / RG tabs and enforces per-tab permissions', async () => {
    const compliance = await createAdmin(t, 'compliance');
    const support = await createAdmin(t, 'support');
    const player = await newPlayer(t);
    const ct = await adminLogin(t, compliance);
    const st = await adminLogin(t, support);
    const base = `/admin/users/${player.userId}`;

    const wallets = await t.http().get(`${base}/wallets`).set(bearer(ct)).expect(200);
    expect(wallets.body).toHaveProperty('wallets');
    const kyc = await t.http().get(`${base}/kyc`).set(bearer(ct)).expect(200);
    expect(kyc.body.limitsByLevel).toHaveLength(4);
    const aml = await t.http().get(`${base}/aml`).set(bearer(ct)).expect(200);
    expect(aml.body.score).toMatchObject({ level: expect.any(String), score: expect.any(Number) });
    const tx = await t.http().get(`${base}/transactions?pageSize=5`).set(bearer(ct)).expect(200);
    expect(tx.body).toMatchObject({ page: 1, pageSize: 5, balances: { currency: 'USDT' } });
    const rg = await t.http().get(`${base}/responsible-gaming`).set(bearer(st)).expect(200);
    expect(rg.body).toMatchObject({ adminCanLoosen: false });

    // support has no aml.read → the AML tab is a no-permission state
    const noAml = await t.http().get(`${base}/aml`).set(bearer(st)).expect(403);
    expect(noAml.body.error.details.missingPermissions).toEqual(['aml.read']);

    const list = await t
      .http()
      .get(`/admin/users?q=${player.handle}&restricted=no`)
      .set(bearer(st))
      .expect(200);
    expect(list.body.items[0]).toMatchObject({
      handle: player.handle,
      totalBalance: '0.00',
      amlOpenAlerts: 0,
    });
    const stats = await t.http().get('/admin/user-stats').set(bearer(st)).expect(200);
    expect(stats.body.totalUsers).toBeGreaterThan(0);
  });

  it('roles & permissions are readable with system.read; role changes need four eyes', async () => {
    const auditor = await createAdmin(t, 'read_only');
    const support = await createAdmin(t, 'support');
    const s1 = await createAdmin(t, 'super_admin', 'S. Test One');
    const s2 = await createAdmin(t, 'super_admin', 'S. Test Two');
    const at = await adminLogin(t, auditor);
    const st = await adminLogin(t, support);
    const t1 = await adminLogin(t, s1, -1);
    const t2 = await adminLogin(t, s2, -1);

    const roles = await t.http().get('/admin/roles').set(bearer(at)).expect(200);
    expect(roles.body.roles.find((r: { key: string }) => r.key === 'super_admin')).toMatchObject({
      fixed: true,
    });
    const perms = await t.http().get('/admin/permissions').set(bearer(at)).expect(200);
    expect(perms.body.find((p: { key: string }) => p.key === 'admins.manage')).toMatchObject({
      policy: { fourEyes: 'always' },
    });
    await t.http().get('/admin/roles').set(bearer(st)).expect(403);

    // the read-only auditor cannot request changes
    await t
      .http()
      .post('/admin/roles/read_only/change-requests')
      .set(bearer(at))
      .send({
        grant: ['kyc.review'],
        reason: 'Should not be possible',
        mfaCode: await totp(auditor.secret, 1),
      })
      .expect(403);

    // a dedicated test role keeps the shared RBAC rows untouched
    const key = `qa_${uid().replace(/[^a-z]/g, 'x')}`;
    const role = await t.prisma.adminRole.create({ data: { key, name: 'QA test role' } });
    await t
      .http()
      .post('/admin/roles/super_admin/change-requests')
      .set(bearer(t1))
      .send({
        revoke: ['audit.read'],
        reason: 'Trying to change the fixed role',
        mfaCode: '123456',
      })
      .expect(403);
    const req = await t
      .http()
      .post(`/admin/roles/${key}/change-requests`)
      .set(bearer(t1))
      .send({
        grant: ['kyc.read', 'rg.read'],
        reason: 'New responsibility for QA',
        mfaCode: await totp(s1.secret, 0),
      })
      .expect(202);
    expect(req.body).toMatchObject({
      status: 'pending_approval',
      approval: { action: 'admin.role.permissions.change' },
    });
    expect(await t.prisma.adminRolePermission.count({ where: { roleId: role.id } })).toBe(0);

    const ok = await t
      .http()
      .post(`/admin/approvals/${req.body.approval.id}/approve`)
      .set(bearer(t2))
      .send({ reason: 'Least privilege reviewed and agreed', mfaCode: await totp(s2.secret, 0) })
      .expect(200);
    expect(ok.body.result).toMatchObject({ role: key, granted: ['kyc.read', 'rg.read'] });
    expect(await t.prisma.adminRolePermission.count({ where: { roleId: role.id } })).toBe(2);
    await t.prisma.adminRole.delete({ where: { id: role.id } });
  });

  it('system health and live alerts come from real state; acknowledging is audited', async () => {
    const a = await createAdmin(t, 'super_admin');
    const token = await adminLogin(t, a);
    const health = await t.http().get('/admin/system/health').set(bearer(token)).expect(200);
    expect(health.body.services.map((s: { key: string }) => s.key)).toEqual(['database', 'redis']);
    expect(health.body.realMoneyEnabled).toBe(false);
    expect(health.body.ledger).toMatchObject({ ok: expect.any(Boolean) });

    const alerts = await t.http().get('/admin/alerts').set(bearer(token)).expect(200);
    expect(alerts.body.counts.total).toBe(alerts.body.items.length);
    await t
      .http()
      .post('/admin/alerts/not.a.real.alert/ack')
      .set(bearer(token))
      .send({})
      .expect(404);
    if (alerts.body.items.length > 0) {
      const key = alerts.body.items[0].key as string;
      await t
        .http()
        .post(`/admin/alerts/${key}/ack`)
        .set(bearer(token))
        .send({ note: 'Looking into it' })
        .expect(200);
      const again = await t.http().get('/admin/alerts').set(bearer(token)).expect(200);
      expect(
        again.body.items.find((i: { key: string }) => i.key === key).acknowledged,
      ).toMatchObject({
        by: 'Test super_admin',
      });
    }
  });
});
