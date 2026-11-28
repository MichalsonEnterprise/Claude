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

function row(kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 8, align: o.align || 'CENTER', justify: o.justify }); add(r, ...kids); return r; }
function col(kids, o = {}) { const r = AL('VERTICAL', { name: o.name || 'Stack', gap: o.gap ?? 4, align: o.align }); add(r, ...kids); return r; }
async function wrapT(parent, text, style, color, w, name) { const t = await T(text, style, color, { w, name }); parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
function bar(w, pct, color = 'brand/primary') { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h: 6 }); const f = rect(Math.max(6, Math.round(w * pct)), 6, color, 9999, 'Meter fill'); add(tr, f); return tr; }
// modal shell (W = 560 desktop, 390 mobile sheet). sheet=true -> top radius 28 + grabber, no close icon
async function modalShell(W, title, sub, icon, iconColor, tile, sheet) {
  const m = AL('VERTICAL', { name: 'Modal — ' + title, fill: 'surface/overlay', stroke: 'border/subtle', r: sheet ? 0 : 20, clip: true }); m.resize(W, 100); m.counterAxisSizingMode = 'FIXED';
  if (sheet) { for (const c of ['topLeftRadius', 'topRightRadius']) m.setBoundVariable(c, VAR['radius/2xl']); const g = AL('HORIZONTAL', { name: 'Handle', p: [8, 0, 4, 0], justify: 'CENTER' }); add(g, rect(40, 4, 'border/strong', 9999, 'Grabber')); add(m, [g, 'FILL']); }
  await fx(m, 'Elevation/4 — Modal');
  const P = sheet ? 16 : 24;
  const hd = AL('HORIZONTAL', { name: 'Header', p: [sheet ? 8 : 24, P, 20, P], gap: 16, align: 'MIN' }); strokeSides(hd, 'border/subtle', { b: 1 }); add(m, [hd, 'FILL']);
  const tl = AL('HORIZONTAL', { name: 'Icon tile', fill: tile, r: 10, w: 44, h: 44, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC(icon, 22, iconColor)); add(hd, tl);
  const tg = AL('VERTICAL', { name: 'Title group', gap: 4 }); add(hd, [tg, 'FILL']);
  add(tg, row([await T(title, 'Heading/H4', 'text/primary', { name: 'Title' }), await DEMO('S')], { gap: 8 })); await wrapT(tg, sub, 'Body/S', 'text/secondary', W - 2 * P - 120, 'Subtitle');
  add(hd, await I('7:774', { Type: 'Ghost', Size: sheet ? 'M' : 'S', State: 'Default' }, { Icon: ICONS.x }));
  const body = AL('VERTICAL', { name: 'Body', p: [20, P, 20, P], gap: 16 }); add(m, [body, 'FILL']);
  const ft = AL('VERTICAL', { name: 'Footer', p: [16, P, sheet ? 34 : 24, P], gap: 12 }); strokeSides(ft, 'border/subtle', { t: 1 }); add(m, [ft, 'FILL']);
  return { m, body, ft, iw: W - 2 * P };
}
async function stepItem(state, title, desc, iw, extra) {
  const it = AL('HORIZONTAL', { name: 'Step — ' + title, gap: 12, align: 'MIN' });
  const S = { done: ['status/success-tint', 'check', 'status/success'], current: ['status/info-tint', 'spinner', 'status/info'], next: [null, null, null] }[state];
  const dot = AL('HORIZONTAL', { name: 'Indicator', r: 9999, w: 28, h: 28, align: 'CENTER', justify: 'CENTER', fill: S[0] || undefined, stroke: S[0] ? undefined : 'border/strong' });
  if (S[1]) add(dot, await IC(S[1], 16, S[2])); else add(dot, await T('3', 'Label/M', 'text/tertiary'));
  add(it, dot);
  const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(it, [c, 'FILL']);
  await wrapT(c, title, 'Label/L', state === 'next' ? 'text/secondary' : 'text/primary', iw - 40); await wrapT(c, desc, 'Body/S', 'text/tertiary', iw - 40);
  if (extra) add(c, extra);
  return it;
}
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, justify: 'SPACE_BETWEEN', align: 'CENTER', gap: 12 }); add(r, await T(label, 'Body/S', 'text/secondary'), await T(value, o.style || 'Label/M', o.color || 'text/primary')); return r; }
async function callout(text, tone, icon, iw) { const c = AL('HORIZONTAL', { name: 'Callout', gap: 10, p: 12, fill: tone + '-tint', r: 10, align: 'MIN' }); add(c, await IC(icon, 18, tone)); await wrapT(c, text, 'Body/S', 'text/secondary', iw - 52); return c; }
async function pendingBody(body, ft, iw, mobile) {
  const sum = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Amount', p: 16, gap: 8, fill: 'surface/raised', r: 14, justify: mobile ? undefined : 'SPACE_BETWEEN', align: mobile ? undefined : 'CENTER' }); add(body, [sum, 'FILL']);
  add(sum, col([await T('YOU PAY', 'Overline', 'text/tertiary'), await T('351.75 USDT', 'Number/L', 'text/primary')], { gap: 4 }), col([await T('35 × 10.00 = 350.00 USDT', 'Caption', 'text/secondary'), await T('Platform fee 35 × 0.05 = 1.75 USDT', 'Caption', 'text/secondary'), await T('Network fee 0.00 USDT', 'Caption', 'text/secondary')], { gap: 2, align: mobile ? undefined : 'MAX' }));
  const steps = AL('VERTICAL', { name: 'Progress steps', gap: 16 }); add(body, [steps, 'FILL']);
  add(steps, [await stepItem('done', 'Balance reserved', '351.75 USDT moved from Available to Locked at 16:42:20 UTC.', iw), 'FILL']);
  const h = await I('20:5893', { State: 'Default' }, { Hash: '0x3a7c…9e02' });
  add(steps, [await stepItem('current', 'Recording 35 entries on Arbitrum', 'GLOBAL POOL submits one batch transaction for you · 2 of 3 confirmations.', iw, h), 'FILL']);
  add(steps, [await stepItem('next', 'Entry receipt', 'IDs E-1248-00981 … E-1248-01015 are issued when the batch confirms, usually in under a minute.', iw), 'FILL']);
  add(body, col([bar(iw, 0.66, 'status/info'), await T('Step 2 of 3 · about 20 seconds left', 'Caption', 'text/tertiary')], { gap: 6, name: 'Progress' }));
  add(body, [await callout('Round #1,248 closes at 20:00:00 UTC. Entries recorded before close are in the draw. If recording fails, 351.75 USDT goes straight back to Available — nothing is charged.', 'status/info', 'info', iw), 'FILL']);
  const b = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Actions', gap: 12 }); add(ft, [b, 'FILL']);
  const c1 = await BTN('Secondary', 'Close — we’ll notify you', { size: 'L' }); const c2 = await BTN('Gold', 'Confirming 35 entries…', { size: 'L', state: 'Loading' }); if (mobile) add(b, [c2, 'FILL'], [c1, 'FILL']); else add(b, [c1, 'FILL'], [c2, 'FILL']);
  add(ft, row([await I('6:159'), await T('You can lose your stake. Closing this window does not cancel your entries.', 'Caption', 'text/tertiary', { w: iw - 50 })], { gap: 8 }));
}
async function successBody(body, ft, iw, mobile) {
  const tk = await I('23:8534', { State: 'Active' });
  if (mobile) { add(body, tk); tk.rescale(iw / 400); }
  else { const tr = AL('HORIZONTAL', { name: 'Ticket', gap: 16, align: 'CENTER' }); add(body, [tr, 'FILL']); add(tr, tk, col([await T('×35', 'Number/L', 'text/primary'), await T('entries in this round', 'Caption', 'text/tertiary', { w: 96 })], { gap: 2 })); }
  const rc = AL('VERTICAL', { name: 'Receipt', p: 16, gap: 10, fill: 'surface/raised', r: 14 }); add(body, [rc, 'FILL']);
  for (const [l, v, s] of [['Round', '#1,248 · Global Pool'], ['Entry IDs', 'E-1248-00981 … 01015', 'Mono/S'], ['Draw', '27 Nov 2026, 20:00:00 UTC'], ['Randomness', 'Chainlink VRF · Arbitrum']]) { const r = await kv(l, v, { style: s }); add(rc, [r, 'FILL']); }
  const fb = await I('20:8583', { Type: 'Entry' }); add(body, [fb, 'FILL']);
  const lk = await kv('Locked until the draw', '350.00 USDT', { color: 'balance/locked' }); add(body, [lk, 'FILL']);
  const h = await I('20:5893', { State: 'Default' }, { Hash: '0x3a7c…9e02' }); add(body, h);
  add(body, [await callout('≈2.44% chance of any of the 13 prizes · ≈0.188% chance of 1st. Results are published with the VRF proof after 20:00 UTC.', 'status/info', 'percent', iw), 'FILL']);
  const lim = col([row([await T('Today’s participation', 'Caption', 'text/tertiary'), await T('351.75 / 500.00 USDT', 'Label/M', 'text/primary')], { gap: 8, justify: 'SPACE_BETWEEN' }), bar(iw, 0.7035)], { gap: 6, name: 'RG limit' }); add(body, [lim, 'FILL']); lim.children[0].layoutSizingHorizontal = 'FILL';
  const b = AL(mobile ? 'VERTICAL' : 'HORIZONTAL', { name: 'Actions', gap: 12 }); add(ft, [b, 'FILL']);
  const p1 = await BTN('Primary', 'View my entries', { size: 'L', trail: 'arrow-right' }); const p2 = await BTN('Secondary', 'Back to Global Pool', { size: 'L' }); const p3 = await BTN('Ghost', 'Download receipt', { size: mobile ? 'L' : 'L', lead: 'download' });
  if (mobile) add(b, [p1, 'FILL'], [p2, 'FILL'], [p3, 'FILL']); else add(b, p3, [p2, 'FILL'], [p1, 'FILL']);
}

const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile A', 161000, 0);
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
async function st(root, name, val, nth = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[nth]; if (!t) return null; await lf(t); t.characters = val; return t; }
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { any = true; m = Math.max(m, c.y + c.height); } return any ? m + 160 : 160; }
async function overlayM(name, X, sheet, pre) {
  for (const o of sec.children.filter(n => n.name === name)) o.remove();
  const vh = Math.max(844, Math.round(sheet.height) + 120); const Y = colY(X);
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = X; f.y = Y; f.primaryAxisSizingMode = 'AUTO';
  add(f, [await DEMOBAR('DEMO DATA — illustrative figures only, not real.'), 'FILL']);
  const vp = figma.createFrame(); vp.name = 'Viewport — bottom sheet over Global Pool hub'; vp.fills = []; vp.clipsContent = true; vp.resize(390, vh); add(f, [vp, 'FILL']);
  const src = await figma.getNodeByIdAsync('34:434743');
  const bg = src.clone(); bg.name = 'Background — hub (inert)'; vp.appendChild(bg); bg.x = 0; bg.y = 0;
  for (const nm of ['Notice/Demo Data', 'Shell/Footer Mega', 'Sticky participate bar (pinned above tab bar)', 'Nav/Mobile Tab Bar']) { const n = bg.children.find(c => c.name === nm); if (n) n.remove(); }
  if (pre) { const me = bg.findOne(n => n.name === 'My entries'); await st(me, 'ME count', '0'); await st(me, 'ME sub', 'entries in #1,248 yet'); await st(me, 'ME locked', '0.00 USDT locked'); await st(me, 'ME fees', 'appear once confirmed'); await st(me, 'ME ids', '—'); await st(me, 'ME limit', '0.00 / 500.00'); const mf = me.findOne(n => n.name === 'Meter fill'); if (mf) mf.resize(6, 6); }
  const scrim = rect(390, vh, 'scrim/overlay', 0, 'Scrim'); vp.appendChild(scrim);
  vp.appendChild(sheet); sheet.x = 0; sheet.y = vh - Math.round(sheet.height);
  fitSection(sec);
  return { f, vp, bg };
}
async function sheetFromModal(state) {
  const w = AL('VERTICAL', { name: 'Sheet — Participation preview / ' + state, fill: 'surface/overlay', clip: true }); w.resize(390, 100); w.counterAxisSizingMode = 'FIXED';
  for (const c of ['topLeftRadius', 'topRightRadius']) w.setBoundVariable(c, VAR['radius/2xl']); strokeSides(w, 'border/subtle', { t: 1 }); await fx(w, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Handle', p: [8, 0, 4, 0], justify: 'CENTER' }); add(g, rect(40, 4, 'border/strong', 9999, 'Grabber')); add(w, [g, 'FILL']);
  const m = await I('28:19099', { State: state }); add(w, [m, 'FILL']);
  m.fills = []; m.strokes = []; m.effects = []; for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) m[c] = 0;
  for (const nm of ['Header', 'Body', 'Footer']) { const n = m.findOne(x => x.name === nm); if (!n) continue; n.setBoundVariable('paddingLeft', VAR['space/4']); n.setBoundVariable('paddingRight', VAR['space/4']); }
  const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [4, 0, 8, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(w, [hi, 'FILL']);
  return w;
}

// ===== GP-03 / GP-04 mobile 390 bottom sheets (page 10, section 'GP — Mobile A') =====
// needs: helpers.js + modals.js + msheet.js above
const out = { created: {}, skipped: [], log: [] };
let T3 = ['Confirming your 35 entries', 'Round #1,248 · paid from your platform balance · no gas'];
let T4 = ['You’re in round #1,248', '35 entries confirmed on Arbitrum at 16:42:41 UTC'];
try {
  const p7 = figma.root.children.find(p => p.name === '07 — Global Pool'); await p7.loadAsync();
  for (const [id, arr] of [['34:365199', T3], ['34:383862', T4]]) {
    const d = await figma.getNodeByIdAsync(id); const m = d && d.findOne(n => n.name.startsWith('Modal — '));
    if (m) { arr[0] = m.name.slice(8); const s = m.findOne(n => n.type === 'TEXT' && n.name === 'Subtitle'); if (s) arr[1] = s.characters; }
  }
} catch (e) { out.log.push('desktop title read failed: ' + e.message); }
out.log.push({ T3, T4 });
function fitWide(root, maxW) { for (const n of root.findAll(x => x.type === 'INSTANCE' && x.name === 'Tx/Hash')) { if (n.width > maxW && n.parent && n.parent.layoutMode && n.parent.layoutMode !== 'NONE') n.layoutSizingHorizontal = 'FILL'; } }
const shots = [];
const N3 = '[GP-03] Participation Pending / 390 / Bottom sheet';
if (sec.children.some(n => n.name.startsWith('[GP-03] Participation Pending / 390'))) out.skipped.push(N3);
else {
  const { m, body, ft, iw } = await modalShell(390, T3[0], T3[1], 'hourglass', 'status/info', 'status/info-tint', true);
  m.name = 'Sheet — Participation pending';
  await pendingBody(body, ft, iw, true);
  fitWide(body, iw - 40);
  const r = await overlayM(N3, 1140, m, true);
  out.created[N3] = r.f.id; shots.push(r.f);
}
const N4 = '[GP-04] Participation Success — Entry receipt / 390 / Bottom sheet';
if (sec.children.some(n => n.name.startsWith('[GP-04] Participation Success — Entry receipt / 390'))) out.skipped.push(N4);
else {
  const { m, body, ft, iw } = await modalShell(390, T4[0], T4[1], 'check-circle', 'status/success', 'status/success-tint', true);
  m.name = 'Sheet — Entry receipt';
  await successBody(body, ft, iw, true);
  fitWide(body, iw);
  const r = await overlayM(N4, 1650, m, false);
  out.created[N4] = r.f.id; shots.push(r.f);
}
// consistency fix: round #1,248 1st prize = @orbit_77 (GP-07 public results). Patch the Winner Reveal Card on the mobile No-round hub.
for (const fr of sec.children.filter(n => / No active round$/.test(n.name))) {
  for (const t of fr.findAll(n => n.type === 'TEXT' && n.characters.includes('@lumen.eth'))) { await lf(t); t.characters = t.characters.replace(/@lumen\.eth/g, '@orbit_77'); out.log.push('handle fixed in ' + fr.name); }
}
fitSection(sec);
out.frames = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
for (const f of shots) await f.screenshot({ scale: 0.6 });
// re-verify sticky participate bar on the 390 Restricted / Wallet-disconnected hubs
for (const id of ['34:473267', '34:482737']) { const f = await figma.getNodeByIdAsync(id); if (!f) continue; const sb = f.findOne(n => n.name === 'Sticky participate bar (pinned above tab bar)'); if (sb) await sb.screenshot({ scale: 1 }); }
return out;
