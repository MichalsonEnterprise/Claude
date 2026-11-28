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
const pg = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(pg);
const sec = section('ADM — Mobile', 217000, 0); // existing section id 36:522944
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
const OUT = { skipped: [] };
const EX = nm => sec.children.find(c => c.name === nm) || null; // idempotency guard (exact frame name)
function bandY(id) { const b = sec.children.find(n => n.name === 'Band — ' + id); return b ? b.y : nextY(sec); }
const SHOT = async (ids, scale = 0.3) => { for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (n) await n.screenshot({ scale }); } };
// ===== END ADM-CORE LIB =====

// adm-core m-02 — MOB-11 approvals on page 10: Approvals queue / 390 (K. Osei, Compliance Officer, 18:46 UTC)
// and the ADM-X1 second-approver review as a bottom sheet over the queue (AR-1042). IDEMPOTENT.
// ===== ADM-CORE mobile helpers (page 10, section 'ADM — Mobile'); same inline admin top bar + tab bar as the adm-bc mobile frames =====
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) return false; inst.setProperties({ [k]: val }); return true; }
// my mobile frames sit in their own row under anything already in the section (adm-bc / adm-finance frames use y = 160)
function MROW() { const mine = sec.children.filter(n => /MOB-11/.test(n.name)); if (mine.length) return { x: Math.max(...mine.map(n => n.x + n.width)) + 120, y: Math.min(...mine.map(n => n.y)) }; return { x: 120, y: sec.children.length ? nextY(sec) + 80 : 160 }; }
async function MSHELL(name, ini, back) {
  if (EX(name)) { OUT.skipped.push(name); return null; }
  const p = MROW(); const f = await screen(name, 390, {}); sec.appendChild(f); f.x = p.x; f.y = p.y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Mobile', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  if (back) { add(bar, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }), await T(back, 'Label/L', 'text/primary')); }
  else { const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm, await T('Admin', 'Label/L', 'text/primary')); const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env); }
  add(bar, [sp(), 'FILL']);
  const bl = row({ name: 'Alerts bell', gap: 2 }); add(bl, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.bell })); const bc = await I('6:216', { Size: 'S' }); setP(bc, 'Count', '5'); add(bl, bc); add(bar, bl);
  add(bar, await I('9:238', { Size: 'S' }, { Initials: ini }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']);
  return { f, c, bar };
}
async function MTABS(f, active) { const tb = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tb, 'border/subtle', { t: 1 }); const r = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] }); for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['user-check', 'Approvals', '4'], ['id-card', 'KYC', '214'], ['shield-alert', 'Alerts', '23'], ['menu', 'More']]) { const on = lab === active; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = row({ name: 'Icon', gap: 2 }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(ir, b); } add(t, ir, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(r, [t, 'FILL']); } add(tb, [r, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tb, [hi, 'FILL']); add(f, [tb, 'FILL']); return tb; }
async function mtitle(c, title, sub) { const h = col({ name: 'Page title', gap: 4 }); const r = row({ gap: 8 }); add(r, await T(title, 'Heading/H3'), await DEMO('M')); add(h, r, await T(sub, 'Body/S', 'text/secondary', { w: 358 })); add(c, [h, 'FILL']); return h; }
async function mcard(name, o = {}) { return AL('VERTICAL', Object.assign({ name, gap: 10, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o)); }
async function wt(parent, s, style = 'Body/S', color = 'text/secondary', w = 326) { const t = await T(s, style, color, { w }); add(parent, [t, 'FILL']); return t; }
// ===== END mobile helpers =====

const made = [];
const RQ = [ // id, title, detail, requester, role chip, requested, expires, your role — same 4 open requests as the 1440 inbox (K. Osei's view)
  ['AR-1047', 'Pinfall max bet 1,000.00 → 500.00 USDT', 'Games · config v14 · effective from the next round only', 'S. Iyer', 'Super Admin', '16:30 UTC', '20:30 UTC · 1 h 44 min', 'role'],
  ['AR-1045', 'Lift sign-in suspension · @juno88', 'Users · player passed the ID re-check', 'R. Duarte', 'Support', '17:55 UTC', '21:55 UTC · 3 h 09 min', 'yes'],
  ['AR-1049', 'Export KYC file for regulator request REG-221', 'Compliance · 1 encrypted file, 7-day link', 'You', 'Compliance', '18:05 UTC', '22:05 UTC · 3 h 19 min', 'self'],
  ['AR-1042', 'Release flagged withdrawal WD-20931', 'Finance · 1,500.00 USDT → 0x7c4e…a21D · Arbitrum', 'A. Marin', 'Finance', '18:20 UTC', '22:20 UTC · 3 h 34 min', 'yes']];
async function reqCard(r) { const [id, t, d, by, role, at, exp, el] = r; const k = await mcard('Request — ' + id, { gap: 8 });
  const top = row({ gap: 8 }); add(top, await T(id, 'Mono/S', 'text/tertiary'), await BADGE('Pending'), [sp(), 'FILL'], await stat('hourglass', 'icon/muted', exp, 'text/tertiary', 'Caption')); add(k, [top, 'FILL']);
  await wt(k, t, 'Label/L', 'text/primary'); await wt(k, d, 'Body/S', 'text/secondary');
  const rq = row({ gap: 8 }); const av = await I('9:238', { Size: 'XS' }, { Initials: by === 'You' ? 'KO' : by.split(' ').map(s => s[0]).join('').replace('.', '') }); add(rq, av, await T((by === 'You' ? 'Requested by you' : by) + ' · ' + at, 'Caption', 'text/secondary'), await I('23:18440', { Role: role, Size: 'S' }), [sp(), 'FILL'], await DEMO('XS')); add(k, [rq, 'FILL']);
  if (el === 'self') { const n = row({ name: 'Self-approval note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(n, await IC('ban', 16, 'icon/muted')); await wt(n, "Your own request — another Compliance admin or the Super Admin must decide. You can withdraw it.", 'Caption', 'text/secondary', 290); add(k, [n, 'FILL']); add(k, [await BTN('Ghost', 'Withdraw my request', { size: 'L' }), 'FILL']); }
  else if (el === 'role') { const n = row({ name: 'Role note', gap: 8, p: [10, 12], fill: 'surface/raised', r: 10, align: 'MIN' }); add(n, await IC('lock', 16, 'icon/muted')); await wt(n, 'Super Admin only — you can see it, but you can’t decide it.', 'Caption', 'text/secondary', 290); add(k, [n, 'FILL']); add(k, [await BTN('Ghost', 'View details', { size: 'L' }), 'FILL']); }
  else add(k, [await BTN(id === 'AR-1042' ? 'Primary' : 'Secondary', 'Review', { size: 'L', trail: 'arrow-right' }), 'FILL']);
  return k; }
async function queue(name) { const S = await MSHELL(name, 'KO'); if (!S) return null; const { f, c } = S;
  await mtitle(c, 'Approvals', 'Four-eyes requests. You can decide requests from other admins only; every decision needs a reason and a fresh 2FA code.');
  const tabs = row({ name: 'Filter pills (scrolls)', gap: 8, w: 358, clip: true }); for (const [l, on] of [['Open · 4', true], ['Waiting for me · 2', false], ['Created by me · 1', false], ['Decided today · 4', false]]) { const p = await I('20:6895', { State: on ? 'Active' : 'Default' }); if (!setP(p, 'Label', l)) { const tx = p.findOne(n => n.type === 'TEXT'); if (tx) await setT(p, tx.name, l); } add(tabs, p); } add(c, [tabs, 'FILL']);
  const pol = row({ name: 'Policy strip', gap: 8, p: [10, 12], fill: 'brand/tint-subtle', r: 10, align: 'MIN' }); add(pol, await IC('shield-check', 16, 'icon/brand')); await wt(pol, 'SYS-1.1 · the requester can never approve · requests expire after 4 h and then change nothing', 'Caption', 'text/secondary', 300); add(c, [pol, 'FILL']);
  for (const r of RQ) add(c, [await reqCard(r), 'FILL']);
  await MTABS(f, 'Approvals'); return f; }
// ---------- 1. Queue ----------
{ const f = await queue('[MOB-11] Approvals queue / 390 / Open'); if (f) made.push(f); }
// ---------- 2. Review sheet (AR-1042) over the queue ----------
{ const f = await queue('[ADM-X1 · MOB-11] Review AR-1042 / 390 / Bottom sheet'); if (f) {
  f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844); f.clipsContent = true;
  const s = rect(390, 808, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 36;
  const sh = AL('VERTICAL', { name: 'Sheet — Review AR-1042', w: 390, fill: 'surface/overlay', stroke: 'border/subtle' }); for (const k of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(k, VAR['radius/2xl']); await fx(sh, 'Elevation/4 — Modal');
  const gr = AL('HORIZONTAL', { name: 'Grabber', p: [8, 0, 4, 0], justify: 'CENTER' }); add(gr, rect(36, 4, 'border/strong', 9999, 'Grabber')); add(sh, [gr, 'FILL']);
  const hd = row({ name: 'Header', gap: 8, p: [4, 8, 8, 16] }); add(hd, await T('Review AR-1042', 'Heading/H5'), await DEMO('S'), [sp(), 'FILL'], await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x })); add(sh, [hd, 'FILL']);
  const bd = col({ name: 'Body', gap: 12, p: [4, 16, 12, 16] });
  const sm = col({ name: 'Summary', gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(sm, await T('RELEASE FLAGGED WITHDRAWAL · WD-20931', 'Overline', 'text/tertiary'));
  const am = row({ gap: 6, align: 'MAX' }); add(am, await T('1,500.00', 'Number/M'), await T('USDT', 'Label/M', 'text/tertiary'), [sp(), 'FILL'], await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' })); add(sm, [am, 'FILL']);
  const ad = row({ gap: 6 }); add(ad, await T('→ 0x7c4e…a21D', 'Mono/S', 'text/secondary'), await T('· @nova.k · KYC L2 · player receives 1,499.92', 'Caption', 'text/tertiary')); add(sm, ad);
  const rq = row({ gap: 6, p: [6, 0, 0, 0] }); strokeSides(rq, 'border/subtle', { t: 1 }); add(rq, await I('9:238', { Size: 'XS' }, { Initials: 'AM' }), await T('A. Marin · 18:20 UTC', 'Caption', 'text/secondary'), await I('23:18440', { Role: 'Finance', Size: 'S' })); add(sm, [rq, 'FILL']);
  await wt(sm, '“AML-3317 closed as a false positive on the velocity rule. Destination whitelisted since 14 Oct 2026, ownership proven by signature. Release per FIN-2.3.”', 'Caption', 'text/secondary', 334);
  add(bd, [sm, 'FILL']);
  const ta = await I('16:3858', { State: 'Focus' }, { Label: 'Your reason (required)', 'Show counter': true }); add(bd, [ta, 'FILL']); await setT(ta, 'Value text', 'Reviewed AML-3317 evidence and the signed ownership proof. Velocity hit explained by the 14 Oct whitelisting. Agree to release.'); await setT(ta, 'Counter', '128 / 500');
  const otp = await I('16:3761', { State: 'Complete' }, { Label: 'Fresh 2FA code', Description: 'Needed for every decision, even inside an active session.' }); add(bd, otp);
  const nt = row({ name: 'Audit note', gap: 8, align: 'MIN' }); add(nt, await IC('history', 16, 'icon/muted')); await wt(nt, 'Both admins, both reasons, IPs and 2FA checks are stored in one hash-chained audit entry. You can’t edit amount, address or network.', 'Caption', 'text/tertiary', 330); add(bd, [nt, 'FILL']);
  add(sh, [bd, 'FILL']);
  const ft = col({ name: 'Sticky footer', gap: 0, p: [12, 16, 0, 16] }); strokeSides(ft, 'border/subtle', { t: 1 }); const fa = row({ name: 'Actions', gap: 8 }); add(fa, [await BTN('Danger', 'Reject', { size: 'L', lead: 'x-circle' }), 'FILL'], [await BTN('Primary', 'Approve & release', { size: 'L', lead: 'shield-check' }), 'FILL']); add(ft, [fa, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(ft, [hi, 'FILL']); add(sh, [ft, 'FILL']);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height; made.push(f); } }
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.5 });
return { made: made.map(f => [f.name, f.id, f.x, f.y, f.height]), skipped: OUT.skipped };

}
