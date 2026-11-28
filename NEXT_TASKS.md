# GLOBAL POOL — Next tasks (resume here)

_Updated 28 Nov 2026, 06:00 UTC._

## Running now
- **Integration check (orchestrator):** `pnpm -r typecheck` ✅, `pnpm -r lint` ✅, `pnpm -r test` ✅ (463 tests), `pnpm -r build` running (log in the session scratchpad).
- **`p0-review`** (`global-pool/scripts/workflows/p0-review.js`): 7 read-only reviewers (money, authz, fairness/admin, RG/compliance, chain, web, tests), each finding verified by skeptics (3 for critical/high).
- **`p0-integration-qa`** (`global-pool/scripts/workflows/p0-integration-qa.js`): route crawl for every page × role at 1440/390, plus 6 cross-module Playwright journeys in `apps/web/e2e/integration/`.
- **`dev-p1-games` engine** (`global-pool/scripts/workflows/dev-p1-games.js`, key `engine`): `@gp/shared/fair`, DEMO credits, games API + crash WS + tests + `docs/GAMES.md`.

## Next, in order
1. **P0 close-out wave** (after review + QA): fix confirmed review findings and QA issues by owning module; build the P0 compliance gaps **PUB-21 geo-block interstitial**, **PUB-22 age gate + licence modal**, **ERR-05 regulatory states**; cross-module state audit **ERR-01/02/03/07** (empty, error, loading, security warnings). Then rerun the crawler (`apps/web/scripts/qa-crawler.mjs`) and the full `pnpm -r typecheck lint test build`.
2. **Games:** after the engine → `kit` (lobby PUB-03/04, GM-01/02, Pool Dice DI-01…07) → `dice-coinflip`, `roulette`, `crash`, `blackjack` in parallel. Run: `Workflow({scriptPath: 'global-pool/scripts/workflows/dev-p1-games.js', args: ['kit']})`, etc.
3. **08:05 UTC:** probe the Figma MCP limit, then resume the Figma continuations P0 first (`design/figma-build/pending-slices.json`: cont:adm-core, auth-b, gp-hub, gp-history, mob-patterns → g-dice, g-roulette, g-coinflip, g-crash, g-blackjack → P1/P2 → proto/err); merge with `node design/figma-build/merge-ledger.cjs results/<file>.json`.
4. **P1 modules:** promotions, VIP, referrals/affiliates, leaderboard, winners hall, security centre, support/FAQ/CMS, public pages PUB-05/06/08+.
5. **Hardening:** Slither + Foundry invariant tests on the contract, external audit (required before any deployment beyond testnet), observability (metrics, tracing, alerting), KMS for signer keys, Redis throttler store, admin refresh token in an httpOnly cookie.

## Waiting for the owner (asked in Polish 28 Nov)
- (a) Self-exclusion/cooling-off with open entries: refund vs keep in round (now: kept).
- (b) Cancelled round: refund the 0.05 platform fee? (now: not refunded).
- (c) Games currency: DEMO credits vs USDT (now: DEMO credits, no cash value).
- Lower priority: AML risk model/provider, which restrictions need four-eyes, who may send refund reminders.
- Later: Privy App ID (via `request_credential`/env, never in the repo), KYC provider, AML provider, email provider, hosting, restricted-country list, Arbitrum Sepolia deployment + VRF subscription + test LINK.

## Code-side ledger
`global-pool/docs/dev-ledger.json` (screen ID → dev status from agent reports). P0 (126 rows): 75 implemented, 21 foundation components, 15 partial, 5 covered by e2e (prototypes), 4 per-module state matrices, 3 planned (games), 3 not started (PUB-21, PUB-22, ERR-05).
