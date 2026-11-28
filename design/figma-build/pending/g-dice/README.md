# pending/g-dice — Pool Dice (DI-01 … DI-07) + GM-01 shared RG session bar & reality check

Status 28 Nov 2026 (continuation run): the Figma MCP seat limit refused every call of this run
(3 consecutive "tool call limit" errors, including the read-only inventory), so NOTHING was verified
or built in Figma by this run. All 33 frames are prepared as ready-to-run scripts.

Targets
- Page `08 — Games`, section `DI Dice & GM-01` at X=32000, Y=0 (CF Coinflip starts at X=48000; this slice
  stays < 13,000 px wide). Desktop columns (section-local x): DI-01 120 · DI-02 1680 · DI-03 3240 · DI-04 4800 ·
  DI-05 6360 · DI-06 7920 · DI-07 9480 · GM-01 11040; states stack below their column (y += h + 160).
  Tablet DI-01 768 goes in a row 400 px below the lowest desktop frame (run 09 last on page 08).
- Page `10 — Mobile Experience`, section `Games — Mobile Dice` at X=196000, Y=0. Columns: DI-01 120 · DI-02 630 ·
  DI-03 1140 · DI-04 1650 · DI-05 2160 · DI-06 2670 · DI-07 3180 · GM-01 3690.

How to run
1. Run `out/00a_inventory_p08.js` and `out/00b_inventory_p10.js` (read-only) — skip scripts whose frames already exist.
2. Run the `out/*.js` scripts in RUN-ORDER.json order, passing the whole file as `code`
   (fileKey QHF8iRUMFgGMcEn3bD25jl, skillNames `figma-use,figma-generate-design`). Each ends with node screenshots.
3. Scripts are idempotent per frame name (same-named frame in the section is removed, then rebuilt at the column bottom).
4. Edit sources in `src/` (kit-base / kit-play / kit-pages / kit-m + `src/bodies/*`), then `python3 build.py [prefix…]`
   (prepends helpers.js verbatim, keeps only the kit functions a body uses, node --check + mock dry run, warns ≥ 50k chars).

Things to check on the first real run (returned in `OUT.frames[...].notes`)
- `sidebarItem:false` → Shell/Sidebar has no `Item/Pool Dice` layer; set the Originals › Pool Dice item Active by hand.
- `balance:false` → Topbar balance text layer is not called `Balance value` and no text equals `9,215.30`.
- `rgN` / `rgTexts` (GM-01 Approaching) → RG/Session Bar texts; if the Approaching variant's built-in values differ from
  the popover (net −172.40, 172.40 / 200.00), override them with `repl()`.
- `OUT.hsTexts` → Game/History Strip (Dice) pill values; result frames should show 73.21 / 31.07 as newest pill
  (`histRepl` map in buildPlay does exact-text swaps).
- `resMiss` → Game/Result Banner TEXT names (Headline / Detail / Net amount) on the Lose frame.

Design decisions (for decisions.md)
- Win rule (keeps demo-data 49.50% on 0.00–99.99): roll over T wins on T…99.99 (= 100 − T %), roll under T wins on
  0.00…T−0.01 (= T %); multiplier = 99 ÷ win chance (1.00% edge); win chance limited to 0.01–98.00% (targets over
  2.00–99.99, under 0.01–98.00); bet 0.10–1,000.00 USDT. Fees line shows 0.00 USDT (no platform/network fee on game bets).
- Roll sequence (all DEMO): D-88212 61.08 win (nonce 416) → D-88213 73.21 win (nonce 417, +10.00, balance 9,225.30,
  session net −14.60) → D-88214 31.07 lose (nonce 418, balance back to 9,215.30, net −24.60). Rolling locks the 10.00
  stake (9,205.30). D-88205…D-88214 history rows; today 36 rolls, 360.00 wagered, 335.40 paid out, net −24.60.
- Status always icon + label (check/x + Win/Lose); lose zone = status/danger, win zone = brand mint; gold not used.
- Reality check = RG/Reality Check modal over the dimmed game at 60 min on desktop, bottom sheet with three equal
  Secondary actions on mobile (no close icon), only between rolls. Session bar GM-01 spec board documents states and
  dev events (rg.session.updated, rg.reality_check.due).
- Daily loss limit reached / approaching are separate DEMO scenarios (net −200.00 / −172.40), named as such.
- Region restricted: no bypass hint; explicit "please don't use a VPN or proxy"; withdraw stays primary.

Known data gap: demo-data's daily participation limit (500.00, "used 351.75" = entries only) does not include any game
stakes, while the RG session bar shows game play today (net −24.60). Dice screens therefore never show the
participation limit; flag for the orchestrator.
