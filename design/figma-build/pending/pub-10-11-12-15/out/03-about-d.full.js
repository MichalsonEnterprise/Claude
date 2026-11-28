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
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 VIP, Affiliates, About, Contact', 80000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function setNav(sb, label) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { if (it.name === 'Item/Lobby') it.setProperties({ State: 'Default' }); if (it.name === 'Item/' + label) it.setProperties({ State: 'Active' }); } }
async function shell(name, x, y, nav) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); sb.name = 'Shell/Sidebar'; body.appendChild(sb); sb.layoutSizingVertical = 'FILL'; setNav(sb, nav);
  const col = AL('VERTICAL', { name: 'Column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(col, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', p: [32, 32, 64, 32], gap: 56 }); add(col, [content, 'FILL']);
  const foot = await I('23:17478', { Breakpoint: 'Desktop' }); foot.name = 'Shell/Footer Mega'; add(col, [foot, 'FILL']); bnum(foot, 'paddingLeft', 32); bnum(foot, 'paddingRight', 32);
  return { f, body, col, content, foot };
}
async function head(over, title, body, right) {
  const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' });
  const l = AL('VERTICAL', { gap: 8 }); add(row, [l, 'FILL']);
  add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H3', 'text/primary'));
  if (body) add(l, await T(body, 'Body/M', 'text/secondary', { w: 760 }));
  if (right) add(row, right);
  return row;
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
async function crumbHero(C, crumb, heroName) {
  const top = AL('VERTICAL', { name: 'Page top', gap: 16 }); add(C, [top, 'FILL']);
  const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', crumb); add(top, bc);
  const hero = AL('HORIZONTAL', { name: heroName, fill: 'surface/default', r: 20, p: 48, clip: true }); stroke(hero, 'border/subtle'); add(top, [hero, 'FILL']);
  const copy = AL('VERTICAL', { name: 'Copy', gap: 20, w: 560 }); add(hero, copy);
  return { top, hero, copy };
}
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
async function licence(C) { const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']); add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' })); return lic; }
const NAME = '[PUB-12] About Us / 1440 / Default';
const S = await shell(NAME, 3240, 120, '—'); const C = S.content;
const { hero, copy } = await crumbHero(C, 'About us', 'Hero — About GLOBAL POOL');
add(copy, await T('ABOUT GLOBAL POOL', 'Overline', 'text/brand'));
add(copy, [await T('A global jackpot anyone can check', 'Heading/H1', 'text/primary', { w: 560 }), 'FILL']);
add(copy, [await T('One shared prize pool drawn every day, plus a catalogue of original games. Every draw is decided by Chainlink VRF, every fee is shown as its own line, and every limit you set is honoured. That is the whole idea.', 'Body/L', 'text/secondary', { w: 560 }), 'FILL']);
const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'See today’s round', { size: 'L' }), await BTN('Ghost', 'How it works', { size: 'L', trail: 'arrow-right' })); add(copy, acts);
const hn = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(hn, await I('6:159'), await T('Available only in permitted jurisdictions · Play responsibly', 'Caption', 'text/tertiary')); add(copy, hn);
abs(hero, rect(560, 820, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 720, -170, 14);
abs(hero, rect(64, 820, 'brand/primary', 0, 'Angled colour block — mint stripe'), 650, -170, 14);
const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; abs(hero, tk, 900, 250, 12);
const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Preview — Card/Draw Countdown (cropped)'; abs(hero, dc, 700, 44); await fx(dc, 'Elevation/3 — Popover');

// ---- mission ----
const mis = AL('HORIZONTAL', { name: 'Mission', gap: 48, p: [8, 0, 8, 0] }); add(C, [mis, 'FILL']);
const ml = AL('VERTICAL', { gap: 12 }); add(mis, [ml, 'FILL']);
add(ml, await T('OUR MISSION', 'Overline', 'text/brand'), [await T('Make every draw, fee and payout verifiable by the people who play.', 'Display/M', 'text/primary', { w: 640 }), 'FILL']);
const mr = AL('VERTICAL', { gap: 12, w: 420 }); add(mis, mr);
add(mr, [await T('Most online jackpots ask you to trust a number. We publish the pool, the entries, the randomness request and the settlement transaction for every round — from round #1 on 29 Jun 2023 to round #1,248 closing tonight at 20:00 UTC.', 'Body/M', 'text/secondary', { w: 420 }), 'FILL'], [await T('If something we show can’t be checked, we treat it as a bug.', 'Body/M Strong', 'text/primary', { w: 420 }), 'FILL']);

// ---- principles ----
add(C, [await head('WHAT WE STAND FOR', 'Three principles we don’t trade off', 'They shape every screen, from the lobby to the withdrawal form.'), 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Principles', gap: 16 }); add(C, [pr, 'FILL']);
for (const [ic, t, b, l] of [
  ['shield-check', 'Verifiable', 'Global Pool winners are picked by Chainlink VRF on Arbitrum and settled on-chain; Originals use a committed server seed you can check after every bet. Our admins cannot choose winners or edit results.', 'Verify a draw'],
  ['receipt', 'Transparent fees', 'A 0.05 USDT platform fee per qualifying entry, always on its own line. Network fees are shown before you confirm. House edge is printed on every game.', 'See all fees'],
  ['heart', 'Responsible by default', 'Deposit, loss and session limits, reality checks, cooling-off and self-exclusion are one tap away — and never harder to use than the deposit button.', 'Responsible gaming']]) {
  const c = await I('23:16859', { State: 'Default' }, { Title: t, Body: b, Link: l, 'Show link': true, Icon: ICONS[ic] }); c.name = 'Card/Feature — ' + t; tint(c.findOne(n => n.name === 'Icon') || c.findOne(n => n.type === 'INSTANCE' && n.componentPropertyReferences && n.componentPropertyReferences.mainComponent), 'icon/brand'); add(pr, [c, 'FILL_BOTH']);
}
const nv = box('What we will never do', { gap: 16, p: 24 }); add(C, [nv, 'FILL']);
add(nv, await T('What we will never do', 'Heading/H5', 'text/primary'));
const ng = AL('HORIZONTAL', { gap: 12, wrap: true, cgap: 12 }); add(nv, [ng, 'FILL']);
for (const t of ['Pre-tick consent boxes or marketing opt-ins', 'Run countdowns that aren’t tied to a real close time', 'Hide odds, fees or limits behind extra clicks', 'Make withdrawals or self-exclusion harder than deposits', 'Let anyone — including staff — pick winners or change results', 'Suggest VPNs or other ways around regional restrictions']) {
  const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', w: 352 }); add(r, await IC('x-circle', 18, 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 320 }), 'FILL']); add(ng, r); }

// ---- numbers ----
add(C, [await head('BY THE NUMBERS', 'Three years of daily draws', null, await DEMO('M')), 'FILL']);
const nb = AL('HORIZONTAL', { name: 'Numbers', gap: 16 }); add(C, [nb, 'FILL']);
for (const [v, l, s] of [['1,248', 'daily rounds', 'since round #1 on 29 Jun 2023'], ['184,320', 'registered players', 'in permitted jurisdictions'], ['0.05 USDT', 'platform fee per entry', 'unchanged since round #1'], ['5', 'networks for USDT', 'BNB Chain, Polygon, Arbitrum, Ethereum, Solana']]) {
  const b = box('Number — ' + l, { gap: 6, p: 24 }); add(nb, [b, 'FILL_BOTH']);
  const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(h, await T(v, 'Number/L', 'text/primary'), await DEMO('XS')); add(b, [h, 'FILL']);
  add(b, await T(l, 'Body/M Strong', 'text/primary'), [await T(s, 'Body/S', 'text/tertiary', { w: 220 }), 'FILL']); }

// ---- timeline ----
add(C, [await head('OUR STORY', 'How we got here', null, await DEMO('M')), 'FILL']);
const tl = AL('HORIZONTAL', { name: 'Timeline', gap: 0 }); add(C, [tl, 'FILL']);
const ms = [['29 Jun 2023', 'Round #1', 'First daily Global Pool round drawn with Chainlink VRF on Arbitrum.'], ['2024', 'Originals', 'Orbit Rush, Pool Dice and Double Side launch with seed verification on every bet.'], ['2025', 'Contract v1.3.0', 'GlobalPool upgraded behind a 48 h timelock and 3-of-5 multisig.'], ['2026', 'Five networks', 'USDT on BNB Chain, Polygon, Arbitrum, Ethereum and Solana; RG tools in every game.'], ['27 Nov 2026', 'Round #1,248', 'Open now — closes 20:00 UTC with 3,412 participants.']];
for (let i = 0; i < ms.length; i++) { const [d, t, b] = ms[i];
  const st = AL('VERTICAL', { name: 'Milestone — ' + t, gap: 10, p: [0, 16, 0, 0] }); add(tl, [st, 'FILL']);
  const rail = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rail, ellipse(12, 12, i === ms.length - 1 ? 'brand/primary' : 'border/strong', 'Dot')); const ln = rect(100, 2, i === ms.length - 1 ? null : 'border/default', 0, 'Rail'); add(rail, [ln, 'FILL']); add(st, [rail, 'FILL']);
  add(st, await T(d, 'Label/M', i === ms.length - 1 ? 'text/brand' : 'text/tertiary'), await T(t, 'Heading/H5', 'text/primary'), [await T(b, 'Body/S', 'text/secondary', { w: 200 }), 'FILL']); }

// ---- team ----
add(C, [await head('THE TEAM', 'People behind the pool', 'Placeholder profiles: names and roles are fictional for this design. Staff never ask for passwords, 2FA codes or seed phrases.', await DEMO('M')), 'FILL']);
const tg = AL('HORIZONTAL', { name: 'Team grid', gap: 16, wrap: true, cgap: 16 }); add(C, [tg, 'FILL']);
for (const [ini, n, r, d] of [['SI', 'S. Iyer', 'Head of Platform Operations', 'Keeps daily rounds on schedule and leads incident response.'], ['KO', 'K. Osei', 'Compliance Officer (MLRO)', 'Licensing, AML/KYC and sanctions screening.'], ['AM', 'A. Marin', 'Finance Lead', 'Treasury, withdrawal reviews and daily reconciliation.'], ['RD', 'R. Duarte', 'Player Support (L2)', 'Runs the 24/7 support desk and complaint handling.'], ['HT', 'H. Tanaka', 'Smart-contract Engineering', 'Owns the GlobalPool and VRFConsumer contracts and their audits.'], ['TO', 'T. Okafor', 'Responsible Gaming Lead', 'Designs limits, reality checks and self-exclusion flows.']]) {
  const b = AL('HORIZONTAL', { name: 'Team — ' + n, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 20, gap: 16, w: 368 });
  const av = await I('9:238', { Size: 'L' }, { Initials: ini, 'Show status': false }); add(b, av);
  const tx = AL('VERTICAL', { gap: 4 }); const nr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(nr, await T(n, 'Body/M Strong', 'text/primary'), await DEMO('XS'));
  add(tx, nr, await T(r, 'Label/M', 'text/brand'), [await T(d, 'Body/S', 'text/secondary', { w: 230 }), 'FILL']); add(b, [tx, 'FILL']); add(tg, b); }

// ---- licence & company ----
add(C, [await head('LICENCE & COMPANY', 'Who operates GLOBAL POOL', null), 'FILL']);
const lc = AL('HORIZONTAL', { name: 'Licence & company', gap: 16 }); add(C, [lc, 'FILL']);
add(lc, await I('6:158', { Variant: 'Card' }));
const co = box('Company details', { gap: 0, p: 24 }); add(lc, [co, 'FILL_BOTH']);
const coh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(coh, [await T('Company details', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(co, [coh, 'FILL']);
for (const [k, v] of [['Operator', '[Operator name] — placeholder'], ['Registered office', '[Registered address] — placeholder'], ['Gaming licence', '[Regulator], licence no. [number] — placeholder'], ['Where we operate', 'Permitted jurisdictions only — see Restricted countries'], ['Press & partnerships', 'press@globalpool.example (placeholder address)']]) {
  const r = AL('HORIZONTAL', { gap: 16, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary', { w: 180 }), [await T(v, 'Body/S Strong', 'text/primary', { w: 360 }), 'FILL']); add(co, [r, 'FILL']); }
const cta = AL('HORIZONTAL', { gap: 8, p: [12, 0, 0, 0] }); add(cta, await BTN('Secondary', 'Contact us', { size: 'S', lead: 'mail' }), await BTN('Ghost', 'Restricted countries', { size: 'S', trail: 'arrow-right' })); add(co, cta);
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await hero.screenshot({ scale: 0.5 });
return { frame: S.f.id, content: C.id, hero: hero.id, h: S.f.height };
