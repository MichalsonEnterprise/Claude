/**
 * Withdrawal close-out fixes: KYC daily limit under concurrency (R02), four-eyes second approval vs a concurrently
 * withdrawn first approval (R22) and expiry of stale first approvals (R23).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AuthAdmin } from '../src/common/request';
import { StepUpService } from '../src/modules/security/step-up.service';
import { WithdrawalsService } from '../src/modules/withdrawals/withdrawals.service';
import {
  bearer,
  createAdmin,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

let t: TestApp;
let withdrawals: WithdrawalsService;

beforeAll(async () => {
  t = await createTestApp();
  withdrawals = t.app.get(WithdrawalsService);
});
afterAll(async () => {
  await t?.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const meta = { ip: null, requestId: null };
const randomAddress = () => `0x${uid().padEnd(40, '7')}`;

async function asAuthAdmin(role: 'finance' | 'compliance', name: string): Promise<AuthAdmin> {
  const a = await createAdmin(t, role, name);
  return { id: a.id, email: a.email, name, roles: [role], permissions: [], sessionFamilyId: uid() };
}

async function kyc(p: TestPlayer, level: 'level_1' | 'level_2') {
  await t.http().post('/dev/kyc/approve').set(bearer(p.token)).send({ level }).expect(200);
}

/** A flagged (four-eyes) withdrawal under review. */
async function flaggedWithdrawal(): Promise<string> {
  const p = await newPlayer(t);
  await demoDeposit(t, p, '500.00');
  await kyc(p, 'level_2');
  const secret = await enrol2fa(t, p);
  const wd = await t
    .http()
    .post('/withdrawals')
    .set(bearer(p.token))
    .send({
      network: 'arbitrum',
      address: randomAddress(),
      amount: '200.00',
      idempotencyKey: `wd-${uid()}`,
      totpCode: await totp(secret, 1),
    })
    .expect(201);
  expect(wd.body).toMatchObject({ status: 'under_review', requiresFourEyes: true });
  return wd.body.id as string;
}

describe('KYC daily withdrawal limit under concurrency (R02)', () => {
  it('concurrent requests with different idempotency keys cannot together exceed the daily limit', async () => {
    const p = await newPlayer(t);
    await demoDeposit(t, p, '5000.00');
    await kyc(p, 'level_1'); // 2,000.00 per day
    // Step-up is proven elsewhere; here every request carries its own valid single-use proof.
    vi.spyOn(t.app.get(StepUpService), 'assert').mockResolvedValue(undefined as never);
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        t
          .http()
          .post('/withdrawals')
          .set(bearer(p.token))
          .send({
            network: 'arbitrum',
            address: randomAddress(),
            amount: '900.00',
            idempotencyKey: `wd-${uid()}`,
          }),
      ),
    );
    const ok = results.filter((r) => r.status === 201);
    const refused = results.filter((r) => r.status !== 201);
    expect(ok).toHaveLength(2);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.body.error.message).toMatch(/daily withdrawal limit/);
    const agg = await t.prisma.withdrawal.aggregate({
      where: { userId: p.userId },
      _sum: { amount: true },
    });
    expect(agg._sum.amount?.toFixed(2)).toBe('1800.00');
  });
});

describe('four-eyes withdrawal approvals (R22, R23)', () => {
  it('the first approval carries an expiry (FOUR_EYES_EXPIRY_HOURS)', async () => {
    const id = await flaggedWithdrawal();
    const a = await asAuthAdmin('finance', 'A. First');
    const first = await withdrawals.adminApprove(a, id, 'Destination verified', meta);
    expect(first).toMatchObject({ status: 'under_review', fourEyes: { approvals: 1, of: 2 } });
    const row = await t.prisma.adminApproval.findFirstOrThrow({
      where: { targetId: id, status: 'pending' },
    });
    const expiresAt = new Date((row.payload as { expiresAt: string }).expiresAt);
    expect(expiresAt.getTime() - row.createdAt.getTime()).toBeGreaterThan(3.9 * 3_600_000);
    expect(expiresAt.getTime() - row.createdAt.getTime()).toBeLessThan(4.1 * 3_600_000);
  });

  it('a stale first approval is expired and the next approval starts a new request — nothing is released', async () => {
    const id = await flaggedWithdrawal();
    const a = await asAuthAdmin('finance', 'A. Stale');
    const b = await asAuthAdmin('compliance', 'B. Weeks later');
    await withdrawals.adminApprove(a, id, 'First approval', meta);
    const stale = await t.prisma.adminApproval.findFirstOrThrow({
      where: { targetId: id, status: 'pending' },
    });
    // 24 days old
    await t.prisma.adminApproval.update({
      where: { id: stale.id },
      data: {
        payload: {
          ...(stale.payload as object),
          expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
        },
      },
    });
    const res = await withdrawals.adminApprove(b, id, 'Second approval much later', meta);
    expect(res).toMatchObject({ status: 'under_review', fourEyes: { approvals: 1, of: 2 } });
    expect((await t.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status).toBe(
      'under_review',
    );
    expect(
      (await t.prisma.adminApproval.findUniqueOrThrow({ where: { id: stale.id } })).status,
    ).toBe('expired');
    const fresh = await t.prisma.adminApproval.findFirstOrThrow({
      where: { targetId: id, status: 'pending' },
    });
    expect(fresh.requestedByAdminId).toBe(b.id);
    const audit = await t.prisma.auditLog.findFirst({
      where: { action: 'approval.expired', targetId: id },
    });
    expect(audit).toMatchObject({ actorType: 'system' });
  });

  it('a second approval racing the requester withdrawing the first one releases nothing', async () => {
    const id = await flaggedWithdrawal();
    const a = await asAuthAdmin('finance', 'A. Withdraws');
    const b = await asAuthAdmin('compliance', 'B. Approves');
    await withdrawals.adminApprove(a, id, 'First approval', meta);
    const pending = await t.prisma.adminApproval.findFirstOrThrow({
      where: { targetId: id, status: 'pending' },
    });

    // Interleave exactly like the race: B's transaction has read the pending approval, THEN A's withdraw commits
    // (FourEyesService.withdraw: CAS pending → cancelled on its own connection, without the withdrawal row lock).
    const prisma = t.prisma;
    const realTx = prisma.tx.bind(prisma);
    vi.spyOn(prisma, 'tx').mockImplementationOnce(((
      fn: (tx: unknown) => Promise<unknown>,
      opts?: unknown,
    ) =>
      realTx(
        (tx: Record<string, unknown>) =>
          fn(
            new Proxy(tx, {
              get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver) as Record<string, unknown>;
                if (prop !== 'adminApproval') return value;
                return new Proxy(value, {
                  get(delegate, key, r) {
                    const fnv = Reflect.get(delegate, key, r) as (
                      ...a: unknown[]
                    ) => Promise<unknown>;
                    if (key !== 'findFirst') return fnv;
                    return async (...args: unknown[]) => {
                      const found = await fnv.apply(delegate, args);
                      await prisma.adminApproval.updateMany({
                        where: { id: pending.id, status: 'pending' },
                        data: {
                          status: 'cancelled',
                          decidedByAdminId: a.id,
                          decidedAt: new Date(),
                        },
                      });
                      return found;
                    };
                  },
                });
              },
            }),
          ),
        opts as never,
      )) as never);

    const err = await withdrawals
      .adminApprove(b, id, 'Second approval', meta)
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'CONFLICT' });
    expect(JSON.stringify((err as { getResponse: () => unknown }).getResponse())).toMatch(
      /withdrawn or decided meanwhile/,
    );
    expect((await t.prisma.withdrawal.findUniqueOrThrow({ where: { id } })).status).toBe(
      'under_review',
    );
    expect(
      (await t.prisma.adminApproval.findUniqueOrThrow({ where: { id: pending.id } })).status,
    ).toBe('cancelled');
  });
});
