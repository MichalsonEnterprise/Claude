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
async function prompt(o) { const c = ALV({ name: 'Prompt — ' + o.title, gap: 16, p: 24, r: 20, fill: 'surface/overlay', stroke: 'border/subtle', w: o.w || 440 }); await fx(c, 'Elevation/4 — Modal'); const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 48, h: 48, r: 14, align: 'CENTER', justify: 'CENTER', fill: 'status/' + (o.tone || 'info') + '-tint' }); add(tile, await IC(o.icon || 'info', 24, 'status/' + (o.tone || 'info'))); add(c, tile); const iw = (o.w || 440) - 48; await wrapT(c, o.title, 'Heading/H4', 'text/primary', iw, { name: 'Prompt title' }); await wrapT(c, o.body, 'Body/S', 'text/secondary', iw, { name: 'Prompt body' }); if (o.facts) { const fl = AL('VERTICAL', { name: 'Facts', gap: 8, p: 12, r: 10, fill: 'bg/secondary' }); for (const [l, v, d] of o.facts) add(fl, [await kv(l, v, { vstyle: 'Body/S Strong', demo: d }), 'FILL']); add(c, [fl, 'FILL']); } if (o.note) await wrapT(c, o.note, 'Caption', 'text/tertiary', iw, { name: 'Prompt note' }); if (o.actions) { const a = AL('HORIZONTAL', { name: 'Prompt actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(c, [a, 'FILL']); } return c; }
function blockStage(stg, card, y = 96) { for (const k of stg.children) k.opacity = 0.25; stg.appendChild(card); card.layoutPositioning = 'ABSOLUTE'; card.x = Math.round((stg.width - card.width) / 2); card.y = y; return card; }
async function rgStrip(o = {}) {
const tone = o.danger ? 'danger' : o.warn ? 'warning' : null;
const r = AL('VERTICAL', { name: 'RG session strip', gap: 8, p: 12, r: 14, fill: tone ? 'status/' + tone + '-tint' : 'surface/default', stroke: tone ? 'status/' + tone : 'border/subtle' });
const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(r1, await IC('timer', 16, 'icon/muted'), await T(o.timer || '00:42:18', 'Mono/S', 'text/primary', { name: 'Timer' }), await T('Net', 'Caption', 'text/tertiary'), await T(o.net || '−24.60 USDT', 'Body/S Strong', 'text/primary', { name: 'Net value' }), await DEMO('XS')); addSpacer(r1); add(r1, await I('6:159')); add(r1, await iconBtn('pause-circle', { type: 'Ghost', size: o.big ? 'L' : 'M', label: 'Take a break' })); add(r, [r1, 'FILL']);
const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(r2, await T('Daily loss limit', 'Caption', 'text/tertiary'), await T(o.lim || '24.60 / 200.00 USDT', 'Caption', tone ? 'text/' + tone : 'text/secondary', { name: 'Limit value' })); addSpacer(r2);
const tr = AL('HORIZONTAL', { name: 'Meter', w: 96, h: 4, r: 9999, fill: 'border/default', clip: true }); add(tr, rect(Math.max(4, Math.round(96 * (o.pct || 0.12))), 4, tone ? 'status/' + tone : 'status/info', 0, 'Meter fill')); add(r2, tr); add(r, [r2, 'FILL']);
if (o.msg) await wrapT(r, o.msg, 'Caption', tone ? 'text/' + tone : 'text/secondary', 300, { name: 'Strip message' });
return r;
}
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
function colorOf(n) { return n === 0 ? 'Green' : REDS.includes(n) ? 'Red' : 'Black'; }
async function chipI(value, size = 28, state = 'Default') { const c = await I('23:12227', { Value: String(value), State: state }); if (size !== 64) c.rescale(size / 64); c.name = 'Game/Chip — ' + value; return c; }
async function nestedChips(inst) { const out = []; for (const n of inst.findAll(x => x.type === 'INSTANCE')) { let m = null; try { m = await n.getMainComponentAsync(); } catch (e) { } if (m && m.parent && m.parent.id === '23:12227') out.push(n); } return out; }
async function cell(n, state = 'Default', w, h, chipVal) {
const c = await I('25:16416', { Color: colorOf(n), State: state }); c.name = 'Cell ' + n;
await setText(c, 'Number', String(n));
if (w && h && (Math.abs(c.width - w) > 0.5 || Math.abs(c.height - h) > 0.5)) c.resize(w, h);
if (state === 'Bet placed' || state === 'Winning') { const chs = await nestedChips(c); for (const k of chs) { if (!chipVal) k.visible = false; else if (String(chipVal) !== '5') { try { k.setProperties({ Value: String(chipVal) }); } catch (e) { } } } }
return c;
}
async function obox(label, w, h, o = {}) {
const st = o.st || 'default';
const b = AL(o.vertical ? 'VERTICAL' : 'HORIZONTAL', { name: 'Bet — ' + label, gap: o.vertical ? 4 : 6, w, h, r: 6, align: 'CENTER', justify: 'CENTER', fill: st === 'win' ? 'brand/tint' : st === 'hover' ? 'surface/hover' : 'surface/raised', stroke: st === 'win' ? 'border/focus' : st === 'hover' ? 'border/brand' : 'border/default', sw: st === 'win' ? 2 : 1 });
if (o.dot) { const d = ellipse(12, 12, o.dot, 'Colour dot'); stroke(d, 'border/strong', 1); add(b, d); }
add(b, await T(label, o.style || 'Label/M', st === 'off' ? 'text/disabled' : st === 'win' ? 'text/brand' : 'text/primary', { name: 'Bet label' }));
if (o.chip) add(b, await chipI(o.chip, o.chipSize || 28));
if (st === 'lose') b.opacity = 0.45;
if (st === 'off') b.opacity = 0.6;
return b;
}
function oState(o, key) { return (o.ostate && o.ostate[key]) || (o.obets && o.obets[key] ? 'bet' : 'default'); }
async function felt(o = {}) {
const cw = o.cw || 56, ch = o.ch || 64, g = o.g || 4, p = o.p || 12;
const F = AL('VERTICAL', { name: 'Felt', gap: g, p, r: 14, fill: 'bg/secondary', stroke: 'border/default' });
const st = n => (o.cells && o.cells[n]) || 'Default';
const A = AL('HORIZONTAL', { name: 'Numbers', gap: g }); add(F, A);
add(A, await cell(0, st(0), cw, 3 * ch + 2 * g, o.bets && o.bets[0]));
const grid = AL('VERTICAL', { name: 'Grid 1–36', gap: g }); add(A, grid);
for (const r of [0, 1, 2]) { const row = AL('HORIZONTAL', { name: 'Row ' + (3 - r), gap: g }); for (let c = 0; c < 12; c++) { const n = 3 * c + (3 - r); add(row, await cell(n, st(n), cw, ch, o.bets && o.bets[n])); } add(grid, row); }
const cols = AL('VERTICAL', { name: 'Column bets', gap: g }); add(A, cols);
for (const [k, lab] of [['Col 3', '2:1'], ['Col 2', '2:1'], ['Col 1', '2:1']]) { const bx = await obox(lab, cw, ch, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', chipSize: 24 }); bx.name = 'Bet — ' + k; add(cols, bx); }
const pad0 = () => AL('HORIZONTAL', { name: 'Offset', w: cw, h: 4 });
const B = AL('HORIZONTAL', { name: 'Dozens', gap: g }); add(F, B); add(B, pad0());
for (const k of ['1st 12', '2nd 12', '3rd 12']) add(B, await obox(k, 4 * cw + 3 * g, Math.round(ch * 0.75), { st: oState(o, k), chip: o.obets && o.obets[k] }));
const Cc = AL('HORIZONTAL', { name: 'Even-money bets', gap: g }); add(F, Cc); add(Cc, pad0());
for (const [k, dot] of [['1–18'], ['EVEN'], ['RED', 'status/danger-strong'], ['BLACK', 'ink/950'], ['ODD'], ['19–36']]) add(Cc, await obox(k, 2 * cw + g, Math.round(ch * 0.75), { st: oState(o, k), chip: o.obets && o.obets[k], dot }));
const cx = c => p + cw + g + c * (cw + g); const cy = r => p + r * (ch + g);
const pos = n => ({ c: Math.ceil(n / 3) - 1, r: n % 3 === 0 ? 0 : n % 3 === 2 ? 1 : 2 });
const pts = [];
for (const m of (o.marks || [])) {
let x, y; const a = pos(m.a);
if (m.type === 'split') { const b = pos(m.b); if (a.r === b.r) { x = cx(Math.max(a.c, b.c)) - g / 2; y = cy(a.r) + ch / 2; } else { x = cx(a.c) + cw / 2; y = cy(Math.max(a.r, b.r)) - g / 2; } }
else if (m.type === 'street') { x = cx(a.c) + cw / 2; y = cy(2) + ch + g / 2; }
else if (m.type === 'corner') { x = cx(a.c + 1) - g / 2; y = cy(a.r) - g / 2; }
else if (m.type === 'line') { x = cx(a.c + 1) - g / 2; y = cy(2) + ch + g / 2; }
else { x = cx(a.c) + cw / 2; y = cy(a.r) + ch / 2; }
pts.push({ m, x, y });
}
if (o.outline) { const ns = o.outline.map(pos); const x0 = Math.min(...ns.map(q => cx(q.c))) - 3, x1 = Math.max(...ns.map(q => cx(q.c) + cw)) + 3, y0 = Math.min(...ns.map(q => cy(q.r))) - 3, y1 = Math.max(...ns.map(q => cy(q.r) + ch)) + 3; const ol = rect(x1 - x0, y1 - y0, null, 10, 'Hover outline'); stroke(ol, 'border/focus', 2); F.appendChild(ol); ol.layoutPositioning = 'ABSOLUTE'; ol.x = x0; ol.y = y0; }
for (const q of pts) { const k = await chipI(q.m.value || '1', 24); F.appendChild(k); k.layoutPositioning = 'ABSOLUTE'; k.x = Math.round(q.x - 12); k.y = Math.round(q.y - 12); k.name = 'Chip on felt — ' + q.m.type + ' ' + q.m.label; }
if (o.tip) { const t = await I('20:10849', { Type: 'Info', Placement: 'Top' }, { Text: o.tip.text }); t.name = 'Tooltip — ' + o.tip.text.slice(0, 30); F.appendChild(t); t.layoutPositioning = 'ABSOLUTE'; const q = pts.find(z => z.m.label === o.tip.at) || pts[0]; if (q) { t.x = Math.round(Math.max(0, q.x - t.width / 2)); t.y = Math.round(q.y - 14 - t.height - 6); } }
return F;
}
async function discNum(n, size = 28, o = {}) { const col = colorOf(n); const d = AL('HORIZONTAL', { name: 'Pocket ' + n, w: size, h: size, r: 9999, align: 'CENTER', justify: 'CENTER', fill: col === 'Red' ? 'status/danger-strong' : col === 'Green' ? 'status/success' : 'ink/950', stroke: o.newest ? 'border/focus' : 'border/strong', sw: o.newest ? 2 : 1 }); add(d, await T(String(n), size >= 48 ? 'Heading/H3' : size >= 32 ? 'Label/M' : 'Label/S', col === 'Green' ? 'text/on-primary' : 'text/primary', { name: 'Pocket number' })); return d; }
async function wheelI(state, size) { const wl = await I('25:15363', { State: state || 'Idle' }); wl.name = 'Game/Roulette Wheel'; if (size && size !== 360) wl.rescale(size / 360); return wl; }
const PLAY = {
balance: '9,215.30', topbar: 'Member', rg: 'Normal', rgMap: null, wheel: 'Idle',
top: { label: 'BETS OPEN · SPIN RL-88191', meta: 'Nonce 417 · server seed hash 8f3c1e…e813 committed before you bet' },
phase: { label: 'PLACE YOUR BETS', title: 'Place your bets', body: 'Pick a chip, then tap the felt. Bets close when you press Spin — the pocket is fixed by your seed pair, the wheel only reveals it.' },
felt: { cells: { 19: 'Bet placed' }, bets: { 19: '5' }, obets: { 'RED': '10', '2nd 12': '5' } },
outcome: [['19 — straight + red + dozen', '1 pocket', '+195.00', 'win'], ['Red in 13–24 (14 16 18 21 23)', '5', '+15.00', 'win'], ['Other red numbers', '12', '±0.00'], ['Black in 13–24', '6', '−5.00', 'lose'], ['Any other number, incl. 0', '13', '−20.00', 'lose']],
outcomeFoot: 'Expected return 19.46 USDT for every 20.00 staked — the 2.70% house edge applies to every bet type.',
tray: { sel: '5' }, slip: 'Filled'
};
function topRadius(n, px) { const v = VAR[RD[px]]; for (const c of ['topLeftRadius', 'topRightRadius']) { if (v) n.setBoundVariable(c, v); else n[c] = px; } }
async function mShell(name, o = {}) {
const f = await screen(name, 390, { x: 0, y: 0 }); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance }, true)) > 0; }
const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
return { f, tb, C, balOk };
}
async function mHeader(o = {}) {
const h = AL('HORIZONTAL', { name: 'Game header', gap: 12, align: 'CENTER' }); const th = await I('25:14777'); th.rescale(0.25); th.name = 'Tile/Game Art — Pool Roulette (thumb)'; add(h, th);
const col = AL('VERTICAL', { name: 'Title', gap: 2 }); add(h, col); grow(col); add(col, await T(o.title || 'Pool Roulette', 'Heading/H4', 'text/primary', { name: 'Game title' })); await wrapT(col, o.sub || 'European · single zero · edge 2.70% · provably fair', 'Caption', 'text/brand', 150, { name: 'Game sub' });
const act = AL('HORIZONTAL', { name: 'Header actions', gap: 0 }); for (const ic of (o.icons || ['history', 'book', 'volume'])) add(act, await iconBtn(ic, { type: 'Ghost', size: 'L' })); add(h, act); return h;
}
const LAST_PRE = [26, 14, 0, 32, 17, 8, 23, 11];
async function mLast(seq) { const g = AL('VERTICAL', { name: 'Last results', gap: 8 }); const hr = AL('HORIZONTAL', { name: 'Last results head', gap: 6, align: 'CENTER' }); add(hr, await T('Last spins', 'Label/M', 'text/secondary'), await DEMO('XS')); addSpacer(hr); add(hr, await T('Each spin is independent', 'Caption', 'text/tertiary')); add(g, [hr, 'FILL']); const row = AL('HORIZONTAL', { name: 'Pockets', gap: 6 }); for (let i = 0; i < seq.length; i++) add(row, await discNum(seq[i], 32, { newest: i === 0 })); add(g, row); return g; }
async function mFelt(o = {}) {
const cw = 64, ch = 44, g = 2, sw = 44; const st = n => (o.cells && o.cells[n]) || 'Default';
const F = AL('VERTICAL', { name: 'Felt (vertical, scrolls with page)', gap: g, p: 10, r: 14, fill: 'bg/secondary', stroke: 'border/default' });
const z = AL('HORIZONTAL', { name: 'Zero row', gap: g }); add(z, AL('HORIZONTAL', { name: 'Offset', w: 2 * sw + g, h: 4 })); add(z, await cell(0, st(0), 3 * cw + 2 * g, ch, o.bets && o.bets[0])); add(F, z);
const body = AL('HORIZONTAL', { name: 'Board', gap: g }); add(F, body);
const ev = AL('VERTICAL', { name: 'Even-money', gap: g }); add(body, ev);
for (const [k, dot] of [['1–18'], ['EVEN'], ['RED', 'status/danger-strong'], ['BLACK', 'ink/950'], ['ODD'], ['19–36']]) add(ev, await obox(k, sw, 2 * ch + g, { st: oState(o, k), chip: o.obets && o.obets[k], dot, style: 'Label/S', vertical: true, chipSize: 24 }));
const dz = AL('VERTICAL', { name: 'Dozens', gap: g }); add(body, dz);
for (const k of ['1st 12', '2nd 12', '3rd 12']) add(dz, await obox(k, sw, 4 * ch + 3 * g, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', vertical: true, chipSize: 24 }));
const grid = AL('VERTICAL', { name: 'Grid 1–36', gap: g }); add(body, grid);
for (let i = 0; i < 12; i++) { const row = AL('HORIZONTAL', { name: 'Row ' + (3 * i + 1) + '–' + (3 * i + 3), gap: g }); for (const n of [3 * i + 1, 3 * i + 2, 3 * i + 3]) add(row, await cell(n, st(n), cw, ch, o.bets && o.bets[n])); add(grid, row); }
const cr = AL('HORIZONTAL', { name: 'Column bets', gap: g }); add(cr, AL('HORIZONTAL', { name: 'Offset', w: 2 * sw + g, h: 4 })); for (const k of ['Col 1', 'Col 2', 'Col 3']) { const b = await obox('2:1', cw, 40, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', chipSize: 24 }); b.name = 'Bet — ' + k; add(cr, b); } add(F, cr);
return F;
}
async function mOutside(o = {}) {
const P = AL('VERTICAL', { name: 'Outside bets panel', gap: 8 });
const box = async (k, pays, cov, dot) => { const s = oState(o, k); const on = s === 'bet' || s === 'win' || s === 'hover'; const b = AL('VERTICAL', { name: 'Outside — ' + k, gap: 2, p: [10, 12, 10, 12], r: 10, fill: on ? 'brand/tint-subtle' : 'surface/raised', stroke: s === 'hover' ? 'border/focus' : on ? 'border/brand' : 'border/default', sw: s === 'hover' ? 2 : 1 }); const tr = AL('HORIZONTAL', { name: 'Box title', gap: 6, align: 'CENTER', h: 28 }); if (dot) { const d = ellipse(12, 12, dot, 'Colour dot'); stroke(d, 'border/strong', 1); add(tr, d); } add(tr, await T(k, 'Label/L', 'text/primary', { name: 'Bet label' })); addSpacer(tr); if (o.obets && o.obets[k]) add(tr, await chipI(o.obets[k], 28)); add(b, [tr, 'FILL']); add(b, await T(pays + ' · ' + cov, 'Caption', 'text/tertiary', { name: 'Pays' })); return b; };
const pairs = [[['RED', '1:1', '18 numbers', 'status/danger-strong'], ['BLACK', '1:1', '18 numbers', 'ink/950']], [['ODD', '1:1', '18 numbers'], ['EVEN', '1:1', '18 numbers']], [['1–18', '1:1', 'low half'], ['19–36', '1:1', 'high half']]];
for (const pr of pairs) { const r = AL('HORIZONTAL', { name: 'Pair', gap: 8 }); for (const a of pr) add(r, [await box(...a), 'FILL']); add(P, [r, 'FILL']); }
for (const [lab, keys] of [['Dozens · 2:1 · 12 numbers', ['1st 12', '2nd 12', '3rd 12']], ['Columns · 2:1 · 12 numbers', ['Col 1', 'Col 2', 'Col 3']]]) { add(P, await T(lab, 'Overline', 'text/tertiary')); const r = AL('HORIZONTAL', { name: lab, gap: 8 }); for (const k of keys) add(r, [await box(k, '2:1', k.startsWith('Col') ? 'column ' + k.slice(4) : (k === '1st 12' ? '1–12' : k === '2nd 12' ? '13–24' : '25–36')), 'FILL']); add(P, [r, 'FILL']); }
return P;
}
async function seg(a, b, active) { const t = AL('HORIZONTAL', { name: 'Felt view toggle', gap: 4, p: 4, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); for (const l of [a, b]) { const on = l === active; const o = AL('HORIZONTAL', { name: 'Option — ' + l, h: 40, r: 6, align: 'CENTER', justify: 'CENTER', fill: on ? 'brand/tint' : null, stroke: on ? 'border/brand' : null }); add(o, await T(l, 'Label/M', on ? 'text/brand' : 'text/secondary')); add(t, [o, 'FILL']); } return t; }
async function mStage(st) {
const S = AL('VERTICAL', { name: 'Stage', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
const top = AL('VERTICAL', { name: 'Spin id', gap: 4 }); add(top, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Spin label' })); const mr = AL('HORIZONTAL', { name: 'Spin meta row', gap: 6, align: 'CENTER' }); await wrapT(mr, st.top.meta, 'Caption', 'text/secondary', 260, { name: 'Spin meta' }); add(mr, await DEMO('XS')); add(top, [mr, 'FILL']); add(S, [top, 'FILL']);
const ph = st.phase; const big = st.bigWheel;
const wr = AL(big ? 'VERTICAL' : 'HORIZONTAL', { name: 'Wheel row', gap: 16, align: 'CENTER' }); add(S, [wr, 'FILL']);
add(wr, await wheelI(st.wheel, big ? 240 : 132));
const col = AL('VERTICAL', { name: 'Spin status', gap: 6, align: big ? 'CENTER' : null }); add(wr, [col, 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Phase row', gap: 6, align: 'CENTER' }); add(pr, await IC(ph.icon || 'roulette', 14, ph.iconColor || 'icon/brand'), await T(ph.label, 'Overline', ph.color || 'text/brand', { name: 'Phase label' })); add(col, pr);
await wrapT(col, ph.title, 'Heading/H4', 'text/primary', 170, { name: 'Phase title', align: big ? 'CENTER' : null });
if (ph.body) await wrapT(col, ph.body, 'Caption', 'text/secondary', 170, { name: 'Phase body', align: big ? 'CENTER' : null });
if (st.mResult) { const r = st.mResult; const win = r.win; const c = AL('HORIZONTAL', { name: 'Result card', gap: 12, p: 14, r: 14, align: 'CENTER', fill: win ? 'brand/tint-subtle' : 'status/danger-tint', stroke: win ? 'border/brand' : 'border/danger' }); add(c, await discNum(r.pocket, 48, { newest: true })); const tc = AL('VERTICAL', { name: 'Result text', gap: 2 }); add(c, tc); grow(tc); add(tc, await T(r.head, 'Body/M Strong', 'text/primary', { name: 'Headline' })); await wrapT(tc, r.detail, 'Caption', 'text/secondary', 160, { name: 'Detail' }); const v = AL('VERTICAL', { name: 'Net', gap: 2, align: 'MAX' }); add(v, await T(r.net, 'Number/S', win ? 'text/success' : 'text/danger', { name: 'Net amount' }), await T('Verify', 'Label/S', 'text/brand')); add(c, v); add(S, [c, 'FILL']); }
if (st.settle) { const c = await card('Settlement', { title: st.settle.title, icon: 'receipt', p: 14, gap: 8, fill: 'bg/secondary', demo: 'XS' }); for (const [l, v, tone] of st.settle.rows) add(c, [await kv(l, v, { color: tone === 'win' ? 'text/success' : tone === 'lose' ? 'text/danger' : 'text/primary', lstyle: tone === 'total' ? 'Body/S Strong' : 'Body/S', lcolor: tone === 'total' ? 'text/primary' : 'text/secondary' }), 'FILL']); add(S, [c, 'FILL']); }
if (st.motion) await wrapT(S, st.motion, 'Caption', 'text/tertiary', 300, { name: 'Motion note', align: 'CENTER' });
if (st.last !== false) add(S, [await mLast(st.last || LAST_PRE), 'FILL']);
if (st.view !== 'none') {
add(S, [await seg('Numbers', 'Outside bets', st.view === 'outside' ? 'Outside bets' : 'Numbers'), 'FILL']);
const F = st.view === 'outside' ? await mOutside(st.felt || PLAY.felt) : await mFelt(st.felt || PLAY.felt); add(S, F); if (st.view === 'outside') F.layoutSizingHorizontal = 'FILL'; if (st.feltOff) F.opacity = 0.55;
await wrapT(S, st.hint || 'Tap a number to choose straight, split, street, corner or line · long-press removes a chip', 'Caption', 'text/tertiary', 300, { name: 'Felt hint', align: 'CENTER' });
}
return S;
}
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
const MPLAY = { balance: '9,215.30', wheel: 'Idle', view: 'numbers', top: { label: 'BETS OPEN · SPIN RL-88191', meta: 'Nonce 417 · seed hash 8f3c1e…e813 committed' }, phase: { label: 'PLACE YOUR BETS', title: 'Place your bets', body: 'The pocket is fixed by your seeds; the wheel only reveals it.' } };
async function buildM(name, st0) {
const st = Object.assign({}, MPLAY, st0);
const S = await mShell(name, { balance: st.balance, region: st.region });
add(S.C, [await mHeader(), 'FILL']);
add(S.C, [await rgStrip(Object.assign({ big: true }, st.rgm || {})), 'FILL']);
if (st.pre) for (const n of await st.pre()) add(S.C, [n, 'FILL']);
const stg = await mStage(st); add(S.C, [stg, 'FILL']);
add(S.C, [await mCompliance(), 'FILL']);
await mBar(S.f, st);
if (st.block) blockStage(stg, await prompt(Object.assign({ w: 326 }, st.block)), st.blockY || 64);
return { f: S.f, stg, C: S.C, notes: { balance: S.balOk } };
}
async function mSheet(f, title, build, foot) {
f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844);
const db = f.children[0]; const y0 = db ? db.height : 0;
const sc = figma.createFrame(); sc.name = 'Scrim'; f.appendChild(sc); sc.layoutPositioning = 'ABSOLUTE'; sc.resize(390, 844 - y0); sc.x = 0; sc.y = y0; fill(sc, 'scrim/overlay');
const sh = ALV({ name: 'Sheet — ' + title, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: 390, align: 'CENTER' }); topRadius(sh, 28); await fx(sh, 'Elevation/4 — Modal');
add(sh, rect(40, 4, 'border/strong', 9999, 'Grabber'));
const hd = AL('HORIZONTAL', { name: 'Sheet head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H4', 'text/primary', { name: 'Sheet title' })); addSpacer(hd); add(hd, await iconBtn('x', { type: 'Ghost', size: 'L', label: 'Close' })); add(sh, [hd, 'FILL']);
await build(sh);
if (foot) { const ft = AL('VERTICAL', { name: 'Sheet footer (sticky)', gap: 8, p: [12, 0, 4, 0] }); strokeSides(ft, 'border/subtle', { t: 1 }); for (const n of foot) add(ft, [n, 'FILL']); add(sh, [ft, 'FILL']); }
const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(sh, [hi, 'FILL']); add(hi, rect(134, 5, 'text/primary', 9999, 'Home bar'));
f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
return sh;
}
// ===== END ROULETTE KIT =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Roulette', 182000, 0);
const OUT = { section: sec.id, frames: {}, before: sec.children.map(n => n.name.slice(0, 60) + ' #' + n.id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' @' + Math.round(n.x) + ',' + Math.round(n.y)) };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
function has(name) { return sec.children.some(n => n.name === name && n.height > 600); }
const LOCKM = [['Straight 19', '5.00 USDT'], ['Red', '10.00 USDT'], ['2nd dozen (13–24)', '5.00 USDT'], ['Total stake', '20.00 USDT', 'total']];
const X9 = 4200;
const MC = '[RL-09] Errors & limits / 390 / Connection lost — spin settles on the server';
if (!has(MC)) { const R = await mk(MC, X9, async () => buildM('n', { balance: '9,195.30', wheel: 'Spinning', view: 'none', top: { label: 'RECONNECTING · SPIN RL-88191', meta: 'Accepted 18:46:12 UTC · last contact 18:46:14 UTC', color: 'text/warning' }, phase: { label: 'CONNECTION LOST', icon: 'wifi-off', iconColor: 'status/warning', color: 'text/warning', title: 'Your spin is safe', body: 'Reconnecting…' }, settle: { title: 'Locked bets', rows: LOCKM }, block: { tone: 'warning', icon: 'wifi-off', title: 'Connection lost — your spin is safe', body: 'Spin RL-88191 was accepted with 20.00 USDT staked. It settles on the server while you are offline; the result appears when you are back.', facts: [['Stake locked', '20.00 USDT', true], ['Reconnecting', 'attempt 3 of 10']], actions: [await BTN('Primary', 'Retry now', { lead: 'refresh' }), await BTN('Secondary', 'My bets', { lead: 'history' })] }, blockY: 40, bar: { off: true, summary: '3 bets · 20.00 USDT locked', sub: 'Settles on the server', cta: 'Waiting for connection…', state: 'Disabled' } })); await R.f.screenshot({ scale: 0.5 }); } else OUT.sC = MC;
const MI = '[RL-09] Errors & limits / 390 / Insufficient balance (DEMO account · Available 4.20 USDT)';
if (!has(MI)) { const R = await mk(MI, X9, async () => { const B = await buildM('n', { balance: '4.20', bar: { summary: '3 bets · 20.00 USDT', sub: 'Available 4.20 USDT (DEMO account)', cta: 'Not enough balance', state: 'Disabled' } });
await mSheet(B.f, 'Not enough balance', async (sh) => { await wrapT(sh, 'Your bets add up to 20.00 USDT but this DEMO account has 4.20 USDT available. Nothing has been charged.', 'Body/S', 'text/secondary', 358); const fl = AL('VERTICAL', { name: 'Facts', gap: 8, p: 12, r: 10, fill: 'bg/secondary' }); for (const [l, v, c] of [['Bets on the felt', '20.00 USDT'], ['Available', '4.20 USDT', 'text/danger'], ['Short by', '15.80 USDT', 'text/danger']]) add(fl, [await kv(l, v, { vstyle: 'Body/S Strong', color: c, demo: true }), 'FILL']); add(sh, [fl, 'FILL']); }, [await BTN('Primary', 'Deposit USDT', { size: 'L', lead: 'deposit' }), await BTN('Secondary', 'Remove bets', { size: 'L', lead: 'trash' }), await T('Arbitrum deposits usually arrive in about 2 minutes.', 'Caption', 'text/tertiary', { w: 326, align: 'CENTER' })]);
return B; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.sI = MI;
const MLL = '[RL-09] Errors & limits / 390 / Daily loss limit reached (DEMO scenario · net −200.00 USDT)';
if (!has(MLL)) { const R = await mk(MLL, X9, async () => buildM('n', { view: 'none', rgm: { danger: true, net: '−200.00 USDT', lim: '200.00 / 200.00 USDT', pct: 1, msg: 'Play paused until 28 Nov 2026, 00:00 UTC' }, top: { label: 'PLAY PAUSED · LOSS LIMIT', meta: 'Resumes 28 Nov 2026, 00:00 UTC', color: 'text/danger' }, phase: { label: 'LIMIT REACHED', icon: 'pause-circle', iconColor: 'status/danger', color: 'text/danger', title: 'Play is paused', body: 'Daily loss limit reached.' }, block: { tone: 'danger', icon: 'pause-circle', title: 'Daily loss limit reached', body: 'Today’s net result is −200.00 USDT, your daily limit. Games are paused until 28 Nov 2026, 00:00 UTC. Your balance and withdrawals are not affected.', note: 'Lowering a limit applies now; raising it takes 24 hours.', actions: [await BTN('Secondary', 'View my limits', { lead: 'sliders' }), await BTN('Ghost', 'Take a longer break', { lead: 'pause-circle' })] }, blockY: 40, bar: { off: true, summary: 'No bets placed', sub: 'Withdrawals stay open', cta: 'Paused until 00:00 UTC', state: 'Disabled' } })); await R.f.screenshot({ scale: 0.5 }); } else OUT.sLL = MLL;
const MRG = '[RL-09] Errors & limits / 390 / Region restricted (United States)';
if (!has(MRG)) { const R = await mk(MRG, X9, async () => { const S = await mShell('n', { region: true }); const C = S.C; add(C, [await mHeader({ icons: ['book', 'help-circle'] }), 'FILL']);
const c = await card('Region notice', { p: 20, gap: 14 }); add(C, [c, 'FILL']);
const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 48, h: 48, r: 14, align: 'CENTER', justify: 'CENTER', fill: 'status/warning-tint' }); add(tile, await IC('globe', 24, 'status/warning')); add(c, tile);
await wrapT(c, 'Pool Roulette isn’t available in your region', 'Heading/H4', 'text/primary', 310); await wrapT(c, 'You appear to be in the United States, where our licence doesn’t allow real-money games. Your account and balance are safe — you can still view history and withdraw.', 'Body/S', 'text/secondary', 310);
add(c, [await callout({ tone: 'warning', icon: 'alert-triangle', title: 'Please don’t use a VPN or proxy', body: 'Accounts that hide their location are restricted. Travelling? Games unlock again in a permitted country.' }), 'FILL']);
const lk = AL('VERTICAL', { name: 'Locked table preview', gap: 8, p: 16, r: 14, fill: 'bg/secondary', stroke: 'border/subtle', align: 'CENTER' }); const wl = await wheelI('Idle', 160); wl.opacity = 0.35; add(lk, wl); const lr = AL('HORIZONTAL', { name: 'Locked label', gap: 6, align: 'CENTER' }); add(lr, await IC('lock', 16, 'icon/muted'), await T('Table locked in this region', 'Label/M', 'text/secondary')); add(lk, lr); add(C, [lk, 'FILL']);
add(C, [await mCompliance(), 'FILL']);
await mBar(S.f, { noTab: true, bar: { noChips: true, noTools: true, summary: 'Balance 9,215.30 USDT', sub: 'Withdrawals stay available', cta: 'Withdraw funds', lead: 'withdraw', cta2: 'Restricted countries', lead2: 'globe' } });
return { f: S.f, notes: {} }; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.sRG = MRG;
return OUT;
