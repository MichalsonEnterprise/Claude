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
async function sidebar(activeName, collapsed) { const sb = await I('23:6697', { State: collapsed ? 'Collapsed' : 'Expanded', Auth: 'Member' }); sb.name = 'Shell/Sidebar'; let found = false; for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { const p = it.componentProperties; const st = p.State && p.State.value; if (it.name === 'Item/' + activeName) { found = true; it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } return { sb, found }; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
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
async function pageHeader(title, sub, actions) {
const h = AL('HORIZONTAL', { name: 'Page header', gap: 16, align: 'CENTER' });
const th = await I('24:13443'); th.rescale(0.35); th.name = 'Tile/Game Art — Pool Dice (thumb)'; add(h, th);
const col = AL('VERTICAL', { name: 'Title', gap: 6 }); add(h, col); grow(col);
const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'Pool Dice', 'Current page': title }); add(col, bc);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, 'Heading/H2', 'text/primary', { name: 'Page title' }), await DEMO('M')); add(col, tr);
await wrapT(col, sub, 'Body/M', 'text/secondary', 640, { name: 'Page subtitle' });
const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' }); for (const a of actions) add(act, a); add(h, act);
return h;
}
async function gameTabs(active) {
const bar = AL('HORIZONTAL', { name: 'Game tabs', gap: 4 }); strokeSides(bar, 'border/subtle', { b: 1 });
for (const l of ['Play', 'My rolls', 'Fairness', 'Rules & payouts']) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': false }); t.name = 'Tab — ' + l; add(bar, t); }
return bar;
}
async function statTile(label, value, sub, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Overline', 'text/tertiary')); addSpacer(lr); add(lr, await DEMO('XS')); add(t, [lr, 'FILL']); const vr = AL('HORIZONTAL', { name: 'Stat value row', gap: 8, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 20, o.iconColor || 'icon/muted')); add(vr, await T(value, o.style || 'Number/L', o.color || 'text/primary', { name: 'Stat value' })); add(t, vr); await wrapT(t, sub, 'Caption', 'text/secondary', 200, { name: 'Stat sub' }); return t; }
async function filterChip(label, sel) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Filter — ' + label; return c; }
const MY_ROLLS = [['D-88214', '18:42:33', '10.00', 'Over 50.50', '49.50%', '2.0000×', '31.07', false, '−10.00'], ['D-88213', '18:42:07', '10.00', 'Over 50.50', '49.50%', '2.0000×', '73.21', true, '+10.00'], ['D-88212', '18:41:12', '10.00', 'Over 50.50', '49.50%', '2.0000×', '61.08', true, '+10.00'], ['D-88211', '18:40:48', '10.00', 'Over 50.50', '49.50%', '2.0000×', '18.77', false, '−10.00'], ['D-88210', '18:40:21', '10.00', 'Under 25.00', '25.00%', '3.9600×', '44.02', false, '−10.00'], ['D-88209', '18:39:57', '10.00', 'Under 25.00', '25.00%', '3.9600×', '9.15', true, '+29.60'], ['D-88208', '18:39:30', '10.00', 'Over 66.00', '34.00%', '2.9118×', '70.44', true, '+19.11'], ['D-88207', '18:39:02', '10.00', 'Over 66.00', '34.00%', '2.9118×', '52.86', false, '−10.00'], ['D-88206', '18:38:41', '10.00', 'Over 50.50', '49.50%', '2.0000×', '50.12', false, '−10.00'], ['D-88205', '18:38:15', '10.00', 'Over 50.50', '49.50%', '2.0000×', '96.30', true, '+10.00']];
const MY_COLS = [['Roll ID', 140, 'L'], ['Time (UTC)', 120, 'L'], ['Bet', 110, 'R'], ['Target', 150, 'L'], ['Win chance', 120, 'R'], ['Multiplier', 120, 'R'], ['Roll', 150, 'L'], ['Profit', 0, 'R'], ['Verify', 110, 'L']];
async function renderMine(r, cols) {
const [id, time, bet, tgt, ch, mult, roll, win, prof] = r; const out = [];
const c0 = await cellBox(cols[0][1], 'L', 'Roll ID'); add(c0, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); out.push(c0);
const c1 = await cellBox(cols[1][1], 'L', 'Time'); add(c1, await T(time, 'Body/S', 'text/secondary')); out.push(c1);
const c2 = await cellBox(cols[2][1], 'R', 'Bet'); add(c2, await T(bet, 'Number/S', 'text/primary')); out.push(c2);
const c3 = await cellBox(cols[3][1], 'L', 'Target'); add(c3, await IC(tgt.indexOf('Under') === 0 ? 'chevron-down' : 'chevron-up', 14, 'icon/muted'), await T(tgt, 'Body/S', 'text/secondary')); out.push(c3);
const c4 = await cellBox(cols[4][1], 'R', 'Win chance'); add(c4, await T(ch, 'Number/S', 'text/secondary')); out.push(c4);
const c5 = await cellBox(cols[5][1], 'R', 'Multiplier'); add(c5, await T(mult, 'Number/S', 'text/secondary')); out.push(c5);
const c6 = await cellBox(cols[6][1], 'L', 'Roll'); add(c6, await IC(win ? 'check-circle' : 'x-circle', 16, win ? 'icon/brand' : 'status/danger'), await T(roll, 'Number/S', 'text/primary'), await T(win ? 'Win' : 'Lose', 'Caption', win ? 'text/brand' : 'text/danger')); out.push(c6);
const c7 = await cellBox(cols[7][1], 'R', 'Profit'); add(c7, await T(prof + ' USDT', 'Number/S', win ? 'text/success' : 'text/danger')); out.push(c7);
const c8 = await cellBox(cols[8][1], 'L', 'Verify'); add(c8, await IC('shield-check', 14, 'icon/brand'), await T('Verify', 'Label/S', 'text/brand')); out.push(c8);
return out;
}
async function sessionCard(o = {}) {
const c = AL('VERTICAL', { name: 'Session & limits', gap: 14, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle', w: o.w || 360 });
const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await IC('shield', 20, 'icon/brand'), await T('Session & limits', 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await I('6:159')); add(c, [hd, 'FILL']);
for (const [l, v] of [['Session time', o.timer || '00:42:18'], ['Net this session', o.net || '−24.60 USDT'], ['Reality check', 'every 60 min · next 19:00 UTC']]) add(c, [await kv(l, v, { vstyle: 'Body/S Strong', demo: true }), 'FILL']);
const ll = AL('VERTICAL', { name: 'Loss limit', gap: 6 }); add(ll, [await kv('Daily loss limit', o.lim || '24.60 / 200.00 USDT', { vstyle: 'Body/S Strong', demo: true }), 'FILL']);
const tr = AL('HORIZONTAL', { name: 'Meter', h: 6, r: 9999, fill: 'border/default', clip: true }); add(ll, [tr, 'FILL']); add(tr, rect(Math.max(4, Math.round((o.w || 360) * 0.84 * (o.pct || 0.12))), 6, o.danger ? 'status/danger' : 'status/info', 0, 'Meter fill'));
add(ll, await T('Resets 28 Nov 2026, 00:00 UTC · lowering a limit applies now, raising it after 24 h', 'Caption', 'text/tertiary', { name: 'Limit note', w: 300 })); add(c, [ll, 'FILL']);
const a = AL('HORIZONTAL', { name: 'Card actions', gap: 8 }); add(a, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause-circle' })); add(c, a);
return c;
}
async function buildHistory(name, x, y) {
const S = await shellD(name, 1440, x, y, {}); const C = S.C;
add(C, [await pageHeader('My rolls', 'Every Pool Dice roll you made, with the seeds and nonce needed to verify it. Times are UTC.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Primary', 'Back to game', { lead: 'dice' })]), 'FILL']);
add(C, [await gameTabs('My rolls'), 'FILL']);
const k = AL('HORIZONTAL', { name: 'KPIs — today', gap: 16 }); add(C, [k, 'FILL']);
add(k, [await statTile('ROLLS TODAY', '36', '17 wins · 19 losses · 27 Nov 2026 (UTC)'), 'FILL'], [await statTile('WAGERED', '360.00 USDT', 'Average bet 10.00 USDT'), 'FILL'], [await statTile('PAID OUT', '335.40 USDT', 'Stakes returned on winning rolls'), 'FILL'], [await statTile('NET RESULT', '−24.60 USDT', 'Matches your session bar · loss limit 200.00/day', { color: 'text/danger', icon: 'trending-down', iconColor: 'status/danger' }), 'FILL']);
const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, align: 'CENTER' }); add(C, [fr, 'FILL']);
for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false]]) add(fr, await filterChip(l, s));
add(fr, rect(1, 24, 'border/default', 0, 'Divider'));
for (const [l, s] of [['All results', true], ['Wins', false], ['Losses', false]]) add(fr, await filterChip(l, s));
addSpacer(fr); add(fr, await T('Showing 10 of 36 rolls', 'Caption', 'text/tertiary'));
const tb = await rollsTable(MY_ROLLS, { name: 'My rolls table', title: 'Today · newest first', tabs: [], cols: MY_COLS, renderRow: renderMine }); add(C, [tb, 'FILL']);
const pg = await I('23:16756', { Type: 'Load more' }); pg.name = 'Pagination'; add(tb, pg); tryFill(pg); const pgN = await repl(pg, { '1–20 of 1,284 transactions': '1–10 of 36 rolls today', '1,284': '36', 'transactions': 'rolls', 'Load 20 more': 'Load 10 more' }, true);
const low = AL('HORIZONTAL', { name: 'Distribution & limits', gap: 24 }); add(C, [low, 'FILL']);
const hc = AL('VERTICAL', { name: 'Result distribution', gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); add(low, [hc, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hh, await T('Result distribution — last 1,000 rolls, all players', 'Heading/H5', 'text/primary')); addSpacer(hh); add(hh, await DEMO('S')); add(hc, [hh, 'FILL']);
const hist = await I('30:17260', { State: 'Default' }); hist.name = 'Chart/Histogram'; add(hc, hist); tryFill(hist);
await wrapT(hc, 'Each roll is independent: 0.00 – 99.99 are equally likely every time. Streaks in a short run are normal and never predict the next result.', 'Caption', 'text/tertiary', 600, { name: 'Independence note' });
add(low, await sessionCard());
add(C, [await compliance(), 'FILL']);
return { f: S.f, notes: { sidebarItem: S.found, pgN } };
}
// ===== END DICE KIT =====
const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('DI Dice & GM-01', 32000, 0);
const OUT = { section: sec.id, frames: {} };
async function mk(name, X, build, Y) { dropByName(sec, name); const y = Y != null ? Y : colY(sec, X); const R = await build(); R.f.name = name; sec.appendChild(R.f); R.f.x = X; R.f.y = y; fitSection(sec); OUT.frames[name] = { id: R.f.id, h: Math.round(R.f.height), y, notes: R.notes }; return R; }
{ const R = await mk('[DI-05] History / 1440 / My rolls — today', 6360, () => buildHistory('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); }
return OUT;
