// ===== BODY m2 — Mobile 390: WAL-17 Processing / Manual review, WAL-18 Successful =====
const M17 = 'WAL-17 Withdraw — Step 8 Pending / 390 / ', M18 = 'WAL-18 Withdraw — Step 9 Successful / 390 / Default';
const names = [M17 + 'Processing', M17 + 'Manual review', M18];
clean(names);
const out = {};
for (const [st, nm] of [['Processing', names[0]], ['Manual review', names[1]]]) {
  const S = await shellM(nm, 8, MX[2], st === 'Processing' ? 'Pending — sending' : 'Pending — under review', 'Done');
  const cta = await flow17(S.ct, st, 1);
  await footM(S.f, cta);
  out[nm] = S.f.id;
}
{ const S = await shellM(names[2], 9, MX[3], 'Withdrawal complete', null);
  const cta = await flow18(S.ct, 1);
  await footM(S.f, { next: 'Download receipt (PDF)', lead: 'download', trail: null, alt: [['Secondary', 'Back to wallet', 'wallet']] });
  out[names[2]] = S.f.id; }
fitSection(sec);
// fix m1 frames: shorter DEMO bar copy for 390 width, authenticator description no longer clipped
const fixm1 = {};
for (const id of ['109:50782', '109:50998', '109:51244', '109:51440']) {
  const f = await figma.getNodeByIdAsync(id); if (!f) continue;
  const bar = f.children[0]; if (bar && bar.type === 'INSTANCE') { const k = Object.keys(bar.componentProperties).find(x => x.split('#')[0] === 'Message'); if (k) bar.setProperties({ [k]: 'DEMO DATA — all figures are illustrative, not real.' }); }
  const au = f.findOne(x => x.type === 'INSTANCE' && x.name === 'Input/OTP — Authenticator code'); if (au) { const k = Object.keys(au.componentProperties).find(x => x.split('#')[0] === 'Description'); if (k) au.setProperties({ [k]: 'From your authenticator app · new code every 30 s' }); }
  fixm1[id] = true;
}
{ const f = await figma.getNodeByIdAsync('109:51244'); const sh = f && f.findOne(x => x.name === 'Bottom sheet — 2FA'); if (sh) { sh.y = 844 - sh.height; await f.screenshot({ scale: 0.6 }); } }
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes, fixm1 };
