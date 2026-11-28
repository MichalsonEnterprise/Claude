# GLOBAL POOL — Development roadmap

Code: `global-pool/` (pnpm monorepo). Conventions: `global-pool/docs/DEV_CONVENTIONS.md`. Guardrails: DEMO/testnet only, real money disabled.

## Phase 0 — Foundation (in progress)
Monorepo tooling, CI, docker-compose · `@gp/tokens` · `@gp/shared` (money/fees/chains/schemas/DEMO) · web design system + casino shell · API core (NestJS, Prisma schema, auth, ledger, wallet, pool, admin, audit, compliance stubs) · homepage.

## Phase 1 — P0 product (next)
1. Auth UI (register, login, email verification, 2FA, wallet connect/SIWE) wired to API.
2. User dashboard (shell, overview, notifications, account & security, KYC status, RG hub/limits/self-exclusion).
3. Wallet UI (overview with balance buckets, connected wallets, deposit 7 steps, withdraw 9 steps, history, detail drawer, whitelist) wired to API (testnet/DEMO).
4. Global Pool UI (hub, participation preview with fee breakdown, pending/success, drawing (VRF stepper), results, history, provably-fair verification) + WebSocket live updates.
5. Admin panel (login+MFA, dashboard KPIs, users, restrictions, KYC/AML queues, deposits/withdrawals with four-eyes, ledger, pool accounting, rounds/VRF/settlement monitoring, blockchain tx, health, audit log, roles/permissions).
6. Smart contracts (after custody decision): pool contract with Chainlink VRF v2.5 on testnet, Foundry tests, deployment scripts (testnet only), indexer/reconciliation.
7. Responsive/mobile pass + accessibility + E2E tests (Playwright) for P0 flows.

## Phase 2 — P1
Games as non-monetary simulations (Pool Roulette, Orbit Rush, Pool Dice, Double Side, Twenty-One) with commit–reveal provably-fair verification; catalogue & lobby; promotions (welcome offer, daily rewards, missions, rakeback/cashback, tournaments) behind compliance flags; VIP; affiliates/referrals; leaderboard; winners hall; security centre; support/FAQ/CMS.

## Phase 3 — Hardening
Security review, threat model, audits (contracts + backend), load tests, observability (structured logs, metrics, tracing), Cloudflare/WAF, backups, incident runbooks, licensing/compliance sign-off before any real-money enablement.
