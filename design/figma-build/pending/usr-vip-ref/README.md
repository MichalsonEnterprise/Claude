# Pending scripts — agent usr-vip-ref (USR-V1..V4 VIP + USR-R1..R5 Referrals, desktop + mobile)

Not run: the shared Figma MCP seat (Pro, Full — 200 calls/day, 10/min) returned "tool call limit" on every attempt
(27 Nov 2026 22:5x, 23:01, 23:07 UTC and again 28 Nov 2026 00:00 UTC). No frame exists in Figma yet.

- `python3 build.py` assembles `out/*.js` = `../../helpers.js` (verbatim, current) + `lib.js` + `dlib.js` (desktop) or `mlib.js` (mobile) + bodies.
  Each body runs in its own `try { } catch` block and pushes `{id, name, h}` or `{body, err}` to `R`; every frame is screenshotted at 0.5×.
- Run each `out/*.js` ONCE with use_figma (fileKey QHF8iRUMFgGMcEn3bD25jl, skillNames figma-use,figma-generate-design), in this order
  (d2/d6/m4 clone frames built by the batch before them):
  1. `d1-v1-v2` → 2. `d2-v3-default-claimed` → 3. `d3-v4-r1` → 4. `d4-r2-r3` → 5. `d5-r4-r5` → 6. `d6-r5-modal-locked`
     (page "05 — User Dashboard", section "USR-V1..V4 VIP & USR-R1..R5 Referrals" at 48000,0; desktop row y=160, x = 120 + i×1560; states stacked below their default)
  7. `m1-v1-v2-v3` → 8. `m2-v4-r1-r2` → 9. `m3-r3-r4` → 10. `m4-r5-sheet`
     (page "10 — Mobile Experience", section "USR — Mobile E" at 119000,0; row y=160, x = 120 + i×510)
- Scripts are idempotent: a frame with the same name is removed and rebuilt (clone states re-clone from the current default).
- `MISS` in the return lists any instance text layer / property that was not found (layer names of Breadcrumb 'Crumb 1/2/Current page',
  Pagination 'Range', Badge/Status first text, Toast texts were taken from registry notes and could not be verified live). Fix by name and re-run that batch.
- `node _mock-run.cjs out/*.js` smoke-tests against a permissive Figma mock and prints any error caught inside a body
  (the "Source frame missing" errors for d-v3b / d-r5m / d-r5l / m-r5s are expected in the mock: it has no canvas).

Frames (22): see `../../registry-usr-vip-ref.json`. Inline-built pieces (no fitting library component): payout request modal body
(Modal/Base slot is fixed), payout bottom sheet (Sheet/Bottom content is fixed), bar charts (Chart/Bar holds fixed fee data), KPI tiles,
level ladder, tier-comparison table cells, funnel steps, privacy/alert callouts. Library instances used: Shell/Sidebar (VIP Club / Affiliates
set Active), Shell/Topbar Desktop/Mobile, Notice/Demo Data, Nav/Breadcrumb, Tabs/Underline, Tabs/Pill, Tabs/Segmented, Table/Header Cell,
Pagination, Badge/VIP, Badge/Status, Badge/DEMO, Badge/18+, Notice/Licence, Card/VIP Tier, Row/Carousel Header, Art/Spot (Crown, Coin),
Jackpot/Entry Ticket, User/Avatar, Input/Search, Control/Checkbox, Toast, Button/*, Button/Icon, Nav/Mobile Tab Bar, icons.
