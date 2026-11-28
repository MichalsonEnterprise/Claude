{ const { sec, fr, db, X } = await START('AUTH-07 2FA Enrollment — Step 2 Confirm / 1440 / Default', 1);
const bg = await LOBBYBG(fr, db, { label: 'member lobby behind 2FA setup dialog' });
const panel = await PANEL({ over: 'ACCOUNT SECURITY', title: 'Add a second lock to your account', sub: 'GLOBAL POOL is now in your authenticator app. Enter the code it shows to finish linking it.', artName: 'phone with authenticator app (DEMO)', art: async (a) => { BLOCKS(a); await PHONE(a, 206, 28, -7, {}); },
  body: async (b) => { add(b, [await NUMSTEP(1, 'done', 'Scan the QR code', 'GLOBAL POOL added to your app'), 'FILL'], [await NUMSTEP(2, 'now', 'Enter the 6-digit code', 'Proves the app and your account are in sync'), 'FILL'], [await NUMSTEP(3, 'next', 'Save 10 backup codes', 'Your way back in if you lose your phone'), 'FILL']); } });
const form = FORM();
await FHEAD(form, { step: 'STEP 2 OF 3 · CONFIRM', seg: [3, 1], title: 'Enter the 6-digit code from your app', sub: 'Look for “GLOBAL POOL — n•••@example.com” in your authenticator app. The code changes every 30 seconds.' });
add(form, await OTP('Complete', 'Authenticator code', 'Type or paste the current 6-digit code'));
add(form, [await NOTE('clock', 'Code rejected? Codes depend on your phone’s clock — turn on automatic date and time, then use the newest code.'), 'FILL']);
const pr = COL('What 2FA protects', [], { gap: 14, p: 20, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
add(pr, await T('Once it’s on, we’ll ask for a code when you:', 'Label/M', 'text/primary'));
add(pr, [await BUL('log-in', 'icon/brand', 'Sign in on a new device or browser', 'Trusted devices are remembered for up to 30 days, only if you choose so.'), 'FILL'], [await BUL('withdraw', 'icon/brand', 'Withdraw or add a withdrawal address', 'Every withdrawal, every time — new addresses also get a 24-hour cooldown.'), 'FILL'], [await BUL('key', 'icon/brand', 'Change your password, email or 2FA', 'Turning 2FA off also needs a code and is logged in your security history.'), 'FILL']);
add(form, [pr, 'FILL']);
await ACTIONS(form, [await BTN('Ghost', 'Back', { size: 'L', lead: 'arrow-left' })], [await BTN('Primary', 'Verify and turn on', { size: 'L', lead: 'shield-check' })]);
await TWOPANE(fr, bg, panel, form, 'Dialog — Set up two-step sign-in (step 2 of 3)');
OUT.push(await FINISH(sec, fr, X)); }
