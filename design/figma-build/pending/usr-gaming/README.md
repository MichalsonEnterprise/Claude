# pending/usr-gaming — USR-G1..G7 Gaming (continuation runs, 28 Nov 2026)

STATE: COMPLETE — all frames exist and were screenshot-verified in the 2nd continuation run. Nothing left to run.
- Desktop 1440 (page 05, section `USR-G1..G7 Gaming` 32:97624): 14 frames (G1 D; G2 D/Empty/Filters; G3 Live/Empty; G4 D; G5 Owed/Settled; G6 D/Filters/Export; G7 D/Empty).
- Mobile 390 (page 10, section `USR — Mobile B` 34:432314): 15 frames (G1 D; G2 D/Empty/Filters; G3 Live/Empty; G4 D; G5 Owed/Settled; G6 D/Export/Filters; G7 D/Empty).

Scripts in out/ (all already APPLIED — do NOT re-run unless the frames are missing):
- 01–03 first continuation (G1 390, G7 390 D/E, G2 390 Filters + G6 390 Export) — idempotent (remove-by-name then rebuild; new ids).
- 04 fix G6 390 Export filename — applied (also included in 07).
- 05 reconcile desktop G2–G5 copy with demo-data (rounds #1,247/#1,246, #1,245 purchase time, VIP reward auto-settle 30 Nov, G4 proof cell).
  NOT idempotent: it swaps two 'Recently settled' rows in G5 Settled — re-running would swap them back.
- 06 desktop G5 timeline text wrap (idempotent).
- 07 reconcile mobile G2–G5 copy + fix 04. NOT idempotent (row swap in G5 Settled).
- 08 clean rebuild of `[USR-G6] Game History / 390 / Filters` (final compact version; idempotent, new id). Current frame: 229:241469.
- 09 compaction of 229:241469 + G6 390 Default session-strip wrap (already reflected in src/m_g6f.js; the strip fix is idempotent).

Sources: src/kit.js + src/m_*.js (mobile frames, assembled with helpers.js prepended — see build.py), src/edit_*.js / fix*_body.js (edits), src/audit.js (read-only clipping/off-canvas/placeholder audit used before screenshots).
