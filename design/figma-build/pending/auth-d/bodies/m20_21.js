await FRAME('[AUTH-20] Session Expired / Re-auth Modal / 390 / Session expired (default)', 8, { mobile: true }, async ({ fr, db }) => {
  const bg = await MBG(fr, { auth: 'Member', tab: 'Home' });
  const s = await SHEET('Session expired');
  await SHEAD(s, 'You were signed out');
  add(s, [ROW('Lead', [await TILE('clock', 'warning', 40), await P('No activity for 30 minutes (last 18:12 UTC). Sign in again to pick up where you left off.', 'Body/S', 'text/secondary')], { gap: 12 }), 'FILL']);
  add(s, [ROW('Account', [await I('9:238', { Size: 'S' }, { Initials: 'NK', 'Show status': false }), COL('Who', [await T('Nova K.', 'Body/S Strong', 'text/primary'), await T('n•••@example.com', 'Caption', 'text/tertiary')], { gap: 0 }), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 10, p: [10, 12, 10, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 12 }), 'FILL']);
  add(s, [await PWD('Password', 'Focus', 'Empty'), 'FILL']);
  add(s, [ROW('Links', [await LINK('Forgot password?', { st: 'Label/S' }), [SPACER(), 'FILL'], await LINK('Use wallet instead', { st: 'Label/S', lead: 'wallet' })], { gap: 8 }), 'FILL']);
  add(s, [await NOTE('shield-check', 'Nothing changed while you were away — balances, 35 entries in round #1,248 and WD-20931 are as you left them.', { ic: 'text/success' }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Sign in again', { size: 'L', lead: 'log-in' }), await BTN('Ghost', 'Sign out completely', { size: 'L' })]);
  MPLACE(fr, db, bg, s);
});
await FRAME('[AUTH-21] New-device Login Alert / 390 / Default', 9, { mobile: true }, async ({ fr, db }) => {
  const bg = await MBG(fr, { auth: 'Member', tab: 'Account' });
  const s = await SHEET('New-device alert');
  await SHEAD(s, 'Was this you?');
  add(s, [ROW('Lead', [await TILE('shield-alert', 'warning', 40), await P('New sign-in from a device and place we haven’t seen before.', 'Body/S', 'text/secondary')], { gap: 12 }), 'FILL']);
  add(s, [await BOX('Sign-in details', [await KV('Device', 'Windows PC · Edge'), await KV('Location', 'Madrid, Spain (approx.)'), await KV('IP', '85.48.•••.12', { vs: 'Mono/S', demo: true }), await KV('When', '25 Nov 2026, 21:14 UTC', { line: false })]), 'FILL']);
  add(s, [await BUL('shield-check', 'text/success', 'Nothing has moved', 'No withdrawals or new addresses from that device.'), 'FILL']);
  add(s, [await NOTE('info', '“Secure my account” signs that device out, asks for a new password and shows your whitelisted addresses to check.'), 'FILL']);
  await STICKY(s, [await BTN('Danger', 'No, secure my account', { size: 'L', lead: 'lock' }), await BTN('Secondary', 'Yes, it was me', { size: 'L', lead: 'check' })]);
  MPLACE(fr, db, bg, s);
});
