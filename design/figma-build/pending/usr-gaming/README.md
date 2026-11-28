# pending/usr-gaming — USR-G1..G7 Gaming (continuation run, 28 Nov 2026)

State after the continuation run:
- Desktop 1440 (page 05, section `USR-G1..G7 Gaming` 32:97624): all 14 frames already existed (built by the first run) — nothing rebuilt.
- Mobile 390 (page 10, section `USR — Mobile B` 34:432314): the first run had 8 frames. This run added 5:
  - `[USR-G1] My Games / 390 / Default` 149:124836  (script out/01_g1_mobile.js — DONE)
  - `[USR-G7] Favourites / 390 / Default` 151:63647 + `/ Empty` 151:64719  (out/02 — DONE)
  - `[USR-G2] My Entries / 390 / Filters` 152:64961 + `[USR-G6] Game History / 390 / Export` 152:65321  (out/03 — DONE)
- out/04_fix_g6_export_filename.js = optional cosmetic fix (export filename wraps after "game-"). Run it if it is not yet applied
  (check: in 152:65321 the 'File preview' row still has a Badge/DEMO instance as its last child).

Scripts are idempotent: each frame is removed by name before being rebuilt. Sources: src/kit.js + src/m_*.js, assembled with
`python3 src/build.py` (helpers.js is prepended verbatim). Do NOT re-run 01–03 unless the frames are missing (it would re-create them with new ids).
Note: the first G1 build had 100 px-tall 'Spacer' frames; the kit's spacer() now has h:1 and the fix was applied in the 02/03 calls.
