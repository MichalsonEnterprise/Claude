"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPERATION_RESPONSES = exports.RESPONSE_COMPONENTS = exports.MeView = exports.TransactionView = exports.WithdrawalView = exports.DepositView = exports.DepositAddress = exports.WalletBalances = exports.MyEntryProofs = exports.RoundPayouts = exports.RoundManifest = exports.RoundChainStatus = exports.RoundVerification = exports.EntryPurchase = exports.EntryQuote = exports.RoundView = exports.HealthResponse = void 0;
exports.applyResponseSchemas = applyResponseSchemas;
const schemas_1 = require("@gp/shared/schemas");
const zod_1 = require("zod");
const usdt = zod_1.z
    .string()
    .regex(/^-?\d+\.\d{2,6}$/)
    .describe('USDT amount as a decimal string (2–6 decimals), e.g. "351.75"');
const iso = zod_1.z.string().describe('ISO 8601 timestamp (UTC)');
const hex32 = zod_1.z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const amountItem = zod_1.z.looseObject({ label: zod_1.z.string(), amount: usdt, reference: zod_1.z.string() });
exports.HealthResponse = zod_1.z.looseObject({
    status: zod_1.z.enum(['ok', 'degraded']),
    service: zod_1.z.string(),
    version: zod_1.z.string(),
    environment: zod_1.z.enum(['development', 'test', 'production']),
    demoMode: zod_1.z.boolean(),
    realMoneyEnabled: zod_1.z.literal(false),
    chainEnv: zod_1.z.literal('testnet'),
    uptimeSeconds: zod_1.z.number().int(),
    checks: zod_1.z.object({
        database: zod_1.z.looseObject({ status: zod_1.z.enum(['up', 'down']), latencyMs: zod_1.z.number() }),
        redis: zod_1.z.looseObject({ status: zod_1.z.enum(['up', 'down']), latencyMs: zod_1.z.number() }),
    }),
    time: iso,
});
const winnerView = zod_1.z.looseObject({
    place: zod_1.z.number().int().min(1),
    tier: zod_1.z.enum(['first', 'second', 'third', 'runner_up']),
    handle: zod_1.z.string().nullable(),
    entryId: zod_1.z.string().nullable(),
    entrySeq: zod_1.z.number().int().nullable(),
    amount: usdt,
});
exports.RoundView = zod_1.z.looseObject({
    id: zod_1.z.uuid(),
    number: zod_1.z.number().int(),
    numberLabel: zod_1.z.string(),
    status: zod_1.z.enum(['scheduled', 'open', 'closed', 'drawing', 'settled', 'cancelled']),
    statusLabel: zod_1.z.string(),
    opensAt: iso,
    closesAt: iso,
    closedAt: iso.nullable(),
    entryPrice: usdt,
    platformFeePerEntry: usdt.describe('Platform fee per entry — a separate line, never part of the pool'),
    participants: zod_1.z.number().int(),
    entries: zod_1.z.number().int(),
    poolBalance: usdt.describe('Σ entry amounts (fees excluded)'),
    platformFees: usdt,
    thresholds: zod_1.z.looseObject({
        minParticipants: zod_1.z.number().int(),
        minPool: usdt,
        met: zod_1.z.boolean().nullable(),
    }),
    prizeDistribution: zod_1.z.array(zod_1.z.looseObject({})),
    draw: zod_1.z
        .looseObject({
        provider: zod_1.z.enum(['chainlink_vrf_v2_5', 'mock']),
        requestId: zod_1.z.string(),
        requestedAt: iso,
        fulfilledAt: iso.nullable(),
        status: zod_1.z.enum(['requested', 'fulfilled', 'failed', 'timed_out']),
    })
        .nullable(),
    winners: zod_1.z.array(winnerView),
    cancellation: zod_1.z
        .looseObject({
        reason: zod_1.z.enum(['threshold_not_met', 'vrf_timeout']),
        refundsTo: zod_1.z.literal('owed'),
    })
        .nullable(),
    settledAt: iso.nullable(),
    isDemo: zod_1.z.boolean(),
});
exports.EntryQuote = zod_1.z.looseObject({
    entries: zod_1.z.number().int().min(1),
    entryPrice: usdt,
    entryAmount: usdt,
    platformFeePerEntry: usdt,
    platformFee: usdt.describe('0.05 USDT per entry, its own line item'),
    networkFee: usdt.describe('Network fee for entries (0.00: paid from the platform balance)'),
    total: usdt,
    currency: zod_1.z.literal('USDT'),
});
exports.EntryPurchase = zod_1.z.looseObject({
    roundId: zod_1.z.uuid(),
    roundNumber: zod_1.z.number().int(),
    entries: zod_1.z.number().int(),
    firstEntryId: zod_1.z.string(),
    lastEntryId: zod_1.z.string(),
    entryPrice: usdt,
    entryAmount: usdt,
    platformFee: usdt,
    networkFee: usdt,
    total: usdt,
    reference: zod_1.z.string(),
    transactionId: zod_1.z.uuid(),
    postingId: zod_1.z.uuid(),
    status: zod_1.z.literal('active'),
    purchasedAt: iso,
    replayed: zod_1.z.boolean().describe('true when an idempotent retry replays the stored response'),
});
exports.RoundVerification = zod_1.z.looseObject({
    round: zod_1.z.looseObject({
        id: zod_1.z.uuid(),
        number: zod_1.z.number().int(),
        status: zod_1.z.string(),
        totalEntries: zod_1.z.number().int(),
        pool: usdt,
    }),
    algorithm: zod_1.z.looseObject({
        name: zod_1.z.literal('GLOBAL_POOL_WINNERS_V1'),
        domain: hex32,
        roundIdUsed: zod_1.z.string(),
        prizeSplitBps: zod_1.z.array(zod_1.z.number().int()),
    }),
    randomness: zod_1.z
        .looseObject({
        provider: zod_1.z.enum(['chainlink_vrf_v2_5', 'mock']),
        requestId: zod_1.z.string(),
        randomWord: zod_1.z.string().nullable(),
    })
        .nullable(),
    winners: zod_1.z.array(winnerView),
    recomputed: zod_1.z.looseObject({ matchesStoredWinners: zod_1.z.boolean().nullable() }).nullable(),
});
exports.RoundChainStatus = zod_1.z.looseObject({
    roundNumber: zod_1.z.number().int(),
    mirrored: zod_1.z.boolean(),
    network: zod_1.z.string(),
    chainId: zod_1.z.number().int(),
    contract: zod_1.z.string().nullable(),
    contractUrl: zod_1.z.string().nullable(),
    onchainRoundId: zod_1.z.string(),
    onchainStatus: zod_1.z.string().nullable(),
    rulesHash: zod_1.z.string().nullable(),
    entriesMerkleRoot: zod_1.z.string().nullable(),
    payoutsMerkleRoot: zod_1.z.string().nullable(),
    steps: zod_1.z.array(zod_1.z.looseObject({
        step: zod_1.z.enum(['open', 'commit', 'cancel', 'request_draw', 'settle']),
        attempt: zod_1.z.number().int(),
        status: zod_1.z.enum(['pending', 'sent', 'confirmed', 'failed']),
        txHash: zod_1.z.string().nullable(),
        txUrl: zod_1.z.string().nullable(),
        blockNumber: zod_1.z.string().nullable(),
        at: iso,
    })),
    isDemo: zod_1.z.boolean(),
});
exports.RoundManifest = zod_1.z.looseObject({
    roundNumber: zod_1.z.number().int(),
    entriesMerkleRoot: zod_1.z.string().nullable(),
    items: zod_1.z.array(zod_1.z.looseObject({
        index: zod_1.z.number().int(),
        entryIdBytes32: hex32,
        userCommitment: hex32,
        leaf: hex32,
    })),
    page: zod_1.z.number().int(),
    pageSize: zod_1.z.number().int(),
    total: zod_1.z.number().int(),
});
exports.RoundPayouts = zod_1.z.looseObject({
    roundNumber: zod_1.z.number().int(),
    payoutsMerkleRoot: zod_1.z.string().nullable(),
    items: zod_1.z.array(zod_1.z.looseObject({
        rank: zod_1.z.number().int(),
        onchainRank: zod_1.z.number().int(),
        entryIndex: zod_1.z.number().int(),
        entryIdBytes32: hex32,
        userCommitment: hex32,
        amount: usdt,
        amountUnits: zod_1.z.string(),
        leaf: hex32,
        proof: zod_1.z.array(hex32),
    })),
});
exports.MyEntryProofs = zod_1.z.looseObject({
    roundNumber: zod_1.z.number().int(),
    entriesMerkleRoot: zod_1.z.string().nullable(),
    entries: zod_1.z.array(zod_1.z.looseObject({
        entryId: zod_1.z.string(),
        index: zod_1.z.number().int(),
        entryIdBytes32: hex32,
        salt: hex32.describe('Secret salt — shown only to the entry owner'),
        userCommitment: hex32,
        leaf: hex32,
        proof: zod_1.z.array(hex32),
    })),
});
exports.WalletBalances = zod_1.z.looseObject({
    available: usdt,
    locked: usdt,
    pending: usdt,
    owed: usdt,
    total: usdt,
    breakdown: zod_1.z.looseObject({
        lockedWithdrawals: usdt,
        lockedEntries: usdt,
        locked: zod_1.z.array(amountItem),
        pending: zod_1.z.array(amountItem),
        owed: zod_1.z.array(amountItem),
    }),
});
exports.DepositAddress = zod_1.z.looseObject({
    network: zod_1.z.string(),
    networkName: zod_1.z.string(),
    chainId: zod_1.z.number().int().nullable(),
    token: zod_1.z.string(),
    address: zod_1.z.string(),
    minDeposit: usdt,
    confirmations: zod_1.z.number().int(),
    testnet: zod_1.z.literal(true),
    warning: zod_1.z.string(),
});
exports.DepositView = zod_1.z.looseObject({
    id: zod_1.z.uuid(),
    reference: zod_1.z.string(),
    network: zod_1.z.string(),
    status: zod_1.z.enum(['detected', 'confirming', 'credited', 'rejected']),
    amount: usdt,
    txHash: zod_1.z.string(),
    toAddress: zod_1.z.string(),
    confirmations: zod_1.z.object({ current: zod_1.z.number().int(), required: zod_1.z.number().int() }),
    detectedAt: iso,
    creditedAt: iso.nullable(),
    isDemo: zod_1.z.boolean(),
});
exports.WithdrawalView = zod_1.z.looseObject({
    id: zod_1.z.uuid(),
    reference: zod_1.z.string(),
    network: zod_1.z.string(),
    toAddress: zod_1.z.string(),
    amount: usdt,
    networkFee: usdt,
    platformFee: usdt,
    youReceive: usdt,
    status: zod_1.z.enum([
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
    statusLabel: zod_1.z.string(),
    flagged: zod_1.z.boolean(),
    requiresFourEyes: zod_1.z.boolean(),
    txHash: zod_1.z.string().nullable(),
    failureReason: zod_1.z.string().nullable(),
    timeline: zod_1.z.array(zod_1.z.looseObject({ status: zod_1.z.string(), label: zod_1.z.string(), at: iso })),
    createdAt: iso,
    isDemo: zod_1.z.boolean(),
});
exports.TransactionView = zod_1.z.looseObject({
    id: zod_1.z.string().describe('Public reference (DP-…, WD-…, EP-…, PZ-…, RF-…)'),
    type: zod_1.z.string(),
    status: zod_1.z.string(),
    direction: zod_1.z.enum(['in', 'out']),
    amount: usdt,
    networkFee: usdt.nullable(),
    platformFee: usdt,
    netAmount: usdt,
    description: zod_1.z.string(),
    createdAt: iso,
    isDemo: zod_1.z.boolean(),
});
exports.MeView = zod_1.z.looseObject({
    id: zod_1.z.uuid(),
    publicId: zod_1.z.string(),
    handle: zod_1.z.string().nullable(),
    onboarded: zod_1.z.boolean(),
    kyc: zod_1.z.looseObject({ level: zod_1.z.string(), status: zod_1.z.string() }),
    security: zod_1.z.looseObject({ twoFactorEnabled: zod_1.z.boolean() }),
});
const page = (item) => schemas_1.pageMetaSchema.extend({ items: zod_1.z.array(item) });
/** name → schema (component names in #/components/schemas). */
exports.RESPONSE_COMPONENTS = {
    ErrorEnvelope: schemas_1.errorEnvelopeSchema,
    HealthResponse: exports.HealthResponse,
    RoundView: exports.RoundView,
    RoundPage: page(exports.RoundView),
    EntryQuote: exports.EntryQuote,
    EntryPurchase: exports.EntryPurchase,
    RoundVerification: exports.RoundVerification,
    RoundChainStatus: exports.RoundChainStatus,
    RoundManifest: exports.RoundManifest,
    RoundPayouts: exports.RoundPayouts,
    MyEntryProofs: exports.MyEntryProofs,
    WalletBalances: exports.WalletBalances,
    DepositAddress: exports.DepositAddress,
    DepositPage: page(exports.DepositView),
    WithdrawalView: exports.WithdrawalView,
    WithdrawalPage: page(exports.WithdrawalView),
    TransactionPage: page(exports.TransactionView),
    MeView: exports.MeView,
};
/** "<method> <OpenAPI path>" → [status, component]. */
exports.OPERATION_RESPONSES = {
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
/**
 * Adds the response components, wires them into the listed operations and gives EVERY operation a `default`
 * response with the shared error envelope.
 */
function applyResponseSchemas(doc) {
    doc.components ??= {};
    doc.components.schemas ??= {};
    for (const [name, schema] of Object.entries(exports.RESPONSE_COMPONENTS)) {
        doc.components.schemas[name] = zod_1.z.toJSONSchema(schema, {
            target: 'openapi-3.0',
            io: 'output',
            unrepresentable: 'any',
        });
    }
    const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
            const op = item[method];
            if (!op)
                continue;
            op.responses ??= {};
            const mapped = exports.OPERATION_RESPONSES[`${method} ${path}`];
            if (mapped) {
                const [status, component] = mapped;
                const existing = (op.responses[String(status)] ?? {});
                op.responses[String(status)] = {
                    description: existing.description || 'Success',
                    content: { 'application/json': { schema: ref(component) } },
                };
            }
            op.responses.default ??= {
                description: 'Error — shared envelope { error: { code, message, statusCode, requestId, issues?, details? } }',
                content: { 'application/json': { schema: ref('ErrorEnvelope') } },
            };
        }
    }
    return doc;
}
//# sourceMappingURL=response-schemas.js.map