/**
 * OpenAPI response schemas: /docs-json documents them for the main endpoints, and every live response of those
 * endpoints parses with the same zod schema (the documentation cannot drift from what the API returns).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DepositAddress,
  EntryPurchase,
  EntryQuote,
  HealthResponse,
  MeView,
  MyEntryProofs,
  OPERATION_RESPONSES,
  RESPONSE_COMPONENTS,
  RoundChainStatus,
  RoundManifest,
  RoundPayouts,
  RoundVerification,
  RoundView,
  WalletBalances,
  WithdrawalView,
} from '../src/infra/openapi/response-schemas';
import { RoundLifecycleService } from '../src/modules/pool/round-lifecycle.service';
import {
  bearer,
  createTestApp,
  demoDeposit,
  enrol2fa,
  newPlayer,
  openRound,
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

describe('OpenAPI response schemas', () => {
  it('documents the main endpoints with response schemas and the error envelope everywhere', async () => {
    const doc = (await t.http().get('/docs-json').expect(200)).body as {
      paths: Record<string, Record<string, { responses: Record<string, { content?: unknown }> }>>;
      components: { schemas: Record<string, unknown> };
    };
    for (const name of Object.keys(RESPONSE_COMPONENTS)) {
      expect(doc.components.schemas[name], name).toBeTruthy();
    }
    for (const [key, [status, component]] of Object.entries(OPERATION_RESPONSES)) {
      const [method, path] = key.split(' ') as [string, string];
      const op = doc.paths[path]?.[method];
      expect(op, key).toBeTruthy();
      expect(op!.responses[String(status)]?.content).toEqual({
        'application/json': { schema: { $ref: `#/components/schemas/${component}` } },
      });
    }
    for (const item of Object.values(doc.paths)) {
      for (const op of Object.values(item)) expect(op.responses.default).toBeTruthy();
    }
  });

  it('live responses of the main endpoints match their documented schemas', async () => {
    const http = () => t.http();
    HealthResponse.parse((await http().get('/health').expect(200)).body);

    const p = await newPlayer(t);
    await demoDeposit(t, p, '500.00');
    MeView.parse((await http().get('/me').set(bearer(p.token)).expect(200)).body);
    WalletBalances.parse(
      (await http().get('/wallet/balances').set(bearer(p.token)).expect(200)).body,
    );
    DepositAddress.parse(
      (await http().get('/deposits/address?network=arbitrum').set(bearer(p.token)).expect(200))
        .body,
    );
    RESPONSE_COMPONENTS.DepositPage.parse(
      (await http().get('/deposits').set(bearer(p.token)).expect(200)).body,
    );

    const round = await openRound(t, { minParticipants: 1, minPool: '10.00' });
    RoundView.parse((await http().get(`/pool/rounds/${round.number}`).expect(200)).body);
    RoundView.parse((await http().get('/pool/rounds/current').expect(200)).body);
    RESPONSE_COMPONENTS.RoundPage.parse((await http().get('/pool/rounds').expect(200)).body);
    EntryQuote.parse((await http().get('/pool/quote?entries=3').expect(200)).body);
    EntryPurchase.parse(
      (
        await http()
          .post(`/pool/rounds/${round.id}/entries`)
          .set(bearer(p.token))
          .send({ entries: 15, idempotencyKey: `e-${uid()}` })
          .expect(201)
      ).body,
    );
    const lifecycle = t.app.get(RoundLifecycleService);
    await lifecycle.close(round.id);
    await lifecycle.startDraw(round.id);
    await lifecycle.pollAndSettle(round.id);
    const settled = RoundView.parse(
      (await http().get(`/pool/rounds/${round.number}`).expect(200)).body,
    );
    expect(settled.status).toBe('settled');
    RoundVerification.parse(
      (await http().get(`/pool/rounds/${round.number}/verify`).expect(200)).body,
    );
    RoundChainStatus.parse(
      (await http().get(`/pool/rounds/${round.number}/chain`).expect(200)).body,
    );
    RoundManifest.parse(
      (await http().get(`/pool/rounds/${round.number}/manifest`).expect(200)).body,
    );
    RoundPayouts.parse((await http().get(`/pool/rounds/${round.number}/payouts`).expect(200)).body);
    MyEntryProofs.parse(
      (await http().get(`/pool/rounds/${round.number}/my-proofs`).set(bearer(p.token)).expect(200))
        .body,
    );

    await http()
      .post('/dev/kyc/approve')
      .set(bearer(p.token))
      .send({ level: 'level_2' })
      .expect(200);
    const secret = await enrol2fa(t, p);
    const wd = WithdrawalView.parse(
      (
        await http()
          .post('/withdrawals')
          .set(bearer(p.token))
          .send({
            network: 'arbitrum',
            address: '0x5555555555555555555555555555555555555555',
            amount: '50.00',
            idempotencyKey: `wd-${uid()}`,
            totpCode: await totp(secret, 1),
          })
          .expect(201)
      ).body,
    );
    WithdrawalView.parse(
      (await http().get(`/withdrawals/${wd.id}`).set(bearer(p.token)).expect(200)).body,
    );
    RESPONSE_COMPONENTS.WithdrawalPage.parse(
      (await http().get('/withdrawals').set(bearer(p.token)).expect(200)).body,
    );
    RESPONSE_COMPONENTS.TransactionPage.parse(
      (await http().get('/transactions').set(bearer(p.token)).expect(200)).body,
    );
    RESPONSE_COMPONENTS.ErrorEnvelope.parse(
      (await http().get('/pool/rounds/1999999999').expect(404)).body,
    );

    // Leave no open review / queued withdrawal behind in the shared test database.
    WithdrawalView.parse(
      (await http().post(`/withdrawals/${wd.id}/cancel`).set(bearer(p.token)).expect(200)).body,
    );
    expect((await t.prisma.withdrawal.findUniqueOrThrow({ where: { id: wd.id } })).status).toBe(
      'cancelled',
    );
  });
});
