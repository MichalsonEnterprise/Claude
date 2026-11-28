# pub-p1a — PUB-05/08/09/13 (Winners Hall, How It Works, Networks, Security Center)

Desktop/tablet frames already exist on page 03, section 'PUB-05/08/09/13 Winners, How it works, Networks, Security' (33:149513):
PUB-05 1440 Default 33:149514 · Filtered 33:196810 · Empty 33:219380 · 768 Default 34:394740 · 768 Empty 34:407847;
PUB-08 1440 Default 33:245465; PUB-09 1440 Default — Arbitrum details 33:281751 · Ethereum details (congested) 33:318074; PUB-13 1440 Default 34:345543.

Mobile 390 frames go on page '10 — Mobile Experience', section 'PUB-05/08/09/13 — Mobile' (X=28000, Y=0).
Scripts are idempotent: each frame is skipped when a frame matching its name pattern already exists in the section.
Build: `python3 build.py` -> out/<name>.js (helpers.js + mlib.js + body). Dry run: `node ../g-roulette/mock.cjs out/<name>.js`.
Run order: out/m1-winners.js (Default, Filters sheet, Empty; also returns a text dump of the desktop frames) -> out/m2-hiw.js -> out/m3-networks.js -> out/m4-security.js.

## Status 28 Nov 2026 (continuation run)
All 16 frames already existed from the interrupted run (mobile section 34:423942 at page 10). The m1..m4 scripts were NOT needed (m1 ran and skipped all three Winners frames).
Verification: out/audit-p10.js and out/audit-p03.js (read-only: text render bounds vs clipping ancestors + overview screenshots) -> 0 flags on 16 frames.
Fix applied: AURORA-27 (demo user's personal anti-phishing code) -> SUNSET-42 on public Security Center 390 (36:523783). Desktop 1440 Security Center fixed too (34:346290 + Card/Security Score override I34:346378;23:17056). Optional polish still pending: out/fix-p10-label.js (mobile label "Your code:" -> "Example code:").
