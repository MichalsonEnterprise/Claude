import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://postgres@127.0.0.1:5432/globalpool',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'x'.repeat(32),
  ADMIN_JWT_ACCESS_SECRET: 'y'.repeat(32),
  ADMIN_JWT_REFRESH_SECRET: 'y'.repeat(32),
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

describe('config validation', () => {
  it('applies safe defaults (DEMO, testnet, real money off)', () => {
    const env = parseEnv(base);
    expect(env.REAL_MONEY_ENABLED).toBe(false);
    expect(env.DEMO_MODE).toBe(true);
    expect(env.CHAIN_ENV).toBe('testnet');
    expect(env.RESTRICTED_COUNTRIES).toContain('US');
    expect(env.ADMIN_SESSION_TTL).toBe(28_800);
  });

  it('refuses to boot with REAL_MONEY_ENABLED=true', () => {
    expect(() => parseEnv({ ...base, REAL_MONEY_ENABLED: 'true' })).toThrow(/REAL_MONEY_ENABLED/);
  });

  it('rejects weak secrets and a wrong-size TOTP key, treating empty strings as unset', () => {
    expect(() => parseEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => parseEnv({ ...base, TOTP_ENCRYPTION_KEY: 'c2hvcnQ=' })).toThrow(
      /TOTP_ENCRYPTION_KEY/,
    );
    expect(parseEnv({ ...base, PRIVY_APP_ID: '' }).PRIVY_APP_ID).toBeUndefined();
  });
});
