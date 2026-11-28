async function __x(){
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

// ===== ADM-CORE LIB v1 (agent adm-core: ADM-00/01/02/X1 + MOB-11) =====
const pg = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(pg);
const sec = section('ADM-00/01/02/X1 Shell, login, overview, approvals', 0, 0); // existing section id 36:522944
async function setT(root, name, s, nth = 0) { const a = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = a[nth]; if (!t) return null; const fs = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const fo of fs) await figma.loadFontAsync(fo); t.characters = s; return t; }
async function rep(root, from, to) { for (const t of root.findAll(n => n.type === 'TEXT' && n.characters.includes(from))) { const fs = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const fo of fs) await figma.loadFontAsync(fo); t.characters = t.characters.split(from).join(to); } }
const sp = () => AL('HORIZONTAL', { name: 'Spacer', h: 1 }); // 1px tall: empty auto-layout frames default to 100px
const row = (o = {}) => AL('HORIZONTAL', Object.assign({ align: 'CENTER', gap: 12 }, o));
const col = (o = {}) => AL('VERTICAL', Object.assign({ gap: 8 }, o));
const panel = (name, o = {}) => AL('VERTICAL', Object.assign({ name, gap: 16, p: 20, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o));
async function ph(title, o = {}) { const r = row({ name: 'Panel header', gap: 8 }); if (o.icon) add(r, await IC(o.icon, 18, o.ic || 'icon/muted')); add(r, await T(title, o.st || 'Heading/H5')); if (o.demo !== false) add(r, await DEMO('S')); add(r, [sp(), 'FILL']); for (const k of (o.right || [])) add(r, k); return r; }
async function band(id, title, sub, y) { let b = sec.children.find(n => n.name === 'Band — ' + id); if (b) return b; b = AL('VERTICAL', { name: 'Band — ' + id, gap: 8 }); add(b, await T(title, 'Heading/H2'), await T(sub, 'Body/L', 'text/secondary', { w: 1400 })); sec.appendChild(b); b.x = 120; b.y = y; return b; }
async function shell(name, w, x, y) { const f = await screen(name, w, { x, y }); f.primaryAxisSizingMode = 'AUTO'; add(f, [await DEMOBAR(), 'FILL']); const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']); const sb = await I('22:5501'); sb.name = 'Nav/Admin Sidebar'; add(body, sb); sb.layoutSizingVertical = 'FILL'; const main = AL('VERTICAL', { name: 'Main' }); add(body, [main, 'FILL']); main.minHeight = 988; const tb = await I('22:6483', { Environment: 'Production' }); tb.name = 'Nav/Admin Topbar'; add(main, [tb, 'FILL']); const c = AL('VERTICAL', { name: 'Content', p: [24, 28, 48, 28], gap: 20 }); add(main, [c, 'FILL']); sec.appendChild(f); f.x = x; f.y = y; await setT(sb, '2FA session · until 14:05 UTC', '2FA session · until 19:30 UTC'); const nmT = sb.findOne(n => n.type === 'TEXT' && n.name === 'A. Marin'); if (nmT) nmT.textAutoResize = 'WIDTH_AND_HEIGHT'; return { f, body, sb, main, tb, c }; }
async function navTo(sb, group, child, locked = []) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^(Group|Item) — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (it.name.startsWith('Item')) { if (group !== 'Finance') it.visible = false; else it.setProperties({ State: lbl === child ? 'Active' : 'Default' }); continue; } if (locked.includes(lbl)) { it.setProperties({ State: 'No access' }); continue; } if (it.componentProperties.State.value === 'No access') continue; it.setProperties({ State: lbl === group ? 'Active' : 'Default' }); if (lbl === group && group !== 'Finance') { const ch = it.findOne(n => n.name === 'Chevron'); if (ch) ch.visible = false; } } }
async function who(sb, tb, ini, name, role, mods) { for (const r of [sb, tb]) { await setT(r, 'Initials', ini); await setT(r, 'A. Marin', name); await setT(r, 'Finance Lead', role); } if (mods) await setT(sb, '8 of 10 modules', mods); }
async function pageHead(c, crumbs, title, sub, right = []) { const h = row({ name: 'Page header', align: 'MAX', gap: 16 }); const l = col({ name: 'Title block', gap: 6 }); const bc = await I('14:1145', { Levels: String(crumbs.length) }); for (let i = 0; i < crumbs.length - 1; i++) await setT(bc, 'Crumb ' + (i + 1), crumbs[i]); await setT(bc, 'Current page', crumbs[crumbs.length - 1]); const tr = row({ name: 'Title row', gap: 12 }); add(tr, await T(title, 'Heading/H3'), await DEMO('M')); add(l, bc, tr, await T(sub, 'Body/S', 'text/secondary', { w: 720 })); add(h, l, [sp(), 'FILL'], ...right); add(c, [h, 'FILL']); return h; }
function overlay(f, m, top) { const s = rect(f.width, f.height - 36, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 36; s.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; f.appendChild(m); m.layoutPositioning = 'ABSOLUTE'; m.x = Math.round((f.width - m.width) / 2); m.y = top != null ? top : Math.max(96, Math.round(36 + (988 - m.height) / 2)); return s; }
async function stat(icon, ic, label, tc = 'text/secondary', st = 'Label/M') { const r = row({ gap: 6, name: 'Status — ' + label }); add(r, await IC(icon, 16, ic), await T(label, st, tc)); return r; }
async function swapBtn(root, label, type, newLabel) { const t = root.findAll(n => n.type === 'TEXT' && n.characters === label)[0]; if (!t) return null; let b = t.parent; while (b && !(b.type === 'INSTANCE' && b.mainComponent && b.mainComponent.parent && b.mainComponent.parent.name.startsWith('Button/'))) b = b.parent; if (!b) return null; const cur = Object.fromEntries(b.mainComponent.name.split(', ').map(s => s.split('='))); const set = await figma.getNodeByIdAsync(BTN_IDS[type]); const comp = set.children.find(c => c.name === `Size=${cur.Size}, State=${cur.State}`) || set.defaultVariant; b.swapComponent(comp); const k = Object.keys(b.componentProperties).find(x => x.split('#')[0] === 'Label'); if (k) b.setProperties({ [k]: newLabel || label }); return b; }
const OUT = {};
// ===== END ADM-CORE LIB =====

// adm-core pending #2 — ADM-X1 requester side (A. Marin, Finance Lead, 18:20 UTC). Backdrop = clone of ADM-F2 'Withdrawal WD-20931 — Detail / 1440 / Under review' (33:230322, built by adm-finance; cloned, not edited).
// Frames: Confirm with reason Default (empty) / Ready / Error stacked at x=120, Request submitted at x=1680. Dialog = Admin/Confirm With Reason Dialog (25:16172) re-titled for a RELEASE; its Danger submit is swapped to Button/Primary (a release is not destructive).
const y0 = nextY(sec);
await band('ADM-X1', 'ADM-X1 · Four-eyes approval, confirm-with-reason & re-auth', 'One pattern for every sensitive action. Requester: reason category + written reason + fresh 2FA → request AR-1042 (expires in 4 h). Second approver (different admin, allowed role): reviews, writes their own reason, confirms with 2FA. Self-approval is blocked; expired requests change nothing; every step is hash-chained in the audit log.', y0);
const Y = y0 + 120;
const src = await figma.getNodeByIdAsync('33:230322');
async function req(name, x, y, state) { const f = src.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name; const d = await I('25:16172', { State: state }); d.name = 'Admin/Confirm With Reason Dialog'; await rep(d, 'Reject flagged withdrawal', 'Release flagged withdrawal'); return { f, d }; }
const out = [];
{ const { f, d } = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Default (empty)', 120, Y, 'Default'); await swapBtn(d, 'Submit for approval', 'Primary'); overlay(f, d); out.push(f); }
const H = out[0].height + 160;
{ const { f, d } = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Ready', 120, Y + H, 'Ready'); await swapBtn(d, 'Submit for approval', 'Primary'); await setT(d, 'Value', 'AML — screening cleared'); await setT(d, 'Value text', 'AML-3317 closed as a false positive on the velocity rule. Destination 0x7c4e…a21D is whitelisted since 14 Oct 2026 and ownership was proven by signature. Release per FIN-2.3.'); await setT(d, 'Counter', '186 / 500'); overlay(f, d); out.push(f); }
{ const { f, d } = await req('[ADM-X1] Four-eyes — Confirm with reason / 1440 / Error', 120, Y + 2 * H, 'Error'); await swapBtn(d, 'Submit for approval', 'Primary'); overlay(f, d); out.push(f); }
{ const { f, d } = await req('[ADM-X1] Four-eyes — Request submitted / 1440 / Awaiting 2nd approver', 1680, Y, 'Submitted'); await rep(d, 'AR-1043', 'AR-1042'); await rep(d, '#88244', '#88190'); overlay(f, d); out.push(f); }
fitSection(sec);
for (const f of out) await f.screenshot({ scale: 0.3 });
return { ids: out.map(f => [f.name, f.id, f.x, f.y, f.height]) };

}
