const FIX = {};
try { // ---- fix GP-10 detail panel + status badge, GP-11 past-rounds amount cells
  const g10 = await figma.getNodeByIdAsync('186:29154'); const pf = g10.findOne(n => n.name === 'Purchase facts');
  const hx = pf && pf.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Tx/Hash')); if (hx) setP(hx, { 'Show explorer link': false }, 'hash10');
  const rk = pf && pf.findOne(n => n.name === 'Risk'); if (rk) rk.remove();
  let wn = 0; for (const t of g10.findAll(n => n.type === 'TEXT' && n.characters === 'Won · runner-up')) { await fnt(t); t.characters = 'Won'; wn++; }
  const g11 = await figma.getNodeByIdAsync('186:30207'); const tb = g11.findOne(n => n.name === 'Table — Past distributions'); let dn = 0;
  for (const r of tb.children.filter(n => n.name.startsWith('Row '))) for (const i of [3, 4, 5]) { const c = r.children[i]; if (c && c.type === 'INSTANCE') { try { const k = Object.keys(c.componentProperties).find(x => x.startsWith('Show DEMO')); if (k) { c.setProperties({ [k]: false }); dn++; } } catch (e) {} } }
  for (const t of g11.findAll(n => n.type === 'TEXT' && n.characters === 'No prizes — round cancelled')) { await fnt(t); t.characters = 'No prizes · cancelled'; }
  FIX.gp10 = { hash: !!hx, risk: !!rk, wn }; FIX.gp11 = dn;
  await g10.screenshot({ scale: 0.5 }); await g11.screenshot({ scale: 0.5 });
} catch (e) { FIX.err = String(e && e.message || e).slice(0, 200); }
