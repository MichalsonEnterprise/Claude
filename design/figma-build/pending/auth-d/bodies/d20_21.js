for (const MODE of ['Session expired (default)', 'Re-auth — sensitive action']) {
await FRAME('[AUTH-20] Session Expired / Re-auth Modal / 1440 / ' + MODE, 8, {}, async ({ fr, db }) => {
  const RE = MODE.startsWith('Re-auth');
  const bg = await LOBBYBG(fr, db, RE ? { label: 'member wallet page behind re-auth modal', content: async (col) => { const c = COL('Whitelisted addresses page (behind modal)', [], { gap: 24, p: 32 }); add(col, [c, 'FILL']); add(c, await T('Wallet  /  Whitelisted addresses', 'Caption', 'text/tertiary'), await T('Add a withdrawal address', 'Heading/H2', 'text/primary')); const k = COL('Add address card', [], { gap: 20, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 720 }); add(k, [await I('15:3617', { State: 'New address' }, { Label: 'New withdrawal address', 'Show network': true }), 'FILL']); add(k, [await INPUT('Label (optional)', 'Cold wallet', 'Filled', { icon: false }), 'FILL']); add(c, k); add(c, await I('14:1974', { Layout: 'Card' }, { 'Show DEMO': true })); } } : { label: 'member lobby frozen after inactivity' });
  const d = DIALOG(fr, { dir: 'VERTICAL', w: 480, name: 'Modal — ' + MODE }); HUGH(d); await fx(d, 'Elevation/4 — Modal');
  const form = COL('Modal body', [], { gap: 20, p: [24, 28, 28, 28] }); add(d, [form, 'FILL']);
  add(form, [ROW('Modal top', [await TILE(RE ? 'shield-check' : 'clock', RE ? 'brand' : 'warning', 48), [SPACER(), 'FILL'], await XBTN()], { gap: 8, align: 'MIN' }), 'FILL']);
  const hd = COL('Header', [], { gap: 8 }); add(hd, await T(RE ? 'CONFIRM IT’S YOU' : 'SESSION EXPIRED', 'Overline', RE ? 'text/brand' : 'text/warning'));
  add(hd, await P(RE ? 'Re-enter your password to add a withdrawal address' : 'You were signed out to keep your account safe', 'Heading/H4', 'text/primary'));
  add(hd, await P(RE ? 'Your last security check was 3 h 20 min ago (15:27 UTC). Changes to withdrawal addresses need a fresh one — it protects you if someone picks up an unlocked device.' : 'No activity for 30 minutes — last activity 27 Nov 2026, 18:12 UTC. Sign in again and we’ll bring you back to where you were.', 'Body/S', 'text/secondary')); add(form, [hd, 'FILL']);
  const acct = ROW('Account', [await I('9:238', { Size: 'M' }, { Initials: 'NK', 'Show status': false }), COL('Who', [await T('Nova K.', 'Body/S Strong', 'text/primary'), await T('n•••@example.com · GP-48213', 'Caption', 'text/tertiary')], { gap: 0 }), [SPACER(), 'FILL'], await DEMO('XS'), await LINK(RE ? 'Sign out' : 'Not you?', { st: 'Label/S' })], { gap: 12, p: [10, 14, 10, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 12 }); add(form, [acct, 'FILL']);
  if (RE) add(form, [await BOX('Change you’re confirming', [await KV('Action', 'Add whitelisted address'), await KV('Address · Arbitrum One', '0x3f9a…c47E', { vs: 'Mono/S', demo: true }), await KV('First withdrawal possible', '28 Nov 2026, 18:47 UTC (24 h cooldown)', { line: false })]), 'FILL']);
  add(form, [await PWD('Password', 'Focus', 'Empty'), 'FILL']);
  if (RE) add(form, await OTP('Empty', 'Authenticator code', 'Enter the 6-digit code from your authenticator app'));
  add(form, [ROW('Links', [await LINK('Forgot password?', { st: 'Label/S' }), await T('·', 'Body/S', 'text/tertiary'), await LINK(RE ? 'Lost your authenticator?' : 'Use wallet signature instead', { st: 'Label/S', lead: RE ? null : 'wallet' })], { gap: 10 }), 'FILL']);
  if (!RE) add(form, [await ALERT('success', 'Nothing changed while you were away', 'Your balances, 35 entries in round #1,248 (closes 20:00 UTC) and withdrawal WD-20931 are exactly as you left them.', { icon: 'shield-check' }), 'FILL']);
  const act = ROW('Actions', [[await BTN(RE ? 'Ghost' : 'Ghost', RE ? 'Cancel' : 'Sign out completely', { size: 'L' }), 'FILL'], [await BTN('Primary', RE ? 'Add address' : 'Sign in again', { size: 'L', lead: RE ? 'shield-check' : 'log-in' }), 'FILL']], { gap: 12, p: [16, 0, 0, 0] }); strokeSides(act, 'border/subtle', { t: 1 }); add(form, [act, 'FILL']);
  add(form, [await NOTE('info', RE ? 'We email you whenever a withdrawal address is added. Inactivity sign-out: 30 min; security changes ask again after 15 min.' : 'After your password we’ll ask for your authenticator code. Timeout and remembered page are set in Security settings.'), 'FILL']);
  CENTER(fr, d, bg);
}); }
await FRAME('[AUTH-21] New-device Login Alert / 1440 / Default', 9, {}, async ({ fr, db }) => {
  const bg = await LOBBYBG(fr, db, { label: 'member lobby behind security alert' });
  const panel = await PANEL({ over: 'SECURITY ALERT', oicon: 'shield-alert', title: 'We noticed a sign-in we haven’t seen before', sub: 'We show this on your trusted devices and email you too, so you can react within minutes.', artName: 'alert email + new device (DEMO)', artH: 300,
    art: async (a) => { BLOCKS(a, 'status/warning'); await MAILCARD(a, 30, 20, -5, { w: 260, subject: 'New sign-in from Windows · Edge in Madrid', code: 'AURORA-27', lines: ['25 Nov 2026, 21:14 UTC'] }); await NEWDEVCARD(a, 176, 150, 4); },
    body: async (b) => { add(b, [await BUL('mail', 'icon/brand', 'Also emailed to n•••@example.com', 'The email shows your anti-phishing code AURORA-27. No code — it isn’t from us.'), 'FILL'], [await BUL('shield-check', 'icon/brand', 'Nothing has moved', 'No withdrawals were requested and no addresses were added from that device.'), 'FILL']); } });
  const form = FORM();
  await FHEAD(form, { icon: 'shield-alert', tone: 'warning', over: 'NEW DEVICE · NEEDS YOUR ANSWER', title: 'Was this you?', sub: 'Someone signed in to your account from a device and location we haven’t seen before.' });
  add(form, [await BOX('Sign-in details', [await KV('Device', 'Windows PC · Edge 131'), await KV('Location', 'Madrid, Spain (approximate)'), await KV('IP address', '85.48.•••.12', { vs: 'Mono/S', demo: true }), await KV('When', '25 Nov 2026, 21:14 UTC'), await KV('Signed in with', 'Password + authenticator code', { line: false })]), 'FILL']);
  add(form, [await NOTE('info', 'Location is estimated from the IP address and can be off by tens of kilometres — mobile and office networks often show another city.'), 'FILL']);
  const nm = COL('If it wasn’t you', [], { gap: 10, p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(nm, await T('“Secure my account” will:', 'Label/M', 'text/primary'));
  let i = 1; for (const [t, dd] of [['Sign out Windows · Edge right away', 'and every other session except this one'], ['Ask you to set a new password', 'your 2FA stays on'], ['Show your whitelisted addresses to check', 'you can remove any you don’t recognise']]) add(nm, [await NUMSTEP(i++, 'next', t, dd), 'FILL']);
  add(form, [nm, 'FILL']);
  const act = COL('Answer — equal weight', [[await BTN('Secondary', 'Yes, it was me', { size: 'L', lead: 'check' }), 'FILL'], [await BTN('Danger', 'No, secure my account', { size: 'L', lead: 'lock' }), 'FILL']], { gap: 10, p: [20, 0, 0, 0] }); strokeSides(act, 'border/subtle', { t: 1 }); add(form, [act, 'FILL']);
  add(form, [await NOTE('clock', 'Not sure? Choose “No” — you can always add the device back later from Security › Devices.'), 'FILL']);
  await TWOPANE(fr, bg, panel, form, 'Dialog — New-device login alert');
});
