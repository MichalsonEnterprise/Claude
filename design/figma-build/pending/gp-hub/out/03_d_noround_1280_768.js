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

// ===== GP-01 desktop variant lib (page 07, section 'GP-01..04 Hub & participation') =====
const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-01..04 Hub & participation', 0, 0);
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
async function st(root, name, val, nth = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[nth]; if (!t) return null; await lf(t); t.characters = val; return t; }
function fnd(root, name) { return root.findOne(n => n.name === name); }
function absAdd(parent, node, x, y, rot = 0, idx = null) { if (idx == null) parent.appendChild(node); else parent.insertChild(idx, node); node.layoutPositioning = 'ABSOLUTE'; node.rotation = rot; node.x = x; node.y = y; return node; }
function card(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, justify: o.justify }); }
function row(kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 8, align: o.align || 'CENTER', justify: o.justify }); add(r, ...kids); return r; }
function col(kids, o = {}) { const r = AL('VERTICAL', { name: o.name || 'Stack', gap: o.gap ?? 4, align: o.align }); add(r, ...kids); return r; }
async function wrapT(parent, text, style, color, w, name) { const t = await T(text, style, color, { w, name }); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
// bottom of everything in the section that overlaps [x, x+w] horizontally
function colBottom(x, w, skip) { let m = 0; for (const c of sec.children) { if (c === skip) continue; if (c.x < x + w && c.x + c.width > x) m = Math.max(m, c.y + c.height); } return m; }
function exists(name) { return sec.children.find(n => n.name === name); }
async function cloneBelow(srcName, name) {
  const src = exists(srcName); if (!src) throw new Error('Source frame missing: ' + srcName);
  const f = src.clone(); sec.appendChild(f); f.name = name; f.x = src.x; f.y = colBottom(src.x, src.width, f) + 160; f.primaryAxisSizingMode = 'AUTO';
  return f;
}
const HUB = { L: '[GP-01] Global Pool Hub / 1280 / Active', T: '[GP-01] Global Pool Hub / 768 / Active' };
const CW = { L: 1280 - 240 - 64, T: 768 - 64 };
// ===== END DLIB =====

// ===== GP-01 No active round at 1280 + 768 (between #1,248 settle and #1,249 open) =====
const out = { created: {}, skipped: [], log: [] };
async function nextHero(content, idx, cw, BP) {
  const TB = BP === 'T'; const P = TB ? 28 : 40;
  const h = AL(TB ? 'VERTICAL' : 'HORIZONTAL', { name: 'Hero — Next round banner', p: P, gap: TB ? 24 : 32, fill: 'surface/default', stroke: 'border/subtle', r: 20, clip: true, align: TB ? 'MIN' : 'CENTER' });
  content.insertChild(idx, h); h.layoutSizingHorizontal = 'FILL';
  const left = AL('VERTICAL', { name: 'Next round', gap: 20 }); if (TB) add(h, left); else add(h, [left, 'FILL']);
  const tw = TB ? 400 : undefined;
  add(left, row([await T('NEXT ROUND · #1,249', 'Overline', 'text/tertiary'), await DEMO('S')], { gap: 8 }));
  const hl = await T('Next round opens 28 Nov 2026, 08:00 UTC', TB ? 'Heading/H2' : 'Heading/H1', 'text/primary', { w: tw || 480, name: 'Headline' }); add(left, hl); if (!TB) hl.layoutSizingHorizontal = 'FILL';
  const sm = await T('Round #1,248 settled at 20:02:10 UTC — 13 winning entries shared the 186,400.00 USDT pool and prizes are in winners’ Owed balances. Entries for #1,249 open at 08:00 UTC; nothing can be bought before then.', 'Body/M', 'text/secondary', { w: tw || 480, name: 'Summary' }); add(left, sm); if (!TB) sm.layoutSizingHorizontal = 'FILL';
  const cta = row([await BTN('Secondary', 'Remind me at 08:00 UTC', { size: 'L', lead: 'bell' }), await BTN('Ghost', 'See round #1,248 results', { size: 'L', trail: 'arrow-right' })], { name: 'Hero CTA row', gap: 12 });
  add(left, cta); cta.resize(TB ? 400 : 480, cta.height); cta.primaryAxisSizingMode = 'FIXED'; cta.layoutWrap = 'WRAP'; bnum(cta, 'counterAxisSpacing', 12); cta.counterAxisSizingMode = 'AUTO'; if (!TB) cta.layoutSizingHorizontal = 'FILL';
  add(left, row([await I('6:159'), await T('Reminders stay off until you turn them on: one notification when the round opens, no marketing.', 'Caption', 'text/tertiary', { w: TB ? 340 : 420, name: 'Risk line' })], { name: 'Hero helper', gap: 8, align: 'MIN' }));
  add(left, await I('6:158', { Variant: 'Compact' }));
  const dc = await I('24:13861', { State: 'Next round' }); add(h, dc);
  const H = h.height, L = 2.6 * H;
  if (TB) { absAdd(h, rect(300, L, 'accent/gold-tint-strong', 0, 'Angled block / gold'), cw - 50, -60, -10, 0); absAdd(h, rect(26, L, 'brand/primary', 0, 'Angled block / mint'), cw - 108, -60, -10, 1); }
  else { absAdd(h, rect(300, L, 'accent/gold-tint-strong', 0, 'Angled block / gold'), cw - 150, -60, -20, 0); absAdd(h, rect(26, L, 'brand/primary', 0, 'Angled block / mint'), cw - 208, -60, -20, 1); }
  return h;
}
async function nextCard() {
  const nx = card('What happens next', { gap: 16, p: 24 });
  add(nx, row([await IC('calendar', 20, 'icon/brand'), await T('What happens next', 'Heading/H5', 'text/primary'), await DEMO('XS')], { gap: 8 }));
  const S = [['28 Nov 2026, 08:00 UTC', 'Round #1,249 opens', 'Entry 10.00 USDT + 0.05 USDT platform fee per entry, paid from your platform balance.'], ['28 Nov 2026, 20:00:00 UTC', 'Round #1,249 closes', 'If both minimums are met, Chainlink VRF picks 13 winning entries. If not, every entry is refunded.'], ['Any time', 'Claim your owed refund', '300.00 USDT from cancelled round #1,245 is in your Owed balance.']];
  for (const [t1, t2, t3] of S) { const it = AL('VERTICAL', { name: 'Next step', gap: 4, p: 16, fill: 'surface/raised', r: 10 }); add(nx, [it, 'FILL']); add(it, await T(t1, 'Overline', 'text/brand')); await wrapT(it, t2, 'Label/L', 'text/primary', 360); await wrapT(it, t3, 'Body/S', 'text/secondary', 360); }
  add(nx, await BTN('Secondary', 'Claim in Wallet', { size: 'S', lead: 'wallet' }));
  return nx;
}
async function verifyCard() {
  const c = card('Verify this draw', { gap: 12, p: 20 });
  add(c, row([await IC('shield-check', 20, 'icon/brand'), await DEMO('XS')], { gap: 8 }));
  await wrapT(c, 'Check this draw yourself', 'Label/L', 'text/primary', 200);
  await wrapT(c, 'Chainlink VRF request 0x9f2c…e71a was fulfilled at 20:00:41 UTC after 3 confirmations and settled at 20:02:10 UTC. Re-run the winner selection from the random word and the entry snapshot — no account needed.', 'Body/S', 'text/secondary', 200);
  add(c, await BTN('Secondary', 'Verify round #1,248', { size: 'S', lead: 'shield-check' }));
  return c;
}
async function winCard() { const w = await I('23:16334', { State: 'Public winner' }); for (const t of w.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); } return w; }
async function common(f) {
  const gp = fnd(f, 'Item/Global Pool'); const lb = gp && gp.findOne(n => n.name === 'Badge'); if (lb) lb.visible = false;
  const title = fnd(f, 'Title'); const badge = title && title.findOne(n => n.type === 'INSTANCE' && n.name === 'Badge/Status'); if (badge) { badge.setProperties({ Status: 'Neutral' }); await st(badge, 'Label', 'Between rounds'); }
  const me = fnd(f, 'My entries');
  if (me) { await st(me, 'ME sub', 'entries · not selected'); await st(me, 'ME locked', '0.00 USDT locked — released'); await st(me, 'ME fees', '351.75 USDT spent (350.00 + 1.75 fees)'); }
}
const shots = [];
for (const BP of ['L', 'T']) {
  const W = BP === 'L' ? 1280 : 768; const NAME = `[GP-01] Global Pool Hub / ${W} / No active round`;
  if (exists(NAME)) { out.skipped.push(NAME); continue; }
  const f = await cloneBelow(HUB[BP], NAME); const cw = CW[BP];
  await common(f);
  const content = fnd(f, 'Content');
  const oldHero = fnd(content, 'Hero — Jackpot banner'); const hi = content.children.indexOf(oldHero); oldHero.remove();
  const h = await nextHero(content, hi, cw, BP);
  const feed = fnd(content, 'Recent entries feed'); if (feed) feed.remove();
  const log = { BP };
  if (BP === 'L') {
    const rh = content.children.find(n => n.type === 'INSTANCE' && n.name === 'Jackpot/Round Header'); if (rh) rh.setProperties({ Status: 'Settled' }); log.rh = !!rh;
    const r1 = fnd(content, 'My entries & threshold');
    if (r1) { r1.name = 'My entries & result'; const th = r1.children.find(n => n.type === 'INSTANCE'); if (th) th.remove(); const w = await winCard(); add(r1, w); log.r1 = true; }
    const r2 = fnd(content, 'Prizes & VRF');
    if (r2) { r2.name = 'Prizes & next steps'; const vx = r2.children[1]; if (vx) vx.remove(); const nx = await nextCard(); add(r2, [nx, 'FILL']); nx.layoutSizingVertical = 'FILL'; log.r2 = true; }
    const od = fnd(content, 'Your odds');
    const pr = AL('HORIZONTAL', { name: 'Draw proof', gap: 16 }); content.insertChild(od ? content.children.indexOf(od) : content.children.length - 2, pr); pr.layoutSizingHorizontal = 'FILL'; if (od) od.remove();
    const vrf = await I('23:11967', { Step: 'Settled' }); add(pr, vrf); const vc = await verifyCard(); add(pr, [vc, 'FILL']); vc.layoutSizingVertical = 'FILL'; log.odds = !!od;
  } else {
    const r1 = fnd(content, 'Round & my entries');
    if (r1) { const rc = r1.children.find(n => n.type === 'INSTANCE'); if (rc) { rc.setProperties({ Status: 'Settled' }); for (const [k, v] of [['Round', 'Round #1,248'], ['Handle', '@orbit_77'], ['Prize', '93,200.00 USDT']]) await st(rc, k, v); await st(rc, 'Value', '186,400.00', 0); await st(rc, 'Value', '3,412', 1); await st(rc, 'Value', '18,640', 2); await st(rc, 'Value', '27 Nov 2026, 20:02 UTC', 3); } log.r1 = !!rc; }
    const r2 = fnd(content, 'Threshold & odds');
    if (r2) { r2.name = 'Result & proof'; for (const c of [...r2.children]) c.remove(); const w = await winCard(); add(r2, w); const vc = await verifyCard(); add(r2, [vc, 'FILL']); vc.layoutSizingVertical = 'FILL'; log.r2 = true; }
    const vx = fnd(content, 'VRF explainer — How the winner is drawn'); const vi = vx ? content.children.indexOf(vx) : -1; if (vx) vx.remove();
    const nx = await nextCard(); const r3 = fnd(content, 'Prizes & money flow'); content.insertChild(vi >= 0 ? vi : (r3 ? content.children.indexOf(r3) + 1 : 6), nx); nx.layoutSizingHorizontal = 'FILL'; log.vx = !!vx;
  }
  out.log.push(log);
  fitSection(sec);
  out.created[NAME] = f.id; shots.push([f, h]);
}
// consistency: round #1,248 1st prize = @orbit_77 (as on GP-07) — patch the 1440 No-round winner card too
const N1440 = exists('[GP-01] Global Pool Hub / 1440 / No active round');
if (N1440) for (const t of N1440.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); out.log.push('1440 handle fixed'); }
fitSection(sec);
out.frames = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
for (const [f, h] of shots) { await h.screenshot({ scale: 0.6 }); await f.screenshot({ scale: 0.3 }); }
return out;
