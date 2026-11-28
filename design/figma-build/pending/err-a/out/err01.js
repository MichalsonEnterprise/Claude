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

// ===== ERR KIT (err-a: ERR-01/02/03 boards + ERR mobile) =====
const IDS = { emptyState: '23:15005', alert: '30:17116', toast: '30:16872', skelRow: '23:14920', timeline: '20:8473', feeEst: '20:3002', confProg: '20:3076', inAddr: '15:3617', inAmt: '15:3387', inText: '13:762', drawer: '28:20511', chartLine: '27:15865', upload: '20:9454', liveBets: '25:14776', vrf: '23:11967', device: '23:9199', notif: '23:11317', th: '22:8309', topM: '23:12908', tabM: '22:5413', hash: '20:5893', netPill: '9:377', tileG: '28:16529', search: '16:3820', seg: '20:6978', skelRowC: '23:14920' };
const __created = [];
function VB(name, w, o = {}) { const f = AL('VERTICAL', Object.assign({ name, w }, o)); f.primaryAxisSizingMode = 'AUTO'; return f; }
function HB(name, o = {}) { const f = AL('HORIZONTAL', o.name ? o : Object.assign({ name }, o)); if (o.w && !o.h) f.counterAxisSizingMode = 'AUTO'; return f; }
function spacer(dir = 'H') { const s = figma.createFrame(); s.name = 'Spacer'; s.fills = []; s.resize(1, 1); return s; }
async function loadFor(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
function textsOf(inst, name) { return inst.findAll(n => n.type === 'TEXT' && (name == null || n.name === name)); }
async function setT(inst, name, chars, idx = 0) { const t = textsOf(inst, name)[idx]; if (!t) return false; await loadFor(t); t.characters = chars; return true; }
async function setNth(inst, idx, chars) { const t = textsOf(inst)[idx]; if (!t) return false; await loadFor(t); t.characters = chars; return true; }
async function setByChars(inst, from, to) { const t = inst.findAll(n => n.type === 'TEXT' && n.characters === from)[0]; if (!t) return false; await loadFor(t); t.characters = to; return true; }
async function badge(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await setNth(b, 0, label); return b; }
const TONES = { neutral: ['surface/raised', 'icon/default'], brand: ['brand/tint', 'icon/brand'], danger: ['status/danger-tint', 'status/danger'], warning: ['status/warning-tint', 'status/warning'], info: ['status/info-tint', 'status/info'], success: ['status/success-tint', 'status/success'], gold: ['accent/gold-tint', 'icon/gold'] };
async function iconTile(icon, tone = 'neutral', size = 48) { const [f, c] = TONES[tone]; const t = AL('HORIZONTAL', { name: 'Icon tile/' + icon, w: size, h: size, r: size >= 40 ? 14 : 10, fill: f, justify: 'CENTER', align: 'CENTER' }); add(t, await IC(icon, Math.round(size / 2), c)); return t; }
// emptyBlock({icon, tone, title, body, actions:[nodes], note, w, align})
async function emptyBlock(o) {
  const w = o.w || 520; const al = o.align || 'CENTER';
  const b = VB('Empty state — ' + o.title.slice(0, 40), w, { gap: 12, align: al === 'CENTER' ? 'CENTER' : 'MIN' });
  if (o.icon) add(b, await iconTile(o.icon, o.tone || 'neutral', o.iconSize || 48));
  add(b, [await T(o.title, o.titleStyle || 'Heading/H5', 'text/primary', { w, align: al === 'CENTER' ? 'CENTER' : 'LEFT' }), 'FILL']);
  if (o.body) add(b, [await T(o.body, 'Body/S', 'text/secondary', { w, align: al === 'CENTER' ? 'CENTER' : 'LEFT' }), 'FILL']);
  if (o.actions && o.actions.length) { const a = HB('Actions', { gap: 8, align: 'CENTER' }); for (const n of o.actions) add(a, n); add(b, a); }
  if (o.note) add(b, [await T(o.note, 'Caption', 'text/tertiary', { w, align: al === 'CENTER' ? 'CENTER' : 'LEFT' }), 'FILL']);
  return b;
}
function panel(name, o = {}) { return VB(name, o.w || 520, { gap: o.gap ?? 12, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', r: o.r ?? 14 }); }
async function kv(label, value, o = {}) { const r = HB('KV/' + label, { gap: 12, align: 'CENTER' }); const l = await T(label, o.ls || 'Body/S', 'text/tertiary'); const s = spacer(); const v = await T(value, o.vs || 'Number/S', o.vc || 'text/primary'); add(r, l, s); s.layoutGrow = 1; add(r, v); if (o.demo) add(r, await DEMO('XS')); return r; }
async function miniStat(label, value, o = {}) { const b = VB('Stat/' + label, 120, { gap: 4, p: [12, 12], fill: 'surface/raised', r: 10 }); add(b, await T(label, 'Caption', 'text/tertiary'), await T(value, o.vs || 'Number/S', o.vc || 'text/primary')); return b; }
async function statRow(items, demo = true) { const r = HB('Stats', { gap: 8, align: 'CENTER' }); for (const [l, v] of items) { const s = await miniStat(l, v); add(r, s); s.layoutGrow = 1; } if (demo) add(r, await DEMO('S')); return r; }
async function stepLine(state, title, time, detail) { // state: done|current|failed|todo
  const ic = { done: ['check-circle', 'status/success'], current: ['spinner', 'status/info'], failed: ['x-circle', 'status/danger'], todo: ['clock', 'icon/muted'], warn: ['alert-triangle', 'status/warning'] }[state];
  const r = HB('Step/' + title, { gap: 12 }); add(r, await IC(ic[0], 20, ic[1]));
  const c = VB('Step text', 300, { gap: 2 }); const top = HB('Top', { gap: 8, align: 'CENTER' }); add(top, await T(title, 'Label/M', state === 'todo' ? 'text/tertiary' : 'text/primary')); if (time) add(top, await T(time, 'Mono/S', 'text/tertiary'));
  add(c, [top, 'FILL']); if (detail) add(c, [await T(detail, 'Caption', 'text/secondary', { w: 300 }), 'FILL']);
  add(r, c); c.layoutGrow = 1; return r;
}
// cell({id, mod, title, full, stage:[nodes|[node,'FILL']], trigger, copy, recovery, dev, admin, sp, sg, align})
async function cell(o) {
  const W = o.full ? 1280 : 628, IW = W - 48;
  const c = VB(`Cell ${o.id} · ${o.mod} — ${o.title}`.slice(0, 120), W, { fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true });
  const h = VB('Cell header', W, { gap: 8, p: [20, 24, 16, 24] }); strokeSides(h, 'border/subtle', { b: 1 });
  const top = HB('Meta', { gap: 8, align: 'CENTER' });
  const tag = HB('Module tag', { p: [4, 8], r: 6, fill: o.admin ? 'status/info-tint' : 'brand/tint' }); add(tag, await T(o.mod, 'Overline', o.admin ? 'text/info' : 'text/brand'));
  add(top, tag, await T(o.id, 'Mono/S', 'text/tertiary'));
  if (o.kind) { const s = spacer(); add(top, s); s.layoutGrow = 1; const k = HB('Kind', { gap: 6, p: [4, 8], r: 9999, stroke: 'border/default', align: 'CENTER' }); add(k, await IC(o.kindIcon || 'layers', 14, 'icon/muted'), await T(o.kind, 'Label/S', 'text/secondary')); add(top, k); }
  add(h, [top, 'FILL'], [await T(o.title, 'Heading/H5', 'text/primary', { w: IW }), 'FILL']);
  add(c, [h, 'FILL']);
  const st = VB('Preview', W, { fill: 'bg/secondary', p: o.sp ?? 24, gap: o.sg ?? 16, align: o.align || 'CENTER', justify: 'CENTER' });
  for (const k of o.stage) add(st, k);
  add(c, [st, 'FILL']);
  const sp = VB('Spec', W, { gap: 8, p: [16, 24, 20, 24] }); strokeSides(sp, 'border/subtle', { t: 1 });
  for (const [k, v] of [['Trigger', o.trigger], ['Copy', o.copy], ['Recovery', o.recovery], ['Dev', o.dev]]) {
    if (!v) continue; const r = HB('Spec/' + k, { gap: 12 });
    const lab = await T(k.toUpperCase(), 'Overline', k === 'Recovery' ? 'text/brand' : 'text/tertiary', { w: 88 });
    const val = await T(v, k === 'Copy' ? 'Body/S Strong' : 'Body/S', k === 'Copy' ? 'text/primary' : 'text/secondary', { w: IW - 100 });
    add(r, lab, [val, 'FILL']); add(sp, [r, 'FILL']);
  }
  add(c, [sp, 'FILL']);
  return c;
}
async function row(body, name, cells) {
  const old = body.findChild(n => n.name === name); if (old) old.remove();
  const r = HB(name, { gap: 24, w: 1280 }); for (const c of cells) add(r, c);
  if (cells.length > 1) { const m = Math.max(...cells.map(c => c.height)); for (const c of cells) if (c.height < m - 0.5) { const st = c.findChild(n => n.name === 'Preview'); st.layoutGrow = 1; c.primaryAxisSizingMode = 'FIXED'; c.resize(c.width, m); } }
  add(body, [r, 'FILL']); __created.push(r.id); return r;
}
async function boardHeader(o) {
  const hd = HB('Board header', { gap: 48, w: 1280 });
  const L = VB('Intro', 760, { gap: 16 });
  add(L, await T(o.over, 'Overline', 'text/brand'), [await T(o.title, 'Heading/H1', 'text/primary', { w: 760 }), 'FILL'], [await T(o.body, 'Body/L', 'text/secondary', { w: 760 }), 'FILL']);
  const chips = AL('HORIZONTAL', { name: 'Rules', gap: 8, wrap: true, cgap: 8, w: 760 }); chips.counterAxisSizingMode = 'AUTO';
  for (const [ic, tx] of o.rules) { const ch = HB('Rule', { gap: 6, p: [6, 12], r: 9999, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' }); add(ch, await IC(ic, 16, 'icon/brand'), await T(tx, 'Label/M', 'text/primary')); add(chips, ch); }
  add(L, [chips, 'FILL']);
  const R = VB('How to read a cell', 472, { gap: 12, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14 });
  const rt = HB('Legend title', { gap: 8, align: 'CENTER' }); const s = spacer(); add(rt, await T('How to read a cell', 'Label/L', 'text/primary'), s); s.layoutGrow = 1; add(rt, await DEMO('M'));
  add(R, [rt, 'FILL']);
  for (const [k, v] of o.legend) { const r = HB('Legend/' + k, { gap: 12 }); add(r, await T(k.toUpperCase(), 'Overline', k === 'Recovery' ? 'text/brand' : 'text/tertiary', { w: 96 }), [await T(v, 'Body/S', 'text/secondary', { w: 316 }), 'FILL']); add(R, [r, 'FILL']); }
  add(hd, L, R);
  return hd;
}
async function board(sec, name, x, y) {
  let f = sec.findChild(n => n.name === name), body;
  if (!f) { f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y; const d = await DEMOBAR(); add(f, [d, 'FILL']); body = VB('Board body', 1440, { p: [56, 80, 96, 80], gap: 32 }); add(f, [body, 'FILL']); }
  else body = f.findChild(n => n.name === 'Board body');
  return [f, body];
}
function restack(sec) { const bs = sec.children.filter(n => /^\[ERR-0[123]\]/.test(n.name)).sort((a, b) => a.name.localeCompare(b.name)); let y = 120; for (const b of bs) { b.x = 120; b.y = y; y += b.height + 160; } }
// ===== END ERR KIT =====

// ERR-01 Empty-state matrix board (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-01] Empty-state matrix / 1440 / Board', 120, 120);
if (!body.findChild(n => n.name === 'Board header')) add(body, [await boardHeader({
  over: 'ERR-01 · Empty states · P0 · page 12',
  title: 'Empty states, module by module',
  body: 'Every list, table and balance in GLOBAL POOL has a designed zero state. Each cell names the module, the exact trigger, the copy we ship and the recovery action we offer. Empty states inform — they never push anyone to deposit or play.',
  rules: [['check-circle', 'Say what is empty and why'], ['arrow-right', 'One next step, two at most'], ['ban', 'No pressure to deposit or play'], ['eye', 'Disabled actions stay visible, with the reason'], ['layers', 'Tables reuse Table/Empty State']],
  legend: [['Module · ID', 'Surface the state belongs to, plus its matrix ID (E-01…)'], ['Preview', 'Library instances in the real state, with DEMO data'], ['Trigger', 'The exact condition or API result that shows it'], ['Copy', 'The words we ship'], ['Recovery', 'The next step we offer (primary first)'], ['Dev', 'Behaviour notes for engineering']]
}), 'FILL']);

// ---------- Row 1: Wallet + Entries ----------
const balP = panel('Balance — empty', {});
const tp = HB('Total', { gap: 12, align: 'CENTER' }); const tv = VB('Total value', 200, { gap: 2 });
add(tv, await T('Total balance', 'Caption', 'text/tertiary'), await T('0.00 USDT', 'Number/L', 'text/primary'));
const s1 = spacer(); add(tp, await iconTile('wallet', 'neutral', 40), tv, s1); s1.layoutGrow = 1; add(tp, await DEMO('S'));
const bk = HB('Buckets', { gap: 8 });
for (const l of ['Available', 'Locked', 'Pending', 'Owed']) { const b = await miniStat(l, '0.00', { vc: 'text/secondary' }); add(bk, b); b.layoutGrow = 1; }
add(balP, [tp, 'FILL'], [bk, 'FILL']);
const e01 = await emptyBlock({ title: 'Your wallet is empty', body: 'Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT. Funds show as Pending until the network confirms them.', actions: [await BTN('Primary', 'Deposit USDT', { lead: 'deposit' }), await BTN('Secondary', 'Withdraw', { lead: 'withdraw', state: 'Disabled' })], note: 'Withdraw unlocks once you have an Available balance.' });
const c01 = await cell({ id: 'E-01', mod: 'Wallet', title: 'Wallet overview — brand-new account', kind: 'Page section', stage: [[balP, 'FILL'], [e01, 'FILL']],
  trigger: 'GET /wallet/balances returns total 0.00 and the ledger has no entries (new account, any KYC level).',
  copy: '“Your wallet is empty” · “Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT.”',
  recovery: 'Deposit USDT (primary) → WAL-03 deposit flow. Withdraw stays visible but disabled, with the reason underneath.',
  dev: 'All four buckets render 0.00 (never blank). No welcome-bonus upsell inside the empty state; promotions live in their own slots.' });

const tk = HB('Ticket placeholder', { gap: 16, p: [16, 20], r: 14, stroke: 'border/strong', align: 'CENTER' }); tk.dashPattern = [6, 4];
const tt = VB('Ticket text', 300, { gap: 2 }); add(tt, await T('Round #1,248 · Open', 'Label/M', 'text/secondary'), await T('0 entries', 'Number/M', 'text/primary'), await T('18,640 qualifying entries from 3,412 players', 'Caption', 'text/tertiary'));
add(tk, await iconTile('ticket', 'neutral', 48), tt); tt.layoutGrow = 1; add(tk, await DEMO('S'));
const e04 = await emptyBlock({ title: 'No entries in round #1,248', body: 'Round #1,248 closes 27 Nov 2026, 20:00 UTC. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee, both shown before you confirm.', actions: [await BTN('Gold', 'Enter round #1,248', { lead: 'ticket' }), await BTN('Ghost', 'How the draw works')], note: 'You can lose your stake · 18+ · Only where Global Pool is licensed' });
const c04 = await cell({ id: 'E-02', mod: 'Global Pool · My entries', title: 'My entries — none in the open round', kind: 'Tab panel', stage: [[tk, 'FILL'], [e04, 'FILL']],
  trigger: 'GET /pool/rounds/1248/my-entries returns 0 while round #1,248 is Open (closes 20:00 UTC).',
  copy: '“No entries in round #1,248” · “Round #1,248 closes 27 Nov 2026, 20:00 UTC. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee…”',
  recovery: 'Enter round (Gold) → GP-02 preview with fee line, odds and unchecked consent. Secondary: How the draw works.',
  dev: 'No round open → swap CTA for “Next round opens 28 Nov 2026, 08:00 UTC” + Remind me. Countdown text only from the real close time.' });
await row(body, 'Row 1 — Wallet · Entries', [c01, c04]);

// ---------- Row 2: Transactions (full) ----------
const es1 = await I(IDS.emptyState, { Type: 'No data' });
await setT(es1, 'Body', 'Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.');
const c02 = await cell({ id: 'E-03', mod: 'Transactions', title: 'Transaction history — no activity yet', full: true, kind: 'Table/Empty State · No data', stage: [es1],
  trigger: 'GET /transactions?cursor= returns [] and the account has never had a ledger movement.',
  copy: '“No transactions yet” · “Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.”',
  recovery: 'Make a deposit (primary) · How deposits work (secondary). Toolbar filters, density and Export CSV are hidden until there is at least one row.',
  dev: 'Same component in Wallet › History, Financial history (USR-F) and admin user ledgers. Height 356 inside the 1120 table card; header row stays rendered.' });
await row(body, 'Row 2 — Transactions', [c02]);

// ---------- Row 3: Winnings + Referrals ----------
const w1 = await statRow([['Prizes won', '0.00 USDT'], ['Owed to you', '0.00 USDT']]);
const e05 = await emptyBlock({ icon: 'trophy', title: 'No winnings yet', body: 'Prizes from Global Pool draws and game wins appear here once they settle. Most entries don’t win — only play with money you can afford to lose.', actions: [await BTN('Secondary', 'View past draws', { lead: 'history' }), await BTN('Ghost', 'Set a limit', { lead: 'shield' })] });
const c05 = await cell({ id: 'E-04', mod: 'Winnings', title: 'My winnings — nothing won yet', kind: 'Page', stage: [[w1, 'FILL'], [e05, 'FILL']],
  trigger: 'GET /winnings returns [] — no settled prizes and no Owed items (refunds or rewards).',
  copy: '“No winnings yet” · “Most entries don’t win — only play with money you can afford to lose.”',
  recovery: 'View past draws (results + VRF proofs). The RG “Set a limit” link is always present; there is no “Play now” push.',
  dev: 'Neutral trophy icon, not gold: gold is reserved for real prize moments. Owed refunds/rewards would fill this list, so it is only empty when both are 0.' });

const lk = HB('Referral link', { gap: 8, p: [8, 8, 8, 12], r: 10, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' });
const lt = await T('globalpool.example/r/NOVAK27', 'Mono/S', 'text/primary'); add(lk, lt); lt.layoutGrow = 1; add(lk, await DEMO('XS'), await BTN('Secondary', 'Copy link', { size: 'S', lead: 'copy' }));
const r1 = await statRow([['Clicks', '0'], ['Sign-ups', '0'], ['Earned', '0.00 USDT']]);
const e06 = await emptyBlock({ icon: 'users', title: 'Nobody has joined with your link yet', body: 'You earn 20% of the 0.05 USDT platform fee on qualifying Global Pool entries by players you refer, for 12 months. Terms apply.', actions: [await BTN('Primary', 'Share link', { lead: 'link' }), await BTN('Ghost', 'Referral terms')] });
const c06 = await cell({ id: 'E-05', mod: 'Referrals', title: 'Invited users — nobody yet (new referrer)', kind: 'Page', stage: [[r1, 'FILL'], [lk, 'FILL'], [e06, 'FILL']],
  trigger: 'GET /referrals/invited returns 0 sign-ups. Clicks may already be above 0 — the stats row shows the real counts.',
  copy: '“Nobody has joined with your link yet” · “You earn 20% of the 0.05 USDT platform fee … for 12 months. Terms apply.”',
  recovery: 'Share link (primary) · Copy link inline · Referral terms. Never sample or placeholder users in the table.',
  dev: 'Alternative state for a new referrer (@nova.k’s demo account has 48 sign-ups). Commission wording must match USR-R1 and the Affiliate terms.' });
await row(body, 'Row 3 — Winnings · Referrals', [c05, c06]);

// ---------- Row 4: Filters no results (full) ----------
const es2 = await I(IDS.emptyState, { Type: 'No results' });
await setT(es2, 'Body', 'No refunds on Solana between 20 and 27 Nov 2026. Try removing a filter or widening the date range.');
const c03 = await cell({ id: 'E-06', mod: 'Any table · Filters', title: 'Filtered list — no matches', full: true, kind: 'Table/Empty State · No results', stage: [es2],
  trigger: 'Filters applied (Type = Refund · Network = Solana · 20–27 Nov 2026) and the query returns 0 rows, while the unfiltered list has rows.',
  copy: '“No results match your filters” · “No refunds on Solana between 20 and 27 Nov 2026. Try removing a filter or widening the date range.”',
  recovery: 'Clear all filters (primary) · Edit filters (secondary). Active filter chips stay visible above the empty state.',
  dev: 'Body names the active filters in words. Search with no match uses the same variant: “No transaction matches ‘0x9b2d…’ — paste the full hash.”' });
await row(body, 'Row 4 — Filters', [c03]);

// ---------- Row 5: Notifications + Favourites ----------
const nh = HB('Notifications header', { gap: 8, align: 'CENTER' });
const sg = await I(IDS.seg, { Segments: '2' }); await setNth(sg, 0, 'Unread 0'); await setNth(sg, 1, 'All 14');
const s5 = spacer(); add(nh, sg, s5); s5.layoutGrow = 1; add(nh, await BTN('Ghost', 'Mark all as read', { size: 'S', state: 'Disabled' }));
const e07 = await emptyBlock({ icon: 'bell', title: 'You’re all caught up', body: 'Security alerts, deposits, withdrawals and round results appear here. Promotional messages stay off unless you turn them on.', actions: [await BTN('Secondary', 'Notification settings', { lead: 'settings' }), await BTN('Ghost', 'Show all 14')] });
const c07 = await cell({ id: 'E-07', mod: 'Notifications', title: 'Notification centre — nothing unread', kind: 'Popover + page', stage: [[nh, 'FILL'], [e07, 'FILL']],
  trigger: 'Unread tab active and unread count = 0 (WebSocket badge cleared). A brand-new account with 0 notifications in total uses the same block without “Show all”.',
  copy: '“You’re all caught up” · “Promotional messages stay off unless you turn them on.”',
  recovery: 'Notification settings · Show all (read) notifications. “Mark all as read” is disabled, not hidden.',
  dev: 'Bell badge hidden at 0 (not “0”). Security notifications can’t be turned off — settings link explains why.' });

const ph = HB('Tile placeholders', { gap: 12, align: 'CENTER' });
for (let i = 0; i < 4; i++) { const t = AL('VERTICAL', { name: 'Placeholder tile', w: 100, h: 133, r: 10, stroke: 'border/strong', justify: 'CENTER', align: 'CENTER' }); t.dashPattern = [6, 4]; add(t, await IC('star', 24, 'icon/muted')); add(ph, t); }
const e11 = await emptyBlock({ title: 'No favourites yet', body: 'Tap the star on any game tile to keep it here — Orbit Rush, Pool Dice, Twenty-One or any GP Studios slot.', actions: [await BTN('Secondary', 'Browse Originals', { lead: 'games' })] });
const c11 = await cell({ id: 'E-08', mod: 'Lobby · Favourites', title: 'Favourites row — nothing saved', kind: 'Carousel row', stage: [ph, [e11, 'FILL']],
  trigger: 'GET /games/favourites returns [] for a signed-in player.',
  copy: '“No favourites yet” · “Tap the star on any game tile to keep it here…”',
  recovery: 'Browse Originals → lobby Originals row. Recently played uses the same pattern (“Games you play show up here”).',
  dev: 'Row keeps its height (tile placeholders 100×133, dashed border/strong) so the lobby does not jump when the first favourite is added.' });
await row(body, 'Row 5 — Notifications · Favourites', [c07, c11]);

// ---------- Row 6: Devices (full) ----------
const dv = await I(IDS.device, { State: 'Current', Interaction: 'Default' });
const e08 = await emptyBlock({ w: 640, title: 'No other devices are signed in', body: 'When you sign in on another phone or browser it appears here with its location and last activity, so you can spot anything you don’t recognise.', actions: [await BTN('Secondary', 'Sign-in history', { lead: 'history' }), await BTN('Ghost', 'Security settings', { lead: 'shield' })] });
const c08 = await cell({ id: 'E-09', mod: 'Account · Devices', title: 'Connected devices — only this device', full: true, kind: 'List', stage: [dv, e08],
  trigger: 'GET /devices returns only the current session (MacBook Pro · Chrome · Lisbon). The list is never truly empty while you are signed in.',
  copy: '“No other devices are signed in” · “…so you can spot anything you don’t recognise.”',
  recovery: 'Sign-in history (USR-A6) · Security settings. “Sign out all other devices” is hidden because there is nothing to revoke.',
  dev: 'User/Device Row State=Current stays on top; the empty block replaces the “Other devices” list. Sessions page (USR-A8) uses the same copy pattern.' });
await row(body, 'Row 6 — Devices', [c08]);

// ---------- Row 7: Game history + Admin search ----------
const gh = HB('Columns', { gap: 0 });
for (const [l, w] of [['Round', 120], ['Bet', 100], ['Cash-out', 100], ['Payout', 100], ['Seed', 112]]) { const h = await I(IDS.th, { Align: 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); h.resize(w, 40); add(gh, h); }
const e12 = await emptyBlock({ icon: 'crash', tone: 'brand', title: 'No Orbit Rush bets yet', body: 'Every bet you place shows here with its round ID, cash-out, payout and seed, so you can verify any result yourself.', actions: [await BTN('Secondary', 'How provably fair works', { lead: 'shield-check' }), await BTN('Ghost', 'Set a session limit')] });
const c12 = await cell({ id: 'E-10', mod: 'Games · Bet history', title: 'Game history tab — no bets in this game', kind: 'Table', stage: [gh, [e12, 'FILL']],
  trigger: 'GET /games/orbit-rush/bets?player=me returns [] (any Original: Pool Dice, Double Side, Pool Roulette…).',
  copy: '“No Orbit Rush bets yet” · “…so you can verify any result yourself.”',
  recovery: 'How provably fair works (opens the verifier tab) · Set a session limit. No “Place your first bet” nudge.',
  dev: 'Column headers stay so the layout matches the filled table. Game name comes from the catalogue (original names only).' });

const sr = await I(IDS.search, { Size: 'M', State: 'Filled' }); await setNth(sr, 0, 'GP-99999');
const e10 = await emptyBlock({ icon: 'search', title: 'No user matches “GP-99999”', body: 'Check the ID format (GP- followed by 5 digits) or search by email, wallet address or transaction hash. Addresses and hashes must match exactly.', actions: [await BTN('Ghost', 'Clear search', { size: 'S', lead: 'x' })], note: 'Search is logged to the audit trail (#88,214 · R. Duarte).' });
const c10 = await cell({ id: 'E-11', mod: 'Admin · User search', admin: true, title: 'Admin user search — no match', kind: 'Admin', stage: [sr, [e10, 'FILL']],
  trigger: 'Admin › Users search returns 0 results for an exact-ID query.',
  copy: '“No user matches “GP-99999”” · “Check the ID format (GP- followed by 5 digits)…”',
  recovery: 'Clear search. No “create user” shortcut — accounts are only created by players.',
  dev: 'Partial e-mail matches are masked (n•••@example.com) per role. Command palette (⌘K) uses Nav/Command Palette State=No results.' });
await row(body, 'Row 7 — Game history · Admin search', [c12, c10]);

// ---------- Row 8: Admin queue (full) ----------
const qt = VB('Admin queue', 1184, { fill: 'surface/default', stroke: 'border/default', r: 14, clip: true });
const qh = HB('Queue title', { gap: 12, p: [16, 20], align: 'CENTER' });
const qs = spacer(); add(qh, await T('Withdrawal queue', 'Heading/H5', 'text/primary'), await badge('Live', null), await DEMO('M'), qs); qs.layoutGrow = 1;
add(qh, await T('Pending review · 0', 'Label/M', 'text/secondary'), await BTN('Secondary', 'Export CSV', { size: 'S', state: 'Disabled', lead: 'download' }));
add(qt, [qh, 'FILL']);
const hr = HB('Header row', { gap: 0 }); fill(hr, 'bg/secondary');
for (const [l, w] of [['Request', 220], ['User', 168], ['Amount', 160], ['Destination', 224], ['Risk', 144], ['Status', 132], ['Requested', 136]]) { const h = await I(IDS.th, { Align: l === 'Amount' ? 'Right' : 'Left', Sort: l === 'Requested' ? 'Asc' : 'None' }, { Label: l, 'Show sort icon': l === 'Requested' }); h.resize(w, 40); add(hr, h); }
add(qt, [hr, 'FILL']);
const qe = VB('Empty body', 1184, { p: [48, 24, 56, 24], align: 'CENTER' });
add(qe, await emptyBlock({ w: 560, icon: 'check-circle', tone: 'success', title: 'No withdrawals waiting for review', body: 'New requests arrive in real time and are ordered oldest first. Review SLA is 4 h. Last decision: WD-20850 rejected by A. Marin at 18:42 UTC.', actions: [await BTN('Secondary', 'View processed today', { size: 'S', lead: 'history' }), await BTN('Ghost', 'Queue rules', { size: 'S' })] }));
add(qt, [qe, 'FILL']);
const c09 = await cell({ id: 'E-12', mod: 'Admin · Finance tables', admin: true, title: 'Admin queue table — queue is clear', full: true, kind: 'Admin table', stage: [qt],
  trigger: 'Admin › Finance › Withdrawals, filter Status = Pending review, count = 0 (alternative to the 37-item DEMO queue).',
  copy: '“No withdrawals waiting for review” · “New requests arrive in real time… Review SLA is 4 h.”',
  recovery: 'View processed today (filtered history). Bulk action bar, select-all and filters are not shown when nothing is selectable; Export CSV is disabled.',
  dev: 'Same pattern for KYC (214), AML alerts, approvals inbox (four-eyes) and reconciliation mismatches: “No … waiting” + last decision + SLA. Header stays for column memory.' });
await row(body, 'Row 8 — Admin queue', [c09]);

restack(sec); fitSection(sec);
const rows = body.children.filter(n => n.name.startsWith('Row'));
const shots = [];
for (const r of rows) shots.push(await r.screenshot({ scale: 0.55 }));
return { section: sec.id, board: B.id, size: [B.width, B.height], rows: rows.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height), cells: r.children.map(c => Math.round(c.height)) })) };
