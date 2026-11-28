// ===== BODY m1 — Mobile 390: WAL-15 Pass / KYC required, WAL-16 Default (bottom sheet) / Locked =====
const M15 = 'WAL-15 Withdraw — Step 6 Risk Validation / 390 / ', M16 = 'WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 390 / ';
const names = [M15 + 'Pass', M15 + 'KYC required — separate DEMO scenario (Level 1 account)', M16 + 'Default — 2FA bottom sheet', M16 + 'Locked (15 min)'];
clean(names);
const out = {};
for (const [st, nm] of [['Pass', names[0]], ['KYC', names[1]]]) {
  const S = await shellM(nm, 6, MX[0], 'Risk check', st === 'KYC' ? 'Verify identity, then 2FA' : '2FA confirmation');
  const cta = await flow15(S.ct, st, 1);
  await footM(S.f, cta);
  out[nm] = S.f.id;
}
{ const S = await shellM(names[2], 7, MX[1], 'Two-factor confirmation', 'Pending', { sheet: true });
  add(S.ct, [await alertBox('success', 'Security check passed', 'All 6 checks passed at 18:43 UTC.'), 'FILL']);
  await recap(S.ct, 1);
  const sh = await sheetM(S.f, '2FA');
  const cta = await flow16(sh, 'Default', 2);
  await sheetFoot(sh, cta);
  sh.x = 0; sh.y = 844 - sh.height;
  out[names[2]] = S.f.id; }
{ const S = await shellM(names[3], 7, MX[1], 'Two-factor confirmation', 'Pending');
  const cta = await flow16(S.ct, 'Locked', 1);
  await footM(S.f, cta);
  out[names[3]] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes };
