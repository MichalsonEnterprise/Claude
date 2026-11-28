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
// ===== ACCOUNT KIT CORE (usr-account agent) =====
const FORCE = false; // true = rebuild frames that already exist (by exact name)
const LOG = [];
// AL with one fixed dimension and the other hugging (helpers' AL leaves both FIXED after resize)
function ALX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'HORIZONTAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } return f; }
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
async function tryy(label, fn) { try { return await fn(); } catch (e) { LOG.push(label + ': ' + String((e && e.message) || e).slice(0, 160)); return null; } }
async function setTxt(t, s) { const fs = t.characters.length ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const f of fs) await figma.loadFontAsync(f); t.characters = s; }
async function byLayer(root, map) { const hit = []; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (Object.prototype.hasOwnProperty.call(map, t.name)) { await setTxt(t, map[t.name]); hit.push(t.name); } } return hit; }
async function repl(root, from, to) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(from)) { await setTxt(t, t.characters.split(from).join(to)); n++; } } return n; }
function setP(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14 }); }
function meter(w, pct, color = 'brand/primary', h = 8) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function chip(icon, label, tone = 'success') { const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 4, p: [4, 10, 4, 8], fill: tk('status/' + tone + '-tint'), r: 9999, align: 'CENTER' }); c.appendChild(await IC(icon, 14, tk('status/' + tone, 'icon/default'))); c.appendChild(await T(label, 'Label/S', tk('text/' + tone, tk('status/' + tone, 'text/secondary')))); return c; }
async function tag(label, tone) { const c = AL('HORIZONTAL', { name: 'Tag — ' + label, p: [4, 10, 4, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 9999 }); c.appendChild(await T(label, 'Label/S', tone || 'text/secondary')); return c; }
async function noteBox(icon, text, tone, w) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function secHead(title, sub, w = 760) { const s = AL('VERTICAL', { name: 'Header — ' + title, gap: 4 }); s.appendChild(await T(title, 'Heading/H5', 'text/primary')); if (sub) s.appendChild(await T(sub, 'Body/S', 'text/secondary', { w })); return s; }
// card header: title + optional sub on the left, extra nodes on the right
async function head(c, title, sub, w, right = []) { const h = AL('HORIZONTAL', { name: 'Card header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(h, [tt, 'FILL']); add(tt, [await T(title, 'Heading/H5', 'text/primary', { w: w - 200 }), 'FILL']); if (sub) add(tt, [await T(sub, 'Body/S', 'text/secondary', { w: w - 200 }), 'FILL']); for (const r of right) if (r) h.appendChild(r); return h; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: o.p ?? [12, 0, 12, 0] }); const l = await T(label, 'Body/S', 'text/secondary'); if (o.lw) { l.resize(o.lw, l.height); l.textAutoResize = 'HEIGHT'; r.appendChild(l); } else add(r, [l, 'FILL']); const v = await T(value, o.style || 'Body/S Strong', o.color || 'text/primary', o.vw ? { w: o.vw } : {}); if (o.lw) add(r, [v, 'FILL']); else r.appendChild(v); for (const x of (o.extra || [])) r.appendChild(x); if (o.demo !== false) r.appendChild(await DEMO('XS')); if (o.divider !== false) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
async function bullet(icon, title, body, w, color = 'icon/brand') { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12 }); r.appendChild(await iconTile(icon, color, 32)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/S Strong', 'text/primary', { w: w - 44 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: w - 44 }), 'FILL']); return r; }
async function check(text, ok, w, tone) { const r = AL('HORIZONTAL', { name: 'Check — ' + text.slice(0, 30), gap: 8, align: 'MIN' }); const t2 = tone || (ok ? 'success' : 'danger'); r.appendChild(await IC(ok ? 'check-circle' : 'x-circle', 18, tk('status/' + t2, 'icon/default'))); add(r, [await T(text, 'Body/S', 'text/primary', { w: w - 26 }), 'FILL']); return r; }
// setting row: icon tile | title + desc | right nodes
async function srow(icon, title, desc, right = [], o = {}) { const r = AL('HORIZONTAL', { name: 'Setting — ' + title, gap: 16, align: 'CENTER', p: o.p ?? [16, 0, 16, 0] }); if (o.divider !== false) strokeSides(r, 'border/subtle', { t: 1 }); r.appendChild(await iconTile(icon, o.ic || 'icon/brand', 40)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: o.tw || 360 }), 'FILL']); if (desc) add(tx, [await T(desc, 'Body/S', 'text/secondary', { w: o.tw || 360 }), 'FILL']); for (const x of right) if (x) r.appendChild(x); return r; }
function scrimOver(f, tok = 'scrim/overlay') { const s = rect(f.width, f.height, tk(tok, 'scrim/strong'), 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
function floatIn(f, n, x, y) { f.appendChild(n); n.layoutPositioning = 'ABSOLUTE'; n.x = x; n.y = y; return n; }
function byName(sec, name) { return sec.children.find(c => c.name === name); }
// returns null when the frame should be built, or a 'skipped' result when it already exists
function skipIf(sec, name) { const old = byName(sec, name); if (!old) return null; if (FORCE) { old.remove(); return null; } return { skipped: true, frame: old.id, name, h: Math.round(old.height) }; }
function colX(col, step) { return 120 + col * step; }
// place a frame: column x; y = below the last frame in that column (and band). bandFn(name) -> 0|1 splits a section into bands
async function place(f, sec, col, step, bandFn) {
  const bf = bandFn || (() => 0); const band = bf(f.name); const x = colX(col, step);
  const others = sec.children.filter(c => c.id !== f.id);
  const same = others.filter(c => Math.abs(c.x - x) < 10 && bf(c.name) === band);
  let y;
  if (same.length) y = Math.max(...same.map(c => c.y + c.height)) + 160;
  else if (band === 0) y = 160;
  else { const b1 = others.filter(c => bf(c.name) === band); if (b1.length) y = Math.min(...b1.map(c => c.y)); else { const b0 = others.filter(c => bf(c.name) < band); y = (b0.length ? Math.max(...b0.map(c => c.y + c.height)) : 12000) + 480; } }
  sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f;
}
async function sbNone(sb) { for (const it of sb.findAllWithCriteria({ types: ['INSTANCE'] })) { const mc = it.mainComponent; if (!mc || !mc.parent || mc.parent.name !== 'Shell/Sidebar Item') continue; const p = it.componentProperties; if (p.State && p.State.value === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } }
async function btnIcon(icon, type = 'Ghost', size = 'S') { return await I('7:774', { Type: type, Size: size, State: 'Default' }, { Icon: ICONS[icon] }); }
// inline modal with Modal/Base anatomy (Modal/Base body is a fixed placeholder slot)
async function modalBox(title, desc, w = 560) {
  const m = ALX('VERTICAL', { name: 'Modal — ' + title, fill: 'surface/overlay', stroke: 'border/subtle', r: 20, w }); await fx(m, 'Elevation/4 — Modal');
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 16, p: [24, 24, 16, 24] }); add(m, [hd, 'FILL']);
  const ht = AL('VERTICAL', { name: 'Title', gap: 4 }); add(hd, [ht, 'FILL']); add(ht, [await T(title, 'Heading/H4', 'text/primary', { w: w - 104 }), 'FILL']); if (desc) add(ht, [await T(desc, 'Body/S', 'text/secondary', { w: w - 104 }), 'FILL']);
  hd.appendChild(await btnIcon('x', 'Ghost', 'M'));
  const bd = AL('VERTICAL', { name: 'Body', gap: 16, p: [8, 24, 24, 24] }); add(m, [bd, 'FILL']);
  const ft = AL('HORIZONTAL', { name: 'Footer', gap: 12, p: [16, 24, 24, 24], justify: 'MAX', align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 }); add(m, [ft, 'FILL']);
  return { m, bd, ft, W: w - 48 };
}
// illustrative QR-style code (DEMO) — deterministic pseudo-random modules + finder squares
function qrArt(size = 168, n = 25) {
  const f = figma.createFrame(); f.name = 'QR — illustrative (DEMO)'; f.resize(size, size); fill(f, 'text/primary'); f.clipsContent = true; radius(f, 6);
  const cell = Math.floor((size - 16) / n); const off = Math.floor((size - cell * n) / 2); let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const finder = (cx, cy) => { for (const [d, tok] of [[7, 'bg/base'], [5, 'text/primary'], [3, 'bg/base']]) { const r = rect(cell * d, cell * d, tok, 0, 'Finder'); f.appendChild(r); r.x = off + (cx + (7 - d) / 2) * cell; r.y = off + (cy + (7 - d) / 2) * cell; } };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); if (inF) continue; if (rnd() < 0.46) { const r = rect(cell, cell, 'bg/base', 0, 'm'); f.appendChild(r); r.x = off + x * cell; r.y = off + y * cell; } }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  return f;
}
async function shotOf(f) { await tryy('screenshot ' + f.name, async () => { await f.screenshot({ scale: 0.5 }); }); }
// ===== END ACCOUNT KIT CORE =====
// ===== ACCOUNT KIT — DESKTOP SHELL =====
const STEP = 1560; // 1440 + 120
const MW = 856;    // main column width (1136 content − 256 sub-nav − 24 gap)
const CW = MW - 48; // inner width of a padded card in main
// desktop section is split into two bands: A1–A5 (band 0) and A6–A10 (band 1) — the section has ~12,000 px before USR-F1..F6 at X=36000
const BANDF = (n) => { const m = /\[USR-A(\d+)\]/.exec(n); return m && +m[1] >= 6 ? 1 : 0; };
const NAV = [
  ['Profile', [['Personal information', 'user'], ['Notification preferences', 'bell']]],
  ['Security', [['Security overview', 'shield-check'], ['Two-factor authentication', 'key'], ['Anti-phishing code', 'mail'], ['Login history', 'history'], ['Connected devices', 'monitor'], ['Session management', 'activity']]],
  ['Verification', [['KYC status', 'id-card'], ['Verification documents', 'file']]],
];
function groupOf(label) { for (const [g, items] of NAV) if (items.some(i => i[0] === label)) return g; return 'Account'; }
async function navItem(label, icon, on) {
  const it = await tryy('navItem ' + label, async () => { const x = await I('22:8712', { State: on ? 'Active' : 'Default', Collapsed: 'No' }, { Label: label, Icon: ICONS[icon], 'Show badge': false, 'Show count': false, 'Show chevron': false }); const ic = x.findOne(n => n.name === 'Icon'); if (ic) { ic.resize(20, 20); tint(ic, on ? 'icon/brand' : 'icon/muted'); } return x; });
  if (it) { it.name = 'Sub-nav — ' + label; return it; }
  const r = AL('HORIZONTAL', { name: 'Sub-nav — ' + label, gap: 12, p: [8, 12, 8, 12], align: 'CENTER', r: 10, fill: on ? 'brand/tint' : null });
  r.appendChild(await IC(icon, 20, on ? 'icon/brand' : 'icon/muted')); r.appendChild(await T(label, 'Label/M', on ? 'text/brand' : 'text/secondary')); return r;
}
async function subnav(active) {
  const c = ALX('VERTICAL', { name: 'Account sub-nav', gap: 16, p: [16, 12, 16, 12], fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 256 });
  const u = AL('HORIZONTAL', { name: 'Account holder', gap: 12, align: 'CENTER', p: [0, 4, 16, 4] }); add(c, [u, 'FILL']); strokeSides(u, 'border/subtle', { b: 1 });
  u.appendChild(await I('9:238', { Size: 'M' }, { Initials: 'NK', 'Show status': false }));
  const ut = AL('VERTICAL', { name: 'Name', gap: 2 }); add(u, [ut, 'FILL']); ut.appendChild(await T('Nova K.', 'Body/S Strong', 'text/primary')); ut.appendChild(await T('@nova.k · GP-48213', 'Caption', 'text/tertiary'));
  u.appendChild(await DEMO('XS'));
  for (const [g, items] of NAV) {
    const grp = AL('VERTICAL', { name: 'Group — ' + g, gap: 2 }); add(c, [grp, 'FILL']);
    const gl = AL('HORIZONTAL', { name: 'Group label', p: [0, 8, 4, 8] }); add(grp, [gl, 'FILL']); gl.appendChild(await T(g, 'Overline', 'text/tertiary'));
    for (const [label, icon] of items) add(grp, [await navItem(label, icon, label === active), 'FILL']);
  }
  const lo = AL('HORIZONTAL', { name: 'Footer', p: [12, 0, 0, 0] }); add(c, [lo, 'FILL']); strokeSides(lo, 'border/subtle', { t: 1 }); lo.appendChild(await BTN('Ghost', 'Log out', { size: 'S', lead: 'logout' }));
  return c;
}
// Desktop page: DEMOBAR → [Shell/Sidebar | Topbar → Content(breadcrumb, title, [sub-nav | main])]
async function shellA(name, active, o = {}) {
  const f = await screen(name, 1440, {}); add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  await tryy('sbNone', () => sbNone(sb));
  const col = AL('VERTICAL', { name: 'Main column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Member' }); add(col, [tb, 'FILL']);
  if (o.banner) add(col, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [32, 32, 48, 32] }); add(col, [C, 'FILL']);
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 8, align: 'CENTER' }); C.appendChild(crumb);
  const parts = ['Account', groupOf(active), active];
  for (let i = 0; i < parts.length; i++) { if (i) crumb.appendChild(await IC('chevron-right', 14, 'icon/muted')); crumb.appendChild(await T(parts[i], 'Body/S', i === parts.length - 1 ? 'text/primary' : 'text/tertiary')); }
  const hr = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX' }); add(C, [hr, 'FILL']);
  const hl = AL('VERTICAL', { name: 'Title', gap: 8 }); add(hr, [hl, 'FILL']);
  hl.appendChild(await T(o.title || active, 'Heading/H2', 'text/primary'));
  if (o.sub) hl.appendChild(await T(o.sub, 'Body/M', 'text/secondary', { w: 720 }));
  const hra = AL('HORIZONTAL', { name: 'Title actions', gap: 12, align: 'CENTER' }); hr.appendChild(hra);
  hra.appendChild(await DEMO('M')); for (const a of (o.actions || [])) if (a) hra.appendChild(a);
  const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [cols, 'FILL']);
  cols.appendChild(await subnav(active));
  const main = AL('VERTICAL', { name: 'Main', gap: 24 }); add(cols, [main, 'FILL']);
  return { f, sb, tb, col, C, main };
}
async function footA(S) { const lic = await I('6:158', { Variant: 'Inline' }); add(S.C, [lic, 'FILL']); return lic; }
// modal over the page: scrim + centred modal near the top of the viewport
async function overlay(S, m, y = 168) { scrimOver(S.f); floatIn(S.f, m, Math.round((1440 - m.width) / 2), y); return m; }
// ===== END ACCOUNT KIT — DESKTOP SHELL =====
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-A1..A10 Account & security', 24000, 0);
async function a5() {
const NAME = '[USR-A5] Verification Documents / 1440 / Default';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Verification documents', { sub: 'Documents you’ve shared for identity checks. Previews are blurred here for your privacy — only our compliance team can open the full files.', actions: [await BTN('Secondary', 'Download my documents', { size: 'M', lead: 'download' })] });
const M = S.main;
const oc = card('Card — On file', { gap: 0 }); add(M, [oc, 'FILL']);
await head(oc, 'On file', '2 approved documents · KYC Level 2', CW, [await DEMO('S')]);
const sp = AL('VERTICAL', { name: 'Spacer', h: 8 }); add(oc, [sp, 'FILL']);
async function doc(icon, title, file, meta, st, right) {
  const r = AL('HORIZONTAL', { name: 'Document — ' + title, gap: 16, align: 'CENTER', p: [16, 0, 16, 0] }); strokeSides(r, 'border/subtle', { t: 1 });
  const th = AL('HORIZONTAL', { name: 'Preview (blurred)', w: 88, h: 60, r: 10, align: 'CENTER', justify: 'CENTER', stroke: 'border/subtle', clip: true }); await tryy('skeleton', () => gfill(th, 'Gradient/Skeleton')); if (!th.fills.length) fill(th, 'surface/raised'); th.appendChild(await IC(icon, 24, 'icon/muted')); r.appendChild(th);
  const tx = AL('VERTICAL', { name: 'Text', gap: 4 }); add(r, [tx, 'FILL']);
  add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: 420 }), 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'File', gap: 8, align: 'CENTER' }); tx.appendChild(fr); fr.appendChild(await T(file, 'Mono/S', 'text/secondary')); fr.appendChild(await DEMO('XS'));
  add(tx, [await T(meta, 'Caption', 'text/tertiary', { w: 420 }), 'FILL']);
  r.appendChild(st); if (right) r.appendChild(right); return r;
}
add(oc, [await doc('id-card', 'Passport — photo page', 'passport_photo_page_2.jpg · 2.4 MB', 'Uploaded 3 Sep 2026, 09:14 UTC · approved 3 Sep 2026, 13:40 UTC · valid until 18 Jun 2031', await chip('check-circle', 'Approved', 'success'), await btnIcon('more')), 'FILL']);
add(oc, [await doc('face-scan', 'Selfie video — liveness check', 'liveness_2026-09-03.mp4 · 6.1 MB', 'Recorded 3 Sep 2026, 09:16 UTC · approved 3 Sep 2026, 13:40 UTC · used only to match you to your ID', await chip('check-circle', 'Approved', 'success'), await btnIcon('more')), 'FILL']);
add(oc, [await doc('id-card', 'Passport — earlier upload', 'passport_photo_page_1.jpg · 1.9 MB', 'Uploaded 2 Sep 2026, 21:03 UTC · not accepted: photo too blurry · replaced by the upload above', await chip('rotate-ccw', 'Replaced', 'info'), null), 'FILL']);
// requested
const rq = card('Card — Requested by us', { gap: 12 }); add(M, [rq, 'FILL']);
const rh = AL('HORIZONTAL', { name: 'Header', gap: 16, align: 'CENTER' }); add(rq, [rh, 'FILL']); rh.appendChild(await iconTile('check-circle', tk('status/success', 'icon/brand'), 40));
const rt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(rh, [rt, 'FILL']); add(rt, [await T('Nothing requested right now', 'Body/M Strong', 'text/primary', { w: 560 }), 'FILL']);
add(rt, [await T('If we ever need more — for example source of funds for Level 3 — it appears here and by email, with the reason and a deadline. We never ask for documents by chat, phone or social media.', 'Body/S', 'text/secondary', { w: 560 }), 'FILL']);
// upload
const up = card('Card — Upload a document', { gap: 16 }); add(M, [up, 'FILL']);
await head(up, 'Upload a document', 'Moving house or applying for Level 3? Add a document here — we’ll review it within 2 business days.', CW);
const ur = AL('HORIZONTAL', { name: 'Upload row', gap: 24 }); add(up, [ur, 'FILL']);
const ul = AL('VERTICAL', { name: 'Form', gap: 16 }); add(ur, [ul, 'FILL']);
const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Document type', Value: 'Proof of address — Level 3', 'Show helper': false, 'Show leading icon': false })); if (sf) add(ul, [sf, 'FILL']);
const fu = await tryy('file upload', () => I('20:9454', { State: 'Empty' }, { Label: 'Your file', Description: 'Drag a file here or browse · JPG, PNG or PDF up to 10 MB', 'Show privacy note': true })); if (fu) add(ul, [fu, 'FILL']);
const req = ALX('VERTICAL', { name: 'Card — Requirements', gap: 10, p: 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 300 }); ur.appendChild(req);
req.appendChild(await T('Proof of address must…', 'Label/L', 'text/primary'));
for (const t of ['be issued in the last 3 months', 'show your name and Rua das Flores 12, Lisboa', 'be a utility bill, bank statement or tax letter', 'be the original file — no screenshots or edits']) add(req, [await check(t, true, 260, 'info'), 'FILL']);
await footA(S);
await place(S.f, sec, 4, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}

async function a6() {
const NAME = '[USR-A6] Login History / 1440 / Suspicious sign-in flagged';
const sk = skipIf(sec, NAME); if (sk) return sk;
const S = await shellA(NAME, 'Login history', { sub: 'Every sign-in attempt on your account in the last 12 months. Flagged entries are unusual for you — check them and tell us if one wasn’t you.', actions: [await BTN('Secondary', 'Export CSV', { size: 'M', lead: 'download' })] });
const M = S.main;
// flagged banner
const fb = AL('HORIZONTAL', { name: 'Flagged sign-in', gap: 16, p: 20, fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default'), r: 14 }); add(M, [fb, 'FILL']);
fb.appendChild(await iconTile('shield-alert', tk('status/warning', 'icon/default'), 48, 'surface/default'));
const ft = AL('VERTICAL', { name: 'Text', gap: 6 }); add(fb, [ft, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); add(ft, [fh, 'FILL']); add(fh, [await T('Was this you? Windows · Edge in Madrid, Spain', 'Body/M Strong', 'text/primary', { w: 480 }), 'FILL']); fh.appendChild(await DEMO('S'));
add(ft, [await T('25 Nov 2026, 22:41 UTC · first sign-in from this device and from Spain · 2FA passed after 1 wrong code at 22:39 UTC. The session is still active.', 'Body/S', 'text/secondary', { w: 560 }), 'FILL']);
const fa = AL('HORIZONTAL', { name: 'Actions', gap: 8, p: [6, 0, 0, 0] }); ft.appendChild(fa); fa.appendChild(await BTN('Secondary', 'Yes, it was me', { size: 'S', lead: 'check' })); fa.appendChild(await BTN('Danger', 'No — secure my account', { size: 'S', lead: 'shield' }));
add(ft, [await T('Securing your account ends every session, revokes the Madrid device and asks you to set a new password. Your funds and pending withdrawal WD-20931 stay where they are.', 'Caption', 'text/tertiary', { w: 560 }), 'FILL']);
// filters
const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, align: 'CENTER' }); add(M, [fr, 'FILL']);
for (const [l, on] of [['All · 24', true], ['Successful · 19', false], ['Failed · 3', false], ['Flagged · 2', false]]) { const c = await tryy('chip ' + l, () => I('17:2766', { State: on ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); if (c) fr.appendChild(c); else fr.appendChild(await tag(l)); }
const spc = AL('HORIZONTAL', { name: 'Spacer' }); add(fr, [spc, 'FILL']);
fr.appendChild(await BTN('Secondary', 'Last 30 days', { size: 'S', lead: 'calendar', trail: 'chevron-down' }));
// table
const tb = AL('VERTICAL', { name: 'Table — Sign-ins', fill: 'bg/secondary', stroke: 'border/subtle', r: 14, clip: true }); add(M, [tb, 'FILL']);
const COLS = [['Date & time', 168], ['Device & method', 244], ['Location', 164], ['IP address', 152], ['Result', 128]];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); add(tb, [hr, 'FILL']); strokeSides(hr, 'border/subtle', { b: 1 });
for (const [l, w] of COLS) {
  const h = await tryy('hdr ' + l, async () => { const x = await I('22:8309', { Align: 'Left', Sort: l === 'Date & time' ? 'Desc' : 'None' }, { Label: l, 'Show sort icon': l === 'Date & time' }); x.resize(w, x.height); return x; });
  if (h) hr.appendChild(h); else { const c = ALX('HORIZONTAL', { name: 'Header — ' + l, p: [12, 16, 12, 16], w }); c.appendChild(await T(l, 'Overline', 'text/tertiary')); hr.appendChild(c); }
}
const ROWS = [
  ['27 Nov 2026', '16:00 UTC', 'MacBook Pro · Chrome 131', 'Password + 2FA · this browser', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['27 Nov 2026', '08:12 UTC', 'iPhone 15 · Safari', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['26 Nov 2026', '21:14 UTC', 'iPhone 15 · Safari', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.40', 'ok'],
  ['25 Nov 2026', '22:41 UTC', 'Windows · Edge 131', 'Password + 2FA · new device', 'Madrid, Spain', '213.97.•••.88', 'flag'],
  ['25 Nov 2026', '22:39 UTC', 'Windows · Edge 131', 'Wrong 2FA code · new device', 'Madrid, Spain', '213.97.•••.88', 'flagfail'],
  ['24 Nov 2026', '09:05 UTC', 'MacBook Pro · Chrome 131', 'Password + 2FA', 'Lisbon, Portugal', '85.243.•••.12', 'ok'],
  ['22 Nov 2026', '19:47 UTC', 'Unknown · Firefox 132', 'Wrong password', 'Sofia, Bulgaria', '46.10.•••.203', 'fail'],
  ['22 Nov 2026', '19:45 UTC', 'Unknown · Firefox 132', 'Wrong password · sign-in paused 15 min after this', 'Sofia, Bulgaria', '46.10.•••.203', 'fail'],
];
async function cell(w, a, b, o = {}) { const c = ALX('VERTICAL', { name: 'Cell', gap: 2, p: [12, 16, 12, 16], w }); add(c, [await T(a, o.mono ? 'Mono/S' : 'Body/S', 'text/primary', { w: w - 32 }), 'FILL']); if (b) add(c, [await T(b, 'Caption', o.bTone || 'text/tertiary', { w: w - 32 }), 'FILL']); return c; }
for (const r of ROWS) {
  const fl = r[6].startsWith('flag');
  const row = AL('HORIZONTAL', { name: 'Row — ' + r[0] + ' ' + r[1], align: 'CENTER', fill: fl ? tk('status/warning-tint', 'surface/default') : null });
  add(tb, [row, 'FILL']); strokeSides(row, fl ? tk('status/warning', 'border/default') : 'border/subtle', fl ? { l: 3 } : { b: 1 });
  row.appendChild(await cell(168, r[0], r[1]));
  row.appendChild(await cell(244, r[2], r[3], { bTone: r[6] === 'ok' ? 'text/tertiary' : tk('text/warning', 'text/secondary') }));
  row.appendChild(await cell(164, r[4], null));
  const ip = ALX('HORIZONTAL', { name: 'Cell — IP', gap: 6, p: [12, 16, 12, 16], w: 152, align: 'CENTER' }); ip.appendChild(await T(r[5], 'Mono/S', 'text/primary')); ip.appendChild(await DEMO('XS')); row.appendChild(ip);
  const rc = ALX('HORIZONTAL', { name: 'Result', gap: 6, p: [12, 12, 12, 12], w: 128 }); row.appendChild(rc);
  const m = { ok: ['check-circle', 'Success', 'success'], flag: ['alert-triangle', 'Flagged', 'warning'], flagfail: ['x-circle', 'Failed', 'danger'], fail: ['x-circle', 'Failed', 'danger'] }[r[6]];
  rc.appendChild(await chip(m[0], m[1], m[2]));
}
const pg = await tryy('pagination', async () => { const p = await I('23:16756', { Type: 'Cursor' }); add(tb, [p, 'FILL']); return p; });
if (!pg) { const pr = AL('HORIZONTAL', { name: 'Pagination', p: [12, 16, 12, 16], gap: 8, align: 'CENTER' }); add(tb, [pr, 'FILL']); add(pr, [await T('Newest first · 8 of 24 sign-ins', 'Body/S', 'text/secondary'), 'FILL']); pr.appendChild(await BTN('Secondary', 'Previous', { size: 'S', state: 'Disabled' })); pr.appendChild(await BTN('Secondary', 'Next', { size: 'S' })); }
// how flags work
const hw = AL('HORIZONTAL', { name: 'Info row', gap: 24 }); add(M, [hw, 'FILL']); const HW = Math.floor((MW - 24) / 2) - 48;
const h1 = card('Card — Why we flag', { gap: 12 }); add(hw, [h1, 'FILL']); h1.layoutSizingVertical = 'FILL';
h1.appendChild(await T('Why we flag a sign-in', 'Heading/H5', 'text/primary'));
for (const t of ['A device or browser we haven’t seen before', 'A country you haven’t signed in from', 'Several wrong passwords or 2FA codes in a row']) add(h1, [await check(t, true, HW, 'warning'), 'FILL']);
const h2 = card('Card — Failed attempts', { gap: 12 }); add(hw, [h2, 'FILL']); h2.layoutSizingVertical = 'FILL';
h2.appendChild(await T('Failed attempts from Sofia', 'Heading/H5', 'text/primary'));
add(h2, [await T('Two wrong passwords on 22 Nov 2026 were blocked before any code was asked. After repeated failures we pause sign-ins for 15 minutes and email you. Using a unique password keeps this harmless.', 'Body/S', 'text/secondary', { w: HW }), 'FILL']);
h2.appendChild(await BTN('Ghost', 'Change password', { size: 'S', trail: 'chevron-right' }));
await footA(S);
await place(S.f, sec, 0, STEP, BANDF); await shotOf(S.f);
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };
}

const results = [];
results.push(await a5());
results.push(await a6());
return { section: sec.id, results, log: LOG };
