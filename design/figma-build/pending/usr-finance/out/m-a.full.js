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
// ===== FIN helpers (usr-finance, mobile subset v2 — continuation 28 Nov 2026) =====
async function setT(root, name, val, i = 0) { const ns = root.findAll(n => n.type === 'TEXT' && n.name === name); const n = ns[i]; if (!n) return false; try { n.characters = String(val); } catch (e) { for (const f of n.getRangeAllFontNames(0, n.characters.length)) await figma.loadFontAsync(f); n.characters = String(val); } return true; }
const ISSUES = []; const OUT = [];
const DEMO_MSG = 'DEMO DATA — illustrative values only';
function slot(sec, x, gapY = 160) { let y = 120; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2) y = Math.max(y, ch.y + ch.height + gapY); return y; }
async function TILE(icon, bg = 'brand/tint', ic = 'icon/brand', s = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, w: s, h: s, align: 'CENTER', justify: 'CENTER' }); add(t, await IC(icon, s >= 40 ? 20 : 16, ic)); return t; }
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const SEC = section('USR — Mobile D', 112000, 0);
async function MOB(name, o = {}) {
  const sec = SEC;
  for (const n of [...sec.children, ...figma.currentPage.children]) if (n.name === name) n.remove();
  const x = 120 + (o.col || 0) * 510; const y = slot(sec, x, 120);
  const f = await screen(name, 390, o.h ? { h: o.h } : {}); if (!o.h) f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y; add(f, [await DEMOBAR(DEMO_MSG), 'FILL']);
  const top = await I('23:12908', { State: 'Member' }); add(f, [top, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', p: [20, 16, 24, 16], gap: 20 }); add(f, [c, 'FILL']);
  return { page, sec, f, top, c };
}
const MTABS = ['All', 'Deposits', 'Withdrawals', 'Fees', 'Rewards', 'Refunds'];
// Header block + full-bleed horizontally scrolling pill tabs, inserted into the screen above Content (scrolled so the active pill is visible)
async function MTOP(c, o) {
  const f = c.parent; const idx = f.children.indexOf(c);
  const hc = AL('VERTICAL', { name: 'Page header', p: [16, 16, 20, 16], gap: 12 });
  add(hc, await BTN('Ghost', 'Financial history', { size: 'S', lead: 'chevron-left' }));
  const hr = AL('HORIZONTAL', { name: 'Heading', gap: 8, align: 'CENTER' }); add(hr, await T(o.title, 'Heading/H3'), await DEMO('M')); add(hc, hr);
  if (o.sub) add(hc, [await T(o.sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  f.insertChild(idx, hc); hc.layoutSizingHorizontal = 'FILL';
  const vp = figma.createFrame(); vp.name = 'Tabs — scrolls horizontally'; vp.fills = []; vp.clipsContent = true;
  const row = AL('HORIZONTAL', { name: 'Tab row', gap: 8, p: [0, 16, 0, 16] }); vp.appendChild(row);
  for (const lab of MTABS) { const t = await I('20:6895', { State: lab === o.tab ? 'Active' : 'Default' }, { Label: lab, 'Show icon': false }); t.name = 'Tab — ' + lab; add(row, t); }
  vp.resize(390, row.height); f.insertChild(idx + 1, vp); vp.layoutSizingHorizontal = 'FILL';
  const act = row.children.find(n => n.name === 'Tab — ' + o.tab); if (act && act.x + act.width > 358) row.x = -Math.round(act.x + act.width - 358);
  return row;
}
const TONE = { in: ['status/success-tint', 'status/success'], out: ['surface/raised', 'icon/default'], fee: ['surface/raised', 'icon/muted'], gold: ['accent/gold-tint', 'icon/gold'], info: ['status/info-tint', 'status/info'], bad: ['status/danger-tint', 'status/danger'], pend: ['status/pending-tint', 'status/pending'] };
async function MCARD(o) {
  const k = AL('VERTICAL', { name: 'Tx card — ' + o.title, fill: o.hl ? 'surface/selected' : 'surface/default', stroke: o.hl ? 'border/brand' : 'border/subtle', r: 14, p: 16, gap: 12 });
  const r1 = AL('HORIZONTAL', { name: 'Top', gap: 12, align: 'CENTER' }); add(k, r1);
  add(r1, await TILE(o.icon, TONE[o.tone][0], TONE[o.tone][1], 40));
  const col = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r1, col);
  add(col, await T(o.title, 'Label/L'), await T(o.sub, 'Caption', 'text/tertiary'));
  const am = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(am, await T(o.amt, 'Number/S', o.ac || 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(r1, am);
  const r2 = AL('HORIZONTAL', { name: 'Meta', gap: 8, align: 'CENTER' }); add(k, r2);
  const b = await BADGE(o.st, 'S'); await setT(b, 'Label', o.stl || o.st); add(r2, b);
  if (o.chain) add(r2, await CHAIN(o.chain, 14));
  const d = await T(o.date, 'Caption', 'text/tertiary'); add(r2, d);
  add(r2, await DEMO('XS'), await IC('chevron-right', 16, 'icon/muted'));
  return k;
}
function mfix(k) { for (const n of k.findAll(x => x.name === 'Top' || x.name === 'Meta')) n.layoutSizingHorizontal = 'FILL'; for (const n of k.findAll(x => x.name === 'Text' && x.type === 'FRAME')) { n.layoutSizingHorizontal = 'FILL'; for (const t of n.children) { t.layoutSizingHorizontal = 'FILL'; } } const m = k.findOne(x => x.name === 'Meta'); if (m) { const d = m.children.find(x => x.type === 'TEXT'); if (d) d.layoutSizingHorizontal = 'FILL'; } }
async function MLIST(c, groups) { for (const [label, cards] of groups) { const g = AL('VERTICAL', { name: 'Group — ' + label, gap: 8 }); add(c, [g, 'FILL']); add(g, await T(label, 'Overline', 'text/tertiary')); for (const o of cards) { const k = await MCARD(o); add(g, [k, 'FILL']); mfix(k); } } }
async function MKPI(label, value, unit, ctx, o = {}) { const k = AL('VERTICAL', { name: 'KPI — ' + label, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 6 }); const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(h, await T(label, 'Caption', 'text/secondary'), await DEMO('XS')); add(k, h); const v = AL('HORIZONTAL', { name: 'Value', gap: 4, align: 'BASELINE' }); add(v, await T(value, o.vs || 'Number/M', o.vc || 'text/primary'), await T(unit, 'Caption', 'text/tertiary')); add(k, v); if (ctx) add(k, await T(ctx, 'Caption', 'text/tertiary')); return k; }
function kfix(k) { for (const t of k.children.filter(x => x.type === 'TEXT')) { t.layoutSizingHorizontal = 'FILL'; } }
async function KROW(c, a, b) { const kr = AL('HORIZONTAL', { name: 'KPIs', gap: 12 }); add(c, [kr, 'FILL']); add(kr, [a, 'FILL'], [b, 'FILL']); kfix(a); kfix(b); a.layoutSizingVertical = 'FILL'; b.layoutSizingVertical = 'FILL'; return kr; }
async function TABBAR(f, active = 'Wallet') { add(f, [await I('22:5413', { Active: active }), 'FILL']); }
async function STICKY(f, btns) { const cta = AL('HORIZONTAL', { name: 'Sticky CTA', p: [12, 16, 12, 16], fill: 'bg/secondary', gap: 12 }); strokeSides(cta, 'border/subtle', { t: 1 }); add(f, [cta, 'FILL']); for (const b of btns) add(cta, [b, 'FILL']); return cta; }
// ===== END FIN helpers =====
const PRE = SEC.children.map(c => ({ n: c.name, id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
// m-a: patch F1 mobile DEMO bars (short message, decision #29) + build F2, F3, F4 mobile (MOB-10)
{ for (const fr of SEC.children.filter(n => n.type === 'FRAME' && n.name.startsWith('MOB-10 · [USR-F1]'))) { const db = fr.children[0]; if (db && db.type === 'INSTANCE') { const key = Object.keys(db.componentProperties).find(k => k.split('#')[0] === 'Message'); if (key) { db.setProperties({ [key]: DEMO_MSG }); OUT.push({ patchedDemoBar: fr.id }); } } } }
{
let R; try {
R = await MOB('MOB-10 · [USR-F2] Withdrawals / 390 / Default', { col: 1 }); const { f, c } = R;
await MTOP(c, { title: 'Withdrawals', tab: 'Withdrawals', sub: 'Sent only to your whitelisted addresses. GLOBAL POOL charges no withdrawal fee; the network fee is shown before you confirm.' });
const tr = AL('VERTICAL', { name: 'In review — WD-20931', fill: 'surface/default', stroke: 'border/default', r: 14, p: 16, gap: 12 }); add(c, [tr, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(tr, [th, 'FILL']); add(th, await TILE('hourglass', 'status/pending-tint', 'status/pending', 40));
const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']); add(tt, [await T('WD-20931 is under review', 'Label/L'), 'FILL'], [await T('1,500.00 USDT → 0x7c4e…a21D · Arbitrum One', 'Caption', 'text/tertiary'), 'FILL']); add(th, await DEMO('XS'));
add(tr, [await T('Routine AML screening for a new destination: this is your first withdrawal to 0x7c4e…a21D since you whitelisted it on 14 Oct 2026. Usually under 4 h — decision expected by 22:44 UTC today. The amount stays Locked until it is sent.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
const fe = AL('VERTICAL', { name: 'Fee breakdown', fill: 'surface/raised', r: 10, p: 12, gap: 6 }); add(tr, [fe, 'FILL']);
for (const [a, b, s] of [['Amount', '1,500.00 USDT'], ['Network fee · Arbitrum', '−0.08 USDT'], ['Platform fee', '0.00 USDT'], ['You receive', '1,499.92 USDT', 1]]) { const r = AL('HORIZONTAL', { name: 'KV — ' + a, gap: 8, align: 'CENTER' }); add(fe, [r, 'FILL']); add(r, [await T(a, s ? 'Body/S Strong' : 'Body/S', s ? 'text/primary' : 'text/secondary'), 'FILL'], await T(b, s ? 'Number/S' : 'Body/S Strong', s ? 'text/primary' : 'text/primary')); }
const st = AL('VERTICAL', { name: 'Status steps', gap: 8 }); add(tr, [st, 'FILL']);
for (const [ic, col, lab, tm] of [['check-circle', 'status/success', 'Risk check · 6 automatic checks', '18:43'], ['check-circle', 'status/success', '2FA confirmed · submitted', '18:44'], ['spinner', 'status/pending', 'Manual AML review', 'by 22:44'], ['clock', 'icon/muted', 'Sent on Arbitrum · 20 confirmations', '—'], ['clock', 'icon/muted', 'Completed', '—']]) { const r = AL('HORIZONTAL', { name: 'Step — ' + lab, gap: 8, align: 'CENTER' }); add(st, [r, 'FILL']); add(r, await IC(ic, 16, col)); add(r, [await T(lab, 'Body/S', col === 'icon/muted' ? 'text/tertiary' : 'text/primary'), 'FILL'], await T(tm, 'Caption', 'text/tertiary')); }
const ta = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(tr, [ta, 'FILL']); add(ta, [await BTN('Secondary', 'Cancel withdrawal', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Track', { size: 'L', trail: 'chevron-right' }), 'FILL']);
add(tr, [await T('You can cancel until it is broadcast. Times in UTC.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
await KROW(c, await MKPI('Withdrawn · lifetime', '11,950.00', 'USDT', '9 completed'), await MKPI('Daily limit used', '1,500.00', '/ 25,000.00', 'KYC Level 2 · resets 00:00 UTC'));
const wc = (id, ch, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'withdraw', tone: 'out', title: id, sub: ch + ' · ' + sub, amt, ac: 'text/danger', st: s, stl: sl, chain: ch, date }, o);
await MLIST(c, [
  ['Today · 27 Nov 2026', [wc('WD-20931', 'Arbitrum', 'you receive 1,499.92', '−1,500.00', 'Under review', 'Under review', '18:44 UTC', { hl: true, tone: 'pend' })]],
  ['November', [wc('WD-20877', 'BNB Chain', 'received 799.88', '−800.00', 'Confirmed', 'Completed', '20 Nov · 10:26 UTC'), wc('WD-20850', 'Arbitrum', 'amount returned to Available', '600.00', 'Rejected', 'Rejected', '18 Nov · 15:02 UTC', { tone: 'bad', ac: 'text/primary' }), wc('WD-20791', 'BNB Chain', 'received 1,999.88', '−2,000.00', 'Confirmed', 'Completed', '13 Nov · 09:41 UTC'), wc('WD-20702', 'BNB Chain', 'received 1,249.88', '−1,250.00', 'Confirmed', 'Completed', '4 Nov · 18:15 UTC')]],
  ['October', [wc('WD-20655', 'Polygon', 'received 899.98', '−900.00', 'Confirmed', 'Completed', '29 Oct · 12:03 UTC')]]
]);
const rj = AL('HORIZONTAL', { name: 'Rejection note', gap: 8, fill: 'status/danger-tint', r: 10, p: 12 }); add(c, [rj, 'FILL']); add(rj, await IC('shield-alert', 16, 'status/danger')); add(rj, [await T('WD-20850 was rejected by sanctions screening and the full 600.00 USDT went back to Available — no fee was charged. Contact support if you think this is a mistake.', 'Caption', 'text/secondary', { w: 300 }), 'FILL']);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 6 of 11 withdrawals', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 5 more', { size: 'L' }), 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await STICKY(f, [await BTN('Primary', 'Withdraw', { size: 'L', lead: 'withdraw' })]);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F2 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F2' });
}
{
let R; try {
R = await MOB('MOB-10 · [USR-F3] Fees / 390 / Default', { col: 2 }); const { f, c } = R;
await MTOP(c, { title: 'Fees', tab: 'Fees', sub: 'The only platform fee is 0.05 USDT per qualifying Global Pool entry. Deposits and withdrawals carry no platform fee; network fees go to the blockchain.' });
const hero = AL('VERTICAL', { name: 'Lifetime platform fees', fill: 'surface/default', stroke: 'border/default', r: 14, p: 20, gap: 12 }); add(c, [hero, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(hh, await T('Platform fees paid · lifetime', 'Overline', 'text/tertiary'), await DEMO('XS')); add(hero, hh);
const hv = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'BASELINE' }); add(hv, await T('64.20', 'Number/L'), await T('USDT', 'Body/M Strong', 'text/secondary')); add(hero, hv);
const eq = AL('HORIZONTAL', { name: 'Equation', gap: 8, align: 'CENTER' }); add(hero, [eq, 'FILL']);
const chip = async (v, l, hl) => { const k = AL('VERTICAL', { name: 'Term — ' + l, fill: hl ? 'brand/tint' : 'surface/raised', r: 10, p: [8, 10, 8, 10], gap: 2 }); add(k, await T(v, 'Number/S', hl ? 'text/brand' : 'text/primary'), await T(l, 'Caption', 'text/tertiary')); return k; };
add(eq, [await chip('1,284', 'entries'), 'FILL'], await T('×', 'Body/M', 'text/tertiary'), [await chip('0.05', 'USDT each'), 'FILL'], await T('=', 'Body/M', 'text/tertiary'), [await chip('64.20', 'USDT', true), 'FILL']);
add(hero, [await T('Always shown as its own line before you confirm. Never added to the prize pool. Reversed automatically if a round is cancelled.', 'Caption', 'text/secondary', { w: 318 }), 'FILL']);
await KROW(c, await MKPI('Round #1,248', '1.75', 'USDT', '35 × 0.05 · in progress'), await MKPI('Last 30 days', '18.45', 'USDT', '369 entries × 0.05'));
const fc = (t, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'receipt', tone: 'fee', title: t, sub, amt, ac: 'text/danger', st: s, stl: sl, date }, o);
await MLIST(c, [
  ['Today · 27 Nov 2026', [fc('WD-20931 · network fee', 'Paid to the Arbitrum network', '−0.08', 'Under review', 'Reserved', '18:44 UTC', { chain: 'Arbitrum' }), fc('Round #1,248 · 35 entries', 'Platform fee · 35 × 0.05', '−1.75', 'Confirmed', 'Charged', '18:05 UTC')]],
  ['This week', [fc('Round #1,247 · 40 entries', 'Platform fee · 40 × 0.05', '−2.00', 'Confirmed', 'Charged', '26 Nov · 12:40 UTC'), fc('Round #1,246 · 24 entries', 'Platform fee · 24 × 0.05', '−1.20', 'Confirmed', 'Charged', '25 Nov · 19:12 UTC'), fc('Round #1,245 · fee reversal', 'Round cancelled · 30 × 0.05', '+1.50', 'Neutral', 'Reversed', '24 Nov · 20:00 UTC', { icon: 'rotate-ccw', tone: 'info', ac: 'text/success' }), fc('Round #1,245 · 30 entries', 'Platform fee · 30 × 0.05', '−1.50', 'Expired', 'Round cancelled', '24 Nov · 14:22 UTC'), fc('DP-77380 · deposit', 'No platform fee on deposits', '0.00', 'Confirmed', 'No fee', '24 Nov · 09:12 UTC', { ac: 'text/primary', chain: 'BNB Chain' })]]
]);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 7 of 196 fee lines', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
const sch = AL('VERTICAL', { name: 'Fee schedule', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 0 }); add(c, [sch, 'FILL']);
add(sch, await T('Fee schedule', 'Heading/H5'));
for (const [a, b] of [['Global Pool entry', '10.00 · 100% to pool'], ['Platform fee', '0.05 per entry'], ['Deposits', '0.00'], ['Withdrawals', '0.00 + network fee'], ['Originals & table games', 'No per-bet fee']]) { const r = AL('HORIZONTAL', { name: 'Fee — ' + a, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { b: 1 }); add(sch, [r, 'FILL']); add(r, [await T(a, 'Body/S', 'text/secondary'), 'FILL'], await T(b, 'Body/S Strong', a === 'Platform fee' ? 'text/brand' : 'text/primary')); }
const nf = await T('Network fees: BNB Chain 0.12 · Polygon 0.02 · Arbitrum 0.08 · Ethereum 2.40 · Solana 0.01 USDT. House edge is disclosed on every game.', 'Caption', 'text/tertiary', { w: 326 }); add(sch, [nf, 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F3 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F3' });
}
{
let R; try {
R = await MOB('MOB-10 · [USR-F4] Rewards / 390 / Default', { col: 3 }); const { f, c } = R;
await MTOP(c, { title: 'Rewards', tab: 'Rewards', sub: 'What you earned, how it was paid and what is still waiting. Rewards never change odds, outcomes or your limits.' });
const cl = AL('VERTICAL', { name: 'Claim — VIP Gold weekly reward', fill: 'surface/default', stroke: 'border/gold', r: 14, p: 16, gap: 12 }); add(c, [cl, 'FILL']);
const ch = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(cl, [ch, 'FILL']); add(ch, await TILE('crown', 'accent/gold-tint', 'icon/gold', 40));
const ct = AL('VERTICAL', { name: 'Text', gap: 2 }); add(ch, [ct, 'FILL']); add(ct, [await T('VIP Gold weekly reward', 'Label/L'), 'FILL'], [await T('Week 16 – 22 Nov · cash, no wagering', 'Caption', 'text/tertiary'), 'FILL']);
const ca = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(ca, await T('115.20', 'Number/M', 'text/gold'), await T('USDT · Owed', 'Caption', 'text/tertiary')); add(ch, ca);
add(cl, [await BTN('Primary', 'Claim 115.20 USDT', { size: 'L', lead: 'gift' }), 'FILL']);
add(cl, [await T('Not claimed? It settles to Available automatically on Mon 30 Nov 2026, 10:00 UTC — you never lose it.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
const cf = AL('HORIZONTAL', { name: 'Terms', gap: 8, align: 'CENTER' }); add(cl, [cf, 'FILL']); add(cf, await DEMO('XS')); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(cf, [sp, 'FILL']); add(cf, await BTN('Ghost', 'Terms apply', { size: 'S' }));
await KROW(c, await MKPI('Earned · lifetime', '1,842.60', 'USDT', '64 cash rewards'), await MKPI('Claimable now', '118.62', 'USDT', 'VIP 115.20 + rakeback 3.42'));
add(c, [await I('30:21644'), 'FILL']);
const rc = (t, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'gift', tone: 'gold', title: t, sub, amt, ac: 'text/success', st: s, stl: sl, date }, o);
await MLIST(c, [
  ['This week · since Mon 23 Nov', [
    rc('Daily reward · day 3', 'Bonus funds · 30× wagering', '+1.00', 'Confirmed', 'Credited', '26 Nov · 00:05 UTC'),
    rc('VIP level-up · Gold III', 'Level 14 · cash, no wagering', '+5.00', 'Confirmed', 'Credited', '25 Nov · 19:32 UTC', { icon: 'crown' }),
    rc('Daily reward · day 2', 'Bonus funds · 30× wagering', '+0.75', 'Confirmed', 'Credited', '25 Nov · 00:06 UTC'),
    rc('Rakeback claim', 'Cash · 5% of house edge', '+2.96', 'Confirmed', 'Credited', '24 Nov · 09:12 UTC', { icon: 'percent' }),
    rc('Daily reward · day 1', 'Bonus funds · 30× wagering', '+0.50', 'Confirmed', 'Credited', '24 Nov · 00:04 UTC'),
    rc('VIP weekly · 16 – 22 Nov', 'Owed · claim or auto-settles 30 Nov', '+115.20', 'Pending', 'Owed', '23 Nov · 10:00 UTC', { icon: 'crown', hl: true, ac: 'text/gold' }),
    rc('VIP weekly · 9 – 15 Nov', 'Cash · moved from Owed to Available', '+108.40', 'Confirmed', 'Auto-settled', '23 Nov · 10:00 UTC', { icon: 'crown' }),
    rc('Weekly cashback', 'Cash · 10% of net losses 16 – 22 Nov', '+12.80', 'Confirmed', 'Credited', '23 Nov · 10:00 UTC', { icon: 'refresh' }),
    rc('Orbit Rush Sprint · rank #9', 'Tournament 16 – 22 Nov · cash', '+75.00', 'Confirmed', 'Credited', '23 Nov · 00:10 UTC', { icon: 'trophy' })]]
]);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 9 of 64 rewards', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
add(c, [await T('Lifetime total counts cash rewards. Bonus funds must be wagered 30× before they can be withdrawn; Global Pool entries contribute 0%. Terms apply to every promotion.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F4 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F4' });
}
return { section: SEC.id, existingBefore: PRE, frames: OUT, issues: ISSUES };
