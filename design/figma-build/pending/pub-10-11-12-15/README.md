# pending/pub-10-11-12-15 — PUB-10 VIP, PUB-11 Affiliates, PUB-12 About, PUB-15 Contact

Status (28 Nov 2026, continuation run): ALL FRAMES BUILT AND SCREENSHOT-VERIFIED in Figma.
Nothing is pending. The scripts are kept so the frames can be rebuilt.

Sources: `prelude-desktop.js`, `prelude-mobile.js` + one body per frame (`*-d.js` desktop, `*-m.js` mobile,
`contact-states.js` = the 4 desktop Contact states). `orig/` = the versions from the first (interrupted) run,
before the copy was reconciled with demo-data (VIP extras / referral rules).

Assembled, ready-to-run use_figma scripts (`helpers.js` + prelude + body) in `out/`, run in this order:
1. `01-vip-d-b.full.js`  — VIP desktop part B (needs part A frame 36:530716; throws if part B already applied)
2. `02-aff-d.full.js`    — Affiliate desktop (replaces the frame by name)
3. `03-about-d.full.js`  — About desktop (replaces by name)
4. `04-contact-d.full.js`— Contact desktop default (replaces by name)
5. `05-contact-states.full.js` — 4 Contact desktop states (cloned from 4; replaces by name)
6. `06-vip-m.full.js` … `09-contact-m.full.js` — mobile 390 frames on page 10 (replace by name; contact-m also builds its 3 states)

Rebuild: `cat ../../helpers.js prelude-desktop.js <body>.js > out/<n>.full.js` (vip-d-b has its own prelude:
`cat ../../helpers.js vip-d-b.js`), mobile bodies use `prelude-mobile.js`.
