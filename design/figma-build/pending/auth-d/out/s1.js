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
async function LINK(s, o = {}) { const r = AL('HORIZONTAL', { name: 'Link — ' + s.slice(0, 40), gap: 6, align: 'CENTER' }); if (o.lead) add(r, await IC(o.lead, 16, o.ic || 'icon/brand')); add(r, await T(s, o.st || 'Label/M', o.c || 'text/brand')); if (o.trail) add(r, await IC(o.trail, 16, o.ic || 'icon/brand')); return r; }
async function NOTE(icon, text, o = {}) { const r = ROW('Note — ' + text.slice(0, 30), [await IC(icon, 16, o.ic || 'icon/muted')], { gap: 8, align: 'MIN' }); add(r, await P(text, o.st || 'Caption', o.c || 'text/tertiary')); return r; }
async function BUL(icon, ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Point — ' + title.slice(0, 40), gap: 12 }); add(r, o.tile ? await TILE(icon, o.tile, 32) : await IC(icon, 20, ic)); const tx = COL('Text', [], { gap: 2 }); add(tx, await P(title, o.ts || 'Body/S Strong', 'text/primary')); if (body) add(tx, await P(body, o.bs || 'Body/S', 'text/secondary')); add(r, [tx, 'FILL']); return r; }
async function XBTN(size = 'S') { const b = await I('7:774', { Type: 'Ghost', Size: size, State: 'Default' }, { Icon: ICONS.x }); b.name = 'Close'; return b; }
function SEG(n, cur) { const bar = ROW('Progress — step ' + (cur + 1) + ' of ' + n, [], { gap: 6 }); for (let i = 0; i < n; i++) add(bar, [rect(10, 4, i < cur ? 'status/success' : i === cur ? 'brand/primary' : 'border/default', 9999, 'Segment ' + (i + 1)), 'FILL']); return bar; }
function BLOCKS(art, a = 'brand/primary', b = 'surface/raised') { const r1 = rect(640, 132, b, 0, 'Angled block — charcoal'); art.appendChild(r1); r1.rotation = 10; r1.x = -80; r1.y = 168; const r2 = rect(640, 56, a, 0, 'Angled block — mint'); art.appendChild(r2); r2.rotation = 10; r2.x = -80; r2.y = 214; }
function COLY(sec, x, y0) { let m = 0, f = false; for (const ch of sec.children) if (Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)) { m = Math.max(m, ch.y + ch.height); f = true; } return f ? m + 160 : y0; }
function RESTACK(sec, x, y0) { const fs = sec.children.filter(ch => Math.abs(ch.x - x) < 2 && ch.type === 'FRAME' && !/^Notes/.test(ch.name)).sort((a, b) => a.y - b.y); let y = y0; for (const f of fs) { f.y = y; y += f.height + 160; } }
async function LOBBYBG(fr, db, o = {}) { const vp = AL('HORIZONTAL', { name: 'Viewport — ' + (o.label || 'member lobby behind dialog'), clip: true, h: 1024 }); add(fr, [vp, 'FILL']); const sb = await I('23:6697', { State: 'Expanded', Auth: o.auth || 'Member' }); add(vp, sb); sb.layoutSizingVertical = 'FILL'; const col = AL('VERTICAL', { name: 'Main column', clip: true }); add(vp, [col, 'FILL']); col.layoutSizingVertical = 'FILL'; add(col, [await I('23:9832', { State: o.top || 'Member' }), 'FILL']); if (o.content) await o.content(col); else for (const id of (o.sections || ['32:20477', '32:44403'])) { const c = await figma.getNodeByIdAsync(id); add(col, [c.createInstance(), 'FILL']); } const scrim = rect(1440, 1024, 'scrim/overlay', 0, 'Scrim'); fr.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = db.height; return { vp, col, scrim, sb }; }
function DIALOG(fr, o = {}) { const d = AL(o.dir || 'HORIZONTAL', { name: o.name || 'Dialog', fill: 'surface/overlay', stroke: 'border/subtle', r: 20, clip: true, w: o.w, gap: o.gap, p: o.p }); fr.appendChild(d); d.layoutPositioning = 'ABSOLUTE'; return d; }
function CENTER(fr, d, bg, o = {}) { let vh = bg.vp.height; const need = d.height + 2 * (o.m || 64); if (need > vh) { bg.vp.resize(bg.vp.width, need); bg.scrim.resize(bg.scrim.width, need); vh = need; } d.x = Math.round((fr.width - d.width) / 2) + (o.dx || 0); d.y = Math.round(bg.vp.y + (vh - d.height) / 2); }
function FORM(w = 520) { return HUGH(AL('VERTICAL', { name: 'Form', w, gap: 24, p: [28, 40, 36, 40] })); }
async function FHEAD(form, o = {}) { const top = ROW('Form top', [], { gap: 8 }); if (o.back) add(top, await LINK(o.back, { lead: 'arrow-left', c: 'text/secondary', ic: 'icon/muted' })); else if (o.step) add(top, await T(o.step, 'Overline', 'text/brand')); add(top, [SPACER(), 'FILL']); if (o.close !== false) add(top, await XBTN()); add(form, [top, 'FILL']); if (o.seg) add(form, [SEG(o.seg[0], o.seg[1]), 'FILL']); const hd = COL('Form header', [], { gap: 10 }); if (o.icon) add(hd, await TILE(o.icon, o.tone || 'brand')); if (o.over) add(hd, await T(o.over, 'Overline', 'text/brand')); add(hd, await P(o.title, o.ts || 'Heading/H3', 'text/primary')); if (o.sub) add(hd, await P(o.sub, 'Body/M', 'text/secondary')); add(form, [hd, 'FILL']); return hd; }
async function ACTIONS(form, left = [], right = []) { const r = ROW('Actions', [], { gap: 12, p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); for (const k of left) add(r, k); add(r, [SPACER(), 'FILL']); for (const k of right) add(r, k); add(form, [r, 'FILL']); return r; }
async function PANEL(o) { const p = AL('VERTICAL', { name: 'Security panel', w: 440, fill: 'bg/secondary', clip: true }); strokeSides(p, 'border/subtle', { r: 1 }); const h = COL('Panel header', [], { gap: 12, p: [32, 36, 4, 36] }); add(p, [h, 'FILL']); add(h, await I('4:797')); const hh = COL('Heading', [], { gap: 8, p: [12, 0, 0, 0] }); add(h, [hh, 'FILL']); add(hh, ROW('Overline', [await IC(o.oicon || 'shield-check', 16, 'icon/brand'), await T(o.over, 'Overline', 'text/brand')], { gap: 8 })); add(hh, await P(o.title, 'Heading/H3', 'text/primary')); if (o.sub) add(hh, await P(o.sub, 'Body/S', 'text/secondary')); if (o.art) { const art = figma.createFrame(); art.name = 'Art — ' + (o.artName || 'illustration'); art.fills = []; art.clipsContent = true; art.resize(440, o.artH || 236); p.appendChild(art); art.layoutSizingHorizontal = 'FILL'; await o.art(art); } if (o.body) { const b = COL('Panel body', [], { gap: 16, p: [20, 36, 8, 36] }); add(p, [b, 'FILL']); await o.body(b); } const sp = AL('VERTICAL', { name: 'Push' }); add(p, [sp, 'FILL']); const ft = COL('Panel footer', [], { gap: 10, p: [16, 36, 28, 36] }); add(p, [ft, 'FILL']); strokeSides(ft, 'border/subtle', { t: 1 }); add(ft, [await NOTE('lock', o.foot || 'GLOBAL POOL staff will never ask for your 2FA codes, backup codes, password or wallet seed phrase — not by email, chat or phone.'), 'FILL']); add(ft, ROW('Licence & 18+', [await I('6:159'), await I('6:158', { Variant: 'Compact' })], { gap: 8 })); return p; }
async function TWOPANE(fr, bg, panel, form, name) { const d = DIALOG(fr, { name }); await fx(d, 'Elevation/4 — Modal'); d.appendChild(panel); d.appendChild(form); const need = panel.children.filter(c => c.name !== 'Push').reduce((a, c) => a + c.height, 0); if (need > form.height) form.minHeight = Math.ceil(need); panel.layoutSizingVertical = 'FILL'; const push = panel.children.find(c => c.name === 'Push'); if (push) push.layoutGrow = 1; CENTER(fr, d, bg); return d; }
async function START(NAME, col, o = {}) { const page = figma.root.children.find(p => p.name === (o.mobile ? '10 — Mobile Experience' : '04 — Authentication')); await figma.setCurrentPageAsync(page); const sec = o.mobile ? section('AUTH — Mobile D', 84000, 0) : section('AUTH-05/06/18..21 Recovery & restrictions', 36000, 0); const W = o.mobile ? 390 : 1440; const X = 120 + col * (W + 120); const old = sec.children.find(n => n.name === NAME); if (old && !o.rebuild) return null; let Y = null; if (old) { Y = old.y; old.remove(); } if (Y == null) Y = COLY(sec, X, o.mobile ? 160 : 440); const fr = await screen(NAME, W); sec.appendChild(fr); fr.x = X; fr.y = Y; const db = await DEMOBAR(); add(fr, [db, 'FILL']); return { sec, fr, db, X }; }
async function FINISH(sec, fr, X, o = {}) { RESTACK(sec, X, o.mobile ? 160 : 440); fitSection(sec); await fr.screenshot({ scale: o.mobile ? 0.6 : 0.45 }); return { frame: fr.id, name: fr.name, size: [Math.round(fr.width), Math.round(fr.height)], at: [Math.round(fr.x), Math.round(fr.y)] }; }
async function FRAME(NAME, col, o, fn) { const S = await START(NAME, col, o); if (!S) { OUT.push({ skipped: NAME }); return; } try { await fn(S); } catch (e) { S.fr.remove(); throw e; } OUT.push(await FINISH(S.sec, S.fr, S.X, o)); }
async function INPUT(label, value, state = 'Filled', o = {}) { const p = { Label: label, 'Show label': true, 'Show leading icon': o.icon !== false, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const n = await I('13:762', { State: state, Size: o.size || 'L' }, p); if (value != null) await TX(n, 'Value text', value); if (o.helper) await TX(n, 'Helper text', o.helper); n.name = 'Input/Text — ' + label + ' (' + state + ')'; return n; }
async function BOX(name, kids = [], o = {}) { const b = COL(name, [], { gap: o.gap ?? 0, p: o.p ?? [4, 16, 4, 16], fill: o.fill || 'bg/secondary', stroke: o.stroke || 'border/subtle', r: o.r ?? 12 }); for (const k of kids) add(b, [k, 'FILL']); return b; }
function OBJ(name, w, o = {}) { return COL('Illustration — ' + name, [], { gap: o.gap ?? 10, p: o.p ?? [14, 16, 16, 16], fill: o.fill || 'surface/raised', stroke: o.stroke || 'border/default', r: 14, w }); }
async function PLACE(parent, c, x, y, rot) { await fx(c, 'Elevation/2 — Raised'); parent.appendChild(c); if (parent.layoutMode && parent.layoutMode !== 'NONE') { c.layoutSizingHorizontal = 'FILL'; } else { c.x = x; c.y = y; c.rotation = rot || 0; } return c; }
async function MAILCARD(parent, x, y, rot, o) { const c = OBJ('email we send (DEMO)', o.w || 280); add(c, [ROW('From', [await I('4:792'), COL('Sender', [await T('GLOBAL POOL', 'Label/M', 'text/primary'), await T('no-reply@globalpool.example', 'Caption', 'text/tertiary')], { gap: 0 }), [SPACER(), 'FILL'], await DEMO('XS')], { gap: 8 }), 'FILL']); add(c, await P(o.subject, 'Body/S Strong', 'text/primary')); add(c, [ROW('Anti-phishing', [await IC('shield-check', 14, 'icon/brand'), await T('Anti-phishing code', 'Caption', 'text/secondary'), [SPACER(), 'FILL'], ROW('Code chip', [await T(o.code || 'YOUR CODE', 'Mono/S', 'text/brand')], { p: [2, 6, 2, 6], fill: 'brand/tint', r: 6 })], { gap: 6, p: [6, 8, 6, 8], fill: 'bg/secondary', r: 6 }), 'FILL']); for (const l of (o.lines || [])) add(c, await P(l, 'Caption', 'text/secondary')); if (o.badge) add(c, o.badge); if (o.cta) add(c, [await BTN(o.ctaType || 'Primary', o.cta, { size: 'S' }), 'FILL']); return PLACE(parent, c, x, y, rot); }
// ===== END AUTH-D KIT =====
const OUT = [];
{ const page = figma.root.children.find(p => p.name === '04 — Authentication'); await figma.setCurrentPageAsync(page); const sec = section('AUTH-05/06/18..21 Recovery & restrictions', 36000, 0);
if (!sec.children.find(n => n.name === 'Notes — AUTH-05/06/18..21 decisions & dev notes')) {
  const nf = AL('HORIZONTAL', { name: 'Notes — AUTH-05/06/18..21 decisions & dev notes', gap: 24, p: 32, fill: 'surface/default', stroke: 'border/subtle', r: 20, align: 'MIN' });
  sec.appendChild(nf); nf.x = 120; nf.y = 80;
  const hd = COL('Title', [], { gap: 8, w: 360 }); add(hd, await T('AUTH-05/06/18–21', 'Overline', 'text/brand')); add(hd, await P('Recovery, restrictions & session security', 'Heading/H4', 'text/primary')); add(hd, await P('Columns left → right: AUTH-05 Forgot password · AUTH-06 Reset password · AUTH-18 Restricted account (4 states) · AUTH-19 Account recovery (5 steps) · AUTH-20 Session expired / re-auth · AUTH-21 New-device alert. States stack below their default. Mobile 390 on page 10, section “AUTH — Mobile D”.', 'Body/S', 'text/secondary')); add(nf, hd);
  const N = [
    ['layers', 'Pattern', 'Sign-in-adjacent flows (05, 06, 19, 20, 21) reuse the two-pane dialog over the dimmed lobby from AUTH-01…10. Restricted accounts (18) are full pages in a reduced “restricted-mode” shell: no Deposit, games/promotions shown as paused — or hidden entirely while self-excluded.'],
    ['eye-off', 'Privacy', 'Forgot-password always shows the same confirmation (no account enumeration). The personal anti-phishing code (AURORA-27) only appears after sign-in — public screens show “your code”.'],
    ['clock', 'Timing rules', 'Reset link: single use, 30 min (sent 16:31 → expires 17:01 UTC), max 3 requests / 15 min. Password reset signs out other devices and holds withdrawals 24 h (until 28 Nov 2026, 16:40 UTC). Session timeout: 30 min idle; security changes need re-auth if the last check is older than 15 min.'],
    ['shield-check', 'Recovery', 'Case REC-6620: ID + liveness vs the KYC L2 record, optional free wallet signature (nonce valid 10 min). Mandatory 48 h hold on withdrawals and security changes from approval (27 Nov 17:12 → 29 Nov 2026, 17:12 UTC) — support can’t shorten it. RG tools always stay available.'],
    ['code', 'Dev notes', 'account.restriction = { type: suspended | under_review | self_excluded | geo_restricted, reason_code, case_id, since, until, allowed_actions[] }. UI renders allowed_actions (withdraw where lawful, history, RG, support, close account) and never offers a re-entry shortcut for self_excluded.']
  ];
  for (const [ic, t, b] of N) { const c = COL('Note — ' + t, [], { gap: 8, p: 20, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 330 }); add(c, ROW('Head', [await IC(ic, 18, 'icon/brand'), await T(t, 'Label/L', 'text/primary')], { gap: 8 })); add(c, await P(b, 'Body/S', 'text/secondary')); add(nf, c); }
  add(nf, await DEMO('M'));
  OUT.push({ notes: nf.id, size: [Math.round(nf.width), Math.round(nf.height)] });
} }

for (const MODE of ['Request (default)', 'Sent', 'Error — too many requests']) {
await FRAME('[AUTH-05] Forgot Password / 1440 / ' + MODE, 0, {}, async ({ fr, db }) => {
  const SENT = MODE === 'Sent', ERR = MODE.startsWith('Error');
  const bg = await LOBBYBG(fr, db, { auth: 'Guest', top: 'Guest', label: 'guest lobby behind password-help dialog' });
  const panel = await PANEL({ over: 'PASSWORD HELP', oicon: 'key', title: 'Locked out? We’ll get you back in.', sub: 'Reset links come by email, work once and expire after 30 minutes. Your balance, entries and withdrawals are untouched while you reset.', artName: 'reset email in an inbox (DEMO)', artH: 280,
    art: async (a) => { BLOCKS(a, SENT ? 'status/success' : 'brand/primary'); await MAILCARD(a, 70, 30, -5, { subject: 'Reset your GLOBAL POOL password', lines: ['Requested 27 Nov 2026, 16:31 UTC · works once, until 17:01 UTC', 'Didn’t ask? Ignore this email — nothing changes.'], cta: 'Choose a new password' }); },
    body: async (b) => { add(b, [await BUL('shield-check', 'icon/brand', 'Look for your anti-phishing code', 'Every real email from us shows the code you chose in Security settings. No code — don’t click.'), 'FILL'], [await BUL('alert-triangle', 'text/warning', 'We never ask for your password', 'Not by email, chat or phone. Reset links only open globalpool.example.'), 'FILL']); } });
  const form = FORM();
  if (SENT) {
    await FHEAD(form, { back: 'Back to sign in', icon: 'mail', tone: 'success', over: 'EMAIL SENT', title: 'Check your inbox', sub: 'If nova.k@example.com belongs to a GLOBAL POOL account, a reset link is on its way. For your privacy we show this same message for every address.' });
    add(form, [await BOX('Email details', [await KV('Sent to', 'nova.k@example.com', { demo: true }), await KV('From', 'no-reply@globalpool.example'), await KV('Sent', '27 Nov 2026, 16:31 UTC'), await KV('Link works until', '17:01 UTC · single use', { line: false })]), 'FILL']);
    add(form, [await BUL('search', 'icon/brand', 'Nothing after 5 minutes?', 'Check spam and promotions folders. Sending a new link cancels the previous one.'), 'FILL']);
    const rs = ROW('Resend', [await BTN('Secondary', 'Resend link', { state: 'Disabled', lead: 'refresh' }), await P('Available at 16:32 UTC — 60 s after the last email', 'Caption', 'text/tertiary')], { gap: 12 }); add(form, [rs, 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', 'Use a different email', { size: 'L' })], [await BTN('Primary', 'Back to sign in', { size: 'L', lead: 'log-in' })]);
  } else {
    await FHEAD(form, { back: 'Back to sign in', icon: 'key', tone: ERR ? 'danger' : 'brand', over: 'FORGOT PASSWORD', title: 'Reset your password', sub: 'Enter the email address you use for GLOBAL POOL. If it matches an account, we’ll email you a link to choose a new password.' });
    if (ERR) add(form, [await ALERT('danger', 'Too many reset requests', 'We’ve sent 3 links to this address in the last 15 minutes. To protect the account you can ask again at 16:46 UTC (27 Nov 2026). The newest link still works until 17:01 UTC.', { icon: 'ban' }), 'FILL']);
    add(form, [await INPUT('Email address', 'nova.k@example.com', ERR ? 'Filled' : 'Focus'), 'FILL']);
    add(form, [await NOTE('info', 'For your privacy we show the same confirmation whether or not an account uses this email.'), 'FILL']);
    add(form, [await BUL('wallet', 'icon/brand', 'Signed up with a wallet?', 'Wallet-first accounts have no password — sign in with your wallet instead.'), 'FILL'], [await BUL('help-circle', 'icon/brand', 'Can’t open this inbox any more?', 'Start account recovery — we’ll verify your identity instead of your email.'), 'FILL']);
    await ACTIONS(form, [await BTN('Ghost', ERR ? 'Start account recovery' : 'Back to sign in', { size: 'L' })], [await BTN('Primary', ERR ? 'Send reset link · 16:46 UTC' : 'Send reset link', { size: 'L', lead: 'mail', state: ERR ? 'Disabled' : 'Default' })]);
  }
  await TWOPANE(fr, bg, panel, form, 'Dialog — Forgot password (' + MODE + ')');
}); }

return OUT;