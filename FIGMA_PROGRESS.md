# GLOBAL POOL — Figma progress

File: https://www.figma.com/design/QHF8iRUMFgGMcEn3bD25jl (13 pages). Build kit & state: `design/figma-build/`.

- **Ledger:** `design/figma-build/ledger.json` (306 rows). Merge agent results with `node design/figma-build/merge-ledger.cjs design/figma-build/results/<file>.json`.
- **Figma page 00** holds the visual Screen Ledger (rows `Ledger/<ID>`, status texts `Status/<ID>`), the Decisions log and a Resume card. Refresh its statuses from ledger.json in the final QA pass.
- **Pending work:** `design/figma-build/pending-slices.json` (resume plan P0 → P1 → P2 → prototypes/error states), with ready-to-run idempotent scripts in `design/figma-build/pending/`, `pending-*/` and `queue/`.
- **Run continuation:** Workflow `design/figma-build/workflow-screens.js` with args `["cont:<slice>", …]` (max ~2 agents at a time because of the Figma MCP limit).
- **Rules for agents:** `design/figma-build/conventions.md` (tokens, casino direction, the AI-look ban, limit rules §10), `demo-data.md`, `decisions.md`.

## Status snapshot (28 Nov 2026 01:00 UTC)
75 verified · 11 built · 19 in progress · 201 not started. Running: continuation workflows for wallet withdraw 1–5, 2FA/wallet connect, KYC, draw/results, pool hub, RG, restrictions, account, gaming and financial history.

## Known QA items for the final pass
- DEMO badges overflowing two promo cards on the homepage; DEMO badge low contrast on the gold sidebar tile.
- Library leftovers using older Art/Spot motifs (Strip/Recent Wins, Table/Live Bets mini art, Tile/Category Global Pool) → restyle.
- Section/SEO Text component copy mentions "five original games" → update to the catalogue.
- Decisions 18–24 to add to the page-00 Decisions frame; ledger summary counts on page 00 are a static snapshot → refresh.
- File thumbnail must be set manually (API unsupported): Cover frame 13:72.
