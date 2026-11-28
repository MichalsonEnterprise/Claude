"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCTION_SECRETS = exports.envSchema = exports.SUPPORTED_EVM_CHAIN_IDS = void 0;
exports.parseEnv = parseEnv;
exports.isPlaceholderSecret = isPlaceholderSecret;
exports.productionSecretProblems = productionSecretProblems;
exports.crossFieldProblems = crossFieldProblems;
/**
 * Environment validation (zod). The API refuses to boot with an invalid or unsafe configuration.
 * Template: global-pool/.env.example. Empty strings are treated as "unset".
 */
const viem_1 = require("viem");
const zod_1 = require("zod");
const bool = zod_1.z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .transform((v) => v === 'true' || v === '1' || v === 'yes');
const csv = zod_1.z.string().transform((v) => v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean));
const evmAddress = zod_1.z.string().refine((v) => (0, viem_1.isAddress)(v, { strict: false }), {
    error: 'Must be a 0x-prefixed EVM address',
});
/** '15m' | '8h' | '30d' | '45s' → seconds */
const duration = zod_1.z
    .string()
    .regex(/^\d+[smhd]$/, { error: 'Use a duration like 45s, 15m, 8h or 30d' })
    .transform((v) => {
    const n = Number(v.slice(0, -1));
    const unit = v.slice(-1);
    return n * (unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400);
});
const secret = (name) => zod_1.z.string().min(32, { error: `${name} must be at least 32 characters` });
/** 0x-prefixed 32-byte hex private key (TESTNET signer keys only; never logged). */
const privateKey = (name) => zod_1.z.string().regex(/^0x[0-9a-fA-F]{64}$/, {
    error: `${name} must be a 0x-prefixed 32-byte hex private key (testnet / throwaway only)`,
});
const base64Key32 = (name) => zod_1.z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
    error: `${name} must be 32 bytes, base64-encoded (openssl rand -base64 32)`,
});
/** Testnets the API may talk to: Arbitrum Sepolia, or a local Anvil devnet (never in production). */
exports.SUPPORTED_EVM_CHAIN_IDS = [421_614, 31_337];
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Hard kill switch: this build has NO mainnet configuration, so `true` is rejected at boot. */
    REAL_MONEY_ENABLED: bool.default(false).refine((v) => !v, {
        error: 'REAL_MONEY_ENABLED=true is not supported: this is a DEMO / testnet build without mainnet configuration',
    }),
    DEMO_MODE: bool.default(true),
    API_PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(4000),
    API_URL: zod_1.z.url().default('http://localhost:4000'),
    APP_URL: zod_1.z.url().default('http://localhost:3000'),
    CORS_ORIGINS: csv.default(['http://localhost:3000']),
    TRUST_PROXY: bool.default(false),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1).default('redis://127.0.0.1:6379'),
    JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
    JWT_ACCESS_TTL: duration.default(900),
    JWT_REFRESH_TTL: duration.default(2_592_000),
    STEP_UP_TOKEN_TTL: duration.default(300),
    ADMIN_JWT_ACCESS_SECRET: secret('ADMIN_JWT_ACCESS_SECRET'),
    ADMIN_JWT_REFRESH_SECRET: secret('ADMIN_JWT_REFRESH_SECRET'),
    ADMIN_ACCESS_TTL: duration.default(900),
    ADMIN_SESSION_TTL: duration.default(28_800),
    /** Server-side admin idle timeout (ADM-01: 15 min without an admin request → refresh / access refused). */
    ADMIN_IDLE_TIMEOUT: duration.default(900),
    ADMIN_LOGIN_MAX_ATTEMPTS: zod_1.z.coerce.number().int().min(1).default(5),
    ADMIN_LOCKOUT_MINUTES: zod_1.z.coerce.number().int().min(1).default(15),
    TOTP_ENCRYPTION_KEY: zod_1.z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
        error: 'TOTP_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)',
    }),
    TOTP_ISSUER: zod_1.z.string().default('GLOBAL POOL (DEMO)'),
    STEP_UP_MAX_ATTEMPTS: zod_1.z.coerce.number().int().min(1).default(5),
    STEP_UP_LOCK_MINUTES: zod_1.z.coerce.number().int().min(1).default(15),
    PRIVY_APP_ID: zod_1.z.string().optional(),
    PRIVY_APP_SECRET: zod_1.z.string().optional(),
    PRIVY_VERIFICATION_KEY: zod_1.z.string().optional(),
    PRIVY_MOCK: bool.default(false),
    PRIVY_MOCK_SIGNING_SECRET: secret('PRIVY_MOCK_SIGNING_SECRET').default('dev-only-change-me-mock-token-secret-32-chars'),
    MIN_AGE: zod_1.z.coerce.number().int().min(18).default(18),
    RESTRICTED_COUNTRIES: csv
        .transform((list) => list.map((c) => c.toUpperCase()))
        .pipe(zod_1.z.array(zod_1.z.string().regex(/^[A-Z]{2}$/)))
        .default(['US', 'CU', 'IR', 'KP', 'SY']),
    GEO_COUNTRY_HEADER: zod_1.z.string().default('cf-ipcountry'),
    DEV_COUNTRY_OVERRIDE: zod_1.z
        .string()
        .regex(/^[A-Za-z]{2}$/)
        .transform((v) => v.toUpperCase())
        .optional(),
    KYC_PROVIDER: zod_1.z.enum(['mock']).default('mock'),
    AML_PROVIDER: zod_1.z.enum(['mock']).default('mock'),
    CHAIN_ENV: zod_1.z.literal('testnet').default('testnet'),
    ARBITRUM_SEPOLIA_RPC_URL: zod_1.z.url().optional(),
    TEST_USDT_ADDRESS_ARBITRUM_SEPOLIA: evmAddress.optional(),
    POOL_CONTRACT_ADDRESS: evmAddress.optional(),
    DEPOSIT_XPUB: zod_1.z
        .string()
        .regex(/^tpub|^xpub/, { error: 'DEPOSIT_XPUB must be an extended public key (tpub… / xpub…)' })
        .optional(),
    DEPOSIT_CONFIRMATIONS_ARBITRUM: zod_1.z.coerce.number().int().min(1).default(20),
    DEPOSIT_WATCHER_START_BLOCK: zod_1.z.coerce.bigint().optional(),
    DEPOSIT_WATCHER_POLL_SECONDS: zod_1.z.coerce.number().int().min(5).default(15),
    DEPOSIT_WATCHER_MAX_BLOCK_RANGE: zod_1.z.coerce.number().int().min(100).default(5000),
    /**
     * EVM chain the RPC above serves: 421614 (Arbitrum Sepolia, default) or 31337 (local Anvil devnet, dev/test only).
     * Every signer checks eth_chainId against this before signing; mainnet ids are impossible by construction.
     */
    EVM_CHAIN_ID: zod_1.z.coerce
        .number()
        .int()
        .refine((v) => exports.SUPPORTED_EVM_CHAIN_IDS.includes(v), {
        error: 'EVM_CHAIN_ID must be 421614 (Arbitrum Sepolia) or 31337 (local Anvil)',
    })
        .default(421_614),
    /** Confirmations an API-sent transaction (round mirroring) needs before the next step builds on it. */
    CHAIN_WRITE_CONFIRMATIONS: zod_1.z.coerce.number().int().min(1).default(2),
    /** How long one call waits for a sent transaction's receipt before handing over to the next tick. */
    CHAIN_TX_WAIT_SECONDS: zod_1.z.coerce.number().int().min(1).default(60),
    /** Re-send a broadcast-but-unmined transaction (same raw bytes, same hash) after this many seconds. */
    CHAIN_REBROADCAST_SECONDS: zod_1.z.coerce.number().int().min(5).default(120),
    /** Hot-wallet key for test-USDT withdrawals (TESTNET ONLY, throwaway). Required by WITHDRAWAL_BROADCASTER_ENABLED. */
    WITHDRAWAL_SIGNER_PRIVATE_KEY: privateKey('WITHDRAWAL_SIGNER_PRIVATE_KEY').optional(),
    /** Broadcast queued withdrawals on-chain (else they stay queued; DEMO builds can simulate the confirmation). */
    WITHDRAWAL_BROADCASTER_ENABLED: bool.default(false),
    /** Confirmations before a broadcast withdrawal is settled in the ledger. */
    WITHDRAWAL_CONFIRMATIONS: zod_1.z.coerce.number().int().min(1).default(20),
    WITHDRAWAL_TRACK_POLL_SECONDS: zod_1.z.coerce.number().int().min(1).default(15),
    /** Mirror rounds on GlobalPoolRounds (openRound → commitEntries → requestDraw → recordSettlement / cancelRound). */
    POOL_ONCHAIN_MIRROR: bool.default(false),
    /** First block to scan for GlobalPoolRounds events (deployment block). */
    POOL_CONTRACT_START_BLOCK: zod_1.z.coerce.bigint().optional(),
    /** OPERATOR_ROLE key (openRound, commitEntries). TESTNET ONLY; production keys belong in a KMS/HSM. */
    POOL_OPERATOR_PRIVATE_KEY: privateKey('POOL_OPERATOR_PRIVATE_KEY').optional(),
    /** SETTLER_ROLE key (recordSettlement); defaults to the operator key. */
    POOL_SETTLER_PRIVATE_KEY: privateKey('POOL_SETTLER_PRIVATE_KEY').optional(),
    /** Keeper key for the permissionless calls (requestDraw, cancelRound on failed thresholds); defaults to the operator key. */
    POOL_KEEPER_PRIVATE_KEY: privateKey('POOL_KEEPER_PRIVATE_KEY').optional(),
    /** AES-256-GCM key for per-entry commitment salts (default: HKDF of TOTP_ENCRYPTION_KEY). */
    ENTRY_SALT_ENCRYPTION_KEY: base64Key32('ENTRY_SALT_ENCRYPTION_KEY').optional(),
    RANDOMNESS_PROVIDER: zod_1.z.enum(['mock', 'chainlink']).default('mock'),
    VRF_COORDINATOR: evmAddress.optional(),
    VRF_KEY_HASH: zod_1.z.string().optional(),
    VRF_SUBSCRIPTION_ID: zod_1.z.string().optional(),
    VRF_CALLBACK_GAS_LIMIT: zod_1.z.coerce.number().int().default(500_000),
    VRF_REQUEST_CONFIRMATIONS: zod_1.z.coerce.number().int().default(3),
    VRF_TIMEOUT_HOURS: zod_1.z.coerce.number().int().min(1).default(24),
    /** Confirmations a DrawFulfilled event needs before settlement (Arbitrum Sepolia: 20 per the demo table). */
    VRF_FULFILLMENT_CONFIRMATIONS: zod_1.z.coerce.number().int().min(1).default(20),
    /** Outbound email: log (dev: logs a redacted preview; `console` is an alias), smtp (SMTP_* below) or disabled. */
    MAIL_TRANSPORT: zod_1.z
        .enum(['log', 'console', 'smtp', 'disabled'])
        .transform((v) => (v === 'console' ? 'log' : v))
        .default('log'),
    MAIL_FROM: zod_1.z.string().default('GLOBAL POOL (DEMO) <no-reply@globalpool.example>'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(587),
    /** true = implicit TLS (port 465); false = STARTTLS when the server offers it. */
    SMTP_SECURE: bool.default(false),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    /** Share socket.io rooms/broadcasts across API replicas through Redis pub/sub. */
    SOCKET_IO_REDIS_ADAPTER: bool.default(false),
    THROTTLE_TTL_SECONDS: zod_1.z.coerce.number().int().min(1).default(60),
    THROTTLE_LIMIT: zod_1.z.coerce.number().int().min(1).default(120),
    /** Admin login attempts per IP per minute (read at request time by the route throttler). */
    ADMIN_LOGIN_THROTTLE_LIMIT: zod_1.z.coerce.number().int().min(1).default(10),
    DEV_TOKEN_THROTTLE_LIMIT: zod_1.z.coerce.number().int().min(1).default(30),
    BULLMQ_PREFIX: zod_1.z.string().default('gp'),
    /** Start BullMQ workers + repeatable jobs in this process (disable for one-off scripts / some tests). */
    JOBS_ENABLED: bool.default(true),
    /** DEMO convenience: automatically open the next daily round (08:00–20:00 UTC) when none is open. */
    ROUND_AUTO_SCHEDULE: bool.default(true),
    /** DEMO rounds are a frozen snapshot: they close at their real time but are not drawn unless this is true. */
    DEMO_ROUNDS_AUTO_SETTLE: bool.default(false),
});
/** Parse process.env (empty strings → unset). Throws a readable error listing every invalid variable. */
function parseEnv(source = process.env) {
    const cleaned = {};
    for (const [k, v] of Object.entries(source)) {
        if (typeof v === 'string' && v.trim() !== '')
            cleaned[k] = v.trim();
    }
    const result = exports.envSchema.safeParse(cleaned);
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
/**
 * Secrets that sign or encrypt something in production (step-up tokens, admin access tokens, TOTP seeds, entry
 * salts). PRIVY_MOCK_SIGNING_SECRET is not listed: the DEV MOCK is refused in production, so it never verifies
 * anything there.
 */
exports.PRODUCTION_SECRETS = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ADMIN_JWT_ACCESS_SECRET',
    'ADMIN_JWT_REFRESH_SECRET',
    'TOTP_ENCRYPTION_KEY',
    'ENTRY_SALT_ENCRYPTION_KEY',
];
/**
 * Public values: everything committed in .env.example / code defaults. Anyone can read them, so a production
 * process that accepts one lets anyone forge step-up tokens (2FA bypass) or admin access tokens.
 */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
    'dev-only-change-me-access-secret-at-least-32-chars',
    'dev-only-change-me-refresh-secret-at-least-32-chars',
    'dev-only-change-me-admin-access-secret-32-chars',
    'dev-only-change-me-admin-refresh-secret-32-chars',
    'dev-only-change-me-mock-token-secret-32-chars',
    'ZGV2LW9ubHktdG90cC1rZXktMzItYnl0ZXMtbG9uZyE=',
]);
const PLACEHOLDER_MARKER = /dev[-_ ]?only|change[-_ ]?me|placeholder|example|not[-_ ]?secret/i;
/** True for a committed / obviously placeholder secret (checked raw and, for base64 keys, decoded). */
function isPlaceholderSecret(value) {
    if (KNOWN_PLACEHOLDER_SECRETS.has(value) || PLACEHOLDER_MARKER.test(value))
        return true;
    const decoded = Buffer.from(value, 'base64').toString('latin1');
    return PLACEHOLDER_MARKER.test(decoded);
}
/** Production refuses the committed placeholder secrets (the value itself is never echoed). */
function productionSecretProblems(env) {
    if (env.NODE_ENV !== 'production')
        return [];
    return exports.PRODUCTION_SECRETS.filter((name) => {
        const value = env[name];
        return value !== undefined && isPlaceholderSecret(value);
    }).map((name) => `${name}: the committed placeholder (or a 'dev-only' / 'change-me' value) is refused in production — generate a fresh secret (openssl rand -base64 48; keys: openssl rand -base64 32)`);
}
/** Rules that span several variables (on-chain features need their RPC, contract and keys). */
function crossFieldProblems(env) {
    const out = [...productionSecretProblems(env)];
    if (env.NODE_ENV === 'production' && env.EVM_CHAIN_ID === 31_337) {
        out.push('EVM_CHAIN_ID: the local Anvil devnet (31337) is not allowed in production');
    }
    // Chainlink randomness exists only for rounds committed on GlobalPoolRounds: without the mirror no draw could ever
    // be requested and closed rounds would wait forever.
    if (env.RANDOMNESS_PROVIDER === 'chainlink' && !env.POOL_ONCHAIN_MIRROR) {
        out.push('RANDOMNESS_PROVIDER=chainlink requires POOL_ONCHAIN_MIRROR=true');
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
            out.push('WITHDRAWAL_BROADCASTER_ENABLED=true requires WITHDRAWAL_SIGNER_PRIVATE_KEY (testnet key)');
    }
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
        out.push('MAIL_TRANSPORT=smtp requires SMTP_HOST');
    }
    return out;
}
//# sourceMappingURL=env.js.map