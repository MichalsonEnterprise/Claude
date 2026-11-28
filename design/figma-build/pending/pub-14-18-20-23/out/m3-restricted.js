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

// ===== PUB-14/18/20/23 mobile prelude (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-14/18/20/23 — Mobile', 35000, 0);
const MSG = 'DEMO DATA — illustrative values only';
const NOTES = []; const CREATED = {};
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function firstText(inst, val) { const t = inst.findOne(n => n.type === 'TEXT'); if (t) t.characters = val; return !!t; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
const COLX = [120, 630, 1140, 1650];
function restack(x) { const fs = sec.children.filter(c => Math.abs(c.x - x) < 5).sort((a, b) => a.y - b.y); let y = 120; for (const f of fs) { f.y = y; y += f.height + 160; } }
function below(name) { const o = sec.children.find(n => n.name === name); return o ? o.y + o.height + 160 : 120; }
async function mshell(name, x, o = {}) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 390, o.h ? { h: o.h } : {}); sec.appendChild(f); f.x = x; f.y = o.y ?? 120;
  add(f, [await DEMOBAR(MSG), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: o.p || [24, 16, 40, 16], gap: o.gap ?? 32 }); add(f, [C, 'FILL']);
  CREATED[name] = f.id; return { f, C };
}
async function mfinish(S, o = {}) {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (o.sticky) add(S.f, [o.sticky, 'FILL']);
  const tab = await I('22:5413', { Active: o.tab || 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
function tile(icName, o = {}) { return (async () => { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icName, fill: o.tint || 'brand/tint', r: 10, p: o.p ?? 8 }); add(t, await IC(icName, o.size || 18, o.ic || 'icon/brand')); return t; })(); }
async function phead(C, over, title, body, meta) {
  const h = AL('VERTICAL', { name: 'Page header', gap: 8 }); add(C, [h, 'FILL']);
  add(h, await T(over, 'Overline', 'text/brand'), [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL']);
  if (body) add(h, [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
  if (meta && meta.length) { const m = AL('HORIZONTAL', { name: 'Meta', gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); for (const [ic, label] of meta) { const r = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(r, await IC(ic, 16, 'icon/muted'), await T(label, 'Caption', 'text/tertiary')); add(m, r); } add(h, [m, 'FILL']); }
  return h;
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
async function mlic(C) { const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(C, [r, 'FILL']); return r; }
async function search(value, filled) { const s = await I('16:3820', { Size: 'M', State: filled ? 'Filled' : 'Default' }, { 'Show shortcut': false }); s.name = 'Input/Search — ' + value; txt(s, 'Value text', value); return s; }
async function pills(labels, active, name = 'Category pills — scrolls horizontally') { const r = AL('HORIZONTAL', { name, gap: 8, w: 358, clip: true }); for (const l of labels) { const p = await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show icon': false }); p.name = 'Tabs/Pill — ' + l; r.appendChild(p); } return r; }
function hilite(t, term) { if (!t || t.type !== 'TEXT') return; const s = t.characters.toLowerCase(); let i = s.indexOf(term.toLowerCase()); while (i >= 0) { t.setRangeFills(i, i + term.length, [paint('text/brand')]); t.setRangeFontName(i, i + term.length, { family: 'Inter', style: 'Semi Bold' }); i = s.indexOf(term.toLowerCase(), i + term.length); } }
function overflowList(root) { const rb = root.absoluteBoundingBox; const bad = []; for (const t of root.findAll(n => n.type === 'TEXT')) { let vis = true, p = t; while (p && p !== root) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) continue; const b = t.absoluteBoundingBox; if (!b) continue; if (b.width < 2 || b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) bad.push(t.name.slice(0, 30) + '@' + Math.round(b.x - rb.x) + '+' + Math.round(b.width)); } return bad; }
// Fit a library instance to its FILL width: if inner text overflows, try FILL on wide inner texts/frames; report what's left
function fitInst(inst) { let bad = overflowList(inst); if (!bad.length) return []; const ib = inst.absoluteBoundingBox; for (const n of inst.findAll(n => (n.type === 'TEXT' || n.type === 'FRAME') && n.parent && n.parent.layoutMode && n.parent.layoutMode !== 'NONE')) { const b = n.absoluteBoundingBox; if (b && b.x + b.width > ib.x + ib.width + 1) { try { if (n.type === 'TEXT' && n.textAutoResize === 'WIDTH_AND_HEIGHT') n.textAutoResize = 'HEIGHT'; n.layoutSizingHorizontal = 'FILL'; } catch (e) { } } } return overflowList(inst); }
function audit(f) { return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), overflow: overflowList(f).slice(0, 12) }; }
// ===== end prelude =====

// ===== M3: [PUB-20] Restricted Countries — 390 Default grouped list + Search “united” =====
const BADGE_MAP = { Restricted: 'Restricted', Permitted: 'Approved', Limited: 'Pending' };
async function stat(st) { const b = await BADGE(BADGE_MAP[st], 'S'); b.name = 'Status — ' + st; firstText(b, st); return b; }
const REG = [
 ['Europe', [
  ['Portugal', 'Permitted', 'All products available'],
  ['Germany', 'Limited', 'Global Pool only — casino games need a national licence'],
  ['France', 'Restricted', 'National online-gambling licence required'],
  ['Netherlands', 'Restricted', 'National online-gambling licence required'],
  ['Spain', 'Restricted', 'National online-gambling licence required'],
  ['United Kingdom', 'Restricted', 'UK Gambling Commission licence required']]],
 ['Americas', [
  ['Brazil', 'Limited', 'Global Pool and Originals only'],
  ['Canada', 'Limited', 'Not available in Ontario; permitted elsewhere'],
  ['Mexico', 'Permitted', 'All products available'],
  ['United States', 'Restricted', 'Online gambling regulated state by state — no licence held']]],
 ['Asia-Pacific', [
  ['Australia', 'Restricted', 'Interactive gambling services prohibited'],
  ['Japan', 'Restricted', 'Gambling prohibited by law'],
  ['Singapore', 'Restricted', 'Remote gambling prohibited'],
  ['New Zealand', 'Permitted', 'All products available']]],
 ['Middle East & Africa', [
  ['Iran', 'Restricted', 'International sanctions'],
  ['South Africa', 'Limited', 'Global Pool only'],
  ['United Arab Emirates', 'Restricted', 'Gambling prohibited by law'],
  ['Nigeria', 'Permitted', 'All products available']]],
];
async function legend(C) {
  const lg = box('Status legend', { p: [4, 16, 4, 16], gap: 0 }); add(C, [lg, 'FILL']);
  const L = [['Permitted', 'Sign up, deposit, play and enter the Global Pool.'], ['Limited', 'Some products unavailable — shown per country.'], ['Restricted', 'No gambling products. You can still sign in and withdraw.']];
  for (let i = 0; i < L.length; i++) { const r = AL('HORIZONTAL', { name: 'Legend — ' + L[i][0], gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (i < L.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const b = await stat(L[i][0]); const w = AL('HORIZONTAL', { w: 96 }); add(w, b); add(r, w, [await T(L[i][1], 'Body/S', 'text/secondary', { w: 220 }), 'FILL']); add(lg, [r, 'FILL']); }
}
async function crow(parent, name, st, why, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Country — ' + name, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 });
  const t = AL('VERTICAL', { gap: 2 }); const nm = await T(name, 'Body/M Strong', 'text/primary', { w: 200 }); if (o.term) hilite(nm, o.term); add(t, [nm, 'FILL']); if (o.region) add(t, await T(o.region, 'Overline', 'text/tertiary')); add(t, [await T(why, 'Caption', 'text/tertiary', { w: 200 }), 'FILL']);
  add(r, [t, 'FILL'], await stat(st)); add(parent, [r, 'FILL']); return r;
}
async function travel(C) {
  const tv = box('Travelling?', { p: 16, gap: 10, fill: 'bg/secondary' }); add(C, [tv, 'FILL']);
  const h = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(h, await tile('map-pin', { tint: 'status/info-tint', ic: 'text/info' }), [await T('Travelling or moved?', 'Heading/H5', 'text/primary', { w: 260 }), 'FILL']); add(tv, [h, 'FILL']);
  add(tv, [await T('Availability follows where you are right now, not your nationality. In a restricted region you can still sign in, see your history and withdraw your balance. Please don’t use a VPN or proxy — accounts that hide their location are restricted.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const lk = AL('HORIZONTAL', { gap: 4, align: 'CENTER' }); add(lk, await T('Contact support about your region', 'Label/M', 'text/brand'), await IC('arrow-right', 16, 'icon/brand')); add(tv, lk);
}
// ---------- Frame 1: Default — grouped list ----------
const N1 = '[PUB-20] Restricted Countries / 390 / Default — grouped list';
const S1 = await mshell(N1, COLX[2], { y: 120 }); const C1 = S1.C;
const cnt = REG.reduce((s, g) => s + g[1].length, 0);
await phead(C1, 'AVAILABILITY', 'Restricted countries', 'Where GLOBAL POOL games and the Global Pool are available. We check your location at sign-in and before every deposit, entry and bet.', [['calendar', 'Last updated 27 Nov 2026'], ['file', 'Version 2026.11']]);
const you = box('Your region', { p: 16, gap: 10, stroke: 'border/success' }); add(C1, [you, 'FILL']);
const yr = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(yr, await tile('map-pin'), [await T('Your region: Portugal', 'Body/M Strong', 'text/primary', { w: 160 }), 'FILL'], await stat('Permitted'), await DEMO('XS')); add(you, [yr, 'FILL']);
add(you, [await T('Detected from your network location just now. All products are available to you.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
await legend(C1);
const sf = AL('VERTICAL', { name: 'Search + filters', gap: 12 }); add(C1, [sf, 'FILL']);
add(sf, [await search('Search a country or region', false), 'FILL'], [await pills(['All · ' + cnt, 'Restricted · 10', 'Limited · 4', 'Permitted · 4'], 'All · ' + cnt, 'Status filters — scrolls horizontally'), 'FILL']);
const dl = AL('HORIZONTAL', { name: 'List label', gap: 8, align: 'CENTER' }); add(dl, [await T('Illustrative list — the licensed operator publishes the binding list.', 'Caption', 'text/tertiary', { w: 270 }), 'FILL'], await DEMO('M')); add(C1, [dl, 'FILL']);
for (const [reg, rows] of REG) {
  const g = box('Region — ' + reg, { p: [16, 16, 4, 16], gap: 4 }); add(C1, [g, 'FILL']);
  const nR = rows.filter(r => r[1] === 'Restricted').length, nL = rows.filter(r => r[1] === 'Limited').length, nP = rows.filter(r => r[1] === 'Permitted').length;
  const gh = AL('HORIZONTAL', { name: 'Region header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); strokeSides(gh, 'border/subtle', { b: 1 });
  const gt = AL('VERTICAL', { gap: 2 }); add(gt, await T(reg, 'Heading/H5', 'text/primary'), await T(nR + ' restricted · ' + nL + ' limited · ' + nP + ' permitted', 'Caption', 'text/tertiary')); add(gh, await IC('globe', 20, 'icon/muted'), [gt, 'FILL'], await IC('chevron-up', 20, 'icon/muted')); add(g, [gh, 'FILL']);
  for (let i = 0; i < rows.length; i++) await crow(g, rows[i][0], rows[i][1], rows[i][2], { last: i === rows.length - 1 });
}
const why = box('Why some countries are restricted', { p: 16, gap: 10 }); add(C1, [why, 'FILL']);
add(why, [await T('Why are some countries restricted?', 'Heading/H5', 'text/primary', { w: 326 }), 'FILL'], [await T('Online gambling needs a licence in each country. Where we don’t hold one, where gambling is prohibited, or where international sanctions apply, we don’t offer games or the Global Pool. Limited means a local licence covers only some products.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
await travel(C1); await mlic(C1); await mfinish(S1, { tab: 'Home' });
// ---------- Frame 2: Search — “united” ----------
const N2 = '[PUB-20] Restricted Countries / 390 / Search — “united”';
const S2 = await mshell(N2, COLX[2], { y: below(N1) }); const C2 = S2.C;
await phead(C2, 'AVAILABILITY', 'Restricted countries', null, [['calendar', 'Last updated 27 Nov 2026']]);
const sf2 = AL('VERTICAL', { name: 'Search + filters', gap: 12 }); add(C2, [sf2, 'FILL']);
add(sf2, [await search('united', true), 'FILL'], [await pills(['All · 3', 'Restricted · 3', 'Limited · 0', 'Permitted · 0'], 'All · 3', 'Status filters — scrolls horizontally'), 'FILL']);
const rc = AL('HORIZONTAL', { name: 'Result count', gap: 8, align: 'CENTER' }); add(rc, [await T('3 countries match “united”', 'Body/M Strong', 'text/primary', { w: 220 }), 'FILL'], await DEMO('S'), await T('Clear', 'Label/M', 'text/brand')); add(C2, [rc, 'FILL']);
const rl = box('Results', { p: [4, 16, 4, 16], gap: 0 }); add(C2, [rl, 'FILL']);
const HITS = [['United States', 'Americas', 'Online gambling regulated state by state — no licence held'], ['United Kingdom', 'Europe', 'UK Gambling Commission licence required'], ['United Arab Emirates', 'Middle East & Africa', 'Gambling prohibited by law']];
for (let i = 0; i < HITS.length; i++) await crow(rl, HITS[i][0], 'Restricted', HITS[i][2], { term: 'united', region: HITS[i][1], last: i === HITS.length - 1 });
// detail of the first match
const dt = box('Detail — United States', { p: 16, gap: 12, stroke: 'border/danger' }); add(C2, [dt, 'FILL']);
const dh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(dh, await tile('ban', { tint: 'status/danger-tint', ic: 'text/danger' }), [await T('United States', 'Heading/H5', 'text/primary', { w: 180 }), 'FILL'], await stat('Restricted')); add(dt, [dh, 'FILL']);
add(dt, [await T('Online gambling is licensed state by state and GLOBAL POOL holds no US licence, so no gambling products are offered anywhere in the United States.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
async function list(title, items, ic, col) { const l = AL('VERTICAL', { name: title, gap: 6 }); add(l, await T(title, 'Label/M', 'text/primary')); for (const s of items) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC(ic, 16, col), [await T(s, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(l, [r, 'FILL']); } return l; }
add(dt, [await list('Still available', ['Sign in and see your balance and history', 'Withdraw your Available balance', 'Responsible-gaming tools and support'], 'check-circle', 'text/success'), 'FILL'], [await list('Not available', ['Deposits and new sign-ups', 'Global Pool entries and all games', 'Promotions and VIP rewards'], 'x-circle', 'text/danger'), 'FILL']);
add(dt, [await BTN('Secondary', 'How to withdraw from a restricted region', { size: 'L' }), 'FILL']);
await travel(C2);
const nf = AL('HORIZONTAL', { name: 'Not listed', gap: 10, align: 'CENTER', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16 }); add(nf, await IC('help-circle', 20, 'icon/muted'), [await T('Can’t find your country? It isn’t supported yet — contact support before you sign up.', 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(C2, [nf, 'FILL']);
await mlic(C2); await mfinish(S2, { tab: 'Home' });
restack(COLX[2]); fitSection(sec);
await S1.f.screenshot({ scale: 0.5 }); await S2.f.screenshot({ scale: 0.5 });
return { section: sec.id, created: CREATED, audits: [audit(S1.f), audit(S2.f)], notes: NOTES };
