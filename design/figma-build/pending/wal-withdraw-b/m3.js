// ===== BODY m3 — Mobile 390: WAL-19 Failed — sanctions / network failure =====
const M19 = 'WAL-19 Withdraw — Step 9 Failed / 390 / ';
const names = [M19 + 'Rejected by sanctions screening (alternative outcome)', M19 + 'Network failure — retry (alternative outcome)'];
clean(names);
const out = {};
for (const [st, nm] of [['Sanctions', names[0]], ['Network', names[1]]]) {
  const S = await shellM(nm, 9, MX[4], st === 'Sanctions' ? 'Withdrawal rejected' : 'Withdrawal not sent', null, { err: true });
  const cta = await flow19(S.ct, st, 1);
  await footM(S.f, { next: cta.next, lead: cta.lead, trail: cta.trail, alt: [['Secondary', 'Back to wallet', 'wallet']] });
  out[nm] = S.f.id;
}
fitSection(sec);
// fix WAL-18 mobile: Tx/Hash with explorer link overflowed the 358 column — hide the inline link, add a Ghost button under it
{ const f = await figma.getNodeByIdAsync('110:51788'); const hb = f && f.findOne(x => x.name === 'Transaction hash'); if (hb && !hb.findOne(x => x.name === 'Button/Ghost — View on explorer')) { const th = hb.children.find(x => x.type === 'INSTANCE'); if (th) { const k = Object.keys(th.componentProperties).find(x => x.split('#')[0] === 'Show explorer link'); if (k) th.setProperties({ [k]: false }); } hb.appendChild(await BTN('Ghost', 'View on explorer', { size: 'S', lead: 'external-link' })); await hb.screenshot({ scale: 1 }); } }
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes };
