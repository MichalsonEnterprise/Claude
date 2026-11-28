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

// ===== M4: [PUB-23] Cookie Consent — 390 Banner (first visit) + Preferences bottom sheet =====
const COOKIE_TITLE = 'Cookies on GLOBAL POOL';
const COOKIE_BODY = 'We use essential cookies to keep you signed in and secure and to check your region and age. With your OK we’d also use preference, analytics and marketing cookies. Nothing non-essential is set until you choose.';
const CATS = [
 ['Essential', 'Sign-in, security and fraud checks, region and age checks, and remembering this choice.', true, '6 cookies'],
 ['Preferences', 'Remember your language, display settings and game sound.', false, '3 cookies'],
 ['Analytics', 'Aggregated first-party usage statistics that help us fix and improve pages.', false, '4 cookies'],
 ['Marketing', 'Measure our campaigns and show our offers on other sites. Never used during a break or self-exclusion.', false, '5 cookies'],
];
async function lobbyBg(name, y) {
  const S = await mshell(name, COLX[3], { y, h: 844, p: [16, 16, 16, 16], gap: 20 }); const C = S.C;
  const dc = await I('24:13861', { State: 'Open' }); dc.name = 'Card/Draw Countdown — Open'; add(C, [dc, 'FILL']);
  const rh = AL('HORIZONTAL', { name: 'Row header — Originals', gap: 8, align: 'CENTER' }); add(rh, [await T('GLOBAL POOL Originals', 'Heading/H5', 'text/primary', { w: 220 }), 'FILL'], await T('All', 'Label/M', 'text/brand')); add(C, [rh, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Tile track — scrolls', gap: 12, w: 358, clip: true }); add(C, [tr, 'FILL']);
  for (const [art, pl, tag] of [['24:13176', '1,062', 'HOT'], ['24:13239', '146', null], ['24:13297', '206', 'NEW']]) { const t = await I('28:16529', { State: 'Default' }, { Art: art, Players: pl, 'Show tag': !!tag, Tag: tag || '', 'House edge': 'House edge 1.00%' }); tr.appendChild(t); }
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar'; S.f.appendChild(tab); tab.layoutPositioning = 'ABSOLUTE'; tab.resize(390, tab.height); tab.x = 0; tab.y = 844 - tab.height;
  return { ...S, tab };
}
// ---------- Frame 1: Banner — first visit ----------
const N1 = '[PUB-23] Cookie Consent / 390 / Banner — first visit';
const B = await lobbyBg(N1, 120);
const bn = AL('VERTICAL', { name: 'Cookie banner — non-blocking, pinned above tab bar', fill: 'surface/overlay', stroke: 'border/subtle', r: 20, p: 20, gap: 14, w: 358 }); await fx(bn, 'Elevation/4 — Modal');
const bh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(bh, await tile('cookie'), [await T(COOKIE_TITLE, 'Heading/H5', 'text/primary', { w: 240 }), 'FILL']); add(bn, [bh, 'FILL']);
add(bn, [await T(COOKIE_BODY, 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
const lk = AL('HORIZONTAL', { name: 'Policy links', gap: 16 }); add(lk, await T('Cookie policy', 'Label/M', 'text/brand'), await T('Privacy policy', 'Label/M', 'text/brand')); add(bn, lk);
const ba = AL('VERTICAL', { name: 'Actions — equal prominence', gap: 8 }); add(bn, [ba, 'FILL']);
for (const l of ['Accept all', 'Reject non-essential', 'Preferences']) add(ba, [await BTN('Secondary', l, { size: 'L' }), 'FILL']);
add(bn, [await T('Change your choice any time under “Cookie settings” in the footer.', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
B.f.appendChild(bn); bn.layoutPositioning = 'ABSOLUTE'; bn.x = 16; bn.y = 844 - B.tab.height - 12 - bn.height;
// ---------- Frame 2: Preferences — bottom sheet ----------
const N2 = '[PUB-23] Cookie Consent / 390 / Preferences — bottom sheet';
const P = await lobbyBg(N2, below(N1));
const scrim = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); P.f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
const sh = AL('VERTICAL', { name: 'Sheet/Bottom — Cookie preferences', fill: 'surface/overlay', w: 390, gap: 0 });
for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); strokeSides(sh, 'border/subtle', { t: 1 }); await fx(sh, 'Elevation/4 — Modal'); sh.clipsContent = true;
const gb = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [8, 0, 4, 0] }); add(gb, rect(36, 4, 'border/strong', 9999, 'Grabber')); add(sh, [gb, 'FILL']);
const hd = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [8, 16, 12, 16] }); strokeSides(hd, 'border/subtle', { b: 1 });
const cl = await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['x'] }); cl.name = 'Close — returns to banner, nothing saved';
add(hd, await tile('cookie'), [await T('Cookie preferences', 'Heading/H4', 'text/primary', { w: 220 }), 'FILL'], cl); add(sh, [hd, 'FILL']);
const bd = AL('VERTICAL', { name: 'Body — scrolls', gap: 12, p: [16, 16, 16, 16] }); add(sh, [bd, 'FILL']);
add(bd, [await T('Essential cookies are always on because the site can’t work without them. Everything else stays off until you switch it on.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
for (const [nm, ds, ess, n] of CATS) {
  const c = box('Category — ' + nm, { p: [12, 16, 12, 16], gap: 6 }); add(bd, [c, 'FILL']);
  const tg = await I('20:3309', { On: ess ? 'Yes' : 'No', State: ess ? 'Disabled' : 'Default' }, { Label: nm, Description: ds, 'Show description': true }); tg.name = 'Control/Toggle — ' + nm + (ess ? ' (always on)' : ' (off by default)'); add(c, [tg, 'FILL']);
  const lf = fitInst(tg); if (lf.length) NOTES.push('Toggle overflow ' + nm + ': ' + lf.join(','));
  const m = AL('HORIZONTAL', { name: 'Meta', gap: 6, align: 'CENTER' }); if (ess) add(m, await IC('lock', 14, 'icon/muted'), await T('Always on · ' + n, 'Caption', 'text/tertiary')); else add(m, await T('Off · ' + n, 'Caption', 'text/tertiary'), await T('· View cookies', 'Caption', 'text/brand')); add(c, [m, 'FILL']);
}
add(bd, [await T('Cookie policy · Privacy policy · Last updated 27 Nov 2026', 'Caption', 'text/brand', { w: 358 }), 'FILL']);
const ft = AL('VERTICAL', { name: 'Sticky footer', gap: 8, p: [12, 16, 8, 16], fill: 'surface/overlay', align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 });
const fr = AL('HORIZONTAL', { name: 'Accept / reject — equal weight', gap: 8 }); add(fr, [await BTN('Secondary', 'Reject non-essential', { size: 'M' }), 'FILL'], [await BTN('Secondary', 'Accept all', { size: 'M' }), 'FILL']); add(ft, [fr, 'FILL']);
add(ft, [await BTN('Primary', 'Save my choices', { size: 'L' }), 'FILL'], rect(134, 5, 'text/primary', 9999, 'Home indicator')); add(sh, [ft, 'FILL']);
P.f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0;
const MAXH = 844 - 72; if (sh.height > MAXH) { const over = sh.height - MAXH; bd.layoutSizingVertical = 'FIXED'; bd.resize(390, bd.height - over); bd.clipsContent = true; NOTES.push('Sheet body clipped to scroll area by ' + Math.round(over) + 'px'); }
sh.y = 844 - sh.height;
restack(COLX[3]); fitSection(sec);
await B.f.screenshot({ scale: 0.75 }); await P.f.screenshot({ scale: 0.75 });
return { section: sec.id, created: CREATED, audits: [audit(B.f), audit(P.f)], notes: NOTES, sheetH: Math.round(sh.height), bannerH: Math.round(bn.height) };
