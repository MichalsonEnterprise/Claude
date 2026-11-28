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

// ===== ADM-GROWTH-SYS tablet lib (subset of the adm-bc admin lib + tablet shell) =====
const MISS = [];
const SPC = () => { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; };
function findI(r, nm) { return r ? r.findOne(n => n.type === 'INSTANCE' && n.name === nm) : null; }
function byMain(r, setName) { return r ? r.findOne(n => { if (n.type !== 'INSTANCE') return false; const m = n.mainComponent; if (!m) return false; const p = m.parent; return m.name === setName || (p && p.type === 'COMPONENT_SET' && p.name === setName); }) : null; }
async function setText(t, v) { try { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(v); return true; } catch (e) { MISS.push('txt ' + t.name); return false; } }
async function setT(r, nm, v, i = 0) { if (!r || v == null) return null; const t = r.findAll(n => n.type === 'TEXT' && n.name === nm)[i]; if (!t) { MISS.push('T:' + nm); return null; } await setText(t, v); return t; }
function setP(inst, base, val) { if (!inst || inst.type !== 'INSTANCE') return false; try { const k = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === base); if (!k) { MISS.push('P:' + base); return false; } inst.setProperties({ [k]: val }); return true; } catch (e) { MISS.push('P:' + base); return false; } }
async function ST(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await setT(b, 'Label', label); return b; }
async function WT(parent, s, style = 'Body/S', color = 'text/secondary', w = 400) { const t = await T(s, style, color, { w }); add(parent, [t, 'FILL']); return t; }
function ALW(dir, o) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } return f; }
function CARD(name, o = {}) { return ALW(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, w: o.w }); }
async function CHEAD(card, title, o = {}) { const r = AL('HORIZONTAL', { name: 'Card header', gap: 8, align: 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, o.ic || 'icon/muted')); add(r, await T(title, o.style || 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(r, b); add(r, [SPC(), 'FILL']); if (o.demo !== false) add(r, await DEMO(o.demoSize || 'S')); for (const b of (o.right || [])) add(r, b); add(card, [r, 'FILL']); if (o.sub) await WT(card, o.sub, 'Caption', 'text/tertiary', 300); return r; }
const TONE = { warning: ['status/warning-tint', 'status/warning'], danger: ['status/danger-tint', 'status/danger'], info: ['status/info-tint', 'status/info'], success: ['status/success-tint', 'status/success'], neutral: ['surface/raised', 'icon/muted'] };
async function NOTE(parent, icon, tone, text, o = {}) { const F = TONE[tone]; const r = AL('HORIZONTAL', { name: 'Callout — ' + (o.title || tone), gap: 12, p: [12, 16, 12, 16], fill: F[0], r: 10 }); add(r, await IC(icon, 18, F[1])); const col = AL('VERTICAL', { name: 'Text', gap: 2 }); if (o.title) add(col, await T(o.title, 'Body/S Strong', 'text/primary')); await WT(col, text, 'Body/S', 'text/secondary', o.w || 400); add(r, [col, 'FILL']); add(parent, [r, 'FILL']); return r; }
async function CHIP(l, sel, icon) { const p = { Label: l, 'Show icon': !!icon }; if (icon) p.Icon = ICONS[icon]; return await I('17:2766', { State: sel ? 'Selected' : 'Default' }, p); }
async function SEARCH(ph, size = 'M') { const si = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); const t = si.findOne(n => n.type === 'TEXT' && /placeholder|value/i.test(n.name)) || si.findOne(n => n.type === 'TEXT'); if (t) await setText(t, ph); return si; }
async function PAGER(type, range) { const p = await I('23:16756', { Type: type }); if (range) await setT(p, 'Range', range); return p; }
function GUARD(name) { if (sec.children.find(n => n.name === name)) throw new Error('Frame already exists: ' + name); }
async function TSHELL(name, pos, product, tabs, active, who) {
  GUARD(name); const f = await screen(name, 768, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Tablet (inline)', gap: 8, p: [10, 24, 10, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  add(bar, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.menu }));
  const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm);
  const pr = AL('VERTICAL', { name: 'Product', gap: 0 }); add(pr, await T('Admin console', 'Label/L', 'text/primary'), await T(product, 'Caption', 'text/tertiary')); add(bar, pr);
  const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env);
  add(bar, [SPC(), 'FILL']);
  for (const [ic, cnt] of [['search'], ['user-check', '4'], ['bell', '5']]) { const g = AL('HORIZONTAL', { name: 'Btn ' + ic, gap: 0, align: 'CENTER' }); add(g, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(g, b); } add(bar, g); }
  add(bar, await I('9:238', { Size: 'S' }, { Initials: who }));
  add(f, [bar, 'FILL']);
  const sn = AL('HORIZONTAL', { name: product + ' sub-nav (scrolls)', gap: 0, p: [0, 16, 0, 16], fill: 'bg/secondary', clip: true }); strokeSides(sn, 'border/subtle', { b: 1 });
  for (const [l, cnt] of tabs) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const cc = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (cc) setP(cc, 'Count', cnt); } add(sn, t); }
  add(f, [sn, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 20, p: [24, 32, 48, 32] }); add(f, [c, 'FILL']);
  return { f, c };
}
// ===== END tablet lib =====

// [ADM-S3] Audit Logs / 768 / Default — tablet: no sidebar, inline admin top bar, scrolling System sub-nav, entries as stacked cards
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-A/M Affiliates & marketing, ADM-S System', 86000, 0);
const NAME = '[ADM-S3] Audit Logs / 768 / Default';
const s3m = await figma.getNodeByIdAsync('66:51328');
const below = sec.children.filter(n => Math.abs(n.x - s3m.x) < 2 && n.name.includes('/ 1280 /'));
const Y = Math.max(...below.map(n => n.y + n.height)) + 160;
const { f, c } = await TSHELL(NAME, { x: s3m.x, y: Y }, 'System', [['Admin roles', '6'], ['Permissions'], ['Audit logs'], ['API settings'], ['Security', '2'], ['System configuration', '1']], 'Audit logs', 'SI');
// title
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('Audit logs', 'Heading/H3', 'text/primary'), await ST('Confirmed', 'Chain verified'), await DEMO('M')); add(tr, [SPC(), 'FILL']);
add(tr, await BTN('Secondary', 'Verify chain now', { size: 'S', lead: 'refresh' }), await BTN('Primary', 'Export signed log', { size: 'S', lead: 'download' })); add(c, [tr, 'FILL']);
await WT(c, 'Every admin action and system event, written once and never edited. Each entry stores the hash of the one before it, and an hourly Merkle root is anchored on Arbitrum — anyone holding an export can prove nothing was changed.', 'Body/S', 'text/secondary', 704);
// integrity tiles 2 × 2
const grid = AL('HORIZONTAL', { name: 'Integrity status (2 columns)', gap: 16, wrap: 1, cgap: 16 }); add(c, [grid, 'FILL']);
for (const [lab, val, vc, sub, ic] of [['CHAIN STATUS', 'Verified', 'text/success', 'entries #1 – #88,214 · checked 18:45 UTC', 'shield-check'], ['LAST ON-CHAIN ANCHOR', '18:00 UTC', 'text/primary', 'Arbitrum block 284,112,904', 'link'], ['NEXT ANCHOR', '19:00 UTC', 'text/primary', 'hourly Merkle root of new entries', 'clock'], ['ENTRIES TODAY', '2,416', 'text/primary', 'admins + system jobs · kept 7 years', 'database']]) {
  const k = CARD('Tile ' + lab, { w: 344, gap: 6, p: 16 }); const h = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(h, await IC(ic, 16, 'icon/muted'), await T(lab, 'Overline', 'text/tertiary')); add(h, [SPC(), 'FILL']); add(h, await DEMO('XS')); add(k, [h, 'FILL']);
  add(k, await T(val, 'Number/M', vc)); await WT(k, sub, 'Caption', 'text/tertiary', 300); add(grid, k);
}
// toolbar
const tb = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(tb, [await SEARCH('Search actor, action code, target or entry #', 'M'), 'FILL']); add(tb, await I('23:5397', { State: 'Default' }, { Label: 'Filters' })); add(tb, await BTN('Secondary', 'Export view', { size: 'M', lead: 'download' })); add(c, [tb, 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Quick filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Actor', 0], ['Action', 0], ['Target type', 0], ['Date: Today', 1], ['Integrity: any', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const sm = AL('HORIZONTAL', { name: 'Summary', gap: 8, align: 'CENTER' }); add(sm, await T('2,416 entries · no filters · newest first', 'Caption', 'text/tertiary'), await DEMO('XS')); add(sm, [SPC(), 'FILL']); add(sm, await IC('lock', 14, 'icon/muted'), await T('Exports are watermarked with your admin ID and logged', 'Caption', 'text/tertiary')); add(c, [sm, 'FILL']);
// entries
const list = CARD('Entries — stacked cards', { gap: 0, p: 0 }); list.clipsContent = true; add(c, [list, 'FILL']);
const lh = AL('VERTICAL', { name: 'List header', gap: 4, p: [16, 16, 16, 16] }); strokeSides(lh, 'border/subtle', { b: 1 }); add(list, [lh, 'FILL']);
const lr = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); add(lr, await T('Entries · 27 Nov 2026 (UTC)', 'Heading/H5', 'text/primary'), await DEMO('M')); add(lr, [SPC(), 'FILL']); add(lr, await BTN('Ghost', 'Newest first', { size: 'S', trail: 'chevron-down' })); add(lh, [lr, 'FILL']);
await WT(lh, 'Read-only. Tap an entry for the full payload, the previous-entry hash and its Merkle proof. No role has an edit or delete action.', 'Caption', 'text/tertiary', 640);
// role chip: library variants, Marketing cloned from the desktop master (no Marketing variant in Admin/Role Chip)
let mkChip = null; try { const src = s3m.findOne(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Admin/Role Chip' && n.findOne(t => t.type === 'TEXT' && t.characters === 'Marketing')); if (src) mkChip = src; } catch (e) { MISS.push('mk ' + e.message); }
async function ROLE(r) { if (r === 'Marketing') { if (mkChip) { try { const k = mkChip.clone(); return k; } catch (e) { MISS.push('mkclone'); } } const p = AL('HORIZONTAL', { name: 'Role chip — Marketing (inline)', gap: 4, p: [2, 8, 2, 6], fill: 'surface/raised', r: 9999, align: 'CENTER' }); add(p, await IC('megaphone', 12, 'icon/brand'), await T('Marketing', 'Label/S', 'text/secondary')); return p; } return await I('23:18440', { Role: r, Size: 'S' }); }
const E = [
  ['18:44:30', 'LM', 'L. Moreau', 'Marketing', 'Saved CMS draft', 'cms.draft.save', 'CMS-122', 'v3 draft', 'Daily rewards page autosave; draft only, no publish rights.', '10.24.9.31 · Admin console', '0x8e41…07bd', '88,214'],
  ['18:42:07', 'AM', 'A. Marin', 'Finance', 'Rejected withdrawal', 'withdrawal.reject', 'WD-20850', '@nova.k', 'Destination flagged by sanctions screening (run SCR-5521). Funds returned to Available per policy AML-4.2.', '10.24.8.17 · Admin console', '0x5c09…e3a1', '88,213'],
  ['18:31:55', 'KO', 'K. Osei', 'Compliance', 'Requested changes', 'promotion.review', 'PR-208', 'Black Friday reload', '“Risk-free”, guaranteed wins, looping timer, missing key terms, cooling-off audience.', '10.24.8.40 · Admin console', '0x2f7a…91c4', '88,212'],
  ['18:20:12', 'SI', 'S. Iyer', 'Super Admin', 'Approved role change', 'role.assign.approve', 'AR-1046', 'J. Ortiz', 'Support L2 for weekend escalations; requested by R. Duarte.', '10.24.8.12 · Admin console', '0xb310…5e2d', '88,211'],
  ['18:00:00', 'SY', 'System', null, 'Anchored audit chain', 'audit.anchor', 'Arbitrum', 'anchor tx', 'Merkle root of entries #87,904–#88,210 written on-chain.', 'Scheduler · automated job', '0x77c2…a0f9', '88,210'],
  ['17:58:03', 'RD', 'R. Duarte', 'Support', 'Placed restriction', 'account.restrict', 'GP-51877', '@rook.eth', 'Player asked for a 30-day break in chat T-55102; cooling-off applied.', '10.24.9.8 · Admin console', '0x0d95…3b6e', '88,209']];
for (let i = 0; i < E.length; i++) {
  const e = E[i]; const k = AL('VERTICAL', { name: 'Entry #' + e[11], gap: 8, p: [14, 16, 14, 16] }); if (i < E.length - 1) strokeSides(k, 'border/subtle', { b: 1 });
  const r1 = AL('HORIZONTAL', { name: 'When · who · integrity', gap: 10, align: 'CENTER' });
  const tm = AL('VERTICAL', { name: 'Time', gap: 0 }); add(tm, await T(e[0], 'Mono/S', 'text/primary'), await T('27 Nov 2026', 'Caption', 'text/tertiary')); add(r1, tm);
  add(r1, await I('9:238', { Size: 'XS' }, { Initials: e[1] })); add(r1, await T(e[2], 'Body/S Strong', 'text/primary')); if (e[3]) add(r1, await ROLE(e[3])); else add(r1, await T('automated', 'Caption', 'text/tertiary'));
  add(r1, [SPC(), 'FILL']); add(r1, await IC('check-circle', 16, 'status/success'), await T('Chain ✓', 'Caption', 'text/success'), await T('#' + e[11], 'Mono/S', 'text/tertiary')); add(k, [r1, 'FILL']);
  const r2 = AL('HORIZONTAL', { name: 'Action · target', gap: 8, align: 'CENTER' }); add(r2, await T(e[4], 'Body/M Strong', 'text/primary'));
  const code = AL('HORIZONTAL', { name: 'Action code', p: [2, 6, 2, 6], fill: 'surface/raised', r: 4 }); add(code, await T(e[5], 'Mono/S', 'text/secondary')); add(r2, code); add(r2, [SPC(), 'FILL']);
  add(r2, await T(e[6], 'Mono/S', 'text/brand'), await T(e[7], 'Caption', 'text/tertiary')); add(k, [r2, 'FILL']);
  await WT(k, e[8], 'Body/S', 'text/secondary', 640);
  const r4 = AL('HORIZONTAL', { name: 'Source · hash', gap: 8, align: 'CENTER' }); add(r4, await IC('globe', 14, 'icon/muted'), await T(e[9], 'Caption', 'text/tertiary')); add(r4, [SPC(), 'FILL']); add(r4, await T('hash', 'Caption', 'text/tertiary'), await T(e[10], 'Mono/S', 'text/tertiary'), await DEMO('XS'), await IC('chevron-right', 16, 'icon/muted')); add(k, [r4, 'FILL']);
  add(list, [k, 'FILL']);
}
const pgr = await PAGER('Cursor', '1–20 of 2,416'); add(list, [pgr, 'FILL']);
// integrity explainer + signed exports, stacked
const hw = CARD('How integrity works', { gap: 12 }); add(c, [hw, 'FILL']);
await CHEAD(hw, 'How integrity works', { icon: 'shield-check', ic: 'icon/brand', demo: false, sub: 'Tamper-evident by construction — not by policy alone' });
const g2 = AL('HORIZONTAL', { name: 'Principles (2 columns)', gap: 12, wrap: 1, cgap: 12 }); add(hw, [g2, 'FILL']);
for (const [ic, t1, t2] of [['hash', 'Hash chain', 'Each entry stores the SHA-256 hash of the previous entry; changing one breaks every hash after it.'], ['link', 'On-chain anchor', 'Every hour the Merkle root is written to AuditAnchor v1.0.0 0x5a3e…c91d on Arbitrum (DEMO).'], ['database', 'Write-once storage', 'Entries live in WORM storage for 7 years. There is no edit or delete API for any role.'], ['undo', 'Corrections', 'A mistake is fixed by a new entry that references the original — history is never rewritten.']]) {
  const p = AL('HORIZONTAL', { name: t1, gap: 10, p: [12, 12, 12, 12], fill: 'surface/raised', r: 10, w: 314 }); p.counterAxisSizingMode = 'AUTO'; add(p, await IC(ic, 18, 'icon/brand')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t1, 'Body/S Strong', 'text/primary', 250); await WT(tx, t2, 'Caption', 'text/tertiary', 250); add(p, [tx, 'FILL']); add(g2, p);
}
const ex = CARD('Signed exports', { gap: 10 }); add(c, [ex, 'FILL']);
await CHEAD(ex, 'Signed exports', { icon: 'download', sub: 'CSV or JSON with Merkle proofs, signed with the platform key and watermarked with the exporting admin' });
for (const [a, b] of [['EXP-0412 · E. Lindqvist (external auditor) · 20 Nov', 'Full month · CSV'], ['EXP-0411 · K. Osei · 18 Nov', 'Compliance actions · JSON'], ['EXP-0409 · S. Iyer · 2 Nov', 'Role changes · CSV']]) { const r = AL('HORIZONTAL', { name: a.slice(0, 8), gap: 8, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await IC('file', 16, 'icon/muted'), await T(a, 'Body/S', 'text/secondary')); add(r, [SPC(), 'FILL']); add(r, await T(b, 'Body/S Strong', 'text/primary'), await DEMO('XS')); add(ex, [r, 'FILL']); }
await NOTE(ex, 'info', 'info', 'Every export needs a purpose and 2FA, and is itself written to this log as a new entry.', { w: 600 });
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, mk: !!mkChip, miss: [...new Set(MISS)].slice(0, 30) };
