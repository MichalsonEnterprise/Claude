# pending/pub-14-18-20-23 — STATUS 28 Nov 2026 (continuation run 2): COMPLETE — do not run m1–m4

All 16 frames exist and passed screenshot verification (composed temporary-viewport screenshots, viewport removed afterwards).
- Desktop (page `03 — Public Website`, section 33:205847): FAQ Default 33:205848 · FAQ Search “withdraw” 33:242174 · FAQ No results “bonus code” 36:534066 ·
  RG Default 33:279676 · Restricted Default 33:323120 · Restricted Search “united” 34:356600 · Cookie Banner 34:396216 · Cookie Preferences modal 34:409284.
- Mobile (page `10 — Mobile Experience`, section `PUB-14/18/20/23 — Mobile` 34:435743): FAQ Default 34:435744 · FAQ Search “withdraw” 302:109456 ·
  FAQ No results “bonus code” 302:109738 · RG Default 34:472716 · Restricted Default “search & regions” 34:491926 · Restricted Search “united” 303:113051 ·
  Cookie Banner (bottom sheet) 36:503505 · Cookie Preferences (bottom sheet) 36:518622.
- The 3 new mobile states were cloned from the existing mobile Defaults (scripts in `done-28nov/`: helpers.js + common.js + faq.js / restricted.js / fix2.js).
  `m1-faq.js` … `m4-cookie.js` below are the OLD plan with different frame names — running them now would create duplicates.

# pending/pub-14-18-20-23 — PUB-14 / 18 / 20 / 23 mobile (390) frames

State on 28 Nov 2026 (continuation run, agent slice `pub-p1b`):
- **Desktop (page `03 — Public Website`, section `PUB-14/18/20/23 FAQ, RG, Restricted, Cookies` = 33:205847, X 60000)** — built by the interrupted earlier run, 8 frames:
  FAQ Default 33:205848 · FAQ Search “withdraw” 33:242174 · FAQ No results “bonus code” 36:534066 · RG Default 33:279676 ·
  Restricted Default 33:323120 · Restricted Search “united” 34:356600 · Cookie Banner 34:396216 (1440×1024 viewport) · Cookie Preferences modal 34:409284 (1440×1024 viewport).
- **Mobile (page `10 — Mobile Experience`, section `PUB-14/18/20/23 — Mobile`, X 35000, Y 0)** — NOT BUILT. The read-only inventory
  of page 10 and both retries hit the Figma MCP seat limit (3 in a row), so the section may or may not exist yet.

## How to run
1. Run `00-read.js` (read-only, paste as is). It returns the page-10 section's frames and the desktop copy.
2. Align the data arrays with the desktop copy if they differ (FAQ `CATS` + `RES` in `m1-faq.js`, countries `REG` + `HITS` + `BADGE_MAP`
   in `m3-restricted.js`, `COOKIE_TITLE/BODY` + `CATS` in `m4-cookie.js`), then `python3 build.py` (assembles helpers.js + prelude-m.js + body into `out/`).
3. Run `out/m1-faq.js`, `out/m2-rg.js`, `out/m3-restricted.js`, `out/m4-cookie.js` in order (each < 32k chars, one page switch,
   ends with node.screenshot + an overflow audit). Skip a script whose frames already exist with auto height.
4. Check each returned `audits[].overflow` (text running outside the 390 frame) and `notes` (library instances that did not fit 358 px:
   Card/FAQ Item, RG/Help Resources, Control/Toggle — `fitInst()` tries FILL on the overflowing inner layers first).

## Design notes (mobile)
- Shell: DEMOBAR with the short message (decision #29) → Shell/Topbar Mobile Guest → content 358 (16 gutters) → Shell/Footer Mega Mobile → Nav/Mobile Tab Bar (Home).
- FAQ: Input/Search M (no ⌘K), horizontally scrolling Tabs/Pill row (All, Fees, Deposits & withdrawals, Global Pool, Fairness, KYC & security, Restrictions), categories as stacked Card/FAQ Item accordions (first expanded with a DEMO worked example), help + RG cards; search = matched term highlighted in mint semi-bold, per-category result counts; empty = suggestions (Menu/Filter Chip) + popular questions.
- RG: 18+ strip, Set your limits / Take a break, four tool cards (limits with 351.75 / 500.00 USDT DEMO usage, reality check −24.60 USDT DEMO, cooling-off, self-exclusion), PGSI self-assessment teaser with unselected Control/Radio options, warning signs, RG/Help Resources + 3 more organisations, minors, commitments.
- Restricted countries: your-region card (Portugal · Permitted, DEMO), legend (status = icon + label via Badge/Status relabelled Permitted / Limited / Restricted), search + status pills, region groups (Europe, Americas, Asia-Pacific, Middle East & Africa; 18 DEMO rows, binding list published by the operator), why + “Travelling?” card with “don’t use a VPN or proxy” (no bypass hint). Search “united” = 3 Restricted hits + United States detail (still available / not available).
- Cookies: fixed 390×844 viewports over a lobby preview. Banner = non-blocking card above the tab bar with three identical Secondary L buttons (Accept all / Reject non-essential / Preferences) — no close icon, nothing pre-set. Preferences = bottom sheet over scrim: Essential On + Disabled (always on), Preferences / Analytics / Marketing Off by default, Reject non-essential + Accept all side by side (equal weight) + Save my choices; body clips to a scroll area if the sheet exceeds 772 px.
