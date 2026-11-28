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
// ===== AUTH-B KIT (subset) =====
function SPACER() { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; }
function ROW(name, kids = [], o = {}) { const r = AL('HORIZONTAL', { name, gap: o.gap ?? 12, align: o.align || 'CENTER', justify: o.justify, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, wrap: o.wrap, cgap: o.cgap, w: o.w }); for (const k of kids) add(r, k); return r; }
function COL(name, kids = [], o = {}) { const r = AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, align: o.align, w: o.w, clip: o.clip }); for (const k of kids) add(r, k); return r; }
async function P(s, st = 'Body/S', c = 'text/secondary', o = {}) { return [await T(s, st, c, { w: o.w || 120, name: o.name, align: o.align }), 'FILL']; }
const TONES = { brand: ['brand/tint', 'icon/brand'], success: ['status/success-tint', 'text/success'], warning: ['status/warning-tint', 'text/warning'], danger: ['status/danger-tint', 'text/danger'], info: ['status/info-tint', 'text/info'], neutral: ['surface/raised', 'icon/default'] };
async function TILE(icon, tone = 'brand', s = 48) { const [bg, ic] = TONES[tone]; const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icon, fill: bg, r: s >= 48 ? 14 : 10, align: 'CENTER', justify: 'CENTER', w: s, h: s }); add(t, await IC(icon, Math.round(s / 2), ic)); return t; }
async function ALERT(kind, title, body, o = {}) { const ic = { success: 'check-circle', danger: 'alert-circle', warning: 'alert-triangle', info: 'info' }[kind]; const a = AL('HORIZONTAL', { name: 'Alert/' + kind + ' — ' + title.slice(0, 30), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + kind + '-tint', stroke: 'status/' + kind, r: 10 }); add(a, await IC(o.icon || ic, 20, 'text/' + kind)); const tx = COL('Text', [], { gap: 4 }); add(tx, await P(title, 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, 'Body/S', 'text/secondary')); add(a, [tx, 'FILL']); return a; }
async function KV(k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, align: 'CENTER', p: [o.py ?? 10, 0, o.py ?? 10, 0] }); if (o.line !== false) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 100 }), 'FILL']); const vv = typeof v === 'string' ? await T(v, o.vs || 'Body/S Strong', o.vc || 'text/primary') : v; add(r, vv); if (o.demo) add(r, await DEMO('XS')); return r; }
async function KV2(k, v, o = {}) { const c = COL('Field — ' + k, [], { gap: 2 }); add(c, await T(k, 'Caption', 'text/tertiary')); add(c, await P(v, o.vs || 'Body/S Strong', o.vc || 'text/primary')); return c; }
async function LINK(s, o = {}) { const r = AL('HORIZONTAL', { name: 'Link — ' + s.slice(0, 40), gap: 6, align: 'CENTER' }); if (o.lead) add(r, await IC(o.lead, 16, o.ic || 'icon/brand')); add(r, await T(s, o.st || 'Label/M', o.c || 'text/brand')); if (o.trail) add(r, await IC(o.trail, 16, o.ic || 'icon/brand')); return r; }
async function NOTE(icon, text, o = {}) { const r = ROW('Note — ' + text.slice(0, 30), [await IC(icon, 16, o.ic || 'icon/muted')], { gap: 8, align: 'MIN' }); add(r, await P(text, o.st || 'Caption', o.c || 'text/tertiary')); return r; }
async function BUL(icon, ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Point — ' + title.slice(0, 40), gap: 12 }); add(r, o.tile ? await TILE(icon, o.tile, 32) : await IC(icon, 20, ic)); const tx = COL('Text', [], { gap: 2 }); add(tx, await P(title, o.ts || 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, o.bs || 'Body/S', 'text/secondary')); add(r, [tx, 'FILL']); return r; }
async function XBTN(size = 'S') { const b = await I('7:774', { Type: 'Ghost', Size: size, State: 'Default' }, { Icon: ICONS.x }); b.name = 'Close'; return b; }
function SEG(n, cur) { const bar = ROW('Progress — step ' + (cur + 1) + ' of ' + n, [], { gap: 6 }); for (let i = 0; i < n; i++) add(bar, [rect(10, 4, i < cur ? 'status/success' : i === cur ? 'brand/primary' : 'border/default', 9999, 'Segment ' + (i + 1)), 'FILL']); return bar; }
async function DIVROW(label) { const d = ROW('Divider — ' + label.slice(0, 30), [], { gap: 12 }); add(d, [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL'], await T(label, 'Caption', 'text/tertiary'), [rect(10, 1, 'border/subtle', 0, 'Line'), 'FILL']); return d; }
function COLY(sec, x, y0) { let m = 0, f = false; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)) { m = Math.max(m, ch.y + ch.height); f = true; } return f ? m + 160 : y0; }
function RESTACK(sec, x, y0) { const fs = sec.children.filter(ch => Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)).sort((a, b) => a.y - b.y); let y = y0; for (const f of fs) { f.y = y; y += f.height + 160; } }
async function START(NAME, col, o = {}) { const page = figma.root.children.find(p => p.name === (o.mobile ? '10 — Mobile Experience' : '04 — Authentication')); await figma.setCurrentPageAsync(page); const sec = o.mobile ? section('AUTH — Mobile B', 70000, 0) : section('AUTH-07/08/09/10 2FA & wallet connect', 12000, 0); const W = o.mobile ? 390 : 1440; const X = 120 + col * (W + 120); const old = sec.children.find(n => n.name === NAME); let Y = null; if (old) { Y = old.y; old.remove(); } if (Y == null) Y = COLY(sec, X, o.mobile ? 160 : 440); const fr = await screen(NAME, W); sec.appendChild(fr); fr.x = X; fr.y = Y; const db = await DEMOBAR(o.mobile ? 'DEMO DATA — illustrative values only' : undefined); add(fr, [db, 'FILL']); return { sec, fr, db, X }; }
async function FINISH(sec, fr, X, o = {}) { RESTACK(sec, X, o.mobile ? 160 : 440); fitSection(sec); await fr.screenshot({ scale: o.mobile ? 0.75 : 0.5 }); return { frame: fr.id, name: fr.name, size: [Math.round(fr.width), Math.round(fr.height)], at: [Math.round(fr.x), Math.round(fr.y)] }; }
function CENTER(fr, d, bg, o = {}) { let vh = bg.vp.height; const need = d.height + 2 * (o.m || 64); if (need > vh) { bg.vp.resize(bg.vp.width, need); bg.scrim.resize(bg.scrim.width, need); vh = need; } d.x = Math.round((fr.width - d.width) / 2) + (o.dx || 0); d.y = Math.round(bg.vp.y + (vh - d.height) / 2); }
async function QR(px = 168, seed = 7) { const n = 25, m = px / n; let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const inF = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); const f2 = v => (v * m).toFixed(2); const sq = (x, y, w) => `M${f2(x)} ${f2(y)}h${f2(w)}v${f2(w)}h-${f2(w)}z`; let d = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inF(x, y) && rnd() < 0.47) d += sq(x, y, 1); for (const [a, b] of [[0, 0], [n - 7, 0], [0, n - 7]]) d += sq(a, b, 7) + `M${f2(a + 1)} ${f2(b + 1)}v${f2(5)}h${f2(5)}v-${f2(5)}z` + sq(a + 2, b + 2, 3); const q = figma.createNodeFromSvg(`<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${d}" fill="#000"/></svg>`); q.name = 'QR — illustrative setup code (DEMO, not scannable)'; q.fills = []; tint(q, 'ink/900'); return q; }
function NORESEND(o) { for (const t of o.findAll(n => n.type === 'TEXT' && /resend/i.test(n.characters))) { const p = t.parent; (p && p !== o && p.type === 'FRAME' && p.children.length <= 3 ? p : t).visible = false; } return o; }
async function OTP(state, label, desc) { const o = await I('16:3761', { State: state }, { Label: label, Description: desc }); o.name = 'Input/OTP — ' + label + ' (' + state + ')'; return NORESEND(o); }
async function MBG(fr, o = {}) { const top = await I('23:12908', { State: o.auth || 'Member' }); add(fr, [top, 'FILL']); const c = AL('VERTICAL', { name: 'Page behind sheet', gap: 16, p: [16, 16, 16, 16], clip: true }); add(fr, [c, 'FILL']); if (o.content) await o.content(c); else add(c, [await I('24:13861', { State: 'Open' }), 'FILL']); const tab = await I('22:5413', { Active: o.tab || 'Home' }); add(fr, [tab, 'FILL']); return { top, c, tab }; }
async function SHEET(name, o = {}) { const s = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: o.gap ?? 20, p: [8, 16, 34, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: 390 }); s.setBoundVariable('topLeftRadius', VAR['radius/2xl']); s.setBoundVariable('topRightRadius', VAR['radius/2xl']); await fx(s, 'Elevation/4 — Modal'); const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [4, 0, 0, 0] }); add(g, rect(36, 4, 'border/strong', 9999, 'Handle')); add(s, [g, 'FILL']); return s; }
async function SHEAD(s, title, o = {}) { const r = ROW('Sheet header', [], { gap: 8 }); if (o.back) add(r, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] })); add(r, [await T(title, 'Heading/H5', 'text/primary', { w: 200 }), 'FILL']); add(r, await XBTN('L')); add(s, [r, 'FILL']); return r; }
function MPLACE(fr, db, bg, s) { const fixed = db.height + bg.top.height + bg.tab.height; const want = Math.max(844, s.height + db.height + bg.top.height + 72); bg.c.resize(390, Math.max(120, want - fixed)); const scrim = rect(390, want - db.height, 'scrim/overlay', 0, 'Scrim'); fr.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = db.height; fr.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = want - s.height; return scrim; }
async function STICKY(s, kids, o = {}) { const f = COL('Sticky actions', [], { gap: 8, p: [12, 0, 0, 0] }); strokeSides(f, 'border/subtle', { t: 1 }); for (const k of kids) add(f, [k, 'FILL']); add(s, [f, 'FILL']); return f; }
async function MPAGE(fr, o = {}) { const top = await I('23:12908', { State: 'Member' }); add(fr, [top, 'FILL']); const c = AL('VERTICAL', { name: 'Content', gap: 20, p: [16, 16, 24, 16] }); add(fr, [c, 'FILL']); return { top, c }; }
async function MSTICKYBAR(fr, kids) { const f = COL('Sticky CTA bar', [], { gap: 8, p: [12, 16, 12, 16], fill: 'bg/base' }); strokeSides(f, 'border/subtle', { t: 1 }); for (const k of kids) add(f, [k, 'FILL']); add(fr, [f, 'FILL']); add(fr, [await I('22:5413', { Active: 'Account' }), 'FILL']); return f; }
// ===== END AUTH-B KIT =====
const OUT = [];
for (const STEP of (typeof M07 !== 'undefined' ? M07 : [0, 1, 2])) { const NM = ['Step 1 Set up', 'Step 2 Confirm', 'Step 3 Backup codes'][STEP]; const { sec, fr, db, X } = await START('AUTH-07 2FA Enrollment — ' + NM + ' / 390 / Default', STEP, { mobile: true });
const { c } = await MPAGE(fr);
add(c, [ROW('Back row', [await LINK(STEP ? 'Back' : 'Security', { lead: 'arrow-left', c: 'text/secondary', ic: 'icon/muted' }), [SPACER(), 'FILL'], await T('Step ' + (STEP + 1) + ' of 3', 'Label/S', 'text/brand')], { gap: 8, p: [4, 0, 0, 0] }), 'FILL']);
add(c, [SEG(3, STEP), 'FILL']);
const hd = COL('Title', [], { gap: 8 }); add(c, [hd, 'FILL']);
if (STEP === 0) {
  add(hd, await P('Add GLOBAL POOL to your authenticator app', 'Heading/H4', 'text/primary'), await P('You’re on your phone, so there’s nothing to scan — add the key straight to your app.', 'Body/S', 'text/secondary'));
  add(c, [await BTN('Primary', 'Open authenticator app', { size: 'L', lead: 'external-link' }), 'FILL']);
  add(c, [await NOTE('info', 'Opens your default authenticator app with GLOBAL POOL and the key filled in. Come back here afterwards.'), 'FILL']);
  add(c, [await DIVROW('or add the key manually'), 'FILL']);
  const k = COL('Setup key', [], { gap: 12, p: 16, fill: 'surface/raised', stroke: 'border/default', r: 14 });
  add(k, [ROW('Head', [await T('Setup key', 'Label/M', 'text/primary'), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']);
  add(k, await P('JBSW Y3DP EHPK 3PXP KQ2T 7MNA', 'Mono/M', 'text/primary', { name: 'Setup key value' }));
  add(k, [await KV2('Account name', 'GLOBAL POOL (n•••@example.com)'), 'FILL'], [await KV2('Type', 'Time-based (TOTP) · 6 digits · every 30 s'), 'FILL']);
  add(k, [await BTN('Secondary', 'Copy key', { lead: 'copy' }), 'FILL']);
  add(c, [k, 'FILL']);
  add(c, [ROW('Option — QR for another device', [await TILE('qr-code', 'neutral', 36), COL('T', [await T('Setting up on another device?', 'Body/S Strong', 'text/primary'), await P('Show the QR code to scan with a tablet or second phone', 'Caption', 'text/tertiary')], { gap: 2 }), await IC('chevron-down', 20, 'icon/muted')], { gap: 12, p: [12, 16, 12, 12], fill: 'surface/default', stroke: 'border/subtle', r: 10 }), 'FILL']);
  c.children[c.children.length - 1].children[1].layoutSizingHorizontal = 'FILL';
  add(c, [await ALERT('info', 'Any TOTP authenticator app works', 'We don’t offer SMS codes — they can be stolen with a SIM swap.'), 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Next: enter code', { size: 'L', trail: 'arrow-right' })]);
} else if (STEP === 1) {
  add(hd, await P('Enter the 6-digit code', 'Heading/H4', 'text/primary'), await P('Switch to your authenticator app, copy the code under “GLOBAL POOL” and paste it here.', 'Body/S', 'text/secondary'));
  add(c, await OTP('Complete', 'Authenticator code', 'Changes every 30 seconds'));
  add(c, ROW('Paste', [await LINK('Paste code', { lead: 'copy' })], { gap: 8 }));
  add(c, [await NOTE('clock', 'Code rejected? Codes depend on your phone’s clock — turn on automatic date and time, then use the newest code.'), 'FILL']);
  const pr = COL('What 2FA protects', [], { gap: 14, p: 16, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
  add(pr, await T('We’ll ask for a code when you:', 'Label/M', 'text/primary'));
  add(pr, [await BUL('log-in', 'icon/brand', 'Sign in on a new device', null), 'FILL'], [await BUL('withdraw', 'icon/brand', 'Withdraw or add a withdrawal address', null), 'FILL'], [await BUL('key', 'icon/brand', 'Change password, email or 2FA', null), 'FILL']);
  add(c, [pr, 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Verify and turn on', { size: 'L', lead: 'shield-check' })]);
} else {
  add(c, [await ALERT('success', 'Two-step sign-in is on', 'Turned on 27 Nov 2026, 16:31 UTC.'), 'FILL']);
  add(hd, await P('Save your 10 backup codes', 'Heading/H4', 'text/primary'), await P('Each code signs you in once if you lose your phone. This is the only time we show them.', 'Body/S', 'text/secondary'));
  const cc = COL('Backup codes card', [], { gap: 12, p: 16, fill: 'bg/secondary', stroke: 'border/default', r: 14 });
  add(cc, [ROW('Head', [await IC('key', 16, 'icon/brand'), await T('Backup codes', 'Label/M', 'text/primary'), [SPACER(), 'FILL'], await DEMO('S')], { gap: 8 }), 'FILL']);
  const CODES = ['4F7K-2QXM', '9TRB-H3LC', 'P2WD-8KZN', '6YHM-Q4TA', 'C8XJ-5RVE', 'M3NP-7GUB', 'T6QZ-1WKD', 'H9AE-3SLF', 'X4KC-6PVR', 'B7UD-2NQY'];
  const grid = ROW('Codes grid (2 × 5, monospace)', [], { gap: 8, align: 'MIN' });
  for (let q = 0; q < 2; q++) { const colm = COL('Column ' + (q + 1), [], { gap: 6 }); for (let i = 0; i < 5; i++) { const n = q * 5 + i; add(colm, [ROW('Code ' + (n + 1), [await T(String(n + 1).padStart(2, '0'), 'Mono/S', 'text/tertiary'), await T(CODES[n], 'Mono/S', 'text/primary')], { gap: 8, p: [8, 10, 8, 10], fill: 'surface/default', stroke: 'border/subtle', r: 6 }), 'FILL']); } add(grid, [colm, 'FILL']); }
  add(cc, [grid, 'FILL']);
  add(cc, [ROW('Code actions', [[await BTN('Secondary', 'Download', { lead: 'download' }), 'FILL'], [await BTN('Secondary', 'Copy all', { lead: 'copy' }), 'FILL']], { gap: 8 }), 'FILL']);
  add(c, [cc, 'FILL']);
  add(c, [await ALERT('warning', 'Keep them offline and private', 'Use a password manager or paper — not screenshots. We’ll never ask you for them.'), 'FILL']);
  add(c, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I’ve saved my backup codes somewhere safe', 'Show description': false }), 'FILL']);
  await MSTICKYBAR(fr, [await BTN('Primary', 'Finish setup', { size: 'L', state: 'Disabled' }), await T('Available once you tick the box above.', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' })]);
}
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }

for (const MODE of (typeof M08 !== 'undefined' ? M08 : ['Login Default', 'Login Locked', 'Withdrawal Default'])) { const WD = MODE.startsWith('Withdrawal'), LOCK = MODE.endsWith('Locked');
const { sec, fr, db, X } = await START('AUTH-08 2FA Challenge — ' + (WD ? 'Withdrawal' : 'Login') + ' / 390 / ' + (LOCK ? 'Locked' : 'Default'), WD ? 4 : 3, { mobile: true });
const bg = await MBG(fr, WD ? { auth: 'Member', tab: 'Wallet', content: async (c) => { add(c, await P('Withdraw USDT', 'Heading/H4', 'text/primary')); add(c, [await I('14:1974', { Layout: 'Compact' }, { 'Show DEMO': true }), 'FILL']); } } : { auth: 'Guest', tab: 'Home' });
const s = await SHEET(MODE);
await SHEAD(s, WD ? 'Confirm withdrawal' : LOCK ? 'Sign-in paused' : 'Two-step sign-in', { back: !WD });
const ap = ROW('Anti-phishing code', [await IC('shield-check', 16, 'icon/brand'), await T('Anti-phishing code', 'Caption', 'text/secondary'), [SPACER(), 'FILL'], ROW('Code chip', [await T('AURORA-27', 'Mono/S', 'text/brand')], { p: [2, 8, 2, 8], fill: 'brand/tint', r: 6 }), await DEMO('XS')], { gap: 8, p: [10, 12, 10, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 10 });
if (WD) {
  const k = COL('Withdrawal summary', [], { gap: 0, p: [4, 14, 4, 14], fill: 'bg/secondary', stroke: 'border/subtle', r: 12 });
  add(k, [await KV('Withdrawal', 'WD-20931', { vs: 'Mono/S', demo: true }), 'FILL'], [await KV('Amount', '1,500.00 USDT', { vs: 'Number/S' }), 'FILL'], [await KV('To · Arbitrum', '0x7c4e…a21D', { vs: 'Mono/S' }), 'FILL'], [await KV('Network fee', '0.08 USDT'), 'FILL'], [await KV('You receive', '1,499.92 USDT', { vs: 'Number/S', vc: 'balance/available', line: false }), 'FILL']);
  add(s, [k, 'FILL']); add(s, [ap, 'FILL']);
  add(s, await OTP('Complete', 'Authenticator code', 'Codes refresh every 30 seconds'));
  add(s, [ROW('Links', [await LINK('Use backup code', { lead: 'key' }), [SPACER(), 'FILL'], await LINK('Lost your device?', { c: 'text/secondary' })], { gap: 8 }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Confirm withdrawal', { size: 'L' }), await BTN('Ghost', 'Cancel', { size: 'L' })]);
} else if (LOCK) {
  const lc = COL('Lock status', [], { gap: 10, p: 14, fill: 'status/danger-tint', stroke: 'status/danger', r: 12 });
  add(lc, [ROW('Head', [await IC('lock', 20, 'text/danger'), await T('Too many incorrect codes', 'Body/S Strong', 'text/primary')], { gap: 10 }), 'FILL']);
  add(lc, await P('Two-step sign-in is paused until 16:59 UTC (27 Nov 2026). Nothing in your account changed.', 'Body/S', 'text/secondary'));
  add(lc, ROW('Countdown', [await IC('clock', 14, 'icon/muted'), await T('Try again in 14:52', 'Number/S', 'text/primary')], { gap: 6, p: [4, 10, 4, 10], fill: 'surface/raised', r: 9999 }));
  add(s, [lc, 'FILL']);
  add(s, await OTP('Disabled', 'Authenticator code', 'Available again at 16:59 UTC'));
  add(s, [await BUL('mail', 'icon/brand', 'We emailed n•••@example.com', 'It shows your anti-phishing code AURORA-27. No code — not from us.'), 'FILL'], [await BUL('key', 'icon/brand', 'Lost your phone?', 'After the pause, use a backup code — or start account recovery.'), 'FILL']);
  await STICKY(s, [await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' }), await BTN('Ghost', 'Start account recovery', { size: 'L' })]);
} else {
  add(s, await P('Enter the code from your authenticator app for GLOBAL POOL (n•••@example.com).', 'Body/S', 'text/secondary'));
  add(s, [ap, 'FILL']);
  add(s, await OTP('Complete', 'Authenticator code', 'Codes refresh every 30 seconds'));
  add(s, [await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Trust this phone for 30 days', 'Show description': false }), 'FILL']);
  add(s, [ROW('Links', [await LINK('Use backup code', { lead: 'key' }), [SPACER(), 'FILL'], await LINK('Lost your device?', { c: 'text/secondary' })], { gap: 8 }), 'FILL']);
  await STICKY(s, [await BTN('Primary', 'Verify and sign in', { size: 'L', lead: 'log-in' })]);
}
MPLACE(fr, db, bg, s);
OUT.push(await FINISH(sec, fr, X, { mobile: true })); }

return OUT;