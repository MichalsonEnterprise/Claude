# pending/g-crash — Orbit Rush (Crash) CR-01 … CR-08

Status 28 Nov 2026 (continuation run): an interrupted earlier run had already built every desktop, tablet and
mobile frame below except one; this run inventoried both sections read-only and adds the missing mobile state.

Page `08 — Games`, section `CR Crash` (32:90237) at X=16000, Y=0 — all exist (hug height / AUTO):
- CR-01 1440 Bets open 32:90238 · CR-02 1440 Running 1.64× 33:124526 · CR-03 1440 Cashed out 33:156588
- CR-04 1440 Result cashed out at 2.00× 33:191216 · CR-04 1440 Stake lost (target 5.00×) 33:209124
- CR-05 1440 Round history & statistics 33:284530 · CR-06 1440 Auto-play dialog 33:311252 · CR-07 1440 Verified 34:331972
- CR-08 1440 Connection lost 33:227442 · Insufficient balance 33:239177 · Daily loss limit 33:258312 · Region 33:259170
- CR-01 768 34:350701 · CR-02 768 34:351583 · section title 36:527185 / 36:527186 · Dev notes 36:527187

Page `10 — Mobile Experience`, section `Games — Mobile Crash` at X=189000, Y=0:
- CR-01 34:386552 · CR-02 34:410457 · CR-03 34:420337 · CR-04 34:420839 · CR-05 34:446321 · CR-06 34:480272
- CR-07 34:492427 · CR-08 Connection lost 36:511112 · Region 36:511527 · Daily loss limit 36:519473
- MISSING before this run: CR-08 390 Insufficient balance → `out/01_m_cr08_insufficient_and_verify_mobile.js`
  (idempotent: removes a same-named frame, clones CR-01 390, swaps balance to the 4.20 USDT DEMO account,
  error-strokes the amount field, inserts a "Not enough balance" alert with Deposit USDT / Change bet amount,
  disables the inline CTA / relabels the sticky CTA, then screenshots all 11 mobile frames).

Verification: `out/02_verify_desktop_readonly.js` (read-only) screenshots the 14 desktop/tablet frames.
Run order: 01 → 02 (fileKey QHF8iRUMFgGMcEn3bD25jl, skillNames figma-use,figma-generate-design).
Sources: `src_01_m_cr08_insufficient.js` (+ helpers.js prepended verbatim = out/01).

Run log 28 Nov 2026: 01 ran (CR-08 390 Insufficient = 198:77380, alert initially landed at top of Content) →
03 fixed it (alert above Bet panel, Field stroke border/danger, 'Limits' helper → error copy, risk copy) and verified
CR-05/06/07/08c 390. Desktop CR-01/02/03 + mobile Region/Loss-limit and desktop CR-04×2/05/06/07 verified read-only.
Remaining checks: 04 (wrap clipped 'Licence details' link row in CR-08 390 Region + verify desktop CR-08 ×4),
05 (verify tablet CR-01/CR-02 768 + dev notes).

Update: 04 ran — desktop CR-08 ×4 verified; the clipped link row in CR-08 390 Region is inside a Notice/Licence
instance (row 'Links' 352 px, cannot wrap) → 06 hides the duplicate 'Restricted countries' link (the button of the
same name sits directly above the card) and verifies tablet CR-01/CR-02 768 + dev notes. Run 06 if not yet run.

FINAL (28 Nov 2026, this run stopped after 3 consecutive Figma MCP limit errors):
- Verified by screenshot this run: all 12 desktop frames, mobile CR-01…CR-07, CR-08 390 Connection lost / Daily loss limit /
  Insufficient balance (198:77380, new). Mobile CR-08 Region: verified except the 'Licence details' link clipped at the
  right edge of the Notice/Licence instance row ('Links', 352 px).
- NOT yet verified: tablet CR-01 768 (34:350701) and CR-02 768 (34:351583), dev notes 36:527187.
- Still to run: out/06_m_region_links_fix_verify_tablet.js (idempotent; one earlier attempt failed with
  'node 203:58796 does not exist' after hiding the link — it is unknown whether that hide persisted; 06 re-queries
  after the mutation and only hides when still visible).
Tooling notes: use_figma returned at most 5 inline screenshots per call; node.screenshot() works on frames of another page.
