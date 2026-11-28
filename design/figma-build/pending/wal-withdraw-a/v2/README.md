# wal-withdraw-a v2 — continuation scripts (WAL-10..14 + MOB-07 mobile 1–5)

Build: `python3 build.py` → `out/<name>.js` (helpers.js verbatim + pruned `_common.js` + `_desk.js`/`_mob.js` + body). Check: `node _mock-run.cjs out/*.js`.
Every script is idempotent (removes its own frames by name before rebuilding) and ends with in-script screenshots.

Run order (one use_figma call each):
0. l0-inspect.js — read-only listing (DONE 28 Nov: only WAL-10/11/12 D Default existed; mobile section absent)
1. d03 — WAL-12 desktop Invalid / Whitelisted / New-address cooldown
2. d04 — WAL-13 desktop Default + Min/max below minimum + Over balance + Limit reached
3. d05 — WAL-14 desktop Default
4. t   — tablet 768 defaults ×5 (needs d04 + d05 first)
5. m1  — mobile WAL-10 sheet, WAL-11 sheet, WAL-12 Default
6. m2  — mobile WAL-12 Invalid, WAL-12 cooldown sheet, WAL-13 Default
7. m3  — mobile WAL-13 Over balance, Limit reached, WAL-14 review sheet
