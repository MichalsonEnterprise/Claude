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
  const f = figma.createAutoLayout('VERTICAL'); f.name = name; f.resize(w, o.h || 800); f.counterAxisSizingMode = 'FIXED'; if (o.h) f.primaryAxisSizingMode = 'FIXED';
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
const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM — Mobile', 217000, 0);
if (sec.children.find(n => n.name.startsWith('[ADM-F2]'))) throw new Error('ADM-F2 mobile frames already exist');
function setT(root, name, v, i = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = ts[i]; if (t && v != null) t.characters = String(v); return t; }
function setP(inst, base, val) { const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); }
const SPC = () => { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; };
const X0 = nextX(sec); const Y0 = 160;
async function mshell(name, x, y, back) {
  const f = await screen(name, 390, {}); f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Mobile', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  if (back) { add(bar, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] })); add(bar, await T(back, 'Label/L', 'text/primary')); }
  else { const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm); add(bar, await T('Admin', 'Label/L', 'text/primary')); const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env); }
  add(bar, [SPC(), 'FILL']);
  const ap = AL('HORIZONTAL', { name: 'Approvals', gap: 2, align: 'CENTER' }); add(ap, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['user-check'] })); const bc = await I('6:216', { Size: 'S' }); setP(bc, 'Count', '4'); add(ap, bc); add(bar, ap);
  add(bar, await I('9:238', { Size: 'S' }, { Initials: 'AM' }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']);
  return { f, c };
}
async function tabbar(f, active) { const tb = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tb, 'border/subtle', { t: 1 }); const row = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] }); for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['user-check', 'Approvals', 4], ['withdraw', 'Withdrawals'], ['shield-alert', 'Alerts', 5], ['menu', 'More']]) { const on = lab === active; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = AL('HORIZONTAL', { name: 'Icon', gap: 2 }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', String(cnt)); add(ir, b); } add(t, ir); add(t, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(row, [t, 'FILL']); } add(tb, [row, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tb, [hi, 'FILL']); add(f, [tb, 'FILL']); return tb; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p ?? 14, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
async function kvm(k, a, b, col = 'text/primary', st = 'Body/S Strong') { const r = AL('HORIZONTAL', { name: 'KV ' + a, gap: 8, align: 'CENTER' }); add(r, await T(a, 'Body/S', 'text/tertiary')); add(r, [SPC(), 'FILL']); add(r, await T(b, st, col)); add(k, [r, 'FILL']); }
async function note(k, icon, col, text, fillc) { const r = AL('HORIZONTAL', { name: 'Note', gap: 8, p: fillc ? 12 : 0, fill: fillc, r: fillc ? 10 : undefined }); add(r, await IC(icon, 16, col)); const t = await T(text, 'Caption', fillc ? 'text/secondary' : 'text/tertiary', { w: 300 }); add(r, [t, 'FILL']); add(k, [r, 'FILL']); }
const made = [];
{ const { f, c } = await mshell('[ADM-F2] Withdrawals — Queue / 390 / Default', X0, Y0);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('Withdrawals', 'Heading/H3', 'text/primary'), await BADGE('Live')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
  const sub = await T('Four-eyes on any AML flag or from 10,000.00 USDT · amount and destination can’t be changed · times UTC', 'Caption', 'text/tertiary', { w: 358 }); add(c, [sub, 'FILL']);
  const strip = AL('HORIZONTAL', { name: 'Stats (scrolls)', gap: 8, clip: true });
  for (const [v, l, s] of [['37', 'pending', 'oldest 53 min · SLA 4 h'], ['4', 'awaiting 2nd approver', 'policy FIN-2.3'], ['6', 'under review · AML', '9,480.00 USDT held']]) { const k = AL('VERTICAL', { name: 'Stat ' + l, gap: 2, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 12, w: 156 }); add(k, await T(v, 'Number/M', 'text/primary'), await T(l, 'Body/S Strong', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(strip, k); }
  add(c, [strip, 'FILL']);
  const si = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); const sv = si.findOne(n => n.type === 'TEXT'); if (sv) sv.characters = 'Search WD- ID, user, address'; add(c, [si, 'FILL']);
  const chips = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Queue · 37', 'Selected'], ['Awaiting 2nd · 4', 'Default'], ['Broadcasting · 12', 'Default'], ['High risk', 'Default']]) add(chips, await I('17:2766', { State: s }, { Label: l, 'Show icon': false })); add(c, [chips, 'FILL']);
  for (const r of [['WD-20931', 'Under review', '1,500.00', 'NK', '@nova.k', 'Arbitrum', '0x7c4e…a21D', 'Medium', '41', '17:55', 'AML-3317 · first payout to this address'], ['WD-20944', 'Pending', '2,250.00', 'OR', '@orbit_77', 'BNB Chain', '0x91d3…4be0', 'Low', '9', '18:02', null], ['WD-20952', 'Under review', '12,400.00', 'KE', '@kestrel', 'Ethereum', '0x2b7e…90aF', 'High', '86', '18:21', 'High risk — Compliance decides'], ['WD-20947', 'Pending', '640.00', 'MS', '@mira.sol', 'Solana', '7Fk2…Qp4M', 'Low', '14', '18:10', null]]) {
    const k = card('Request ' + r[0], { gap: 10 });
    const l1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER', name: 'L1' }); add(l1, await T(r[0], 'Mono/S', 'text/primary'), await BADGE(r[1])); add(l1, [SPC(), 'FILL']); add(l1, await IC('chevron-right', 20, 'icon/muted')); add(k, [l1, 'FILL']);
    const l2 = AL('HORIZONTAL', { gap: 6, align: 'MAX', name: 'L2' }); add(l2, await T(r[2], 'Number/M', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary'), await DEMO('XS')); add(k, l2);
    const l3 = AL('HORIZONTAL', { gap: 8, align: 'CENTER', name: 'L3' }); add(l3, await I('9:238', { Size: 'XS' }, { Initials: r[3] }), await T(r[4], 'Body/S', 'text/secondary'), await CHAIN(r[5], 14), await T(r[6], 'Mono/S', 'text/tertiary')); add(k, l3);
    const l4 = AL('HORIZONTAL', { gap: 8, align: 'CENTER', name: 'L4' }); const rk = await I('23:5378', { Level: r[7], Density: 'Compact' }); setT(rk, 'Score', '· ' + r[8]); add(l4, rk); add(l4, [SPC(), 'FILL']); add(l4, await T('Requested ' + r[9] + ' UTC', 'Caption', 'text/tertiary')); add(k, [l4, 'FILL']);
    if (r[10]) { const w = await T(r[10], 'Caption', r[7] === 'High' ? 'text/danger' : 'text/warning'); add(k, w); }
    add(c, [k, 'FILL']);
  }
  const lm = await BTN('Secondary', 'Load 10 more', { size: 'L' }); add(c, [lm, 'FILL']); const lc = await T('Showing 4 of 37 · oldest first', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' }); add(c, [lc, 'FILL']);
  await tabbar(f, 'Withdrawals'); made.push(f); }
let D;
{ const { f, c } = await mshell('[ADM-F2] Withdrawal WD-20931 — Detail / 390 / Under review', X0 + 510, Y0, 'Withdrawals'); D = f;
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('WD-20931', 'Heading/H3', 'text/primary'), await BADGE('Under review')); add(c, tr);
  const tr2 = AL('HORIZONTAL', { name: 'Chips', gap: 8, align: 'CENTER' }); const flag = AL('HORIZONTAL', { name: 'AML flag chip', gap: 6, p: [4, 10, 4, 8], fill: 'status/warning-tint', r: 9999, align: 'CENTER' }); add(flag, await IC('shield-alert', 14, 'status/warning'), await T('AML-3317 · new destination', 'Label/S', 'text/warning')); add(tr2, flag, await DEMO('M')); add(c, tr2);
  const sb = await T('Requested 27 Nov 2026, 17:55 UTC by @nova.k · SLA due 21:55 UTC (3 h 40 min left) · assigned to you', 'Caption', 'text/tertiary', { w: 358 }); add(c, [sb, 'FILL']);
  const am = card('Amount'); const ah = AL('HORIZONTAL', { gap: 6, align: 'MAX', name: 'Amount' }); add(ah, await T('1,500.00', 'Number/L', 'text/primary'), await T('USDT', 'Label/M', 'text/secondary')); add(ah, [SPC(), 'FILL']); add(ah, await DEMO('S')); add(am, [ah, 'FILL']);
  await kvm(am, 'Network fee · Arbitrum', '−0.08 USDT'); await kvm(am, 'Platform fee', '0.00 USDT'); await kvm(am, 'User receives', '1,499.92 USDT', 'text/success', 'Number/S'); add(c, [am, 'FILL']);
  const de = card('Destination', { gap: 8 }); add(de, await T('Destination', 'Label/M', 'text/secondary')); const ad = await I('9:418', { Size: 'M', State: 'Default' }, { Address: '0x7c4e…a21D' }); const cm = ad.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Chain/')); if (cm) cm.swapComponent(await figma.getNodeByIdAsync(CHAINS['Arbitrum'])); add(de, ad);
  const w1 = await T('Whitelisted 14 Oct 2026 · first payout to this address', 'Caption', 'text/warning', { w: 320 }); add(de, [w1, 'FILL']); const w2 = await T('Arbitrum · USDT (Arbitrum One) · ownership proven by signed message', 'Caption', 'text/tertiary', { w: 320 }); add(de, [w2, 'FILL']); add(c, [de, 'FILL']);
  const sc = card('Screening', { gap: 8 }); const sh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', name: 'Head' }); add(sh, await T('Screening · 2 flags', 'Heading/H5', 'text/primary')); add(sh, [SPC(), 'FILL']); add(sh, await T('17:55 UTC', 'Caption', 'text/tertiary')); add(sc, [sh, 'FILL']);
  for (const [ok, t1, res] of [[1, 'Sanctions screening', 'Clear'], [1, 'Destination risk · 6 / 100', 'Low'], [1, 'Address ownership', 'Verified'], [0, 'First payout to this address', 'Flagged'], [0, 'Amount 3.1× 90-day median', 'Flagged']]) { const r = AL('HORIZONTAL', { name: 'Check', gap: 10, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10, align: 'CENTER' }); add(r, await IC(ok ? 'check-circle' : 'alert-triangle', 18, ok ? 'status/success' : 'status/warning')); const t = await T(t1, 'Body/S', 'text/primary', { w: 200 }); add(r, [t, 'FILL']); add(r, await T(res, 'Label/M', ok ? 'text/success' : 'text/warning')); add(sc, [r, 'FILL']); }
  add(c, [sc, 'FILL']);
  const cu = card('Customer', { gap: 8 }); const ch = AL('HORIZONTAL', { gap: 10, align: 'CENTER', name: 'Head' }); add(ch, await I('9:238', { Size: 'M' }, { Initials: 'NK' })); const nm = AL('VERTICAL', { gap: 2, name: 'Name' }); add(nm, await T('@nova.k', 'Body/M Strong', 'text/primary'), await T('GP-48213 · VIP Gold', 'Caption', 'text/tertiary')); add(ch, [nm, 'FILL']); add(ch, await DEMO('S')); add(cu, [ch, 'FILL']); add(cu, await I('23:5565', { Status: 'Approved', Level: 'L2' }));
  await kvm(cu, 'Available', '9,215.30 USDT'); await kvm(cu, 'Locked (incl. this)', '1,850.00 USDT'); await kvm(cu, 'AML risk score', 'Medium · 41', 'text/warning'); add(c, [cu, 'FILL']);
  const dc = card('Decision', { gap: 10, stroke: 'border/brand' }); add(dc, await T('Decision · four-eyes required', 'Heading/H5', 'text/primary'));
  for (const [n, t1, t2, st, lab, on] of [[1, 'First approver — you', 'A. Marin · reason + 2FA', 'Pending', 'Your turn', 1], [2, 'Second approver', 'Compliance or Super Admin · within 4 h', 'Neutral', 'Locked', 0]]) { const r = AL('HORIZONTAL', { name: 'Step ' + n, gap: 10, p: [10, 12, 10, 12], fill: on ? 'brand/tint-subtle' : 'surface/raised', r: 10, align: 'CENTER' }); const num = AL('HORIZONTAL', { name: 'Num', w: 28, h: 28, fill: on ? 'brand/primary' : 'surface/hover', r: 9999, align: 'CENTER', justify: 'CENTER' }); add(num, await T(String(n), 'Label/M', on ? 'text/on-primary' : 'text/secondary')); add(r, num); const tx = AL('VERTICAL', { gap: 2, name: 'Text' }); add(tx, await T(t1, 'Body/S Strong', 'text/primary')); const s2 = await T(t2, 'Caption', 'text/tertiary', { w: 160 }); add(tx, [s2, 'FILL']); add(r, [tx, 'FILL']); const b = await BADGE(st); setT(b, 'Label', lab); add(r, b); add(dc, [r, 'FILL']); }
  await note(dc, 'lock', 'icon/muted', 'Amount and destination are locked. Rejecting returns 1,500.00 USDT to the user’s Available balance and needs a reason + second approver.');
  add(c, [dc, 'FILL']);
  const sticky = AL('VERTICAL', { name: 'Sticky action bar', gap: 8, p: [12, 16, 0, 16], fill: 'surface/overlay' }); strokeSides(sticky, 'border/subtle', { t: 1 });
  const ar = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(ar, await BTN('Danger', 'Reject', { size: 'L', lead: 'x-circle' })); add(ar, [await BTN('Primary', 'Approve · 1 of 2', { size: 'L', lead: 'shield-check' }), 'FILL']); add(sticky, [ar, 'FILL']);
  const cap = await T('2FA + written reason required · recorded in the audit log', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' }); add(sticky, [cap, 'FILL']);
  const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(sticky, [hi, 'FILL']);
  add(f, [sticky, 'FILL']); made.push(f); }
{ const fr = D.clone(); sec.appendChild(fr); fr.x = D.x; fr.y = D.y + D.height + 160; fr.name = '[ADM-F2] Withdrawal WD-20931 — Detail / 390 / Approve sheet (reason + 2FA)';
  const s = rect(390, fr.height, 'scrim/overlay', 0, 'Scrim'); fr.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — Approve step 1', fill: 'surface/overlay', w: 390 }); await fx(sh, 'Elevation/4 — Modal'); sh.setBoundVariable('topLeftRadius', VAR['radius/2xl']); sh.setBoundVariable('topRightRadius', VAR['radius/2xl']); sh.clipsContent = true;
  const gb = AL('HORIZONTAL', { name: 'Grabber', p: [8, 0, 4, 0], justify: 'CENTER' }); add(gb, rect(36, 4, 'border/strong', 9999, 'Handle')); add(sh, [gb, 'FILL']);
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 8, p: [4, 12, 8, 16], align: 'CENTER' }); const tt = AL('VERTICAL', { gap: 2, name: 'Titles' }); add(tt, await T('Approve WD-20931 · step 1 of 2', 'Heading/H5', 'text/primary'), await T('1,500.00 USDT → 0x7c4e…a21D · Arbitrum', 'Caption', 'text/tertiary')); add(hd, [tt, 'FILL']); add(hd, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['x'] })); add(sh, [hd, 'FILL']);
  const bd = AL('VERTICAL', { name: 'Body', gap: 14, p: [8, 16, 16, 16] });
  add(bd, [await I('13:565', { State: 'Default' }, { Label: 'Reason category', Value: 'AML reviewed — false positive', 'Show helper': false }), 'FILL']);
  const ta = await I('16:3858', { State: 'Focus' }, { Label: 'Reason (required)', 'Show counter': true }); setT(ta, 'Value text', 'AML-3317 reviewed: amount fits the account’s funding (DP-77380, DP-77412). Destination proven 14 Oct 2026; no sanctions or cluster exposure.'); setT(ta, 'Counter', '151 / 500'); add(bd, [ta, 'FILL']);
  const otp = await I('16:3761', { State: 'Complete' }, { Label: '2FA code', Description: 'Enter the 6-digit code from your authenticator app.' }); add(bd, [otp, 'FILL']);
  await note(bd, 'users', 'status/warning', 'A second admin must approve — Compliance or Super Admin, not you. Funds stay Locked until then; the request expires after 4 h.', 'status/warning-tint');
  await note(bd, 'lock', 'icon/muted', 'Your admin ID, role, reason, IP and time are written to the immutable audit log.');
  add(sh, [bd, 'FILL']);
  const ft = AL('VERTICAL', { name: 'Footer', gap: 0, p: [12, 16, 0, 16] }); strokeSides(ft, 'border/subtle', { t: 1 }); const fa = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(fa, await BTN('Secondary', 'Cancel', { size: 'L' })); add(fa, [await BTN('Primary', 'Approve & send', { size: 'L', lead: 'shield-check' }), 'FILL']); add(ft, [fa, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(ft, [hi, 'FILL']); add(sh, [ft, 'FILL']);
  fr.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = fr.height - sh.height; made.push(fr); }
fitSection(sec);
for (const m of made) await m.screenshot({ scale: 0.5 });
return { X0, made: made.map(m => [m.id, m.name, Math.round(m.x), Math.round(m.y), Math.round(m.height)]), sec: sec.id };
