/**
 * Environment validation (zod). The API refuses to boot with an invalid or unsafe configuration.
 * Template: global-pool/.env.example. Empty strings are treated as "unset".
 */
import { isAddress } from 'viem';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

const csv = z.string().transform((v) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const evmAddress = z.string().refine((v) => isAddress(v, { strict: false }), {
  error: 'Must be a 0x-prefixed EVM address',
});

/** '15m' | '8h' | '30d' | '45s' → seconds */
const duration = z
  .string()
  .regex(/^\d+[smhd]$/, { error: 'Use a duration like 45s, 15m, 8h or 30d' })
  .transform((v) => {
    const n = Number(v.slice(0, -1));
    const unit = v.slice(-1);
    return n * (unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400);
  });

const secret = (name: string) =>
  z.string().min(32, { error: `${name} must be at least 32 characters` });

/** 0x-prefixed 32-byte hex private key (TESTNET signer keys only; never logged). */
const privateKey = (name: string) =>
  z.string().regex(/^0x[0-9a-fA-F]{64}$/, {
    error: `${name} must be a 0x-prefixed 32-byte hex private key (testnet / throwaway only)`,
  });

const base64Key32 = (name: string) =>
  z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
    error: `${name} must be 32 bytes, base64-encoded (openssl rand -base64 32)`,
  });

/** Testnets the API may talk to: Arbitrum Sepolia, or a local Anvil devnet (never in production). */
export const SUPPORTED_EVM_CHAIN_IDS = [421_614, 31_337] as const;

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Hard kill switch: this build has NO mainnet configuration, so `true` is rejected at boot. */
  REAL_MONEY_ENABLED: bool.default(false).refine((v) => !v, {
    error:
      'REAL_MONEY_ENABLED=true is not supported: this is a DEMO / testnet build without mainnet configuration',
  }),
  DEMO_MODE: bool.default(true),

  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.url().default('http://localhost:4000'),
  APP_URL: z.url().default('http://localhost:3000'),
  CORS_ORIGINS: csv.default(['http://localhost:3000']),
  TRUST_PROXY: bool.default(false),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL: duration.default(900),
  JWT_REFRESH_TTL: duration.default(2_592_000),
  STEP_UP_TOKEN_TTL: duration.default(300),
  ADMIN_JWT_ACCESS_SECRET: secret('ADMIN_JWT_ACCESS_SECRET'),
  ADMIN_JWT_REFRESH_SECRET: secret('ADMIN_JWT_REFRESH_SECRET'),
  ADMIN_ACCESS_TTL: duration.default(900),
  ADMIN_SESSION_TTL: duration.default(28_800),
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  ADMIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).default(15),
  TOTP_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
    error: 'TOTP_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)',
  }),
  TOTP_ISSUER: z.string().default('GLOBAL POOL (DEMO)'),
  STEP_UP_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  STEP_UP_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),

  PRIVY_APP_ID: z.string().optional(),
  PRIVY_APP_SECRET: z.string().optional(),
  PRIVY_VERIFICATION_KEY: z.string().optional(),
  PRIVY_MOCK: bool.default(false),
  PRIVY_MOCK_SIGNING_SECRET: secret('PRIVY_MOCK_SIGNING_SECRET').default(
    'dev-only-change-me-mock-token-secret-32-chars',
  ),

  MIN_AGE: z.coerce.number().int().min(18).default(18),
  RESTRICTED_COUNTRIES: csv
    .transform((list) => list.map((c) => c.toUpperCase()))
    .pipe(z.array(z.string().regex(/^[A-Z]{2}$/)))
    .default(['US', 'CU', 'IR', 'KP', 'SY']),
  GEO_COUNTRY_HEADER: z.string().default('cf-ipcountry'),
  DEV_COUNTRY_OVERRIDE: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((v) => v.toUpperCase())
    .optional(),
  KYC_PROVIDER: z.enum(['mock']).default('mock'),
  AML_PROVIDER: z.enum(['mock']).default('mock'),

  CHAIN_ENV: z.literal('testnet').default('testnet'),
  ARBITRUM_SEPOLIA_RPC_URL: z.url().optional(),
  TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA: evmAddress.optional(),
  POOL_CONTRACT_ADDRESS: evmAddress.optional(),
  DEPOSIT_XPUB: z
    .string()
    .regex(/^tpub|^xpub/, { error: 'DEPOSIT_XPUB must be an extended public key (tpub… / xpub…)' })
    .optional(),
  DEPOSIT_CONFIRMATIONS_ARBITRUM: z.coerce.number().int().min(1).default(20),
  DEPOSIT_WATCHER_START_BLOCK: z.coerce.bigint().optional(),
  DEPOSIT_WATCHER_POLL_SECONDS: z.coerce.number().int().min(5).default(15),
  DEPOSIT_WATCHER_MAX_BLOCK_RANGE: z.coerce.number().int().min(100).default(5000),
  /**
   * EVM chain the RPC above serves: 421614 (Arbitrum Sepolia, default) or 31337 (local Anvil devnet, dev/test only).
   * Every signer checks eth_chainId against this before signing; mainnet ids are impossible by construction.
   */
  EVM_CHAIN_ID: z.coerce
    .number()
    .int()
    .refine((v) => (SUPPORTED_EVM_CHAIN_IDS as readonly number[]).includes(v), {
      error: 'EVM_CHAIN_ID must be 421614 (Arbitrum Sepolia) or 31337 (local Anvil)',
    })
    .default(421_614),
  /** Confirmations an API-sent transaction (round mirroring) needs before the next step builds on it. */
  CHAIN_WRITE_CONFIRMATIONS: z.coerce.number().int().min(1).default(2),
  /** How long one call waits for a sent transaction's receipt before handing over to the next tick. */
  CHAIN_TX_WAIT_SECONDS: z.coerce.number().int().min(1).default(60),
  /** Re-send a broadcast-but-unmined transaction (same raw bytes, same hash) after this many seconds. */
  CHAIN_REBROADCAST_SECONDS: z.coerce.number().int().min(5).default(120),

  /** Hot-wallet key for test-USDT withdrawals (TESTNET ONLY, throwaway). Required by WITHDRAWAL_BROADCASTER_ENABLED. */
  WITHDRAWAL_SIGNER_PRIVATE_KEY: privateKey('WITHDRAWAL_SIGNER_PRIVATE_KEY').optional(),
  /** Broadcast queued withdrawals on-chain (else they stay queued; DEMO builds can simulate the confirmation). */
  WITHDRAWAL_BROADCASTER_ENABLED: bool.default(false),
  /** Confirmations before a broadcast withdrawal is settled in the ledger. */
  WITHDRAWAL_CONFIRMATIONS: z.coerce.number().int().min(1).default(20),
  WITHDRAWAL_TRACK_POLL_SECONDS: z.coerce.number().int().min(1).default(15),

  /** Mirror rounds on GlobalPoolRounds (openRound → commitEntries → requestDraw → recordSettlement / cancelRound). */
  POOL_ONCHAIN_MIRROR: bool.default(false),
  /** First block to scan for GlobalPoolRounds events (deployment block). */
  POOL_CONTRACT_START_BLOCK: z.coerce.bigint().optional(),
  /** OPERATOR_ROLE key (openRound, commitEntries). TESTNET ONLY; production keys belong in a KMS/HSM. */
  POOL_OPERATOR_PRIVATE_KEY: privateKey('POOL_OPERATOR_PRIVATE_KEY').optional(),
  /** SETTLER_ROLE key (recordSettlement); defaults to the operator key. */
  POOL_SETTLER_PRIVATE_KEY: privateKey('POOL_SETTLER_PRIVATE_KEY').optional(),
  /** Keeper key for the permissionless calls (requestDraw, cancelRound on failed thresholds); defaults to the operator key. */
  POOL_KEEPER_PRIVATE_KEY: privateKey('POOL_KEEPER_PRIVATE_KEY').optional(),
  /** AES-256-GCM key for per-entry commitment salts (default: HKDF of TOTP_ENCRYPTION_KEY). */
  ENTRY_SALT_ENCRYPTION_KEY: base64Key32('ENTRY_SALT_ENCRYPTION_KEY').optional(),

  RANDOMNESS_PROVIDER: z.enum(['mock', 'chainlink']).default('mock'),
  VRF_COORDINATOR: evmAddress.optional(),
  VRF_KEY_HASH: z.string().optional(),
  VRF_SUBSCRIPTION_ID: z.string().optional(),
  VRF_CALLBACK_GAS_LIMIT: z.coerce.number().int().default(500_000),
  VRF_REQUEST_CONFIRMATIONS: z.coerce.number().int().default(3),
  VRF_TIMEOUT_HOURS: z.coerce.number().int().min(1).default(24),
  /** Confirmations a DrawFulfilled event needs before settlement (Arbitrum Sepolia: 20 per the demo table). */
  VRF_FULFILLMENT_CONFIRMATIONS: z.coerce.number().int().min(1).default(20),

  /** Outbound email: log (dev: logs a redacted preview; `console` is an alias), smtp (SMTP_* below) or disabled. */
  MAIL_TRANSPORT: z
    .enum(['log', 'console', 'smtp', 'disabled'])
    .transform((v) => (v === 'console' ? 'log' : v))
    .default('log'),
  MAIL_FROM: z.string().default('GLOBAL POOL (DEMO) <no-reply@globalpool.example>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  /** true = implicit TLS (port 465); false = STARTTLS when the server offers it. */
  SMTP_SECURE: bool.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** Share socket.io rooms/broadcasts across API replicas through Redis pub/sub. */
  SOCKET_IO_REDIS_ADAPTER: bool.default(false),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  /** Admin login attempts per IP per minute (read at request time by the route throttler). */
  ADMIN_LOGIN_THROTTLE_LIMIT: z.coerce.number().int().min(1).default(10),
  DEV_TOKEN_THROTTLE_LIMIT: z.coerce.number().int().min(1).default(30),
  BULLMQ_PREFIX: z.string().default('gp'),
  /** Start BullMQ workers + repeatable jobs in this process (disable for one-off scripts / some tests). */
  JOBS_ENABLED: bool.default(true),
  /** DEMO convenience: automatically open the next daily round (08:00–20:00 UTC) when none is open. */
  ROUND_AUTO_SCHEDULE: bool.default(true),
  /** DEMO rounds are a frozen snapshot: they close at their real time but are not drawn unless this is true. */
  DEMO_ROUNDS_AUTO_SETTLE: bool.default(false),
});

export type Env = z.infer<typeof envSchema>;

/** Parse process.env (empty strings → unset). Throws a readable error listing every invalid variable. */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (typeof v === 'string' && v.trim() !== '') cleaned[k] = v.trim();
  }
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid API configuration:\n${lines.join('\n')}`);
  }
  const problems = crossFieldProblems(result.data);
  if (problems.length > 0) {
    throw new Error(`Invalid API configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  return result.data;
}

/** Rules that span several variables (on-chain features need their RPC, contract and keys). */
export function crossFieldProblems(env: Env): string[] {
  const out: string[] = [];
  if (env.NODE_ENV === 'production' && env.EVM_CHAIN_ID === 31_337) {
    out.push('EVM_CHAIN_ID: the local Anvil devnet (31337) is not allowed in production');
  }
  if (env.POOL_ONCHAIN_MIRROR) {
    if (env.RANDOMNESS_PROVIDER !== 'chainlink')
      out.push('POOL_ONCHAIN_MIRROR=true requires RANDOMNESS_PROVIDER=chainlink');
    if (!env.ARBITRUM_SEPOLIA_RPC_URL)
      out.push('POOL_ONCHAIN_MIRROR=true requires ARBITRUM_SEPOLIA_RPC_URL');
    if (!env.POOL_CONTRACT_ADDRESS)
      out.push('POOL_ONCHAIN_MIRROR=true requires POOL_CONTRACT_ADDRESS');
    if (!env.POOL_OPERATOR_PRIVATE_KEY)
      out.push('POOL_ONCHAIN_MIRROR=true requires POOL_OPERATOR_PRIVATE_KEY (testnet key)');
  }
  if (env.WITHDRAWAL_BROADCASTER_ENABLED) {
    if (!env.ARBITRUM_SEPOLIA_RPC_URL)
      out.push('WITHDRAWAL_BROADCASTER_ENABLED=true requires ARBITRUM_SEPOLIA_RPC_URL');
    if (!env.TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA)
      out.push('WITHDRAWAL_BROADCASTER_ENABLED=true requires TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA');
    if (!env.WITHDRAWAL_SIGNER_PRIVATE_KEY)
      out.push(
        'WITHDRAWAL_BROADCASTER_ENABLED=true requires WITHDRAWAL_SIGNER_PRIVATE_KEY (testnet key)',
      );
  }
  if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
    out.push('MAIL_TRANSPORT=smtp requires SMTP_HOST');
  }
  return out;
}
