import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrivyService } from '../src/modules/auth/privy.service';
import { bearer, createAdmin, createTestApp, newPlayer, uid, type TestApp } from './helpers';

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t?.close();
});

describe('GET /auth/account-status (web route guards, AUTH-18)', () => {
  it('reports onboarding first, then ok', async () => {
    const fresh = await newPlayer(t, { onboard: false });
    const before = await t.http().get('/auth/account-status').set(bearer(fresh.token)).expect(200);
    expect(before.body).toMatchObject({ gate: 'onboarding', onboarded: false });

    const p = await newPlayer(t);
    const res = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(res.body).toMatchObject({
      gate: 'ok',
      onboarded: true,
      restrictions: [],
      paused: { gaming: false, deposits: false, withdrawals: false },
      selfExclusion: { active: false },
      region: { permitted: true, declared: { code: 'PT', permitted: true } },
    });
  });

  it('maps admin restrictions to suspended / under review without exposing the internal reason', async () => {
    const admin = await createAdmin(t, 'compliance_officer');
    const p = await newPlayer(t);
    await t.prisma.userRestriction.create({
      data: {
        userId: p.userId,
        type: 'gaming_blocked',
        reason: 'INTERNAL: analyst note',
        appliedByAdminId: admin.id,
      },
    });
    const review = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(review.body.gate).toBe('under_review');
    expect(review.body.paused).toEqual({ gaming: true, deposits: false, withdrawals: false });
    expect(JSON.stringify(review.body)).not.toContain('INTERNAL');
    expect(review.body.restrictions[0].reference).toMatch(/^REV-[0-9A-F]{6}$/);

    await t.prisma.userRestriction.create({
      data: { userId: p.userId, type: 'account_suspended', reason: 'x', appliedByAdminId: admin.id },
    });
    const sus = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(sus.body.gate).toBe('suspended');
    expect(sus.body.paused.withdrawals).toBe(false);
  });

  it('reports self-exclusion (withdrawals stay available)', async () => {
    const p = await newPlayer(t);
    await t
      .http()
      .post('/responsible-gaming/self-exclusion')
      .set(bearer(p.token))
      .send({ duration: '6m', confirm: true })
      .expect(200);
    const res = await t.http().get('/auth/account-status').set(bearer(p.token)).expect(200);
    expect(res.body.gate).toBe('self_excluded');
    expect(res.body.selfExclusion.active).toBe(true);
    expect(res.body.selfExclusion.endsAt).toBeTruthy();
    expect(res.body.paused).toEqual({ gaming: true, deposits: true, withdrawals: false });
  });
});

describe('AUTH-21 new-device alerts', () => {
  async function signIn(did: string, userAgent: string) {
    const { token } = await t.app.get(PrivyService).issueMockToken({ did });
    await t.http().post('/auth/session').set(bearer(token)).set('User-Agent', userAgent).expect(200);
    return token;
  }
  const MAC_CHROME =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
  const WIN_EDGE =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0';

  it('flags a sign-in from an unseen device on the other devices; confirm clears it', async () => {
    const did = `did:privy:nd-${uid()}`;
    const trusted = await signIn(did, MAC_CHROME);
    const sameDevice = await signIn(did, MAC_CHROME); // same device label → not new
    expect(
      (await t.http().get('/auth/new-device-alerts').set(bearer(trusted)).expect(200)).body,
    ).toEqual([]);

    const newcomer = await signIn(did, WIN_EDGE);
    const alerts = await t.http().get('/auth/new-device-alerts').set(bearer(trusted)).expect(200);
    expect(alerts.body).toHaveLength(1);
    expect(alerts.body[0].device).toMatch(/Edge/);
    // the new device itself does not see its own alert
    expect(
      (await t.http().get('/auth/new-device-alerts').set(bearer(newcomer)).expect(200)).body,
    ).toEqual([]);

    await t
      .http()
      .post(`/auth/new-device-alerts/${alerts.body[0].sessionId}/confirm`)
      .set(bearer(sameDevice))
      .expect(200);
    expect(
      (await t.http().get('/auth/new-device-alerts').set(bearer(trusted)).expect(200)).body,
    ).toEqual([]);
  });

  it('“secure my account” signs out every other session', async () => {
    const did = `did:privy:nd-${uid()}`;
    const trusted = await signIn(did, MAC_CHROME);
    const intruder = await signIn(did, WIN_EDGE);
    const [alert] = (await t.http().get('/auth/new-device-alerts').set(bearer(trusted)).expect(200))
      .body as { sessionId: string }[];
    const res = await t
      .http()
      .post(`/auth/new-device-alerts/${alert!.sessionId}/secure`)
      .set(bearer(trusted))
      .expect(200);
    expect(res.body).toMatchObject({ secured: true, revokedSessions: 1 });
    await t.http().get('/me').set(bearer(intruder)).expect(401);
    await t.http().get('/me').set(bearer(trusted)).expect(200);
  });
});
