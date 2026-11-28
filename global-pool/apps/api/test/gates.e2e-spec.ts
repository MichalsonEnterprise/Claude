/**
 * PUB-21 / ERR-05 compliance gates, server side:
 * - the geo decision (`GET /compliance/geo`) for a trusted CDN header (TRUST_PROXY + GEO_COUNTRY_HEADER), against
 *   geo_rules + RESTRICTED_COUNTRIES; the DEV per-request override only in NODE_ENV=development;
 * - every gaming / deposit route refuses a restricted location (451 GEO_RESTRICTED) — checked for EVERY such route
 *   found in the app (route inventory), so a new gaming route without the region policy fails this test;
 * - a restricted visitor can still sign in, see balances / history / RG and request a withdrawal.
 */
import { RequestMethod, type INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AppConfig } from '../src/config/app-config';
import { parseEnv } from '../src/config/env';
import { GeoDecision } from '../src/infra/openapi/response-schemas';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { PLAYER_POLICY, type PlayerPolicyOptions } from '../src/modules/auth/guards';
import { GeoService } from '../src/modules/compliance/geo.service';
import { bearer, newPlayer, openRound, uid, type TestApp } from './helpers';

const CDN = 'x-country';

async function appWith(env: Record<string, string>): Promise<TestApp> {
  const config = new AppConfig(parseEnv({ ...process.env, ...env }));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AppConfig)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return {
    app,
    http: () => request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    close: () => app.close(),
  };
}

/** Behind a CDN: the country header is trusted (`x-country`, like CF-IPCountry / X-Country). */
let cdn: TestApp;
/** NODE_ENV=development: DEV per-request override allowed. */
let dev: TestApp;

beforeAll(async () => {
  cdn = await appWith({ TRUST_PROXY: 'true', GEO_COUNTRY_HEADER: CDN });
  dev = await appWith({ NODE_ENV: 'development' });
});
afterAll(async () => {
  await cdn?.close();
  await dev?.close();
});

interface RouteInfo {
  method: string;
  path: string;
  policy: PlayerPolicyOptions | undefined;
}

/** Every controller route of the app with its effective player policy (method override, else class). */
function routes(app: INestApplication): RouteInfo[] {
  const reflector = app.get(Reflector);
  const out: RouteInfo[] = [];
  for (const mod of app.get(ModulesContainer).values()) {
    for (const wrapper of mod.controllers.values()) {
      const ctrl = wrapper.metatype as (new (...a: unknown[]) => unknown) | null;
      if (!ctrl || !wrapper.instance) continue;
      const base = [Reflect.getMetadata(PATH_METADATA, ctrl) as string | string[]].flat()[0] ?? '';
      const proto = Object.getPrototypeOf(wrapper.instance) as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const fn = proto[name];
        if (name === 'constructor' || typeof fn !== 'function') continue;
        const sub = Reflect.getMetadata(PATH_METADATA, fn) as string | string[] | undefined;
        if (sub === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, fn) as number] ?? '?';
        const path = `/${[base, [sub].flat()[0] ?? ''].join('/')}`
          .replace(/\/+/g, '/')
          .replace(/\/$/, '');
        out.push({
          method,
          path,
          policy: reflector.getAllAndOverride<PlayerPolicyOptions | undefined>(PLAYER_POLICY, [
            fn as () => unknown,
            ctrl,
          ]),
        });
      }
    }
  }
  return out;
}

/**
 * Gaming / deposit routes: anything that starts a NEW stake, entry or deposit. Exempt (with the reason) are routes
 * that only continue / settle something already placed, fairness seeds, DEMO credits and deposit tracking — none of
 * them start a new stake or move money in.
 */
const GAMING_OR_DEPOSIT = (r: RouteInfo) =>
  (r.method === 'POST' && /^\/(games|pool|deposits|dev\/deposits)\//.test(r.path)) ||
  (r.method === 'GET' && r.path === '/deposits/address');
const EXEMPT: Record<string, string> = {
  'POST /games/credits/reset': 'DEMO credits reset — no stake, no money',
  'POST /games/:slug/seeds/client': 'fairness seed — no stake',
  'POST /games/:slug/seeds/rotate': 'fairness seed — no stake',
  'POST /games/twenty-one/hands/:id/action': 'continues a hand already dealt',
  'POST /games/vault-sweeper/rounds/:id/reveal': 'continues a round already staked',
  'POST /games/vault-sweeper/rounds/:id/cashout': 'settles a round already staked',
  'POST /games/high-card/rounds/:id/action': 'continues a round already staked',
  'POST /games/high-card/rounds/:id/cashout': 'settles a round already staked',
  'POST /games/orbit-rush/bets/:id/cashout': 'settles a bet already placed',
  'POST /dev/deposits/:reference/confirmations': 'DEMO confirmations of a deposit already sent',
};
const key = (r: RouteInfo) => `${r.method} ${r.path}`;
const concrete = (path: string) =>
  path
    .replace(/:roundId|:id/g, '00000000-0000-4000-8000-000000000000')
    .replace(/:slug/g, 'pool-dice')
    .replace(/:reference/g, 'DP-00000');

describe('GET /compliance/geo — geo decision behind a trusted CDN header', () => {
  it('restricted country (env list) → restricted, with what stays available and no bypass hints', async () => {
    const res = await cdn.http().get('/compliance/geo').set(CDN, 'US').expect(200);
    const body = GeoDecision.parse(res.body);
    expect(body).toMatchObject({
      decision: 'restricted',
      permitted: false,
      country: 'US',
      countryName: 'United States',
      source: 'header',
      isDemo: false,
      minAge: 18,
      declared: null,
    });
    expect(body.stillAvailable).toEqual(expect.arrayContaining(['sign_in', 'withdraw', 'support']));
    expect(body.paused).toEqual(expect.arrayContaining(['games', 'pool_entries', 'deposits']));
    expect(JSON.stringify(res.body)).not.toMatch(/vpn|proxy|bypass/i);
    // The older region endpoint gives the same answer.
    const region = await cdn.http().get('/compliance/region').set(CDN, 'US').expect(200);
    expect(region.body).toMatchObject({ country: 'US', permitted: false, source: 'header' });
  });

  it('permitted country → permitted; a declared country is checked separately', async () => {
    const res = await cdn.http().get('/compliance/geo?declared=us').set(CDN, 'PT').expect(200);
    expect(res.body).toMatchObject({
      decision: 'permitted',
      country: 'PT',
      countryName: 'Portugal',
      paused: [],
      declared: { code: 'US', name: 'United States', permitted: false },
    });
    await cdn.http().get('/compliance/geo?declared=USA').set(CDN, 'PT').expect(400);
  });

  it('a GeoRule row decides (blocked rule for a country that is not on the env list)', async () => {
    const geo = cdn.app.get(GeoService);
    const country = 'NZ';
    await cdn.prisma.geoRule.deleteMany({ where: { countryCode: country } });
    geo.invalidate();
    expect((await cdn.http().get('/compliance/geo').set(CDN, country)).body.decision).toBe(
      'permitted',
    );
    await cdn.prisma.geoRule.create({
      data: { countryCode: country, status: 'blocked', reason: 'e2e gates test' },
    });
    try {
      geo.invalidate();
      const res = await cdn.http().get('/compliance/geo').set(CDN, country).expect(200);
      expect(res.body).toMatchObject({
        decision: 'restricted',
        country,
        countryName: 'New Zealand',
      });
    } finally {
      await cdn.prisma.geoRule.deleteMany({ where: { countryCode: country } });
      geo.invalidate();
    }
  });

  it('ignores the DEV override header / query outside development', async () => {
    const res = await cdn
      .http()
      .get('/compliance/geo?devCountry=US')
      .set(CDN, 'PT')
      .set('X-GP-Dev-Country', 'US')
      .expect(200);
    expect(res.body).toMatchObject({ decision: 'permitted', country: 'PT', source: 'header' });
  });
});

describe('NODE_ENV=development — DEV override header / query', () => {
  it('decides from ?devCountry= or X-GP-Dev-Country (DEMO), and enforcement follows it', async () => {
    const q = await dev.http().get('/compliance/geo?devCountry=us').expect(200);
    expect(q.body).toMatchObject({
      decision: 'restricted',
      country: 'US',
      source: 'dev_override',
      isDemo: true,
    });
    const h = await dev.http().get('/compliance/geo').set('X-GP-Dev-Country', 'PT').expect(200);
    expect(h.body).toMatchObject({ decision: 'permitted', country: 'PT', source: 'dev_override' });

    // The same override drives the server-side refusal (no gap between what the web shows and what is enforced).
    const p = await newPlayer(dev);
    const round = await openRound(dev);
    const refused = await dev
      .http()
      .post(`/pool/rounds/${round.id}/entries?devCountry=US`)
      .set(bearer(p.token))
      .send({ entries: 1, idempotencyKey: `gates-${uid()}` })
      .expect(451);
    expect(refused.body.error.code).toBe('GEO_RESTRICTED');
    expect(JSON.stringify(refused.body)).not.toMatch(/vpn|proxy|bypass/i);
  });
});

describe('gaming / deposit routes refuse a restricted location (route inventory)', () => {
  it('every new-stake / new-deposit route carries the region policy', () => {
    const all = routes(cdn.app).filter(GAMING_OR_DEPOSIT);
    expect(all.length).toBeGreaterThanOrEqual(8);
    const unguarded = all
      .filter((r) => !(key(r) in EXEMPT))
      .filter((r) => r.policy?.region !== true)
      .map(key);
    expect(unguarded).toEqual([]);
    // The exemptions still exist (keeps the list honest when routes are renamed).
    const keys = new Set(all.map(key));
    expect(Object.keys(EXEMPT).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('each of them answers 451 GEO_RESTRICTED from a restricted country — and works from a permitted one', async () => {
    const p = await newPlayer(cdn);
    const targets = routes(cdn.app)
      .filter(GAMING_OR_DEPOSIT)
      .filter((r) => !(key(r) in EXEMPT));
    const hits: string[] = [];
    for (const r of targets) {
      const path = concrete(r.path);
      const req =
        r.method === 'GET'
          ? cdn.http().get(`${path}?network=arbitrum`)
          : cdn
              .http()
              .post(path)
              .send({ idempotencyKey: `gates-${uid()}` });
      const res = await req.set(bearer(p.token)).set(CDN, 'US');
      expect(res.status, key(r)).toBe(451);
      expect(res.body.error.code, key(r)).toBe('GEO_RESTRICTED');
      expect(JSON.stringify(res.body), key(r)).not.toMatch(/vpn|proxy|bypass/i);
      hits.push(key(r));
    }
    expect(hits).toEqual(
      expect.arrayContaining([
        'GET /deposits/address',
        'POST /dev/deposits/simulate',
        'POST /pool/rounds/:roundId/entries',
        'POST /games/:slug/bets',
        'POST /games/orbit-rush/bets',
      ]),
    );

    // Control: the same player from a permitted country gets a deposit address and buys an entry.
    await cdn
      .http()
      .get('/deposits/address?network=arbitrum')
      .set(bearer(p.token))
      .set(CDN, 'PT')
      .expect(200);
    await cdn
      .http()
      .post('/dev/deposits/simulate')
      .set(bearer(p.token))
      .set(CDN, 'PT')
      .send({ network: 'arbitrum', amount: '50.00', idempotencyKey: `gates-${uid()}` })
      .expect(200);
    const round = await openRound(cdn);
    await cdn
      .http()
      .post(`/pool/rounds/${round.id}/entries`)
      .set(bearer(p.token))
      .set(CDN, 'PT')
      .send({ entries: 1, idempotencyKey: `gates-${uid()}` })
      .expect(201);
  });

  it('a restricted declared country of residence is refused even from a permitted location', async () => {
    const p = await newPlayer(cdn);
    await cdn.prisma.userProfile.update({ where: { userId: p.userId }, data: { country: 'US' } });
    const res = await cdn
      .http()
      .get('/deposits/address?network=arbitrum')
      .set(bearer(p.token))
      .set(CDN, 'PT')
      .expect(451);
    expect(res.body.error.code).toBe('GEO_RESTRICTED');
  });
});

describe('a restricted visitor can still sign in, see their account and withdraw', () => {
  it('session, balances, history, RG, account status and withdrawals are not region-gated', async () => {
    const p = await newPlayer(cdn);
    const us = <T extends request.Test>(r: T) => r.set(bearer(p.token)).set(CDN, 'US');
    await us(cdn.http().post('/auth/session')).expect(200);
    await us(cdn.http().get('/wallet/balances')).expect(200);
    await us(cdn.http().get('/history/transactions')).expect(200);
    await us(cdn.http().get('/responsible-gaming')).expect(200);
    await us(cdn.http().get('/withdrawals')).expect(200);
    const status = await us(cdn.http().get('/auth/account-status')).expect(200);
    expect(status.body).toMatchObject({
      gate: 'region',
      paused: { gaming: true, deposits: true, withdrawals: false },
      region: { current: { code: 'US', permitted: false }, permitted: false },
    });
    // A withdrawal request reaches validation (400), i.e. no region guard stands in front of it.
    const wd = await us(cdn.http().post('/withdrawals').send({})).expect(400);
    expect(wd.body.error.code).toBe('VALIDATION_FAILED');
  });
});
