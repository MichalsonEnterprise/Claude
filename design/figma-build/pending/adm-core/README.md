# pending/adm-core — ADM-00 / ADM-01 / ADM-02 / ADM-X1 + MOB-11

Ready-to-run `use_figma` scripts for the adm-core slice. See `RUN-ORDER.json` for what already ran and what is left.

- Sources: `NN-*.js` (page 09) and `m-*.js` (page 10). Shared code: `_lib.js` (page/section + admin shell helpers),
  `_ov.js` (ADM-02 overview builder for 1280/768), `_t.js` (tablet top bar + tablet band), `_m.js` (mobile top bar + tab bar).
- `python3 build.py <name>` writes `out/<name>.js` = helpers.js (verbatim) + `_lib.js` + body with `//#include` files inlined,
  retargets `m-*` scripts to page `10 — Mobile Experience` / section `ADM — Mobile`, and runs `node --check`.
- Every script is idempotent: frames are looked up by exact name and skipped if they exist. Each ends with node screenshots.
- Order matters for 04 → 05 → 06 (laptop band must exist before the tablet band is placed with nextY).
