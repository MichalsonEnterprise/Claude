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

// ===== usr-vip-ref MOBILE SHELL =====
async function MOB(NAME, X, Y, m) {
  for (const c of [...sec.children]) if (c.name === NAME) c.remove();
  if (Y === 'BELOW') { let my = 0; for (const c of sec.children) if (Math.abs(c.x - X) < 2) my = Math.max(my, c.y + c.height); Y = my + 160; }
  const f = await screen(NAME, 390, {}); sec.appendChild(f); f.x = X; f.y = Y;
  const bar = await DEMOBAR(); add(f, [bar, 'FILL']);
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
try { // ---- m-v1
const NAME = '[USR-V1] VIP — Current Level & Progress / 390 / Default';
const { f, content } = await MOB(NAME, 120, 160, { title: 'VIP Club', sub: 'Gold III · Level 14 of 29', tabs: MVT('Level') });
const sc = CARD({ name: 'Status card — Gold III', gap: 12, p: 20, r: 20, clip: true }); add(content, [sc, 'FILL']);
const cr = await I('23:10035', { Motif: 'Crown' }); cr.resize(120, 120); sc.appendChild(cr); cr.layoutPositioning = 'ABSOLUTE'; cr.x = 262; cr.y = -6;
const tr = ROW({ gap: 8 }); add(tr, await I('6:211', { Tier: 'Gold', Size: 'M' })); add(tr, await T('Level 14 of 29', 'Label/S', 'text/secondary')); add(tr, await DEMO('XS')); add(sc, tr);
add(sc, await T('Gold III', 'Heading/H2'));
const pt = ROW({ gap: 6, align: 'MAX' }); add(pt, await T('12,840', 'Number/L')); add(pt, await T('/ 20,000 pts', 'Body/S', 'text/tertiary')); add(sc, pt);
add(sc, BAR(318, 0.642, 'vip/gold', 10)); add(sc, [await T('1,160 pts to Gold IV · 7,160 to Platinum. Next roll-off 410 pts on 1 Dec 2026 — you stay Gold.', 'Caption', 'text/secondary', { w: 318 }), 'FILL']);
const wr = CARD({ name: 'Weekly reward — 115.20 owed', gap: 10, p: 16 }); add(content, [wr, 'FILL']);
const o1 = ROW({ gap: 8 }); add(o1, await T("THIS WEEK'S VIP REWARD", 'Overline', 'text/tertiary')); add(o1, await DEMO('XS')); add(wr, o1);
const am = ROW({ gap: 8 }); add(am, await IC('coins', 24, 'balance/owed')); add(am, await T('115.20', 'Number/L', 'balance/owed')); add(am, await T('USDT', 'Body/S', 'text/tertiary')); add(wr, am);
add(wr, [await CHK('Settles to Available automatically Mon 30 Nov 2026, 10:00 UTC', 'clock', 300, 'Caption'), 'FILL']);
add(wr, [await BTN('Primary', 'Claim 115.20 USDT now', { size: 'L' }), 'FILL']); add(wr, await T('Optional — no wagering, nothing expires.', 'Caption', 'text/tertiary'));
const lv = CARD({ name: 'Gold levels', gap: 0, p: 0, clip: true }); add(content, [lv, 'FILL']);
const lh = ROW({ gap: 8, p: [16, 16, 8, 16] }); add(lh, await T('Your path through Gold', 'Heading/H5')); add(lh, await DEMO('XS')); add(lv, lh);
for (const [n, nm, th, rw, st] of [[13, 'Gold II', '10,000', '3.00', 'done'], [14, 'Gold III', '12,000', '5.00', 'now'], [15, 'Gold IV', '14,000', '8.00', 'next'], [16, 'Gold V', '16,000', '10.00', 'lock'], [18, 'Platinum I', '20,000', '25.00', 'lock']]) { const ok = st === 'done' || st === 'now';
  const r = ROW({ name: 'Level ' + n, gap: 12, p: [12, 16, 12, 16], fill: st === 'now' ? 'surface/selected' : null }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await IC(ok ? 'check-circle' : st === 'next' ? 'target' : 'lock', 20, ok ? 'status/success' : st === 'next' ? 'icon/brand' : 'icon/muted'));
  const c = COL({ gap: 2 }); add(c, await T(nm + ' · Level ' + n, 'Body/S Strong', st === 'lock' ? 'text/secondary' : 'text/primary')); add(c, await T(st === 'now' ? 'You are here · ' + th + ' pts' : st === 'next' ? '840 / 2,000 pts' : th + ' pts', 'Caption', st === 'now' ? 'text/brand' : 'text/tertiary')); if (st === 'next') add(c, BAR(160, 0.42, 'brand/primary', 6)); add(r, [c, 'FILL']); add(r, await AMT(rw, { c: ok ? 'text/primary' : 'text/secondary' })); add(lv, [r, 'FILL']); }
const rg = CARD({ name: 'Play within your limits', gap: 10, p: 16 }); add(content, [rg, 'FILL']);
const rgh = ROW({ gap: 8 }); add(rgh, await IC('shield', 18, 'icon/brand')); add(rgh, await T('Never chase a level', 'Heading/H5')); add(rg, rgh);
add(rg, [await KV('Daily participation limit', '351.75 / 500.00', { demo: true }), 'FILL']); add(rg, BAR(326, 0.7, 'brand/primary', 6)); add(rg, [await BTN('Secondary', 'Set limits', { size: 'L' }), 'FILL']);
await MFOOT(content, 'VIP status never changes odds or outcomes. DEMO values. 18+ · Terms apply.');
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-v1', err: String(e && e.stack || e).slice(0, 400) }); }
try { // ---- m-v2
const NAME = '[USR-V2] VIP — Points & History / 390 / Default';
const { f, content } = await MOB(NAME, 630, 160, { title: 'Status points', sub: '12,840 pts · rolling 365 days', tabs: MVT('Points') });
for (const pair of [[['Status points', '12,840', { cap: 'Gold III' }], ['This week', '+1,286', { color: 'text/success', cap: 'Mon 23 Nov – now' }]], [['This month', '5,032', { cap: '+18.6% vs Oct' }], ['To Platinum', '7,160', { cap: '64.2% of 20,000' }]]]) { const r = ROW({ gap: 12, align: 'MIN' }); for (const [l, v, o] of pair) add(r, [await KPI(l, v, 'pts', { ...o, p: 14, size: 'Number/M', cw: 130 }), 'FILL_BOTH']); add(content, [r, 'FILL']); }
const hc = CARD({ name: 'Points history', gap: 0, p: 0, clip: true }); add(content, [hc, 'FILL']);
const hh = ROW({ gap: 8, p: [16, 16, 8, 16] }); add(hh, await T('Points history', 'Heading/H5')); add(hh, await DEMO('XS')); add(hh, [ROW({}), 'FILL']); add(hh, await BTN('Ghost', 'Filter', { size: 'S', lead: 'filter' })); add(hc, [hh, 'FILL']);
for (const [a, d, ic, p, b] of [['Round #1,248 · 35 entries', '27 Nov, 14:12 · Global Pool', 'pool', '+350', '12,840'], ['Orbit Rush · 124.00 staked', '27 Nov, 11:05 · Originals', 'crash', '+124', '12,490'], ['Pool Dice · 80.00 staked', '26 Nov, 21:40 · Originals', 'dice', '+80', '12,366'], ['Twenty-One · 90.00 staked', '26 Nov, 18:02 · Table games', 'cards', '+90', '12,286'], ['Round #1,247 · 15 entries', '26 Nov, 12:15 · Global Pool', 'pool', '+150', '12,196'], ['Level up — Gold III', '25 Nov, 19:30 · reward 5.00 USDT', 'crown', '0', '12,046']]) {
  const r = ROW({ name: 'Item — ' + a, gap: 12, p: [12, 16, 12, 16], fill: ic === 'crown' ? 'accent/gold-tint' : null }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await TILE(ic, ic === 'crown' ? 'icon/gold' : 'icon/default', 'surface/raised', 36)); add(r, [await TWO(a, d), 'FILL']);
  const rc = COL({ gap: 2, align: 'MAX' }); add(rc, await T(p, 'Number/S', p === '0' ? 'text/tertiary' : 'text/success')); add(rc, await T(b, 'Caption', 'text/tertiary')); add(r, rc); add(hc, [r, 'FILL']); }
const lm = ROW({ p: 16 }); add(lm, [await BTN('Secondary', 'Load more (208)', { size: 'L' }), 'FILL']); add(hc, [lm, 'FILL']);
const ro = CARD({ name: 'Roll-off schedule', gap: 10, p: 16 }); add(content, [ro, 'FILL']);
add(ro, await T('Roll-off schedule', 'Heading/H5')); for (const [d, v] of [['1 Dec 2026', '−410 pts'], ['1 Jan 2027', '−1,050 pts'], ['1 Feb 2027', '−920 pts']]) add(ro, [await KV(d, v, { demo: true, vc: 'text/secondary' }), 'FILL']);
add(ro, [await CHK('You keep Gold until at least 1 Feb 2027 even with no play.', 'info', 300, 'Caption'), 'FILL']);
add(content, [await CHK('Not counted: the 0.05 USDT entry fee, bonus-fund bets and refunded entries (round #1,245).', 'lock', 330, 'Caption'), 'FILL']);
await MFOOT(content, 'Points have no cash value. DEMO values.');
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-v2', err: String(e && e.stack || e).slice(0, 400) }); }
try { // ---- m-v3
const NAME = '[USR-V3] VIP — Rewards / 390 / Default';
const { f, content } = await MOB(NAME, 1140, 160, { title: 'VIP rewards', sub: 'USDT to Available · no wagering', tabs: MVT('Rewards') });
const rc = CARD({ name: 'Ready to claim', gap: 12, p: 16 }); add(content, [rc, 'FILL']);
const rh = ROW({ gap: 8 }); add(rh, await T('READY TO CLAIM', 'Overline', 'text/tertiary')); add(rh, [ROW({}), 'FILL']); add(rh, await AMT('118.62', { s: 'Number/M', demo: true })); add(rc, [rh, 'FILL']);
for (const [nm, icon, ic, bg, ttl, note, v, vc] of [['Weekly reward', 'crown', 'icon/gold', 'accent/gold-tint', 'Weekly reward · Gold', 'Auto-settles Mon 30 Nov, 10:00 UTC', '115.20', 'balance/owed'], ['Rakeback', 'percent', 'icon/brand', 'brand/tint', 'Rakeback · 5% of house edge', 'Never expires', '3.42', 'text/primary']]) {
  const it = CARD({ name: 'Reward — ' + nm, gap: 12, p: 12, fill: 'surface/raised' }); add(rc, [it, 'FILL']);
  const top = ROW({ gap: 12 }); add(top, await TILE(icon, ic, bg, 40)); add(top, [await TWO(ttl, note), 'FILL']); add(top, await AMT(v, { s: 'Number/S', c: vc })); add(it, [top, 'FILL']);
  const b = await BTN('Primary', 'Claim ' + v + ' USDT', { size: 'L' }); b.name = 'Claim button'; add(it, [b, 'FILL']); }
const cu = CARD({ name: 'Coming up', gap: 12, p: 16 }); add(content, [cu, 'FILL']); add(cu, await T('Coming up', 'Heading/H5'));
for (const [ttl, sub, st, lab] of [['Weekly cashback · 10%', 'Mon 30 Nov 2026, 10:00 UTC', 'Pending', 'Scheduled'], ['Level-up · Gold IV · 8.00 USDT', '1,160 pts to go', 'Neutral', 'Locked'], ['Level-up · Platinum I · 25.00 USDT', '7,160 pts to go', 'Neutral', 'Locked']]) { const r = ROW({ gap: 8 }); add(r, [await TWO(ttl, sub), 'FILL']); add(r, await BADGEL(st, lab)); add(cu, [r, 'FILL']); }
const hc = CARD({ name: 'Reward history', gap: 10, p: 16 }); add(content, [hc, 'FILL']); const hh = ROW({ gap: 8 }); add(hh, await T('Reward history', 'Heading/H5')); add(hh, await DEMO('XS')); add(hc, hh);
for (const [a, d, v, st, lab] of [['Level-up — Gold III', '25 Nov 2026, 19:32', '5.00', 'Confirmed', 'Claimed'], ['Rakeback', '24 Nov 2026, 09:12', '2.96', 'Confirmed', 'Claimed'], ['Weekly reward — Gold', '23 Nov 2026, 10:00', '108.40', 'Approved', 'Auto-settled'], ['Weekly cashback · 10%', '23 Nov 2026, 10:00', '12.80', 'Approved', 'Auto-paid']]) { const r = ROW({ gap: 8 }); add(r, [await TWO(a, d + ' · to Available'), 'FILL']); const rc2 = COL({ gap: 4, align: 'MAX' }); add(rc2, await AMT('+' + v, { c: 'text/success' })); add(rc2, await BADGEL(st, lab)); add(r, rc2); add(hc, [r, 'FILL']); }
await MFOOT(content, 'Rewards are DEMO. Never changes odds or outcomes. Terms apply.');
const sticky = ROW({ name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(sticky, 'border/subtle', { t: 1 }); add(sticky, [await BTN('Primary', 'Claim all · 118.62 USDT', { size: 'L' }), 'FILL']); add(f, [sticky, 'FILL']);
await MEND(f); fitSection(sec); await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, name: NAME, h: Math.round(f.height) });
} catch (e) { R.push({ body: 'm-v3', err: String(e && e.stack || e).slice(0, 400) }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
