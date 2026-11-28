/**
 * Account module (USR-A1…A10, AUTH-11…17): preferences, sessions & login history, security overview, KYC flow,
 * notification categories.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrivyService } from '../src/modules/auth/privy.service';
import {
  bearer,
  createTestApp,
  enrol2fa,
  newPlayer,
  uid,
  type TestApp,
  type TestPlayer,
} from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const DETAILS = {
  firstNames: 'Nova',
  lastNames: 'Kade',
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

describe('account preferences (A1 / A9)', () => {
  let p: TestPlayer;
  beforeAll(async () => {
    p = await newPlayer(t);
  });

  it('resolves defaults: security + RG locked on, marketing off', async () => {
    const res = await t.http().get('/me/preferences').set(bearer(p.token)).expect(200);
    expect(res.body.language).toBe('en');
    expect(res.body.marketingOptIn).toBe(false);
    const cats = Object.fromEntries(
      (
        res.body.notifications.categories as { key: string; locked: boolean; channels: object }[]
      ).map((c) => [c.key, c]),
    );
    expect(cats.security_signins).toMatchObject({
      locked: true,
      channels: { email: true, push: true, inApp: true },
    });
    expect(cats.offers_promotions).toMatchObject({
      locked: false,
      channels: { email: false, push: false, inApp: false },
    });
    expect(cats.rg_reality_checks.channels).toEqual({ email: null, push: null, inApp: true });
  });

  it('never lets locked categories be switched off; promotions opt-in syncs marketingOptIn', async () => {
    const res = await t
      .http()
      .put('/me/notification-preferences')
      .set(bearer(p.token))
      .send({
        categories: {
          security_signins: { email: false, push: false, inApp: false },
          offers_promotions: { email: true },
          rg_reality_checks: { email: true },
        },
        quietHours: { enabled: true, from: '23:00', to: '08:00' },
      })
      .expect(200);
    const cats = Object.fromEntries(
      (res.body.notifications.categories as { key: string; channels: object }[]).map((c) => [
        c.key,
        c,
      ]),
    );
    expect(cats.security_signins.channels).toEqual({ email: true, push: true, inApp: true });
    expect(cats.offers_promotions.channels).toEqual({ email: true, push: false, inApp: false });
    expect(cats.rg_reality_checks.channels).toEqual({ email: null, push: null, inApp: true });
    expect(res.body.marketingOptIn).toBe(true);
    expect(res.body.notifications.quietHours).toEqual({
      enabled: true,
      from: '23:00',
      to: '08:00',
    });
  });

  it('updates the display name, language and time zone (validated by the shared schema)', async () => {
    await t.http().patch('/me/profile').set(bearer(p.token)).send({ displayName: 'x' }).expect(400);
    const res = await t
      .http()
      .patch('/me/profile')
      .set(bearer(p.token))
      .send({ displayName: 'Nova K.', timeZone: 'Europe/Lisbon' })
      .expect(200);
    expect(res.body).toMatchObject({ displayName: 'Nova K.', timeZone: 'Europe/Lisbon' });
    expect(res.body.profileUpdatedAt).toBeTruthy();
  });
});

describe('sessions, login history and security overview (A2 / A6 / A7 / A8)', () => {
  it('lists devices, ends all other sessions without a 2FA code, keeps them in login history', async () => {
    const privy = t.app.get(PrivyService);
    const suffix = uid();
    const did = `did:privy:acct-${suffix}`;
    const first = await privy.issueMockToken({ did, email: `a${suffix}@example.com` });
    await t
      .http()
      .post('/auth/onboarding')
      .set(bearer(first.token))
      .send({
        handle: `a_${suffix}`,
        country: 'PT',
        consents: {
          ageConfirmed: true,
          jurisdictionConfirmed: true,
          termsAccepted: true,
          privacyAccepted: true,
          marketingOptIn: false,
        },
      })
      .expect(200);
    // a second sign-in (new Privy session) from another browser
    const second = await privy.issueMockToken({ did, email: `a${suffix}@example.com` });
    await t
      .http()
      .post('/auth/session')
      .set(bearer(second.token))
      .set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0')
      .expect(200);

    const devices = await t.http().get('/me/devices').set(bearer(first.token)).expect(200);
    expect(devices.body).toHaveLength(2);
    expect(devices.body.filter((d: { current: boolean }) => d.current)).toHaveLength(1);

    const sec = await t.http().get('/me/security').set(bearer(first.token)).expect(200);
    expect(sec.body.max).toBe(100);
    expect(sec.body.items.map((i: { key: string }) => i.key)).toEqual([
      'two_factor',
      'anti_phishing',
      'whitelist',
      'email_verified',
      'backup_codes',
      'devices_recognised',
    ]);
    expect(sec.body.score).toBe(
      sec.body.items.reduce((s: number, i: { earned: number }) => s + i.earned, 0),
    );

    const ended = await t
      .http()
      .post('/me/sessions/revoke-others')
      .set(bearer(first.token))
      .expect(200);
    expect(ended.body.revoked).toBe(1);
    // the other device is signed out at once
    await t.http().get('/me').set(bearer(second.token)).expect(401);

    const all = await t.http().get('/me/devices?include=all').set(bearer(first.token)).expect(200);
    expect(all.body.map((d: { status: string }) => d.status).sort()).toEqual(['active', 'ended']);

    const hist = await t.http().get('/me/login-history').set(bearer(first.token)).expect(200);
    expect(hist.body.counts.all).toBe(2);
    expect(hist.body.counts.ended).toBe(1);
    const endedOnly = await t
      .http()
      .get('/me/login-history?filter=ended')
      .set(bearer(first.token))
      .expect(200);
    expect(endedOnly.body.items).toHaveLength(1);
    expect(endedOnly.body.items[0].active).toBe(false);

    // audit trail feeds "Recent security events"
    const after = await t.http().get('/me/security').set(bearer(first.token)).expect(200);
    expect(after.body.events.map((e: { action: string }) => e.action)).toContain(
      'user.sessions.revoked_others',
    );
  });

  it('counts 2FA in the score once it is enabled', async () => {
    const p = await newPlayer(t);
    const before = await t.http().get('/me/security').set(bearer(p.token)).expect(200);
    await enrol2fa(t, p);
    const after = await t.http().get('/me/security').set(bearer(p.token)).expect(200);
    expect(after.body.score - before.body.score).toBe(40); // 2FA +30 and fresh backup codes +10
  });
});

describe('KYC flow (AUTH-11…17)', () => {
  let p: TestPlayer;
  beforeAll(async () => {
    p = await newPlayer(t);
  });

  it('Level 1 → instant approval from basic details', async () => {
    const start = await t
      .http()
      .post('/kyc/application')
      .set(bearer(p.token))
      .send({ level: 'level_1' })
      .expect(200);
    expect(start.body.application).toMatchObject({
      level: 'level_1',
      status: 'not_started',
      step: 'details',
    });
    const bad = await t
      .http()
      .put('/kyc/application/details')
      .set(bearer(p.token))
      .send({
        ...DETAILS,
        lastNames: 'K.',
        dateOfBirth: '2010-03-14',
        postalCode: '1100',
        accuracyConfirmed: false,
      })
      .expect(400);
    const paths = (bad.body.error.issues as { path: string[] }[]).map((i) => i.path[0]);
    expect(paths).toEqual(
      expect.arrayContaining(['lastNames', 'dateOfBirth', 'postalCode', 'accuracyConfirmed']),
    );
    await t.http().put('/kyc/application/details').set(bearer(p.token)).send(DETAILS).expect(200);
    const done = await t
      .http()
      .post('/kyc/application/submit')
      .set(bearer(p.token))
      .send({ accuracyConfirmed: true })
      .expect(200);
    expect(done.body.currentLevel).toBe('level_1');
    expect(done.body.application.status).toBe('verified');
    const kyc = await t.http().get('/kyc').set(bearer(p.token)).expect(200);
    expect(kyc.body.dailyWithdrawalLimit).toBe('2000.00');
  });

  it('Level 2: document quality check, liveness, review, rejection → resubmit only failed items → approval', async () => {
    await t
      .http()
      .post('/kyc/application')
      .set(bearer(p.token))
      .send({ level: 'level_2' })
      .expect(200);
    await t.http().put('/kyc/application/details').set(bearer(p.token)).send(DETAILS).expect(200);
    // submitting early is refused
    await t
      .http()
      .post('/kyc/application/submit')
      .set(bearer(p.token))
      .send({ accuracyConfirmed: true })
      .expect(400);
    const doc = (side: string, sizeBytes: number, seed: string) => ({
      documentType: 'id_card',
      side,
      issuingCountry: 'PT',
      fileName: `id_${side}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes,
      sha256: sha(seed),
    });
    const front = await t
      .http()
      .post('/kyc/application/documents')
      .set(bearer(p.token))
      .send(doc('front', 900_000, 'front'))
      .expect(200);
    expect(front.body.document.status).toBe('accepted');
    expect(front.body.document.extracted.fullName).toBe('Nova Kade');
    const blurry = await t
      .http()
      .post('/kyc/application/documents')
      .set(bearer(p.token))
      .send(doc('back', 12_000, 'back-blurry'))
      .expect(200);
    expect(blurry.body.document).toMatchObject({ status: 'rejected', issues: ['image_quality'] });
    expect(blurry.body.application.step).toBe('document');
    // wrong side for a passport is a validation error
    await t
      .http()
      .post('/kyc/application/documents')
      .set(bearer(p.token))
      .send({ ...doc('back', 900_000, 'x'), documentType: 'passport' })
      .expect(400);
    const back = await t
      .http()
      .post('/kyc/application/documents')
      .set(bearer(p.token))
      .send(doc('back', 800_000, 'back'))
      .expect(200);
    expect(back.body.application.step).toBe('liveness');
    expect(back.body.application.documents).toHaveLength(2);

    const short = await t
      .http()
      .post('/kyc/application/liveness')
      .set(bearer(p.token))
      .send({ captured: true, durationMs: 1500 })
      .expect(200);
    expect(short.body.application.liveness).toMatchObject({
      status: 'failed',
      attempts: 1,
      maxAttempts: 3,
    });
    const live = await t
      .http()
      .post('/kyc/application/liveness')
      .set(bearer(p.token))
      .send({ captured: true, durationMs: 9000 })
      .expect(200);
    expect(live.body.application).toMatchObject({ step: 'review', canSubmit: true });

    const sub = await t
      .http()
      .post('/kyc/application/submit')
      .set(bearer(p.token))
      .send({ accuracyConfirmed: true })
      .expect(200);
    expect(sub.body.application).toMatchObject({ status: 'in_review', editable: false });
    expect(sub.body.application.expectedBy).toBeTruthy();
    // no edits while in review
    await t.http().put('/kyc/application/details').set(bearer(p.token)).send(DETAILS).expect(409);

    const rej = await t
      .http()
      .post('/dev/kyc/reject')
      .set(bearer(p.token))
      .send({ level: 'level_2', reasons: ['image_quality'] })
      .expect(200);
    const app = rej.body.application;
    expect(app.status).toBe('resubmission_required');
    expect(app.failedChecks).toEqual(['image_quality']);
    expect(app.step).toBe('document'); // only the back of the ID needs a retake
    expect(app.liveness.status).toBe('passed'); // the selfie video is kept
    const statuses = Object.fromEntries(
      (app.documents as { side: string; status: string }[]).map((d) => [d.side, d.status]),
    );
    expect(statuses).toEqual({ front: 'accepted', back: 'rejected' });

    await t
      .http()
      .post('/kyc/application/documents')
      .set(bearer(p.token))
      .send(doc('back', 820_000, 'back-2'))
      .expect(200);
    await t
      .http()
      .post('/kyc/application/submit')
      .set(bearer(p.token))
      .send({ accuracyConfirmed: true })
      .expect(200);
    await t
      .http()
      .post('/dev/kyc/approve')
      .set(bearer(p.token))
      .send({ level: 'level_2' })
      .expect(200);

    const view = await t.http().get('/kyc/application').set(bearer(p.token)).expect(200);
    expect(view.body.currentLevel).toBe('level_2');
    expect(view.body.application.status).toBe('verified');
    const docs = await t.http().get('/kyc/documents').set(bearer(p.token)).expect(200);
    expect(docs.body.counts.approved).toBe(2);
    expect(docs.body.items.some((d: { status: string }) => d.status === 'replaced')).toBe(true);
    // a verified level cannot be started again
    await t
      .http()
      .post('/kyc/application')
      .set(bearer(p.token))
      .send({ level: 'level_2' })
      .expect(409);

    const notes = await t
      .http()
      .get('/notifications?category=account')
      .set(bearer(p.token))
      .expect(200);
    expect(notes.body.items.map((n: { type: string }) => n.type)).toEqual(
      expect.arrayContaining(['kyc.submitted', 'kyc.resubmission_required']),
    );
    expect(notes.body.counts.account).toBeGreaterThanOrEqual(3);
  });
});
