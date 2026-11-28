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
try { // ---- d-r2
const NAME = '[USR-R2] Referrals — Statistics / 1440 / Default';
const { f, content } = await DESK(NAME, 7920, 160, { active: 'Affiliates', area: 'Referrals', page: 'Statistics', title: 'Referral statistics',
  sub: 'How your link performs, from click to active player. Showing the last 30 days: 29 Oct – 27 Nov 2026.',
  actions: async () => { const seg = await I('20:6978', { Segments: '3' }); const s = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['7 days', '30 days', '90 days'].forEach((l, i) => { if (s[i]) { setP(s[i], { Label: l }); s[i].setProperties({ State: i === 1 ? 'Active' : 'Default' }); } }); return [seg, await BTN('Secondary', 'Export CSV', { lead: 'download' })]; }, tabs: RTABS('Statistics') });
const k = ROW({ name: 'KPIs', gap: 16, align: 'MIN' }); add(content, [k, 'FILL']);
for (const [l, v, u, o] of [['Link clicks', '612', null, { icon: 'external-link', cap: '+12.4% vs the previous 30 days' }], ['Sign-ups', '9', null, { icon: 'user-check', cap: '1.47% of clicks · +2 vs the previous 30 days' }], ['Verified', '6', null, { icon: 'shield-check', cap: '67% of sign-ups completed KYC' }], ['Earned', '58.80', 'USDT', { icon: 'coins', ic: 'icon/brand', cap: '+31.0% vs the previous 30 days · 3.90 pending' }]]) add(k, [await KPI(l, v, u, o), 'FILL_BOTH']);
const fu = CARD({ name: 'Funnel — click to player', gap: 16 }); add(content, [fu, 'FILL']);
const fh = ROW({ gap: 8 }); add(fh, await T('From click to player', 'Heading/H4')); add(fh, await DEMO('S')); add(fu, fh);
const fr = ROW({ name: 'Funnel steps', gap: 12 }); add(fu, [fr, 'FILL']);
const FS = [['STEP 1', '612', 'Link clicks', 'Unique devices, 24 h window'], ['STEP 2', '9', 'Sign-ups', '1.5% of clicks'], ['STEP 3', '6', 'KYC verified', '67% of sign-ups'], ['STEP 4', '5', 'First qualifying entry', '83% of verified']];
for (const [i, [s1, v, l, c]] of FS.entries()) { const t = CARD({ name: 'Step — ' + l, gap: 6, p: 16, fill: i === 3 ? 'surface/selected' : 'surface/raised', stroke: i === 3 ? 'border/brand' : 'border/subtle' }); add(t, await T(s1, 'Overline', 'text/tertiary')); add(t, await T(v, 'Number/L', 'text/primary')); add(t, await T(l, 'Body/S Strong')); add(t, await T(c, 'Caption', i ? 'text/brand' : 'text/tertiary')); add(fr, [t, 'FILL']); if (i < 3) add(fr, await IC('chevron-right', 20, 'icon/muted')); }
const cols = ROW({ name: 'Two columns', gap: 16, align: 'MIN' }); add(content, [cols, 'FILL']);
const ec = CARD({ name: 'Earnings per day', gap: 12 }); add(cols, [ec, 'FILL']);
const eh = ROW({ gap: 8 }); add(eh, await T('Earnings per day', 'Heading/H4')); add(eh, await DEMO('S')); add(eh, [ROW({}), 'FILL']); add(eh, await AMT('58.80', { s: 'Number/M' })); add(ec, [eh, 'FILL']);
const D = [1.90, 2.10, 2.30, 1.20, 1.25, 1.30, 1.32, 1.38, 1.40, 1.45, 1.48, 1.52, 1.55, 1.58, 1.60, 1.62, 1.65, 1.68, 1.70, 1.72, 1.75, 1.78, 1.80, 2.34, 3.76, 4.02, 0.00, 3.65, 4.10, 3.90];
const LB = D.map((_, i) => ({ 0: '29 Oct', 4: '2 Nov', 9: '7', 14: '12', 19: '17', 24: '22', 29: '27' })[i] || '');
add(ec, await CHART(D, LB, { w: 696, h: 180, gap: 4, max: 5, grid: [1, 2, 3, 4, 5], fmt: v => v.toFixed(2), last: true, name: 'daily commission' }));
const nt = ROW({ gap: 24 }); add(nt, await CHK('24 Nov: round #1,245 was cancelled — fees refunded, so no commission', 'warn', 320, 'Caption')); add(nt, await CHK('27 Nov: 3.90 USDT pending until the 20:00 UTC draw (lighter bar)', 'clock', 300, 'Caption')); add(ec, nt);
const side = COL({ name: 'Side column', gap: 16, w: 376 }); add(cols, side);
const cc = CARD({ name: 'Clicks by channel', gap: 0, p: 0, clip: true }); add(side, [cc, 'FILL']);
const chh = ROW({ gap: 8, p: [16, 16, 12, 16] }); add(chh, await T('Clicks by channel', 'Heading/H5')); add(chh, await DEMO('S')); add(cc, chh);
const ct = COL({ name: 'Table', gap: 0 }); add(cc, [ct, 'FILL']);
await HEADROW(ct, [['Channel', 'FILL'], ['Clicks', 76, true], ['Sign-ups', 84, true], ['Conv.', 72, true]]);
const CH = [['Copied link', 'copy', '268', '4', '1.5%'], ['Telegram', 'chat', '196', '3', '1.5%'], ['X', 'external-link', '112', '1', '0.9%'], ['Email', 'mail', '36', '1', '2.8%'], ['Total', null, '612', '9', '1.5%']];
for (const [i, [c, ic, a, b, d]] of CH.entries()) { const lc = ROW({ gap: 8 }); if (ic) add(lc, await IC(ic, 16, 'icon/muted')); add(lc, await T(c, ic ? 'Body/S' : 'Body/S Strong')); await addRow(ct, [CELL('FILL', [lc], { py: 10 }), CELL(76, [await TX(a, 'Number/S')], { right: true, py: 10 }), CELL(84, [await TX(b, 'Number/S')], { right: true, py: 10 }), CELL(72, [await TX(d, 'Number/S', 'text/secondary')], { right: true, py: 10 })], { name: 'Row — ' + c, last: i === 4, fill: ic ? null : 'bg/secondary' }); }
const ap = CARD({ name: 'Active players', gap: 10 }); add(side, [ap, 'FILL']);
const aph = ROW({ gap: 8 }); add(aph, await T('Active players', 'Heading/H5')); add(aph, await DEMO('S')); add(ap, aph);
add(ap, await AMT('19 of 31', { s: 'Number/M', u: 'verified players' })); add(ap, BAR(328, 19 / 31, 'brand/primary', 8));
add(ap, await T('Active = made at least one qualifying Global Pool entry in the last 30 days.', 'Caption', 'text/tertiary', { w: 328 }));
const dn = CARD({ name: 'How stats are counted', gap: 10, fill: 'bg/secondary' }); add(side, [dn, 'FILL']);
for (const s of ['Stats refresh every 15 minutes', 'Repeat clicks from one device within 24 h count once', 'Sign-ups from restricted countries are blocked and never counted']) add(dn, [await CHK(s, 'info', 300, 'Caption'), 'FILL']);
await FOOT(content, 'Statistics are DEMO values. You only see aggregate numbers — never personal data about the players you invite.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'd-r2', err: String(e && e.stack || e).slice(0, 400) }); }
try { // ---- d-r3
const NAME = '[USR-R3] Referrals — Invited Users / 1440 / Default';
const { f, content } = await DESK(NAME, 9480, 160, { active: 'Affiliates', area: 'Referrals', page: 'Invited users', title: 'Invited users',
  sub: 'Everyone who joined with your link or code. Handles are masked to protect their privacy.',
  actions: async () => [await I('16:3820', { Size: 'S', State: 'Default' }, { 'Show shortcut': false }), await BTN('Secondary', 'Export CSV', { lead: 'download' })], tabs: RTABS('Invited users') });
const fr = ROW({ name: 'Filters', gap: 16 }); add(content, [fr, 'FILL']);
const seg = await I('20:6978', { Segments: '4' }); const s = seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment')); ['All · 48', 'Active · 19', 'Inactive · 12', 'Unverified · 17'].forEach((l, i) => { if (s[i]) setP(s[i], { Label: l }); }); add(fr, seg);
add(fr, [ROW({}), 'FILL']); add(fr, await T('Sorted by your commission, highest first', 'Caption', 'text/tertiary'));
const pv = ROW({ name: 'Privacy note', gap: 10, p: [12, 16, 12, 16], fill: 'status/info-tint', r: 10 }); add(pv, await IC('eye-off', 18, 'status/info')); add(pv, [await T('You see activity totals only — never your friends’ balances, deposits, wins or losses. Commission runs for 12 months from each friend’s sign-up.', 'Body/S', 'text/secondary', { w: 900 }), 'FILL']); add(content, [pv, 'FILL']);
const tc = CARD({ name: 'Invited users table', gap: 0, p: 0, clip: true }); add(content, [tc, 'FILL']);
const tbl = COL({ name: 'Table', gap: 0 }); add(tc, [tbl, 'FILL']);
await HEADROW(tbl, [['Player', 'FILL'], ['KYC', 130], ['Status', 140], ['Entries', 110, true], ['Fees generated', 140, true], ['Your 20%', 124, true], ['Earning until', 150]]);
const U = [['JU', '@ju•••88', '4 Mar 2026', 'L2', 'Active', '3,120', '156.00', '31.20', '4 Mar 2027'], ['PI', '@pi•••fox', '19 Apr 2026', 'L2', 'Active', '2,480', '124.00', '24.80', '19 Apr 2027'], ['TI', '@ti•••ker', '2 May 2026', 'L2', 'Active', '1,960', '98.00', '19.60', '2 May 2027'], ['ZE', '@ze•••21', '11 Jun 2026', 'L1', 'Active', '1,410', '70.50', '14.10', '11 Jun 2027'], ['HA', '@ha•••on', '23 Jul 2026', 'L2', 'Active', '1,105', '55.25', '11.05', '23 Jul 2027'], ['LY', '@ly•••_v', '8 Aug 2026', 'L1', 'Active', '860', '43.00', '8.60', '8 Aug 2027'], ['DR', '@dr•••sol', '30 Aug 2026', 'L2', 'Inactive', '640', '32.00', '6.40', '30 Aug 2027'], ['NO', '@no•••ind', '14 Sep 2026', 'L1', 'Active', '520', '26.00', '5.20', '14 Sep 2027'], ['CO', '@co•••t.k', '21 Oct 2026', 'L1', 'Active', '310', '15.50', '3.10', '21 Oct 2027'], ['SA', '@sa•••le', '20 Nov 2026', '—', 'Unverified', '0', '0.00', '0.00', 'Starts after KYC']];
for (const [ini, h, j, kyc, st, e, fe, cm, until] of U) { const pc = ROW({ gap: 10 }); const av = await I('9:238', { Size: 'S' }, { Initials: ini, 'Show status': false }); add(pc, av); add(pc, await TWO(h, 'Joined ' + j)); add(pc, await DEMO('XS'));
  const kb = kyc === '—' ? await BADGEL('Neutral', 'Not started') : await BADGEL('Approved', 'KYC ' + kyc);
  const sb = st === 'Active' ? await BADGEL('Confirmed', 'Active') : st === 'Inactive' ? await BADGEL('Neutral', 'Inactive 30 d+') : await BADGEL('Pending', 'Awaiting KYC');
  await addRow(tbl, [CELL('FILL', [pc], { py: 12 }), CELL(130, [kb]), CELL(140, [sb]), CELL(110, [await TX(e, 'Number/S')], { right: true }), CELL(140, [await AMT(fe, { c: 'text/secondary' })], { right: true }), CELL(124, [await AMT(cm, { c: cm === '0.00' ? 'text/tertiary' : 'text/success' })], { right: true }), CELL(150, [await TX(until, 'Body/S', until.startsWith('Starts') ? 'text/tertiary' : 'text/secondary')])], { name: 'Row — ' + h }); }
const tot = ROW({}); add(tot, await T('All 48 players', 'Body/S Strong')); add(tot, await DEMO('XS'));
await addRow(tbl, [CELL('FILL', [tot]), CELL(130, []), CELL(140, []), CELL(110, [await TX('14,250', 'Number/S')], { right: true }), CELL(140, [await AMT('712.50')], { right: true }), CELL(124, [await AMT('142.50', { c: 'text/success' })], { right: true }), CELL(150, [])], { name: 'Totals row', fill: 'bg/secondary', last: true });
const pag = await I('23:16756', { Type: 'Numbered' }); await sx(pag, 'Range', '1–10 of 48'); add(tc, [pag, 'FILL']);
const hn = ROW({ name: 'Help row', gap: 24 }); add(content, [hn, 'FILL']);
add(hn, await CHK('Unverified friends don’t earn you commission until they complete KYC Level 1. You can resend your link — we never share their details with you.', 'info', 520, 'Caption'));
add(hn, await CHK('Seeing a handle you don’t recognise? Report it — self-referrals and fake accounts void commission.', 'warn', 460, 'Caption'));
await FOOT(content, 'Handles, counts and amounts are DEMO. Commission = 20% of the 0.05 USDT platform fee on referred qualifying entries.');
fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'd-r3', err: String(e && e.stack || e).slice(0, 400) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
