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

// ===== ADM-BC LIB v1 (agent adm-bc: Blockchain + Compliance admin screens) =====
const MISS = [];
const SPC = () => { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; };
function findI(r, nm) { return r ? r.findOne(n => n.type === 'INSTANCE' && n.name === nm) : null; }
function byMain(r, setName) { return r ? r.findOne(n => { if (n.type !== 'INSTANCE') return false; const m = n.mainComponent; if (!m) return false; const p = m.parent; return m.name === setName || (p && p.type === 'COMPONENT_SET' && p.name === setName); }) : null; }
async function setText(t, v) { try { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(v); return true; } catch (e) { MISS.push('txt ' + t.name + ' ' + String(e.message).slice(0, 40)); return false; } }
async function setT(r, nm, v, i = 0) { if (!r || v == null) return null; const t = r.findAll(n => n.type === 'TEXT' && n.name === nm)[i]; if (!t) { MISS.push('T:' + nm); return null; } await setText(t, v); return t; }
async function setTany(r, names, v) { for (const nm of names) { const t = r.findOne(n => n.type === 'TEXT' && n.name === nm); if (t) { await setText(t, v); return t; } } const t = r.findOne(n => n.type === 'TEXT'); if (t) { await setText(t, v); return t; } MISS.push('Tany:' + names[0]); return null; }
async function setTs(r, m) { for (const [k, v] of Object.entries(m)) await setT(r, k, v); }
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; try { const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) { MISS.push('P:' + base); return false; } inst.setProperties({ [k]: val }); return true; } catch (e) { MISS.push('P:' + base + ' ' + String(e.message).slice(0, 40)); return false; } }
async function ST(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await setT(b, 'Label', label); return b; }
async function WT(parent, s, style = 'Body/S', color = 'text/secondary', w = 400) { const t = await T(s, style, color, { w }); add(parent, [t, 'FILL']); return t; }
// ---------- admin shell ----------
const GROUPS = [['Overview', 'dashboard'], ['User Management', 'users'], ['Finance', 'coins'], ['Game Management', 'games'], ['Global Pool Management', 'pool'], ['Blockchain Management', 'layers'], ['Compliance', 'shield-check'], ['Affiliate Management', 'percent'], ['Marketing', 'megaphone'], ['System', 'settings']];
const MODS = { B: { g: 'Blockchain Management', items: [['Supported networks'], ['Smart contracts'], ['Contract addresses'], ['Transaction monitoring'], ['Blockchain events'], ['Network health'], ['Failed transactions', '4'], ['Gas statistics']] }, C: { g: 'Compliance', items: [['KYC queue', '214'], ['AML alerts', '23'], ['Suspicious transactions', '3'], ['Sanctions screening', '2'], ['Restricted countries'], ['Self-exclusion'], ['RG reports']] } };
const WHO = { SI: ['SI', 'S. Iyer', 'Super Admin', '10 of 10 modules', '2FA session · until 22:40 UTC', []], KO: ['KO', 'K. Osei', 'Compliance Officer', '7 of 10 modules', '2FA session · until 22:15 UTC', ['Game Management', 'Affiliate Management', 'System']] };
async function SIDEBAR(mod, active, who) {
  const sb = await I('22:5501'); const nav = sb.findOne(n => n.name === 'Nav'); const set = await figma.getNodeByIdAsync('22:5497');
  const V = (l, s) => set.children.find(c => c.name === 'Level=' + l + ', State=' + s);
  const W = WHO[who]; const spec = [];
  for (const [g, ic] of GROUPS) { if (g === MODS[mod].g) { spec.push({ l: 'Group', s: 'Active', lab: g, ic, open: 1, cnt: mod === 'C' ? '214' : null }); MODS[mod].items.forEach(([lab, cnt], i) => spec.push({ l: 'Child', s: i === active ? 'Active' : 'Default', lab, cnt })); } else spec.push({ l: 'Group', s: W[5].includes(g) ? 'No access' : 'Default', lab: g, ic, cnt: g === 'Compliance' ? '214' : null }); }
  const slots = nav ? nav.children.slice() : [];
  for (let i = 0; i < slots.length; i++) {
    const n = slots[i], s = spec[i]; if (!s) { n.visible = false; continue; } n.visible = true;
    const tv = V(s.l, s.s); try { if (tv && n.mainComponent && n.mainComponent.id !== tv.id) n.swapComponent(tv); } catch (e) { MISS.push('swap ' + s.lab); }
    n.name = (s.l === 'Group' ? 'Group — ' : 'Item — ') + s.lab + (s.open ? ' (expanded)' : '');
    if (!setP(n, 'Label', s.lab)) await setT(n, 'Label', s.lab);
    setP(n, 'Show count', !!s.cnt); if (s.cnt) { const c = findI(n, 'Count'); if (c) setP(c, 'Count', s.cnt); }
    if (s.l === 'Group') {
      setP(n, 'Icon', ICONS[s.ic]);
      const icn = n.children.find(x => x.type === 'INSTANCE' && !['Chevron', 'Lock', 'Count'].includes(x.name)); if (icn) tint(icn, s.s === 'Active' ? 'icon/brand' : s.s === 'No access' ? 'text/disabled' : 'icon/muted');
      const ch = findI(n, 'Chevron'); if (ch) { try { ch.swapComponent(await figma.getNodeByIdAsync(ICONS[s.open ? 'chevron-down' : 'chevron-right'])); ch.name = 'Chevron'; tint(ch, 'icon/muted'); } catch (e) { MISS.push('chev'); } }
    }
  }
  const av = byMain(sb, 'User/Avatar'); if (av) setP(av, 'Initials', W[0]);
  await setT(sb, 'A. Marin', W[1]); await setT(sb, 'Finance Lead', W[2]); await setT(sb, '8 of 10 modules', W[3]); await setT(sb, '2FA session · until 14:05 UTC', W[4]);
  sb.name = 'Nav/Admin Sidebar — ' + MODS[mod].g; return sb;
}
async function TOPBAR(who, ph) { const tb = await I('22:6483', { Environment: 'Production' }); const W = WHO[who]; await setT(tb, 'Placeholder', ph); const av = byMain(tb, 'User/Avatar'); if (av) setP(av, 'Initials', W[0]); await setT(tb, 'A. Marin', W[1]); await setT(tb, 'Finance Lead', W[2]); return tb; }
// band layout inside the section: C desktop / C laptop / C tablet / B desktop / B laptop
const ORDER = { C: ['C1Q', 'C1R', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], B: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] };
const BY = { 'C-1440': 160, 'C-1280': 3000, 'B-1440': 6000, 'B-1280': 9000, 'C-768': 12000 };
function POS(band, key) { const [m, w] = band.split('-'); const col = ORDER[m].indexOf(key); return { x: 120 + col * (Number(w) + 120), y: BY[band] }; }
function GUARD(name) { if (sec.children.find(n => n.name === name)) throw new Error('Frame already exists: ' + name); }
async function SHELL(name, pos, mod, active, who, ph) {
  GUARD(name); const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await SIDEBAR(mod, active, who); add(body, sb); sb.layoutSizingVertical = 'FILL';
  const main = AL('VERTICAL', { name: 'Main' }); add(body, [main, 'FILL']); main.minHeight = 988;
  add(main, [await TOPBAR(who, ph), 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 24, p: [24, 28, 48, 28] }); add(main, [c, 'FILL']);
  return { f, c };
}
async function HEAD(c, crumbs, title, sub, o = {}) {
  const top = AL('VERTICAL', { name: 'Page header', gap: 8 }); let bc = null;
  try { bc = await I('14:1145', { Levels: String(crumbs.length) }); for (let i = 0; i < crumbs.length - 1; i++) await setT(bc, 'Crumb ' + (i + 1), crumbs[i]); await setT(bc, 'Current page', crumbs[crumbs.length - 1]); const tx = bc.findAll(n => n.type === 'TEXT' && n.visible).map(n => n.characters); if (!crumbs.every(k => tx.includes(k))) { MISS.push('bc-fallback ' + tx.join('|')); bc.remove(); bc = null; } } catch (e) { MISS.push('bc ' + e.message); if (bc) { bc.remove(); bc = null; } }
  if (!bc) { bc = AL('HORIZONTAL', { name: 'Breadcrumb (inline)', gap: 6, align: 'CENTER' }); for (let i = 0; i < crumbs.length; i++) { if (i) add(bc, await IC('chevron-right', 14, 'icon/muted')); const last = i === crumbs.length - 1; add(bc, await T(crumbs[i], last ? 'Label/M' : 'Body/S', last ? 'text/primary' : 'text/tertiary')); } }
  add(top, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, o.tstyle || 'Heading/H2', 'text/primary')); for (const b of (o.badges || [])) add(tr, b); add(tr, [SPC(), 'FILL']); for (const b of (o.actions || [])) add(tr, b); add(top, [tr, 'FILL']);
  if (sub) await WT(top, sub, 'Body/S', 'text/secondary', 900);
  add(c, [top, 'FILL']); return top;
}
function ALW(dir, o) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function CARD(name, o = {}) { return ALW(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, w: o.w }); }
async function CHEAD(card, title, o = {}) { const r = AL('HORIZONTAL', { name: 'Card header', gap: 8, align: 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, o.ic || 'icon/muted')); add(r, await T(title, o.style || 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(r, b); add(r, [SPC(), 'FILL']); if (o.demo !== false) add(r, await DEMO(o.demoSize || 'S')); for (const b of (o.right || [])) add(r, b); add(card, [r, 'FILL']); if (o.sub) await WT(card, o.sub, 'Caption', 'text/tertiary', 300); return r; }
async function KV(parent, k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', p: o.line ? [8, 0, 8, 0] : 0 }); add(r, await T(k, 'Body/S', 'text/tertiary')); add(r, [SPC(), 'FILL']); if (o.node) add(r, o.node); else add(r, await T(v, o.style || 'Body/S Strong', o.color || 'text/primary')); add(parent, [r, 'FILL']); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
const TONE = { warning: ['status/warning-tint', 'status/warning'], danger: ['status/danger-tint', 'status/danger'], info: ['status/info-tint', 'status/info'], success: ['status/success-tint', 'status/success'], neutral: ['surface/raised', 'icon/muted'], brand: ['brand/tint-subtle', 'icon/brand'] };
async function NOTE(parent, icon, tone, text, o = {}) { const F = TONE[tone]; const r = AL('HORIZONTAL', { name: 'Callout — ' + (o.title || tone), gap: 12, p: [12, 16, 12, 16], fill: F[0], r: 10, align: o.actions ? 'CENTER' : undefined }); add(r, await IC(icon, 18, F[1])); const col = AL('VERTICAL', { name: 'Text', gap: 2 }); if (o.title) add(col, await T(o.title, 'Body/S Strong', 'text/primary')); await WT(col, text, 'Body/S', 'text/secondary', o.w || 400); add(r, [col, 'FILL']); for (const b of (o.actions || [])) add(r, b); add(parent, [r, 'FILL']); return r; }
async function KPI(trend, label, value, unit, delta, def, ctx) { const k = await I('23:15270', { Trend: trend }); await setTs(k, { Label: label, Value: value, Unit: unit, 'Delta value': delta, Definition: def }); if (ctx) { const t = k.findOne(n => n.type === 'TEXT' && /^vs /.test(n.characters)); if (t) await setText(t, ctx); } k.name = 'Admin/KPI Tile — ' + label; return k; }
async function ROW(parent, kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 16, align: o.align }); for (const k of kids) { if (Array.isArray(k)) add(r, k); else add(r, [k, 'FILL']); if (o.spark) { const kk = Array.isArray(k) ? k[0] : k; const sp = kk.findOne && kk.findOne(n => n.name === 'Sparkline'); if (sp) { try { sp.layoutSizingHorizontal = 'FILL'; } catch (e) { MISS.push('spark'); } } } } add(parent, [r, 'FILL']); return r; }
async function TABS(parent, tabs, active) { const r = AL('HORIZONTAL', { name: 'Tabs', gap: 0 }); strokeSides(r, 'border/subtle', { b: 1 }); for (const [l, cnt] of tabs) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const c = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (c) setP(c, 'Count', cnt); } add(r, t); } add(parent, [r, 'FILL']); return r; }
async function CHIP(l, sel, icon) { const p = { Label: l, 'Show icon': !!icon }; if (icon) p.Icon = ICONS[icon] || CHAINS[icon]; return await I('17:2766', { State: sel ? 'Selected' : 'Default' }, p); }
async function SEARCH(ph, size = 'S') { const si = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); const t = si.findOne(n => n.type === 'TEXT' && /placeholder|value/i.test(n.name)) || si.findOne(n => n.type === 'TEXT'); if (t) await setText(t, ph); return si; }
async function TOOLBAR(parent, ph, chips, o = {}) {
  const bar = AL('VERTICAL', { name: 'Toolbar', gap: 12 });
  const r1 = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(r1, [await SEARCH(ph), 'FILL']);
  for (const [l, sel, ic] of chips) add(r1, await CHIP(l, sel, ic));
  add(r1, await I('23:5397', { State: o.filtered ? 'Active' : 'Default' }, { Label: 'More filters' }));
  if (o.date) add(r1, await BTN('Secondary', o.date, { size: 'S', lead: 'calendar' }));
  add(r1, await BTN('Secondary', 'Export CSV', { size: 'S', lead: 'download' })); add(bar, [r1, 'FILL']);
  if (o.summary) { const r2 = AL('HORIZONTAL', { name: 'Summary', gap: 8, align: 'CENTER' }); add(r2, await T(o.summary, 'Caption', 'text/tertiary'), await DEMO('XS')); add(r2, [SPC(), 'FILL']); if (o.sort) add(r2, await T(o.sort, 'Caption', 'text/tertiary')); add(bar, [r2, 'FILL']); }
  add(parent, [bar, 'FILL']); return bar;
}
// ---------- tables ----------
async function HC(col) { const h = await I('22:8309', { Align: col.r ? 'Right' : 'Left', Sort: col.sort || 'None' }, { Label: col.l || ' ', 'Show sort icon': !!col.sort }); h.name = 'H/' + col.k; return h; }
async function CELL(sp, d) {
  if (sp && sp.type) return sp; let c;
  if (sp.T === 'custom') { c = AL('HORIZONTAL', { name: 'Cell/Custom', gap: sp.gap ?? 6, p: [6, 12, 6, 12], align: 'CENTER' }); c.minHeight = d === 'Comfortable' ? 56 : 40; for (const n of sp.n) add(c, n); if (sp.right) c.primaryAxisAlignItems = 'MAX'; return c; }
  if (sp.T === 'Risk') { c = await I('23:5378', { Level: sp.lv, Density: d }); if (sp.sc != null) await setT(c, 'Score', d === 'Compact' ? '· ' + sp.sc : 'Score ' + sp.sc + ' / 100'); return c; }
  c = await I('22:9559', { Type: sp.T, Density: d }, { 'Show secondary': !!sp.s, 'Show DEMO': false, 'Show expand': false });
  if (sp.T === 'Text' || sp.T === 'Date') { const t = await setT(c, 'Primary', sp.p); if (t && sp.mono) await t.setTextStyleIdAsync(TS['Mono/S'].id); if (t && sp.c) t.fills = [paint(sp.c)]; if (sp.s) await setT(c, 'Secondary', sp.s); }
  else if (sp.T === 'Number') { const t = await setTany(c, ['Value', 'Primary', 'Number'], sp.p); if (t && sp.c) t.fills = [paint(sp.c)]; }
  else if (sp.T === 'Status') { const b = findI(c, 'Status badge') || byMain(c, 'Badge/Status'); setP(b, 'Status', sp.st); if (sp.p) await setT(b, 'Label', sp.p); }
  else if (sp.T === 'Address') { const ch = findI(c, 'Address chip') || byMain(c, 'Wallet/Address Chip'); setP(ch, 'Address', sp.p); setP(ch, 'Show DEMO', false); if (sp.ch && ch) { const m = ch.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Chain/')); if (m) { try { m.swapComponent(await figma.getNodeByIdAsync(CHAINS[sp.ch])); } catch (e) {} } } }
  else if (sp.T === 'Amount') { const av = findI(c, 'Amount value') || byMain(c, 'Table/Amount Value'); setP(av, 'Sign', sp.sign || 'Neutral'); await setT(av || c, 'Value', sp.p); }
  else if (sp.T === 'User') { const a = findI(c, 'Avatar') || byMain(c, 'User/Avatar'); setP(a, 'Initials', sp.i); await setT(c, 'Handle', sp.p); if (sp.s) await setT(c, 'Secondary', sp.s); }
  else if (sp.T === 'Network') { setP(c, 'Chain', CHAINS[sp.p] || USDT_ID); await setT(c, 'Network name', sp.p); if (sp.s) await setT(c, 'Secondary', sp.s); }
  return c;
}
// TABLE(name, cols[{k,l,w:number|'FILL',r,sort}], rows[[cellSpec]], {density, hideL:[keys], head:node, foot:node, sel:[rowIdx], bare})
async function TABLE(parent, name, cols, rows, o = {}) {
  const d = o.density || 'Compact';
  const t = AL('VERTICAL', { name: 'Table — ' + name + (o.hideL ? ' {hideL:' + o.hideL.join(',') + '}' : ''), fill: o.bare ? null : 'surface/default', stroke: o.bare ? null : 'border/subtle', r: o.bare ? null : 14, clip: true });
  if (o.head) add(t, [o.head, 'FILL']);
  const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'bg/secondary' }); strokeSides(hr, 'border/subtle', { b: 1 });
  for (const col of cols) { const h = await HC(col); if (typeof col.w === 'number') h.resize(col.w, h.height); add(hr, h); if (col.w === 'FILL') h.layoutSizingHorizontal = 'FILL'; }
  add(t, [hr, 'FILL']);
  for (let ri = 0; ri < rows.length; ri++) {
    const sel = (o.sel || []).includes(ri); const row = AL('HORIZONTAL', { name: 'Row ' + (ri + 1) + (sel ? ' (selected)' : ''), align: 'CENTER', fill: sel ? 'surface/selected' : null }); if (ri < rows.length - 1 || o.foot) strokeSides(row, 'border/subtle', { b: 1 });
    for (let ci = 0; ci < cols.length; ci++) { const col = cols[ci]; const sp = rows[ri][ci]; const c = await CELL(sp == null ? { T: 'custom', n: [] } : sp, d); c.name = 'Col/' + col.k; if (typeof col.w === 'number') { c.resize(col.w, c.height); if (c.type === 'FRAME') c.counterAxisSizingMode = 'AUTO'; } add(row, c); if (col.w === 'FILL') c.layoutSizingHorizontal = 'FILL'; }
    add(t, [row, 'FILL']);
  }
  if (o.foot) add(t, [o.foot, 'FILL']);
  add(parent, [t, 'FILL']); return t;
}
function C(...n) { return { T: 'custom', n }; }
function CR(...n) { return { T: 'custom', n, right: 1 }; }
async function TH(title, o = {}) { const h = AL('HORIZONTAL', { name: 'Table title', gap: 8, p: [14, 16, 14, 16], align: 'CENTER' }); strokeSides(h, 'border/subtle', { b: 1 }); add(h, await T(title, 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(h, b); add(h, [SPC(), 'FILL']); if (o.meta) add(h, await T(o.meta, 'Caption', 'text/tertiary')); add(h, await DEMO('M')); for (const b of (o.right || [])) add(h, b); return h; }
function PAGEFIX(p, per, last) { if (!p) return; if (per) { const b = p.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Secondary')); if (b) setP(b, 'Label', String(per)); } if (last) { for (let k = 1; k <= 5; k++) { const it = findI(p, 'Page ' + k); if (it && k > last) it.visible = false; } const g = p.findOne(n => n.name === 'Gap'); if (g) g.visible = last > 6; const lp = findI(p, 'Page 65'); if (lp) { if (last > 5) setP(lp, 'Page', String(last)); else lp.visible = false; } } }
async function PAGER(type, range, per, last) { const p = await I('23:16756', { Type: type }); if (range) await setT(p, 'Range', range); PAGEFIX(p, per, last); return p; }
async function MONO(s, c = 'text/primary') { return await T(s, 'Mono/S', c); }
async function ICT(icon, color, s, tc = 'text/primary', st = 'Body/S') { const r = AL('HORIZONTAL', { name: 'Icon text — ' + String(s).slice(0, 24), gap: 6, align: 'CENTER' }); add(r, await IC(icon, 16, color), await T(s, st, tc)); return r; }
async function PILL(chain, status, label) { const p = await I('9:377', { Chain: chain, Status: status }, { 'Show status label': label !== false, 'Show chevron': false }); return p; }
async function BAR(pct, color = 'brand/primary', w = 120) { const r = AL('HORIZONTAL', { name: 'Bar ' + pct + '%', w, h: 6, fill: 'surface/hover', r: 9999, clip: true }); const b = rect(Math.max(2, Math.round(w * pct / 100)), 6, color, 9999, 'Fill'); add(r, b); return r; }
async function STEPS(parent, steps) { const r = AL('VERTICAL', { name: 'Timeline', gap: 0 }); for (let i = 0; i < steps.length; i++) { const [state, t1, t2] = steps[i]; const row = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const rail = AL('VERTICAL', { name: 'Rail', gap: 4, align: 'CENTER' }); const col = { done: 'status/success', now: 'status/info', next: 'border/strong', bad: 'status/danger', warn: 'status/warning' }[state]; add(rail, await IC(state === 'done' ? 'check-circle' : state === 'bad' ? 'x-circle' : state === 'warn' ? 'alert-triangle' : state === 'now' ? 'clock' : 'hourglass', 18, col)); if (i < steps.length - 1) { const ln = rect(2, 24, 'border/default', 0, 'Line'); add(rail, ln); } add(row, rail); const tx = AL('VERTICAL', { name: 'Text', gap: 2, p: [0, 0, 12, 0] }); add(tx, await T(t1, 'Body/S Strong', state === 'next' ? 'text/tertiary' : 'text/primary')); if (t2) await WT(tx, t2, 'Caption', 'text/tertiary', 300); add(row, [tx, 'FILL']); add(r, [row, 'FILL']); } add(parent, [r, 'FILL']); return r; }
async function RISKM(lv, user, factors, outcome) { const m = await I('23:18374', { Level: lv }); for (const t of m.findAll(n => n.type === 'TEXT')) if (t.characters.includes('@nova.k')) await setText(t, t.characters.replace('@nova.k', user)); if (factors) await setT(m, 'Factors text', factors); if (outcome) await setT(m, 'Outcome', outcome); return m; }
async function TAREA(label, ph, helper) { const ta = await I('16:3858', { State: 'Default' }, { Label: label, 'Show counter': true }); for (const t of ta.findAll(n => n.type === 'TEXT')) { if (t.characters.startsWith('Tell us')) await setText(t, ph); else if (helper && t.characters.startsWith('Never share')) await setText(t, helper); } return ta; }
async function DONE(f, extra = {}) { fitSection(sec); await f.screenshot({ scale: 0.5 }); return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, miss: [...new Set(MISS)].slice(0, 40), ...extra }; }
// ===== END ADM-BC LIB =====

const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-B6] Network Health / 1440 / Degraded — Ethereum';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B6'), 'B', 5, 'SI', 'Search network, provider, incident…');
await HEAD(c, ['Admin', 'Blockchain', 'Network health'], 'Network health', 'RPC providers, indexers and confirmation times per network. When a network degrades, players see a notice automatically on deposit and withdraw screens — no admin action ever changes a balance.', { badges: [await ST('Live', 'Live'), await DEMO('M')], actions: [await BTN('Secondary', 'Public status page', { size: 'S', lead: 'external-link' }), await BTN('Primary', 'Post incident update', { size: 'S', lead: 'megaphone' })] });
const g = await I('30:17353', { Status: 'Operational' });
const inc = CARD('Incident INC-0457', { stroke: 'border/default', gap: 12 }); await CHEAD(inc, 'INC-0457 · Ethereum congestion', { icon: 'alert-triangle', ic: 'status/warning', badges: [await ST('Under review', 'Monitoring')] });
await WT(inc, 'Gas prices spiked from 17:20 UTC. Deposits on Ethereum confirm in about 4 min; the withdrawal fee estimate is 2.40 USDT. Players are offered Arbitrum or Polygon as faster options.', 'Body/S', 'text/secondary', 520);
await STEPS(inc, [['done', 'Detected automatically · 17:20 UTC', 'Avg confirmation above 3 min for 10 min'], ['done', 'Player notice live · 17:22 UTC', 'Deposit + withdraw screens, Ethereum only'], ['done', 'RPC failover to provider B · 17:31 UTC', 'Provider A p95 latency over 400 ms'], ['now', 'Monitoring · owner S. Iyer', 'Next update due 19:00 UTC']]);
await ROW(c, [[g], inc], { gap: 24 });
async function lag(n, tone) { return C(await IC(tone === 'ok' ? 'check-circle' : 'alert-triangle', 14, tone === 'ok' ? 'status/success' : 'status/warning'), await T(n, 'Body/S', 'text/secondary')); }
async function prov(a, b) { const r = []; for (const [l, s] of [['A', a], ['B', b]]) r.push(await IC(s === 1 ? 'check-circle' : s === 2 ? 'alert-triangle' : 'x-circle', 14, s === 1 ? 'status/success' : s === 2 ? 'status/warning' : 'status/danger'), await T('Provider ' + l + (s === 2 ? ' degraded' : ''), 'Body/S', s === 2 ? 'text/warning' : 'text/secondary')); return C(...r); }
const H = [['BNB Chain', 'Operational', '43,918,207', ['1', 'ok'], '96 ms', [1, 1], '45 s · 15 conf.', '99.99%'], ['Polygon', 'Operational', '64,502,118', ['2', 'ok'], '140 ms', [1, 1], '2 min 10 s · 64 conf.', '99.95%'], ['Arbitrum', 'Operational', '274,118,902', ['0', 'ok'], '88 ms', [1, 1], '25 s · 20 conf.', '99.99%'], ['Ethereum', 'Degraded', '21,284,650', ['1', 'ok'], '410 ms', [2, 1], '4 min 12 s · 12 conf.', '99.62%'], ['Solana', 'Operational', '301,442,870', ['3', 'ok'], '120 ms', [1, 1], '13 s · finalized', '99.98%']];
const rows = []; for (const h of H) rows.push([C(await PILL(h[0], h[1])), CR(await T(h[2], 'Mono/S', 'text/secondary')), await lag(h[3][0] + ' blocks', h[3][1]), CR(await T(h[4], 'Number/S', h[4] === '410 ms' ? 'text/warning' : 'text/primary')), await prov(...h[5]), { T: 'Text', p: h[6], c: h[0] === 'Ethereum' ? 'text/warning' : 'text/secondary' }, CR(await T(h[7], 'Number/S', 'text/primary'))]);
await TABLE(c, 'Per-network health', [{ k: 'net', l: 'Network', w: 200 }, { k: 'height', l: 'Block height', w: 136, r: 1 }, { k: 'lag', l: 'Indexer lag', w: 124 }, { k: 'p95', l: 'RPC p95', w: 104, r: 1 }, { k: 'prov', l: 'RPC providers', w: 'FILL' }, { k: 'conf', l: 'Avg confirmation', w: 176 }, { k: 'up', l: 'Uptime 30 d', w: 112, r: 1 }], rows, { density: 'Comfortable', hideL: ['height', 'up'], head: await TH('Per-network health', { meta: 'Sampled every 15 s · 18:44 UTC' }) });
const tp = []; for (const [ch, st, v, tr, d] of [['BNB Chain', 'Operational', '18.2', 'Neutral', '0%'], ['Polygon', 'Operational', '9.4', 'Neutral', '+1%'], ['Arbitrum', 'Operational', '24.6', 'Up', '+6%'], ['Ethereum', 'Degraded', '3.1', 'Down', '−38%'], ['Solana', 'Operational', '6.8', 'Neutral', '0%']]) { const k = CARD('Throughput ' + ch, { gap: 8, p: 16 }); add(k, await PILL(ch, st, false)); const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'MAX' }); add(vr, await T(v, 'Number/M', 'text/primary'), await T('tx / min', 'Caption', 'text/tertiary')); add(k, vr); add(k, await I('28:19568', { Trend: tr, Size: 'M' })); add(k, await T(d + ' vs 7-day avg', 'Caption', tr === 'Down' ? 'text/danger' : tr === 'Up' ? 'text/success' : 'text/tertiary')); tp.push(k); }
const tw = AL('VERTICAL', { name: 'Throughput', gap: 12 }); add(c, [tw, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); add(th, await T('Platform throughput · last 60 min', 'Heading/H5', 'text/primary')); add(th, [SPC(), 'FILL']); add(th, await DEMO('M')); add(tw, [th, 'FILL']);
await ROW(tw, tp);
return await DONE(f);
