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

// ===== GP-HIST LIB (agent gp-history) =====
const C = {SB:'23:6697',TOP:'23:9832',TOPM:'23:12908',TAB:'22:5413',BC:'14:1145',TABU:'20:6831',STAT:'22:7589',HC:'22:8309',CELL:'22:9559',PAG:'23:16756',CHIP:'17:2766',SCHIP:'16:3551',SRCH:'16:3820',FBTN:'23:5397',TRUST:'25:16197',LIC:'6:158',ALERT:'30:17116',RH:'22:9830',THR:'23:8618',VRF:'23:11967',PD:'23:16123',TK:'23:8534',DC:'24:13861',CR:'23:9602',CBAL:'22:7720',DON:'28:19543',HASH:'20:5893',ADDR:'9:418',NET:'9:377',CBX:'20:3205',RAD:'20:3259',FEE:'20:8583',TOAST:'30:16872',B18:'6:159',DR:'20:6794',SEL:'13:565'};
const MISS = [];
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName | 'layerName#idx' | '~substring': value})
async function O(n, map, tag = '') { const ts = n.findAll(x => x.type === 'TEXT'); for (const [k, v] of Object.entries(map)) { let hit = false; if (k[0] === '~') { const s = k.slice(1); for (const t of ts) if (t.characters.includes(s)) { await fnt(t); t.characters = t.characters.split(s).join(v); hit = true; } } else { const m = k.match(/^(.*)#(\d+)$/); const nm = m ? m[1] : k, ix = m ? +m[2] : 0; const t = ts.filter(x => x.name === nm)[ix]; if (t) { await fnt(t); t.characters = String(v); hit = true; } } if (!hit) MISS.push(tag + ':' + k); } return n; }
function nest(n, name) { return n.findOne(x => x.type === 'INSTANCE' && x.name === name); }
function setP(inst, props, tag = '') { if (!inst) { MISS.push('nest:' + tag); return; } try { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; else MISS.push(tag + ':prop ' + k); } inst.setProperties(set); } catch (e) { MISS.push(tag + ':' + String(e.message || e).slice(0, 80)); } }
async function relabel(inst, label) { const t = inst && inst.findOne(x => x.type === 'TEXT'); if (t && label != null) { await fnt(t); t.characters = label; } return inst; }
async function badge(status, label, size = 'S') { const b = await BADGE(status, size); await relabel(b, label); return b; }
function tc(n, name, color, ix = 0) { const t = n.findAll(x => x.type === 'TEXT' && x.name === name)[ix]; if (t) t.fills = [paint(color)]; }
function card(name, o = {}) { return AL('VERTICAL', { name, p: o.p ?? 24, gap: o.gap ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
function row(name, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AL('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function spacer() { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; }
function line() { return rect(10, 1, 'border/subtle', 0, 'Divider'); }
async function kv(k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'KV ' + k, gap: 12, align: 'CENTER', justify: 'SPACE_BETWEEN' }); const kt = await T(k, o.ks || 'Body/S', 'text/secondary'); const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 16, o.ic || 'icon/muted')); if (o.node) add(vr, o.node); else add(vr, await T(v, o.vs || 'Body/S Strong', o.vc || 'text/primary', o.vw ? { w: o.vw, align: 'RIGHT' } : {})); if (o.demo) add(vr, await DEMO('XS')); add(r, kt, vr); return r; }
async function ttl(t, o = {}) { const r = row('Title — ' + t.slice(0, 30), { gap: 8 }); add(r, await T(t, o.s || 'Heading/H5', 'text/primary')); if (o.demo !== false) add(r, await DEMO(o.ds || 'S')); if (o.right) { add(r, [spacer(), 'FILL']); for (const x of [].concat(o.right)) add(r, x); } return r; }
async function navActive(sb, label) { for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (!cp || !cp.State || !cp.Collapsed) continue; const lk = Object.keys(cp).find(k => k.split('#')[0] === 'Label'); const lab = lk ? cp[lk].value : ''; const isA = cp.State.value === 'Active'; try { if (lab === label && !isA) it.setProperties({ State: 'Active' }); else if (lab !== label && isA) it.setProperties({ State: 'Default' }); } catch (e) { MISS.push('nav:' + lab); } } }
async function shell(name, nav, X, Y) {
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const rail = AL('VERTICAL', { name: 'Sidebar rail', fill: 'bg/secondary' }); add(body, rail);
  const sb = await I(C.SB, { State: 'Expanded', Auth: 'Member' }); add(rail, sb); rail.layoutSizingVertical = 'FILL'; await navActive(sb, nav);
  const mc = AL('VERTICAL', { name: 'Main column' }); add(body, [mc, 'FILL']);
  add(mc, [await I(C.TOP, { State: 'Member' }), 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [24, 32, 48, 32], gap: 24 }); add(mc, [main, 'FILL']);
  return { f, main, mc };
}
async function subnav(active) { const r = AL('HORIZONTAL', { name: 'Global Pool sub-nav', gap: 4, align: 'MAX' }); strokeSides(r, 'border/subtle', { b: 1 }); for (const l of ['Overview', 'Round history', 'My entries', 'Prize distribution', 'Fairness (VRF)', 'Rules']) { const t = await I(C.TABU, { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': l === 'My entries' }); if (l === 'My entries') setP(nest(t, 'Count'), { Count: '35' }, 'cnt'); add(r, t); } return r; }
async function crumbs(cr) { const bc = await I(C.BC, { Levels: String(cr.length) }); const m = { 'Crumb 1': cr[0], 'Current page': cr[cr.length - 1] }; if (cr.length > 2) m['Crumb 2'] = cr[1]; if (cr.length > 3) m['Crumb 3'] = cr[2]; await O(bc, m, 'bc'); return bc; }
async function phead(cr, title, desc, right = [], bdg) {
  const w = AL('VERTICAL', { name: 'Page header', gap: 16 });
  const r = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX', justify: 'SPACE_BETWEEN' });
  const l = AL('VERTICAL', { name: 'Title block', gap: 8 }); const tr = row('Title', { gap: 12 }); add(tr, await T(title, 'Heading/H2', 'text/primary')); if (bdg) add(tr, bdg); add(tr, await DEMO('M'));
  add(l, tr); if (desc) add(l, await T(desc, 'Body/M', 'text/secondary', { w: 680 }));
  const rr = row('Actions', { gap: 8 }); for (const b of right) add(rr, b);
  add(r, [l, 'FILL'], rr); add(w, await crumbs(cr), [r, 'FILL']); return w;
}
async function foot(main) { const fr = AL('VERTICAL', { name: 'Page footer — trust & licence', gap: 12, p: [8, 0, 0, 0] }); add(fr, [await I(C.TRUST), 'FILL'], [await I(C.LIC, { Variant: 'Inline' }), 'FILL']); add(main, [fr, 'FILL']); }
async function stat(label, value, unit, delta, ctx) { const s = await I(C.STAT, { Trend: 'Neutral', Size: 'M' }); await O(s, { Label: label, Value: value, Unit: unit, '0.00 pp': delta, 'Delta context': ctx }, 'stat'); const k = s.findOne(x => x.name === 'Sparkline'); if (k) k.visible = false; return s; }
async function cell(c, v) {
  if (v == null) v = '—';
  if (v.node) { const f = AL('HORIZONTAL', { name: 'Cell/Custom', p: [8, 16, 8, 16], gap: 8, align: 'CENTER' }); if (c.right) f.primaryAxisAlignItems = 'MAX'; for (const k of [].concat(v.node)) add(f, k); return f; }
  if (v.st) { const x = await I(C.CELL, { Type: 'Status', Density: 'Comfortable' }); const b = nest(x, 'Status badge'); setP(b, { Status: v.st }, 'stb'); await relabel(b, v.lab); return x; }
  if (v.amt != null) { const x = await I(C.CELL, { Type: 'Amount', Density: 'Comfortable' }, { 'Show DEMO': v.demo !== false }); const a = nest(x, 'Amount value'); setP(a, { Sign: v.sign || 'Neutral' }, 'amt'); if (a) await O(a, { Value: v.amt }, 'amt'); return x; }
  if (v.act) return await I(C.CELL, { Type: 'Actions', Density: 'Comfortable' }, { 'Show expand': !!v.exp });
  const o = typeof v === 'string' ? { p: v } : v;
  const x = await I(C.CELL, { Type: o.date ? 'Date' : 'Text', Density: 'Comfortable' }, { 'Show secondary': o.s != null });
  await O(x, o.s != null ? { Primary: o.p, Secondary: o.s } : { Primary: o.p }, 'cell');
  if (o.pc) tc(x, 'Primary', o.pc); if (o.sc) tc(x, 'Secondary', o.sc);
  if (o.ss) { const t = x.findOne(n => n.type === 'TEXT' && n.name === 'Secondary'); if (t) await t.setTextStyleIdAsync(TS[o.ss].id); }
  return x;
}
async function table(cols, rows, name, foot) {
  const w = AL('VERTICAL', { name, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true });
  const h = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(h, 'border/subtle', { b: 1 }); add(w, [h, 'FILL']);
  for (const c of cols) { const x = await I(C.HC, { Align: c.right ? 'Right' : 'Left', Sort: c.sort || 'None' }, { Label: c.h || 'Actions', 'Show sort icon': !!c.sort }); add(h, x); if (c.w === 'F') x.layoutSizingHorizontal = 'FILL'; else x.resize(c.w, x.height); if (!c.h) { const t = x.findOne(n => n.type === 'TEXT'); if (t) t.visible = false; } }
  for (const r of rows) { const rr = AL('HORIZONTAL', { name: 'Row ' + (r.key || ''), align: 'CENTER' }); if (r.fill) fill(rr, r.fill); strokeSides(rr, 'border/subtle', { b: 1 }); add(w, [rr, 'FILL']);
    for (let i = 0; i < cols.length; i++) { const c = cols[i]; const x = await cell(c, r.c[i]); add(rr, x); if (c.w === 'F') x.layoutSizingHorizontal = 'FILL'; else x.resize(c.w, x.height); }
    if (r.after) add(w, [r.after, 'FILL']); }
  if (foot) add(w, [foot, 'FILL']);
  return w;
}
async function note(text, o = {}) { const r = row('Note', { gap: 8, align: 'MIN' }); add(r, await IC(o.icon || 'info', 16, o.ic || 'icon/muted')); const t = await T(text, 'Body/S', 'text/secondary', { w: o.w || 900 }); add(r, t); if (o.link) add(r, await T(o.link, 'Body/S Strong', 'text/brand')); return r; }
// inline vertical stepper: steps [{s:'done'|'current'|'todo'|'warn', t, d, extra}]
async function stepper(steps) { const w = AL('VERTICAL', { name: 'Stepper', gap: 0 }); for (let i = 0; i < steps.length; i++) { const s = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 16 }); const rail = AL('VERTICAL', { name: 'Rail', gap: 4, align: 'CENTER' }); const ic = s.s === 'done' ? ['check-circle', 'status/success'] : s.s === 'current' ? ['clock', 'status/info'] : s.s === 'warn' ? ['alert-triangle', 'status/warning'] : ['clock', 'icon/muted']; add(rail, await IC(ic[0], 24, ic[1])); const ln = rect(2, 16, i < steps.length - 1 ? (s.s === 'done' ? 'status/success' : 'border/default') : null, 0, 'Connector'); add(rail, ln); add(r, rail); rail.layoutSizingVertical = 'FILL'; ln.layoutSizingVertical = 'FILL'; const tx = AL('VERTICAL', { name: 'Text', gap: 4, p: [0, 0, 20, 0] }); const tr = row('Head', { gap: 8 }); add(tr, await T(s.t, 'Body/M Strong', s.s === 'todo' ? 'text/secondary' : 'text/primary')); if (s.tag) add(tr, s.tag); add(tx, tr, [await T(s.d, 'Body/S', 'text/secondary', { w: 400 }), 'FILL']); if (s.extra) for (const e of [].concat(s.extra)) add(tx, e); add(r, [tx, 'FILL']); add(w, [r, 'FILL']); } return w; }
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { any = true; m = Math.max(m, c.y + c.height); } return any ? m + 160 : 160; }
async function lv(label, value, o = {}) { const c = col('LV ' + label, { gap: 2 }); add(c, await T(label, 'Caption', 'text/tertiary')); const r = row('Value', { gap: 6 }); if (o.node) add(r, o.node); else add(r, [await T(value, o.vs || 'Body/S Strong', o.vc || 'text/primary', { w: o.w || 220 }), 'FILL']); if (o.demo) add(r, await DEMO('XS')); add(c, [r, 'FILL']); return c; }
async function btnLabel(root, nestName, label) { const b = nest(root, nestName); if (b) setP(b, { Label: label }, 'btn'); else MISS.push('btn:' + nestName); }
// ===== END GP-HIST LIB =====

const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const R = [];
for (const n of figma.currentPage.children.filter(n => n.type !== 'SECTION' && /^(Popover — Filter rounds|Modal — Round closed|Bottom sheet — )/.test(n.name))) n.remove(); // orphans from an earlier failed run
try { // ---- b03
const NAME = '[GP-09] Round Detail / 1440 / Cancelled → refunds (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 1680, 160);
const top = row('Breadcrumb + actions', { justify: 'SPACE_BETWEEN' });
const acts = row('Actions', { gap: 8 }); add(acts, await BTN('Secondary', 'View cancellation on explorer', { lead: 'external-link' }), await BTN('Ghost', 'Refund rules', { lead: 'help-circle' }));
add(top, await crumbs(['Global Pool', 'Round history', 'Round #1,245']), acts); add(main, [top, 'FILL']);
add(main, [await subnav('Round history'), 'FILL']);
const rh = await I(C.RH, { Status: 'Cancelled' }); await O(rh, { Times: 'Opened 24 Nov 2026, 08:00 UTC · Closed 24 Nov 2026, 20:00 UTC · cancelled automatically at close', 'Countdown value': '20:00:00', 'Absolute time': '24 Nov 2026 · UTC' }, 'rh');
add(main, [rh, 'FILL']);
// Row A: threshold + your refund
const ra = row('Row — threshold & refund', { gap: 24, align: 'MIN' });
const th = await I(C.THR, { State: 'Not met' }); await O(th, { Round: 'Round #1,245 · closed 24 Nov 2026, 20:00:00 UTC', '~Minimums not met yet': 'Minimums not met at close', '~USDT to go': 'USDT short', '~participants to go': 'participants short' }, 'thr');
const yr = card('Card — Your refund', { gap: 16 });
const yh = row('Refund head', { gap: 16 }); const tile = AL('HORIZONTAL', { name: 'Icon tile', p: 12, fill: 'accent/gold-tint', r: 10 }); add(tile, await IC('coins', 24, 'balance/owed'));
const yc = col('Amount', { gap: 4 }); const ar = row('Amount row', { gap: 8 }); add(ar, await T('300.00 USDT', 'Number/L', 'balance/owed'), await DEMO('S')); add(yc, await T('YOUR REFUND · OWED TO YOU', 'Overline', 'text/tertiary'), ar);
add(yh, tile, [yc, 'FILL'], await badge('Pending', 'Settling 27 Nov, 21:00 UTC'));
add(yr, [yh, 'FILL']);
for (const [k, v, c] of [['Entry stakes · 30 × 10.00', '300.00 USDT → Owed', 'balance/owed'], ['Platform fees · 30 × 0.05', '1.50 USDT → Available (24 Nov, 20:01 UTC)', 'text/success'], ['Network fee', '0.00 USDT · paid by the platform', 'text/primary'], ['Refund reference', 'RF-1245-0042 · batch 2 of 3', 'text/primary'], ['Settles to Available', '27 Nov 2026, 21:00 UTC · automatic', 'text/primary']]) add(yr, [await kv(k, v, { vc: c, demo: true }), 'FILL']);
add(yr, [line(), 'FILL']);
add(yr, [await T('Owed funds already count toward your total balance (12,480.50 USDT) and move to Available automatically. There is nothing to claim and nothing expires.', 'Body/S', 'text/secondary', { w: 500 }), 'FILL']);
const yb = row('Refund actions', { gap: 8 }); add(yb, await BTN('Secondary', 'View in wallet', { lead: 'wallet', size: 'S' }), await BTN('Ghost', 'How settlement works', { size: 'S' })); add(yr, yb);
add(ra, th, [yr, 'FILL']); add(main, [ra, 'FILL']);
// Row B: timeline + entries | facts + next round
const rb = row('Row — timeline & facts', { gap: 24, align: 'MIN' });
const left = col('Left column', { gap: 24 });
const tl = card('Card — Refund timeline');
add(tl, [await ttl('Refund timeline', { right: [await T('All times UTC', 'Caption', 'text/tertiary')] }), 'FILL']);
const hash = await I(C.HASH, { State: 'Default' }, { Hash: '0x6b2e…31f4', 'Show explorer link': true });
add(tl, [await stepper([
  { s: 'done', t: 'Round closed — threshold not met', d: '24 Nov 2026, 20:00:00 · 412 of 500 players · 41,200.00 of 50,000.00 USDT. No VRF request was made and no winners were drawn.' },
  { s: 'done', t: 'Cancellation recorded on-chain', d: '20:00:06 · GlobalPool v1.3.0 on Arbitrum One emitted RoundCancelled(#1,245).', extra: hash },
  { s: 'done', t: 'Platform fees reversed', d: '20:01 · 206.00 USDT returned to 412 players. Your 1.50 USDT is back in Available.' },
  { s: 'done', t: 'Stakes recorded as Owed', d: '20:01 · 41,200.00 USDT owed to 412 players. Your 300.00 USDT is in your Owed balance.' },
  { s: 'current', t: 'Settles to Available', d: 'Scheduled 27 Nov 2026, 21:00 · refund batch 2 of 3 on Arbitrum (contract call 0xc71e…5b02), usually under 5 minutes. No action needed.', tag: await badge('Pending', 'Scheduled') }]), 'FILL']);
add(left, [tl, 'FILL']);
const en = card('Card — Your entries');
add(en, [await ttl('Your 30 entries in this round', { right: [await BTN('Ghost', 'Show all 30 entries', { size: 'S', trail: 'chevron-right' })] }), 'FILL']);
const er = row('Entries row', { gap: 24, align: 'MIN' }); const tk = await I(C.TK, { State: 'Refunded' });
const ec = col('Entries summary', { gap: 12 });
for (const [k, v] of [['Entry IDs', 'E-1245-00383 … E-1245-00412'], ['Bought', '24 Nov 2026, 14:22 UTC'], ['Paid', '301.50 USDT (300.00 + 1.50 fees)'], ['Returned', '301.50 USDT in full']]) add(ec, [await lv(k, v, { vs: k === 'Entry IDs' ? 'Mono/S' : 'Body/S Strong', w: 260 }), 'FILL']);
add(er, tk, [ec, 'FILL']); add(en, [er, 'FILL']); add(left, [en, 'FILL']);
const right = col('Right column', { gap: 24 });
const fc = card('Card — Round facts', { gap: 12 });
add(fc, [await ttl('Round facts'), 'FILL']);
for (const [k, v] of [['Round window', '24 Nov, 08:00–20:00 UTC'], ['Players', '412 · min 500'], ['Qualifying entries', '4,120'], ['Pool at close', '41,200.00 USDT'], ['Platform fees', '206.00 USDT · reversed'], ['Randomness', 'Not requested'], ['Network', 'Arbitrum One']]) add(fc, [await kv(k, v), 'FILL']);
const ad = await I(C.ADDR, { Size: 'S', State: 'Default' }, { Address: '0x4b1d…77ce', 'Show DEMO': true });
add(fc, [await kv('GlobalPool v1.3.0', '', { node: ad }), 'FILL']);
const dc = await I(C.DC, { State: 'Open' });
add(right, [fc, 'FILL'], dc);
add(rb, [left, 'FILL'], right); right.resize(360, right.height); right.counterAxisSizingMode = 'FIXED'; right.primaryAxisSizingMode = 'AUTO';
add(main, [rb, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) });
} catch (e) { R.push({ part: 'b03', err: String(e && e.message || e).slice(0, 240) }); }
try { // ---- b09
const NAME = '[GP-09] Round Detail / 1440 / Default — settled (#1,244)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 1680, colY(1680));
const top = row('Breadcrumb + actions', { justify: 'SPACE_BETWEEN' });
const acts = row('Actions', { gap: 8 }); add(acts, await BTN('Primary', 'Verify this draw', { lead: 'shield-check' }), await BTN('Secondary', 'Settlement on explorer', { lead: 'external-link' }));
add(top, await crumbs(['Global Pool', 'Round history', 'Round #1,244']), acts); add(main, [top, 'FILL']);
add(main, [await subnav('Round history'), 'FILL']);
const rh = await I(C.RH, { Status: 'Settled' }); await O(rh, { '~#1,248': '#1,244', '~186,400.00': '181,030.00', '~3,412': '3,287', '~18,640': '18,103', '~27 Nov 2026': '23 Nov 2026' }, 'rh'); add(main, [rh, 'FILL']);
const ra = row('Row — distribution & winners', { gap: 24, align: 'MIN' });
const pd = await I(C.PD); await O(pd, { '~#1,248': '#1,244', '~186,400.00': '181,030.00', '~93,200.00': '90,515.00', '~37,280.00': '36,206.00', '~18,640.00': '18,103.00', '~3,728.00': '3,620.60', '~932.00': '905.15' }, 'pd');
const wl = card('Card — Winners', { gap: 12 }); add(wl, [await ttl('13 winning entries', { right: [await T('Drawn 23 Nov 2026, 20:00:39 UTC', 'Caption', 'text/tertiary')] }), 'FILL']);
const W = [['1st', '@kestrel', 'E-1244-03318', '90,515.00'], ['2nd', '@lumen.eth', 'E-1244-15027', '36,206.00'], ['3rd', '@atlas_q', 'E-1244-08861', '18,103.00'], ['Runner-up', '@nova.k (you)', 'E-1244-11817', '3,620.60'], ['Runner-up', '@juno88', 'E-1244-00412', '3,620.60'], ['Runner-up', '@sable', 'E-1244-17790', '3,620.60'], ['Runner-up', '8 more runners-up', '@pixelfox, @tidewalker, @quasar_9 …', '3,620.60 each']];
for (const [t, h, e, a] of W) { const r = row('Winner ' + h, { gap: 12, p: [8, 12, 8, 12], r: 10, fill: h.includes('you') ? 'surface/selected' : undefined }); const tag = AL('HORIZONTAL', { name: 'Tier', p: [2, 8, 2, 8], r: 9999, fill: t === 'Runner-up' ? 'surface/raised' : 'accent/gold-tint' }); add(tag, await T(t, 'Label/S', t === 'Runner-up' ? 'text/secondary' : 'text/gold')); const lc = col('Who', { gap: 2 }); add(lc, await T(h, 'Body/S Strong', 'text/primary'), await T(e, e.startsWith('E-') ? 'Mono/S' : 'Caption', 'text/tertiary')); add(r, tag, [lc, 'FILL'], await T(a + (a.includes('each') ? '' : ' USDT'), 'Number/S', 'text/gold'), await DEMO('XS')); add(wl, [r, 'FILL']); }
add(ra, pd, [wl, 'FILL']); add(main, [ra, 'FILL']);
const rb = row('Row — VRF & you', { gap: 24, align: 'MIN' });
const vrf = await I(C.VRF, { Step: 'Settled' }); await O(vrf, { '~#1,248': '#1,244', '~0x9f2c…e71a': '0x51d8…a4c3', '~20:00:41': '20:00:39', '~20:02:10': '20:02:05' }, 'vrf');
const yc = card('Card — Your result'); add(yc, [await ttl('Your result in #1,244'), 'FILL']);
const amt = row('Prize', { gap: 8 }); const pt = await T('+3,620.60 USDT', 'Number/L', 'accent/gold'); await gfill(pt, 'Gradient/Gold Jackpot'); add(amt, pt, await badge('Confirmed', 'Settled to Available'));
add(yc, amt);
for (const [k, v] of [['Your entries', '20 · E-1244-11803 … E-1244-11822'], ['Winning entry', 'E-1244-11817 · runner-up (2%)'], ['Paid for entries', '201.00 USDT (200.00 + 1.00 fee)'], ['Credited', '23 Nov 2026, 20:02 UTC']]) add(yc, [await lv(k, v, { w: 400 }), 'FILL']);
add(yc, [await T('Winners are mapped from the VRF random words by the GlobalPool contract — anyone can re-run the mapping with the verifier.', 'Body/S', 'text/secondary', { w: 440 }), 'FILL'], await BTN('Ghost', 'Open the verifier', { size: 'S', trail: 'arrow-right' }));
add(rb, vrf, [yc, 'FILL']); add(main, [rb, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30), rt: rh.findAll(x => x.type === 'TEXT').map(t => t.characters.slice(0, 40)).slice(0, 22) });
} catch (e) { R.push({ part: 'b09', err: String(e && e.message || e).slice(0, 240) }); }
const FIX = {};
try { // ---- fix GP-08 1440 frames built in the first call (spacers, truncation, date range)
  for (const id of ['179:100737', '179:101660']) {
    const f = await figma.getNodeByIdAsync(id); if (!f) { FIX[id] = 'missing'; continue; } let sp = 0, tx = 0;
    for (const s of f.findAll(n => n.type === 'FRAME' && n.name === 'Spacer')) { const w = s.width; s.resize(Math.max(1, w), 1); if (s.parent && s.parent.layoutMode !== 'NONE') s.layoutSizingHorizontal = 'FILL'; sp++; }
    const rep = [['min 500 · 4,120 entries', '4,120 entries'], ['Runner-up · +3,620.60 USDT', 'Runner-up · +3,620.60'], ['351.75 USDT · in the draw', 'In the draw · 351.75'], ['Closes 27 Nov 2026, 20:00 UTC', 'Fri 27 Nov'], ['Draws 20:00 UTC', 'Closes 20:00 UTC'], ['#1,244 · #1,246 · #1,247', '3 rounds'], ['Entered 5 of 5 rounds', 'Entered 5/5']];
    for (const t of f.findAll(n => n.type === 'TEXT')) {
      const c = t.characters; let n = c;
      for (const [a, b] of rep) if (n === a || (a.length > 14 && n.includes(a))) n = n.split(a).join(b);
      if (f.name.includes('Filters') && /20 Nov 2026/.test(n) && /27 Nov 2026/.test(n)) n = n.replace('20 Nov 2026', '23 Nov 2026').replace('27 Nov 2026', '25 Nov 2026');
      if (c === '412' && t.name === 'Primary') n = '412 / 500';
      if (n !== c) { await fnt(t); t.characters = n; tx++; }
    }
    const tbx = f.findOne(n => n.name === 'Toolbar'); const sx = tbx && tbx.children.find(n => n.type === 'INSTANCE'); if (sx) sx.resize(240, sx.height);
    FIX[id] = { sp, tx, srch: sx ? sx.name : null };
  }
  const g1 = await figma.getNodeByIdAsync('179:100737'), g2 = await figma.getNodeByIdAsync('179:101660'); const tbz = g2.findOne(n => n.name === 'Toolbar'); const popz = await figma.getNodeByIdAsync('179:102438'); if (popz) popz.y = tbz.y + tbz.height + 8;
  g2.y = g1.y + g1.height + 160; FIX.h = [Math.round(g1.height), Math.round(g2.height)];
  await g1.screenshot({ scale: 0.5 }); await g2.screenshot({ scale: 0.5 });
} catch (e) { FIX.err = String(e && e.message || e).slice(0, 200); }
fitSection(sec);
return { sec: sec.id, R, MISS: MISS.slice(0, 40), FIX };
