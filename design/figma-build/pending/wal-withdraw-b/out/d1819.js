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
async function hdr(p, icon, title, o = {}) { const h = hrow('Card header — ' + title, 8); add(p, [h, 'FILL']); if (icon) h.appendChild(await IC(icon, 20, o.ic || 'icon/brand')); await tx(h, title, 'Heading/H5', 'text/primary', { hug: true }); if (o.demo) h.appendChild(await DEMO('S')); sp(h); if (o.right) h.appendChild(o.right); return h; }
// Badge/Status with optional relabel (status = icon + label)
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
async function bigAmt(p, over, amt, sub, o = {}) { const b = AL('VERTICAL', { name: 'Amount block', gap: 4 }); add(p, [b, 'FILL']); await tx(b, over, 'Overline', 'text/tertiary'); const r = hrow('Amount', 8); add(b, [r, 'FILL']); await tx(r, amt, o.M ? 'Number/L' : 'Number/XL', o.color || 'text/primary', { hug: true }); r.appendChild(await DEMO('S')); if (sub) await tx(b, sub, o.M ? 'Body/S' : 'Body/M', 'text/secondary'); return b; }
async function stHead(p, badge, o = {}) { const h = hrow('Status header', 10); add(p, [h, 'FILL']); h.appendChild(badge); await tx(h, 'WD-20931', 'Mono/S', 'text/secondary', { hug: true }); h.appendChild(await DEMO('XS')); if (!o.M) { sp(h); await tx(h, o.right || 'Requested 27 Nov 2026, 18:44 UTC', 'Caption', 'text/tertiary', { hug: true }); } return h; }
// option list: [icon, title, body, button|null]
async function opts(p, title, arr, M) { const ch = AL('VERTICAL', { name: 'Options — ' + title, gap: 12, p: 16, fill: 'surface/raised', r: 14 }); add(p, [ch, 'FILL']); await tx(ch, title, 'Body/M Strong'); for (const [ic, t1, t2, btn] of arr) { const w = AL('VERTICAL', { name: 'Option — ' + t1.slice(0, 30), gap: 10, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 10 }); add(ch, [w, 'FILL']); const r = hrow('Option row', 12, { align: M ? 'MIN' : 'CENTER' }); add(w, [r, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 8, fill: 'brand/tint', r: 10 }); it.appendChild(await IC(ic, 20, 'icon/brand')); r.appendChild(it); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); if (btn) { if (M) add(w, [btn, 'FILL']); else r.appendChild(btn); } } return ch; }
async function sumCard(sd, o = {}) { const c = card('Withdrawal summary', { gap: 0 }); add(sd, [c, 'FILL']); let right = o.badge; if (!right) { right = AL('HORIZONTAL', { name: 'Step chip', p: [2, 8, 2, 8], fill: 'surface/raised', r: 9999 }); await tx(right, 'Step ' + o.n + ' of 9', 'Caption', 'text/secondary', { hug: true }); } const h = await hdr(c, null, 'Withdrawal summary', { demo: true, right }); pad(h, 0, 0, 8, 0);
  if (o.ref) await kv(c, 'Reference', 'WD-20931', { vs: 'Mono/S' });
  const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Asset', a);
  const v = hrow('Network value', 6); v.appendChild(await CHAIN('Arbitrum', 16)); await tx(v, 'Arbitrum One', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Network', v);
  await kv(c, 'Destination', await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true }));
  await kv(c, 'Amount', '1,500.00 USDT', { vs: 'Number/S' });
  await kv(c, 'Network fee', o.fee || '−0.08 USDT', o.fee ? { vs: 'Body/S', vc: 'text/secondary' } : { vs: 'Number/S' });
  await kv(c, 'Platform fee', '0.00 USDT', { vs: 'Number/S' });
  await kv(c, o.recvL || 'You receive', o.recv || '1,499.92 USDT', { vs: 'Number/M', vc: o.recvC || 'text/success', last: true });
  return c; }
async function balCard(sd, title, rows, note) { const c = card(title, { gap: 0 }); add(sd, [c, 'FILL']); const h = await hdr(c, 'wallet', title, { demo: true }); pad(h, 0, 0, 8, 0); for (let i = 0; i < rows.length; i++) { const [ic, col, l, v] = rows[i]; const r = hrow('Balance — ' + l, 10, { p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { b: i === rows.length - 1 ? 0 : 1 }); add(c, [r, 'FILL']); r.appendChild(await IC(ic, 18, col)); await tx(r, l, 'Body/S', 'text/secondary', { hug: true }); sp(r); await tx(r, v, 'Number/S', col, { hug: true }); } if (note) { const n = await tx(c, note, 'Caption', 'text/tertiary'); n.name = 'Balance note'; } return c; }
async function helpCard(sd, icon, title, body, links = []) { const hc = card('Help — ' + title.slice(0, 30), { gap: 8 }); add(sd, [hc, 'FILL']); await hdr(hc, icon, title, { ic: 'icon/muted' }); await tx(hc, body, 'Body/S', 'text/secondary'); if (links.length) { const lk = hrow('Links', 4, { wrap: true, cgap: 4 }); add(hc, [lk, 'FILL']); for (const [l, ic] of links) lk.appendChild(await BTN('Ghost', l, { size: 'S', lead: ic })); } return hc; }
// ===== WAL-WB desktop shell (page 06) =====
const page = figma.root.children.find(p => p.name === '06 — Wallet & Transactions'); await figma.setCurrentPageAsync(page);
const sec = section('WAL-15..19 Withdraw steps 6–9', 52000, 0);
const COLX = [120, 1680, 3240, 4800, 6360];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2 && !c.name.includes('/ 768 /')) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
async function shellD(name, n, x, ctx) {
  const y = colY(x);
  const f = await screen(name, 1440, {}); f.primaryAxisSizingMode = 'AUTO'; sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  for (const it of sb.findAll(k => k.type === 'INSTANCE' && (k.name === 'Item/Lobby' || k.name === 'Item/Wallet'))) it.setProperties({ State: it.name === 'Item/Wallet' ? 'Active' : 'Default' });
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  add(main, [await I('23:9832', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 24, p: 32 }); add(main, [ct, 'FILL']);
  const ph = hrow('Page header', 16); add(ct, [ph, 'FILL']);
  const ti = AL('VERTICAL', { name: 'Title', gap: 4 }); add(ph, [ti, 'FILL']);
  await tx(ti, 'Withdraw USDT', 'Heading/H2', 'text/primary', { hug: true });
  await tx(ti, 'Send USDT from your Available balance to an external wallet in a few short steps. GLOBAL POOL charges no withdrawal fee — you only pay the network fee, shown before you confirm.', 'Body/M', 'text/secondary');
  ph.appendChild(await DEMO('M')); ph.appendChild(await BTN('Ghost', 'Withdrawal history', { lead: 'history' })); ph.appendChild(await BTN('Secondary', 'Deposit', { lead: 'deposit' }));
  const nav = hrow('Wallet sub-nav', 24, { align: 'MAX' }); strokeSides(nav, 'border/subtle', { b: 1 }); add(ct, [nav, 'FILL']);
  for (const l of ['Overview', 'Deposit', 'Withdraw', 'Transaction history', 'Connected wallets', 'Address whitelist']) nav.appendChild(await I('20:6831', { State: l === 'Withdraw' ? 'Active' : 'Default' }, { Label: l }));
  const sbar = hrow('Stepper bar', 24, { p: [16, 24, 16, 24], fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(ct, [sbar, 'FILL']);
  const fl = AL('VERTICAL', { name: 'Flow label', gap: 2 }); sbar.appendChild(fl);
  await tx(fl, 'WITHDRAW · STEP ' + n + ' OF 9', 'Overline', 'text/tertiary', { hug: true }); await tx(fl, ctx, 'Body/S Strong', 'text/primary', { hug: true });
  const stp = await I('15:3122', { Steps: 9, Current: n }); add(sbar, [stp, 'FILL']);
  const row = AL('HORIZONTAL', { name: 'Flow + summary', gap: 24 }); add(ct, [row, 'FILL']);
  const fc = card('Flow card', { gap: 20, p: 24, r: 20, w: 640 }); row.appendChild(fc);
  const side = AL('VERTICAL', { name: 'Side summary', gap: 16 }); add(row, [side, 'FILL']);
  return { f, fc, side, ct, stp };
}
// footer from a CTA spec {back, backIcon, alt:[[type,label,icon]], note, next, nextType, state, lead, trail}
async function ffootS(fc, o) { const r = hrow('Flow footer', 12, { p: [20, 0, 0, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); add(fc, [r, 'FILL']); if (o.back) r.appendChild(await BTN('Ghost', o.back, { size: 'L', lead: o.backIcon === undefined ? 'arrow-left' : o.backIcon })); for (const [ty, l, ic] of (o.alt || [])) r.appendChild(await BTN(ty, l, { size: 'L', lead: ic })); sp(r); if (o.note) await tx(r, o.note, 'Caption', 'text/tertiary', { hug: true }); if (o.next) r.appendChild(await BTN(o.nextType || 'Primary', o.next, { size: 'L', state: o.state || 'Default', lead: o.lead, trail: o.trail === undefined ? 'arrow-right' : o.trail })); return r; }
// mark the last (or idx) Step Item of a Nav/Stepper instance as Error
async function stepErr(stp, idx) { const items = []; for (const n of stp.findAll(x => x.type === 'INSTANCE')) { const mc = await n.getMainComponentAsync(); if (mc && mc.parent && mc.parent.id === '14:1193') items.push(n); } const it = items[idx == null ? items.length - 1 : idx]; if (it) it.setProperties({ State: 'Error' }); return items.length; }
// ===== END WAL-WB desktop shell =====

// ===== WAL-18 Step 9 Successful + WAL-19 Step 9 Failed — content builders (M: 0 desktop, 1 mobile) =====
async function flow18(fc, M) {
  await stHead(fc, await B('Confirmed', 'Completed'), { M, right: 'Completed 27 Nov 2026, 20:34 UTC' });
  await fhead(fc, 'Withdrawal complete', 'Your USDT has arrived. The transaction is final on Arbitrum One with 20 of 20 confirmations.', M);
  await bigAmt(fc, 'YOU RECEIVED', '1,499.92 USDT', 'at ' + AD + ' on Arbitrum One · 27 Nov 2026, 20:34 UTC', { M, color: 'text/success' });
  const hb = AL('VERTICAL', { name: 'Transaction hash', gap: 6, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10 }); add(fc, [hb, 'FILL']); await tx(hb, 'Transaction hash', 'Caption', 'text/tertiary'); const th = await I('20:5893', { State: 'Default' }, { Hash: '0xb7d4…2c91', 'Show DEMO': true, 'Show explorer link': !M }); hb.appendChild(th); if (M) hb.appendChild(await BTN('Ghost', 'View on explorer', { size: 'S', lead: 'external-link' }));
  const rc = card('Receipt', { gap: 0, p: M ? [4, 16, 4, 16] : [8, 20, 8, 20], fill: 'surface/raised' }); add(fc, [rc, 'FILL']);
  const rh = hrow('Receipt header', 8, { p: [8, 0, 8, 0] }); add(rc, [rh, 'FILL']); rh.appendChild(await IC('receipt', 18, 'icon/muted')); await tx(rh, 'Receipt · WD-20931', 'Body/M Strong', 'text/primary', { hug: true }); rh.appendChild(await DEMO('XS'));
  const R = [['Amount withdrawn', '1,500.00 USDT', 'Number/S'], ['Network fee', '−0.08 USDT', 'Number/S'], ['Platform fee', '0.00 USDT', 'Number/S'], ['You received', '1,499.92 USDT', 'Number/S', 'text/success'], ['Requested', '27 Nov 2026, 18:44 UTC'], ['AML review cleared', '27 Nov 2026, 20:31 UTC'], ['Sent', '27 Nov 2026, 20:32 UTC'], ['Confirmed', '27 Nov 2026, 20:34 UTC · 20 / 20']];
  for (let i = 0; i < R.length; i++) await kv(rc, R[i][0], R[i][1], { vs: R[i][2], vc: R[i][3], last: i === R.length - 1 });
  await tx(fc, 'A copy of this receipt was emailed to n•••@example.com — genuine emails show your anti-phishing code AURORA-27.', 'Caption', 'text/tertiary');
  return { alt: [['Secondary', 'Download receipt (PDF)', 'download']], next: 'Back to wallet', trail: null };
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

// ===== BODY d1819 — WAL-18 Successful + WAL-19 Failed (sanctions / network) desktop =====
const N18 = 'WAL-18 Withdraw — Step 9 Successful / 1440 / Default';
const N19 = 'WAL-19 Withdraw — Step 9 Failed / 1440 / ';
const L19 = [['Sanctions', N19 + 'Rejected by sanctions screening (alternative outcome)'], ['Network', N19 + 'Network failure — retry (alternative outcome)']];
clean([N18].concat(L19.map(x => x[1])));
const out = {};
{ const S = await shellD(N18, 9, COLX[3], 'WD-20931 · 1,499.92 USDT received on Arbitrum One');
  const cta = await flow18(S.fc, 0); await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 9, ref: true, badge: await B('Confirmed', 'Completed'), recvL: 'You received' });
  await balCard(S.side, 'Your balance now', [['check-circle', 'balance/available', 'Available', '9,215.30 USDT'], ['lock', 'balance/locked', 'Locked', '350.00 USDT']], '1,500.00 USDT left Locked when the withdrawal was sent. Locked now holds only your 35 entries in round #1,248.');
  await helpCard(S.side, 'help-circle', 'Don\'t see it in your wallet?', 'Make sure your wallet shows the Arbitrum One network and has USDT (Arbitrum One) added as a token. Still missing? Contact support with WD-20931.', [['Withdrawal FAQ', 'book'], ['Contact support', 'chat']]);
  out[N18] = S.f.id; }
for (const [st, nm] of L19) {
  const S = await shellD(nm, 9, COLX[4], st === 'Sanctions' ? 'WD-20931 · rejected — 1,500.00 USDT returned to Available' : 'WD-20931 · not sent — 1,500.00 USDT returned to Available');
  await stepErr(S.stp);
  const cta = await flow19(S.fc, st, 0); await ffootS(S.fc, cta);
  await sumCard(S.side, { n: 9, ref: true, badge: st === 'Sanctions' ? await B('Rejected') : await B('Failed'), fee: 'Not charged', recvL: 'Returned to Available', recv: '1,500.00 USDT' });
  await balCard(S.side, 'Your balance now', [['check-circle', 'balance/available', 'Available', '10,715.30 USDT'], ['lock', 'balance/locked', 'Locked', '350.00 USDT']], 'Available includes the returned 1,500.00 USDT. Locked holds your 35 entries in round #1,248.');
  await helpCard(S.side, 'chat', st === 'Sanctions' ? 'Questions about this decision?' : 'Need a hand?', st === 'Sanctions' ? 'Support can explain the appeal process and confirm your other addresses are fine to use. Quote AML-58214 — we\'ll never ask for your password or 2FA codes.' : 'Failed broadcasts are rare and never cost you a fee. If a retry fails again, contact support with WD-20931 and we\'ll send it manually.', [['Contact support', 'chat'], ['Withdrawal FAQ', 'book']]);
  out[nm] = S.f.id;
}
fitSection(sec);
// fix WAL-17 Manual review desktop: footer note overflowed the card
{ const f = await figma.getNodeByIdAsync('102:40262'); if (f) { const ft = f.findOne(x => x.name === 'Flow footer'); const nt = ft && ft.children.find(x => x.type === 'TEXT'); if (nt) nt.remove(); } }
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.5 }); }
return { section: sec.id, out, sizes };
