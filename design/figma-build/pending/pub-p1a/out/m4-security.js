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

// ===== m4 — [PUB-13] Security Center / 390 / Default =====
const N_SEC = '[PUB-13] Security Center / 390 / Default';
if (!skipIf(/^\[PUB-13\].*\/ 390/, N_SEC)) {
  const S = await mshell(N_SEC, 1650, 120); const C = S.C;
  add(C, [await pageHead('SECURITY CENTER', 'How we protect your account and your USDT', 'What we do on our side, what you can switch on in two minutes, and where to report a problem.', true), 'FILL']);
  // incident status
  const inc = box('Incident status', { gap: 12, p: 16 }); add(C, [inc, 'FILL']);
  const ih = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ih, await IC('check-circle', 20, 'text/success'), [await T('All systems operational', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(inc, [ih, 'FILL']);
  add(inc, [await T('No open incidents. Last incident: delayed Ethereum deposits on 14 Nov 2026, 09:12 UTC — resolved in 38 min, no funds affected.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const np = AL('HORIZONTAL', { name: 'Network status pills', gap: 8, wrap: true, cgap: 8 }); for (const [c, s] of [['BNB Chain', 'Operational'], ['Polygon', 'Operational'], ['Arbitrum', 'Operational'], ['Ethereum', 'Degraded'], ['Solana', 'Operational']]) { const p = await I('9:377', { Chain: c, Status: s }, { 'Show status label': false, 'Show chevron': false }); p.name = 'Wallet/Network Pill — ' + c; add(np, p); } add(inc, [np, 'FILL']);
  const il = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(il, [await T('Ethereum: congested, deposits slower (≈ 9 min)', 'Caption', 'text/warning'), 'FILL'], await T('Status page', 'Label/S', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(inc, [il, 'FILL']);
  // custody model
  add(C, [await mhead('CUSTODY MODEL', 'Where the money sits', 'Player balances are kept apart from operating funds and reconciled every hour.', await DEMO('S')), 'FILL']);
  const cu = box('Custody model', { gap: 12, p: 16 }); add(C, [cu, 'FILL']);
  const cb = AL('HORIZONTAL', { name: 'Split bar — cold 95% / hot 5%', gap: 2 }); add(cu, [cb, 'FILL']); const c1 = rect(306, 12, 'brand/primary', 4, 'Cold storage 95%'); add(cb, [c1, 'FILL']); add(cb, rect(16, 12, 'accent/gold', 4, 'Hot wallet 5%'));
  const cl = AL('HORIZONTAL', { gap: 12 }); add(cl, [await T('Cold storage 95%', 'Caption', 'text/secondary'), 'FILL'], await T('Hot wallet 5%', 'Caption', 'text/secondary')); add(cu, [cl, 'FILL']);
  for (const [ic, t, b] of [['lock', 'Cold storage', '3-of-5 multi-signature vault with offline keys held by separate officers.'], ['wallet', 'Hot wallet', 'Pays withdrawals; topped up from cold storage only with two approvals.'], ['contract', 'Pool contract', 'This round’s pool — 186,400.00 USDT — sits in the GlobalPool contract on Arbitrum, not in our wallets.'], ['scale', 'Segregated & reconciled', 'Player balances are ring-fenced from company money; ledger and chain are reconciled hourly.']]) add(cu, [await iconRow(ic, t, b, { w: 260, line: t !== 'Segregated & reconciled' }), 'FILL']);
  // smart contracts & audits
  add(C, [await mhead('SMART CONTRACTS & AUDITS', 'Published, versioned, audited', 'Audit firm names and reports are placeholders until the final reports are published.', await DEMO('S')), 'FILL']);
  const sc = box('Contracts', { gap: 0, p: [4, 16, 4, 16] }); add(C, [sc, 'FILL']);
  const CT = [['GlobalPool', 'v1.3.0', '0x4b1d…77ce'], ['VRFConsumer', 'v1.1.2', '0x9e07…2a5f'], ['Treasury', 'v1.0.4', '0xd3c8…10b9']];
  for (let i = 0; i < CT.length; i++) { const [n, v, a] = CT[i]; const r = AL('VERTICAL', { name: 'Contract — ' + n, gap: 6, p: [12, 0, 12, 0] }); if (i < CT.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const t1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(t1, await CHAIN('Arbitrum', 16), [await T(n + ' ' + v, 'Label/M', 'text/primary'), 'FILL'], await statusChip('info', 'Audited — DEMO placeholder')); const t2 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(t2, await T(a, 'Mono/S', 'text/secondary'), await DEMO('XS'), [AL('HORIZONTAL', { name: 'spacer' }), 'FILL'], await T('Explorer', 'Label/S', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(r, [t1, 'FILL'], [t2, 'FILL']); add(sc, [r, 'FILL']); }
  add(C, [await BTN('Secondary', 'Audit reports (placeholder)', { size: 'L', lead: 'file' }), 'FILL']);
  // VRF
  const vr = box('Chainlink VRF', { gap: 10, p: 16, fill: 'bg/secondary' }); add(C, [vr, 'FILL']);
  const vh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(vh, await IC('shield-check', 20, 'icon/brand'), [await T('Draws use Chainlink VRF', 'Heading/H5', 'text/primary'), 'FILL']); add(vr, [vh, 'FILL']);
  add(vr, [await T('Every Global Pool winner comes from a verifiable random number with an on-chain proof. Round #1,248: request 0x9f2c…e71a at 20:00:04 UTC.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], [await BTN('Primary', 'Verify a draw', { size: 'L', lead: 'shield-check' }), 'FILL']);
  // account protection
  add(C, [await mhead('PROTECT YOUR ACCOUNT', 'Five switches, two minutes', 'All free. Security and transaction alerts can’t be turned off.'), 'FILL']);
  const ap = box('Account protection', { gap: 0, p: [4, 16, 4, 16] }); add(C, [ap, 'FILL']);
  const AP = [['smartphone', 'Two-factor authentication', 'Authenticator app codes on sign-in and every withdrawal. No SMS codes — SIM swaps can steal them.'], ['mail', 'Anti-phishing code', 'A word you choose appears in every email we send, so fakes are easy to spot.'], ['list', 'Withdrawal address whitelist', 'Withdraw only to saved addresses. New addresses wait 24 h before first use.'], ['monitor', 'Device & sign-in alerts', 'A new device triggers an email and an in-app alert with “Secure my account”.'], ['key', 'Session control', 'See every signed-in device and end them all in one tap.']];
  for (let i = 0; i < AP.length; i++) { const [ic, t, b] = AP[i]; add(ap, [await iconRow(ic, t, b, { w: 270, line: i < AP.length - 1 }), 'FILL']); }
  // anti-phishing email preview (example code, not a real user's)
  const em = box('Example email — anti-phishing code', { gap: 8, p: 16 }); add(C, [em, 'FILL']);
  const eh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(eh, [await T('WHAT A REAL EMAIL LOOKS LIKE', 'Overline', 'text/tertiary'), 'FILL'], await DEMO('XS')); add(em, [eh, 'FILL']);
  add(em, await T('From: GLOBAL POOL <no-reply@globalpool.example>', 'Mono/S', 'text/secondary'), await T('Subject: Withdrawal requested — 1,500.00 USDT', 'Body/S Strong', 'text/primary'));
  const code = AL('HORIZONTAL', { name: 'Code row', gap: 8, p: [8, 12, 8, 12], r: 10, fill: 'brand/tint', align: 'CENTER' }); add(code, await IC('shield', 16, 'icon/brand'), [await T('Your anti-phishing code:', 'Body/S', 'text/secondary'), 'FILL'], await T('SUNSET-42', 'Mono/M', 'text/brand')); add(em, [code, 'FILL']);
  add(em, [await T('Example code only. No code, or the wrong one? Don’t click anything — forward the email to security@globalpool.example.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
  // never ask
  const nv = box('We will never ask', { gap: 0, p: [12, 16, 12, 16], fill: 'bg/secondary' }); add(C, [nv, 'FILL']); add(nv, await T('We will never ask you for', 'Heading/H5', 'text/primary'));
  for (const t of ['Your seed phrase or private keys', 'A 2FA code by phone, chat or social media', 'A “test” transfer to verify your wallet', 'Remote access to your computer or phone']) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [8, 0, 8, 0] }); add(r, await IC('x-circle', 16, 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(nv, [r, 'FILL']); }
  // bug bounty
  const bb = box('Bug bounty', { gap: 12, p: 20, stroke: 'border/brand' }); add(C, [bb, 'FILL']);
  const bh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(bh, [await T('BUG BOUNTY', 'Overline', 'text/brand'), 'FILL'], await DEMO('S')); add(bb, [bh, 'FILL']);
  add(bb, [await T('Up to 50,000.00 USDT for critical findings', 'Heading/H4', 'text/primary', { w: 318 }), 'FILL']);
  for (const [k, v] of [['Critical', 'up to 50,000.00'], ['High', 'up to 10,000.00'], ['Medium', 'up to 2,000.00'], ['Low', 'up to 250.00']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v + ' USDT', 'Label/M', 'text/primary')); add(bb, [r, 'FILL']); }
  add(bb, [await T('Scope: smart contracts, web app and public APIs. Safe harbour for good-faith research; first response within 48 h.', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  add(bb, [await BTN('Primary', 'Report a vulnerability', { size: 'L', lead: 'shield-alert' }), 'FILL'], [await BTN('Ghost', 'Read the disclosure policy', { size: 'L' }), 'FILL']);
  // compromised account
  const ca = box('Think your account is compromised?', { gap: 12, p: 16, fill: 'status/danger-tint', stroke: 'border/danger' }); add(C, [ca, 'FILL']);
  const ch = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ch, await IC('alert-circle', 20, 'text/danger'), [await T('Think your account is compromised?', 'Heading/H5', 'text/primary', { w: 290 }), 'FILL']); add(ca, [ch, 'FILL']);
  add(ca, [await T('“Secure my account” signs out every device, pauses withdrawals for 24 h and asks you to reset your password. Your balance and entries stay safe.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], [await BTN('Secondary', 'Secure my account', { size: 'L', lead: 'lock' }), 'FILL']);
  await mlic(C);
  await mfinish(S, null, 'Account');
  OUT.created[N_SEC] = S.f.id; EXIST[N_SEC] = S.f;
  fitSection(sec);
  await S.f.screenshot({ scale: 0.5 });
}
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
