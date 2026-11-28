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
async function setTexts(root, map) { const miss = []; for (const [k, v] of Object.entries(map)) { if (!(await setText(root, k, v))) miss.push(k); } return miss; }
async function repl(root, map, sub = false) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; let nc = c; for (const [k, v] of Object.entries(map)) { if (sub) { if (nc.includes(k)) nc = nc.split(k).join(v); } else if (nc === k) nc = v; } if (nc !== c) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = nc; n++; } } return n; }
function grow(n) { n.layoutGrow = 1; return n; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
function addSpacer(row) { const s = spacer(); add(row, s); s.layoutGrow = 1; return s; }
function tryFill(n) { try { n.layoutSizingHorizontal = 'FILL'; return true; } catch (e) { return false; } }
async function wrapT(parent, text, style, color, w, o = {}) { const t = await T(text, style, color, Object.assign({ w }, o)); add(parent, t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, o.style || 'Label/S', o.color || 'text/secondary', { name: o.name || label })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function brandChip(icon, label) { return chip(icon, label, { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' }); }
async function statusChip(win, label) { return chip(win ? 'check-circle' : 'x-circle', label, win ? { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' } : { color: 'text/danger', icon: 'status/danger', stroke: 'border/danger', fill: 'status/danger-tint' }); }
async function iconBtn(icon, o = {}) { const b = await I('7:774', { Type: o.type || 'Secondary', Size: o.size || 'M', State: o.state || 'Default' }, { Icon: ICONS[icon] }); b.name = 'Button/Icon — ' + icon; return b; }
async function sidebar(activeName, collapsed) { const sb = await I('23:6697', { State: collapsed ? 'Collapsed' : 'Expanded', Auth: 'Member' }); sb.name = 'Shell/Sidebar'; let found = false; for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { const p = it.componentProperties; const st = p.State && p.State.value; if (it.name === 'Item/' + activeName) { found = true; it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } return { sb, found }; }
async function rgBar(state, texts) { const b = await I('23:24937', { State: state || 'Normal' }); b.name = 'RG/Session Bar'; let miss = []; if (texts) miss = await setTexts(b, texts); return { b, miss }; }
async function callout(o) { const tone = o.tone || 'info'; const c = AL('HORIZONTAL', { name: 'Callout — ' + o.title, gap: 12, p: 16, r: 14, fill: 'status/' + tone + '-tint', stroke: 'status/' + tone }); add(c, await IC(o.icon || 'info', 20, 'status/' + tone)); const col = AL('VERTICAL', { name: 'Callout text', gap: 4 }); add(c, col); grow(col); await wrapT(col, o.title, 'Body/S Strong', 'text/primary', 240, { name: 'Callout title' }); if (o.body) await wrapT(col, o.body, 'Body/S', 'text/secondary', 240, { name: 'Callout body' }); if (o.actions && o.actions.length) { const a = AL('HORIZONTAL', { name: 'Callout actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(col, a); a.layoutSizingHorizontal = 'FILL'; } return c; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function gameHeader(o = {}) {
const h = AL('HORIZONTAL', { name: 'Game header', gap: 16, align: 'CENTER' });
const th = await I('24:13443'); th.rescale(o.tablet ? 0.3 : 0.35); th.name = 'Tile/Game Art — Pool Dice (thumb)'; add(h, th);
const col = AL('VERTICAL', { name: 'Title', gap: 6 });
const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'GLOBAL POOL Originals', 'Current page': o.current || 'Pool Dice' }); add(col, bc);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' });
add(tr, await T(o.title || 'Pool Dice', 'Heading/H3', 'text/primary', { name: 'Game title' }), await brandChip('shield-check', 'Provably fair'), await chip('dice', 'Original'));
const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 8, align: 'CENTER', wrap: true, cgap: 8 });
add(mr, await chip('percent', 'House edge 1.00%'), await chip('hash', 'Range 0.00 – 99.99'), await chip('coins', 'Bet 0.10 – 1,000.00 USDT'));
if (!o.tablet) add(mr, await chip('target', 'Win chance 0.01% – 98.00%'));
add(col, tr, mr); add(h, col); grow(col); mr.layoutSizingHorizontal = 'FILL';
const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' });
add(act, await iconBtn(o.muted ? 'volume-x' : 'volume'), await iconBtn('star'));
if (o.tablet) add(act, await iconBtn('history'), await iconBtn('shield-check'), await iconBtn('book'));
else add(act, await BTN('Secondary', 'My rolls', { lead: 'history' }), await BTN('Secondary', 'Fairness', { lead: 'shield-check' }), await BTN('Ghost', 'Rules & payouts', { lead: 'book' }));
add(h, act); return h;
}
async function compliance(o = {}) { const c = AL('HORIZONTAL', { name: 'Compliance footer', gap: 16, p: [12, 16, 12, 16], r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: !!o.wrap, cgap: 8 }); add(c, await I('6:158', { Variant: o.compact ? 'Compact' : 'Inline' })); addSpacer(c); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Set limits', { size: 'S', lead: 'sliders' })); return c; }
async function shellD(name, w, x, y, o = {}) {
const f = await screen(name, w, { x, y }); add(f, [await DEMOBAR(), 'FILL']);
const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
const { sb, found } = await sidebar('Pool Dice', o.collapsed); add(body, sb); sb.layoutSizingVertical = 'FILL';
const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
const tb = await I('23:9832', { State: o.topbar || 'Member' }); tb.name = 'Shell/Topbar Desktop'; add(main, [tb, 'FILL']);
let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance })) > 0; }
const C = AL('VERTICAL', { name: 'Content', gap: 24, p: o.pad || [32, 32, 48, 32] }); add(main, [C, 'FILL']);
return { f, body, sb, main, tb, C, found, balOk };
}
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
async function readout(st) {
const R = AL('VERTICAL', { name: 'Readout', gap: 8, align: 'CENTER' }); const rd = st.read;
add(R, await T(rd.over, 'Overline', rd.overColor || 'text/tertiary', { name: 'Readout label' }));
const big = AL('HORIZONTAL', { name: 'Readout value row', gap: 12, align: 'CENTER' }); add(big, await T(rd.value, 'Display/L', rd.color || 'text/primary', { name: 'Readout value' })); if (rd.demo) add(big, await DEMO('S')); add(R, big);
if (rd.chip) add(R, rd.chip === 'win' ? await statusChip(true, rd.chipLabel) : rd.chip === 'lose' ? await statusChip(false, rd.chipLabel) : await chip(rd.chipIcon || 'timer', rd.chipLabel));
if (rd.caption) add(R, await T(rd.caption, 'Body/S', 'text/secondary', { name: 'Readout caption', align: 'CENTER' }));
return R;
}
async function legend(mode, t) { const z = zones(mode, t); const L = AL('HORIZONTAL', { name: 'Zone legend', gap: 12, align: 'CENTER' }); const seq = mode === 'under' ? [['win', z.win], ['lose', z.lose]] : [['lose', z.lose], ['win', z.win]]; for (let i = 0; i < 2; i++) { const [k, r] = seq[i]; add(L, await statusChip(k === 'win', (k === 'win' ? 'Win · ' : 'Lose · ') + fmt2(r[0]) + ' – ' + fmt2(r[1]) + ' · ' + commas(outcomes(r[0], r[1])) + ' results')); if (i === 0) addSpacer(L); } return L; }
async function skel(w, h, nm, r = 10) { const x = rect(w, h, null, r, nm); await gfill(x, 'Gradient/Skeleton'); return x; }
async function stage(st, sw, padPx = 32) {
const S = AL('VERTICAL', { name: 'Stage', gap: 24, p: padPx, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
const top = AL('HORIZONTAL', { name: 'Stage top', gap: 12, align: 'CENTER' });
const tl = AL('VERTICAL', { name: 'Roll id', gap: 4 }); add(tl, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Roll label' }));
const mr = AL('HORIZONTAL', { name: 'Roll meta row', gap: 6, align: 'CENTER' }); add(mr, await T(st.top.meta, 'Caption', 'text/secondary', { name: 'Roll meta' }), await DEMO('XS')); add(tl, mr); add(top, tl); addSpacer(top);
add(top, await chip('hash', '10,000 possible results')); add(S, [top, 'FILL']);
if (st.loading) {
const R = AL('VERTICAL', { name: 'Readout (loading)', gap: 12, align: 'CENTER' }); add(R, await skel(140, 12, 'Skeleton — label', 6), await skel(220, 64, 'Skeleton — value', 14), await skel(320, 14, 'Skeleton — caption', 6)); add(S, [R, 'FILL']);
add(S, await skel(sw - 40, 12, 'Skeleton — track', 9999));
const lg = AL('HORIZONTAL', { name: 'Legend (loading)', gap: 12 }); add(lg, await skel(240, 28, 'Skeleton — lose zone', 9999)); addSpacer(lg); add(lg, await skel(240, 28, 'Skeleton — win zone', 9999)); add(S, [lg, 'FILL']);
const od = await skel(520, 96, 'Skeleton — odds', 14); add(S, od); od.layoutSizingHorizontal = 'FILL';
const ln = AL('HORIZONTAL', { name: 'Loading status', gap: 8, align: 'CENTER' }); add(ln, await IC('spinner', 16, 'icon/brand'), await T(st.loadingText || 'Connecting to the game server · loading your seed pair', 'Caption', 'text/secondary')); add(S, ln);
return S;
}
add(S, [await readout(st), 'FILL']);
add(S, await slider({ w: sw, mode: st.mode, target: st.target, tStr: st.tStr, thumb: st.thumb, roll: st.roll, off: st.sliderOff }));
add(S, [await legend(st.mode, st.target), 'FILL']);
if (st.result) { const rb = await I('23:19422', { Result: st.result.v }); rb.name = 'Game/Result Banner'; add(S, rb); tryFill(rb); if (st.result.t) st.resMiss = await setTexts(rb, st.result.t); if (st.result.r) await repl(rb, st.result.r, true); }
const od = await I('23:19312', { State: st.odds || 'Default' }); od.name = 'Game/Odds Display'; add(S, od); tryFill(od); if (st.oddsRepl) st.oddsN = await repl(od, st.oddsRepl, true);
if (st.motion) { const mn = AL('HORIZONTAL', { name: 'Motion note', gap: 6, p: [4, 10, 4, 8], r: 9999, stroke: 'border/subtle', align: 'CENTER' }); add(mn, await IC('timer', 14, 'icon/muted'), await T(st.motion, 'Caption', 'text/tertiary', { name: 'Motion note text' })); add(S, mn); }
return S;
}
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
async function betPanel(st, o = {}) {
const w = o.w || 360; const dis = !!st.panelOff;
const P = AL('VERTICAL', { name: 'Bet panel', gap: 20, p: o.twoCol ? 24 : 20, r: 20, fill: 'surface/default', stroke: 'border/subtle', w });
const hd = AL('HORIZONTAL', { name: 'Panel head', gap: 8, align: 'CENTER' }); add(hd, await T('Place a bet', 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await chip('zap', 'Instant result')); add(P, [hd, 'FILL']);
const tk = await CHAIN('USDT', 20); tk.name = 'Token/USDT';
const amtBox = await inputBox({ name: 'Amount input', value: st.bet, style: 'Number/M', h: 56, state: st.amtErr ? 'error' : dis ? 'disabled' : 'default', suffix: 'USDT', lead: [tk] });
const amt = await fieldBlock('Bet amount', [await T('Available ' + st.avail + ' USDT', 'Caption', st.amtErr ? 'text/danger' : 'text/tertiary', { name: 'Available value' }), await DEMO('XS')], amtBox, st.amtErr ? await helperRow(st.amtErr, 'error') : null);
const quick = AL('HORIZONTAL', { name: 'Quick amounts', gap: 8 }); for (const l of ['½', '2×', 'Max']) { const b = await BTN('Secondary', l, { size: 'S', state: dis ? 'Disabled' : 'Default' }); add(quick, [b, 'FILL']); } add(amt, [quick, 'FILL']);
const dir = await fieldBlock('Direction', null, await dirToggle(st.mode, dis));
const tState = st.tErr ? 'error' : st.tFocus ? 'focus' : dis ? 'disabled' : 'default';
const tBox = await inputBox({ name: 'Target input', value: st.tStr, style: 'Number/M', h: 56, state: tState, pr: 8, trail: [await iconBtn('minus', { size: 'S', state: dis ? 'Disabled' : 'Default' }), await iconBtn('plus', { size: 'S', state: dis ? 'Disabled' : 'Default' })] });
const tgt = await fieldBlock(st.mode === 'under' ? 'Roll under' : 'Roll over', [await T(st.mode === 'under' ? 'Target 0.01 – 98.00' : 'Target 2.00 – 99.99', 'Caption', 'text/tertiary')], tBox, st.tErr ? await helperRow(st.tErr, 'error') : null);
const two = AL('HORIZONTAL', { name: 'Chance & multiplier', gap: 12 });
add(two, [await fieldBlock('Win chance', null, await inputBox({ name: 'Win chance input', value: st.chance, suffix: '%', state: st.tErr ? 'error' : dis ? 'disabled' : 'default' })), 'FILL'], [await fieldBlock('Multiplier', null, await inputBox({ name: 'Multiplier input', value: st.mult, suffix: '×', state: dis ? 'disabled' : 'default' })), 'FILL']);
const link = AL('HORIZONTAL', { name: 'Link note', gap: 6 }); add(link, await IC('link', 14, st.tFocus ? 'icon/brand' : 'icon/muted')); await wrapT(link, st.linkNote || 'Change any of the three — the other two update instantly. Multiplier = 99 ÷ win chance.', 'Caption', st.tFocus ? 'text/brand' : 'text/tertiary', 240, { name: 'Link note text' });
const sum = AL('VERTICAL', { name: 'Payout summary', gap: 10, p: 16, r: 14, fill: 'bg/secondary', stroke: 'border/subtle' });
const money = v => v === '—' ? '—' : v + ' USDT';
add(sum, [await kv('Profit on win', money(st.profit), { color: st.profit.charAt(0) === '+' ? 'text/success' : 'text/primary', demo: true, vname: 'Profit value' }), 'FILL']);
add(sum, [await kv('You receive on win', money(st.receive), { vname: 'Receive value' }), 'FILL']);
add(sum, [await kv('Fees', '0.00 USDT', { vname: 'Fee value' }), 'FILL']);
await wrapT(sum, 'No platform or network fee on game bets — the 1.00% house edge is already in the multiplier.', 'Caption', 'text/tertiary', 280, { name: 'Fee note' });
const risk = AL('HORIZONTAL', { name: 'Risk note', gap: 8 }); add(risk, await IC('alert-circle', 16, 'icon/muted')); await wrapT(risk, 'You can lose your stake. Min 0.10 · Max 1,000.00 USDT per roll. Each roll is independent — past results never change the odds.', 'Caption', 'text/secondary', 280, { name: 'Risk text' });
if (o.twoCol) { const row = AL('HORIZONTAL', { name: 'Panel columns', gap: 24 }); const a = AL('VERTICAL', { name: 'Column A', gap: 20 }); const b = AL('VERTICAL', { name: 'Column B', gap: 20 }); add(a, [amt, 'FILL'], [dir, 'FILL'], [sum, 'FILL']); add(b, [tgt, 'FILL'], [two, 'FILL'], [link, 'FILL']); add(row, [a, 'FILL'], [b, 'FILL']); add(P, [row, 'FILL']); }
else add(P, [amt, 'FILL'], [dir, 'FILL'], [tgt, 'FILL'], [two, 'FILL'], [link, 'FILL'], [sum, 'FILL']);
add(P, [risk, 'FILL']);
if (st.panelNotice) add(P, [await callout(st.panelNotice), 'FILL']);
const cta = await BTN(st.cta.type || 'Primary', st.cta.label, { size: 'L', lead: st.cta.lead || 'dice', state: st.cta.state || 'Default' }); cta.name = 'CTA'; add(P, [cta, 'FILL']);
if (st.cta2) { const b2 = await BTN('Secondary', st.cta2.label, { size: 'L', lead: st.cta2.lead }); b2.name = 'CTA secondary'; add(P, [b2, 'FILL']); }
await wrapT(P, st.hint || 'Space to roll · ↑ ↓ moves the target by 1.00 · results settle on the server', 'Caption', 'text/tertiary', 300, { name: 'Shortcut hint', align: 'CENTER' });
return P;
}
const ROWS_ALL = [['@mira.sol', 'MS', '18:41:52', '25.00', 'Over 50.50', '88.41', true, '2.0000×', '+25.00'], ['Hidden', '', '18:41:47', '5.00', 'Under 20.00', '63.12', false, '4.9500×', '−5.00'], ['@kestrel', 'KE', '18:41:40', '100.00', 'Over 75.00', '91.07', true, '3.9600×', '+296.00'], ['@juno88', 'JU', '18:41:33', '2.50', 'Over 50.50', '12.95', false, '2.0000×', '−2.50'], ['@pixelfox', 'PF', '18:41:29', '40.00', 'Under 49.50', '22.30', true, '2.0000×', '+40.00'], ['@nova.k (you)', 'NK', '18:41:12', '10.00', 'Over 50.50', '61.08', true, '2.0000×', '+10.00']];
async function cellBox(w, al, name) { const c = AL('HORIZONTAL', { name: 'Cell — ' + name, gap: 8, p: [0, 16, 0, 16], h: 48, align: 'CENTER', justify: al === 'R' ? 'MAX' : 'MIN' }); if (w) c.resize(w, 48); return c; }
async function rollsTable(rows, o = {}) {
const C = AL('VERTICAL', { name: o.name || 'Recent rolls', r: 14, fill: 'bg/secondary', stroke: 'border/subtle', clip: true });
const hd = AL('HORIZONTAL', { name: 'Table head', gap: 12, p: [16, 20, 16, 20], align: 'CENTER' }); add(hd, await T(o.title || 'Recent rolls', 'Heading/H5', 'text/primary'), await DEMO('M')); addSpacer(hd);
for (const [l, a] of (o.tabs || [['All players', true], ['My rolls', false], ['High rollers', false]])) add(hd, await I('20:6895', { State: a ? 'Active' : 'Default' }, { Label: l }));
add(C, [hd, 'FILL']);
const cols = o.cols || [['Player', 220, 'L'], ['Time (UTC)', 140, 'L'], ['Bet', 130, 'R'], ['Target', 160, 'L'], ['Roll', 150, 'L'], ['Multiplier', 130, 'R'], ['Profit', 0, 'R']];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { t: 1, b: 1 });
for (const [l, w, al] of cols) { const hc = await I('22:8309', { Align: al === 'R' ? 'Right' : 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); hc.name = 'Header — ' + l; add(hr, hc); if (w) hc.resize(w, hc.height); else hc.layoutSizingHorizontal = 'FILL'; }
add(C, [hr, 'FILL']);
for (let i = 0; i < rows.length; i++) {
const r = rows[i]; const row = AL('HORIZONTAL', { name: 'Row — ' + r[0], fill: i % 2 ? 'surface/default' : null, align: 'CENTER' });
const cells = await (o.renderRow || renderRoll)(r, cols);
for (let k = 0; k < cells.length; k++) { add(row, cells[k]); if (!cols[k][1]) cells[k].layoutSizingHorizontal = 'FILL'; }
add(C, [row, 'FILL']);
}
return C;
}
async function renderRoll(r, cols) {
const [h, ini, time, bet, tgt, roll, win, mult, prof] = r; const out = [];
const c0 = await cellBox(cols[0][1], 'L', 'Player'); if (ini) { add(c0, await I('9:238', { Size: 'XS' }, { Initials: ini, 'Show status': false })); } else add(c0, await IC('eye-off', 16, 'icon/muted')); add(c0, await T(h, 'Body/S Strong', ini ? 'text/primary' : 'text/tertiary', { name: 'Handle' }), await DEMO('XS')); out.push(c0);
const c1 = await cellBox(cols[1][1], 'L', 'Time'); add(c1, await T(time, 'Body/S', 'text/secondary')); out.push(c1);
const c2 = await cellBox(cols[2][1], 'R', 'Bet'); add(c2, await T(bet, 'Number/S', 'text/primary')); out.push(c2);
const c3 = await cellBox(cols[3][1], 'L', 'Target'); add(c3, await IC(tgt.indexOf('Under') === 0 ? 'chevron-down' : 'chevron-up', 14, 'icon/muted'), await T(tgt, 'Body/S', 'text/secondary')); out.push(c3);
const c4 = await cellBox(cols[4][1], 'L', 'Roll'); add(c4, await IC(win ? 'check-circle' : 'x-circle', 16, win ? 'icon/brand' : 'status/danger'), await T(roll, 'Number/S', 'text/primary'), await T(win ? 'Win' : 'Lose', 'Caption', win ? 'text/brand' : 'text/danger')); out.push(c4);
const c5 = await cellBox(cols[5][1], 'R', 'Multiplier'); add(c5, await T(mult, 'Number/S', 'text/secondary')); out.push(c5);
const c6 = await cellBox(cols[6][1], 'R', 'Profit'); add(c6, await T(prof, 'Number/S', win ? 'text/success' : 'text/danger')); out.push(c6);
return out;
}
async function buildPlay(name, x, y, st0) {
const st = Object.assign({}, PLAY_BASE, st0); const w = st.w; const tab = w < 1000;
const S = await shellD(name, w, x, y, { collapsed: tab, topbar: st.topbar, balance: st.balance, pad: tab ? [24, 24, 40, 24] : [32, 32, 48, 32] });
const C = S.C; const notes = { sidebarItem: S.found, balance: S.balOk };
add(C, [await gameHeader({ tablet: tab }), 'FILL']);
if (st.alert) { const ab = await I('30:17116', { Type: st.alert, Layout: 'Inline' }); ab.name = 'Alert/Banner — ' + st.alert; add(C, ab); notes.alertFill = tryFill(ab); }
const rg = await rgBar(st.rg, st.rgTexts); add(C, rg.b); notes.rgFill = tryFill(rg.b); notes.rgMiss = rg.miss; if (st.rgRepl) notes.rgN = await repl(rg.b, st.rgRepl, true);
const inner = w - (tab ? 72 : 240) - (tab ? 48 : 64); let stg, panel;
if (!tab) { const row = AL('HORIZONTAL', { name: 'Game area', gap: 24 }); add(C, [row, 'FILL']); panel = await betPanel(st, { w: 360 }); add(row, panel); stg = await stage(st, inner - 360 - 24 - 64, 32); add(row, [stg, 'FILL']); stg.layoutSizingVertical = 'FILL'; stg.primaryAxisAlignItems = 'CENTER'; }
else { stg = await stage(st, inner - 48, 24); add(C, [stg, 'FILL']); panel = await betPanel(st, { w: inner, twoCol: true }); add(C, [panel, 'FILL']); }
const low = AL(tab ? 'VERTICAL' : 'HORIZONTAL', { name: 'History & seeds', gap: 24 }); add(C, [low, 'FILL']);
const hs = await I('23:23256', { Game: 'Dice' }); hs.name = 'Game/History Strip'; add(low, hs); notes.hsFill = tryFill(hs); if (st.histRepl) notes.histN = await repl(hs, st.histRepl);
const sd = await I('23:23401', { State: st.seed || 'Active' }); sd.name = 'Game/Seed Display'; add(low, sd); tryFill(sd); if (st.seedRepl) notes.seedN = await repl(sd, st.seedRepl, true);
if (!tab && !st.noTable) add(C, [await rollsTable(ROWS_ALL), 'FILL']);
add(C, [await compliance({ wrap: tab, compact: tab }), 'FILL']);
if (st.block) blockStage(stg, await prompt(st.block), st.blockY || 96);
notes.resMiss = st.resMiss; notes.oddsN = st.oddsN;
return { f: S.f, stg, panel, C, rg: rg.b, hs, notes };
}
// ===== END DICE KIT =====
const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('DI Dice & GM-01', 32000, 0);
const OUT = { section: sec.id, frames: {} };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
{ const shots = [];
const A = await mk('[DI-03] Rolling / 1440 / Rolling — stake locked', 3240, () => buildPlay('n', 0, 0, { balance: '9,205.30', avail: '9,205.30', panelOff: true, thumb: 'locked', roll: { v: '41.86', state: 'rolling', ghost: true },
top: { label: 'ROLLING · D-88213', meta: 'Nonce 417 · 10.00 USDT stake locked · the result is already fixed by the seeds', color: 'text/brand' },
read: { over: 'ROLLING…', value: '41.86', color: 'text/tertiary', chip: 'info', chipIcon: 'spinner', chipLabel: 'Settling on the server', caption: 'If your connection drops, the roll still settles and appears in My rolls.' },
motion: 'Roll 800 ms · digits tick, then ease out on the result · reduced motion: result appears at once',
cta: { label: 'Rolling…', state: 'Loading' }, hint: 'Controls unlock as soon as the result is shown' }));
shots.push(A.f);
const W = await mk('[DI-04] Result / 1440 / Win — rolled 73.21 (+10.00 USDT)', 4800, () => buildPlay('n', 0, 0, { balance: '9,225.30', avail: '9,225.30', roll: { v: '73.21', state: 'win' },
rgRepl: { '−24.60': '−14.60', '24.60 / 200.00': '14.60 / 200.00', '24.60 of 200.00': '14.60 of 200.00', '00:42:18': '00:42:21' },
top: { label: 'SETTLED · D-88213', meta: 'Nonce 417 · settled 27 Nov 2026, 18:42:07 UTC · next roll D-88214 uses nonce 418' },
read: { over: 'RESULT', value: '73.21', color: 'text/success', chip: 'win', chipLabel: 'Win · 73.21 is inside your 50.50 – 99.99 range' },
result: { v: 'Win' }, cta: { label: 'Roll again · over 50.50 · 10.00 USDT' } }));
shots.push(W.f);
const L = await mk('[DI-04] Result / 1440 / Lose — rolled 31.07 (−10.00 USDT)', 4800, () => buildPlay('n', 0, 0, { roll: { v: '31.07', state: 'lose' },
rgRepl: { '00:42:18': '00:42:47' },
top: { label: 'SETTLED · D-88214', meta: 'Nonce 418 · settled 27 Nov 2026, 18:42:33 UTC · next roll D-88215 uses nonce 419' },
read: { over: 'RESULT', value: '31.07', color: 'text/danger', chip: 'lose', chipLabel: 'Lose · 31.07 is below your 50.50 target' },
result: { v: 'Lose', t: { Headline: 'No win this roll', Detail: 'Pool Dice · rolled 31.07 · you needed 50.50 or higher' }, r: { 'D-88213': 'D-88214', '73.21': '31.07' } },
cta: { label: 'Roll again · over 50.50 · 10.00 USDT' }, hint: 'A loss doesn’t make a win “due” — the next roll is still 49.50%' }));
shots.push(L.f);
OUT.res = { win: W.notes, lose: L.notes };
for (const f of shots) await f.screenshot({ scale: 0.4 }); }
return OUT;
