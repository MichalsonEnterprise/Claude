import { describe, expect, it } from 'vitest';

import { AppConfig } from './app-config';
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

  it('CRASH_LOOP_ENABLED is optional (unset = follow JOBS_ENABLED) and parsed as a boolean', () => {
    expect(parseEnv(base).CRASH_LOOP_ENABLED).toBeUndefined();
    expect(parseEnv({ ...base, CRASH_LOOP_ENABLED: '' }).CRASH_LOOP_ENABLED).toBeUndefined();
    expect(parseEnv({ ...base, JOBS_ENABLED: 'false', CRASH_LOOP_ENABLED: 'true' })).toMatchObject({
      JOBS_ENABLED: false,
      CRASH_LOOP_ENABLED: true,
    });
    expect(() => parseEnv({ ...base, CRASH_LOOP_ENABLED: 'maybe' })).toThrow(/CRASH_LOOP_ENABLED/);
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

describe('placeholder secrets (R04)', () => {
  // The committed .env.example values: public, so anyone could forge step-up / admin tokens with them.
  const example = {
    JWT_ACCESS_SECRET: 'dev-only-change-me-access-secret-at-least-32-chars',
    JWT_REFRESH_SECRET: 'dev-only-change-me-refresh-secret-at-least-32-chars',
    ADMIN_JWT_ACCESS_SECRET: 'dev-only-change-me-admin-access-secret-32-chars',
    ADMIN_JWT_REFRESH_SECRET: 'dev-only-change-me-admin-refresh-secret-32-chars',
    TOTP_ENCRYPTION_KEY: 'ZGV2LW9ubHktdG90cC1rZXktMzItYnl0ZXMtbG9uZyE=',
  };

  it('accepts the .env.example placeholders in development and test', () => {
    expect(parseEnv({ ...base, ...example, NODE_ENV: 'development' }).JWT_ACCESS_SECRET).toBe(
      example.JWT_ACCESS_SECRET,
    );
    expect(() => parseEnv({ ...base, ...example, NODE_ENV: 'test' })).not.toThrow();
  });

  it('refuses to boot in production with any .env.example placeholder secret', () => {
    for (const [name, value] of Object.entries(example)) {
      expect(() => parseEnv({ ...base, NODE_ENV: 'production', [name]: value })).toThrow(
        new RegExp(`${name}: the committed placeholder`),
      );
    }
    // Any other 'dev-only' / 'change-me' value, raw or inside a base64 key, is refused as well.
    expect(() =>
      parseEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'x'.repeat(24) + 'CHANGE-ME!' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        ENTRY_SALT_ENCRYPTION_KEY: Buffer.from('dev-only-salt-key-32-bytes-long!').toString('base64'),
      }),
    ).toThrow(/ENTRY_SALT_ENCRYPTION_KEY/);
    // Fresh random secrets boot fine.
    expect(parseEnv({ ...base, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
  });

  it('never echoes the refused secret value', () => {
    try {
      parseEnv({ ...base, NODE_ENV: 'production', ...example });
      expect.unreachable();
    } catch (err) {
      expect(String(err)).not.toContain(example.ADMIN_JWT_ACCESS_SECRET);
    }
  });
});

describe('on-chain configuration (testnet only)', () => {
  const key = `0x${'ab'.repeat(32)}`;
  const chain = {
    ARBITRUM_SEPOLIA_RPC_URL: 'http://127.0.0.1:8545',
    POOL_CONTRACT_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  };

  it('accepts only Arbitrum Sepolia and the local Anvil devnet, and never Anvil in production', () => {
    expect(parseEnv(base).EVM_CHAIN_ID).toBe(421_614);
    expect(parseEnv({ ...base, EVM_CHAIN_ID: '31337' }).EVM_CHAIN_ID).toBe(31_337);
    expect(() => parseEnv({ ...base, EVM_CHAIN_ID: '42161' })).toThrow(/EVM_CHAIN_ID/); // Arbitrum One mainnet
    expect(() => parseEnv({ ...base, EVM_CHAIN_ID: '1' })).toThrow(/EVM_CHAIN_ID/);
    expect(() => parseEnv({ ...base, NODE_ENV: 'production', EVM_CHAIN_ID: '31337' })).toThrow(
      /not allowed in production/,
    );
  });

  it('validates signer keys and the requirements of round mirroring / withdrawal broadcasting', () => {
    expect(() => parseEnv({ ...base, POOL_OPERATOR_PRIVATE_KEY: '0x1234' })).toThrow(
      /POOL_OPERATOR_PRIVATE_KEY/,
    );
    expect(() => parseEnv({ ...base, POOL_ONCHAIN_MIRROR: 'true' })).toThrow(
      /RANDOMNESS_PROVIDER=chainlink[\s\S]*POOL_OPERATOR_PRIVATE_KEY/,
    );
    const mirror = parseEnv({
      ...base,
      ...chain,
      POOL_ONCHAIN_MIRROR: 'true',
      RANDOMNESS_PROVIDER: 'chainlink',
      POOL_OPERATOR_PRIVATE_KEY: key,
    });
    expect(mirror.POOL_ONCHAIN_MIRROR).toBe(true);
    expect(() => parseEnv({ ...base, ...chain, WITHDRAWAL_BROADCASTER_ENABLED: 'true' })).toThrow(
      /WITHDRAWAL_SIGNER_PRIVATE_KEY/,
    );
    expect(() => parseEnv({ ...base, MAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
  });

  it('refuses RANDOMNESS_PROVIDER=chainlink without the on-chain mirror (rounds could never be drawn) (R10)', () => {
    expect(() =>
      parseEnv({ ...base, ...chain, RANDOMNESS_PROVIDER: 'chainlink', POOL_ONCHAIN_MIRROR: 'false' }),
    ).toThrow(/RANDOMNESS_PROVIDER=chainlink requires POOL_ONCHAIN_MIRROR=true/);
    expect(parseEnv({ ...base, RANDOMNESS_PROVIDER: 'mock' }).RANDOMNESS_PROVIDER).toBe('mock');
  });
});

describe('player auth mode (DEV MOCK)', () => {
  it('allows the DEV MOCK in development (docker compose dev profile) and refuses it in production', () => {
    const dev = new AppConfig(parseEnv({ ...base, NODE_ENV: 'development', PRIVY_MOCK: 'true' }));
    expect(dev.playerAuthMode).toBe('mock');
    const devWithApp = new AppConfig(
      parseEnv({ ...base, NODE_ENV: 'development', PRIVY_MOCK: 'true', PRIVY_APP_ID: 'app' }),
    );
    expect(devWithApp.playerAuthMode).toBe('mock');
    const prod = new AppConfig(parseEnv({ ...base, NODE_ENV: 'production', PRIVY_MOCK: 'true' }));
    expect(prod.playerAuthMode).toBe('disabled');
    const prodPrivy = new AppConfig(
      parseEnv({ ...base, NODE_ENV: 'production', PRIVY_APP_ID: 'app' }),
    );
    expect(prodPrivy.playerAuthMode).toBe('privy');
  });
});
