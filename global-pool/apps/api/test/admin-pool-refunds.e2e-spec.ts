import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import { RoundsService } from '../src/modules/pool/rounds.service';
import {
  adminLogin,
  bearer,
  createAdmin,
  createTestApp,
  demoDeposit,
  newPlayer,
  uid,
  type TestApp,
} from './helpers';

/**
 * Q08 (close-out pass 2): the Global Pool section's Refunds page (ADM-P9) is gated on rounds.read, so its data must be
 * readable with rounds.read — GET /admin/pool/refunds — while the finance view (with returned withdrawals) keeps
 * needing ledger.read. Read-only: nothing here can create, edit or pay a refund.
 */
let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

describe('GET /admin/pool/refunds (rounds.read)', () => {
  it('serves cancelled-round refund status to every rounds.read role, without the finance-only rows', async () => {
    // A cancelled round with one entrant (threshold not met → stakes refunded to Owed). Without an explicit number it
    // gets the next (highest) one, so it is among the "20 most recent cancelled rounds" of the view.
    const carol = await newPlayer(t);
    await demoDeposit(t, carol, '100.00');
    const now = Date.now();
    const round = await t.app.get(RoundsService).open({
      opensAt: new Date(now - 60_000),
      closesAt: new Date(now + 3_600_000),
    });
    await t
      .http()
      .post(`/pool/rounds/${round.id}/entries`)
      .set(bearer(carol.token))
      .send({ entries: 3, idempotencyKey: `q08-${uid()}` })
      .expect(201);
    const lifecycle = t.app.get(RoundLifecycleService);
    await lifecycle.close(round.id);
    expect(await lifecycle.startDraw(round.id)).toBe('cancelled');

    const [support, compliance, marketing] = await Promise.all([
      createAdmin(t, 'support', 'Q08 Support'),
      createAdmin(t, 'compliance', 'Q08 Compliance'),
      createAdmin(t, 'marketing', 'Q08 Marketing'),
    ]);
    const [supportToken, complianceToken, marketingToken] = await Promise.all([
      adminLogin(t, support),
      adminLogin(t, compliance),
      adminLogin(t, marketing),
    ]);

    for (const token of [supportToken, complianceToken]) {
      // The finance view stays behind ledger.read (neither role has it) …
      const finance = await t.http().get('/admin/finance/refunds').set(bearer(token)).expect(403);
      expect(finance.body.error.details.missingPermissions).toEqual(['ledger.read']);
      // … the pool view is open to rounds.read.
      const res = await t.http().get('/admin/pool/refunds').set(bearer(token)).expect(200);
      expect(Object.keys(res.body).sort()).toEqual(['generatedAt', 'policy', 'rounds', 'totals']);
      expect(res.body).not.toHaveProperty('notRefunds');
      expect(res.body.policy).toMatch(/no manual refund/i);
      const mine = (res.body.rounds as { number: number }[]).find((r) => r.number === round.number);
      expect(mine).toMatchObject({
        number: round.number,
        entries: 3,
        stakes: '30.00',
        refundedToOwed: '30.00',
      });
    }

    // Without rounds.read there is no pool view either.
    const denied = await t
      .http()
      .get('/admin/pool/refunds')
      .set(bearer(marketingToken))
      .expect(403);
    expect(denied.body.error.details.missingPermissions).toEqual(['rounds.read']);
    await t.http().get('/admin/pool/refunds').expect(401);
  });
});
