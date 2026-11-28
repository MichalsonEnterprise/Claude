# pending/g-roulette — SUPERSEDED (28 Nov 2026) — DO NOT RUN

All RL-01…RL-09 frames already exist in Figma (sections 'RL Roulette' 32:77136 on page 08 and
'Games — Mobile Roulette' 34:413029 on page 10), built by an earlier run under DIFFERENT frame names.
These scripts match frames by name, so running them now would create duplicates. Frame ids:
/home/user/Claude/design/figma-build/registry-g-roulette.json. Kept only as reference.

# pending/g-roulette — Pool Roulette (RL-01 … RL-09)

Status 28 Nov 2026 (continuation run): the Figma MCP seat limit refused every call of this run, including the
read-only inventory, so NOTHING was built or verified in Figma by this run. All 28 frames are prepared as
ready-to-run, idempotent scripts (helpers.js verbatim at the top, < 50k chars, node --check + mock dry run OK).

Targets
- Page `08 — Games`, section `RL Roulette` at X=0, Y=0. Desktop columns (section-local x): RL-01 120 · RL-02 1680 ·
  RL-03 3240 · RL-04 4800 · RL-05 6360 (Win, Lose stacked) · RL-06 7920 · RL-07 9480 · RL-08 11040 · RL-09 12600
  (5 states stacked). Tablet RL-01 768 at x=120, 400 px below the lowest desktop frame (run 09 after 01–08).
- Page `10 — Mobile Experience`, section `Games — Mobile Roulette` at X=182000, Y=0. Columns: RL-01 120 · RL-02 630 ·
  RL-03 1140 · RL-04 1650 · RL-05 2160 · RL-06 2670 · RL-07 3180 · RL-08 3690 · RL-09 4200.

How to run: see RUN-ORDER.json. Run 01 first — besides building the RL-01 master it returns text dumps of
Game/Bet Slip, Game/History Strip (Roulette), the topbar, Game/Roulette Wheel (Result), Result Banner, Seed Display,
Verifier, RG/Session Bar and Bet Slip (Over limit). Check them, then adjust bodies if needed:
- `notes.balance:false` → topbar balance text is not called 'Balance value' and no text contains 9,215.30.
- `notes.sidebarItem:false` → Shell/Sidebar has no `Item/Pool Roulette` layer (set the Pool Roulette item Active by hand).
- `notes.slipN` (RL-04 / RL-09) = slip CTA relabelled; 0 means the Bet Slip CTA is not a Button instance ≥ 44 px tall.
- `notes.rgN` (RL-05) = RG/Session Bar replacements (−24.60 → +170.40 / −44.60); 0 = the bar formats values differently.
- `notes.resMiss` = Result Banner TEXT names not found (expected Headline / Detail / Net amount).
- RL-08 `notes.verifierTexts` = Provably Fair Verifier texts after the Pool Dice → Pool Roulette replacements.
Edit `src/` (kit-base, kit-felt, kit-pages, kit-m, bodies/*) and rebuild with `python3 build.py [prefix…]`.

Design decisions (for decisions.md)
- Felt = Game/Roulette Cell instances (0 spans three rows; 56×64 desktop, 40×52 tablet, 64×44 mobile vertical felt)
  + inline outside boxes (no component yet). Chips are Game/Chip instances; split/street/corner/line chips are placed on
  the shared line/edge/crossing, computed from the grid.
- Demo bets (match Game/Bet Slip Filled): Straight 19 5.00 + Red 10.00 + 2nd dozen 5.00 = 20.00; outcome preview per
  pocket group (19 +195.00 · red 13–24 +15.00 · other red ±0.00 · black 13–24 −5.00 · other incl. 0 −20.00;
  expected return 19.46 = 2.70% edge). Spin RL-88191, nonce 417, seed hash 8f3c1e…e813 (Seed Display values).
- Result: the Game/Roulette Wheel Result variant always shows 19 Red, so Win = 19 with the demo bets (+195.00, balance
  9,410.30, session net +170.40) and Lose = the SAME spin with alternative DEMO bets on Black 10.00 + 1st 12 5.00 +
  Straight 26 5.00 (−20.00, balance 9,195.30, net −44.60) — showing that the seeds fix the pocket whatever you bet.
  Result frames clear the slip (Empty variant) and show a per-bet settlement card.
- Spinning locks the stake (Available 9,195.30), disables chips/felt, slip CTA Loading; motion 4.5 s, reduced motion = instant.
- RL-09: connection lost (spin settles server-side, no double charge), insufficient balance (DEMO account 4.20),
  bet above spot max (Bet Slip Over limit 1,200.00 > 1,000.00; never auto-changed), daily loss limit reached
  (RG/Session Bar Limit reached, paused until 28 Nov 2026 00:00 UTC, no 'raise limit' CTA), region restricted
  (withdraw stays primary, explicit "don't use a VPN or proxy", no bypass hint). Mobile region = focused page, no tab bar.
- Fees: game bets carry 0.00 USDT fees (the 0.05 USDT platform fee is Global Pool only); "You can lose your stake" on
  every bet surface; house edge 2.70% stated for every bet type; licence + 18+ + RG links in every frame.
- History (RL-06): 10 spins today RL-88182…RL-88191, staked 136.00, returned 323.00, net +187.00 (DEMO, Pool Roulette
  only); Chart/Heat Strip last 50 spins #88,141–#88,190 with the independence note.
- PF (RL-08): pocket = floor(f × 37) with f from the first 4 bytes of HMAC-SHA256(server seed, client seed:nonce);
  0.528137… × 37 = 19.54 → 19. Mobile builds the verifier inline (Game/Provably Fair Verifier is 520 wide).
Component gaps: outside-bet box / felt, chip tray, outcome preview, settlement card, mobile vertical felt, mobile
verifier, inline bet-type sheet; Game/Roulette Wheel lacks a result-number property; Game/History Strip (Roulette)
sequence is fixed (19 first) and may not match the mobile last-results row (19, 26, 14, 0, 32, 17, 8, 23).
