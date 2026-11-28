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

// adm-core pending #1 — ADM-00 touch-ups + ADM-01 Sign in (Default) + 5 states + ADM-02 Overview (Default). Page 09, section 36:522944.
// Run once. Places ADM-01 band below the ADM-00 band (nextY), ADM-02 band below ADM-01.
// ---------- fixes on ADM-00 (built 27 Nov 2026) ----------
{ const np = await figma.getNodeByIdAsync('39:50316');
  const cg = np.findOne(n => n.name === 'Group — Compliance'); const cnt = cg && cg.findOne(n => n.name === 'Count'); if (cnt) cnt.visible = false;
  await rep(np, '#88247', '#88216'); // audit sequence: newest #88,214 at 18:44:30 UTC (demo-data)
  for (const id of ['39:50316', '36:522948', '36:537070', '36:540097']) { const fr = await figma.getNodeByIdAsync(id); const sa = fr.findOne(n => n.name === 'Signed-in admin'); const t = sa && sa.findOne(n => n.type === 'TEXT' && n.name === 'A. Marin'); if (t) t.textAutoResize = 'WIDTH_AND_HEIGHT'; } }
// ---------- ADM-01 Sign in default ----------
let BASE;
{ const y0 = nextY(sec);
  await band('ADM-01', 'ADM-01 · Admin login, 2FA & session timeout', 'Separate staff-only entry: work email + password, then authenticator code or hardware key. 15-minute idle timeout with a real countdown and re-authentication. Every attempt is audit-logged; blocked networks get support routes, never workarounds.', y0);
  const f = await screen('[ADM-01] Admin login — Sign in / 1440 / Default', 1440, {}); f.primaryAxisSizingMode = 'AUTO';
  sec.appendChild(f); f.x = 120; f.y = y0 + 120;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body', h: 988 }); add(f, [body, 'FILL']);
  const L = AL('VERTICAL', { name: 'Sign-in panel', w: 560, p: [48, 64], fill: 'bg/secondary', justify: 'SPACE_BETWEEN' }); strokeSides(L, 'border/subtle', { r: 1 });
  add(body, L); L.layoutSizingVertical = 'FILL';
  const top = row({ name: 'Brand row', gap: 12 });
  const env = row({ name: 'Environment tag', gap: 6, p: [4, 10], fill: 'status/danger-tint', r: 9999 }); add(env, ellipse(6, 6, 'status/danger', 'Dot'), await T('PRODUCTION', 'Overline', 'text/danger'));
  add(top, await I('4:797'), await T('Admin console', 'Label/M', 'text/tertiary'), [sp(), 'FILL'], env);
  const form = col({ name: 'Form', gap: 20, w: 432 });
  add(form, await T('STEP 1 OF 2 · SIGN IN', 'Overline', 'text/brand'), await T('Sign in to the admin console', 'Heading/H2', 'text/primary', { w: 432 }), await T("Use your staff account. Next you'll confirm with your authenticator app or a hardware security key.", 'Body/M', 'text/secondary', { w: 432 }));
  const em = await I('13:762', { State: 'Filled', Size: 'L' }, { Label: 'Work email', 'Show helper': false }); add(form, [em, 'FILL']); await setT(em, 'Value text', 'a.marin@staff.globalpool.example');
  const pw = await I('14:1735', { State: 'Focus', Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); add(form, [pw, 'FILL']); await setT(pw, 'Value text', 'Enter your password');
  const cr = row({ name: 'Options', gap: 12 }); add(cr, await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this device for 12 hours', 'Show description': false }), [sp(), 'FILL'], await BTN('Ghost', "Can't sign in?", { size: 'S' })); add(form, [cr, 'FILL']);
  add(form, [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' }), 'FILL']);
  const orr = row({ name: 'Divider', gap: 12 }); add(orr, [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL'], await T('or', 'Caption', 'text/tertiary'), [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL']); add(form, [orr, 'FILL']);
  add(form, [await BTN('Secondary', 'Sign in with a security key', { size: 'L', lead: 'key' }), 'FILL']);
  const ft = col({ name: 'Footer', gap: 6 }); add(ft, await T('Authorised GLOBAL POOL staff only. Every sign-in attempt is logged with IP address, device and time.', 'Caption', 'text/tertiary', { w: 432 }), await T('Production · eu-west-1 · v2.14.0', 'Mono/S', 'text/tertiary'));
  add(L, [top, 'FILL'], form, ft);
  const Rp = AL('VERTICAL', { name: 'Policy panel', p: [64, 64], gap: 32, justify: 'CENTER' }); add(body, [Rp, 'FILL']); Rp.layoutSizingVertical = 'FILL';
  const hl = col({ name: 'Headline', gap: 16 }); add(hl, await T('ADMIN CONSOLE · RESTRICTED SYSTEM', 'Overline', 'text/tertiary'), await T('Staff access only.', 'Heading/H1'), await T('The admin console manages player accounts, KYC and money movements. It cannot change draw results, choose winners or pay out from a pool — those actions do not exist here.', 'Body/L', 'text/secondary', { w: 640 }));
  add(Rp, hl);
  const grid = AL('HORIZONTAL', { name: 'Policies', wrap: true, gap: 16, cgap: 16, w: 752 });
  for (const [ic, t, b] of [['fingerprint', '2FA on every sign-in', 'Authenticator app or hardware security key. SMS codes are not accepted for admin accounts.'], ['timer', '15-minute idle timeout', 'Sessions end after 15 minutes without activity. Sensitive actions ask for a fresh 2FA code.'], ['users', 'Four-eyes on sensitive actions', 'Withdrawal releases, account restrictions and configuration changes need a second admin.'], ['history', 'Everything is audited', 'Sign-ins, personal-data views and every action are hash-chained in an append-only audit log.']]) { const cd = panel('Policy — ' + t, { w: 368, gap: 10 }); const tl = AL('HORIZONTAL', { name: 'Icon tile', w: 36, h: 36, fill: 'brand/tint', r: 10, align: 'CENTER', justify: 'CENTER' }); add(tl, await IC(ic, 20, 'icon/brand')); add(cd, tl, await T(t, 'Label/L', 'text/primary'), await T(b, 'Body/S', 'text/secondary', { w: 328 })); add(grid, cd); }
  add(Rp, grid);
  const st = row({ name: 'System status', gap: 10, p: [12, 16], fill: 'surface/default', stroke: 'border/subtle', r: 10 });
  add(st, await IC('check-circle', 18, 'status/success'), await T('Admin console operational', 'Label/L', 'text/primary'), await T('Status as of 27 Nov 2026, 18:30 UTC', 'Caption', 'text/tertiary'), await DEMO('XS'));
  add(Rp, st);
  BASE = f.id; OUT.signin = [f.id, f.y, f.height]; await f.screenshot({ scale: 0.4 }); }
// ---------- ADM-01 states (clones of Sign in; the 'Form' column is rebuilt) ----------
{ const base = await figma.getNodeByIdAsync(BASE); const Y1 = base.y, H = base.height + 160;
  async function cloneState(name, x, y) { const f = base.clone(); sec.appendChild(f); f.x = x; f.y = y; f.name = name; const form = f.findOne(n => n.name === 'Form'); for (const k of [...form.children]) k.remove(); return { f, form }; }
  async function callout(kind, title, bodyT) { const tone = { danger: ['status/danger-tint', 'status/danger', 'alert-circle'], info: ['status/info-tint', 'status/info', 'info'] }[kind]; const c = row({ name: 'Callout — ' + kind, gap: 10, p: [12, 14], fill: tone[0], r: 10, align: 'MIN' }); const tx = col({ gap: 4 }); add(tx, await T(title, 'Label/L', 'text/primary', { w: 370 }), await T(bodyT, 'Body/S', 'text/secondary', { w: 370 })); add(c, await IC(tone[2], 18, tone[1]), tx); return c; }
  async function head(form, over, title, sub, oc = 'text/brand') { add(form, await T(over, 'Overline', oc), await T(title, 'Heading/H2', 'text/primary', { w: 432 }), await T(sub, 'Body/M', 'text/secondary', { w: 432 })); }
  async function email(form, v, state = 'Filled') { const em = await I('13:762', { State: state, Size: 'L' }, { Label: 'Work email', 'Show helper': false }); add(form, [em, 'FILL']); await setT(em, 'Value text', v); }
  async function pass(form, state) { const pw = await I('14:1735', { State: state, Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); add(form, [pw, 'FILL']); await setT(pw, 'Value text', state === 'Error' ? '••••••••••••' : 'Enter your password'); return pw; }
  const shots = [];
  { const { f, form } = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Error — wrong password', 120, Y1 + H);
    await head(form, 'STEP 1 OF 2 · SIGN IN', 'Sign in to the admin console', "Use your staff account. Next you'll confirm with your authenticator app or a hardware security key.");
    add(form, [await callout('danger', 'Email or password is incorrect', '2 attempts left. After 5 failed attempts in 15 minutes the account locks and IT security is notified. This attempt was logged at 18:31 UTC.'), 'FILL']);
    await email(form, 'a.marin@staff.globalpool.example'); const pw = await pass(form, 'Error'); for (const nm of ['Helper text', 'Error text']) await setT(pw, nm, 'Check your password and try again. Passwords are case-sensitive.');
    const cr = row({ name: 'Options', gap: 12 }); add(cr, await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this device for 12 hours', 'Show description': false }), [sp(), 'FILL'], await BTN('Ghost', "Can't sign in?", { size: 'S' })); add(form, [cr, 'FILL']);
    add(form, [await BTN('Primary', 'Continue', { size: 'L', trail: 'arrow-right' }), 'FILL'], [await BTN('Secondary', 'Sign in with a security key', { size: 'L', lead: 'key' }), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — Sign in / 1440 / Blocked — network not approved', 120, Y1 + 2 * H);
    await head(form, 'SIGN-IN BLOCKED', "This network isn't approved for admin access", 'The admin console only accepts sign-ins from approved company networks on managed devices.', 'text/danger');
    add(form, [await callout('danger', 'Attempt blocked and logged · #88205', 'From 185.21.44.xx · Madrid, ES · Windows · Edge · 27 Nov 2026, 18:33 UTC. Your account was not signed in and nothing was accessed.'), 'FILL']);
    add(form, await T('If this was you, contact IT security from a managed device and they will confirm your access. If it was not you, no action is needed — IT security has already been alerted.', 'Body/S', 'text/secondary', { w: 432 }));
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Secondary', 'Read the access policy', { size: 'L', lead: 'book' }), 'FILL']);
    add(form, await T('GLOBAL POOL staff will never ask for your password or 2FA codes.', 'Caption', 'text/tertiary', { w: 432 }));
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Default', 1680, Y1);
    await head(form, 'STEP 2 OF 2 · VERIFY', "Confirm it's you", 'Signed in as a.marin@staff.globalpool.example on MacBook Pro · Chrome · Lisbon. Enter the 6-digit code from your authenticator app.');
    const otp = await I('16:3761', { State: 'Filling' }, { Label: 'Authenticator code', Description: 'Codes refresh every 30 seconds in your app.' }); add(form, otp); await setT(otp, 'Resend timer', 'Current code refreshes in 0:18');
    add(form, [await BTN('Primary', 'Verify and sign in', { size: 'L', state: 'Disabled' }), 'FILL'], [await BTN('Secondary', 'Use a security key instead', { size: 'L', lead: 'key' }), 'FILL']);
    const lk = row({ name: 'Links', gap: 8 }); add(lk, await BTN('Ghost', 'Use a backup code', { size: 'S' }), await BTN('Ghost', 'Lost your authenticator?', { size: 'S' })); add(form, lk);
    add(form, [await callout('info', 'Session rules', 'Admin sessions end after 15 minutes without activity. Approvals, restrictions and exports ask for a fresh code even while you are signed in.'), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Admin login — 2FA / 1440 / Locked — too many codes', 1680, Y1 + H);
    await head(form, 'STEP 2 OF 2 · VERIFY', 'Too many incorrect codes', 'For your security, sign-in for this account is paused.', 'text/danger');
    const otp = await I('16:3761', { State: 'Disabled' }, { Label: 'Authenticator code', Description: 'Code entry is disabled while the account is locked.' }); add(form, otp); await setT(otp, 'Resend timer', 'Locked');
    add(form, [await callout('danger', 'Sign-in locked until 18:57 UTC (15 minutes)', '5 incorrect codes since 18:41 UTC. IT security was notified automatically. Nothing in the admin console was accessed.'), 'FILL']);
    add(form, [await BTN('Primary', 'Contact IT security', { size: 'L', lead: 'mail' }), 'FILL'], [await BTN('Ghost', 'Back to sign in', { size: 'L', lead: 'arrow-left' }), 'FILL']);
    shots.push(f); }
  { const { f, form } = await cloneState('[ADM-01] Session expired — Re-authenticate / 1440 / Default', 4800, Y1);
    await head(form, 'SESSION ENDED', 'You were signed out', 'Your session ended at 19:02 UTC after 15 minutes without activity. Sign in again to go back to Approvals.', 'text/warning');
    add(form, [await callout('info', 'Nothing was submitted while you were away', 'Open dialogs are never sent automatically. AR-1042 is still waiting for a second approver and expires at 22:20 UTC.'), 'FILL']);
    await email(form, 'k.osei@staff.globalpool.example', 'Disabled'); await pass(form, 'Focus');
    add(form, [await BTN('Primary', 'Sign in again', { size: 'L', trail: 'arrow-right' }), 'FILL'], await BTN('Ghost', 'Not you? Use another account', { size: 'S' }));
    shots.push(f); }
  OUT.states = shots.map(f => [f.name, f.id, f.x, f.y, f.height]);
  for (const f of shots) await f.screenshot({ scale: 0.3 }); }
// ---------- ADM-02 Overview default (Super Admin S. Iyer) ----------
{ const y0 = nextY(sec);
  await band('ADM-02', 'ADM-02 · Overview — all KPIs + system health', 'Every brief KPI on one dense page: deposits, withdrawals, gross revenue, platform fees, users, pool liabilities, active rounds, pending withdrawals, KYC statistics and system health. Read-only monitoring; work queues link into their modules. States: default (Super Admin), loading, degraded network, restricted role.', y0);
  const { f, sb, tb, c } = await shell('[ADM-02] Overview / 1440 / Default', 1440, 120, y0 + 120);
  for (const it of sb.findAll(n => n.type === 'INSTANCE' && /^(Group|Item) — /.test(n.name))) { const lbl = it.name.split(' — ')[1]; if (it.name.startsWith('Item')) { it.visible = false; continue; } it.setProperties({ State: lbl === 'Overview' ? 'Active' : 'Default' }); if (lbl === 'Overview') { const ch = it.findOne(n => n.name === 'Chevron'); if (ch) ch.visible = false; } }
  await who(sb, tb, 'SI', 'S. Iyer', 'Super Admin', '10 of 10 modules');
  const seg = await I('20:6978', { Segments: '3' });
  for (const s of seg.findAll(n => n.type === 'INSTANCE' && n.name.includes('Segment'))) { const tx = s.findOne(n => n.type === 'TEXT'); if (tx) s.setProperties({ State: tx.characters.includes('30') ? 'Active' : 'Default' }); }
  await pageHead(c, ['Admin', 'Overview'], 'Overview', 'KPIs for the last 30 days (28 Oct – 26 Nov 2026) and live operations. Data as of 27 Nov 2026, 18:45 UTC · updates live.', [seg, await BTN('Secondary', 'Export snapshot', { size: 'S', lead: 'download' })]);
  async function kpi(trend, label, value, unit, delta, ctx, def) { const t = await I('23:15270', { Trend: trend }); t.name = 'KPI — ' + label; await setT(t, 'Label', label); await setT(t, 'Value', value); await setT(t, 'Unit', unit); await setT(t, 'Delta value', delta); await setT(t, 'vs previous 30 d', ctx); await setT(t, 'Definition', def); return t; }
  async function krow(name, items) { const r = row({ name, gap: 16, align: 'MIN' }); for (const k of items) { const t = await kpi(...k); add(r, [t, 'FILL']); const sk = t.findOne(n => n.name === 'Sparkline'); if (sk) { try { sk.layoutSizingHorizontal = 'FILL'; } catch (e) { sk.resize(240, sk.height); } } } add(c, [r, 'FILL']); return r; }
  await krow('KPIs — money', [['Up', 'Total deposits · 30 d', '12,846,500.00', 'USDT', '+8.4%', 'vs previous 30 d', 'Σ confirmed deposits, all networks'], ['Up', 'Total withdrawals · 30 d', '10,932,140.00', 'USDT', '+6.9%', 'vs previous 30 d', 'Σ executed withdrawals, all networks'], ['Up', 'Gross revenue · 30 d', '811,850.70', 'USDT', '+5.6%', 'vs previous 30 d', 'GGR + platform fees · Revenue reports'], ['Flat', 'Platform fees · 30 d', '60,700.00', 'USDT', '0.0%', 'vs previous 30 d', '1,214,000 entries × 0.05 USDT']]);
  await krow('KPIs — users & liabilities', [['Up', 'Total users', '184,320', 'accounts', '+3.2%', 'vs previous 30 d', 'All registered player accounts'], ['Down', 'Active users · 30 d', '41,206', 'players', '−2.1%', 'vs previous 30 d', 'Placed ≥ 1 bet or pool entry'], ['Flat', 'Pool liabilities', '238,710.40', 'USDT', 'Live', 'snapshot', '186,400.00 open pool + 52,310.40 owed prizes'], ['Flat', 'Active rounds', '1', 'round', 'Live', 'snapshot', 'Round #1,248 · closes 20:00 UTC']]);
  const r3 = row({ name: 'Work queues', gap: 16, align: 'MIN' });
  add(r3, await I('23:15571', { Queue: 'Withdrawals', SLA: 'On track' }), await I('23:15571', { Queue: 'KYC', SLA: 'On track' }));
  const ap = panel('Four-eyes approvals', { gap: 10 }); add(ap, [await ph('Four-eyes approvals', { icon: 'user-check', right: [await BADGE('Pending')] }), 'FILL']);
  for (const [id, t, e] of [['AR-1047', 'Pinfall max bet → 500.00 USDT', '1 h 45 min'], ['AR-1045', 'Lift sign-in suspension · @juno88', '3 h 10 min'], ['AR-1049', 'Export KYC file · REG-221', '3 h 20 min'], ['AR-1042', 'Release WD-20931 · 1,500.00 USDT', '3 h 35 min']]) { const r = row({ name: id, gap: 10, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(id, 'Mono/S', 'text/tertiary'), await T(t, 'Body/S', 'text/primary', { w: 200 })); add(r, l, [sp(), 'FILL'], await stat('hourglass', 'icon/muted', e, 'text/tertiary', 'Caption')); add(ap, [r, 'FILL']); }
  add(ap, await BTN('Secondary', 'Open approvals', { size: 'S', trail: 'arrow-right' }));
  add(r3, [ap, 'FILL']); add(c, [r3, 'FILL']);
  const r4 = row({ name: 'Health & KYC', gap: 16, align: 'MIN' });
  const g = await I('30:17353', { Status: 'Operational' }); await setT(g, 'Footnote text', 'No outages in 30 days · Ethereum deposits slower today (congestion)'); add(r4, g);
  const sv = panel('Services', { gap: 4 }); add(sv, [await ph('Services', { icon: 'server' }), 'FILL']);
  for (const [n, m, ic, cl, lab, tc] of [['API gateway', 'p95 42 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Wallet service', 'p95 118 ms', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Chainlink VRF · Arbitrum', 'last fulfilment 37 s', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Chain indexer', '2 blocks behind', 'check-circle', 'status/success', 'Operational', 'text/success'], ['Ethereum deposits', 'avg 9 min to credit', 'alert-triangle', 'status/warning', 'Slower', 'text/warning']]) { const r = row({ name: n, gap: 10, p: [9, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(n, 'Label/M'), await T(m, 'Caption', 'text/tertiary')); add(r, l, [sp(), 'FILL'], await stat(ic, cl, lab, tc)); add(sv, [r, 'FILL']); }
  add(r4, [sv, 'FILL']);
  const ky = panel('KYC statistics', { w: 360, gap: 14 }); add(ky, [await ph('KYC · 30 d', { icon: 'id-card' }), 'FILL']);
  const kn = row({ gap: 8, align: 'MAX' }); add(kn, await T('6,480', 'Number/L'), await T('submitted', 'Body/S', 'text/tertiary')); add(ky, kn);
  const bar = row({ name: 'Outcome bar', gap: 2, r: 9999, clip: true }); add(bar, rect(292, 8, 'status/success', 0, 'Approved'), rect(16, 8, 'status/danger', 0, 'Rejected'), rect(8, 8, 'status/pending', 0, 'Pending')); add(ky, bar);
  for (const [ic, cl, lab, v, tc] of [['check-circle', 'status/success', 'Approved', '5,912 · 91.2%', 'text/success'], ['x-circle', 'status/danger', 'Rejected', '354 · 5.5%', 'text/danger'], ['clock', 'status/pending', 'Pending review', '214 · 3.3%', 'text/secondary']]) { const r = row({ gap: 8 }); add(r, await stat(ic, cl, lab, tc), [sp(), 'FILL'], await T(v, 'Number/S', 'text/primary')); add(ky, [r, 'FILL']); }
  const lv = row({ name: 'By level', gap: 8, p: [10, 0] }); strokeSides(lv, 'border/subtle', { t: 1 });
  for (const [l, v] of [['L1', '3,920'], ['L2', '2,236'], ['L3', '324']]) { const b = col({ gap: 2, p: [6, 10], fill: 'surface/raised', r: 6 }); add(b, await T(l, 'Overline', 'text/tertiary'), await T(v, 'Number/S')); add(lv, [b, 'FILL']); }
  add(ky, [lv, 'FILL'], await T('Median review 6 h 40 min · SLA 48 h · 99% within SLA', 'Caption', 'text/tertiary', { w: 320 }));
  add(r4, ky); add(c, [r4, 'FILL']);
  const r5 = row({ name: 'Pool', gap: 16, align: 'MIN' });
  add(r5, await I('27:15865', { State: 'Default' }));
  const rm = panel('Round #1,248 monitor', { gap: 12 }); add(rm, [await ph('Round #1,248', { icon: 'pool', right: [await BADGE('Live')] }), 'FILL']);
  const pv = col({ gap: 2 }); add(pv, await T('POOL BALANCE', 'Overline', 'text/tertiary'), await T('186,400.00 USDT', 'Number/L', 'text/gold')); add(rm, pv);
  for (const [k, v] of [['Participants', '3,412'], ['Qualifying entries', '18,640'], ['Platform fees (not in pool)', '932.00 USDT'], ['Closes', '27 Nov 2026, 20:00 UTC · in 01:15:00'], ['Threshold', 'Met · 3,412 ≥ 500 players'], ['Draw', 'Chainlink VRF · Arbitrum']]) { const r = row({ gap: 8, p: [6, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await T(k, 'Body/S', 'text/tertiary'), [sp(), 'FILL'], await T(v, 'Label/M', 'text/primary')); add(rm, [r, 'FILL']); }
  const ro = row({ name: 'Read-only note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(ro, await IC('lock', 16, 'icon/muted'), await T('Monitoring only. No admin can alter entries, the draw or the payout. Pausing new entries needs two Super Admins.', 'Caption', 'text/secondary', { w: 300 })); add(rm, [ro, 'FILL']);
  add(r5, [rm, 'FILL']); add(c, [r5, 'FILL']);
  const r6 = row({ name: 'Networks & audit', gap: 16, align: 'MIN' });
  const nw = panel('Network health', { gap: 4 }); add(nw, [await ph('Network health', { icon: 'activity' }), 'FILL']);
  for (const [ch, s, cf, t, q] of [['BNB Chain', 'Operational', '15 conf.', '≈ 45 s to credit', '3 deposits confirming'], ['Polygon', 'Operational', '64 conf.', '≈ 2 min', '1 confirming'], ['Arbitrum', 'Operational', '20 conf.', '≈ 30 s', '4 confirming'], ['Ethereum', 'Degraded', '12 conf.', '≈ 9 min · congested', '6 confirming · DP-77412 7 / 12'], ['Solana', 'Operational', '32 · finalized', '≈ 15 s', '0 confirming']]) { const r = row({ name: ch, gap: 12, p: [8, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, await I('9:377', { Chain: ch, Status: s }), [sp(), 'FILL'], await T(cf, 'Caption', 'text/tertiary'), await T(t, 'Label/M', s === 'Degraded' ? 'text/warning' : 'text/primary'), await T(q, 'Caption', 'text/tertiary')); add(nw, [r, 'FILL']); }
  add(r6, [nw, 'FILL']);
  const au = panel('Recent sensitive actions', { w: 420, gap: 4 }); add(au, [await ph('Recent sensitive actions', { icon: 'history' }), 'FILL']);
  for (const [tm, wh, ac] of [['18:20', 'A. Marin · Finance', 'Requested AR-1042 · release WD-20931'], ['18:05', 'K. Osei · Compliance', 'Requested AR-1049 · KYC export REG-221'], ['17:55', 'R. Duarte · Support', 'Requested AR-1045 · lift suspension @juno88'], ['16:12', 'S. Iyer · Super Admin', 'Approved AR-1041 · refunds round #1,245']]) { const r = row({ name: tm, gap: 10, p: [8, 0], align: 'MIN' }); strokeSides(r, 'border/subtle', { t: 1 }); const l = col({ gap: 2 }); add(l, await T(ac, 'Body/S', 'text/primary'), await T(wh + ' · hash-chain ✓', 'Caption', 'text/tertiary')); add(r, await T(tm, 'Mono/S', 'text/tertiary'), l); add(au, [r, 'FILL']); }
  add(au, await BTN('Ghost', 'Open audit log', { size: 'S', trail: 'arrow-right' }));
  add(r6, au); add(c, [r6, 'FILL']);
  OUT.overview = [f.id, f.y, f.height];
  await f.screenshot({ scale: 0.45 }); }
fitSection(sec);
return OUT;
