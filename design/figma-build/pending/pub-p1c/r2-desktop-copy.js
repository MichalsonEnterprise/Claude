// READ-ONLY (no helpers). Copy + top-level instance dump of the existing desktop frames (page 03, section 54:101508)
// so the 390 frames reconcile with them (handles, points, prizes, incident ref, maintenance window).
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
const out = {};
for (const [id, lim] of [['54:101512', 3500], ['82:102573', 3500], ['82:103376', 4000], ['84:104905', 5000], ['84:103900', 1200]]) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { out[id] = 'missing'; continue; }
  const arr = [];
  for (const n of f.findAll(n => n.type === 'TEXT' || n.type === 'INSTANCE')) {
    if (inInst(n)) continue;
    if (n.type === 'INSTANCE') { if (/Sidebar|Topbar|Footer|Notice\/Demo|DEMO/.test(n.name)) continue; const props = n.componentProperties || {}; const pv = Object.entries(props).filter(([k, v]) => v.type === 'TEXT').map(([k, v]) => k.split('#')[0] + ':' + v.value).join(','); arr.push('[' + n.name.slice(0, 36) + (pv ? ' {' + pv.slice(0, 80) + '}' : '') + ']'); continue; }
    arr.push(n.characters.replace(/\s+/g, ' ').slice(0, 160));
  }
  let s = arr.join(' ¦ '); if (s.length > lim) s = s.slice(0, lim) + '…TRUNC';
  out[f.name] = s;
}
return out;
