async function a3(STATE) {
const LBL = { Enabled: 'Enabled — manage', Off: 'Enable — 2FA off (DEMO account before setup)', Disable: 'Disable — confirm', Reset: 'Reset — move to a new phone' };
const NAME = '[USR-A3] Two-Factor Authentication / 1440 / ' + LBL[STATE];
const sk = skipIf(sec, NAME); if (sk) return sk;
const OFF = STATE === 'Off';
const S = await shellA(NAME, 'Two-factor authentication', { sub: 'A 6-digit code from your authenticator app protects sign-ins on new devices, withdrawals and security changes. We don’t offer SMS codes — SIM-swap attacks make them unsafe.' });
const M = S.main;
if (OFF) {
  const wb = AL('HORIZONTAL', { name: 'Warning — 2FA off', gap: 16, p: 20, fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default'), r: 14, align: 'CENTER' }); add(M, [wb, 'FILL']);
  wb.appendChild(await iconTile('shield-alert', tk('status/warning', 'icon/default'), 40, 'surface/default'));
  const wt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(wb, [wt, 'FILL']);
  add(wt, [await T('Two-factor authentication is off', 'Body/M Strong', 'text/primary', { w: 600 }), 'FILL']);
  add(wt, [await T('You need it before your first withdrawal or a sign-in from a new device. Setting it up takes about 2 minutes and doesn’t affect your balance.', 'Body/S', 'text/secondary', { w: 600 }), 'FILL']);
  wb.appendChild(await DEMO('S'));
}
const st = await tryy('2FA status', () => I('23:5644', { State: OFF ? 'Off' : 'On' }));
if (st) { const w = card('Card — 2FA status', { p: 20 }); add(M, [w, 'FILL']); add(w, [st, 'FILL']); }
if (OFF) {
  const su = card('Card — Set up 2FA', { gap: 20 }); add(M, [su, 'FILL']);
  await head(su, 'Turn on 2FA in 3 steps', 'Use any authenticator app that supports time-based codes (TOTP). Keep this page open until you’ve saved your backup codes.', CW, [await DEMO('S')]);
  const steps = AL('HORIZONTAL', { name: 'Steps', gap: 16 }); add(su, [steps, 'FILL']);
  const SW = Math.floor((CW - 32) / 3);
  async function step(n, title, body) { const c = card('Step ' + n + ' — ' + title, { gap: 12, p: 20, fill: 'surface/raised' }); add(steps, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(c, [h, 'FILL']); const nb = AL('HORIZONTAL', { name: 'Number', w: 28, h: 28, r: 9999, fill: 'brand/tint', align: 'CENTER', justify: 'CENTER' }); nb.appendChild(await T(String(n), 'Label/M', 'text/brand')); h.appendChild(nb); add(h, [await T(title, 'Label/L', 'text/primary'), 'FILL']); add(c, [await T(body, 'Body/S', 'text/secondary', { w: SW - 40 }), 'FILL']); return c; }
  const s1 = await step(1, 'Get an authenticator app', 'Install a TOTP authenticator on your phone. Codes work offline and change every 30 seconds.');
  add(s1, [await bullet('smartphone', 'One phone at a time', 'Moving later? Use “Move to a new phone” here.', SW - 40), 'FILL']);
  const s2 = await step(2, 'Scan this code', 'Can’t scan? Enter the setup key by hand.');
  const qw = AL('HORIZONTAL', { name: 'QR wrap', justify: 'CENTER', p: 12, fill: 'surface/default', r: 10 }); add(s2, [qw, 'FILL']); qw.appendChild(qrArt(152));
  const kr = AL('HORIZONTAL', { name: 'Setup key', gap: 8, align: 'CENTER' }); add(s2, [kr, 'FILL']); add(kr, [await T('K7QH 2MXA 9PLD R4TE', 'Mono/S', 'text/primary'), 'FILL']); kr.appendChild(await btnIcon('copy')); kr.appendChild(await DEMO('XS'));
  const s3 = await step(3, 'Enter the 6-digit code', 'From your app, before it refreshes.');
  const otp = await tryy('otp', async () => { const o = await I('16:3761', { State: 'Empty' }, { Label: 'Authenticator code', Description: 'Codes refresh every 30 s' }); return o; }); if (otp) add(s3, [otp, 'FILL']);
  add(s3, [await BTN('Primary', 'Verify and turn on', { size: 'M', state: 'Disabled' }), 'FILL']);
  add(su, [await noteBox('info', 'Next you’ll get 10 single-use backup codes. Save them offline — they’re the only way back in if you lose your phone without starting account recovery.', 'info', CW), 'FILL']);
  const wy = card('Card — Where 2FA is asked', { gap: 12 }); add(M, [wy, 'FILL']);
  await head(wy, 'Where we’ll ask for a code', null, CW);
  for (const t of ['Signing in on a new device or browser', 'Every withdrawal, and adding a withdrawal address', 'Changing your password, email, anti-phishing code or 2FA']) add(wy, [await check(t, true, CW), 'FILL']);
  add(wy, [await T('Protective actions — ending sessions, revoking devices, lowering limits — never ask for a code.', 'Body/S', 'text/tertiary', { w: CW }), 'FILL']);
} else {
  const ap = card('Card — Your authenticator', { gap: 0 }); add(M, [ap, 'FILL']);
  await head(ap, 'Your authenticator', null, CW, [await DEMO('S')]);
  const sp = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(ap, [sp, 'FILL']);
  add(ap, [await srow('smartphone', 'Authenticator app (TOTP) on iPhone 15', 'Added 3 Sep 2026 · last used 27 Nov 2026, 18:43 UTC to confirm withdrawal WD-20931', [await chip('check-circle', 'Active', 'success'), await BTN('Secondary', 'Move to a new phone', { size: 'S', lead: 'refresh' })], { tw: 360 }), 'FILL']);
  const bc = AL('VERTICAL', { name: 'Backup codes', gap: 12, p: [16, 0, 16, 0] }); strokeSides(bc, 'border/subtle', { t: 1 }); add(ap, [bc, 'FILL']);
  const bh = AL('HORIZONTAL', { name: 'Header', gap: 16, align: 'CENTER' }); add(bc, [bh, 'FILL']); bh.appendChild(await iconTile('key', 'icon/brand', 40));
  const bt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(bh, [bt, 'FILL']); add(bt, [await T('Backup codes · 8 of 10 unused', 'Body/M Strong', 'text/primary', { w: 400 }), 'FILL']); add(bt, [await T('Generated 3 Sep 2026. Each code works once. Generating new codes cancels the old ones.', 'Body/S', 'text/secondary', { w: 400 }), 'FILL']);
  bh.appendChild(await BTN('Secondary', 'Show codes', { size: 'S', lead: 'eye' })); bh.appendChild(await BTN('Ghost', 'Generate new', { size: 'S' }));
  const mw = AL('HORIZONTAL', { name: 'Meter row', gap: 12, align: 'CENTER', p: [0, 0, 0, 56] }); add(bc, [mw, 'FILL']); mw.appendChild(meter(320, 0.8)); mw.appendChild(await T('8 / 10', 'Number/S', 'text/primary')); mw.appendChild(await DEMO('XS'));
  const off = AL('HORIZONTAL', { name: 'Turn off', gap: 16, align: 'CENTER', p: [16, 0, 0, 0] }); strokeSides(off, 'border/subtle', { t: 1 }); add(ap, [off, 'FILL']);
  add(off, [await T('Turning 2FA off pauses withdrawals until you set it up again. We’ll email you to confirm.', 'Body/S', 'text/tertiary', { w: 480 }), 'FILL']); off.appendChild(await BTN('Danger', 'Turn off 2FA', { size: 'S' }));
  const row = AL('HORIZONTAL', { name: 'Info row', gap: 24 }); add(M, [row, 'FILL']);
  const HW = Math.floor((MW - 24) / 2) - 48;
  const wy = card('Card — Where 2FA is asked', { gap: 12 }); add(row, [wy, 'FILL']); wy.layoutSizingVertical = 'FILL';
  wy.appendChild(await T('Where we ask for a code', 'Heading/H5', 'text/primary'));
  for (const t of ['New device or browser sign-in', 'Every withdrawal and new withdrawal address', 'Password, email, anti-phishing or 2FA changes']) add(wy, [await check(t, true, HW), 'FILL']);
  add(wy, [await T('Ending sessions, revoking devices and lowering limits never need a code.', 'Body/S', 'text/tertiary', { w: HW }), 'FILL']);
  const lp = card('Card — Lost your phone', { gap: 12 }); add(row, [lp, 'FILL']); lp.layoutSizingVertical = 'FILL';
  lp.appendChild(await T('Lost your phone?', 'Heading/H5', 'text/primary'));
  add(lp, [await bullet('key', 'Use a backup code', 'Sign in with one of your 8 unused codes, then move 2FA to your new phone.', HW), 'FILL']);
  add(lp, [await bullet('user-check', 'No codes left? Start account recovery', 'Identity check, then a 48-hour security cooling-off before withdrawals. Your balance stays safe meanwhile.', HW, 'icon/muted'), 'FILL']);
  lp.appendChild(await BTN('Ghost', 'Start account recovery', { size: 'S', trail: 'chevron-right' }));
}
await footA(S);
if (STATE === 'Disable') {
  const md = await tryy('Modal/Danger', () => I('25:15811', { State: 'Default' }));
  if (md) await overlay(S, md, 200);
} else if (STATE === 'Reset') {
  const { m, bd, ft, W } = await modalBox('Move 2FA to a new phone', 'Confirm it’s you, then scan a new code with the new phone. Your current app keeps working until the new one is confirmed.', 560);
  const steps = AL('HORIZONTAL', { name: 'Progress', gap: 8, align: 'CENTER' }); add(bd, [steps, 'FILL']);
  for (const [i, l, on] of [[1, 'Confirm it’s you', true], [2, 'Scan on new phone', false], [3, 'Enter new code', false]]) { const s = AL('HORIZONTAL', { name: 'Step ' + i, gap: 6, align: 'CENTER', p: [4, 10, 4, 6], r: 9999, fill: on ? 'brand/tint' : 'surface/raised' }); const nb = AL('HORIZONTAL', { name: 'n', w: 20, h: 20, r: 9999, fill: on ? 'brand/primary' : 'surface/default', align: 'CENTER', justify: 'CENTER' }); nb.appendChild(await T(String(i), 'Label/S', on ? 'text/on-primary' : 'text/tertiary')); s.appendChild(nb); s.appendChild(await T(l, 'Label/S', on ? 'text/brand' : 'text/tertiary')); steps.appendChild(s); }
  const ch = AL('VERTICAL', { name: 'Method', gap: 8 }); add(bd, [ch, 'FILL']);
  const r1 = await tryy('radio1', () => I('20:3259', { Selected: 'Yes', State: 'Default' }, { Label: 'I still have my current authenticator', Description: 'Enter a code from it below.', 'Show description': true })); if (r1) add(ch, [r1, 'FILL']);
  const r2 = await tryy('radio2', () => I('20:3259', { Selected: 'No', State: 'Default' }, { Label: 'I lost it — use a backup code', Description: '8 unused codes left. Each works once.', 'Show description': true })); if (r2) add(ch, [r2, 'FILL']);
  const otp = await tryy('otp', () => I('16:3761', { State: 'Complete' }, { Label: 'Code from your current authenticator', Description: 'Anti-phishing code AURORA-27 · we’ll never ask for this code by email or chat' })); if (otp) add(bd, [otp, 'FILL']);
  add(bd, [await noteBox('hourglass', 'After the move, withdrawals pause for 24 hours as a security cool-down (until 28 Nov 2026, 18:52 UTC). Deposits, play and your balance aren’t affected. Your backup codes are replaced.', 'pending', W), 'FILL']);
  const d = AL('HORIZONTAL', { name: 'DEMO', gap: 8, align: 'CENTER' }); add(bd, [d, 'FILL']); add(d, [await T('Times and codes are illustrative.', 'Caption', 'text/tertiary'), 'FILL']); d.appendChild(await DEMO('XS'));
  ft.appendChild(await BTN('Secondary', 'Cancel', { size: 'M' })); ft.appendChild(await BTN('Primary', 'Continue', { size: 'M', trail: 'arrow-right' }));
  await overlay(S, m, 168);
}
await place(S.f, sec, 2, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}
