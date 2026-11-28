/**
 * Q25 — a brand-new, non-whitelisted destination must not bypass the 24 h whitelist cool-down unreviewed. Platform
 * rule (stated in docs/API.md → Withdrawal): such a withdrawal always goes to FOUR-EYES review, whatever the AML
 * provider decides; a whitelisted address still in its cool-down is refused outright.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MockAmlProvider } from '../src/modules/aml/aml.provider';
import {
  bearer,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestApp,
} from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const randomAddress = () => `0x${uid().padEnd(40, '5')}`;

async function player() {
  const p = await newPlayer(t);
  await demoDeposit(t, p, '500.00');
  await t
    .http()
    .post('/dev/kyc/approve')
    .set(bearer(p.token))
    .send({ level: 'level_2' })
    .expect(200);
  const secret = await enrol2fa(t, p);
  return { p, secret };
}

describe('new destinations vs the whitelist cool-down (Q25)', () => {
  it('a brand-new address goes to four-eyes review even when the AML provider would approve it', async () => {
    const { p, secret } = await player();
    // A provider that clears everything (e.g. a real screening vendor finding nothing).
    vi.spyOn(MockAmlProvider.prototype, 'screenWithdrawal').mockResolvedValue({
      provider: 'mock',
      riskLevel: 'low',
      decision: 'approve',
      flags: [],
      checks: [],
      reason: null,
    });
    const wd = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({
        network: 'arbitrum',
        address: randomAddress(),
        amount: '100.00',
        idempotencyKey: `wd-${uid()}`,
        totpCode: await totp(secret, 1),
      })
      .expect(201);
    expect(wd.body).toMatchObject({ status: 'under_review', requiresFourEyes: true });
    const row = await t.prisma.withdrawal.findUniqueOrThrow({ where: { id: wd.body.id } });
    expect(row).toMatchObject({ status: 'under_review', requiresFourEyes: true, flagged: true });
  });

  it('a whitelisted address in its 24 h cool-down is refused (unchanged)', async () => {
    const { p, secret } = await player();
    const address = randomAddress();
    await t.prisma.userWallet.create({
      data: {
        userId: p.userId,
        network: 'arbitrum',
        address,
        source: 'manual',
        whitelistedAt: new Date(),
        whitelistAvailableAt: new Date(Date.now() + 86_400_000),
      },
    });
    const res = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({
        network: 'arbitrum',
        address,
        amount: '100.00',
        idempotencyKey: `wd-${uid()}`,
        totpCode: await totp(secret, 1),
      })
      .expect(422);
    expect(res.body.error.code).toBe('ADDRESS_NOT_WHITELISTED');
  });
});
