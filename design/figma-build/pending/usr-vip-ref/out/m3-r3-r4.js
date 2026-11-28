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
try { // ---- m-r3
const NAME = '[USR-R3] Referrals — Invited Users / 390 / Default';
const { f, content } = await MOB(NAME, 3180, 160, { title: 'Invited users', sub: '48 players · handles masked', tabs: MRT('Invited') });
const se = await SEARCH('Search by handle…', 'M'); add(content, [se, 'FILL']);
const fp = AL('HORIZONTAL', { name: 'Filter pills (scroll)', gap: 8, clip: true }); add(content, [fp, 'FILL']);
for (const [i, l] of ['All · 48', 'Active · 19', 'Inactive · 12', 'Unverified · 17'].entries()) add(fp, await I('20:6895', { State: i === 0 ? 'Active' : 'Default' }, { Label: l, 'Show icon': false }));
const pv = ROW({ name: 'Privacy note', gap: 8, p: [10, 12, 10, 12], fill: 'status/info-tint', r: 10, align: 'MIN' }); add(pv, await IC('eye-off', 16, 'status/info')); add(pv, [await T('Activity totals only — never balances, deposits, wins or losses.', 'Caption', 'text/secondary', { w: 300 }), 'FILL']); add(content, [pv, 'FILL']);
for (const [ini, h, j, kyc, st, e, fe, cm, until] of [['JU', '@ju•••88', '4 Mar 2026', 'L2', 'Active', '3,120', '156.00', '31.20', '4 Mar 2027'], ['PI', '@pi•••fox', '19 Apr 2026', 'L2', 'Active', '2,480', '124.00', '24.80', '19 Apr 2027'], ['TI', '@ti•••ker', '2 May 2026', 'L2', 'Active', '1,960', '98.00', '19.60', '2 May 2027'], ['ZE', '@ze•••21', '11 Jun 2026', 'L1', 'Active', '1,410', '70.50', '14.10', '11 Jun 2027'], ['DR', '@dr•••sol', '30 Aug 2026', 'L2', 'Inactive', '640', '32.00', '6.40', '30 Aug 2027'], ['SA', '@sa•••le', '20 Nov 2026', '—', 'Unverified', '0', '0.00', '0.00', 'Starts after KYC']]) {
  const c = CARD({ name: 'User card — ' + h, gap: 10, p: 14 }); add(content, [c, 'FILL']);
  const top = ROW({ gap: 10 }); add(top, await I('9:238', { Size: 'S' }, { Initials: ini, 'Show status': false })); add(top, [await TWO(h, 'Joined ' + j + ' · ' + (kyc === '—' ? 'KYC not started' : 'KYC ' + kyc), { w: 160 }), 'FILL']);
  add(top, st === 'Active' ? await BADGEL('Confirmed', 'Active') : st === 'Inactive' ? await BADGEL('Neutral', 'Inactive') : await BADGEL('Pending', 'Awaiting KYC')); add(c, [top, 'FILL']);
  const m = ROW({ gap: 8, align: 'MIN' }); for (const [l, v, col] of [['Entries', e, 'text/primary'], ['Fees', fe, 'text/secondary'], ['Your 20%', cm, cm === '0.00' ? 'text/tertiary' : 'text/success']]) { const k = COL({ gap: 2 }); add(k, await T(l, 'Caption', 'text/tertiary')); add(k, await T(v, 'Number/S', col)); add(m, [k, 'FILL']); } add(m, await DEMO('XS')); add(c, [m, 'FILL']);
  add(c, await T('Earning until ' + until, 'Caption', 'text/tertiary')); }
add(content, [await BTN('Secondary', 'Show more (6 of 48)', { size: 'L' }), 'FILL']);
add(content, [await KV('All 48 players · lifetime', '142.50 USDT', { demo: true, vc: 'text/success' }), 'FILL']);
await MFOOT(content, 'Handles and amounts are DEMO. Commission = 20% of the 0.05 USDT platform fee.');
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-r3', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
try { // ---- m-r4
const NAME = '[USR-R4] Referrals — Affiliate Earnings / 390 / Default';
const { f, content } = await MOB(NAME, 3690, 160, { title: 'Affiliate earnings', sub: '20% of referred platform fees', tabs: MRT('Earnings') });
for (const pair of [[['Lifetime', '142.50', 'text/primary', 'Mar–Nov 2026'], ['Available', '48.60', 'balance/available', 'Ready for payout']], [['Pending', '3.90', 'balance/pending', 'Round #1,248 · 20:00 UTC'], ['Paid out', '90.00', 'text/secondary', '2 payouts']]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, c, cap] of pair) add(r, [await KPI(l, v, 'USDT', { p: 14, size: 'Number/M', color: c, cap, cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
add(content, [await T('142.50 = 90.00 paid + 48.60 available + 3.90 pending (DEMO)', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
const mc = CARD({ name: 'Monthly earnings', gap: 10, p: 16 }); add(content, [mc, 'FILL']); const mh = ROW({ gap: 8 }); add(mh, await T('Monthly earnings', 'Heading/H5')); add(mh, await DEMO('XS')); add(mc, mh);
add(mc, await CHART([1.20, 3.60, 5.10, 8.40, 12.30, 14.70, 17.40, 27.30, 52.50], ['M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N'], { w: 326, h: 120, gap: 10, max: 60, grid: [20, 40, 60], fmt: v => String(v), last: true, name: 'monthly commission' }));
const cc = CARD({ name: 'How your 20% is calculated', gap: 8, p: 16 }); add(content, [cc, 'FILL']); add(cc, await T('November, worked out', 'Heading/H5'));
for (const [a, b] of [['Referred entries', '5,250'], ['× fee per entry', '0.05 USDT'], ['= platform fees', '262.50 USDT'], ['× your share', '20%']]) add(cc, [await KV(a, b), 'FILL']);
add(cc, [await KV('= commission', '52.50 USDT', { ks: 'Body/S Strong', kc: 'text/primary', vs: 'Number/M', demo: true }), 'FILL']);
add(cc, [await CHK('Fees only — never deposits, stakes, wins or losses. Cancelled rounds earn nothing.', 'info', 300, 'Caption'), 'FILL']);
const rl = CARD({ name: 'Earnings by round', gap: 0, p: 0, clip: true }); add(content, [rl, 'FILL']); const rh = ROW({ gap: 8, p: [14, 16, 10, 16] }); add(rh, await T('By round', 'Heading/H5')); add(rh, await DEMO('XS')); add(rl, rh);
for (const [r, bs, bl, e, cm, note] of [['#1,248', 'Live', 'Open', '390 entries', '3.90', 'Pending until 27 Nov, 20:00 UTC'], ['#1,247', 'Confirmed', 'Settled', '410 entries', '4.10', 'Available · 26 Nov'], ['#1,246', 'Confirmed', 'Settled', '365 entries', '3.65', 'Available · 25 Nov'], ['#1,245', 'Expired', 'Cancelled', '280 entries', '0.00', 'Fees refunded · no commission']]) { const row = ROW({ gap: 10, p: [12, 16, 12, 16], fill: bl === 'Open' ? 'surface/selected' : null }); strokeSides(row, 'border/subtle', { t: 1 }); add(row, [await TWO('Round ' + r + ' · ' + e, note, { w: 180 }), 'FILL']); const rc = COL({ gap: 4, align: 'MAX' }); add(rc, await AMT(cm, { c: cm === '0.00' ? 'text/tertiary' : 'text/primary' })); add(rc, await BADGEL(bs, bl)); add(row, rc); add(rl, [row, 'FILL']); }
await MFOOT(content, 'Earnings are DEMO. Global Pool platform fees only.');
const sticky = ROW({ name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(sticky, 'border/subtle', { t: 1 }); add(sticky, [await BTN('Primary', 'Request payout · 48.60 USDT', { size: 'L' }), 'FILL']); add(f, [sticky, 'FILL']);
await MEND(f); FIXEMPTY(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-r4', err: (String(e && e.message || e) + ' | ' + String(e && e.stack || '')).slice(0, 500) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
