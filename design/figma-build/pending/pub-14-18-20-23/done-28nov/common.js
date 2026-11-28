// ===== PUB-14/18/20/23 mobile continuation helpers =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-14/18/20/23 — Mobile', 35000, 0);
const CREATED = {}; const NOTES = [];
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function hilite(t, term) { if (!t || t.type !== 'TEXT') return; const s = t.characters.toLowerCase(); let i = s.indexOf(term.toLowerCase()); while (i >= 0) { t.setRangeFills(i, i + term.length, [paint('text/brand')]); t.setRangeFontName(i, i + term.length, { family: 'Inter', style: 'Semi Bold' }); i = s.indexOf(term.toLowerCase(), i + term.length); } }
function txt(root, name, val, nth = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts[nth] || null; }
function ins(C, after, node, mode = 'FILL') { const idx = C.children.indexOf(after) + 1; C.insertChild(idx, node); if (mode === 'FILL') node.layoutSizingHorizontal = 'FILL'; return node; }
async function tile(icName, o = {}) { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icName, fill: o.tint || 'brand/tint', r: 10, p: o.p ?? 8 }); add(t, await IC(icName, o.size || 18, o.ic || 'icon/brand')); return t; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify }); }
async function cloneFrom(srcId, name, y) { const old = sec.children.find(n => n.name === name); if (old) old.remove(); const src = await figma.getNodeByIdAsync(srcId); const f = src.clone(); sec.appendChild(f); f.name = name; f.x = src.x; f.y = y; CREATED[name] = f.id; return f; }
async function search(inst, value) { inst.setProperties({ State: 'Filled' }); const vt = inst.findOne(n => n.type === 'TEXT' && n.name === 'Value text'); if (vt) vt.characters = value; else NOTES.push('search value text not found'); return inst; }
function overflowList(root) { const rb = root.absoluteBoundingBox; const bad = []; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { let vis = true, p = t; while (p && p !== root) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) continue; const b = t.absoluteBoundingBox; if (!b) continue; if (b.width < 2 || b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) bad.push(t.characters.slice(0, 24) + '@' + Math.round(b.x - rb.x) + '+' + Math.round(b.width)); } return bad; }
// screenshot a tall frame in readable chunks through a temporary clipped viewport (removed afterwards)
async function vshots(f, scale = 0.7, chunk = 2140, hideFooter = true) {
  const vp = figma.createFrame(); vp.name = 'TMP verify viewport'; fill(vp, 'bg/base'); vp.clipsContent = true; vp.x = -40000; vp.y = -40000; let n = 0;
  try { const cl = f.clone(); vp.appendChild(cl); cl.x = 0; cl.y = 0; if (hideFooter) { const ft = cl.findChild(x => x.name.startsWith('Shell/Footer')); if (ft) ft.visible = false; }
    const H = cl.height; for (let y = 0; y < H - 4; y += chunk) { const h = Math.min(chunk, H - y); vp.resize(cl.width, h); cl.y = -y; await vp.screenshot({ scale }); n++; } }
  finally { vp.remove(); }
  return n;
}
// ===== end continuation helpers =====
