# gp-hub continuation (GP-01..04 Hub & participation)
Remaining frames after the 27 Nov run (see results/screens-3-auth-gp.json, key gp-hub):
1. out/01_mob_gp03_gp04.js — page 10, section 'GP — Mobile A': [GP-03] Participation Pending / 390 / Bottom sheet (x=1140) and
   [GP-04] Participation Success — Entry receipt / 390 / Bottom sheet (x=1650); patches @lumen.eth -> @orbit_77 on the 390 No-round hub;
   screenshots the sticky participate bar of the 390 Restricted / Wallet-disconnected hubs.
2. out/02_d_restricted_1280_768.js — page 07: [GP-01] Global Pool Hub / 1280|768 / Restricted region (cloned from the Active frames,
   region banner + alert + CTAs mirrored from the 1440 Restricted frame); screenshots the 1440 GP-02 Insufficient / Limit modals.
3. out/03_d_noround_1280_768.js — page 07: [GP-01] Global Pool Hub / 1280|768 / No active round; patches the 1440 No-round winner handle.
All scripts are idempotent (skip frames that already exist). Rebuild with `python3 build.py` after editing src/.

## Status 28 Nov 2026 (continuation run)
- DONE: 01 (164:73073, 164:73786), 02 (164:154566, 164:155369), 03 (165:94856, 165:96938), 04 (hash row + sticky bars), 05 (GP-03 sheet re-anchored, section refit).
- NOT RUN (Figma MCP limit, 3 refusals in a row): out/06_final_p07.js — refits section 'GP-01..04 Hub & participation' on page 07 to the settled frame heights
  and screenshots the 1440 GP-04 receipt modal (34:383862). Safe to run any time (read + section resize only).

## Status 28 Nov 2026 (second continuation)
- Read-only check: page 07 section 32:32304 holds all 16 desktop/laptop/tablet frames; page 10 section 34:434742 holds all 10 mobile frames. All frames use hug height, nothing is clipped at 800 px, and none overlap.
- 06 RUN: the section was already fitted (6360 × 36516, unchanged). The 1440 GP-04 receipt modal (34:383687 in 34:383862) passed its screenshot: the 'PDF receipt' label, fee breakdown, Tx/Hash + DEMO, odds and RG bar all render without clipping.
- Nothing remains for gp-hub. GP-01..04 and MOB-04 are VERIFIED.
