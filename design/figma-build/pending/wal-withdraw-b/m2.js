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
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes };
