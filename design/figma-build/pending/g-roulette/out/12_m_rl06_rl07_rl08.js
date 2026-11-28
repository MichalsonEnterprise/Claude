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
// ===== ROULETTE KIT (subset, agent g-roulette) =====
async function setText(root, name, value, nth = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = ts[nth]; if (!t) return false; for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(value); return true; }
async function repl(root, map, sub = false) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; let nc = c; for (const [k, v] of Object.entries(map)) { if (sub) { if (nc.includes(k)) nc = nc.split(k).join(v); } else if (nc === k) nc = v; } if (nc !== c) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = nc; n++; } } return n; }
function grow(n) { n.layoutGrow = 1; return n; }
function ALV(o) { const f = AL('VERTICAL', o); if (o.w && !o.h) f.primaryAxisSizingMode = 'AUTO'; return f; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
function addSpacer(row) { const s = spacer(); add(row, s); s.layoutGrow = 1; return s; }
async function wrapT(parent, text, style, color, w, o = {}) { const t = await T(text, style, color, Object.assign({ w }, o)); add(parent, t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, o.style || 'Label/S', o.color || 'text/secondary', { name: o.name || label })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function iconBtn(icon, o = {}) { const b = await I('7:774', { Type: o.type || 'Secondary', Size: o.size || 'M', State: o.state || 'Default' }, { Icon: ICONS[icon] }); b.name = 'Button/Icon — ' + (o.label || icon); return b; }
async function callout(o) { const tone = o.tone || 'info'; const c = AL('HORIZONTAL', { name: 'Callout — ' + o.title, gap: 12, p: 16, r: 14, fill: 'status/' + tone + '-tint', stroke: 'status/' + tone }); add(c, await IC(o.icon || 'info', 20, 'status/' + tone)); const col = AL('VERTICAL', { name: 'Callout text', gap: 4 }); add(c, col); grow(col); await wrapT(col, o.title, 'Body/S Strong', 'text/primary', 240, { name: 'Callout title' }); if (o.body) await wrapT(col, o.body, 'Body/S', 'text/secondary', 240, { name: 'Callout body' }); if (o.actions && o.actions.length) { const a = AL('HORIZONTAL', { name: 'Callout actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(col, a); a.layoutSizingHorizontal = 'FILL'; } return c; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', o.lcolor || 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function card(name, o = {}) { const c = ALV({ name, gap: o.gap != null ? o.gap : 16, p: o.p != null ? o.p : 20, r: 14, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', w: o.w }); if (o.title) { const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); if (o.icon) add(hd, await IC(o.icon, 20, o.iconColor || 'icon/brand')); add(hd, await T(o.title, o.tstyle || 'Heading/H5', 'text/primary', { name: 'Card title' })); addSpacer(hd); if (o.demo) add(hd, await DEMO(o.demo === true ? 'S' : o.demo)); if (o.right) for (const x of o.right) add(hd, x); add(c, [hd, 'FILL']); } return c; }
function colY(sec, x) { let m = 0; for (const c of sec.children) if (Math.abs(c.x - x) < 2) m = Math.max(m, c.y + c.height); return m ? m + 160 : 120; }
function dropByName(sec, name) { for (const c of sec.children.filter(n => n.name === name)) c.remove(); }
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
function colorOf(n) { return n === 0 ? 'Green' : REDS.includes(n) ? 'Red' : 'Black'; }
async function chipI(value, size = 28, state = 'Default') { const c = await I('23:12227', { Value: String(value), State: state }); if (size !== 64) c.rescale(size / 64); c.name = 'Game/Chip — ' + value; return c; }
async function discNum(n, size = 28, o = {}) { const col = colorOf(n); const d = AL('HORIZONTAL', { name: 'Pocket ' + n, w: size, h: size, r: 9999, align: 'CENTER', justify: 'CENTER', fill: col === 'Red' ? 'status/danger-strong' : col === 'Green' ? 'status/success' : 'ink/950', stroke: o.newest ? 'border/focus' : 'border/strong', sw: o.newest ? 2 : 1 }); add(d, await T(String(n), size >= 48 ? 'Heading/H3' : size >= 32 ? 'Label/M' : 'Label/S', col === 'Green' ? 'text/on-primary' : 'text/primary', { name: 'Pocket number' })); return d; }
async function statTile(label, value, sub, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Overline', 'text/tertiary')); addSpacer(lr); add(lr, await DEMO('XS')); add(t, [lr, 'FILL']); const vr = AL('HORIZONTAL', { name: 'Stat value row', gap: 8, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 20, o.iconColor || 'icon/muted')); add(vr, await T(value, o.style || 'Number/L', o.color || 'text/primary', { name: 'Stat value' })); add(t, vr); await wrapT(t, sub, 'Caption', 'text/secondary', 200, { name: 'Stat sub' }); return t; }
const MY_SPINS = [['RL-88191', '18:46:12', 'Straight 19 · Red · 2nd dozen', '20.00', 19, '215.00', '+195.00'], ['RL-88190', '18:45:31', 'Straight 19 · Red · 2nd dozen', '20.00', 26, '0.00', '−20.00'], ['RL-88189', '18:44:58', 'Straight 19 · Red · 2nd dozen', '20.00', 14, '35.00', '+15.00'], ['RL-88188', '18:44:20', 'Straight 19 · Red · 2nd dozen', '20.00', 0, '0.00', '−20.00'], ['RL-88187', '18:43:47', 'Red · 2nd dozen', '15.00', 32, '20.00', '+5.00'], ['RL-88186', '18:43:09', 'Red · 2nd dozen', '15.00', 17, '15.00', '±0.00'], ['RL-88185', '18:42:36', 'Split 17 | 20 · Corner 22–26', '3.00', 8, '0.00', '−3.00'], ['RL-88184', '18:41:58', 'Split 17 | 20 · Corner 22–26', '3.00', 23, '18.00', '+15.00'], ['RL-88183', '18:41:20', 'Black', '10.00', 11, '20.00', '+10.00'], ['RL-88182', '18:40:44', 'Black', '10.00', 5, '0.00', '−10.00']];
async function stepCard(title, steps) {
const c = AL('VERTICAL', { name: title, gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await DEMO('S')); add(c, [hd, 'FILL']);
for (let i = 0; i < steps.length; i++) { const [t, b, mono, state] = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const n = AL('HORIZONTAL', { name: 'Step number', w: 28, h: 28, r: 9999, align: 'CENTER', justify: 'CENTER', fill: state === 'bad' ? 'status/danger-tint' : 'brand/tint', stroke: state === 'bad' ? 'border/danger' : 'border/brand' }); add(n, await T(String(i + 1), 'Label/S', state === 'bad' ? 'text/danger' : 'text/brand')); add(r, n); const col = AL('VERTICAL', { name: 'Step text', gap: 4 }); add(r, col); grow(col); const tr = AL('HORIZONTAL', { name: 'Step title row', gap: 6, align: 'CENTER' }); add(tr, await T(t, 'Body/S Strong', 'text/primary')); add(tr, await IC(state === 'bad' ? 'x-circle' : 'check-circle', 16, state === 'bad' ? 'status/danger' : 'icon/brand')); add(col, tr); await wrapT(col, b, 'Body/S', 'text/secondary', 400, { name: 'Step body' }); if (mono) { const m = AL('HORIZONTAL', { name: 'Mono chip', p: [6, 10, 6, 10], r: 6, fill: 'bg/secondary', stroke: 'border/subtle' }); add(m, await T(mono, 'Mono/S', 'text/primary', { name: 'Mono value' })); add(col, m); } add(c, [r, 'FILL']); }
return c;
}
const INSIDE_ROWS = [['Straight', 'Tap one number (0 included)', '1', '35:1', '2.70%'], ['Split', 'Tap the line between two numbers', '2', '17:1', '5.41%'], ['Street', 'Tap the outer edge of a row of three', '3', '11:1', '8.11%'], ['Corner', 'Tap where four numbers meet', '4', '8:1', '10.81%'], ['First four', '0 · 1 · 2 · 3 — tap the corner of 0 and 1', '4', '8:1', '10.81%'], ['Line', 'Two streets — tap the edge between them', '6', '5:1', '16.22%']];
const OUTSIDE_ROWS = [['Column', 'A full column of 12 — the 2:1 boxes', '12', '2:1', '32.43%'], ['Dozen', '1–12 · 13–24 · 25–36', '12', '2:1', '32.43%'], ['Red / Black', '18 numbers each', '18', '1:1', '48.65%'], ['Odd / Even', '18 numbers each (0 is neither)', '18', '1:1', '48.65%'], ['1–18 / 19–36', 'Low or high half', '18', '1:1', '48.65%']];
async function mShell(name, o = {}) {
const f = await screen(name, 390, { x: 0, y: 0 }); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance }, true)) > 0; }
const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
return { f, tb, C, balOk };
}
async function mBack(label, title) { const g = AL('VERTICAL', { name: 'Page title', gap: 8 }); add(g, await BTN('Ghost', label, { size: 'S', lead: 'chevron-left' })); const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H3', 'text/primary', { name: 'Page title text' }), await DEMO('M')); add(g, tr); return g; }
async function mTabs(active) { const r = AL('HORIZONTAL', { name: 'Game tabs (scroll)', gap: 8, clip: true }); for (const l of ['Play', 'My bets', 'Fairness', 'Rules']) add(r, await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l })); return r; }
async function mBar(f, st) {
const b = st.bar || {};
if (b.hide !== true) {
const s = AL('VERTICAL', { name: 'Sticky chip tray + Spin', gap: 10, p: [12, 12, 12, 12], fill: 'bg/secondary' }); strokeSides(s, 'border/subtle', { t: 1 });
const sr = AL('HORIZONTAL', { name: 'Slip summary', gap: 8, align: 'CENTER' }); add(sr, await IC('layers', 16, 'icon/muted')); const sc = AL('VERTICAL', { name: 'Slip summary text', gap: 0 }); add(sc, await T(b.summary || '3 bets · 20.00 USDT', 'Body/S Strong', 'text/primary', { name: 'Slip total' }), await T(b.sub || 'Max payout 215.00 USDT · edge 2.70%', 'Caption', 'text/tertiary', { name: 'Slip sub' })); add(sr, sc); add(sr, await DEMO('XS')); addSpacer(sr); add(sr, await BTN('Ghost', 'Bet slip', { size: 'S', trail: 'chevron-up' })); add(s, [sr, 'FILL']);
if (!b.noChips) { const cr = AL('HORIZONTAL', { name: 'Chips', gap: 4, align: 'CENTER' }); for (const v of ['0.10', '1', '5', '10', '25', '100', '500']) add(cr, await chipI(v, 44, b.off ? 'Disabled' : (v === (b.sel || '5') ? 'Selected' : 'Default'))); add(s, cr); }
const ar = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' });
if (!b.noTools) for (const [ic, l] of [['undo', 'Undo'], ['trash', 'Clear'], ['refresh', 'Repeat']]) add(ar, await iconBtn(ic, { type: 'Secondary', size: 'L', label: l, state: b.off || (b.toolsOff && b.toolsOff.includes(l)) ? 'Disabled' : 'Default' }));
const cta = await BTN(b.type || 'Primary', b.cta || 'Spin · 20.00 USDT', { size: 'L', lead: b.lead || 'roulette', state: b.state || 'Default' }); cta.name = 'CTA'; add(ar, [cta, 'FILL']);
if (b.cta2) { const c2 = await BTN('Secondary', b.cta2, { size: 'L', lead: b.lead2 }); c2.name = 'CTA secondary'; add(s, [ar, 'FILL']); add(s, [c2, 'FILL']); } else add(s, [ar, 'FILL']);
await wrapT(s, b.note || 'You can lose your stake · each spin is independent · 18+', 'Caption', 'text/tertiary', 300, { name: 'Risk note', align: 'CENTER' });
add(f, [s, 'FILL']);
}
if (!st.noTab) { const tab = await I('22:5413', { Active: st.tab || 'Games' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']); }
}
async function mCompliance() { const c = AL('HORIZONTAL', { name: 'Compliance strip', gap: 8, p: 12, r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: true, cgap: 8 }); add(c, await I('6:158', { Variant: 'Compact' })); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); return c; }
// ===== END ROULETTE KIT =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Roulette', 182000, 0);
const OUT = { section: sec.id, frames: {}, before: sec.children.map(n => n.name.slice(0, 60) + ' #' + n.id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' @' + Math.round(n.x) + ',' + Math.round(n.y)) };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
function has(name) { return sec.children.some(n => n.name === name && n.height > 600); }
async function mPage(name, back, tab) { const S = await mShell(name, {}); add(S.C, [await mBack('Pool Roulette', back), 'FILL']); add(S.C, [await mTabs(tab), 'FILL']); return S; }
async function mFoot(f, summary, sub) { await mBar(f, { bar: { noChips: true, noTools: true, summary, sub, cta: 'Back to table', lead: 'roulette' } }); }
async function mPay(title, rows, foot) { const c = await card(title, { title, icon: 'book', p: 16, gap: 8 }); for (const [lab, how, cov, pays, chance] of rows) { const r = AL('HORIZONTAL', { name: 'Pay — ' + lab, gap: 8, align: 'CENTER' }); const a = AL('VERTICAL', { name: 'Bet text', gap: 2 }); add(r, a); grow(a); add(a, await T(lab, 'Body/S Strong', 'text/primary')); await wrapT(a, how, 'Caption', 'text/tertiary', 180); const b = AL('VERTICAL', { name: 'Pays', gap: 2, align: 'MAX' }); add(b, await T(pays, 'Number/S', 'text/primary'), await T(cov + ' · ' + chance, 'Caption', 'text/tertiary')); add(r, b); add(c, [r, 'FILL']); } if (foot) await wrapT(c, foot, 'Caption', 'text/tertiary', 300); return c; }
const MH = '[RL-06] Bet history / 390 / My spins — today';
if (!has(MH)) { const R = await mk(MH, 2670, async () => { const S = await mPage('n', 'My bets', 'My bets'); const C = S.C;
const g = AL('VERTICAL', { name: 'KPIs', gap: 8 }); add(C, [g, 'FILL']);
for (const pr of [[['SPINS TODAY', '10', '5 won · 4 lost · 1 even'], ['STAKED', '136.00', 'USDT · Pool Roulette']], [['RETURNED', '323.00', 'USDT'], ['NET', '+187.00', 'USDT · today (UTC)']]]) { const r = AL('HORIZONTAL', { name: 'KPI row', gap: 8 }); for (const [l, v, s] of pr) add(r, [await statTile(l, v, s, { style: 'Number/M', color: v.charAt(0) === '+' ? 'text/success' : 'text/primary' }), 'FILL']); add(g, [r, 'FILL']); }
const fr = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false], ['Won', false], ['Lost', false]]) add(fr, await I('20:6895', { State: s ? 'Active' : 'Default' }, { Label: l })); add(C, [fr, 'FILL']);
for (const r0 of MY_SPINS.slice(0, 6)) { const [id, time, bets, stake, pk, ret, net] = r0; const win = net.charAt(0) === '+'; const flat = net.charAt(0) === '±';
const c = AL('VERTICAL', { name: 'Spin card — ' + id, gap: 10, p: 14, r: 14, fill: 'surface/default', stroke: id === 'RL-88191' ? 'border/brand' : 'border/subtle' });
const r1 = AL('HORIZONTAL', { name: 'Card top', gap: 6, align: 'CENTER' }); add(r1, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); addSpacer(r1); add(r1, await T(time + ' UTC', 'Caption', 'text/tertiary')); add(c, [r1, 'FILL']);
const r2 = AL('HORIZONTAL', { name: 'Card main', gap: 12, align: 'CENTER' }); add(r2, await discNum(pk, 40)); const mc = AL('VERTICAL', { name: 'Bets', gap: 2 }); add(r2, mc); grow(mc); await wrapT(mc, bets, 'Body/S Strong', 'text/primary', 180); add(mc, await T('Stake ' + stake + ' · returned ' + ret, 'Caption', 'text/tertiary')); add(r2, await T(net, 'Number/S', win ? 'text/success' : flat ? 'text/secondary' : 'text/danger')); add(c, [r2, 'FILL']);
const r3 = AL('HORIZONTAL', { name: 'Card actions', gap: 8, align: 'CENTER' }); add(r3, await T(colorOf(pk) + (pk ? (pk % 2 ? ' · odd' : ' · even') : ' · zero'), 'Caption', 'text/secondary')); addSpacer(r3); add(r3, await BTN('Ghost', 'Verify', { size: 'S', lead: 'shield-check' })); add(c, [r3, 'FILL']);
add(C, [c, 'FILL']); }
add(C, [await BTN('Secondary', 'Show 4 more spins', { size: 'L', lead: 'chevron-down' }), 'FILL']);
add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, '10 spins today · net +187.00 USDT', 'Pool Roulette · 27 Nov 2026 (UTC)'); return { f: S.f, notes: {} }; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.sH = MH;
const MR = '[RL-07] Rules & payouts / 390 / Default';
if (!has(MR)) { const R = await mk(MR, 3180, async () => { const S = await mPage('n', 'Rules & payouts', 'Rules'); const C = S.C;
await wrapT(C, 'European roulette, single zero. Every bet returns 97.30% on average — the house edge is 2.70% (1 in 37) on all of them.', 'Body/S', 'text/secondary', 358);
add(C, [await mPay('Inside bets', INSIDE_ROWS, 'Payouts are “to 1”: a winning 1.00 split returns 18.00.'), 'FILL']);
add(C, [await mPay('Outside bets', OUTSIDE_ROWS), 'FILL']);
add(C, [await callout({ tone: 'warning', icon: 'alert-triangle', title: 'Zero rule', body: 'If the ball lands on 0, every outside bet loses — no La Partage or En Prison. Inside bets that include 0 pay normally.' }), 'FILL']);
add(C, [await stepCard('How a spin works', [['Place bets', 'Per spot 0.10 – 1,000.00 USDT, up to 5,000.00 USDT per spin.'], ['Spin', 'Your stake is locked; the pocket comes from your seed pair and nonce.'], ['Settle', 'Winnings go straight to Available. No fee on winnings.'], ['Disconnected?', 'An accepted spin always settles — check My bets.']]), 'FILL']);
const lim = await card('Limits', { title: 'Limits', icon: 'scale', p: 16, gap: 10 }); for (const [l, v] of [['Per spot', '0.10 – 1,000.00 USDT'], ['Per spin', '5,000.00 USDT'], ['Largest single win', '35,000.00 USDT'], ['Fees on bets', '0.00 USDT']]) add(lim, [await kv(l, v, { vstyle: 'Body/S Strong' }), 'FILL']); add(C, [lim, 'FILL']);
add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, 'House edge 2.70% on every bet', 'Straight pays 35:1 · 18+'); return { f: S.f, notes: {} }; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.sR = MR;
const MP = '[RL-08] Provably-fair verification / 390 / Spin RL-88191 verified';
if (!has(MP)) { const R = await mk(MP, 3690, async () => { const S = await mPage('n', 'Verify a spin', 'Fairness'); const C = S.C;
const v = await card('Verifier', { title: 'Spin RL-88191', icon: 'shield-check', p: 16, gap: 10, right: [await chip('check-circle', 'Verified', { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' })] });
for (const [l, val] of [['Server seed (revealed)', 'c71d0a58…5c27b14'], ['SHA-256 of revealed seed', '8f3c1e…e813'], ['Committed before your bet', '8f3c1e…e813'], ['Client seed', 'nova-k-7f2a91'], ['Nonce', '417']]) add(v, [await kv(l, val, { vstyle: 'Mono/S', demo: true }), 'FILL']);
const res = AL('HORIZONTAL', { name: 'Result match', gap: 10, p: 12, r: 10, align: 'CENTER', fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(res, await IC('check-circle', 20, 'icon/brand')); await wrapT(res, 'Computed pocket 19 = recorded pocket 19 (Red). The hash matches the commitment.', 'Body/S Strong', 'text/primary', 260); add(v, [res, 'FILL']);
add(v, [await BTN('Secondary', 'Verify again', { size: 'L', lead: 'refresh' }), 'FILL']); add(C, [v, 'FILL']);
add(C, [await stepCard('How the pocket was computed', [['Commitment', 'The server-seed hash was shown before you bet.', '8f3c1e…e813'], ['Reveal', 'Rotating seeds revealed the server seed; its hash matches.', 'c71d0a58…5c27b14'], ['Recompute', 'HMAC-SHA256 → first 4 bytes → 0.528137… × 37 = 19.54 → 19.', 'floor(0.528137 × 37) = 19'], ['Settle', 'Straight 19, Red and 2nd dozen won: 215.00 USDT returned.', '5.00×36 + 10.00×2 + 5.00×3']]), 'FILL']);
await wrapT(C, 'Verifying never changes a result — it only recomputes it. Any HMAC-SHA256 tool gives the same pocket.', 'Caption', 'text/tertiary', 358);
add(C, [await mCompliance(), 'FILL']); await mFoot(S.f, 'Spin RL-88191 · verified', 'Seeds rotate whenever you choose'); return { f: S.f, notes: {} }; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.sP = MP;
return OUT;
