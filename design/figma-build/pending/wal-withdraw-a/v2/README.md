# wal-withdraw-a v2 — continuation scripts (WAL-10..14 + MOB-07 mobile 1–5)

Build: `python3 build.py` → `out/<name>.js` (helpers.js verbatim + pruned `_common.js` + `_desk.js`/`_mob.js` + body). Check: `node _mock-run.cjs out/*.js`.
Every script is idempotent (removes its own frames by name before rebuilding) and ends with in-script screenshots.

Run order (one use_figma call each):
0. l0-inspect.js — read-only listing (DONE)
1. d03 — WAL-12 desktop states ........ DONE (124:45306, 124:46116, 124:46914)
2. d04 — WAL-13 desktop ×4 ............. DONE (133:47170, 133:48168, 133:49053, 133:49928)
3. d05 — WAL-14 desktop Default ......... DONE (139:49799) — hero overlap fixed by t.js
4. t   — WAL-14 hero fix + tablet 768 defaults ×5 ... DONE (151:116052, 151:116354, 151:116643, 151:116950, 151:117260)
5. m1  — mobile WAL-10 sheet, WAL-11 sheet, WAL-12 Default ... DONE (152:66271, 152:66557, 152:66808; section 152:66270)
6. m2  — mobile WAL-12 Invalid, WAL-12 cooldown sheet, WAL-13 Default ... DONE (157:68503, 157:68755, 157:68981)
7. m3  — mobile WAL-13 Over balance, Limit reached, WAL-14 review sheet ... DONE (160:69089, 160:69318, 160:69533); fix pass: limit-card title + sheet height
