async function ma3d() {
const BASE = '[USR-A3 · MOB-09] Two-Factor Authentication / 390 / Manage (On)';
const NAME = '[USR-A3 · MOB-09] Two-Factor Authentication / 390 / Disable — bottom sheet';
const sk = skipIf(sec, NAME); if (sk) return sk;
const f = cloneBase(sec, BASE, NAME); if (!f) return { error: 'base frame missing: ' + BASE };
await sheetM(f, 'Turn off two-factor authentication?', 'Your account would be protected by your password and an email link only.', async (sh) => {
  const cq = AL('VERTICAL', { name: 'What changes', gap: 8, p: 12, fill: tk('status/danger-tint'), r: 10 }); add(sh, [cq, 'FILL']);
  for (const t of ['Withdrawals pause for 24 hours', 'Security score drops from 80 to 45', 'New sign-ins need only your password + email link']) add(cq, [await check(t, false, W - 24), 'FILL']);
  const ty = await tryy('type confirm', async () => { const i = await I('13:762', { State: 'Default', Size: 'L' }, { Label: 'Type CONFIRM to continue', 'Show label': true, 'Show leading icon': false, 'Show trailing icon': false, 'Show helper': false }); await byLayer(i, { 'Value text': 'CONFIRM' }); return i; }); if (ty) add(sh, [ty, 'FILL']);
  const otp = await tryy('otp', async () => { const o = await I('16:3761', { State: 'Empty' }, { Label: 'Authenticator code', Description: 'Anti-phishing code AURORA-27' }); const rt = o.findOne(n => n.name === 'Resend timer'); if (rt) rt.visible = false; return o; }); if (otp) add(sh, [otp, 'FILL']);
  add(sh, [await BTN('Danger', 'Turn off 2FA', { size: 'L', state: 'Disabled' }), 'FILL']);
  add(sh, [await BTN('Secondary', 'Keep 2FA on', { size: 'L' }), 'FILL']);
  add(sh, [await T('We’ll email n•••@example.com to confirm.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
});
await placeM(f, sec, 2); await shotOf(f);
return { frame: f.id, name: NAME, h: Math.round(f.height) };
}
