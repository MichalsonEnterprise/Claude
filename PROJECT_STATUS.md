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
Ledger (306 rows incl. 12 added for catalogue/promotions): **75 verified · 11 built · 19 in progress · 201 not started** (as of 01:00 UTC; background continuation workflows running).

### Screens ready for coding (verified/built in Figma)
- **01/02 Design system & components:** DS-01…09, CMP-01…18, casino kit (shell, lobby, catalogue, promotions)
- **03 Public website:** PUB-01 Home (all states, 1440/1280/768/390) ✅, PUB-02 Global Pool public 🟠, PUB-03 Games lobby 🟠, PUB-07 Provably Fair 🟠, PUB-21 Geo-block ✅, PUB-22 Age gate ✅
- **04 Authentication:** AUTH-01 Register ✅, AUTH-02 Wallet-first ✅, AUTH-03 Login ✅, AUTH-04 Email verification ✅
- **05 User dashboard:** USR-00 Shell ✅, USR-01 Overview ✅, USR-02 Notifications ✅
- **06 Wallet:** WAL-01/02/20–24 overview, wallets, history, detail, whitelist, banners ✅; Deposit WAL-03…09 ✅; Withdraw WAL-15…19 ✅ (steps 1–5 WAL-10…14 still in Figma)
- **07 Global Pool:** GP-01 Hub 🟠, GP-02 Participation preview 🟠
- **09 Admin:** ADM-U1…U10 ✅, ADM-F1, F3…F9 ✅, ADM-P4…P6 🟠
- **10 Mobile:** MOB-03 ✅, MOB-05 ✅, MOB-04 🟠, MOB-06 🟠

## 3. Development status
| Workstream | Status | Notes |
|---|---|---|
| Monorepo + tooling (pnpm, TS, ESLint, CI, docker-compose, .env.example) | 🟡 | workflow `gp-dev-foundation` (agent dev:shared) |
| `@gp/tokens` (Figma tokens → CSS vars + Tailwind v4 theme) | 🟡 | `global-pool/packages/tokens/tokens.json` written from the Figma variables |
| `@gp/shared` (decimal money, fees, chains, zod schemas, DEMO data) | 🟡 | |
| Web: design system + casino shell | 🟡 | agent dev:web-design-system |
| Web: Homepage (PUB-01) | ⬜→🟡 | agent dev:web-homepage (after design system) |
| API: NestJS core, Prisma schema, auth, ledger, wallet, pool, admin, audit | 🟡 | agent dev:api-core |
| Smart contracts (Foundry, VRF v2.5) | ✅ (testnet-ready, unaudited) | `packages/contracts`: GlobalPoolRounds — verifiable round registry and VRF v2.5 consumer. It holds no funds, cannot re-roll, and admins have no say over results; coordinator locked. 67/67 tests incl. fuzz and invariants (re-run by the orchestrator). Deploy dry-run on an Arbitrum Sepolia fork OK, not broadcast. TODO: VRF subscription, Slither, external audit. |
| Auth, Dashboard, Wallet, Pool, Admin frontends | ⬜ | next batch after foundation |
| Games (5) as simulations | ⬜ | P1 |

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
