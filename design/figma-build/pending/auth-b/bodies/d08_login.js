for (const MODE of ['Default', 'Wrong code', 'Locked']) { const { sec, fr, db, X } = await START('AUTH-08 2FA Challenge — Login / 1440 / ' + MODE, 3);
const bg = await LOBBYBG(fr, db, { auth: 'Guest', top: 'Guest', label: 'guest lobby behind sign-in dialog' });
const LOCK = MODE === 'Locked';
const panel = await PANEL({ over: 'TWO-STEP SIGN-IN', title: LOCK ? 'We paused sign-in to protect your balance' : 'One more step to keep your funds safe', sub: LOCK ? 'Five incorrect codes in a row looks like someone guessing. Your funds, entries and withdrawals are untouched.' : 'Your password was correct. Now confirm it’s really you with the code from your phone.', artName: 'this sign-in + authenticator phone (DEMO)', art: async (a) => { BLOCKS(a, LOCK ? 'status/danger' : 'brand/primary'); await PHONE(a, 236, 28, -7, {}); await DEVICECARD(a, 28, 48, 4); },
  body: async (b) => { add(b, [await BUL('shield-check', 'icon/brand', 'Signing in as Nova K.', 'n•••@example.com · MacBook Pro · Chrome · Lisbon, Portugal'), 'FILL'], [await BUL('alert-triangle', 'text/warning', 'Didn’t try to sign in just now?', 'Someone may know your password. Change it — without your phone they still can’t get in.'), 'FILL']); } });
const form = FORM();
await FHEAD(form, { back: 'Back to sign in', icon: LOCK ? 'lock' : 'smartphone', tone: LOCK ? 'danger' : 'brand', over: 'STEP 2 OF 2 · AUTHENTICATOR CODE', title: LOCK ? 'Too many incorrect codes' : 'Enter your 6-digit code', sub: LOCK ? 'Two-step sign-in is paused until 16:59 UTC (27 Nov 2026). You can try again then — nothing in your account has changed.' : 'Open your authenticator app and enter the current code for GLOBAL POOL (n•••@example.com).' });
const ap = COL('Anti-phishing code', [], { gap: 6, p: [12, 14, 12, 14], fill: 'surface/raised', stroke: 'border/subtle', r: 10 });
add(ap, [ROW('Code row', [await IC('shield-check', 16, 'icon/brand'), await T('Your anti-phishing code', 'Body/S', 'text/secondary'), [SPACER(), 'FILL'], ROW('Code chip', [await T('AURORA-27', 'Mono/S', 'text/brand')], { p: [2, 8, 2, 8], fill: 'brand/tint', r: 6 }), await DEMO('XS')], { gap: 8 }), 'FILL']);
add(ap, await P('Only GLOBAL POOL shows this code. Missing or different? Close this page and type globalpool.example yourself.', 'Caption', 'text/tertiary'));
if (LOCK) {
  const lc = COL('Lock status', [], { gap: 12, p: [16, 16, 16, 16], fill: 'status/danger-tint', stroke: 'status/danger', r: 14 });
  add(lc, [ROW('Head', [await IC('lock', 20, 'text/danger'), await T('Sign-in paused for 15 minutes', 'Body/S Strong', 'text/primary'), [SPACER(), 'FILL'], ROW('Countdown', [await IC('clock', 14, 'icon/muted'), await T('Try again in 14:52', 'Number/S', 'text/primary')], { gap: 6, p: [4, 10, 4, 10], fill: 'surface/raised', r: 9999 })], { gap: 10 }), 'FILL']);
  add(lc, await P('Locked at 16:44 UTC after 5 incorrect codes · unlocks automatically at 16:59 UTC. The countdown follows the real unlock time.', 'Body/S', 'text/secondary'));
  add(form, [lc, 'FILL']);
  add(form, await OTP('Disabled', 'Authenticator code', 'Available again at 16:59 UTC'));
  add(form, [ap, 'FILL']);
  add(form, [await BUL('mail', 'icon/brand', 'We emailed n•••@example.com about this', 'The email shows your anti-phishing code AURORA-27. If it’s missing, the email isn’t from us.'), 'FILL'], [await BUL('key', 'icon/brand', 'Lost your phone?', 'After the pause, sign in with one of your backup codes — or start account recovery now.'), 'FILL']);
  await ACTIONS(form, [await BTN('Ghost', 'Start account recovery', { size: 'L' })], [await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' })]);
} else {
  add(form, [ap, 'FILL']);
  add(form, await OTP(MODE === 'Wrong code' ? 'Error' : 'Complete', 'Authenticator code', 'Codes refresh every 30 seconds'));
  if (MODE === 'Wrong code') add(form, [await ALERT('warning', 'Check the clock on your phone', 'Authenticator codes depend on it. Turn on automatic date and time, then enter the newest code. After 5 incorrect codes in a row, sign-in pauses for 15 minutes.'), 'FILL']);
  add(form, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this browser for 30 days', 'Show description': false }), 'FILL']);
  add(form, [ROW('Links', [await LINK('Use a backup code', { lead: 'key' }), await T('·', 'Body/S', 'text/tertiary'), await LINK('Lost access to your authenticator?')], { gap: 10 }), 'FILL']);
  await ACTIONS(form, [await BTN('Ghost', 'Cancel', { size: 'L' })], [await BTN('Primary', 'Verify and sign in', { size: 'L', lead: 'log-in' })]);
}
await TWOPANE(fr, bg, panel, form, 'Dialog — Two-step sign-in (' + MODE + ')');
OUT.push(await FINISH(sec, fr, X)); }
