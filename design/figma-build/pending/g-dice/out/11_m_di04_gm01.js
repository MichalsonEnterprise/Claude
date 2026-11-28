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
// ===== DICE KIT (subset, agent g-dice) =====
async function setText(root, name, value, nth = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = ts[nth]; if (!t) return false; for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(value); return true; }
async function repl(root, map, sub = false) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; let nc = c; for (const [k, v] of Object.entries(map)) { if (sub) { if (nc.includes(k)) nc = nc.split(k).join(v); } else if (nc === k) nc = v; } if (nc !== c) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = nc; n++; } } return n; }
function grow(n) { n.layoutGrow = 1; return n; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
function addSpacer(row) { const s = spacer(); add(row, s); s.layoutGrow = 1; return s; }
async function wrapT(parent, text, style, color, w, o = {}) { const t = await T(text, style, color, Object.assign({ w }, o)); add(parent, t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, o.style || 'Label/S', o.color || 'text/secondary', { name: o.name || label })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function statusChip(win, label) { return chip(win ? 'check-circle' : 'x-circle', label, win ? { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' } : { color: 'text/danger', icon: 'status/danger', stroke: 'border/danger', fill: 'status/danger-tint' }); }
async function iconBtn(icon, o = {}) { const b = await I('7:774', { Type: o.type || 'Secondary', Size: o.size || 'M', State: o.state || 'Default' }, { Icon: ICONS[icon] }); b.name = 'Button/Icon — ' + icon; return b; }
async function callout(o) { const tone = o.tone || 'info'; const c = AL('HORIZONTAL', { name: 'Callout — ' + o.title, gap: 12, p: 16, r: 14, fill: 'status/' + tone + '-tint', stroke: 'status/' + tone }); add(c, await IC(o.icon || 'info', 20, 'status/' + tone)); const col = AL('VERTICAL', { name: 'Callout text', gap: 4 }); add(c, col); grow(col); await wrapT(col, o.title, 'Body/S Strong', 'text/primary', 240, { name: 'Callout title' }); if (o.body) await wrapT(col, o.body, 'Body/S', 'text/secondary', 240, { name: 'Callout body' }); if (o.actions && o.actions.length) { const a = AL('HORIZONTAL', { name: 'Callout actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(col, a); a.layoutSizingHorizontal = 'FILL'; } return c; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
function colY(sec, x) { let m = 0; for (const c of sec.children) if (Math.abs(c.x - x) < 2) m = Math.max(m, c.y + c.height); return m ? m + 160 : 120; }
function dropByName(sec, name) { for (const c of sec.children.filter(n => n.name === name)) c.remove(); }
async function prompt(o) { const c = AL('VERTICAL', { name: 'Prompt — ' + o.title, gap: 16, p: 24, r: 20, fill: 'surface/overlay', stroke: 'border/subtle', w: o.w || 440 }); await fx(c, 'Elevation/4 — Modal'); const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 48, h: 48, r: 14, align: 'CENTER', justify: 'CENTER', fill: 'status/' + (o.tone || 'info') + '-tint' }); add(tile, await IC(o.icon || 'info', 24, 'status/' + (o.tone || 'info'))); add(c, tile); await wrapT(c, o.title, 'Heading/H4', 'text/primary', 380, { name: 'Prompt title' }); await wrapT(c, o.body, 'Body/S', 'text/secondary', 380, { name: 'Prompt body' }); if (o.facts) { const fl = AL('VERTICAL', { name: 'Facts', gap: 8, p: 12, r: 10, fill: 'bg/secondary' }); for (const [l, v, d] of o.facts) add(fl, [await kv(l, v, { vstyle: 'Body/S Strong', demo: d }), 'FILL']); add(c, [fl, 'FILL']); } if (o.note) await wrapT(c, o.note, 'Caption', 'text/tertiary', 380, { name: 'Prompt note' }); if (o.actions) { const a = AL('HORIZONTAL', { name: 'Prompt actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(c, [a, 'FILL']); } return c; }
function blockStage(stg, card, y = 96) { for (const k of stg.children) k.opacity = 0.25; stg.appendChild(card); card.layoutPositioning = 'ABSOLUTE'; card.x = Math.round((stg.width - card.width) / 2); card.y = y; return card; }
function fmt2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function zones(mode, t) { const tm = Math.round((t - 0.01) * 100) / 100; return mode === 'under' ? { win: [0, tm], lose: [t, 99.99] } : { win: [t, 99.99], lose: [0, tm] }; }
function outcomes(a, b) { return Math.round((b - a) * 100) + 1; }
const PLAY_BASE = {
w: 1440, balance: '9,215.30', avail: '9,215.30', topbar: 'Member', rg: 'Normal', rgTexts: null,
mode: 'over', target: 50.5, tStr: '50.50', chance: '49.50', mult: '2.0000', bet: '10.00', profit: '+10.00', receive: '20.00',
odds: 'Default', oddsRepl: null, thumb: 'default', roll: null,
top: { label: 'NEXT ROLL · D-88213', meta: 'Nonce 417 · server seed hash 8f3c1e…e813 committed before you bet' },
read: { over: 'ROLL OVER TO WIN', value: '50.50', color: 'text/primary', caption: 'Any result from 50.50 to 99.99 wins · 4,950 of 10,000 possible results' },
cta: { label: 'Roll over 50.50 · 10.00 USDT', state: 'Default' }
};
async function slider(o) {
const W = o.w, H = 132; const f = figma.createFrame(); f.name = 'Slider'; f.resize(W, H); f.fills = []; f.clipsContent = false;
const P = 20, TW = W - 2 * P, TY = 80, TH = 12; const X = v => P + TW * v / 100;
const t = o.target; const leftWin = o.mode === 'under'; const xl = X(t);
const cL = o.off ? 'border/strong' : (leftWin ? 'brand/primary' : 'status/danger'); const cR = o.off ? 'border/strong' : (leftWin ? 'status/danger' : 'brand/primary');
const sL = rect(Math.max(4, Math.round(xl - P)), TH, cL, 9999, leftWin ? 'Track — win zone' : 'Track — lose zone'); f.appendChild(sL); sL.x = P; sL.y = TY;
const sR = rect(Math.max(4, Math.round(P + TW - xl)), TH, cR, 9999, leftWin ? 'Track — lose zone' : 'Track — win zone'); f.appendChild(sR); sR.x = Math.round(xl); sR.y = TY;
for (const v of [0, 25, 50, 75, 100]) { const tk = rect(2, 6, 'border/strong', 0, 'Tick ' + v); f.appendChild(tk); tk.x = Math.round(X(v) - 1); tk.y = TY + TH + 6; const lb = await T(String(v), 'Caption', 'text/tertiary', { name: 'Scale ' + v }); f.appendChild(lb); lb.x = Math.round(X(v) - lb.width / 2); lb.y = TY + TH + 16; }
const foc = o.thumb === 'focus';
const th = AL('HORIZONTAL', { name: 'Thumb', w: 40, h: 40, r: 10, fill: 'surface/raised', stroke: foc ? 'border/focus' : 'border/strong', sw: foc ? 2 : 1, align: 'CENTER', justify: 'CENTER', gap: 4 });
if (foc) th.strokeAlign = 'OUTSIDE';
if (o.thumb === 'locked') add(th, await IC('lock', 16, 'icon/muted')); else for (let i = 0; i < 3; i++) add(th, rect(2, 14, foc ? 'icon/brand' : 'icon/muted', 0, 'Grip'));
await fx(th, 'Elevation/2 — Raised'); f.appendChild(th); th.x = Math.round(xl - 20); th.y = TY + TH / 2 - 20;
if (foc) { const tip = AL('HORIZONTAL', { name: 'Drag value', p: [4, 10, 4, 10], r: 6, fill: 'surface/overlay', stroke: 'border/focus', align: 'CENTER' }); add(tip, await T(o.tStr, 'Label/M', 'text/primary', { name: 'Drag value text' })); f.appendChild(tip); tip.x = Math.round(xl - tip.width / 2); tip.y = TY - 44; await fx(tip, 'Elevation/3 — Popover'); }
if (o.roll) {
const win = o.roll.state === 'win', lose = o.roll.state === 'lose';
const pill = AL('HORIZONTAL', { name: 'Roll marker', gap: 6, p: [6, 12, 6, 10], r: 10, align: 'CENTER', fill: win ? 'brand/primary' : lose ? 'status/danger' : 'surface/raised', stroke: (win || lose) ? null : 'border/strong' });
add(pill, await IC(win ? 'check' : lose ? 'x' : 'dice', 16, win ? 'text/on-primary' : lose ? 'text/on-danger' : 'icon/muted'));
add(pill, await T(o.roll.v, 'Label/L', win ? 'text/on-primary' : lose ? 'text/on-danger' : 'text/secondary', { name: 'Roll marker value' }));
f.appendChild(pill); const px = X(parseFloat(o.roll.v)); pill.x = Math.round(Math.min(W - pill.width, Math.max(0, px - pill.width / 2))); pill.y = 0;
const stem = rect(2, Math.max(2, Math.round(TY - pill.height)), win ? 'brand/primary' : lose ? 'status/danger' : 'border/strong', 0, 'Roll marker stem'); f.appendChild(stem); stem.x = Math.round(px - 1); stem.y = Math.round(pill.height);
if (o.roll.ghost) { pill.opacity = 0.55; stem.opacity = 0.55; }
}
if (o.off) for (const k of [sL, sR]) k.opacity = 0.6;
return f;
}
async function legend(mode, t) { const z = zones(mode, t); const L = AL('HORIZONTAL', { name: 'Zone legend', gap: 12, align: 'CENTER' }); const seq = mode === 'under' ? [['win', z.win], ['lose', z.lose]] : [['lose', z.lose], ['win', z.win]]; for (let i = 0; i < 2; i++) { const [k, r] = seq[i]; add(L, await statusChip(k === 'win', (k === 'win' ? 'Win · ' : 'Lose · ') + fmt2(r[0]) + ' – ' + fmt2(r[1]) + ' · ' + commas(outcomes(r[0], r[1])) + ' results')); if (i === 0) addSpacer(L); } return L; }
async function skel(w, h, nm, r = 10) { const x = rect(w, h, null, r, nm); await gfill(x, 'Gradient/Skeleton'); return x; }
async function inputBox(o) {
const st = o.state || 'default';
const b = AL('HORIZONTAL', { name: o.name || 'Input', gap: 8, p: [0, o.pr != null ? o.pr : 12, 0, o.pl != null ? o.pl : 16], r: 10, h: o.h || 48, align: 'CENTER', fill: st === 'disabled' ? 'surface/default' : 'surface/raised', stroke: st === 'error' ? 'border/danger' : st === 'focus' ? 'border/focus' : 'border/default', sw: st === 'focus' ? 2 : 1 });
if (st === 'focus') b.strokeAlign = 'OUTSIDE';
for (const n of (o.lead || [])) add(b, n);
add(b, await T(o.value, o.style || 'Number/S', st === 'disabled' ? 'text/disabled' : st === 'error' ? 'text/danger' : 'text/primary', { name: o.vname || 'Value' }));
addSpacer(b); if (o.suffix) add(b, await T(o.suffix, 'Label/M', 'text/tertiary', { name: 'Suffix' }));
for (const n of (o.trail || [])) add(b, n);
return b;
}
async function helperRow(text, tone) { const r = AL('HORIZONTAL', { name: 'Helper', gap: 6 }); add(r, await IC(tone === 'error' ? 'alert-circle' : 'info', 14, tone === 'error' ? 'status/danger' : 'icon/muted')); await wrapT(r, text, 'Caption', tone === 'error' ? 'text/danger' : 'text/tertiary', 200, { name: 'Helper text' }); return r; }
async function fieldBlock(label, right, box, helper) { const g = AL('VERTICAL', { name: 'Field — ' + label, gap: 8 }); const lr = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Label/M', 'text/secondary', { name: 'Field label' })); addSpacer(lr); for (const n of (right || [])) add(lr, n); add(g, [lr, 'FILL']); add(g, [box, 'FILL']); if (helper) add(g, [helper, 'FILL']); return g; }
async function dirToggle(mode, dis, h = 40) { const t = AL('HORIZONTAL', { name: 'Direction', gap: 4, p: 4, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); for (const [m, label, ic] of [['over', 'Roll over', 'chevron-up'], ['under', 'Roll under', 'chevron-down']]) { const on = m === mode; const o = AL('HORIZONTAL', { name: 'Option — ' + label, gap: 6, h, r: 6, align: 'CENTER', justify: 'CENTER', fill: on ? 'brand/tint' : null, stroke: on ? 'border/brand' : null }); add(o, await IC(ic, 16, on ? 'icon/brand' : 'icon/muted'), await T(label, 'Label/M', on ? 'text/brand' : (dis ? 'text/disabled' : 'text/secondary'), { name: 'Option label' })); add(t, [o, 'FILL']); } return t; }
const M_BASE = Object.assign({}, PLAY_BASE, { w: 390, last: [['61.08', 1], ['18.77', 0], ['44.02', 0], ['9.15', 1], ['70.44', 1], ['52.86', 0]], read: { over: 'ROLL OVER TO WIN', value: '50.50', caption: 'Results 50.50 – 99.99 win · 4,950 of 10,000' }, top: { label: 'NEXT ROLL · D-88213', meta: 'Nonce 417 · seed hash 8f3c1e…e813 committed' } });
function topRadius(n, px) { const v = VAR[RD[px]]; for (const c of ['topLeftRadius', 'topRightRadius']) { if (v) n.setBoundVariable(c, v); else n[c] = px; } }
async function mShell(name, o = {}) {
const f = await screen(name, 390, { x: 0, y: 0 }); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance })) > 0; }
const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
return { f, tb, C, balOk };
}
async function mFoot(f, st) {
if (st.cta) { const s = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(s, 'border/subtle', { t: 1 });
if (st.ctaNote !== false) { const r = AL('HORIZONTAL', { name: 'CTA summary', gap: 6, align: 'CENTER' }); await wrapT(r, st.ctaNote || ('Profit on win ' + st.profit + (st.profit === '—' ? '' : ' USDT')), 'Caption', 'text/secondary', 180, { name: 'CTA summary text' }); add(r, await T('You can lose your stake', 'Caption', 'text/tertiary')); add(s, [r, 'FILL']); }
const b = await BTN(st.cta.type || 'Primary', st.cta.label, { size: 'L', lead: st.cta.lead || 'dice', state: st.cta.state || 'Default' }); b.name = 'CTA'; add(s, [b, 'FILL']);
if (st.cta2) { const b2 = await BTN('Secondary', st.cta2.label, { size: 'L', lead: st.cta2.lead }); b2.name = 'CTA secondary'; add(s, [b2, 'FILL']); }
add(f, [s, 'FILL']); }
const tab = await I('22:5413', { Active: st.tab || 'Games' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']);
}
async function mHeader(o = {}) {
const h = AL('HORIZONTAL', { name: 'Game header', gap: 12, align: 'CENTER' }); const th = await I('24:13443'); th.rescale(0.3); th.name = 'Tile/Game Art — Pool Dice (thumb)'; add(h, th);
const col = AL('VERTICAL', { name: 'Title', gap: 2 }); add(h, col); grow(col); add(col, await T(o.title || 'Pool Dice', 'Heading/H4', 'text/primary', { name: 'Game title' })); await wrapT(col, o.sub || 'Original · house edge 1.00% · provably fair', 'Caption', 'text/brand', 140, { name: 'Game sub' });
const act = AL('HORIZONTAL', { name: 'Header actions', gap: 0 }); for (const ic of (o.icons || ['history', 'book', 'volume'])) add(act, await iconBtn(ic, { type: 'Ghost', size: 'L' })); add(h, act); return h;
}
async function mRG(o = {}) {
const tone = o.danger ? 'danger' : o.warn ? 'warning' : null;
const r = AL('VERTICAL', { name: 'RG session strip', gap: 8, p: 12, r: 14, fill: tone ? 'status/' + tone + '-tint' : 'surface/default', stroke: tone ? 'status/' + tone : 'border/subtle' });
const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(r1, await IC('timer', 16, 'icon/muted'), await T(o.timer || '00:42:18', 'Mono/S', 'text/primary', { name: 'Timer' }), await T('Net', 'Caption', 'text/tertiary'), await T(o.net || '−24.60 USDT', 'Body/S Strong', 'text/primary', { name: 'Net value' }), await DEMO('XS')); addSpacer(r1); add(r1, await iconBtn('pause-circle', { type: 'Ghost', size: 'L' })); add(r, [r1, 'FILL']);
const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(r2, await T(o.limLabel || 'Daily loss limit', 'Caption', 'text/tertiary'), await T(o.lim || '24.60 / 200.00 USDT', 'Caption', tone ? 'text/' + tone : 'text/secondary', { name: 'Limit value' })); addSpacer(r2);
const tr = AL('HORIZONTAL', { name: 'Meter', w: 96, h: 4, r: 9999, fill: 'border/default', clip: true }); add(tr, rect(Math.max(4, Math.round(96 * (o.pct || 0.12))), 4, tone ? 'status/' + tone : 'status/info', 0, 'Meter fill')); add(r2, tr); add(r, [r2, 'FILL']);
if (o.msg) await wrapT(r, o.msg, 'Caption', tone ? 'text/' + tone : 'text/secondary', 300, { name: 'Strip message' });
return r;
}
async function rollPill(v, win, newest) { const p = AL('HORIZONTAL', { name: 'Roll ' + v, gap: 4, p: [4, 8, 4, 6], r: 9999, align: 'CENTER', fill: win ? 'brand/tint' : 'surface/raised', stroke: newest ? 'border/focus' : (win ? 'border/brand' : 'border/default'), sw: newest ? 2 : 1 }); add(p, await IC(win ? 'check' : 'x', 12, win ? 'icon/brand' : 'status/danger'), await T(v, 'Label/S', win ? 'text/brand' : 'text/secondary')); return p; }
async function mLast(seq) { const g = AL('VERTICAL', { name: 'Last rolls', gap: 8 }); const hr = AL('HORIZONTAL', { name: 'Last rolls head', gap: 6, align: 'CENTER' }); add(hr, await T('Your last rolls', 'Label/M', 'text/secondary')); add(hr, await DEMO('XS')); addSpacer(hr); add(hr, await T('Each roll is independent', 'Caption', 'text/tertiary')); add(g, [hr, 'FILL']); const row = AL('HORIZONTAL', { name: 'Pills', gap: 6, wrap: true, cgap: 6 }); for (let i = 0; i < seq.length; i++) add(row, await rollPill(seq[i][0], !!seq[i][1], i === 0)); add(g, [row, 'FILL']); return g; }
async function mOdds(st) { const o = AL('HORIZONTAL', { name: 'Odds tiles', gap: 8 }); const err = st.odds === 'Out of range'; for (const [l, v, c] of [['WIN CHANCE', st.chance + '%', err ? 'text/danger' : 'text/primary'], ['MULTIPLIER', st.mult + '×', 'text/primary'], ['PAYOUT', st.receive, st.receive === '—' ? 'text/tertiary' : 'text/success']]) { const t = AL('VERTICAL', { name: 'Tile — ' + l, gap: 4, p: 12, r: 10, fill: 'bg/secondary', stroke: err && l === 'WIN CHANCE' ? 'border/danger' : (st.tFocus ? 'border/focus' : 'border/subtle') }); add(t, await T(l, 'Overline', 'text/tertiary'), await T(v, 'Number/S', c, { name: 'Value' })); add(o, [t, 'FILL']); } return o; }
async function mLegend(mode, t) { const z = zones(mode, t); const L = AL('VERTICAL', { name: 'Zone legend', gap: 6 }); for (const [k, r] of [['win', z.win], ['lose', z.lose]]) add(L, await statusChip(k === 'win', (k === 'win' ? 'Win · ' : 'Lose · ') + fmt2(r[0]) + ' – ' + fmt2(r[1]))); return L; }
async function mResult(st) { const win = st.result.v === 'Win'; const c = AL('HORIZONTAL', { name: 'Result card', gap: 12, p: 14, r: 14, align: 'CENTER', fill: win ? 'brand/tint-subtle' : 'status/danger-tint', stroke: win ? 'border/brand' : 'border/danger' }); add(c, await IC(win ? 'check-circle' : 'x-circle', 24, win ? 'icon/brand' : 'status/danger')); const col = AL('VERTICAL', { name: 'Result text', gap: 2 }); add(c, col); grow(col); add(col, await T(st.result.head, 'Body/M Strong', 'text/primary', { name: 'Headline' })); await wrapT(col, st.result.detail, 'Caption', 'text/secondary', 180, { name: 'Detail' }); const v = AL('VERTICAL', { name: 'Net', gap: 2, align: 'MAX' }); add(v, await T(st.result.net, 'Number/S', win ? 'text/success' : 'text/danger', { name: 'Net amount' }), await T('Verify', 'Label/S', 'text/brand')); add(c, v); return c; }
async function mStage(st) {
const S = AL('VERTICAL', { name: 'Stage', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
const top = AL('VERTICAL', { name: 'Roll id', gap: 4 }); add(top, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Roll label' })); const mr = AL('HORIZONTAL', { name: 'Roll meta row', gap: 6, align: 'CENTER' }); add(mr, await T(st.top.meta, 'Caption', 'text/secondary', { name: 'Roll meta' }), await DEMO('XS')); add(top, mr); add(S, [top, 'FILL']);
if (st.loading) { add(S, await skel(220, 56, 'Skeleton — value', 14), await skel(306, 12, 'Skeleton — track', 9999)); const od = await skel(300, 64, 'Skeleton — odds', 10); add(S, od); od.layoutSizingHorizontal = 'FILL'; return S; }
const R = AL('VERTICAL', { name: 'Readout', gap: 6, align: 'CENTER' }); add(R, await T(st.read.over, 'Overline', 'text/tertiary', { name: 'Readout label' }), await T(st.read.value, 'Display/M', st.read.color || 'text/primary', { name: 'Readout value' }));
if (st.read.chip) add(R, st.read.chip === 'win' ? await statusChip(true, st.read.chipLabel) : st.read.chip === 'lose' ? await statusChip(false, st.read.chipLabel) : await chip(st.read.chipIcon || 'timer', st.read.chipLabel));
if (st.read.caption) await wrapT(R, st.read.caption, 'Caption', 'text/secondary', 300, { name: 'Readout caption', align: 'CENTER' });
add(S, [R, 'FILL']);
add(S, await slider({ w: 326, mode: st.mode, target: st.target, tStr: st.tStr, thumb: st.thumb, roll: st.roll, off: st.sliderOff }));
const lg = await mLegend(st.mode, st.target); add(S, [lg, 'FILL']);
if (st.result) add(S, [await mResult(st), 'FILL']);
add(S, [await mOdds(st), 'FILL']);
if (st.motion) await wrapT(S, st.motion, 'Caption', 'text/tertiary', 300, { name: 'Motion note', align: 'CENTER' });
return S;
}
async function mControls(st) {
const dis = !!st.panelOff;
const P = AL('VERTICAL', { name: 'Bet controls', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle' });
add(P, [await dirToggle(st.mode, dis, 44), 'FILL']);
const tState = st.tErr ? 'error' : st.tFocus ? 'focus' : dis ? 'disabled' : 'default';
const tBox = await inputBox({ name: 'Target input', value: st.tStr, style: 'Number/M', h: 56, state: tState, pr: 4, trail: [await iconBtn('minus', { type: 'Ghost', size: 'L', state: dis ? 'Disabled' : 'Default' }), await iconBtn('plus', { type: 'Ghost', size: 'L', state: dis ? 'Disabled' : 'Default' })] });
add(P, [await fieldBlock(st.mode === 'under' ? 'Roll under' : 'Roll over', [await T(st.mode === 'under' ? '0.01 – 98.00' : '2.00 – 99.99', 'Caption', 'text/tertiary')], tBox, st.tErr ? await helperRow(st.tErr, 'error') : null), 'FILL']);
const tk = await CHAIN('USDT', 20); tk.name = 'Token/USDT';
const amtBox = await inputBox({ name: 'Amount input', value: st.bet, style: 'Number/M', h: 56, state: st.amtErr ? 'error' : dis ? 'disabled' : 'default', suffix: 'USDT', lead: [tk] });
const amt = await fieldBlock('Bet amount', [await T('Available ' + st.avail, 'Caption', st.amtErr ? 'text/danger' : 'text/tertiary', { name: 'Available value' }), await DEMO('XS')], amtBox, st.amtErr ? await helperRow(st.amtErr, 'error') : null);
const quick = AL('HORIZONTAL', { name: 'Quick amounts', gap: 8 }); for (const l of ['½', '2×', 'Max']) { const b = await BTN('Secondary', l, { size: 'L', state: dis ? 'Disabled' : 'Default' }); add(quick, [b, 'FILL']); } add(amt, [quick, 'FILL']); add(P, [amt, 'FILL']);
const sum = AL('VERTICAL', { name: 'Payout summary', gap: 8, p: 12, r: 10, fill: 'bg/secondary' });
add(sum, [await kv('You receive on win', st.receive === '—' ? '—' : st.receive + ' USDT', { vname: 'Receive value', demo: true }), 'FILL'], [await kv('Fees', '0.00 USDT · edge in multiplier', { vstyle: 'Body/S', vname: 'Fee value' }), 'FILL']); add(P, [sum, 'FILL']);
await wrapT(P, 'You can lose your stake. Min 0.10 · Max 1,000.00 USDT per roll. Each roll is independent.', 'Caption', 'text/secondary', 300, { name: 'Risk text' });
if (st.panelNotice) add(P, [await callout(st.panelNotice), 'FILL']);
return P;
}
async function mCompliance() { const c = AL('HORIZONTAL', { name: 'Compliance strip', gap: 8, p: 12, r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: true, cgap: 8 }); add(c, await I('6:158', { Variant: 'Compact' })); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); return c; }
async function buildM(name, st0) {
const st = Object.assign({}, M_BASE, st0);
const S = await mShell(name, { balance: st.balance, region: st.region });
add(S.C, [await mHeader(), 'FILL']);
add(S.C, [await mRG(st.rgm || {}), 'FILL']);
const stg = await mStage(st); add(S.C, [stg, 'FILL']);
add(S.C, [await mControls(st), 'FILL']);
add(S.C, [await mLast(st.last), 'FILL']);
add(S.C, [await mCompliance(), 'FILL']);
await mFoot(S.f, st);
if (st.block) blockStage(stg, await prompt(Object.assign({ w: 326 }, st.block)), st.blockY || 56);
return { f: S.f, stg, C: S.C, notes: { balance: S.balOk } };
}
async function mSheet(f, title, build) {
f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844);
const db = f.children[0]; const y0 = db ? db.height : 0;
const sc = figma.createFrame(); sc.name = 'Scrim'; f.appendChild(sc); sc.layoutPositioning = 'ABSOLUTE'; sc.resize(390, 844 - y0); sc.x = 0; sc.y = y0; fill(sc, 'scrim/overlay');
const sh = AL('VERTICAL', { name: 'Sheet — ' + title, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: 390, align: 'CENTER' }); topRadius(sh, 28); await fx(sh, 'Elevation/4 — Modal');
add(sh, rect(40, 4, 'border/strong', 9999, 'Grabber'));
const hd = AL('HORIZONTAL', { name: 'Sheet head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H4', 'text/primary', { name: 'Sheet title' })); addSpacer(hd); add(sh, [hd, 'FILL']);
await build(sh);
const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(sh, [hi, 'FILL']); add(hi, rect(134, 5, 'text/primary', 9999, 'Home bar'));
f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
return sh;
}
// ===== END DICE KIT =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Dice', 196000, 0);
const OUT = { section: sec.id, frames: {} };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
const LAST = [['61.08', 1], ['18.77', 0], ['44.02', 0], ['9.15', 1], ['70.44', 1], ['52.86', 0]];
{ const shots = [];
shots.push((await mk('[DI-04] Result / 390 / Win — rolled 73.21 (+10.00 USDT)', 1650, async () => buildM('n', { balance: '9,225.30', avail: '9,225.30', roll: { v: '73.21', state: 'win' }, rgm: { timer: '00:42:21', net: '−14.60 USDT', lim: '14.60 / 200.00 USDT', pct: 0.07 },
top: { label: 'SETTLED · D-88213', meta: 'Nonce 417 · 18:42:07 UTC · next nonce 418' },
read: { over: 'RESULT', value: '73.21', color: 'text/success', chip: 'win', chipLabel: 'Win · inside 50.50 – 99.99' },
result: { v: 'Win', head: 'You won 20.00 USDT', detail: 'Rolled 73.21 · over 50.50 · 2.0000× · D-88213', net: '+10.00' }, last: [['73.21', 1]].concat(LAST.slice(0, 5)), cta: { label: 'Roll again · 10.00 USDT' } }))).f);
shots.push((await mk('[DI-04] Result / 390 / Lose — rolled 31.07 (−10.00 USDT)', 1650, async () => buildM('n', { roll: { v: '31.07', state: 'lose' }, rgm: { timer: '00:42:47' },
top: { label: 'SETTLED · D-88214', meta: 'Nonce 418 · 18:42:33 UTC · next nonce 419' },
read: { over: 'RESULT', value: '31.07', color: 'text/danger', chip: 'lose', chipLabel: 'Lose · below your 50.50 target' },
result: { v: 'Lose', head: 'No win this roll', detail: 'Rolled 31.07 · needed 50.50 or higher · D-88214', net: '−10.00' }, last: [['31.07', 0], ['73.21', 1]].concat(LAST.slice(0, 4)), cta: { label: 'Roll again · 10.00 USDT' }, ctaNote: 'The next roll is still 49.50% — a loss doesn’t make a win due' }))).f);
shots.push((await mk('[GM-01] Reality check / 390 / Bottom sheet over Pool Dice — 60 minutes', 3690, async () => { const R = await buildM('n', { rgm: { timer: '01:00:00' } });
await mSheet(R.f, 'Time check — 60 minutes', async (sh) => {
await wrapT(sh, 'You’ve been playing for 60 minutes. Here’s your session so far.', 'Body/M', 'text/secondary', 358, { name: 'Sheet body' });
const st = AL('HORIZONTAL', { name: 'Session stats', gap: 8 }); for (const [l, v, c] of [['SESSION TIME', '01:00:00', 'text/primary'], ['NET RESULT', '−24.60 USDT', 'text/danger']]) { const t = AL('VERTICAL', { name: 'Stat — ' + l, gap: 4, p: 12, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label', gap: 6, align: 'CENTER' }); add(lr, await T(l, 'Overline', 'text/tertiary'), await DEMO('XS')); add(t, lr, await T(v, 'Number/S', c)); add(st, [t, 'FILL']); } add(sh, [st, 'FILL']);
for (const [l, ic] of [['Continue playing', 'play'], ['View history', 'history'], ['Take a break', 'pause-circle']]) add(sh, [await BTN('Secondary', l, { size: 'L', lead: ic }), 'FILL']);
await wrapT(sh, 'Next reminder at 19:00 UTC. Change the interval in Responsible gaming. It only appears between rolls.', 'Caption', 'text/tertiary', 358, { name: 'Sheet note', align: 'CENTER' }); });
return R; })).f);
shots.push((await mk('[GM-01] Session strip / 390 / Approaching daily loss limit — session sheet (DEMO scenario)', 3690, async () => { const R = await buildM('n', { rgm: { warn: true, net: '−172.40 USDT', lim: '172.40 / 200.00 USDT', pct: 0.86, msg: 'Approaching your daily loss limit · 27.60 USDT left today' } });
await mSheet(R.f, 'This session', async (sh) => {
for (const [l, v, c] of [['Started', '27 Nov 2026, 18:00 UTC'], ['Time played', '00:42:18'], ['Net result', '−172.40 USDT', 'text/danger'], ['Daily loss limit used', '172.40 / 200.00 USDT', 'text/warning']]) add(sh, [await kv(l, v, { vstyle: 'Body/S Strong', color: c, demo: true }), 'FILL']);
const tr = AL('HORIZONTAL', { name: 'Meter', h: 6, r: 9999, fill: 'border/default', clip: true }); add(sh, [tr, 'FILL']); add(tr, rect(308, 6, 'status/warning', 0, 'Meter fill 86%'));
await wrapT(sh, '27.60 USDT left today · play pauses at 200.00 · resets 28 Nov 2026, 00:00 UTC', 'Caption', 'text/tertiary', 358, { name: 'Limit note' });
add(sh, [await callout({ tone: 'warning', icon: 'alert-triangle', title: 'You’re close to your daily loss limit', body: 'Lowering a limit applies straight away; raising it waits 24 h.' }), 'FILL']);
add(sh, [await BTN('Secondary', 'Take a break', { size: 'L', lead: 'pause-circle' }), 'FILL'], [await BTN('Ghost', 'Set limits', { size: 'L', lead: 'sliders' }), 'FILL']); });
return R; })).f);
for (const f of shots) await f.screenshot({ scale: 0.5 }); }
return OUT;
