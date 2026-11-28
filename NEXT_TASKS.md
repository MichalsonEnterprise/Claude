# GLOBAL POOL — Next tasks (resume here)

0. (done) Foundation verified; 304 tests green. P0 batch running: `global-pool/scripts/workflows/dev-p0-batch.js` with keys auth, account, rg-history, wallet, pool, admin-a, admin-b, api-gaps → review reports, re-run `pnpm -r typecheck lint test build`, commit, update PROJECT_STATUS.md.
0b. 08:05 UTC: resume Figma continuations (see `design/figma-build/pending-slices.json`).
1. (done) Wait for workflow `gp-dev-foundation` (script copy: `global-pool/scripts/workflows/dev-foundation.js`) → review reports, run `pnpm -r typecheck lint test build` in `global-pool/`, commit.
2. Get owner decisions (custody, MVP chain, auth approach, code location) → then start contracts + wallet/deposit architecture.
3. Launch Phase 1 batch: auth UI, dashboard, wallet UI, pool UI, admin UI (parallel agents by route group) + API endpoints they need.
4. Keep Figma continuation running (P0 first), merge results into `design/figma-build/ledger.json`, update `FIGMA_PROGRESS.md`.
5. After each batch: update `PROJECT_STATUS.md` (dev and Figma progress kept separate).
