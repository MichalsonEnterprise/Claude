# GLOBAL POOL — API (`apps/api`, `@gp/api`)

> **DEMO / testnet only.** MVP chain Arbitrum Sepolia (421614). `REAL_MONEY_ENABLED=true` is rejected at boot.
> NestJS 11 · Prisma 6 · PostgreSQL 16 · Redis 7 / BullMQ · socket.io · zod (shared schemas from `@gp/shared`).
> Live OpenAPI: **`GET /docs`** (Swagger UI) and **`GET /docs-json`** (83 operations).

## Quick start

```bash
bash scripts/dev-services.sh start                 # Postgres :5432 (globalpool, globalpool_test) + Redis :6379
cp .env.example .env                                # once (git-ignored)
flock /tmp/gp-pnpm.lock pnpm install && pnpm build:packages
pnpm --filter @gp/api db:migrate:deploy             # apply migrations (non-destructive)
pnpm --filter @gp/api db:seed                       # DEMO data (DEMO_MODE=true); writes apps/api/.dev/*.json
pnpm --filter @gp/api start:dev                     # http://localhost:4000 · /docs · /health
```

- **Player (DEV MOCK):** `POST /auth/dev/token {"did":"did:privy:demo-nova-k"}` returns a bearer token for the seeded
  DEMO player **@nova.k**. Any other `did` creates a new player who must onboard first. Real Privy verification is
  used when `PRIVY_APP_ID` is set and `PRIVY_MOCK=false`.
- **Admins:** the seed writes the DEMO admin credentials (password + TOTP secret each) to
  `apps/api/.dev/demo-admins.json` (git-ignored). Log in with `POST /admin/auth/login {email, password, totpCode}`.
  The @nova.k TOTP secret (for step-up) is in `apps/api/.dev/demo-player.json`.
- **Fresh DEMO database:** `pnpm --filter @gp/api db:reset` drops all data, re-applies the migrations and seeds. The
  seed refuses to run on a non-empty ledger, because ledger rows can never be deleted.

| Script                             | What it does                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `typecheck` / `lint` / `build`     | `prisma generate` + `tsc --noEmit` / type-aware ESLint / `nest build` → `dist/src/main.js` |
| `test`                             | unit tests (vitest + SWC) **and** e2e tests (supertest) against `globalpool_test`          |
| `test:unit` / `test:e2e`           | one suite only                                                                             |
| `start:dev` / `start:prod`         | watch mode / `node dist/src/main.js`                                                       |
| `db:migrate` / `db:migrate:deploy` | create and apply (dev) / apply only (CI, Docker)                                           |
| `db:seed` / `db:seed:prod`         | DEMO seed with tsx / compiled seed (`dist/prisma/seed.js`)                                 |
| `db:migrate:test`                  | reset the test database (destructive; e2e itself only runs `migrate deploy`)               |

## Conventions

- **Errors** always use the shared envelope (`errorEnvelopeSchema`):
  `{"error":{"code":"INSUFFICIENT_FUNDS","message":"…","statusCode":422,"requestId":"…","issues":[…],"details":{…}}}`.
  Codes and HTTP statuses come from `ERROR_HTTP_STATUS` in `@gp/shared/schemas`.
- **Validation** uses the zod schemas from `@gp/shared/schemas` (nestjs-zod DTOs), so the web and the API validate
  with the same rules. Query strings are coerced (`?page=2&pageSize=20`).
- **Money** is a decimal string with at most 6 decimals (`"351.75"`), never a float. Format it in the UI with
  `formatUSDT()`.
- **Idempotency:** every financial write takes an `idempotencyKey` in the body. The first response is stored and
  replayed (`"replayed": true`). The same key with a different body returns `409 IDEMPOTENCY_CONFLICT`.
- **Request ids:** `X-Request-Id` is accepted and echoed. It is also in every error envelope and log line.
- **Rate limits:** `THROTTLE_LIMIT` per `THROTTLE_TTL_SECONDS` per IP; admin login `ADMIN_LOGIN_THROTTLE_LIMIT` per minute.
- **Auth headers:** player `Authorization: Bearer <Privy access token>` (or the `privy-token` cookie); admin
  `Authorization: Bearer <admin access token>`; step-up `X-Step-Up-Token: <token>`, or `totpCode` in the body.
- Every DEMO record carries `isDemo: true` so the UI can render the DEMO badge.

## Modules

| Module          | Responsibility                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config`        | zod-validated env (`src/config/env.ts`); refuses `REAL_MONEY_ENABLED=true`, weak secrets and a wrong-size TOTP key                                                                         |
| `health`        | `/health` with PostgreSQL and Redis checks (503 when degraded)                                                                                                                             |
| `ledger`        | append-only double-entry ledger: posting templates, balance computation, reconciliation                                                                                                    |
| `audit`         | hash-chained `audit_logs`: service, `@Audit()` interceptor, chain verification                                                                                                             |
| `idempotency`   | stored responses for financial writes (`idempotency_keys`)                                                                                                                                 |
| `auth`          | Privy verification (`@privy-io/server-auth`) or DEV MOCK tokens, user upsert by `privy_user_id`, linked email and wallet sync, onboarding consents, `PlayerAuth` guards and route policies |
| `security`      | TOTP (otplib; AES-256-GCM at rest; replay protection; lockout), backup codes, anti-phishing code, step-up tokens                                                                           |
| `users`         | `/me`, profile, sessions/devices and revoke, linked wallets, withdrawal whitelist (24 h cool-down)                                                                                         |
| `wallet`        | balances from the ledger (Available / Locked / Pending / Owed / Total with breakdown), lifetime stats, claim owed                                                                          |
| `deposits`      | per-user HD deposit addresses (xpub only), BullMQ deposit watcher (test-USDT `Transfer` logs via viem), confirmations, DEMO simulation                                                     |
| `withdrawals`   | request (step-up, KYC limit, AML), state machine, four-eyes approvals, DEMO confirmation, BullMQ processing                                                                                |
| `transactions`  | user-facing activity history (paginated, filtered); never used for balances                                                                                                                |
| `pool`          | rounds, entries, live projections, lifecycle (close → draw → settle / cancel), WebSocket gateway `/pool`                                                                                   |
| `randomness`    | provider interface, `MockVrfProvider` (dev), `ChainlinkVrfProvider` (reads `GlobalPoolRounds` events), winner selection                                                                    |
| `games`         | catalogue from the DB (house edge disclosed; simulation mode only)                                                                                                                         |
| `notifications` | in-app notifications                                                                                                                                                                       |
| `compliance`    | geo rules + `RESTRICTED_COUNTRIES`, 18+, responsible gaming (limits, cool-down, self-exclusion, reality checks), admin restrictions                                                        |
| `kyc` / `aml`   | provider interfaces + mock providers (KYC level → withdrawal limit; withdrawal screening → alerts)                                                                                         |
| `affiliates`    | referral / affiliate **stub** (read-only)                                                                                                                                                  |
| `admin`         | separate admin auth (argon2id + mandatory TOTP, refresh-token families), RBAC, back-office endpoints                                                                                       |
| `reporting`     | dashboard KPIs computed from the ledger                                                                                                                                                    |
| `blockchain`    | chain config and read-only viem clients (testnets only)                                                                                                                                    |
| `feature-flags` | operational kill switches (`pool.entries.enabled`, `deposits.enabled`, `withdrawals.enabled`, …)                                                                                           |
| `platform`      | public config (`/config`): fees, limits, chains, round rules, auth mode                                                                                                                    |

## Endpoints

`player` = Privy / DEV MOCK bearer token, `admin` = admin bearer token. Player routes also apply a policy: onboarding
complete (all money and gaming routes); permitted region and not self-excluded (entries, deposits); admin restrictions
(`gaming_blocked`, `deposits_blocked`, `withdrawals_frozen`, `account_suspended`). Withdrawals stay available while a
player is self-excluded or abroad (no obstruction of withdrawals).

### health

| Method | Path      | Auth   | Description                                                                       |
| ------ | --------- | ------ | --------------------------------------------------------------------------------- |
| GET    | `/health` | public | Liveness + readiness: PostgreSQL and Redis checks (503 when a dependency is down) |

### platform

| Method | Path             | Auth   | Description                                                                  |
| ------ | ---------------- | ------ | ---------------------------------------------------------------------------- |
| GET    | `/config`        | public | Public platform configuration: DEMO flags, chains, fees, limits, round rules |
| GET    | `/config/chains` | public | Chain configuration status (testnets only; no secrets)                       |

### auth

| Method | Path               | Auth   | Description                                                                                                |
| ------ | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/auth/config`     | public | Player auth mode: privy / mock (DEV MOCK, offline) / disabled                                              |
| POST   | `/auth/dev/token`  | public | DEV MOCK only (never in production): issue a locally signed player token. DEMO user: did:privy:demo-nova-k |
| POST   | `/auth/logout`     | player | Revoke the current session for this API (call Privy logout on the client too)                              |
| POST   | `/auth/onboarding` | player | First-login onboarding: consents (never pre-checked) + country + handle                                    |
| POST   | `/auth/session`    | player | Call after Privy login: verifies the token, upserts the user (privy_user_id), syncs linked email/wallets   |

### auth · 2FA

| Method | Path                     | Auth   | Description                                                                                     |
| ------ | ------------------------ | ------ | ----------------------------------------------------------------------------------------------- |
| GET    | `/auth/2fa`              | player | Two-factor status (+ whether an anti-phishing code is set)                                      |
| POST   | `/auth/2fa/backup-codes` | player | Regenerate backup codes (step-up: security_settings)                                            |
| POST   | `/auth/2fa/challenge`    | player | Step-up challenge: verify a TOTP / backup code for a purpose → single-use step-up token (5 min) |
| POST   | `/auth/2fa/confirm`      | player | Confirm enrolment with the first code — returns 10 single-use backup codes (once)               |
| POST   | `/auth/2fa/disable`      | player | Disable 2FA (step-up: security_settings)                                                        |
| POST   | `/auth/2fa/enroll`       | player | Start TOTP enrolment — returns the secret + otpauth:// URI for the QR code                      |
| PUT    | `/auth/anti-phishing`    | player | Set the anti-phishing code shown in every email (step-up: security_settings)                    |

### users

| Method | Path                         | Auth   | Description                                                                |
| ------ | ---------------------------- | ------ | -------------------------------------------------------------------------- |
| GET    | `/me`                        | player | Current player profile (onboardingRequired = consents still missing)       |
| PATCH  | `/me`                        | player | Update display name / marketing opt-in                                     |
| GET    | `/me/sessions`               | player | Signed-in devices / sessions                                               |
| DELETE | `/me/sessions/{id}`          | player | Sign a device out (revokes that Privy session for this API)                |
| GET    | `/me/wallets`                | player | Linked wallets (Privy) and whitelisted withdrawal addresses                |
| POST   | `/me/wallets/whitelist`      | player | Whitelist a withdrawal address (step-up: whitelist_change; 24 h cool-down) |
| DELETE | `/me/wallets/{id}/whitelist` | player | Remove an address from the whitelist (step-up: whitelist_change)           |

### wallet

| Method | Path                 | Auth   | Description                                                                                     |
| ------ | -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| GET    | `/wallet/balances`   | player | Available / Locked / Pending / Owed / Total — computed from the append-only double-entry ledger |
| GET    | `/wallet/lifetime`   | player | Lifetime deposits, withdrawals, entries, platform fees paid, rewards                            |
| POST   | `/wallet/owed/claim` | player | Claim everything owed (refunds, prizes, rewards) to Available (idempotent)                      |

### deposits

| Method | Path                | Auth   | Description                                                            |
| ------ | ------------------- | ------ | ---------------------------------------------------------------------- |
| GET    | `/deposits`         | player | Your deposits with confirmation progress                               |
| GET    | `/deposits/address` | player | Your per-user deposit address (HD-derived, Arbitrum Sepolia test-USDT) |

### withdrawals

| Method | Path                       | Auth   | Description                                                                                             |
| ------ | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| GET    | `/withdrawals`             | player | Your withdrawals                                                                                        |
| POST   | `/withdrawals`             | player | Request a withdrawal (idempotent): step-up 2FA, KYC daily limit, AVAILABLE → LOCKED, risk/AML screening |
| GET    | `/withdrawals/quote`       | player | Fee breakdown: network fee (deducted), platform fee 0.00, you receive                                   |
| GET    | `/withdrawals/{id}`        | player |                                                                                                         |
| POST   | `/withdrawals/{id}/cancel` | player | Cancel before sending — funds return to Available                                                       |

### transactions

| Method | Path                        | Auth   | Description                                                           |
| ------ | --------------------------- | ------ | --------------------------------------------------------------------- |
| GET    | `/transactions`             | player | Paginated, filtered activity history (type, status, network, from/to) |
| GET    | `/transactions/{reference}` | player | One transaction by reference (DP-…, WD-…, EP-…) with its timeline     |

### pool

| Method | Path                                | Auth   | Description                                                                                       |
| ------ | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/pool/quote`                       | public | Entry quote: n × 10.00 + platform fee n × 0.05 (separate line) + network fee 0.00                 |
| GET    | `/pool/rounds`                      | public | Round history (closed, drawing, settled, cancelled)                                               |
| GET    | `/pool/rounds/current`              | public | Current round (open → next scheduled → latest) with pool, thresholds and prize table              |
| GET    | `/pool/rounds/{number}`             | public | Round by public number (e.g. 1248)                                                                |
| GET    | `/pool/rounds/{number}/feed`        | public | Latest entry purchases in a round                                                                 |
| GET    | `/pool/rounds/{number}/verify`      | public | Verification bundle: VRF word, algorithm, recomputed winners vs stored winners                    |
| POST   | `/pool/rounds/{roundId}/entries`    | player | Buy entries (idempotent): RG limits, balance check, AVAILABLE → POOL + FEES in one DB transaction |
| GET    | `/pool/rounds/{roundId}/my-entries` | player | Your entries in a round + odds disclosure                                                         |
| GET    | `/pool/winners`                     | public | Recent winners                                                                                    |

### games

| Method | Path            | Auth   | Description                                                                 |
| ------ | --------------- | ------ | --------------------------------------------------------------------------- |
| GET    | `/games`        | public | Game catalogue (house edge disclosed; simulation mode — no real-money play) |
| GET    | `/games/{slug}` | public |                                                                             |

### responsible-gaming

| Method | Path                                    | Auth   | Description                                                                   |
| ------ | --------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| GET    | `/responsible-gaming`                   | player | Limits (effective + pending increases + usage), self-exclusion, reality check |
| PUT    | `/responsible-gaming/limits`            | player | Set a limit — decreases apply now, increases after a 24 h cool-down           |
| PUT    | `/responsible-gaming/reality-check`     | player | Reality-check reminder interval (minutes)                                     |
| POST   | `/responsible-gaming/reality-check/ack` | player | Acknowledge a reality-check reminder                                          |
| POST   | `/responsible-gaming/self-exclusion`    | player | Self-exclude immediately (withdrawals remain available)                       |

### compliance

| Method | Path                 | Auth   | Description                                                                       |
| ------ | -------------------- | ------ | --------------------------------------------------------------------------------- |
| GET    | `/compliance/region` | public | Is the platform available from the current location? (no bypass hints, by design) |

### kyc

| Method | Path         | Auth   | Description                                                      |
| ------ | ------------ | ------ | ---------------------------------------------------------------- |
| GET    | `/kyc`       | player | KYC level, status and the resulting daily withdrawal limit       |
| POST   | `/kyc/start` | player | Start verification for a level (provider interface; mock in dev) |

### notifications

| Method | Path                       | Auth   | Description                             |
| ------ | -------------------------- | ------ | --------------------------------------- |
| GET    | `/notifications`           | player | Notifications (paginated, ?unread=true) |
| POST   | `/notifications/read-all`  | player |                                         |
| POST   | `/notifications/{id}/read` | player |                                         |

### referrals

| Method | Path            | Auth   | Description                                                              |
| ------ | --------------- | ------ | ------------------------------------------------------------------------ |
| GET    | `/referrals/me` | player | Your referral code / link and stats (STUB — accrual not implemented yet) |

### dev (DEMO only)

| Method | Path                                     | Auth   | Description                                                                                        |
| ------ | ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| POST   | `/dev/deposits/simulate`                 | player | DEMO only: simulate a confirmed test-USDT deposit (same ledger postings as a real one; idempotent) |
| POST   | `/dev/kyc/approve`                       | player | DEMO only: mock-provider approval of your KYC level                                                |
| POST   | `/dev/withdrawals/{id}/simulate-confirm` | player | DEMO only: simulate broadcast + on-chain confirmation of a QUEUED withdrawal                       |

### admin · auth

| Method | Path                  | Auth   | Description                                                                                |
| ------ | --------------------- | ------ | ------------------------------------------------------------------------------------------ |
| POST   | `/admin/auth/login`   | public | Admin login: email + password (argon2id) + MANDATORY TOTP; lockout after repeated failures |
| POST   | `/admin/auth/logout`  | admin  |                                                                                            |
| GET    | `/admin/auth/me`      | admin  |                                                                                            |
| POST   | `/admin/auth/refresh` | public | Rotate the refresh token (reuse of an old one revokes the whole session family)            |

### admin

| Method | Path                                                  | Auth  | Description                                                                                   |
| ------ | ----------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| GET    | `/admin/affiliates`                                   | admin | Affiliates (STUB)                                                                             |
| GET    | `/admin/aml/alerts`                                   | admin |                                                                                               |
| POST   | `/admin/aml/alerts/{id}/resolve`                      | admin | Resolve / dismiss / escalate an AML alert (reason + MFA; audited)                             |
| GET    | `/admin/approvals`                                    | admin | Four-eyes approvals awaiting a second admin                                                   |
| GET    | `/admin/audit-logs`                                   | admin | Hash-chained audit log (newest first)                                                         |
| GET    | `/admin/audit-logs/verify`                            | admin | Recompute the audit hash chain end-to-end                                                     |
| GET    | `/admin/dashboard`                                    | admin | KPIs (30 d) computed from the ledger + reconciliation status                                  |
| GET    | `/admin/feature-flags`                                | admin |                                                                                               |
| GET    | `/admin/ledger/balances`                              | admin | Balance per ledger account type (read-only — ledger rows can never be edited)                 |
| GET    | `/admin/ledger/reconciliation`                        | admin | Ledger invariants: total = 0, every posting balanced, pool accounts = projections             |
| GET    | `/admin/rounds`                                       | admin | Rounds (read-only — results come only from verifiable randomness)                             |
| GET    | `/admin/rounds/{number}`                              | admin |                                                                                               |
| GET    | `/admin/users`                                        | admin |                                                                                               |
| GET    | `/admin/users/{id}`                                   | admin |                                                                                               |
| POST   | `/admin/users/{id}/restrictions`                      | admin | Apply a restriction (reason + MFA re-auth; audited)                                           |
| POST   | `/admin/users/{id}/restrictions/{restrictionId}/lift` | admin | Lift a restriction (reason + MFA re-auth; audited)                                            |
| GET    | `/admin/withdrawals`                                  | admin | Withdrawal queue (default: open states) with four-eyes approval progress                      |
| POST   | `/admin/withdrawals/{id}/approve`                     | admin | Approve an under-review withdrawal (reason + MFA; flagged → second, different admin required) |
| POST   | `/admin/withdrawals/{id}/reject`                      | admin | Reject a withdrawal (reason + MFA; funds return to the player’s Available; audited)           |

### WebSocket: socket.io namespace `/pool`

| Event (server → client) | Payload                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pool:snapshot`         | on connect and after `pool:subscribe`: `{ round: { id, number, status, closesAt, entries, participants, poolBalance, platformFees, isDemo } }`         |
| `pool:update`           | after every entry purchase: `{ type, roundId, roundNumber, status, entries, participants, poolBalance, platformFees, closesAt, lastPurchase, isDemo }` |
| `round:status`          | lifecycle change: `{ type, roundId, roundNumber, status, at }`                                                                                         |

The socket is read-only: clients cannot change state over it. CORS follows `CORS_ORIGINS`.

### Capabilities that deliberately do not exist

No endpoint, admin or otherwise, sets results, chooses winners, settles a round by hand, credits or debits a balance,
or edits or deletes ledger rows. `POST /admin/rounds/:id/winner`, `PATCH /admin/ledger/entries/:id` and similar paths
return `404` (covered by e2e tests). Settlement runs only inside the round lifecycle, from a fulfilled random word.

## Ledger model

Append-only double entry: `ledger_postings` (one business event) and `ledger_entries` (its lines).

- **Signed amounts:** `+` = value into the account, `−` = value out. **Every posting has at least 2 non-zero lines that
  sum to exactly 0.** This is validated in code (`normalizePosting`) and again by a deferred constraint trigger at
  COMMIT.
- **Balance** of an account = Σ of its lines. User buckets and liabilities are positive; `chain_clearing:<network>`
  mirrors custody holdings and runs negative. The whole ledger always sums to `0.00`.
- **Immutable:** database triggers reject `UPDATE` / `DELETE` / `TRUNCATE` on `ledger_postings`, `ledger_entries`,
  `pool_ledger`, `fee_ledger`, `audit_logs` and `withdrawal_events`. Corrections are new reversing postings.
- **Concurrency:** touched user-bucket rows are locked `FOR UPDATE` (sorted ids) inside the transaction; a debit that
  would overdraw a user bucket fails with `INSUFFICIENT_FUNDS`. A unique `event_key` prevents posting one event twice.

| Account (`ledger_accounts.code`)                         | Type               | Meaning                                                                          |
| -------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `user:<id>:available` / `:locked` / `:pending` / `:owed` | `user_*`           | player buckets                                                                   |
| `pool:<round id>`                                        | `pool`             | Σ entry amounts of one round (platform fees never enter it)                      |
| `fees`                                                   | `fees`             | platform fees (0.05 per qualifying entry), mirrored line by line in `fee_ledger` |
| `prize_liability`                                        | `prize_liability`  | settled pools awaiting allocation to winners (0 after settlement)                |
| `refunds`                                                | `refunds`          | clearing account for cancelled-round refunds                                     |
| `operator_revenue`                                       | `operator_revenue` | recovered withdrawal network fees; DEMO reward funding                           |
| `chain_clearing:<network>`                               | `chain_clearing`   | on-chain custody counterpart of deposits and withdrawals                         |

**Player balances** (`GET /wallet/balances`): Available = `user_available`; Pending = `user_pending`; Owed =
`user_owed`; **Locked = `user_locked` (pending withdrawals) + the player's attributed lines in the POOL accounts of
rounds that are open, closed or drawing** (entry stakes; `ledger_entries.user_id` records the beneficial owner).
Total = the sum of the four.

| Event                                    | Posting kind                      | Lines                                                                                         |
| ---------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| deposit detected                         | `deposit_detected`                | `chain_clearing −a`, `pending +a`                                                             |
| deposit confirmed (N confirmations)      | `deposit_credited`                | `pending −a`, `available +a`                                                                  |
| buy n entries                            | `entry_purchase`                  | `available −10.05·n`, `pool +10.00·n`, `fees +0.05·n`                                         |
| withdrawal requested                     | `withdrawal_lock`                 | `available −a`, `locked +a`                                                                   |
| withdrawal rejected / failed / cancelled | `withdrawal_release`              | `locked −a`, `available +a` (no fee charged)                                                  |
| withdrawal confirmed                     | `withdrawal_settle`               | `locked −a`, `chain_clearing +(a − networkFee)`, `operator_revenue +networkFee`               |
| round settled                            | `round_settlement`, `prize_award` | `pool −P`, `prize_liability +P`; then `prize_liability −P`, `owed(winner) +prize` per winner  |
| round cancelled                          | `round_refund`                    | per player: `pool −s`, `refunds +s`, `refunds −s`, `owed +s` (platform fees are not refunded) |
| claim owed                               | `owed_claim`                      | `owed −x`, `available +x`                                                                     |
| DEMO history / rewards                   | `demo_opening_balance`, `reward`  | seed only                                                                                     |

Reconciliation (`GET /admin/ledger/reconciliation`): the ledger total is 0, no posting is unbalanced, and every
unsettled round's POOL balance equals its `rounds.pool_amount` projection. Settlement refuses to run if they differ.

## Flows

### Player sign-in (Privy) and onboarding

1. The web app signs in with Privy (email OTP, social or wallet) and gets an access token (ES256).
2. `POST /auth/session` verifies the token (`PrivyClient.verifyAuthToken`), upserts the user by Privy DID, syncs the
   linked email and wallets and records the Privy session (`sid`) as a device. The response has `onboardingRequired`.
3. `POST /auth/onboarding {handle, country, dateOfBirth?, consents}`: 18+, permitted jurisdiction, terms and privacy
   must each be explicitly `true`; `marketingOptIn` is separate. The country of residence and the request location
   must be permitted (`451 GEO_RESTRICTED`). Until onboarding is done, every money or gaming route answers
   `403 ONBOARDING_REQUIRED`.
4. DEV MOCK: `POST /auth/dev/token` issues HS256 tokens signed with `PRIVY_MOCK_SIGNING_SECRET` (refused in production).

### Step-up 2FA

`POST /auth/2fa/enroll` returns the secret and otpauth URI; `POST /auth/2fa/confirm {code}` activates 2FA and returns
10 backup codes (shown once). Withdrawals, whitelist changes and security settings need either `totpCode` in the
request or a single-use `X-Step-Up-Token` from `POST /auth/2fa/challenge {purpose, code}` (5 min, bound to user,
session and purpose). Each TOTP time step is accepted once; 5 wrong codes pause step-up for 15 min
(`423 STEP_UP_LOCKED`).

### Deposit (hybrid custody, Arbitrum Sepolia)

`GET /deposits/address?network=arbitrum` assigns the next HD index of `DEPOSIT_XPUB` (public key only; a throwaway dev
xpub is generated when unset). The watcher job (every `DEPOSIT_WATCHER_POLL_SECONDS`) reads test-USDT `Transfer` logs
to assigned addresses (block cursor in `chain_cursors`, chunked ranges), records `confirming` deposits (posting
`deposit_detected`) and credits them after `DEPOSIT_CONFIRMATIONS_ARBITRUM` (20) confirmations. Without an RPC URL or
token address it skips. DEMO: `POST /dev/deposits/simulate` posts the same two postings at once.

### Enter a round

`POST /pool/rounds/:roundId/entries {entries, idempotencyKey}` runs one DB transaction: lock the round row → check it
is open and before `closesAt` → RG participation and loss limits, self-exclusion → `entry_purchase` posting
(balance-checked) → sequential tickets `E-<round>-<seq>` → `pool_ledger` / `fee_ledger` rows → round projections →
notification. Afterwards `pool:update` is broadcast. Example: 35 entries → Available −351.75, Locked +350.00,
fees +1.75.

### Withdrawal

`POST /withdrawals {network, address, amount, idempotencyKey, totpCode?}`: feature flag → the KYC level must allow
withdrawals (`DAILY_WITHDRAWAL_LIMIT`, else `403 KYC_REQUIRED`) → step-up → daily limit → new-address cool-down →
`withdrawal_lock` posting → state machine (`WITHDRAWAL_TRANSITIONS` in `@gp/shared`):

```text
requested → risk_check → queued ─────────────────→ broadcast → confirmed
                       ↘ under_review → queued ↗            ↘ failed (funds returned)
                       ↘ rejected (funds returned)    cancelled by the player before broadcast (funds returned)
```

AML screening (mock, 6 checks): a sanctioned destination is rejected; a new destination, a large amount or high
velocity goes to `under_review` with **four eyes** (two different admins, each with reason and MFA); otherwise the
withdrawal is `queued`. No testnet signer is wired yet, so queued withdrawals wait. DEMO:
`POST /dev/withdrawals/:id/simulate-confirm` posts the confirmation.

### Round lifecycle and settlement

The BullMQ `rounds` queue ticks every 30 s: `scheduled → open` at `opensAt`; `open → closed` at `closesAt`, freezing
the thresholds (500 participants and a 50,000.00 pool by default, copied into the round when it opens); closed with
thresholds met → randomness requested → `drawing`; fulfilled → **settle**; thresholds not met or VRF timeout
(`VRF_TIMEOUT_HOURS`) → **cancel**, with stakes returned to Owed. `ROUND_AUTO_SCHEDULE` opens the next daily round
(08:00–20:00 UTC). DEMO rounds are a frozen snapshot: they close at their real time but are drawn only with
`DEMO_ROUNDS_AUTO_SETTLE=true`.

**Winner selection** (`src/modules/randomness/selection.ts`, a mirror of `DrawMath.sol`):
`candidate_k = keccak256(abi.encode(keccak256("GLOBAL_POOL_WINNERS_V1"), roundId, randomWord, k))`; reject candidates
below `2^256 mod N` (no modulo bias); `index = candidate mod N`; skip duplicates. The i-th distinct index wins rank i
(entries ordered by `seq`, index = seq − 1). Prizes are `floor(pool × bps / 10000)` for ranks 2 and up; the 1st prize
takes the remainder, so prizes always sum to the pool. Unit tests check this against the Solidity-proven vectors in
`packages/contracts`. `GET /pool/rounds/:number/verify` returns the word, the request id, the algorithm and whether a
recomputation matches the stored winners. Providers: `RANDOMNESS_PROVIDER=mock` (dev; word =
`keccak256("GP_MOCK_VRF:" + requestId)`) or `chainlink` (reads `DrawRequested` / `DrawFulfilled` of `GlobalPoolRounds`
at `POOL_CONTRACT_ADDRESS`).

### Admin

`POST /admin/auth/login {email, password, totpCode}` checks the argon2id password and the mandatory TOTP in one step
(one generic error message) and locks the account for `ADMIN_LOCKOUT_MINUTES` (15) after `ADMIN_LOGIN_MAX_ATTEMPTS`
(5) failures. It returns an access JWT (`ADMIN_ACCESS_TTL`) and an opaque refresh token; refreshing rotates the token,
and reusing a rotated token revokes the whole family. RBAC comes from `admin_roles` → `admin_permissions`
(`ROLE_PERMISSIONS` / `PERMISSION_POLICY` in `@gp/shared`). Sensitive actions need the permission, a written
`reason` and a fresh `mfaCode` (plus four eyes where flagged), and write a hash-chained audit row in the same
transaction.

## Data model

Prisma schema: `apps/api/prisma/schema.prisma`; migrations in `apps/api/prisma/migrations/` (the integrity triggers
are hand-written at the end of the init migration). UUID ids, snake_case tables, `created_at` / `updated_at`, USDT
`Decimal(20,6)`, raw on-chain amounts `Decimal(38,18)`, enums identical to `@gp/shared`.

Tables: `users`, `user_profiles`, `user_wallets`, `deposit_addresses`, `sessions`, `email_verifications`,
`totp_secrets`, `totp_backup_codes`, `user_restrictions`, `kyc_records`, `aml_alerts`, `geo_rules`,
`responsible_gaming_limits`, `responsible_gaming_self_exclusions`, `responsible_gaming_settings`, `deposits`,
`withdrawals`, `withdrawal_events`, `transactions`, `ledger_accounts`, `ledger_postings`, `ledger_entries`,
`pool_ledger`, `fee_ledger`, `rounds`, `entries`, `winners`, `prize_claims`, `randomness_requests`, `games`,
`game_sessions`, `game_results`, `referrals`, `affiliates`, `vip_levels`, `notifications`, `admin_users`,
`admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_user_roles`, `admin_approvals`, `audit_logs`,
`idempotency_keys`, `feature_flags`, `chain_cursors`.

## DEMO seed

`pnpm --filter @gp/api db:seed` runs only with `DEMO_MODE=true` and refuses `REAL_MONEY_ENABLED=true`. It loads the
`@gp/shared` DEMO data with its deterministic `de0000…` ids:

- **@nova.k** (GP-48213, KYC L2, VIP Gold III, 2FA on, anti-phishing AURORA-27, wallets, devices, RG limits) with
  **balances posted as balanced ledger postings**: Available 9,215.30 · Locked 1,850.00 · Pending 1,000.00 ·
  Owed 415.20 = **12,480.50** (WD-20850 / 20877 / 20931, DP-77380 / 77412, round #1,245 refund, VIP reward, plus one
  aggregated "DEMO history" opening posting).
- **Round #1,248** open with 3,412 participants, 18,640 entries, pool 186,400.00 and fees 932.00 (DEMO crowd players;
  @nova.k holds E-1248-00981 … E-1248-01015). History #1,244–#1,247 is seeded as snapshots with their listed winners.
- **RBAC + 6 DEMO admins:** S. Iyer (Super Admin), A. Marin (Finance Lead), K. Osei (Compliance Officer), R. Duarte
  (Support L2), L. Moreau (Marketing Lead), E. Lindqvist (read-only auditor).
- Games, VIP levels, geo rules, feature flags, affiliates, notifications.

DEMO dates are shifted by whole days so round #1,248 closes at the next 20:00 UTC (`DEMO_SEED_SHIFT_DAYS=0` keeps the
exact snapshot). The seed checks the 12,480.50 total and the ledger reconciliation before it finishes.
