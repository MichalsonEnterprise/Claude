# proto-a — PRO-01..05 prototypes (P0) — STATUS: DONE (28 Nov 2026)

Everything in this folder has been run successfully; nothing is pending.

- Desktop: page "11 — Prototypes", section "PRO-01..05 Prototypes (P0)" (252:962) at X 0 / Y 0.
  Flow sub-sections sit side by side (not stacked) because the parallel proto-b section
  "PRO-06..10 Prototypes (P1)" sits directly below this parent.
- Mobile: page "10 — Mobile Experience", section "PRO — Mobile" (263:205224) at X 245000 / Y 0,
  flow sub-sections stacked vertically.

How to rebuild one flow (idempotent: the script deletes and rebuilds its own "PRO-0n …" sub-section):
1. `python3 assemble.py spec0N.js out.js` (desktop) or `python3 assemble.py mspec0N.js out.js` (mobile).
   assemble.py = helpers.js + spec + lib.js + screenshot tail. Keep each script < 50k chars.
2. Pass the full content of out.js as use_figma code.
3. Re-run the verify pass afterwards (verify11.js for page 11; the mobile variant is inline in the
   report: same logic with parent "PRO — Mobile", vertical restack, logo fallback [16,40,120,40]).
   It reads settled heights, fixes fallback logo hotspots, refits/restacks sections and reports
   reactions per frame, broken destinations and unreachable frames.

Spec format: steps (happy path, left→right), branches ({from, under?, route:'top'?}), links
[frameKey, hotspotLabel, x, y, w, h, destKey] (or {text,minY,maxY,up} to locate by text),
keys [frameKey, digit, destKey] (frame-level ON_KEY_DOWN), timeouts [frameKey, seconds, destKey].
lib_desktop_final.js = lib as used for the desktop runs; lib.js = final lib (desktop + mobile).
