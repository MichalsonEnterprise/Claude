const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 — Mobile', 49000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
async function mshell(name, x, y) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: 40 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, stickyNode) {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (stickyNode) add(S.f, [stickyNode, 'FILL']);
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
function abs(parent, node, x, y, rot) { parent.appendChild(node); if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function artFrame(name, h) { const a = figma.createFrame(); a.name = name; a.resize(358, h); fill(a, 'surface/default'); radius(a, 20); stroke(a, 'border/subtle'); a.clipsContent = true; return a; }
async function sticky(label, note, lead) { const b = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 6, align: 'CENTER' }); strokeSides(b, 'border/subtle', { t: 1 }); const bt = await BTN('Primary', label, { size: 'L', lead }); bt.name = 'Button — Sticky CTA'; add(b, [bt, 'FILL']); if (note) add(b, await T(note, 'Caption', 'text/tertiary', { name: 'Sticky note' })); return b; }
async function mlic(C) { const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(C, [r, 'FILL']); }
async function rowsList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 16, 4, 16] }); for (let i = 0; i < rows.length; i++) { const [k, v] = rows[i]; const r = AL('HORIZONTAL', { gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 150 }), 'FILL']); if (v === 0) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('minus', 14, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); add(r, n); } else if (v === 1) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('check', 14, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); add(r, n); } else add(r, await T(v, o.vs || 'Label/M', o.vc || 'text/primary', { w: o.vw || 160, align: 'RIGHT' })); add(l, [r, 'FILL']); } return l; }
async function iconRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0] }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const ib = AL('HORIZONTAL', { fill: o.tint || 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, o.ic || 'icon/brand')); const t = AL('VERTICAL', { gap: 2 }); add(t, await T(title, 'Body/M Strong', 'text/primary', { w: 270 }), [await T(body, 'Body/S', 'text/secondary', { w: 270 }), 'FILL']); add(r, ib, [t, 'FILL']); return r; }
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); ts.forEach((t, i) => { if (b[i]) t.characters = b[i]; }); return ts.length; }
