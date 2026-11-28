function trackFill(ls, pct) { const tr = ls.findOne(n => n.name === 'Track'); if (!tr || !('children' in tr) || !tr.children.length) return 'no track'; const f = tr.children[0]; try { if (tr.layoutMode && tr.layoutMode !== 'NONE') f.layoutSizingHorizontal = 'FIXED'; f.resize(Math.max(6, Math.round(tr.width * pct)), f.height); return f.name + ' ' + Math.round(f.width) + '/' + Math.round(tr.width); } catch (e) { return 'err ' + e.message; } }
async function setContains(root, sub, to) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(sub)) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = to; n++; } } return n; }
async function fixSE(sc) {
  const out = { props: [] };
  for (const inst of sc.children.filter(c => c.type === 'INSTANCE')) {
    const cp = inst.componentProperties; const set = {}; const isTy = Object.values(cp).some(v => v.type === 'TEXT' && String(v.value).startsWith('Type SELF-EXCLUDE'));
    for (const [k, v] of Object.entries(cp)) {
      if (v.type === 'TEXT') { out.props.push(k.split('#')[0] + '=' + String(v.value).slice(0, 30)); if (/example\.com/.test(v.value)) set[k] = 'SELF-EXCLUDE'; else if (/digit|verification code/i.test(v.value)) set[k] = 'Capital letters, exactly as shown, so nobody confirms by accident.'; else if (/Create a password/i.test(v.value)) set[k] = 'Enter your current password'; }
      if (isTy && v.type === 'BOOLEAN' && /lead/i.test(k)) set[k] = false;
    }
    if (Object.keys(set).length) { inst.setProperties(set); out.set = (out.set || []).concat(Object.keys(set).map(k => k.split('#')[0])); }
  }
  out.a = await setExact(sc, { 'Create a password': 'Enter your current password', 'you@example.com': 'SELF-EXCLUDE' });
  out.b = await setContains(sc, 'digit', 'Capital letters, exactly as shown, so nobody confirms by accident.');
  return out;
}
