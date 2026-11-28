# GLOBAL POOL — API (`apps/api`, `@gp/api`)

> **DEMO / testnet only.** MVP chain Arbitrum Sepolia (421614). `REAL_MONEY_ENABLED=true` is rejected at boot.
> NestJS 11 · Prisma 6 · PostgreSQL 16 · Redis 7 / BullMQ · socket.io · zod (shared schemas from `@gp/shared`).
> Live OpenAPI: **`GET /docs`** (Swagger UI) and **`GET /docs-json`**. The main endpoints carry response schemas
> (`src/infra/openapi/response-schemas.ts`, contract-tested against live responses) and every operation documents
> the shared error envelope as its `default` response.

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
- **Docker:** `docker compose --profile dev up --build` runs the DEMO stack with `NODE_ENV=development`, so the DEV
  MOCK player login works (migrations + DEMO seed on start; credentials via
  `docker compose exec api-dev cat apps/api/.dev/demo-admins.json`). `--profile prod` runs production mode, where the
  DEV MOCK is refused and player sign-in needs a Privy app id (`PRIVY_APP_ID` + `NEXT_PUBLIC_PRIVY_APP_ID`; the prod
  web is built with the mock off). The prod profile reads secrets from `.env` only — never `.env.example` — and the
  API refuses to boot in production with any committed placeholder (`dev-only…` / `change-me…`) secret.
  `docker compose up -d postgres redis` = services only.
- **Local chain:** `pnpm --filter @gp/api devnet` starts Anvil (31337) with `GlobalPoolRounds`, the VRF v2.5 mock and
  a mock test-USDT deployed from throwaway runtime keys, and writes the env lines to `apps/api/.dev/devnet.env`. Run
  the API with them plus `POOL_ONCHAIN_MIRROR=true RANDOMNESS_PROVIDER=chainlink` (and
  `WITHDRAWAL_BROADCASTER_ENABLED=true`). See [On-chain operations](#on-chain-operations-testnet-only).

| Script                             | What it does                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `typecheck` / `lint` / `build`     | `prisma generate` + `tsc --noEmit` / type-aware ESLint / `nest build` → `dist/src/main.js`  |
| `test`                             | unit tests (vitest + SWC) **and** e2e tests (supertest) against `globalpool_test`           |
| `test:unit` / `test:e2e`           | one suite only                                                                              |
| `start:dev` / `start:prod`         | watch mode / `node dist/src/main.js`                                                        |
| `db:migrate` / `db:migrate:deploy` | create and apply (dev) / apply only (CI, Docker)                                            |
| `db:seed` / `db:seed:prod`         | DEMO seed with tsx / compiled seed (`dist/prisma/seed.js`)                                  |
| `db:migrate:test`                  | reset the test database (destructive; e2e itself only runs `migrate deploy`). `--test-db` uses `DATABASE_URL_TEST` (default `globalpool_test`), never `DATABASE_URL`, and refuses a database not named `*_test` |
| `devnet`                           | local Anvil devnet with the contracts deployed (DEV ONLY; env written to `.dev/devnet.env`) |

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
- **Response schemas** (OpenAPI components `RoundView`, `WalletBalances`, `WithdrawalView`, `EntryPurchase`, …) are
  `looseObject`s: listed fields are guaranteed; new fields may be added without notice, never removed silently.

## Modules

| Module           | Responsibility                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config`         | zod-validated env (`src/config/env.ts`); refuses `REAL_MONEY_ENABLED=true`, weak secrets and a wrong-size TOTP key                                                                         |
| `health`         | `/health` with PostgreSQL and Redis checks (503 when degraded)                                                                                                                             |
| `ledger`         | append-only double-entry ledger: posting templates, balance computation, reconciliation                                                                                                    |
| `audit`          | hash-chained `audit_logs`: service, `@Audit()` interceptor, chain verification                                                                                                             |
| `idempotency`    | stored responses for financial writes (`idempotency_keys`)                                                                                                                                 |
| `auth`           | Privy verification (`@privy-io/server-auth`) or DEV MOCK tokens, user upsert by `privy_user_id`, linked email and wallet sync, onboarding consents, `PlayerAuth` guards and route policies |
| `security`       | TOTP (otplib; AES-256-GCM at rest; replay protection; lockout), backup codes, anti-phishing code, step-up tokens                                                                           |
| `users`          | `/me`, profile, sessions/devices and revoke, linked wallets, withdrawal whitelist (24 h cool-down)                                                                                         |
| `wallet`         | balances from the ledger (Available / Locked / Pending / Owed / Total with breakdown), lifetime stats, claim owed                                                                          |
| `deposits`       | per-user HD deposit addresses (xpub only), re-org-safe chain watcher (test-USDT `Transfer` logs via viem, receipts re-checked until credited), confirmations, DEMO simulation              |
| `withdrawals`    | request (step-up, KYC limit, AML), state machine, four-eyes approvals, testnet broadcaster (signer outbox, nonce manager, confirmation tracker), DEMO confirmation, BullMQ processing      |
| `transactions`   | user-facing activity history (paginated, filtered); never used for balances                                                                                                                |
| `pool`           | rounds, entries, live projections, lifecycle (close → draw → settle / cancel), WebSocket gateway `/pool`                                                                                   |
| `randomness`     | provider interface, `MockVrfProvider` (dev), `ChainlinkVrfProvider` (VRF fulfilment watcher: `DrawRequested` / `DrawFulfilled` of `GlobalPoolRounds` with confirmations), winner selection |
| `onchain-rounds` | round mirroring on `GlobalPoolRounds` (openRound → commitEntries with salted entry commitments → requestDraw → recordSettlement / cancelRound), public proofs and manifest                 |
| `games`          | catalogue + provably-fair games engine (DEMO credits only, commit–reveal seeds, instant / stateful games, Orbit Rush crash loop + `/crash` socket, read-only admin monitoring) — see GAMES.md |
| `notifications`  | in-app notifications (email-worthy types are also queued for email)                                                                                                                        |
| `email`          | email adapter: `log` (dev console) / `smtp` (nodemailer) / `disabled`; BullMQ `emails` worker; anti-phishing code + DEMO notice in every email; honours A9 preferences                     |
| `compliance`     | geo rules + `RESTRICTED_COUNTRIES`, 18+, responsible gaming (limits, cool-down, self-exclusion, reality checks), admin restrictions                                                        |
| `kyc` / `aml`    | provider interfaces + mock providers (KYC level → withdrawal limit; withdrawal screening → alerts)                                                                                         |
| `affiliates`     | referral / affiliate **stub** (read-only)                                                                                                                                                  |
| `admin`          | separate admin auth (argon2id + mandatory TOTP, refresh-token families), RBAC, back-office endpoints                                                                                       |
| `reporting`      | dashboard KPIs computed from the ledger                                                                                                                                                    |
| `blockchain`     | chain config, viem clients (Arbitrum Sepolia or local Anvil only) and `ChainSignerService` (testnet keys, eth_chainId check, DB nonce manager, signed-tx outbox, re-broadcast, tracking)   |
| `feature-flags`  | operational kill switches (`pool.entries.enabled`, `deposits.enabled`, `withdrawals.enabled`, …)                                                                                           |
| `platform`       | public config (`/config`): fees, limits, chains, round rules, auth mode                                                                                                                    |

## Endpoints

`player` = Privy / DEV MOCK bearer token, `admin` = admin bearer token. Player routes also apply a policy: onboarding
complete (all money and gaming routes — not RG tools, 2FA, account status or the profile); permitted region and not
self-excluded (entries, NEW deposits; deposit history and tracking stay open); admin restrictions
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

| Method | Path                                          | Auth   | Description                                                                                                                                                                                                                |
| ------ | --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/auth/config`                                | public | Player auth mode: privy / mock (DEV MOCK, offline) / disabled                                                                                                                                                              |
| POST   | `/auth/dev/token`                             | public | DEV MOCK only (never in production): issue a locally signed player token. DEMO user: did:privy:demo-nova-k                                                                                                                 |
| POST   | `/auth/logout`                                | player | Revoke the current session for this API (call Privy logout on the client too)                                                                                                                                              |
| POST   | `/auth/onboarding`                            | player | First-login onboarding: consents (never pre-checked) + country + handle                                                                                                                                                    |
| POST   | `/auth/session`                               | player | Call after Privy login: verifies the token, upserts the user (privy_user_id), syncs linked email/wallets                                                                                                                   |
| GET    | `/auth/account-status`                        | player | Account gate for the web (AUTH-18): `ok · onboarding · suspended · self_excluded · region · under_review` (`under_review` = `gaming_blocked`, `deposits_blocked` or `withdrawals_frozen`; never `ok` while any restriction is active), restrictions (type, since, case reference — never the internal reason), paused features, self-exclusion, region |
| GET    | `/auth/new-device-alerts`                     | player | AUTH-21: sign-ins from a device label this player never used, shown on their OTHER sessions (14 days)                                                                                                                      |
| POST   | `/auth/new-device-alerts/{sessionId}/confirm` | player | “Yes, it was me” — clears the flag (audited)                                                                                                                                                                               |
| POST   | `/auth/new-device-alerts/{sessionId}/secure`  | player | “No, secure my account” — revokes every other session (audited)                                                                                                                                                            |

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

### users · account (account module — USR-A1…A10)

| Method | Path                            | Auth   | Description                                                                                       |
| ------ | ------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| GET    | `/me/preferences`               | player | Language, time zone, notification channels per category (locked categories resolved), idle timeout |
| PATCH  | `/me/profile`                   | player | A1: display name, language, time zone (verified identity is never editable here; audited)        |
| PUT    | `/me/notification-preferences`  | player | A9: channels per category — security + RG stay on; promotions are opt-in and mirror marketingOptIn |
| GET    | `/me/devices`                   | player | A7/A8: sessions as devices (masked IP, method, status); `?include=all` adds ended (90 days)        |
| POST   | `/me/sessions/revoke-others`    | player | A8: end every other session — protective, no 2FA code (audited)                                   |
| GET    | `/me/login-history`             | player | A6: sign-ins (one per Privy session), `?filter=all\|success\|flagged\|ended&days=30`, counts       |
| GET    | `/me/security`                  | player | A2: security score 0–100 from live protections + your own recent security events (audit log)     |

"Yes, it was me" / "Secure my account" for a flagged device use the auth module's
`POST /auth/new-device-alerts/{sessionId}/confirm|secure`.

### wallet

| Method | Path                 | Auth   | Description                                                                                     |
| ------ | -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| GET    | `/wallet/balances`   | player | Available / Locked / Pending / Owed / Total — computed from the append-only double-entry ledger |
| GET    | `/wallet/lifetime`   | player | Lifetime deposits, withdrawals, entries, platform fees paid, rewards                            |
| POST   | `/wallet/owed/claim` | player | Claim everything owed (refunds, prizes, rewards) to Available (idempotent)                      |
| GET    | `/wallet/status` | player | Deposits / withdrawals operational status + daily withdrawal limit usage (KYC level, used today, resets at) |

### deposits

| Method | Path                | Auth   | Description                                                            |
| ------ | ------------------- | ------ | ---------------------------------------------------------------------- |
| GET    | `/deposits`         | player | Your deposits with confirmation progress (stays available during a break / abroad) |
| GET    | `/deposits/address` | player | Your per-user deposit address (HD-derived, Arbitrum Sepolia test-USDT) — deposit policy: permitted region, not self-excluded, no `deposits_blocked` |
| GET    | `/deposits/ref/{reference}` | player | One deposit by reference (DP-…) with confirmation progress (polled by the pending step) |

### withdrawals

| Method | Path                       | Auth   | Description                                                                                             |
| ------ | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| GET    | `/withdrawals`             | player | Your withdrawals                                                                                        |
| POST   | `/withdrawals`             | player | Request a withdrawal (idempotent): step-up 2FA, KYC daily limit, AVAILABLE → LOCKED, risk/AML screening |
| GET    | `/withdrawals/quote`       | player | Fee breakdown: network fee (deducted), platform fee 0.00, you receive                                   |
| GET    | `/withdrawals/{id}`        | player |                                                                                                         |
| POST   | `/withdrawals/{id}/cancel` | player | Cancel before sending — funds return to Available                                                       |
| GET    | `/withdrawals/precheck` | player | Read-only risk validation before 2FA (KYC, limits + balance, 2FA, AML preview, address risk / cool-down, network) → pass / review / kyc_required / blocked; writes nothing |
| GET    | `/withdrawals/ref/{reference}` | player | One withdrawal by reference (WD-…) with its stored AML screening (status tracker) |

### transactions

| Method | Path                        | Auth   | Description                                                           |
| ------ | --------------------------- | ------ | --------------------------------------------------------------------- |
| GET    | `/transactions`             | player | Paginated, filtered activity history (type, status, network, from/to) |
| GET    | `/transactions/{reference}` | player | One transaction by reference (DP-…, WD-…, EP-…) with its timeline     |

### pool

| Method | Path                                | Auth   | Description                                                                                           |
| ------ | ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| GET    | `/pool/quote`                       | public | Entry quote: n × 10.00 + platform fee n × 0.05 (separate line) + network fee 0.00                     |
| GET    | `/pool/rounds`                      | public | Round history (closed, drawing, settled, cancelled); `?status=settled,cancelled&number=1245`                                   |
| GET    | `/pool/rounds/current`              | public | Current round (open → next scheduled → latest) with pool, thresholds and prize table                  |
| GET    | `/pool/rounds/{number}`             | public | Round by public number (e.g. 1248)                                                                    |
| GET    | `/pool/rounds/{number}/feed`        | public | Latest entry purchases in a round                                                                     |
| GET    | `/pool/rounds/{number}/verify`      | public | Verification bundle: VRF word, algorithm, recomputed winners vs stored winners                        |
| GET    | `/pool/rounds/{number}/chain`       | public | On-chain mirror status: contract, steps (open / commit / draw / settle) + tx links, rules hash, roots |
| GET    | `/pool/rounds/{number}/manifest`    | public | Committed entry leaves in index order (`?page&pageSize≤5000`) — rebuild the on-chain entries root     |
| GET    | `/pool/rounds/{number}/payouts`     | public | Payout leaves + Merkle proofs (check each with `verifyPayout` on-chain)                               |
| GET    | `/pool/rounds/{number}/my-proofs`   | player | Your entry receipts: index, entry id, secret salt, commitment and proof (`verifyEntry` on-chain)      |
| POST   | `/pool/rounds/{roundId}/entries`    | player | Buy entries (idempotent): RG limits, balance check, AVAILABLE → POOL + FEES in one DB transaction     |
| GET    | `/pool/rounds/{roundId}/my-entries` | player | Your entries in a round + odds disclosure                                                             |
| GET    | `/pool/winners`                     | public | Recent winners                                                                                        |
| GET    | `/pool/me/entries`                  | player | Your entry history: one row per purchase (entries + separate platform fee) with its result + lifetime summary |

### games

**DEMO credits only — no cash value** (never bought, withdrawn or converted; never on the USDT ledger, wallet, pool or
fee ledgers; no fee on game bets). Provably fair (commit–reveal seeds, HMAC-SHA256 byte stream from
`@gp/shared/fair`). Full contract, formulas, house edges and limits: **[GAMES.md](./GAMES.md)**.

| Method | Path            | Auth   | Description                                                                 |
| ------ | --------------- | ------ | --------------------------------------------------------------------------- |
| GET    | `/games`        | public | Game catalogue (house edge disclosed; simulation mode — no real-money play); playable games carry `play { currency: 'DEMO', fee: '0.00', minBet, maxBet, houseEdgePercent, rtpPercent, rules }` |
| GET    | `/games/{slug}` | public |                                                                             |
| GET    | `/games/credits` | player | DEMO credit balance (starts at 1,000.00), reset availability, DEMO session + today summary |
| POST   | `/games/credits/reset` | player | Back to 1,000.00 — once per hour (429 otherwise), not while a round is open; audited |
| GET    | `/games/{slug}/seeds` | player | Active seed pair (server seed hash, client seed, nonce) + revealed pairs |
| POST   | `/games/{slug}/seeds/client` · `/seeds/rotate` | player | Change the client seed / rotate: reveals the server seed, commits a new one (409 while a round is open) |
| POST   | `/games/{slug}/bets` | player | Instant bet (Pool Dice, Double Side, Pool Roulette, Skyline, Fortune Ring, Pool Keno, Pinfall) — idempotent |
| GET    | `/games/{slug}/bets` | player | My bets for a game (paginated) + totals. Optional filters (applied to the page AND the summary): `from` / `to` (ISO), `result=win\|lose`, `pick=heads\|tails` (Double Side), `outcome=win\|lose\|push` (by NET: payout vs stake) or — Twenty-One — `outcome=blackjack\|bust\|split_double` (any hand of the bet), `search` (ref `CF-52107` / `52107` or nonce); summary adds `wins`, `losses`, `outcomes { win, lose, push }` (by net — a Twenty-One push or insurance-only return is not a win) and, for Double Side, `landed { heads, tails }` |
| GET    | `/games/bets/{id}` · `/games/bets/{id}/verify` | player | One bet · verification bundle (re-derived by the API once the seed is revealed) |
| GET/POST | `/games/twenty-one/hands[/current]` · `/hands/{id}/action` | player | Twenty-One: deal, `hit|stand|double|split|insurance`, reconnect |
| GET/POST | `/games/vault-sweeper/rounds[/current]` · `/{id}/reveal` · `/{id}/cashout` | player | Vault Sweeper (mines) |
| GET/POST | `/games/high-card/rounds[/current]` · `/{id}/action` · `/{id}/cashout` | player | High Card (hi-lo) |
| GET    | `/games/orbit-rush/state` · `/rounds` · `/rounds/{number}` · `/rounds/{number}/verify` · `/stats` | public | Orbit Rush live state (no crash point before the crash), history (`/rounds` items add `players`, `wagered`, `paidOut` in DEMO credits; optional `from`, `search=CR-55102`), public verification, statistics (`/stats?period=24h\|7d\|30d`: rounds, median, share reaching 2.00×, highest crash, distribution vs the published 0.99 ÷ m) |
| POST   | `/games/orbit-rush/bets` · `/bets/{id}/cashout` · GET `/bets` · `/bets/current` | player | Crash bets (betting window only), manual cash-out; auto cash-out runs server-side. GET `/bets` adds `summary { bets, wagered, returned, net, wins, losses, bestCashOut }` and optional `from` / `result=win\|lose` filters |
| GET    | `/admin/games/overview` · `/admin/games/bets` · `/admin/games/orbit-rush/rounds` | admin `games.read` | Read-only monitoring: measured vs published RTP, bets, rounds — no outcome controls |

New bets use the gaming policy (onboarded, permitted region, not self-excluded / on a break, no `gaming_blocked`), RG
time rules, a due reality check (`409 REALITY_CHECK_DUE`, only between bets) and the player's loss limit counted in DEMO
credits. Any currency other than `DEMO` or a non-simulation game → `403 REAL_MONEY_DISABLED`.

### responsible-gaming

All limits and breaks are enforced server-side (entries, game stakes and deposits); nothing here can block a withdrawal.
These routes are open from the first sign-in, **before onboarding** (protective tools: a new player can set limits, take
a break or self-exclude before ever playing); money and gaming routes still answer `403 ONBOARDING_REQUIRED`.
Every change is written to the hash-chained audit log, which also feeds the player's limit history.

| Method | Path                                         | Auth   | Description                                                                                                                         |
| ------ | -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/responsible-gaming`                        | player | Limits (effective, usage, `resetsAt`, pending increase / removal), `exclusion` (break or self-exclusion), settings, session, 2FA on? |
| PUT    | `/responsible-gaming/limits`                 | player | Set a limit — new or lower limits apply now, increases after a 24 h cool-down                                                       |
| POST   | `/responsible-gaming/limits/remove`          | player | Remove a limit — waits for the 24 h cool-down (cancellable)                                                                         |
| POST   | `/responsible-gaming/limits/cancel-pending`  | player | Cancel a pending increase or removal — the current limit stays                                                                      |
| PUT    | `/responsible-gaming/session-limit`          | player | Session length limit (minutes, `null` = remove) — increases / removal wait 24 h                                                     |
| PUT    | `/responsible-gaming/quiet-hours`            | player | Quiet hours (UTC) — on applies now, off waits 24 h                                                                                  |
| POST   | `/responsible-gaming/settings/cancel-pending`| player | Cancel a pending session-limit change or quiet-hours switch-off                                                                     |
| PUT    | `/responsible-gaming/reality-check`          | player | Reality-check interval (15–240 min) + `pauseGame` / `pushNotification` toggles                                                      |
| POST   | `/responsible-gaming/reality-check/ack`      | player | Answer a reminder: `continue` / `history` / `break` (restarts the interval; logged)                                                 |
| GET    | `/responsible-gaming/session`                | player | Session: started, played today, sessions today, net session / today, next reality check (`due`), `blockedReason`                   |
| POST   | `/responsible-gaming/session/heartbeat`      | player | Activity heartbeat (web: every 60 s while playing) — drives time limits; a session ends after 15 min idle                          |
| GET    | `/responsible-gaming/history`                | player | `?kind=limits\|reality_checks\|all` — your RG changes and reminder answers (from the audit log)                                     |
| POST   | `/responsible-gaming/cooling-off`            | player | Break of 24 h / 7 d / 30 d, immediate; cannot be shortened — 409 while a break or self-exclusion of the same or a longer length is running (a repeat never restarts it) or one already ends later; a longer break or a self-exclusion extends it |
| POST   | `/responsible-gaming/self-exclusion`         | player | Self-exclude immediately. 6m / 1y / 5y / permanent need `phrase: "SELF-EXCLUDE"` + `acknowledged: true` (+ `totpCode` when 2FA is on: authenticator **or backup code**) |
| POST   | `/responsible-gaming/self-exclusion/reopen`  | player | After a 6m / 1y / 5y self-exclusion ended: ask to reopen — starts a 24 h cool-down (idempotent; 409 while it is still running or permanent) |
| POST   | `/responsible-gaming/self-exclusion/reopen/confirm` | player | After the cool-down and with a deposit limit + a loss limit set: reopen (409 before / 400 `missingLimits`) |

Time rules (`assertCanParticipate`): the daily `session_time` limit, the session-length limit and quiet hours block **new**
entries / bets with `422 RG_LIMIT_EXCEEDED` (`details.type` = `daily_time_limit` / `session_limit` / `quiet_hours`).
Breaks and self-exclusion answer `403 SELF_EXCLUDED` (`details.kind` = `cooling_off` / `self_exclusion`) on entries and
deposits; withdrawals and history stay available (incl. `GET /deposits`, `/deposits/ref/…` and the DEMO
confirmations route — only new deposits are paused).

**Nothing reopens automatically after a self-exclusion.** A break (24 h / 7 d / 30 d) ends on its date. A 6m / 1y / 5y
self-exclusion stays in force after its end date (`exclusion.reopen` = `awaiting_request`, also on
`/auth/account-status` → `selfExclusion.reopen`) until the player asks to reopen, waits the 24 h cool-down
(`cooling_down`), sets a deposit limit and a loss limit (`ready`, `missingLimits`) and confirms. Permanent never
reopens here. Every step is audited (`user.rg.reopen_requested`, `user.rg.reopened`).

Enforcement details: deposits and entries take a per-player advisory lock before the usage check, so parallel requests
cannot both pass a limit; refunds only offset stakes bought in the same period (a refund today for yesterday's
cancelled round does not free today's limit); an entry purchase counts as play activity (like a heartbeat) inside its
transaction, so the daily time and session-length limits accrue without client heartbeats.

### history (player financial + gaming history)

| Method | Path                              | Auth   | Description                                                                                                  |
| ------ | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/history/summary`                | player | Deposits / withdrawals / platform + network fees / rewards / refunds KPIs                                    |
| GET    | `/history/transactions`           | player | Paginated history: `types=deposit,withdrawal,…`, `status`, `network`, `from`, `to`, `q` (reference / hash)   |
| GET    | `/history/transactions/export`    | player | CSV (`format=csv\|csv_semicolon`, `includeHashes`) of the same filters — every export is audited            |
| GET    | `/history/fees`                   | player | Fee lines: 0.05 USDT platform fee per entry purchase and network fees per withdrawal (separate lines)       |
| GET    | `/history/entries`                | player | My Global Pool entries grouped by round (`status`, `roundFrom`, `roundTo`, `sort`) + odds share + result     |
| GET    | `/history/rounds/active`          | player | Open / drawing rounds where I hold entries                                                                   |
| GET    | `/history/rounds/results`         | player | Settled / cancelled rounds I took part in                                                                    |
| GET    | `/history/winnings`               | player | Prizes, refunds and rewards split into owed vs settled                                                       |
| GET    | `/history/games`                  | player | My games: active rounds, recently played games, 30-day totals (Global Pool and simulation reported apart)   |
| GET    | `/history/game-rounds` (+`/export`) | player | Game results with commit–reveal seeds (server seed only after the session ended); CSV export audited       |
| GET    | `/history/favourites`             | player | Favourite games                                                                                              |
| PUT    | `/history/favourites/{slug}`      | player | Add a favourite (idempotent)                                                                                 |
| DELETE | `/history/favourites/{slug}`      | player | Remove a favourite                                                                                           |

DEMO simulation game history for @nova.k (idempotent, never touches the ledger):
`DEMO_MODE=true pnpm --filter @gp/api exec tsx prisma/seed-history-demo.ts`.

### compliance

| Method | Path                 | Auth   | Description                                                                       |
| ------ | -------------------- | ------ | --------------------------------------------------------------------------------- |
| GET    | `/compliance/region` | public | Is the platform available from the current location? (no bypass hints, by design) |
| GET    | `/compliance/geo`    | public | PUB-21 / ERR-05 gate decision: `decision` permitted · restricted, country + name, `source`, optional `?declared=PT` check, `minAge`, `stillAvailable`, `paused` (no reason codes, no bypass hints) |

Location source, in order: DEV ONLY (`NODE_ENV=development`, ignored by every other build) `X-GP-Dev-Country: US` or
`?devCountry=US` per request; the CDN header `GEO_COUNTRY_HEADER` (default `cf-ipcountry`, e.g. `x-country`) only with
`TRUST_PROXY=true`; `DEV_COUNTRY_OVERRIDE` outside production; else unknown (fail-closed in production). Decided against
`geo_rules` (explicit allow / block) then `RESTRICTED_COUNTRIES`; every new-stake / new-deposit route enforces the same
answer (`test/gates.e2e-spec.ts` checks every such route from the route inventory).

### kyc

| Method | Path         | Auth   | Description                                                      |
| ------ | ------------ | ------ | ---------------------------------------------------------------- |
| GET    | `/kyc`       | player | KYC level, status and the resulting daily withdrawal limit       |
| POST   | `/kyc/start` | player | Start verification for a level (provider interface; mock in dev) |

KYC flow (AUTH-11…17, account module). Documents go to the KYC provider (mock in dev): the API stores metadata,
SHA-256 and check results in `kyc_records.details` — never the files.

| Method | Path                           | Auth   | Description                                                                                         |
| ------ | ------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| GET    | `/kyc/application`             | player | Open (or latest) application: status, next step, requirements, documents, liveness, check results   |
| POST   | `/kyc/application`             | player | Start / resume a level above the current one (L3 needs L2); personal details carry over             |
| PUT    | `/kyc/application/details`     | player | AUTH-12: legal name, 18+ DOB, nationality, address + postal format, occupation, PEP, accuracy (true) |
| POST   | `/kyc/application/documents`   | player | AUTH-13: one document side (type/side/file name/mime/size/sha256); mock quality check (< 40 KB = blurry) |
| POST   | `/kyc/application/liveness`    | player | AUTH-14: mock liveness (≥ 3 s passes); 3 attempts, then manual review                                  |
| POST   | `/kyc/application/submit`      | player | AUTH-15: submit (L1 approved instantly; L2/L3 → in_review + notification; audited)                    |
| GET    | `/kyc/documents`               | player | A5: documents on file (metadata only) + counts                                                        |
| POST   | `/dev/kyc/reject`              | player | DEMO only: mock rejection with failed checks → resubmission_required (only those items are redone)    |

### notifications

| Method | Path                       | Auth   | Description                             |
| ------ | -------------------------- | ------ | --------------------------------------- |
| GET    | `/notifications`           | player | Notifications (paginated, ?unread=true, ?category=security\|transactions\|rounds\|promotions\|account) + per-category `counts` |
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
| POST   | `/dev/deposits/{reference}/confirmations` | player | DEMO only: add simulated confirmations to a `mode: "progressive"` DEMO deposit; credited by the regular posting at N — or kept in Pending by the same holds as an on-chain deposit (restriction, break, kill switch, RG limit; advance again once lifted) |
| POST   | `/dev/kyc/approve`                       | player | DEMO only: mock-provider approval of your KYC level                                                |
| POST   | `/dev/withdrawals/{id}/simulate-confirm` | player | DEMO only: simulate broadcast + on-chain confirmation of a QUEUED withdrawal                       |
| POST   | `/dev/pool/rounds/{number}/close` · `/draw` · `/settle` | player | DEMO only, DEMO rounds only (QA): run the next REAL lifecycle step now — close (freeze entries + thresholds) → draw (mock VRF request, or cancel with refunds below the thresholds) → settle (winners = `selectWinners(word, entries)`, prizes to Owed). Refused for real rounds (403), on-chain-mirrored rounds and a non-mock provider (409); audited (`dev.round.*`) |

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
| POST   | `/admin/aml/alerts/{id}/resolve`                      | admin | Resolve / dismiss / escalate an open / under-review (or escalated) alert (reason + MFA; decision + audit in one transaction; a closed alert → 409) |
| GET    | `/admin/approvals`                                    | admin | Four-eyes approvals awaiting a second admin — only requests of modules you may read (same rule as the inbox) |
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

The socket is read-only: clients cannot change state over it. CORS follows `CORS_ORIGINS`. With
`SOCKET_IO_REDIS_ADAPTER=true` broadcasts go through the socket.io Redis adapter (`@socket.io/redis-adapter`,
channel prefix `BULLMQ_PREFIX`), so an event raised on any API replica (e.g. the worker that settles a round) reaches
clients connected to every replica.

### WebSocket: socket.io namespace `/crash` (Orbit Rush)

| Event | Direction | Payload |
| ----- | --------- | ------- |
| `crash:snapshot` | server → client | on connect / `crash:subscribe`: live round (commitment, phase — never the crash point before the crash), multiplier, live bets, last 20 crash points |
| `crash:phase` · `crash:tick` · `crash:bet` · `crash:cashout` · `crash:crashed` | server → client | phase changes, 100 ms multiplier frames, bets, cash-outs, crash (crash point + revealed seed) |
| `crash:bet` · `crash:cashout` | client → server (handshake `auth.token`) | place a bet / cash out; ack `{ ok, bet }` or `{ ok: false, error }` (same policy as REST) |

The crash loop runs with `JOBS_ENABLED=true`, or alone with `CRASH_LOOP_ENABLED=true` (no BullMQ workers — e.g. a QA / game instance; unset = follows `JOBS_ENABLED`), on one replica (Redis lease); see [GAMES.md](./GAMES.md#4-orbit-rush-crash).

### Capabilities that deliberately do not exist

No endpoint, admin or otherwise, sets results, chooses winners, settles a round by hand, credits or debits a balance,
or edits or deletes ledger rows. `POST /admin/rounds/:id/winner`, `PATCH /admin/ledger/entries/:id` and similar paths
return `404` (covered by e2e tests). Settlement runs only inside the round lifecycle, from a fulfilled random word. The
DEMO-only `/dev/pool/rounds/{number}/close|draw|settle` helper (404 in production / with real money; DEMO rounds only)
merely triggers those same lifecycle steps early — it takes no input that could influence winners or amounts.

### admin · console (admin-a)

| Method | Path                                    | Auth  | Description                                                                                                       |
| ------ | --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/approvals/inbox`                | admin | Four-eyes inbox (`?view=open\|waiting_for_me\|created_by_me\|decided_today\|expired`) with counts and your role per request — only requests of modules you may read (withdrawals → `withdrawals.read`, restrictions → `users.read`, role changes → `system.read`, breaker → `rounds.read`) |
| GET    | `/admin/approvals/{id}`                 | admin | One request: eligible approvers + its audit trail (`403` without the module's read permission)                    |
| POST   | `/admin/approvals/{id}/approve`         | admin | Second approver (different admin, own reason + fresh MFA); the requested action runs in the same transaction       |
| POST   | `/admin/approvals/{id}/reject`          | admin | Reject (reason + MFA): nothing changes (a flagged withdrawal is rejected → funds back to Available)                |
| POST   | `/admin/approvals/{id}/withdraw`        | admin | Requester withdraws their own pending request (reason; audited)                                                   |
| GET    | `/admin/user-stats`                     | admin | Users KPIs (total, active 30 d, KYC verified, restricted)                                                         |
| GET    | `/admin/users/{id}/account`             | admin | Masked PII, consents, security, sessions                                                                          |
| POST   | `/admin/users/{id}/pii/reveal`          | admin | Reveal ONE field (`email` · `date_of_birth` · `last_ip`) with a reason (`users.pii.read`; audited, value not logged) |
| GET    | `/admin/users/{id}/wallets`             | admin | Linked wallets / whitelist / deposit addresses (read-only)                                                        |
| GET    | `/admin/users/{id}/kyc` · `/aml`        | admin | KYC records + limits by level · AML alerts + rule-based read-only risk score (`kyc.read` / `aml.read`)            |
| GET    | `/admin/users/{id}/transactions`        | admin | Paginated history + lifetime flows + ledger balances                                                              |
| GET    | `/admin/users/{id}/responsible-gaming`  | admin | RG limits / usage / self-exclusion history (`rg.read`; admins cannot loosen limits)                                |
| GET    | `/admin/roles` · `/admin/permissions`   | admin | Live RBAC matrix + permission policy (`system.read`)                                                              |
| POST   | `/admin/roles/{key}/change-requests`    | admin | REQUEST a role-permission change (`admins.manage`, reason + MFA) → four-eyes; Super Admin role is fixed            |
| GET    | `/admin/system/health`                  | admin | DB, Redis, queues, randomness, chains, kill switches, ledger invariants                                           |
| GET    | `/admin/alerts` · POST `/admin/alerts/{key}/ack` | admin | Live alerts computed from real state (role-filtered) · acknowledge (audited, changes nothing else)       |

`GET /admin/users` also accepts `status`, `kycLevel`, `restricted=yes|no` and returns `totalBalance` (ledger) and the
open-AML `amlRiskLevel` per row. **Restrictions:** `withdrawals_frozen` and `account_suspended` need four eyes
(`RESTRICTION_REQUIRES_FOUR_EYES` in `@gp/shared/enums`): `POST /admin/users/{id}/restrictions` then answers
`{ status: 'pending_approval', approval: { id, ref, expiresAt } }` and nothing changes until a different admin with
`users.restrict` approves. `gaming_blocked` / `deposits_blocked` still apply immediately (`status: 'active'`). Requests
expire after `FOUR_EYES_EXPIRY_HOURS` (4) and then change nothing.
Requests created by other modules (e.g. the NEW-entries circuit breaker `pool.entries.pause|resume`) appear in the inbox
with `yourRole: 'external'` and their `decideAt` page; `/admin/approvals/{id}/approve|reject` refuses them (`400`, `details.decideAt`).

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
xpub is generated when unset). The watcher job (every `DEPOSIT_WATCHER_POLL_SECONDS`, `DepositChainWatcherService`)
reads test-USDT `Transfer` logs to assigned addresses (block cursor in `chain_cursors`, chunked ranges), records
`confirming` deposits (posting `deposit_detected`, CHAIN_CLEARING → PENDING) and credits them after
`DEPOSIT_CONFIRMATIONS_ARBITRUM` (20) confirmations (`deposit_credited`, PENDING → AVAILABLE). Without an RPC URL or
token address it skips. DEMO: `POST /dev/deposits/simulate` posts the same two postings at once; with
`mode: "progressive"` it records the deposit as detected (0 / 20) and `POST /dev/deposits/:reference/confirmations`
adds simulated blocks until it is credited (wallet deposit-flow QA); at N the same holds as for an on-chain deposit
apply, so a held DEMO deposit stays in Pending until it is advanced again after the hold ends.

**Re-org safety.** Idempotent by `(network, txHash, logIndex)` (unique index + posting event keys). Each pass first
re-checks every unconfirmed deposit against the canonical chain through its receipt, then scans; the scan always
re-reads the last N blocks (N = required confirmations).

| Observation                                  | Effect                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| receipt in another block / new log index     | block number, hash and log index updated; confirmations restart; credited once it is N deep               |
| receipt missing (block re-orged out)         | `reorg_seen_at_block` set, confirmations 0, "Network re-organisation detected — waiting for re-inclusion" |
| still missing N blocks after that            | `deposit_reversed` posting (PENDING → CHAIN_CLEARING), status `rejected`, transaction `failed`, notified  |
| receipt reverted / matching Transfer missing | reversed the same way                                                                                     |
| a reversed deposit's transfer is back        | the SAME deposit is reopened (`confirming`, `deposit_detected` posted again under a new event key) — never a second deposit |
| several identical Transfers in one tx        | one deposit per `(txHash, logIndex)`; a re-org that shifts the indices re-indexes all deposits of the tx together (a sibling whose transfer is gone is moved out of the way, then reversed); a batch of reversed deposits re-included at shifted indices is reopened in one pass |
| N confirmations, but a hold applies          | stays in Pending (`under_review`, "On hold — …"), player notified (`deposit.held`), re-checked every pass |

Credit happens only from a fresh receipt with ≥ N confirmations. Credited deposits are final (that is what N is for).
The watcher only reads an RPC whose `eth_chainId` equals `EVM_CHAIN_ID` (else the pass is skipped with an ALERT), and
one failing transaction never stops the pass for everyone else.

**Holds before Available (on-chain deposits).** On-chain funds cannot be refused, but before a confirmed deposit is
credited the same server-side rules as the deposit routes apply: `account_suspended` / `deposits_blocked`, an active
break or self-exclusion, the `deposits.enabled` kill switch and the player's RG deposit limits (counted on deposits
credited in the period). While one applies the deposit stays in **Pending** (never stakeable) and is credited by the
normal path once it no longer applies. A deposit that would exceed a limit is held as a whole. DEMO simulations keep
refusing up front.

### Enter a round

`POST /pool/rounds/:roundId/entries {entries, idempotencyKey}` runs one DB transaction: lock the round row → check it
is open and before `closesAt` → RG participation and loss limits, self-exclusion → `entry_purchase` posting
(balance-checked) → sequential tickets `E-<round>-<seq>` → `pool_ledger` / `fee_ledger` rows → round projections →
notification. Afterwards `pool:update` is broadcast. Example: 35 entries → Available −351.75, Locked +350.00,
fees +1.75.

### Withdrawal

`POST /withdrawals {network, address, amount, idempotencyKey, totpCode?}`: feature flag → the KYC level must allow
withdrawals (`DAILY_WITHDRAWAL_LIMIT`, else `403 KYC_REQUIRED`) → step-up → daily limit (read under a per-player
advisory lock, so concurrent requests cannot together exceed it) → new-address cool-down → `withdrawal_lock` posting → state machine (`WITHDRAWAL_TRANSITIONS` in `@gp/shared`):

```text
requested → risk_check → queued ─────────────────→ broadcast → confirmed
                       ↘ under_review → queued ↗            ↘ failed (funds returned)
                       ↘ rejected (funds returned)    cancelled by the player before broadcast (funds returned)
```

AML screening (mock, 6 checks): a sanctioned destination is rejected; a new destination, a large amount or high
velocity goes to `under_review` with **four eyes** (two different admins, each with reason and MFA); otherwise the
withdrawal is `queued`. **New destinations vs the whitelist cool-down (platform rule, independent of the AML
provider):** a whitelisted address is usable 24 h after it was added (`422 ADDRESS_NOT_WHITELISTED` before); a
destination that is not a whitelisted address already used for a confirmed withdrawal is never sent without four-eyes
review, even if the screening provider would approve it — so a brand-new address cannot bypass the cool-down
unreviewed. The first approval expires after `FOUR_EYES_EXPIRY_HOURS` (4) like every four-eyes request: a
second approval on an expired one expires it (system audit row) and starts a new first approval instead, and a first
approval withdrawn concurrently is never completed (status-guarded claim, `409`).

**Broadcaster (testnet, `WITHDRAWAL_BROADCASTER_ENABLED=true`, `WithdrawalBroadcasterService`).** For a queued
withdrawal: hot-wallet test-USDT and gas check (missing liquidity keeps it queued and logs an `ALERT`) →
`eth_call` simulation of `transfer(to, net)` → sign + store in the outbox (the same DB transaction moves it to
`broadcast` with its tx hash and nonce) → broadcast. The tracker job (`withdrawal.track`, every
`WITHDRAWAL_TRACK_POLL_SECONDS`) settles it after `WITHDRAWAL_CONFIRMATIONS` (`withdrawal_settle`: LOCKED →
CHAIN_CLEARING + network fee). A reverted or dropped transaction → `failed` and the full amount back to Available
(`dropped` only once the nonce is consumed `WITHDRAWAL_CONFIRMATIONS` blocks deep AND a second receipt lookup still
finds nothing — a just-mined transfer is never released). The liquidity check subtracts transfers already signed but
not yet mined (under the signer's nonce lock), so concurrent workers keep a withdrawal queued instead of letting it
revert on-chain; a
transfer whose simulation reverts never gets a nonce and fails from `queued` (new edge `queued → failed` in
`WITHDRAWAL_TRANSITIONS`), funds back. An unreachable RPC keeps it queued and retried. Without the broadcaster queued
withdrawals wait; DEMO: `POST /dev/withdrawals/:id/simulate-confirm` posts the confirmation.

### Round lifecycle and settlement

The BullMQ `rounds` queue ticks every 30 s: `scheduled → open` at `opensAt`; `open → closed` at `closesAt`, freezing
the thresholds (500 participants and a 50,000.00 pool by default, copied into the round when it opens); closed with
thresholds met → randomness requested → `drawing`; fulfilled → **settle**; thresholds not met or VRF timeout
(`VRF_TIMEOUT_HOURS`; for on-chain rounds the contract's `cancelRound(VRF_TIMEOUT)` first) → **cancel**, with stakes
returned to Owed. A round that was never mirrored while the Chainlink provider is active cannot get randomness: it is
alerted and cancelled with refunds `VRF_TIMEOUT_HOURS` after its close (never left `closed`). `ROUND_AUTO_SCHEDULE` opens the next daily round
(08:00–20:00 UTC). DEMO rounds are a frozen snapshot: they close at their real time but are drawn only with
`DEMO_ROUNDS_AUTO_SETTLE=true` or on demand with the DEMO-only `POST /dev/pool/rounds/{number}/close|draw|settle`
(mock VRF; same lifecycle code, audited).

**Winner selection** (`src/modules/randomness/selection.ts`, a mirror of `DrawMath.sol`):
`candidate_k = keccak256(abi.encode(keccak256("GLOBAL_POOL_WINNERS_V1"), roundId, randomWord, k))`; reject candidates
below `2^256 mod N` (no modulo bias); `index = candidate mod N`; skip duplicates. The i-th distinct index wins rank i
(entries ordered by `seq`, index = seq − 1). Prizes are `floor(pool × bps / 10000)` for ranks 2 and up; the 1st prize
takes the remainder, so prizes always sum to the pool. Unit tests check this against the Solidity-proven vectors in
`packages/contracts`. `GET /pool/rounds/:number/verify` returns the word, the request id, the algorithm and whether a
recomputation matches the stored winners. Providers: `RANDOMNESS_PROVIDER=mock` (dev; word =
`keccak256("GP_MOCK_VRF:" + requestId)`) or `chainlink` (reads `DrawRequested` / `DrawFulfilled` of `GlobalPoolRounds`
at `POOL_CONTRACT_ADDRESS`, waiting `VRF_FULFILLMENT_CONFIRMATIONS`).

### On-chain operations (testnet only)

`POOL_ONCHAIN_MIRROR=true` (requires `RANDOMNESS_PROVIDER=chainlink`, the RPC, `POOL_CONTRACT_ADDRESS` and
`POOL_OPERATOR_PRIVATE_KEY`; conversely `RANDOMNESS_PROVIDER=chainlink` requires the mirror) mirrors every non-DEMO round on `GlobalPoolRounds` (`RoundMirrorService`, driven by the
round tick; each step is a row in `round_chain_ops`):

| Round event                | On-chain call (signer)                                                              | Database                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| open (closes > 60 s ahead) | `openRound(rules…, rulesHash)` (OPERATOR)                                           | `chain_mirror`, `chain_id`, `contract_address`, `rules_hash` (keccak of the canonical rules JSON)                             |
| close → draw               | `commitEntries(root, entries, participants, pool)` (OPERATOR), after `closesAt`     | per entry: random 32-byte salt (AES-256-GCM at rest), `userCommitment`, leaf → `entry_commitments` + root, one DB transaction |
| thresholds missed (chain)  | `cancelRound(id, THRESHOLDS_NOT_MET)` (KEEPER, permissionless) → then the DB refund | stakes to Owed (fees not refunded)                                                                                            |
| thresholds met             | `requestDraw(id)` (KEEPER) → Chainlink VRF v2.5                                     | `randomness_requests` from the `DrawRequested` event                                                                          |
| `DrawFulfilled` (N conf.)  | —                                                                                   | **DB winners must equal `computeWinners()` and `prizeAmounts()`** (else settlement is blocked + `ALERT`), then settle         |
| settled                    | `recordSettlement(payoutsRoot, pool)` (SETTLER)                                     | `round_payouts` (leaves + proofs) + `payouts_merkle_root`; audited                                                            |
| unfulfilled for 24 h       | `cancelRound(id, VRF_TIMEOUT)` (KEEPER, permissionless) → then the DB refund — randomness is NEVER re-requested | request `timed_out`, round `cancelled` (`vrf_timeout`), stakes to Owed; a late VRF callback is ignored on-chain |

Every step is idempotent: the contract state decides whether a step is already done (then nothing is sent), and
frozen data (salts, commitments, payout leaves) is written once — `entry_commitments` and `round_payouts` are
append-only (database triggers). The canonical entry order is `seq` (index = seq − 1); the salted commitment is
`keccak256(abi.encode(keccak256(utf8(publicId)), salt))`, so the public manifest does not reveal who holds an entry.

**Signer (`ChainSignerService`).** Keys come from env (`POOL_OPERATOR_PRIVATE_KEY`, optional
`POOL_SETTLER_PRIVATE_KEY` / `POOL_KEEPER_PRIVATE_KEY`, `WITHDRAWAL_SIGNER_PRIVATE_KEY`; throwaway testnet keys only —
production keys belong in a KMS/HSM). Before the first signature it checks `eth_chainId == EVM_CHAIN_ID` (421614 or
31337 only; 31337 refused in production). `send()` simulates (decoded custom-error revert → nothing stored), estimates
gas (+20 %) and fees, then in one DB transaction locks the signer's `chain_signer_nonces` row, takes
`max(stored next nonce, pending nonce)`, signs, stores the raw tx in `chain_transactions` (unique per chain + signer +
nonce) and bumps the nonce; it broadcasts after commit. `track()` resolves `mined` / `reverted` with the required
confirmations, `dropped` when the nonce was consumed by another transaction, and re-broadcasts the same raw bytes after
`CHAIN_REBROADCAST_SECONDS`. A crash can therefore neither lose a transaction nor send a different one.

| Variable                                                      | Default                       | Purpose                                                |
| ------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `EVM_CHAIN_ID`                                                | 421614                        | 421614 Arbitrum Sepolia · 31337 Anvil (dev / e2e only) |
| `POOL_ONCHAIN_MIRROR` / `POOL_CONTRACT_START_BLOCK`           | false / —                     | round mirroring · first block for event scans          |
| `CHAIN_WRITE_CONFIRMATIONS` / `CHAIN_TX_WAIT_SECONDS`         | 2 / 60                        | confirmations before the next step · wait per call     |
| `CHAIN_REBROADCAST_SECONDS`                                   | 120                           | re-send an unmined transaction (same hash)             |
| `VRF_FULFILLMENT_CONFIRMATIONS`                               | 20                            | confirmations of `DrawFulfilled` before settlement     |
| `ENTRY_SALT_ENCRYPTION_KEY`                                   | HKDF of `TOTP_ENCRYPTION_KEY` | salt encryption key (base64, 32 bytes)                 |
| `WITHDRAWAL_BROADCASTER_ENABLED` / `WITHDRAWAL_CONFIRMATIONS` | false / 20                    | broadcaster on · confirmations before settlement       |
| `WITHDRAWAL_TRACK_POLL_SECONDS`                               | 15                            | tracker job interval                                   |

**Tests** (`test/chain.e2e-spec.ts`, skipped when `anvil` is missing): a fresh Anvil per run, VRF mock +
`GlobalPoolRounds` + `MockUSDT` deployed from `@gp/contracts/artifacts/local-devnet.json` with keys generated at
runtime. They prove the full lifecycle (DB winners == contract winners, prizes == `prizeAmounts`, every payout passes
`verifyPayout`, the owner's receipts pass `verifyEntry`), the on-chain cancel for missed thresholds, the withdrawal
broadcaster (confirmation, consecutive nonces under concurrency, simulation revert, on-chain revert → funds back) and
the deposit watcher (credit once, re-org out → reversed, re-inclusion in another block → credited once).

### Email

Notifications of email-worthy types (`EMAIL_NOTIFICATION_CATEGORY` in `src/modules/email/email.service.ts`: deposits
credited / reversed, withdrawal updates, prizes, cancelled rounds, security, KYC, restrictions) are queued on the
BullMQ `emails` queue (job id = notification id, delayed so the business transaction has committed) and sent by the
worker. `MAIL_TRANSPORT=log` (dev: redacted log line + in-memory outbox), `smtp` (`SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`; STARTTLS required on 587) or `disabled`. Every email shows the DEMO
notice and the player's anti-phishing code (or how to set one), never contains codes or keys, and links to the
notification preferences. Preferences come from `user_profiles.preferences.notifications` (A9); locked security
categories always send.

### Admin

`POST /admin/auth/login {email, password, totpCode}` checks the argon2id password and the mandatory TOTP in one step
(one generic error message — also when the admin's TOTP factor is locked) and locks the account for
`ADMIN_LOCKOUT_MINUTES` (15) after `ADMIN_LOGIN_MAX_ATTEMPTS` (5) failures. Attempts are counted under a row lock before
anything is checked (parallel guesses each count; a lock can never be cleared by a stale request), and an email with
no active admin gets the same 401 / 403 sequence (counted per email hash in Redis by one atomic Lua step, so parallel
guesses match the row-locked admin path; the counter has a sliding 30-day expiry), so responses never reveal which
emails exist. It returns an access JWT (`ADMIN_ACCESS_TTL`) and an opaque refresh token; refreshing rotates the token,
and reusing a rotated token revokes the whole family. **Idle timeout server-side:** a session with no admin request
for `ADMIN_IDLE_TIMEOUT` (15 min) is revoked on its next refresh or request (`401`, `details.reason = idle_timeout`).
The `admin.login` audit row stores a hashed `sessionRef`, never the family id. RBAC comes from `admin_roles` → `admin_permissions`
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
`game_sessions`, `game_results`, `demo_credit_accounts`, `demo_credit_entries`, `crash_chains`, `crash_rounds`, `crash_bets`, `referrals`, `affiliates`, `vip_levels`, `notifications`, `admin_users`,
`admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_user_roles`, `admin_approvals`, `audit_logs`,
`idempotency_keys`, `feature_flags`, `chain_cursors`, and for on-chain operations `chain_signer_nonces`,
`chain_transactions` (signed-tx outbox), `round_chain_ops`, `entry_commitments` (append-only) and `round_payouts`
(append-only). `deposits` carry `block_hash` / `reorg_seen_at_block`; `rounds` carry `chain_mirror`, `chain_id`,
`contract_address`, `rules_hash`, `payouts_merkle_root`, `onchain_status`.

## DEMO seed

`pnpm --filter @gp/api db:seed` runs only with `DEMO_MODE=true` and refuses `REAL_MONEY_ENABLED=true`. It loads the
`@gp/shared` DEMO data with its deterministic `de0000…` ids:

- **@nova.k** (GP-48213, KYC L2, VIP Gold III, 2FA on, anti-phishing AURORA-27, wallets, devices, RG limits) with
  **balances posted as balanced ledger postings**: Available 9,215.30 · Locked 1,850.00 · Pending 1,000.00 ·
  Owed 415.20 = **12,480.50** (WD-20850 / 20877 / 20931, DP-77380 / 77412, round #1,245 refund, VIP reward, plus one
  aggregated "DEMO history" opening posting).
- **Round #1,248** with 3,412 participants, 18,640 entries, pool 186,400.00 and fees 932.00 (DEMO crowd players;
  @nova.k holds E-1248-00981 … E-1248-01015): `open` when seeded during its 08:00–20:00 UTC window; seeded between
  rounds it is the round that closed at the last 20:00 (`closed`, awaiting its draw) and an empty #1,249 is
  `scheduled` for the next 08:00. No seeded purchase lies in the future. History #1,244–#1,247 is seeded as snapshots:
  settled rounds carry all 13 prizes of the split (Σ = pool; 1st prize and @nova.k's #1,244 runner-up from demo-data,
  the other handles fictional) and a DEMO participant count derived at #1,248's entries-per-participant ratio. They
  have no entry list or VRF word, so they cannot be re-verified — draw #1,248 with the `/dev/pool/rounds` helper for a
  fully verifiable settled round.
- **RBAC + 6 DEMO admins:** S. Iyer (Super Admin), A. Marin (Finance Lead), K. Osei (Compliance Officer), R. Duarte
  (Support L2), L. Moreau (Marketing Lead), E. Lindqvist (read-only auditor).
- Games, VIP levels, geo rules, feature flags, affiliates, notifications.

DEMO dates are shifted by whole days onto the latest daily window that has already opened (`DEMO_SEED_SHIFT_DAYS=0` keeps the
exact snapshot). The seed checks the 12,480.50 total and the ledger reconciliation before it finishes.

## Admin back-office: Finance · Global Pool · Compliance (`admin-ops`, admin-b)

Module `src/modules/admin-ops` (controllers `admin/finance`, `admin/pool`, `admin/compliance`; contracts in
`@gp/shared/schemas` → `admin-ops.ts`). Read endpoints are aggregates of the append-only ledger and its sub-ledgers;
writes are reviewed, audited workflow actions only. There is still no endpoint that sets results, picks winners, moves
funds, edits ledger rows or adjusts balances (`PATCH /admin/finance/ledger/:id`, `POST /admin/pool/rounds/:n/winners`,
`POST /admin/finance/refunds/:n/manual` → 404, covered by `test/admin-ops.e2e-spec.ts`).

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/admin/finance/deposits` | deposits.read | Deposits (status/network/search), KPIs, network watchers, held deposits |
| GET | `/admin/finance/withdrawals` | withdrawals.read | Queue views (queue / awaiting 2nd / broadcasting / completed / rejected), SLA 4 h, four-eyes progress, SLA watch |
| GET | `/admin/finance/withdrawals/{id}` | withdrawals.read | Review detail: player, ledger balances, destination history, AML, approvals, postings, audit. Decisions stay on `POST /admin/withdrawals/{id}/approve|reject` |
| GET | `/admin/finance/fees` | ledger.read | Platform fees (0.05 × qualifying entries) from `fee_ledger`: 30-day series, by round, sub-ledger = fees account |
| GET | `/admin/finance/pool-accounting` | ledger.read | Liabilities = open-round escrow + owed prizes + refunds outstanding; account balances; round waterfall |
| GET | `/admin/finance/ledger` | ledger.read | Journals with balanced lines + per-journal chain hash (`prev → hash`, recomputed on read) |
| GET | `/admin/finance/ledger/integrity` | ledger.read | Append-only / no-truncate / balanced-posting triggers present on their table AND enabled (`tgenabled` O/A; incl. `entry_commitments`, `round_payouts`), Σ ledger = 0, unbalanced postings, journal digest, audit hash-chain verification |
| GET | `/admin/finance/reconciliation` | reconciliation.read | Scopes match / mismatch / pending (ledger total, fee/pool sub-ledgers, owed, locked, round pools, custody, in-flight deposits) |
| GET | `/admin/finance/refunds` | ledger.read | Cancelled rounds: refunded to Owed, claimed, outstanding (+ withdrawal releases, which are not refunds) |
| POST | `/admin/finance/refunds/{number}/remind` | notifications.send | In-app reminder to players with an unclaimed refund (reason; audited; max 1 per round per 24 h; never moves money) |
| GET | `/admin/finance/reports?days=` | ledger.read | Revenue: platform fees − rewards funded = net; network fees recovered shown but excluded |
| POST | `/admin/finance/exports` | reports.export (+ users.pii.read for personal data) | CSV export (reason required; personal data masked by default; 500,000-row limit; SHA-256; watermark line; audit `report.exported`) |
| GET | `/admin/pool/overview` · `/balance` · `/active-round` · `/rounds` · `/vrf` | rounds.read | Monitoring (current round, KPIs, pipeline health, ledger vs projection, feed, concentration, history, VRF requests) |
| GET | `/admin/pool/rounds/{number}/participants` · `/prizes` | rounds.read | Participants grouped by player; prize split, winners, settlement + claim status |
| GET | `/admin/pool/circuit-breaker` | rounds.read | NEW-entries breaker state, pending request, history, rules |
| POST | `/admin/pool/circuit-breaker` | role Super Admin / Finance / Compliance | Request pause / resume of NEW entries (reason + fresh 2FA) — nothing changes yet |
| POST | `/admin/pool/circuit-breaker/{id}/decision` | role Super Admin / Finance / Compliance | Second approval or decline: a different person with a different role, reason + 2FA, within 30 min (re-checked inside the decision transaction); flips `pool.entries.enabled`; audited. A lapsed request is expired only while still pending, with an `approval.expired` audit row |
| GET | `/admin/compliance/kyc` · `/kyc/{id}` | kyc.read | KYC queue (SLA 48 h, decisions today, median time to decision, recent decisions) and review detail (PII masked) |
| POST | `/admin/compliance/kyc/{id}/decision` | kyc.review | approve / reject / request_info with reason + fresh 2FA (stricter than the REASON policy); approve raises the KYC level (limits only); player notified; audited |
| GET | `/admin/compliance/aml` | aml.read | AML alerts with risk summary and the linked withdrawal / deposit. Resolution: `POST /admin/aml/alerts/{id}/resolve` |

Business decisions (admin-b): the circuit breaker is the only pool control and is role-based dual control (requester
and approver must be different people holding different roles among Super Admin / Finance / Compliance, 30-minute
expiry); platform fees of cancelled rounds stay in the fees account (stakes are refunded in full) — the Figma copy
"fee released" was not implemented because the ledger posting rules do not refund fees. DEMO compliance cases for QA:
`pnpm --filter @gp/api exec tsx prisma/seed-admin-ops.ts` (idempotent, non-ledger rows only).
