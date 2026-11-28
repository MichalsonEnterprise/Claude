# pending/adm-finance — ADM-F1..F9 (continuation, 28 Nov 2026) — ALL DONE

Canvas: page 09 section `ADM-F1..F9 Finance` (32:95639) = 31 desktop/laptop/tablet frames; page 10 section `ADM — Mobile` (173:71503) = 4 ADM-F2 mobile frames (209:77692 queue, 209:78027 detail, 209:78251 approve sheet, 209:78467 reject sheet). IDs in ../../registry-adm-finance.json.

Finished scripts (out/, each = helpers.js verbatim + body, idempotent):
1. `m-f2-mobile.js` — built the 4 ADM-F2 Mobile 390 frames (skips existing names).
2. `m-f2-fix1.js` — queue cards: time on line 1 and "Due in …" on line 4; sticky caption; approve/reject sheets compacted to 755 px (top at y=89 in the 844 viewport).
3. `f-fix09.js` — page 09: "3 h 40 min left" → "3 h 07 min left" in 5 WD-20931 detail frames (matches the queue at 18:48 UTC); verification screenshots of F6 1280 + F9 Configure/Ready/Error (passed).
`_obsolete-adm-f2-mobile.js.txt` = the earlier script, superseded by m-f2-mobile.js; do not run it.
