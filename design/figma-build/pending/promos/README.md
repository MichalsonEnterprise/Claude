# pending/promos — PROMO-01..05 continuation (28 Nov 2026)

Already built by the earlier promos run (ids in ../../registry-promos.json): all 13 desktop 1440 frames
(PROMO-01 Guest/Member, PROMO-04 Live/Ended on page 03; PROMO-02 Claimable/Claimed/Locked, PROMO-03 Claimable/Empty,
PROMO-05 Offer/Offer-terms-open/Active/Completed on page 05) and 10 mobile 390 frames on page 10.

DONE 28 Nov 2026 (frame 181:71623, verified). Was remaining: `[PROMO-01] Promotions hub / 390 / Member` (member hub changes layout materially: personal
"Ready to claim" card, bonus balance, weekly progress, promo list with live status).

RUN-ORDER: 1. out/m01-member.js (helpers.js + src/m01-member.body.js). Idempotent: returns {skipped:'exists'} if the
frame is already there. It also returns a read-only inventory of the three PROMO sections.
Rebuild after editing the source: `cat ../../helpers.js src/m01-member.body.js > out/m01-member.js`.

PROMO-02 Claimed at 390 is intentionally not built (state-only change, decision #16).
