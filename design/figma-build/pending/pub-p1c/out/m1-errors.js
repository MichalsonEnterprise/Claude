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

// ===== pub-p1c MOBILE prelude (paste after helpers.js; art.js follows) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-06/24/25/26 — Mobile', 42000, 0);
const OUT = { section: sec.id, created: {}, skipped: [], audits: [], notes: [] };
function need(name) { const f = sec.children.find(c => c.name === name); if (!f) return true; if (Math.round(f.height) === 800 && f.primaryAxisSizingMode === 'FIXED') { f.remove(); OUT.notes.push('replaced incomplete ' + name); return true; } OUT.skipped.push(name + ' = ' + f.id); return false; }
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w, clip: o.clip }); }
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Pool Dice': '24:13443' };
async function mshell(name, x, y, o = {}) {
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y; OUT.created[name] = f.id;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  if (o.topbar !== false) { const tb = await I('23:12908', { State: o.auth === 'Member' ? 'Member' : 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']); }
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: o.gap ?? 28 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, o = {}) {
  if (o.footer !== false) { const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']); }
  if (o.sticky) add(S.f, [o.sticky, 'FILL']);
  if (o.tab !== false) { const tab = await I('22:5413', { Active: o.tab || 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']); }
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function statusChip(kind, label, icon) { const m = { ok: ['check-circle', 'status/success-tint', 'text/success'], warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], bad: ['x-circle', 'status/danger-tint', 'text/danger'], pause: ['pause-circle', 'status/warning-tint', 'text/warning'], work: ['wrench', 'status/info-tint', 'text/info'], clock: ['clock', 'status/info-tint', 'text/info'] }[kind]; const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: m[1], align: 'CENTER' }); add(c, await IC(icon || m[0], 14, m[2]), await T(label, 'Label/S', m[2])); return c; }
async function linkRow(label, icon = 'arrow-right') { const r = AL('HORIZONTAL', { name: 'Link — ' + label, gap: 6, align: 'CENTER', p: [12, 0, 12, 0] }); add(r, await T(label, 'Label/M', 'text/brand'), await IC(icon, 16, 'icon/brand')); return r; }
async function iconTile(ic, tint = 'brand/tint', col = 'icon/brand', size = 18) { const b = AL('HORIZONTAL', { name: 'Icon tile — ' + ic, fill: tint, r: 10, p: 8 }); add(b, await IC(ic, size, col)); return b; }
async function navRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const t = AL('VERTICAL', { gap: 2 }); const tr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(tr, await T(title, 'Body/M Strong', 'text/primary')); if (o.demo) add(tr, await DEMO('XS')); add(t, tr, [await T(body, 'Body/S', 'text/secondary', { w: 230 }), 'FILL']); add(r, await iconTile(ic, o.tint, o.ic), [t, 'FILL']); if (o.chev !== false) add(r, await IC('chevron-right', 20, 'icon/muted')); return r; }
async function mhead(over, title, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 4 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); return v; }
async function mlic(C, line) { const v = AL('VERTICAL', { name: 'Compliance strip', gap: 12 }); const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(v, [r, 'FILL']); const l = AL('HORIZONTAL', { name: 'RG line', gap: 6, align: 'CENTER' }); add(l, await IC('heart', 16, 'icon/brand'), [await T(line || 'Play for fun, not to win back losses. Limits, reality checks and self-exclusion are always in Responsible gaming.', 'Caption', 'text/secondary', { w: 330 }), 'FILL']); add(v, [l, 'FILL']); add(C, [v, 'FILL']); }
// art banner 358 wide (fixed height) with angled blocks; append art with abs()
function mbanner(C, name, h = 240, o = {}) { const b = AL('HORIZONTAL', { name, fill: 'surface/default', r: 20, w: 358, h, clip: true, p: o.p ?? 0, align: o.align }); stroke(b, 'border/subtle'); add(C, [b, 'FILL']); abs(b, rect(300, 700, o.block || 'surface/raised', 0, 'Angled colour block'), o.bx ?? 150, -200, 14); abs(b, rect(28, 700, o.stripe || 'brand/primary', 0, 'Angled colour block — stripe'), (o.bx ?? 150) - 46, -200, 14); return b; }
async function stack(C, btns) { const v = AL('VERTICAL', { name: 'Actions', gap: 12 }); for (const b of btns) add(v, [b, 'FILL']); add(C, [v, 'FILL']); return v; }
function homeIndicator(parent) { const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [8, 0, 4, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Home indicator bar')); add(parent, [hi, 'FILL']); }
function audit(f) { const fb = f.absoluteBoundingBox; const bad = []; for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) { const b = t.absoluteBoundingBox; if (!b || !t.visible) continue; let q = t.parent, art = false; while (q && q !== f) { if (q.name && q.name.startsWith('Object —')) { art = true; break; } q = q.parent; } if (art) continue; if (b.width < 2 || b.x < fb.x - 1 || b.x + b.width > fb.x + fb.width + 1) bad.push(t.name.slice(0, 32)); } OUT.audits.push({ id: f.id, name: f.name, h: Math.round(f.height), overflow: bad.slice(0, 8), n: bad.length }); }
// ===== end mobile prelude =====

// ===== pub-p1c ART — concrete casino objects as token-bound vectors (no glows / rings / sparkles) =====
// SVG placeholder colours are remapped to variables after import, so every vector paint is token-bound.
const ARTMAP = { '#F1F1F1': 'paper/50', '#BDBDBD': 'paper/300', '#141414': 'ink/900', '#2CD97D': 'brand/primary', '#1B7A4A': 'mint/700', '#E5484D': 'status/danger', '#8A2C2F': 'red/700', '#F4C96C': 'accent/gold', '#E9A044': 'accent/gold-strong' };
const ARTFB = { 'paper/50': 'text/primary', 'paper/300': 'text/tertiary', 'ink/900': 'bg/secondary', 'ink/700': 'text/on-primary', 'mint/700': 'brand/primary-strong', 'red/700': 'status/danger-strong' };
function cv(n) { return VAR[n] ? n : (ARTFB[n] && VAR[ARTFB[n]] ? ARTFB[n] : 'text/on-primary'); }
function __hex(c) { const h = v => Math.round(v * 255).toString(16).padStart(2, '0'); return ('#' + h(c.r) + h(c.g) + h(c.b)).toUpperCase(); }
function __near(hx) { let best = null, bd = 1e9; const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const a = p(hx); for (const k of Object.keys(ARTMAP)) { const b = p(k); const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); if (d < bd) { bd = d; best = k; } } return bd < 24 ? ARTMAP[best] : null; }
function svgArt(svg, name) {
  const f = figma.createNodeFromSvg(svg); f.name = name; f.fills = []; f.clipsContent = false; const miss = new Set();
  const swap = arr => arr.map(p => { if (p.type !== 'SOLID') return p; const k = ARTMAP[__hex(p.color)] || __near(__hex(p.color)); if (!k) { miss.add(__hex(p.color)); return p; } return paint(cv(k)); });
  for (const n of f.findAll(() => true)) {
    if ('fills' in n && Array.isArray(n.fills) && n.fills.length) n.fills = swap(n.fills);
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) n.strokes = swap(n.strokes);
  }
  if (miss.size && typeof OUT !== 'undefined') OUT.notes.push(name + ': unmapped colours ' + [...miss].join(','));
  return f;
}
function __die(tx, ty, rot) { const pip = (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#141414"/>`; return `<g transform="translate(${tx} ${ty}) rotate(${rot} 90 90)"><rect x="16" y="18" width="180" height="180" rx="34" fill="#BDBDBD"/><rect x="0" y="0" width="180" height="180" rx="34" fill="#F1F1F1"/>${pip(50, 50)}${pip(130, 50)}${pip(50, 130)}${pip(130, 130)}</g>`; }
// 404: "4 · 0 · 4" spelled by two dice and a cracked mint casino chip (+ a broken-off chip fragment)
function art404() {
  let spots = ''; for (let a = 0; a < 360; a += 45) spots += `<rect x="-15" y="-112" width="30" height="40" rx="6" fill="#F1F1F1" transform="rotate(${a})"/>`;
  const svg = `<svg width="640" height="430" viewBox="0 0 640 430" xmlns="http://www.w3.org/2000/svg">${__die(30, 150, -16)}<g transform="translate(330 205)"><circle cx="0" cy="14" r="112" fill="#1B7A4A"/><circle cx="0" cy="0" r="112" fill="#2CD97D"/>${spots}<circle cx="0" cy="0" r="74" fill="#1B7A4A"/><ellipse cx="0" cy="0" rx="28" ry="40" fill="none" stroke="#F1F1F1" stroke-width="16"/><polyline points="-6,-118 10,-72 -12,-38 12,-4 -8,30 10,68 -4,122" fill="none" stroke="#141414" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(430 336) rotate(18)"><polygon points="0,0 34,-6 40,22 8,30" fill="#1B7A4A"/><polygon points="0,-6 34,-12 40,16 8,24" fill="#2CD97D"/></g>${__die(470, 96, 14)}</svg>`;
  return svgArt(svg, 'Art — two dice + cracked chip (404)');
}
// 500: slot machine with a drooping lever, its power cable unplugged from the wall socket
async function art500(reels = false) {
  const svg = `<svg width="620" height="450" viewBox="0 0 620 450" xmlns="http://www.w3.org/2000/svg"><rect x="74" y="34" width="300" height="372" rx="30" fill="#8A2C2F"/><rect x="60" y="24" width="300" height="372" rx="30" fill="#E5484D"/><rect x="88" y="48" width="244" height="60" rx="14" fill="#F1F1F1"/><rect x="108" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="242" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="200" y="58" width="20" height="28" rx="6" fill="#141414"/><rect x="200" y="90" width="20" height="10" rx="5" fill="#141414"/><rect x="88" y="126" width="244" height="130" rx="16" fill="#141414"/><rect x="100" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="176" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="252" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/>${reels ? '' : '<rect x="116" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="192" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="268" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/>'}<rect x="88" y="274" width="244" height="44" rx="12" fill="#141414"/><circle cx="128" cy="296" r="11" fill="#BDBDBD"/><circle cx="168" cy="296" r="11" fill="#BDBDBD"/><circle cx="208" cy="296" r="11" fill="#BDBDBD"/><rect x="244" y="286" width="72" height="20" rx="10" fill="#BDBDBD"/><rect x="108" y="336" width="204" height="40" rx="12" fill="#141414"/><rect x="356" y="222" width="36" height="60" rx="10" fill="#BDBDBD"/><g transform="rotate(34 384 252)"><rect x="376" y="102" width="16" height="152" rx="8" fill="#BDBDBD"/><circle cx="384" cy="96" r="26" fill="#F1F1F1"/></g><path d="M300 396 C 300 436, 396 438, 438 404" fill="none" stroke="#141414" stroke-width="12" stroke-linecap="round"/><rect x="434" y="384" width="56" height="40" rx="10" fill="#BDBDBD"/><rect x="490" y="392" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="490" y="408" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="552" y="350" width="72" height="96" rx="14" fill="#F1F1F1"/><rect x="570" y="384" width="9" height="20" rx="3" fill="#141414"/><rect x="596" y="384" width="9" height="20" rx="3" fill="#141414"/></svg>`;
  const f = svgArt(svg, 'Art — unplugged slot machine (500)');
  if (reels) {
    for (const [i, d] of [[0, '5'], [1, '0'], [2, '0']]) { const t = await T(d, 'Display/M', cv('ink/900'), { name: 'Reel ' + (i + 1) + ' — ' + d }); f.appendChild(t); t.textAlignHorizontal = 'CENTER'; t.resize(68, t.height); t.x = 100 + i * 76; t.y = Math.round(138 + (106 - t.height) / 2); }
    const sign = AL('HORIZONTAL', { name: 'Sign — OUT OF ORDER', fill: cv('paper/50'), r: 6, p: [6, 14, 6, 14] }); stroke(sign, 'status/danger', 3); add(sign, await T('OUT OF ORDER', 'Label/L', 'status/danger')); f.appendChild(sign); sign.rotation = 9; sign.x = 116; sign.y = 236;
  }
  return f;
}
// Maintenance: open-end wrench + hex nut (vectors); the ticket stub is built from real text layers (see ticket()).
function artWrench() { return svgArt(`<svg width="160" height="420" viewBox="0 0 160 420" xmlns="http://www.w3.org/2000/svg"><path d="M20 10 L20 70 Q20 110 60 110 L60 400 Q60 418 80 418 Q100 418 100 400 L100 110 Q140 110 140 70 L140 10 L112 10 L112 62 L48 62 L48 10 Z" fill="#BDBDBD"/><circle cx="80" cy="372" r="11" fill="#141414"/></svg>`, 'Art — open-end wrench'); }
function artNut() { return svgArt(`<svg width="120" height="110" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg"><polygon points="30,4 90,4 118,55 90,106 30,106 2,55" fill="#BDBDBD"/><circle cx="60" cy="55" r="24" fill="#141414"/></svg>`, 'Art — hex nut'); }
// Leaderboard: trophy cup (gold = prize moment)
function artTrophy() { return svgArt(`<svg width="300" height="320" viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg"><path d="M70 40 H32 Q20 40 20 58 Q20 122 84 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M230 40 H268 Q280 40 280 58 Q280 122 216 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M70 20 H230 V110 Q230 190 150 202 Q70 190 70 110 Z" fill="#F4C96C"/><path d="M104 44 Q100 120 140 168" fill="none" stroke="#F1F1F1" stroke-width="10" stroke-linecap="round"/><rect x="130" y="196" width="40" height="50" fill="#E9A044"/><rect x="90" y="240" width="120" height="30" rx="8" fill="#F4C96C"/><rect x="70" y="266" width="160" height="44" rx="10" fill="#141414"/><rect x="104" y="280" width="92" height="16" rx="4" fill="#BDBDBD"/></svg>`, 'Art — trophy cup'); }
// Ticket stub with real text: "Back at 02:30 UTC" + stub "WITHDRAWALS OPEN"
async function ticket(scale = 1) {
  const t = AL('HORIZONTAL', { name: 'Object — maintenance ticket stub', fill: cv('paper/50'), r: 14, clip: true });
  const m = AL('VERTICAL', { name: 'Ticket main', p: [24, 24, 24, 28], gap: 6 });
  add(m, await T('BACK AT', 'Overline', cv('ink/700')), await T('02:30 UTC', 'Heading/H2', 'text/on-primary'), await T('1 DEC 2026', 'Label/M', cv('ink/700')), await T('Notice AN-88', 'Mono/S', cv('ink/700')));
  const perf = AL('VERTICAL', { name: 'Perforation', p: [10, 0, 10, 0], gap: 10, justify: 'CENTER' }); for (let i = 0; i < 9; i++) perf.appendChild(ellipse(8, 8, cv('paper/300'), 'Hole'));
  const s = AL('VERTICAL', { name: 'Ticket stub', p: [24, 24, 24, 20], gap: 4, justify: 'CENTER' });
  add(s, await T('WITHDRAWALS', 'Overline', cv('ink/700')), await T('OPEN', 'Heading/H3', cv('mint/700')));
  add(t, m, perf, s); perf.layoutSizingVertical = 'FILL'; s.layoutSizingVertical = 'FILL';
  if (scale !== 1) t.rescale(scale);
  return t;
}
// ===== end ART =====

// ===== m1: 390 frames for [PUB-24] 404 · [PUB-25] 500 · [PUB-26] Maintenance — copy mirrors the desktop frames
// 54:101512 / 82:102573 / 82:103376 (page 03, section 54:101508); auth state is read from each desktop top bar.
const M404 = '[PUB-24] 404 Not Found / 390 / Default';
const M500 = '[PUB-25] 500 Server Error / 390 / Default';
const MMNT = '[PUB-26] Maintenance / 390 / Scheduled — withdrawals available';
const shots = [];
async function authOf(id) { try { const f = await figma.getNodeByIdAsync(id); const tb = f && f.findOne(n => n.type === 'INSTANCE' && /Topbar/.test(n.name)); if (!tb) return 'Guest'; const mc = await tb.getMainComponentAsync(); return mc && /Member/.test(mc.name) ? 'Member' : 'Guest'; } catch (e) { return 'Guest'; } }
async function dtext(id, start, fb) { try { const f = await figma.getNodeByIdAsync(id); const t = f && f.findOne(n => n.type === 'TEXT' && n.characters.startsWith(start)); return t ? t.characters : fb; } catch (e) { return fb; } }
async function tile(game, players, tag) { const p = { Art: ART[game], Players: players, 'House edge': game === 'Global Pool' ? 'Fee 0.05 USDT / entry' : 'House edge 1.00%' }; if (tag) { p['Show tag'] = true; p.Tag = tag; } const t = await I('28:16529', { State: 'Default' }, p); t.name = 'Tile/Game Generic — ' + game; t.rescale(171 / 160); return t; }
async function heading(C, chip, title, body) { add(C, chip); const v = AL('VERTICAL', { name: 'Title + intro', gap: 10 }); add(v, [await T(title, 'Heading/H2', 'text/primary', { w: 358 }), 'FILL'], [await T(body, 'Body/M', 'text/secondary', { w: 358 }), 'FILL']); add(C, [v, 'FILL']); }
async function svcRow(ic, name, kind, label, note, line) { const r = AL('VERTICAL', { name: 'Service — ' + name, gap: 6, p: [12, 0, 12, 0] }); if (line) strokeSides(r, 'border/subtle', { b: 1 }); const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(h, await IC(ic, 18, 'icon/muted'), [await T(name, 'Body/S Strong', 'text/primary', { w: 150 }), 'FILL'], await statusChip(kind, label)); add(r, [h, 'FILL']); if (note) add(r, [await T(note, 'Caption', 'text/secondary', { w: 326 }), 'FILL']); return r; }
async function chip(label) { const c = await I('17:2766', { State: 'Default' }, { Label: label }); c.name = 'Chip — ' + label; return c; }

if (need(M404)) {
  const S = await mshell(M404, 120, 160, { auth: await authOf('54:101512') }); const C = S.C;
  const b = mbanner(C, 'Banner — 404 art (cropped)', 230); const a = art404(); a.rescale(0.5); abs(b, a, 44, 18);
  await heading(C, await statusChip('warn', 'Error 404 · Page not found', 'alert-circle'), 'This page rolled off the table', await dtext('54:101512', 'We couldn', 'We couldn’t find the page you asked for. The link may be out of date or the page has moved. Your balance, entries and open bets are not affected.'));
  const rq = AL('HORIZONTAL', { name: 'Requested', gap: 8, align: 'CENTER', wrap: true, cgap: 6 }); const chipU = AL('HORIZONTAL', { name: 'URL chip', fill: 'surface/raised', r: 6, p: [6, 10, 6, 10], gap: 6, align: 'CENTER' }); stroke(chipU, 'border/default'); add(chipU, await IC('link', 14, 'icon/muted'), await T('/promotions/autumn-raffle', 'Mono/S', 'text/secondary'));
  add(rq, await T('Requested', 'Caption', 'text/tertiary'), chipU, await T('· HTTP 404', 'Caption', 'text/tertiary')); add(C, [rq, 'FILL']);
  await stack(C, [await BTN('Primary', 'Back to lobby', { size: 'L', lead: 'home' }), await BTN('Secondary', 'Browse games', { size: 'L', lead: 'games' })]);
  const si = box('Search instead', { gap: 12 }); add(si, await T('Search instead', 'Heading/H5', 'text/primary'), [await T('Find a game, a round number or a help article.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const srch = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); srch.name = 'Input/Search'; add(si, [srch, 'FILL'], await T('Popular searches', 'Caption', 'text/tertiary'));
  const cs = AL('HORIZONTAL', { name: 'Popular searches', gap: 8, wrap: true, cgap: 8 }); for (const l of ['Orbit Rush', 'Round #1,248', 'Withdrawals', 'Provably fair', 'Daily rewards', 'Responsible gaming']) add(cs, await chip(l)); add(si, [cs, 'FILL']); add(C, [si, 'FILL']);
  add(C, [await mhead('WHERE TO NEXT', 'Pick up where you were going'), 'FILL']);
  const ql = box('Where to next', { gap: 0, p: [4, 16, 4, 16] });
  add(ql, [await navRow('pool', 'Global Pool', 'Round #1,248 is open and closes 27 Nov 2026, 20:00 UTC.', { line: true, demo: true, tint: 'accent/gold-tint', ic: 'icon/gold' }), 'FILL'], [await navRow('gift', 'Promotions', 'Welcome offer, daily rewards and races — terms apply.', { line: true }), 'FILL'], [await navRow('help-circle', 'Help centre & support', 'Deposits, withdrawals, KYC and limits — or chat with support 24/7.', { line: true }), 'FILL']);
  const stR = await navRow('activity', 'Status page', 'Checked 27 Nov 2026, 16:42 UTC'); const stT = stR.children[1]; add(stT, await statusChip('ok', 'All systems operational')); add(ql, [stR, 'FILL']); add(C, [ql, 'FILL']);
  add(C, [await mhead('POPULAR RIGHT NOW', 'Jump back in', await DEMO('XS')), 'FILL']);
  const g = AL('HORIZONTAL', { name: 'Tiles — 2-column grid', gap: 16, wrap: true, cgap: 16 }); add(C, [g, 'FILL']);
  for (const [gm, n, tg] of [['Global Pool', '3,412', 'HOT'], ['Orbit Rush', '1,062', 'HOT'], ['Skyline', '206', 'NEW'], ['Vault Sweeper', '146', 'NEW']]) add(g, await tile(gm, n, tg));
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}

if (need(M500)) {
  const S = await mshell(M500, 630, 160, { auth: await authOf('82:102573') }); const C = S.C;
  const b = mbanner(C, 'Banner — 500 art: out-of-order slot machine (cropped)', 240, { block: 'status/danger-tint', stripe: 'status/danger' }); const a = await art500(true); a.rescale(0.5); abs(b, a, 56, 14);
  await heading(C, await statusChip('bad', 'Error 500 · Server error', 'alert-triangle'), 'Something went wrong on our side', await dtext('82:102573', 'Our server hit', 'Our server hit an unexpected error while loading this page — it’s not something you did. Try again in a moment. If it keeps happening, check the status page or contact support.'));
  const inc = box('Reference ID', { gap: 10, fill: 'surface/raised', stroke: 'border/default' });
  const ir = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ir, await T('REFERENCE ID', 'Overline', 'text/tertiary'), await DEMO('XS')); add(inc, ir);
  const idr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(idr, [await T('GP-500-7F3A-9C21', 'Mono/M', 'text/primary'), 'FILL']); const cp = await I('7:774', { Type: 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.copy }); cp.name = 'Copy reference (44 px)'; add(idr, cp); add(inc, [idr, 'FILL']);
  const tm = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(tm, await T('Time', 'Caption', 'text/tertiary'), await T('27 Nov 2026, 16:42:18 UTC', 'Mono/S', 'text/secondary')); add(inc, tm); add(C, [inc, 'FILL']);
  const acts = await stack(C, [await BTN('Primary', 'Try again', { size: 'L', lead: 'refresh' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' })]);
  const sf = AL('HORIZONTAL', { name: 'Still failing', gap: 6, align: 'CENTER', wrap: true, cgap: 0 }); add(sf, await IC('chat', 16, 'icon/muted'), await T('Still failing? Quote the reference ID —', 'Caption', 'text/secondary'), await linkRow('Contact support')); add(acts, [sf, 'FILL']);
  const safe = box('Reassurance', { gap: 0, p: [4, 16, 4, 16] });
  add(safe, [await navRow('shield-check', 'Your funds are safe', 'A server error never changes balances, entries or results. Every movement is written to the ledger first, and on-chain settlements are final.', { line: true, tint: 'status/success-tint', ic: 'text/success', chev: false }), 'FILL']);
  add(safe, [await navRow('pool', 'Global Pool keeps its schedule', 'Confirmed entries stay in the round; the close time and Chainlink VRF draw are not affected. Round #1,248 · closes 20:00 UTC.', { line: true, demo: true, tint: 'accent/gold-tint', ic: 'icon/gold', chev: false }), 'FILL']);
  add(safe, [await navRow('dice', 'Mid-game? Your bet is settled', 'The outcome is still settled from the committed seed. Check Bet history and verify it under Provably Fair.'), 'FILL']); add(C, [safe, 'FILL']);
  const st = box('Live status', { gap: 0, p: [14, 16, 4, 16] }); const sh = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(sh, [await T('Live status', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('M')); add(st, [sh, 'FILL'], await T('Updated 27 Nov 2026, 16:42 UTC', 'Caption', 'text/tertiary'));
  add(st, [await svcRow('monitor', 'Website & lobby', 'warn', 'Degraded', 'Elevated error rate on some pages. Investigating since 16:38 UTC.', true), 'FILL'], [await svcRow('games', 'Games — Originals, tables, slots', 'ok', 'Operational', 'Bets and settlements running normally.', true), 'FILL'], [await svcRow('wallet', 'Wallet — deposits & withdrawals', 'ok', 'Operational', 'All 5 networks processing. Ethereum is congested (slower).', true), 'FILL'], [await svcRow('pool', 'Global Pool & VRF draws', 'ok', 'Operational', 'Round #1,248 open; draw scheduled 20:00 UTC.', false), 'FILL'], await linkRow('status.globalpool.example', 'external-link'));
  add(C, [st, 'FILL']);
  await mlic(C);
  await mfinish(S, { tab: 'Home' }); audit(S.f); shots.push(S.f);
}

if (need(MMNT)) {
  const S = await mshell(MMNT, 1140, 160, { auth: await authOf('82:103376'), gap: 24 }); const C = S.C;
  const b = mbanner(C, 'Banner — ticket stub + wrench (cropped)', 220, { bx: 200 }); const tk = await ticket(0.72); abs(b, tk, 26, 48, 8); const wr = artWrench(); wr.rescale(0.5); abs(b, wr, 282, -20, -30);
  await heading(C, await statusChip('work', 'Scheduled maintenance · AN-88', 'wrench'), 'Games are paused for a 30-minute upgrade', await dtext('82:103376', 'We’re upgrading', await dtext('82:103376', "We're upgrading", 'We’re upgrading the game servers and the ledger database. Withdrawals stay open the whole time and your balance is safe. Games reopen automatically when the work is done.')));
  const kv = box('Window & status', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', stroke: 'border/default' });
  for (const [k, v, ic, i] of [['Window', '1 Dec 2026, 02:00 – 02:30 UTC', null, 0], ['Status', 'In progress', 'spinner', 1], ['Last update', '02:12 UTC', null, 2]]) { const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < 2) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 100 }), 'FILL']); const vv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); if (ic) add(vv, await IC(ic, 14, 'text/info')); add(vv, await T(v, 'Label/M', ic ? 'text/info' : 'text/primary')); add(r, vv); add(kv, [r, 'FILL']); }
  add(C, [kv, 'FILL']);
  const wd = box('Available to withdraw now', { gap: 8, fill: 'surface/selected', stroke: 'border/brand' }); add(wd, await T('Available to withdraw now', 'Caption', 'text/secondary')); const am = AL('HORIZONTAL', { gap: 6, align: 'MAX' }); add(am, await T('9,215.30', 'Number/L', 'balance/available'), await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(wd, am);
  add(wd, [await T('Locked 1,850.00 · Pending 1,000.00 · Owed 415.20 USDT — locked funds include pending withdrawal WD-20931, which keeps processing.', 'Caption', 'text/secondary', { w: 326 }), 'FILL'], await linkRow('Go to wallet')); add(C, [wd, 'FILL']);
  add(C, [await mhead('WHAT WORKS DURING MAINTENANCE', 'Only play is paused'), 'FILL'], [await T('Everything that touches your money out of the platform stays open.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const ww = box('What works during maintenance', { gap: 0, p: [4, 16, 4, 16] });
  const items = [['withdraw', 'Withdrawals', 'ok', 'Available', 'Request as usual from Wallet. Network fees are shown before you confirm; manual reviews may take a little longer tonight.'], ['shield-check', 'Limits, cooling-off & self-exclusion', 'ok', 'Available', 'Responsible-gaming tools keep working and changes apply as normal.'], ['chat', 'Support', 'ok', 'Available', 'Chat and email stay open 24/7.'], ['deposit', 'Deposits', 'clock', 'Credited after maintenance', 'Deposits sent now are detected on-chain and credited automatically after 02:30 UTC. Please don’t send them twice.'], ['games', 'Games', 'pause', 'Paused', 'Originals, table games, slots and live tables reopen at 02:30 UTC. All bets were closed and settled before 02:00 UTC.'], ['pool', 'Global Pool', 'pause', 'No open round', 'No round is open during this window. The next round opens as scheduled at 08:00 UTC.']];
  for (let i = 0; i < items.length; i++) { const [ic, n, k, l, d] = items[i]; add(ww, [await svcRow(ic, n, k, l, d, i < items.length - 1), 'FILL']); }
  add(C, [ww, 'FILL']);
  const pg = box('Progress', { gap: 0, p: [14, 16, 6, 16] }); add(pg, await T('Progress', 'Heading/H5', 'text/primary'));
  const steps = [['check-circle', 'text/success', 'New bets paused', '02:00 UTC'], ['check-circle', 'text/success', 'Open game rounds settled', '02:01 UTC'], ['spinner', 'text/info', 'Game servers & ledger database upgrade', 'In progress'], ['clock', 'icon/muted', 'Reconciliation check — ledger vs on-chain', 'Up next'], ['clock', 'icon/muted', 'Games reopen', 'by 02:30 UTC']];
  for (const [ic, col, t, w] of steps) { const r = AL('HORIZONTAL', { name: 'Step — ' + t, gap: 10, p: [10, 0, 10, 0], align: 'CENTER' }); add(r, await IC(ic, 18, col), [await T(t, 'Body/S', 'text/primary', { w: 200 }), 'FILL'], await T(w, 'Caption', col === 'icon/muted' ? 'text/tertiary' : col)); add(pg, [r, 'FILL']); }
  add(C, [pg, 'FILL']);
  const tg = await I('20:3309', { On: 'No', State: 'Default' }, { Label: 'Email me when games reopen', Description: 'Sent to n•••@example.com · off by default', 'Show description': true }); tg.name = 'Control/Toggle — Email me when games reopen (off)'; add(C, [tg, 'FILL']);
  const q = AL('HORIZONTAL', { name: 'Support line', gap: 6, align: 'CENTER', wrap: true, cgap: 0 }); add(q, await IC('chat', 16, 'icon/muted'), await T('Questions about a deposit or withdrawal?', 'Caption', 'text/secondary'), await linkRow('Contact support')); add(C, [q, 'FILL']);
  await mlic(C, 'Responsible-gaming tools stay available during maintenance. 18+ · permitted jurisdictions only.');
  const stk = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 8 }); strokeSides(stk, 'border/subtle', { t: 1 });
  const sr = AL('HORIZONTAL', { gap: 8 }); add(sr, [await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' }), 'FILL'], [await BTN('Secondary', 'Status page', { size: 'L', trail: 'external-link' }), 'FILL']); add(stk, [sr, 'FILL']);
  await mfinish(S, { sticky: stk, tab: 'Wallet' }); audit(S.f); shots.push(S.f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.6 });
return OUT;
