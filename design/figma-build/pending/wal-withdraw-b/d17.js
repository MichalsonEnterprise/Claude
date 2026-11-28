// ===== BODY d17 — WAL-17 desktop: Processing / Queued / Manual review =====
const N17 = 'WAL-17 Withdraw — Step 8 Pending / 1440 / ';
const L17 = [['Processing', N17 + 'Processing'], ['Queued', N17 + 'Queued'], ['Manual review', N17 + 'Manual review']];
clean(L17.map(x => x[1]));
const out = {};
for (const [st, nm] of L17) {
  const S = await shellD(nm, 8, COLX[2], 'WD-20931 · 1,500.00 USDT → ' + AD + ' on Arbitrum One');
  const cta = await flow17(S.fc, st, 0);
  await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 8, ref: true });
  const bb = await I('14:1974', { Layout: 'Compact' }); add(S.side, [bb, 'FILL']);
  if (st === 'Manual review') await helpCard(S.side, 'help-circle', 'What does a review involve?', 'An analyst checks the destination address against sanctions and fraud lists. Most reviews finish within 4 hours, 24/7. If it\'s approved, the withdrawal is sent within about 5 minutes; if not, the full amount returns to Available.', [['Withdrawal FAQ', 'book'], ['Contact support', 'chat']]);
  else await helpCard(S.side, 'help-circle', 'Not arrived after 30 minutes?', 'Check that your wallet is set to Arbitrum One and shows USDT (Arbitrum One). Still missing? Contact support with reference WD-20931.', [['Withdrawal FAQ', 'book'], ['Contact support', 'chat']]);
  out[nm] = S.f.id;
}
fitSection(sec);
// ===== FIX WAL-16 desktop (appended to d17): hide leftover OTP spinner row, wrap recap =====
const fix16 = {};
{ const sp8 = VAR['space/2'];
  for (const id of ['97:31028', '97:31941', '97:32764']) {
    const f = await figma.getNodeByIdAsync(id); if (!f) continue; const r = {};
    const em = f.findOne(x => x.type === 'INSTANCE' && x.name === 'Input/OTP — Email code');
    if (em) { r.struct = em.children.map(c => c.name + ':' + c.type + (c.children ? '[' + c.children.map(k => k.name + ':' + k.type).join(',') + ']' : ''));
      const sp = em.findAll(x => x.type !== 'TEXT' && /spin|status|loader/i.test(x.name)); r.spin = sp.map(x => x.name + ':' + x.type);
      for (const x of sp) { const n = await figma.getNodeByIdAsync(x.id); if (!n) continue; const par = n.parent; if (par && par.id !== em.id && par.type !== 'INSTANCE' && !par.children.some(c => c.type === 'TEXT')) par.visible = false; else n.visible = false; } }
    const rc = f.findOne(x => x.name === 'Withdrawal recap');
    if (rc) { const s = rc.children.find(c => c.name === 'Spacer'); if (s) s.remove(); rc.layoutWrap = 'WRAP'; rc.setBoundVariable('counterAxisSpacing', sp8); r.recap = [rc.width, rc.height]; }
    fix16[id] = r;
  }
  const f0 = await figma.getNodeByIdAsync('97:31028'); if (f0) await f0.findOne(x => x.name === 'Flow card').screenshot({ scale: 0.5 });
}

const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes, fix16 };
