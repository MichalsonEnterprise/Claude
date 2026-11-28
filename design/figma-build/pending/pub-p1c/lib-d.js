// ===== pub-p1c DESKTOP prelude (paste after helpers.js; art.js follows) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-24/25/26 Errors & PUB-06 Leaderboard', 70000, 0);
const OUT = { section: sec.id, created: {}, skipped: [], audits: [], notes: [] };
// returns true when the frame must be built (missing, or an incomplete fixed 800 px leftover that gets replaced)
function need(name) { const f = sec.children.find(c => c.name === name); if (!f) return true; if (Math.round(f.height) === 800 && f.primaryAxisSizingMode === 'FIXED') { f.remove(); OUT.notes.push('replaced incomplete ' + name); return true; } OUT.skipped.push(name + ' = ' + f.id); return false; }
function frameH(name, fb) { const f = sec.children.find(c => c.name === name); return f ? f.height : fb; }
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function setNav(sb, label) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { try { if (it.name === 'Item/Lobby') it.setProperties({ State: 'Default' }); if (label && it.name === 'Item/' + label) it.setProperties({ State: 'Active' }); } catch (e) { } } }
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w, clip: o.clip }); }
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841' };
async function shell(name, x, y, o = {}) {
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: o.auth || 'Guest' }); sb.name = 'Shell/Sidebar'; body.appendChild(sb); sb.layoutSizingVertical = 'FILL'; setNav(sb, o.nav);
  const col = AL('VERTICAL', { name: 'Column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: o.auth === 'Member' ? 'Member' : 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(col, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', p: [32, 32, 64, 32], gap: o.gap ?? 48 }); add(col, [content, 'FILL']);
  if (o.footer !== false) { const foot = await I('23:17478', { Breakpoint: 'Desktop' }); foot.name = 'Shell/Footer Mega'; add(col, [foot, 'FILL']); bnum(foot, 'paddingLeft', 32); bnum(foot, 'paddingRight', 32); }
  OUT.created[name] = f.id; return { f, body, col, content };
}
async function statusChip(kind, label, icon) { const m = { ok: ['check-circle', 'status/success-tint', 'text/success'], warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], bad: ['x-circle', 'status/danger-tint', 'text/danger'], pause: ['pause-circle', 'status/warning-tint', 'text/warning'], work: ['wrench', 'status/info-tint', 'text/info'] }[kind]; const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: m[1], align: 'CENTER' }); add(c, await IC(icon || m[0], 14, m[2]), await T(label, 'Label/S', m[2])); return c; }
async function linkRow(label, icon = 'arrow-right') { const r = AL('HORIZONTAL', { name: 'Link — ' + label, gap: 6, align: 'CENTER' }); add(r, await T(label, 'Label/M', 'text/brand'), await IC(icon, 16, 'icon/brand')); return r; }
async function iconTile(ic, tint = 'brand/tint', col = 'icon/brand', size = 20) { const b = AL('HORIZONTAL', { name: 'Icon tile — ' + ic, fill: tint, r: 10, p: 10 }); add(b, await IC(ic, size, col)); return b; }
// quick-link card: icon, title, body, link
async function linkCard(ic, title, body, link, o = {}) { const c = box('Card — ' + title, { gap: 12, p: 20 }); add(c, await iconTile(ic, o.tint, o.ic)); const tr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H5', 'text/primary')); if (o.demo) add(tr, await DEMO('XS')); add(c, [tr, 'FILL'], [await T(body, 'Body/S', 'text/secondary', { w: 220 }), 'FILL'], await linkRow(link)); return c; }
async function row4(C, cards) { const r = AL('HORIZONTAL', { name: 'Quick links', gap: 16 }); add(C, [r, 'FILL']); for (const c of cards) { add(r, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; } return r; }
async function sectionHead(over, title, body, right) { const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' }); const l = AL('VERTICAL', { gap: 6 }); add(row, [l, 'FILL']); add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H4', 'text/primary')); if (body) add(l, await T(body, 'Body/S', 'text/secondary', { w: 760 })); if (right) add(row, right); return row; }
async function kvList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 20, 4, 20], fill: o.fill, stroke: o.stroke }); for (let i = 0; i < rows.length; i++) { const [k, v, ro = {}] = rows[i]; const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: o.kw || 160 }), 'FILL']); const vv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); if (ro.icon) add(vv, await IC(ro.icon, 14, ro.ic || 'icon/brand')); add(vv, await T(v, ro.mono ? 'Mono/S' : (ro.style || 'Label/M'), ro.color || 'text/primary')); if (ro.demo) add(vv, await DEMO('XS')); add(r, vv); add(l, [r, 'FILL']); } return l; }
async function compliance(C) { const v = AL('VERTICAL', { name: 'Trust & licence', gap: 16 }); add(C, [v, 'FILL']); const st = await I('25:16197'); st.name = 'Strip/Trust'; add(v, [st, 'FILL']); const lic = await I('6:158', { Variant: 'Inline' }); add(v, lic); return v; }
// hero banner (hug height, min 420) with angled colour blocks: returns { hero, copy }; place art after the copy is built
function placeArt(H, a, x, dy = 24) { abs(H, a, x, Math.round(Math.max(-12, (H.height - a.height) / 2 + dy))); return a; }
async function hero(C, name, o = {}) {
  const h = AL('HORIZONTAL', { name, fill: 'surface/default', r: 20, p: [48, 48, 48, 48], clip: true, align: 'CENTER' }); stroke(h, 'border/subtle'); add(C, [h, 'FILL']); h.minHeight = o.h || 420;
  const copy = AL('VERTICAL', { name: 'Copy', gap: 20, w: o.cw || 540 }); add(h, copy);
  abs(h, rect(560, 980, o.block || 'surface/raised', 0, 'Angled colour block'), o.bx ?? 700, -220, 14);
  abs(h, rect(44, 980, o.stripe || 'brand/primary', 0, 'Angled colour block — stripe'), (o.bx ?? 700) - 70, -220, 14);
  return { hero: h, copy };
}
function audit(f) { const fb = f.absoluteBoundingBox; const bad = []; for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) { const b = t.absoluteBoundingBox; if (!b || !t.visible) continue; if (b.width < 2 || b.x < fb.x - 1 || b.x + b.width > fb.x + fb.width + 1) bad.push(t.name.slice(0, 32)); } OUT.audits.push({ id: f.id, name: f.name, h: Math.round(f.height), overflow: bad.slice(0, 8), n: bad.length }); }
// ===== end desktop prelude =====
