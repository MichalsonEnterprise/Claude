import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FeatureFlagsService } from '../src/modules/feature-flags/feature-flags.service';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  demoDeposit,
  newPlayer,
  openRound,
  totp,
  uid,
  type TestAdmin,
  type TestApp,
} from './helpers';

/**
 * admin-ops (admin-b): Finance (ADM-F1…F9), Global Pool monitoring (ADM-P1…P10) and Compliance (ADM-C1, C2).
 * Read endpoints are ledger aggregates; the writes are reviewed + audited workflow actions only.
 */
let t: TestApp;
let finance: TestAdmin;
let superAdmin: TestAdmin;
let compliance: TestAdmin;
let support: TestAdmin;
let financeToken: string;
let superToken: string;
let complianceToken: string;
let supportToken: string;

/** A fresh admin + token: each MFA re-auth below uses the NEXT time step of its own admin (replay protection). */
async function fresh(role: Parameters<typeof createAdmin>[1], name: string) {
  const admin = await createAdmin(t, role, name);
  return { admin, token: await adminLogin(t, admin, 0) };
}

beforeAll(async () => {
  t = await createTestApp();
  [finance, superAdmin, compliance, support] = await Promise.all([
    createAdmin(t, 'finance', 'F. Ops Finance'),
    createAdmin(t, 'super_admin', 'S. Ops Super'),
    createAdmin(t, 'compliance', 'C. Ops Compliance'),
    createAdmin(t, 'support', 'R. Ops Support'),
  ]);
  // Each admin logs in with the current step; later MFA re-auth uses the following steps (replay-protected).
  [financeToken, superToken, complianceToken, supportToken] = await Promise.all([
    adminLogin(t, finance, 0),
    adminLogin(t, superAdmin, 0),
    adminLogin(t, compliance, 0),
    adminLogin(t, support, 0),
  ]);
});
afterAll(async () => {
  await t?.close();
});

describe('finance read aggregates (ledger-derived, read-only)', () => {
  it('serves deposits, withdrawals, fees, pool accounting, ledger, reconciliation, refunds and reports', async () => {
    const player = await newPlayer(t);
    const dep = await demoDeposit(t, player, '250.00');

    const deposits = await t
      .http()
      .get(`/admin/finance/deposits?q=${dep.reference}`)
      .set(bearer(financeToken))
      .expect(200);
    expect(deposits.body.items).toHaveLength(1);
    expect(deposits.body.items[0]).toMatchObject({
      reference: dep.reference,
      amount: '250.00',
      status: 'credited',
    });
    expect(deposits.body.networks.length).toBeGreaterThan(0);

    const queue = await t
      .http()
      .get('/admin/finance/withdrawals')
      .set(bearer(financeToken))
      .expect(200);
    expect(queue.body).toMatchObject({ view: 'queue', policy: { slaHours: 4 } });
    expect(queue.body.summary).toHaveProperty('withinSlaPercent');

    const fees = await t.http().get('/admin/finance/fees').set(bearer(financeToken)).expect(200);
    expect(fees.body.rule.perEntry).toBe('0.05');
    expect(fees.body.series).toHaveLength(30);
    expect(fees.body.totals.subLedgerMatchesAccount).toBe(true);

    const acc = await t
      .http()
      .get('/admin/finance/pool-accounting')
      .set(bearer(financeToken))
      .expect(200);
    expect(acc.body.liabilities).toHaveProperty('total');

    const ledger = await t
      .http()
      .get(`/admin/finance/ledger?q=${dep.reference}`)
      .set(bearer(financeToken))
      .expect(200);
    expect(ledger.body.items.length).toBeGreaterThanOrEqual(1);
    for (const p of ledger.body.items as { debits: string; credits: string; balanced: boolean }[]) {
      expect(p.balanced).toBe(true);
      expect(p.debits).toBe(p.credits);
    }

    const integrity = await t
      .http()
      .get('/admin/finance/ledger/integrity')
      .set(bearer(financeToken))
      .expect(200);
    expect(integrity.body.appendOnly.ok).toBe(true);
    expect(integrity.body.balanced.ok).toBe(true);
    expect(integrity.body.journal.headHash).toMatch(/^[0-9a-f]{64}$/);

    const recon = await t
      .http()
      .get('/admin/finance/reconciliation')
      .set(bearer(financeToken))
      .expect(200);
    const total = recon.body.scopes.find((s: { key: string }) => s.key === 'ledger_total');
    expect(total).toMatchObject({ actual: '0.00', status: 'match' });

    await t.http().get('/admin/finance/refunds').set(bearer(financeToken)).expect(200);
    const rev = await t
      .http()
      .get('/admin/finance/reports?days=7')
      .set(bearer(financeToken))
      .expect(200);
    expect(rev.body.period.days).toBe(7);
  });

  it('enforces RBAC: support cannot read the ledger, compliance cannot read revenue', async () => {
    const denied = await t
      .http()
      .get('/admin/finance/ledger')
      .set(bearer(supportToken))
      .expect(403);
    expect(denied.body.error.details.missingPermissions).toEqual(['ledger.read']);
    await t.http().get('/admin/finance/reports').set(bearer(complianceToken)).expect(403);
    await t.http().get('/admin/finance/deposits').expect(401);
  });

  it('has no capability to edit ledger rows, balances, results or winners', async () => {
    await t
      .http()
      .patch('/admin/finance/ledger/00000000-0000-4000-8000-000000000000')
      .set(bearer(superToken))
      .send({})
      .expect(404);
    await t
      .http()
      .delete('/admin/finance/ledger/00000000-0000-4000-8000-000000000000')
      .set(bearer(superToken))
      .expect(404);
    await t
      .http()
      .post('/admin/pool/rounds/1248/winners')
      .set(bearer(superToken))
      .send({})
      .expect(404);
    await t
      .http()
      .post('/admin/finance/refunds/1245/manual')
      .set(bearer(superToken))
      .send({})
      .expect(404);
  });
});

describe('ADM-F9 CSV export (reason, PII permission, SHA-256, audit)', () => {
  it('needs a written reason and keeps personal data masked for Finance', async () => {
    const noReason = await t
      .http()
      .post('/admin/finance/exports')
      .set(bearer(financeToken))
      .send({ dataset: 'deposits' })
      .expect(400);
    expect(noReason.body.error.code).toBe('VALIDATION_FAILED');

    const pii = await t
      .http()
      .post('/admin/finance/exports')
      .set(bearer(financeToken))
      .send({ dataset: 'deposits', includePersonalData: true, reason: 'Monthly close export' })
      .expect(403);
    expect(pii.body.error.details.missingPermissions).toEqual(['users.pii.read']);

    const res = await t
      .http()
      .post('/admin/finance/exports')
      .set(bearer(financeToken))
      .send({
        dataset: 'deposits',
        reason: 'Monthly close export',
        reasonCategory: 'Monthly close',
      })
      .expect(201);
    expect(res.body.fileName).toMatch(/^globalpool-deposits-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(res.body.sha256).toBe(createHash('sha256').update(res.body.csv, 'utf8').digest('hex'));
    expect(res.body.csv.split('\r\n')[0]).toContain('personal data masked');
    expect(res.body.csv).not.toMatch(/@p_[0-9a-f]{10}/);

    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: {
        action: 'report.exported',
        actorId: (await t.prisma.adminUser.findUniqueOrThrow({ where: { email: finance.email } }))
          .id,
      },
      orderBy: { seq: 'desc' },
    });
    expect(audit.reason).toBe('Monthly close export');
    expect((audit.metadata as { sha256: string }).sha256).toBe(res.body.sha256);
  });
});

describe('ADM-P10 circuit breaker: NEW entries only, dual approval, reason + MFA, audited', () => {
  it('pauses and resumes new entries only after a second, different admin approves', async () => {
    const flags = t.app.get(FeatureFlagsService);
    const round = await openRound(t);
    const player = await newPlayer(t);
    await demoDeposit(t, player, '100.00');
    const [reqPause, reqResume, okPause, okResume] = await Promise.all([
      fresh('super_admin', 'S. Breaker A'),
      fresh('super_admin', 'S. Breaker B'),
      fresh('compliance', 'C. Breaker A'),
      fresh('compliance', 'C. Breaker B'),
    ]);

    // Support is not one of the dual-control roles (Super Admin, Finance, Compliance).
    const denied = await t
      .http()
      .post('/admin/pool/circuit-breaker')
      .set(bearer(supportToken))
      .send({ action: 'pause_new_entries', reason: 'Oracle incident drill', mfaCode: '000000' })
      .expect(403);
    expect(denied.body.error.details.allowedRoles).toEqual([
      'super_admin',
      'finance',
      'compliance',
    ]);

    const req = await t
      .http()
      .post('/admin/pool/circuit-breaker')
      .set(bearer(reqPause.token))
      .send({
        action: 'pause_new_entries',
        reason: 'Oracle incident drill',
        reasonCategory: 'Oracle / VRF incident',
        mfaCode: await totp(reqPause.admin.secret, 1),
      })
      .expect(201);
    expect(req.body).toMatchObject({ status: 'pending_approval', approvals: 1, of: 2 });
    expect(await flags.isEnabled('pool.entries.enabled')).toBe(true);

    // The requester can never give the second approval; nor can another admin of the SAME role, nor Support.
    const self = await t
      .http()
      .post(`/admin/pool/circuit-breaker/${req.body.approvalId}/decision`)
      .set(bearer(reqPause.token))
      .send({ decision: 'approve', reason: 'Self approval attempt', mfaCode: '000000' })
      .expect(403);
    expect(self.body.error.message).toMatch(/Four-eyes/);
    const sameRole = await t
      .http()
      .post(`/admin/pool/circuit-breaker/${req.body.approvalId}/decision`)
      .set(bearer(reqResume.token))
      .send({ decision: 'approve', reason: 'Same role approval attempt', mfaCode: '000000' })
      .expect(403);
    expect(sameRole.body.error.message).toMatch(/different role/);
    await t
      .http()
      .post(`/admin/pool/circuit-breaker/${req.body.approvalId}/decision`)
      .set(bearer(supportToken))
      .send({ decision: 'approve', reason: 'Support approval attempt', mfaCode: '000000' })
      .expect(403);

    try {
      const ok = await t
        .http()
        .post(`/admin/pool/circuit-breaker/${req.body.approvalId}/decision`)
        .set(bearer(okPause.token))
        .send({
          decision: 'approve',
          reason: 'Confirmed incident, pause sales',
          mfaCode: await totp(okPause.admin.secret, 1),
        })
        .expect(200);
      expect(ok.body).toMatchObject({ decision: 'approve', entriesEnabled: false });

      const blocked = await t
        .http()
        .post(`/pool/rounds/${round.id}/entries`)
        .set(bearer(player.token))
        .send({ entries: 1, idempotencyKey: `e-${uid()}` })
        .expect(503);
      expect(blocked.body.error.code).toBe('SERVICE_UNAVAILABLE');

      const state = await t
        .http()
        .get('/admin/pool/circuit-breaker')
        .set(bearer(financeToken))
        .expect(200);
      expect(state.body).toMatchObject({ state: 'paused', pending: null });
      expect(state.body.lastChange.by).toBe('C. Breaker A');
    } finally {
      // Resume (same dual approval) so other suites keep selling entries.
      const resume = await t
        .http()
        .post('/admin/pool/circuit-breaker')
        .set(bearer(reqResume.token))
        .send({
          action: 'resume_new_entries',
          reason: 'Incident closed, resume',
          mfaCode: await totp(reqResume.admin.secret, 1),
        })
        .expect(201);
      await t
        .http()
        .post(`/admin/pool/circuit-breaker/${resume.body.approvalId}/decision`)
        .set(bearer(okResume.token))
        .send({
          decision: 'approve',
          reason: 'Verified fix, resume sales',
          mfaCode: await totp(okResume.admin.secret, 1),
        })
        .expect(200);
    }
    expect(await flags.isEnabled('pool.entries.enabled')).toBe(true);
    const audits = await t.prisma.auditLog.findMany({
      where: { action: { startsWith: 'pool.circuit_breaker' }, targetId: 'pool.entries.enabled' },
      orderBy: { seq: 'desc' },
      take: 4,
    });
    expect(audits.map((a) => a.action)).toEqual([
      'pool.circuit_breaker.applied',
      'pool.circuit_breaker.requested',
      'pool.circuit_breaker.applied',
      'pool.circuit_breaker.requested',
    ]);
  });

  it('serves the read-only pool monitoring views', async () => {
    const round = await openRound(t);
    for (const path of [
      '/admin/pool/overview',
      '/admin/pool/balance',
      '/admin/pool/active-round',
      '/admin/pool/rounds',
      '/admin/pool/vrf',
      `/admin/pool/rounds/${round.number}/participants`,
      `/admin/pool/rounds/${round.number}/prizes`,
    ]) {
      const res = await t.http().get(path).set(bearer(financeToken));
      expect(res.status, path).toBe(200);
    }
    const prizes = await t
      .http()
      .get(`/admin/pool/rounds/${round.number}/prizes`)
      .set(bearer(financeToken))
      .expect(200);
    expect(prizes.body.breakdown.tiers).toHaveLength(4);
    expect(prizes.body.policy.cannot).toContain('Edit or choose a draw result');
  });
});

describe('ADM-C1 KYC decisions (reason + MFA, audited, notifies the player)', () => {
  it('approves a pending case, raises the level and refuses a second decision', async () => {
    const reviewer = await fresh('compliance', 'C. KYC Reviewer');
    const player = await newPlayer(t);
    await t
      .http()
      .post('/kyc/start')
      .set(bearer(player.token))
      .send({ level: 'level_1' })
      .expect(200);
    const record = await t.prisma.kycRecord.findFirstOrThrow({
      where: { userId: player.userId, status: 'pending' },
    });

    const queue = await t
      .http()
      .get(`/admin/compliance/kyc?q=${player.handle}`)
      .set(bearer(complianceToken))
      .expect(200);
    expect(queue.body.items.map((i: { id: string }) => i.id)).toContain(record.id);
    const detail = await t
      .http()
      .get(`/admin/compliance/kyc/${record.id}`)
      .set(bearer(complianceToken))
      .expect(200);
    expect(detail.body).toMatchObject({ canDecide: true, level: 'level_1' });

    await t
      .http()
      .post(`/admin/compliance/kyc/${record.id}/decision`)
      .set(bearer(supportToken))
      .send({ decision: 'approve', reason: 'Documents verified', mfaCode: '000000' })
      .expect(403);
    await t
      .http()
      .post(`/admin/compliance/kyc/${record.id}/decision`)
      .set(bearer(complianceToken))
      .send({ decision: 'approve', reason: 'ok' })
      .expect(400);

    const ok = await t
      .http()
      .post(`/admin/compliance/kyc/${record.id}/decision`)
      .set(bearer(reviewer.token))
      .send({
        decision: 'approve',
        reason: 'Documents verified against profile',
        reasonCategory: 'Documents verified',
        mfaCode: await totp(reviewer.admin.secret, 1),
      })
      .expect(200);
    expect(ok.body).toMatchObject({ status: 'verified', newLevel: 'level_1' });
    const profile = await t.prisma.userProfile.findUniqueOrThrow({
      where: { userId: player.userId },
    });
    expect(profile.kycLevel).toBe('level_1');
    const audit = await t.prisma.auditLog.findFirstOrThrow({
      where: { action: 'kyc.approve', targetId: record.id },
    });
    expect(audit.reason).toBe('Documents verified against profile');

    await t
      .http()
      .post(`/admin/compliance/kyc/${record.id}/decision`)
      .set(bearer(complianceToken))
      .send({ decision: 'reject', reason: 'Second decision attempt', mfaCode: '000000' })
      .expect(409);
  });

  it('lists AML alerts with a risk summary', async () => {
    const res = await t
      .http()
      .get('/admin/compliance/aml')
      .set(bearer(complianceToken))
      .expect(200);
    expect(res.body.summary).toHaveProperty('open');
    expect(res.body.actions.note).toMatch(/never move funds/);
  });
});
