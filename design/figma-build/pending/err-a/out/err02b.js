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

// ERR-02 Error matrix board — part B (fix X-02 toast labels + rows 5–8) (page 12)
const page = figma.root.children.find(p => p.name === '12 — Empty & Error States'); await figma.setCurrentPageAsync(page);
const sec = section('ERR-01/02/03 Empty, error & loading matrices', 0, 0);
const [B, body] = await board(sec, '[ERR-02] Error matrix / 1440 / Board', 120, nextY(sec));
// fix: X-02 toast — first run wrote into the nested DEMO badge
const cx02 = body.findOne(n => n.name.startsWith('Cell X-02'));
if (cx02) { const ts = cx02.findOne(n => n.name === 'Preview').children[0]; if (await setByChars(ts, 'Try again', 'DEMO')) { await setByChars(ts, 'System status', 'Try again'); await setByChars(ts, 'Contact support', 'System status'); } }

const m422 = body.findOne(n => n.type === 'TEXT' && n.characters === 'Field messages inline (X-04) + “2 fields need attention” summary'); if (m422) { await loadFor(m422); m422.characters = 'Field messages inline (X-06) + “2 fields need attention” summary'; }

// ---------- Row 5: chain congestion (full) ----------
const al = await I(IDS.alert, { Type: 'Warning', Layout: 'Inline' });
const cp = await I(IDS.confProg, { State: 'Delayed' });
const pills = HB('Network status', { gap: 8, align: 'CENTER' }); add(pills, await T('Network status', 'Label/S', 'text/tertiary'));
for (const [ch, st] of [['Arbitrum', 'Operational'], ['BNB Chain', 'Operational'], ['Ethereum', 'Degraded'], ['Polygon', 'Operational'], ['Solana', 'Operational']]) add(pills, await I(IDS.netPill, { Chain: ch, Status: st }, { 'Show status label': st !== 'Operational', 'Show chevron': false }));
const left = VB('Banner + confirmations', 720, { gap: 16 }); add(left, al, cp, pills);
const fe = await I(IDS.feeEst, { State: 'Congested' });
const wrap = HB('Congestion stage', { gap: 16 }); add(wrap, left, fe);
const x07 = await cell({ id: 'X-07', mod: 'Chain · Congestion', title: 'Ethereum congested — slower and more expensive', full: true, kind: 'Alert/Banner · Fee Estimator', stage: [wrap],
  trigger: 'Chain-status feed marks Ethereum Degraded: base fee above threshold or blocks slower than 2× normal (DEMO, since 18:30 UTC).',
  copy: '“Ethereum network is congested” · Fee estimate “High · 2.40 USDT · ~8–15 min” · “Delayed — Ethereum congested · est. 9 min”',
  recovery: 'Switch to Arbitrum (0.08 USDT) or continue with the higher fee — the player chooses; nothing is switched silently. Deposits already in flight need no action.',
  dev: 'Banner shows on wallet, deposit and withdraw pages only while degraded; pills update over the status WebSocket. Fees come from the live estimator, never hard-coded.' });
await row(body, 'Row 5 — Chain congestion', [x07]);

// ---------- Row 6: deposit reverted + withdrawal failed ----------
const tl1 = await I(IDS.timeline, { State: 'Failed' });
const x09 = await cell({ id: 'X-08', mod: 'Tx failed · Deposit', title: 'Deposit reverted on-chain — not credited', kind: 'Tx/Status Timeline · Failed', stage: [tl1],
  trigger: 'Receipt status 0 (reverted) for a tracked incoming deposit — alternative outcome of DP-77412 (DEMO).',
  copy: '“Failed — Reverted on-chain at block 21,384,899…” · “Not credited — Nothing was added to your balance.”',
  recovery: 'View on explorer · Contact support. No “retry” button: the player’s own wallet sent it, and the deposit address stays valid for a new transfer.',
  dev: 'Never leave a reverted tx in Pending. The row stays in history as Failed (icon + label) with the block number.' });

const tl2 = await I(IDS.timeline, { State: 'Failed' });
await setT(tl2, 'Deposit DP-77412', 'Withdrawal WD-20931'); await setT(tl2, '1,000.00 USDT · Ethereum · 27 Nov 2026', '1,500.00 USDT · Arbitrum · 27 Nov 2026');
const ST = [['Submitted', '18:44:02 UTC', 'Risk check passed · confirmed with 2FA'], ['Failed to broadcast', '18:59:10 UTC', 'Timed out 3 times between 18:49 and 18:59 UTC while Arbitrum was degraded.'], ['Returned to Available', '18:59:40 UTC', '1,500.00 USDT is back in Available (now 10,715.30 USDT). No network fee was charged.']];
for (let i = 0; i < 3; i++) { await setT(tl2, 'Step title', ST[i][0], i); await setT(tl2, 'Timestamp', ST[i][1], i); await setT(tl2, 'Detail', ST[i][2], i); }
const hl = tl2.findAll(n => n.type === 'TEXT' && n.name === 'Transaction hash')[0]; if (hl) hl.visible = false;
const hx = tl2.findAll(n => n.type === 'TEXT' && n.name === 'Hash')[0]; if (hx) { let p = hx.parent; while (p && p.type !== 'INSTANCE') p = p.parent; if (p && p !== tl2) p.visible = false; }
const wa = HB('Actions', { gap: 8 }); add(wa, await BTN('Primary', 'Withdraw again', { size: 'S', lead: 'withdraw' }), await BTN('Ghost', 'View balance', { size: 'S' }));
const x10 = await cell({ id: 'X-09', mod: 'Tx failed · Withdrawal', title: 'Withdrawal failed to broadcast — funds returned', kind: 'Tx/Status Timeline · Failed', stage: [tl2, wa],
  trigger: 'The broadcaster gives up after 3 timeouts — alternative outcome of WD-20931 (DEMO). Funds move from Locked back to Available.',
  copy: '“Failed to broadcast” · “1,500.00 USDT is back in Available (now 10,715.30 USDT). No network fee was charged.”',
  recovery: 'Withdraw again pre-fills the same amount and the same whitelisted address as a new request (new 2FA). Contact support quotes WD-20931.',
  dev: 'Locked 1,850.00 → 350.00; Available 9,215.30 → 10,715.30. A notification and an email go out; the toast in X-12 links here.' });
await row(body, 'Row 6 — Tx failed', [x09, x10]);

// ---------- Row 7: dropped + replaced ----------
const pd = panel('Dropped tx', { gap: 16, p: 24 });
const dt = HB('Top', { gap: 12, align: 'CENTER' }); const dtv = VB('Title', 300, { gap: 2 });
add(dtv, [await T('Transaction no longer found', 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], await T('Deposit · 250.00 USDT · Polygon', 'Caption', 'text/tertiary'));
add(dt, await iconTile('alert-triangle', 'warning', 40), dtv); dtv.layoutGrow = 1; add(dt, await badge('Expired', 'Dropped'));
const hs1 = await I(IDS.hash, { State: 'Default' }, { Hash: '0x2c8e…71fa' });
add(pd, [dt, 'FILL'], hs1, [await T('We can no longer see this transaction on Polygon. It was most likely dropped because its network fee was too low. No USDT left your wallet and nothing was credited.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
add(pd, [await kv('Last seen in the mempool', '27 Nov 2026, 17:58 UTC', { vs: 'Body/S Strong' }), 'FILL'], [await kv('Credited to your balance', '0.00 USDT', { demo: true }), 'FILL']);
const da = HB('Actions', { gap: 8 }); add(da, await BTN('Primary', 'Show deposit address', { size: 'S', lead: 'qr-code' }), await BTN('Ghost', 'How network fees work', { size: 'S' })); add(pd, da);
const x11 = await cell({ id: 'X-10', mod: 'Tx dropped', title: 'Deposit dropped from the mempool', kind: 'Inline panel', stage: [[pd, 'FILL']],
  trigger: 'A tracked deposit hash is missing from the mempool for 30 min without being mined (evicted, or its nonce reused).',
  copy: '“Transaction no longer found” · “No USDT left your wallet and nothing was credited.”',
  recovery: 'Show deposit address (same address, still valid) to send again · How network fees work. If the tx reappears and confirms, it is credited automatically.',
  dev: 'Keep watching the hash for 24 h; label “Dropped” (icon + text). Platform-sent withdrawals are re-broadcast automatically with a higher fee, at no cost to the player.' });

const pr = panel('Replaced tx', { gap: 16, p: 24 });
const rtp = HB('Top', { gap: 12, align: 'CENTER' }); const rtv = VB('Title', 300, { gap: 2 });
add(rtv, [await T('Transaction replaced — now tracking the new one', 'Heading/H5', 'text/primary', { w: 300 }), 'FILL'], await T('DP-77412 · 1,000.00 USDT · Ethereum', 'Caption', 'text/tertiary'));
add(rtp, await iconTile('swap', 'info', 40), rtv); rtv.layoutGrow = 1; add(rtp, await badge('Processing', 'Confirming'));
const old = HB('Original hash', { gap: 12, p: [8, 12], r: 10, stroke: 'border/default', align: 'CENTER' });
const oh = await T('0x5e1f…c0a8', 'Mono/S', 'text/tertiary'); oh.textDecoration = 'STRIKETHROUGH'; const os = spacer();
add(old, await T('Original', 'Label/S', 'text/tertiary'), oh, os); os.layoutGrow = 1; add(old, await badge('Neutral', 'Replaced'));
const hs2 = await I(IDS.hash, { State: 'Default' }, { Hash: '0x9b2d…14e7' });
const cp2 = await I(IDS.confProg, { State: 'Confirming' }); await setT(cp2, 'Count', '3/12'); await setT(cp2, 'Title', '3 / 12 confirmations'); await setT(cp2, 'Estimate', 'Replacement confirming · est. 6 min');
add(pr, [rtp, 'FILL'], [old, 'FILL'], hs2, [cp2, 'FILL'], [await T('You sped this deposit up in your wallet, so it has a new transaction hash. We switched to the new one automatically — nothing to do.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
const x12 = await cell({ id: 'X-11', mod: 'Tx replaced', title: 'Deposit replaced — speed-up in the wallet', kind: 'Inline panel', stage: [[pr, 'FILL']],
  trigger: 'The same sender + nonce is mined under a different hash (wallet speed-up or cancel) — alternative outcome of DP-77412 (DEMO).',
  copy: '“Transaction replaced — now tracking the new one” · “We switched to the new one automatically — nothing to do.”',
  recovery: 'None needed. If the replacement was a cancel (0 USDT moved), the deposit shows Cancelled · nothing credited, with a link to the deposit address.',
  dev: 'Show both hashes; credit only when the replacement reaches 12 / 12. Never double-credit: dedupe by sender + nonce.' });
await row(body, 'Row 7 — Dropped · Replaced', [x11, x12]);

// ---------- Row 8: toasts + game ----------
const ta = await I(IDS.toast, { Type: 'Error' });
const tb2 = await I(IDS.toast, { Type: 'Error' }); await setT(tb2, 'Title', 'Withdrawal WD-20931 failed'); await setT(tb2, 'Body', '1,500.00 USDT is back in Available. No network fee was charged.');
const tc = await I(IDS.toast, { Type: 'Warning' }); await setT(tc, 'Title', 'Live updates paused — reconnecting'); await setT(tc, 'Body', 'Pool value and countdown may lag for a moment. Last update 18:44:10 UTC.');
const x13 = await cell({ id: 'X-12', mod: 'Toasts', title: 'Background failures — toast stack', kind: 'Toast · Error / Warning', stage: [ta, tb2, tc], sg: 12,
  trigger: 'Background events: AML decisions, withdrawal broadcast results, WebSocket status changes and failed optimistic updates.',
  copy: '“Withdrawal rejected” (WD-20850, sanctions screening) · “Withdrawal WD-20931 failed” · “Live updates paused — reconnecting”',
  recovery: 'Each toast links to its detail (drawer or tracker). Error toasts stay until dismissed; max 3 stacked top-right (bottom on mobile).',
  dev: 'Never use toasts for form validation or for win/loss hype. Screen readers: role=alert for errors, role=status for warnings.' });

const pg = panel('Bet not placed', { gap: 16, p: 24 });
const gt = HB('Top', { gap: 12, align: 'CENTER' }); const gtv = VB('Title', 300, { gap: 2 });
add(gtv, await T('Bet not placed', 'Heading/H5', 'text/primary'), await T('Orbit Rush · round CR-55103 · 10.00 USDT · auto cash-out 2.00×', 'Caption', 'text/tertiary'));
add(gt, await iconTile('wifi-off', 'danger', 40), gtv); gtv.layoutGrow = 1; add(gt, await DEMO('S'));
add(pg, [gt, 'FILL'], [await T('We lost the connection before round CR-55103 started, so your 10.00 USDT bet wasn’t placed. Your balance is unchanged.', 'Body/S', 'text/secondary', { w: 480 }), 'FILL']);
add(pg, [await kv('Available', '9,215.30 USDT', { demo: true }), 'FILL'], [await kv('Reconnecting', 'attempt 3 of 15', { vs: 'Mono/S', vc: 'text/secondary' }), 'FILL']);
const gnote = HB('Note', { gap: 8, p: [8, 12], r: 10, fill: 'status/info-tint' }); const gnt = await T('Bets that were already accepted keep running: an armed auto cash-out still triggers on the server. Manual cash-out is unavailable while offline.', 'Caption', 'text/secondary', { w: 440 });
add(gnote, await IC('info', 16, 'status/info'), gnt); gnt.layoutGrow = 1; add(pg, [gnote, 'FILL']);
const ga = HB('Actions', { gap: 8 }); add(ga, await BTN('Primary', 'Reconnect', { lead: 'refresh' }), await BTN('Ghost', 'Bet history', { lead: 'history' })); add(pg, ga);
const x14 = await cell({ id: 'X-13', mod: 'Games · Connection', title: 'Game action lost — bet not placed', kind: 'Inline panel', stage: [[pg, 'FILL']],
  trigger: 'The game socket drops before the server acknowledges the bet (no bet ID returned) — Orbit Rush and other live Originals.',
  copy: '“Bet not placed” · “…your 10.00 USDT bet wasn’t placed. Your balance is unchanged.”',
  recovery: 'Reconnect (auto-retries every 2 s for 30 s) · Bet history. The bet panel keeps 10.00 USDT and 2.00× so the player re-places it deliberately — never automatically.',
  dev: 'Accepted bets (with a bet ID) are never shown as “not placed”: they resolve server-side and appear in history after reconnect.' });
await row(body, 'Row 8 — Toasts · Game', [x13, x14]);

restack(sec); fitSection(sec);
for (const r of body.children.filter(n => /^Row [5678]/.test(n.name))) await r.screenshot({ scale: 0.55 });
const e1 = sec.findChild(n => n.name.startsWith('[ERR-01]')); const r8 = e1.findOne(n => n.name === 'Row 8 — Admin queue'); await r8.screenshot({ scale: 0.5 });
return { board: B.id, size: [B.width, B.height], rows: body.children.map(r => ({ id: r.id, name: r.name, h: Math.round(r.height) })), x02fixed: !!cx02 };
