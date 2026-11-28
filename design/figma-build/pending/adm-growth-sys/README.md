# pending/adm-growth-sys — ADM-A1..A5, ADM-M1..M6, ADM-S1..S6 (page 09)

Status 28 Nov 2026: **slice complete — nothing left to run.** All scripts below already ran once; they are kept for reference / re-use.
Re-running a laptop or tablet script is safe: each clone/build checks the frame name first (`exists …` / "Frame already exists").

- `build.py` assembles `out/<name>.js` = helpers.js (verbatim) + `_laptop.js` (names starting with `l`) or `_tablet.js` (others) + body, then `node --check`.
- `_laptop.js` — laptop pass: clone a 1440 master → 1280 (Breakpoint mode "Laptop 1280"), generic reflow (FILL for overflowing children), KPI tile fixes (Sparkline FILL + vector rescale, Definition text wrap), overflow/collapse audits, `hideCols` / `setColW` for per-table column priorities.
- Order that ran: l1 (rename masters + A1–A5) → l1fix → l2 (M1–M4) → l3 (M5, M6 ×2, S1) → l4 (column fixes) → l5 (collapse audit, S2–S4) → l6 (A5 table fix, S2 matrix widths, S5–S6) → l7 (S3 Integrity alert + M2 Changes requested 1280) → t-s3 (S3 768) → v1 (verification; the full v1 timed out once on the section-wide screenshot, a light version ran instead).
- Column priorities hidden at 1280: A1 Players; A4 Network (chain mark stays in the address chip); A5 Risk (shown in the case panel); M2 Type; M3 Channels; M4 Channel; S1 Expires. S2 matrix cells 152 → 128.
