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

// ===== KYC MOBILE LIB (AUTH-11..17, page 10) — paste AFTER helpers.js =====
const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('AUTH — Mobile C', 77000, 0);
const LBL = ['Intro', 'Details', 'Document', 'Liveness', 'Review'];
async function setT(root, name, s, i = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[i]; if (!t) return null; for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = s; return t; }
async function tx(p, s, st = 'Body/S', c = 'text/secondary', fw = true) { const t = await T(s, st, c, { w: 100 }); p.appendChild(t); if (fw) t.layoutSizingHorizontal = 'FILL'; return t; }
function box(p, dir, o = {}, mode = 'FILL') { const b = AL(dir, o); p.appendChild(b); if (mode === 'FILL') b.layoutSizingHorizontal = 'FILL'; return b; }
async function li(p, icon, s, o = {}) { const r = box(p, 'HORIZONTAL', { name: o.name || 'Item — ' + s.slice(0, 32), gap: o.gap ?? 10 }); r.appendChild(await IC(icon, o.is || 18, o.ic || 'icon/brand')); await tx(r, s, o.st || 'Body/S', o.c || 'text/secondary'); return r; }
function R(p, x, y, w, h, c, r = 0, nm = 'Shape') { const n = rect(w, h, c, r, nm); p.appendChild(n); n.x = x; n.y = y; return n; }
function E(p, x, y, w, h, c, nm = 'Shape') { const n = ellipse(w, h, c, nm); p.appendChild(n); n.x = x; n.y = y; return n; }
async function TT(p, x, y, s, st, c) { const t = await T(s, st, c); p.appendChild(t); t.x = x; t.y = y; return t; }
function band(p, y, c, h = 120, rot = -14) { const b = R(p, -80, y, 600, h, c, 0, 'Angled colour block'); b.rotation = rot; return b; }
async function idCard(p, x, y, rot, o = {}) { const c = figma.createFrame(); c.name = 'Illustration — ID card ' + (o.back ? 'back' : 'front') + ' (DEMO)'; c.resize(240, 152); fill(c, 'paper/50'); radius(c, 14); c.clipsContent = true; p.appendChild(c);
  R(c, 0, 0, 240, 28, 'mint/600', 0, 'Header band'); await TT(c, 14, 7, o.back ? 'IDENTITY CARD · BACK' : 'IDENTITY CARD', 'Overline', 'text/on-primary');
  if (!o.back) { R(c, 14, 40, 62, 78, 'paper/200', 6, 'Photo'); E(c, 31, 50, 28, 32, 'paper/600', 'Head'); R(c, 21, 86, 48, 32, 'paper/600', 14, 'Shoulders'); await TT(c, 90, 38, 'KARLSSON', 'Label/M', 'ink/800'); await TT(c, 90, 56, 'NOVA', 'Label/S', 'ink/600'); R(c, 90, 80, 96, 6, 'paper/300', 4); R(c, 90, 92, 120, 6, 'paper/300', 4); R(c, 90, 104, 70, 6, 'paper/300', 4); R(c, 194, 40, 32, 24, 'paper/300', 4, 'Chip'); }
  else { for (let i = 0; i < 18; i++) R(c, 14 + i * 7, 40, i % 3 ? 3 : 5, 34, 'ink/700', 0, 'Barcode'); R(c, 150, 40, 76, 6, 'paper/300', 4); R(c, 150, 52, 60, 6, 'paper/300', 4); R(c, 150, 64, 70, 6, 'paper/300', 4); await TT(c, 14, 112, 'KARLSSON<<NOVA<<<<<<<<', 'Mono/S', 'ink/600'); }
  await TT(c, 14, o.back ? 92 : 124, 'IDPRT0004821<<<<<<<<<', 'Mono/S', 'ink/600');
  c.x = x; c.y = y; c.rotation = rot; return c; }
async function artBanner(p, name, h, draw) { const a = figma.createFrame(); a.name = 'Art — ' + name; a.resize(358, h); fill(a, 'surface/raised'); radius(a, 14); a.clipsContent = true; p.appendChild(a); a.layoutSizingHorizontal = 'FILL'; await draw(a); const db = await DEMO('XS'); a.appendChild(db); db.x = 358 - 47 - 12; db.y = 12; return a; }
// mobile screen: DEMOBAR → Shell/Topbar Mobile (Member) → flow header (back, title, KYC chip, step progress) → content
async function mscreen(name, col, o = {}) {
  const xs = 120 + col * 510; let ys = 440; for (const c of sec.children) if (Math.abs(c.x - xs) < 2) ys = Math.max(ys, c.y + c.height + 160);
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = xs; f.y = ys;
  const bar = await DEMOBAR(); f.appendChild(bar); bar.layoutSizingHorizontal = 'FILL';
  const tb = await I('23:12908', { State: 'Member' }); f.appendChild(tb); tb.layoutSizingHorizontal = 'FILL';
  const sh = box(f, 'VERTICAL', { name: 'Flow header', gap: 10, p: [8, 16, 14, 8], fill: 'bg/secondary' }); strokeSides(sh, 'border/subtle', { b: 1 });
  const r = box(sh, 'HORIZONTAL', { name: 'Title row', gap: 4, align: 'CENTER' }); const bk = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }); bk.name = 'Button/Icon — Back (44)'; r.appendChild(bk);
  await tx(r, 'Identity verification', 'Label/L', 'text/primary'); r.appendChild(await I('23:5565', { Status: o.chip[0], Level: o.chip[1] }));
  if (o.step != null) { const pg = box(sh, 'VERTICAL', { name: 'Step progress (5 steps)', gap: 8, p: [0, 0, 0, 8] }); const pr = box(pg, 'HORIZONTAL', { name: 'Labels', gap: 8 }); await tx(pr, 'Step ' + (o.step + 1) + ' of 5 · ' + LBL[o.step], 'Label/M', 'text/brand'); pr.appendChild(await T(o.step < 4 ? 'Next: ' + LBL[o.step + 1] : 'Last step', 'Caption', 'text/tertiary'));
    const sg = box(pg, 'HORIZONTAL', { name: 'Segments', gap: 4 }); for (let i = 0; i < 5; i++) { const s = rect(10, 4, o.err === i ? 'status/danger' : i <= o.step ? 'brand/primary' : 'border/default', 9999, 'Segment ' + (i + 1) + ' — ' + LBL[i]); sg.appendChild(s); s.layoutSizingHorizontal = 'FILL'; } }
  const body = box(f, 'VERTICAL', { name: 'Content', gap: 20, p: [20, 16, 24, 16] });
  return { f, body };
}
// sticky CTA bar (+ optional tab bar) then place + fit
async function mfinish(f, o = {}) {
  if (o.cta) { const s = box(f, 'VERTICAL', { name: 'Sticky CTA', gap: 10, p: [12, 16, o.tab ? 12 : 28, 16], fill: 'surface/default' }); strokeSides(s, 'border/subtle', { t: 1 }); if (o.note) { const t = await tx(s, o.note, 'Caption', 'text/tertiary'); t.textAlignHorizontal = 'CENTER'; } for (const b of o.cta) { s.appendChild(b); b.layoutSizingHorizontal = 'FILL'; } }
  if (o.tab) { const t = await I('22:5413', { Active: 'Account' }); f.appendChild(t); t.layoutSizingHorizontal = 'FILL'; }
  fitSection(sec); return f;
}
// ===== END KYC MOBILE LIB =====

// ===== Mobile AUTH-11 Intro (MODE 'Intro') / AUTH-12 Details (MODE 'Default' | 'Validation') =====
async function build(MODE) {
  const NAME = MODE === 'Intro' ? 'AUTH-11 KYC Intro & levels / 390 / Default' : 'AUTH-12 KYC Personal Details / 390 / ' + MODE;
  if (sec.children.find(c => c.name === NAME)) return { skipped: NAME };

if (MODE === 'Intro') {
  const { f, body } = await mscreen('AUTH-11 KYC Intro & levels / 390 / Default', 0, { chip: ['Approved', 'L1'], step: 0 });
  await artBanner(body, 'ID card and passport', 150, async (a) => { band(a, 96, 'mint/700', 150, -12); band(a, 74, 'brand/primary', 12, -12); const pp = figma.createFrame(); pp.name = 'Illustration — passport (DEMO)'; pp.resize(120, 160); fill(pp, 'mint/800'); radius(pp, 10); a.appendChild(pp); R(pp, 0, 0, 12, 160, 'mint/900', 0, 'Spine'); await TT(pp, 30, 22, 'PASSPORT', 'Overline', 'mint/400'); const g = await IC('globe', 48, 'mint/400'); pp.appendChild(g); g.x = 42; g.y = 56; pp.x = 230; pp.y = 18; pp.rotation = 10; await idCard(a, 24, 50, -8); });
  const hd = box(body, 'VERTICAL', { name: 'Title', gap: 8 }); await tx(hd, 'Level 2 verification', 'Overline', 'text/brand'); await tx(hd, 'Verify your identity to raise your limits', 'Heading/H4', 'text/primary'); await tx(hd, "You're on Level 1 — Basic. Level 2 takes about 5 minutes: your details, one ID document and a 10-second selfie video.", 'Body/S', 'text/secondary');
  const lv = box(body, 'VERTICAL', { name: 'Levels (stacked cards instead of table)', gap: 12 });
  const lh = box(lv, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); await tx(lh, 'Levels and daily limits', 'Heading/H5', 'text/primary'); lh.appendChild(await DEMO('M'));
  for (const L of [{ n: 'Level 1 · Basic', b: ['Approved', 'Completed'], p: 'Name, date of birth and address', dep: '2,000.00 USDT', wd: '2,000.00 USDT', t: 'Instant' }, { n: 'Level 2 · Verified', b: ['New', 'Next step'], hl: true, p: '+ ID document and 10-second selfie video', dep: '25,000.00 USDT', wd: '25,000.00 USDT', t: 'Usually under 10 min, up to 24 h' }, { n: 'Level 3 · Enhanced', b: ['Neutral', 'On request'], p: '+ Proof of address and source of funds', dep: 'Set individually', wd: 'Set individually', t: 'Up to 3 business days' }]) {
    const c = box(lv, 'VERTICAL', { name: 'Level card — ' + L.n, gap: 10, p: 16, fill: L.hl ? 'surface/selected' : 'surface/default', stroke: L.hl ? 'border/brand' : 'border/subtle', sw: L.hl ? 2 : 1, r: 14 });
    const h = box(c, 'HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); await tx(h, L.n, 'Label/L', L.hl ? 'text/brand' : 'text/primary'); const bd = await BADGE(L.b[0], 'S'); await setT(bd, 'Label', L.b[1]); h.appendChild(bd);
    await tx(c, L.p, 'Body/S', 'text/secondary');
    for (const [k, v] of [['Deposits per day', L.dep], ['Withdrawals per day', L.wd], ['Review time', L.t]]) { const r = box(c, 'HORIZONTAL', { name: 'Row — ' + k, gap: 8, align: 'CENTER' }); await tx(r, k, 'Caption', 'text/tertiary'); r.appendChild(await T(v, /USDT$/.test(v) ? 'Number/S' : 'Label/M', 'text/primary')); }
  }
  const nd = box(body, 'VERTICAL', { name: "What you'll need", gap: 12 }); await tx(nd, 'What you’ll need', 'Heading/H5', 'text/primary');
  for (const [ic, s] of [['id-card', 'One valid ID: passport, national ID card or driving licence'], ['camera', 'Your phone camera for a 10-second selfie video'], ['clock', 'About 5 minutes · review usually under 10 minutes, up to 24 h']]) await li(nd, ic, s);
  const pv = box(body, 'VERTICAL', { name: 'Data privacy notice', gap: 8, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); await li(pv, 'shield', 'How we handle your data', { st: 'Label/L', c: 'text/primary' });
  await tx(pv, 'Documents and video are encrypted and processed by our verification partner ([Partner name] — DEMO placeholder) only for identity and AML checks. Kept 5 years after account closure as the law requires; face data deleted within 30 days of a decision. Never used for marketing.', 'Body/S', 'text/secondary');
  const pl = box(pv, 'HORIZONTAL', { name: 'Links', gap: 20 }, 'HUG'); for (const s of ['AML/KYC Policy', 'Privacy Policy']) pl.appendChild(await T(s, 'Label/M', 'text/brand'));
  const lr = box(body, 'HORIZONTAL', { name: 'Licence & 18+', gap: 8, align: 'CENTER' }, 'HUG'); lr.appendChild(await I('6:159')); lr.appendChild(await I('6:158', { Variant: 'Compact' }));
  await mfinish(f, { cta: [await BTN('Primary', 'Start Level 2', { size: 'L', trail: 'arrow-right' })], note: 'On Level 1 you can still deposit, play and withdraw up to 2,000.00 USDT a day.', tab: true });
  await f.screenshot({ scale: 0.5 }); return { frame: f.id, size: [f.width, f.height] };
} else {
  const V = MODE === 'Validation';
  const { f, body } = await mscreen('AUTH-12 KYC Personal Details / 390 / ' + MODE, 1, { chip: ['Approved', 'L1'], step: 1 });
  const hd = box(body, 'VERTICAL', { name: 'Title', gap: 8 }); await tx(hd, 'Confirm your personal details', 'Heading/H4', 'text/primary'); await tx(hd, 'Exactly as on your ID document. You can change them until you submit.', 'Body/S', 'text/secondary');
  if (V) { const es = box(body, 'HORIZONTAL', { name: 'Error summary', gap: 10, p: 14, fill: 'status/danger-tint', stroke: 'border/danger', r: 14 }); es.appendChild(await IC('x-circle', 20, 'status/danger')); const ec = box(es, 'VERTICAL', { name: 'Copy', gap: 4 }); await tx(ec, '4 fields need your attention', 'Label/L', 'text/primary'); await tx(ec, 'Last name · Date of birth · Postal code · Accuracy confirmation', 'Body/S', 'text/danger'); }
  const fm = box(body, 'VERTICAL', { name: 'Form (single column, 48 px fields)', gap: 14 });
  async function inp(label, value, state, helper, trail) { const p = { Label: label, 'Show leading icon': false, 'Show helper': !!helper, 'Show trailing icon': !!trail }; if (trail) p['Trailing icon'] = ICONS[trail]; const n = await I('13:762', { State: state, Size: 'L' }, p); n.name = 'Input/Text L — ' + label; await setT(n, 'Value text', value); if (helper) await setT(n, 'Helper text', helper); fm.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; }
  async function sel(label, value, helper) { const n = await I('13:565', { State: 'Default' }, { Label: label, Value: value, 'Show helper': !!helper, 'Show leading icon': false }); n.name = 'Select/Field — ' + label; if (helper) await setT(n, 'Helper text', helper); fm.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; }
  await inp('First name(s)', 'Nova', 'Filled', 'As on your ID, including middle names');
  if (V) await inp('Last name(s)', 'K.', 'Error', "Enter your full last name — initials aren't accepted."); else await inp('Last name(s)', 'Karlsson', 'Filled', 'As on your ID');
  if (V) await inp('Date of birth', '14 / 03 / 2010', 'Error', 'You must be 18 or older. This date makes you 16.', 'calendar'); else await inp('Date of birth', '14 / 03 / 1994', 'Filled', 'DD / MM / YYYY', 'calendar');
  await sel('Nationality', 'Portugal', 'As shown on your ID document');
  await inp('Residential address', 'Rua do Exemplo 12, 3.º Esq.', 'Filled', 'Street, number and floor — no PO boxes');
  await inp('City', 'Lisboa', 'Filled', null);
  if (V) await inp('Postal code', '11000', 'Error', 'Use the format 0000-000, e.g. 1100-001.'); else await inp('Postal code', '1100-001', 'Filled', 'Format 0000-000');
  await sel('Country of residence', 'Portugal', 'Permitted region · matches your account'); await sel('Occupation', 'Software developer', 'Required by anti-money-laundering rules');
  const pep = box(fm, 'VERTICAL', { name: 'PEP declaration', gap: 8, p: 14, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); await tx(pep, 'Are you a politically exposed person (PEP)?', 'Label/L', 'text/primary'); await tx(pep, 'Someone with a prominent public role in the last 12 months, or a close family member or associate. Answering yes doesn’t stop you verifying.', 'Caption', 'text/secondary');
  for (const [lab, ds, on] of [['No', 'I am not a PEP', V], ['Yes', 'I am a PEP or closely related to one', false]]) { const r = await I('20:3259', { Selected: on ? 'Yes' : 'No', State: 'Default' }, { Label: lab, Description: ds, 'Show description': true }); r.name = 'Control/Radio — ' + lab; pep.appendChild(r); r.layoutSizingHorizontal = 'FILL'; }
  const cb = await I('20:3205', { Value: 'Unchecked', State: V ? 'Error' : 'Default' }, { Label: 'I confirm these details are accurate and belong to me', 'Show description': true }); cb.name = 'Control/Checkbox — accuracy declaration (unchecked)'; fm.appendChild(cb); cb.layoutSizingHorizontal = 'FILL'; await setT(cb, 'Description', 'False information can lead to refusal and account closure.'); if (V) await setT(cb, 'Helper text', 'Please confirm your details are accurate.');
  await mfinish(f, { cta: [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' })], note: V ? 'Fix the 4 highlighted fields to continue.' : 'Saved automatically · 16:44 UTC' });
  await f.screenshot({ scale: 0.5 }); return { frame: f.id, size: [f.width, f.height] };
}

}
const __out = [];
for (const __m of ['Intro', 'Default', 'Validation']) __out.push(await build(__m));
return __out;
