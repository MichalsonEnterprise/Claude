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
// ===== PUB-04 LIB (agent pub-04 game details) =====
const MISS = [];
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName: text}) -> overrides the first TEXT layer with that exact name (logs misses)
async function O(n, map, tag = '') { const idx = {}; for (const t of n.findAll(x => x.type === 'TEXT')) (idx[t.name] = idx[t.name] || []).push(t); for (const [k, v] of Object.entries(map)) { if (v == null) continue; const t = (idx[k] || [])[0]; if (!t) { MISS.push(tag + ':' + k); continue; } if (t.characters === String(v)) continue; await fnt(t); t.characters = String(v); } return n; }
function nest(n, name) { return n.findOne(x => x.type === 'INSTANCE' && x.name === name); }
function setP(inst, props, tag = '') { if (!inst) { MISS.push('nest:' + tag); return; } try { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; else MISS.push(tag + ':prop ' + k); } if (Object.keys(set).length) inst.setProperties(set); } catch (e) { MISS.push(tag + ':' + String(e.message || e).slice(0, 90)); } }
async function navActive(sb, label) { let hit = false; for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (!cp || !cp.State || !cp.Collapsed) continue; const lk = Object.keys(cp).find(k => k.split('#')[0] === 'Label'); const lab = lk ? cp[lk].value : ''; const isA = cp.State.value === 'Active'; try { if (lab === label) { hit = true; if (!isA) it.setProperties({ State: 'Active' }); } else if (isA) it.setProperties({ State: 'Default' }); } catch (e) { MISS.push('nav:' + lab); } } if (!hit) MISS.push('nav-miss:' + label); }
async function tx(name, chars, style, color, o = {}) { const t = await T(chars, style, color, o); t.name = name; return t; }
// AX = AL() but keeps the axis that was not given a size on HUG (helpers' resize() resets both axes to FIXED)
function AX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function row(name, o = {}) { return AX('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AX('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function card(name, o = {}) { return AX('VERTICAL', { name, p: o.p ?? 24, gap: o.gap ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
// Tile/Game Art component ids (registry-catalog.json _art)
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Orbit Rush Duel': '24:13206', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'High Card': '24:13496', 'Ascend': '24:13528', 'Pool Keno': '24:13564', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Baccarat Lounge': '25:14875', 'Sic Bo Triad': '25:14922', 'Dragon & Phoenix': '25:14961', 'Live Pool Roulette': '27:15060', 'Speed Twenty-One': '27:15096', 'Keno Express 20/80': '27:15267', 'Daily Draw 6/45': '27:15370', 'Bingo 90 Classic': '27:15495' };
const GAMES6 = ['Global Pool', 'Pool Roulette', 'Orbit Rush', 'Pool Dice', 'Double Side', 'Twenty-One'];
const TPL_NAME = 'Template/Game Details';
// ===== END PUB-04 LIB =====
// ===== PUB-04 TEMPLATE BUILDER =====
// Stage compositions per game: angled colour block + mint stripe + Tile/Game Art + concrete library objects cropped by the banner edge.
const STAGE = {
  'Global Pool': { tile: 'Gradient/Tile Gold', o: [
    { id: '23:8534', v: { State: 'Active' }, s: 0.6, r: 9, x: 6, y: 330, n: 'Entry ticket A' },
    { id: '23:8534', v: { State: 'Active' }, s: 0.6, r: -9, x: 246, y: 372, n: 'Entry ticket B' }] },
  'Pool Roulette': { tile: 'Gradient/Tile Red', o: [
    { id: '25:15363', v: { State: 'Idle' }, s: 0.82, r: 0, x: 262, y: 236, n: 'Roulette wheel' },
    { id: '23:12227', v: { Value: '5', State: 'Default' }, s: 1, r: 0, x: 60, y: 330, n: 'Chip 5' },
    { id: '23:12227', v: { Value: '25', State: 'Default' }, s: 1, r: 0, x: 30, y: 372, n: 'Chip 25' },
    { id: '23:12227', v: { Value: '100', State: 'Default' }, s: 1, r: 0, x: 88, y: 392, n: 'Chip 100' }] },
  'Orbit Rush': { tile: 'Gradient/Tile Violet', o: [
    { id: '25:17535', v: { State: 'Running' }, s: 0.62, r: 0, x: 168, y: 300, n: 'Crash curve preview' }] },
  'Pool Dice': { tile: 'Gradient/Tile Sky', o: [
    { id: '24:14917', v: { Face: '5' }, s: 1.5, r: 14, x: 40, y: 318, n: 'Die 5' },
    { id: '24:14917', v: { Face: '3' }, s: 1.3, r: -12, x: 372, y: 352, n: 'Die 3' }] },
  'Double Side': { tile: 'Gradient/Tile Amber', o: [
    { id: '24:14951', v: { Side: 'Heads' }, s: 1.3, r: -12, x: 34, y: 300, n: 'Coin heads' },
    { id: '24:14951', v: { Side: 'Tails' }, s: 1.1, r: 16, x: 362, y: 64, n: 'Coin tails' }] },
  'Twenty-One': { tile: 'Gradient/Tile Mint', o: [
    { id: '24:14880', v: { Suit: 'Spades' }, p: { Rank: 'A' }, s: 1.3, r: 14, x: 26, y: 286, n: 'Card A spades' },
    { id: '24:14880', v: { Suit: 'Hearts' }, p: { Rank: 'K' }, s: 1.3, r: -12, x: 352, y: 300, n: 'Card K hearts' },
    { id: '23:12227', v: { Value: '25', State: 'Default' }, s: 1, r: 0, x: 130, y: 396, n: 'Chip 25' }] },
};
async function stageGroup(key, M, SW, SH, show) {
  const g = figma.createFrame(); g.name = 'Objects — ' + key; g.fills = []; g.clipsContent = false; g.resize(SW, SH);
  const sp = STAGE[key];
  const blk = rect(M ? 300 : 420, M ? 480 : 720, null, 0, 'Angled block'); await gfill(blk, sp.tile); g.appendChild(blk); blk.rotation = 14; blk.x = M ? 168 : 196; blk.y = M ? -70 : -120;
  const str = rect(M ? 12 : 20, M ? 480 : 720, 'brand/primary', 0, 'Accent stripe'); g.appendChild(str); str.rotation = 14; str.x = M ? 140 : 160; str.y = M ? -70 : -120;
  const art = (await figma.getNodeByIdAsync(ART[key])).createInstance(); art.name = 'Hero art — ' + key; g.appendChild(art); art.rescale(M ? 0.92 : 1.5); art.rotation = -6; art.x = M ? 104 : 136; art.y = M ? 22 : 104; await fx(art, 'Elevation/2 — Raised');
  const k = M ? 0.58 : 1, kx = M ? 0.74 : 1, ky = M ? 0.47 : 1;
  for (const o of sp.o) { const i = await I(o.id, o.v || {}, o.p || {}); i.name = o.n; g.appendChild(i); i.rescale(o.s * k); i.rotation = o.r || 0; i.x = Math.round(o.x * kx); i.y = Math.round(o.y * ky); }
  g.visible = !!show; return g;
}
async function chip(name, label, o = {}) { const c = row('Chip — ' + name, { gap: 6, p: [4, 10, 4, 10], fill: o.fill || 'surface/default', r: 9999 }); if (o.stroke) stroke(c, o.stroke); if (o.icon) add(c, await IC(o.icon, 14, o.ic || 'icon/brand')); add(c, await tx(name, label, 'Label/S', o.color || 'text/secondary')); return c; }
async function ctitle(name, label, o = {}) { const r = row(name + ' row', { gap: 8, align: o.w ? 'MIN' : 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, 'icon/brand')); if (o.w) add(r, [await tx(name, label, o.s || 'Heading/H4', 'text/primary', { w: o.w }), 'FILL']); else add(r, await tx(name, label, o.s || 'Heading/H4', 'text/primary')); if (o.demo) { const d = await DEMO(o.demo); d.name = o.demoName || 'DEMO'; add(r, d); if (o.hideDemo) d.visible = false; } return r; }
async function buildTpl(M, g) {
  const W = M ? 358 : 1136, IN = M ? 318 : 704;
  const c = figma.createComponent(); c.name = M ? 'Breakpoint=Mobile' : 'Breakpoint=Desktop';
  c.layoutMode = 'VERTICAL'; c.resize(W, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.fills = []; c.clipsContent = false; gap(c, M ? 20 : 32);
  // 1 top row
  const top = row('Top row', { justify: 'SPACE_BETWEEN' }); add(c, [top, 'FILL']);
  if (M) { const b = row('Back link', { gap: 4 }); add(b, await IC('chevron-left', 20, 'icon/muted'), await tx('Back label', 'Games', 'Label/M', 'text/secondary')); add(top, b); }
  else { const bc = await I('14:1145', { Levels: '3' }); bc.name = 'Breadcrumb'; await O(bc, { 'Crumb 1': 'Games', 'Crumb 2': g.crumb, 'Current page': g.name }, 'bc'); add(top, bc); }
  const lp = row('Live pill', { gap: 8, p: [6, 12, 6, 12], fill: 'surface/default', stroke: 'border/subtle', r: 9999 }); add(lp, ellipse(8, 8, 'status/success', 'Live dot'), await tx('Live players', g.live, 'Label/S', 'text/primary'), await DEMO('XS')); add(top, lp);
  // 2 hero
  const hero = AX(M ? 'VERTICAL' : 'HORIZONTAL', M ? { name: 'Hero', fill: 'surface/raised', stroke: 'border/subtle', r: 20, clip: true } : { name: 'Hero', fill: 'surface/raised', stroke: 'border/subtle', r: 20, clip: true, h: 460 }); add(c, [hero, 'FILL']);
  const SW = M ? 358 : 476, SH = M ? 220 : 460;
  const st = figma.createFrame(); st.name = 'Art stage'; st.fills = []; st.clipsContent = true; st.resize(SW, SH);
  for (const key of GAMES6) st.appendChild(await stageGroup(key, M, SW, SH, key === g.name));
  const cp = AX('VERTICAL', { name: 'Hero copy', gap: 16, p: M ? [20, 20, 24, 20] : [40, 24, 40, 40] }); cp.primaryAxisAlignItems = 'CENTER';
  if (M) { add(hero, [st, 'FILL'], [cp, 'FILL']); } else { add(hero, [cp, 'FILL'], st); cp.layoutSizingVertical = 'FILL'; }
  const chips = row('Hero chips', { gap: 8, wrap: true, cgap: 8 }); add(cp, [chips, 'FILL']);
  add(chips, await chip('Chip category', g.cat, { fill: 'brand/tint', color: 'text/brand' }), await chip('Chip fairness', g.fair, { icon: 'shield-check', stroke: 'border/subtle' }));
  add(cp, await tx('Game name', g.name, M ? 'Heading/H2' : 'Heading/H1', 'text/primary'));
  add(cp, [await tx('Tagline', g.tag, M ? 'Body/M' : 'Body/L', 'text/secondary', { w: M ? 318 : 560 }), 'FILL']);
  const hf = row('Hero facts', { gap: 8, wrap: true, cgap: 8 }); add(cp, [hf, 'FILL']);
  for (let i = 0; i < 3; i++) add(hf, await chip('Hero fact ' + (i + 1), g.hf[i], { fill: 'surface/default', stroke: 'border/default', color: 'text/primary' }));
  add(hf, await DEMO('XS'));
  const ctas = row('Hero CTAs', { gap: 12 }); add(cp, [ctas, 'FILL']);
  const pc = await BTN('Primary', g.cta, { size: 'L', lead: 'play' }); pc.name = 'Play CTA';
  const pg = await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }); pg.name = 'Play CTA gold';
  const hb = await BTN('Secondary', 'How to play', { size: M ? 'M' : 'L' }); hb.name = 'How to play btn';
  const fv = await I('7:774', { Type: 'Secondary', Size: M ? 'M' : 'L', State: 'Default' }, { Icon: ICONS.heart }); fv.name = 'Favourite btn';
  if (M) { const c1 = col('CTA stack', { gap: 12 }); add(ctas, [c1, 'FILL']); add(c1, [pc, 'FILL'], [pg, 'FILL']); const r2 = row('CTA row 2', { gap: 12 }); add(c1, [r2, 'FILL']); add(r2, [hb, 'FILL'], fv); }
  else add(ctas, pc, pg, hb, fv);
  pg.visible = !!g.gold; pc.visible = !g.gold;
  const sm = row('Hero small print', { gap: 8, align: 'MIN' }); add(cp, [sm, 'FILL']); add(sm, await I('6:159'), [await tx('Small print', g.small, 'Caption', 'text/tertiary', { w: M ? 270 : 500 }), 'FILL']);
  // 3 facts
  const fw = col('At a glance', { gap: 12 }); add(c, [fw, 'FILL']);
  const fh = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Facts header', gap: M ? 4 : 16, align: M ? 'MIN' : 'CENTER', justify: M ? 'MIN' : 'SPACE_BETWEEN' }); add(fw, [fh, 'FILL']);
  const fl = row('Facts title row', { gap: 8 }); add(fl, await tx('Facts title', 'At a glance', 'Heading/H5', 'text/primary'), await DEMO('S')); add(fh, fl);
  add(fh, await tx('Facts note', g.fnote, 'Caption', 'text/tertiary', M ? { w: 358 } : {}));
  const grid = row('Facts grid', { gap: 12, wrap: true, cgap: 12, align: 'MIN' }); add(fw, [grid, 'FILL']);
  for (let i = 0; i < 6; i++) { const f = g.facts[i]; const t = AX('VERTICAL', { name: 'Fact ' + (i + 1), gap: 4, p: M ? [12, 14, 12, 14] : [16, 20, 16, 20], fill: 'surface/default', stroke: 'border/subtle', r: 14, w: M ? 173 : 370 }); add(grid, t);
    add(t, await tx(`Fact ${i + 1} label`, f[0], 'Caption', 'text/tertiary'), await tx(`Fact ${i + 1} value`, f[1], M ? 'Number/M' : 'Number/L', 'text/primary'), [await tx(`Fact ${i + 1} sub`, f[2], 'Caption', 'text/secondary', { w: M ? 145 : 330 }), 'FILL']); }
  // 4 body
  let mainC = c, railC = c;
  if (!M) { const body = row('Body', { gap: 24, align: 'MIN' }); add(c, [body, 'FILL']); mainC = col('Main column', { gap: 24 }); railC = col('Rail', { gap: 16, w: 360 }); add(body, [mainC, 'FILL'], railC); }
  // 4a how to play
  const hw = card('How to play', { p: M ? 20 : 24, gap: 20 }); add(mainC, [hw, 'FILL']); add(hw, await ctitle('How to play title', g.howT, { icon: 'play' }));
  const sg = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Steps', gap: M ? 12 : 16, wrap: !M, cgap: 16 }); add(hw, [sg, 'FILL']);
  for (let i = 0; i < 4; i++) { const s = row('Step ' + (i + 1), M ? { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', r: 14 } : { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', r: 14, w: 344 }); if (M) add(sg, [s, 'FILL']); else add(sg, s);
    const n = AX('HORIZONTAL', { name: 'Step num', w: 32, h: 32, r: 9999, fill: 'brand/tint', align: 'CENTER', justify: 'CENTER' }); add(n, await tx(`Step ${i + 1} num`, String(i + 1), 'Label/M', 'text/brand'));
    const sc = col('Step text', { gap: 4 }); add(s, n, [sc, 'FILL']);
    add(sc, [await tx(`Step ${i + 1} title`, g.steps[i][0], 'Body/M Strong', 'text/primary', { w: M ? 234 : 268 }), 'FILL'], [await tx(`Step ${i + 1} body`, g.steps[i][1], 'Body/S', 'text/secondary', { w: M ? 234 : 268 }), 'FILL']); }
  // 4b payouts
  const pw = card('Payouts', { p: M ? 20 : 24, gap: 16 }); add(mainC, [pw, 'FILL']);
  const ph = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Payouts header', gap: 4, align: M ? 'MIN' : 'CENTER', justify: M ? 'MIN' : 'SPACE_BETWEEN' }); add(pw, [ph, 'FILL']);
  add(ph, await ctitle('Payouts title', 'Payouts', { icon: 'coins', demo: 'S', demoName: 'Payout DEMO', hideDemo: !g.payDemo }), await tx('Payout unit', g.punit, 'Caption', 'text/tertiary'));
  const tb = AX('VERTICAL', { name: 'Payout table', fill: 'bg/secondary', stroke: 'border/subtle', r: 10, clip: true }); add(pw, [tb, 'FILL']);
  if (!M) { const hr = AX('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { b: 1 }); add(tb, [hr, 'FILL']);
    const WS = [200, 0, 120, 180]; for (let i = 0; i < 4; i++) { const h = await I('22:8309', { Align: i >= 2 ? 'Right' : 'Left', Sort: 'None' }, { Label: g.hdr[i], 'Show sort icon': false }); h.name = 'Hdr ' + (i + 1); add(hr, h); if (WS[i]) h.resize(WS[i], h.height); else h.layoutSizingHorizontal = 'FILL'; } }
  else { const hr = col('Header rows', { gap: 2, p: [10, 12, 10, 12], fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { b: 1 }); add(tb, [hr, 'FILL']);
    for (const [a, b] of [['Hdr m1', 'Hdr m2'], ['Hdr m3', 'Hdr m4']]) { const r = row('Hdr line', { justify: 'SPACE_BETWEEN' }); add(hr, [r, 'FILL']); const ia = a === 'Hdr m1' ? 0 : 1, ib = a === 'Hdr m1' ? 2 : 3; add(r, await tx(a, g.hdr[ia], 'Overline', 'text/tertiary'), await tx(b, g.hdr[ib], 'Overline', 'text/tertiary')); } }
  for (let i = 0; i < 10; i++) { const p = g.pay[i] || ['—', '—', '—', '—']; const N = i + 1;
    if (!M) { const r = AX('HORIZONTAL', { name: 'Payout row ' + N, align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(tb, [r, 'FILL']);
      const ca = AX('HORIZONTAL', { name: 'Cell bet', p: [12, 16, 12, 16], w: 200 }); add(ca, await tx(`Payout ${N} bet`, p[0], 'Body/S Strong', 'text/primary'));
      const cb = AX('HORIZONTAL', { name: 'Cell covers', p: [12, 16, 12, 16] });
      const cc = AX('HORIZONTAL', { name: 'Cell pays', p: [12, 16, 12, 16], w: 120, justify: 'MAX' }); add(cc, await tx(`Payout ${N} pays`, p[2], 'Number/S', 'text/brand'));
      const cd = AX('HORIZONTAL', { name: 'Cell chance', p: [12, 16, 12, 16], w: 180, justify: 'MAX' }); add(cd, await tx(`Payout ${N} chance`, p[3], 'Body/S Strong', 'text/primary'));
      add(r, ca, [cb, 'FILL'], cc, cd); add(cb, [await tx(`Payout ${N} covers`, p[1], 'Body/S', 'text/secondary', { w: 172 }), 'FILL']); r.visible = i < g.pay.length; }
    else { const r = col('Payout row ' + N, { gap: 4, p: [10, 12, 10, 12] }); strokeSides(r, 'border/subtle', { b: 1 }); add(tb, [r, 'FILL']);
      const l1 = row('Line 1', { justify: 'SPACE_BETWEEN', align: 'MIN' }); add(r, [l1, 'FILL']); add(l1, [await tx(`Payout ${N} bet`, p[0], 'Body/S Strong', 'text/primary', { w: 190 }), 'FILL'], await tx(`Payout ${N} pays`, p[2], 'Number/S', 'text/brand'));
      const l2 = row('Line 2', { justify: 'SPACE_BETWEEN', align: 'MIN' }); add(r, [l2, 'FILL']); add(l2, [await tx(`Payout ${N} covers`, p[1], 'Caption', 'text/secondary', { w: 190 }), 'FILL'], await tx(`Payout ${N} chance`, p[3], 'Caption', 'text/primary'));
      r.visible = i < g.pay.length; } }
  add(pw, [await tx('Payout footnote', g.pfoot, 'Caption', 'text/tertiary', { w: IN }), 'FILL']);
  // 4c rules
  const rw = card('Rules', { p: M ? 20 : 24, gap: 16 }); add(mainC, [rw, 'FILL']); add(rw, await ctitle('Rules title', 'Rules summary', { icon: 'book' }));
  const rl = col('Rule list', { gap: 10 }); add(rw, [rl, 'FILL']);
  for (let i = 0; i < 7; i++) { const r = row('Rule row ' + (i + 1), { gap: 10, align: 'MIN' }); add(rl, [r, 'FILL']); add(r, await IC('check-circle', 16, 'icon/brand'), [await tx('Rule ' + (i + 1), g.rules[i] || '—', 'Body/S', 'text/primary', { w: IN - 26 }), 'FILL']); r.visible = i < g.rules.length; }
  add(rw, [await tx('Rules footnote', g.rfoot, 'Caption', 'text/tertiary', { w: IN }), 'FILL']);
  // 4d provably fair
  const fwr = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Provably fair', gap: 24, p: M ? 20 : 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, align: 'MIN' }); add(mainC, [fwr, 'FILL']);
  const fl2 = col('PF copy', { gap: 12 }); add(fwr, [fl2, 'FILL']);
  add(fl2, [await ctitle('PF title', g.pft, { icon: 'shield-check', s: M ? 'Heading/H5' : 'Heading/H4', w: M ? 286 : 368 }), 'FILL']);
  add(fl2, [await tx('PF body', g.pfb, 'Body/S', 'text/secondary', { w: M ? 318 : 380 }), 'FILL']);
  for (let i = 0; i < 3; i++) { const r = row('PF step row ' + (i + 1), { gap: 10, align: 'MIN' }); add(fl2, [r, 'FILL']); const n = AX('HORIZONTAL', { name: 'PF num', w: 24, h: 24, r: 9999, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER', justify: 'CENTER' }); add(n, await tx('PF num ' + (i + 1), String(i + 1), 'Label/S', 'text/primary')); add(r, n, [await tx('PF step ' + (i + 1), g.pfs[i], 'Body/S', 'text/primary', { w: M ? 284 : 340 }), 'FILL']); }
  const pb = row('PF actions', { gap: 8, wrap: true, cgap: 8 }); add(fl2, [pb, 'FILL']);
  const vb = await BTN('Secondary', g.pfBtn, { size: 'M', lead: 'shield-check' }); vb.name = 'PF verify btn'; const lb = await BTN('Ghost', 'How provably fair works', { size: 'M', trail: 'arrow-right' }); lb.name = 'PF learn btn'; add(pb, vb, lb);
  const pd = col('PF data', M ? { gap: 12, p: 16, fill: 'surface/raised', r: 10 } : { gap: 12, p: 16, fill: 'surface/raised', r: 10, w: 280 }); if (M) add(fwr, [pd, 'FILL']); else add(fwr, pd);
  const pdh = row('PF data header', { gap: 8 }); add(pd, pdh); add(pdh, await tx('PF data title', 'EXAMPLE DATA', 'Overline', 'text/tertiary'), await DEMO('XS'));
  for (let i = 0; i < 3; i++) { const it = col('PF item ' + (i + 1), { gap: 2 }); add(pd, [it, 'FILL']); add(it, await tx('PF key ' + (i + 1), g.pfd[i][0], 'Caption', 'text/tertiary'), [await tx('PF val ' + (i + 1), g.pfd[i][1], 'Mono/S', 'text/primary', { w: M ? 286 : 248 }), 'FILL']); }
  // R1 play / limits card
  const pl = card('Play card', { p: M ? 20 : 24, gap: 16, stroke: 'border/default' }); add(railC, [pl, 'FILL']);
  const plt = row('Rail title row', { gap: 8 }); add(pl, plt); add(plt, await tx('Rail title', g.rt, 'Heading/H5', 'text/primary'), await DEMO('XS'));
  const kv = col('Rail limits', { gap: 10 }); add(pl, [kv, 'FILL']);
  for (let i = 0; i < 5; i++) { const r = row('Rail row ' + (i + 1), { justify: 'SPACE_BETWEEN', gap: 12 }); strokeSides(r, 'border/subtle', { b: i < 4 ? 1 : 0 }); pad(r, 0, 0, i < 4 ? 10 : 0, 0); add(kv, [r, 'FILL']); add(r, await tx('Rail key ' + (i + 1), g.rail[i][0], 'Body/S', 'text/secondary'), await tx('Rail val ' + (i + 1), g.rail[i][1], 'Body/S Strong', 'text/primary')); }
  const fn = row('Fee note', { gap: 8, align: 'MIN', p: 12, fill: 'surface/raised', r: 10 }); add(pl, [fn, 'FILL']); add(fn, await IC('receipt', 16, 'icon/muted'), [await tx('Rail fee', g.fee, 'Caption', 'text/secondary', { w: M ? 270 : 260 }), 'FILL']);
  if (!M) { const rc = await BTN('Primary', g.cta, { size: 'L', lead: 'play' }); rc.name = 'Rail CTA'; const rg = await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }); rg.name = 'Rail CTA gold'; add(pl, [rc, 'FILL'], [rg, 'FILL']); rc.visible = !g.gold; rg.visible = !!g.gold; }
  const rk = row('Risk note', { gap: 8, align: 'MIN' }); add(pl, [rk, 'FILL']); add(rk, await IC('alert-triangle', 16, 'status/warning'), [await tx('Risk text', 'You can lose your stake. Only play with money you can afford to lose.', 'Caption', 'text/primary', { w: 270 }), 'FILL']);
  add(pl, [await tx('Rail eligibility', 'Sign in to play · 18+ only · available in permitted jurisdictions', 'Caption', 'text/tertiary', { w: M ? 318 : 312 }), 'FILL']);
  // R2 live card
  const lc = card('Live card', { p: 20, gap: 12 }); add(railC, [lc, 'FILL']); add(lc, [await ctitle('Live title', g.lt, { s: 'Heading/H5', demo: 'S' }), 'FILL']);
  for (let i = 0; i < 3; i++) { const it = col('Live row ' + (i + 1), { gap: 2 }); add(lc, [it, 'FILL']); add(it, await tx('Live key ' + (i + 1), g.lv[i][0], 'Caption', 'text/tertiary'), [await tx('Live val ' + (i + 1), g.lv[i][1], 'Body/S Strong', 'text/primary', { w: 312 }), 'FILL']); }
  // R3 responsible gaming
  const rgc = card('RG card', { p: 20, gap: 12 }); add(railC, [rgc, 'FILL']);
  const rgt = row('RG title row', { gap: 8, justify: 'SPACE_BETWEEN' }); add(rgc, [rgt, 'FILL']); const rgl = row('RG title', { gap: 8 }); add(rgl, await IC('heart', 20, 'icon/brand'), await tx('RG heading', 'Play responsibly', 'Heading/H5', 'text/primary')); add(rgt, rgl, await I('6:159'));
  add(rgc, [await tx('RG body', 'Set a daily loss limit, get a reality check every 60 minutes, or take a break. Limits apply across every game and the Global Pool.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
  const rgb = row('RG actions', { gap: 8 }); add(rgc, rgb); add(rgb, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause' }));
  add(rgc, [await tx('RG help', 'Need to talk to someone? GamCare · Gamblers Anonymous · BeGambleAware', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  // R4 licence
  const lic = await I('6:158', { Variant: 'Compact' }); lic.name = 'Licence notice'; add(railC, [lic, 'FILL']);
  // 5 related games
  const rel = col('Related games', { gap: 16 }); add(c, [rel, 'FILL']);
  const rh = await I('23:17672', {}, { Title: g.relT, 'Show All': true, 'Show arrows': !!M, 'Show live dot': false }); rh.name = 'Related header'; add(rel, [rh, 'FILL']);
  const trk = row('Related track', { gap: M ? 12 : 16, clip: true, align: 'MIN' }); add(rel, [trk, 'FILL']);
  for (let i = 0; i < 6; i++) { const r = g.rel[i]; const t = await I('28:16529', { State: 'Default' }, { Art: ART[r[0]], Players: r[1], 'Show tag': false, 'House edge': r[2] }); t.name = 'Related ' + (i + 1); add(trk, t); }
  return c;
}
// ===== END PUB-04 TEMPLATE BUILDER =====
const GD = {};
GD.roulette = {
  key: 'roulette', name: 'Pool Roulette', genre: 'Roulette', nav: 'Pool Roulette', crumb: 'Table games', gold: false, tab: 'Games',
  cat: 'TABLE GAME · EUROPEAN', fair: 'Provably fair',
  tag: 'European single-zero roulette with 37 pockets. Place inside and outside bets, spin, and check every result against seeds you can verify yourself.',
  hf: ['House edge 2.70%', 'RTP 97.30%', '0.10–1,000.00 USDT per spot'],
  small: 'You can lose your stake. 18+. Real-money play needs an account in a permitted jurisdiction; operated under an applicable licence (DEMO placeholder).',
  cta: 'Play Pool Roulette', live: '538 playing now',
  fnote: 'Limits are DEMO values. Responsible-gaming limits you set can lower them.',
  facts: [['House edge', '2.70%', 'single zero — 1 in 37 on every bet'], ['Return to player', '97.30%', 'theoretical, over the long run'], ['Min bet', '0.10', 'USDT per spot'], ['Max bet', '1,000.00', 'USDT per spot'], ['Table max', '5,000.00', 'USDT across the table per spin'], ['Top payout', '35 : 1', 'straight up on one number']],
  howT: 'How to play',
  steps: [['Pick a chip', 'Choose a chip from 0.10 to 500. Your balance and the table limits stay visible on the bet slip.'], ['Place your bets', 'Tap numbers for inside bets, or the outer boxes for Red/Black, Odd/Even, 1–18/19–36, dozens and columns. Undo, clear or repeat any time.'], ['Spin', 'Confirm the bet slip. It shows your total stake, the maximum possible payout and the 2.70% house edge.'], ['Collect and verify', 'Winning bets are paid instantly to Available. Open the result to check the seeds behind the spin.']],
  rules: ['European wheel: numbers 1–36 plus a single 0 (37 pockets). There is no double zero.', 'Inside bets: straight, split, street, corner and six line. Outside bets: Red/Black, Odd/Even, 1–18/19–36, dozens and columns.', 'All outside bets lose when the ball lands on 0. La Partage and En Prison are not offered.', 'Limits: 0.10–1,000.00 USDT per spot and 5,000.00 USDT per spin across the table.', 'Bets close when you press Spin. A spin can’t be cancelled once the result is requested.', 'Each spin is fixed before you bet by a committed server seed, your client seed and a nonce — check it afterwards in the verifier.'],
  rfoot: 'Full rules: Help Centre › Pool Roulette rules (v2.1, updated 20 Nov 2026).',
  hdr: ['Bet', 'Covers', 'Pays', 'Win chance'], payDemo: false,
  punit: 'Pays = winnings to 1, plus your stake back',
  pay: [['Straight up', '1 number', '35 : 1', '2.70%'], ['Split', '2 adjacent numbers', '17 : 1', '5.41%'], ['Street', '3 numbers in a row', '11 : 1', '8.11%'], ['Corner', '4 numbers in a square', '8 : 1', '10.81%'], ['Six line', '6 numbers (2 rows)', '5 : 1', '16.22%'], ['Dozen', '1–12, 13–24 or 25–36', '2 : 1', '32.43%'], ['Column', '12 numbers in a column', '2 : 1', '32.43%'], ['Red / Black', '18 numbers', '1 : 1', '48.65%'], ['Odd / Even', '18 numbers', '1 : 1', '48.65%'], ['1–18 / 19–36', '18 numbers', '1 : 1', '48.65%']],
  pfoot: 'House edge is 2.70% on every bet (1/37). Win chance = numbers covered ÷ 37. Past spins never change the odds of the next one.',
  pft: 'Provably fair — check every spin',
  pfb: 'Before you bet we show a hash of the server seed. The pocket is derived from that seed, your client seed and the spin’s nonce, so the result is fixed in advance and can’t be changed after you place chips.',
  pfs: ['Commit — the server seed hash is shown before you place chips.', 'Spin — the pocket (0–36) comes from server seed + client seed + nonce.', 'Verify — rotate your seed to reveal it and recompute any past spin.'],
  pfd: [['Server seed hash', '8f3c1e…e813'], ['Client seed · nonce', 'nova-k-2711 · 417'], ['Last result', '19 Red · spin PR-88,190']],
  pfBtn: 'Verify a spin',
  rt: 'Play Pool Roulette',
  rail: [['House edge', '2.70%'], ['RTP', '97.30%'], ['Bet per spot', '0.10–1,000.00 USDT'], ['Table max', '5,000.00 USDT / spin'], ['Max payout', '35 : 1 (straight up)']],
  fee: 'No extra fee per bet — the 2.70% house edge is the only cost. Bets use your platform balance (network fee 0.00 USDT).',
  lt: 'At the table now',
  lv: [['Players', '538 playing now'], ['Last 50 spins', '23 red · 23 black · 4 zero'], ['Last result', '19 Red — spin PR-88,190']],
  relT: 'More table games',
  rel: [['Live Pool Roulette', '412', 'House edge 2.70%'], ['Twenty-One', '347', 'House edge ≈0.50%'], ['Baccarat Lounge', '129', 'House edge 1.06% banker'], ['Sic Bo Triad', '44', 'House edge 2.78%'], ['Dragon & Phoenix', '57', 'House edge 3.73%'], ['Fortune Ring', '34', 'House edge 1.00%']],
  barK: 'House edge 2.70% · RTP 97.30%', barV: '0.10–1,000.00 USDT per spot'
};
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 Game Details', 40000, 0);
const nb = page.children.filter(n => n !== sec && n.x < 54000 && n.x + n.width > 40000).map(n => n.name + ' x' + Math.round(n.x) + '..' + Math.round(n.x + n.width) + ' y' + Math.round(n.y));
let set = sec.findOne(x => x.type === 'COMPONENT_SET' && x.name === TPL_NAME);
const REBUILD = false;
if (set && REBUILD) { set.remove(); set = null; }
for (const o of sec.children.filter(c => c.type === 'COMPONENT' && c.name.startsWith('Breakpoint='))) o.remove();
let built = false;
if (!set) {
  const cD = await buildTpl(false, GD.roulette); sec.appendChild(cD);
  const cM = await buildTpl(true, GD.roulette); sec.appendChild(cM);
  set = figma.combineAsVariants([cD, cM], sec); set.name = TPL_NAME; built = true;
  set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.counterAxisAlignItems = 'MIN'; gap(set, 48); pad(set, 24); fill(set, 'surface/default'); radius(set, 14);
  set.description = "Game Details page template (PUB-04). Variants: Breakpoint=Desktop (1136 content column inside the casino shell: Shell/Sidebar 240 + Shell/Topbar Desktop + Shell/Footer Mega) and Breakpoint=Mobile (358 content inside a 390 frame with Shell/Topbar Mobile, a sticky CTA bar and Nav/Mobile Tab Bar).\n\nAnatomy: breadcrumb + live players pill (DEMO) · hero (category + fairness chips, game name, tagline, house edge / RTP / limits chips + DEMO, Play CTA, How to play, favourite, 18+ + 'You can lose your stake' + licence small print) with an art stage holding one 'Objects — <game>' group per game (angled Gradient/Tile block, mint stripe, Tile/Game Art, concrete library objects cropped by the banner edge — no glows, rings or particles) · At a glance (6 fact tiles, Number/L) · How to play (4 steps) · Payouts (≤10 rows; desktop table with Table/Header Cell, mobile stacked rows) · Rules summary (≤7) · Provably fair (3 steps + example data, DEMO) · Play card (limits, fee note, CTA, risk line, eligibility) · Live card (DEMO) · Play responsibly card (18+, limits, break, help organisations) · Notice/Licence · Related games (6 Tile/Game Generic).\n\nPer game: override TEXT layers by name (Game name, Tagline, Chip category/fairness, Hero fact n, Fact n label/value/sub, Step n title/body, Payout n bet/covers/pays/chance, Rule n, PF title/body/step n/key n/val n, Rail title/key n/val n/fee, Live title/key n/val n, Small print, Facts note, Payout unit/footnote, Rules footnote); toggle 'Payout row n' and 'Rule row n' visibility; show exactly one 'Objects — <game>' group; for Global Pool hide 'Play CTA'/'Rail CTA' and show the Gold pair 'Play CTA gold'/'Rail CTA gold'; set Label on 'Hdr n' (desktop) or text 'Hdr m1–m4' (mobile); set Art / Players / House edge on 'Related n'; set Title on 'Related header'; show 'Payout DEMO' when amounts are illustrative.\n\nDev notes: house edge, RTP, limits, payouts and rules come from the game config API (GET /games/{slug}); limits are per account and may be lowered by the player's RG limits; live players via WebSocket presence (DEMO); Global Pool figures (pool, entries, close time) stream from the round service and the countdown is derived from the real close time only. Never pre-select a bet side; never hide fees or odds.";
}
set.x = 120; set.y = 320;
let hd = sec.findOne(x => x.name === 'Doc/PUB-04 header');
if (!hd) { hd = col('Doc/PUB-04 header', { gap: 8 }); sec.appendChild(hd); hd.x = 120; hd.y = 80; add(hd, await T('PUB-04 Game Details — template + 6 game pages', 'Heading/H2', 'text/primary'), await T('Left: the Template/Game Details component set (Desktop 1136 + Mobile 358). Right: six 1440 pages built as instances with per-game overrides — Global Pool (Global Jackpot), Pool Roulette, Orbit Rush (Crash), Pool Dice, Double Side (Coinflip), Twenty-One (Blackjack). Mobile 390 frames live on page 10 › PUB-04 — Mobile.', 'Body/M', 'text/secondary', { w: 1500 })); }
fitSection(sec);
const vD = set.children.find(c => c.name === 'Breakpoint=Desktop'), vM = set.children.find(c => c.name === 'Breakpoint=Mobile');
await vD.screenshot({ scale: 0.5 });
await vM.screenshot({ scale: 0.5 });
return { sec: sec.id, set: set.id, built, desktop: vD.id, mobile: vM.id, sizeD: [Math.round(vD.width), Math.round(vD.height)], sizeM: [Math.round(vM.width), Math.round(vM.height)], header: hd.id, nb, MISS: MISS.slice(0, 60) };
