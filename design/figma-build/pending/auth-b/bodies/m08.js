for (const MODE of (typeof M08 !== 'undefined' ? M08 : ['Login Default', 'Login Locked', 'Withdrawal Default'])) { const WD = MODE.startsWith('Withdrawal'), LOCK = MODE.endsWith('Locked');
const { sec, fr, db, X } = await START('AUTH-08 2FA Challenge — ' + (WD ? 'Withdrawal' : 'Login') + ' / 390 / ' + (LOCK ? 'Locked' : 'Default'), WD ? 4 : 3, { mobile: true });
const bg = await MBG(fr, WD ? { auth: 'Member', tab: 'Wallet', content: async (c) => { add(c, await P('Withdraw USDT', 'Heading/H4', 'text/primary')); add(c, [await I('14:1974', { Layout: 'Compact' }, { 'Show DEMO': true }), 'FILL']); } } : { auth: 'Guest', tab: 'Home' });
const s = await SHEET(MODE);
await SHEAD(s, WD ? 'Confirm withdrawal' : LOCK ? 'Sign-in paused' : 'Two-step sign-in', { back: !WD });
const ap = ROW('Anti-phishing code', [await IC('shield-check', 16, 'icon/brand'), await T('Anti-phishing code', 'Caption', 'text/secondary'), [SPACER(), 'FILL'], ROW('Code chip', [await T('AURORA-27', 'Mono/S', 'text/brand')], { p: [2, 8, 2, 8], fill: 'brand/tint', r: 6 }), await DEMO('XS')], { gap: 8, p: [10, 12, 10, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 10 });
if (WD) {
  const k = COL('Withdrawal summary', [], { gap: 0, p: [4, 14, 4, 14], fill: 'bg/secondary', stroke: 'border/subtle', r: 12 });
  add(k, [await KV('Withdrawal', 'WD-20931', { vs: 'Mono/S', demo: true }), 'FILL'], [await KV('Amount', '1,500.00 USDT', { vs: 'Number/S' }), 'FILL'], [await KV('To · Arbitrum', '0x7c4e…a21D', { vs: 'Mono/S' }), 'FILL'], [await KV('Network fee', '0.08 USDT'), 'FILL'], [await KV('You receive', '1,499.92 USDT', { vs: 'Number/S', vc: 'balance/available', line: false }), 'FILL']);
  add(s, [k, 'FILL']); add(s, [ap, 'FILL']);
  add(s, await OTP('Complete', 'Authenticator code', 'Codes refresh every 30 seconds'));
  add(s, [ROW('Links', [await LINK('Use backup code', { lead: 'key' }), [SPACER(), 'FILL'], await LINK('Lost your device?', { c: 'text/secondary' })], { gap: 8 }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Confirm withdrawal', { size: 'L' }), await BTN('Ghost', 'Cancel', { size: 'L' })]);
} else if (LOCK) {
  const lc = COL('Lock status', [], { gap: 10, p: 14, fill: 'status/danger-tint', stroke: 'status/danger', r: 12 });
  add(lc, [ROW('Head', [await IC('lock', 20, 'text/danger'), await T('Too many incorrect codes', 'Body/S Strong', 'text/primary')], { gap: 10 }), 'FILL']);
  add(lc, await P('Two-step sign-in is paused until 16:59 UTC (27 Nov 2026). Nothing in your account changed.', 'Body/S', 'text/secondary'));
  add(lc, ROW('Countdown', [await IC('clock', 14, 'icon/muted'), await T('Try again in 14:52', 'Number/S', 'text/primary')], { gap: 6, p: [4, 10, 4, 10], fill: 'surface/raised', r: 9999 }));
  add(s, [lc, 'FILL']);
  add(s, await OTP('Disabled', 'Authenticator code', 'Available again at 16:59 UTC'));
  add(s, [await BUL('mail', 'icon/brand', 'We emailed n•••@example.com', 'It shows your anti-phishing code AURORA-27. No code — not from us.'), 'FILL'], [await BUL('key', 'icon/brand', 'Lost your phone?', 'After the pause, use a backup code — or start account recovery.'), 'FILL']);
  await STICKY(s, [await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' }), await BTN('Ghost', 'Start account recovery', { size: 'L' })]);
} else {
  add(s, await P('Enter the code from your authenticator app for GLOBAL POOL (n•••@example.com).', 'Body/S', 'text/secondary'));
  add(s, [ap, 'FILL']);
  add(s, await OTP('Complete', 'Authenticator code', 'Codes refresh every 30 seconds'));
  add(s, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this phone for 30 days', 'Show description': false }), 'FILL']);
  add(s, [ROW('Links', [await LINK('Use backup code', { lead: 'key' }), [SPACER(), 'FILL'], await LINK('Lost your device?', { c: 'text/secondary' })], { gap: 8 }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Verify and sign in', { size: 'L', lead: 'log-in' })]);
}
MPLACE(fr, db, bg, s);
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }
