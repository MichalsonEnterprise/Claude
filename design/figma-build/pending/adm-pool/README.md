# adm-pool continuation scripts (ADM-P1..P10)

These scripts load the helper library from the hidden text node `78:57471`
("adm-pool script cache — delete") in section `67:52461` on page 09 and run it with an AsyncFunction.
If that node is missing, recreate it from `lib_code.js` (out_store45.js shows how it was stored).

Run order (each file is the full use_figma code; all are idempotent, removing old frames by name first):
1. call1.js: P9 Refund Status 1440+1280, P10 Policy & breaker 1440+1280, P10 states (pause request, approver view, paused), P7 Delayed state
2. call2_tab.js: 768 tablet clones of P1, P2, P3, P7, P8 (row below the 1280 row)
3. call3_mob.js: P3 Active Round 390 on page 10, section "ADM — Mobile" (x=217000)

When everything is done, delete the cache node 78:57471.

STATUS 28 Nov 2026: all four scripts were run successfully (call1, call2_tab, call3_mob + fixes, call5_inspect), and the cache node 78:57471 was deleted afterwards.
Frame IDs are in ../../registry-adm-pool.json. Nothing remains to run.
