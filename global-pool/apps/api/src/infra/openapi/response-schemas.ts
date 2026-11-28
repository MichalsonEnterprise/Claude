/**
 * OpenAPI RESPONSE schemas for the main endpoints (zod → JSON Schema, injected into /docs-json by
 * `applyResponseSchemas`). Objects are `looseObject`: the listed fields are guaranteed (the e2e contract test parses
 * live responses with these schemas), extra fields may be added additively without breaking clients.
 * Money is always a decimal string (2–6 dp) — never a JSON number.
 */
import type { OpenAPIObject } from '@nestjs/swagger';
import { errorEnvelopeSchema, pageMetaSchema } from '@gp/shared/schemas';
import { z } from 'zod';

const usdt = z
  .string()
  .regex(/^-?\d+\.\d{2,6}$/)
  .describe('USDT amount as a decimal string (2–6 decimals), e.g. "351.75"');
const iso = z.string().describe('ISO 8601 timestamp (UTC)');
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

const amountItem = z.looseObject({ label: z.string(), amount: usdt, reference: z.string() });

export const HealthResponse = z.looseObject({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'test', 'production']),
  demoMode: z.boolean(),
  realMoneyEnabled: z.literal(false),
  chainEnv: z.literal('testnet'),
  uptimeSeconds: z.number().int(),
  checks: z.object({
    database: z.looseObject({ status: z.enum(['up', 'down']), latencyMs: z.number() }),
    redis: z.looseObject({ status: z.enum(['up', 'down']), latencyMs: z.number() }),
  }),
  time: iso,
});

const winnerView = z.looseObject({
  place: z.number().int().min(1),
  tier: z.enum(['first', 'second', 'third', 'runner_up']),
  handle: z.string().nullable(),
  entryId: z.string().nullable(),
  entrySeq: z.number().int().nullable(),
  amount: usdt,
});

export const RoundView = z.looseObject({
  id: z.uuid(),
  number: z.number().int(),
  numberLabel: z.string(),
  status: z.enum(['scheduled', 'open', 'closed', 'drawing', 'settled', 'cancelled']),
  statusLabel: z.string(),
  opensAt: iso,
  closesAt: iso,
  closedAt: iso.nullable(),
  entryPrice: usdt,
  platformFeePerEntry: usdt.describe(
    'Platform fee per entry — a separate line, never part of the pool',
  ),
  participants: z.number().int(),
  entries: z.number().int(),
  poolBalance: usdt.describe('Σ entry amounts (fees excluded)'),
  platformFees: usdt,
  thresholds: z.looseObject({
    minParticipants: z.number().int(),
    minPool: usdt,
    met: z.boolean().nullable(),
  }),
  prizeDistribution: z.array(z.looseObject({})),
  draw: z
    .looseObject({
      provider: z.enum(['chainlink_vrf_v2_5', 'mock']),
      requestId: z.string(),
      requestedAt: iso,
      fulfilledAt: iso.nullable(),
      status: z.enum(['requested', 'fulfilled', 'failed', 'timed_out']),
    })
    .nullable(),
  winners: z.array(winnerView),
  cancellation: z
    .looseObject({
      reason: z.enum(['threshold_not_met', 'vrf_timeout']),
      refundsTo: z.literal('owed'),
    })
    .nullable(),
  settledAt: iso.nullable(),
  isDemo: z.boolean(),
});

export const EntryQuote = z.looseObject({
  entries: z.number().int().min(1),
  entryPrice: usdt,
  entryAmount: usdt,
  platformFeePerEntry: usdt,
  platformFee: usdt.describe('0.05 USDT per entry, its own line item'),
  networkFee: usdt.describe('Network fee for entries (0.00: paid from the platform balance)'),
  total: usdt,
  currency: z.literal('USDT'),
});

export const EntryPurchase = z.looseObject({
  roundId: z.uuid(),
  roundNumber: z.number().int(),
  entries: z.number().int(),
  firstEntryId: z.string(),
  lastEntryId: z.string(),
  entryPrice: usdt,
  entryAmount: usdt,
  platformFee: usdt,
  networkFee: usdt,
  total: usdt,
  reference: z.string(),
  transactionId: z.uuid(),
  postingId: z.uuid(),
  status: z.literal('active'),
  purchasedAt: iso,
  replayed: z.boolean().describe('true when an idempotent retry replays the stored response'),
});

export const RoundVerification = z.looseObject({
  round: z.looseObject({
    id: z.uuid(),
    number: z.number().int(),
    status: z.string(),
    totalEntries: z.number().int(),
    pool: usdt,
  }),
  algorithm: z.looseObject({
    name: z.literal('GLOBAL_POOL_WINNERS_V1'),
    domain: hex32,
    roundIdUsed: z.string(),
    prizeSplitBps: z.array(z.number().int()),
  }),
  randomness: z
    .looseObject({
      provider: z.enum(['chainlink_vrf_v2_5', 'mock']),
      requestId: z.string(),
      randomWord: z.string().nullable(),
    })
    .nullable(),
  winners: z.array(winnerView),
  recomputed: z.looseObject({ matchesStoredWinners: z.boolean().nullable() }).nullable(),
});

export const RoundChainStatus = z.looseObject({
  roundNumber: z.number().int(),
  mirrored: z.boolean(),
  network: z.string(),
  chainId: z.number().int(),
  contract: z.string().nullable(),
  contractUrl: z.string().nullable(),
  onchainRoundId: z.string(),
  onchainStatus: z.string().nullable(),
  rulesHash: z.string().nullable(),
  entriesMerkleRoot: z.string().nullable(),
  payoutsMerkleRoot: z.string().nullable(),
  steps: z.array(
    z.looseObject({
      step: z.enum(['open', 'commit', 'cancel', 'request_draw', 'settle']),
      attempt: z.number().int(),
      status: z.enum(['pending', 'sent', 'confirmed', 'failed']),
      txHash: z.string().nullable(),
      txUrl: z.string().nullable(),
      blockNumber: z.string().nullable(),
      at: iso,
    }),
  ),
  isDemo: z.boolean(),
});

export const RoundManifest = z.looseObject({
  roundNumber: z.number().int(),
  entriesMerkleRoot: z.string().nullable(),
  items: z.array(
    z.looseObject({
      index: z.number().int(),
      entryIdBytes32: hex32,
      userCommitment: hex32,
      leaf: hex32,
    }),
  ),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const RoundPayouts = z.looseObject({
  roundNumber: z.number().int(),
  payoutsMerkleRoot: z.string().nullable(),
  items: z.array(
    z.looseObject({
      rank: z.number().int(),
      onchainRank: z.number().int(),
      entryIndex: z.number().int(),
      entryIdBytes32: hex32,
      userCommitment: hex32,
      amount: usdt,
      amountUnits: z.string(),
      leaf: hex32,
      proof: z.array(hex32),
    }),
  ),
});

export const MyEntryProofs = z.looseObject({
  roundNumber: z.number().int(),
  entriesMerkleRoot: z.string().nullable(),
  entries: z.array(
    z.looseObject({
      entryId: z.string(),
      index: z.number().int(),
      entryIdBytes32: hex32,
      salt: hex32.describe('Secret salt — shown only to the entry owner'),
      userCommitment: hex32,
      leaf: hex32,
      proof: z.array(hex32),
    }),
  ),
});

export const WalletBalances = z.looseObject({
  available: usdt,
  locked: usdt,
  pending: usdt,
  owed: usdt,
  total: usdt,
  breakdown: z.looseObject({
    lockedWithdrawals: usdt,
    lockedEntries: usdt,
    locked: z.array(amountItem),
    pending: z.array(amountItem),
    owed: z.array(amountItem),
  }),
});

export const DepositAddress = z.looseObject({
  network: z.string(),
  networkName: z.string(),
  chainId: z.number().int().nullable(),
  token: z.string(),
  address: z.string(),
  minDeposit: usdt,
  confirmations: z.number().int(),
  testnet: z.literal(true),
  warning: z.string(),
});

export const DepositView = z.looseObject({
  id: z.uuid(),
  reference: z.string(),
  network: z.string(),
  status: z.enum(['detected', 'confirming', 'credited', 'rejected']),
  amount: usdt,
  txHash: z.string(),
  toAddress: z.string(),
  confirmations: z.object({ current: z.number().int(), required: z.number().int() }),
  detectedAt: iso,
  creditedAt: iso.nullable(),
  isDemo: z.boolean(),
});

export const WithdrawalView = z.looseObject({
  id: z.uuid(),
  reference: z.string(),
  network: z.string(),
  toAddress: z.string(),
  amount: usdt,
  networkFee: usdt,
  platformFee: usdt,
  youReceive: usdt,
  status: z.enum([
    'requested',
    'risk_check',
    'under_review',
    'queued',
    'broadcast',
    'confirmed',
    'failed',
    'rejected',
    'cancelled',
  ]),
  statusLabel: z.string(),
  flagged: z.boolean(),
  requiresFourEyes: z.boolean(),
  txHash: z.string().nullable(),
  failureReason: z.string().nullable(),
  timeline: z.array(z.looseObject({ status: z.string(), label: z.string(), at: iso })),
  createdAt: iso,
  isDemo: z.boolean(),
});

export const TransactionView = z.looseObject({
  id: z.string().describe('Public reference (DP-…, WD-…, EP-…, PZ-…, RF-…)'),
  type: z.string(),
  status: z.string(),
  direction: z.enum(['in', 'out']),
  amount: usdt,
  networkFee: usdt.nullable(),
  platformFee: usdt,
  netAmount: usdt,
  description: z.string(),
  createdAt: iso,
  isDemo: z.boolean(),
});

export const MeView = z.looseObject({
  id: z.uuid(),
  publicId: z.string(),
  handle: z.string().nullable(),
  onboarded: z.boolean(),
  kyc: z.looseObject({ level: z.string(), status: z.string() }),
  security: z.looseObject({ twoFactorEnabled: z.boolean() }),
});

const page = <T extends z.ZodType>(item: T) => pageMetaSchema.extend({ items: z.array(item) });

/** name → schema (component names in #/components/schemas). */
export const RESPONSE_COMPONENTS = {
  ErrorEnvelope: errorEnvelopeSchema,
  HealthResponse,
  RoundView,
  RoundPage: page(RoundView),
  EntryQuote,
  EntryPurchase,
  RoundVerification,
  RoundChainStatus,
  RoundManifest,
  RoundPayouts,
  MyEntryProofs,
  WalletBalances,
  DepositAddress,
  DepositPage: page(DepositView),
  WithdrawalView,
  WithdrawalPage: page(WithdrawalView),
  TransactionPage: page(TransactionView),
  MeView,
} as const;
export type ResponseComponent = keyof typeof RESPONSE_COMPONENTS;

/** "<method> <OpenAPI path>" → [status, component]. */
export const OPERATION_RESPONSES: Record<string, [number, ResponseComponent]> = {
  'get /health': [200, 'HealthResponse'],
  'get /me': [200, 'MeView'],
  'get /pool/rounds/current': [200, 'RoundView'],
  'get /pool/rounds': [200, 'RoundPage'],
  'get /pool/rounds/{number}': [200, 'RoundView'],
  'get /pool/quote': [200, 'EntryQuote'],
  'post /pool/rounds/{roundId}/entries': [201, 'EntryPurchase'],
  'get /pool/rounds/{number}/verify': [200, 'RoundVerification'],
  'get /pool/rounds/{number}/chain': [200, 'RoundChainStatus'],
  'get /pool/rounds/{number}/manifest': [200, 'RoundManifest'],
  'get /pool/rounds/{number}/payouts': [200, 'RoundPayouts'],
  'get /pool/rounds/{number}/my-proofs': [200, 'MyEntryProofs'],
  'get /wallet/balances': [200, 'WalletBalances'],
  'get /deposits/address': [200, 'DepositAddress'],
  'get /deposits': [200, 'DepositPage'],
  'post /withdrawals': [201, 'WithdrawalView'],
  'get /withdrawals': [200, 'WithdrawalPage'],
  'get /withdrawals/{id}': [200, 'WithdrawalView'],
  'get /transactions': [200, 'TransactionPage'],
};

type JsonSchema = Record<string, unknown>;

/**
 * Adds the response components, wires them into the listed operations and gives EVERY operation a `default`
 * response with the shared error envelope.
 */
export function applyResponseSchemas(doc: OpenAPIObject): OpenAPIObject {
  doc.components ??= {};
  doc.components.schemas ??= {};
  for (const [name, schema] of Object.entries(RESPONSE_COMPONENTS)) {
    doc.components.schemas[name] = z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      io: 'output',
      unrepresentable: 'any',
    }) as JsonSchema;
  }
  const ref = (name: ResponseComponent) => ({ $ref: `#/components/schemas/${name}` });
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = (item as Record<string, { responses?: Record<string, unknown> } | undefined>)[
        method
      ];
      if (!op) continue;
      op.responses ??= {};
      const mapped = OPERATION_RESPONSES[`${method} ${path}`];
      if (mapped) {
        const [status, component] = mapped;
        const existing = (op.responses[String(status)] ?? {}) as { description?: string };
        op.responses[String(status)] = {
          description: existing.description || 'Success',
          content: { 'application/json': { schema: ref(component) } },
        };
      }
      op.responses.default ??= {
        description:
          'Error — shared envelope { error: { code, message, statusCode, requestId, issues?, details? } }',
        content: { 'application/json': { schema: ref('ErrorEnvelope') } },
      };
    }
  }
  return doc;
}
