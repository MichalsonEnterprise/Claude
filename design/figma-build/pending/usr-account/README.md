# usr-account — USR-A1..A10 Account & security (+ MOB-09 Mobile Account Security)

Prepared, idempotent use_figma scripts. STATUS 28 Nov 2026 ~03:10 UTC: COMPLETE — 20 desktop + 15 mobile frames, all screenshot-checked except the full height of mobile 36:510785 (see RUN-ORDER.json). D1–D7 / M-scripts are kept for reference only.
Earlier status (~02:15 UTC): the probe showed that the interrupted earlier run had already built **all 20 desktop frames**
(section 32:72712) and 4 mobile frames (A1 Edit, A2, A3 Manage (On), A3 Enable). Its desktop layout used 10 columns, so the
section is 15,720 wide and overlaps `USR-F1..F6` at X=36000 — `out/R1_desktop_layout_fix.js` moves A6–A10 into a second band.
**Do not run D1–D7** (the earlier run's state names differ from these builders, so they would add duplicates).
Run `out/M1…M3` (11 missing mobile frames, they follow the earlier run's naming `[USR-Ax · MOB-09] …`) and then R1, per RUN-ORDER.json.

## Layout
- Desktop: page `05 — User Dashboard`, section `USR-A1..A10 Account & security` at X=24000, Y=0.
  The section has only ~12,000 px before `USR-F1..F6 Financial history` (X=36000), so it is split into **two bands**:
  band 0 = A1, A2, A3, A4, A5 (columns x = 120 + col×1560), band 1 = A6, A7, A8, A9, A10 (same columns) starting 480 px
  below the bottom of band 0. States stack below their default (+160). Section width ≈ 7,920.
- Mobile: page `10 — Mobile Experience`, section `USR — Mobile C` at X=105000 (columns x = 120 + col×510, 11 columns ≈ 5,730 wide;
  `USR — Mobile D` starts at X=112000). Col 0 hub, 1 A1, 2 A2, 3 A3, 4 A4, 5 A5, 6 A6, 7 A7, 8 A8, 9 A9, 10 A10.
  MOB-09 frames (A2/A3/A7/A8 + hub) carry the `MOB-09 · ` prefix. Bottom-sheet states are fixed 844 px phone viewports.

## Page anatomy (desktop)
DEMOBAR → Body [Shell/Sidebar Expanded·Member (no item active — account is reached from the avatar menu) | column:
Shell/Topbar Desktop Member → Content 32 px: breadcrumb (Account › group › page), H2 + sub, DEMO M + actions,
[in-page **Account sub-nav** 256 (Shell/Sidebar Item instances, groups Profile / Security / Verification) | Main 856]]
→ Notice/Licence Inline. Modals are inline Modal/Base anatomy (Modal/Base body is a fixed slot) over scrim/overlay,
except 2FA Disable which uses Modal/Danger (its default copy is the "Turn off 2FA" example).

## Rebuild
`python3 asm.py` reassembles `out/` from `src/` (helpers.js verbatim + kit_core.js + kit_d.js|kit_m.js + builders) and
syntax/size-checks each script. Set `FORCE = true` in `src/kit_core.js` to replace frames that already exist.

## Probe-dependent details (check P0_probe output, then adjust src/ if needed)
- User/Session Row: only the 'Session' text layer is known; other per-variant texts are overridden by layer names Meta/Details/Location if they exist.
- Toast Success: overridden by layer names Title / Body / Description.
- Control/Toggle width: the A9 desktop matrix puts each toggle in a 112 px cell.
- Input/Text value/helper layers: 'Value text' / 'Helper text' (from registry).
