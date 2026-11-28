// ===== GP HELPERS v1 — paste at the TOP of every use_figma script (GLOBAL POOL file) =====
// Gives: VAR TS ES PS lookups, paint/fill/stroke binders, token-bound gap/pad/radius,
// AL() auto-layout, T() text (async), I() instance (async), IC() icon instance (async),
// screen() top-level screen frame (async), put() to place into a Section, fitSection().
const __V = await figma.variables.getLocalVariablesAsync(); const VAR = {}; for (const v of __V) VAR[v.name] = v;
const TS = {}; for (const s of await figma.getLocalTextStylesAsync()) TS[s.name] = s;
const ES = {}; for (const s of await figma.getLocalEffectStylesAsync()) ES[s.name] = s;
const PS = {}; for (const s of await figma.getLocalPaintStylesAsync()) PS[s.name] = s;
const GS = {}; for (const s of await figma.getLocalGridStylesAsync()) GS[s.name] = s;
await Promise.all([['Inter','Regular'],['Inter','Medium'],['Inter','Semi Bold'],['Inter','Bold'],['Geist Mono','Regular'],['Geist Mono','Medium']].map(([family, style]) => figma.loadFontAsync({ family, style })));
const __COLS = {}; for (const c of await figma.variables.getLocalVariableCollectionsAsync()) __COLS[c.name] = c;
const SP = {0:'space/0',2:'space/0-5',4:'space/1',6:'space/1-5',8:'space/2',12:'space/3',16:'space/4',20:'space/5',24:'space/6',28:'space/7',32:'space/8',40:'space/10',48:'space/12',56:'space/14',64:'space/16',80:'space/20',96:'space/24',128:'space/32'};
const RD = {0:'radius/none',4:'radius/xs',6:'radius/sm',10:'radius/md',14:'radius/lg',20:'radius/xl',28:'radius/2xl',9999:'radius/full'};
function paint(name) { const v = VAR[name]; if (!v) throw new Error('No variable ' + name); return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v); }
function fill(n, name) { n.fills = name ? (Array.isArray(name) ? name.map(paint) : [paint(name)]) : []; return n; }
function stroke(n, name, w = 1, align = 'INSIDE') { n.strokes = [paint(name)]; n.strokeWeight = w; n.strokeAlign = align; return n; }
function strokeSides(n, name, sides = { b: 1 }) { n.strokes = [paint(name)]; n.strokeAlign = 'INSIDE'; n.strokeTopWeight = sides.t || 0; n.strokeRightWeight = sides.r || 0; n.strokeBottomWeight = sides.b || 0; n.strokeLeftWeight = sides.l || 0; return n; }
function bnum(n, prop, px) { const k = SP[px]; if (k && VAR[k]) n.setBoundVariable(prop, VAR[k]); else n[prop] = px; }
function gap(n, px) { bnum(n, 'itemSpacing', px); return n; }
function pad(n, t, r = t, b = t, l = r) { bnum(n, 'paddingTop', t); bnum(n, 'paddingRight', r); bnum(n, 'paddingBottom', b); bnum(n, 'paddingLeft', l); return n; }
function radius(n, px) { const k = RD[px]; for (const c of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius']) { if (k && VAR[k]) n.setBoundVariable(c, VAR[k]); else n[c] = px; } return n; }
// AL(dir, {name, gap, p:[t,r,b,l]|n, fill, stroke, sw, r, align, justify, w, h, wrap, clip})
function AL(dir = 'VERTICAL', o = {}) {
  const f = figma.createAutoLayout(dir); f.name = o.name || (dir === 'VERTICAL' ? 'Stack' : 'Row'); f.fills = [];
  if (o.gap != null) gap(f, o.gap);
  if (o.p != null) { const p = Array.isArray(o.p) ? o.p : [o.p]; pad(f, p[0], p[1] ?? p[0], p[2] ?? p[0], p[3] ?? p[1] ?? p[0]); }
  if (o.fill) fill(f, o.fill); if (o.stroke) stroke(f, o.stroke, o.sw || 1); if (o.r != null) radius(f, o.r);
  if (o.align) f.counterAxisAlignItems = o.align; if (o.justify) f.primaryAxisAlignItems = o.justify;
  if (o.wrap) { f.layoutWrap = 'WRAP'; if (o.cgap != null) bnum(f, 'counterAxisSpacing', o.cgap); }
  if (o.w || o.h) { f.resize(o.w || f.width, o.h || f.height); if (o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'FIXED'; else f.primaryAxisSizingMode = 'FIXED'; } if (o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'FIXED'; else f.counterAxisSizingMode = 'FIXED'; } }
  f.clipsContent = !!o.clip; return f;
}
// add(parent, ...kids) — kids may be [node, 'FILL'|'FILL_BOTH'|'FILLH'|'HUG'] tuples
function add(parent, ...kids) { for (let k of kids) { if (!k) continue; let mode = null; if (Array.isArray(k)) { mode = k[1]; k = k[0]; } parent.appendChild(k); if (mode === 'FILL' || mode === 'FILL_BOTH') k.layoutSizingHorizontal = 'FILL'; if (mode === 'FILLH' || mode === 'FILL_BOTH') k.layoutSizingVertical = 'FILL'; } return parent; }
// T(text, style, color, {w, align, name, upper}) — w makes it wrap (fixed width, auto height)
async function T(chars, style = 'Body/M', color = 'text/primary', o = {}) {
  const t = figma.createText(); if (!TS[style]) throw new Error('No text style ' + style);
  await t.setTextStyleIdAsync(TS[style].id); t.characters = String(chars); t.fills = [paint(color)];
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = 'HEIGHT'; }
  if (o.align) t.textAlignHorizontal = o.align; t.name = o.name || String(chars).slice(0, 48); return t;
}
async function fx(n, name) { if (!ES[name]) throw new Error('No effect style ' + name); await n.setEffectStyleIdAsync(ES[name].id); return n; }
async function gfill(n, name) { if (!PS[name]) throw new Error('No paint style ' + name); await n.setFillStyleIdAsync(PS[name].id); return n; }
function rect(w, h, color, r = 0, name = 'Rect') { const x = figma.createRectangle(); x.resize(w, h); x.name = name; if (color) fill(x, color); else x.fills = []; if (r) radius(x, r); return x; }
function ellipse(w, h, color, name = 'Ellipse') { const e = figma.createEllipse(); e.resize(w, h); e.name = name; if (color) fill(e, color); else e.fills = []; return e; }
// I(componentOrSetId, {variant props}, {text/bool/instance-swap props by base name}) -> InstanceNode
async function I(id, variant = {}, props = {}) {
  const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error('No component ' + id);
  let comp = n;
  if (n.type === 'COMPONENT_SET') { comp = n.children.find(c => { const p = Object.fromEntries(c.name.split(', ').map(s => s.split('='))); return Object.entries(variant).every(([k, v]) => p[k] === String(v)); }) || n.defaultVariant; }
  const inst = comp.createInstance();
  if (Object.keys(props).length) { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; } if (Object.keys(set).length) inst.setProperties(set); }
  return inst;
}
// recolor every vector stroke/fill inside an icon instance to a token
function tint(node, color) { for (const v of node.findAll(x => x.type === 'VECTOR' || x.type === 'ELLIPSE' || x.type === 'RECTANGLE' || x.type === 'BOOLEAN_OPERATION')) { if (v.strokes && v.strokes.length) v.strokes = [paint(color)]; if (v.fills && v.fills.length) v.fills = [paint(color)]; } return node; }
// screen(name, width, {x, y, mode:'Dark', bp:'Desktop 1440'|..., grid:true, fill}) -> vertical auto-layout frame, fixed width, hug height
async function screen(name, w, o = {}) {
  const f = figma.createAutoLayout('VERTICAL'); f.name = name; f.resize(w, o.h || 800); f.counterAxisSizingMode = 'FIXED'; f.primaryAxisSizingMode = o.h ? 'FIXED' : 'AUTO'; // AUTO = hug content height (resize() resets it to FIXED)
  fill(f, o.fill || 'bg/base'); f.clipsContent = true;
  const bpName = o.bp || (w >= 1440 ? 'Desktop 1440' : w >= 1280 ? 'Laptop 1280' : w >= 768 ? 'Tablet 768' : 'Mobile 390');
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === bpName); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  const cc = __COLS['Color']; const cm = cc.modes.find(m => m.name === (o.mode || 'Dark')); if (cm) f.setExplicitVariableModeForCollection(cc, cm.modeId);
  if (o.grid) { const g = Object.keys(GS).find(k => k.includes(String(w))); if (g) await f.setGridStyleIdAsync(GS[g].id); }
  if (o.x != null) f.x = o.x; if (o.y != null) f.y = o.y; return f;
}
// put(node, sectionId, x, y) — place node inside a Section at local coords
async function put(node, sectionId, x = 0, y = 0) { const s = await figma.getNodeByIdAsync(sectionId); s.appendChild(node); node.x = x; node.y = y; return node; }
function fitSection(s, padPx = 120) { if (!s.children.length) return; let maxX = 0, maxY = 0; for (const c of s.children) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); } s.resizeWithoutConstraints(maxX + padPx, maxY + padPx); }
// next free y inside a section (stack screens vertically) and next free x (row)
function nextY(s, g = 160) { let m = 0; for (const c of s.children) m = Math.max(m, c.y + c.height); return s.children.length ? m + g : 160; }
function nextX(s, g = 120) { let m = 0; for (const c of s.children) m = Math.max(m, c.x + c.width); return s.children.length ? m + g : 120; }
// ICONS: icon name -> component id (24px stroke icons). CHAIN/TOKEN marks: 'Chain/BNB Chain' 4:754, 'Chain/Polygon' 4:760, 'Chain/Arbitrum' 4:766, 'Chain/Ethereum' 4:772, 'Chain/Solana' 4:779, 'Token/USDT' 4:785
const ICONS = {"home":"4:7","pool":"4:14","games":"4:22","trophy":"4:29","list":"4:37","help-circle":"4:44","shield":"4:49","shield-check":"4:55","crown":"4:61","users":"4:68","user":"4:74","wallet":"4:82","deposit":"4:88","withdraw":"4:94","clock":"4:100","history":"4:107","settings":"4:113","bell":"4:119","logout":"4:125","search":"4:131","filter":"4:136","chevron-down":"4:141","chevron-up":"4:146","chevron-left":"4:151","chevron-right":"4:156","x":"4:161","check":"4:166","check-circle":"4:172","x-circle":"4:178","alert-triangle":"4:185","alert-circle":"4:192","info":"4:199","lock":"4:205","unlock":"4:211","copy":"4:217","external-link":"4:223","qr-code":"4:231","eye":"4:237","eye-off":"4:244","key":"4:250","smartphone":"4:256","monitor":"4:262","globe":"4:269","map-pin":"4:275","ban":"4:281","refresh":"4:289","plus":"4:294","minus":"4:299","more":"4:306","menu":"4:311","download":"4:317","upload":"4:323","file":"4:329","camera":"4:335","calendar":"4:341","dice":"4:351","coin":"4:358","cards":"4:365","roulette":"4:372","crash":"4:379","ticket":"4:385","gift":"4:392","sparkles":"4:398","zap":"4:403","link":"4:409","layers":"4:415","bar-chart":"4:423","pie-chart":"4:429","activity":"4:434","server":"4:442","database":"4:449","fingerprint":"4:456","scale":"4:462","flag":"4:467","megaphone":"4:473","mail":"4:479","heart":"4:484","pause":"4:490","play":"4:495","volume":"4:501","volume-x":"4:507","timer":"4:513","star":"4:518","sliders":"4:526","trash":"4:532","edit":"4:538","sort":"4:543","arrow-right":"4:548","arrow-left":"4:553","arrow-up-right":"4:558","arrow-down-left":"4:563","trending-up":"4:569","trending-down":"4:575","swap":"4:580","receipt":"4:586","percent":"4:593","chat":"4:598","book":"4:604","command":"4:609","grid":"4:617","dashboard":"4:625","hourglass":"4:630","pause-circle":"4:636","wifi-off":"4:643","wrench":"4:649","id-card":"4:656","face-scan":"4:663","signal":"4:668","contract":"4:674","code":"4:679","coins":"4:687","hash":"4:692","cookie":"4:700","spinner":"4:705","user-check":"4:712","user-x":"4:719","log-in":"4:725","shield-alert":"4:732","target":"4:739","rotate-ccw":"4:745","undo":"4:751"};
const CHAINS = {'BNB Chain':'4:754','Polygon':'4:760','Arbitrum':'4:766','Ethereum':'4:772','Solana':'4:779'}; const USDT_ID = '4:785';
// IC(name, size=20, color='icon/default') -> icon instance tinted with a token
async function IC(name, size = 20, color = 'icon/default') { const id = ICONS[name]; if (!id) throw new Error('No icon ' + name); const c = await figma.getNodeByIdAsync(id); const i = c.createInstance(); i.resize(size, size); tint(i, color); i.name = 'Icon/' + name; return i; }
async function CHAIN(name, size = 16) { const c = await figma.getNodeByIdAsync(CHAINS[name] || USDT_ID); const i = c.createInstance(); i.resize(size, size); i.name = 'Chain/' + name; return i; }
// DEMO(size='S') -> Badge/DEMO instance (XS in table cells, S next to values, M = "DEMO DATA" section label)
async function DEMO(size = 'S') { return await I('6:130', { Size: size }); }
// DEMOBAR(msg?) -> page-level Notice/Demo Data instance (append as first child of a screen, then set layoutSizingHorizontal='FILL')
async function DEMOBAR(msg) { const n = await I('6:131', {}, msg ? { Message: msg } : {}); return n; }
// BTN(type, label, {size:'M', state:'Default', lead:'icon', trail:'icon'}) -> Button instance. type: Primary|Secondary|Ghost|Danger|Gold
const BTN_IDS = { Primary: '7:193', Secondary: '7:308', Ghost: '7:423', Danger: '7:538', Gold: '7:653' };
async function BTN(type, label, o = {}) { const p = { Label: label }; if (o.lead) { p['Show leading icon'] = true; p['Leading icon'] = ICONS[o.lead]; } if (o.trail) { p['Show trailing icon'] = true; p['Trailing icon'] = ICONS[o.trail]; } const b = await I(BTN_IDS[type], { Size: o.size || 'M', State: o.state || 'Default' }, p); b.name = 'Button/' + type + ' — ' + label; return b; }
async function BADGE(status, size = 'S') { return await I('6:119', { Status: status, Size: size }); }
// section(name, x, y): get-or-create a Section on the CURRENT page with dark fill
function section(name, x = 0, y = 0) { let s = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === name); if (!s) { s = figma.createSection(); s.name = name; s.x = x; s.y = y; s.fills = [paint('bg/secondary')]; } return s; }
// ===== END GP HELPERS =====

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

// ===== m2 — [PUB-08] How It Works / 390 / Default =====
const N_HIW = '[PUB-08] How It Works / 390 / Default';
function vfill(n, name, fb = 'accent/gold') { if (VAR[name]) fill(n, name); else fill(n, fb); return n; }
if (!skipIf(/^\[PUB-08\].*\/ 390/, N_HIW)) {
  const S = await mshell(N_HIW, 630, 120); const C = S.C;
  add(C, [await pageHead('HOW IT WORKS', 'From deposit to draw in five steps', 'Global Pool is one shared prize pool per round. You buy entries with USDT, Chainlink VRF picks 13 winners at the published close time, and prizes land in your balance.', false), 'FILL']);
  // hero art: real product UI cropped by the frame edge on angled blocks
  const art = figma.createFrame(); art.name = 'Hero art — countdown + entry ticket (cropped)'; art.resize(358, 236); fill(art, 'surface/default'); radius(art, 20); stroke(art, 'border/subtle'); art.clipsContent = true; add(C, [art, 'FILL']);
  abs(art, rect(300, 600, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 190, -170, 18);
  abs(art, rect(36, 600, 'brand/primary', 0, 'Angled colour block — mint stripe'), 150, -170, 18);
  const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Preview — Card/Draw Countdown (cropped)'; dc.rescale(0.72); abs(art, dc, 16, 16); await fx(dc, 'Elevation/3 — Popover');
  const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; tk.rescale(0.55); abs(art, tk, 196, 140, -10);
  // five steps (vertical timeline)
  add(C, [await mhead('THE ROUND, STEP BY STEP', 'Five steps, nothing hidden', null, await DEMO('S')), 'FILL']);
  const steps = AL('VERTICAL', { name: 'Five steps — timeline', gap: 0 }); add(C, [steps, 'FILL']);
  const STEP = [
    ['1', 'Create your account', 'Sign up with email or a wallet and confirm you are 18+ and in a permitted region. KYC Level 2 (ID + liveness) is needed before your first withdrawal.', 'acct'],
    ['2', 'Deposit USDT', 'Pick one of five networks, copy your deposit address and send USDT. Only send on the network you picked — minimum deposit 10.00 USDT.', 'dep'],
    ['3', 'Buy entries', 'Each entry costs 10.00 USDT and all of it goes into the pool. The 0.05 USDT platform fee is charged per qualifying entry and is never part of the pool.', 'fee'],
    ['4', 'The round closes, Chainlink VRF draws', 'Entries freeze at the published close time — 27 Nov 2026, 20:00 UTC for round #1,248. The contract asks Chainlink VRF for a random number; nobody, including us, can choose or change it.', 'vrf'],
    ['5', 'Prizes reach your balance', 'Winners are settled on Arbitrum about two minutes after the close. Prizes move from Owed to Available and you can withdraw to a whitelisted address any time.', 'pay']];
  for (let i = 0; i < STEP.length; i++) {
    const [n, t, b, kind] = STEP[i];
    const row = AL('HORIZONTAL', { name: 'Step ' + n + ' — ' + t, gap: 16 }); add(steps, [row, 'FILL']);
    const rail = AL('VERTICAL', { name: 'Rail', gap: 0, align: 'CENTER' }); add(row, [rail, 'FILLH']);
    const nc = AL('HORIZONTAL', { name: 'Number', w: 32, h: 32, r: 9999, fill: 'brand/primary', align: 'CENTER', justify: 'CENTER' }); add(nc, await T(n, 'Label/M', 'text/on-primary')); add(rail, nc);
    if (i < STEP.length - 1) { const ln = rect(2, 40, 'border/default', 0, 'Connector'); add(rail, ln); ln.layoutSizingVertical = 'FILL'; }
    const col = AL('VERTICAL', { name: 'Step content', gap: 8, p: [4, 0, 32, 0] }); add(row, [col, 'FILL']);
    add(col, await T('STEP ' + n, 'Overline', 'text/tertiary'), [await T(t, 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], [await T(b, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
    const pv = box('Product preview — ' + t, { gap: 10, p: 12, fill: 'surface/raised', r: 14 }); add(col, [pv, 'FILL']);
    if (kind === 'acct') { const w = chips('Account checks'); add(w, await I('6:159'), await statusChip('ok', 'Email verified'), await statusChip('ok', 'KYC Level 2'), await statusChip('ok', 'Portugal — permitted')); add(pv, [w, 'FILL']); }
    if (kind === 'dep') { const w = chips('Networks'); for (const [c, s] of [['BNB Chain', 'Operational'], ['Polygon', 'Operational'], ['Arbitrum', 'Operational'], ['Ethereum', 'Degraded'], ['Solana', 'Operational']]) { const p = await I('9:377', { Chain: c, Status: s }, { 'Show status label': false, 'Show chevron': false }); p.name = 'Wallet/Network Pill — ' + c; add(w, p); } add(pv, [w, 'FILL'], [await T('Ethereum is congested right now — Arbitrum, Polygon and Solana withdrawals cost under 0.10 USDT.', 'Caption', 'text/tertiary', { w: 276 }), 'FILL']); }
    if (kind === 'fee') { for (const [k, v, c] of [['Entry', '10.00 USDT', 'text/primary'], ['Platform fee', '0.05 USDT', 'text/primary'], ['Network fee', '0.00 USDT — paid from balance', 'text/secondary'], ['You pay per entry', '10.05 USDT', 'text/primary']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, k.startsWith('You') ? 'Body/S Strong' : 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Label/M', c)); add(pv, [r, 'FILL']); } const wl = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(wl, await IC('alert-triangle', 14, 'text/warning'), await T('You can lose your stake.', 'Caption', 'text/warning')); add(pv, wl); }
    if (kind === 'vrf') { for (const [tm, l, s] of [['20:00:00', 'Round #1,248 closes · 18,640 entries', 'ok'], ['20:00:04', 'VRF requested · 0x9f2c…e71a', 'ok'], ['20:00:41', 'Random word fulfilled · 3 confirmations', 'ok'], ['20:02:10', 'Winners settled on Arbitrum', 'ok']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC('check-circle', 14, 'text/success'), await T(tm, 'Mono/S', 'text/primary'), [await T(l, 'Caption', 'text/secondary', { w: 180 }), 'FILL']); add(pv, [r, 'FILL']); } const dr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dr, await T('Times in UTC · example from round #1,248', 'Caption', 'text/tertiary'), await DEMO('XS')); add(pv, dr); }
    if (kind === 'pay') { const r = AL('HORIZONTAL', { name: 'Owed → Available', gap: 8, align: 'CENTER' }); const o = AL('VERTICAL', { gap: 2, p: [8, 12, 8, 12], r: 10, fill: 'accent/gold-tint' }); add(o, await T('OWED', 'Overline', 'text/gold'), await T('3,728.00', 'Number/S', 'text/gold')); const a = AL('VERTICAL', { gap: 2, p: [8, 12, 8, 12], r: 10, fill: 'status/success-tint' }); add(a, await T('AVAILABLE', 'Overline', 'text/success'), await T('+3,728.00', 'Number/S', 'text/success')); add(r, o, await IC('arrow-right', 18, 'icon/muted'), a, await DEMO('XS')); add(pv, [r, 'FILL'], [await T('Runner-up example · round #1,248 · withdraw from 20.00 USDT, platform withdrawal fee 0.00 USDT', 'Caption', 'text/tertiary', { w: 276 }), 'FILL']); }
  }
  // prize split
  add(C, [await mhead('PRIZE SPLIT', 'Where round #1,248’s pool goes', '13 winners per round. Every qualifying entry has the same chance — VIP level never changes the odds.', await DEMO('S')), 'FILL']);
  const ps = box('Prize split — round #1,248', { gap: 12, p: 16 }); add(C, [ps, 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Split bar (share × 326 px)', gap: 2 }); add(ps, [bar, 'FILL']);
  for (const [w, v, nm] of [[161, 'chart/prize-1', '1st 50%'], [64, 'chart/prize-2', '2nd 20%'], [32, 'chart/prize-3', '3rd 10%']]) { const s = rect(w, 12, null, 4, nm); vfill(s, v); add(bar, s); }
  for (let k = 0; k < 10; k++) { const s = rect(5, 12, null, 2, 'Runner-up ' + (k + 1) + ' 2%'); vfill(s, 'chart/prize-4', 'accent/gold-strong'); add(bar, s); }
  for (const [k, sh, v] of [['1st prize', '50%', '93,200.00'], ['2nd prize', '20%', '37,280.00'], ['3rd prize', '10%', '18,640.00'], ['10 runner-ups', '2% each', '3,728.00 each']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(sh, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/gold')); add(ps, [r, 'FILL']); }
  const tot = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [8, 0, 0, 0] }); strokeSides(tot, 'border/subtle', { t: 1 }); add(tot, [await T('Pool = 18,640 entries × 10.00', 'Body/S Strong', 'text/primary'), 'FILL'], await T('186,400.00 USDT', 'Number/S', 'text/gold')); add(ps, [tot, 'FILL']);
  // fees explained
  add(C, [await mhead('FEES', 'Every fee, on its own line', 'Platform fees for round #1,248: 18,640 × 0.05 = 932.00 USDT — kept separate from the pool.', await DEMO('S')), 'FILL']);
  add(C, [await kvList('Fee table', [['Entry price', '10.00 USDT → pool'], ['Platform fee', '0.05 USDT / entry'], ['Network fee on entries', '0.00 USDT'], ['Deposit network fee', 'paid by your wallet'], ['Withdrawal network fee', '0.01–2.40 USDT'], ['Platform withdrawal fee', '0.00 USDT']], { kw: 150 }), 'FILL']);
  const ex = box('Worked example — 35 entries', { gap: 10, p: 16, fill: 'bg/secondary' }); add(C, [ex, 'FILL']);
  const exh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(exh, await T('WORKED EXAMPLE', 'Overline', 'text/brand'), await DEMO('XS')); add(ex, exh);
  for (const [k, v, st] of [['35 entries × 10.00', '350.00 USDT', 'Label/M'], ['Platform fee 35 × 0.05', '1.75 USDT', 'Label/M'], ['You pay', '351.75 USDT', 'Number/S']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, st, 'text/primary')); add(ex, [r, 'FILL']); }
  add(ex, [await T('Chance of any prize ≈ 2.44% · chance of 1st ≈ 0.188% (35 of 18,640 entries). Most entries win nothing.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
  add(ex, [await callout('warn', 'You can lose your stake', 'Only enter with money you can afford to lose. Entries can’t be cancelled after you confirm.'), 'FILL']);
  // threshold & refunds
  add(C, [await callout('info', 'No draw without a quorum — then everyone is refunded', 'A round draws only with at least 500 participants and a 50,000.00 USDT pool. Round #1,245 closed with 412 participants, so every entry and fee went back to players’ Owed balance.'), 'FILL']);
  // fairness
  const fa = box('Fairness', { gap: 12, p: 20 }); add(C, [fa, 'FILL']);
  add(fa, await T('FAIRNESS', 'Overline', 'text/brand'), [await T('Random, verifiable, untouchable', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [ic, t, b] of [['shield-check', 'Chainlink VRF picks the winners', 'The random number and its proof are on Arbitrum — anyone can check them.'], ['users', 'Same chance for every entry', 'VIP level, deposit size or account age never change the odds.'], ['ban', 'No one can edit a result', 'Admins can’t pick winners, change a draw or pay out from the pool.']]) add(fa, [await iconRow(ic, t, b, { w: 250 }), 'FILL']);
  add(fa, [await BTN('Secondary', 'Verify a draw', { size: 'L', lead: 'shield-check' }), 'FILL']);
  // responsible gaming
  const rg = box('Responsible gaming', { gap: 12, p: 20, fill: 'bg/secondary' }); add(C, [rg, 'FILL']);
  const rgh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rgh, [await T('RESPONSIBLE GAMING', 'Overline', 'text/brand'), 'FILL'], await I('6:159')); add(rg, [rgh, 'FILL']);
  add(rg, [await T('Set your limits before you play', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [ic, t, b] of [['sliders', 'Deposit & participation limits', 'Daily, weekly or monthly. Decreases apply at once; increases wait 24 h.'], ['timer', 'Reality checks', 'A reminder every 60 minutes with your time played and net result.'], ['pause-circle', 'Cooling-off & self-exclusion', '24 hours to permanent — always as easy as depositing.']]) add(rg, [await iconRow(ic, t, b, { w: 250 }), 'FILL']);
  add(rg, [await BTN('Secondary', 'Responsible gaming tools', { size: 'L', lead: 'heart' }), 'FILL'], [await T('Need to talk? GamCare · Gamblers Anonymous · Gambling Therapy', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  add(C, [await linkRow('More questions? Read the FAQ'), 'FILL']);
  await mlic(C, false);
  await mfinish(S, await sticky('Create free account', '18+ · permitted regions only · entries from 10.05 USDT'), 'Home');
  OUT.created[N_HIW] = S.f.id; EXIST[N_HIW] = S.f;
  fitSection(sec);
  await S.f.screenshot({ scale: 0.5 });
}
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
