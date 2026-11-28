# pending/auth-c — AUTH-11..17 KYC (desktop page 04 + mobile page 10)

Rebuild: `python3 build.py [name ...]` → out/<name>.js = helpers.js + (_lib.js | _mlib.js) + <name>.js.
Run order: d-auth-11, d-auth-12, d-auth-13, d-auth-14, d-auth-15-16, d-auth-17, m-auth-11-12, m-auth-13, m-auth-14, m-auth-15-17.
Every script skips frames whose name already exists in the section, so re-running is safe.

Status 28 Nov 2026 (continuation run):
- Section "AUTH-11..17 KYC" created on page 04 (id 128:55648).
- DONE + screenshot-verified: d-auth-11 (128:55999), d-auth-12 (130:69057, 130:70575), d-auth-13 (131:128471, 131:129981, 131:131529), d-auth-14 (132:75343, 132:76801, 132:78270).
- Edits in this run: _mlib.js mobile DEMO bar uses the short message "DEMO DATA — illustrative values only" (decision #29); AUTH-17 Resubmit (desktop + mobile) "Submit again" is Disabled until the unchecked accuracy confirmation is ticked.
- Remaining at time of writing: d-auth-15-16, d-auth-17, all m-* scripts (see the final report for the latest state).
