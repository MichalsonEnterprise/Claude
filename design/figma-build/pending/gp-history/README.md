# Pending scripts — agent gp-history (GP-08..11/13 History & edge states + GP — Mobile C)

Built because the shared Figma MCP seat hit its tool-call limit on 27 Nov 2026 (23:10–23:35 UTC) before any frame could be created.

- `python3 build.py` assembles `out/*.js` = `../../helpers.js` (verbatim, current) + `lib.js` (+ `mlib.js` for mobile) + bodies, each body wrapped in its own block.
- Run each `out/*.js` once with use_figma (fileKey QHF8iRUMFgGMcEn3bD25jl, skillNames figma-use,figma-generate-design). Order: d1 → d2 → d3 → d4 (page 07, section "GP-08..11/13 History & edge states" at 32000,0), then m1 → m4 (page 10, section "GP — Mobile C" at 175000,0).
- Scripts are idempotent: a frame with the same name is removed and rebuilt. Each returns `{ sec, R:[{id,h,MISS,...}], MISS }` and screenshots every frame at 0.5×.
- `vals.json` holds @nova.k's entry counts for rounds #1,247 / #1,246 (10 / 15, DEMO) — d1 also returns the USR-G2 texts (`G2`) so they can be reconciled before d3/m-batches.
- `_mock-run.cjs out/*.js` smoke-tests the scripts against a permissive Figma mock (catches syntax/reference errors only).

## Continuation run 28 Nov 2026
- Data aligned with demo-data.md (usr-finance extras): @nova.k had 40 entries in #1,247 (402.00 = 400.00 + 2.00 fee, bought 26 Nov 12:40) and 24 in #1,246 (241.20 = 240.00 + 1.20, 25 Nov 19:12); #1,248 bought 27 Nov 18:05, #1,245 24 Nov 14:22 (vals.json, b03/b04/m04).
- lib.js spacer() now resizes to 1×1 (empty hug frames defaulted to 100 px tall and opened big gaps); mlib.js uses the short mobile DEMO bar (decision #29) and stacks the card sub-title under the title.
- cont/*.js are the scripts actually run in this session (out/ batch + a targeted fix block for frames built in the previous call). Frame ids are in ../../registry-gp-history.json.
- REMAINING after the 28 Nov continuation (Figma MCP limit hit 3× in a row): run `cont/NEXT-m34-gp11-gp13-mobile.js` once (page 10, section 'GP — Mobile C' 188:72141). It builds [GP-11] Prize Distribution breakdown / 390, [GP-13] Round closed / 390 (sheet), [GP-13] Round cancelled, refund owed / 390, [GP-13] VRF delayed / 390 and screenshots each. Idempotent (same-name frames are replaced). Also re-screenshot 188:72142 and 188:72622 (GP-08 390) — their DEMO bar message was switched to the short mobile text after the last screenshot.
