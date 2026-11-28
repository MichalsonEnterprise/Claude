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

// ===== usr-vip-ref MOBILE SHELL =====
async function MOB(NAME, X, Y, m) {
  for (const c of [...sec.children]) if (c.name === NAME) c.remove();
  if (Y === 'BELOW') { let my = 0; for (const c of sec.children) if (Math.abs(c.x - X) < 2) my = Math.max(my, c.y + c.height); Y = my + 160; }
  const f = await screen(NAME, 390, {}); sec.appendChild(f); f.x = X; f.y = Y;
  const bar = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [bar, 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [content, 'FILL']);
  const hr = ROW({ name: 'Page header', gap: 8 }); add(content, [hr, 'FILL']);
  add(hr, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['chevron-left'] }));
  const hl = COL({ gap: 2 }); add(hl, await T(m.title, 'Heading/H4', 'text/primary')); add(hl, await T(m.sub, 'Caption', 'text/tertiary', { w: 250 })); add(hr, [hl, 'FILL']); add(hr, await DEMO('S'));
  const pills = AL('HORIZONTAL', { name: 'Sub-nav (scrolls horizontally)', gap: 8, clip: true }); add(content, [pills, 'FILL']);
  for (const x of m.tabs) add(pills, await I('20:6895', { State: x.on ? 'Active' : 'Default' }, { Label: x.l, 'Show icon': false }));
  { const act = pills.children.find((c, i) => m.tabs[i] && m.tabs[i].on); const idx = content.children.indexOf(pills); const wrap = figma.createFrame(); wrap.name = 'Sub-nav (scrolled to active tab)'; wrap.fills = []; wrap.clipsContent = true; wrap.resize(358, pills.height); content.insertChild(idx, wrap); wrap.layoutSizingHorizontal = 'FILL'; wrap.appendChild(pills); pills.clipsContent = false; pills.primaryAxisSizingMode = 'AUTO'; pills.y = 0; pills.x = act ? Math.min(0, 358 - (act.x + act.width)) : 0; }
  return { f, content };
}
const MVT = (on) => ['Level', 'Points', 'Rewards', 'Benefits'].map(l => ({ l, on: l === on }));
const MRT = (on) => ['Overview', 'Stats', 'Invited', 'Earnings', 'Payouts'].map(l => ({ l, on: l === on }));
async function MCARD(name, o = {}) { return CARD({ name, gap: o.gap ?? 12, p: o.p ?? 16, fill: o.fill, stroke: o.stroke, r: o.r ?? 14 }); }
async function MFOOT(content, text) { const r = ROW({ name: 'Compliance note', gap: 8, align: 'MIN' }); add(r, await I('6:159')); add(r, [await T(text, 'Caption', 'text/tertiary', { w: 300 }), 'FILL']); add(content, [r, 'FILL']); }
async function MEND(f) { const tab = await I('22:5413', { Active: 'Account' }); add(f, [tab, 'FILL']); }
// ===== END MOBILE SHELL =====

const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('USR — Mobile E', 119000, 0);
const R = [];
try { // ---- m-v4
const NAME = '[USR-V4] VIP — Benefits & Tier Comparison / 390 / Default';
const { f, content } = await MOB(NAME, 1650, 160, { title: 'Tiers & benefits', sub: '5 tiers · 29 levels · same odds for all', tabs: MVT('Benefits') });
const tp = AL('HORIZONTAL', { name: 'Tier chips (scroll)', gap: 8, clip: true }); add(content, [tp, 'FILL']);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) add(tp, await I('20:6895', { State: t === 'Gold' ? 'Active' : 'Default' }, { Label: t, 'Show icon': false }));
const cw = ROW({ name: 'Current tier card', justify: 'CENTER' }); const gvc = await I('23:12669', { Tier: 'Gold', Current: 'Yes' }); gvc.name = 'Card/VIP Tier — Gold (your tier)'; await vipFix(gvc); add(cw, gvc); add(content, [cw, 'FILL']);
const cc = CARD({ name: 'Gold vs Platinum', gap: 0, p: 0, clip: true }); add(content, [cc, 'FILL']);
const hh = ROW({ gap: 8, p: [14, 16, 10, 16] }); add(hh, await T('Gold vs Platinum', 'Heading/H5')); add(hh, await DEMO('XS')); add(cc, [hh, 'FILL']);
const hr = ROW({ name: 'Header', fill: 'bg/secondary' }); add(hr, CELL(130, [await TX('BENEFIT', 'Overline', 'text/tertiary')], { py: 10, name: 'h0' })); for (const t of ['Gold', 'Platinum']) { const c = CELL('FILL', [await I('6:211', { Tier: t, Size: 'S' })], { py: 10 }); if (t === 'Gold') fill(c, 'surface/selected'); add(hr, c); c.layoutSizingHorizontal = 'FILL'; } add(cc, [hr, 'FILL']);
for (const [l, a, b] of [['Points needed', '8,000', '20,000'], ['Level-up rewards', '2.00–15.00', '25.00–60.00'], ['Weekly reward', '✓', '✓'], ['Monthly reward', '—', '✓'], ['Support', 'Priority queue', 'Dedicated VIP host'], ['VIP tournaments', 'Monthly invitational', '+ Platinum series']]) { const cells = [CELL(130, [await TX(l, 'Caption', 'text/secondary', 98)], { py: 12 })]; for (const [j, v] of [a, b].entries()) { const k = v === '✓' ? await IC('check-circle', 18, 'status/success') : await TX(v, 'Body/S', v === '—' ? 'text/disabled' : 'text/primary', 80); const c = CELL('FILL', [k], { py: 12 }); if (j === 0) fill(c, 'surface/selected'); cells.push(c); } addRow(cc, cells, { name: 'Row — ' + l }); }
const same = CARD({ name: 'Same for every tier', gap: 10, p: 16, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(content, [same, 'FILL']);
const sh = ROW({ gap: 8 }); add(sh, await IC('shield-check', 18, 'icon/brand')); add(sh, await T('Same for every tier', 'Heading/H5')); add(same, sh);
for (const s of ['Odds, house edge and payouts', 'Chainlink VRF / seed verification', 'Withdrawal security checks', 'Responsible-gaming tools & limits']) add(same, [await CHK(s, 'info', 300, 'Body/S'), 'FILL']);
add(content, [await BTN('Secondary', 'Compare all five tiers', { size: 'L', trail: 'arrow-right' }), 'FILL']);
await MFOOT(content, 'Thresholds and rewards are DEMO. Benefits can change with 30 days’ notice. 18+.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-v4', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
try { // ---- m-r1
const NAME = '[USR-R1] Referrals — Link & Overview / 390 / Default';
const { f, content } = await MOB(NAME, 2160, 160, { title: 'Refer friends', sub: 'Earn 20% of their platform fees', tabs: MRT('Overview') });
const hc = CARD({ name: 'Referral link card', gap: 12, p: 16, r: 20, clip: true }); add(content, [hc, 'FILL']);
const st = rect(60, 400, 'brand/tint', 0, 'Angled stripe'); hc.appendChild(st); st.layoutPositioning = 'ABSOLUTE'; st.rotation = -14; st.x = 300; st.y = -40;
const o = ROW({ gap: 8 }); add(o, await T('YOUR REFERRAL LINK', 'Overline', 'text/brand')); add(o, await DEMO('XS')); add(hc, o);
add(hc, await T('Earn 20% of the platform fees your friends pay', 'Heading/H4', 'text/primary', { w: 290 }));
add(hc, await T('From the 0.05 USDT fee on their Global Pool entries, for 12 months — never from deposits or losses.', 'Caption', 'text/secondary', { w: 300 }));
const fld = ROW({ name: 'Link field', gap: 8, p: [0, 12, 0, 12], fill: 'surface/raised', stroke: 'border/default', r: 10, h: 48 }); add(fld, await IC('link', 16, 'icon/muted')); add(fld, [await T('globalpool.example/r/NOVAK27', 'Mono/S', 'text/primary'), 'FILL']); add(fld, await DEMO('XS')); add(hc, [fld, 'FILL']);
add(hc, [await BTN('Primary', 'Copy link', { size: 'L', lead: 'copy' }), 'FILL']);
for (const pair of [[['Telegram', 'chat'], ['X', 'external-link']], [['Email', 'mail'], ['QR code', 'qr-code']]]) { const r = ROW({ gap: 8 }); for (const [l, ic] of pair) add(r, [await BTN('Secondary', l, { size: 'L', lead: ic }), 'FILL']); add(hc, [r, 'FILL']); }
for (const pair of [[['Link clicks', '1,904', '612 in 30 days'], ['Sign-ups', '48', '9 in 30 days']], [['Verified', '31', '17 to verify'], ['Active', '19', 'Last 30 days']]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, cap] of pair) add(r, [await KPI(l, v, null, { p: 14, size: 'Number/M', cap, cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
const ec = CARD({ name: 'Your earnings', gap: 10, p: 16 }); add(content, [ec, 'FILL']); const eh = ROW({ gap: 8 }); add(eh, await T('Your earnings', 'Heading/H5')); add(eh, await DEMO('XS')); add(ec, eh);
for (const [l, v, c] of [['Lifetime earned', '142.50 USDT', 'text/primary'], ['Available for payout', '48.60 USDT', 'balance/available'], ['Pending (round #1,248)', '3.90 USDT', 'balance/pending'], ['Paid out', '90.00 USDT', 'text/secondary']]) add(ec, [await KV(l, v, { vc: c }), 'FILL']);
add(ec, [await BTN('Secondary', 'Request payout', { size: 'L', lead: 'arrow-up-right' }), 'FILL']);
const pr = CARD({ name: 'Promo — Refer-a-friend boost (RC-14)', gap: 8, p: 16, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(content, [pr, 'FILL']);
const po = ROW({ gap: 8 }); add(po, await IC('gift', 18, 'icon/brand')); add(po, await T('UNTIL 31 DEC 2026', 'Overline', 'text/brand')); add(po, await DEMO('XS')); add(pr, po);
add(pr, await T('You and your friend each get 5.00 USDT in bonus funds', 'Body/S Strong', 'text/primary', { w: 320 })); add(pr, await T('After their KYC Level 2 and first deposit of 20.00+ USDT. 1× wagering, 14 days. No self-referrals.', 'Caption', 'text/secondary', { w: 320 }));
const pt = ROW({ gap: 8 }); add(pt, await BTN('Ghost', 'Terms apply', { size: 'S' })); add(pt, await I('6:159')); add(pr, pt);
await MFOOT(content, 'Referral figures are DEMO. Share only with adults in permitted countries.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-r1', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
try { // ---- m-r2
const NAME = '[USR-R2] Referrals — Statistics / 390 / Default';
const { f, content } = await MOB(NAME, 2670, 160, { title: 'Referral statistics', sub: 'Last 30 days · 29 Oct – 27 Nov 2026', tabs: MRT('Stats') });
const seg = await I('20:6978', { Segments: '3' }); const s = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['7 days', '30 days', '90 days'].forEach((l, i) => { if (s[i]) { setP(s[i], { Label: l }); s[i].setProperties({ State: i === 1 ? 'Active' : 'Default' }); } }); add(content, [seg, 'FILL']);
for (const pair of [[['Clicks', '612', '+12.4%'], ['Sign-ups', '9', '1.47% of clicks']], [['Verified', '6', '67% of sign-ups'], ['Earned', '58.80', 'USDT · 3.90 pending']]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, cap] of pair) add(r, [await KPI(l, v, null, { p: 14, size: 'Number/M', cap, cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
const fu = CARD({ name: 'Funnel', gap: 0, p: 0, clip: true }); add(content, [fu, 'FILL']); const fh = ROW({ gap: 8, p: [14, 16, 10, 16] }); add(fh, await T('From click to player', 'Heading/H5')); add(fh, await DEMO('XS')); add(fu, fh);
for (const [i, [v, l, c]] of [['612', 'Link clicks', 'Unique devices'], ['9', 'Sign-ups', '1.5% of clicks'], ['6', 'KYC verified', '67% of sign-ups'], ['5', 'First qualifying entry', '83% of verified']].entries()) { const r = ROW({ gap: 12, p: [12, 16, 12, 16] }); strokeSides(r, 'border/subtle', { t: 1 }); const n = AL('HORIZONTAL', { w: 28, h: 28, fill: 'brand/tint', r: 9999, align: 'CENTER', justify: 'CENTER' }); add(n, await T(String(i + 1), 'Label/S', 'text/brand')); add(r, n); add(r, [await TWO(l, c), 'FILL']); add(r, await T(v, 'Number/M')); add(fu, [r, 'FILL']); }
const ec = CARD({ name: 'Earnings per day', gap: 10, p: 16 }); add(content, [ec, 'FILL']); const eh = ROW({ gap: 8 }); add(eh, await T('Earnings per day', 'Heading/H5')); add(eh, await DEMO('XS')); add(eh, [ROW({}), 'FILL']); add(eh, await AMT('58.80', { s: 'Number/S' })); add(ec, [eh, 'FILL']);
const D = [1.90, 2.10, 2.30, 1.20, 1.25, 1.30, 1.32, 1.38, 1.40, 1.45, 1.48, 1.52, 1.55, 1.58, 1.60, 1.62, 1.65, 1.68, 1.70, 1.72, 1.75, 1.78, 1.80, 2.34, 3.76, 4.02, 0.00, 3.65, 4.10, 3.90];
add(ec, await CHART(D, D.map((_, i) => ({ 0: '29 Oct', 14: '12 Nov', 29: '27' })[i] || ''), { w: 326, h: 120, gap: 2, max: 5, grid: [1, 3, 5], fmt: v => v.toFixed(1), last: true, name: 'daily commission' }));
add(ec, [await CHK('24 Nov: round #1,245 cancelled — no commission. 27 Nov: 3.90 pending until the 20:00 UTC draw.', 'info', 300, 'Caption'), 'FILL']);
const cc = CARD({ name: 'Clicks by channel', gap: 10, p: 16 }); add(content, [cc, 'FILL']); add(cc, await T('Clicks by channel', 'Heading/H5'));
for (const [c, ic, a, b] of [['Copied link', 'copy', '268', '4 sign-ups'], ['Telegram', 'chat', '196', '3 sign-ups'], ['X', 'external-link', '112', '1 sign-up'], ['Email', 'mail', '36', '1 sign-up']]) { const r = ROW({ gap: 10 }); add(r, await IC(ic, 18, 'icon/muted')); add(r, [await TWO(c, b), 'FILL']); add(r, await T(a, 'Number/S')); add(r, await DEMO('XS')); add(cc, [r, 'FILL']); }
await MFOOT(content, 'Aggregate DEMO statistics. Refreshes every 15 minutes.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-r2', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
