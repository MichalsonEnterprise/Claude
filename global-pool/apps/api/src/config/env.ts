/**
 * Environment validation (zod). The API refuses to boot with an invalid or unsafe configuration.
 * Template: global-pool/.env.example. Empty strings are treated as "unset".
 */
import { isAddress } from 'viem';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

const csv = z
  .string()
  .transform((v) =>
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
  TOTP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
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
  WITHDRAWAL_SIGNER_PRIVATE_KEY: z.string().optional(),

  RANDOMNESS_PROVIDER: z.enum(['mock', 'chainlink']).default('mock'),
  VRF_COORDINATOR: evmAddress.optional(),
  VRF_KEY_HASH: z.string().optional(),
  VRF_SUBSCRIPTION_ID: z.string().optional(),
  VRF_CALLBACK_GAS_LIMIT: z.coerce.number().int().default(500_000),
  VRF_REQUEST_CONFIRMATIONS: z.coerce.number().int().default(3),
  VRF_TIMEOUT_HOURS: z.coerce.number().int().min(1).default(24),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  BULLMQ_PREFIX: z.string().default('gp'),
  /** Start BullMQ workers + repeatable jobs in this process (disable for one-off scripts / some tests). */
  JOBS_ENABLED: bool.default(true),
  /** DEMO convenience: automatically open the next daily round (08:00–20:00 UTC) when none is open. */
  ROUND_AUTO_SCHEDULE: bool.default(true),
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
  return result.data;
}
