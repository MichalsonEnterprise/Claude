// READ-ONLY. Page 10 inventory for 'PUB-05/08/09/13 — Mobile' + text dump of the desktop frames on page 03 (cross-page by id).
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience');
await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => [s.name.slice(0, 40), Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)]);
const mine = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('PUB-05'));
const frames = mine ? mine.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height), sizing: c.primaryAxisSizingMode })) : [];
// desktop text dump: texts NOT inside instances (our own copy), deduped across frames
const ids = { WD: '33:149514', WF: '33:196810', WE: '33:219380', HIW: '33:245465', NA: '33:281751', NE: '33:318074', SEC: '34:345543' };
const seen = new Set(); const dump = {};
function walk(n, out, inInst) {
  if (n.type === 'INSTANCE') { const mc = n.mainComponent; const nm = mc ? (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name) : '?'; out.inst[nm] = (out.inst[nm] || 0) + 1; return; }
  if (n.type === 'TEXT') { const c = n.characters.replace(/\s+/g, ' ').slice(0, 80); if (!seen.has(c) && out.t.length < 140) { seen.add(c); out.t.push(c); } return; }
  if ('children' in n) for (const k of n.children) walk(k, out, inInst);
}
for (const [k, id] of Object.entries(ids)) {
  try { const f = await figma.getNodeByIdAsync(id); if (!f) { dump[k] = 'missing'; continue; } const out = { t: [], inst: {} }; walk(f, out, false); dump[k] = out; } catch (e) { dump[k] = 'ERR ' + String(e).slice(0, 120); }
}
let res = { secs, mine: mine ? mine.id : null, frames, dump };
let s = JSON.stringify(res);
if (s.length > 60000) { for (const k of Object.keys(dump)) if (dump[k].t) dump[k].t = dump[k].t.slice(0, 70); s = JSON.stringify(res); }
return res;
