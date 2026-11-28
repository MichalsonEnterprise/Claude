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

// ===== usr-vip-ref LIB (common) =====
const MISS = []; const FILLC = new Set();
async function ld(t) { if (t.fontName === figma.mixed) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); } else await figma.loadFontAsync(t.fontName); }
async function sx(root, name, val, i = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[i]; if (!t) { MISS.push(String(root.name).slice(0, 28) + '>' + name); return null; } await ld(t); t.characters = String(val); return t; }
async function sxm(root, m) { for (const k in m) await sx(root, k, m[k]); return root; }
async function sxc(root, has, val) { const t = root.findAll(n => n.type === 'TEXT' && n.characters.includes(has))[0]; if (!t) { MISS.push('~' + has); return null; } await ld(t); t.characters = String(val); return t; }
async function sxi(root, i, val) { const t = root.findAll(n => n.type === 'TEXT')[i]; if (!t) { MISS.push('#' + i + ' in ' + String(root.name).slice(0, 20)); return null; } await ld(t); t.characters = String(val); return t; }
function nest(root, name) { return root.findOne(n => n.type === 'INSTANCE' && n.name === name); }
function byName(root, name) { const n = root.findOne(x => x.name === name); if (!n) MISS.push('node ' + name); return n; }
function setP(inst, props) { if (!inst) { MISS.push('setP null'); return; } const cp = inst.componentProperties; const s = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) s[key] = v; else MISS.push('prop ' + k); } if (Object.keys(s).length) inst.setProperties(s); }
function FW(f, dir, o) { if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } return f; }
function CARD(o = {}) { return FW(AL(o.dir || 'VERTICAL', { name: o.name || 'Card', gap: o.gap ?? 16, p: o.p ?? 24, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, align: o.align, justify: o.justify, w: o.w, clip: o.clip }), o.dir || 'VERTICAL', o); }
function ROW(o = {}) { return FW(AL('HORIZONTAL', { gap: 12, align: 'CENTER', ...o }), 'HORIZONTAL', o); }
function COL(o = {}) { return FW(AL('VERTICAL', { gap: 8, ...o }), 'VERTICAL', o); }
function BAR(w, pct, color, h = 8, track = 'surface/raised') { const tr = figma.createFrame(); tr.name = 'Progress'; tr.resize(w, h); fill(tr, track); radius(tr, 9999); tr.clipsContent = true; const f = rect(Math.max(h, Math.round(w * pct)), h, color, 9999, 'Fill'); tr.appendChild(f); return tr; }
async function TILE(icon, ic = 'icon/brand', bg = 'brand/tint', s = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: bg, r: 10, align: 'CENTER', justify: 'CENTER' }); add(t, await IC(icon, Math.round(s * 0.5), ic)); return t; }
const CK = { ok: ['check-circle', 'status/success'], no: ['x-circle', 'status/danger'], lock: ['lock', 'icon/muted'], info: ['info', 'status/info'], warn: ['alert-triangle', 'status/warning'], clock: ['clock', 'status/pending'] };
async function CHK(text, kind = 'ok', w = 300, style = 'Body/S', color = 'text/secondary') { const r = ROW({ name: 'Check — ' + kind, gap: 8, align: 'MIN' }); add(r, await IC(CK[kind][0], 18, CK[kind][1])); add(r, await T(text, style, color, { w })); return r; }
async function KV(k, v, o = {}) { const r = ROW({ name: 'KV — ' + k, justify: 'SPACE_BETWEEN' }); add(r, await T(k, o.ks || 'Body/S', o.kc || 'text/secondary')); const rt = ROW({ gap: 6 }); add(rt, await T(v, o.vs || 'Number/S', o.vc || 'text/primary')); if (o.demo) add(rt, await DEMO('XS')); add(r, rt); return r; }
async function KPI(label, value, unit, o = {}) { const c = CARD({ name: 'KPI — ' + label, gap: 10, p: o.p ?? 20 }); const top = ROW({ gap: 8 }); if (o.icon) add(top, await TILE(o.icon, o.ic || 'icon/default', o.bg || 'surface/raised', 32)); add(top, await T(label, 'Label/M', 'text/secondary')); add(top, await DEMO('XS')); add(c, top); const v = ROW({ gap: 6, align: 'MAX' }); add(v, await T(value, o.size || 'Number/L', o.color || 'text/primary')); if (unit) add(v, await T(unit, 'Body/S', 'text/tertiary')); add(c, v); if (o.cap) add(c, [await T(o.cap, 'Caption', o.capc || 'text/tertiary', { w: o.cw || 220 }), 'FILL']); if (o.extra) for (const e of o.extra) add(c, [e, 'FILL']); return c; }
async function HC(label, w, right = false) { const h = await I('22:8309', { Align: right ? 'Right' : 'Left', Sort: 'None' }, { Label: label, 'Show sort icon': false }); h.resize(w, h.height); return h; }
function CELL(w, kids, o = {}) { const c = AL(o.v ? 'VERTICAL' : 'HORIZONTAL', { name: o.name || 'Cell', gap: o.gap ?? (o.v ? 2 : 8), p: [o.py ?? 14, 16, o.py ?? 14, 16], align: o.v ? (o.right ? 'MAX' : 'MIN') : 'CENTER', justify: (!o.v && o.right) ? 'MAX' : undefined }); if (w !== 'FILL') { c.resize(w, Math.max(1, c.height)); if (o.v) { c.counterAxisSizingMode = 'FIXED'; c.primaryAxisSizingMode = 'AUTO'; } else { c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; } } for (const k of kids) add(c, k); if (w === 'FILL') FILLC.add(c.id); return c; }
function addRow(table, cells, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', align: 'CENTER', fill: o.fill }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 }); for (const c of cells) { add(r, c); if (FILLC.has(c.id)) c.layoutSizingHorizontal = 'FILL'; } add(table, [r, 'FILL']); return r; }
async function HEADROW(table, cols) { const r = AL('HORIZONTAL', { name: 'Header row', fill: 'bg/secondary' }); strokeSides(r, 'border/subtle', { b: 1 }); for (const [l, w, right] of cols) { const h = await HC(l, w === 'FILL' ? 160 : w, right); add(r, h); if (w === 'FILL') h.layoutSizingHorizontal = 'FILL'; } add(table, [r, 'FILL']); return r; }
async function TX(text, style = 'Body/S', color = 'text/primary', w) { return T(text, style, color, w ? { w } : {}); }
async function TWO(a, b, o = {}) { const c = COL({ gap: 2 }); const t1 = await T(a, o.as || 'Body/S Strong', o.ac || 'text/primary', o.w ? { w: o.w } : {}); const t2 = await T(b, 'Caption', 'text/tertiary', o.w ? { w: o.w } : {}); add(c, o.w ? [t1, 'FILL'] : t1); add(c, o.w ? [t2, 'FILL'] : t2); return c; }
async function BADGEL(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await sxi(b, 0, label); return b; }
async function AMT(v, o = {}) { const r = ROW({ gap: 4, align: 'MAX', name: 'Amount ' + v }); add(r, await T(v, o.s || 'Number/S', o.c || 'text/primary')); add(r, await T(o.u ?? 'USDT', 'Caption', 'text/tertiary')); if (o.demo) add(r, await DEMO('XS')); return r; }
// bar chart: vals[], labels[], {w,h,color,last,lastColor,max,grid:[...]} -> frame
async function CHART(vals, labels, o = {}) { const W = o.w || 320, H = o.h || 140, n = vals.length, g = o.gap ?? 8; const bw = Math.floor((W - 36 - g * (n - 1)) / n); const max = o.max || Math.max(...vals); const fr = figma.createFrame(); fr.name = 'Chart — ' + (o.name || 'bars'); fr.resize(W, H + 24); fr.fills = []; fr.clipsContent = false;
  for (const gv of (o.grid || [])) { const y = Math.round(H - H * gv / max); const ln = rect(W - 36, 1, 'chart/grid', 0, 'Grid ' + gv); ln.x = 36; ln.y = y; fr.appendChild(ln); const t = await T(o.fmt ? o.fmt(gv) : String(gv), 'Caption', 'text/tertiary'); fr.appendChild(t); t.x = 0; t.y = y - 8; }
  const base = rect(W - 36, 1, 'chart/baseline', 0, 'Baseline'); base.x = 36; base.y = H; fr.appendChild(base);
  for (let i = 0; i < n; i++) { const h = Math.max(2, Math.round(H * vals[i] / max)); const last = o.last && i === n - 1; const b = rect(bw, h, last ? (o.lastColor || 'chart/series-4') : (o.color || 'chart/series-1'), 4, 'Bar ' + (labels[i] || i)); b.x = 36 + i * (bw + g); b.y = H - h; fr.appendChild(b); if (labels[i]) { const t = await T(labels[i], 'Caption', 'text/tertiary'); fr.appendChild(t); t.x = Math.round(36 + i * (bw + g) + bw / 2 - t.width / 2); t.y = H + 6; } }
  return fr; }
async function SCRIM(f, name = 'Scrim') { const s = rect(f.width, f.height, 'scrim/overlay', 0, name); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; return s; }
async function CIC(id, s = 20, color = 'icon/default') { const c = await figma.getNodeByIdAsync(id); const i = c.createInstance(); i.resize(s, s); tint(i, color); return i; }
async function SWAPIC(inst, name, color) { if (!inst) { MISS.push('swap null'); return; } const w = inst.width; const c = await figma.getNodeByIdAsync(ICONS[name]); inst.swapComponent(c); inst.resize(w, w); tint(inst, color); }
// Card/VIP Tier library benefit lines still say "Weekly reward 0.1–1.0%" / "Higher withdrawal limits" -> override per tier (same copy as PUB-10)
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); for (const [i, t] of ts.entries()) { if (b[i]) { await ld(t); t.characters = b[i]; } } for (const t of inst.findAll(n => n.type === 'TEXT' && /withdrawal limit|0\.1–1\.0%|rakeback/i.test(n.characters))) { await ld(t); t.characters = t.characters.replace(/Higher withdrawal limits/i, 'Same withdrawal checks for every tier').replace(/Weekly reward 0\.1–1\.0%/i, 'Weekly reward, paid in USDT'); } if (!ts.length) MISS.push('vipFix no Benefit in ' + tier); return ts.length; }
// Pagination: set range text, rows-per-page label and last page number; hide pages beyond `last`
async function PAG(range, per, last) { const p = await I('23:16756', { Type: 'Numbered' }); await sx(p, 'Range', range);
  const rp = p.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Secondary')); if (rp) setP(rp, { Label: String(per) });
  const pg = (k) => p.findOne(n => n.name === 'Page ' + k);
  const lastNode = pg(65); if (lastNode) { if (last <= 5) lastNode.visible = false; else { if (lastNode.type === 'INSTANCE') { const cp = lastNode.componentProperties; if (Object.keys(cp).some(x => x.startsWith('Label#'))) setP(lastNode, { Label: String(last) }); else await sxi(lastNode, 0, String(last)); } else await sxi(lastNode, 0, String(last)); } } else MISS.push('Page 65');
  if (last <= 6) { const g = p.findOne(n => n.name === 'Gap'); if (g) g.visible = false; }
  for (let k = last + 1; k <= 5; k++) { const n = pg(k); if (n) n.visible = false; }
  return p; }
async function SEARCH(ph, size = 'S') { const s = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); await sxc(s, 'Search', ph); return s; }
function FIXEMPTY(root) { let n = 0; for (const x of root.findAll(x => x.type === 'FRAME' && x.children.length === 0 && (x.name === 'Row' || x.name === 'Cell' || x.name === 'Stack') && x.height >= 99)) { const fillW = x.layoutSizingHorizontal === 'FILL'; x.resize(Math.max(1, x.width), 1); if (fillW) x.layoutSizingHorizontal = 'FILL'; n++; } return n; }
// ===== END LIB =====

// ===== usr-vip-ref DESKTOP SHELL =====
async function DESK(NAME, X, Y, m) {
  for (const c of [...sec.children]) if (c.name === NAME) c.remove();
  if (Y === 'BELOW') { let my = 0; for (const c of sec.children) if (Math.abs(c.x - X) < 2) my = Math.max(my, c.y + c.height); Y = my + 160; }
  const f = await screen(NAME, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  const bar = await DEMOBAR(); add(f, [bar, 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); add(body, sb); sb.name = 'Shell/Sidebar'; sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Shell/Sidebar Item')) { const cp = it.componentProperties; const lk = Object.keys(cp).find(k => k.startsWith('Label#')); const lab = lk ? cp[lk].value : ''; const st = cp.State && cp.State.value; if (lab === m.active) { it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } }
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  const tb = await I('23:9832', { State: 'Member' }); tb.name = 'Shell/Topbar Desktop'; add(main, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', gap: 24, p: [32, 32, 48, 32] }); add(main, [content, 'FILL']);
  const crumb = await I('14:1145', { Levels: '3' }); await sxm(crumb, { 'Crumb 1': 'Dashboard', 'Crumb 2': m.area, 'Current page': m.page }); add(content, crumb);
  const hr = ROW({ name: 'Page header', gap: 24, align: 'MAX' }); add(content, [hr, 'FILL']);
  const hl = COL({ gap: 6 }); add(hr, [hl, 'FILL']);
  const t1 = ROW({ gap: 12 }); add(t1, await T(m.title, 'Heading/H2', 'text/primary')); add(t1, await DEMO('M')); add(hl, t1);
  add(hl, await T(m.sub, 'Body/M', 'text/secondary', { w: 680 }));
  const ha = ROW({ name: 'Header actions' }); for (const a of (m.actions ? await m.actions() : [])) add(ha, a); add(hr, ha);
  const tabs = ROW({ name: 'Sub-nav', gap: 4, align: 'MAX' }); strokeSides(tabs, 'border/subtle', { b: 1 }); add(content, [tabs, 'FILL']);
  for (const x of m.tabs) { const ti = await I('20:6831', { State: x.on ? 'Active' : 'Default' }, { Label: x.l, 'Show count': !!x.c }); if (x.c) { const cn = nest(ti, 'Count'); if (cn) setP(cn, { Count: x.c }); } add(tabs, ti); }
  return { f, content };
}
const VTABS = (on) => ['Level & progress', 'Points', 'Rewards', 'Benefits'].map(l => ({ l, on: l === on, c: l === 'Rewards' ? '2' : null }));
const RTABS = (on) => ['Overview', 'Statistics', 'Invited users', 'Earnings', 'Payouts'].map(l => ({ l, on: l === on, c: l === 'Invited users' ? '48' : null }));
async function FOOT(content, text) { const r = ROW({ name: 'Compliance footer', gap: 16, p: [16, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await I('6:159')); add(r, [await T(text, 'Caption', 'text/tertiary', { w: 560 }), 'FILL']); add(r, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); add(r, await BTN('Ghost', 'Terms apply', { size: 'S', lead: 'file' })); add(content, [r, 'FILL']); const lic = await I('6:158', { Variant: 'Inline' }); add(content, [lic, 'FILL']); return r; }
// ===== END DESKTOP SHELL =====

const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-V1..V4 VIP & USR-R1..R5 Referrals', 48000, 0);
const R = [];
try { // ---- d-r5m
const SRC = sec.children.find(c => c.name === '[USR-R5] Referrals — Payout History / 1440 / Default');
if (!SRC) throw new Error('Source frame missing — run the default-state batch first');
const NAME = '[USR-R5] Referrals — Payout History / 1440 / Request payout modal';
for (const c of [...sec.children]) if (c.name === NAME) c.remove();
const f = SRC.clone(); f.name = NAME; sec.appendChild(f); f.x = SRC.x; let my = 0; for (const c of sec.children) if (c !== f && Math.abs(c.x - SRC.x) < 2) my = Math.max(my, c.y + c.height); f.y = my + 160;
await SCRIM(f, 'Scrim — modal open');
const md = CARD({ name: 'Modal — Request affiliate payout (inline: Modal/Base slot is fixed)', gap: 20, p: 24, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, w: 560 }); await fx(md, 'Elevation/4 — Modal');
f.appendChild(md); md.layoutPositioning = 'ABSOLUTE'; md.x = 440; md.y = 150;
const mh = ROW({ gap: 12, align: 'MIN' }); const mt = COL({ gap: 4 }); add(mt, await T('Request affiliate payout', 'Heading/H4')); add(mt, await T('Moves settled commission to your Available balance.', 'Body/S', 'text/secondary')); add(mh, [mt, 'FILL']); add(mh, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.x })); add(md, [mh, 'FILL']);
const am = COL({ name: 'Amount field', gap: 8 }); const al = ROW({ justify: 'SPACE_BETWEEN' }); add(al, await T('Payout amount', 'Label/M', 'text/primary')); const ar = ROW({ gap: 6 }); add(ar, await T('Available for payout 48.60 USDT', 'Caption', 'text/secondary')); add(ar, await DEMO('XS')); add(al, ar); add(am, [al, 'FILL']);
const fld = ROW({ name: 'Input (focus)', gap: 10, p: [0, 12, 0, 16], fill: 'surface/raised', r: 10, h: 56 }); stroke(fld, 'border/focus', 2); add(fld, [await T('48.60', 'Number/M', 'text/primary'), 'FILL']); const tk = await figma.getNodeByIdAsync(USDT_ID); const ti = tk.createInstance(); ti.resize(20, 20); add(fld, ti); add(fld, await T('USDT', 'Label/M', 'text/secondary'));
const mx = ROW({ name: 'MAX chip (selected)', p: [4, 10, 4, 10], fill: 'brand/tint', r: 6 }); add(mx, await T('MAX', 'Label/S', 'text/brand')); add(fld, mx); add(am, [fld, 'FILL']);
add(am, await T('Min 20.00 · Max 48.60 per request', 'Caption', 'text/tertiary')); add(md, [am, 'FILL']);
const ds = ROW({ name: 'Destination', gap: 12, p: 14, fill: 'surface/raised', r: 10 }); add(ds, await TILE('wallet', 'icon/brand', 'brand/tint', 36)); add(ds, [await TWO('GLOBAL POOL Available balance', '@nova.k · GP-48213'), 'FILL']); add(ds, await DEMO('XS')); add(ds, await T('Only destination', 'Caption', 'text/tertiary')); add(md, [ds, 'FILL']);
const rq = COL({ name: 'Requirements', gap: 8, p: 14, fill: 'status/success-tint', r: 10 }); for (const [s, k] of [['Minimum payout 20.00 USDT — met', 'ok'], ['KYC Level 2 — Verified', 'ok'], ['Pending 3.90 USDT is not included — round #1,248 is still open', 'info']]) add(rq, [await CHK(s, k, 440, 'Body/S', 'text/primary'), 'FILL']); add(md, [rq, 'FILL']);
const sm = COL({ name: 'Summary', gap: 8 }); add(sm, [await KV('Payout amount', '48.60 USDT'), 'FILL']); add(sm, [await KV('Payout fee', '0.00 USDT'), 'FILL']); add(sm, [rect(512, 1, 'border/subtle', 0, 'Divider'), 'FILL']); add(sm, [await KV('You receive, to Available', '48.60 USDT', { ks: 'Body/S Strong', kc: 'text/primary', vs: 'Number/M', demo: true }), 'FILL']); add(sm, [await KV('Available after payout', '9,263.90 USDT', { demo: true }), 'FILL']); add(md, [sm, 'FILL']);
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I confirm my referrals follow the Affiliate Terms — no self-referrals, duplicate accounts or sign-ups from restricted countries.', 'Show description': false }); add(md, [cb, 'FILL']); for (const t of cb.findAll(n => n.type === 'TEXT' && n.characters.startsWith('I confirm'))) { try { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; let p = t.parent; while (p && p !== cb) { if (p.layoutSizingHorizontal !== undefined && p.parent && p.parent.layoutMode) p.layoutSizingHorizontal = 'FILL'; p = p.parent; } } catch (e) { MISS.push('cb wrap ' + e.message); } }
add(md, [await CHK('Next you’ll enter your authenticator code. Our emails always show your anti-phishing code AURORA-27.', 'info', 480, 'Caption'), 'FILL']);
const ft = ROW({ name: 'Footer', gap: 12 }); add(ft, [await T('Tick the confirmation to continue', 'Caption', 'text/tertiary'), 'FILL']); add(ft, await BTN('Secondary', 'Cancel')); add(ft, await BTN('Primary', 'Continue to 2FA', { state: 'Disabled' })); add(md, [ft, 'FILL']);
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height), modalH: Math.round(md.height) });
} catch (e) { R.push({ body: 'd-r5m', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
try { // ---- d-r5l
const SRC = sec.children.find(c => c.name === '[USR-R5] Referrals — Payout History / 1440 / Default');
if (!SRC) throw new Error('Source frame missing — run the default-state batch first');
const NAME = '[USR-R5] Referrals — Payout History / 1440 / Payout locked — KYC L1 & below minimum (separate DEMO account)';
for (const c of [...sec.children]) if (c.name === NAME) c.remove();
const f = SRC.clone(); f.name = NAME; sec.appendChild(f); f.x = SRC.x; let my = 0; for (const c of sec.children) if (c !== f && Math.abs(c.x - SRC.x) < 2) my = Math.max(my, c.y + c.height); f.y = my + 160;
await sxc(byName(f, 'Shell/Topbar Desktop'), '9,215.30', '342.10');
const ps = byName(f, 'Payout summary');
await sx(ps, 'Payout amount value', '14.30'); const av = ps.findOne(n => n.name === 'Payout amount value'); if (av) av.fills = [paint('text/primary')];
await sx(ps, 'Pending note', 'Separate DEMO account (KYC Level 1, Available 342.10 USDT) — not @nova.k. Pending 0.00 USDT.');
const ctab = ps.findOne(n => n.name === 'Request payout CTA'); if (ctab) ctab.setProperties({ State: 'Disabled' });
for (const [nm, txt] of [['Requirement — minimum', 'Minimum 20.00 USDT — you have 14.30 (5.70 to go)'], ['Requirement — KYC', 'KYC Level 2 needed — you’re on Level 1']]) { const c = byName(ps, nm); if (!c) continue; const t = c.findOne(n => n.type === 'TEXT'); await ld(t); t.characters = txt; const ic = c.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Icon/')); await SWAPIC(ic, 'x-circle', 'status/danger'); fill(c, 'status/danger-tint'); }
const al = ROW({ name: 'Alert — payouts locked', gap: 12, p: [14, 16, 14, 16], fill: 'status/warning-tint', r: 10 }); add(al, await IC('alert-triangle', 20, 'status/warning')); const ac = COL({ gap: 2 }); add(ac, await T('Payouts unlock at KYC Level 2 and 20.00 USDT', 'Body/S Strong')); add(ac, [await T('Your commission keeps accruing and never expires. Verification usually takes under 10 minutes.', 'Caption', 'text/secondary', { w: 400 }), 'FILL']); add(al, [ac, 'FILL']); add(al, await BTN('Primary', 'Verify identity', { size: 'S', lead: 'id-card' }));
ps.insertChild(1, al); al.layoutSizingHorizontal = 'FILL';
await sxc(ps, '@nova.k · GP-48213', 'Paid to this account’s GLOBAL POOL Available balance. No payout fee. Usually reviewed within 24 hours.');
const hc = byName(f, 'Payout history'); const tbl = hc.findOne(n => n.name === 'Table');
for (const r of [...tbl.children].slice(1)) r.remove();
const em = COL({ name: 'Empty state — no payouts yet', gap: 8, p: [40, 24, 40, 24], align: 'CENTER' }); add(em, await TILE('receipt', 'icon/muted', 'surface/raised', 48)); add(em, await T('No payouts yet', 'Heading/H5')); add(em, await T('Your first payout appears here once you reach 20.00 USDT and verify to KYC Level 2.', 'Body/S', 'text/secondary', { w: 420, align: 'CENTER' })); add(tbl, [em, 'FILL']);
FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'd-r5l', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
