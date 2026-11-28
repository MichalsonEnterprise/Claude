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
const NAME = '[PUB-11] Affiliate Program / 1440 / Default — calculator';
const S = await shell(NAME, 1680, 120, 'Affiliates'); const C = S.content;
const { hero, copy } = await crumbHero(C, 'Affiliates', 'Hero — Affiliate program');
const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ov, await IC('users', 16, 'icon/brand'), await T('AFFILIATE PROGRAM · FOR PARTNERS', 'Overline', 'text/brand')); add(copy, ov);
add(copy, [await T('Earn 20% of the platform fees your players pay', 'Heading/H1', 'text/primary', { w: 560 }), 'FILL']);
add(copy, [await T('Share your link. When players you refer buy Global Pool entries, you earn 20% of the 0.05 USDT platform fee on every qualifying entry for 12 months — paid to your balance in USDT.', 'Body/L', 'text/secondary', { w: 560 }), 'FILL']);
const pm = AL('HORIZONTAL', { name: 'Promise', gap: 8, align: 'CENTER', fill: 'brand/tint-subtle', r: 9999, p: [6, 12, 6, 10] }); add(pm, await IC('shield-check', 16, 'icon/brand'), await T('Never a share of player losses, deposits or stakes.', 'Body/S Strong', 'text/primary')); add(copy, pm);
const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Apply as a partner', { size: 'L' }), await BTN('Ghost', 'Read partner terms', { size: 'L', trail: 'arrow-right' })); add(copy, acts);
const tr = AL('HORIZONTAL', { name: 'Terms', gap: 8, align: 'CENTER' }); add(tr, await T('Partners must be 18+ and based in a permitted jurisdiction · Terms apply', 'Caption', 'text/tertiary'), await I('6:159'), await DEMO('S')); add(copy, tr);
abs(hero, rect(560, 820, 'brand/tint', 0, 'Angled colour block — mint tint'), 720, -170, 14);
abs(hero, rect(64, 820, 'brand/primary', 0, 'Angled colour block — mint stripe'), 650, -170, 14);
const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; abs(hero, tk, 700, 372, -10);
const dash = AL('VERTICAL', { name: 'Preview — partner dashboard', fill: 'surface/overlay', stroke: 'border/default', r: 14, p: 20, gap: 14, w: 400 });
const dh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(dh, [await T('Partner dashboard · November 2026', 'Label/L', 'text/primary'), 'FILL'], await DEMO('XS')); add(dash, [dh, 'FILL']);
const lnk = AL('HORIZONTAL', { name: 'Referral link', fill: 'surface/raised', r: 10, p: [10, 12, 10, 12], gap: 8, align: 'CENTER' }); add(lnk, await IC('link', 16, 'icon/muted'), [await T('globalpool.example/r/PARTNER-0427', 'Mono/S', 'text/primary'), 'FILL'], await IC('copy', 16, 'icon/brand')); add(dash, [lnk, 'FILL']);
const st = AL('HORIZONTAL', { name: 'Stats', gap: 10, wrap: true, cgap: 10 }); add(dash, [st, 'FILL']);
for (const [k, v, c] of [['Referred players', '40', 'text/primary'], ['Qualifying entries', '4,800', 'text/primary'], ['Platform fees paid', '240.00 USDT', 'text/primary'], ['Your commission · 20%', '48.00 USDT', 'text/brand']]) { const s = AL('VERTICAL', { fill: 'surface/raised', r: 10, p: 12, gap: 4, w: 170 }); add(s, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/M', c)); add(st, s); }
const np = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(np, await IC('calendar', 16, 'icon/muted'), await T('Next payout run Mon 30 Nov 2026, 10:00 UTC', 'Caption', 'text/secondary')); add(dash, np);
abs(hero, dash, 680, 48); await fx(dash, 'Elevation/3 — Popover');

// ---- commission model ----
add(C, [await head('HOW COMMISSION WORKS', 'One rate, on one transparent fee', 'Every Global Pool entry costs 10.00 USDT plus a 0.05 USDT platform fee shown as its own line. The full entry price goes to the prize pool — you earn a share of the fee only.', await DEMO('M')), 'FILL']);
const fw = box('Per-entry breakdown', { gap: 16, p: 24 }); add(C, [fw, 'FILL']);
const flow = AL('HORIZONTAL', { name: 'Flow', gap: 12, align: 'CENTER' }); add(fw, [flow, 'FILL']);
async function nd(title, val, sub, col, tnt) { const b = AL('VERTICAL', { name: 'Step — ' + title, fill: tnt || 'surface/raised', r: 14, p: 20, gap: 6 }); add(b, await T(title, 'Overline', 'text/tertiary'), await T(val, 'Number/L', col || 'text/primary'), [await T(sub, 'Caption', 'text/secondary', { w: 180 }), 'FILL']); return b; }
add(flow, [await nd('PLAYER PAYS', '10.05 USDT', 'for one entry: 10.00 entry price + 0.05 platform fee'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('PRIZE POOL', '10.00 USDT', '100% of the entry price goes to the pool (round #1,248: 186,400.00)', 'text/gold', 'accent/gold-tint'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('PLATFORM FEE', '0.05 USDT', 'pays for VRF draws, on-chain settlement and operations'), 'FILL_BOTH'], await IC('arrow-right', 20, 'icon/muted'),
  [await nd('YOUR COMMISSION', '0.01 USDT', '20% of the fee · GLOBAL POOL keeps 0.04 USDT', 'text/brand', 'brand/tint'), 'FILL_BOTH']);
const fwn = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(fwn, await IC('info', 14, 'icon/muted'), [await T('Entries are paid from the platform balance, so there is no network fee on entries. Network fees apply only to deposits and withdrawals and are always shown separately.', 'Caption', 'text/tertiary', { w: 900 }), 'FILL']); add(fw, [fwn, 'FILL']);
const cards = AL('HORIZONTAL', { name: 'Commission rules', gap: 16 }); add(C, [cards, 'FILL']);
for (const [t, ic, icCol, items, good] of [
  ['You earn on', 'check-circle', 'icon/brand', ['The 0.05 USDT platform fee on qualifying Global Pool entries', 'Players who sign up through your link, for 12 months', 'Entries in rounds that close and draw'], true],
  ['You never earn on', 'x-circle', 'text/danger', ['Player losses, net revenue or house edge', 'Deposits, withdrawals or network fees', 'Bonus funds, refunds or cancelled rounds'], false],
  ['Your players always get', 'users', 'icon/brand', ['The same odds, fees and limits as everyone else', 'A visible “Referred by” line in their account', 'Limits, reality checks and self-exclusion from day one'], true]]) {
  const b = box(t, { gap: 14 }); add(cards, [b, 'FILL_BOTH']);
  const h = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(h, await IC(ic, 20, icCol), await T(t, 'Heading/H5', 'text/primary')); add(b, h);
  for (const it of items) { const r = AL('HORIZONTAL', { gap: 8 }); add(r, await IC(good ? 'check' : 'x', 16, good ? 'icon/brand' : 'text/danger'), [await T(it, 'Body/S', 'text/secondary', { w: 280 }), 'FILL']); add(b, [r, 'FILL']); }
}

// ---- calculator ----
add(C, [await head('COMMISSION CALCULATOR', 'Estimate your monthly commission', 'Change the inputs to see exactly how commission is worked out. It is an illustration, not a forecast or a promise of income.', await DEMO('M')), 'FILL']);
const calc = box('Calculator', { dir: 'HORIZONTAL', gap: 0, p: 0, r: 20 }); calc.clipsContent = true; add(C, [calc, 'FILL']);
const inp = AL('VERTICAL', { name: 'Inputs', p: 32, gap: 20 }); add(calc, [inp, 'FILL']);
add(inp, await T('Your numbers', 'Heading/H5', 'text/primary'));
const chips = AL('HORIZONTAL', { name: 'Scenarios', gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(chips, await T('Try a scenario', 'Label/M', 'text/secondary'));
for (const [l, s] of [['Starter · 10 players', 'Default'], ['Growing · 40 players', 'Selected'], ['Established · 250 players', 'Default']]) add(chips, await I('17:2766', { State: s }, { Label: l, 'Show icon': false }));
add(inp, [chips, 'FILL']);
const i1 = await I('13:762', { State: 'Filled', Size: 'L' }, { Label: 'Active referred players', 'Show leading icon': true, 'Leading icon': ICONS['users'], 'Show trailing icon': false, 'Show helper': true }); i1.name = 'Field — Active referred players'; txt(i1, 'Value text', '40'); txt(i1, 'Helper text', 'Players who bought at least one entry this month');
const i2 = await I('13:762', { State: 'Focus', Size: 'L' }, { Label: 'Qualifying entries per player, per month', 'Show leading icon': true, 'Leading icon': ICONS['ticket'], 'Show trailing icon': false, 'Show helper': true }); i2.name = 'Field — Entries per player'; txt(i2, 'Value text', '120'); txt(i2, 'Helper text', 'Average across your players — about 4 entries a day');
const rw = AL('HORIZONTAL', { gap: 16 }); add(rw, [i1, 'FILL'], [i2, 'FILL']); add(inp, [rw, 'FILL']);
const fixed = AL('HORIZONTAL', { name: 'Fixed values', gap: 16 }); add(inp, [fixed, 'FILL']);
for (const [k, v, n] of [['Platform fee per qualifying entry', '0.05 USDT', 'The same for every player and every round'], ['Your commission rate', '20%', 'Standard partner rate']]) { const b = AL('VERTICAL', { fill: 'surface/raised', r: 10, p: 16, gap: 4 }); const h = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(h, await IC('lock', 14, 'icon/muted'), await T(k, 'Label/M', 'text/secondary')); add(b, h, await T(v, 'Number/M', 'text/primary'), await T(n, 'Caption', 'text/tertiary')); add(fixed, [b, 'FILL']); }
add(inp, [await T('An entry qualifies when its round closes and draws. Entries refunded from cancelled rounds earn nothing.', 'Caption', 'text/tertiary', { w: 600 }), 'FILL']);
const res = AL('VERTICAL', { name: 'Result', fill: 'surface/raised', p: 32, gap: 16, w: 440 }); strokeSides(res, 'border/subtle', { l: 1 }); add(calc, [res, 'FILLH']);
const rh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rh, [await T('ESTIMATED COMMISSION · PER MONTH', 'Overline', 'text/tertiary'), 'FILL'], await DEMO('S')); add(res, [rh, 'FILL']);
add(res, await T('48.00 USDT', 'Number/XL', 'text/brand'));
const ls = AL('VERTICAL', { name: 'Working', gap: 0 }); add(res, [ls, 'FILL']);
for (const [k, v] of [['40 players × 120 entries', '4,800 entries'], ['4,800 × 0.05 USDT platform fee', '240.00 USDT'], ['240.00 × 20% commission', '48.00 USDT'], ['12 months at this pace', '≈ 576.00 USDT']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Number/S', 'text/primary')); add(ls, [r, 'FILL']); }
const disc = AL('HORIZONTAL', { gap: 8, fill: 'status/info-tint', r: 10, p: 12 }); add(disc, await IC('info', 16, 'text/info'), [await T('Illustration only. Commission depends on real qualifying entries and is never based on what players lose.', 'Caption', 'text/secondary', { w: 320 }), 'FILL']); add(res, [disc, 'FILL']);
add(res, [await BTN('Primary', 'Apply as a partner', { size: 'L' }), 'FILL']);

// ---- payouts ----
add(C, [await head('PAYOUTS', 'Paid in the Monday run, in USDT', 'Commission is added round by round after each draw settles. Request a payout once you have 20.00 USDT or more — it is paid in the next Monday run, straight to your Available balance.'), 'FILL']);
const pay = AL('HORIZONTAL', { name: 'Payout schedule', gap: 16 }); add(C, [pay, 'FILL']);
const tl = box('Weekly cycle', { gap: 0, p: 24 }); add(pay, [tl, 'FILL']);
const cyc = [['activity', 'Accrues round by round', 'Added after each daily round draws and settles (draw 20:00 UTC). Entries refunded from cancelled rounds earn nothing.', 'Daily'], ['receipt', 'Weekly statement', 'Mon 00:00 – Sun 23:59 UTC, itemised by round ID. Download it as CSV from the partner dashboard.', 'Mon 00:00 UTC'], ['wallet', 'Request a payout', 'From 20.00 USDT, with KYC Level 2 and 2FA. Smaller amounts simply roll over — commission never expires.', 'Any time'], ['check-circle', 'Paid to Available', 'Requests made by Sunday 23:59 UTC are paid in USDT in Monday’s run. Payout fee 0.00 USDT. Withdraw it like any balance — network fee shown before you confirm (e.g. Arbitrum 0.08 USDT).', 'Mon 10:00 UTC']];
for (let i = 0; i < cyc.length; i++) { const [ic, t, d, when] = cyc[i];
  const r = AL('HORIZONTAL', { gap: 16, p: [14, 0, 14, 0] }); if (i < cyc.length - 1) strokeSides(r, 'border/subtle', { b: 1 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 20, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 4 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 420 }), 'FILL']);
  add(r, ib, [tx, 'FILL'], await T(when, 'Label/M', 'text/tertiary')); add(tl, [r, 'FILL']); }
const nx = AL('VERTICAL', { name: 'Next payout + history', gap: 16, w: 400 }); add(pay, [nx, 'FILLH']);
const npc = box('Next payout', { gap: 8, fill: 'brand/tint-subtle', stroke: 'border/brand' }); add(nx, [npc, 'FILL']);
const nh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(nh, [await T('NEXT PAYOUT RUN', 'Overline', 'text/brand'), 'FILL'], await DEMO('XS')); add(npc, [nh, 'FILL']);
add(npc, await T('Mon 30 Nov 2026, 10:00 UTC', 'Heading/H4', 'text/primary'), await T('For payout requests made by Sun 29 Nov 2026, 23:59 UTC', 'Body/S', 'text/secondary'));
const hist = box('Recent payouts', { gap: 0 }); add(nx, [hist, 'FILL_BOTH']);
const hh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(hh, [await T('Recent payouts — example partner', 'Label/L', 'text/primary'), 'FILL'], await DEMO('XS')); add(hist, [hh, 'FILL']);
for (const [d, a] of [['Mon 23 Nov 2026', '24.60 USDT'], ['Mon 9 Nov 2026', '23.10 USDT'], ['Mon 26 Oct 2026', '22.40 USDT']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); const b = await BADGE('Confirmed', 'S'); const bt = b.findOne(n => n.type === 'TEXT'); if (bt) bt.characters = 'Paid'; add(r, [await T(d, 'Body/S', 'text/secondary'), 'FILL'], await T(a, 'Number/S', 'text/primary'), b); add(hist, [r, 'FILL']); }

// ---- terms ----
add(C, [await head('PARTNER TERMS', 'Key terms in plain language', 'This summary is part of the partner agreement. Read the full terms before you apply.', await BTN('Secondary', 'Full partner terms', { trail: 'external-link' })), 'FILL']);
const tg = AL('HORIZONTAL', { name: 'Terms grid', gap: 16, wrap: true, cgap: 16 }); add(C, [tg, 'FILL']);
for (const [ic, t, d] of [
  ['id-card', 'Eligibility', '18+, based in a permitted jurisdiction, KYC Level 2 and 2FA on before your first payout.'],
  ['calendar', 'Commission period', '12 months from each referred player’s sign-up. Any rate change gets 30 days’ email notice.'],
  ['megaphone', 'Responsible marketing', 'Show 18+ and responsible-gaming links. No “guaranteed win”, “risk-free” or get-rich claims.'],
  ['ban', 'Restricted regions', 'Never promote in restricted countries or suggest VPNs or other ways around geo-blocks.'],
  ['user-x', 'No self-referral', 'Your own accounts, paid sign-ups or bonus abuse void the commission on those players.'],
  ['shield', 'Player protection first', 'If a referred player self-excludes or closes their account, commission on them stops at once.'],
  ['undo', 'Clawbacks', 'Commission on fraudulent or reversed activity can be clawed back — always with a written reason.'],
  ['scale', 'Checkable statements', 'Every statement line links to round IDs, so you can verify each payout yourself.']]) {
  const b = AL('HORIZONTAL', { name: 'Term — ' + t, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 20, gap: 14, w: 560 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 20, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 4 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 440 }), 'FILL']);
  add(b, ib, [tx, 'FILL']); add(tg, b); }
const band = AL('HORIZONTAL', { name: 'Apply band', fill: 'surface/default', stroke: 'border/brand', r: 20, p: 32, gap: 16, align: 'CENTER' }); add(C, [band, 'FILL']);
const bl = AL('VERTICAL', { gap: 8 }); add(bl, await T('Ready to partner with us?', 'Heading/H3', 'text/primary'), [await T('Applications are reviewed within 3 business days. Questions first? Write to partners@globalpool.example (placeholder address).', 'Body/M', 'text/secondary', { w: 560 }), 'FILL']); add(band, [bl, 'FILL']);
add(band, await DEMO('S'), await BTN('Secondary', 'Email the partner team', { size: 'L', lead: 'mail' }), await BTN('Primary', 'Apply as a partner', { size: 'L' }));
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await hero.screenshot({ scale: 0.5 });
return { frame: S.f.id, content: C.id, hero: hero.id, calc: calc.id, h: S.f.height };
