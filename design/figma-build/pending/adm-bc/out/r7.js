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

// ===== ADM-BC LIB (tree-shaken) =====
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
const MODS = { B: { g: 'Blockchain Management', items: [['Supported networks'], ['Smart contracts'], ['Contract addresses'], ['Transaction monitoring'], ['Blockchain events'], ['Network health'], ['Failed transactions', '4'], ['Gas statistics']] }, C: { g: 'Compliance', items: [['KYC queue', '214'], ['AML alerts', '23'], ['Suspicious transactions', '3'], ['Sanctions screening', '2'], ['Restricted countries'], ['Self-exclusion'], ['RG reports']] } };
const ORDER = { C: ['C1Q', 'C1R', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], B: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] };
const BY = { 'C-1440': 160, 'C-1280': 3000, 'B-1440': 6000, 'B-1280': 9000, 'C-768': 12000 };
function POS(band, key) { const [m, w] = band.split('-'); const col = ORDER[m].indexOf(key); return { x: 120 + col * (Number(w) + 120), y: BY[band] }; }
function GUARD(name) { if (sec.children.find(n => n.name === name)) throw new Error('Frame already exists: ' + name); }
function ALW(dir, o) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function CARD(name, o = {}) { return ALW(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, w: o.w }); }
async function CHEAD(card, title, o = {}) { const r = AL('HORIZONTAL', { name: 'Card header', gap: 8, align: 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, o.ic || 'icon/muted')); add(r, await T(title, o.style || 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(r, b); add(r, [SPC(), 'FILL']); if (o.demo !== false) add(r, await DEMO(o.demoSize || 'S')); for (const b of (o.right || [])) add(r, b); add(card, [r, 'FILL']); if (o.sub) await WT(card, o.sub, 'Caption', 'text/tertiary', 300); return r; }
async function KV(parent, k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', p: o.line ? [8, 0, 8, 0] : 0 }); add(r, await T(k, 'Body/S', 'text/tertiary')); add(r, [SPC(), 'FILL']); if (o.node) add(r, o.node); else add(r, await T(v, o.style || 'Body/S Strong', o.color || 'text/primary')); add(parent, [r, 'FILL']); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
const TONE = { warning: ['status/warning-tint', 'status/warning'], danger: ['status/danger-tint', 'status/danger'], info: ['status/info-tint', 'status/info'], success: ['status/success-tint', 'status/success'], neutral: ['surface/raised', 'icon/muted'], brand: ['brand/tint-subtle', 'icon/brand'] };
async function NOTE(parent, icon, tone, text, o = {}) { const F = TONE[tone]; const r = AL('HORIZONTAL', { name: 'Callout — ' + (o.title || tone), gap: 12, p: [12, 16, 12, 16], fill: F[0], r: 10, align: o.actions ? 'CENTER' : undefined }); add(r, await IC(icon, 18, F[1])); const col = AL('VERTICAL', { name: 'Text', gap: 2 }); if (o.title) add(col, await T(o.title, 'Body/S Strong', 'text/primary')); await WT(col, text, 'Body/S', 'text/secondary', o.w || 400); add(r, [col, 'FILL']); for (const b of (o.actions || [])) add(r, b); add(parent, [r, 'FILL']); return r; }
async function KPI(trend, label, value, unit, delta, def, ctx) { const k = await I('23:15270', { Trend: trend }); await setTs(k, { Label: label, Value: value, Unit: unit, 'Delta value': delta, Definition: def }); if (ctx) { const t = k.findOne(n => n.type === 'TEXT' && /^vs /.test(n.characters)); if (t) await setText(t, ctx); } k.name = 'Admin/KPI Tile — ' + label; return k; }
async function ROW(parent, kids, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Row', gap: o.gap ?? 16, align: o.align }); for (const k of kids) { if (Array.isArray(k)) add(r, k); else add(r, [k, 'FILL']); if (o.spark) { const kk = Array.isArray(k) ? k[0] : k; const sp = kk.findOne && kk.findOne(n => n.name === 'Sparkline'); if (sp) { try { sp.layoutSizingHorizontal = 'FILL'; } catch (e) { MISS.push('spark'); } } } } add(parent, [r, 'FILL']); return r; }
async function CHIP(l, sel, icon) { const p = { Label: l, 'Show icon': !!icon }; if (icon) p.Icon = ICONS[icon] || CHAINS[icon]; return await I('17:2766', { State: sel ? 'Selected' : 'Default' }, p); }
async function SEARCH(ph, size = 'S') { const si = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); const t = si.findOne(n => n.type === 'TEXT' && /placeholder|value/i.test(n.name)) || si.findOne(n => n.type === 'TEXT'); if (t) await setText(t, ph); return si; }
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
async function TH(title, o = {}) { const h = AL('HORIZONTAL', { name: 'Table title', gap: 8, p: [14, 16, 14, 16], align: 'CENTER' }); strokeSides(h, 'border/subtle', { b: 1 }); add(h, await T(title, 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(h, b); add(h, [SPC(), 'FILL']); if (o.meta) add(h, await T(o.meta, 'Caption', 'text/tertiary')); add(h, await DEMO('M')); for (const b of (o.right || [])) add(h, b); return h; }
function PAGEFIX(p, per, last) { if (!p) return; if (per) { const b = p.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Button/Secondary')); if (b) setP(b, 'Label', String(per)); } if (last) { for (let k = 1; k <= 5; k++) { const it = findI(p, 'Page ' + k); if (it && k > last) it.visible = false; } const g = p.findOne(n => n.name === 'Gap'); if (g) g.visible = last > 6; const lp = findI(p, 'Page 65'); if (lp) { if (last > 5) setP(lp, 'Page', String(last)); else lp.visible = false; } } }
async function PAGER(type, range, per, last) { const p = await I('23:16756', { Type: type }); if (range) await setT(p, 'Range', range); PAGEFIX(p, per, last); return p; }
async function RISKM(lv, user, factors, outcome) { const m = await I('23:18374', { Level: lv }); for (const t of m.findAll(n => n.type === 'TEXT')) if (t.characters.includes('@nova.k')) await setText(t, t.characters.replace('@nova.k', user)); if (factors) await setT(m, 'Factors text', factors); if (outcome) await setT(m, 'Outcome', outcome); return m; }
async function TAREA(label, ph, helper) { const ta = await I('16:3858', { State: 'Default' }, { Label: label, 'Show counter': true }); for (const t of ta.findAll(n => n.type === 'TEXT')) { if (t.characters.startsWith('Tell us')) await setText(t, ph); else if (helper && t.characters.startsWith('Never share')) await setText(t, helper); } return ta; }
async function DONE(f, extra = {}) { fitSection(sec); await f.screenshot({ scale: 0.5 }); return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, miss: [...new Set(MISS)].slice(0, 40), ...extra }; }

async function TSHELL(name, key, activeLabel) {
  GUARD(name); const pos = POS('C-768', key);
  const f = await screen(name, 768, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Tablet (inline)', gap: 8, p: [10, 24, 10, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  add(bar, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.menu }));
  const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm);
  const pr = AL('VERTICAL', { name: 'Product', gap: 0 }); add(pr, await T('Admin console', 'Label/L', 'text/primary'), await T('Compliance', 'Caption', 'text/tertiary')); add(bar, pr);
  const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env);
  add(bar, [SPC(), 'FILL']);
  for (const [ic, cnt] of [['search'], ['user-check', '4'], ['bell', '5']]) { const g = AL('HORIZONTAL', { name: 'Btn ' + ic, gap: 0, align: 'CENTER' }); add(g, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(g, b); } add(bar, g); }
  add(bar, await I('9:238', { Size: 'S' }, { Initials: 'KO' }));
  add(f, [bar, 'FILL']);
  const sn = AL('HORIZONTAL', { name: 'Compliance sub-nav (scrolls)', gap: 0, p: [0, 16, 0, 16], fill: 'bg/secondary', clip: true }); strokeSides(sn, 'border/subtle', { b: 1 });
  for (const [l, cnt] of MODS.C.items) { const t = await I('20:6831', { State: l === activeLabel ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const cc = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (cc) setP(cc, 'Count', cnt); } add(sn, t); }
  add(f, [sn, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 20, p: [24, 32, 48, 32] }); add(f, [c, 'FILL']);
  return { f, c };
}
// ===== END LIB =====
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
if (Math.round(sec.x) === 70000) sec.x = 72000; // ADM-P section (56000, w 15720) overlaps 70000..71720
const __R = [];
// ---- snippet: fix-r7 ----
{
// B1 'Live status' strip: label back to hug (the overflow pass squeezed it); at 1280 the strip wraps instead
for (const fr of sec.children.filter(n => n.name.startsWith('[ADM-B1] Supported Networks'))) { const st = fr.findOne(n => n.type === 'FRAME' && n.name === 'Live status'); if (!st) { MISS.push('no live status'); continue; } const lab = st.findOne(n => n.type === 'TEXT' && n.characters === 'Live status'); if (lab) { lab.layoutSizingHorizontal = 'HUG'; lab.textAutoResize = 'WIDTH_AND_HEIGHT'; lab.textAlignHorizontal = 'LEFT'; } if (fr.name.includes('/ 1280 /')) { st.layoutWrap = 'WRAP'; bnum(st, 'counterAxisSpacing', 8); } }
// B7 master (before its Laptop clone): wider Since column, shorter failure copy so the Failure column doesn't truncate
{ const b7 = sec.children.find(n => n.name === '[ADM-B7] Failed Transactions / 1440 / Default'); const tb = b7 && b7.findOne(n => n.name.startsWith('Table — Failed')); if (tb) { for (const [k, w] of Object.entries({ net: 132, amount: 128, att: 80, since: 104, act: 40 })) for (const n of tb.findAll(x => x.name === 'Col/' + k || x.name === 'H/' + k)) { n.resize(w, n.height); if (n.type === 'FRAME') n.counterAxisSizingMode = 'AUTO'; } for (const t of tb.findAll(n => n.type === 'TEXT' && n.characters === 'RPC timeout — sweep not broadcast; funds still in the router')) await setText(t, 'RPC timeout · sweep not broadcast, funds in router'); } else MISS.push('B7 table'); }
}
// ---- body: l-b2 ----
{
const LIST = [["[ADM-B5] Blockchain Events / 1440 / Live", "B5"], ["[ADM-B6] Network Health / 1440 / Degraded — Ethereum", "B6"], ["[ADM-B7] Failed Transactions / 1440 / Default", "B7"], ["[ADM-B8] Gas Statistics / 1440 / Default", "B8"]];


const made = [];
for (const [srcName, key] of LIST) {
  const src = sec.children.find(n => n.name === srcName); if (!src) { MISS.push('missing ' + srcName); continue; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { MISS.push('exists ' + nm); continue; }
  const band = src.name.startsWith('[ADM-C') ? 'C-1280' : 'B-1280';
  const p = POS(band, key); const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = p.x; f.y = p.y;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  for (const t of f.findAll(n => n.name.startsWith('Table — ') && n.name.includes('{hideL:'))) { const ks = t.name.match(/\{hideL:([^}]*)\}/)[1].split(','); for (const n of t.findAll(x => ks.some(k => x.name === 'Col/' + k || x.name === 'H/' + k))) n.visible = false; }
  for (const n of f.findAll(x => x.name.includes('[hideL]'))) n.visible = false;
  made.push(f);
}
fitSection(sec);
__R.push({ made: made.map(f => [f.id, f.name, Math.round(f.height), f.x, f.y]), miss: [...new Set(MISS)] });
}
// ---- body: t-c1q ----
if (!sec.children.find(n => n.name === '[ADM-C1] KYC Queue / 768 / Default')) {


const NAME = '[ADM-C1] KYC Queue / 768 / Default';
const { f, c } = await TSHELL(NAME, 'C1Q', 'KYC queue');
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('KYC queue', 'Heading/H3', 'text/primary'), await ST('Live', 'Live'), await DEMO('M')); add(tr, [SPC(), 'FILL']); add(tr, await BTN('Primary', 'Start next review', { size: 'S', lead: 'play' })); add(c, [tr, 'FILL']);
await WT(c, 'Ordered by time left on the 48 h SLA. Provider results are advisory — a person makes every decision, and each one is written to the audit log. Times UTC.', 'Body/S', 'text/secondary', 704);
const qc = await I('23:15571', { Queue: 'KYC', SLA: 'At risk' }); await setT(qc, 'Count', '214');
await ROW(c, [[qc], await KPI('Up', 'Decisions today', '95', 'cases', '+12%', 'Approved 86 · rejected 9 · since 00:00 UTC', 'vs yesterday')], { spark: 1 });
const tabs = AL('HORIZONTAL', { name: 'Tabs (scrolls)', gap: 0, clip: true }); strokeSides(tabs, 'border/subtle', { b: 1 }); for (const [l, cnt] of [['All open', '214'], ['Assigned to me', '12'], ['L2', '171'], ['L3', '31'], ['Restricted country', '12'], ['Decided today', '95']]) { const t = await I('20:6831', { State: l === 'All open' ? 'Active' : 'Default' }, { Label: l, 'Show count': true }); const cc = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (cc) setP(cc, 'Count', cnt); add(tabs, t); } add(c, [tabs, 'FILL']);
const tb = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(tb, [await SEARCH('Search KYC ID, user or document', 'M'), 'FILL']); add(tb, await I('23:5397', { State: 'Active' }, { Label: 'Filters' })); add(c, [tb, 'FILL']);
const fc = AL('HORIZONTAL', { name: 'Applied filters', gap: 8, align: 'CENTER' }); add(fc, await CHIP('SLA under 12 h · 4', true), await CHIP('Provider: needs review', false)); add(fc, [SPC(), 'FILL']); add(fc, await T('214 open · 8 shown', 'Caption', 'text/tertiary'), await DEMO('XS')); add(c, [fc, 'FILL']);
async function sla(s, tone, who) { const st = AL('VERTICAL', { name: 'SLA + owner', gap: 2 }); const l1 = AL('HORIZONTAL', { name: 'SLA', gap: 4, align: 'CENTER' }); add(l1, await IC('clock', 14, tone === 'danger' ? 'status/danger' : tone === 'warning' ? 'status/warning' : 'icon/muted'), await T(s, 'Body/S Strong', tone === 'danger' ? 'text/danger' : tone === 'warning' ? 'text/warning' : 'text/primary')); add(st, l1, await T(who, 'Caption', who === 'Unassigned' ? 'text/tertiary' : 'text/secondary')); return C(st); }
async function lvl(l) { const st = AL('VERTICAL', { name: 'Level', gap: 2 }); add(st, await T('Level ' + l.slice(1), 'Body/S Strong', 'text/primary'), await T({ L1: 'Basic', L2: 'ID + liveness', L3: 'Enhanced (EDD)' }[l], 'Caption', 'text/tertiary')); return C(st); }
const R = [['KYC-30365', 'LV', '@lyra_v', 'Poland', 'L2', 'Low', 8, ['0 h 26 min', 'danger'], 'Unassigned'], ['KYC-30352', 'VI', '@velvet.io', 'Japan', 'L3', 'Medium', 38, ['1 h 12 min', 'danger'], 'M. Achebe'], ['KYC-30377', 'J8', '@juno88', 'Brazil', 'L2', 'Medium', 44, ['3 h 05 min', 'warning'], 'Unassigned'], ['KYC-30395', 'CK', '@cobalt.k', 'Portugal', 'L3', 'High', 71, ['8 h 20 min', 'warning'], 'K. Osei'], ['KYC-30401', 'RE', '@rook.eth', 'Austria', 'L2', 'Low', 14, ['13 h 40 min'], 'P. Novak'], ['KYC-30412', 'Z2', '@zephyr21', 'Mexico', 'L2', 'Low', 20, ['22 h 10 min'], 'Unassigned'], ['KYC-30418', 'AQ', '@atlas_q', 'Germany', 'L2', 'Low', 18, ['26 h 30 min'], 'K. Osei'], ['KYC-30426', 'HA', '@halcyon', 'Spain', 'L2', 'Low', 11, ['27 h 55 min'], 'Unassigned']];
const rows = []; for (const r of R) rows.push([{ T: 'Text', p: r[0], mono: 1 }, { T: 'User', i: r[1], p: r[2], s: r[3] }, await lvl(r[4]), { T: 'Risk', lv: r[5], sc: r[6] }, await sla(r[7][0], r[7][1], r[8])]);
await TABLE(c, 'KYC queue (tablet)', [{ k: 'case', l: 'Case', w: 104 }, { k: 'user', l: 'User · country', w: 'FILL' }, { k: 'level', l: 'Level', w: 124 }, { k: 'risk', l: 'Risk', w: 136 }, { k: 'sla', l: 'SLA · owner', w: 124, sort: 'Asc' }], rows, { density: 'Comfortable', sel: [6], head: await TH('Open cases', { meta: '18:44 UTC' }), foot: await PAGER('Cursor') });
await NOTE(c, 'users', 'info', 'L3 and any PEP or sanctions hit need a second reviewer. Restricted-country residents are held automatically with withdraw-only access.', { title: 'Policy KYC-1.4', w: 600 });
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C1] KYC Queue / 768 / Default' });
// ---- body: t-c1r ----
if (!sec.children.find(n => n.name === '[ADM-C1] KYC Review — KYC-30418 / 768 / In review')) {


const NAME = '[ADM-C1] KYC Review — KYC-30418 / 768 / In review';
const { f, c } = await TSHELL(NAME, 'C1R', 'KYC queue');
const bk = AL('HORIZONTAL', { name: 'Back', gap: 6, align: 'CENTER' }); add(bk, await IC('arrow-left', 16, 'icon/muted'), await T('KYC queue', 'Body/S', 'text/tertiary')); add(c, bk);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('Review KYC-30418', 'Heading/H3', 'text/primary'), await ST('Under review', 'In review'), await DEMO('M')); add(tr, [SPC(), 'FILL']); add(tr, await BTN('Ghost', 'Next case', { size: 'S', trail: 'chevron-right' })); add(c, [tr, 'FILL']);
await WT(c, 'Level 2 upgrade (ID + liveness) for @atlas_q · submitted 26 Nov 2026, 21:14 UTC · SLA 26 h 30 min left · assigned to you', 'Body/S', 'text/secondary', 704);
const ap = CARD('Applicant', { gap: 10 });
const ah = AL('HORIZONTAL', { name: 'Identity', gap: 12, align: 'CENTER' }); add(ah, await I('9:238', { Size: 'M' }, { Initials: 'AQ' })); const an = AL('VERTICAL', { name: 'Name', gap: 2 }); add(an, await T('@atlas_q', 'Body/M Strong', 'text/primary'), await T('GP-51907 · Germany · joined 3 Sep 2026', 'Caption', 'text/tertiary')); add(ah, [an, 'FILL']); add(ah, await DEMO('S')); add(ap, [ah, 'FILL']);
await KV(ap, 'Current level', null, { node: await I('23:5565', { Status: 'Approved', Level: 'L1' }) }); await KV(ap, 'Lifetime deposits', '3,450.00 USDT'); await KV(ap, 'Limit after L2', '25,000.00 USDT / day'); await KV(ap, 'Open AML alerts', 'None', { color: 'text/success' });
const rm = await RISKM('Low', '@atlas_q', 'Account age 85 days · deposits from 1 verified wallet · no sanctions or PEP hits');
await ROW(c, [ap, [rm]], { gap: 16 });
const docs = CARD('Submitted documents', { gap: 12 }); add(c, [docs, 'FILL']); await CHEAD(docs, 'Submitted documents', { icon: 'id-card' });
const dr = AL('HORIZONTAL', { name: 'Document tiles', gap: 12 }); add(docs, [dr, 'FILL']);
for (const [ic, t1, t2, col] of [['id-card', 'Passport — photo page', 'JPG 2.4 MB · SAMPLE', 'icon/muted'], ['face-scan', 'Selfie — liveness', 'Score 0.97 · passed', 'icon/brand'], ['monitor', 'Device & session', 'IP matches residence', 'icon/muted']]) { const t = AL('VERTICAL', { name: 'Doc — ' + t1, gap: 6 }); const pv = ALW('VERTICAL', { name: 'Preview', h: 120, fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', justify: 'CENTER' }); add(pv, await IC(ic, 40, col)); add(t, [pv, 'FILL']); await WT(t, t1, 'Body/S Strong', 'text/primary', 200); await WT(t, t2, 'Caption', 'text/tertiary', 200); add(dr, [t, 'FILL']); }
const ck = CARD('Automated checks', { gap: 8 }); add(c, [ck, 'FILL']); await CHEAD(ck, 'Automated checks', { icon: 'shield-check' });
for (const [ok, t1, t2, st, lab] of [[1, 'Document, face match 96 %, liveness', 'All passed · thresholds met', 'Approved', 'Pass'], [1, 'Sanctions & PEP screening', 'Lists of 27 Nov 2026, 06:00 UTC · no match', 'Approved', 'Clear'], [0, 'Adverse media', '1 weak name match (0.41) — different date of birth. Confirm below.', 'Under review', 'Needs review'], [1, 'Duplicates & self-exclusion register', 'No linked accounts or exclusions', 'Approved', 'Clear']]) { const r = AL('HORIZONTAL', { name: 'Check — ' + t1, gap: 12, p: [10, 12, 10, 12], fill: ok ? 'surface/raised' : 'status/warning-tint', r: 10, align: 'CENTER' }); add(r, await IC(ok ? 'check-circle' : 'alert-triangle', 18, ok ? 'status/success' : 'status/warning')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(tx, await T(t1, 'Body/S Strong', 'text/primary')); await WT(tx, t2, 'Caption', 'text/tertiary', 400); add(r, [tx, 'FILL']); add(r, await ST(st, lab)); add(ck, [r, 'FILL']); }
const de = CARD('Decision', { stroke: 'border/brand', gap: 12 }); add(c, [de, 'FILL']); await CHEAD(de, 'Decision', { icon: 'scale', ic: 'icon/brand', demo: false });
const rr = AL('HORIZONTAL', { name: 'Outcomes', gap: 12 }); for (const [l, d] of [['Approve Level 2', 'Limit 25,000.00 / day'], ['Request info', 'SLA pauses'], ['Reject', 'Reason required']]) add(rr, [await I('20:3259', { Selected: 'No', State: 'Default' }, { Label: l, Description: d, 'Show description': true }), 'FILL']); add(de, [rr, 'FILL']);
add(de, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I reviewed the adverse-media hit and it does not refer to this person', 'Show description': false }), 'FILL']);
add(de, [await TAREA('Reviewer note', 'Required for Reject or Request info. Visible to Compliance only.', 'Kept in the case file for 5 years'), 'FILL']);
const ab = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' }); add(ab, await BTN('Secondary', 'Release case', { size: 'L', lead: 'undo' })); add(ab, [await BTN('Primary', 'Submit decision', { size: 'L', state: 'Disabled', lead: 'check' }), 'FILL']); add(de, [ab, 'FILL']);
await WT(de, 'Choose an outcome and confirm the adverse-media check to continue. Recorded in the immutable audit log with your 2FA session.', 'Caption', 'text/tertiary', 600);
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C1] KYC Review — KYC-30418 / 768 / In review' });
// ---- body: t-c2 ----
if (!sec.children.find(n => n.name === '[ADM-C2] AML Alerts / 768 / Default')) {


const NAME = '[ADM-C2] AML Alerts / 768 / Default';
const { f, c } = await TSHELL(NAME, 'C2', 'AML alerts');
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('AML alerts', 'Heading/H3', 'text/primary'), await ST('Live', 'Live'), await DEMO('M')); add(tr, [SPC(), 'FILL']); add(tr, await BTN('Primary', 'Take next alert', { size: 'S', lead: 'play' })); add(c, [tr, 'FILL']);
await WT(c, 'Rules raise alerts; a person decides. Closing needs a written reason, escalation opens a suspicious-transaction case, and holds go through Account restrictions (reason + 2FA + four-eyes).', 'Body/S', 'text/secondary', 704);
await ROW(c, [await KPI('Flat', 'Open alerts', '23', 'alerts', '+3 today', 'High 4 · medium 11 · low 8 · 1 past SLA', 'vs yesterday'), await KPI('Up', 'Alerts closed (7 days)', '142', 'alerts', '+9.2%', 'Median time to close 9 h 40 min', 'vs previous 7 d')], { spark: 1 });
const tb = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(tb, [await SEARCH('Search alert, user, WD-/DP- ID or hash', 'M'), 'FILL']); add(tb, await I('23:5397', { State: 'Default' }, { Label: 'Filters' })); add(c, [tb, 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Quick filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Open · 23', 1], ['Assigned to me · 6', 0], ['High · 4', 0], ['Past SLA · 1', 0], ['Escalated · 2', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const grid = AL('HORIZONTAL', { name: 'Alert cards (2 columns)', gap: 16, wrap: 1, cgap: 16 }); add(c, [grid, 'FILL']);
const A = [['AML-5509', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'WD-20952', 'High', 86, '12,400.00', ['Under review', 'Escalated · STR-0093'], ['Case open', null]], ['AML-5530', 'SA', '@sable', 'Mixer exposure · 2 hops', 'WD-20960', 'High', 72, '4,800.00', ['Under review', 'In review'], ['2 h 10 min left', 'warning']], ['AML-5528', 'TW', '@tidewalker', 'Rapid in-out · 96 % out in 3 h', 'WD-20957', 'High', 69, '9,600.00', ['Pending', 'New'], ['5 h 30 min left', null]], ['AML-5519', 'Q9', '@quasar_9', 'Structuring · 6 deposits < 1,000', 'DP-77301…77366', 'Medium', 58, '5,820.00', ['Under review', 'In review'], ['11 h 05 min left', null]], ['AML-5521', 'DS', '@drift.sol', 'Shared device · 3 accounts', '3 accounts', 'Medium', 52, '2,140.00', ['Pending', 'New'], ['Past SLA', 'danger']], ['AML-3317', 'NK', '@nova.k', 'New address · 3× median payout', 'WD-20931', 'Medium', 41, '1,500.00', ['Under review', 'In review'], ['19 h 15 min left', null]]];
for (const a of A) {
  const k = CARD('Alert ' + a[0], { gap: 10, p: 16, w: 344, stroke: a[0] === 'AML-5530' ? 'border/brand' : 'border/subtle', fill: a[0] === 'AML-5530' ? 'surface/selected' : 'surface/default' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(a[0], 'Mono/S', 'text/primary')); add(l1, [SPC(), 'FILL']); add(l1, await ST(a[8][0], a[8][1])); add(k, [l1, 'FILL']);
  await WT(k, a[3], 'Body/M Strong', 'text/primary', 300);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'XS' }, { Initials: a[1] }), await T(a[2] + ' · ' + a[4], 'Body/S', 'text/secondary')); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'L3', gap: 8, align: 'CENTER' }); const rk = await I('23:5378', { Level: a[5], Density: 'Compact' }); await setT(rk, 'Score', '· ' + a[6]); add(l3, rk); add(l3, [SPC(), 'FILL']); add(l3, await T(a[7], 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER' }); add(l4, await IC('clock', 14, a[9][1] === 'danger' ? 'status/danger' : a[9][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(a[9][0], 'Caption', a[9][1] === 'danger' ? 'text/danger' : a[9][1] === 'warning' ? 'text/warning' : 'text/tertiary')); add(k, [l4, 'FILL']);
  add(grid, k);
}
add(c, [await PAGER('Cursor'), 'FILL']);
const pv = CARD('Selected alert — AML-5530', { stroke: 'border/brand', gap: 16 }); add(c, [pv, 'FILL']);
await CHEAD(pv, 'AML-5530 · @sable', { icon: 'shield-alert', ic: 'status/danger', badges: [await ST('Under review', 'In review')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 16 }); add(pv, [cols, 'FILL']);
const rm = await RISKM('High', '@sable', 'Destination 2 hops from a mixer-linked cluster · Arbitrum in, BNB Chain out · 2.4 % played', 'Policy AML-3.2: hold and escalate if confirmed'); add(cols, rm);
const act = AL('VERTICAL', { name: 'Actions', gap: 8 }); add(cols, [act, 'FILL']);
for (const [ty, l, ic] of [['Primary', 'Escalate to STR case', 'shield-alert'], ['Secondary', 'Request info from user', 'mail'], ['Secondary', 'Request withdrawal hold', 'lock'], ['Ghost', 'Close — no issue', 'check']]) add(act, [await BTN(ty, l, { size: 'M', lead: ic }), 'FILL']);
await WT(act, 'Reason required for every action · hold also needs 2FA + second approver · WD-20960 stays “Under review” for the user.', 'Caption', 'text/tertiary', 300);
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C2] AML Alerts / 768 / Default' });
// ---- snippet: hugcheck ----
{
// every screen frame must hug its content: re-assert AUTO height and report frames whose content ran past the frame bottom
const HUG = []; for (const f of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) { const b = Math.max(...f.children.filter(k => k.visible).map(k => k.y + k.height)); if (b > f.height + 1 || f.primaryAxisSizingMode !== 'AUTO') { f.primaryAxisSizingMode = 'AUTO'; HUG.push([f.name.slice(0, 28), Math.round(f.height), Math.round(b)]); } }
fitSection(sec); __R.push({ hugFixed: HUG });
}
// ---- snippet: shots-r7 ----
{
for (const nm of ['[ADM-B2] Smart Contracts / 1280 / Default', '[ADM-C4] Sanctions Screening / 1280 / Default']) { const fr = sec.children.find(n => n.name === nm); if (fr) await fr.screenshot({ scale: 0.3 }); }
}
return __R;
