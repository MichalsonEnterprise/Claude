// ===== GP-HIST LIB (agent gp-history) =====
const C = {SB:'23:6697',TOP:'23:9832',TOPM:'23:12908',TAB:'22:5413',BC:'14:1145',TABU:'20:6831',STAT:'22:7589',HC:'22:8309',CELL:'22:9559',PAG:'23:16756',CHIP:'17:2766',SCHIP:'16:3551',SRCH:'16:3820',FBTN:'23:5397',TRUST:'25:16197',LIC:'6:158',ALERT:'30:17116',RH:'22:9830',THR:'23:8618',VRF:'23:11967',PD:'23:16123',TK:'23:8534',DC:'24:13861',CR:'23:9602',CBAL:'22:7720',DON:'28:19543',HASH:'20:5893',ADDR:'9:418',NET:'9:377',CBX:'20:3205',RAD:'20:3259',FEE:'20:8583',TOAST:'30:16872',B18:'6:159',DR:'20:6794',SEL:'13:565'};
const MISS = [];
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName | 'layerName#idx' | '~substring': value})
async function O(n, map, tag = '') { const ts = n.findAll(x => x.type === 'TEXT'); for (const [k, v] of Object.entries(map)) { let hit = false; if (k[0] === '~') { const s = k.slice(1); for (const t of ts) if (t.characters.includes(s)) { await fnt(t); t.characters = t.characters.split(s).join(v); hit = true; } } else { const m = k.match(/^(.*)#(\d+)$/); const nm = m ? m[1] : k, ix = m ? +m[2] : 0; const t = ts.filter(x => x.name === nm)[ix]; if (t) { await fnt(t); t.characters = String(v); hit = true; } } if (!hit) MISS.push(tag + ':' + k); } return n; }
function nest(n, name) { return n.findOne(x => x.type === 'INSTANCE' && x.name === name); }
function setP(inst, props, tag = '') { if (!inst) { MISS.push('nest:' + tag); return; } try { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; else MISS.push(tag + ':prop ' + k); } inst.setProperties(set); } catch (e) { MISS.push(tag + ':' + String(e.message || e).slice(0, 80)); } }
async function relabel(inst, label) { const t = inst && inst.findOne(x => x.type === 'TEXT'); if (t && label != null) { await fnt(t); t.characters = label; } return inst; }
async function badge(status, label, size = 'S') { const b = await BADGE(status, size); await relabel(b, label); return b; }
function tc(n, name, color, ix = 0) { const t = n.findAll(x => x.type === 'TEXT' && x.name === name)[ix]; if (t) t.fills = [paint(color)]; }
function card(name, o = {}) { return AL('VERTICAL', { name, p: o.p ?? 24, gap: o.gap ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
function row(name, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AL('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer' }); }
function line() { return rect(10, 1, 'border/subtle', 0, 'Divider'); }
async function kv(k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', justify: 'SPACE_BETWEEN' }); const kt = await T(k, o.ks || 'Body/S', 'text/secondary'); const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 16, o.ic || 'icon/muted')); if (o.node) add(vr, o.node); else add(vr, await T(v, o.vs || 'Body/S Strong', o.vc || 'text/primary', o.vw ? { w: o.vw, align: 'RIGHT' } : {})); if (o.demo) add(vr, await DEMO('XS')); add(r, kt, vr); return r; }
async function ttl(t, o = {}) { const r = row('Title — ' + t.slice(0, 30), { gap: 8 }); add(r, await T(t, o.s || 'Heading/H5', 'text/primary')); if (o.demo !== false) add(r, await DEMO(o.ds || 'S')); if (o.right) { add(r, [spacer(), 'FILL']); for (const x of [].concat(o.right)) add(r, x); } return r; }
async function navActive(sb, label) { for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (!cp || !cp.State || !cp.Collapsed) continue; const lk = Object.keys(cp).find(k => k.split('#')[0] === 'Label'); const lab = lk ? cp[lk].value : ''; const isA = cp.State.value === 'Active'; try { if (lab === label && !isA) it.setProperties({ State: 'Active' }); else if (lab !== label && isA) it.setProperties({ State: 'Default' }); } catch (e) { MISS.push('nav:' + lab); } } }
async function shell(name, nav, X, Y) {
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const rail = AL('VERTICAL', { name: 'Sidebar rail', fill: 'bg/secondary' }); add(body, rail);
  const sb = await I(C.SB, { State: 'Expanded', Auth: 'Member' }); add(rail, sb); rail.layoutSizingVertical = 'FILL'; await navActive(sb, nav);
  const mc = AL('VERTICAL', { name: 'Main column' }); add(body, [mc, 'FILL']);
  add(mc, [await I(C.TOP, { State: 'Member' }), 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [24, 32, 48, 32], gap: 24 }); add(mc, [main, 'FILL']);
  return { f, main, mc };
}
async function subnav(active) { const r = AL('HORIZONTAL', { name: 'Global Pool sub-nav', gap: 4, align: 'MAX' }); strokeSides(r, 'border/subtle', { b: 1 }); for (const l of ['Overview', 'Round history', 'My entries', 'Prize distribution', 'Fairness (VRF)', 'Rules']) { const t = await I(C.TABU, { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': l === 'My entries' }); if (l === 'My entries') setP(nest(t, 'Count'), { Count: '35' }, 'cnt'); add(r, t); } return r; }
async function crumbs(cr) { const bc = await I(C.BC, { Levels: String(cr.length) }); const m = { 'Crumb 1': cr[0], 'Current page': cr[cr.length - 1] }; if (cr.length > 2) m['Crumb 2'] = cr[1]; if (cr.length > 3) m['Crumb 3'] = cr[2]; await O(bc, m, 'bc'); return bc; }
async function phead(cr, title, desc, right = [], bdg) {
  const w = AL('VERTICAL', { name: 'Page header', gap: 16 });
  const r = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX', justify: 'SPACE_BETWEEN' });
  const l = AL('VERTICAL', { name: 'Title block', gap: 8 }); const tr = row('Title', { gap: 12 }); add(tr, await T(title, 'Heading/H2', 'text/primary')); if (bdg) add(tr, bdg); add(tr, await DEMO('M'));
  add(l, tr); if (desc) add(l, await T(desc, 'Body/M', 'text/secondary', { w: 680 }));
  const rr = row('Actions', { gap: 8 }); for (const b of right) add(rr, b);
  add(r, [l, 'FILL'], rr); add(w, await crumbs(cr), [r, 'FILL']); return w;
}
async function foot(main) { const fr = AL('VERTICAL', { name: 'Page footer — trust & licence', gap: 12, p: [8, 0, 0, 0] }); add(fr, [await I(C.TRUST), 'FILL'], [await I(C.LIC, { Variant: 'Inline' }), 'FILL']); add(main, [fr, 'FILL']); }
async function stat(label, value, unit, delta, ctx) { const s = await I(C.STAT, { Trend: 'Neutral', Size: 'M' }); await O(s, { Label: label, Value: value, Unit: unit, '0.00 pp': delta, 'Delta context': ctx }, 'stat'); const k = s.findOne(x => x.name === 'Sparkline'); if (k) k.visible = false; return s; }
async function cell(c, v) {
  if (v == null) v = '—';
  if (v.node) { const f = AL('HORIZONTAL', { name: 'Cell/Custom', p: [8, 16, 8, 16], gap: 8, align: 'CENTER' }); if (c.right) f.primaryAxisAlignItems = 'MAX'; for (const k of [].concat(v.node)) add(f, k); return f; }
  if (v.st) { const x = await I(C.CELL, { Type: 'Status', Density: 'Comfortable' }); const b = nest(x, 'Status badge'); setP(b, { Status: v.st }, 'stb'); await relabel(b, v.lab); return x; }
  if (v.amt != null) { const x = await I(C.CELL, { Type: 'Amount', Density: 'Comfortable' }, { 'Show DEMO': v.demo !== false }); const a = nest(x, 'Amount value'); setP(a, { Sign: v.sign || 'Neutral' }, 'amt'); if (a) await O(a, { Value: v.amt }, 'amt'); return x; }
  if (v.act) return await I(C.CELL, { Type: 'Actions', Density: 'Comfortable' }, { 'Show expand': !!v.exp });
  const o = typeof v === 'string' ? { p: v } : v;
  const x = await I(C.CELL, { Type: o.date ? 'Date' : 'Text', Density: 'Comfortable' }, { 'Show secondary': o.s != null });
  await O(x, o.s != null ? { Primary: o.p, Secondary: o.s } : { Primary: o.p }, 'cell');
  if (o.pc) tc(x, 'Primary', o.pc); if (o.sc) tc(x, 'Secondary', o.sc);
  if (o.ss) { const t = x.findOne(n => n.type === 'TEXT' && n.name === 'Secondary'); if (t) await t.setTextStyleIdAsync(TS[o.ss].id); }
  return x;
}
async function table(cols, rows, name, foot) {
  const w = AL('VERTICAL', { name, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true });
  const h = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(h, 'border/subtle', { b: 1 }); add(w, [h, 'FILL']);
  for (const c of cols) { const x = await I(C.HC, { Align: c.right ? 'Right' : 'Left', Sort: c.sort || 'None' }, { Label: c.h || 'Actions', 'Show sort icon': !!c.sort }); add(h, x); if (c.w === 'F') x.layoutSizingHorizontal = 'FILL'; else x.resize(c.w, x.height); if (!c.h) { const t = x.findOne(n => n.type === 'TEXT'); if (t) t.visible = false; } }
  for (const r of rows) { const rr = AL('HORIZONTAL', { name: 'Row ' + (r.key || ''), align: 'CENTER' }); if (r.fill) fill(rr, r.fill); strokeSides(rr, 'border/subtle', { b: 1 }); add(w, [rr, 'FILL']);
    for (let i = 0; i < cols.length; i++) { const c = cols[i]; const x = await cell(c, r.c[i]); add(rr, x); if (c.w === 'F') x.layoutSizingHorizontal = 'FILL'; else x.resize(c.w, x.height); }
    if (r.after) add(w, [r.after, 'FILL']); }
  if (foot) add(w, [foot, 'FILL']);
  return w;
}
async function note(text, o = {}) { const r = row('Note', { gap: 8, align: 'MIN' }); add(r, await IC(o.icon || 'info', 16, o.ic || 'icon/muted')); const t = await T(text, 'Body/S', 'text/secondary', { w: o.w || 900 }); add(r, t); if (o.link) add(r, await T(o.link, 'Body/S Strong', 'text/brand')); return r; }
// inline vertical stepper: steps [{s:'done'|'current'|'todo'|'warn', t, d, extra}]
async function stepper(steps) { const w = AL('VERTICAL', { name: 'Stepper', gap: 0 }); for (let i = 0; i < steps.length; i++) { const s = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 16 }); const rail = AL('VERTICAL', { name: 'Rail', gap: 4, align: 'CENTER' }); const ic = s.s === 'done' ? ['check-circle', 'status/success'] : s.s === 'current' ? ['clock', 'status/info'] : s.s === 'warn' ? ['alert-triangle', 'status/warning'] : ['clock', 'icon/muted']; add(rail, await IC(ic[0], 24, ic[1])); const ln = rect(2, 16, i < steps.length - 1 ? (s.s === 'done' ? 'status/success' : 'border/default') : null, 0, 'Connector'); add(rail, ln); add(r, rail); rail.layoutSizingVertical = 'FILL'; ln.layoutSizingVertical = 'FILL'; const tx = AL('VERTICAL', { name: 'Text', gap: 4, p: [0, 0, 20, 0] }); const tr = row('Head', { gap: 8 }); add(tr, await T(s.t, 'Body/M Strong', s.s === 'todo' ? 'text/secondary' : 'text/primary')); if (s.tag) add(tr, s.tag); add(tx, tr, [await T(s.d, 'Body/S', 'text/secondary', { w: 400 }), 'FILL']); if (s.extra) for (const e of [].concat(s.extra)) add(tx, e); add(r, [tx, 'FILL']); add(w, [r, 'FILL']); } return w; }
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { any = true; m = Math.max(m, c.y + c.height); } return any ? m + 160 : 160; }
async function lv(label, value, o = {}) { const c = col('LV ' + label, { gap: 2 }); add(c, await T(label, 'Caption', 'text/tertiary')); const r = row('Value', { gap: 6 }); if (o.node) add(r, o.node); else add(r, [await T(value, o.vs || 'Body/S Strong', o.vc || 'text/primary', { w: o.w || 220 }), 'FILL']); if (o.demo) add(r, await DEMO('XS')); add(c, [r, 'FILL']); return c; }
async function btnLabel(root, nestName, label) { const b = nest(root, nestName); if (b) setP(b, { Label: label }, 'btn'); else MISS.push('btn:' + nestName); }
// ===== END GP-HIST LIB =====
