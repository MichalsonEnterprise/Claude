# gp-hub continuation (GP-01..04 Hub & participation)
Remaining frames after the 27 Nov run (see results/screens-3-auth-gp.json, key gp-hub):
1. out/01_mob_gp03_gp04.js — page 10, section 'GP — Mobile A': [GP-03] Participation Pending / 390 / Bottom sheet (x=1140) and
   [GP-04] Participation Success — Entry receipt / 390 / Bottom sheet (x=1650); patches @lumen.eth -> @orbit_77 on the 390 No-round hub;
   screenshots the sticky participate bar of the 390 Restricted / Wallet-disconnected hubs.
2. out/02_d_restricted_1280_768.js — page 07: [GP-01] Global Pool Hub / 1280|768 / Restricted region (cloned from the Active frames,
   region banner + alert + CTAs mirrored from the 1440 Restricted frame); screenshots the 1440 GP-02 Insufficient / Limit modals.
3. out/03_d_noround_1280_768.js — page 07: [GP-01] Global Pool Hub / 1280|768 / No active round; patches the 1440 No-round winner handle.
All scripts are idempotent (skip frames that already exist). Rebuild with `python3 build.py` after editing src/.
