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
async function fieldBlock(label, right, box, helper) { const g = AL('VERTICAL', { name: 'Field — ' + label, gap: 8 }); const lr = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Label/M', 'text/secondary', { name: 'Field label' })); addSpacer(lr); for (const n of (right || [])) add(lr, n); add(g, [lr, 'FILL']); add(g, [box, 'FILL']); if (helper) add(g, [helper, 'FILL']); return g; }
async function statTile(label, value, sub, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Overline', 'text/tertiary')); addSpacer(lr); add(lr, await DEMO('XS')); add(t, [lr, 'FILL']); const vr = AL('HORIZONTAL', { name: 'Stat value row', gap: 8, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 20, o.iconColor || 'icon/muted')); add(vr, await T(value, o.style || 'Number/L', o.color || 'text/primary', { name: 'Stat value' })); add(t, vr); await wrapT(t, sub, 'Caption', 'text/secondary', 200, { name: 'Stat sub' }); return t; }
async function filterChip(label, sel) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Filter — ' + label; return c; }
const MY_ROLLS = [['D-88214', '18:42:33', '10.00', 'Over 50.50', '49.50%', '2.0000×', '31.07', false, '−10.00'], ['D-88213', '18:42:07', '10.00', 'Over 50.50', '49.50%', '2.0000×', '73.21', true, '+10.00'], ['D-88212', '18:41:12', '10.00', 'Over 50.50', '49.50%', '2.0000×', '61.08', true, '+10.00'], ['D-88211', '18:40:48', '10.00', 'Over 50.50', '49.50%', '2.0000×', '18.77', false, '−10.00'], ['D-88210', '18:40:21', '10.00', 'Under 25.00', '25.00%', '3.9600×', '44.02', false, '−10.00'], ['D-88209', '18:39:57', '10.00', 'Under 25.00', '25.00%', '3.9600×', '9.15', true, '+29.60'], ['D-88208', '18:39:30', '10.00', 'Over 66.00', '34.00%', '2.9118×', '70.44', true, '+19.11'], ['D-88207', '18:39:02', '10.00', 'Over 66.00', '34.00%', '2.9118×', '52.86', false, '−10.00'], ['D-88206', '18:38:41', '10.00', 'Over 50.50', '49.50%', '2.0000×', '50.12', false, '−10.00'], ['D-88205', '18:38:15', '10.00', 'Over 50.50', '49.50%', '2.0000×', '96.30', true, '+10.00']];
async function stepCard(title, steps) {
const c = AL('VERTICAL', { name: title, gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await DEMO('S')); add(c, [hd, 'FILL']);
for (let i = 0; i < steps.length; i++) { const [t, b, mono, state] = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const n = AL('HORIZONTAL', { name: 'Step number', w: 28, h: 28, r: 9999, align: 'CENTER', justify: 'CENTER', fill: state === 'bad' ? 'status/danger-tint' : 'brand/tint', stroke: state === 'bad' ? 'border/danger' : 'border/brand' }); add(n, await T(String(i + 1), 'Label/S', state === 'bad' ? 'text/danger' : 'text/brand')); add(r, n); const col = AL('VERTICAL', { name: 'Step text', gap: 4 }); add(r, col); grow(col); const tr = AL('HORIZONTAL', { name: 'Step title row', gap: 6, align: 'CENTER' }); add(tr, await T(t, 'Body/S Strong', 'text/primary')); add(tr, await IC(state === 'bad' ? 'x-circle' : 'check-circle', 16, state === 'bad' ? 'status/danger' : 'icon/brand')); add(col, tr); await wrapT(col, b, 'Body/S', 'text/secondary', 400, { name: 'Step body' }); if (mono) { const m = AL('HORIZONTAL', { name: 'Mono chip', p: [6, 10, 6, 10], r: 6, fill: 'bg/secondary', stroke: 'border/subtle' }); add(m, await T(mono, 'Mono/S', 'text/primary', { name: 'Mono value' })); add(col, m); } add(c, [r, 'FILL']); }
return c;
}
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
async function mBack(label, title, demo) { const g = AL('VERTICAL', { name: 'Page title', gap: 8 }); const b = await BTN('Ghost', label, { size: 'S', lead: 'chevron-left' }); add(g, b); const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H3', 'text/primary', { name: 'Page title text' })); if (demo) add(tr, await DEMO('M')); add(g, tr); return g; }
async function mTabs(active) { const r = AL('HORIZONTAL', { name: 'Game tabs (scroll)', gap: 8, clip: true }); for (const l of ['Play', 'My rolls', 'Fairness', 'Rules & payouts']) add(r, await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l })); return r; }
async function mCompliance() { const c = AL('HORIZONTAL', { name: 'Compliance strip', gap: 8, p: 12, r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: true, cgap: 8 }); add(c, await I('6:158', { Variant: 'Compact' })); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); return c; }
// ===== END DICE KIT =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Dice', 196000, 0);
const OUT = { section: sec.id, frames: {} };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
const LAST = [['61.08', 1], ['18.77', 0], ['44.02', 0], ['9.15', 1], ['70.44', 1], ['52.86', 0]];
async function mRollCard(r) { const [id, time, bet, tgt, ch, mult, roll, win, prof] = r;
const c = AL('HORIZONTAL', { name: 'Roll card — ' + id, gap: 12, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 40, h: 40, r: 10, align: 'CENTER', justify: 'CENTER', fill: win ? 'brand/tint' : 'status/danger-tint' }); add(tile, await IC(win ? 'check' : 'x', 20, win ? 'icon/brand' : 'status/danger')); add(c, tile);
const col = AL('VERTICAL', { name: 'Roll text', gap: 2 }); add(c, col); grow(col); const r1 = AL('HORIZONTAL', { name: 'Roll id row', gap: 6, align: 'CENTER' }); add(r1, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); add(col, r1); await wrapT(col, tgt + ' · ' + mult + ' · ' + time + ' UTC', 'Caption', 'text/secondary', 150, { name: 'Roll sub' });
const v = AL('VERTICAL', { name: 'Values', gap: 2, align: 'MAX' }); add(v, await T(roll + (win ? ' · Win' : ' · Lose'), 'Label/M', win ? 'text/brand' : 'text/danger'), await T(prof, 'Number/S', win ? 'text/success' : 'text/danger')); add(c, v); add(c, await IC('chevron-right', 16, 'icon/muted')); return c; }
{ const shots = [];
shots.push((await mk('[DI-05] History / 390 / My rolls — today', 2160, async () => { const S = await mShell('n', {}); const C = S.C;
add(C, [await mBack('Pool Dice', 'My rolls', true), 'FILL'], [await mTabs('My rolls'), 'FILL']);
for (const pair of [[['ROLLS TODAY', '36', '17 wins · 19 losses'], ['NET RESULT', '−24.60', 'USDT · today (UTC)', 'text/danger']], [['WAGERED', '360.00', 'USDT · avg 10.00'], ['PAID OUT', '335.40', 'USDT returned']]]) { const row = AL('HORIZONTAL', { name: 'KPI row', gap: 8 }); for (const [l, v, s, c] of pair) add(row, [await statTile(l, v, s, { style: 'Number/M', color: c }), 'FILL']); add(C, [row, 'FILL']); }
const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, wrap: true, cgap: 8 }); for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false], ['All', true], ['Wins', false], ['Losses', false]]) add(fr, await filterChip(l, s)); add(C, [fr, 'FILL']);
add(C, await T('TODAY · 27 NOV 2026 · NEWEST FIRST', 'Overline', 'text/tertiary'));
for (const r of MY_ROLLS.slice(0, 7)) add(C, [await mRollCard(r), 'FILL']);
add(C, [await BTN('Secondary', 'Load 10 more · 7 of 36 shown', { size: 'L', lead: 'refresh' }), 'FILL']);
await wrapT(C, 'Each roll is independent — 0.00 to 99.99 are equally likely every time. Tap a roll to see its seeds and verify it.', 'Caption', 'text/tertiary', 358);
add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, { cta: { label: 'Back to game', lead: 'dice' }, ctaNote: false });
return { f: S.f, notes: {} }; })).f);
shots.push((await mk('[DI-06] Provably-fair verification / 390 / Roll D-88213 verified', 2670, async () => { const S = await mShell('n', {}); const C = S.C;
add(C, [await mBack('Pool Dice', 'Verify a roll', true), 'FILL'], [await mTabs('Fairness'), 'FILL']);
add(C, [await callout({ tone: 'success', icon: 'check-circle', title: 'Roll D-88213 verified', body: 'Recomputed from the revealed seeds: 73.21 — the same as the recorded result. Nothing here can change a result.' }), 'FILL']);
for (const [l, v] of [['Roll ID', 'D-88213'], ['Server seed (revealed)', 'c71d0a58…5c27b14'], ['Committed hash (SHA-256)', '8f3c1e…e813'], ['Client seed', 'nova-k-7f2a91'], ['Nonce', '417']]) add(C, [await fieldBlock(l, [await DEMO('XS')], await inputBox({ name: l, value: v, style: 'Mono/S', h: 48, pr: 4, trail: [await iconBtn('copy', { type: 'Ghost', size: 'L' })] })), 'FILL']);
add(C, await statusChip(true, 'Revealed seed hashes to the committed value'));
const res = AL('VERTICAL', { name: 'Result compare', gap: 8, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); for (const [l, v] of [['Recomputed roll', '73.21'], ['Recorded roll', '73.21'], ['Outcome', 'Win · over 50.50 · 2.0000×']]) add(res, [await kv(l, v, { vstyle: 'Body/S Strong', demo: true }), 'FILL']); add(C, [res, 'FILL']);
add(C, [await stepCard('How it was computed', [['Commitment', 'The server seed hash was shown before you bet.', '8f3c1e…e813'], ['Inputs', 'Your client seed and nonce 417 — the 417th roll with this seed pair.', 'nova-k-7f2a91 · 417'], ['Roll', 'HMAC-SHA256 keyed with the server seed maps to 0.00 – 99.99: 73.21.', '73.21 ≥ 50.50 → Win']]), 'FILL']);
add(C, [await BTN('Ghost', 'Report a problem with this roll', { size: 'L', lead: 'flag' }), 'FILL']);
add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, { cta: { label: 'Verify another roll', lead: 'shield-check', type: 'Secondary' }, ctaNote: false });
return { f: S.f, notes: {} }; })).f);
for (const f of shots) await f.screenshot({ scale: 0.5 }); }
return OUT;
