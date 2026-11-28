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
const S = await mshell('[PUB-10] VIP Program / 390 / Default (logged out)', 120, 120); const C = S.C;
const hd = AL('VERTICAL', { name: 'Page header', gap: 12 }); add(C, [hd, 'FILL']);
const ov = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ov, await IC('crown', 16, 'icon/brand'), await T('VIP CLUB · 5 TIERS · 29 LEVELS', 'Overline', 'text/brand')); add(hd, ov);
add(hd, [await T('Every real stake moves you closer to your next reward', 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T('Earn 1 point per 1.00 USDT entered in Global Pool or staked with real balance. Climb from Bronze to Diamond for weekly rewards, a USDT reward at every level and a dedicated VIP host.', 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
const art = artFrame('Hero art — VIP preview (cropped)', 280); add(C, [art, 'FILL']);
abs(art, rect(320, 620, 'accent/gold-tint-strong', 0, 'Angled colour block — gold'), 150, -140, 14);
abs(art, rect(40, 620, 'brand/primary', 0, 'Angled colour block — mint stripe'), 96, -140, 14);
const pv = await I('23:12669', { Tier: 'Gold', Current: 'Yes' }); pv.name = 'Preview — Card/VIP Tier (Gold, your tier)'; abs(art, pv, 62, 76); await vipFix(pv); await fx(pv, 'Elevation/3 — Popover');
const chip = await I('23:12227', { Value: '500', State: 'Default' }); chip.name = 'Object — chip 500'; abs(art, chip, 306, 214, 18); chip.rescale(1.2);
const pill = AL('HORIZONTAL', { name: 'Preview — weekly reward toast', fill: 'surface/overlay', stroke: 'border/default', r: 14, p: [10, 12, 10, 10], gap: 10, align: 'CENTER' });
const pIc = AL('HORIZONTAL', { fill: 'accent/gold-tint', r: 10, p: 6 }); add(pIc, await IC('coins', 18, 'icon/gold'));
const pT = AL('VERTICAL', { gap: 2 }); add(pT, await T('Weekly reward credited', 'Label/S', 'text/primary'), await T('+115.20 USDT · to Owed', 'Number/S', 'balance/owed'));
add(pill, pIc, pT, await DEMO('XS')); abs(art, pill, 12, 12); await fx(pill, 'Elevation/3 — Popover');
const cta = AL('VERTICAL', { name: 'Actions', gap: 12 }); add(C, [cta, 'FILL']);
const fair = AL('HORIZONTAL', { name: 'Fair-play promise', gap: 8, align: 'CENTER', fill: 'brand/tint-subtle', r: 10, p: [8, 12, 8, 12] }); add(fair, await IC('shield-check', 16, 'icon/brand'), [await T('VIP status never changes odds, payouts or draw results.', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']); add(cta, [fair, 'FILL']);
add(cta, [await BTN('Primary', 'Create free account', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'How points work', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const terms = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(terms, [await T('Terms apply · VIP rewards are paid in USDT — no wagering, no expiry', 'Caption', 'text/tertiary', { w: 230 }), 'FILL'], await I('6:159'), await DEMO('XS')); add(cta, [terms, 'FILL']);
const facts = AL('HORIZONTAL', { name: 'Programme facts', gap: 12, wrap: true, cgap: 12 }); add(C, [facts, 'FILL']);
for (const [ic, val, lab] of [['crown', '5 tiers · 29 levels', 'Bronze to Diamond'], ['coins', '1 pt per 1.00 USDT', 'real-money stakes only'], ['gift', 'Weekly reward', 'from Silver up · settles by itself'], ['calendar', 'Rolling 365 days', 'roll-off dates shown early']]) {
  const b = AL('VERTICAL', { name: 'Fact — ' + val, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 6, w: 173 });
  const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(b, [r, 'FILL']); add(r, await IC(ic, 20, 'icon/brand'), await DEMO('XS'));
  add(b, [await T(val, 'Body/M Strong', 'text/primary', { w: 141 }), 'FILL'], [await T(lab, 'Caption', 'text/secondary', { w: 141 }), 'FILL']); add(facts, b); }
add(C, [await mhead('THE LADDER', 'Five tiers, one rulebook', 'Swipe to compare tiers. Odds and results are identical for every player.', await DEMO('S')), 'FILL']);
const tw = AL('VERTICAL', { name: 'Tier carousel', gap: 12 }); add(C, [tw, 'FILL']);
const trk = AL('HORIZONTAL', { name: 'Track — swipe horizontally', gap: 12, clip: true, w: 358 }); add(tw, trk);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) { const c = await I('23:12669', { Tier: t, Current: 'No' }); c.name = 'Card/VIP Tier — ' + t; await vipFix(c); add(trk, c); }
const dots = AL('HORIZONTAL', { name: 'Pager', gap: 6, align: 'CENTER' }); add(dots, rect(24, 8, 'brand/primary', 9999, 'Dot — active')); for (let i = 0; i < 4; i++) add(dots, rect(8, 8, 'border/strong', 9999, 'Dot')); add(dots, await T('  1 / 5 · Bronze', 'Caption', 'text/tertiary')); add(tw, dots);
add(C, [await mhead('HOW POINTS WORK', 'Earn, level up, keep your tier', null), 'FILL']);
const hw = box('Points steps', { gap: 0, p: [4, 16, 4, 16] }); add(C, [hw, 'FILL']);
const stp = [['coins', 'Earn points', '1 point per 1.00 USDT entered in Global Pool or staked with real balance. Fees, bonus funds and refunds earn nothing.'], ['trending-up', 'Level up', '29 levels; each new level pays a one-off USDT reward to Available.'], ['gift', 'Collect weekly', 'From Silver up, calculated Mondays 10:00 UTC. Claim early or it settles by itself a week later.'], ['calendar', 'Keep your tier', 'Status points are a rolling 365-day total; roll-off dates are shown in advance.']];
for (let i = 0; i < stp.length; i++) add(hw, [await iconRow(stp[i][0], stp[i][1], stp[i][2], { line: i < 3 }), 'FILL']);
add(C, [await mhead('COMPARE TIERS', 'What each tier adds', 'Pick a tier to see its benefits.', await DEMO('S')), 'FILL']);
const tc = AL('HORIZONTAL', { name: 'Tier picker — scrolls', gap: 8, clip: true, w: 358 }); add(C, tc);
for (const t of ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']) add(tc, await I('17:2766', { State: t === 'Gold' ? 'Selected' : 'Default' }, { Label: t, 'Show icon': false }));
add(C, [await rowsList('Benefits — Gold', [['Points to unlock', '8,000 pts'], ['Levels in tier', '12–17'], ['Weekly reward', 1], ['Level-up reward per level', '2.00–15.00 USDT'], ['Monthly reward', 0], ['Support', 'Priority queue'], ['VIP tournaments', 'Monthly invitational']]), 'FILL']);
const fr = AL('HORIZONTAL', { name: 'Fairness note', gap: 8, fill: 'brand/tint-subtle', r: 10, p: 12 }); add(fr, await IC('shield-check', 16, 'icon/brand'), [await T('Odds, house edge, draws, withdrawal checks and limits and RG tools are identical for every tier. Rewards are paid in USDT, no wagering.', 'Caption', 'text/primary', { w: 300 }), 'FILL']); add(C, [fr, 'FILL']);
const rg = box('Responsible play — VIP', { gap: 12, p: 20 }); add(C, [rg, 'FILL']);
const rgh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 18, 'text/info')); add(rgh, rgi, await T('Play for fun — never chase a level', 'Heading/H5', 'text/primary')); add(rg, rgh);
add(rg, [await T('VIP rewards are never a reason to play more. No “almost there” nudges or VIP offers while a limit, cooling-off or self-exclusion is active. Leave VIP Club any time in Settings.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(rga, await BTN('Secondary', 'Set limits', { size: 'M' }), await BTN('Ghost', 'Get help', { size: 'M' }), await I('6:159')); add(rg, rga);
add(C, [await mhead('VIP FAQ', 'Common questions', null), 'FILL']);
const fq = box('FAQ — accordion', { gap: 0, p: [4, 16, 4, 16] }); add(C, [fq, 'FILL']);
const qs = [['Does my VIP tier change my odds?', 'No. Every player gets the same odds, house edge, payout tables and Global Pool draw. VIP status is never an input to any result.'], ['Can I lose my tier?', null], ['Are VIP rewards withdrawable?', null], ['Do fees, bonus funds or refunds earn points?', null]];
for (let i = 0; i < qs.length; i++) { const [q, a] = qs[i]; const it = AL('VERTICAL', { name: 'FAQ — ' + q, gap: 8, p: [14, 0, 14, 0] }); if (i < qs.length - 1) strokeSides(it, 'border/subtle', { b: 1 }); const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, [await T(q, 'Body/M Strong', 'text/primary', { w: 280 }), 'FILL'], await IC(a ? 'chevron-up' : 'chevron-down', 20, 'icon/muted')); add(it, [r, 'FILL']); if (a) add(it, [await T(a, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']); add(fq, [it, 'FILL']); }
await mlic(C);
await mfinish(S, await sticky('Create free account', 'Terms apply · 18+ · Play responsibly'));
fitSection(sec);
await C.screenshot({ scale: 0.45 });
return { frame: S.f.id, content: C.id, h: S.f.height };
