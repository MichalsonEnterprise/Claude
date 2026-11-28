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
// ===== TEMPLATE/LEGAL DOCUMENT BUILDER =====
async function pill(name, text) { const p = row(name + ' pill', { gap: 6, p: [4, 10, 4, 10], r: 9999, fill: 'brand/tint' }); add(p, await IC('file', 14, 'icon/brand'), await tx(name, text, 'Label/S', 'text/brand')); return p; }
async function meta(icon, name, text) { const r = row('Meta — ' + name, { gap: 6 }); add(r, await IC(icon, 16, 'icon/muted'), await tx(name, text, 'Body/S', 'text/secondary')); return r; }
async function summary(D, M) {
  const c = AX('VERTICAL', { name: 'Summary callout', p: M ? 20 : 24, gap: 16, fill: 'surface/default', r: 14 }); strokeSides(c, 'brand/primary', { l: 4 });
  const h = row('Summary header', { gap: 12, align: 'MIN' }); add(c, [h, 'FILL']); const hc = col('Summary heading', { gap: 4 }); add(h, await tile('info'), [hc, 'FILL']);
  await wt(hc, 'Summary title', D.sumT, M ? 'Heading/H5' : 'Heading/H4', 'text/primary'); await wt(hc, 'Summary note', D.sumN, 'Body/S', 'text/tertiary');
  for (let i = 1; i <= 5; i++) { const r = row('Summary row ' + i, { gap: 12, align: 'MIN' }); add(c, [r, 'FILL']); add(r, await IC('check-circle', 20, 'icon/brand')); await wt(r, 'Summary ' + i, D.sum[i - 1], M ? 'Body/S' : 'Body/M', 'text/primary'); }
  return c;
}
async function sectionBlock(D, i, M) {
  const s = D.s[i - 1] || D.s[0];
  const S = col('Section ' + i, { gap: M ? 12 : 16, p: [0, 0, M ? 32 : 48, 0] }); strokeSides(S, 'border/subtle', { b: 1 });
  const hr = row('S' + i + ' heading row', { gap: 12 }); add(S, [hr, 'FILL']);
  const nb = AL('HORIZONTAL', { name: 'S' + i + ' num box', fill: 'brand/tint', r: 6, w: M ? 28 : 32, h: M ? 28 : 32, align: 'CENTER', justify: 'CENTER' });
  add(nb, await tx('S' + i + ' num', String(i), M ? 'Label/M' : 'Label/L', 'text/brand')); add(hr, nb);
  await wt(hr, 'S' + i + ' heading', s.h, M ? 'Heading/H4' : 'Heading/H3', 'text/primary');
  const an = await I('7:774', { Type: 'Ghost', Size: M ? 'M' : 'S', State: 'Default' }, { Icon: ICONS.link }); an.name = 'S' + i + ' anchor (copy link)'; add(hr, an);
  await wt(S, 'S' + i + ' p1', s.p[0], M ? 'Body/M' : 'Body/L', 'text/secondary');
  const p2 = await wt(S, 'S' + i + ' p2', s.p[1] || s.p[0], M ? 'Body/M' : 'Body/L', 'text/secondary'); p2.visible = !!s.p[1];
  const nx = row('S' + i + ' note box', { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 10 }); add(S, [nx, 'FILL']);
  add(nx, await IC('info', 20, 'icon/brand')); await wt(nx, 'S' + i + ' note', s.note || 'Key point for this section.', M ? 'Body/S' : 'Body/M', 'text/primary');
  const dm = await DEMO('S'); dm.name = 'S' + i + ' note DEMO'; add(nx, dm); nx.visible = !!s.note; dm.visible = !!s.demo;
  return S;
}
async function history(D, M) {
  const H = col('Version history', { gap: 0 });
  const hh = row('History header', { gap: 8, p: [0, 0, 12, 0] }); add(H, [hh, 'FILL']);
  add(hh, await tx('History title', 'Version history', M ? 'Heading/H5' : 'Heading/H4', 'text/primary'), await DEMO('XS'));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(hh, [sp, 'FILL']); add(hh, await tx('History link', 'All versions', 'Label/M', 'text/brand'));
  for (let i = 1; i <= 3; i++) { const h = D.hist[i - 1];
    if (M) { const r = col('Hist row ' + i, { gap: 4, p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(H, [r, 'FILL']); const m = row('Hist ' + i + ' meta', { gap: 8 }); add(r, m); add(m, await tx('Hist ' + i + ' ver', 'v' + h[0], 'Label/M', 'text/primary'), await tx('Hist ' + i + ' date', h[1], 'Body/S', 'text/tertiary')); await wt(r, 'Hist ' + i + ' change', h[2], 'Body/S', 'text/secondary'); }
    else { const r = row('Hist row ' + i, { gap: 16, align: 'MIN', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(H, [r, 'FILL']); const v = await T('v' + h[0], 'Label/M', 'text/primary', { w: 56 }); v.name = 'Hist ' + i + ' ver'; const d = await T(h[1], 'Body/S', 'text/tertiary', { w: 112 }); d.name = 'Hist ' + i + ' date'; add(r, v, d); await wt(r, 'Hist ' + i + ' change', h[2], 'Body/S', 'text/secondary'); }
  }
  return H;
}
async function licence(M) {
  const L = col('Licence & operator', { gap: 12 }); const n = await I('6:158', { Variant: M ? 'Compact' : 'Inline' }); n.name = 'Notice/Licence'; add(L, M ? n : [n, 'FILL']);
  const r = row('Operator row', { gap: 12, align: 'MIN' }); add(L, [r, 'FILL']); add(r, await I('6:159'));
  await wt(r, 'Operator note', 'GLOBAL POOL is operated by [Operator Ltd — DEMO placeholder] under gaming licence [No. 0000/DEMO — placeholder] issued by [Regulator — DEMO placeholder]. Real-money play is offered only to people aged 18+ in permitted jurisdictions.', 'Caption', 'text/tertiary');
  return L;
}
async function docsCard(D, M) {
  const c = card('Legal documents', { p: M ? 12 : 16, gap: 2 }); const t = col('Docs header', { p: [4, 8, 8, 8] }); add(c, [t, 'FILL']); add(t, await tx('Docs title', 'LEGAL DOCUMENTS', 'Overline', 'text/tertiary'));
  for (let i = 1; i <= 6; i++) { const on = i === D.cur; const r = row('Doc row ' + i, { gap: 10, p: M ? [12, 12, 12, 12] : [8, 12, 8, 12], r: 10, fill: on ? 'surface/selected' : null }); add(c, [r, 'FILL']); const ic = await IC('file', 16, on ? 'icon/brand' : 'icon/muted'); ic.name = 'Doc icon ' + i; add(r, ic); await wt(r, 'Doc link ' + i, DOC_LINKS[i - 1], M ? 'Body/M' : 'Body/S', on ? 'text/brand' : 'text/secondary'); }
  return c;
}
async function helpCard(M) { const c = card('Help card', { p: 20, gap: 12 }); add(c, await tile('mail')); await wt(c, 'Help title', 'Questions about this document?', 'Label/L', 'text/primary'); await wt(c, 'Help body', 'Email legal@example.com or chat with Support — we reply within 2 business days.', 'Body/S', 'text/secondary'); const b = await BTN('Secondary', 'Contact support', { size: M ? 'L' : 'S', lead: 'chat' }); add(c, M ? [b, 'FILL'] : b); return c; }
async function tocRow(D, i, M) { const s = D.s[i - 1] || D.s[0]; const on = i === 1; const r = row('TOC row ' + i, { gap: 12, align: M ? 'CENTER' : 'MIN', p: M ? [12, 12, 12, 12] : [8, 12, 8, 12], r: 10, fill: on ? 'brand/tint' : null }); if (on) strokeSides(r, 'brand/primary', { l: 3 });
  const nm = await T(String(i).padStart(2, '0'), 'Mono/S', on ? 'text/brand' : 'text/tertiary', { w: 20 }); nm.name = 'TOC ' + i + ' num'; r.appendChild(nm);
  await wt(r, 'TOC ' + i, s.h, M ? 'Body/M' : 'Body/S', on ? 'text/brand' : 'text/secondary'); r.visible = i <= D.s.length; return r; }
async function buildDesktop(D) {
  const C = figma.createComponent(); C.name = 'Breakpoint=Desktop'; C.layoutMode = 'VERTICAL'; C.resize(1136, 100); C.counterAxisSizingMode = 'FIXED'; C.primaryAxisSizingMode = 'AUTO'; gap(C, 32); fill(C, 'bg/base');
  const bc = row('Breadcrumb', { gap: 8 }); add(C, bc); add(bc, await tx('Crumb 0', 'Home', 'Body/S', 'text/tertiary'), await IC('chevron-right', 16, 'icon/muted'), await tx('Crumb 1', 'Help & legal', 'Body/S', 'text/tertiary'), await IC('chevron-right', 16, 'icon/muted'), await tx('Current page', D.title, 'Body/S Strong', 'text/primary'));
  const HD = row('Doc header', { gap: 48, align: 'MIN', p: [0, 0, 40, 0] }); strokeSides(HD, 'border/subtle', { b: 1 }); add(C, [HD, 'FILL']);
  const L = col('Header copy', { gap: 16 }); add(HD, [L, 'FILL']); add(L, await tx('Doc overline', D.over, 'Overline', 'text/brand'));
  await wt(L, 'Doc title', D.title, 'Heading/H1', 'text/primary'); await wt(L, 'Doc lead', D.lead, 'Body/L', 'text/secondary');
  const mr = row('Doc meta', { gap: 16, wrap: true, cgap: 8 }); add(L, [mr, 'FILL']);
  add(mr, await pill('Version', D.version), await meta('calendar', 'Effective', D.effective), await meta('refresh', 'Updated', D.updated), await meta('clock', 'Read time', readTime(D)), await meta('globe', 'Language', 'English · binding version'));
  const R = card('Document details', { w: 320, gap: 16 }); add(HD, R);
  const rh = row('Details header', { gap: 8 }); add(R, [rh, 'FILL']); add(rh, await tx('Details title', 'Document details', 'Label/L', 'text/primary'), await DEMO('XS'));
  const KV = ['Version', 'Effective', 'Last updated', 'Previous version'];
  for (let k = 0; k < 4; k++) { const r = row('Det row ' + (k + 1), { gap: 12, align: 'MIN' }); add(R, [r, 'FILL']); const a = await T(KV[k], 'Body/S', 'text/tertiary', { w: 112 }); a.name = 'Det k' + (k + 1); r.appendChild(a); await wt(r, 'Det v' + (k + 1), D.det[k], 'Body/S Strong', 'text/primary'); }
  add(R, [await BTN('Secondary', 'Download PDF', { size: 'M', lead: 'download' }), 'FILL']);
  const br = row('Doc actions', { gap: 8 }); add(R, [br, 'FILL']); add(br, await BTN('Ghost', 'Print', { size: 'S', lead: 'file' }), await BTN('Ghost', 'Copy link', { size: 'S', lead: 'link' }));
  await wt(R, 'PDF meta', D.pdf, 'Caption', 'text/tertiary');
  const B = row('Doc body', { gap: 96, align: 'MIN' }); add(C, [B, 'FILL']);
  const rail = col('TOC rail — sticky', { gap: 24, w: 288 }); add(B, rail);
  const tc = card('TOC — sticky (top 88 px)', { p: 16, gap: 2 }); add(rail, [tc, 'FILL']);
  const th = col('TOC header', { gap: 8, p: [4, 8, 12, 8] }); add(tc, [th, 'FILL']); add(th, await tx('TOC title', 'ON THIS PAGE', 'Overline', 'text/tertiary'));
  await wt(th, 'TOC count', D.s.length + ' sections · ' + readTime(D), 'Caption', 'text/tertiary');
  const pr = AL('HORIZONTAL', { name: 'Reading progress', fill: 'surface/raised', r: 9999, w: 240, h: 4 }); add(th, [pr, 'FILL']); add(pr, rect(24, 4, 'brand/primary', 9999, 'Progress fill'));
  for (let i = 1; i <= NSEC; i++) add(tc, [await tocRow(D, i, false), 'FILL']);
  add(rail, [await docsCard(D, false), 'FILL'], [await helpCard(false), 'FILL']);
  const A = col('Article', { gap: 48, w: 720 }); add(B, A);
  add(A, [await summary(D, false), 'FILL']);
  for (let i = 1; i <= NSEC; i++) { const S = await sectionBlock(D, i, false); add(A, [S, 'FILL']); S.visible = i <= D.s.length; }
  add(A, [await history(D, false), 'FILL'], [await licence(false), 'FILL'], await BTN('Ghost', 'Back to top', { size: 'S', lead: 'chevron-up' }));
  return C;
}
async function buildMobile(D) {
  const C = figma.createComponent(); C.name = 'Breakpoint=Mobile'; C.layoutMode = 'VERTICAL'; C.resize(358, 100); C.counterAxisSizingMode = 'FIXED'; C.primaryAxisSizingMode = 'AUTO'; gap(C, 24); fill(C, 'bg/base');
  const bk = row('Back link', { gap: 6 }); add(C, bk); add(bk, await IC('chevron-left', 16, 'icon/brand'), await tx('Crumb 1', 'Help & legal', 'Label/M', 'text/brand'));
  const HD = col('Doc header', { gap: 12 }); add(C, [HD, 'FILL']); add(HD, await tx('Doc overline', D.over, 'Overline', 'text/brand'));
  await wt(HD, 'Doc title', D.title, 'Heading/H2', 'text/primary'); await wt(HD, 'Doc lead', D.lead, 'Body/M', 'text/secondary');
  const mr = row('Doc meta', { gap: 12, wrap: true, cgap: 8 }); add(HD, [mr, 'FILL']);
  add(mr, await pill('Version', D.version), await meta('calendar', 'Effective', D.effective), await meta('refresh', 'Updated', D.updated), await meta('clock', 'Read time', readTime(D)));
  const ar = row('Doc actions', { gap: 12 }); add(C, [ar, 'FILL']); add(ar, [await BTN('Secondary', 'Download PDF', { size: 'L', lead: 'download' }), 'FILL']);
  const cl = await I('7:774', { Type: 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.link }); cl.name = 'Copy link'; add(ar, cl);
  await wt(C, 'PDF meta', D.pdf, 'Caption', 'text/tertiary');
  const acc = col('Contents — collapsible', { gap: 0, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(C, [acc, 'FILL']);
  const ah = row('Contents header (tap to expand)', { gap: 12, p: [12, 16, 12, 16] }); add(acc, [ah, 'FILL']);
  const at = col('Contents label', { gap: 2 }); add(ah, await tile('list'), [at, 'FILL']); add(at, await tx('TOC title', 'Contents', 'Label/L', 'text/primary')); await wt(at, 'TOC count', D.s.length + ' sections · ' + readTime(D), 'Caption', 'text/tertiary');
  const cd = await IC('chevron-down', 20, 'icon/default'); cd.name = 'Chevron down'; const cu = await IC('chevron-up', 20, 'icon/brand'); cu.name = 'Chevron up'; add(ah, cd, cu); cu.visible = false;
  const tl = col('TOC list', { gap: 2, p: [8, 8, 8, 8] }); strokeSides(tl, 'border/subtle', { t: 1 }); add(acc, [tl, 'FILL']);
  for (let i = 1; i <= NSEC; i++) add(tl, [await tocRow(D, i, true), 'FILL']);
  tl.visible = false;
  add(C, [await summary(D, true), 'FILL']);
  for (let i = 1; i <= NSEC; i++) { const S = await sectionBlock(D, i, true); add(C, [S, 'FILL']); S.visible = i <= D.s.length; }
  add(C, [await history(D, true), 'FILL'], [await docsCard(D, true), 'FILL'], [await helpCard(true), 'FILL'], [await licence(true), 'FILL'], [await BTN('Secondary', 'Back to top', { size: 'L', lead: 'chevron-up' }), 'FILL']);
  return C;
}
const TPL_DESC = 'Long-form legal document template (PUB-16 Terms & Conditions, PUB-17 Privacy Policy, PUB-19 AML/KYC Policy; reusable for Cookie Policy, Bonus terms, etc.). Variants: Breakpoint=Desktop (1136 content column inside the casino shell: Sidebar 240 + Topbar + Footer Mega) and Breakpoint=Mobile (358 inside a 390 frame).\n\nANATOMY — Desktop: breadcrumb · header (overline, H1 title, Body/L lead, meta row: version pill, effective date, last updated, read time, binding language) + Document details card (version, effective, last updated, previous version, Download PDF, Print, Copy link, PDF size) · body: sticky TOC rail 288 (ON THIS PAGE, reading-progress bar, 11 numbered anchor rows, active row = brand/tint + 3 px mint indicator; Legal documents list with the current doc selected; help card) | article 720 = 72ch measure at Body/L 18/28 (summary callout with 5 plain-language points, numbered sections with anchor buttons, optional worked-example note box with DEMO, version history, licence notice + operator line, Back to top). Mobile: back link, header, Download PDF + Copy link, collapsible Contents accordion (collapsed by default; expanded = show "TOC list", hide "Chevron down", show "Chevron up"), same summary/sections at Body/M, version history, legal documents list (44 px rows), help, licence, Back to top.\n\nOVERRIDES — set TEXT layers by name: Doc overline, Doc title, Current page, Doc lead, Version, Effective, Updated, Read time, Det v1–v4, PDF meta, TOC count, TOC 1–11, Summary title/note/1–5, S1–S11 heading/p1/p2/note, Hist 1–3 ver/date/change. Toggle visibility: Section N, TOC row N, SN p2, SN note box, SN note DEMO. Current doc: Doc row N fill surface/selected + Doc link N text/brand. Scripts editing instances must set figma.skipInvisibleInstanceChildren = false.\n\nDEV NOTES — each section heading has an id (e.g. #eligibility, #global-pool) and the anchor button copies the deep link; TOC rows link to the ids and the active row follows the scroll position (IntersectionObserver); TOC rail is position: sticky; top: 88px (below the 64 px top bar). Download PDF serves the signed PDF of the shown version; Print uses a print stylesheet (hide shell + rail, black text on white, 11 pt, 72ch, headings keep-with-next, URLs printed after links). Version/effective/updated come from the CMS document record; the previous version link opens the archived version. Do not: hide fees, limits or restrictions in long text — the summary callout must state them plainly.';
// ===== END TEMPLATE BUILDER =====
const D_terms = {
 key: 'terms', id: 'PUB-16', title: 'Terms & Conditions', over: 'LEGAL · TERMS', cur: 1, slug: 'terms',
 lead: 'These terms are the agreement between you and [Operator Ltd — DEMO placeholder], which operates GLOBAL POOL. They explain who can play, how your account and USDT balance work, how the Global Pool and our games run, and what each of us can do if something goes wrong. Please read them before you register.',
 version: 'Version 4.2', effective: 'Effective 1 Dec 2026', updated: 'Updated 27 Nov 2026',
 det: ['4.2', '1 Dec 2026, 00:00 UTC', '27 Nov 2026, 10:00 UTC', '4.1 · 1 Jun 2026'], pdf: 'PDF · 412 KB · English is the binding version',
 sumT: 'The short version', sumN: 'A plain-language overview to help you find your way. It does not replace the full terms below.',
 sum: [
  'You must be 18 or older (or the higher legal age where you live) and located in a permitted jurisdiction to play.',
  'Your balance is held in USDT. Network fees are shown separately and are never part of our platform fee.',
  'Every qualifying Global Pool entry carries a 0.05 USDT platform fee, shown as its own line before you confirm.',
  'Draws use Chainlink VRF and game results use verifiable seeds — nobody, including us, can change an outcome.',
  'You can lose what you stake. Limits, reality checks, cooling-off and self-exclusion are available at any time.'],
 s: [
  { h: 'Eligibility', a: 'eligibility', p: [
   'You may open an account and use real-money features only if you are at least 18 years old — or older, where the law of your place of residence sets a higher age — and you are physically located in a jurisdiction where our licence allows us to offer them. You must act for yourself, not for anyone else, and you may hold only one account.',
   'We check your age and location at registration and again at key moments such as deposits, Global Pool entries and withdrawals. If we cannot confirm that you are eligible, real-money features stay restricted until the check is complete. We do not knowingly accept players who are self-excluded with us or with a national self-exclusion scheme that applies to them.'] },
  { h: 'Account and verification', a: 'account', p: [
   'You are responsible for keeping your sign-in details, your two-factor authentication device and your anti-phishing code private. Tell us at security@example.com straight away if you think someone else has accessed your account — we will lock it while we investigate.',
   'Verification happens in levels. Level 1 confirms your email, age and country. Level 2 adds an identity document and a liveness check and is required before your first withdrawal. Level 3 — enhanced due diligence, including source of funds — may be requested for higher limits or when our AML/KYC Policy requires it.'] },
  { h: 'Deposits and withdrawals', a: 'deposits-withdrawals', p: [
   'All balances are held and shown in USDT. You can deposit and withdraw on BNB Chain, Polygon, Arbitrum, Ethereum and Solana; the minimum deposit is 10.00 USDT and the minimum withdrawal is 20.00 USDT. Blockchain transactions cannot be reversed, so always check the network and the address before you send — funds sent on an unsupported network or to a wrong address may not be recoverable.',
   'We charge no platform fee on withdrawals. The network fee for the chain you choose is shown before you confirm and is deducted from the amount sent. Withdrawals need two-factor confirmation, may be screened under our AML/KYC Policy, and new withdrawal addresses have a 24-hour security cooldown. We never hold a withdrawal for any reason other than the security and compliance checks described in these terms.'] },
  { h: 'Global Pool rules and fees', a: 'global-pool', p: [
   'The Global Pool runs in rounds. Each round publishes its entry price (currently 10.00 USDT), a fixed close time in UTC, a minimum number of participants and a minimum pool size. Entry prices go into the pool in full. The platform fee of 0.05 USDT per qualifying entry is charged separately, shown as its own line before you confirm, and never added to the pool.',
   'When a round closes with its thresholds met, winners are selected by Chainlink VRF and prizes are paid according to the round’s published prize table. If a round does not meet its thresholds, it is cancelled and every entry price and platform fee is refunded under the contract rules. We cannot choose winners, change results or make payouts outside the round rules.'],
   note: 'Example: 35 entries × 10.00 USDT = 350.00 USDT into the pool, plus a separate platform fee of 35 × 0.05 = 1.75 USDT. You confirm a total of 351.75 USDT.', demo: true },
  { h: 'Games and fairness', a: 'games-fairness', p: [
   'Every game page shows its rules, limits and house edge or return to player before you play — for example, Pool Roulette has a house edge of 2.70% and Double Side pays 1.96×. Results come from a server seed committed before your bet combined with your own client seed, so you can check any result on our Provably Fair page.',
   'If a game malfunctions, the affected round is void and stakes are returned. We never alter a result once it has been generated. Bonus funds from promotions carry their own wagering terms, which are shown on each offer before you opt in.'] },
  { h: 'Responsible gaming', a: 'responsible-gaming', p: [
   'Gaming should stay entertainment. You can set daily, weekly or monthly limits on deposits, losses and participation, switch on reality-check reminders, take a cooling-off break from 24 hours to 6 weeks, or self-exclude for 6 months or longer. Lowering a limit takes effect immediately; raising one takes effect only after a 24-hour cool-down.',
   'While a break or self-exclusion is active you cannot deposit, enter rounds or play, but you can always withdraw your available balance, and we send you no marketing. If you are worried about your play, our Responsible Gaming page lists independent organisations that offer free, confidential help.'] },
  { h: 'Restricted territories', a: 'restricted-territories', p: [
   'Our licence does not allow real-money features in certain countries and regions, including the United States. The current list is published on the Restricted Countries page and forms part of these terms. From a restricted territory you can view the site and withdraw any available balance, but you cannot deposit, enter rounds or play.',
   'You must not use a VPN, proxy or any other tool to hide your location or to reach the service from a restricted territory. If an account is used this way, we will restrict it and return any remaining balance after the checks the law requires.'] },
  { h: 'Suspension and closure', a: 'suspension-closure', p: [
   'You can close your account at any time from Account settings or through Support. Any available balance is returned to a withdrawal address you control after the standard checks. Closing your account does not cancel entries already placed in an open round — they are settled or refunded under the round rules.',
   'We may suspend or close an account when the law or our regulator requires it, when verification cannot be completed, or when we have reasonable grounds to suspect fraud, collusion, money laundering or a breach of these terms. We will tell you why unless the law prevents it, and you can ask for the decision to be reviewed.'] },
  { h: 'Liability', a: 'liability', p: [
   'We provide the service with reasonable skill and care and pay out balances and prizes that are properly due to you. We are not responsible for losses caused by events outside our reasonable control — such as blockchain congestion or outages — or by transactions you send to an incorrect address or on an unsupported network.',
   'Nothing in these terms limits liability that cannot be limited by law, including liability for fraud or for death or personal injury caused by negligence, and nothing affects your statutory rights as a consumer.'] },
  { h: 'Complaints and disputes', a: 'disputes', p: [
   'If something goes wrong, contact Support first — most issues are resolved within 2 business days. If you are not satisfied, raise a formal complaint at legal@example.com. We acknowledge every complaint within 48 hours and send a final response within 8 weeks.',
   'If you are still unhappy with our final response, you can refer the complaint free of charge to the independent dispute resolution body named in our licence ([ADR provider — DEMO placeholder]). These terms are governed by the law of [Licensing jurisdiction — DEMO placeholder].'] },
  { h: 'Changes to these terms', a: 'changes', p: [
   'We may update these terms to reflect changes in law, regulation or how the service works. For material changes we notify you by email and in your account at least 30 days before they take effect, and the version number and effective date at the top of this page change with them.',
   'If you do not accept a change, you can close your account and withdraw your balance before the new version takes effect. Earlier versions stay available in the version history below.'] }
 ],
 hist: [
  ['4.2', '1 Dec 2026', 'Clarified refunds for cancelled Global Pool rounds and the 24-hour cooldown for new withdrawal addresses.'],
  ['4.1', '1 Jun 2026', 'Added Solana deposits and withdrawals; updated the restricted territories list.'],
  ['4.0', '12 Mar 2026', 'New terms for the launch of the Global Pool.']]
};
// ===== MAIN t1: section + Template/Legal Document set (idempotent: reuses an existing set) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 Legal documents', 90000, 0);
let hdr = sec.findChild(n => n.name === 'Doc/PUB-16/17/19 header');
if (!hdr) { hdr = col('Doc/PUB-16/17/19 header', { gap: 8, w: 1590 }); sec.appendChild(hdr); hdr.x = 120; hdr.y = 120;
  await wt(hdr, 'Title', 'PUB-16 / 17 / 19 — Legal documents', 'Heading/H2', 'text/primary');
  await wt(hdr, 'Subtitle', 'Template/Legal Document (below) drives Terms & Conditions, Privacy Policy and AML/KYC Policy at 1440 (casino shell) and 390 (page 10, section “PUB-16/17/19 — Mobile”). Sticky table of contents, version + effective date + last updated, anchor-linked numbered headings, Body/L 72ch print-friendly measure, Download PDF and a plain-language summary callout. Copy is real, substantive opening text per section; operator, licence and regulator names are DEMO placeholders.', 'Body/M', 'text/secondary'); }
let set = sec.findChild(n => n.type === 'COMPONENT_SET' && n.name === TPL_NAME); let built = false;
if (!set) { for (const o of [...sec.children, ...figma.currentPage.children].filter(n => n.type === 'COMPONENT' && /^Breakpoint=(Desktop|Mobile)$/.test(n.name))) o.remove(); // orphans of an interrupted run
  const dc = await buildDesktop(D_terms); const mc = await buildMobile(D_terms);
  set = figma.combineAsVariants([dc, mc], sec); set.name = TPL_NAME; built = true;
  set.layoutMode = 'HORIZONTAL'; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.counterAxisAlignItems = 'MIN'; gap(set, 48); pad(set, 24); fill(set, 'surface/default'); radius(set, 14);
  set.description = TPL_DESC; }
set.x = 120; set.y = Math.round(hdr.y + hdr.height + 48);
fitSection(sec);
const dv = set.children.find(c => c.name === 'Breakpoint=Desktop'), mv = set.children.find(c => c.name === 'Breakpoint=Mobile');
const sh = [await vshot(dv, { cols: 2, chunkH: 1500, scale: 0.42 }), await vshot(mv, { cols: 4, chunkH: 2000, scale: 0.42 })];
return { sec: sec.id, hdr: hdr.id, set: set.id, built, desktop: dv.id, mobile: mv.id, sizes: [Math.round(dv.width), Math.round(dv.height), Math.round(mv.width), Math.round(mv.height)], setBox: [set.x, set.y, Math.round(set.width), Math.round(set.height)], over: [overflowList(dv).slice(0, 10), overflowList(mv).slice(0, 10)], sh };
