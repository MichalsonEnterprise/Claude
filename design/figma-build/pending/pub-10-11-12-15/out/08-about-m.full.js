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
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 — Mobile', 49000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
async function mshell(name, x, y) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: 40 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, stickyNode) {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (stickyNode) add(S.f, [stickyNode, 'FILL']);
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
function abs(parent, node, x, y, rot) { parent.appendChild(node); if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function artFrame(name, h) { const a = figma.createFrame(); a.name = name; a.resize(358, h); fill(a, 'surface/default'); radius(a, 20); stroke(a, 'border/subtle'); a.clipsContent = true; return a; }
async function sticky(label, note, lead) { const b = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 6, align: 'CENTER' }); strokeSides(b, 'border/subtle', { t: 1 }); const bt = await BTN('Primary', label, { size: 'L', lead }); bt.name = 'Button — Sticky CTA'; add(b, [bt, 'FILL']); if (note) add(b, await T(note, 'Caption', 'text/tertiary', { name: 'Sticky note' })); return b; }
async function mlic(C) { const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(C, [r, 'FILL']); }
async function rowsList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 16, 4, 16] }); for (let i = 0; i < rows.length; i++) { const [k, v] = rows[i]; const r = AL('HORIZONTAL', { gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 150 }), 'FILL']); if (v === 0) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('minus', 14, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); add(r, n); } else if (v === 1) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('check', 14, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); add(r, n); } else add(r, await T(v, o.vs || 'Label/M', o.vc || 'text/primary', { w: o.vw || 160, align: 'RIGHT' })); add(l, [r, 'FILL']); } return l; }
async function iconRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0] }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const ib = AL('HORIZONTAL', { fill: o.tint || 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, o.ic || 'icon/brand')); const t = AL('VERTICAL', { gap: 2 }); add(t, await T(title, 'Body/M Strong', 'text/primary', { w: 270 }), [await T(body, 'Body/S', 'text/secondary', { w: 270 }), 'FILL']); add(r, ib, [t, 'FILL']); return r; }
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); ts.forEach((t, i) => { if (b[i]) t.characters = b[i]; }); return ts.length; }
const S = await mshell('[PUB-12] About Us / 390 / Default', 1140, 120); const C = S.C;
const hd = AL('VERTICAL', { name: 'Page header', gap: 12 }); add(C, [hd, 'FILL']);
add(hd, await T('ABOUT GLOBAL POOL', 'Overline', 'text/brand'), [await T('A global jackpot anyone can check', 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T('One shared prize pool drawn every day, plus original games. Every draw is decided by Chainlink VRF, every fee is shown on its own line, every limit you set is honoured.', 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
const art = artFrame('Hero art — draw countdown preview (cropped)', 280); add(C, [art, 'FILL']);
abs(art, rect(340, 640, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 150, -150, 14);
abs(art, rect(40, 640, 'brand/primary', 0, 'Angled colour block — mint stripe'), 96, -150, 14);
const tk = await I('23:8534', { State: 'Active' }); tk.name = 'Object — entry ticket (cropped)'; abs(art, tk, 190, 170, 12);
const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Preview — Card/Draw Countdown (cropped)'; abs(art, dc, 24, 20); dc.rescale(0.85); await fx(dc, 'Elevation/3 — Popover');
const cta = AL('VERTICAL', { name: 'Actions', gap: 12 }); add(C, [cta, 'FILL']);
add(cta, [await BTN('Primary', 'See today’s round', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'How it works', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const mis = box('Mission', { gap: 10, p: 20, fill: 'bg/secondary' }); add(C, [mis, 'FILL']);
add(mis, await T('OUR MISSION', 'Overline', 'text/brand'), [await T('Make every draw, fee and payout verifiable by the people who play.', 'Heading/H3', 'text/primary', { w: 318 }), 'FILL'], [await T('We publish the pool, the entries, the randomness request and the settlement transaction for every round — from round #1 on 29 Jun 2023 to round #1,248 closing tonight at 20:00 UTC.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
add(C, [await mhead('WHAT WE STAND FOR', 'Three principles we don’t trade off', null), 'FILL']);
const pr = AL('VERTICAL', { name: 'Principles', gap: 12 }); add(C, [pr, 'FILL']);
for (const [ic, t, b, l] of [['shield-check', 'Verifiable', 'Global Pool winners are picked by Chainlink VRF and settled on-chain; Originals use a committed seed you can check. Staff cannot choose winners or edit results.', 'Verify a draw'], ['receipt', 'Transparent fees', '0.05 USDT platform fee per qualifying entry, always on its own line. Network fees shown before you confirm. House edge on every game.', 'See all fees'], ['heart', 'Responsible by default', 'Limits, reality checks, cooling-off and self-exclusion are one tap away — never harder than the deposit button.', 'Responsible gaming']]) {
  const c = await I('23:16859', { State: 'Default' }, { Title: t, Body: b, Link: l, 'Show link': true, Icon: ICONS[ic] }); c.name = 'Card/Feature — ' + t; tint(c.findOne(n => n.name === 'Icon') || c.findOne(n => n.type === 'INSTANCE' && n.componentPropertyReferences && n.componentPropertyReferences.mainComponent), 'icon/brand'); add(pr, [c, 'FILL']); }
const nv = box('What we will never do', { gap: 0, p: [12, 16, 12, 16] }); add(C, [nv, 'FILL']);
add(nv, await T('What we will never do', 'Heading/H5', 'text/primary'));
for (const t of ['Pre-tick consent or marketing boxes', 'Run countdowns not tied to a real close time', 'Hide odds, fees or limits', 'Make withdrawals or self-exclusion harder than deposits', 'Let anyone — staff included — pick winners', 'Suggest VPNs or ways around regional restrictions']) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [8, 0, 8, 0] }); add(r, await IC('x-circle', 16, 'text/danger'), [await T(t, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(nv, [r, 'FILL']); }
add(C, [await mhead('BY THE NUMBERS', 'Three years of daily draws', null, await DEMO('S')), 'FILL']);
const nb = AL('HORIZONTAL', { name: 'Numbers', gap: 12, wrap: true, cgap: 12 }); add(C, [nb, 'FILL']);
for (const [v, l] of [['1,248', 'daily rounds since 29 Jun 2023'], ['184,320', 'registered players'], ['0.05 USDT', 'fee per entry, unchanged'], ['5', 'networks for USDT']]) { const b = AL('VERTICAL', { name: 'Number — ' + l, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 4, w: 173 }); const h = AL('HORIZONTAL', { gap: 6, align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(h, await T(v, 'Number/M', 'text/primary'), await DEMO('XS')); add(b, [h, 'FILL'], [await T(l, 'Caption', 'text/secondary', { w: 141 }), 'FILL']); add(nb, b); }
add(C, [await mhead('OUR STORY', 'How we got here', null, await DEMO('S')), 'FILL']);
const tl = box('Timeline', { gap: 0, p: [8, 16, 8, 16] }); add(C, [tl, 'FILL']);
const ms = [['29 Jun 2023', 'Round #1', 'First daily round drawn with Chainlink VRF on Arbitrum.'], ['2024', 'Originals', 'Orbit Rush, Pool Dice and Double Side launch.'], ['2025', 'Contract v1.3.0', '48 h timelock and 3-of-5 multisig.'], ['2026', 'Five networks', 'USDT on 5 chains; RG tools in every game.'], ['27 Nov 2026', 'Round #1,248', 'Open now — closes 20:00 UTC.']];
for (let i = 0; i < ms.length; i++) { const [d, t, b] = ms[i]; const last = i === ms.length - 1; const r = AL('HORIZONTAL', { name: 'Milestone — ' + t, gap: 12, p: [10, 0, 10, 0] }); const rail = AL('VERTICAL', { gap: 4, align: 'CENTER', p: [4, 0, 0, 0] }); add(rail, ellipse(12, 12, last ? 'brand/primary' : 'border/strong', 'Dot')); add(r, rail); const tx = AL('VERTICAL', { gap: 2 }); add(tx, await T(d, 'Label/S', last ? 'text/brand' : 'text/tertiary'), await T(t, 'Body/M Strong', 'text/primary'), [await T(b, 'Body/S', 'text/secondary', { w: 280 }), 'FILL']); add(r, [tx, 'FILL']); if (!last) strokeSides(r, 'border/subtle', { b: 1 }); add(tl, [r, 'FILL']); }
add(C, [await mhead('THE TEAM', 'People behind the pool', 'Placeholder profiles — names and roles are fictional for this design.', await DEMO('S')), 'FILL']);
const tg = AL('HORIZONTAL', { name: 'Team grid', gap: 12, wrap: true, cgap: 12 }); add(C, [tg, 'FILL']);
for (const [ini, n, r] of [['SI', 'S. Iyer', 'Platform Operations'], ['KO', 'K. Osei', 'Compliance (MLRO)'], ['AM', 'A. Marin', 'Finance Lead'], ['RD', 'R. Duarte', 'Player Support (L2)'], ['HT', 'H. Tanaka', 'Smart contracts'], ['TO', 'T. Okafor', 'Responsible Gaming']]) { const b = AL('VERTICAL', { name: 'Team — ' + n, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 8, w: 173 }); add(b, await I('9:238', { Size: 'M' }, { Initials: ini, 'Show status': false })); const nr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(nr, await T(n, 'Body/S Strong', 'text/primary'), await DEMO('XS')); add(b, nr, [await T(r, 'Caption', 'text/brand', { w: 141 }), 'FILL']); add(tg, b); }
const co = box('Company details', { gap: 0, p: [12, 16, 12, 16] }); add(C, [co, 'FILL']);
const coh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(coh, [await T('Licence & company', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('XS')); add(co, [coh, 'FILL']);
for (const [k, v] of [['Operator', '[Operator name] — placeholder'], ['Gaming licence', '[Regulator], licence no. [number] — placeholder'], ['Where we operate', 'Permitted jurisdictions only — see Restricted countries'], ['Press', 'press@globalpool.example (placeholder)']]) { const r = AL('VERTICAL', { gap: 2, p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Caption', 'text/tertiary'), [await T(v, 'Body/S Strong', 'text/primary', { w: 326 }), 'FILL']); add(co, [r, 'FILL']); }
await mlic(C);
await mfinish(S, null);
fitSection(sec);
await C.screenshot({ scale: 0.45 });
return { frame: S.f.id, content: C.id, h: S.f.height };
