# GLOBAL POOL — Development conventions (brief for every coding agent)

Repository: `/home/user/Claude` (branch `claude/keen-wozniak-q8eb3p`). The platform lives in **`/home/user/Claude/global-pool/`** (pnpm workspace). The repo root contains an unrelated Vite landing page ("Tokenuj Metin2") — never modify it.

## Product guardrails (non-negotiable)
- **DEMO / testnet only.** A server-side feature flag `REAL_MONEY_ENABLED=false` (default) blocks any real-money path; mainnet RPCs/contract addresses are not configured. All seeded/mock data is DEMO and the UI shows the DEMO badge / DEMO bar exactly like Figma.
- Money is **never** a JS float: use `decimal.js` (shared helpers in `@gp/shared/money`) and Prisma `Decimal` (`@db.Decimal(38, 18)` for on-chain amounts, `@db.Decimal(20, 6)` for USDT ledger amounts). Format with `formatUSDT()` → `1,234.56 USDT`.
- **Fees:** platform fee **0.05 USDT per qualifying entry** is always its own line item, separate from the network fee. Entry price 10.00 USDT. Pool balance = Σ entry amounts; platform fees go to `fee_ledger`, never to the pool.
- **Balances:** Available / Locked / Pending / Owed are computed from an append-only double-entry ledger (never edited in place). The backend is NOT the authority for on-chain balances — chain state is read from RPC/indexer and reconciled.
- **Fairness / admin:** outcomes come only from verifiable randomness (Chainlink VRF v2.5 for the pool; commit–reveal seeds for games). No code path may let an admin edit results, choose winners, pay out arbitrarily, edit ledger rows or silently adjust balances. Sensitive admin actions require RBAC permission + reason + MFA re-auth (+ four-eyes approval where flagged) and always write an `audit_logs` row (hash-chained).
- **Compliance:** geo-restriction (configurable country list), age 18+, KYC levels, responsible-gaming limits (deposit/participation/loss/time, cool-down on increases, self-exclusion) enforced server-side. Consent checkboxes never pre-checked. No dark patterns: no fake timers, no fabricated wins presented as real, no VPN/geo-bypass hints, no hidden fees/odds, no obstruction of withdrawals or self-exclusion. Games run as non-monetary simulations until separately approved.
- Never commit secrets; use `.env.example`. Never use real/production wallets or keys; tests use Anvil/testnets and throwaway keys generated at runtime.


## Owner decisions (28 Nov 2026, answered in chat)
1. **Custody = hybrid.** Player funds live in platform balances: an append-only double-entry ledger with Available / Locked / Pending / Owed buckets. Deposits go to per-user deposit addresses, are detected by a chain watcher and credited after N confirmations. Withdrawals are queued with risk/AML checks, step-up 2FA and four-eyes approval for flagged cases. **Global Pool rounds are mirrored and drawn on-chain:** the pool contract records round commitments, requests Chainlink VRF v2.5, and settlement is verifiable. Entries are paid from the platform balance (network fee 0.00 for entries).
2. **MVP chain = Arbitrum Sepolia (chainId 421614)** for the pool contract, VRF and USDT deposits/withdrawals (test USDT). BNB Chain, Polygon, Ethereum and Solana stay in config as "coming soon" (disabled flags).
3. **Player auth = Privy.** Frontend: `@privy-io/react-auth` with email OTP, social logins and wallet login (incl. WalletConnect and embedded wallets); custom-styled to the GLOBAL POOL look. Backend: verify the Privy access token (ES256) with `@privy-io/server-auth` (env PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_VERIFICATION_KEY); upsert the user by Privy DID (`privy_user_id` unique); sync linked email and wallets. First login runs an onboarding step that captures consents (18+, permitted jurisdiction, terms/privacy — never pre-checked; marketing opt-in separate) and country before any gaming or financial action. **No passwords for players.** Step-up 2FA (own TOTP + anti-phishing code) protects withdrawals, whitelist changes and security settings. **DEV MOCK:** when PRIVY_APP_ID is unset or PRIVY_MOCK=true, the web uses a mock auth provider and the API accepts locally signed dev tokens, so dev and e2e tests run offline. **Admins do NOT use Privy:** separate admin auth with email + password (argon2id) + mandatory TOTP.
   Figma impact: AUTH-01/03 show email+password. Implement the Privy flow in the same visual language: the email step then a 6-digit code (≈ AUTH-04), social/wallet options (≈ AUTH-02/09), and the onboarding consents from AUTH-01. Note deviations in your report.
4. **Code location = `global-pool/` in this repo** (confirmed).

## Stack & layout
```
global-pool/
  apps/web        Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react + TanStack Query + React Hook Form + Zod
  apps/api        NestJS 11 + Prisma 6 + PostgreSQL 16 + Redis 7 + BullMQ + REST (+ WebSocket gateway for live pool/rounds) + Swagger (OpenAPI) + pino logging
  packages/shared @gp/shared — zod schemas/DTO contracts shared by web & api, money/fee helpers (decimal.js), constants (chains, limits), typed DEMO data
  packages/tokens @gp/tokens — tokens.json (mirror of Figma variables) → generated CSS variables + Tailwind v4 @theme + TS export
  packages/contracts  Foundry (Solidity 0.8.x, OpenZeppelin, Chainlink VRF v2.5) — after the custody decision
  scripts/dev-services.sh  starts local Postgres (postgresql://postgres@127.0.0.1:5432/globalpool, test DB globalpool_test) + Redis (redis://127.0.0.1:6379)
  docs/           conventions, architecture, ADRs
```
- Package manager: **pnpm** (workspace). To avoid concurrent installs corrupting the lockfile, ALWAYS wrap installs: `flock /tmp/gp-pnpm.lock pnpm --filter <pkg> add <deps>` (or `flock /tmp/gp-pnpm.lock pnpm install`). Prefer the libraries listed above; do not add alternatives for the same job.
- TypeScript strict everywhere. ESLint + Prettier. Each package has scripts: `dev`, `build`, `typecheck`, `lint`, `test`.
- If services are down (e.g. after a container restart): `bash /home/user/Claude/global-pool/scripts/dev-services.sh start`.

## Design source of truth (Figma)
- File: https://www.figma.com/design/QHF8iRUMFgGMcEn3bD25jl — tokens are mirrored in `packages/tokens/tokens.json` (do not invent colours; use semantic tokens: bg/base #232626, bg/secondary #1E2121, surface/default #2B2F30, surface/raised #323738, border/default #3A4142, brand mint #2CD97D with DARK text on it, jackpot gold #F4C96C, text/primary #F5F6F6, text/secondary #B3BEC1, text/tertiary #98A1A3).
- Layout architecture = BC.GAME-style casino shell: left sidebar 240 (collapsed 72) + top bar 64 + content (1440 − 240 = 1200, padding 32) + mega footer; mobile 390 = top app bar + bottom tab bar (Lobby, Pool, Games, Wallet, Account), bottom sheets.
- Reference renders: `/home/user/Claude/design/reference/` (homepage full 1440 render + parts, logo, banners, pool visual). Figma build notes per screen (exact copy, data, states, component names) are in `/home/user/Claude/design/figma-build/results/*.json` (search by ledger ID, e.g. "WAL-05") and component descriptions in `/home/user/Claude/design/figma-build/registry*.json`. Product rules + demo numbers: `/home/user/Claude/design/figma-build/demo-data.md`, `decisions.md`, master brief `/home/user/Claude/GLOBAL_POOL_FIGMA_MASTER_PROMPT.md`.
- **Figma MCP is heavily rate-limited (shared Pro seat, ~200 calls/day + per-minute cap, design agents also use it).** Coding agents must NOT call Figma tools unless the orchestrator explicitly allows it; use the references above.
- BANNED visual look (user feedback): no concentric orbit rings, radial glow blobs as backgrounds, floating particles/sparkles, centred logo-in-halo heroes. Use concrete objects (coins, tickets, chips, cards), real UI previews, angled colour blocks.
- Logo: mint gamepad with a fiat "$" centre + "GLOBAL POOL" wordmark (Inter ExtraBold; GLOBAL white, POOL mint) with a small flowing gold "$" above every letter (see `design/reference/brand_logo.png`). Implement as an inline SVG React component.
- Game names (original catalogue): Global Pool, Orbit Rush (crash), Pool Dice, Double Side (coinflip), Pool Roulette, Twenty-One (blackjack), Vault Sweeper (mines), Skyline (limbo), Pinfall (plinko), Fortune Ring (wheel), High Card (hi-lo), Ascend (tower), Pool Keno, Baccarat Lounge, Sic Bo Triad, Dragon & Phoenix, GP Studios slots (Neon Koi, Atlas Vault, …), illustrated live tables, draws, bingo.

## Quality bar & verification (mandatory)
- Every batch: `pnpm --filter <pkg> typecheck && lint && test && build` must pass before you report. Report the exact commands and results; never claim untested work works.
- Web screens: compare against the reference render with Playwright (`require('playwright')` works globally; chromium preinstalled — do not run `playwright install`). Take a 1440 and a 390 screenshot, inspect them, fix differences. Save comparison screenshots under `global-pool/apps/web/test-results/visual/` (git-ignored) and describe the remaining diffs honestly.
- API: unit tests for money/fee/ledger logic, e2e tests (supertest) against `globalpool_test`. Financial writes run in DB transactions with idempotency keys.
- Do NOT `git commit` — the orchestrator commits. Do not edit files outside your assigned directories except where your task says so; if you need a shared change (e.g. @gp/shared), make it additive and mention it.

## Report (final answer)
Return: what you built (files/dirs), commands run with pass/fail, what is verified vs not, known gaps, decisions you made (flag any business decision you had to assume), and the next tasks.
