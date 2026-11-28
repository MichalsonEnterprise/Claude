# pending/pub-p1c — PUB-24 404 · PUB-25 500 · PUB-26 Maintenance · PUB-06 Leaderboard

State on 28 Nov 2026 (continuation run):
- **Desktop 1440 (page `03 — Public Website`, section `PUB-24/25/26 Errors & PUB-06 Leaderboard` = 54:101508, X 70000)** — all six frames
  were already built by the interrupted earlier run (auto height, complete): 404 54:101512 · 500 82:102573 · Maintenance 82:103376 ·
  Leaderboard Weekly (default) 84:103900 · Daily 84:104905 · Monthly 84:105918 (+ doc header 54:101509). Not rebuilt.
- **Mobile 390 (page `10 — Mobile Experience`, section `PUB-06/24/25/26 — Mobile` = 215:78629, X 42000)** — built in this run:
  404 215:79244 · 500 215:80405 · Maintenance 215:81600 · Leaderboard Weekly (default) 216:81112 · Leaderboard Daily — not ranked yet 216:82473.

## Scripts
- `python3 build.py` assembles `helpers.js` + `lib-m.js` + `art.js` + `m*.body.js` into `out/` and dry-runs each with `mock.cjs`.
- `out/m1-errors.js`, `out/m2-leader.js` are idempotent (skip frames that already exist by name; replace a fixed 800 px leftover).
- The mobile copy mirrors the desktop frames: m1 reads the desktop top-bar variant (Guest/Member) and intro paragraphs; m2 reads the
  desktop leaderboard frames (hero, podium, Table/Leaderboard Row props, your race, how points work, prize breakdown) with fallbacks.
- `unused-desktop/` holds desktop scripts written before the inventory showed the desktop frames exist — **do not run** (duplicates).
- `r3-verify-desktop.js` = read-only screenshots of the six desktop frames (the run hit the Figma MCP limit before it could verify them).

## Art
Token-bound vector objects (SVG import, colours remapped to variables): two dice + cracked mint chip (404), red slot cabinet with
reels "5 0 0", an OUT OF ORDER sign and an unplugged power cable (500), a ticket stub "BACK AT 02:30 UTC / WITHDRAWALS OPEN"
with real text layers + an open-end wrench (maintenance), a gold trophy cup (leaderboards). No rings, glows, sparkles or halos.

## Verification (28 Nov 2026)
- 390 frames: built with an inline screenshot + text-overflow audit (0 overflow on all five). Wrench in the maintenance banner nudged off the ticket text in the m2 call.
- 1440 frames: `r3-verify-desktop.js` ran on the 3rd try. Screenshots seen for 404, 500, Maintenance, Leaderboard Weekly and Daily; Monthly returned
  0 text overflow but its screenshot was not included in the response. 404 reports 3 texts outside the frame = the 7th
  "Popular right now" tile is deliberately cropped by the carousel edge (peek). Nothing else is outstanding.

## Continuation run 2 (28 Nov 2026) — QA fixes, all frames verified
- Inventory (read-only, one call per page): page 03 section 54:101508 holds the doc header + six 1440 frames (all auto height); page 10 section
  215:78629 holds the five 390 frames (all auto height, 0 text overflow). Nothing missing, nothing rebuilt.
- Monthly 1440 (84:105918) screenshot now seen. A per-node overflow audit found and `out/f1-leader-header-podium.js` fixed, in all three 1440 leaderboard frames:
  (1) the Standings column header (fixed 48/730/120/120 cells) overflowed its 702 px row behind the right column; H/Player now FILL, padding/gap and
  column widths match the Table/Leaderboard Row instance (16 | 48 · 346 · 120 · 120 | 16, gap 12); (2) podium handles (68–97 px) overflowed their 51 px
  Handle frame under the DEMO badge; the badge now sits in a new 'Place' row under the handle ("1st place  DEMO"), 'Who' gap 8.
- `out/f2-404tiles-maint-window.js`: 404 'Popular right now' tiles — HOT/NEW tag + player pill with DEMO clipped the 160 px tile; tag turned off via
  'Show tag' on the 3 affected tiles. Maintenance hero — 'Window' facts row (530) overflowed its 520 px copy column; gap 20 + FILL.
- Post-fix screenshots seen: Monthly, Weekly, Daily main grids; 404 tile row; Maintenance hero. Post-fix audit = 0 overflow (except the deliberate
  7th-tile carousel peek on 404). Both fix scripts are idempotent (they skip already-fixed nodes).
