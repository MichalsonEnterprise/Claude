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
// ===== PUB-16/17/19 LIB (legal documents) =====
figma.skipInvisibleInstanceChildren = false; // hidden layers in the main (sections 11, notes, TOC list) must be reachable in instances
const MISS = [];
const TPL_NAME = 'Template/Legal Document';
const DOC_LINKS = ['Terms & Conditions', 'Privacy Policy', 'AML/KYC Policy', 'Responsible Gaming', 'Restricted Countries', 'Cookie Policy'];
const NSEC = 11;
function AX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function row(name, o = {}) { return AX('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AX('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function card(name, o = {}) { return AX('VERTICAL', Object.assign({ name, p: 24, gap: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }, o)); }
async function tx(name, chars, style, color) { const t = await T(chars, style, color); t.name = name; return t; }
// wrapping text that fills its (auto-layout) parent
async function wt(parent, name, chars, style, color) { const t = await T(chars, style, color, { w: 100 }); t.name = name; parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function tile(icName, o = {}) { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icName, fill: o.tint || 'brand/tint', r: 10, p: o.p ?? 8 }); add(t, await IC(icName, o.size || 18, o.ic || 'icon/brand')); return t; }
function words(D) { return [D.lead, ...D.sum, ...D.s.flatMap(s => [s.h, ...s.p, s.note || ''])].join(' ').split(/\s+/).length; }
function readTime(D) { return Math.max(1, Math.ceil(words(D) / 230)) + ' min read'; }
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName: text}) -> overrides EVERY TEXT layer with that exact name
async function O(n, map, tag = '') { const idx = {}; for (const t of n.findAll(x => x.type === 'TEXT')) (idx[t.name] = idx[t.name] || []).push(t); for (const [k, v] of Object.entries(map)) { if (v == null) continue; const ts = idx[k] || []; if (!ts.length) { MISS.push(tag + ':' + k); continue; } for (const t of ts) { if (t.characters === String(v)) continue; await fnt(t); t.characters = String(v); } } return n; }
function vis(n, name, on, tag = '') { const xs = n.findAll(x => x.name === name); if (!xs.length) MISS.push(tag + ':vis ' + name); for (const x of xs) x.visible = !!on; }
// ===== END LIB =====
// vshot(src, {cols, chunkH, scale, start, hideFooter}) — place `cols` vertical windows of src side by side in a temporary clipped viewport, screenshot, remove. src = COMPONENT (instanced) or FRAME (cloned).
async function vshot(src, o = {}) { const cols = o.cols || 1, H = o.chunkH || 1600, st = o.start || 0; const vp = figma.createFrame(); vp.name = 'TMP verify viewport'; fill(vp, 'bg/secondary'); vp.clipsContent = true; vp.x = -70000; vp.y = -70000; const W = src.width; let x = 0;
  try { for (let k = 0; k < cols; k++) { const hold = figma.createFrame(); hold.name = 'hold'; hold.clipsContent = true; fill(hold, 'bg/base'); vp.appendChild(hold); hold.resize(W, H); hold.x = x; hold.y = 0; x += W + 24;
      const cl = src.type === 'COMPONENT' ? src.createInstance() : src.clone(); hold.appendChild(cl); cl.x = 0; cl.y = -(st + k * H);
      if (o.hideFooter) { const ft = cl.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Shell/Footer')); if (ft) ft.visible = false; } }
    vp.resize(x - 24, H); await vp.screenshot({ scale: o.scale || 0.5 }); } finally { vp.remove(); }
  return { src: src.name.slice(0, 60), H: Math.round(src.height), from: st, to: st + cols * H }; }
function overflowList(root) { const rb = root.absoluteBoundingBox; const bad = []; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { let v = true, p = t; while (p && p !== root) { if (p.visible === false) { v = false; break; } p = p.parent; } if (!v) continue; const b = t.absoluteBoundingBox; if (!b) continue; if (b.width < 2 || b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) bad.push(t.name.slice(0, 30) + '@' + Math.round(b.x - rb.x) + '+' + Math.round(b.width)); } return bad; }
// ===== PUB-16/17/19 FRAMES =====
const IDX = { terms: 0, privacy: 1, aml: 2 };
async function getTpl() { const n = await figma.getNodeByIdAsync('335:237300'); if (n && n.type === 'COMPONENT_SET') return n; throw new Error('Template/Legal Document set 335:237300 not found — run t1 first'); }
function variant(set, bp) { return set.children.find(c => c.name === 'Breakpoint=' + bp) || set.defaultVariant; }
function navOff(sb) { let n = 0; for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (cp && cp.State && cp.Collapsed && cp.State.value === 'Active') { try { it.setProperties({ State: 'Default' }); n++; } catch (e) { MISS.push('navoff'); } } } return n; }
async function apply(inst, D, M) {
  const m = { 'Doc overline': D.over, 'Doc title': D.title, 'Doc lead': D.lead, 'Version': D.version, 'Effective': D.effective, 'Updated': D.updated, 'Read time': readTime(D), 'PDF meta': D.pdf, 'TOC count': D.s.length + ' sections · ' + readTime(D), 'Summary title': D.sumT, 'Summary note': D.sumN };
  if (!M) { m['Current page'] = D.title; D.det.forEach((v, k) => { m['Det v' + (k + 1)] = v; }); }
  D.sum.forEach((v, k) => { m['Summary ' + (k + 1)] = v; });
  for (let i = 1; i <= NSEC; i++) { const s = D.s[i - 1]; if (!s) continue; m['TOC ' + i] = s.h; m['S' + i + ' heading'] = s.h; m['S' + i + ' p1'] = s.p[0]; if (s.p[1]) m['S' + i + ' p2'] = s.p[1]; if (s.note) m['S' + i + ' note'] = s.note; }
  D.hist.forEach((h, k) => { m['Hist ' + (k + 1) + ' ver'] = 'v' + h[0]; m['Hist ' + (k + 1) + ' date'] = h[1]; m['Hist ' + (k + 1) + ' change'] = h[2]; });
  await O(inst, m, D.key + (M ? 'M' : 'D'));
  for (let i = 1; i <= NSEC; i++) { const s = D.s[i - 1]; vis(inst, 'Section ' + i, !!s, D.key); vis(inst, 'TOC row ' + i, !!s, D.key); if (s) { vis(inst, 'S' + i + ' p2', !!s.p[1], D.key); vis(inst, 'S' + i + ' note box', !!s.note, D.key); vis(inst, 'S' + i + ' note DEMO', !!s.demo, D.key); } }
  for (let i = 1; i <= 6; i++) { const on = i === D.cur; for (const r of inst.findAll(n => n.name === 'Doc row ' + i)) r.fills = on ? [paint('surface/selected')] : []; for (const t of inst.findAll(n => n.name === 'Doc link ' + i && n.type === 'TEXT')) t.fills = [paint(on ? 'text/brand' : 'text/secondary')]; for (const ic of inst.findAll(n => n.name === 'Doc icon ' + i)) tint(ic, on ? 'icon/brand' : 'icon/muted'); }
}
async function deskFrame(set, D, X, Y) {
  const name = `[${D.id}] ${D.title} / 1440 / Default — long-form (logged out)`;
  for (const o of sec.children.filter(c => c.name === name)) o.remove();
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const rail = AL('VERTICAL', { name: 'Sidebar rail', fill: 'bg/secondary' }); add(body, rail);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); sb.name = 'Shell/Sidebar'; add(rail, sb); rail.layoutSizingVertical = 'FILL'; const off = navOff(sb);
  const mc = AL('VERTICAL', { name: 'Main column' }); add(body, [mc, 'FILL']);
  const tb = await I('23:9832', { State: 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(mc, [tb, 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [24, 32, 64, 32], gap: 24 }); add(mc, [main, 'FILL']);
  const t = variant(set, 'Desktop').createInstance(); t.name = 'Template/Legal Document — ' + D.title; add(main, [t, 'FILL']); await apply(t, D, false);
  const ft = await I('23:17478', { Breakpoint: 'Desktop' }); ft.name = 'Shell/Footer Mega'; add(mc, [ft, 'FILL']); try { bnum(ft, 'paddingLeft', 24); bnum(ft, 'paddingRight', 24); } catch (e) { MISS.push('footpad'); }
  return { f, t, off };
}
async function mobFrame(set, D, X, Y, o = {}) {
  const name = `[${D.id}] ${D.title} / 390 / ` + (o.expanded ? 'Contents expanded (viewport 390×844, scrolled to contents)' : 'Default — long-form, contents collapsed');
  for (const x of sec.children.filter(c => c.name === name)) x.remove();
  const f = await screen(name, 390, o.expanded ? { h: 844 } : {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const main = AL('VERTICAL', { name: o.expanded ? 'Content (scrolls)' : 'Content', p: [16, 16, 32, 16], gap: 24, clip: !!o.expanded }); add(f, [main, 'FILL']); if (o.expanded) main.layoutSizingVertical = 'FILL';
  const t = variant(set, 'Mobile').createInstance(); t.name = 'Template/Legal Document — ' + D.title; add(main, [t, 'FILL']); await apply(t, D, true);
  if (o.expanded) { vis(t, 'TOC list', true); vis(t, 'Chevron down', false); vis(t, 'Chevron up', true); const acc = t.findOne(n => n.name === 'Contents — collapsible'); if (acc) { const ay = acc.y; t.layoutPositioning = 'ABSOLUTE'; t.resize(358, t.height); t.x = 16; t.y = 12 - ay; } else MISS.push('contents accordion'); } // viewport scrolled so the open contents list is fully in view
  else {
    const ft = await I('23:17478', { Breakpoint: 'Mobile' }); ft.name = 'Shell/Footer Mega'; add(f, [ft, 'FILL']);
    const bar = AL('HORIZONTAL', { name: 'Reading bar (sticky above tab bar after the header scrolls away)', gap: 12, p: [8, 16, 8, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { t: 1 });
    const info = col('Reading position', { gap: 2 }); add(bar, [info, 'FILL']); await wt(info, 'Reading caption', 'Section 1 of ' + D.s.length, 'Caption', 'text/tertiary'); await wt(info, 'Reading section', D.s[0].h, 'Label/M', 'text/primary');
    add(bar, await BTN('Secondary', 'Contents', { size: 'L', lead: 'list' })); add(f, [bar, 'FILL']);
  }
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']);
  return { f, t };
}
// ===== END FRAMES =====
const D_privacy = {
 key: 'privacy', id: 'PUB-17', title: 'Privacy Policy', over: 'LEGAL · PRIVACY', cur: 2, slug: 'privacy',
 lead: 'This policy explains what personal data GLOBAL POOL collects, why we need it, who we share it with and the choices you have. [Operator Ltd — DEMO placeholder] is the data controller. We collect only what we need to run a licensed, secure service and to meet our legal duties.',
 version: 'Version 3.1', effective: 'Effective 1 Dec 2026', updated: 'Updated 27 Nov 2026',
 det: ['3.1', '1 Dec 2026, 00:00 UTC', '27 Nov 2026, 10:00 UTC', '3.0 · 1 Jun 2026'], pdf: 'PDF · 286 KB · English is the binding version',
 sumT: 'Your privacy at a glance', sumN: 'A plain-language overview of the policy. Your rights are set out in full in section 8.',
 sum: [
  'We collect what a licensed operator must: identity, age, location, wallet addresses and transaction history.',
  'We never sell your personal data, and we never ask for your wallet seed phrase or private keys.',
  'Public blockchains are permanent — on-chain transactions cannot be deleted by anyone, including us.',
  'Optional cookies and marketing stay off until you opt in, and you can change your choices at any time.',
  'You can access, correct, export or delete your data, subject to the records the law requires us to keep.'],
 s: [
  { h: 'Who we are', a: 'who-we-are', p: [
   'GLOBAL POOL is operated by [Operator Ltd — DEMO placeholder], registered at [Registered address — DEMO placeholder], which acts as the controller of your personal data. Our Data Protection Officer answers any question about this policy or how we handle your data at privacy@example.com.',
   'This policy covers the website, the player app, our support channels and every message we send you. It does not cover third-party sites you open through links, such as blockchain explorers or help organisations.'] },
  { h: 'Data we collect', a: 'data-we-collect', p: [
   'Account data: your email, handle, date of birth, country and the security settings you choose. Verification data: identity documents, a liveness check and, where our AML/KYC Policy requires it, proof of address and source of funds. Financial data: the wallet addresses you connect or whitelist, and your deposits, withdrawals, entries, bets, prizes and fees.',
   'Technical data: device type, browser, IP address and approximate location, which we use to secure your account and confirm you are in a permitted jurisdiction. Usage data: the pages and games you open and the responsible-gaming tools you use. We never collect wallet seed phrases or private keys — never share them with anyone who asks.'] },
  { h: 'How we use your data', a: 'how-we-use-data', p: [
   'We use your data to provide the service, verify your age, identity and location, process deposits, withdrawals and prizes, prevent fraud and money laundering, and meet the obligations of our gaming licence. Each use has a legal basis: performing our contract with you, complying with the law, our legitimate interest in keeping the platform secure, or your consent.',
   'Some checks are automated — for example sanctions screening and risk scoring of withdrawal addresses. When an automated check would block a transaction, a member of our compliance team reviews the decision, and you can ask us to explain it.'] },
  { h: 'Blockchain data', a: 'blockchain-data', p: [
   'Deposits, withdrawals and Global Pool settlements are recorded on public blockchains. Anyone can see a public transaction, its amount and the addresses involved, and no one — including us — can change or delete it. We shorten addresses inside the app, but on-chain records are permanent.',
   'We link wallet addresses to your account only to credit deposits, send withdrawals, screen addresses as AML rules require, and show your history. We never publish your identity next to your addresses: winners are shown publicly by handle only, and you can choose to appear as “Hidden player”.'] },
  { h: 'Sharing your data', a: 'sharing', p: [
   'We share personal data only where it is necessary: with identity-verification and sanctions-screening providers, with blockchain analytics providers that check address risk, with our hosting and support-tool providers, and with regulators, law enforcement or courts where the law requires it. Every provider works under a written contract and may use your data only on our instructions.',
   'We never sell your personal data and we do not share it with advertisers. An affiliate who referred you receives only aggregated, anonymised statistics — never your name, email or balance.'] },
  { h: 'International transfers', a: 'transfers', p: [
   'Some of our providers process data outside your country. When data leaves [Licensing jurisdiction — DEMO placeholder] or the European Economic Area, we rely on adequacy decisions or standard contractual clauses and add safeguards such as encryption in transit and at rest.',
   'You can ask privacy@example.com for a copy of the safeguards that apply to a specific transfer.'] },
  { h: 'How long we keep data', a: 'retention', p: [
   'We keep account, verification and transaction records for 5 years after your account closes, because anti-money-laundering and gaming rules require it. Responsible-gaming records, including self-exclusions, are kept for as long as the law requires so that an exclusion can always be honoured.',
   'Marketing preferences and analytics data are deleted or anonymised within 24 months of your last activity. When a retention period ends, we delete the data or anonymise it so that it can no longer identify you.'] },
  { h: 'Your rights', a: 'your-rights', p: [
   'You can ask to access the data we hold about you, correct it, receive it in a portable format, restrict or object to certain uses, and have it deleted where we are not legally required to keep it. You can withdraw any consent you have given — for example to marketing emails — at any time.',
   'Make a request from Account › Privacy or by emailing privacy@example.com. We reply within one month and may first ask you to confirm your identity. If you are unhappy with our answer, you can complain to your data protection authority.'],
   note: 'Exporting your data creates a file with your profile, verification status, wallet addresses and full transaction history. It is ready to download from Account › Privacy within 48 hours.' },
  { h: 'Cookies and similar technologies', a: 'cookies', p: [
   'Essential cookies keep you signed in, protect your session and remember your consent choices, so they are always on. Preference, analytics and marketing cookies stay off until you switch them on in Cookie settings — and switching them off again is just as easy.',
   'You can change your choices at any time from the Cookie settings link in the footer. Our cookie banner never pre-selects optional categories.'] },
  { h: 'Security and changes to this policy', a: 'security-changes', p: [
   'We protect your data with encryption, strict access controls, two-factor authentication for staff and an audit log of every access to verification documents. If a breach is likely to put your rights at risk, we tell you and the regulator without undue delay.',
   'We notify you of material changes to this policy by email and in your account at least 30 days in advance. The version and effective date at the top of this page always show the version that applies.'] }
 ],
 hist: [
  ['3.1', '1 Dec 2026', 'Added blockchain analytics providers and clarified how long self-exclusion records are kept.'],
  ['3.0', '1 Jun 2026', 'Updated for Solana support and the new cookie preferences centre.'],
  ['2.0', '12 Mar 2026', 'Policy published for the launch of GLOBAL POOL.']]
};
// ===== MAIN desktop frames (page 03) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 Legal documents', 90000, 0);
const set = await getTpl();
const X0 = Math.round(set.x + set.width + 240), Y0 = 120;
const R = [];
for (const D of [D_privacy]) { const { f, t, off } = await deskFrame(set, D, X0 + IDX[D.key] * 1560, Y0); fitSection(sec); R.push({ id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id, navOff: off, over: overflowList(f).slice(0, 8) }); }
const SH = []; for (const r of R) { const t = await figma.getNodeByIdAsync(r.tpl); await t.screenshot({ scale: 0.32 }); SH.push(r.tpl); }
return { sec: sec.id, R, SH, MISS: MISS.slice(0, 40) };
