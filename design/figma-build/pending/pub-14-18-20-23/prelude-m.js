// ===== PUB-14/18/20/23 mobile prelude (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-14/18/20/23 — Mobile', 35000, 0);
const MSG = 'DEMO DATA — illustrative values only';
const NOTES = []; const CREATED = {};
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function firstText(inst, val) { const t = inst.findOne(n => n.type === 'TEXT'); if (t) t.characters = val; return !!t; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
const COLX = [120, 630, 1140, 1650];
function restack(x) { const fs = sec.children.filter(c => Math.abs(c.x - x) < 5).sort((a, b) => a.y - b.y); let y = 120; for (const f of fs) { f.y = y; y += f.height + 160; } }
function below(name) { const o = sec.children.find(n => n.name === name); return o ? o.y + o.height + 160 : 120; }
async function mshell(name, x, o = {}) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 390, o.h ? { h: o.h } : {}); sec.appendChild(f); f.x = x; f.y = o.y ?? 120;
  add(f, [await DEMOBAR(MSG), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: o.p || [24, 16, 40, 16], gap: o.gap ?? 32 }); add(f, [C, 'FILL']);
  CREATED[name] = f.id; return { f, C };
}
async function mfinish(S, o = {}) {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (o.sticky) add(S.f, [o.sticky, 'FILL']);
  const tab = await I('22:5413', { Active: o.tab || 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
function tile(icName, o = {}) { return (async () => { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icName, fill: o.tint || 'brand/tint', r: 10, p: o.p ?? 8 }); add(t, await IC(icName, o.size || 18, o.ic || 'icon/brand')); return t; })(); }
async function phead(C, over, title, body, meta) {
  const h = AL('VERTICAL', { name: 'Page header', gap: 8 }); add(C, [h, 'FILL']);
  add(h, await T(over, 'Overline', 'text/brand'), [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL']);
  if (body) add(h, [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
  if (meta && meta.length) { const m = AL('HORIZONTAL', { name: 'Meta', gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); for (const [ic, label] of meta) { const r = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(r, await IC(ic, 16, 'icon/muted'), await T(label, 'Caption', 'text/tertiary')); add(m, r); } add(h, [m, 'FILL']); }
  return h;
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
async function mlic(C) { const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(C, [r, 'FILL']); return r; }
async function search(value, filled) { const s = await I('16:3820', { Size: 'M', State: filled ? 'Filled' : 'Default' }, { 'Show shortcut': false }); s.name = 'Input/Search — ' + value; txt(s, 'Value text', value); return s; }
async function pills(labels, active, name = 'Category pills — scrolls horizontally') { const r = AL('HORIZONTAL', { name, gap: 8, w: 358, clip: true }); for (const l of labels) { const p = await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show icon': false }); p.name = 'Tabs/Pill — ' + l; r.appendChild(p); } return r; }
function hilite(t, term) { if (!t || t.type !== 'TEXT') return; const s = t.characters.toLowerCase(); let i = s.indexOf(term.toLowerCase()); while (i >= 0) { t.setRangeFills(i, i + term.length, [paint('text/brand')]); t.setRangeFontName(i, i + term.length, { family: 'Inter', style: 'Semi Bold' }); i = s.indexOf(term.toLowerCase(), i + term.length); } }
function overflowList(root) { const rb = root.absoluteBoundingBox; const bad = []; for (const t of root.findAll(n => n.type === 'TEXT')) { let vis = true, p = t; while (p && p !== root) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) continue; const b = t.absoluteBoundingBox; if (!b) continue; if (b.width < 2 || b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) bad.push(t.name.slice(0, 30) + '@' + Math.round(b.x - rb.x) + '+' + Math.round(b.width)); } return bad; }
// Fit a library instance to its FILL width: if inner text overflows, try FILL on wide inner texts/frames; report what's left
function fitInst(inst) { let bad = overflowList(inst); if (!bad.length) return []; const ib = inst.absoluteBoundingBox; for (const n of inst.findAll(n => (n.type === 'TEXT' || n.type === 'FRAME') && n.parent && n.parent.layoutMode && n.parent.layoutMode !== 'NONE')) { const b = n.absoluteBoundingBox; if (b && b.x + b.width > ib.x + ib.width + 1) { try { if (n.type === 'TEXT' && n.textAutoResize === 'WIDTH_AND_HEIGHT') n.textAutoResize = 'HEIGHT'; n.layoutSizingHorizontal = 'FILL'; } catch (e) { } } } return overflowList(inst); }
function audit(f) { return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), overflow: overflowList(f).slice(0, 12) }; }
// ===== end prelude =====
