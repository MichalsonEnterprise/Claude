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
// ===== ERR-B LIB subset for mobile (pending/err-b/lib-m.js) — paste after helpers.js =====
async function ensureFont(t) { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); else for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); }
function inBadge(t) { let p = t.parent; while (p) { if (p.type === 'INSTANCE' && p.name.startsWith('Badge/')) return true; p = p.parent; } return false; }
async function ov(inst, layer, text, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === layer && !inBadge(n))[nth]; if (!t) return false; await ensureFont(t); t.characters = text; return true; }
function txt(inst, name, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === name && !inBadge(n))[nth]; return t ? t.characters : ''; }
function relabel(inst, oldLabel, label) { for (const b of inst.findAll(n => n.type === 'INSTANCE')) { const cp = b.componentProperties; const k = Object.keys(cp).find(x => x.startsWith('Label#')); if (k && cp[k].value === oldLabel) { b.setProperties({ [k]: label }); return true; } } return false; }
function hide(inst, name) { for (const n of inst.findAll(x => x.name === name)) n.visible = false; }
async function chip(txt, mono = true, color = 'text/secondary') { const r = AL('HORIZONTAL', { name: 'Chip — ' + txt, p: [4, 10], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(r, await T(txt, mono ? 'Mono/S' : 'Label/S', color)); return r; }
async function stat(icon, label, fg) { const r = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, align: 'CENTER' }); add(r, await IC(icon, 16, fg), await T(label, 'Label/S', fg)); return r; }
async function tile(icon, bg, fg, size = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, align: 'CENTER', justify: 'CENTER', w: size, h: size }); add(t, await IC(icon, Math.round(size / 2), fg)); return t; }
async function note(icon, txt, w, bg = 'surface/default', fg = 'icon/muted') { const r = AL('HORIZONTAL', { name: 'Note', gap: 8, p: [10, 12], fill: bg, r: 10, align: 'MIN', w }); add(r, await IC(icon, 16, fg), await T(txt, 'Body/S', 'text/secondary', { w: w - 48 })); return r; }
function audit(root) { const flags = []; const rb = root.absoluteBoundingBox; for (const t of root.findAll(n => n.type === 'TEXT' && n.visible)) { const b = t.absoluteRenderBounds || t.absoluteBoundingBox; if (!b) continue; let p = t.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { const pb = p.absoluteBoundingBox; if (pb && p.clipsContent && (b.x < pb.x - 1 || b.y < pb.y - 1 || b.x + b.width > pb.x + pb.width + 1 || b.y + b.height > pb.y + pb.height + 1)) { flags.push(t.characters.slice(0, 40) + ' ⟂ ' + p.name); break; } if (p === root) break; p = p.parent; } if (b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) flags.push('off-frame: ' + t.characters.slice(0, 30)); if (t.width < 4) flags.push('thin: ' + t.characters.slice(0, 30)); } return flags.slice(0, 30); }
// ===== END ERR-B LIB =====
// ===== ERR-B MOBILE LIB (pending/err-b/mlib.js) — paste after helpers.js + lib.js =====
const PAGE10 = '10 — Mobile Experience', MSEC = 'ERR — Mobile'; let MS;
async function mInit() { const page = figma.root.children.find(p => p.name === PAGE10); await figma.setCurrentPageAsync(page); MS = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === MSEC); if (!MS) { let mx = 0; for (const n of figma.currentPage.children) if (n.type === 'SECTION') mx = Math.max(mx, n.x + n.width); MS = section(MSEC, Math.max(252000, Math.ceil((mx + 400) / 1000) * 1000), 0); } return MS; }
// ERR — Mobile is shared with the err-a slice (ERR-01..03 in row 1): ERR-04..07 frames go in their own row below it
const MINE = n => /^\[ERR-0[4-7]\]/.test(n.name);
function myRowY() { let m = 0; for (const c of MS.children) if (!MINE(c)) m = Math.max(m, c.y + c.height); return Math.max(1124, m + 160); }
function placeMine() { const y = myRowY(); for (const c of MS.children) if (MINE(c) && c.y !== y) c.y = y; return y; }
async function mscreen(name, col, h) { const old = MS.children.find(n => n.name === name); const pos = old ? { x: old.x, y: myRowY() } : { x: 120 + col * 510, y: myRowY() }; if (old) old.remove(); const f = await screen(name, 390, h ? { h } : {}); MS.appendChild(f); f.x = pos.x; f.y = pos.y; add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']); return f; }
async function topbar() { return await I('23:12908', { State: 'Member' }); }
async function tabbar(active) { return await I('22:5413', { Active: active }); }
async function mBanner(icon, bg, fg, title, body, btn) { const b = AL('VERTICAL', { name: 'Banner — ' + title, gap: 8, p: [12, 16], fill: bg, w: 390 }); strokeSides(b, 'border/subtle', { b: 1 }); const h = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(h, await IC(icon, 18, fg), await T(title, 'Label/M', 'text/primary', { w: 332 })); add(b, h, await T(body, 'Body/S', 'text/secondary', { w: 358 })); if (btn) add(b, btn); return b; }
function content() { return AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16], w: 390 }); }
async function card(name, gapPx = 12) { return AL('VERTICAL', { name, gap: gapPx, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 358 }); }
async function cdown(h, m, s) { const r = AL('HORIZONTAL', { name: 'Countdown', gap: 6, align: 'CENTER' }); const parts = [[h, 'h'], [m, 'm'], [s, 's']]; for (let i = 0; i < 3; i++) { const b = AL('VERTICAL', { gap: 0, p: [6, 12], fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER' }); add(b, await T(parts[i][0], 'Number/M', 'text/primary'), await T(parts[i][1], 'Caption', 'text/tertiary')); add(r, b); if (i < 2) add(r, await T(':', 'Number/M', 'text/tertiary')); } return r; }
async function roundCard(o = {}) {
  const c = await card('Round #1,248');
  const hd = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(hd, await T('Round #1,248', 'Heading/H5', 'text/primary'), await stat(o.si || 'clock', o.status || 'Open', o.sc || 'text/success')); add(c, hd);
  add(c, await T(o.asof ? 'POOL BALANCE · AS OF 18:42 UTC' : 'POOL BALANCE', 'Overline', 'text/tertiary'));
  const v = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(v, await T('186,400.00', 'Number/L', 'text/gold'), await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(c, v);
  if (o.countdown !== false) { add(c, await cdown('03', '17', '42')); add(c, [await T(o.closeNote || 'Closes 27 Nov 2026, 20:00 UTC', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']); }
  add(c, [await T('3,412 participants · 18,640 qualifying entries', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  return c;
}
async function sticky(btns, cap) { const s = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16], fill: 'bg/secondary', w: 390 }); strokeSides(s, 'border/subtle', { t: 1 }); for (const b of btns) add(s, [b, 'FILL']); if (cap) add(s, await T(cap, 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' })); return s; }
async function list(items, w = 326) { const c = AL('VERTICAL', { name: 'List', gap: 10, w }); for (const [ic, lb, col] of items) { const r = AL('HORIZONTAL', { gap: 8, align: 'MIN', w }); const t = await T(lb, 'Body/S', 'text/primary', { w: w - 26 }); add(r, await IC(ic, 18, col || 'text/success'), t); add(c, [r, 'FILL']); } return c; }
// ===== END ERR-B MOBILE LIB =====
// ERR mobile batch 1 — ERR-04 offline, ERR-05 licence required, ERR-06 entries paused (page 10, 'ERR — Mobile')
await mInit();
const out = {};
// M1 — ERR-04 Offline
{ const f = await mscreen('[ERR-04] Offline — reconnecting / 390 / Global Pool round', 0);
  add(f, await topbar(), await mBanner('wifi-off', 'status/warning-tint', 'text/warning', 'You’re offline', 'Figures below are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.', await BTN('Secondary', 'Try again', { size: 'S', lead: 'refresh' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({ asof: true, closeNote: 'Closes 27 Nov 2026, 20:00 UTC — the countdown keeps running while you’re offline.' }), 'FILL']);
  const me = await card('My entries'); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await T('35 entries', 'Heading/H5', 'text/primary'), await DEMO('S')); add(me, r, [await T('350.00 USDT + 1.75 USDT platform fees · E-1248-00981 … E-1248-01015', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], await stat('check-circle', 'Safe in the round — confirmed before you went offline', 'text/success')); add(ct, [me, 'FILL']);
  add(ct, await stat('refresh', 'Reconnecting automatically · attempt 3 · next try in 8 s', 'text/secondary'));
  add(f, await sticky([await BTN('Gold', 'Reconnect to enter', { size: 'L', state: 'Disabled', lead: 'wifi-off' })], '10.00 USDT + 0.05 USDT platform fee per entry · You can lose your stake · 18+'), await tabbar('Pool'));
  out.m1 = f.id; }
// M2 — ERR-05 Licence required
{ const f = await mscreen('[ERR-05] Licence required / 390 / Global Pool entries off', 1);
  add(f, await topbar(), await mBanner('scale', 'status/warning-tint', 'text/warning', 'Global Pool isn’t licensed where you live', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Your balance and any owed refunds are unaffected.', await BTN('Ghost', 'Licence details', { size: 'S', trail: 'arrow-right' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({}), 'FILL']);
  const can = await card('What you can still do'); add(can, await T('What you can still do', 'Heading/H5', 'text/primary'), [await list([['check-circle', 'Play Originals and table games — licensed in Ontario'], ['check-circle', 'Withdraw your balance at any time'], ['check-circle', 'Receive refunds from cancelled rounds (Owed → Available)'], ['check-circle', 'Watch rounds and verify every draw']]), 'FILL']); add(ct, [can, 'FILL']);
  add(ct, await I('6:158', { Variant: 'Compact' }));
  add(f, await sticky([await BTN('Gold', 'Entries not available in Ontario', { size: 'L', state: 'Disabled', lead: 'lock' }), await BTN('Secondary', 'Browse Originals', { size: 'L' })], 'DEMO scenario: account registered in Ontario, Canada · 18+'), await tabbar('Pool'));
  out.m2 = f.id; }
// M3 — ERR-06 Entries paused
{ const f = await mscreen('[ERR-06] New entries paused / 390 / Circuit breaker', 2);
  add(f, await topbar(), await mBanner('pause-circle', 'status/warning-tint', 'text/warning', 'New Global Pool entries are paused', 'A safety pause on the GlobalPool contract stopped new entries at 19:05 UTC. Your 35 entries in round #1,248 still count — the draw, prizes and refunds follow the contract rules.', await BTN('Ghost', 'Why entries are paused', { size: 'S', trail: 'arrow-right' })));
  const ct = content(); add(f, ct);
  add(ct, [await roundCard({ status: 'Entries paused', si: 'pause-circle', sc: 'text/warning', closeNote: 'Still closes 27 Nov 2026, 20:00 UTC — the draw runs as scheduled.' }), 'FILL']);
  const ok = await card('Not affected'); add(ok, await T('Not affected', 'Heading/H5', 'text/primary'), [await list([['check-circle', 'Your 35 entries (E-1248-00981 … E-1248-01015) stay in the draw'], ['check-circle', 'Deposits and withdrawals'], ['check-circle', 'Originals and table games'], ['check-circle', 'Refunds and prize settlement']]), 'FILL']); add(ct, [ok, 'FILL']);
  add(f, await sticky([await BTN('Gold', 'Entries paused', { size: 'L', state: 'Disabled', lead: 'pause-circle' }), await BTN('Secondary', 'View my entries', { size: 'L' })], 'Paused since 27 Nov 2026, 19:05 UTC · two-person approval · 18+'), await tabbar('Pool'));
  out.m3 = f.id; }
fitSection(MS);
const res = {}; for (const [k, id] of Object.entries(out)) { const n = await figma.getNodeByIdAsync(id); res[k] = { id, name: n.name, h: n.height, flags: audit(n) }; }
await MS.screenshot({ scale: 0.5 });
return { section: MS.id, secX: MS.x, res };
