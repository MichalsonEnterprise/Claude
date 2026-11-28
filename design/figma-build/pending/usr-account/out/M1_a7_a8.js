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
// ===== ACCOUNT KIT — MOBILE (390) =====
const MSTEP = 510; const W = 358; const IW = W - 32; // inner width of a 16-padded card
async function shellM(name, o = {}) {
  const f = await screen(name, 390, {}); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  if (o.back !== false) C.appendChild(await BTN('Ghost', o.back || 'Account', { size: 'S', lead: 'chevron-left' }));
  const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(C, [tt, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tt, [tr, 'FILL']); add(tr, [await T(o.title, 'Heading/H3', 'text/primary', { w: 280 }), 'FILL']); tr.appendChild(await DEMO('S'));
  if (o.sub) add(tt, [await T(o.sub, 'Body/S', 'text/secondary', { w: W }), 'FILL']);
  return { f, tb, C };
}
async function licM(C) { const l = await I('6:158', { Variant: 'Compact' }); add(C, [l, 'FILL']); return l; }
async function endM(S, o = {}) {
  if (o.cta) { const b = AL(o.stack ? 'VERTICAL' : 'HORIZONTAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(S.f, [b, 'FILL']); for (const x of o.cta) add(b, [x, 'FILL']); }
  const tab = await I('22:5413', { Active: 'Account' }); add(S.f, [tab, 'FILL']); return tab;
}
async function sheetM(f, title, sub, build, vp = 844) {
  if (vp) { f.resize(390, vp); f.primaryAxisSizingMode = 'FIXED'; } // sheet states show one phone viewport
  scrimOver(f);
  const sh = ALX('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 16, p: [12, 16, 32, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER' }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('VERTICAL', { name: 'Header', gap: 4 }); add(sh, [hd, 'FILL']); add(hd, [await T(title, 'Heading/H4', 'text/primary', { w: W }), 'FILL']); if (sub) add(hd, [await T(sub, 'Body/S', 'text/secondary', { w: W }), 'FILL']);
  await build(sh);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = Math.max(0, f.height - sh.height); return sh;
}
// 52px list row: icon tile | label + value | trailing nodes | chevron
async function lrow(icon, label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 }); r.appendChild(await iconTile(icon, o.ic || 'icon/brand', 36)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(label, 'Body/S Strong', 'text/primary', { w: 220 }), 'FILL']); if (value) { const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); add(tx, [vr, 'FILL']); add(vr, [await T(value, 'Caption', o.vTone || 'text/secondary', { w: 200 }), 'FILL']); if (o.demo) vr.appendChild(await DEMO('XS')); } for (const x of (o.right || [])) if (x) r.appendChild(x); if (o.chev !== false) r.appendChild(await IC('chevron-right', 20, 'icon/muted')); return r; }
function list(C, name) { const l = AL('VERTICAL', { name, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: [4, 16, 4, 16] }); add(C, [l, 'FILL']); return l; }
async function groupLabel(C, t) { const g = AL('HORIZONTAL', { name: 'Group — ' + t, p: [8, 4, 0, 4] }); add(C, [g, 'FILL']); g.appendChild(await T(t, 'Overline', 'text/tertiary')); return g; }
async function placeM(f, sec, col) { return await place(f, sec, col, MSTEP); }
// sheet states reuse the default frame of the same screen (clone) so the page under the scrim matches it exactly
function cloneBase(sec, baseName, name) { const b = byName(sec, baseName); if (!b) return null; const f = b.clone(); f.name = name; figma.currentPage.appendChild(f); for (const c of [...f.children]) if (c.layoutPositioning === 'ABSOLUTE') c.remove(); return f; }
async function pill(label, on) { const c = AL('HORIZONTAL', { name: 'Channel — ' + label, gap: 4, p: [4, 10, 4, 8], r: 9999, align: 'CENTER', fill: on ? 'brand/tint' : 'surface/raised', stroke: on ? 'border/brand' : 'border/subtle' }); c.appendChild(await IC(on ? 'check' : 'minus', 14, on ? 'icon/brand' : 'icon/muted')); c.appendChild(await T(label, 'Label/S', on ? 'text/brand' : 'text/tertiary')); return c; }
// ===== END ACCOUNT KIT — MOBILE =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('USR — Mobile C', 105000, 0);
const existing = sec.children.map(c => c.name + ' | ' + c.id + ' | ' + Math.round(c.width) + 'x' + Math.round(c.height));
async function ma7(STATE) {
const REV = STATE === 'Revoke';
const BASE = '[USR-A7 · MOB-09] Connected Devices / 390 / Default';
const NAME = REV ? '[USR-A7 · MOB-09] Connected Devices / 390 / Revoke — bottom sheet' : BASE;
const sk = skipIf(sec, NAME); if (sk) return sk;
let f = REV ? cloneBase(sec, BASE, NAME) : null;
if (!f) {
  const S = await shellM(NAME, { back: 'Security', title: 'Connected devices', sub: 'Revoke anything you don’t recognise. A revoked device must sign in again with your password and 2FA code.' });
  const C = S.C;
  async function dcard(icon, name, meta, ch, btns, o = {}) {
    const c = card('Device — ' + name, { gap: 12, p: 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle' }); add(C, [c, 'FILL']);
    const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, o.ic || 'icon/default', 44, 'surface/raised'));
    const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [tx, 'FILL']); add(tx, [await T(name, 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL']); add(tx, [await T(meta, 'Caption', 'text/secondary', { w: 200 }), 'FILL']);
    h.appendChild(await DEMO('XS'));
    c.appendChild(ch);
    if (btns.length) { const b = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(c, [b, 'FILL']); for (const x of btns) add(b, [x, 'FILL']); }
    return c;
  }
  await groupLabel(C, 'Needs your review');
  await dcard('monitor', 'Windows PC · Edge', 'First seen 25 Nov 2026 in Madrid, Spain · 213.97.•••.88', await chip('alert-triangle', 'Needs review', 'warning'), [await BTN('Secondary', 'It was me', { size: 'L' }), await BTN('Danger', 'Revoke', { size: 'L' })], { fill: tk('status/warning-tint'), stroke: tk('status/warning', 'border/default'), ic: tk('status/warning', 'icon/default') });
  await groupLabel(C, 'Your devices');
  await dcard('monitor', 'MacBook Pro · Chrome 131', 'Lisbon, Portugal · 85.243.•••.12 · active now', await chip('check-circle', 'This device', 'success'), [await BTN('Ghost', 'Sign out here', { size: 'L', lead: 'logout' })]);
  await dcard('smartphone', 'iPhone 15 · Safari', 'Lisbon, Portugal · last active 27 Nov 2026, 07:52 UTC', await chip('shield-check', 'Trusted · skips email link', 'info'), [await BTN('Secondary', 'Revoke', { size: 'L' })]);
  const tr = card('Card — Device trust', { gap: 8, p: 16, fill: 'surface/raised' }); add(C, [tr, 'FILL']);
  tr.appendChild(await T('Device trust', 'Heading/H5', 'text/primary'));
  add(tr, [await T('Trusted devices skip the email link on sign-in for 30 days. Withdrawals and security changes always ask for 2FA, trusted or not.', 'Body/S', 'text/secondary', { w: IW }), 'FILL']);
  await groupLabel(C, 'Recently removed');
  const rl = list(C, 'List — Removed');
  add(rl, [await lrow('grid', 'Galaxy Tab · Chrome', 'Expired after 90 days inactive · 2 Sep 2026', { chev: false, ic: 'icon/muted', demo: true }), 'FILL']);
  add(rl, [await lrow('ban', 'Linux · Firefox · Frankfurt', 'Never trusted · blocked 22 Nov 2026 after 5 wrong passwords', { chev: false, ic: tk('status/danger', 'icon/muted'), demo: true, last: true }), 'FILL']);
  await licM(C);
  await endM(S);
  f = S.f;
}
if (REV) {
  await sheetM(f, 'Revoke Windows PC · Edge?', 'It’s signed out within seconds and treated as new if it signs in again.', async (sh) => {
    const sm = AL('HORIZONTAL', { name: 'Device summary', gap: 12, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 14, align: 'CENTER' }); add(sh, [sm, 'FILL']);
    sm.appendChild(await iconTile('monitor', tk('status/warning', 'icon/default'), 40, 'surface/default'));
    const t = AL('VERTICAL', { name: 'Text', gap: 2 }); add(sm, [t, 'FILL']); t.appendChild(await T('Windows PC · Edge', 'Body/S Strong', 'text/primary')); add(t, [await T('First seen 25 Nov 2026 · Madrid, Spain', 'Caption', 'text/tertiary', { w: 220 }), 'FILL']); sm.appendChild(await DEMO('XS'));
    for (const x of ['Its active session ends now', 'Next sign-in needs password, 2FA and the email link', 'Balance, entries and WD-20931 are untouched']) add(sh, [await check(x, true, W, 'info'), 'FILL']);
    const cb = await tryy('checkbox', () => I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Take me to change my password next', 'Show description': false })); if (cb) add(sh, [cb, 'FILL']);
    add(sh, [await BTN('Danger', 'Revoke device', { size: 'L', lead: 'ban' }), 'FILL']);
    add(sh, [await BTN('Secondary', 'Cancel', { size: 'L' }), 'FILL']);
    add(sh, [await T('Protective actions never ask for a 2FA code.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  });
}
await placeM(f, sec, 6); await shotOf(f);
return { frame: f.id, name: NAME, h: Math.round(f.height) };
}

async function ma8(STATE) {
const END = STATE === 'End all';
const BASE = '[USR-A8 · MOB-09] Session Management / 390 / Default';
const NAME = END ? '[USR-A8 · MOB-09] Session Management / 390 / End all — bottom sheet' : BASE;
const sk = skipIf(sec, NAME); if (sk) return sk;
let f = END ? cloneBase(sec, BASE, NAME) : null;
if (!f) {
  const S = await shellM(NAME, { back: 'Security', title: 'Sessions', sub: 'A session ends after 30 minutes without activity. End any you don’t need.' });
  const C = S.C;
  const ts = card('Card — This session', { gap: 12, p: 16, fill: 'surface/selected', stroke: 'border/brand' }); add(C, [ts, 'FILL']);
  const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(ts, [th, 'FILL']); th.appendChild(await iconTile('monitor', 'icon/brand', 44, 'surface/default'));
  const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']); add(tt, [await T('This browser', 'Body/M Strong', 'text/primary'), 'FILL']); add(tt, [await T('Chrome on MacBook Pro · Lisbon · started 27 Nov 2026, 08:12 UTC', 'Caption', 'text/secondary', { w: 220 }), 'FILL']); th.appendChild(await DEMO('XS'));
  ts.appendChild(await chip('check-circle', 'Active now', 'success'));
  add(C, [await BTN('Danger', 'End all other sessions', { size: 'L', lead: 'logout' }), 'FILL']);
  add(C, [await T('You stay signed in here. No 2FA code needed.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  await groupLabel(C, 'Other active sessions · 2');
  async function scard(icon, t, meta, warn) {
    const c = card('Session — ' + t, { gap: 12, p: 16, stroke: warn ? tk('status/warning', 'border/default') : 'border/subtle' }); add(C, [c, 'FILL']);
    const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, warn ? tk('status/warning', 'icon/default') : 'icon/default', 40));
    const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(h, [x, 'FILL']); add(x, [await T(t, 'Body/S Strong', 'text/primary', { w: 220 }), 'FILL']); add(x, [await T(meta, 'Caption', 'text/secondary', { w: 220 }), 'FILL']); h.appendChild(await DEMO('XS'));
    if (warn) add(c, [await noteBox('alert-triangle', 'From a new device that still needs your review', 'warning', IW), 'FILL']);
    add(c, [await BTN('Secondary', 'End session', { size: 'L' }), 'FILL']);
  }
  await scard('smartphone', 'Safari on iPhone 15', 'Lisbon · started 27 Nov 2026, 07:40 UTC · last active 07:52 UTC', false);
  await scard('monitor', 'Edge on Windows PC', 'Madrid, Spain · started 25 Nov 2026 · last active 25 Nov 2026', true);
  await groupLabel(C, 'Recently ended · kept 30 days');
  const le = list(C, 'List — Ended');
  add(le, [await lrow('smartphone', 'Safari on iOS', 'Ended 26 Nov 2026, 21:40 UTC · timed out after 30 min idle', { chev: false, ic: 'icon/muted', demo: true }), 'FILL']);
  add(le, [await lrow('monitor', 'Chrome on MacBook Pro', 'Ended 24 Nov 2026 · you signed out', { chev: false, ic: 'icon/muted', demo: true, last: true }), 'FILL']);
  const se = card('Card — Settings', { gap: 12, p: 16 }); add(C, [se, 'FILL']);
  se.appendChild(await T('Session settings', 'Heading/H5', 'text/primary'));
  const sf = await tryy('select', () => I('13:565', { State: 'Default' }, { Label: 'Sign me out after inactivity', Value: '30 minutes', 'Show helper': false, 'Show leading icon': false })); if (sf) add(se, [sf, 'FILL']);
  add(se, [await T('Shorter timeouts are safer on shared computers. Applies to every device.', 'Caption', 'text/tertiary', { w: IW }), 'FILL']);
  await licM(C);
  await endM(S);
  f = S.f;
}
if (END) {
  await sheetM(f, 'End 2 other sessions?', 'Those browsers are signed out within seconds. You stay signed in here.', async (sh) => {
    for (const [i, t, d] of [['smartphone', 'Safari on iPhone 15', 'Lisbon · last active 27 Nov 2026, 07:52 UTC'], ['monitor', 'Edge on Windows PC', 'Madrid, Spain · new device, needs review']]) {
      const r = AL('HORIZONTAL', { name: 'Session — ' + t, gap: 12, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 10, align: 'CENTER' }); add(sh, [r, 'FILL']);
      r.appendChild(await iconTile(i, 'icon/default', 36, 'surface/default')); const x = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [x, 'FILL']); x.appendChild(await T(t, 'Body/S Strong', 'text/primary')); add(x, [await T(d, 'Caption', 'text/tertiary', { w: 230 }), 'FILL']); r.appendChild(await DEMO('XS'));
    }
    for (const x of ['Device trust stays — revoke a device in Devices to remove it', 'Balance, open entries, limits and pending withdrawals are untouched']) add(sh, [await check(x, true, W, 'info'), 'FILL']);
    add(sh, [await BTN('Danger', 'End 2 sessions', { size: 'L', lead: 'logout' }), 'FILL']);
    add(sh, [await BTN('Secondary', 'Cancel', { size: 'L' }), 'FILL']);
    add(sh, [await T('No 2FA code needed — this only makes your account safer.', 'Caption', 'text/tertiary', { w: W, align: 'CENTER' }), 'FILL']);
  });
}
await placeM(f, sec, 7); await shotOf(f);
return { frame: f.id, name: NAME, h: Math.round(f.height) };
}

const results = [];
results.push(await ma7('Default'));
results.push(await ma7('Revoke'));
results.push(await ma8('Default'));
results.push(await ma8('End all'));
return { section: sec.id, results, log: LOG, existing };
