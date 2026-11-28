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
    expect(() =>
      parseEnv({ ...base, NODE_ENV: 'production', EVM_CHAIN_ID: '31337' }),
    ).toThrow(/not allowed in production/);
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
    expect(() => parseEnv({ ...base, EMAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_HOST/);
  });
});
