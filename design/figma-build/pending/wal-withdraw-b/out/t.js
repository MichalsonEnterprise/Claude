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

// ===== WAL-WB common (pruned) =====
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
// ===== WAL-WB desktop shell (page 06) =====
const page = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(page);
const sec = section('WAL-15..19 Withdraw steps 6–9', 52000, 0);
const COLX = [120, 1680, 3240, 4800, 6360];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2 && !c.name.includes('/ 768 /')) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
async function shellD(name, n, x, ctx) {
  const y = colY(x);
  const f = await screen(name, 1440, {}); f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(k => k.type === 'INSTANCE' && (k.name === 'Item/Lobby' || k.name === 'Item/Wallet'))) it.setProperties({ State: it.name === 'Item/Wallet' ? 'Active' : 'Default' });
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  add(main, [await I('23:9832', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 24, p: 32 }); add(main, [ct, 'FILL']);
  const ph = hrow('Page header', 16); add(ct, [ph, 'FILL']);
  const ti = AL('VERTICAL', { name: 'Title', gap: 4 }); add(ph, [ti, 'FILL']);
  await tx(ti, 'Withdraw USDT', 'Heading/H2', 'text/primary', { hug: true });
  await tx(ti, 'Send USDT from your Available balance to an external wallet in a few short steps. GLOBAL POOL charges no withdrawal fee — you only pay the network fee, shown before you confirm.', 'Body/M', 'text/secondary');
  ph.appendChild(await DEMO('M')); ph.appendChild(await BTN('Ghost', 'Withdrawal history', { lead: 'history' })); ph.appendChild(await BTN('Secondary', 'Deposit', { lead: 'deposit' }));
  const nav = hrow('Wallet sub-nav', 24, { align: 'MAX' }); strokeSides(nav, 'border/subtle', { b: 1 }); add(ct, [nav, 'FILL']);
  for (const l of ['Overview', 'Deposit', 'Withdraw', 'Transaction history', 'Connected wallets', 'Address whitelist']) nav.appendChild(await I('20:6831', { State: l === 'Withdraw' ? 'Active' : 'Default' }, { Label: l }));
  const sbar = hrow('Stepper bar', 24, { p: [16, 24, 16, 24], fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(ct, [sbar, 'FILL']);
  const fl = AL('VERTICAL', { name: 'Flow label', gap: 2 }); sbar.appendChild(fl);
  await tx(fl, 'WITHDRAW · STEP ' + n + ' OF 9', 'Overline', 'text/tertiary', { hug: true }); await tx(fl, ctx, 'Body/S Strong', 'text/primary', { hug: true });
  const stp = await I('15:3122', { Steps: 9, Current: n }); add(sbar, [stp, 'FILL']);
  const row = AL('HORIZONTAL', { name: 'Flow + summary', gap: 24 }); add(ct, [row, 'FILL']);
  const fc = card('Flow card', { gap: 20, p: 24, r: 20, w: 640 }); row.appendChild(fc);
  const side = AL('VERTICAL', { name: 'Side summary', gap: 16 }); add(row, [side, 'FILL']);
  return { f, fc, side, ct, stp };
}
// footer from a CTA spec {back, backIcon, alt:[[type,label,icon]], note, next, nextType, state, lead, trail}
async function ffootS(fc, o) { const r = hrow('Flow footer', 12, { p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(fc, [r, 'FILL']); if (o.back) r.appendChild(await BTN('Ghost', o.back, { size: 'L', lead: o.backIcon === undefined ? 'arrow-left' : o.backIcon })); for (const [ty, l, ic] of (o.alt || [])) r.appendChild(await BTN(ty, l, { size: 'L', lead: ic })); sp(r); if (o.note) await tx(r, o.note, 'Caption', 'text/tertiary', { hug: true }); if (o.next) r.appendChild(await BTN(o.nextType || 'Primary', o.next, { size: 'L', state: o.state || 'Default', lead: o.lead, trail: o.trail === undefined ? 'arrow-right' : o.trail })); return r; }
// mark the last (or idx) Step Item of a Nav/Stepper instance as Error
async function stepErr(stp, idx) { const items = []; for (const n of stp.findAll(x => x.type === 'INSTANCE')) { const mc = await n.getMainComponentAsync(); if (mc && mc.parent && mc.parent.id === '14:1193') items.push(n); } const it = items[idx == null ? items.length - 1 : idx]; if (it) it.setProperties({ State: 'Error' }); return items.length; }
// ===== END WAL-WB desktop shell =====

// ===== BODY tab — Tablet 768 defaults (WAL-15..19), cloned flow + summary cards from the desktop masters =====
function setStepM(s, n, label, next, err) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = next ? 'Next: ' + next : (err ? 'Withdrawal not sent — funds returned' : 'All steps complete'); const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; if (err) seg(n).fills = [paint('status/danger')]; }
async function shellT(name, n, x, y, label, next, err) {
  const f = await screen(name, 768, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Collapsed', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(k => k.type === 'INSTANCE' && (k.name === 'Item/Lobby' || k.name === 'Item/Wallet'))) it.setProperties({ State: it.name === 'Item/Wallet' ? 'Active' : 'Default' });
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  add(main, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 20, p: 24 }); add(main, [ct, 'FILL']);
  const ph = hrow('Page header', 12); add(ct, [ph, 'FILL']); await tx(ph, 'Withdraw USDT', 'Heading/H3', 'text/primary', { hug: true }); sp(ph); ph.appendChild(await DEMO('M'));
  const nav = hrow('Wallet sub-nav', 20, { align: 'MAX' }); strokeSides(nav, 'border/subtle', { b: 1 }); add(ct, [nav, 'FILL']);
  for (const l of ['Overview', 'Deposit', 'Withdraw', 'History']) nav.appendChild(await I('20:6831', { State: l === 'Withdraw' ? 'Active' : 'Default' }, { Label: l }));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next, err);
  return { f, ct };
}
// fix WAL-18 desktop footer overflow (explorer link already sits next to the tx hash)
{ const f = await figma.getNodeByIdAsync('106:42078'); if (f) { const ft = f.findOne(x => x.name === 'Flow footer'); const g = ft && ft.children.find(x => x.name === 'Button/Ghost — View on explorer'); if (g) g.remove(); } }
const D = 'WAL-15 Withdraw — Step 6 Risk Validation / ';
const TT = [
  [D + '1440 / Pass', D + '768 / Pass', 6, 'Risk check', '2FA confirmation', 0, false, 2],
  ['WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 1440 / Default — email code + authenticator', 'WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 768 / Default', 7, 'Two-factor confirmation', 'Pending', 1, false, 1],
  ['WAL-17 Withdraw — Step 8 Pending / 1440 / Processing', 'WAL-17 Withdraw — Step 8 Pending / 768 / Processing', 8, 'Pending — sending', 'Done', 2, false, 2],
  ['WAL-18 Withdraw — Step 9 Successful / 1440 / Default', 'WAL-18 Withdraw — Step 9 Successful / 768 / Default', 9, 'Withdrawal complete', null, 3, false, 2],
  ['WAL-19 Withdraw — Step 9 Failed / 1440 / Rejected by sanctions screening (alternative outcome)', 'WAL-19 Withdraw — Step 9 Failed / 768 / Rejected by sanctions screening', 9, 'Withdrawal rejected', null, 4, true, 2]
];
clean(TT.map(t => t[1]));
let ty = 0; for (const c of sec.children) if (!c.name.includes('/ 768 /')) ty = Math.max(ty, c.y + c.height); ty += 240;
const out = {}, missing = [];
for (const [src, nm, n, label, next, col, err, nSide] of TT) {
  const s = sec.children.find(c => c.name === src); if (!s) { missing.push(src); continue; }
  const S = await shellT(nm, n, COLX[col], ty, label, next, err);
  const fc = s.findOne(x => x.name === 'Flow card').clone(); add(S.ct, [fc, 'FILL']);
  const sd = s.findOne(x => x.name === 'Side summary');
  for (let i = 0; i < Math.min(nSide, sd.children.length); i++) { const c = sd.children[i].clone(); add(S.ct, [c, 'FILL']); }
  out[nm] = S.f.id;
}
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes, missing };
