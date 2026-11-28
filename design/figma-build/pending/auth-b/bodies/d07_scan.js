{ const { sec, fr, db, X } = await START('AUTH-07 2FA Enrollment — Step 1 Scan / 1440 / Default', 0);
const bg = await LOBBYBG(fr, db, { label: 'member lobby behind 2FA setup dialog' });
const panel = await PANEL({ over: 'ACCOUNT SECURITY', title: 'Add a second lock to your account', sub: 'After setup, a new-device sign-in, every withdrawal and any security change will also ask for a 6-digit code from your phone.', artName: 'phone with authenticator app (DEMO)', art: async (a) => { BLOCKS(a); await PHONE(a, 206, 28, -7, { entries: [['Mail', 'nova.k@…', '105 772', false], ['Cloud drive', 'nova.k', '660 318', false], ['Add account', 'Scan a QR code', '+', false]] }); },
  body: async (b) => { add(b, [await NUMSTEP(1, 'now', 'Scan the QR code', 'Adds GLOBAL POOL to your authenticator app'), 'FILL'], [await NUMSTEP(2, 'next', 'Enter the 6-digit code', 'Proves the app and your account are in sync'), 'FILL'], [await NUMSTEP(3, 'next', 'Save 10 backup codes', 'Your way back in if you lose your phone'), 'FILL']); } });
const form = FORM();
await FHEAD(form, { step: 'STEP 1 OF 3 · SCAN', seg: [3, 0], title: 'Scan this QR code with your authenticator app', sub: 'In your authenticator app tap “+” or “Add account”, choose “Scan a QR code” and point your camera at the code.' });
const qr = COL('QR code (illustrative)', [], { gap: 0, p: 12, fill: 'paper/0', r: 14 }); add(qr, await QR(168, 7));
const kc = COL('Manual setup key', [], { gap: 12 });
add(kc, ROW('Head', [await T('Can’t scan it?', 'Label/M', 'text/primary'), await DEMO('XS')], { gap: 8 }));
add(kc, await P('Choose “Enter a setup key” in your app and type:', 'Body/S', 'text/secondary'));
add(kc, [ROW('Setup key', [await P('JBSW Y3DP EHPK\n3PXP KQ2T 7MNA', 'Mono/M', 'text/primary', { name: 'Setup key value' }), await IBTN('copy')], { gap: 8, p: [10, 8, 10, 14], fill: 'surface/raised', stroke: 'border/default', r: 10 }), 'FILL']);
add(kc, [await KV2('Account name', 'GLOBAL POOL (n•••@example.com)'), 'FILL'], [await KV2('Type', 'Time-based (TOTP) · 6 digits · every 30 s'), 'FILL']);
add(form, [ROW('Scan row', [qr, [kc, 'FILL']], { gap: 24, align: 'MIN' }), 'FILL']);
add(form, [await NOTE('info', 'QR code and key shown here are illustrative DEMO values. Your real key is unique to your account and is never shown again after setup.'), 'FILL']);
add(form, [await ALERT('info', 'Any TOTP authenticator app works', 'For example Google Authenticator, Microsoft Authenticator, 1Password or Bitwarden. We don’t offer SMS codes — they can be stolen with a SIM swap.'), 'FILL']);
await ACTIONS(form, [await BTN('Ghost', 'Not now', { size: 'L' })], [await BTN('Primary', 'Next: enter code', { size: 'L', trail: 'arrow-right' })]);
await TWOPANE(fr, bg, panel, form, 'Dialog — Set up two-step sign-in (step 1 of 3)');
OUT.push(await FINISH(sec, fr, X)); }
