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
// ===== PROMO-01 Promotions hub / 390 / Member (page 10, section 'PROMO — Mobile') — idempotent =====
// Also returns a read-only inventory of the three PROMO sections (by id, other pages included) for the continuation check.
const inventory = {};
for (const sid of ['32:117004', '34:326636', '71:46775']) {
  try { const s = await figma.getNodeByIdAsync(sid); inventory[sid] = s ? { name: s.name, w: Math.round(s.width), h: Math.round(s.height), frames: s.children.map(c => [c.id, c.name, Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height), c.primaryAxisSizingMode || '-']) } : 'MISSING'; } catch (e) { inventory[sid] = 'ERR ' + e.message; }
}
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PROMO — Mobile', 238000, 0);
const NAME = '[PROMO-01] Promotions hub / 390 / Member';
const existing = sec.children.find(c => c.name === NAME);
if (existing) return { skipped: 'exists', id: existing.id, inventory };
const guest = sec.children.find(c => c.name.startsWith('[PROMO-01] Promotions hub / 390'));
let X = guest ? guest.x : nextX(sec), Y = 120;
if (guest) { let m = 0; for (const c of sec.children) if (c.x < guest.x + guest.width && c.x + c.width > guest.x) m = Math.max(m, c.y + c.height); Y = m + 160; }
const CAT = { 'daily-reward': '23:15183', mission: '23:15159', rakeback: '23:15167', cashback: '23:15176', tournament: '23:15151', bonus: '23:15195', flame: '23:15189' };
async function GI(name, size = 20, color = 'icon/default') { const c = await figma.getNodeByIdAsync(CAT[name]); const i = c.createInstance(); i.resize(size, size); tint(i, color); i.name = 'Icon/' + name; return i; }
async function tile(iconNode, bg = 'surface/raised', size = 44) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, align: 'CENTER', justify: 'CENTER', w: size, h: size }); add(t, iconNode); return t; }
async function link(txt) { const t = await T(txt, 'Label/S', 'text/brand'); t.textDecoration = 'UNDERLINE'; return t; }

const f = await screen(NAME, 390, { x: X, y: Y });
sec.appendChild(f); f.x = X; f.y = Y;
const demo = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [demo, 'FILL']);
const top = await I('23:12908', { State: 'Member' }); add(f, [top, 'FILL']);

const body = AL('VERTICAL', { name: 'Content', gap: 24, p: [20, 16, 32, 16] }); add(f, [body, 'FILL']);

// --- Page header
const hdr = AL('VERTICAL', { name: 'Page header', gap: 6 }); add(body, [hdr, 'FILL']);
const ov = AL('HORIZONTAL', { name: 'Overline row', gap: 8, align: 'CENTER' }); add(hdr, ov);
add(ov, await T('PROMOTIONS', 'Overline', 'text/brand'), await DEMO('S'));
add(hdr, await T('Your rewards, Nova', 'Heading/H3', 'text/primary'));
const sub = await T('Everything you can claim right now. Cash rewards go to Available; bonus funds stay in a separate Bonus balance.', 'Body/S', 'text/secondary', { w: 358 }); add(hdr, [sub, 'FILL']);

// --- Ready to claim card (angled mint block, cropped coins)
const card = AL('VERTICAL', { name: 'Ready to claim', gap: 16, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true }); add(body, [card, 'FILL']);
const blk = rect(220, 120, 'brand/tint', 0, 'Angled block'); card.appendChild(blk); blk.layoutPositioning = 'ABSOLUTE'; blk.rotation = -18; blk.x = 230; blk.y = -40;
const ch = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(card, [ch, 'FILL']);
add(ch, await IC('gift', 20, 'icon/brand'));
const cht = await T('Ready to claim', 'Heading/H5', 'text/primary'); add(ch, [cht, 'FILL']); add(ch, await DEMO('S'));
const big = AL('VERTICAL', { name: 'Total', gap: 2 }); add(card, [big, 'FILL']);
add(big, await T('Cash rewards', 'Label/M', 'text/secondary'));
add(big, await T('118.62 USDT', 'Number/L', 'text/primary'));
const bc = await T('+ 1.50 USDT in bonus funds (daily streak, day 4)', 'Caption', 'text/tertiary', { w: 326 }); add(big, [bc, 'FILL']);
const dv = rect(326, 1, 'border/subtle', 0, 'Divider'); add(card, [dv, 'FILL']);
const rows = [
  ['coins', 'icon/gold', 'VIP Gold weekly reward', '16–22 Nov · auto-settles Mon 30 Nov, 10:00 UTC', '115.20', 'to Available', 'text/primary'],
  ['rakeback', 'icon/brand', 'Rakeback', '5% of house edge · claim anytime', '3.42', 'to Available', 'text/primary'],
  ['daily-reward', 'icon/brand', 'Daily reward — day 4 of 7', 'Next reset 00:00 UTC · streak 3 days', '1.50', 'bonus funds', 'text/warning'],
];
for (const [ic, col, t1, t2, amt, bucket, bcol] of rows) {
  const r = AL('HORIZONTAL', { name: 'Reward — ' + t1, gap: 12, align: 'CENTER' }); add(card, [r, 'FILL']);
  const icn = CAT[ic] ? await GI(ic, 20, col) : await IC(ic, 20, col);
  add(r, await tile(icn, 'surface/raised', 44));
  const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']);
  const a = await T(t1, 'Label/L', 'text/primary', { w: 170 }); add(c, [a, 'FILL']);
  const b = await T(t2, 'Caption', 'text/tertiary', { w: 170 }); add(c, [b, 'FILL']);
  const v = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(r, v);
  add(v, await T(amt + ' USDT', 'Number/S', 'text/primary', { align: 'RIGHT' }), await T(bucket, 'Caption', bcol, { align: 'RIGHT' }));
}
const b1 = await BTN('Primary', 'Claim 118.62 USDT to Available', { size: 'L', lead: 'check' }); add(card, [b1, 'FILL']);
const b2 = await BTN('Secondary', 'Claim day 4 · 1.50 USDT bonus', { size: 'L' }); add(card, [b2, 'FILL']);
const fine = AL('HORIZONTAL', { name: 'Fine print', gap: 4, wrap: true, cgap: 4 }); add(card, [fine, 'FILL']);
const fp = await T('Cash rewards have no wagering and can be withdrawn. Bonus funds unlock after 30× wagering.', 'Caption', 'text/tertiary', { w: 326 }); add(fine, [fp, 'FILL']);
add(fine, await link('Terms apply'));

// --- Bonus balance (separate from real balance)
const bh = AL('HORIZONTAL', { name: 'Section header — Bonus', gap: 8, align: 'CENTER' }); add(body, [bh, 'FILL']);
const bht = await T('Welcome bonus — active', 'Heading/H5', 'text/primary'); add(bh, [bht, 'FILL']); add(bh, await BADGE('Live', 'S'));
const bb = await I('32:23192'); add(body, [bb, 'FILL']);

// --- Progress: mission + tournament
const ph = AL('HORIZONTAL', { name: 'Section header — Progress', gap: 8, align: 'CENTER' }); add(body, [ph, 'FILL']);
const pht = await T('This week', 'Heading/H5', 'text/primary'); add(ph, [pht, 'FILL']); add(ph, await link('Missions'));
const ms = await I('30:21643', { Progress: '50' }); add(body, [ms, 'FILL']);
const tn = await I('31:22554'); add(body, [tn, 'FILL']);

// --- All promotions (stacked rows, full-row tap targets)
const ah = AL('HORIZONTAL', { name: 'Section header — All', gap: 8, align: 'CENTER' }); add(body, [ah, 'FILL']);
const aht = await T('All promotions', 'Heading/H5', 'text/primary'); add(ah, [aht, 'FILL']); add(ah, await T('7 offers', 'Caption', 'text/tertiary'));
const list = AL('VERTICAL', { name: 'Promotions list', fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true }); add(body, [list, 'FILL']);
const promos = [
  ['bonus', 'icon/brand', 'Welcome offer', '100% up to 500 USDT · 30× wagering · 14 days · min deposit 20 USDT', 'Active · 42.8% wagered', 'text/success'],
  ['daily-reward', 'icon/brand', 'Daily rewards', '7-day streak · 0.50–5.00 USDT bonus funds · resets 00:00 UTC', 'Day 4 ready', 'text/success'],
  ['mission', 'icon/brand', 'Missions', 'Weekly tasks · e.g. 50 Orbit Rush rounds → 2.00 USDT', '25 / 50 rounds', 'text/secondary'],
  ['rakeback', 'icon/brand', 'Rakeback', '5% of house edge back · claim anytime · no wagering', '3.42 USDT ready', 'text/success'],
  ['cashback', 'icon/brand', 'Weekly cashback', '10% of net losses · paid Mon 30 Nov 2026, 10:00 UTC', 'Last: 12.80 USDT', 'text/secondary'],
  ['tournament', 'icon/gold', 'Orbit Rush Sprint', '2,500.00 USDT prize pool · top 20 paid · ends Sun 29 Nov 2026, 23:59 UTC', 'You: #14 · 1,284 pts', 'text/secondary'],
  ['crown', 'icon/gold', 'VIP level-up rewards', 'Gold IV pays 8.00 USDT · no wagering', '1,160 pts to go', 'text/secondary'],
];
let i = 0;
for (const [ic, col, t1, t2, st, stc] of promos) {
  const r = AL('HORIZONTAL', { name: 'Promo row — ' + t1, gap: 12, p: [14, 16, 14, 16], align: 'CENTER' }); add(list, [r, 'FILL']);
  if (i++ < promos.length - 1) strokeSides(r, 'border/subtle', { b: 1 });
  const icn = CAT[ic] ? await GI(ic, 22, col) : await IC(ic, 22, col);
  add(r, await tile(icn, col === 'icon/gold' ? 'accent/gold-tint' : 'brand/tint', 44));
  const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(r, [c, 'FILL']);
  const a = await T(t1, 'Label/L', 'text/primary', { w: 230 }); add(c, [a, 'FILL']);
  const b = await T(t2, 'Caption', 'text/tertiary', { w: 230 }); add(c, [b, 'FILL']);
  const m = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER', wrap: true, cgap: 4 }); add(c, [m, 'FILL']);
  add(m, await T(st, 'Label/S', stc), await T('·', 'Caption', 'text/tertiary'), await link('Terms apply'));
  add(r, await IC('chevron-right', 20, 'icon/muted'));
}

// --- RG + licence
const rg = AL('VERTICAL', { name: 'Responsible gaming', gap: 12, p: 16, fill: 'bg/secondary', stroke: 'border/subtle', r: 14 }); add(body, [rg, 'FILL']);
const rr = AL('HORIZONTAL', { name: 'RG row', gap: 12, align: 'MIN' }); add(rg, [rr, 'FILL']);
add(rr, await IC('shield', 20, 'icon/brand'));
const rt = await T('Promotions never change your odds, limits or withdrawal checks. You can opt out of bonus offers or set deposit, loss and time limits at any time.', 'Body/S', 'text/secondary', { w: 290 }); add(rr, [rt, 'FILL']);
const rl = AL('HORIZONTAL', { name: 'RG links', gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); add(rg, [rl, 'FILL']);
add(rl, await I('6:159'), await link('Set limits'), await link('Responsible gaming'), await link('Promotion terms'));
const lic = await I('6:158', { Variant: 'Compact' }); add(body, [lic, 'FILL']);

const foot = await I('23:17478', { Breakpoint: 'Mobile' }); add(f, [foot, 'FILL']);
const tab = await I('22:5413', { Active: 'Home' }); add(f, [tab, 'FILL']);
fitSection(sec);
const shot = await body.screenshot({ scale: 1 });
return { created: { [NAME]: f.id }, section: sec.id, frame: { x: f.x, y: f.y, w: f.width, h: Math.round(f.height) }, content: { h: Math.round(body.height) }, inventory };
