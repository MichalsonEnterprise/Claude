# pending/err-b — ERR-04..07 (page 12 boards + page 10 mobile)

Slice: ERR-04 Permission / session / offline (P1), ERR-05 Regulatory states (P0), ERR-06 Service status banners (P1), ERR-07 Security warnings library (P0).

Sources (edit these, then `./build.sh` to assemble `out/*.js` = helpers.js + lib + body):
- `lib.js` — board scaffold (board(), cell(), panel(), audit(), copy/relabel helpers). `lib-m.js` = subset for mobile scripts.
- `mlib.js` — mobile helpers. Section 'ERR — Mobile' on page 10 is SHARED with err-a (ERR-01..03 in row 1); ERR-04..07 frames always go in row 2 (`myRowY()`), never on err-a's row.
- `b04.js` `b05.js` `b06.js` `b07.js` — one 1440 documentation board each (page 12, section 'ERR-04..07 Permission, regulatory, maintenance & security').
- `m1.js` (ERR-04 offline, ERR-05 licence required, ERR-06 entries paused), `m2.js` (ERR-06 wallet maintenance, ERR-07 wrong-network sheet, ERR-07 suspicious sign-in) — 390 frames.

All scripts are idempotent: a frame with the same name is removed and rebuilt in the same position. Run order: see RUN-ORDER.json. Each script ends with an audit (clipped/off-frame text) + screenshot.
Status 28 Nov 2026: all 10 scripts have run successfully; post-run fixes are already folded into the sources.
