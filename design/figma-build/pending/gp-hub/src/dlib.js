// ===== GP-01 desktop variant lib (page 07, section 'GP-01..04 Hub & participation') =====
const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-01..04 Hub & participation', 0, 0);
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
async function st(root, name, val, nth = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[nth]; if (!t) return null; await lf(t); t.characters = val; return t; }
function fnd(root, name) { return root.findOne(n => n.name === name); }
function absAdd(parent, node, x, y, rot = 0, idx = null) { if (idx == null) parent.appendChild(node); else parent.insertChild(idx, node); node.layoutPositioning = 'ABSOLUTE'; node.rotation = rot; node.x = x; node.y = y; return node; }
function card(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, justify: o.justify }); }
function row(kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 8, align: o.align || 'CENTER', justify: o.justify }); add(r, ...kids); return r; }
function col(kids, o = {}) { const r = AL('VERTICAL', { name: o.name || 'Stack', gap: o.gap ?? 4, align: o.align }); add(r, ...kids); return r; }
async function wrapT(parent, text, style, color, w, name) { const t = await T(text, style, color, { w, name }); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
// bottom of everything in the section that overlaps [x, x+w] horizontally
function colBottom(x, w, skip) { let m = 0; for (const c of sec.children) { if (c === skip) continue; if (c.x < x + w && c.x + c.width > x) m = Math.max(m, c.y + c.height); } return m; }
function exists(name) { return sec.children.find(n => n.name === name); }
async function cloneBelow(srcName, name) {
  const src = exists(srcName); if (!src) throw new Error('Source frame missing: ' + srcName);
  const f = src.clone(); sec.appendChild(f); f.name = name; f.x = src.x; f.y = colBottom(src.x, src.width, f) + 160; f.primaryAxisSizingMode = 'AUTO';
  return f;
}
const HUB = { L: '[GP-01] Global Pool Hub / 1280 / Active', T: '[GP-01] Global Pool Hub / 768 / Active' };
const CW = { L: 1280 - 240 - 64, T: 768 - 64 };
// ===== END DLIB =====
