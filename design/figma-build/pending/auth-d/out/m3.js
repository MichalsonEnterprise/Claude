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
// ===== AUTH-D KIT (subset) =====
function HUGH(f) { if (f.layoutMode === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else if (f.layoutMode === 'HORIZONTAL') f.counterAxisSizingMode = 'AUTO'; return f; }
async function ST(n, s) { if (!n || n.type !== 'TEXT') return n; const L = n.characters.length; const fs = L ? n.getRangeAllFontNames(0, L) : [n.fontName]; await Promise.all(fs.map(f => figma.loadFontAsync(f))); n.characters = String(s); return n; }
async function TX(root, name, s, i = 0) { const a = root.findAll(x => x.type === 'TEXT' && x.name === name); if (a[i]) await ST(a[i], s); return a[i] || null; }
function SPACER() { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; }
function ROW(name, kids = [], o = {}) { const r = AL('HORIZONTAL', { name, gap: o.gap ?? 12, align: o.align || 'CENTER', justify: o.justify, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, wrap: o.wrap, cgap: o.cgap, w: o.w }); if (o.w) HUGH(r); for (const k of kids) add(r, k); return r; }
function COL(name, kids = [], o = {}) { const r = AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, align: o.align, w: o.w, clip: o.clip }); if (o.w) HUGH(r); for (const k of kids) add(r, k); return r; }
async function P(s, st = 'Body/S', c = 'text/secondary', o = {}) { return [await T(s, st, c, { w: o.w || 120, name: o.name, align: o.align }), 'FILL']; }
const TONES = { brand: ['brand/tint', 'icon/brand'], success: ['status/success-tint', 'text/success'], warning: ['status/warning-tint', 'text/warning'], danger: ['status/danger-tint', 'text/danger'], info: ['status/info-tint', 'text/info'], neutral: ['surface/raised', 'icon/default'] };
async function TILE(icon, tone = 'brand', s = 48) { const [bg, ic] = TONES[tone]; const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icon, fill: bg, r: s >= 48 ? 14 : 10, align: 'CENTER', justify: 'CENTER', w: s, h: s }); add(t, await IC(icon, Math.round(s / 2), ic)); return t; }
async function ALERT(kind, title, body, o = {}) { const ic = { success: 'check-circle', danger: 'alert-circle', warning: 'alert-triangle', info: 'info' }[kind]; const a = AL('HORIZONTAL', { name: 'Alert/' + kind + ' — ' + title.slice(0, 30), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + kind + '-tint', stroke: 'status/' + kind, r: 10 }); add(a, await IC(o.icon || ic, 20, 'text/' + kind)); const tx = COL('Text', [], { gap: 4 }); add(tx, await P(title, 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, 'Body/S', 'text/secondary')); add(a, [tx, 'FILL']); return a; }
async function KV(k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, align: 'CENTER', p: [o.py ?? 10, 0, o.py ?? 10, 0] }); if (o.line !== false) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 100 }), 'FILL']); const vv = typeof v === 'string' ? await T(v, o.vs || 'Body/S Strong', o.vc || 'text/primary') : v; add(r, vv); if (o.demo) add(r, await DEMO('XS')); return r; }
async function KV2(k, v, o = {}) { const c = COL('Field — ' + k, [], { gap: 2 }); add(c, await T(k, 'Caption', 'text/tertiary')); add(c, await P(v, o.vs || 'Body/S Strong', o.vc || 'text/primary')); return c; }
async function NOTE(icon, text, o = {}) { const r = ROW('Note — ' + text.slice(0, 30), [await IC(icon, 16, o.ic || 'icon/muted')], { gap: 8, align: 'MIN' }); add(r, await P(text, o.st || 'Caption', o.c || 'text/tertiary')); return r; }
async function BUL(icon, ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Point — ' + title.slice(0, 40), gap: 12 }); add(r, o.tile ? await TILE(icon, o.tile, 32) : await IC(icon, 20, ic)); const tx = COL('Text', [], { gap: 2 }); add(tx, await P(title, o.ts || 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, o.bs || 'Body/S', 'text/secondary')); add(r, [tx, 'FILL']); return r; }
async function XBTN(size = 'S') { const b = await I('7:774', { Type: 'Ghost', Size: size, State: 'Default' }, { Icon: ICONS.x }); b.name = 'Close'; return b; }
async function IBTN(icon, size = 'S') { const b = await I('7:774', { Type: 'Ghost', Size: size, State: 'Default' }, { Icon: ICONS[icon] }); b.name = 'Button/Icon — ' + icon; return b; }
function SEG(n, cur) { const bar = ROW('Progress — step ' + (cur + 1) + ' of ' + n, [], { gap: 6 }); for (let i = 0; i < n; i++) add(bar, [rect(10, 4, i < cur ? 'status/success' : i === cur ? 'brand/primary' : 'border/default', 9999, 'Segment ' + (i + 1)), 'FILL']); return bar; }
async function CHIP(icon, label, tone = 'success') { const [bg, c] = TONES[tone]; return ROW('Chip — ' + label, [await IC(icon, 14, c), await T(label, 'Label/S', c === 'icon/brand' ? 'text/brand' : c)], { gap: 6, p: [4, 10, 4, 10], fill: bg, r: 9999 }); }
function COLY(sec, x, y0) { let m = 0, f = false; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)) { m = Math.max(m, ch.y + ch.height); f = true; } return f ? m + 160 : y0; }
function RESTACK(sec, x, y0) { const fs = sec.children.filter(ch => Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)).sort((a, b) => a.y - b.y); let y = y0; for (const f of fs) { f.y = y; y += f.height + 160; } }
function CENTER(fr, d, bg, o = {}) { let vh = bg.vp.height; const need = d.height + 2 * (o.m || 64); if (need > vh) { bg.vp.resize(bg.vp.width, need); bg.scrim.resize(bg.scrim.width, need); vh = need; } d.x = Math.round((fr.width - d.width) / 2) + (o.dx || 0); d.y = Math.round(bg.vp.y + (vh - d.height) / 2); }
async function WALLETROW(o = {}) { const mk = await I(o.mark || '27:15872'); const id = COL('Wallet', [], { gap: 4 }); add(id, await T(o.name || 'Browser wallet', 'Label/M', 'text/primary')); add(id, await I('9:418', { Size: 'S', State: 'Default' }, { Address: '0x12ab…9f3C', 'Show DEMO': true })); const r = ROW('Wallet — ' + (o.name || 'Browser wallet'), [mk, [id, 'FILL']], { gap: 12, p: [12, 16, 12, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); if (o.badge) add(r, o.badge); else add(r, await I('9:377', { Chain: 'BNB Chain', Status: 'Operational' }, { 'Show status label': false, 'Show chevron': false })); return r; }
async function START(NAME, col, o = {}) { const page = figma.root.children.find(p => p.name === (o.mobile ? '10 — Mobile Experience' : '04 — Authentication')); await figma.setCurrentPageAsync(page); const sec = o.mobile ? section('AUTH — Mobile D', 84000, 0) : section('AUTH-05/06/18..21 Recovery & restrictions', 36000, 0); const W = o.mobile ? 390 : 1440; const X = 120 + col * (W + 120); const old = sec.children.find(n => n.name === NAME); if (old && !o.rebuild) return null; let Y = null; if (old) { Y = old.y; old.remove(); } if (Y == null) Y = COLY(sec, X, o.mobile ? 160 : 440); const fr = await screen(NAME, W); sec.appendChild(fr); fr.x = X; fr.y = Y; const db = await DEMOBAR(); add(fr, [db, 'FILL']); return { sec, fr, db, X }; }
async function FINISH(sec, fr, X, o = {}) { RESTACK(sec, X, o.mobile ? 160 : 440); fitSection(sec); await fr.screenshot({ scale: o.mobile ? 0.6 : 0.45 }); return { frame: fr.id, name: fr.name, size: [Math.round(fr.width), Math.round(fr.height)], at: [Math.round(fr.x), Math.round(fr.y)] }; }
async function FRAME(NAME, col, o, fn) { const S = await START(NAME, col, o); if (!S) { OUT.push({ skipped: NAME }); return; } try { await fn(S); } catch (e) { S.fr.remove(); throw e; } OUT.push(await FINISH(S.sec, S.fr, S.X, o)); }
const TC = { brand: 'text/brand', success: 'text/success', warning: 'text/warning', danger: 'text/danger', info: 'text/info', neutral: 'text/secondary' };
async function INPUT(label, value, state = 'Filled', o = {}) { const p = { Label: label, 'Show label': true, 'Show leading icon': o.icon !== false, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const n = await I('13:762', { State: state, Size: o.size || 'L' }, p); if (value != null) await TX(n, 'Value text', value); if (o.helper) await TX(n, 'Helper text', o.helper); n.name = 'Input/Text — ' + label + ' (' + state + ')'; return n; }
async function RADIO(label, desc, sel = 'No') { const r = await I('20:3259', { Selected: sel, State: 'Default' }, { Label: label, Description: desc || '', 'Show description': !!desc }); r.name = 'Control/Radio — ' + label; return r; }
async function CHECK(label) { const c = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: label, 'Show description': false }); c.name = 'Control/Checkbox — ' + label.slice(0, 40) + ' (unchecked)'; return c; }
function OBJ(name, w, o = {}) { return COL('Illustration — ' + name, [], { gap: o.gap ?? 10, p: o.p ?? [14, 16, 16, 16], fill: o.fill || 'surface/raised', stroke: o.stroke || 'border/default', r: 14, w }); }
async function PLACE(parent, c, x, y, rot) { await fx(c, 'Elevation/2 — Raised'); parent.appendChild(c); if (parent.layoutMode && parent.layoutMode !== 'NONE') { c.layoutSizingHorizontal = 'FILL'; } else { c.x = x; c.y = y; c.rotation = rot || 0; } return c; }
async function OHEAD(icon, label, tone = 'brand', right) { const r = ROW('Head', [await IC(icon, 16, TC[tone] === 'text/secondary' ? 'icon/muted' : TC[tone]), await T(label, 'Label/M', 'text/primary'), [SPACER(), 'FILL']], { gap: 8 }); add(r, right || await DEMO('XS')); return r; }
async function IDCARD(parent, x, y, rot) { const c = OBJ('identity document (fictional, DEMO)', 268); add(c, [await OHEAD('id-card', 'Passport · Portugal'), 'FILL']); const b = ROW('Body', [], { gap: 12, align: 'MIN' }); const ph = AL('VERTICAL', { name: 'Photo placeholder', w: 56, h: 68, fill: 'surface/hover', r: 6, align: 'CENTER', justify: 'CENTER' }); add(ph, await IC('user', 28, 'icon/muted')); add(b, ph); const f = COL('Fields', [], { gap: 6 }); add(f, [await KV2('Name', 'NOVA K•••••'), 'FILL'], [await KV2('Document no.', '•••• 4471', { vs: 'Mono/S' }), 'FILL'], [await KV2('Valid until', 'Mar 2031'), 'FILL']); add(b, [f, 'FILL']); add(c, [b, 'FILL']); add(c, await P('P<PRT<<K•••••<<NOVA<<<<<<<<<<<', 'Mono/S', 'text/tertiary')); add(c, await CHIP('check', 'Matches KYC Level 2 record', 'success')); return PLACE(parent, c, x, y, rot); }
async function HOLDCARD(parent, x, y, rot, o = {}) { const c = OBJ('withdrawal security hold (DEMO)', o.w || 280); add(c, [await OHEAD('lock', 'Withdrawals paused', 'warning'), 'FILL']); add(c, await P('Unlock 29 Nov 2026 · 17:12 UTC', 'Number/S', 'text/primary')); const bar = ROW('Hold progress — 0 of 48 h', [rect(12, 6, 'status/warning', 9999, 'Elapsed'), [rect(10, 6, 'border/default', 9999, 'Remaining'), 'FILL']], { gap: 2 }); add(c, [bar, 'FILL']); add(c, [ROW('Ends', [await T('Approved 27 Nov · 17:12', 'Caption', 'text/tertiary'), [SPACER(), 'FILL'], await T('48 h', 'Caption', 'text/tertiary')], { gap: 8 }), 'FILL']); add(c, [await KV('Available — safe in your account', '9,215.30 USDT', { vs: 'Number/S', vc: 'balance/available', line: false, py: 4 }), 'FILL']); return PLACE(parent, c, x, y, rot); }
async function MCTA(fr, kids) { const f = COL('Sticky CTA bar (no tab bar — focused flow)', [], { gap: 8, p: [12, 16, 4, 16], fill: 'bg/secondary' }); strokeSides(f, 'border/subtle', { t: 1 }); for (const k of kids) add(f, [k, 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [12, 0, 4, 0] }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(f, [hi, 'FILL']); add(fr, [f, 'FILL']); return f; }
async function MCONTENT(fr, gp = 16) { const c = AL('VERTICAL', { name: 'Content', gap: gp, p: [16, 16, 24, 16] }); add(fr, [c, 'FILL']); return c; }
async function MCARD(title, o = {}) { const c = COL('Card — ' + title, [], { gap: 12, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); const h = ROW('Card header', [], { gap: 10 }); if (o.icon) add(h, await TILE(o.icon, o.tone || 'brand', 32)); add(h, await P(title, 'Heading/H5', 'text/primary')); add(c, [h, 'FILL']); if (o.sub) add(c, await P(o.sub, 'Body/S', 'text/secondary')); return c; }
async function MFLOW(fr, title, step, n, o = {}) { const h = COL('Flow header', [], { gap: 10, p: [4, 8, 14, 8], fill: 'bg/secondary' }); strokeSides(h, 'border/subtle', { b: 1 }); add(h, [ROW('Title row', [await IBTN('arrow-left', 'L'), COL('Title', [await T(o.over || ('STEP ' + (step + 1) + ' OF ' + n), 'Overline', 'text/brand'), await T(title, 'Label/L', 'text/primary')], { gap: 2 }), [SPACER(), 'FILL'], await XBTN('L')], { gap: 4 }), 'FILL']); const s = AL('HORIZONTAL', { name: 'Segments wrap', p: [0, 8, 0, 8] }); add(s, [SEG(n, step), 'FILL']); add(h, [s, 'FILL']); add(fr, [h, 'FILL']); return h; }
async function MHEAD(c, o) { const h = COL('Header', [], { gap: 10 }); add(h, await TILE(o.icon, o.tone || 'brand', 48)); if (o.over) add(h, await T(o.over, 'Overline', TC[o.tone || 'brand'])); add(h, await P(o.title, 'Heading/H3', 'text/primary')); if (o.sub) add(h, await P(o.sub, 'Body/M', 'text/secondary')); add(c, [h, 'FILL']); return h; }
// ===== END AUTH-D KIT =====
const OUT = [];
const M19 = ['Start', 'Verify identity', 'Wallet recovery'];

const S19 = ['Start', 'Verify identity', 'Wallet recovery', 'Cooling-off notice', 'Success'];
for (const MODE of (typeof M19 !== 'undefined' ? M19 : S19)) { const k = S19.indexOf(MODE);
await FRAME('[AUTH-19] Account Recovery — Step ' + (k + 1) + ' ' + MODE + ' / 390 / Default', 3 + k, { mobile: true }, async ({ fr }) => {
  await MFLOW(fr, 'Account recovery', k === 4 ? 5 : k, 5, { over: 'STEP ' + (k + 1) + ' OF 5 · ' + MODE.toUpperCase() });
  const c = await MCONTENT(fr, 20);
  if (k === 0) {
    await MHEAD(c, { icon: 'shield-check', title: 'Recover your account', sub: 'Tell us which account it is and what you’ve lost access to.' });
    add(c, [await INPUT('Email or user ID', 'nova.k@example.com', 'Filled', { icon: 'user' }), 'FILL']);
    const g = COL('What can’t you access? (nothing pre-selected)', [], { gap: 8 }); add(g, await T('What can’t you access?', 'Label/M', 'text/primary'));
    for (const [l, d] of [['My authenticator app (2FA)', 'Lost, reset or replaced phone'], ['My email inbox', 'Can’t receive emails here any more'], ['Both', 'We’ll use your ID and verified wallet']]) add(g, [await RADIO(l, d, 'No'), 'FILL']);
    add(c, [g, 'FILL']);
    const w = await MCARD('What to expect', { icon: 'clock', tone: 'brand' }); for (const [ic, t] of [['id-card', 'ID + 30-second video selfie'], ['wallet', 'Optional: free signature with your verified wallet'], ['hourglass', 'Mandatory 48-hour withdrawal hold afterwards']]) add(w, [await BUL(ic, 'icon/brand', t, null, { ts: 'Body/S' }), 'FILL']); add(c, [w, 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' })]);
  } else if (k === 1) {
    await MHEAD(c, { icon: 'id-card', title: 'Confirm it’s really you', sub: 'We match your ID and a video selfie with your KYC Level 2 record (case REC-6620).' });
    await IDCARD(c, 0, 0, 0);
    const up = await I('20:9454', { State: 'Uploaded' }, { Label: 'Identity document', Description: 'Passport, ID card or driving licence · max 10 MB', 'Show privacy note': true }); await TX(up, 'File name', 'passport-photo-page.jpg'); add(c, [up, 'FILL']);
    const lv = ROW('Liveness check', [await TILE('camera', 'brand', 40), COL('Text', [await T('Selfie & liveness', 'Body/S Strong', 'text/primary'), await T('About 30 seconds', 'Caption', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await CHIP('clock', 'Not started', 'neutral')], { gap: 12, p: [12, 12, 12, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(c, [lv, 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Start camera', { size: 'L', lead: 'camera' }), await BTN('Ghost', 'Back', { size: 'L' })]);
  } else if (k === 2) {
    await MHEAD(c, { icon: 'wallet', title: 'Sign with your verified wallet', sub: 'Optional and free. It shortens the review from up to 24 hours to about 2.' });
    add(c, [await WALLETROW({ name: 'Browser wallet · verified', badge: await CHIP('check', 'Verified', 'success') }), 'FILL']);
    const m = COL('Recovery message (human-readable)', [], { gap: 8, p: [12, 14, 14, 14], fill: 'bg/secondary', stroke: 'border/default', r: 10 }); add(m, [ROW('Head', [await IC('file', 16, 'icon/muted'), await T('Message you’ll sign', 'Label/S', 'text/secondary'), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']); add(m, await P('GLOBAL POOL account recovery for GP-48213.\n\nSigning proves you control 0x12ab…9f3C. No transaction, no gas.\n\nCase: REC-6620 · Nonce: c41e07…\nIssued 17:05 UTC · expires 17:15 UTC', 'Mono/S', 'text/primary')); add(c, [m, 'FILL']);
    add(c, [await NOTE('lock', 'We never ask for your seed phrase. Anyone who does is not GLOBAL POOL.'), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Open wallet app to sign', { size: 'L', lead: 'wallet' }), await BTN('Ghost', 'Skip — use ID only', { size: 'L' })]);
  } else if (k === 3) {
    await MHEAD(c, { icon: 'hourglass', tone: 'warning', title: 'Recovery approved — withdrawals pause for 48 hours', sub: 'Approved 27 Nov 2026, 17:12 UTC. Withdrawals and security changes unlock on 29 Nov 2026, 17:12 UTC.' });
    await HOLDCARD(c, 0, 0, 0);
    const two = await MCARD('During the hold', { icon: 'list', tone: 'brand' }); for (const s of ['Withdrawals and address changes', 'Changing email or turning off 2FA']) add(two, [await BUL('pause-circle', 'icon/muted', s, null, { ts: 'Body/S' }), 'FILL']); for (const s of ['Sign in, balances, deposits and games', 'Limits, breaks and self-exclusion']) add(two, [await BUL('check', 'text/success', s, null, { ts: 'Body/S' }), 'FILL']); add(c, [two, 'FILL']);
    add(c, [await CHECK('I understand withdrawals are paused until 29 Nov 2026, 17:12 UTC'), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Continue', { size: 'L', state: 'Disabled', trail: 'arrow-right' }), await BTN('Ghost', 'This wasn’t me', { size: 'L' })]);
  } else {
    await MHEAD(c, { icon: 'check-circle', tone: 'success', title: 'Welcome back, Nova', sub: 'Recovered and secured — 27 Nov 2026, 17:16 UTC.' });
    for (const [t, d] of [['New password set', '17:15 UTC'], ['New authenticator linked', '10 fresh backup codes created'], ['Signed out everywhere else', 'iPhone 15 and Windows · Edge'], ['Confirmation emailed', 'Shows your anti-phishing code AURORA-27']]) add(c, [await BUL('check-circle', 'text/success', t, d), 'FILL']);
    add(c, [await ALERT('warning', 'Withdrawals unlock 29 Nov, 17:12 UTC', 'Your 9,215.30 USDT Available balance is safe. Deposits and games work within your limits.', { icon: 'clock' }), 'FILL']);
    await MCTA(fr, [await BTN('Primary', 'Go to lobby', { size: 'L', trail: 'arrow-right' }), await BTN('Ghost', 'Review security settings', { size: 'L' })]);
  }
}); }

return OUT;