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
async function head(over, title, body, right) {
  const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' });
  const l = AL('VERTICAL', { gap: 8 }); add(row, [l, 'FILL']);
  add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H3', 'text/primary'));
  if (body) add(l, await T(body, 'Body/M', 'text/secondary', { w: 760 }));
  if (right) add(row, right);
  return row;
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify }); }
// Card/VIP Tier benefit copy aligned with demo-data (VIP extras) + USR-V4: rewards in USDT to Available, no wagering; limits identical for every tier
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); ts.forEach((t, i) => { if (b[i]) t.characters = b[i]; }); return ts.length; }
const F = await figma.getNodeByIdAsync('36:530716'); const C = await figma.getNodeByIdAsync('36:531074'); const hero = await figma.getNodeByIdAsync('36:531321');
if (C.children.length > 4) throw new Error('Part B already applied');
F.primaryAxisSizingMode = 'AUTO';
// ---- part A copy fixes (reconcile with demo-data VIP extras) ----
const FIX = {
  '36:531329': 'Earn 1 point for every 1.00 USDT you enter in Global Pool or stake with real balance. Climb from Bronze to Diamond for weekly and monthly rewards, a reward at every new level and a dedicated VIP host.',
  '36:531350': 'Terms apply · VIP rewards are paid in USDT to Available — no wagering, they never expire',
  '36:531455': 'entered in Global Pool or staked with real balance in Originals and table games',
  '36:531465': 'Weekly reward', '36:531466': 'from Silver up — calculated Mondays 10:00 UTC, settles by itself a week later',
  '36:531475': 'Rolling 365 days', '36:531476': 'status points count your last 12 months of play; roll-off dates are shown in advance',
  '36:531625': 'Example: @nova.k is Gold III (level 14 of 29) with 12,840 pts — 7,160 to Platinum.',
  '36:531716': 'Every Monday at 10:00 UTC we calculate your tier’s reward for last week’s settled real-money play and add it to your Owed balance. Claim it to Available early if you like — otherwise it settles to Available by itself a week later. No wagering, no expiry.',
  '36:531719': 'Example player', '36:531720': '@nova.k · Gold III', '36:531722': 'Play counted, Mon 16 – Sun 22 Nov 2026', '36:531723': '1,326 pts',
  '36:531725': 'Weekly reward · USDT, no wagering', '36:531726': '115.20 USDT',
  '36:531731': 'Calculated Mon 23 Nov 2026, 10:00 UTC · settles to Available by itself Mon 30 Nov 2026, 10:00 UTC' };
const fixed = []; for (const [id, v] of Object.entries(FIX)) { const t = await figma.getNodeByIdAsync(id); if (t && t.type === 'TEXT') { t.characters = v; fixed.push(id); } }
let vipFixed = 0; for (const inst of F.findAll(n => n.type === 'INSTANCE' && n.name.includes('Card/VIP Tier'))) vipFixed += await vipFix(inst);
// ---- hero geometry fix (mint stripe overlapped the copy) ----
const g = hero.findOne(n => n.name === 'Angled colour block — gold'); g.rotation = 14; g.x = 730; g.y = -170;
const m = hero.findOne(n => n.name === 'Angled colour block — mint stripe'); m.rotation = 14; m.x = 640; m.y = -170;
const pv = hero.findOne(n => n.name.startsWith('Preview — Card/VIP Tier')); pv.x = 836; pv.y = 52;
const ts = hero.findOne(n => n.name === 'Preview — weekly reward toast'); ts.x = 600; ts.y = 28;
const c1 = hero.findOne(n => n.name === 'Object — chip 100'); c1.x = 1080; c1.y = -24;
const c5 = hero.findOne(n => n.name === 'Object — chip 500'); c5.x = 1080; c5.y = 462;
// ---- how points work ----
add(C, [await head('HOW POINTS WORK', 'Earn, level up, keep your tier', 'Points follow real-money play only, so your status tracks what you actually play — never deposits, platform fees, bonus funds or refunds.'), 'FILL']);
const steps = AL('HORIZONTAL', { name: 'Steps', gap: 16 }); add(C, [steps, 'FILL']);
for (const [n, ic, t, bd] of [
  ['01', 'coins', 'Earn points', '1 point for every 1.00 USDT entered in Global Pool (the 0.05 USDT fee doesn’t count) or staked with real balance in Originals and table games.'],
  ['02', 'trending-up', 'Level up', '29 levels across 5 tiers. Every new level pays a one-off reward in USDT straight to Available — from 0.50 at Bronze up to 500.00 at Diamond.'],
  ['03', 'gift', 'Collect weekly', 'From Silver up, your weekly reward is calculated every Monday 10:00 UTC. Claim it early or let it settle to Available by itself a week later.'],
  ['04', 'calendar', 'Keep your tier', 'Status points are a rolling 365-day total. Points older than a year roll off — the dates are shown in Dashboard → VIP well in advance.']]) {
  const b = box('Step ' + n + ' — ' + t, { gap: 12 }); add(steps, [b, 'FILL_BOTH']);
  const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER', justify: 'SPACE_BETWEEN' }); const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 10 }); add(ib, await IC(ic, 24, 'icon/brand')); add(r, ib, await T(n, 'Number/M', 'text/tertiary')); add(b, [r, 'FILL']);
  add(b, await T(t, 'Heading/H5', 'text/primary'), [await T(bd, 'Body/S', 'text/secondary', { w: 220 }), 'FILL']);
}
const ex = box('Worked example — points in one week', { dir: 'HORIZONTAL', gap: 40, p: 28 }); add(C, [ex, 'FILL']);
const exL = AL('VERTICAL', { gap: 10, w: 320 }); add(ex, exL);
const exH = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(exH, await T('Example week', 'Heading/H5', 'text/primary'), await DEMO('S')); add(exL, exH);
add(exL, [await T('What counts and what doesn’t. Points are added when a bet settles or a round draws, and show in Dashboard → VIP within a minute.', 'Body/S', 'text/secondary', { w: 320 }), 'FILL']);
const exR = AL('VERTICAL', { name: 'Ledger', gap: 0 }); add(ex, [exR, 'FILL']);
const hdr = AL('HORIZONTAL', { gap: 16, p: [0, 0, 8, 0] }); strokeSides(hdr, 'border/subtle', { b: 1 });
add(hdr, [await T('ACTIVITY', 'Overline', 'text/tertiary'), 'FILL'], await T('AMOUNT', 'Overline', 'text/tertiary', { w: 140, align: 'RIGHT' }), await T('POINTS', 'Overline', 'text/tertiary', { w: 100, align: 'RIGHT' })); add(exR, [hdr, 'FILL']);
for (const [a, amt, pts, note] of [
  ['Orbit Rush — stakes with real balance', '250.00 USDT', '+250', null],
  ['Global Pool — 20 entries × 10.00 USDT, round #1,248', '200.00 USDT', '+200', null],
  ['Twenty-One — stakes with real balance', '150.00 USDT', '+150', null],
  ['Platform fee — 20 × 0.05 USDT', '1.00 USDT', '0', 'The platform fee never earns points'],
  ['Pool Dice — stakes paid with bonus funds', '5.00 USDT', '0', 'Bonus-fund stakes never earn points'],
  ['Refund — 10 entries from a cancelled round', '100.00 USDT', '0', 'Refunded entries earn 0 points']]) {
  const row = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [10, 0, 10, 0] }); strokeSides(row, 'border/subtle', { b: 1 });
  const lc = AL('VERTICAL', { gap: 2 }); add(lc, await T(a, 'Body/S', 'text/primary')); if (note) add(lc, await T(note, 'Caption', 'text/tertiary'));
  add(row, [lc, 'FILL'], await T(amt, 'Number/S', 'text/secondary', { w: 140, align: 'RIGHT' }), await T(pts, 'Number/S', pts === '0' ? 'text/tertiary' : 'text/primary', { w: 100, align: 'RIGHT' })); add(exR, [row, 'FILL']);
}
const tot = AL('HORIZONTAL', { gap: 16, align: 'CENTER', p: [12, 0, 0, 0] }); add(tot, [await T('Points earned this week', 'Body/M Strong', 'text/primary'), 'FILL'], await T('+600 pts', 'Number/M', 'text/brand', { w: 160, align: 'RIGHT' })); add(exR, [tot, 'FILL']);
// ---- comparison table ----
add(C, [await head('COMPARE TIERS', 'Benefits side by side', 'Everything each tier adds, in one table — and the things no tier can change.', await DEMO('M')), 'FILL']);
const tbl = AL('VERTICAL', { name: 'Benefits comparison table', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true }); add(C, [tbl, 'FILL']);
const tiers = [['Bronze', '0 pts'], ['Silver', '2,500 pts'], ['Gold', '8,000 pts'], ['Platinum', '20,000 pts'], ['Diamond', '50,000 pts']];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default', p: [16, 20, 16, 20], align: 'CENTER' }); strokeSides(hr, 'border/default', { b: 1 });
const h0 = AL('HORIZONTAL', { w: 316 }); add(h0, await T('BENEFIT', 'Overline', 'text/tertiary')); add(hr, h0);
for (const [t, p] of tiers) { const c = AL('VERTICAL', { gap: 4, align: 'CENTER' }); add(c, await I('6:211', { Tier: t, Size: 'S' }), await T(p, 'Caption', 'text/tertiary')); add(hr, [c, 'FILL']); }
add(tbl, [hr, 'FILL']);
const rows = [
  ['Levels', ['1–5', '6–11', '12–17', '18–23', '24–29']],
  ['Level-up reward per level (USDT)', ['0.50–1.50', '1.00–1.80', '2.00–15.00', '25.00–60.00', '100.00–500.00']],
  ['Weekly reward (USDT, settles by itself)', [0, 1, 1, 1, 1]],
  ['Monthly reward', [0, 0, 0, 1, 1]],
  ['Support', ['Standard', 'Standard', 'Priority queue', 'Dedicated VIP host', 'Dedicated VIP host']],
  ['VIP tournaments', [0, 0, 'Monthly invitational', '+ Platinum series', 'All VIP events']]];
for (const [lab, vals] of rows) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [14, 20, 14, 20], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  for (const v of vals) {
    const c = AL('HORIZONTAL', { gap: 6, justify: 'CENTER', align: 'CENTER' });
    if (typeof v === 'number') { if (v) add(c, await IC('check', 16, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); else add(c, await IC('minus', 16, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); }
    else add(c, await T(v, /^[0-9]/.test(v) ? 'Number/S' : 'Body/S', 'text/primary'));
    add(r, [c, 'FILL']);
  }
  add(tbl, [r, 'FILL']);
}
const grp = AL('HORIZONTAL', { name: 'Group — Same for every tier', fill: 'brand/tint-subtle', p: [10, 20, 10, 20], gap: 8, align: 'CENTER' }); strokeSides(grp, 'border/subtle', { b: 1 }); add(grp, await IC('shield-check', 16, 'icon/brand'), await T('SAME FOR EVERY TIER', 'Overline', 'text/brand')); add(tbl, [grp, 'FILL']);
for (const [lab, msg] of [['Odds, house edge & RTP', 'Identical for Bronze and Diamond — printed on every game'], ['Draw & result verification', 'Chainlink VRF and committed seeds — VIP status is never an input'], ['Withdrawal security checks & limits', 'Same 2FA, whitelisting, 24 h new-address cooldown and 25,000.00 USDT/day (KYC L2)'], ['Responsible-gaming tools & limits', 'Available to everyone from day one — no tier can switch them off or delay them']]) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + lab, p: [14, 20, 14, 20], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
  const l = AL('HORIZONTAL', { w: 316 }); add(l, [await T(lab, 'Body/S Strong', 'text/primary', { w: 296 }), 'FILL']); add(r, l);
  const c = AL('HORIZONTAL', { gap: 8, justify: 'CENTER', align: 'CENTER' }); add(c, await IC('check-circle', 16, 'icon/brand'), await T(msg, 'Body/S', 'text/primary')); add(r, [c, 'FILL']);
  add(tbl, [r, 'FILL']);
}
const fn = AL('HORIZONTAL', { name: 'Footnote', p: [12, 20, 14, 20], gap: 8, align: 'CENTER' }); add(fn, await IC('info', 14, 'icon/muted'), [await T('Reward amounts are DEMO terms. Every VIP reward is paid in USDT to your Available balance — no wagering and no expiry. Weekly rewards settle by themselves a week after they are calculated.', 'Caption', 'text/tertiary', { w: 900 }), 'FILL']); add(tbl, [fn, 'FILL']);
// ---- promo + responsible play ----
const pr = AL('HORIZONTAL', { name: 'Level-up promo + responsible play', gap: 16 }); add(C, [pr, 'FILL']);
const bp = await I('29:18042', { Type: 'VIP level-up' }); bp.name = 'Banner/Promo — VIP level-up'; txt(bp, 'Key terms', '29 levels · 0.50–500.00 USDT per level, paid to Available · no wagering');
const pb = bp.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Primary')); if (pb) setProp(pb, 'Label', 'Create free account');
add(pr, bp);
const rg = box('Responsible play — VIP', { gap: 12, p: 24 }); add(pr, [rg, 'FILL_BOTH']);
const rgh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 20, 'text/info')); add(rgh, rgi, await T('Play for fun — never chase a level', 'Heading/H5', 'text/primary')); add(rg, rgh);
add(rg, [await T('VIP rewards are never a reason to play more. We don’t raise your limits, send “almost there” nudges or VIP offers while a limit, cooling-off or self-exclusion is active. Leave VIP Club and stop VIP messages any time in Settings.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rga, await BTN('Secondary', 'Set limits', { size: 'S' }), await BTN('Ghost', 'Responsible gaming', { size: 'S', trail: 'arrow-right' }), await I('6:159')); add(rg, rga);
// ---- FAQ ----
add(C, [await head('VIP FAQ', 'Questions players ask about VIP'), 'FILL']);
const fq = AL('HORIZONTAL', { name: 'FAQ + help', gap: 24 }); add(C, [fq, 'FILL']);
const fl = AL('VERTICAL', { name: 'FAQ list', gap: 12 }); add(fq, fl);
const e = await I('23:16819', { State: 'Expanded' }, { Question: 'Does my VIP tier change my odds or results?', Answer: 'No. Bronze and Diamond players get the same odds, house edge, payout tables and Global Pool draw. Results come from Chainlink VRF or a committed server seed you can verify — VIP status is never an input.' });
txt(e, 'Example', 'Example: two players each holding 35 of 18,640 entries in round #1,248 have the same ≈0.188% chance of 1st prize — whatever their tier.');
const lk = e.findOne(n => n.name === 'Links'); if (lk) { const lt = lk.findAll(n => n.type === 'TEXT'); if (lt[0]) lt[0].characters = 'How draws are verified'; if (lt[1]) lt[1].characters = 'Odds & fees'; }
add(fl, e);
for (const [q, a] of [['How do I earn VIP points?', '1 point per 1.00 USDT entered in Global Pool or staked with real balance, once the bet settles or the round draws.'], ['Can I lose my tier?', 'Status points are a rolling 365-day total, so old points roll off. Dashboard → VIP shows every roll-off date in advance.'], ['Are VIP rewards withdrawable?', 'Yes. They are paid in USDT to Available with no wagering and never expire — withdraw them like any balance.'], ['Do platform fees, bonus funds or refunds earn points?', 'No. Only real-money stakes and Global Pool entry prices earn points.']]) add(fl, await I('23:16819', { State: 'Collapsed' }, { Question: q, Answer: a }));
const help = box('Talk to a VIP host', { gap: 12, p: 24 }); add(fq, [help, 'FILL']);
const hh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const hi = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(hi, await IC('chat', 20, 'icon/brand')); add(hh, hi, await T('Talk to a VIP host', 'Heading/H5', 'text/primary')); add(help, hh);
add(help, [await T('Gold members get a priority support queue; Platinum and Diamond members get a dedicated VIP host. Hosts never ask for passwords, 2FA codes or seed phrases — and never pressure you to deposit or play.', 'Body/S', 'text/secondary', { w: 340 }), 'FILL']);
const ha = AL('VERTICAL', { gap: 8 }); add(ha, [await BTN('Secondary', 'Contact support', { lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Read VIP terms', { trail: 'arrow-right' }), 'FILL']); add(help, [ha, 'FILL']);
const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']);
add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' }));
fitSection(sec);
await F.screenshot({ scale: 0.3 });
await C.findOne(n => n.name === 'Tier grid').screenshot({ scale: 0.45 });
await tbl.screenshot({ scale: 0.5 });
return { frame: F.id, h: F.height, table: tbl.id, ex: ex.id, faq: fq.id, fixed: fixed.length, vipFixed };
