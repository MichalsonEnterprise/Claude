# catalog-screens (GM-02..08) — remaining work: visual verification only

All frames already exist (see ../../registry-catalog-screens.json). Read-only audit on 28 Nov 2026
(audit08.js / audit10.js) confirmed: 16 desktop frames on "08 — Games" in section
"GM-02..08 Catalogue & more originals" (32:99912) and 8 mobile frames on "10 — Mobile Experience"
in "Games — Mobile Catalogue" (34:497641); every frame is hug-height (primaryAxisSizingMode AUTO),
no placeholder text, no empty text, DEMO badges present. Text flagged as "clipped" sits only inside
intentional horizontal-scroll tracks (related-games carousel "Track", "Pills (scroll)",
"Category pills (scroll)", "Run strip (scroll)").

Still to do: visual screenshot check (blocked by the Figma MCP tool-call limit on 28 Nov 2026).
Run, read-only, one per use_figma call, in this order:
shot08_0.js (GM-02 x3) · shot08_1.js (GM-03 x3) · shot08_2.js (GM-04 x2 + GM-05 Win) ·
shot08_3.js (GM-05 Lose + GM-06 x2) · shot08_4.js (GM-07 x2 + GM-08 Playing) · shot08_5.js (GM-08 Result) ·
shot10_0.js (mobile GM-02 x2, GM-03, GM-04, GM-05) · shot10_1.js (mobile GM-06, GM-07, GM-08).
Check in particular: GM-02 Restricted region (desktop 33:186210 has 7 DEMO badges vs 39 in Default;
mobile 36:504732 has 3 vs 36) — confirm restricted tiles still mark illustrative numbers as DEMO.
If all pass, mark GM-02..GM-08 VERIFIED.
