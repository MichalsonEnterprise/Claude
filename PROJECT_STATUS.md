# GLOBAL POOL — Project status

_Last updated: 28 Nov 2026, 01:40 UTC · branch `claude/keen-wozniak-q8eb3p` · Figma: https://www.figma.com/design/QHF8iRUMFgGMcEn3bD25jl_

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
Ledger (306 rows incl. 12 added for catalogue/promotions): **128 verified · 18 built · 10 in progress · 150 not started** (P0: 87 verified / 11 built / 19 left). Running: admin P0 + mobile patterns, the 5 games, and the P1 batch (pool history, promotions, catalogue, game details, public P1, admin games).

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
| Homepage PUB-01 | ✅ implemented | H1–H12, 4 states, mobile; close to the Figma render. TODO: countdown uses the frozen DEMO clock (fix assigned to the pool agent) |
| P0 batch (running) | 🟡 | workflow `dev-p0-batch` (script `global-pool/scripts/workflows/dev-p0-batch.js`), 8 agents: auth (Privy custom flow, onboarding, step-up 2FA), account (dashboard, account, KYC), rg-history (responsible gaming, history), wallet (deposit/withdraw/history), pool (hub, entry, draw, results, verification), admin-a (admin shell, users, audit, roles), admin-b (finance, pool monitoring, KYC/AML queues), api-gaps (on-chain mirroring + Anvil e2e, deposit watcher, broadcaster, RG time, email, Redis adapter) |
| Games (P1) | ⬜ | after P0 |

## 4. Decisions
Answered 28 Nov 2026 (details in `global-pool/docs/DEV_CONVENTIONS.md` → Owner decisions):
1. ✅ Custody = **hybrid**: platform balances on a double-entry ledger, with pool rounds committed and drawn on-chain (VRF), so results are verifiable.
2. ✅ MVP chain = **Arbitrum Sepolia**. The other 4 networks are configured as "coming soon".
3. ✅ Player auth = **Privy** (email OTP, social, wallets/embedded). Admins use their own auth with mandatory TOTP. Players have no passwords; step-up TOTP protects withdrawals. ⚠ This changes Figma AUTH-01/03 (email+password) to a code-based flow — the screens need a design update.
4. ✅ Code in `global-pool/` in this repo.

Still open (not blocking yet): KYC provider, AML/chain-analytics provider, e-mail provider, hosting, licensed jurisdictions/restricted-country list, Privy app credentials (dev runs on a mock until provided).

## 5. Guardrails (always on)
DEMO/testnet only (`REAL_MONEY_ENABLED=false`), decimal-safe money, 0.05 USDT platform fee shown separately from network fee, append-only double-entry ledger, VRF/commit-reveal fairness, no admin result/winner/fund manipulation, RBAC + reason + MFA + four-eyes + hash-chained audit log, RG limits + self-exclusion server-side, no dark patterns / VPN hints.

## 6. Blockers
- Figma MCP call limit (design throughput). Mitigation: prepared scripts, low concurrency, prioritise P0.
- Container restarts kill background jobs (happened 28 Nov ~00:50 UTC) → everything is committed often; services restart with `global-pool/scripts/dev-services.sh start`.

## 7. Next tasks
See `NEXT_TASKS.md`.
