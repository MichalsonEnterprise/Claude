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
async function setTexts(root, map) { const miss = []; for (const [k, v] of Object.entries(map)) { if (!(await setText(root, k, v))) miss.push(k); } return miss; }
async function repl(root, map, sub = false) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; let nc = c; for (const [k, v] of Object.entries(map)) { if (sub) { if (nc.includes(k)) nc = nc.split(k).join(v); } else if (nc === k) nc = v; } if (nc !== c) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = nc; n++; } } return n; }
function grow(n) { n.layoutGrow = 1; return n; }
function ALV(o) { const f = AL('VERTICAL', o); if (o.w && !o.h) f.primaryAxisSizingMode = 'AUTO'; return f; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
function addSpacer(row) { const s = spacer(); add(row, s); s.layoutGrow = 1; return s; }
async function wrapT(parent, text, style, color, w, o = {}) { const t = await T(text, style, color, Object.assign({ w }, o)); add(parent, t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, o.style || 'Label/S', o.color || 'text/secondary', { name: o.name || label })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function sidebar(activeName, collapsed) { const sb = await I('23:6697', { State: collapsed ? 'Collapsed' : 'Expanded', Auth: 'Member' }); sb.name = 'Shell/Sidebar'; let found = false; for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { const p = it.componentProperties; const st = p.State && p.State.value; if (it.name === 'Item/' + activeName) { found = true; it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } return { sb, found }; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', o.lcolor || 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function card(name, o = {}) { const c = ALV({ name, gap: o.gap != null ? o.gap : 16, p: o.p != null ? o.p : 20, r: 14, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', w: o.w }); if (o.title) { const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); if (o.icon) add(hd, await IC(o.icon, 20, o.iconColor || 'icon/brand')); add(hd, await T(o.title, o.tstyle || 'Heading/H5', 'text/primary', { name: 'Card title' })); addSpacer(hd); if (o.demo) add(hd, await DEMO(o.demo === true ? 'S' : o.demo)); if (o.right) for (const x of o.right) add(hd, x); add(c, [hd, 'FILL']); } return c; }
async function compliance(o = {}) { const c = AL('HORIZONTAL', { name: 'Compliance footer', gap: 16, p: [12, 16, 12, 16], r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: !!o.wrap, cgap: 8 }); add(c, await I('6:158', { Variant: o.compact ? 'Compact' : 'Inline' })); addSpacer(c); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Set limits', { size: 'S', lead: 'sliders' })); return c; }
async function shellD(name, w, x, y, o = {}) {
const f = await screen(name, w, { x, y }); add(f, [await DEMOBAR(), 'FILL']);
if (o.region) { const rb = await I('16:3449', { Breakpoint: w < 1000 ? 'Tablet' : 'Desktop' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
const { sb, found } = await sidebar('Pool Roulette', o.collapsed !== false); add(body, sb); sb.layoutSizingVertical = 'FILL';
const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
const tb = await I('23:9832', { State: o.topbar || 'Member' }); tb.name = 'Shell/Topbar Desktop'; add(main, [tb, 'FILL']);
let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance }, true)) > 0; }
const C = AL('VERTICAL', { name: 'Content', gap: 24, p: o.pad || [24, 32, 48, 32] }); add(main, [C, 'FILL']);
return { f, body, sb, main, tb, C, found, balOk };
}
function colY(sec, x) { let m = 0; for (const c of sec.children) if (Math.abs(c.x - x) < 2) m = Math.max(m, c.y + c.height); return m ? m + 160 : 120; }
function dropByName(sec, name) { for (const c of sec.children.filter(n => n.name === name)) c.remove(); }
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
async function payTable(title, rows, foot) {
const c = await card(title, { title, icon: 'book', p: 16, gap: 8, fill: 'bg/secondary' });
const hd = AL('HORIZONTAL', { name: 'Pay head', gap: 8 }); for (const [l, w] of [['BET', 0], ['COVERS', 72], ['PAYS', 56], ['CHANCE', 64]]) { const x = await T(l, 'Overline', 'text/tertiary'); if (w) { x.resize(w, x.height); x.textAutoResize = 'HEIGHT'; x.textAlignHorizontal = 'RIGHT'; } add(hd, x); if (!w) x.layoutGrow = 1; } add(c, [hd, 'FILL']);
for (const r0 of rows) { const [lab, how, cov, pays, chance, hl] = r0; const r = AL('HORIZONTAL', { name: 'Pay — ' + lab, gap: 8, align: 'CENTER', p: [6, 8, 6, 8], r: 6, fill: hl ? 'brand/tint-subtle' : null, stroke: hl ? 'border/brand' : null }); const col = AL('VERTICAL', { name: 'Bet text', gap: 2 }); add(col, await T(lab, 'Body/S Strong', hl ? 'text/brand' : 'text/primary')); if (how) await wrapT(col, how, 'Caption', 'text/tertiary', 200); add(r, col); grow(col); for (const [v, w] of [[cov, 72], [pays, 56], [chance, 64]]) { const x = await T(v, 'Number/S', 'text/primary'); x.resize(w, x.height); x.textAutoResize = 'HEIGHT'; x.textAlignHorizontal = 'RIGHT'; add(r, x); } add(c, [r, 'FILL']); }
if (foot) await wrapT(c, foot, 'Caption', 'text/tertiary', 400, { name: 'Pay foot' });
return c;
}
async function pageHeader(title, sub, actions, crumb) {
const h = AL('HORIZONTAL', { name: 'Page header', gap: 16, align: 'CENTER' });
const th = await I('25:14777'); th.rescale(0.35); th.name = 'Tile/Game Art — Pool Roulette (thumb)'; add(h, th);
const col = AL('VERTICAL', { name: 'Title', gap: 6 }); add(h, col); grow(col);
const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'Pool Roulette', 'Current page': crumb || title }); add(col, bc);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, 'Heading/H2', 'text/primary', { name: 'Page title' }), await DEMO('M')); add(col, tr);
await wrapT(col, sub, 'Body/M', 'text/secondary', 640, { name: 'Page subtitle' });
const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' }); for (const a of actions) add(act, a); add(h, act);
return h;
}
async function gameTabs(active) { const bar = AL('HORIZONTAL', { name: 'Game tabs', gap: 4 }); strokeSides(bar, 'border/subtle', { b: 1 }); for (const l of ['Play', 'My bets', 'Fairness', 'Rules & payouts']) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': false }); t.name = 'Tab — ' + l; add(bar, t); } return bar; }
async function stepCard(title, steps) {
const c = AL('VERTICAL', { name: title, gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await DEMO('S')); add(c, [hd, 'FILL']);
for (let i = 0; i < steps.length; i++) { const [t, b, mono, state] = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const n = AL('HORIZONTAL', { name: 'Step number', w: 28, h: 28, r: 9999, align: 'CENTER', justify: 'CENTER', fill: state === 'bad' ? 'status/danger-tint' : 'brand/tint', stroke: state === 'bad' ? 'border/danger' : 'border/brand' }); add(n, await T(String(i + 1), 'Label/S', state === 'bad' ? 'text/danger' : 'text/brand')); add(r, n); const col = AL('VERTICAL', { name: 'Step text', gap: 4 }); add(r, col); grow(col); const tr = AL('HORIZONTAL', { name: 'Step title row', gap: 6, align: 'CENTER' }); add(tr, await T(t, 'Body/S Strong', 'text/primary')); add(tr, await IC(state === 'bad' ? 'x-circle' : 'check-circle', 16, state === 'bad' ? 'status/danger' : 'icon/brand')); add(col, tr); await wrapT(col, b, 'Body/S', 'text/secondary', 400, { name: 'Step body' }); if (mono) { const m = AL('HORIZONTAL', { name: 'Mono chip', p: [6, 10, 6, 10], r: 6, fill: 'bg/secondary', stroke: 'border/subtle' }); add(m, await T(mono, 'Mono/S', 'text/primary', { name: 'Mono value' })); add(col, m); } add(c, [r, 'FILL']); }
return c;
}
async function pageShell(name, x, y) { return shellD(name, 1440, x, y, { collapsed: false, pad: [32, 32, 48, 32] }); }
const INSIDE_ROWS = [['Straight', 'Tap one number (0 included)', '1', '35:1', '2.70%'], ['Split', 'Tap the line between two numbers', '2', '17:1', '5.41%'], ['Street', 'Tap the outer edge of a row of three', '3', '11:1', '8.11%'], ['Corner', 'Tap where four numbers meet', '4', '8:1', '10.81%'], ['First four', '0 · 1 · 2 · 3 — tap the corner of 0 and 1', '4', '8:1', '10.81%'], ['Line', 'Two streets — tap the edge between them', '6', '5:1', '16.22%']];
const OUTSIDE_ROWS = [['Column', 'A full column of 12 — the 2:1 boxes', '12', '2:1', '32.43%'], ['Dozen', '1–12 · 13–24 · 25–36', '12', '2:1', '32.43%'], ['Red / Black', '18 numbers each', '18', '1:1', '48.65%'], ['Odd / Even', '18 numbers each (0 is neither)', '18', '1:1', '48.65%'], ['1–18 / 19–36', 'Low or high half', '18', '1:1', '48.65%']];
async function buildRules(name, x, y) {
const S = await pageShell(name, x, y); const C = S.C;
add(C, [await pageHeader('Rules & payouts', 'European roulette with a single zero. Every bet type returns the same 97.30% on average — the house edge is 2.70% (1 in 37) on all of them.', [await BTN('Secondary', 'How fairness works', { lead: 'shield-check' }), await BTN('Primary', 'Back to table', { lead: 'roulette' })]), 'FILL']);
add(C, [await gameTabs('Rules & payouts'), 'FILL']);
const map = await card('Where each bet goes', { title: 'Where each bet goes', icon: 'target', gap: 16, p: 24 }); add(C, [map, 'FILL']);
const mr = AL('HORIZONTAL', { name: 'Felt map row', gap: 24, align: 'CENTER' }); add(map, [mr, 'FILL']);
add(mr, await felt({ cells: { 19: 'Bet placed' }, bets: { 19: '1' }, obets: { 'Col 2': '1', '2nd 12': '1', 'RED': '1' }, marks: [{ type: 'split', a: 17, b: 20, value: '1', label: 'split' }, { type: 'street', a: 31, value: '1', label: 'street' }, { type: 'corner', a: 22, value: '1', label: 'corner' }, { type: 'line', a: 1, value: '1', label: 'line' }] }));
const lg = AL('VERTICAL', { name: 'Felt map legend', gap: 10 }); add(mr, [lg, 'FILL']);
for (const [t, d] of [['Straight 19', 'chip on the number'], ['Split 17 | 20', 'chip on the shared line'], ['Street 31 · 32 · 33', 'chip on the bottom edge of the row'], ['Corner 22 · 23 · 25 · 26', 'chip where the four meet'], ['Line 1 – 6', 'chip on the edge between two rows'], ['2nd column · 2nd dozen · Red', 'chips in the outside boxes']]) { const r = AL('HORIZONTAL', { name: 'Legend — ' + t, gap: 8, align: 'CENTER' }); add(r, await chipI('1', 20), await T(t, 'Body/S Strong', 'text/primary'), await T(d, 'Caption', 'text/tertiary')); add(lg, r); }
const two = AL('HORIZONTAL', { name: 'Payout tables', gap: 24 }); add(C, [two, 'FILL']);
add(two, [await payTable('Inside bets', INSIDE_ROWS, 'Payouts are “to 1”: a 1.00 split that wins returns 18.00 (17.00 winnings + your 1.00).'), 'FILL'], [await payTable('Outside bets', OUTSIDE_ROWS, 'If the ball lands on 0, every outside bet loses. This table has no La Partage or En Prison rule.'), 'FILL']);
const three = AL('HORIZONTAL', { name: 'Rules cards', gap: 24 }); add(C, [three, 'FILL']);
const how = await stepCard('How a spin works', [['Place your bets', 'Per spot 0.10 – 1,000.00 USDT, up to 5,000.00 USDT per spin. Chips can be moved or removed until you press Spin.'], ['Spin', 'Your total stake moves from Available to Locked. The pocket is computed from your seed pair and nonce — the wheel animation only shows it.'], ['Settle', 'Winnings and returned stakes go straight to Available, usually within a second. No fee is taken from winnings.'], ['If you disconnect', 'An accepted spin always settles on the server. You will find it in My bets with the pocket and seeds.']]); add(three, [how, 'FILL']);
const lim = await card('Limits', { title: 'Limits', icon: 'scale', w: 360 }); add(three, lim);
for (const [l, v] of [['Per spot', '0.10 – 1,000.00 USDT'], ['Per spin (table max)', '5,000.00 USDT'], ['Largest single win', '35,000.00 USDT'], ['House edge', '2.70% · every bet'], ['Fees on bets', '0.00 USDT']]) add(lim, [await kv(l, v, { vstyle: 'Body/S Strong' }), 'FILL']);
await wrapT(lim, 'Largest single win = a 1,000.00 USDT straight bet at 35:1.', 'Caption', 'text/tertiary', 300);
const rg = await card('Play within your limits', { title: 'Play within your limits', icon: 'shield', w: 360, right: [await I('6:159')] }); add(three, rg);
await wrapT(rg, 'Roulette has no strategy that beats the house edge — betting systems only change how wins and losses are spread. Set a loss limit before you play; reality checks remind you every 60 minutes.', 'Body/S', 'text/secondary', 300);
const ra = AL('HORIZONTAL', { name: 'Card actions', gap: 8, wrap: true, cgap: 8 }); add(ra, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Get help', { size: 'S', lead: 'help-circle' })); add(rg, [ra, 'FILL']);
add(C, [await compliance(), 'FILL']);
return { f: S.f, notes: { sidebarItem: S.found } };
}
// ===== END ROULETTE KIT =====
const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('RL Roulette', 0, 0);
const OUT = { section: sec.id, frames: {}, before: sec.children.map(n => n.name.slice(0, 60) + ' #' + n.id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' @' + Math.round(n.x) + ',' + Math.round(n.y)) };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
function has(name) { return sec.children.some(n => n.name === name && n.height > 900); }
const N07 = '[RL-07] Rules & payouts / 1440 / Default';
if (!has(N07)) { const R = await mk(N07, 9480, () => buildRules('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped7 = N07;
return OUT;
