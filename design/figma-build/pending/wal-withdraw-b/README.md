# wal-withdraw-b — WAL-15..19 (withdraw steps 6–9) build scripts

Build: `python3 build.py` → `out/<name>.js` (helpers.js verbatim + pruned `_common.js` + shell + builders + body). Check: `node _mock-run.cjs out/*.js`.
Every script is idempotent (removes its own frames by name before rebuilding) and ends with in-script screenshots.

Run order (one use_figma call each):
1. d15 — WAL-15 desktop Pass / KYC required / Flagged ............ DONE (91:27628, 91:28512, 91:29357)
2. d16 — WAL-16 desktop Default / Wrong code / Locked ............. DONE (97:31028, 97:31941, 97:32764); OTP texts fixed in a follow-up
3. d17 — WAL-17 desktop Processing / Queued / Manual review + fix16 ... DONE (102:38421, 102:39385, 102:40262)
4. d1819 — WAL-18 + WAL-19 desktop ................................ DONE (106:42078, 106:42965, 106:43781)
5. t — tablet 768 defaults ×5 .................................... DONE (107:43927, 107:44258, 107:44556, 107:45009, 107:45350)
6. m1 — mobile WAL-15 Pass / KYC, WAL-16 sheet / Locked ............ DONE (109:50782, 109:50998, 109:51244, 109:51440)
7. m2 — mobile WAL-17 Processing / Manual review, WAL-18 ........... DONE (110:51357, 110:51566, 110:51788)
8. m3 — mobile WAL-19 sanctions / network ......................... DONE (111:52935, 111:53169)

All 26 frames built and screenshot-verified on 28 Nov 2026 (sections 91:27627 on page 06, 109:50781 on page 10).

Known component facts learned here: Input/OTP has extra per-variant texts (Status text "Verifying code…" + spinner, Resend timer, Error "That code didn't match. 4 attempts left.", Disabled "Too many attempts. Try again in 14:59.") — `fixOtp()` rewrites or hides them. Hidden instance children become inaccessible in use_figma (skipInvisibleInstanceChildren) — never touch a node after hiding it. Nav/Stepper Mobile layers: 'Current label', 'Progress text', 'Next step', rectangles 'Segment 1'…'Segment 9'.
