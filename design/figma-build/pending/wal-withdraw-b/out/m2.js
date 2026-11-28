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

// ===== WAL-WB common (pruned) =====
const AD = '0x7c4e…a21D';
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
async function kv(p, label, val, o = {}) { const r = hrow('Row — ' + label, 12, { p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); await tx(r, label, 'Body/S', 'text/secondary', { hug: true }); sp(r); if (typeof val === 'string') await tx(r, val, o.vs || 'Body/S Strong', o.vc || 'text/primary', { hug: true }); else for (const v of [].concat(val)) r.appendChild(v); return r; }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions && o.actions.length) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0], wrap: true, cgap: 8 }); add(c, [r, 'FILL']); for (const b of o.actions) r.appendChild(b); } return a; }
async function B(status, label, size = 'S') { const b = await BADGE(status, size); if (label) { const t = b.findOne(n => n.type === 'TEXT'); if (t) t.characters = label; } b.name = 'Badge/Status — ' + (label || status); return b; }
async function fhead(fc, title, desc, M) { const h = AL('VERTICAL', { name: 'Flow header', gap: 6 }); add(fc, [h, 'FILL']); await tx(h, title, M ? 'Heading/H4' : 'Heading/H3'); if (desc) await tx(h, desc, M ? 'Body/S' : 'Body/M', 'text/secondary'); return h; }
// one automatic check row: s = pass | fail | review | wait
async function chk(p, o, M) { const r = hrow('Check — ' + o.t, 12, { p: [14, 0, 14, 0], align: M ? 'MIN' : 'CENTER' }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); const m = { pass: ['check-circle', 'status/success'], fail: ['x-circle', 'status/danger'], review: ['alert-triangle', 'status/warning'], wait: ['clock', 'icon/muted'] }[o.s]; r.appendChild(await IC(m[0], 20, m[1])); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, o.t, 'Body/M Strong', o.s === 'wait' ? 'text/secondary' : 'text/primary'); await tx(c, o.d, 'Body/S', 'text/secondary'); if (o.right) { if (M) { const w = hrow('Result', 0, { p: [6, 0, 0, 0] }); c.appendChild(w); w.appendChild(o.right); } else r.appendChild(o.right); } return r; }
async function checks(p, title, meta, rows, M) { const cc = card('Checks — ' + title, { gap: 0, p: M ? [12, 16, 4, 16] : [16, 20, 4, 20], fill: 'surface/raised' }); add(p, [cc, 'FILL']); const h = hrow('Checks header', 8, { p: [0, 0, 8, 0] }); add(cc, [h, 'FILL']); await tx(h, title, 'Body/M Strong', 'text/primary', { hug: true }); h.appendChild(await DEMO('XS')); sp(h); if (!M) await tx(h, meta, 'Caption', 'text/tertiary', { hug: true }); if (M) await tx(cc, meta, 'Caption', 'text/tertiary'); for (let i = 0; i < rows.length; i++) await chk(cc, Object.assign({ last: i === rows.length - 1 }, rows[i]), M); return cc; }
// vertical timeline: s = done | current | review | todo | error
async function tl(p, title, items, M) { const w = card('Timeline — ' + title, { gap: 12, p: M ? 16 : 20, fill: 'surface/raised' }); add(p, [w, 'FILL']); const h = hrow('Timeline header', 8); add(w, [h, 'FILL']); await tx(h, title, 'Body/M Strong', 'text/primary', { hug: true }); h.appendChild(await DEMO('XS')); const list = AL('VERTICAL', { name: 'Events', gap: 0 }); add(w, [list, 'FILL']);
  for (let i = 0; i < items.length; i++) { const it = items[i]; const last = i === items.length - 1; const r = AL('HORIZONTAL', { name: 'Event — ' + it.t.slice(0, 40), gap: 12 }); add(list, [r, 'FILL']); const rail = AL('VERTICAL', { name: 'Rail', gap: 4, align: 'CENTER' }); r.appendChild(rail); rail.layoutSizingVertical = 'FILL';
    const m = { done: ['check-circle', 'status/success'], current: ['spinner', 'icon/brand'], review: ['hourglass', 'status/warning'], error: ['x-circle', 'status/danger'] }[it.s];
    if (m) rail.appendChild(await IC(m[0], 20, m[1])); else { const e = ellipse(16, 16, null, 'Upcoming'); stroke(e, 'border/strong', 2); const hold = AL('HORIZONTAL', { name: 'Upcoming dot', w: 20, h: 20, align: 'CENTER', justify: 'CENTER' }); hold.appendChild(e); rail.appendChild(hold); }
    if (!last) { const ln = rect(2, 8, it.s === 'done' ? 'status/success' : 'border/default', 0, 'Connector'); rail.appendChild(ln); ln.layoutSizingVertical = 'FILL'; }
    const c = AL('VERTICAL', { name: 'Text', gap: 2, p: [0, 0, last ? 0 : 16, 0] }); add(r, [c, 'FILL']); await tx(c, it.t, 'Body/S Strong', it.s === 'todo' ? 'text/tertiary' : it.s === 'error' ? 'text/danger' : 'text/primary'); if (it.d) await tx(c, it.d, 'Caption', 'text/secondary'); }
  return w; }
async function tiles(p, arr, M) { if (M) { const c = card('Facts', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(p, [c, 'FILL']); for (let i = 0; i < arr.length; i++) await kv(c, arr[i][0], arr[i][1], { last: i === arr.length - 1, vc: arr[i][2] }); return c; } const r = AL('HORIZONTAL', { name: 'Fact tiles', gap: 12 }); add(p, [r, 'FILL']); for (const [l, v, c] of arr) { const t = AL('VERTICAL', { name: 'Tile — ' + l, gap: 4, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10 }); add(r, [t, 'FILL']); await tx(t, l, 'Caption', 'text/tertiary'); await tx(t, v, 'Body/M Strong', c || 'text/primary'); } return r; }
async function bigAmt(p, over, amt, sub, o = {}) { const b = AL('VERTICAL', { name: 'Amount block', gap: 4 }); add(p, [b, 'FILL']); await tx(b, over, 'Overline', 'text/tertiary'); const r = hrow('Amount', 8); add(b, [r, 'FILL']); await tx(r, amt, o.M ? 'Number/L' : 'Number/XL', o.color || 'text/primary', { hug: true }); r.appendChild(await DEMO('S')); if (sub) await tx(b, sub, o.M ? 'Body/S' : 'Body/M', 'text/secondary'); return b; }
async function stHead(p, badge, o = {}) { const h = hrow('Status header', 10); add(p, [h, 'FILL']); h.appendChild(badge); await tx(h, 'WD-20931', 'Mono/S', 'text/secondary', { hug: true }); h.appendChild(await DEMO('XS')); if (!o.M) { sp(h); await tx(h, o.right || 'Requested 27 Nov 2026, 18:44 UTC', 'Caption', 'text/tertiary', { hug: true }); } return h; }
// option list: [icon, title, body, button|null]
async function opts(p, title, arr, M) { const ch = AL('VERTICAL', { name: 'Options — ' + title, gap: 12, p: 16, fill: 'surface/raised', r: 14 }); add(p, [ch, 'FILL']); await tx(ch, title, 'Body/M Strong'); for (const [ic, t1, t2, btn] of arr) { const w = AL('VERTICAL', { name: 'Option — ' + t1.slice(0, 30), gap: 10, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(ch, [w, 'FILL']); const r = hrow('Option row', 12, { align: M ? 'MIN' : 'CENTER' }); add(w, [r, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 8, fill: 'brand/tint', r: 10 }); it.appendChild(await IC(ic, 20, 'icon/brand')); r.appendChild(it); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); if (btn) { if (M) add(w, [btn, 'FILL']); else r.appendChild(btn); } } return ch; }
// ===== WAL-WB mobile shell (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('WAL — Mobile D (Withdraw 6–9)', 154000, 0);
const MX = [120, 630, 1140, 1650, 2160];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function setStepM(s, n, label, next, err) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = next ? 'Next: ' + next : (err ? 'Withdrawal not sent — funds returned' : 'All steps complete'); const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; if (err) seg(n).fills = [paint('status/danger')]; }
async function shellM(name, n, x, label, next, o = {}) {
  const y = colY(x);
  const f = await screen(name, 390, o.sheet ? { h: 844 } : {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [ct, 'FILL']);
  const bh = hrow('Page header', 8); add(ct, [bh, 'FILL']);
  bh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }));
  await tx(bh, 'Withdraw USDT', 'Heading/H4', 'text/primary', { hug: true }); sp(bh); bh.appendChild(await DEMO('S'));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next, o.err);
  return { f, ct };
}
// sticky bottom CTA (primary + at most one alternative) + bottom tab bar
async function footM(f, s, o = {}) {
  const b = AL('VERTICAL', { name: 'Sticky CTA (pinned above tab bar)', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(f, [b, 'FILL']);
  if (s.next) add(b, [await BTN(s.nextType || 'Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']);
  for (const [ty, l, ic] of (s.alt || []).slice(0, 1)) add(b, [await BTN(ty, l, { size: 'L', lead: ic }), 'FILL']);
  if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' });
  if (!o.noTab) add(f, [await I('22:5413', { Active: 'Wallet' }), 'FILL']);
  return b;
}
// bottom sheet over the page: scrim + sheet anchored to the bottom of a fixed 844 frame
async function sheetM(f, name) {
  const scr = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scr); scr.layoutPositioning = 'ABSOLUTE'; scr.x = 0; scr.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE';
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [0, 0, 4, 0] }); add(sh, [g, 'FILL']); g.appendChild(rect(36, 4, 'border/strong', 9999, 'Handle'));
  return sh;
}
async function sheetFoot(sh, s) { const b = AL('VERTICAL', { name: 'Sheet actions', gap: 8, p: [4, 0, 8, 0] }); add(sh, [b, 'FILL']); add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']); add(b, [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0, 8, 0] }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Indicator')); }
// ===== END WAL-WB mobile shell =====

// ===== WAL-17 Step 8 Pending — content builder (st: Processing | Queued | Manual review; M: 0 desktop, 1 mobile) =====
async function flow17(fc, st, M) {
  const proc = st === 'Processing', q = st === 'Queued', rev = st === 'Manual review';
  await stHead(fc, proc ? await B('Processing') : q ? await B('Pending', 'Queued') : await B('Under review'), { M });
  await fhead(fc, proc ? 'Sending your withdrawal' : q ? 'In the queue — next batch at 18:50 UTC' : 'Under review — usually under 4 h', proc ? 'It\'s being broadcast to Arbitrum One right now. Most withdrawals arrive within 5 minutes — you can leave this page.' : q ? 'Arbitrum One withdrawals go out in batches every 10 minutes to keep network fees low. Yours is #4 of 9 in the 18:50 UTC batch.' : 'We\'ll send it as soon as the review is done. You don\'t need to do anything — we\'ll notify you here and by email.', M);
  await bigAmt(fc, 'YOU RECEIVE', '1,499.92 USDT', 'to ' + AD + ' on Arbitrum One · network fee 0.08 USDT · platform fee 0.00 USDT', { M });
  await tiles(fc, proc ? [['Requested', '18:44 UTC'], ['Estimated arrival', 'by 18:52 UTC'], ['Confirmations', '0 / 20']] : q ? [['Requested', '18:44 UTC'], ['Next batch', '18:50 UTC'], ['Estimated arrival', 'by 18:58 UTC']] : [['Requested', '18:44 UTC'], ['Decision expected', 'by 22:44 UTC', 'text/warning'], ['Reference', 'WD-20931']], M);
  if (rev) add(fc, [await alertBox('warning', 'Why: routine AML screening for new destinations — usually under 4 h', 'This is your first withdrawal to ' + AD + '. A compliance analyst checks the destination before anything is sent. You won\'t be asked for documents unless something is unclear — and we\'d tell you here first.', { icon: 'shield-alert' }), 'FILL']);
  const items = [{ s: 'done', t: 'Withdrawal requested', d: '27 Nov 2026, 18:44 UTC · confirmed with email code + authenticator' }];
  if (rev) { items.push({ s: 'done', t: 'Automatic checks', d: '5 of 6 passed at 18:43 UTC · destination routed to manual review' }); items.push({ s: 'review', t: 'Manual AML review', d: 'Started 18:44 UTC · decision expected by 22:44 UTC' }); }
  else items.push({ s: 'done', t: 'Security & risk checks', d: 'All 6 passed at 18:43 UTC' });
  if (q) items.push({ s: 'current', t: 'Waiting for the 18:50 UTC batch', d: '#4 of 9 · you can cancel until 18:50 UTC' });
  items.push(proc ? { s: 'current', t: 'Sending to Arbitrum One', d: 'Broadcasting now — usually under 5 minutes' } : { s: 'todo', t: 'Sent to Arbitrum One', d: 'Transaction hash appears here' });
  items.push({ s: 'todo', t: 'Confirmed on-chain', d: '20 confirmations · about 2 minutes on Arbitrum One' });
  items.push({ s: 'todo', t: 'Completed', d: 'Receipt emailed to n•••@example.com — look for AURORA-27' });
  await tl(fc, 'Withdrawal progress', items, M);
  add(fc, [await alertBox('info', proc ? 'It can\'t be cancelled now' : '1,500.00 USDT is held in Locked until it\'s sent', proc ? 'It\'s already being broadcast. The 1,500.00 USDT stays in Locked until the transaction confirms, then it\'s released.' : 'You can cancel until it\'s sent — the full 1,500.00 USDT goes straight back to Available. Locked shows 1,850.00 USDT: this withdrawal plus your 35 entries in round #1,248.', { icon: 'lock' }), 'FILL']);
  if (proc) return { alt: [['Ghost', 'View in history', 'history']], next: 'Back to wallet', trail: null, note: 'Updates live — no need to refresh' };
  return { alt: [['Secondary', 'Cancel withdrawal', 'x'], ['Ghost', 'View in history', 'history']], next: 'Back to wallet', trail: null, note: rev ? 'We\'ll notify you when it\'s approved' : null };
}
// ===== END WAL-17 builder =====

// ===== WAL-18 Step 9 Successful + WAL-19 Step 9 Failed — content builders (M: 0 desktop, 1 mobile) =====
async function flow18(fc, M) {
  await stHead(fc, await B('Confirmed', 'Completed'), { M, right: 'Completed 27 Nov 2026, 20:34 UTC' });
  await fhead(fc, 'Withdrawal complete', 'Your USDT has arrived. The transaction is final on Arbitrum One with 20 of 20 confirmations.', M);
  await bigAmt(fc, 'YOU RECEIVED', '1,499.92 USDT', 'at ' + AD + ' on Arbitrum One · 27 Nov 2026, 20:34 UTC', { M, color: 'text/success' });
  const hb = AL('VERTICAL', { name: 'Transaction hash', gap: 6, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10 }); add(fc, [hb, 'FILL']); await tx(hb, 'Transaction hash', 'Caption', 'text/tertiary'); const th = await I('20:5893', { State: 'Default' }, { Hash: '0xb7d4…2c91', 'Show DEMO': true, 'Show explorer link': true }); hb.appendChild(th);
  const rc = card('Receipt', { gap: 0, p: M ? [4, 16, 4, 16] : [8, 20, 8, 20], fill: 'surface/raised' }); add(fc, [rc, 'FILL']);
  const rh = hrow('Receipt header', 8, { p: [8, 0, 8, 0] }); add(rc, [rh, 'FILL']); rh.appendChild(await IC('receipt', 18, 'icon/muted')); await tx(rh, 'Receipt · WD-20931', 'Body/M Strong', 'text/primary', { hug: true }); rh.appendChild(await DEMO('XS'));
  const R = [['Amount withdrawn', '1,500.00 USDT', 'Number/S'], ['Network fee', '−0.08 USDT', 'Number/S'], ['Platform fee', '0.00 USDT', 'Number/S'], ['You received', '1,499.92 USDT', 'Number/S', 'text/success'], ['Requested', '27 Nov 2026, 18:44 UTC'], ['AML review cleared', '27 Nov 2026, 20:31 UTC'], ['Sent', '27 Nov 2026, 20:32 UTC'], ['Confirmed', '27 Nov 2026, 20:34 UTC · 20 / 20']];
  for (let i = 0; i < R.length; i++) await kv(rc, R[i][0], R[i][1], { vs: R[i][2], vc: R[i][3], last: i === R.length - 1 });
  await tx(fc, 'A copy of this receipt was emailed to n•••@example.com — genuine emails show your anti-phishing code AURORA-27.', 'Caption', 'text/tertiary');
  return { alt: [['Secondary', 'Download receipt (PDF)', 'download'], ['Ghost', 'View on explorer', 'external-link']], next: 'Back to wallet', trail: null };
}
async function flow19(fc, st, M) {
  const san = st === 'Sanctions';
  await stHead(fc, san ? await B('Rejected') : await B('Failed'), { M, right: san ? 'Rejected 27 Nov 2026, 20:12 UTC' : 'Failed 27 Nov 2026, 18:59 UTC' });
  await fhead(fc, san ? 'Withdrawal rejected — your funds are back' : 'Withdrawal couldn\'t be sent — your funds are back', san ? 'We couldn\'t send this withdrawal after our compliance review. Nothing left GLOBAL POOL, so no network fee was charged.' : 'Arbitrum One didn\'t accept the transaction, so nothing left GLOBAL POOL and no network fee was charged.', M);
  await bigAmt(fc, 'RETURNED TO AVAILABLE', '1,500.00 USDT', (san ? 'Returned 27 Nov 2026, 20:12 UTC' : 'Returned 27 Nov 2026, 18:59 UTC') + ' · Available is now 10,715.30 USDT', { M, color: 'text/success' });
  add(fc, [await alertBox('danger', san ? 'Reason: the destination address failed sanctions screening' : 'Reason: the network didn\'t accept the transaction', san ? 'Our screening provider matched ' + AD + ' to a sanctioned or high-risk entity, so we can\'t send funds to it. The address is now blocked for withdrawals and removed from your whitelist. For legal reasons we can\'t share more detail.' : 'Broadcasting timed out 3 times between 18:49 and 18:59 UTC while Arbitrum One was degraded. The transfer never reached the chain, so there\'s no transaction hash and nothing to recover.', { icon: san ? 'shield-alert' : 'wifi-off' }), 'FILL']);
  if (san) await opts(fc, 'What you can do', [['arrow-up-right', 'Withdraw to another address you own', 'Use your verified BNB Chain wallet 0x12ab…9f3C, or add a new address (24 h cooldown).', null], ['chat', 'Think this is a mistake?', 'Contact support with reference AML-58214. A compliance specialist replies within 3 business days.', await BTN('Secondary', 'Contact support', { size: 'S', lead: 'chat' })], ['history', 'Keep a record', 'This decision and the full timeline are saved in Withdrawal history and in your monthly statement.', await BTN('Ghost', 'View in history', { size: 'S', lead: 'history' })]], M);
  else await opts(fc, 'What you can do', [['refresh', 'Retry the same withdrawal', '1,500.00 USDT to ' + AD + ' on Arbitrum One. We re-check the fee (now 0.08 USDT) and ask for 2FA again.', null], ['swap', 'Use another network', 'BNB Chain (0.12 USDT) or Polygon (0.02 USDT), with an address you\'ve whitelisted on that network.', await BTN('Secondary', 'Change network', { size: 'S', lead: 'swap' })], ['activity', 'Check network status', 'Arbitrum One has been degraded since 18:47 UTC. We\'ll email you when it\'s back to normal.', await BTN('Ghost', 'Status page', { size: 'S', lead: 'external-link' })]], M);
  await tl(fc, 'What happened', san ? [{ s: 'done', t: 'Withdrawal requested', d: '27 Nov 2026, 18:44 UTC · confirmed with 2FA' }, { s: 'review', t: 'Manual AML review', d: '18:44–20:12 UTC' }, { s: 'error', t: 'Rejected by sanctions screening', d: '20:12 UTC · decision by the Compliance team' }, { s: 'done', t: 'Returned to Available', d: '20:12 UTC · 1,500.00 USDT · no fees charged' }] : [{ s: 'done', t: 'Withdrawal requested', d: '27 Nov 2026, 18:44 UTC · confirmed with 2FA' }, { s: 'done', t: 'Security & risk checks', d: 'All 6 passed at 18:43 UTC' }, { s: 'error', t: 'Broadcast to Arbitrum One failed', d: '3 attempts between 18:49 and 18:59 UTC · timed out' }, { s: 'done', t: 'Returned to Available', d: '18:59 UTC · 1,500.00 USDT · network fee not charged' }], M);
  return san ? { back: 'Back to wallet', next: 'Start a new withdrawal', trail: 'arrow-right' } : { back: 'Back to wallet', next: 'Retry withdrawal', lead: 'refresh', trail: null };
}
// ===== END WAL-18/19 builders =====

// ===== BODY m2 — Mobile 390: WAL-17 Processing / Manual review, WAL-18 Successful =====
const M17 = 'WAL-17 Withdraw — Step 8 Pending / 390 / ', M18 = 'WAL-18 Withdraw — Step 9 Successful / 390 / Default';
const names = [M17 + 'Processing', M17 + 'Manual review', M18];
clean(names);
const out = {};
for (const [st, nm] of [['Processing', names[0]], ['Manual review', names[1]]]) {
  const S = await shellM(nm, 8, MX[2], st === 'Processing' ? 'Pending — sending' : 'Pending — under review', 'Done');
  const cta = await flow17(S.ct, st, 1);
  await footM(S.f, cta);
  out[nm] = S.f.id;
}
{ const S = await shellM(names[2], 9, MX[3], 'Withdrawal complete', null);
  const cta = await flow18(S.ct, 1);
  await footM(S.f, { next: 'Download receipt (PDF)', lead: 'download', trail: null, alt: [['Secondary', 'Back to wallet', 'wallet']] });
  out[names[2]] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes };
