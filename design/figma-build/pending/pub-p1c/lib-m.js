// ===== pub-p1c MOBILE prelude (paste after helpers.js; art.js follows) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-06/24/25/26 — Mobile', 42000, 0);
const OUT = { section: sec.id, created: {}, skipped: [], audits: [], notes: [] };
function need(name) { const f = sec.children.find(c => c.name === name); if (!f) return true; if (Math.round(f.height) === 800 && f.primaryAxisSizingMode === 'FIXED') { f.remove(); OUT.notes.push('replaced incomplete ' + name); return true; } OUT.skipped.push(name + ' = ' + f.id); return false; }
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w, clip: o.clip }); }
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Pool Dice': '24:13443' };
async function mshell(name, x, y, o = {}) {
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y; OUT.created[name] = f.id;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  if (o.topbar !== false) { const tb = await I('23:12908', { State: o.auth === 'Member' ? 'Member' : 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']); }
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: o.gap ?? 28 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, o = {}) {
  if (o.footer !== false) { const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']); }
  if (o.sticky) add(S.f, [o.sticky, 'FILL']);
  if (o.tab !== false) { const tab = await I('22:5413', { Active: o.tab || 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']); }
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function statusChip(kind, label, icon) { const m = { ok: ['check-circle', 'status/success-tint', 'text/success'], warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], bad: ['x-circle', 'status/danger-tint', 'text/danger'], pause: ['pause-circle', 'status/warning-tint', 'text/warning'], work: ['wrench', 'status/info-tint', 'text/info'], clock: ['clock', 'status/info-tint', 'text/info'] }[kind]; const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: m[1], align: 'CENTER' }); add(c, await IC(icon || m[0], 14, m[2]), await T(label, 'Label/S', m[2])); return c; }
async function linkRow(label, icon = 'arrow-right') { const r = AL('HORIZONTAL', { name: 'Link — ' + label, gap: 6, align: 'CENTER', p: [12, 0, 12, 0] }); add(r, await T(label, 'Label/M', 'text/brand'), await IC(icon, 16, 'icon/brand')); return r; }
async function iconTile(ic, tint = 'brand/tint', col = 'icon/brand', size = 18) { const b = AL('HORIZONTAL', { name: 'Icon tile — ' + ic, fill: tint, r: 10, p: 8 }); add(b, await IC(ic, size, col)); return b; }
async function navRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const t = AL('VERTICAL', { gap: 2 }); const tr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(tr, await T(title, 'Body/M Strong', 'text/primary')); if (o.demo) add(tr, await DEMO('XS')); add(t, tr, [await T(body, 'Body/S', 'text/secondary', { w: 230 }), 'FILL']); add(r, await iconTile(ic, o.tint, o.ic), [t, 'FILL']); if (o.chev !== false) add(r, await IC('chevron-right', 20, 'icon/muted')); return r; }
async function mhead(over, title, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 4 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); return v; }
async function mlic(C, line) { const v = AL('VERTICAL', { name: 'Compliance strip', gap: 12 }); const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(v, [r, 'FILL']); const l = AL('HORIZONTAL', { name: 'RG line', gap: 6, align: 'CENTER' }); add(l, await IC('heart', 16, 'icon/brand'), [await T(line || 'Play for fun, not to win back losses. Limits, reality checks and self-exclusion are always in Responsible gaming.', 'Caption', 'text/secondary', { w: 330 }), 'FILL']); add(v, [l, 'FILL']); add(C, [v, 'FILL']); }
// art banner 358 wide (fixed height) with angled blocks; append art with abs()
function mbanner(C, name, h = 240, o = {}) { const b = AL('HORIZONTAL', { name, fill: 'surface/default', r: 20, w: 358, h, clip: true, p: o.p ?? 0, align: o.align }); stroke(b, 'border/subtle'); add(C, [b, 'FILL']); abs(b, rect(300, 700, o.block || 'surface/raised', 0, 'Angled colour block'), o.bx ?? 150, -200, 14); abs(b, rect(28, 700, o.stripe || 'brand/primary', 0, 'Angled colour block — stripe'), (o.bx ?? 150) - 46, -200, 14); return b; }
async function stack(C, btns) { const v = AL('VERTICAL', { name: 'Actions', gap: 12 }); for (const b of btns) add(v, [b, 'FILL']); add(C, [v, 'FILL']); return v; }
function homeIndicator(parent) { const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [8, 0, 4, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Home indicator bar')); add(parent, [hi, 'FILL']); }
function audit(f) { const fb = f.absoluteBoundingBox; const bad = []; for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) { const b = t.absoluteBoundingBox; if (!b || !t.visible) continue; let q = t.parent, art = false; while (q && q !== f) { if (q.name && q.name.startsWith('Object —')) { art = true; break; } q = q.parent; } if (art) continue; if (b.width < 2 || b.x < fb.x - 1 || b.x + b.width > fb.x + fb.width + 1) bad.push(t.name.slice(0, 32)); } OUT.audits.push({ id: f.id, name: f.name, h: Math.round(f.height), overflow: bad.slice(0, 8), n: bad.length }); }
// ===== end mobile prelude =====
