# GLOBAL POOL — Figma progress

File: https://www.figma.com/design/QHF8iRUMFgGMcEn3bD25jl (13 pages). Build kit & state: `design/figma-build/`.

- **Ledger:** `design/figma-build/ledger.json` (306 rows). Merge agent results with `node design/figma-build/merge-ledger.cjs design/figma-build/results/<file>.json`.
- **Figma page 00** holds the visual Screen Ledger (rows `Ledger/<ID>`, status texts `Status/<ID>`), the Decisions log and a Resume card. Refresh its statuses from ledger.json in the final QA pass.
- **Pending work:** `design/figma-build/pending-slices.json` (resume plan P0 → P1 → P2 → prototypes/error states), with ready-to-run idempotent scripts in `design/figma-build/pending/`, `pending-*/` and `queue/`.
- **Run continuation:** Workflow `design/figma-build/workflow-screens.js` with args `["cont:<slice>", …]` (max ~2 agents at a time because of the Figma MCP limit).
- **Rules for agents:** `design/figma-build/conventions.md` (tokens, casino direction, the AI-look ban, limit rules §10), `demo-data.md`, `decisions.md`.

## Status (28 Nov 2026 13:20 UTC) — complete
**306 / 306 verified** (P0 126 · P1 135 · P2 45) across 13 pages, including 10 clickable prototypes (page 11, 196 navigate reactions, 0 dead ends) and the state matrices ERR-01…07 (page 12). Page 00 now carries the decisions log #1–#62 and a refreshed ledger summary. Final QA applied library fixes (Buttons audit, Badge/DEMO 'On gold' tone, Admin/Queue Card compact density, Admin/Role Chip Marketing, OTP 2-line description, Command Palette scope property, Toast layer naming, SEO text, current art in Strip/Recent Wins, Table/Live Bets, Tile/Category).

Open design follow-ups (not ledger rows): Orbit Rush 390 quick amounts and header icon buttons are 40 px (should be 48 px like Pool Dice); Tabs/Segmented and the CR-06 checkbox row are 42 px (need a 44 px mobile size); Pool Roulette 390 header subtitle overlaps the Sound button; no Sheet/Top component; a member-state 390 lobby could be added. **Owner action:** set Cover frame 13:72 as the file thumbnail manually (the Plugin API can't).

## Status snapshot (28 Nov 2026 03:55 UTC)
141 verified · 25 built · 13 in progress · 127 not started (P0: 87 verified / 11 built / 9 in progress / 19 not started). Games: Twenty-One 8/9 verified, Orbit Rush 5 verified + 3 built, Double Side built; Pool Dice & Pool Roulette scripts prepared (pending/g-dice, pending/g-roulette) — run after the Figma limit resets.

## Older snapshot (28 Nov 2026 01:00 UTC)
75 verified · 11 built · 19 in progress · 201 not started. Running: continuation workflows for wallet withdraw 1–5, 2FA/wallet connect, KYC, draw/results, pool hub, RG, restrictions, account, gaming and financial history.

## Known QA items for the final pass (all applied 28 Nov 13:20 UTC except the manual thumbnail)
- DEMO badges overflowing two promo cards on the homepage; DEMO badge low contrast on the gold sidebar tile.
- Library leftovers using older Art/Spot motifs (Strip/Recent Wins, Table/Live Bets mini art, Tile/Category Global Pool) → restyle.
- Section/SEO Text component copy mentions "five original games" → update to the catalogue.
- Decisions 18–24 to add to the page-00 Decisions frame; ledger summary counts on page 00 are a static snapshot → refresh.
- File thumbnail must be set manually (API unsupported): Cover frame 13:72.
