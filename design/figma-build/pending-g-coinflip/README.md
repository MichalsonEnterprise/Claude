# g-coinflip (CF-01..CF-06) — run order for the next continuation

Status as of 28 Nov 2026 (continuation run stopped after 3 Figma MCP limit errors in a row):

- Page "08 — Games", section "CF Coinflip" (36:535476): ALL desktop + tablet frames exist (scripts 01–05 ran).
  CF-01 1440 36:535477 · CF-02 1440 90:62010 · CF-03 1440 Win 90:62838 / Lose 90:63652 · CF-04 1440 94:67170 ·
  CF-05 1440 Verified 94:68249 / Failed 94:69000 · CF-06 1440 Insufficient 92:63915 / Loss limit 92:64713 /
  Region 92:65610 / Connection lost 92:66530 / Above max 92:67339 · CF-01 768 95:68989. All hug height (AUTO).
- Page "10 — Mobile Experience", section "Games — Mobile Coinflip": NOT inspected (limit). Script 06 appears to have
  run (script 09 references its frames 104:48933, 104:49252, 104:49572, 104:49901 = CF-01/02/03 Win/Lose at 390).

## Next steps
1. Run `10_GUARDED_mobile_cf06-cf04-cf05.js` (one call). It lists the mobile section first and returns
   `inventoryBefore` + `counts`; it stops with `stop:` if the CF-01/CF-02 390 base frames are missing (then run
   `06_mobile_cf01-cf03.js` first and re-run 10), returns `done:` if everything is there, otherwise builds only the
   missing block(s): CF-06 ×4 states at x=2670 and/or CF-04 + CF-05 at x=1650/2160, with screenshots.
   Scripts 07/08/09 are superseded by 10 (09 = 07+08 combined; 10 = 09 + guards).
2. Run `11_verify_desktop_readonly.js` (read-only) to screenshot the 13 desktop/tablet frames for verification.

## DONE — continuation run 28 Nov 2026 (all CF frames built + VERIFIED)
- Mobile section "Games — Mobile Coinflip" (104:48932) now holds 10 frames: CF-01 104:48933 · CF-02 104:49252 ·
  CF-03 Win 104:49572 / Lose 104:49901 · CF-04 288:203530 · CF-05 Verified 288:203895 · CF-06 Insufficient 287:201075 /
  Loss limit 287:201425 / Region 287:201779 / Connection lost 287:202101.
- Script 10 was run in two passes (out/10a_cf06-mobile-only.js, then out/10b_cf04-cf05-mobile-only.js); both are guarded,
  so re-running either returns `done:`. Do NOT run 06–10 again.
- Fixes applied after verification: CF-04/CF-05 390 got the RG session strip + Licence/18+ line (cloned from CF-03 Lose 390);
  CF-05 390 "Computed" rows got an 8px bound gap (label "SHA-256(revealed seed)" → "Seed hash check"); desktop CF-06 Region
  restricted sidebar locale "English · Portugal" → "English · United States".
- All 13 desktop/tablet + 10 mobile frames screenshotted and checked (no overflow, no placeholders, DEMO badges present).
