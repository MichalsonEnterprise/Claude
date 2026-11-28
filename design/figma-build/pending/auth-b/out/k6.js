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
async function ST(n, s) { if (!n || n.type !== 'TEXT') return n; const L = n.characters.length; const fs = L ? n.getRangeAllFontNames(0, L) : [n.fontName]; await Promise.all(fs.map(f => figma.loadFontAsync(f))); n.characters = String(s); return n; }
async function TX(root, name, s, i = 0) { const a = root.findAll(x => x.type === 'TEXT' && x.name === name); if (a[i]) await ST(a[i], s); return a[i] || null; }
function SPACER() { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; }
function ROW(name, kids = [], o = {}) { const r = AL('HORIZONTAL', { name, gap: o.gap ?? 12, align: o.align || 'CENTER', justify: o.justify, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, wrap: o.wrap, cgap: o.cgap, w: o.w }); for (const k of kids) add(r, k); return r; }
function COL(name, kids = [], o = {}) { const r = AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p, fill: o.fill, stroke: o.stroke, r: o.r, align: o.align, w: o.w, clip: o.clip }); for (const k of kids) add(r, k); return r; }
async function P(s, st = 'Body/S', c = 'text/secondary', o = {}) { return [await T(s, st, c, { w: o.w || 120, name: o.name, align: o.align }), 'FILL']; }
const TONES = { brand: ['brand/tint', 'icon/brand'], success: ['status/success-tint', 'text/success'], warning: ['status/warning-tint', 'text/warning'], danger: ['status/danger-tint', 'text/danger'], info: ['status/info-tint', 'text/info'], neutral: ['surface/raised', 'icon/default'] };
async function TILE(icon, tone = 'brand', s = 48) { const [bg, ic] = TONES[tone]; const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icon, fill: bg, r: s >= 48 ? 14 : 10, align: 'CENTER', justify: 'CENTER', w: s, h: s }); add(t, await IC(icon, Math.round(s / 2), ic)); return t; }
async function ALERT(kind, title, body, o = {}) { const ic = { success: 'check-circle', danger: 'alert-circle', warning: 'alert-triangle', info: 'info' }[kind]; const a = AL('HORIZONTAL', { name: 'Alert/' + kind + ' — ' + title.slice(0, 30), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + kind + '-tint', stroke: 'status/' + kind, r: 10 }); add(a, await IC(o.icon || ic, 20, 'text/' + kind)); const tx = COL('Text', [], { gap: 4 }); add(tx, await P(title, 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, 'Body/S', 'text/secondary')); add(a, [tx, 'FILL']); return a; }
async function KV(k, v, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, align: 'CENTER', p: [o.py ?? 10, 0, o.py ?? 10, 0] }); if (o.line !== false) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 100 }), 'FILL']); const vv = typeof v === 'string' ? await T(v, o.vs || 'Body/S Strong', o.vc || 'text/primary') : v; add(r, vv); if (o.demo) add(r, await DEMO('XS')); return r; }
async function NOTE(icon, text, o = {}) { const r = ROW('Note — ' + text.slice(0, 30), [await IC(icon, 16, o.ic || 'icon/muted')], { gap: 8, align: 'MIN' }); add(r, await P(text, o.st || 'Caption', o.c || 'text/tertiary')); return r; }
async function BUL(icon, ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Point — ' + title.slice(0, 40), gap: 12 }); add(r, o.tile ? await TILE(icon, o.tile, 32) : await IC(icon, 20, ic)); const tx = COL('Text', [], { gap: 2 }); add(tx, await P(title, o.ts || 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, o.bs || 'Body/S', 'text/secondary')); add(r, [tx, 'FILL']); return r; }
async function XBTN(size = 'S') { const b = await I('7:774', { Type: 'Ghost', Size: size, State: 'Default' }, { Icon: ICONS.x }); b.name = 'Close'; return b; }
async function RB(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await TX(b, 'Label', label); return b; }
async function CHIP(icon, label, tone = 'success') { const [bg, c] = TONES[tone]; return ROW('Chip — ' + label, [await IC(icon, 14, c), await T(label, 'Label/S', c === 'icon/brand' ? 'text/brand' : c)], { gap: 6, p: [4, 10, 4, 10], fill: bg, r: 9999 }); }
function COLY(sec, x, y0) { let m = 0, f = false; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)) { m = Math.max(m, ch.y + ch.height); f = true; } return f ? m + 160 : y0; }
function RESTACK(sec, x, y0) { const fs = sec.children.filter(ch => Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)).sort((a, b) => a.y - b.y); let y = y0; for (const f of fs) { f.y = y; y += f.height + 160; } }
async function START(NAME, col, o = {}) { const page = figma.root.children.find(p => p.name === (o.mobile ? '10 — Mobile Experience' : '04 — Authentication')); await figma.setCurrentPageAsync(page); const sec = o.mobile ? section('AUTH — Mobile B', 70000, 0) : section('AUTH-07/08/09/10 2FA & wallet connect', 12000, 0); const W = o.mobile ? 390 : 1440; const X = 120 + col * (W + 120); const old = sec.children.find(n => n.name === NAME); let Y = null; if (old) { Y = old.y; old.remove(); } if (Y == null) Y = COLY(sec, X, o.mobile ? 160 : 440); const fr = await screen(NAME, W); sec.appendChild(fr); fr.x = X; fr.y = Y; const db = await DEMOBAR(); add(fr, [db, 'FILL']); return { sec, fr, db, X }; }
async function FINISH(sec, fr, X, o = {}) { RESTACK(sec, X, o.mobile ? 160 : 440); fitSection(sec); await fr.screenshot({ scale: o.mobile ? 0.75 : 0.5 }); return { frame: fr.id, name: fr.name, size: [Math.round(fr.width), Math.round(fr.height)], at: [Math.round(fr.x), Math.round(fr.y)] }; }
async function LOBBYBG(fr, db, o = {}) { const vp = AL('HORIZONTAL', { name: 'Viewport — ' + (o.label || 'member lobby behind dialog'), clip: true, h: 1024 }); add(fr, [vp, 'FILL']); const sb = await I('23:6697', { State: 'Expanded', Auth: o.auth || 'Member' }); add(vp, sb); sb.layoutSizingVertical = 'FILL'; const col = AL('VERTICAL', { name: 'Main column', clip: true }); add(vp, [col, 'FILL']); col.layoutSizingVertical = 'FILL'; add(col, [await I('23:9832', { State: o.top || 'Member' }), 'FILL']); if (o.content) await o.content(col); else for (const id of (o.sections || ['32:20477', '32:44403'])) { const c = await figma.getNodeByIdAsync(id); add(col, [c.createInstance(), 'FILL']); } const scrim = rect(1440, 1024, 'scrim/overlay', 0, 'Scrim'); fr.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = db.height; return { vp, col, scrim, sb }; }
function DIALOG(fr, o = {}) { const d = AL(o.dir || 'HORIZONTAL', { name: o.name || 'Dialog', fill: 'surface/overlay', stroke: 'border/subtle', r: 20, clip: true, w: o.w, gap: o.gap, p: o.p }); fr.appendChild(d); d.layoutPositioning = 'ABSOLUTE'; return d; }
function CENTER(fr, d, bg, o = {}) { let vh = bg.vp.height; const need = d.height + 2 * (o.m || 64); if (need > vh) { bg.vp.resize(bg.vp.width, need); bg.scrim.resize(bg.scrim.width, need); vh = need; } d.x = Math.round((fr.width - d.width) / 2) + (o.dx || 0); d.y = Math.round(bg.vp.y + (vh - d.height) / 2); }
async function FLOAT(fr, node, x, y) { fr.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; node.x = x; node.y = y; return node; }
async function ACTIONS(form, left = [], right = []) { const r = ROW('Actions', [], { gap: 12, p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); for (const k of left) add(r, k); add(r, [SPACER(), 'FILL']); for (const k of right) add(r, k); add(form, [r, 'FILL']); return r; }
async function WALLETROW(o = {}) { const mk = await I(o.mark || '27:15872'); const id = COL('Wallet', [], { gap: 4 }); add(id, await T(o.name || 'Browser wallet', 'Label/M', 'text/primary')); add(id, await I('9:418', { Size: 'S', State: 'Default' }, { Address: '0x12ab…9f3C', 'Show DEMO': true })); const r = ROW('Wallet — ' + (o.name || 'Browser wallet'), [mk, [id, 'FILL']], { gap: 12, p: [12, 16, 12, 12], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); if (o.badge) add(r, o.badge); else add(r, await I('9:377', { Chain: 'BNB Chain', Status: 'Operational' }, { 'Show status label': false, 'Show chevron': false })); return r; }
const SIGNMSG = 'GLOBAL POOL wants you to sign in with your wallet 0x12ab…9f3C.\n\nThis request will not trigger a transaction or cost gas.\n\nNonce: 8f3a91…\nIssued: 27 Nov 2026 16:42 UTC';
async function MSGBOX(o = {}) { const b = COL('Sign-in message (human-readable)', [], { gap: 10, p: [14, 16, 16, 16], fill: 'bg/secondary', stroke: o.expired ? 'border/subtle' : 'border/default', r: 10 }); add(b, [ROW('Head', [await IC('file', 16, 'icon/muted'), await T(o.label || 'Message you’ll sign', 'Label/S', 'text/secondary'), [SPACER(), 'FILL'], o.expired ? await RB('Expired', 'Expired 16:52 UTC') : await T('Issued by globalpool.example', 'Caption', 'text/tertiary'), await DEMO('XS')], { gap: 8 }), 'FILL']); add(b, await P(SIGNMSG, 'Mono/S', o.expired ? 'text/tertiary' : 'text/primary', { name: 'Message text' })); return b; }
async function EXTPOPUP(o = {}) { const w = COL('Illustration — browser wallet pop-up (neutral mock of the wallet extension, not GLOBAL POOL UI)', [], { gap: 14, p: [16, 16, 16, 16], fill: 'surface/raised', stroke: 'border/strong', r: 14, w: 340 }); await fx(w, 'Elevation/3 — Popover'); add(w, [ROW('Wallet header', [await I('27:15872'), COL('Wallet', [await T('Browser wallet', 'Label/M', 'text/primary'), await T('Account 1 · 0x12ab…9f3C', 'Mono/S', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 10 }), 'FILL']); add(w, [ROW('Requesting site', [await IC('globe', 16, 'icon/muted'), await T('globalpool.example', 'Mono/S', 'text/secondary'), [SPACER(), 'FILL'], await T('BNB Chain · ID 56', 'Caption', 'text/tertiary')], { gap: 8, p: [8, 12, 8, 12], fill: 'bg/secondary', r: 10 }), 'FILL']); add(w, await P(o.title, 'Heading/H5', 'text/primary')); if (o.sign) { const m = COL('Message', [], { gap: 6, p: [12, 12, 12, 12], fill: 'bg/secondary', stroke: 'border/subtle', r: 10 }); add(m, await T('MESSAGE', 'Overline', 'text/tertiary')); add(m, await P(SIGNMSG, 'Mono/S', 'text/primary')); add(w, [m, 'FILL']); add(w, [await NOTE('info', 'Signing is free. This is not a transaction and can’t move funds.', { ic: 'text/info' }), 'FILL']); } else { add(w, [await BUL('check', 'text/success', 'See your address and balances', null, { ts: 'Body/S' }), 'FILL'], [await BUL('check', 'text/success', 'Ask you to sign messages', null, { ts: 'Body/S' }), 'FILL'], [await BUL('x', 'text/tertiary', 'Move funds without your approval — not possible', null, { ts: 'Body/S' }), 'FILL']); } add(w, [ROW('Buttons', [[await BTN('Secondary', o.no || 'Cancel'), 'FILL'], [await BTN('Primary', o.yes || 'Connect'), 'FILL']], { gap: 8 }), 'FILL']); return w; }
async function TOAST(type, title, body) { const t = await I('30:16872', { Type: type }); await TX(t, 'Title', title); await TX(t, 'Body', body); return t; }
// ===== END AUTH-B KIT =====
const OUT = [];
const D10 = ['Request', 'Success', 'Rejected', 'Expired nonce'];

for (const MODE of (typeof D10 !== 'undefined' ? D10 : ['Request', 'Success'])) { const { sec, fr, db, X } = await START('AUTH-10 Wallet Verification / 1440 / ' + MODE, 6);
const bg = await LOBBYBG(fr, db, { label: 'member lobby behind wallet verification dialog' });
const d = DIALOG(fr, { dir: 'VERTICAL', w: 560, gap: 20, p: [24, 32, 32, 32], name: 'Dialog — Verify wallet ownership (' + MODE + ')' }); await fx(d, 'Elevation/4 — Modal');
const CFG = { Request: ['key', 'brand', 'VERIFY OWNERSHIP · STEP 2 OF 2', 'Sign a message in your wallet', 'This proves you control 0x12ab…9f3C. It’s free — signing a message is not a transaction and can’t move funds.'], Success: ['check-circle', 'success', 'WALLET VERIFIED', 'This wallet is now verified', 'Your signature matched 0x12ab…9f3C. You can deposit from it now and add it as a withdrawal address.'], Rejected: ['x-circle', 'danger', 'SIGNATURE DECLINED', 'You declined the signature', 'Nothing happened: no transaction was sent and no fees were charged. The wallet stays connected but unverified.'], 'Expired nonce': ['clock', 'warning', 'REQUEST EXPIRED', 'This sign-in request has expired', 'Each message works once and expires 10 minutes after it’s issued. This one was issued at 16:42 UTC and expired at 16:52 UTC.'] }[MODE];
add(d, [ROW('Header', [await TILE(CFG[0], CFG[1], 48), [SPACER(), 'FILL'], await XBTN()], { align: 'MIN' }), 'FILL']);
const hd = COL('Title', [], { gap: 8 }); add(hd, await T(CFG[2], 'Overline', CFG[1] === 'brand' ? 'text/brand' : 'text/' + CFG[1]), await P(CFG[3], 'Heading/H3', 'text/primary'), await P(CFG[4], 'Body/M', 'text/secondary')); add(d, [hd, 'FILL']);
if (MODE === 'Request') {
  add(d, [await WALLETROW(), 'FILL']);
  add(d, [await MSGBOX(), 'FILL']);
  add(d, ROW('Guarantees', [await CHIP('check', 'No transaction'), await CHIP('check', 'No gas · 0.00'), await CHIP('check', 'Can’t move funds')], { gap: 8 }));
  add(d, [ROW('Waiting', [await IC('spinner', 20, 'icon/brand'), COL('T', [await T('Waiting for your signature in Browser wallet…', 'Body/S Strong', 'text/primary'), await T('Expires at 16:52 UTC · 09:12 left', 'Caption', 'text/tertiary')], { gap: 2 }), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 12, p: [12, 16, 12, 16], fill: 'surface/raised', stroke: 'border/subtle', r: 10 }), 'FILL']);
  add(d, [await NOTE('shield-check', 'Only sign if the message starts with “GLOBAL POOL wants you to sign in” and your wallet shows globalpool.example. Never sign anything that asks to approve tokens or send funds.', { ic: 'icon/brand' }), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Cancel')], [await BTN('Secondary', 'Open wallet again', { lead: 'external-link' })]);
  const pop = await EXTPOPUP({ title: 'Signature request', sign: true, no: 'Reject', yes: 'Sign' }); await FLOAT(fr, pop, 1440 - 340 - 24, db.height + 8);
} else if (MODE === 'Success') {
  add(d, [await WALLETROW({ badge: await RB('Approved', 'Verified') }), 'FILL']);
  const k = COL('Verification record', [], { gap: 0, p: [4, 16, 4, 16], fill: 'bg/secondary', stroke: 'border/subtle', r: 10 });
  add(k, [await KV('Verified', '27 Nov 2026, 16:43 UTC', { demo: true }), 'FILL'], [await KV('Signature', '0x4c1d…92ab', { vs: 'Mono/S', demo: true }), 'FILL'], [await KV('Nonce', '8f3a91… · used, can’t be reused', { vs: 'Mono/S' }), 'FILL'], [await KV('Transaction', 'None — gas spent 0.00', { line: false }), 'FILL']);
  add(d, [k, 'FILL']);
  add(d, [await BUL('deposit', 'icon/brand', 'Deposit USDT from this wallet', 'Send USDT (BEP-20) on BNB Chain. Minimum deposit 10.00 USDT.', { tile: 'brand' }), 'FILL'], [await BUL('shield-check', 'icon/brand', 'Use it for withdrawals', 'Add it to your whitelist — new withdrawal addresses have a 24-hour cooldown.', { tile: 'brand' }), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Done')], [await BTN('Secondary', 'Add to whitelist'), await BTN('Primary', 'Deposit USDT', { lead: 'deposit' })]);
  const t = await TOAST('Success', 'Wallet verified', '0x12ab…9f3C is verified. No transaction was sent and no gas was spent.'); await FLOAT(fr, t, 1440 - t.width - 24, db.height + 80);
} else if (MODE === 'Rejected') {
  add(d, [await WALLETROW({ badge: await RB('Pending', 'Unverified') }), 'FILL']);
  add(d, [await ALERT('info', 'Why we ask for a signature', 'It’s the only way to prove the wallet is yours without moving any funds. Unverified wallets can’t be used for withdrawals.'), 'FILL']);
  const w = COL('Options', [], { gap: 14 }); add(w, await T('What you can do', 'Label/M', 'text/primary'));
  add(w, [await BUL('refresh', 'icon/brand', 'Try again', 'We’ll send a fresh message with a new nonce — check it starts with “GLOBAL POOL wants you to sign in”.'), 'FILL'], [await BUL('wallet', 'icon/brand', 'Use a different wallet', 'Disconnect this one and connect another.'), 'FILL'], [await BUL('clock', 'icon/brand', 'Verify later', 'You can deposit and play from your balance. Verify any time in Wallet → Connected wallets.'), 'FILL']);
  add(d, [w, 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Disconnect wallet')], [await BTN('Secondary', 'Later'), await BTN('Primary', 'Try again', { lead: 'refresh' })]);
} else {
  add(d, [await WALLETROW({ badge: await RB('Pending', 'Unverified') }), 'FILL']);
  add(d, [await MSGBOX({ expired: true, label: 'Expired message' }), 'FILL']);
  add(d, [await ALERT('warning', 'Still see the old request in your wallet?', 'Reject it there. Signing an expired message does nothing — we only accept the newest nonce, once.'), 'FILL']);
  await ACTIONS(d, [await BTN('Ghost', 'Cancel')], [await BTN('Primary', 'Get a new message', { lead: 'refresh' })]);
}
CENTER(fr, d, bg, MODE === 'Request' ? { dx: -120 } : {});
OUT.push(await FINISH(sec, fr, X)); }

return OUT;