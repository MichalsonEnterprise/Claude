// ===== PUB-05/08/09/13 mobile prelude (paste after helpers.js) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-05/08/09/13 — Mobile', 28000, 0);
const EXIST = {}; for (const c of sec.children) EXIST[c.name] = c;
const OUT = { section: sec.id, created: {}, skipped: [], notes: [] };
function found(re) { return sec.children.find(c => re.test(c.name)) || null; }
function skipIf(re, n) { const f = found(re); if (f) { OUT.skipped.push(n + ' (exists as ' + f.name + ' ' + f.id + ')'); return true; } return false; }
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'High Card': '24:13496', 'Ascend': '24:13528', 'Pool Keno': '24:13564', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Neon Koi': '25:14992' };
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function abs(parent, node, x, y, rot) { parent.appendChild(node); if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w, clip: o.clip }); }
async function mshell(name, x, y, o = {}) {
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: o.gap ?? 32 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, stickyNode, tabActive = 'Home') {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (stickyNode) add(S.f, [stickyNode, 'FILL']);
  const tab = await I('22:5413', { Active: tabActive }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
async function pageHead(over, title, body, demo) { const v = AL('VERTICAL', { name: 'Page header', gap: 12 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (demo) add(r, await DEMO('M')); add(v, [r, 'FILL'], [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']); return v; }
async function sticky(label, note, o = {}) { const b = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 6, align: 'CENTER' }); strokeSides(b, 'border/subtle', { t: 1 }); const bt = await BTN(o.type || 'Primary', label, { size: 'L', lead: o.lead, trail: o.trail }); bt.name = 'Button — Sticky CTA'; add(b, [bt, 'FILL']); if (note) add(b, await T(note, 'Caption', 'text/tertiary', { name: 'Sticky note' })); return b; }
async function mlic(C, rg = true) { const v = AL('VERTICAL', { name: 'Compliance strip', gap: 12 }); const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(v, [r, 'FILL']); if (rg) { const l = AL('HORIZONTAL', { name: 'RG link', gap: 6, align: 'CENTER' }); add(l, await IC('heart', 16, 'icon/brand'), [await T('Play for fun, not to win back losses. Set deposit and participation limits any time in Responsible gaming.', 'Caption', 'text/secondary', { w: 330 }), 'FILL']); add(v, [l, 'FILL']); } add(C, [v, 'FILL']); }
async function iconRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0] }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const ib = AL('HORIZONTAL', { fill: o.tint || 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, o.ic || 'icon/brand')); const t = AL('VERTICAL', { gap: 2 }); add(t, [await T(title, 'Body/M Strong', 'text/primary', { w: o.w || 270 }), 'FILL'], [await T(body, 'Body/S', 'text/secondary', { w: o.w || 270 }), 'FILL']); if (o.extra) add(t, o.extra); add(r, ib, [t, 'FILL']); return r; }
// key/value list: rows [[k, v, {mono, color, demo}]]
async function kvList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 16, 4, 16], fill: o.fill }); for (let i = 0; i < rows.length; i++) { const [k, v, ro = {}] = rows[i]; const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: o.kw || 140 }), 'FILL']); const vv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); if (ro.icon) add(vv, await IC(ro.icon, 14, ro.ic || 'icon/brand')); add(vv, await T(v, ro.mono ? 'Mono/S' : (ro.style || 'Label/M'), ro.color || 'text/primary')); if (ro.demo) add(vv, await DEMO('XS')); add(r, vv); add(l, [r, 'FILL']); } return l; }
function chips(name) { const r = AL('HORIZONTAL', { name, gap: 8, wrap: true, cgap: 8 }); return r; }
async function chip(label, selected, icon) { const c = await I('17:2766', { State: selected ? 'Selected' : 'Default' }, icon ? { Label: label, 'Show icon': true, Icon: ICONS[icon] } : { Label: label }); c.name = 'Chip — ' + label; return c; }
async function segmented(n, labels, active) { const s = await I('20:6978', { Segments: String(n) }); const segs = s.findAll(x => x.type === 'INSTANCE' && x.mainComponent && x.mainComponent.parent && x.mainComponent.parent.name === 'Tabs/Segment'); segs.forEach((g, i) => { if (labels[i] != null) setProp(g, 'Label', labels[i]); g.setProperties({ State: i === active ? 'Active' : 'Default' }); }); s.name = 'Tabs/Segmented — ' + labels.join(' | '); return s; }
async function statusChip(kind, label) { const m = { ok: ['check-circle', 'status/success-tint', 'text/success'], warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], bad: ['x-circle', 'status/danger-tint', 'text/danger'] }[kind]; const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 4, p: [4, 8, 4, 8], r: 9999, fill: m[1], align: 'CENTER' }); add(c, await IC(m[0], 14, m[2]), await T(label, 'Label/S', m[2])); return c; }
async function callout(kind, title, body) { const m = { warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], ok: ['check-circle', 'status/success-tint', 'text/success'], bad: ['alert-circle', 'status/danger-tint', 'text/danger'] }[kind]; const b = AL('HORIZONTAL', { name: 'Callout — ' + title, gap: 12, p: 16, r: 14, fill: m[1] }); const t = AL('VERTICAL', { gap: 4 }); add(t, [await T(title, 'Body/S Strong', 'text/primary', { w: 280 }), 'FILL'], [await T(body, 'Body/S', 'text/secondary', { w: 280 }), 'FILL']); add(b, await IC(m[0], 20, m[2]), [t, 'FILL']); return b; }
async function linkRow(label, icon = 'arrow-right') { const r = AL('HORIZONTAL', { name: 'Link — ' + label, gap: 6, align: 'CENTER', p: [12, 0, 12, 0] }); add(r, await T(label, 'Label/M', 'text/brand'), await IC(icon, 16, 'icon/brand')); return r; }
// bottom sheet (390 wide), returns {s, body, foot}
async function sheet(title, sub) {
  const s = AL('VERTICAL', { name: 'Sheet/Bottom — ' + title, fill: 'surface/overlay', w: 390 }); s.setBoundVariable('topLeftRadius', VAR['radius/2xl']); s.setBoundVariable('topRightRadius', VAR['radius/2xl']); strokeSides(s, 'border/subtle', { t: 1 }); await fx(s, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', p: [8, 0, 4, 0], justify: 'CENTER' }); add(g, rect(36, 4, 'border/strong', 9999, 'Grabber')); add(s, [g, 'FILL']);
  const h = AL('HORIZONTAL', { name: 'Sheet header', p: [8, 16, 8, 16], gap: 12, align: 'CENTER' }); const ht = AL('VERTICAL', { gap: 2 }); add(ht, await T(title, 'Heading/H5', 'text/primary')); if (sub) add(ht, [await T(sub, 'Caption', 'text/tertiary', { w: 280 }), 'FILL']); const cl = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x }); cl.name = 'Close sheet (44 px)'; add(h, [ht, 'FILL'], cl); add(s, [h, 'FILL']);
  const body = AL('VERTICAL', { name: 'Sheet body', p: [8, 16, 16, 16], gap: 20 }); add(s, [body, 'FILL']);
  const foot = AL('VERTICAL', { name: 'Sheet footer — sticky', p: [12, 16, 8, 16], gap: 8, fill: 'surface/overlay' }); strokeSides(foot, 'border/subtle', { t: 1 }); add(s, [foot, 'FILL']);
  return { s, body, foot };
}
function homeIndicator(parent) { const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [8, 0, 4, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Home indicator bar')); add(parent, [hi, 'FILL']); }
// clone a built 390 default frame into a fixed 844 viewport with scrim + bottom sheet
async function sheetState(srcName, name, x, y, sh) {
  const src = (srcName instanceof RegExp) ? found(srcName) : sec.children.find(n => n.name === srcName); if (!src) throw new Error('Missing source frame ' + srcName);
  const f = src.clone(); sec.appendChild(f); f.name = name; f.x = x; f.y = y;
  for (const c of [...f.children]) if (c.name === 'Shell/Footer Mega') c.remove();
  f.resize(390, 844); f.primaryAxisSizingMode = 'FIXED'; f.clipsContent = true;
  const scr = rect(390, 844, 'scrim/overlay', 0, 'Scrim — tap to close'); abs(f, scr, 0, 0);
  abs(f, sh, 0, 0); sh.y = 844 - sh.height; return f;
}
// ===== end prelude =====
