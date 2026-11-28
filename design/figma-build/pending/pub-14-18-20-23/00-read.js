// READ-ONLY (no helpers needed). Lists the mobile section's frames on page 10 and extracts the copy + instance usage of the
// desktop PUB-14/18/20/23 frames on page 03 so the mobile data arrays (CATS/RES in m1, REG/HITS in m3, COOKIE_* in m4) can be aligned.
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => [s.name, Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)].join('|'));
const mine = page.children.find(n => n.type === 'SECTION' && n.name === 'PUB-14/18/20/23 — Mobile');
const frames = mine ? mine.children.map(c => ({ id: c.id, name: c.name, w: Math.round(c.width), h: Math.round(c.height), x: Math.round(c.x), y: Math.round(c.y), sizing: c.primaryAxisSizingMode })) : null;
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
const out = {}; const insts = {};
for (const id of ['33:205848', '33:279676', '33:323120', '34:396216', '34:409284']) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { out[id] = 'missing'; continue; }
  const arr = []; const ic = {};
  for (const n of f.findAll(n => n.type === 'TEXT' || n.type === 'INSTANCE')) {
    if (n.type === 'INSTANCE') { if (!inInst(n)) { const mc = n.mainComponent; const nm = mc ? (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name + '{' + mc.name + '}' : mc.name) : '?'; ic[nm] = (ic[nm] || 0) + 1; if (nm.indexOf('FAQ') >= 0) { const q = n.findOne(x => x.type === 'TEXT' && x.name === 'Question'); arr.push('FAQ Q: ' + (q ? q.characters : '')); } } continue; }
    if (inInst(n)) continue; arr.push(n.characters.replace(/\s+/g, ' ').slice(0, 150));
  }
  let s = arr.join(' ¦ '); if (s.length > 12000) s = s.slice(0, 12000) + '…TRUNC';
  out[f.name] = s; insts[f.name] = ic;
}
return { secs, frames, out, insts };
