# GLOBAL POOL — Project status

_Last updated: 28 Nov 2026, 08:10 UTC · branch `claude/keen-wozniak-q8eb3p` · Figma: https://www.figma.com/design/QHF8iRUMFgGMcEn3bD25jl_

Legend: ✅ done & verified · 🟡 in progress · 🟠 built, not fully verified · ⛔ blocked · ❓ waiting for owner decision · ⬜ not started

## 1. Audit (28 Nov 2026)
| Area | Finding |
|---|---|
| Repository | Root = unrelated Vite/React landing "Tokenuj Metin2" (left untouched). GLOBAL POOL had **no code** before today: only the Figma file, the build kit `design/figma-build/` and `GLOBAL_POOL_FIGMA_MASTER_PROMPT.md`. |
| New code location | `global-pool/` pnpm monorepo (apps/web, apps/api, packages/shared, packages/tokens, packages/contracts). Reversible decision — can be moved to its own repo. |
| Backend / DB / auth / API / blockchain | None existed → being built now (see §3). |
| Dev environment | Node 22, pnpm 10, Postgres 16 + Redis 7 run locally via `global-pool/scripts/dev-services.sh` (no Docker daemon needed), Docker Compose file provided for other machines; Foundry installable (GitHub reachable). |
| Figma | 13 pages, design system (281+ variables, 24 text styles, effects, gradients), ~70 component sets, casino kit, catalogue (33 games), promotions. Visual direction changed by owner to BC.GAME-style charcoal + mint + gold (decisions #18–24 in `design/figma-build/decisions.md`). |
| Figma throughput | **Blocker-ish:** Figma MCP tool-call limit on the Pro/Full seat (≈200/day + per-minute cap) throttles design work since 27 Nov 22:50 UTC; ~1 call/min effective. Agents saved ready-to-run scripts in `design/figma-build/pending/` and `queue/`. |

## 2. Figma progress (details: `FIGMA_PROGRESS.md`, ledger `design/figma-build/ledger.json`)
Ledger (306 rows incl. 12 added for catalogue/promotions): **178 verified · 44 built · 14 in progress · 70 not started** (28 Nov 04:05 UTC). P0: 98 verified / 11 built / 4 in progress / 13 not started. Figma quota reset confirmed 28 Nov 08:05 UTC; continuation wave running (P0 first: cont:adm-core, auth-b, gp-hub, usr-gaming, g-dice, pub-pool-lobby, pub-gates-pf, wal-deposit, then proto-a/b and err-a/b).

### Screens ready for coding (verified/built in Figma)
- **01/02 Design system & components:** DS-01…09, CMP-01…18, casino kit (shell, lobby, catalogue, promotions)
- **03 Public website:** PUB-01 Home (all states, 1440/1280/768/390) ✅, PUB-02 Global Pool public 🟠, PUB-03 Games lobby 🟠, PUB-07 Provably Fair 🟠, PUB-21 Geo-block ✅, PUB-22 Age gate ✅
- **04 Authentication:** AUTH-01 Register ✅, AUTH-02 Wallet-first ✅, AUTH-03 Login ✅, AUTH-04 Email verification ✅, AUTH-05/06 password reset ✅ (not used for players under Privy), AUTH-18 Restricted account ✅, AUTH-19 Recovery ✅, AUTH-20 Session expired ✅, AUTH-21 New-device alert ✅, KYC AUTH-11…17 ✅, 2FA AUTH-07 ✅, AUTH-08 🟠, Connect wallet AUTH-09 🟠, Wallet verification AUTH-10 ✅
- **05 User dashboard:** USR-00 Shell ✅, USR-01 Overview ✅, USR-02 Notifications ✅, Account & security USR-A1…A10 ✅, Financial history USR-F1…F6 ✅, Responsible gaming USR-RG1…RG7 ✅, Gaming USR-G1…G7 🟠
- **06 Wallet:** WAL-01/02/20–24 overview, wallets, history, detail, whitelist, banners ✅; Deposit WAL-03…09 ✅; Withdraw WAL-10…19 (all 9 steps) ✅; mobile MOB-05/06/07 ✅
- **07 Global Pool:** GP-01 Hub ✅, GP-02 Participation preview ✅, GP-03 Pending ✅, GP-04 Success 🟠, GP-05 Drawing (VRF) ✅, GP-06/07 Results ✅, GP-12 PF verification ✅, MOB-04 ✅
- **09 Admin:** ADM-U1…U10 ✅, ADM-F1, F3…F9 ✅, ADM-P4…P6 🟠
- **10 Mobile:** MOB-03 ✅, MOB-05 ✅, MOB-04 🟠, MOB-06 🟠

## 3. Development status
Verified by the orchestrator on 28 Nov 2026 ~03:40 UTC: `pnpm -r typecheck`, `pnpm -r lint` and `pnpm -r build` are green. **304 tests pass:** tokens 82, shared 56, contracts 67, web 35, API 34 unit + 30 e2e.

| Workstream | Status | Notes |
|---|---|---|
| Monorepo + tooling | ✅ | pnpm workspace, strict TS, ESLint flat config, Prettier, CI `.github/workflows/global-pool-ci.yml`, docker-compose (not built here: no Docker daemon), `.env.example` |
| `@gp/tokens` | ✅ | tokens.json → CSS variables, Tailwind v4 `@theme`, text styles (82 tests) |
| `@gp/shared` | ✅ | decimal money, fees, pool maths and odds, chains (Arbitrum Sepolia enabled), enums, Zod schemas, DEMO data (56 tests) |
| Contracts | ✅ testnet-ready, unaudited | GlobalPoolRounds plus VRF v2.5; 67 tests; not deployed |
| API core | ✅ foundation | NestJS 11, 46 tables, append-only ledger enforced by DB triggers, Privy auth with DEV MOCK, admin auth with TOTP, wallet/deposits/withdrawals, pool/rounds/entries (idempotent), VRF-matching winner derivation, admin RBAC + four-eyes + hash-chained audit, WebSocket /pool, BullMQ, Swagger (83 operations). Gaps: on-chain mirroring writes, withdrawal broadcaster, real Privy, deposit watcher against a real RPC |
| Web foundation | ✅ | Next 15, Tailwind v4, shadcn restyled, casino shell, design system with a /design-system page, Privy provider and DEV MOCK, shared API client `src/lib/api/client.ts` |
| Homepage PUB-01 | ✅ implemented | H1–H12, 4 states, mobile; close to the Figma render; countdowns use the real clock (fixed by the pool agent) |
| Wallet (P0) | ✅ implemented (dev-verified by agent) | 21/27 rows IMPLEMENTED, 6 PARTIAL (WAL-02 set-primary/unlink missing, WAL-05/09/16/17/24 details in `global-pool/docs/reports-p0-wallet-pool.json`). Routes /wallet, /deposit, /withdraw (+ tracker), /history (+ detail drawer), /connected, /whitelist; mobile bottom sheets MOB-05/06/07. New API: /wallet/status, /withdrawals/precheck, /withdrawals/ref/:ref, /deposits/ref/:ref, DEMO progressive deposit sim. Playwright e2e deposit→credited, withdraw→review→cancel passes |
| Global Pool (P0) | ✅ implemented (dev-verified by agent) | 13/16 rows IMPLEMENTED, 3 PARTIAL (GP-06, GP-13, PUB-07: one state each not screenshot-checked). Hub + live socket feed, participation (separate 0.05 fee line, odds rounded down, RG check, unchecked consent, idempotent), round page draw→results→refunds, in-browser VRF re-derivation (4/4 checks), history/entries/prizes, /provably-fair. Homepage countdown now uses the real clock ✅ |
| Responsible gaming + history (P0) | ✅ implemented (dev-verified by agent) | 20/21 rows IMPLEMENTED (USR-RG1–RG6, F1–F6, G1–G7, MOB-10); USR-RG7 PARTIAL (authenticator code instead of a password under Privy; open entries stay in their round — owner question). Server-side: limits with 24 h cool-down on increases, daily/session time limits, quiet hours (UTC), reality checks app-wide, cooling-off, self-exclusion (blocks entries + deposits, never withdrawals; can be extended, never shortened). History API `/history/*` + CSV export (formula-injection safe, audited) |
| On-chain + chain ops (P0) | ✅ on Anvil, ⛔ not on Arbitrum Sepolia | GlobalPoolRounds mirroring via viem (open → commit Merkle root of salted entries → requestDraw → VRF watcher → DB winners must equal contract winners → recordSettlement), reorg-safe deposit watcher, outbox withdrawal broadcaster with DB nonces and refunds on failure, email adapter, socket.io Redis adapter, OpenAPI response schemas, compose `--profile dev`. Not deployed: no Sepolia contract, VRF subscription or funded testnet keys yet |
| Admin console (P0) | ✅ implemented (dev-verified by agent) | admin-a: 16/18 rows IMPLEMENTED (ADM-00, 02, U1–U10 except U3, S1–S3, X1, MOB-11); PARTIAL ADM-01 (no WebAuthn / trusted device / IP allow-list), ADM-U3. Own admin session, restrictions with reason + 2FA + four-eyes (frozen withdrawals and suspension need a second admin), PII reveal audited, role changes as requests, audit-chain viewer. admin-b: 18/21 IMPLEMENTED (F1–F5, F7, F9, P1–P7, P9, P10, C1, C2); PARTIAL F6 (reconciliation investigation), F8 (scheduled reports), P8 (batch auto-claim). Circuit breaker pauses only NEW entries, dual approval. e2e: two-admin four-eyes flow passes; PATCH ledger / POST winners / manual refund return 404 (tested) |
| Auth (P0) | ✅ implemented (dev-verified by agent) | 7 IMPLEMENTED (AUTH-04, 07, 09, 10, 20, 21 + flows), 5 PARTIAL by design under Privy (AUTH-01/02/03 no passwords — register fields moved to /onboarding; AUTH-08 login variant n/a; AUTH-18 uses the normal shell); AUTH-05/06 n/a. One custom Privy dialog (email code, Google/Apple, SIWE wallet; WalletConnect etc. via Privy's themed modal), DEV MOCK offline, onboarding with unchecked consents + DOB 18+, TOTP enrol + backup codes, reusable `useStepUp()`, restricted pages, 30-min idle sign-out (assumed from Figma #29), new-device alerts. e2e 3/3 |
| Account (P0) | ✅ implemented (dev-verified by agent) | 21/21 rows IMPLEMENTED (USR-00/01/02, A1–A10, AUTH-11…17 KYC flow with mock provider, MOB-09). New API /me/* + /kyc/application. e2e: new player → KYC L1 → L2 with reject/resubmit → approve |
| P0 review (independent) | ✅ done → 🟡 fixing | Workflow `p0-review`: 7 reviewers + skeptics (105 agents). **60 confirmed findings → 52 deduplicated** (7 high, 33 medium, 12 low); 4 refuted. Highest: withdrawal tracker could mark a just-mined transfer as dropped and refund it (double payment); concurrent withdrawals could exceed the KYC daily limit; on-chain deposits skipped RG/self-exclusion/deposits_blocked checks; production boot accepted the `.env.example` placeholder secrets; self-exclusion ended automatically contrary to the UI promise; rounds could hang in `closed` with chainlink + no mirror; core CTAs linked to 404 routes. Full list: `global-pool/docs/review-p0.json`, items: `global-pool/docs/closeout-items-review.json`. Fixing in workflow `p0-closeout` (api-a, api-b, web fixers → compliance gates + state audit → full verify + one skeptic per fix) |
| **P0 total** | ✅ all 8 modules built | Integration check by the orchestrator (28 Nov 05:50 UTC): `pnpm -r typecheck` ✅, `pnpm -r lint` ✅, `pnpm -r test` ✅ **463 tests** (contracts 67, shared 60, tokens 82, API 59 unit + 100 e2e, web 95), `pnpm -r build` ✅ (Next production build of all routes, 2 min 22 s); independent review workflow `p0-review` and integration QA workflow `p0-integration-qa` (route crawl per role + 6 cross-module journeys) running |
| Games (P1) | 🟡 engine ✅, UI in progress | Engine done (agent-verified): `@gp/shared/fair` (HMAC commit–reveal byte stream, 11 rule modules, test vectors, exact RTP proofs + fixed-seed Monte-Carlo; 137 shared tests), DEMO credits (no cash value, never linked to the USDT ledger; REAL_MONEY guard), instant games, Twenty-One, Vault Sweeper, High Card, Orbit Rush hash-chain rounds over socket.io `/crash` with server-side auto cash-out, RG checks on every bet, admin read-only monitoring; API 64 unit + 117 e2e. Kit done (agent-verified): game shell, lobby + catalogue PUB-03/GM-02, details PUB-04, Pool Dice DI-01…07 (DI-03/05, GM-01 partial); 118 web tests; e2e incl. same-key retry → exactly one bet, USDT wallet unchanged, 403 for a USDT bet. Now running: Double Side, Pool Roulette, Orbit Rush, Twenty-One. Design/rule questions: Pool Dice 1.9603× (truncated) vs Figma 1.9604×, dice win-chance range 0.01–98% vs PUB-04 copy 1–98%, Twenty-One min bet 1.00 vs 0.10, Pinfall 16·Medium table RTP 99.016% |

## 4. Decisions
Answered 28 Nov 2026 (details in `global-pool/docs/DEV_CONVENTIONS.md` → Owner decisions):
1. ✅ Custody = **hybrid**: platform balances on a double-entry ledger, with pool rounds committed and drawn on-chain (VRF), so results are verifiable.
2. ✅ MVP chain = **Arbitrum Sepolia**. The other 4 networks are configured as "coming soon".
3. ✅ Player auth = **Privy** (email OTP, social, wallets/embedded). Admins use their own auth with mandatory TOTP. Players have no passwords; step-up TOTP protects withdrawals. ⚠ This changes Figma AUTH-01/03 (email+password) to a code-based flow — the screens need a design update.
4. ✅ Code in `global-pool/` in this repo.

Asked 28 Nov 05:45 UTC (current behaviour in brackets): (a) self-exclusion/cooling-off with open entries — refund or keep in the round? [kept in the round; Figma says refunded]; (b) cancelled round — refund the 0.05 platform fee? [not refunded; Figma F3/F5 show a fee reversal]; (c) games currency — DEMO credits without cash value vs USDT in Figma [DEMO credits]. Lower priority (agent assumptions to confirm later): AML risk score model (rule-based placeholder), which restrictions need four-eyes (now: frozen withdrawals + suspension), who may send refund reminders (now: Super Admin + Marketing).

Still open (not blocking yet): KYC provider, AML/chain-analytics provider, e-mail provider, hosting, licensed jurisdictions/restricted-country list, Privy app credentials (dev runs on a mock until provided).

## 5. Guardrails (always on)
DEMO/testnet only (`REAL_MONEY_ENABLED=false`), decimal-safe money, 0.05 USDT platform fee shown separately from network fee, append-only double-entry ledger, VRF/commit-reveal fairness, no admin result/winner/fund manipulation, RBAC + reason + MFA + four-eyes + hash-chained audit log, RG limits + self-exclusion server-side, no dark patterns / VPN hints.

## 6. Blockers
- Figma MCP call limit (design throughput). Mitigation: prepared scripts, low concurrency, prioritise P0.
- Container restarts kill background jobs (happened 28 Nov ~00:50 UTC) → everything is committed often; services restart with `global-pool/scripts/dev-services.sh start`.

## 7. Next tasks
See `NEXT_TASKS.md`.
