# pending/auth-c — AUTH-11..17 KYC (desktop page 04 + mobile page 10)

Rebuild: `python3 build.py [name ...]` → out/<name>.js = helpers.js + (_lib.js | _mlib.js) + <name>.js.
Run order: d-auth-11, d-auth-12, d-auth-13, d-auth-14, d-auth-15-16, d-auth-17, m-auth-11-12, m-auth-13, m-auth-14, m-auth-15-17.
Every script skips frames whose name already exists in the section, so re-running is safe.

Status 28 Nov 2026 (continuation run):
- Section "AUTH-11..17 KYC" created on page 04 (id 128:55648).
- DONE + screenshot-verified (page 04): d-auth-11 (128:55999), d-auth-12 (130:69057, 130:70575), d-auth-13 (131:128471, 131:129981, 131:131529), d-auth-14 (132:75343, 132:76801, 132:78270), d-auth-15-16 (138:90288, 138:91699), d-auth-17 via d-auth-17fix (140:97309, 140:98769).
- d-auth-17fix.js = d-auth-17 + a one-off fix pass: empty horizontal 'Spacer' frames kept the 100 px default height (dialog header and card heads were too tall) → shrunk to 1 px in all 1440 frames, viewport/scrim refit, dialogs re-centred, columns restacked. _lib.js and all d-* bodies now create spacers with h: 1, so re-runs don't reintroduce it.
- Mobile section "AUTH — Mobile C" (page 10, id 141:60686): m-auth-11-12 done (141:60687, 141:60932, 141:61145), m-auth-13 done (142:61850, 142:62083, 142:62283).
- Edits in this run: _mlib.js mobile DEMO bar uses the short message "DEMO DATA — illustrative values only" (decision #29); AUTH-17 Resubmit (desktop + mobile) "Submit again" is Disabled until the unchecked accuracy confirmation is ticked.
- Mobile also done: m-auth-14 (145:62355, 145:62458, 145:62571), m-auth-15-17 (146:62519, 146:62687, 146:62871, 146:63059). Fix pass on page 10: flow-header title shortened to "Verification" in all 13 mobile frames (it wrapped next to the wider KYC chip); _mlib.js updated to match.
- ALL 26 FRAMES BUILT AND SCREENSHOT-VERIFIED (13 desktop on page 04, 13 mobile on page 10). Final read-only audits: no text overflow, dialogs inside frames, header rows 40 px (desktop) / 48 px (mobile).
- Nothing remains for this slice. No library components were created (no registry file).
