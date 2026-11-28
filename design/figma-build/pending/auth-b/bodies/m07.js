for (const STEP of (typeof M07 !== 'undefined' ? M07 : [0, 1, 2])) { const NM = ['Step 1 Set up', 'Step 2 Confirm', 'Step 3 Backup codes'][STEP]; const { sec, fr, db, X } = await START('AUTH-07 2FA Enrollment — ' + NM + ' / 390 / Default', STEP, { mobile: true });
const { c } = await MPAGE(fr);
add(c, [ROW('Back row', [await LINK(STEP ? 'Back' : 'Security', { lead: 'arrow-left', c: 'text/secondary', ic: 'icon/muted' }), [SPACER(), 'FILL'], await T('Step ' + (STEP + 1) + ' of 3', 'Label/S', 'text/brand')], { gap: 8, p: [4, 0, 0, 0] }), 'FILL']);
add(c, [SEG(3, STEP), 'FILL']);
const hd = COL('Title', [], { gap: 8 }); add(c, [hd, 'FILL']);
if (STEP === 0) {
  add(hd, await P('Add GLOBAL POOL to your authenticator app', 'Heading/H4', 'text/primary'), await P('You’re on your phone, so there’s nothing to scan — add the key straight to your app.', 'Body/S', 'text/secondary'));
  add(c, [await BTN('Primary', 'Open authenticator app', { size: 'L', lead: 'external-link' }), 'FILL']);
  add(c, [await NOTE('info', 'Opens your default authenticator app with GLOBAL POOL and the key filled in. Come back here afterwards.'), 'FILL']);
  add(c, [await DIVROW('or add the key manually'), 'FILL']);
  const k = COL('Setup key', [], { gap: 12, p: 16, fill: 'surface/raised', stroke: 'border/default', r: 14 });
  add(k, [ROW('Head', [await T('Setup key', 'Label/M', 'text/primary'), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']);
  add(k, await P('JBSW Y3DP EHPK 3PXP KQ2T 7MNA', 'Mono/M', 'text/primary', { name: 'Setup key value' }));
  add(k, [await KV2('Account name', 'GLOBAL POOL (n•••@example.com)'), 'FILL'], [await KV2('Type', 'Time-based (TOTP) · 6 digits · every 30 s'), 'FILL']);
  add(k, [await BTN('Secondary', 'Copy key', { lead: 'copy' }), 'FILL']);
  add(c, [k, 'FILL']);
  add(c, [ROW('Option — QR for another device', [await TILE('qr-code', 'neutral', 36), COL('T', [await T('Setting up on another device?', 'Body/S Strong', 'text/primary'), await P('Show the QR code to scan with a tablet or second phone', 'Caption', 'text/tertiary')], { gap: 2 }), await IC('chevron-down', 20, 'icon/muted')], { gap: 12, p: [12, 16, 12, 12], fill: 'surface/default', stroke: 'border/subtle', r: 10 }), 'FILL']);
  c.children[c.children.length - 1].children[1].layoutSizingHorizontal = 'FILL';
  add(c, [await ALERT('info', 'Any TOTP authenticator app works', 'We don’t offer SMS codes — they can be stolen with a SIM swap.'), 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Next: enter code', { size: 'L', trail: 'arrow-right' })]);
} else if (STEP === 1) {
  add(hd, await P('Enter the 6-digit code', 'Heading/H4', 'text/primary'), await P('Switch to your authenticator app, copy the code under “GLOBAL POOL” and paste it here.', 'Body/S', 'text/secondary'));
  add(c, await OTP('Complete', 'Authenticator code', 'Changes every 30 seconds'));
  add(c, ROW('Paste', [await LINK('Paste code', { lead: 'copy' })], { gap: 8 }));
  add(c, [await NOTE('clock', 'Code rejected? Codes depend on your phone’s clock — turn on automatic date and time, then use the newest code.'), 'FILL']);
  const pr = COL('What 2FA protects', [], { gap: 14, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
  add(pr, await T('We’ll ask for a code when you:', 'Label/M', 'text/primary'));
  add(pr, [await BUL('log-in', 'icon/brand', 'Sign in on a new device', null), 'FILL'], [await BUL('withdraw', 'icon/brand', 'Withdraw or add a withdrawal address', null), 'FILL'], [await BUL('key', 'icon/brand', 'Change password, email or 2FA', null), 'FILL']);
  add(c, [pr, 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Verify and turn on', { size: 'L', lead: 'shield-check' })]);
} else {
  add(c, [await ALERT('success', 'Two-step sign-in is on', 'Turned on 27 Nov 2026, 16:31 UTC.'), 'FILL']);
  add(hd, await P('Save your 10 backup codes', 'Heading/H4', 'text/primary'), await P('Each code signs you in once if you lose your phone. This is the only time we show them.', 'Body/S', 'text/secondary'));
  const cc = COL('Backup codes card', [], { gap: 12, p: 16, fill: 'bg/secondary', stroke: 'border/default', r: 14 });
  add(cc, [ROW('Head', [await IC('key', 16, 'icon/brand'), await T('Backup codes', 'Label/M', 'text/primary'), [SPACER(), 'FILL'], await DEMO('S')], { gap: 8 }), 'FILL']);
  const CODES = ['4F7K-2QXM', '9TRB-H3LC', 'P2WD-8KZN', '6YHM-Q4TA', 'C8XJ-5RVE', 'M3NP-7GUB', 'T6QZ-1WKD', 'H9AE-3SLF', 'X4KC-6PVR', 'B7UD-2NQY'];
  const grid = ROW('Codes grid (2 × 5, monospace)', [], { gap: 8, align: 'MIN' });
  for (let q = 0; q < 2; q++) { const colm = COL('Column ' + (q + 1), [], { gap: 6 }); for (let i = 0; i < 5; i++) { const n = q * 5 + i; add(colm, [ROW('Code ' + (n + 1), [await T(String(n + 1).padStart(2, '0'), 'Mono/S', 'text/tertiary'), await T(CODES[n], 'Mono/S', 'text/primary')], { gap: 8, p: [8, 10, 8, 10], fill: 'surface/default', stroke: 'border/subtle', r: 6 }), 'FILL']); } add(grid, [colm, 'FILL']); }
  add(cc, [grid, 'FILL']);
  add(cc, [ROW('Code actions', [[await BTN('Secondary', 'Download', { lead: 'download' }), 'FILL'], [await BTN('Secondary', 'Copy all', { lead: 'copy' }), 'FILL']], { gap: 8 }), 'FILL']);
  add(c, [cc, 'FILL']);
  add(c, [await ALERT('warning', 'Keep them offline and private', 'Use a password manager or paper — not screenshots. We’ll never ask you for them.'), 'FILL']);
  add(c, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I’ve saved my backup codes somewhere safe', 'Show description': false }), 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Finish setup', { size: 'L', state: 'Disabled' }), await P('Available once you tick the box above.', 'Caption', 'text/tertiary', { align: 'CENTER' })]);
}
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }
