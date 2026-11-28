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
const MISS = [];
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
function CELL(w, kids, o = {}) { const c = AL(o.v ? 'VERTICAL' : 'HORIZONTAL', { name: o.name || 'Cell', gap: o.gap ?? (o.v ? 2 : 8), p: [o.py ?? 14, 16, o.py ?? 14, 16], align: o.v ? (o.right ? 'MAX' : 'MIN') : 'CENTER', justify: (!o.v && o.right) ? 'MAX' : undefined }); if (w !== 'FILL') { c.resize(w, Math.max(1, c.height)); if (o.v) { c.counterAxisSizingMode = 'FIXED'; c.primaryAxisSizingMode = 'AUTO'; } else { c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; } } for (const k of kids) add(c, k); c.__fill = w === 'FILL'; return c; }
function addRow(table, cells, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', align: 'CENTER', fill: o.fill }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 }); for (const c of cells) { add(r, c); if (c.__fill) c.layoutSizingHorizontal = 'FILL'; } add(table, [r, 'FILL']); return r; }
async function HEADROW(table, cols) { const r = AL('HORIZONTAL', { name: 'Header row', fill: 'bg/secondary' }); strokeSides(r, 'border/subtle', { b: 1 }); for (const [l, w, right] of cols) { const h = await HC(l, w === 'FILL' ? 160 : w, right); add(r, h); if (w === 'FILL') h.layoutSizingHorizontal = 'FILL'; } add(table, [r, 'FILL']); return r; }
async function TX(text, style = 'Body/S', color = 'text/primary', w) { return T(text, style, color, w ? { w } : {}); }
async function TWO(a, b, o = {}) { const c = COL({ gap: 2 }); add(c, await T(a, o.as || 'Body/S Strong', o.ac || 'text/primary')); add(c, await T(b, 'Caption', 'text/tertiary')); return c; }
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
// ===== END LIB =====

// ===== usr-vip-ref DESKTOP SHELL =====
async function DESK(NAME, X, Y, m) {
  for (const c of [...sec.children]) if (c.name === NAME) c.remove();
  if (Y === 'BELOW') { let my = 0; for (const c of sec.children) if (Math.abs(c.x - X) < 2) my = Math.max(my, c.y + c.height); Y = my + 160; }
  const f = await screen(NAME, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  const bar = await DEMOBAR(); add(f, [bar, 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); add(body, sb); sb.name = 'Shell/Sidebar'; sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Shell/Sidebar Item')) { const cp = it.componentProperties; const lk = Object.keys(cp).find(k => k.startsWith('Label#')); const lab = lk ? cp[lk].value : ''; const st = cp.State && cp.State.value; const ic = it.findOne(n => n.name === 'Icon'); if (lab === m.active) { it.setProperties({ State: 'Active' }); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); if (ic) tint(ic, 'icon/muted'); } }
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
try { // ---- d-v1
const NAME = '[USR-V1] VIP — Current Level & Progress / 1440 / Default';
const { f, content } = await DESK(NAME, 120, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Level & progress', title: 'VIP Club',
  sub: 'Your tier, level and the rewards you have unlocked. Status points count your play from the last 365 days.',
  actions: async () => [await BTN('Ghost', 'How VIP works', { lead: 'help-circle' }), await BTN('Secondary', 'Compare tiers', { trail: 'arrow-right' })], tabs: VTABS('Level & progress') });
const r1 = ROW({ name: 'Status row', gap: 16, align: 'MIN' }); add(content, [r1, 'FILL']);
const hero = AL('HORIZONTAL', { name: 'Status hero — Gold III', fill: 'surface/default', stroke: 'border/subtle', r: 20, clip: true }); add(r1, [hero, 'FILL']);
const hc = COL({ name: 'Status', gap: 16, p: 32 }); add(hero, [hc, 'FILL']);
const tr = ROW({ gap: 10 }); add(tr, await I('6:211', { Tier: 'Gold', Size: 'M' })); add(tr, await T('Level 14 of 29', 'Label/M', 'text/secondary')); add(tr, await DEMO('S')); add(hc, tr);
add(hc, await T('Gold III', 'Heading/H1', 'text/primary'));
const pts = ROW({ gap: 8, align: 'MAX' }); add(pts, await T('12,840', 'Number/XL', 'text/primary')); add(pts, await T('/ 20,000 status points to Platinum', 'Body/M', 'text/tertiary')); add(hc, pts);
const track = figma.createFrame(); track.name = 'Tier track (0 → 20,000)'; track.resize(520, 40); track.fills = []; track.clipsContent = false;
track.appendChild(BAR(520, 0.642, 'vip/gold', 10));
for (const [lbl, v] of [['Silver 2,500', 2500], ['Gold 8,000', 8000], ['Platinum 20,000', 20000]]) { const x = Math.round(520 * v / 20000); const tk = rect(2, 16, 'border/strong', 0, 'Tick ' + lbl); tk.x = Math.min(518, x - 1); tk.y = -3; track.appendChild(tk); const t = await T(lbl, 'Caption', 'text/tertiary'); track.appendChild(t); t.x = Math.min(520 - t.width, Math.max(0, x - t.width / 2)); t.y = 20; }
add(hc, track);
add(hc, await T('1,160 points to Level 15 (Gold IV) · 7,160 points to Platinum. Next roll-off: 410 pts on 1 Dec 2026 — you stay Gold (minimum 8,000).', 'Body/S', 'text/secondary', { w: 520 }));
const hb = ROW({ gap: 12 }); add(hb, await BTN('Primary', 'See what Platinum unlocks', { trail: 'arrow-right' })); add(hb, await BTN('Ghost', 'Points history', { lead: 'history' })); add(hc, hb);
const art = figma.createFrame(); art.name = 'Art — crown & coin cropped by the edge'; art.resize(240, 300); art.fills = []; art.clipsContent = true; add(hero, art); art.layoutSizingVertical = 'FILL';
const b1 = rect(300, 640, 'accent/gold-tint-strong', 0, 'Angled block'); b1.rotation = -14; b1.x = 30; b1.y = -80; art.appendChild(b1);
const b2 = rect(70, 640, 'vip/gold', 0, 'Angled stripe'); b2.rotation = -14; b2.x = 190; b2.y = -60; art.appendChild(b2);
const cr = await I('23:10035', { Motif: 'Crown' }); cr.resize(250, 250); art.appendChild(cr); cr.x = 40; cr.y = 40;
const co = await I('23:10035', { Motif: 'Coin' }); co.resize(130, 130); art.appendChild(co); co.x = -20; co.y = 230;
const wr = CARD({ name: 'Weekly reward — 115.20 owed', gap: 14, p: 24, w: 376 }); add(r1, wr); wr.layoutSizingVertical = 'FILL';
const o1 = ROW({ gap: 8 }); add(o1, await T("THIS WEEK'S VIP REWARD", 'Overline', 'text/tertiary')); add(o1, await DEMO('XS')); add(wr, o1);
const am = ROW({ gap: 8 }); add(am, await IC('coins', 28, 'balance/owed')); add(am, await T('115.20', 'Number/L', 'balance/owed')); add(am, await T('USDT', 'Body/M', 'text/tertiary')); add(wr, am);
add(wr, [await T('Gold weekly reward for your play Mon 16 – Sun 22 Nov 2026. It sits in your Owed balance (415.20 USDT).', 'Body/S', 'text/secondary', { w: 320 }), 'FILL']);
add(wr, [await CHK('Settles to Available automatically on Mon 30 Nov 2026, 10:00 UTC', 'clock', 300), 'FILL']);
add(wr, [await BTN('Primary', 'Claim 115.20 USDT now', { size: 'L' }), 'FILL']);
add(wr, [await T('Optional — claiming early moves it to Available today. No wagering, nothing expires.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']);
const lv = CARD({ name: 'Gold levels', gap: 20 }); add(content, [lv, 'FILL']);
const lh = ROW({ gap: 12 }); const lt = COL({ gap: 4 }); add(lt, await T('Your path through Gold', 'Heading/H4')); add(lt, await T('Six levels in Gold, then Platinum. Level-up rewards are paid in USDT to your Available balance — no wagering.', 'Body/S', 'text/secondary', { w: 640 })); add(lh, [lt, 'FILL']); add(lh, await DEMO('S')); add(lv, [lh, 'FILL']);
const lad = ROW({ name: 'Level ladder', gap: 12, align: 'MIN' }); add(lv, [lad, 'FILL']);
const L = [[12, 'Gold I', '8,000', '2.00', 'done', 'Claimed 12 Oct'], [13, 'Gold II', '10,000', '3.00', 'done', 'Claimed 2 Nov'], [14, 'Gold III', '12,000', '5.00', 'now', 'Claimed 25 Nov'], [15, 'Gold IV', '14,000', '8.00', 'next', '1,160 pts to go'], [16, 'Gold V', '16,000', '10.00', 'lock', '3,160 pts to go'], [17, 'Gold VI', '18,000', '15.00', 'lock', '5,160 pts to go'], [18, 'Platinum I', '20,000', '25.00', 'lock', '7,160 pts to go']];
for (const [n, nm, th, rw, st, note] of L) { const now = st === 'now'; const ok = st === 'done' || now;
  const t = CARD({ name: 'Level ' + n + ' — ' + nm, gap: 8, p: 16, fill: now ? 'surface/selected' : 'surface/raised', stroke: now ? 'border/brand' : 'border/subtle' }); add(lad, [t, 'FILL']);
  const top = ROW({ gap: 6, justify: 'SPACE_BETWEEN' }); add(top, await T('LEVEL ' + n, 'Overline', now ? 'text/brand' : 'text/tertiary')); add(top, await IC(ok ? 'check-circle' : st === 'next' ? 'target' : 'lock', 16, ok ? 'status/success' : st === 'next' ? 'icon/brand' : 'icon/muted')); add(t, [top, 'FILL']);
  add(t, await T(nm, 'Heading/H5', st === 'lock' ? 'text/secondary' : 'text/primary')); add(t, await T(th + ' pts', 'Caption', 'text/tertiary'));
  add(t, await AMT(rw, { c: ok ? 'text/primary' : 'text/secondary' }));
  if (st === 'next') add(t, BAR(104, 840 / 2000, 'brand/primary', 6));
  add(t, await T(now ? 'You are here · ' + note : note, 'Caption', now ? 'text/brand' : st === 'done' ? 'text/success' : 'text/tertiary', { w: 104 })); }
const r3 = ROW({ name: 'Info row', gap: 16, align: 'MIN' }); add(content, [r3, 'FILL']);
const bn = CARD({ name: 'Your Gold benefits', gap: 12 }); add(r3, [bn, 'FILL']); bn.layoutSizingVertical = 'FILL';
add(bn, await T('Your Gold benefits', 'Heading/H5'));
for (const s of ['Weekly reward, calculated every Monday 10:00 UTC', 'Level-up rewards from 2.00 to 15.00 USDT', 'Priority support queue', 'Monthly Gold invitational tournament']) add(bn, [await CHK(s, 'ok', 280), 'FILL']);
add(bn, await BTN('Ghost', 'Compare all tiers', { size: 'S', trail: 'arrow-right' }));
const hp = CARD({ name: 'How you earn points', gap: 12 }); add(r3, [hp, 'FILL']); hp.layoutSizingVertical = 'FILL';
add(hp, await T('How you earn status points', 'Heading/H5'));
for (const [ic, a, d] of [['pool', 'Global Pool entries', "1 pt per 1.00 USDT entered — the 0.05 USDT fee doesn't count"], ['games', 'Originals & table games', '1 pt per 1.00 USDT staked'], ['ban', 'Bonus funds & refunded entries', '0 pts — e.g. cancelled round #1,245']]) { const rr = ROW({ gap: 12, align: 'MIN' }); add(rr, await TILE(ic, 'icon/default', 'surface/raised', 32)); const cc = COL({ gap: 2 }); add(cc, await T(a, 'Body/S Strong', 'text/primary')); add(cc, await T(d, 'Caption', 'text/tertiary', { w: 250 })); add(rr, [cc, 'FILL']); add(hp, [rr, 'FILL']); }
const ex = ROW({ gap: 6 }); add(ex, await T('Example: 35 entries in round #1,248 = 350 pts', 'Caption', 'text/secondary')); add(ex, await DEMO('XS')); add(hp, ex);
const rg = CARD({ name: 'Play within your limits', gap: 12 }); add(r3, [rg, 'FILL']); rg.layoutSizingVertical = 'FILL';
const rgh = ROW({ gap: 8 }); add(rgh, await IC('shield', 20, 'icon/brand')); add(rgh, await T('Play within your limits', 'Heading/H5')); add(rg, rgh);
add(rg, [await T('Levels reward play you were going to do anyway — never chase a level. VIP status never changes odds or outcomes.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
add(rg, [await KV('Daily participation limit', '351.75 / 500.00 USDT', { demo: true }), 'FILL']); add(rg, BAR(320, 351.75 / 500, 'brand/primary', 6));
const rb = ROW({ gap: 8 }); add(rb, await BTN('Secondary', 'Set limits', { size: 'S' })); add(rb, await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause-circle' })); add(rg, rb);
await FOOT(content, 'VIP status, points and rewards never change odds, outcomes or security checks. All values are DEMO. 18+ only, in permitted jurisdictions.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'd-v1', err: String(e && e.stack || e).slice(0, 400) }); }
try { // ---- d-v2
const NAME = '[USR-V2] VIP — Points & History / 1440 / Default';
const { f, content } = await DESK(NAME, 1680, 160, { active: 'VIP Club', area: 'VIP Club', page: 'Points', title: 'Status points',
  sub: 'Every point from the last 365 days: where it came from, your running balance and when older points roll off.',
  actions: async () => [await BTN('Secondary', 'Export CSV', { lead: 'download' })], tabs: VTABS('Points') });
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, u, o] of [['Status points', '12,840', 'pts', { icon: 'crown', ic: 'vip/gold', cap: 'Rolling 365 days · Gold III, Level 14' }], ['This week', '+1,286', 'pts', { icon: 'trending-up', ic: 'status/success', color: 'text/success', cap: 'Mon 23 – Sun 29 Nov 2026, so far' }], ['This month', '5,032', 'pts', { icon: 'calendar', cap: '1–27 Nov 2026 · +18.6% vs October' }], ['To Platinum', '7,160', 'pts', { icon: 'target', ic: 'icon/brand', cap: '64.2% of 20,000 · Gold IV in 1,160 pts' }]]) { const c = await KPI(l, v, u, o); add(k, [c, 'FILL_BOTH']); }
const cols = ROW({ name: 'Two columns', gap: 16, align: 'MIN' }); add(content, [cols, 'FILL']);
const hist = CARD({ name: 'Points history', gap: 0, p: 0, clip: true }); add(cols, [hist, 'FILL']);
const hh = ROW({ name: 'Card header', gap: 12, p: [20, 24, 16, 24] }); add(hh, await T('Points history', 'Heading/H4')); add(hh, await DEMO('S')); const spc = ROW({}); add(hh, [spc, 'FILL']);
const seg = await I('20:6978', { Segments: '4' }); const segs = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['All', 'Global Pool', 'Games', 'Level-ups'].forEach((l, i) => { if (segs[i]) setP(segs[i], { Label: l }); }); add(hh, seg); add(hist, [hh, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(hist, [tbl, 'FILL']);
await HEADROW(tbl, [['Date', 176], ['Activity', 'FILL'], ['Source', 168], ['Points', 112, true], ['Balance', 120, true]]);
const H = [['27 Nov 2026, 14:12', 'Round #1,248 · 35 entries', '350.00 USDT entered · fee excluded', 'Global Pool', 'pool', '+350', '12,840'], ['27 Nov 2026, 11:05', 'Orbit Rush', '124.00 USDT staked', 'Originals', 'crash', '+124', '12,490'], ['26 Nov 2026, 21:40', 'Pool Dice', '80.00 USDT staked', 'Originals', 'dice', '+80', '12,366'], ['26 Nov 2026, 18:02', 'Twenty-One', '90.00 USDT staked', 'Table games', 'cards', '+90', '12,286'], ['26 Nov 2026, 12:15', 'Round #1,247 · 15 entries', '150.00 USDT entered', 'Global Pool', 'pool', '+150', '12,196'], ['25 Nov 2026, 19:30', 'Level up — Gold III (Level 14)', 'Level-up reward 5.00 USDT → Rewards', 'VIP', 'crown', '0', '12,046'], ['25 Nov 2026, 19:30', 'Round #1,246 · 20 entries', '200.00 USDT entered', 'Global Pool', 'pool', '+200', '12,046'], ['25 Nov 2026, 09:10', 'Vault Sweeper', '46.00 USDT staked', 'Originals', 'games', '+46', '11,846']];
for (const [i, [d, a, a2, s, ic, p, b]] of H.entries()) { const src = ROW({ gap: 8 }); add(src, await IC(ic, 16, ic === 'crown' ? 'icon/gold' : 'icon/muted')); add(src, await T(s, 'Body/S', 'text/secondary'));
  const pc = ROW({ gap: 4 }); add(pc, await T(p, 'Number/S', p === '0' ? 'text/tertiary' : 'text/success')); add(pc, await DEMO('XS'));
  await addRow(tbl, [CELL(176, [await TX(d, 'Body/S', 'text/secondary')]), CELL('FILL', [await TWO(a, a2)]), CELL(168, [src]), CELL(112, [pc], { right: true }), CELL(120, [await TX(b, 'Number/S')], { right: true })], { name: 'Row — ' + a, last: i === H.length - 1, fill: ic === 'crown' ? 'accent/gold-tint' : null }); }
const pag = await I('23:16756', { Type: 'Numbered' }); await sx(pag, 'Range', '1–8 of 214'); add(hist, [pag, 'FILL']);
const side = COL({ name: 'Side column', gap: 16, w: 376 }); add(cols, side);
const ch = CARD({ name: 'Points by week', gap: 12 }); add(side, [ch, 'FILL']);
const chh = ROW({ gap: 8 }); add(chh, await T('Points by week', 'Heading/H5')); add(chh, await DEMO('S')); add(ch, chh);
add(ch, await CHART([980, 1410, 860, 1530, 1240, 1180, 1326, 1286], ['5 Oct', '12', '19', '26', '2 Nov', '9', '16', '23'], { w: 328, h: 140, max: 1600, grid: [500, 1000, 1500], fmt: v => (v / 1000).toFixed(1) + 'k', last: true, name: 'weekly points' }));
add(ch, [await T('Week of 23 Nov is still running (lighter bar). Peak: 1,530 pts in the week of 26 Oct.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']);
const ro = CARD({ name: 'Roll-off schedule', gap: 12 }); add(side, [ro, 'FILL']);
add(ro, await T('Roll-off schedule', 'Heading/H5'));
for (const [d, v] of [['1 Dec 2026', '−410 pts'], ['1 Jan 2027', '−1,050 pts'], ['1 Feb 2027', '−920 pts']]) add(ro, [await KV(d, v, { demo: true, vc: 'text/secondary' }), 'FILL']);
add(ro, [await CHK('With no further play you keep Gold until at least 1 Feb 2027 (10,460 pts ≥ 8,000).', 'info', 300), 'FILL']);
const no = CARD({ name: "What doesn't earn points", gap: 10 }); add(side, [no, 'FILL']);
add(no, await T("What doesn't earn points", 'Heading/H5'));
for (const s of ['The 0.05 USDT platform fee on each entry', 'Bets placed with bonus funds', 'Refunded entries — round #1,245 was cancelled, so its 30 entries earned 0 pts']) add(no, [await CHK(s, 'lock', 300), 'FILL']);
await FOOT(content, 'Points are a loyalty measure only — they have no cash value and never change odds or outcomes. All values are DEMO.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'd-v2', err: String(e && e.stack || e).slice(0, 400) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
