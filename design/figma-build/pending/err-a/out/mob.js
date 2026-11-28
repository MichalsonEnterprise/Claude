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

// ERR mobile examples — page 10, section 'ERR — Mobile' (X 253000: 'PRO — Mobile' ends at 252670, so 252000 would overlap)
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('ERR — Mobile', 253000, 0);
async function sk(w, h, r = 6, name = 'Skeleton') { const x = figma.createRectangle(); x.resize(w, h); x.name = name; radius(x, r); await gfill(x, 'Gradient/Skeleton'); return x; }
async function mframe(name) { const old = sec.findChild(n => n.name === name); let x, y; if (old) { x = old.x; y = old.y; old.remove(); } else { x = sec.children.length ? nextX(sec) : 120; y = 120; } const f = await screen(name, 390, { h: 844 }); sec.appendChild(f); f.x = x; f.y = y; const d = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [d, 'FILL']); return f; }
async function homeInd() { const h = HB('Home indicator', { p: [8, 0, 8, 0], justify: 'CENTER' }); add(h, rect(134, 5, 'text/primary', 9999, 'Home indicator')); return h; }
const ids = {};

// ---------- M1: Transactions empty ----------
const f1 = await mframe('[ERR-01 · MOB] Transactions / 390 / Empty — new account');
const tb1 = await I(IDS.topM, { State: 'Member' }); await setT(tb1, 'Balance value', '0.00'); add(f1, [tb1, 'FILL']);
const c1 = VB('Content', 390, { gap: 16, p: [20, 16, 24, 16] }); add(f1, [c1, 'FILL']); c1.layoutGrow = 1;
const h1 = VB('Title', 358, { gap: 4 }); add(h1, await T('Transactions', 'Heading/H3', 'text/primary'), await T('All networks · newest first', 'Caption', 'text/tertiary'));
add(c1, [h1, 'FILL'], [await I(IDS.seg, { Segments: '4' }), 'FILL']);
const ec = panel('Empty state card', { gap: 12, p: 24 }); ec.counterAxisAlignItems = 'CENTER';
add(ec, await iconTile('receipt', 'neutral', 56), [await T('No transactions yet', 'Heading/H4', 'text/primary', { w: 310, align: 'CENTER' }), 'FILL'], [await T('Deposits, withdrawals, pool entries, prizes and refunds will appear here as soon as they happen.', 'Body/S', 'text/secondary', { w: 310, align: 'CENTER' }), 'FILL']);
add(ec, [await BTN('Primary', 'Make a deposit', { size: 'L', lead: 'deposit' }), 'FILL'], await BTN('Ghost', 'How deposits work', { size: 'L' }));
add(c1, [ec, 'FILL']);
const ic1 = HB('Networks note', { gap: 8, p: [12, 16], r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const ict = await T('Deposit USDT on BNB Chain, Polygon, Arbitrum, Ethereum or Solana. Minimum deposit 10.00 USDT. Filters and export appear once you have activity.', 'Caption', 'text/secondary', { w: 300 });
add(ic1, await IC('info', 16, 'status/info'), ict); ict.layoutGrow = 1; add(c1, [ic1, 'FILL']);
add(f1, await I(IDS.tabM, { Active: 'Wallet' }));
ids.m1 = f1.id;

// ---------- M2: Withdraw validation ----------
const f2 = await mframe('[ERR-02 · MOB] Withdraw — Step 4 Amount / 390 / Validation errors');
const hb = HB('Flow top bar', { gap: 4, p: [0, 8], w: 390, h: 56, align: 'CENTER' }); fill(hb, 'bg/secondary'); strokeSides(hb, 'border/subtle', { b: 1 });
const hs = spacer(); add(hb, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }), await T('Withdraw USDT', 'Label/L', 'text/primary'), hs); hs.layoutGrow = 1; add(hb, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['x'] }));
add(f2, [hb, 'FILL']);
const c2 = VB('Content', 390, { gap: 16, p: [16, 16, 16, 16] }); add(f2, [c2, 'FILL']); c2.layoutGrow = 1;
const sm = HB('Error summary', { gap: 12, p: [12, 16], r: 10, fill: 'status/danger-tint', stroke: 'border/danger' }); const smv = VB('Summary', 280, { gap: 2 });
add(smv, [await T('2 things to fix before you continue', 'Label/M', 'text/primary', { w: 280 }), 'FILL'], [await T('Nothing has been sent. What you typed is kept.', 'Caption', 'text/secondary', { w: 280 }), 'FILL']);
add(sm, await IC('alert-circle', 20, 'status/danger'), smv); smv.layoutGrow = 1;
add(c2, [await I('15:3270', { Steps: '9' }), 'FILL'], [sm, 'FILL'], [await I(IDS.inAddr, { State: 'Invalid' }), 'FILL'], [await I(IDS.inAmt, { State: 'Error' }), 'FILL']);
const fp = panel('Fees preview', { gap: 8, p: 16 });
add(fp, [await kv('Network fee · Arbitrum', '0.08 USDT', { demo: true }), 'FILL'], [await kv('Platform fee', '0.00 USDT'), 'FILL']);
add(c2, [fp, 'FILL']);
const sb = VB('Sticky CTA', 390, { gap: 8, p: [12, 16, 0, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(sb, 'border/subtle', { t: 1 });
add(sb, [await BTN('Primary', 'Continue to fees', { size: 'L', state: 'Disabled', trail: 'arrow-right' }), 'FILL'], await T('Fix the 2 fields above to continue', 'Caption', 'text/tertiary'), [await homeInd(), 'FILL']);
add(f2, [sb, 'FILL']);
ids.m2 = f2.id;

// ---------- M3: Withdrawal failed bottom sheet ----------
const f3 = await mframe('[ERR-02 · MOB] Withdrawal WD-20931 / 390 / Failed to broadcast — bottom sheet');
const vp = figma.createFrame(); vp.name = 'Viewport'; vp.fills = []; vp.clipsContent = true; vp.resize(390, 780); add(f3, [vp, 'FILL']); vp.layoutGrow = 1;
const vpH = vp.height;
const tb3 = await I(IDS.topM, { State: 'Member' }); await setT(tb3, 'Balance value', '10,715.30'); vp.appendChild(tb3); tb3.x = 0; tb3.y = 0;
const bgc = VB('Wallet behind', 358, { gap: 12 }); vp.appendChild(bgc); bgc.x = 16; bgc.y = 76;
const bpn = panel('Balances', { gap: 8, p: 16 });
add(bpn, [await kv('Available', '10,715.30 USDT', { demo: true }), 'FILL'], [await kv('Locked', '350.00 USDT'), 'FILL'], [await kv('Pending', '1,000.00 USDT'), 'FILL'], [await kv('Owed', '415.20 USDT'), 'FILL']);
add(bgc, await T('Wallet', 'Heading/H3', 'text/primary'), [bpn, 'FILL']);
const tab3 = await I(IDS.tabM, { Active: 'Wallet' }); vp.appendChild(tab3); tab3.x = 0; tab3.y = vpH - tab3.height;
const scr = rect(390, vpH, 'scrim/overlay', 0, 'Scrim'); vp.appendChild(scr); scr.x = 0; scr.y = 0;
const sh = VB('Bottom sheet — Withdrawal failed', 390, { gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay' });
for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); sh.bottomLeftRadius = 0; sh.bottomRightRadius = 0; await fx(sh, 'Elevation/4 — Modal');
const gr = HB('Grabber', { justify: 'CENTER' }); add(gr, rect(36, 4, 'border/strong', 9999, 'Grabber'));
const shh = HB('Sheet header', { gap: 8, align: 'CENTER' }); const shs = spacer(); add(shh, await T('Withdrawal failed', 'Heading/H5', 'text/primary'), shs); shs.layoutGrow = 1; add(shh, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['x'] }));
const sst = HB('Status', { gap: 8, align: 'CENTER' }); add(sst, await badge('Failed', null), await T('WD-20931', 'Mono/S', 'text/secondary'), await DEMO('XS'));
const sam = VB('Summary', 358, { gap: 8, p: 16, fill: 'surface/raised', r: 14 });
add(sam, [await kv('Amount', '1,500.00 USDT'), 'FILL'], [await kv('To', '0x7c4e…a21D · Arbitrum', { vs: 'Mono/S' }), 'FILL'], [await kv('Network fee charged', '0.00 USDT'), 'FILL']);
const stl = VB('Timeline', 358, { gap: 12 });
add(stl, [await stepLine('done', 'Submitted', '18:44:02 UTC', 'Risk check passed · confirmed with 2FA'), 'FILL'], [await stepLine('failed', 'Failed to broadcast', '18:59:10 UTC', 'Timed out 3 times between 18:49 and 18:59 UTC while Arbitrum was degraded.'), 'FILL'], [await stepLine('done', 'Returned to Available', '18:59:40 UTC', '1,500.00 USDT is back in Available (now 10,715.30 USDT).'), 'FILL']);
add(sh, [gr, 'FILL'], [shh, 'FILL'], sst, [sam, 'FILL'], [stl, 'FILL'], [await BTN('Primary', 'Withdraw again', { size: 'L', lead: 'withdraw' }), 'FILL'], [await BTN('Secondary', 'Contact support', { size: 'L', lead: 'chat' }), 'FILL']);
add(sh, [await T('Withdraw again starts a new request to the same whitelisted address — you confirm it with 2FA again.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL'], [await homeInd(), 'FILL']);
vp.appendChild(sh); sh.x = 0; sh.y = vpH - sh.height;
ids.m3 = f3.id;

// ---------- M4: Wallet loading ----------
const f4 = await mframe('[ERR-03 · MOB] Wallet / 390 / Loading (skeleton)');
const tb4 = await I(IDS.topM, { State: 'Member' }); await setT(tb4, 'Balance value', '•••'); add(f4, [tb4, 'FILL']);
const c4 = VB('Content', 390, { gap: 16, p: [20, 16, 16, 16] }); add(f4, [c4, 'FILL']); c4.layoutGrow = 1;
add(c4, await T('Wallet', 'Heading/H3', 'text/primary'));
const bc = panel('Balance card — loading', { gap: 12, p: 16 });
add(bc, await T('Total balance', 'Caption', 'text/tertiary'), await sk(200, 32, 6, 'Skeleton/Total'));
for (const pair of [['Available', 'Locked'], ['Pending', 'Owed']]) { const r = HB('Buckets', { gap: 8 }); for (const l of pair) { const b = VB('Bucket/' + l, 150, { gap: 6, p: 12, fill: 'surface/raised', r: 10 }); add(b, await T(l, 'Caption', 'text/tertiary'), await sk(72, 16, 4)); add(r, b); b.layoutGrow = 1; } add(bc, [r, 'FILL']); }
add(c4, [bc, 'FILL']);
const qa = HB('Quick actions', { gap: 8 }); const d1 = await BTN('Primary', 'Deposit', { lead: 'deposit' }), d2 = await BTN('Secondary', 'Withdraw', { lead: 'withdraw', state: 'Disabled' });
add(qa, d1, d2); d1.layoutGrow = 1; d2.layoutGrow = 1; add(qa, await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS['history'] })); add(c4, [qa, 'FILL']);
add(c4, await T('Recent activity', 'Label/M', 'text/secondary'));
for (let i = 0; i < 3; i++) { const r = HB('Activity card — loading', { gap: 12, p: 12, r: 14, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' }); const rv = VB('Lines', 160, { gap: 6 }); add(rv, await sk(150, 12, 4), await sk(96, 10, 4)); add(r, await sk(36, 36, 9999, 'Skeleton/Icon'), rv); rv.layoutGrow = 1; add(r, await sk(64, 14, 4)); add(c4, [r, 'FILL']); }
add(f4, await I(IDS.tabM, { Active: 'Wallet' }));
ids.m4 = f4.id;

fitSection(sec);
for (const k of ['m1', 'm2', 'm3', 'm4']) { const f = await figma.getNodeByIdAsync(ids[k]); await f.screenshot({ scale: 0.8 }); }
return { section: sec.id, secPos: [sec.x, sec.y, sec.width, sec.height], ids, frames: sec.children.map(f => ({ n: f.name, id: f.id, x: f.x, y: f.y, h: f.height })), vpH, sheetH: sh.height };
