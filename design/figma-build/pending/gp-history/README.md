# Pending scripts — agent gp-history (GP-08..11/13 History & edge states + GP — Mobile C)

Built because the shared Figma MCP seat hit its tool-call limit on 27 Nov 2026 (23:10–23:35 UTC) before any frame could be created.

- `python3 build.py` assembles `out/*.js` = `../../helpers.js` (verbatim, current) + `lib.js` (+ `mlib.js` for mobile) + bodies, each body wrapped in its own block.
- Run each `out/*.js` once with use_figma (fileKey QHF8iRUMFgGMcEn3bD25jl, skillNames figma-use,figma-generate-design). Order: d1 → d2 → d3 → d4 (page 07, section "GP-08..11/13 History & edge states" at 32000,0), then m1 → m4 (page 10, section "GP — Mobile C" at 175000,0).
- Scripts are idempotent: a frame with the same name is removed and rebuilt. Each returns `{ sec, R:[{id,h,MISS,...}], MISS }` and screenshots every frame at 0.5×.
- `vals.json` holds @nova.k's entry counts for rounds #1,247 / #1,246 (10 / 15, DEMO) — d1 also returns the USR-G2 texts (`G2`) so they can be reconciled before d3/m-batches.
- `_mock-run.cjs out/*.js` smoke-tests the scripts against a permissive Figma mock (catches syntax/reference errors only).
