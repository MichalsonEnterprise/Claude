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
// ===== CF lib (trimmed) =====
async function setText(root, name, value, nth = 0) { let ts = root.findAll(n => n.type === 'TEXT' && n.name === name); if (name === 'Balance value') ts = root.findAll(n => n.type === 'TEXT' && n.characters === '9,215.30'); const t = ts[nth]; if (!t) return false; const fonts = t.getStyledTextSegments(['fontName']).map(s => s.fontName); for (const fn of fonts) await figma.loadFontAsync(fn); t.characters = value; return true; }
function grow(n) { n.layoutGrow = 1; return n; }
function SPC() { const s = figma.createFrame(); s.name = 'Spacer'; s.fills = []; s.resize(1, 1); return s; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, 'Label/S', o.color || 'text/secondary')); if (o.demo) add(r, await DEMO('XS')); return r; }
async function disc(side, o = {}) { const s = o.size || 24; const d = AL('HORIZONTAL', { name: 'Disc/' + side, w: s, h: s, r: 9999, align: 'CENTER', justify: 'CENTER', fill: side === 'H' ? 'brand/tint' : 'surface/raised', stroke: o.newest ? 'border/focus' : (side === 'H' ? 'border/brand' : 'border/default'), sw: o.newest ? 2 : 1 }); add(d, await T(side, s >= 28 ? 'Label/M' : 'Label/S', side === 'H' ? 'text/brand' : 'text/secondary')); return d; }
async function swapInst(old, compId, variant, scale) { const n = await I(compId, variant); if (scale) n.rescale(scale); n.name = old.name; const p = old.parent; const i = p.children.indexOf(old); p.insertChild(i, n); old.remove(); return n; }
async function setTexts(root, map) { const miss = []; for (const [k, v] of Object.entries(map)) { const ok = await setText(root, k, v); if (!ok) miss.push(k); } return miss; }
async function statTile(label, value, sub, color, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Label row', align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(lr, await T(label, 'Overline', 'text/tertiary'), await DEMO('XS')); add(t, [lr, 'FILL']); add(t, await T(value, o.style || 'Number/L', color || 'text/primary', { name: 'Value' })); const s = await T(sub, 'Caption', 'text/tertiary', { name: 'Sub', w: 200 }); add(t, s); s.layoutSizingHorizontal = 'FILL'; return t; }
// ===== CF state helpers =====
async function callout(kind, icon, title, body, btns = [], o = {}) { const c = AL('HORIZONTAL', { name: o.name || ('Callout — ' + title), gap: 12, p: 16, r: 14, fill: 'status/' + kind + '-tint', stroke: 'status/' + kind }); add(c, await IC(icon, 20, 'status/' + kind)); const col = AL('VERTICAL', { name: 'Callout body', gap: 4 }); add(c, [col, 'FILL']); add(col, await T(title, 'Body/M Strong', 'text/primary', { name: 'Callout title' })); const b = await T(body, 'Body/S', 'text/secondary', { name: 'Callout text', w: o.w || 600 }); add(col, b); b.layoutSizingHorizontal = 'FILL'; if (btns.length) { const r = AL('HORIZONTAL', { name: 'Callout actions', gap: 8, p: [8, 0, 0, 0] }); for (const [t, l, ic] of btns) add(r, await BTN(t, l, { size: 'S', lead: ic })); add(col, r); } return c; }
async function fieldError(f, msg) { const inp = f.findOne(n => n.name === 'Amount input'); stroke(inp, 'border/danger', 1); const g = inp.parent; const i = g.children.indexOf(inp); const r = AL('HORIZONTAL', { name: 'Field error', gap: 6, align: 'CENTER' }); add(r, await IC('alert-circle', 14, 'status/danger')); const t = await T(msg, 'Caption', 'text/danger', { name: 'Field error text', w: 360 }); add(r, t); g.insertChild(i + 1, r); r.layoutSizingHorizontal = 'FILL'; t.layoutSizingHorizontal = 'FILL'; return r; }
function setLabel(inst, label) { const k = Object.keys(inst.componentProperties).find(x => x.startsWith('Label')); if (k) inst.setProperties({ [k]: label }); }
function setState(inst, st) { try { inst.setProperties({ State: st }); } catch (e) {} }
function insertAfter(parent, refName, node) { const ref = parent.children.find(n => n.name === refName); const i = ref ? parent.children.indexOf(ref) + 1 : parent.children.length; parent.insertChild(i, node); return node; }
// ===== END CF state helpers =====
// ===== CF mobile helpers =====
async function mShell(name, pos, o = {}) { const f = await screen(name, 390, pos); f.primaryAxisSizingMode = 'AUTO'; add(f, [await DEMOBAR('DEMO DATA — all figures and results are illustrative.'), 'FILL']); if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); } const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']); if (o.balance) await setText(tb, 'Balance value', o.balance); const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']); return { f, tb, c }; }
async function mFoot(f, ctaLabel, o = {}) { if (ctaLabel) { const s = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(s, 'border/subtle', { t: 1 }); const b = await BTN('Primary', ctaLabel, { size: 'L', lead: o.lead || 'coin', state: o.state }); b.name = 'CTA'; add(s, [b, 'FILL']); add(f, [s, 'FILL']); } const tab = await I('22:5413', { Active: 'Games' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']); }
async function mHeader(sub) { const h = AL('HORIZONTAL', { name: 'Game header', gap: 12, align: 'CENTER' }); const th = await I('24:13473'); th.rescale(0.3); th.name = 'Tile/Game Art — Double Side (thumb)'; add(h, th); const col = AL('VERTICAL', { name: 'Title', gap: 2 }); add(col, await T('Double Side', 'Heading/H4', 'text/primary', { name: 'Game title' }), await T(sub || 'Coinflip · GLOBAL POOL Original', 'Caption', 'text/brand', { name: 'Game sub' })); add(h, col); grow(col); const act = AL('HORIZONTAL', { name: 'Header actions', gap: 4 }); for (const ic of ['history', 'book', 'volume']) add(act, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); add(h, act); return h; }
async function mRG(o = {}) { const r = AL('VERTICAL', { name: 'RG session strip', gap: 8, p: 12, r: 14, fill: o.danger ? 'status/danger-tint' : 'surface/default', stroke: o.danger ? 'status/danger' : 'border/subtle' }); const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(r1, await IC('timer', 16, 'icon/muted'), await T(o.timer || '00:42:18', 'Mono/S', 'text/primary', { name: 'Timer' }), await T('Net', 'Caption', 'text/tertiary'), await T(o.net || '−24.60 USDT', 'Body/S Strong', 'text/primary', { name: 'Net value' }), await DEMO('XS')); const sp = SPC(); add(r1, sp); grow(sp); add(r1, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['pause-circle'] })); add(r, [r1, 'FILL']); const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(r2, await T('Daily loss limit', 'Caption', 'text/tertiary'), await T(o.lim || '24.60 / 200.00 USDT', 'Caption', o.danger ? 'text/danger' : 'text/secondary', { name: 'Limit value' })); const sp2 = SPC(); add(r2, sp2); grow(sp2); const tr = AL('HORIZONTAL', { name: 'Meter', w: 96, h: 4, r: 9999, fill: 'border/default', clip: true }); add(tr, rect(Math.max(4, Math.round(96 * (o.pct || 0.12))), 4, o.danger ? 'status/danger' : 'status/info', 0, 'Meter fill')); add(r2, tr); add(r, [r2, 'FILL']); return r; }
// ===== END CF mobile helpers =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Coinflip', 203000, 0);
const OUT = {};
const INV = sec.children.map(c => ({ name: c.name, id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height), sizing: c.primaryAxisSizingMode }));
OUT.inventoryBefore = INV;
const hasN = (p) => sec.children.filter(n => n.name.startsWith(p) && n.name.includes('/ 390 /'));
const base01 = hasN('[CF-01]').length, base02 = hasN('[CF-02]').length, base03 = hasN('[CF-03]').length;
const n06 = hasN('[CF-06]').length, n04 = hasN('[CF-04]').length, n05 = hasN('[CF-05]').length;
OUT.counts = { base01, base02, base03, n06, n04, n05 };
if (!base01 || !base02) return { ...OUT, stop: 'CF-01/CF-02 mobile base frames missing — run 06 first' };
const NEED06 = n06 < 4, NEED45 = false;
OUT.plan = { NEED06, NEED45 };
if (!NEED06 && !NEED45) return { ...OUT, done: 'all mobile frames already present' };
for (const id of ['104:48933', '104:49252', '104:49572', '104:49901']) { const f = await figma.getNodeByIdAsync(id); if (!f) continue; const d = f.children[0]; if (d && d.type === 'INSTANCE') { const k = Object.keys(d.componentProperties).find(x => x.startsWith('Message')); if (k) d.setProperties({ [k]: 'DEMO DATA — all figures and results are illustrative.' }); } }
if (NEED06) {
for (const n of sec.children.filter(n => n.name.startsWith('[CF-06]'))) n.remove();
const M = sec.children.find(n => n.name.startsWith('[CF-01]')); const F2 = sec.children.find(n => n.name.startsWith('[CF-02]'));
const q = (f, nm) => f.findOne(n => n.name === nm);
const X = 2670; let Y = 120; const ids = {};
async function mk(src, name) { const c = src.clone(); sec.appendChild(c); c.x = X; c.y = Y; c.name = name; return c; }
function next(f) { Y = f.y + f.height + 160; }
// (a) insufficient balance — bottom sheet
{ const f = await mk(M, '[CF-06] Error & limit states / 390 / Insufficient balance (sheet) — DEMO account · Available 4.20 USDT');
  await setTexts(f, { 'Balance value': '4.20', 'Available value': 'Balance 4.20 USDT' }); stroke(q(f, 'Amount input'), 'border/danger', 1);
  const scrim = rect(390, f.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
  const sh = AL('VERTICAL', { name: 'Sheet — Not enough balance', gap: 16, p: [8, 16, 34, 16], fill: 'surface/overlay', w: 390, align: 'CENTER' }); sh.setBoundVariable('topLeftRadius', VAR['radius/2xl']); sh.setBoundVariable('topRightRadius', VAR['radius/2xl']); const es = Object.keys(ES).find(k => k.startsWith('Elevation/4')); if (es) await fx(sh, es);
  add(sh, rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('HORIZONTAL', { name: 'Sheet header', align: 'CENTER' }); add(hd, await T('Not enough balance', 'Heading/H5', 'text/primary')); const s1 = SPC(); add(hd, s1); grow(s1); add(hd, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.x })); add(sh, [hd, 'FILL']);
  const b = await T('This flip needs 10.00 USDT. This DEMO account has 4.20 USDT available — nothing has been charged.', 'Body/S', 'text/secondary', { w: 358 }); add(sh, [b, 'FILL']);
  const kv = AL('VERTICAL', { name: 'Amounts', gap: 8, p: 12, r: 10, fill: 'surface/default', stroke: 'border/subtle' }); for (const [k, v, c] of [['Bet', '10.00 USDT', 'text/primary'], ['Available', '4.20 USDT', 'text/primary'], ['Short by', '5.80 USDT', 'text/danger']]) { const r = AL('HORIZONTAL', { name: 'KV — ' + k, align: 'CENTER', gap: 6 }); add(r, await T(k, 'Body/S', 'text/secondary')); const sp = SPC(); add(r, sp); grow(sp); add(r, await T(v, 'Number/S', c), await DEMO('XS')); add(kv, [r, 'FILL']); } add(sh, [kv, 'FILL']);
  add(sh, [await BTN('Primary', 'Deposit USDT', { size: 'L', lead: 'deposit' }), 'FILL'], [await BTN('Secondary', 'Bet 4.20 USDT instead', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']);
  const cap = await T('Deposits never change the odds. You can set a deposit limit any time in Responsible gaming.', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' }); add(sh, [cap, 'FILL']);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = f.height - sh.height;
  ids.a = f.id; next(f); }
// (b) daily loss limit reached
{ const f = await mk(M, '[CF-06] Error & limit states / 390 / Daily loss limit reached');
  await setTexts(f, { 'Balance value': '9,039.90', 'Available value': 'Balance 9,039.90 USDT', 'Flip label': 'PLAY PAUSED', 'Flip meta': 'Daily loss limit reached · resets 00:00 UTC', 'Coin title': 'Play paused until 00:00 UTC', 'Coin body': 'Your balance stays available to withdraw. History and Fairness remain open.' });
  const old = q(f, 'RG session strip'); const nr = await mRG({ danger: true, timer: '01:52:40', net: '−200.00 USDT', lim: '200.00 / 200.00 USDT', pct: 1 }); const p = old.parent; p.insertChild(p.children.indexOf(old), nr); nr.layoutSizingHorizontal = 'FILL'; old.remove();
  const co = await callout('danger', 'ban', 'Daily loss limit reached', 'You’ve reached 200.00 / 200.00 USDT. Games reopen at 00:00 UTC (in 04:07:20). Increases to your limit only apply after 24 h.', [['Secondary', 'View limits', 'sliders'], ['Ghost', 'Take a break', 'pause-circle']], { w: 280 }); const C = q(f, 'Content'); C.insertChild(1, co); co.layoutSizingHorizontal = 'FILL';
  q(f, 'Picks').opacity = 0.45; q(f, 'Bet card').opacity = 0.5; const cta = q(f, 'CTA'); setState(cta, 'Disabled'); setLabel(cta, 'Paused until 00:00 UTC');
  ids.b = f.id; next(f); }
// (c) region restricted
{ const f = await mk(M, '[CF-06] Error & limit states / 390 / Region restricted (United States)');
  const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; f.insertChild(1, rb); rb.layoutSizingHorizontal = 'FILL';
  await setTexts(f, { 'Flip label': 'NOT AVAILABLE IN YOUR REGION', 'Flip meta': 'United States (restricted) · funds unaffected', 'Coin title': 'Double Side isn’t available here', 'Coin body': 'Real-money games need a licence covering your location. You can still view your balance, withdraw and verify past flips.' });
  for (const nm of ['Picks', 'Bet card', 'RG session strip', 'Sticky CTA', 'Last flips']) { const n = q(f, nm); if (n) n.visible = false; } q(f, 'Coin').opacity = 0.4;
  const ar = await I('30:17116', { Type: 'Regional restriction', Layout: 'Inline' }); ar.name = 'Alert/Banner — Regional restriction'; const C = q(f, 'Content'); C.insertChild(C.children.indexOf(q(f, 'Stage')) + 1, ar); ar.layoutSizingHorizontal = 'FILL';
  ids.c = f.id; next(f); }
// (d) connection lost
{ const f = await mk(F2, '[CF-06] Error & limit states / 390 / Connection lost — flip held on server');
  await setTexts(f, { 'Coin title': 'Waiting for connection…', 'Coin body': 'Flip CF-52107 keeps settling on the server and will show here and in My flips.' });
  const co = await callout('warning', 'wifi-off', 'Connection lost — reconnecting (2 of 5)', 'Stake 10.00 USDT is locked and the result was fixed by nonce 418. It settles once — you’ll never be charged twice.', [['Secondary', 'Retry now', 'refresh']], { w: 280 }); const C = q(f, 'Content'); C.insertChild(1, co); co.layoutSizingHorizontal = 'FILL';
  setLabel(q(f, 'CTA'), 'Reconnecting…');
  ids.d = f.id; next(f); }
fitSection(sec);
for (const k of ['a', 'b', 'c', 'd']) await (await figma.getNodeByIdAsync(ids[k])).screenshot({ scale: 0.4 });
OUT.m06 = ids;

}
OUT.inventoryAfter = sec.children.map(c => ({ name: c.name, id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
return OUT;
