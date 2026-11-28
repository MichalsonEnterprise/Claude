# usr-finance continuation (USR-F1..F6 Financial history) — 28 Nov 2026
Desktop 1440 (all states) + F6 768 were built in the first run (see registry-usr-finance.json). F1 mobile (Default, Empty, Filters) built too.
Remaining at continuation start: mobile 390 for F2, F3, F4, F5, F6 (+ F6 export bottom sheet) on page "10 — Mobile Experience", section "USR — Mobile D".

Run order (each = one use_figma call; pass the file content as `code`):
1. out/m-a.full.js — patches the 3 F1 mobile DEMO bars to the short message (decision #29) and builds F2, F3, F4 mobile (idempotent: removes same-name frames first)
2. out/m-b.full.js — builds F5, F6 Default, F6 Export (bottom sheet) mobile
3. d-patch.js (standalone, no helpers needed) — aligns desktop/tablet F2/F3/F4/F6 frames on page 05 with later demo-data additions (WD-20931 18:44 → 22:44 timeline + new-destination AML reason; VIP weekly 16–22 Nov auto-settles 30 Nov; Gold III level-up 5.00 on 25 Nov 19:32; rakeback 2.96 on 24 Nov 09:12; WD-20702/WD-20511 moved to the BNB primary address). NOT idempotent for the reorder/rename parts once run (rows renamed) — run once.

Assemble: `cat ../../helpers.js _tail.js m-a.js > out/m-a.full.js` (same for m-b).
