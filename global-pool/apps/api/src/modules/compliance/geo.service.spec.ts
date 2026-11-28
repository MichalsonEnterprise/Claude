import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../common/errors';
import { AppConfig } from '../../config/app-config';
import { parseEnv } from '../../config/env';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import { GeoService } from './geo.service';

const base = {
  DATABASE_URL: 'postgresql://postgres@127.0.0.1:5432/globalpool',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'x'.repeat(32),
  ADMIN_JWT_ACCESS_SECRET: 'y'.repeat(32),
  ADMIN_JWT_REFRESH_SECRET: 'y'.repeat(32),
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

/** geo_rules double: GB blocked by a DB rule, US allowed by a DB rule (beats the env list), PT allowed. */
const prisma = {
  geoRule: {
    findMany: () =>
      Promise.resolve([
        { countryCode: 'GB', status: 'blocked' },
        { countryCode: 'PT', status: 'allowed' },
      ]),
  },
} as unknown as PrismaService;

function geo(env: Record<string, string>) {
  return new GeoService(prisma, new AppConfig(parseEnv({ ...base, ...env })));
}

function req(headers: Record<string, string> = {}, query: Record<string, string> = {}): Request {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => h[name.toLowerCase()], query } as unknown as Request;
}

describe('GeoService — request country (PUB-21)', () => {
  it('trusts the CDN header only with TRUST_PROXY=true, using the configured header name', () => {
    const trusted = geo({ NODE_ENV: 'test', TRUST_PROXY: 'true', GEO_COUNTRY_HEADER: 'x-country' });
    expect(trusted.requestCountry(req({ 'X-Country': 'us' }))).toEqual({
      country: 'US',
      source: 'header',
    });
    // CF-IPCountry is ignored when another header is configured.
    expect(trusted.requestCountry(req({ 'CF-IPCountry': 'US' }))).toEqual({
      country: null,
      source: 'unknown',
    });
    const untrusted = geo({ NODE_ENV: 'test', TRUST_PROXY: 'false' });
    expect(untrusted.requestCountry(req({ 'CF-IPCountry': 'US' })).source).toBe('unknown');
  });

  it('rejects malformed / anonymised header values (XX, Tor T1, junk) as unknown', () => {
    const g = geo({ NODE_ENV: 'test', TRUST_PROXY: 'true' });
    for (const v of ['XX', 'T1', 'A1', 'USA', '', ' ']) {
      expect(g.requestCountry(req({ 'cf-ipcountry': v })).country, v).toBeNull();
    }
  });

  it('honours the DEV header / query override only when NODE_ENV=development', () => {
    const dev = geo({ NODE_ENV: 'development', DEV_COUNTRY_OVERRIDE: 'PT' });
    expect(dev.requestCountry(req({ 'X-GP-Dev-Country': 'us' }))).toEqual({
      country: 'US',
      source: 'dev_override',
    });
    expect(dev.requestCountry(req({}, { devCountry: 'cu' }))).toEqual({
      country: 'CU',
      source: 'dev_override',
    });
    // Without a request override the env default applies.
    expect(dev.requestCountry(req())).toEqual({ country: 'PT', source: 'dev_override' });
    // In development the request override even beats a trusted CDN header (explicit QA intent).
    const devProxy = geo({ NODE_ENV: 'development', TRUST_PROXY: 'true' });
    expect(
      devProxy.requestCountry(req({ 'cf-ipcountry': 'PT', 'x-gp-dev-country': 'US' })).country,
    ).toBe('US');

    for (const NODE_ENV of ['test', 'production']) {
      const g = geo({ NODE_ENV, TRUST_PROXY: 'true' });
      expect(
        g.requestCountry(
          req({ 'x-gp-dev-country': 'US', 'cf-ipcountry': 'PT' }, { devCountry: 'US' }),
        ),
        NODE_ENV,
      ).toEqual({ country: 'PT', source: 'header' });
      expect(
        g.requestCountry(req({ 'x-gp-dev-country': 'US' }, { devCountry: 'US' })).country,
        NODE_ENV,
      ).toBeNull();
    }
  });

  it('ignores DEV_COUNTRY_OVERRIDE in production and fails closed when the location is unknown', async () => {
    const prod = geo({ NODE_ENV: 'production', DEV_COUNTRY_OVERRIDE: 'PT' });
    expect(prod.requestCountry(req())).toEqual({ country: null, source: 'unknown' });
    expect((await prod.checkRequest(req())).permitted).toBe(false);
    await expect(prod.assertPermitted(req(), 'PT')).rejects.toBeInstanceOf(AppError);
  });
});

describe('GeoService — decision against geo_rules + RESTRICTED_COUNTRIES', () => {
  const g = geo({ NODE_ENV: 'development', RESTRICTED_COUNTRIES: 'US,CU,IR,KP,SY' });

  it('restricted: env list or a blocked DB rule → restricted, with what stays available', async () => {
    const us = await g.decide(req({ 'x-gp-dev-country': 'US' }));
    expect(us).toMatchObject({
      decision: 'restricted',
      permitted: false,
      country: 'US',
      countryName: 'United States',
      source: 'dev_override',
      isDemo: true,
      minAge: 18,
      declared: null,
    });
    expect(us.stillAvailable).toEqual(
      expect.arrayContaining(['sign_in', 'withdraw', 'support', 'licence_info']),
    );
    expect(us.paused).toEqual(expect.arrayContaining(['games', 'pool_entries', 'deposits']));
    // A DB rule wins over the env placeholder list.
    expect((await g.decide(req({ 'x-gp-dev-country': 'GB' }))).decision).toBe('restricted');
  });

  it('permitted: allowed DB rule or not listed → permitted, nothing paused', async () => {
    const pt = await g.decide(req({ 'x-gp-dev-country': 'PT' }));
    expect(pt).toMatchObject({ decision: 'permitted', permitted: true, countryName: 'Portugal' });
    expect(pt.paused).toEqual([]);
    expect(pt.stillAvailable).toEqual([]);
    const br = await g.decide(req({ 'x-gp-dev-country': 'BR' }));
    expect(br).toMatchObject({ decision: 'permitted', countryName: 'Brazil' });
  });

  it('checks an optional declared country separately from the location', async () => {
    const d = await g.decide(req({ 'x-gp-dev-country': 'PT' }), 'us');
    expect(d.decision).toBe('permitted');
    expect(d.declared).toEqual({ code: 'US', name: 'United States', permitted: false });
    expect((await g.decide(req({ 'x-gp-dev-country': 'PT' }), 'not-a-code')).declared).toBeNull();
  });

  it('never exposes reason codes or detection details beyond the decision', async () => {
    const d = await g.decide(req({ 'x-gp-dev-country': 'US' }));
    expect(Object.keys(d).sort()).toEqual(
      [
        'checkedAt',
        'country',
        'countryName',
        'decision',
        'declared',
        'isDemo',
        'minAge',
        'paused',
        'permitted',
        'source',
        'stillAvailable',
      ].sort(),
    );
    expect(JSON.stringify(d)).not.toMatch(/vpn|proxy|bypass/i);
  });
});
