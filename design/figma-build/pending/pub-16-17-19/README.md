# pending/pub-16-17-19 — PUB-16 Terms & Conditions · PUB-17 Privacy Policy · PUB-19 AML/KYC Policy (slice `pub-legal`)

## STATUS 28 Nov 2026: COMPLETE (all frames built and screenshot-verified). Do not rerun unless a frame is deleted.

Built in Figma file QHF8iRUMFgGMcEn3bD25jl:
- Page `03 — Public Website`, section `PUB-16/17/19 Legal documents` **335:236364** (X 90000, Y 0, 6630 × 8152):
  - Doc header 335:236365
  - **Template/Legal Document** component set **335:237300** — Breakpoint=Desktop 335:236368 (1136 × 5951), Breakpoint=Mobile 335:236849 (358 × 7696). Defaults = Terms copy.
  - `[PUB-16] Terms & Conditions / 1440 / Default — long-form (logged out)` 336:238828 (x 1950)
  - `[PUB-17] Privacy Policy / 1440 / Default — long-form (logged out)` 337:123899 (x 3510)
  - `[PUB-19] AML/KYC Policy / 1440 / Default — long-form (logged out)` 337:125150 (x 5070)
- Page `10 — Mobile Experience`, section `PUB-16/17/19 — Mobile` **338:117637** (X 56000, Y 0):
  - `[PUB-16] Terms & Conditions / 390 / Default — long-form, contents collapsed` 338:117638
  - `[PUB-16] Terms & Conditions / 390 / Contents expanded (viewport 390×844, scrolled to contents)` 341:182984 (below the default)
  - `[PUB-17] Privacy Policy / 390 / Default — long-form, contents collapsed` 339:118342
  - `[PUB-19] AML/KYC Policy / 390 / Default — long-form, contents collapsed` 340:118936

## Files
- `data/terms.js`, `data/privacy.js`, `data/aml.js` — the document copy (single source; edit here, then rebuild).
- `lib.js` (helpers for this slice), `shots.js` (temporary-viewport screenshots + overflow audit), `tpl.js` (component builder), `frames.js` (apply overrides + desktop/mobile frame builders).
- `main-t1.js` (section + template set, idempotent), `main-d.js` (desktop frames), `main-m.js` (mobile frames), `main-mx.js` (mobile contents-expanded viewport).
- `build.py` assembles `out/*.js` = helpers.js verbatim + lib + shots + (tpl | frames) + data + main (each < 50k). `tpl_id.txt` holds the set id baked into the frame scripts.
- `_mock-run.cjs out/<file>.js` dry-runs a script against a Plugin API mock.

## Rerun order (only for missing frames — each frame script replaces a frame with the same name)
1. `out/t1-template.js` (reuses the set if it exists) → 2. `out/d-terms.js`, `out/d-privacy.js`, `out/d-aml.js` (one per call: two desktop frames + screenshots in one call exceeded the 60 s MCP timeout, although the call finished) → 3. `out/m-terms.js`, `out/m-privacy.js`, `out/m-aml.js` → 4. `out/mx-terms.js`.

## Updating copy later
Change `data/*.js`, `python3 build.py`, rerun the matching `d-*` / `m-*` script. Changing template structure: edit `tpl.js`, delete the set in Figma first (instances would detach) — prefer editing the main component in place.
