# GLOBAL POOL — Architecture

> DEMO / testnet only (Arbitrum Sepolia 421614, `REAL_MONEY_ENABLED=false`). Owner decisions of 28 Nov 2026: hybrid
> custody, MVP chain Arbitrum Sepolia, player auth via Privy, code in `global-pool/`. See `DEV_CONVENTIONS.md`,
> `CONTRACTS.md` (on-chain round registry) and `API.md` (endpoints, ledger model, flows).

## Backend (`apps/api`)

### System context

```text
 Browser (apps/web, Next.js) ── Privy SDK (email OTP · social · wallets) ──► Privy
        │  HTTPS (Bearer Privy token / admin JWT)          ▲ verifyAuthToken (ES256) + linked accounts
        │  socket.io /pool (live pool)                      │
        ▼                                                   │
 ┌──────────────────────────── @gp/api (NestJS 11) ─────────┴───────────────────────────┐
 │ HTTP pipeline · modules · ledger · audit · BullMQ workers · WebSocket gateway        │
 └───────┬─────────────────────────┬─────────────────────────────┬──────────────────────┘
         │ Prisma 6                │ ioredis / BullMQ             │ viem (reads + testnet signer)
         ▼                         ▼                              ▼
   PostgreSQL 16             Redis 7                     Arbitrum Sepolia RPC (or local Anvil 31337 in dev/e2e)
   ledger · users ·          queues (deposits,           test-USDT Transfer logs + receipts (deposits, re-org safe)
   rounds · audit ·          withdrawals, rounds,        test-USDT transfers from the hot wallet (withdrawals)
   signed-tx outbox …        emails), step-up replay,    GlobalPoolRounds: openRound · commitEntries · cancelRound ·
                             socket.io Redis adapter     requestDraw · DrawFulfilled (Chainlink VRF v2.5) · recordSettlement
```

**Systems of record.** The API ledger owns player balances (Available / Locked / Pending / Owed), entries, fees,
refunds and prize credits. The chain owns custody balances and, through `GlobalPoolRounds`, the round rules, the
committed entry list, the VRF word and the settlement attestation. The API never treats itself as the authority for
on-chain balances: deposits are credited only from observed logs after N confirmations, and `chain_clearing:<network>`
is the ledger's mirror of custody, to be reconciled against the chain. With `POOL_ONCHAIN_MIRROR=true` every round is
mirrored on `GlobalPoolRounds`, and settlement refuses to credit any prize unless the database winners equal the
contract's `computeWinners()` for the VRF word.

### Source layout

```text
apps/api/
  prisma/schema.prisma           data model (46 tables, enums = @gp/shared)
  prisma/migrations/             SQL migrations (+ append-only / balanced-posting triggers)
  prisma/seed.ts                 DEMO seed (DEMO_MODE=true only)
  src/main.ts, app.module.ts, app.setup.ts
  src/config/                    zod env schema, AppConfig, .env loader (no override)
  src/common/                    errors (AppError → envelope), exception filter, crypto, money, request types, DTO helpers
  src/infra/                     prisma, redis, BullMQ queues, pino logging, socket.io adapter (+ Redis adapter),
                                 openapi/response-schemas.ts (zod → OpenAPI response components)
  src/modules/<feature>/         module · controller · service · DTOs · *.spec.ts
  test/                          e2e (supertest + socket.io-client) against globalpool_test; anvil.ts deploys the
                                 contracts on a throwaway Anvil devnet for chain.e2e-spec.ts (and `pnpm devnet`)
```

Cross-cutting services (ledger, audit, idempotency, compliance, security, auth guards, notifications, transactions,
randomness, …) live in `@Global()` modules, so feature modules use them without import cycles. Feature modules
(users, wallet, deposits, withdrawals, pool, games, admin, platform) own their controllers.

### Request pipeline

```text
helmet (CSP, no x-powered-by) → CORS (CORS_ORIGINS) → JSON body ≤ 256 kB → pino-http (X-Request-Id in/out, secret redaction)
→ ThrottlerGuard (per IP; stricter on admin login) → PlayerAuth / AdminAuth guards → policy guard
  (onboarding, geo, self-exclusion, admin restrictions) / PermissionsGuard (RBAC)
→ ZodValidationPipe (shared schemas) → controller → service (DB transaction) → AuditInterceptor (@Audit routes)
→ AllExceptionsFilter (every error → shared error envelope, 5xx logged with request id, no internals leaked)
```

### Money, ledger and consistency

- **Double entry, append-only.** One business event = one posting whose signed lines sum to exactly zero. This is
  validated in `normalizePosting()` and enforced again by a deferred constraint trigger at COMMIT. Triggers reject
  UPDATE / DELETE / TRUNCATE on the ledger, sub-ledgers (`pool_ledger`, `fee_ledger`), `withdrawal_events` and
  `audit_logs`. Corrections are always new postings.
- **Decimal only.** decimal.js (`@gp/shared/money`) in code, `Decimal(20,6)` in Postgres, decimal strings on the wire.
  JS floats are rejected by the money helpers.
- **Balances are computed**, never stored: Σ of lines per account. Locked also includes a player's attributed stake
  in unsettled round pools.
- **One DB transaction per financial command** (entries, withdrawals, deposits, settlement, refunds, claims). Isolation
  is READ COMMITTED with explicit row locks: user-bucket accounts `FOR UPDATE` in sorted order (no deadlocks, no
  double spend), the round row for entry sequencing and settlement, and the withdrawal row for admin decisions.
  Advisory locks serialise the audit hash chain, HD-index allocation and round numbering.
- **Idempotency.** The key row is inserted inside the business transaction (`ON CONFLICT DO NOTHING`), so a
  concurrent duplicate waits on the unique index and then replays the stored response. A business-level `event_key`
  on postings makes double posting impossible even outside the HTTP path.
- **Projections** (`rounds.entries_count`, `pool_amount`, …) are updated in the same transaction for fast reads and
  WebSocket pushes, and are reconciled against the ledger before settlement.

### Rounds, randomness and fairness

- Round rules (price, fee, thresholds, prize split in bps) are copied into the round when it opens and never change.
- The lifecycle (BullMQ `rounds` queue, 30 s tick) moves rounds through open → closed → drawing → settled, or to
  cancelled. Settlement takes **only** the fulfilled random word and the canonical entry list (ordered by `seq`) and
  runs `selectWinners()`, a bit-for-bit mirror of `DrawMath.sol`. Unit tests check it against the contract's
  Solidity-proven vectors.
- `RandomnessProvider` interface: `MockVrfProvider` (dev; deterministic from the request id, always labelled `mock`)
  and `ChainlinkVrfProvider` (VRF fulfilment watcher for `GlobalPoolRounds` events; `DrawFulfilled` must have
  `VRF_FULFILLMENT_CONFIRMATIONS`; mock is refused in production).
- **On-chain mirroring** (`onchain-rounds`): open → `openRound` with a `rulesHash` of the canonical rules JSON; close →
  random 32-byte salt per entry (encrypted at rest), salted user commitments, OpenZeppelin `SimpleMerkleTree` over
  `keccak256(abi.encode(index, entryId, commitment))` (the `@gp/contracts/verify` encodings, proven equal to
  `DrawMath.sol` — a unit test rebuilds the contract fixture's 18,640-entry root) → `commitEntries`; the contract's
  threshold check decides `requestDraw` or `cancelRound`; after fulfilment the DB winners are compared with
  `computeWinners()` / `prizeAmounts()` before any credit; settlement → payouts tree → `recordSettlement`. Steps are
  idempotent (the chain state decides), frozen data is append-only, and randomness is requested exactly once per
  round (never re-requested): a draw still unfulfilled 24 h after its request is cancelled on-chain
  (`cancelRound(VRF_TIMEOUT)`, permissionless) and every stake is refunded. A round adopted on-chain
  (`chain_mirror`) is drawn, cancelled and settled only through the contract; with the mirror switched off it is
  refused and alerted, never handled off-chain. The VRF word is read from `getRound()` at a block with the
  required confirmations (events only give tx hashes), so a watcher outage never strands a fulfilled round.
- **Transactions the API signs** go through `ChainSignerService`: eth_chainId check (421614 / 31337 only), simulation
  with decoded custom errors, DB nonce manager (`chain_signer_nonces`, row lock, `max(stored, pending)`), signed-tx
  outbox (`chain_transactions`, stored before broadcast), re-broadcast of the same bytes, `mined` / `reverted` /
  `dropped` tracking with confirmations (`dropped` only when the nonce was consumed `confirmations` blocks deep and a
  fresh receipt lookup still finds nothing). Every chain read that moves money or decides a draw (deposit watcher,
  VRF watcher, signer) goes through `BlockchainService.verifiedClient()` (eth_chainId == EVM_CHAIN_ID). Roles: OPERATOR (open, commit), KEEPER (requestDraw, cancel — permissionless
  calls), SETTLER (recordSettlement), hot wallet (withdrawals); testnet keys from env, production keys belong in a
  KMS/HSM.
- There is no code path for an admin to set results, pick winners, settle by hand, adjust balances or edit ledger rows.
  Public `GET /pool/rounds/:n/verify` recomputes the winners from the stored inputs.

### Identity and security

- **Players** authenticate with Privy only (no passwords). The API verifies the ES256 access token, upserts the user
  by Privy DID (`privy_user_id`), syncs linked email and wallets, and tracks each Privy session (`sid`) as a revocable
  device. DEV MOCK (HS256, `PRIVY_MOCK_SIGNING_SECRET`) runs only when Privy is not configured and never in production.
- **Step-up 2FA** for withdrawals, whitelist changes and security settings: TOTP secrets are AES-256-GCM encrypted at
  rest (`TOTP_ENCRYPTION_KEY`); every accepted time step is remembered (no replay); 5 failures lock for 15 min. Backup
  codes are single-use and stored as SHA-256 hashes. Step-up tokens are single-use (jti in Redis), 5 min, bound to
  user + session + purpose. Cheap policy checks (KYC level, four-eyes) run before a code is consumed.
- **Admins** are a separate identity domain: argon2id passwords (m=19 MiB, t=2), mandatory TOTP in the same login step
  (generic error), lockout, short access JWT (`ADMIN_JWT_ACCESS_SECRET`) plus a rotating opaque refresh token stored
  hashed in `sessions` with family revocation on reuse, and a server-side 15-minute idle timeout (`last_seen_at`).
  Lockout counters (admin login, TOTP step-up) are reserved under a row lock before a guess is checked. RBAC is
  loaded from the DB on every request, so revocation is immediate. Sensitive actions need permission + reason + fresh MFA (+ four eyes where flagged) and write their
  hash-chained audit row inside the same transaction.
- **Audit log:** `hash = sha256(prev_hash + canonical JSON(row))`, appended under an advisory lock; secrets are
  redacted from metadata; `GET /admin/audit-logs/verify` recomputes the chain.
- **Configuration** is validated with zod at boot: weak secrets, a wrong-size TOTP key or `REAL_MONEY_ENABLED=true`
  stop the process; in production so does any committed placeholder secret (`.env.example` values, `dev-only` /
  `change-me`). Logs redact `Authorization`, cookies and step-up headers.

### Compliance

Geo-restriction (DB `geo_rules` plus the `RESTRICTED_COUNTRIES` placeholder list; the CDN country header is trusted
only with `TRUST_PROXY=true`; fail-closed in production when unknown); 18+ and explicit, never pre-checked consents
at onboarding; KYC levels (provider interface + mock) driving the daily withdrawal limits; AML screening (provider
interface + mock, 6 checks) creating `aml_alerts`; responsible gaming enforced server-side (deposit, participation and
loss limits; 24 h cool-down on increases; immediate self-exclusion that never blocks withdrawals and never reopens
by itself — request, 24 h cool-down, deposit + loss limits, confirm; per-player lock around usage checks;
reality-check settings); admin restrictions (`gaming_blocked`, `deposits_blocked`, `withdrawals_frozen`, `account_suspended`) with
reason + MFA + audit. No VPN or geo-bypass hints anywhere.

### Background jobs (BullMQ)

| Queue         | Jobs                                                                                                                                                      | Schedule                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `deposits`    | `deposit.watch` — reconcile unconfirmed deposits via receipts (re-org), scan `Transfer` logs (re-org window), credit                                      | every `DEPOSIT_WATCHER_POLL_SECONDS` (skips without RPC / token) |
| `withdrawals` | `withdrawal.risk-check` (retry path), `withdrawal.broadcast` (testnet broadcaster, else stays queued), `withdrawal.track` (confirm / fail / retry queued) | on demand; track every `WITHDRAWAL_TRACK_POLL_SECONDS`           |
| `rounds`      | `round.tick` (mirror housekeeping, open / close / commit / draw / settle / cancel / auto-schedule), `round.settle`                                        | every 30 s                                                       |
| `emails`      | `email.notification` — render + send the email of a notification (log / SMTP)                                                                             | on demand (delayed 2 s, retried)                                 |

Workers start only with `JOBS_ENABLED=true` (tests and one-off scripts disable them). Jobs are idempotent: state is
guarded by compare-and-set status updates and unique posting event keys.

### Operations

- **Docker contract:** `build` (`prisma generate` + `nest build`), `start:prod` (`node dist/src/main.js`),
  `db:migrate:deploy`. The API listens on `:4000`; `/health` checks PostgreSQL and Redis (503 when degraded) and is
  what the container health check uses.
- **Scaling notes:** the HTTP layer is stateless apart from the in-memory throttler. `SOCKET_IO_REDIS_ADAPTER=true`
  shares socket.io broadcasts across replicas (an event raised by the worker that settles a round reaches clients on
  every replica; e2e-tested with two app instances). A Redis throttler store is still missing. BullMQ workers can run
  in a separate process with the same image (`JOBS_ENABLED=true` there, `false` on the web replicas); the DB nonce
  manager keeps signing safe across processes.
- **Docker:** the image installs OpenSSL (Prisma engine). `docker compose --profile dev` runs `api-dev`
  (`NODE_ENV=development` → DEV MOCK player login, migrations + DEMO seed on start, jobs on, log mail transport) and
  `web-dev`; `--profile prod` runs production mode (DEV MOCK refused; Privy app id needed; the web is built with the
  mock off). The dev profile takes secrets from `.env.example` (dev placeholders) overridden by `.env`; the prod
  profile reads `.env` only, and production refuses every committed placeholder secret at boot.
- **Tests:** unit tests for posting rules, fee math, selection determinism (vs the contract vectors), commitments and
  payout trees (vs the contract fixture roots), RG limits, audit chain, crypto, HD derivation, AML and env validation;
  e2e tests (supertest) on `globalpool_test` for auth, onboarding, deposits, entries, idempotency, RG, withdrawals,
  four eyes, admin auth / RBAC / audit, settlement, cancellation, WebSocket and the absence of result-altering
  endpoints; chain e2e on a throwaway Anvil (round mirroring, broadcaster, re-org-safe watcher); infra e2e (email via
  log + a fake SMTP server, socket.io Redis adapter across two replicas); OpenAPI contract test (live responses parse
  with the documented schemas).

### Not yet built (next batches)

A deposit-sweep / treasury process (deposit addresses are xpub-derived; sweeping needs the offline key); a deployed
`GlobalPoolRounds` + funded VRF subscription on Arbitrum Sepolia (the mirror is proven on Anvil only); KMS/HSM signers
instead of env keys; replacement (speed-up / cancel) transactions for stuck withdrawals (today: same-bytes
re-broadcast, `dropped` only when the nonce is used elsewhere); real KYC / AML providers; referral commission accrual;
a Redis-backed throttler. (Games — commit–reveal seeds, DEMO credits, Orbit Rush loop — are built: see GAMES.md.) RG session-time enforcement and reality checks
are owned by the RG module (rg-history batch).
