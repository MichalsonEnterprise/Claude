import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  bearer,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  totp,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

/** Wallet-module additions: /wallet/status, progressive DEMO deposits, withdrawal pre-check, lookups by reference. */
let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

describe('wallet status + progressive DEMO deposits', () => {
  let p: TestPlayer;
  beforeAll(async () => {
    p = await newPlayer(t);
  });

  it('GET /wallet/status: operational flags, KYC limit and usage (no KYC → 0.00 limit)', async () => {
    const res = await t.http().get('/wallet/status').set(bearer(p.token)).expect(200);
    expect(res.body).toMatchObject({
      depositsEnabled: true,
      withdrawalsEnabled: true,
      kycLevel: 'none',
      withdrawal: {
        dailyLimit: '0.00',
        usedToday: '0.00',
        remainingToday: '0.00',
        minWithdrawal: '20.00',
        platformFee: '0.00',
      },
      minDeposit: '10.00',
      newAddressCooldownHours: 24,
      depositConfirmations: 20,
    });
    expect(new Date(res.body.withdrawal.resetsAt).getUTCHours()).toBe(0);
  });

  it('progressive deposit: detected 0 / 20 → Pending, advanced by simulated blocks → credited to Available', async () => {
    const key = `dep-${uid()}`;
    const body = { network: 'arbitrum', amount: '250.00', idempotencyKey: key, mode: 'progressive' };
    const res = await t.http().post('/dev/deposits/simulate').set(bearer(p.token)).send(body).expect(200);
    expect(res.body).toMatchObject({
      status: 'confirming',
      amount: '250.00',
      confirmations: { current: 0, required: 20 },
      mode: 'progressive',
      replayed: false,
    });
    const ref = res.body.reference as string;

    const replay = await t.http().post('/dev/deposits/simulate').set(bearer(p.token)).send(body).expect(200);
    expect(replay.body).toMatchObject({ reference: ref, replayed: true });

    let bal = (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body;
    expect(bal).toMatchObject({ pending: '250.00', available: '0.00' });

    const one = await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 7 })
      .expect(200);
    expect(one.body).toMatchObject({ status: 'confirming', confirmations: { current: 7, required: 20 } });

    const got = await t.http().get(`/deposits/ref/${ref}`).set(bearer(p.token)).expect(200);
    expect(got.body).toMatchObject({ reference: ref, confirmations: { current: 7 }, requiredConfirmations: 20 });

    const tx = await t.http().get(`/transactions/${ref}`).set(bearer(p.token)).expect(200);
    expect(tx.body).toMatchObject({ status: 'confirming', statusDetail: '7 / 20 confirmations' });

    const done = await t
      .http()
      .post(`/dev/deposits/${ref}/confirmations`)
      .set(bearer(p.token))
      .send({ confirmations: 50 })
      .expect(200);
    expect(done.body).toMatchObject({ status: 'credited', confirmations: { current: 20, required: 20 } });
    bal = (await t.http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body;
    expect(bal).toMatchObject({ pending: '0.00', available: '250.00' });

    // Credited deposits cannot be advanced again; other players cannot see or advance it.
    await t.http().post(`/dev/deposits/${ref}/confirmations`).set(bearer(p.token)).send({}).expect(409);
    const other = await newPlayer(t);
    await t.http().get(`/deposits/ref/${ref}`).set(bearer(other.token)).expect(404);
    await t.http().post(`/dev/deposits/${ref}/confirmations`).set(bearer(other.token)).send({}).expect(404);
    await t.http().get('/deposits/ref/not-a-ref').set(bearer(p.token)).expect(404);
  });
});

describe('withdrawal pre-check (read-only risk validation before 2FA)', () => {
  let p: TestPlayer;
  let secret: string;
  const fresh = '0x3333333333333333333333333333333333333333';
  const precheck = (q: Record<string, string>) =>
    t.http().get('/withdrawals/precheck').query(q).set(bearer(p.token));

  beforeAll(async () => {
    p = await newPlayer(t);
    await demoDeposit(t, p, '1000.00');
  });

  it('stops at identity verification while KYC is missing (other checks not run)', async () => {
    const res = await precheck({ network: 'arbitrum', address: fresh, amount: '100.00' }).expect(200);
    expect(res.body).toMatchObject({ outcome: 'kyc_required', code: 'KYC_REQUIRED' });
    expect(res.body.checks.map((c: { status: string }) => c.status)).toEqual([
      'fail',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
    ]);
  });

  it('reports blocked outcomes: no 2FA, over balance, invalid address, below minimum', async () => {
    await t.http().post('/dev/kyc/approve').set(bearer(p.token)).send({ level: 'level_2' }).expect(200);
    const no2fa = await precheck({ network: 'arbitrum', address: fresh, amount: '100.00' }).expect(200);
    expect(no2fa.body).toMatchObject({ outcome: 'blocked', code: 'TWO_FACTOR_REQUIRED', twoFactorEnabled: false });

    secret = await enrol2fa(t, p);
    const over = await precheck({ network: 'arbitrum', address: fresh, amount: '5000.00' }).expect(200);
    expect(over.body).toMatchObject({ outcome: 'blocked', code: 'INSUFFICIENT_FUNDS' });

    const invalid = await precheck({ network: 'arbitrum', address: '7Hq3abc', amount: '100.00' }).expect(200);
    expect(invalid.body).toMatchObject({ outcome: 'blocked', code: 'INVALID_ADDRESS', address: { valid: false } });

    const tiny = await precheck({ network: 'arbitrum', address: fresh, amount: '12.00' }).expect(200);
    expect(tiny.body).toMatchObject({ outcome: 'blocked', code: 'BELOW_MINIMUM' });

    await precheck({ network: 'bnb', address: fresh, amount: '100.00' }).expect(400);
  });

  it('new destination → review with the plain reason; sanctioned → blocked; never writes an AML alert', async () => {
    const before = await t.prisma.amlAlert.count({ where: { userId: p.userId } });
    const res = await precheck({ network: 'arbitrum', address: fresh, amount: '100.00' }).expect(200);
    expect(res.body).toMatchObject({
      outcome: 'review',
      reason: 'Routine AML screening for new destinations — usually under 4 h',
      quote: { amount: '100.00', networkFee: '0.08', platformFee: '0.00', youReceive: '99.92' },
      address: { valid: true, whitelisted: false, inCooldown: false },
      twoFactorEnabled: true,
    });
    expect(res.body.checks).toHaveLength(6);
    expect(new Date(res.body.validUntil).getTime() - new Date(res.body.checkedAt).getTime()).toBe(900_000);

    const sanctioned = await precheck({
      network: 'arbitrum',
      address: '0x000000000000000000000000000000000000dEaD',
      amount: '100.00',
    }).expect(200);
    expect(sanctioned.body).toMatchObject({ outcome: 'blocked', code: 'SANCTIONED_DESTINATION' });
    expect(await t.prisma.amlAlert.count({ where: { userId: p.userId } })).toBe(before);
  });

  it('a newly whitelisted address is blocked until its 24 h cool-down ends', async () => {
    const addr = '0x4444444444444444444444444444444444444444';
    await t
      .http()
      .post('/me/wallets/whitelist')
      .set(bearer(p.token))
      .send({ network: 'arbitrum', address: addr, label: 'Cold wallet', totpCode: await totp(secret, 1) })
      .expect(201);
    const res = await precheck({ network: 'arbitrum', address: addr, amount: '100.00' }).expect(200);
    expect(res.body).toMatchObject({
      outcome: 'blocked',
      code: 'ADDRESS_COOLDOWN',
      address: { whitelisted: true, inCooldown: true, label: 'Cold wallet' },
    });
  });

  it('GET /withdrawals/ref/:reference returns the withdrawal with its screening checks; /wallet/status counts it', async () => {
    // Two codes were already used in this 30 s window (enrol + whitelist): let the test reuse the current step.
    await t.prisma.totpSecret.update({ where: { userId: p.userId }, data: { lastUsedStep: null } });
    const created = await t
      .http()
      .post('/withdrawals')
      .set(bearer(p.token))
      .send({
        network: 'arbitrum',
        address: fresh,
        amount: '100.00',
        idempotencyKey: `wd-${uid()}`,
        totpCode: await totp(secret),
      })
      .expect(201);
    const ref = created.body.reference as string;
    const res = await t.http().get(`/withdrawals/ref/${ref}`).set(bearer(p.token)).expect(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      reference: ref,
      status: 'under_review',
      screening: {
        decision: 'review',
        reason: 'Routine AML screening for new destinations — usually under 4 h',
      },
    });
    expect(res.body.screening.checks).toHaveLength(6);
    await t.http().get('/withdrawals/ref/WD-999999999').set(bearer(p.token)).expect(404);

    const status = await t.http().get('/wallet/status').set(bearer(p.token)).expect(200);
    expect(status.body.withdrawal).toMatchObject({
      dailyLimit: '25000.00',
      usedToday: '100.00',
      remainingToday: '24900.00',
    });
  });
});
