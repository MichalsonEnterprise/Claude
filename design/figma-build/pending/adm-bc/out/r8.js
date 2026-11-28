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
function GUARD(name) { if (sec.children.find(n => n.name === name)) throw new Error('Frame already exists: ' + name); }
function ALW(dir, o) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function CARD(name, o = {}) { return ALW(o.dir || 'VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align, w: o.w }); }
async function CHEAD(card, title, o = {}) { const r = AL('HORIZONTAL', { name: 'Card header', gap: 8, align: 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, o.ic || 'icon/muted')); add(r, await T(title, o.style || 'Heading/H5', 'text/primary')); for (const b of (o.badges || [])) add(r, b); add(r, [SPC(), 'FILL']); if (o.demo !== false) add(r, await DEMO(o.demoSize || 'S')); for (const b of (o.right || [])) add(r, b); add(card, [r, 'FILL']); if (o.sub) await WT(card, o.sub, 'Caption', 'text/tertiary', 300); return r; }
async function KV(parent, k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', p: o.line ? [8, 0, 8, 0] : 0 }); add(r, await T(k, 'Body/S', 'text/tertiary')); add(r, [SPC(), 'FILL']); if (o.node) add(r, o.node); else add(r, await T(v, o.style || 'Body/S Strong', o.color || 'text/primary')); add(parent, [r, 'FILL']); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
async function KPI(trend, label, value, unit, delta, def, ctx) { const k = await I('23:15270', { Trend: trend }); await setTs(k, { Label: label, Value: value, Unit: unit, 'Delta value': delta, Definition: def }); if (ctx) { const t = k.findOne(n => n.type === 'TEXT' && /^vs /.test(n.characters)); if (t) await setText(t, ctx); } k.name = 'Admin/KPI Tile — ' + label; return k; }
async function TABS(parent, tabs, active) { const r = AL('HORIZONTAL', { name: 'Tabs', gap: 0 }); strokeSides(r, 'border/subtle', { b: 1 }); for (const [l, cnt] of tabs) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': !!cnt }); if (cnt) { const c = findI(t, 'Count') || byMain(t, 'Badge/Count'); if (c) setP(c, 'Count', cnt); } add(r, t); } add(parent, [r, 'FILL']); return r; }
async function CHIP(l, sel, icon) { const p = { Label: l, 'Show icon': !!icon }; if (icon) p.Icon = ICONS[icon] || CHAINS[icon]; return await I('17:2766', { State: sel ? 'Selected' : 'Default' }, p); }
async function SEARCH(ph, size = 'S') { const si = await I('16:3820', { Size: size, State: 'Default' }, { 'Show shortcut': false }); const t = si.findOne(n => n.type === 'TEXT' && /placeholder|value/i.test(n.name)) || si.findOne(n => n.type === 'TEXT'); if (t) await setText(t, ph); return si; }
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
function C(...n) { return { T: 'custom', n }; }
async function RISKM(lv, user, factors, outcome) { const m = await I('23:18374', { Level: lv }); for (const t of m.findAll(n => n.type === 'TEXT')) if (t.characters.includes('@nova.k')) await setText(t, t.characters.replace('@nova.k', user)); if (factors) await setT(m, 'Factors text', factors); if (outcome) await setT(m, 'Outcome', outcome); return m; }
async function TAREA(label, ph, helper) { const ta = await I('16:3858', { State: 'Default' }, { Label: label, 'Show counter': true }); for (const t of ta.findAll(n => n.type === 'TEXT')) { if (t.characters.startsWith('Tell us')) await setText(t, ph); else if (helper && t.characters.startsWith('Never share')) await setText(t, helper); } return ta; }
async function DONE(f, extra = {}) { fitSection(sec); await f.screenshot({ scale: 0.5 }); return { frame: f.id, name: f.name, w: f.width, h: Math.round(f.height), x: f.x, y: f.y, miss: [...new Set(MISS)].slice(0, 40), ...extra }; }

function MPOS() { const mine = sec.children.filter(n => /^\[ADM-C[12]\]/.test(n.name)); if (mine.length) return { x: Math.max(...mine.map(n => n.x + n.width)) + 120, y: 160 }; return { x: nextX(sec), y: 160 }; }
async function MSHELL(name, back) {
  GUARD(name); const p = MPOS(); const f = await screen(name, 390, {}); sec.appendChild(f); f.x = p.x; f.y = p.y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']); // short message on 390 (decision #29)
  const bar = AL('HORIZONTAL', { name: 'Admin Topbar — Mobile', gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 });
  if (back) { add(bar, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] })); add(bar, await T(back, 'Label/L', 'text/primary')); }
  else { const lm = await I('4:792'); lm.rescale(28 / lm.width); add(bar, lm); add(bar, await T('Admin', 'Label/L', 'text/primary')); const env = AL('HORIZONTAL', { name: 'PROD', p: [2, 8, 2, 8], stroke: 'border/danger', r: 6 }); add(env, await T('PROD', 'Label/S', 'text/danger')); add(bar, env); }
  add(bar, [SPC(), 'FILL']);
  const ap = AL('HORIZONTAL', { name: 'Approvals', gap: 2, align: 'CENTER' }); add(ap, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['user-check'] })); const bc = await I('6:216', { Size: 'S' }); setP(bc, 'Count', '4'); add(ap, bc); add(bar, ap);
  add(bar, await I('9:238', { Size: 'S' }, { Initials: 'KO' }));
  add(f, [bar, 'FILL']);
  const c = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [c, 'FILL']);
  return { f, c };
}
async function MTABS(f, active) { const tb = AL('VERTICAL', { name: 'Admin Tab Bar — Mobile', fill: 'bg/secondary' }); strokeSides(tb, 'border/subtle', { t: 1 }); const row = AL('HORIZONTAL', { name: 'Tabs', p: [4, 4, 0, 4] }); for (const [ic, lab, cnt] of [['dashboard', 'Overview'], ['user-check', 'Approvals', '4'], ['id-card', 'KYC', '214'], ['shield-alert', 'Alerts', '23'], ['menu', 'More']]) { const on = lab === active; const t = AL('VERTICAL', { name: 'Tab ' + lab, gap: 4, p: [8, 0, 6, 0], align: 'CENTER' }); const ir = AL('HORIZONTAL', { name: 'Icon', gap: 2, align: 'CENTER' }); add(ir, await IC(ic, 24, on ? 'icon/brand' : 'icon/muted')); if (cnt) { const b = await I('6:216', { Size: 'S' }); setP(b, 'Count', cnt); add(ir, b); } add(t, ir); add(t, await T(lab, 'Label/S', on ? 'text/brand' : 'text/tertiary')); add(row, [t, 'FILL']); } add(tb, [row, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(tb, [hi, 'FILL']); add(f, [tb, 'FILL']); return tb; }
async function STICKY(f, kids, cap) { const s = AL('VERTICAL', { name: 'Sticky action bar', gap: 8, p: [12, 16, 0, 16], fill: 'surface/overlay' }); strokeSides(s, 'border/subtle', { t: 1 }); const r = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); for (const k of kids) add(r, k); add(s, [r, 'FILL']); if (cap) await WT(s, cap, 'Caption', 'text/tertiary', 358); const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(s, [hi, 'FILL']); add(f, [s, 'FILL']); return s; }

// ===== END LIB =====
const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM — Mobile', 217000, 0);
const __R = [];
// ---- body: m-c1q ----
if (!sec.children.find(n => n.name === '[ADM-C1] KYC Queue / 390 / Default')) {


const NAME = '[ADM-C1] KYC Queue / 390 / Default';
const { f, c } = await MSHELL(NAME);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('KYC queue', 'Heading/H3', 'text/primary'), await ST('Live', 'Live')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Oldest SLA first · 48 h SLA · a person makes every decision · times UTC', 'Caption', 'text/tertiary', 358);
const strip = AL('HORIZONTAL', { name: 'Stats (scrolls)', gap: 8, clip: true });
for (const [v, l, s] of [['214', 'open cases', 'oldest 47 h 34 min'], ['4', 'SLA under 12 h', '2 under 2 h'], ['95', 'decided today', '86 approved · 9 rejected']]) { const k = ALW('VERTICAL', { name: 'Stat ' + l, gap: 2, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 156 }); add(k, await T(v, 'Number/M', 'text/primary'), await T(l, 'Body/S Strong', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(strip, k); }
add(c, [strip, 'FILL']);
add(c, [await SEARCH('Search KYC ID, user, document', 'M'), 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['All open · 214', 1], ['Mine · 12', 0], ['SLA < 12 h · 4', 0], ['L3 · 31', 0], ['Restricted · 12', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const R = [['KYC-30365', 'LV', '@lyra_v', 'Poland', 'Level 2 · ID + liveness', [1, 1, 1], 'Low', 8, ['0 h 26 min', 'danger'], 'Unassigned', ['Pending', 'Pending']], ['KYC-30352', 'VI', '@velvet.io', 'Japan', 'Level 3 · enhanced (EDD)', [1, 1, 2], 'Medium', 38, ['1 h 12 min', 'danger'], 'M. Achebe', ['Under review', 'Sanctions check']], ['KYC-30377', 'J8', '@juno88', 'Brazil', 'Level 2 · ID + liveness', [1, 2, 1], 'Medium', 44, ['3 h 05 min', 'warning'], 'Unassigned', ['Pending', 'Pending']], ['KYC-30418', 'AQ', '@atlas_q', 'Germany', 'Level 2 · ID + liveness', [1, 1, 2], 'Low', 18, ['26 h 30 min'], 'K. Osei (you)', ['Under review', 'In review']]];
for (const r of R) {
  const k = CARD('Case ' + r[0], { gap: 10, p: 14, stroke: r[0] === 'KYC-30418' ? 'border/brand' : 'border/subtle' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(r[0], 'Mono/S', 'text/primary'), await ST(r[10][0], r[10][1])); add(l1, [SPC(), 'FILL']); add(l1, await IC('chevron-right', 20, 'icon/muted')); add(k, [l1, 'FILL']);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'S' }, { Initials: r[1] })); const nm = AL('VERTICAL', { name: 'Who', gap: 0 }); add(nm, await T(r[2], 'Body/S Strong', 'text/primary'), await T(r[3] + ' · ' + r[4], 'Caption', 'text/tertiary')); add(l2, [nm, 'FILL']); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'Checks', gap: 10, align: 'CENTER' }); for (const [lab, s] of [['Doc', r[5][0]], ['Face', r[5][1]], ['Lists', r[5][2]]]) { const ic = s === 1 ? ['check-circle', 'status/success'] : s === 0 ? ['x-circle', 'status/danger'] : ['alert-triangle', 'status/warning']; const g = AL('HORIZONTAL', { name: lab, gap: 3, align: 'CENTER' }); add(g, await IC(ic[0], 14, ic[1]), await T(lab, 'Caption', 'text/secondary')); add(l3, g); } add(l3, [SPC(), 'FILL']); const rk = await I('23:5378', { Level: r[6], Density: 'Compact' }); await setT(rk, 'Score', '· ' + r[7]); add(l3, rk); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER', p: [8, 10, 8, 10], fill: r[8][1] === 'danger' ? 'status/danger-tint' : r[8][1] === 'warning' ? 'status/warning-tint' : 'surface/raised', r: 10 }); add(l4, await IC('clock', 14, r[8][1] === 'danger' ? 'status/danger' : r[8][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(r[8][0] + ' left', 'Body/S Strong', r[8][1] === 'danger' ? 'text/danger' : r[8][1] === 'warning' ? 'text/warning' : 'text/primary')); add(l4, [SPC(), 'FILL']); add(l4, await T(r[9], 'Caption', 'text/secondary')); add(k, [l4, 'FILL']);
  add(c, [k, 'FILL']);
}
add(c, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
await WT(c, 'Showing 4 of 214 · sorted by SLA left · L3, PEP and sanctions hits need a second reviewer', 'Caption', 'text/tertiary', 358);
await MTABS(f, 'KYC');
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C1] KYC Queue / 390 / Default' });
// ---- body: m-c1r ----
if (!sec.children.find(n => n.name === '[ADM-C1] KYC Review — KYC-30418 / 390 / In review')) {


const NAME = '[ADM-C1] KYC Review — KYC-30418 / 390 / In review';
const { f, c } = await MSHELL(NAME, 'KYC queue');
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('KYC-30418', 'Heading/H3', 'text/primary'), await ST('Under review', 'In review')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Level 2 upgrade · submitted 26 Nov 2026, 21:14 UTC · SLA 26 h 30 min left · assigned to you', 'Caption', 'text/tertiary', 358);
const ap = CARD('Applicant', { gap: 10, p: 14 });
const ah = AL('HORIZONTAL', { name: 'Identity', gap: 10, align: 'CENTER' }); add(ah, await I('9:238', { Size: 'M' }, { Initials: 'AQ' })); const an = AL('VERTICAL', { name: 'Name', gap: 2 }); add(an, await T('@atlas_q', 'Body/M Strong', 'text/primary'), await T('GP-51907 · Germany · since 3 Sep 2026', 'Caption', 'text/tertiary')); add(ah, [an, 'FILL']); add(ah, await DEMO('S')); add(ap, [ah, 'FILL']);
await KV(ap, 'Current level', null, { node: await I('23:5565', { Status: 'Approved', Level: 'L1' }) }); await KV(ap, 'Requested', 'L2 · ID + liveness'); await KV(ap, 'Lifetime deposits', '3,450.00 USDT');
add(c, [ap, 'FILL']);
const docs = AL('VERTICAL', { name: 'Documents', gap: 8 }); add(docs, await T('Documents · swipe', 'Label/L', 'text/primary'));
const dr = AL('HORIZONTAL', { name: 'Document tiles (scroll)', gap: 8, clip: true }); for (const [ic, t1, t2, col] of [['id-card', 'Passport', 'SAMPLE · DEMO', 'icon/muted'], ['face-scan', 'Liveness 0.97', 'Passed', 'icon/brand'], ['monitor', 'Device', 'IP matches residence', 'icon/muted']]) { const t = ALW('VERTICAL', { name: 'Doc — ' + t1, gap: 6, w: 150 }); const pv = AL('VERTICAL', { name: 'Preview', w: 150, h: 104, fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', justify: 'CENTER' }); add(pv, await IC(ic, 36, col)); add(t, pv); add(t, await T(t1, 'Body/S Strong', 'text/primary'), await T(t2, 'Caption', 'text/tertiary')); add(dr, t); }
add(docs, [dr, 'FILL']); add(c, [docs, 'FILL']);
const ck = CARD('Checks', { gap: 8, p: 14 }); await CHEAD(ck, 'Automated checks', { icon: 'shield-check', demo: false });
for (const [ok, t1, lab] of [[1, 'Document · face 96 % · liveness', 'Pass'], [1, 'Sanctions & PEP', 'Clear'], [0, 'Adverse media · weak match 0.41', 'Review'], [1, 'Duplicates & self-exclusion', 'Clear']]) { const r = AL('HORIZONTAL', { name: 'Check — ' + t1, gap: 10, p: [10, 12, 10, 12], fill: ok ? 'surface/raised' : 'status/warning-tint', r: 10, align: 'CENTER' }); add(r, await IC(ok ? 'check-circle' : 'alert-triangle', 18, ok ? 'status/success' : 'status/warning')); await WT(r, t1, 'Body/S', 'text/primary', 200); add(r, await T(lab, 'Label/M', ok ? 'text/success' : 'text/warning')); add(ck, [r, 'FILL']); }
add(c, [ck, 'FILL']);
const rm = await RISKM('Low', '@atlas_q', 'Account age 85 days · 1 verified wallet · no sanctions or PEP hits'); add(c, [rm, 'FILL']);
const de = CARD('Decision', { gap: 10, p: 14, stroke: 'border/brand' }); await CHEAD(de, 'Decision', { icon: 'scale', ic: 'icon/brand', demo: false });
for (const [l, d] of [['Approve Level 2', 'Limit 25,000.00 USDT / day'], ['Request more information', 'SLA pauses'], ['Reject', 'Reason category + note required']]) add(de, [await I('20:3259', { Selected: 'No', State: 'Default' }, { Label: l, Description: d, 'Show description': true }), 'FILL']);
add(de, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'The adverse-media hit is not this person', 'Show description': false }), 'FILL']);
add(de, [await TAREA('Reviewer note', 'Required for Reject or Request info', 'Visible to Compliance only'), 'FILL']);
add(c, [de, 'FILL']);
await STICKY(f, [[await BTN('Secondary', 'Release', { size: 'L', lead: 'undo' }), 'HUG'], [await BTN('Primary', 'Submit decision', { size: 'L', state: 'Disabled', lead: 'check' }), 'FILL']], 'Pick an outcome and confirm the adverse-media check · logged with your 2FA session');
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C1] KYC Review — KYC-30418 / 390 / In review' });
// ---- body: m-c2 ----
if (!sec.children.find(n => n.name === '[ADM-C2] AML Alerts / 390 / Default')) {


const NAME = '[ADM-C2] AML Alerts / 390 / Default';
const { f, c } = await MSHELL(NAME);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('AML alerts', 'Heading/H3', 'text/primary'), await ST('Live', 'Live')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Rules raise alerts; a person decides. Closing needs a reason · holds need 2FA + a second approver · never tell the user (no tipping-off).', 'Caption', 'text/tertiary', 358);
const strip = AL('HORIZONTAL', { name: 'Stats (scrolls)', gap: 8, clip: true });
for (const [v, l, s, tone] of [['23', 'open alerts', 'high 4 · medium 11 · low 8', null], ['1', 'past SLA', 'AML-5521 · 1 h 20 min over', 'danger'], ['6', 'assigned to you', 'oldest 5 h 30 min', null]]) { const k = ALW('VERTICAL', { name: 'Stat ' + l, gap: 2, p: 12, fill: tone ? 'status/danger-tint' : 'surface/default', stroke: 'border/subtle', r: 14, w: 156 }); add(k, await T(v, 'Number/M', tone ? 'text/danger' : 'text/primary'), await T(l, 'Body/S Strong', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(strip, k); }
add(c, [strip, 'FILL']);
add(c, [await SEARCH('Search alert, user, WD- ID', 'M'), 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Open · 23', 1], ['Mine · 6', 0], ['High · 4', 0], ['Escalated · 2', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const A = [['AML-5509', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'WD-20952', 'High', 86, '12,400.00', ['Under review', 'Escalated'], ['Case STR-0093', null]], ['AML-5530', 'SA', '@sable', 'Mixer exposure · 2 hops', 'WD-20960', 'High', 72, '4,800.00', ['Under review', 'In review'], ['2 h 10 min left', 'warning']], ['AML-5528', 'TW', '@tidewalker', 'Rapid in-out · 96 % out in 3 h', 'WD-20957', 'High', 69, '9,600.00', ['Pending', 'New'], ['5 h 30 min left', null]], ['AML-5521', 'DS', '@drift.sol', 'Shared device · 3 accounts', '3 accounts', 'Medium', 52, '2,140.00', ['Pending', 'New'], ['Past SLA', 'danger']]];
for (const a of A) {
  const k = CARD('Alert ' + a[0], { gap: 10, p: 14, stroke: a[0] === 'AML-5530' ? 'border/brand' : 'border/subtle' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(a[0], 'Mono/S', 'text/primary'), await ST(a[8][0], a[8][1])); add(l1, [SPC(), 'FILL']); add(l1, await IC('chevron-right', 20, 'icon/muted')); add(k, [l1, 'FILL']);
  await WT(k, a[3], 'Body/M Strong', 'text/primary', 320);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'XS' }, { Initials: a[1] }), await T(a[2] + ' · ' + a[4], 'Body/S', 'text/secondary')); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'L3', gap: 8, align: 'CENTER' }); const rk = await I('23:5378', { Level: a[5], Density: 'Compact' }); await setT(rk, 'Score', '· ' + a[6]); add(l3, rk); add(l3, [SPC(), 'FILL']); add(l3, await T(a[7], 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER' }); add(l4, await IC('clock', 14, a[9][1] === 'danger' ? 'status/danger' : a[9][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(a[9][0], 'Caption', a[9][1] === 'danger' ? 'text/danger' : a[9][1] === 'warning' ? 'text/warning' : 'text/tertiary')); add(k, [l4, 'FILL']);
  add(c, [k, 'FILL']);
}
add(c, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
await MTABS(f, 'Alerts');
__R.push(await DONE(f));
} else __R.push({ skipped: '[ADM-C2] AML Alerts / 390 / Default' });
// ---- snippet: ovfix ----
{
// generic row-overflow fix (all frames in the section). Rows: longest hug text wraps (HEIGHT + FILL) and the row Spacer goes.
// Skips wrap rows, Spacers and instance internals; table cells (Col/*) are only reported. Laptop rows without text: Tabs -> hide trailing tabs, Controls -> wrap.
function inInst(n) { let p = n.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
const OV = [];
const NEED = r => { const kids = r.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); return kids.reduce((s, k) => s + (k.name === 'Spacer' ? 0 : k.width), 0) + r.itemSpacing * Math.max(0, kids.length - 1) + r.paddingLeft + r.paddingRight; };
for (const fr of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) {
  for (const r of fr.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.visible)) {
    if (r.removed || r.name === 'Spacer' || r.layoutWrap === 'WRAP' || inInst(r)) continue;
    const kids = r.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (kids.length < 2 || NEED(r) <= r.width + 1) continue;
    if (r.name.startsWith('Col/')) { OV.push('CELL ' + fr.name.slice(0, 18) + ' › ' + r.name); continue; }
    const txt = kids.filter(k => k.type === 'TEXT' && k.textAutoResize === 'WIDTH_AND_HEIGHT').sort((a, b) => b.width - a.width)[0];
    if (!txt) {
      if (/^Tabs/.test(r.name)) { const vis = kids.slice(); while (NEED(r) > r.width + 1 && vis.length > 2) vis.pop().visible = false; OV.push('TABS hidden→fit ' + fr.name.slice(0, 18)); }
      else if (r.name === 'Controls') { r.layoutWrap = 'WRAP'; bnum(r, 'counterAxisSpacing', 8); OV.push('CONTROLS wrap ' + fr.name.slice(0, 18)); }
      else OV.push('NO TEXT ' + fr.name.slice(0, 18) + ' › ' + r.name);
      continue;
    }
    const sp = kids.find(k => k.name === 'Spacer'); const right = sp && kids.indexOf(txt) > kids.indexOf(sp); if (sp) sp.remove();
    txt.textAutoResize = 'HEIGHT'; txt.layoutSizingHorizontal = 'FILL'; if (right) txt.textAlignHorizontal = 'RIGHT';
    OV.push(fr.name.slice(0, 18) + ' › ' + r.name + ' › ' + txt.characters.slice(0, 24));
  }
}
// KPI tiles: any text running past the tile's right edge wraps inside the tile
let KF = 0;
for (const fr of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) for (const k of fr.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile — '))) {
  const kb = k.absoluteBoundingBox; if (!kb) continue;
  for (const t of k.findAll(n => n.type === 'TEXT' && n.visible)) { const tb = t.absoluteBoundingBox; if (!tb) continue; const maxR = kb.x + kb.width - 16; if (tb.x + tb.width <= maxR + 0.5) continue; try { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(40, Math.floor(maxR - tb.x)), t.height); KF++; } catch (e) { MISS.push('kpi ' + String(e.message).slice(0, 60)); } }
}
fitSection(sec);
__R.push({ overflow: OV, kpiWrapped: KF, miss: [...new Set(MISS)] });
}
return __R;
