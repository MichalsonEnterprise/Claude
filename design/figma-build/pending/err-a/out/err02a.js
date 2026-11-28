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

// ERR-02 Error matrix board — part A (header + rows 1–4) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-02] Error matrix / 1440 / Board', 120, nextY(sec));
if (!body.findChild(n => n.name === 'Board header')) add(body, [await boardHeader({
  over: 'ERR-02 · Error states · P0 · page 12',
  title: 'Errors by cause — and how each one recovers',
  body: 'Network, server, timeout, validation and on-chain failures each get a specific message, a plain statement of what happened to the money (“nothing was charged”, “1,500.00 USDT returned to Available”) and a safe next step. Error references make support fast.',
  rules: [['wallet', 'Always state the money status'], ['refresh', 'Retries reuse the idempotency key'], ['edit', 'Keep what the player typed'], ['hash', 'Reference + UTC time for support'], ['ban', 'Never show raw server text']],
  legend: [['Cause · ID', 'Failure family plus its matrix ID (X-01…)'], ['Preview', 'Library instances in the error state, with DEMO data'], ['Trigger', 'The exact condition, status code or chain event'], ['Copy', 'The words we ship'], ['Recovery', 'The next step we offer (primary first)'], ['Dev', 'Retry, idempotency and logging notes']]
}), 'FILL']);

// ---------- Row 1: list request failed (full) ----------
const es = await I(IDS.emptyState, { Type: 'Error' });
await setT(es, 'Body', 'The request to our ledger service timed out. Your balance and funds are not affected — only this list failed to load.');
const x01 = await cell({ id: 'X-01', mod: 'Network · Data request', title: 'List failed to load — transactions table', full: true, kind: 'Table/Empty State · Error', stage: [es],
  trigger: 'GET /transactions returns 504 Gateway Timeout, or the request fails at network level, after one silent automatic retry.',
  copy: '“We couldn’t load your transactions” · “Your balance and funds are not affected — only this list failed to load.” · Error ref TX-LIST-504',
  recovery: 'Try again (primary, re-runs the query) · System status. If cached rows exist they stay visible and the error becomes an inline row above them.',
  dev: 'Silent retry with backoff (0.5 s → 1.5 s) before showing. Error ref = service code + HTTP status + UTC time; copyable and pre-filled into the support form.' });
await row(body, 'Row 1 — Network · list', [x01]);

// ---------- Row 2: action failed (toast) + 5xx ----------
const t1 = await I(IDS.toast, { Type: 'Error' });
await setT(t1, 'Title', 'Couldn’t reach GLOBAL POOL'); await setT(t1, 'Body', 'Your 35 entries weren’t submitted, so nothing was charged. Check your connection and try again.');
await setByChars(t1, 'View details', 'Try again'); await setByChars(t1, 'Contact support', 'System status');
const kept = panel('Selection kept', { gap: 8, p: 16 });
const kh = HB('Kept title', { gap: 8, align: 'CENTER' }); const ks = spacer(); add(kh, await T('Your selection is kept', 'Label/M', 'text/primary'), ks); ks.layoutGrow = 1; add(kh, await DEMO('XS'));
add(kept, [kh, 'FILL'], [await kv('35 entries × 10.00', '350.00 USDT'), 'FILL'], [await kv('Platform fee 35 × 0.05', '1.75 USDT'), 'FILL'], [await kv('Total', '351.75 USDT', { vs: 'Number/M' }), 'FILL']);
const gb = await BTN('Gold', 'Confirm 35 entries · 351.75 USDT', { lead: 'ticket' }); add(kept, [gb, 'FILL']);
const x02 = await cell({ id: 'X-02', mod: 'Network · Action', title: 'Action failed — the request never reached us', kind: 'Toast + form', stage: [t1, [kept, 'FILL']],
  trigger: 'POST /pool/entries rejects with no HTTP response (offline, DNS, TLS or CORS failure) — the request never reached the server.',
  copy: '“Couldn’t reach GLOBAL POOL” · “Your 35 entries weren’t submitted, so nothing was charged. Check your connection and try again.”',
  recovery: 'Try again re-sends with the same idempotency key; the preview keeps 35 entries, the fee line and the total. System status opens the status page.',
  dev: 'Error toasts don’t auto-hide. If the request may have reached the server (timeout), use X-05 — never say “not charged” unless we know.' });

const p5 = panel('5xx panel', { gap: 16, p: 24 });
const ph5 = HB('Top', { gap: 12, align: 'CENTER' }); add(ph5, await iconTile('alert-triangle', 'danger', 40), await T('Something went wrong on our side', 'Heading/H5', 'text/primary'));
add(p5, ph5, [await T('Your balance is safe and nothing was changed. We’ve logged the problem — please try again in a moment.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const ref = HB('Reference', { gap: 8, p: [8, 8, 8, 12], r: 10, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER' });
const rt = await T('Ref GP-503-2B91-04DE · 27 Nov 2026, 18:44:18 UTC', 'Mono/S', 'text/primary'); add(ref, rt); rt.layoutGrow = 1; add(ref, await DEMO('XS'), await BTN('Ghost', 'Copy', { size: 'S', lead: 'copy' }));
add(p5, [ref, 'FILL']);
const a5 = HB('Actions', { gap: 8, align: 'CENTER' }); add(a5, await BTN('Primary', 'Try again', { lead: 'refresh' }), await BTN('Secondary', 'Status page', { trail: 'external-link' }), await BTN('Ghost', 'Contact support'));
add(p5, a5, [await T('503 with Retry-After: “Back at 18:46 UTC — we’ll retry once automatically.”', 'Caption', 'text/tertiary', { w: 480 }), 'FILL']);
const x04 = await cell({ id: 'X-03', mod: 'Server · 5xx', title: 'Server error — 500 · 502 · 503', kind: 'Inline panel', stage: [[p5, 'FILL']],
  trigger: 'Any 5xx from the API gateway on a read or a non-financial write. 503 carries Retry-After.',
  copy: '“Something went wrong on our side” · “Your balance is safe and nothing was changed.” · Ref GP-503-2B91-04DE',
  recovery: 'Try again · Status page · Contact support (pre-fills the reference). 503: absolute retry time and one automatic retry.',
  dev: 'For money actions “nothing was changed” only appears when the API confirms the rollback; otherwise use X-05. Full-page 500 = PUB-25.' });
await row(body, 'Row 2 — Action failed · 5xx', [x02, x04]);

// ---------- Row 3: 4xx map (full) ----------
const tb = VB('4xx map', 1184, { fill: 'surface/default', stroke: 'border/default', r: 14, clip: true });
const tth = HB('Table title', { gap: 12, p: [16, 20], align: 'CENTER' }); const tts = spacer();
add(tth, await T('HTTP 4xx → what the player sees', 'Heading/H5', 'text/primary'), tts); tts.layoutGrow = 1; add(tth, await DEMO('M'));
add(tb, [tth, 'FILL']);
const COLS = [['Status', 132], ['When', 296], ['Message we show', 456], ['Recovery', 300]];
const hr = HB('Header row', {}); fill(hr, 'bg/secondary');
for (const [l, w] of COLS) { const h = await I(IDS.th, { Align: 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); h.resize(w, 40); add(hr, h); }
add(tb, [hr, 'FILL']);
const MAP = [
  ['400', 'Bad request', 'Malformed or outdated request (e.g. an old app version).', '“Something in this request wasn’t valid. Refresh the page and try again.”', 'Refresh; report with the ref if it repeats'],
  ['401', 'Unauthorised', 'Access token expired or revoked.', '“Your session ended for security. Sign in again — we’ll bring you back here.”', 'Re-auth modal (AUTH-20); typed input is kept'],
  ['403', 'Forbidden', 'Action not allowed for this account, role or region.', '“You can’t do this from your account right now.” + the specific reason', 'Reason link: role (ERR-04), region or self-exclusion (ERR-05)'],
  ['404', 'Not found', 'Round, transaction or page doesn’t exist (yet).', '“We couldn’t find round #1,999. It may not have opened yet.”', 'Go to the current round #1,248'],
  ['409', 'Conflict', 'Same request already processed (idempotency key reused).', '“This withdrawal was already submitted as WD-20931. We didn’t send it twice.”', 'View WD-20931 — no second request'],
  ['422', 'Unprocessable', 'Server-side validation failed on submit.', 'Field messages inline (X-06) + “2 fields need attention” summary', 'Focus moves to the first invalid field'],
  ['429', 'Too many requests', 'Rate limit hit (e.g. 2FA codes, sign-in, search).', '“Too many attempts. You can try again at 18:45 UTC.”', 'Button disabled until the absolute time']
];
for (const [code, name, when, msg, rec] of MAP) {
  const r = HB('Row ' + code, {}); strokeSides(r, 'border/subtle', { t: 1 });
  const c0 = VB('Status', 132, { gap: 4, p: [12, 16] }); const chip = HB('Code', { p: [2, 8], r: 6, fill: code === '401' || code === '403' ? 'status/danger-tint' : 'status/warning-tint' }); add(chip, await T(code, 'Mono/S', code === '401' || code === '403' ? 'text/danger' : 'text/warning')); add(c0, chip, await T(name, 'Label/S', 'text/secondary'));
  const c1 = VB('When', 296, { p: [12, 16] }); add(c1, [await T(when, 'Body/S', 'text/secondary', { w: 264 }), 'FILL']);
  const c2 = VB('Message', 456, { p: [12, 16] }); add(c2, [await T(msg, 'Body/S Strong', 'text/primary', { w: 424 }), 'FILL']);
  const c3 = VB('Recovery', 300, { p: [12, 16] }); add(c3, [await T(rec, 'Body/S', 'text/brand', { w: 268 }), 'FILL']);
  add(r, c0, c1, c2, c3); add(tb, [r, 'FILL']);
}
const x03 = await cell({ id: 'X-04', mod: 'Client · 4xx', title: 'Client errors mapped to plain messages', full: true, kind: 'Message map', stage: [tb],
  trigger: 'Any 4xx response. The UI maps status + error code to one of these messages; raw server text is never shown.',
  copy: 'One message per status (column 3). 403 always names the reason; 429 always gives an absolute time, never a pressure countdown.',
  recovery: 'Column 4. Requests that are safe duplicates (409) resolve to the existing record instead of an error screen.',
  dev: 'Error body: { code, message_key, ref, retry_at? }. Copy keys live in i18n. 401 during a money flow re-authenticates without losing step state.' });
await row(body, 'Row 3 — 4xx map', [x03]);

// ---------- Row 4: timeout + validation ----------
const pt = panel('Timeout panel', { gap: 16, p: 24 });
const tt0 = HB('Top', { gap: 12, align: 'CENTER' }); const ttv = VB('Title', 300, { gap: 2 });
add(ttv, await T('Still checking your withdrawal', 'Heading/H5', 'text/primary'), await T('WD-20931 · 1,500.00 USDT → 0x7c4e…a21D · Arbitrum', 'Caption', 'text/tertiary'));
add(tt0, await iconTile('hourglass', 'info', 40), ttv); ttv.layoutGrow = 1; add(tt0, await DEMO('S'));
add(pt, [tt0, 'FILL'], [await T('We didn’t get a reply within 30 seconds. Please don’t submit again — we’re checking whether your withdrawal was created.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const steps = VB('Steps', 480, { gap: 12, p: 16, fill: 'surface/raised', r: 10 });
add(steps, [await stepLine('done', 'Request sent', '18:44:02 UTC', 'Signed with your 2FA code'), 'FILL'], [await stepLine('current', 'Checking status', 'attempt 2 of 5', 'We ask again every 5 seconds'), 'FILL'], [await stepLine('todo', 'Result', null, 'Created → the tracker opens · Not created → you can try again'), 'FILL']);
add(pt, [steps, 'FILL'], [await T('1,500.00 USDT stays Locked until we know. A duplicate can’t be created — the request carries an idempotency key.', 'Caption', 'text/tertiary', { w: 480 }), 'FILL']);
const at = HB('Actions', { gap: 8 }); add(at, await BTN('Secondary', 'Check now', { lead: 'refresh' }), await BTN('Ghost', 'View withdrawals')); add(pt, at);
const x05 = await cell({ id: 'X-05', mod: 'Timeout', title: 'Timeout on a money action — outcome unknown', kind: 'Inline panel', stage: [[pt, 'FILL']],
  trigger: 'POST /withdrawals gets no response within the 30 s client timeout — the server may or may not have created WD-20931.',
  copy: '“Still checking your withdrawal” · “Please don’t submit again — we’re checking whether your withdrawal was created.”',
  recovery: 'Auto-poll by idempotency key every 5 s (5 tries) → tracker (WAL-22) or “Not created — try again”. After 5 tries: the 5xx panel with ref.',
  dev: 'Submit button stays Loading until resolved. Leaving the page is fine — the result also arrives as a notification.' });

const es6 = HB('Error summary', { gap: 12, p: [12, 16], r: 10, fill: 'status/danger-tint', stroke: 'border/danger' });
const esv = VB('Summary text', 300, { gap: 2 }); add(esv, await T('2 fields need attention', 'Label/M', 'text/primary'), await T('Fix them to continue — nothing has been sent yet.', 'Caption', 'text/secondary'));
add(es6, await IC('alert-circle', 20, 'status/danger'), esv); esv.layoutGrow = 1;
const ia = await I(IDS.inAddr, { State: 'Invalid' }); const im = await I(IDS.inAmt, { State: 'Error' });
const x06 = await cell({ id: 'X-06', mod: 'Validation', title: 'Form validation — inline field errors', kind: 'Inputs · Error', stage: [[es6, 'FILL'], [ia, 'FILL'], [im, 'FILL'], await BTN('Primary', 'Continue to fees', { state: 'Disabled', trail: 'arrow-right' })], align: 'MIN',
  trigger: 'On blur (format, chain checksum, balance) and again on submit (server 422). Both paths show the same field messages.',
  copy: '“This is not a valid Arbitrum address. Check the network…” · “Exceeds your available balance (9,215.30 USDT)”',
  recovery: 'Each message says how to fix it; focus jumps to the first invalid field; typed values are never cleared. Continue enables once both fields are valid.',
  dev: 'aria-invalid + aria-describedby per field; the summary is a polite live region. Address rules per chain (EVM checksum, Solana base58).' });
await row(body, 'Row 4 — Timeout · Validation', [x05, x06]);

restack(sec); fitSection(sec);
const shots = []; for (const r of body.children.filter(n => n.name.startsWith('Row'))) shots.push(await r.screenshot({ scale: 0.55 }));
const e1 = sec.findChild(n => n.name.startsWith('[ERR-01]')); const eb = e1.findChild(n => n.name === 'Board body');
for (const r of eb.children.filter(n => /^Row [678]/.test(n.name))) shots.push(await r.screenshot({ scale: 0.5 }));
return { board: B.id, size: [B.width, B.height], rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })) };
