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
