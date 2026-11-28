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

// ===== PROTO-B LIB v1 (chunked) =====
// ===== PROTO-B LIB v1 (PRO-06..10 prototypes, page 11) =====
const P11 = figma.root.children.find(p => p.name === '11 — Prototypes');
await figma.setCurrentPageAsync(P11);
const MAINNAME = 'PRO-06..10 Prototypes (P1)';
const GAPX = 560, ROWGAP = 760, LOG = [];
const MAINS = () => FLOW.frames.filter(f => !String(f.step).startsWith('B'));
const COLOR = k => k === 'error' ? 'status/warning' : k === 'alt' ? 'status/info' : 'brand/primary';
const PRE = f => `${FLOW.id} · ${f.step} — `;
const colX = c => 120 + c * (1440 + GAPX);
function mainSection() {
  let s = P11.children.find(n => n.type === 'SECTION' && n.name === MAINNAME);
  let y = 0; for (const c of P11.children) if (c !== s) y = Math.max(y, c.y + c.height + 1000);
  if (!s) { s = figma.createSection(); s.name = MAINNAME; s.x = 0; s.y = y; s.fills = [paint('bg/secondary')]; s.resizeWithoutConstraints(4000, 2000); }
  else if (s.y < y) { LOG.push('moved section below other sections: y ' + Math.round(s.y) + ' -> ' + Math.round(y)); s.y = y; }
  return s;
}
function restack(main) {
  const hd = main.children.find(n => n.name === 'Header — PRO-06..10');
  let y = hd ? hd.y + hd.height + 240 : 160;
  for (const s of main.children.filter(n => n.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name))) { s.x = 120; s.y = y; y += s.height + 320; }
}
function subSection(main) {
  let s = main.children.find(n => n.type === 'SECTION' && n.name === FLOW.name);
  if (!s) { s = figma.createSection(); s.name = FLOW.name; s.fills = [paint('bg/base')]; main.appendChild(s); s.resizeWithoutConstraints(4000, 2000); s.x = 120; s.y = nextY(main, 320); }
  return s;
}
async function circ(txt, col, d = 32, style = 'Label/M') { const b = AL('HORIZONTAL', { name: 'Badge ' + txt, w: d, h: d, r: 9999, fill: col, align: 'CENTER', justify: 'CENTER' }); add(b, await T(txt, style, 'text/on-primary')); return b; }
function linkLabel(l) { return l.label || l.chip || ''; }
function syncFlows(main) {
  const mine = {}; for (const sub of main.children.filter(n => n.type === 'SECTION')) { const id = (sub.name.match(/^(PRO-\d+)/) || [])[1]; if (!id) continue; const st = sub.children.find(n => n.type === 'FRAME' && n.name.startsWith(id + ' · 1 — ')); if (st) mine[st.id] = sub.name.replace(/^(PRO-\d+) /, '$1 · '); }
  const names = new Set(Object.values(mine)); const seen = new Set(); const out = [];
  for (const p of P11.flowStartingPoints) { if (seen.has(p.nodeId) || mine[p.nodeId] || names.has(p.name)) continue; seen.add(p.nodeId); out.push({ nodeId: p.nodeId, name: p.name }); }
  for (const [nodeId, name] of Object.entries(mine)) { if (seen.has(nodeId)) continue; seen.add(nodeId); out.push({ nodeId, name }); }
  out.sort((a, b) => a.name.localeCompare(b.name));
  try { P11.flowStartingPoints = out; } catch (e) { LOG.push('flowStart: ' + e.message); }
  return out.length;
}
function backOf(f) { if (f.back) return f.back; const m = MAINS(); const i = m.findIndex(x => x.k === f.k); if (i > 0) return m[i - 1].k; if (i === 0) return null; const inl = FLOW.links.find(l => l.to === f.k && !l.loop); return inl ? inl.from : null; }
function wrapOf(sub, f) { return sub.children.find(n => n.type === 'FRAME' && n.name.startsWith(PRE(f))); }
async function mainHeader(m) { return m.children.find(n => n.name === 'Header — PRO-06..10') || null; }
async function flowCard(sub) { const c = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id); if (!c) throw new Error('Flow card missing — run the first script of this flow'); return c; }
async function BAR(f) {
  const nMain = MAINS().length; const isB = String(f.step).startsWith('B');
  const bar = AL('HORIZONTAL', { name: 'Prototype bar (not product UI)', gap: 12, p: [8, 24, 8, 24], fill: 'bg/secondary', align: 'CENTER' });
  strokeSides(bar, isB ? COLOR(f.kind) : 'border/brand', { b: 2 });
  const tag = AL('HORIZONTAL', { name: 'Tag', gap: 6, p: [4, 10, 4, 10], fill: isB ? (f.kind === 'error' ? 'status/warning-tint' : 'status/info-tint') : 'brand/tint', r: 9999, align: 'CENTER' });
  add(tag, await IC('play', 14, isB ? (f.kind === 'error' ? 'text/warning' : 'text/info') : 'icon/brand'), await T('PROTOTYPE', 'Overline', isB ? (f.kind === 'error' ? 'text/warning' : 'text/info') : 'text/brand'));
  add(bar, tag, await T(FLOW.id + ' · ' + (isB ? 'Branch ' + f.step : 'Step ' + f.step + ' of ' + nMain) + ' — ' + f.title, 'Label/M', 'text/primary', { name: 'Step label' }));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bar, [sp, 'FILL']);
  const outs = FLOW.links.filter(l => l.from === f.k && l.chip);
  if (outs.length) add(bar, await T('Prototype actions:', 'Caption', 'text/tertiary'));
  for (const l of outs) { const k = l.kind || 'main'; const b = await BTN(k === 'main' ? 'Primary' : 'Secondary', l.chip, { size: 'S', lead: k === 'main' ? 'arrow-right' : k === 'error' ? 'alert-triangle' : 'refresh' }); b.name = 'Chip → ' + l.to; add(bar, b); }
  if (backOf(f)) { const b = await BTN('Ghost', 'Back', { size: 'S', lead: 'arrow-left' }); b.name = 'Chip ← Back'; add(bar, b); }
  if (f.k !== FLOW.start) { const b = await BTN('Ghost', 'Restart flow', { size: 'S', lead: 'rotate-ccw' }); b.name = 'Chip ↺ Restart'; add(bar, b); }
  return bar;
}
function rowTop(sub, r, f) {
  if (r === 0) { const card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id); return (card ? card.y + card.height : 120) + 480; }
  const cols = f && f.align ? f.align : f ? [f.col] : null;
  let m = 0; for (const x of FLOW.frames.filter(x => x.row === r - 1 && (!cols || cols.includes(x.col)))) { const w = wrapOf(sub, x); if (w) m = Math.max(m, w.y + w.height); }
  if (!m) for (const x of FLOW.frames.filter(x => x.row === r - 1)) { const w = wrapOf(sub, x); if (w) m = Math.max(m, w.y + w.height); }
  if (!m) throw new Error('Row ' + (r - 1) + ' must exist before row ' + r);
  return m + ROWGAP;
}
async function cloneSteps(sub, keys) {
  for (const s of P11.children.filter(n => n.type === 'FRAME' && n.name.startsWith(FLOW.id + ' · '))) s.remove(); // strays from a failed run
  const made = {};
  for (const k of keys) {
    const f = FLOW.frames.find(x => x.k === k); if (!f) throw new Error('No spec ' + k);
    let w = wrapOf(sub, f); if (w) { made[k] = w.id + ' (existing)'; continue; }
    const src = await figma.getNodeByIdAsync(f.src); if (!src) throw new Error('Missing source ' + f.src);
    let pg = src; while (pg && pg.type !== 'PAGE') pg = pg.parent; if (pg && pg.loadAsync) await pg.loadAsync();
    w = AL('VERTICAL', { name: PRE(f) + src.name, fill: 'bg/base', w: src.width }); w.clipsContent = true;
    const cc = __COLS['Color']; const cm = cc.modes.find(m => m.name === 'Dark'); if (cm) w.setExplicitVariableModeForCollection(cc, cm.modeId);
    const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === (src.width >= 1440 ? 'Desktop 1440' : 'Mobile 390')); if (bm) w.setExplicitVariableModeForCollection(bc, bm.modeId);
    add(w, [await BAR(f), 'FILL']);
    const c = src.clone(); w.appendChild(c);
    sub.appendChild(w); w.x = colX(f.col); w.y = rowTop(sub, f.row, f);
    made[k] = w.id;
  }
  return made;
}
function findRect(inner, rx) {
  const ib = inner.absoluteBoundingBox;
  const vis = n => { let p = n; while (p && p !== inner) { if (p.visible === false) return false; p = p.parent; } return true; };
  let best = null;
  for (const n of inner.findAll(n => n.type === 'INSTANCE' && /^Button/.test(n.name))) {
    const t = n.findOne(x => x.type === 'TEXT' && x.visible); if (!t || !rx.test(t.characters.trim()) || !vis(n)) continue;
    const b = n.absoluteBoundingBox; if (b) best = [b.x - ib.x, b.y - ib.y, b.width, b.height];
  }
  if (best) return best;
  for (const n of inner.findAllWithCriteria({ types: ['TEXT'] })) { if (!rx.test(n.characters.trim()) || !vis(n)) continue; const b = n.absoluteBoundingBox; if (b) best = [b.x - ib.x - 12, b.y - ib.y - 8, b.width + 24, b.height + 16]; }
  return best;
}
async function placeArrow(sub, pts, col, dashed, name) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const mx = Math.min(...xs), my = Math.min(...ys);
  const v = figma.createVector(); v.name = name || 'Arrow';
  await v.setVectorNetworkAsync({ vertices: pts.map((p, i) => ({ x: p[0] - mx, y: p[1] - my, strokeCap: i === pts.length - 1 ? 'ARROW_EQUILATERAL' : 'ROUND', cornerRadius: 32 })), segments: pts.slice(1).map((_, i) => ({ start: i, end: i + 1 })) });
  v.strokes = [paint(col)]; v.strokeWeight = 5; v.fills = []; if (dashed) v.dashPattern = [18, 12];
  sub.appendChild(v); v.x = mx; v.y = my; return v;
}
async function wire(sub) {
  const F = {}; for (const f of FLOW.frames) { const w = wrapOf(sub, f); if (!w) { LOG.push('missing frame ' + f.k); continue; } F[f.k] = { f, w, inner: w.children[1] }; }
  for (const n of sub.children.filter(n => /^(Arrow|Step header)/.test(n.name))) n.remove();
  for (const k in F) for (const h of F[k].inner.children.filter(n => n.name.startsWith('Hotspot'))) h.remove();
  const tr = s => s ? { type: 'SMART_ANIMATE', easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.35 } : { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.25 };
  const nav = (to, s) => [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: F[to].w.id, navigation: 'NAVIGATE', transition: tr(s), resetScrollPosition: true }] }];
  let hs = 0, ch = 0;
  for (const l of FLOW.links) {
    if (!F[l.from] || !F[l.to]) { LOG.push('skip link ' + l.from + '>' + l.to); continue; }
    const rects = l.hot ? (Array.isArray(l.hot[0]) ? l.hot.slice() : [l.hot]) : [];
    if (l.find) { const r = findRect(F[l.from].inner, l.find); if (r) rects.push(r); else LOG.push('find miss ' + l.from + ' ' + l.find); }
    for (const r of rects) {
      const h = figma.createFrame(); h.name = 'Hotspot → ' + F[l.to].f.step + ' · ' + linkLabel(l); h.fills = [];
      stroke(h, l.kind === 'error' ? 'status/warning' : l.kind === 'alt' ? 'status/info' : 'border/focus', 2, 'OUTSIDE'); h.dashPattern = [8, 6]; radius(h, 10);
      const inner = F[l.from].inner; inner.appendChild(h); if (inner.layoutMode && inner.layoutMode !== 'NONE') h.layoutPositioning = 'ABSOLUTE';
      h.resize(Math.max(24, r[2] + 8), Math.max(24, r[3] + 8)); h.x = Math.round(r[0] - 4); h.y = Math.round(r[1] - 4);
      await h.setReactionsAsync(nav(l.to, l.smart)); hs++;
    }
    if (l.chip) { const c = F[l.from].w.findOne(n => n.name === 'Chip → ' + l.to); if (c) { await c.setReactionsAsync(nav(l.to, false)); ch++; } else LOG.push('chip miss ' + l.from + '>' + l.to); }
  }
  for (const k in F) {
    const { f, w } = F[k];
    const b = w.findOne(n => n.name === 'Chip ← Back'); const bt = backOf(f); if (b && bt && F[bt]) { await b.setReactionsAsync(nav(bt, false)); ch++; }
    const r = w.findOne(n => n.name === 'Chip ↺ Restart'); if (r && F[FLOW.start]) { await r.setReactionsAsync(nav(FLOW.start, false)); ch++; }
  }
  const heads = {};
  for (const k in F) {
    const { f, w, inner } = F[k]; const isB = String(f.step).startsWith('B');
    const h = AL('HORIZONTAL', { name: 'Step header ' + f.step, gap: 20, align: 'CENTER' });
    const st = AL('VERTICAL', { gap: 6 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Heading/H3', 'text/primary', { w: 1360 }));
    add(st, await T((isB && f.cond ? f.cond + '\n' : '') + 'Clone of ' + inner.name, 'Body/M', 'text/secondary', { w: 1360 }));
    add(h, await circ(f.step, isB ? COLOR(f.kind) : 'brand/primary', 56, 'Heading/H5'), st);
    sub.appendChild(h); h.x = w.x; h.y = w.y - h.height - 40; heads[k] = h;
  }
  const down = {}; let lane = 0, arrows = 0;
  for (const l of FLOW.links) {
    const A = F[l.from], B = F[l.to]; if (!A || !B || l.loop) continue;
    const fa = A.f, fb = B.f; const kind = l.kind || fb.kind || 'main'; const col = COLOR(kind);
    if (fa.row === fb.row && fb.col === fa.col + 1) {
      const y = A.w.y + 320, x1 = A.w.x + A.w.width + 32, x2 = B.w.x - 32;
      await placeArrow(sub, [[x1, y], [x2, y]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step); arrows++;
      const t = linkLabel(l); if (t) { const p = AL('HORIZONTAL', { name: 'Arrow label ' + fa.step + '→' + fb.step, p: [10, 16, 10, 16], fill: 'surface/raised', stroke: col, sw: 2, r: 14 }); add(p, await T(t, 'Label/M', 'text/primary', t.length > 30 ? { w: 440 } : {})); sub.appendChild(p); p.x = Math.round((x1 + x2) / 2 - p.width / 2); p.y = y - p.height - 28; }
    } else if (fb.row > fa.row) {
      const hb = heads[l.to]; const ex = B.w.x + 28, ey = hb.y - 12, sy = A.w.y + A.w.height + 24;
      if (fb.col === fa.col) await placeArrow(sub, [[ex, sy], [ex, ey]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step);
      else { const kk = (down[l.from] = (down[l.from] || 0) + 1); const sx = A.w.x + 200 + kk * 300; let top = hb.y; for (const q of Object.values(F)) if (q.f.row === fb.row && q.f.col >= Math.min(fa.col, fb.col) && q.f.col <= Math.max(fa.col, fb.col) && heads[q.f.k]) top = Math.min(top, heads[q.f.k].y); const my = top - 100 - (lane++) * 72; await placeArrow(sub, [[sx, sy], [sx, my], [ex, my], [ex, ey]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step); }
      arrows++;
    }
  }
  // flow starting points are synced by syncFlows(main) in every script
  return { hotspots: hs, chips: ch, arrows, frames: Object.keys(F).length };
}
// ===== END PROTO-B LIB =====

const FLOW = {
  id: 'PRO-08', pri: 'P1', name: 'PRO-08 Admin → User Management', flowName: 'PRO-08 · Admin → User Management', start: 'OV',
  goal: 'Finance lead A. Marin (DEMO) goes from the admin overview to Users, opens @nova.k, applies a withdrawal hold with a reason, a fresh 2FA code and a second approver, sees the active restriction with its audit trail and later lifts it with reason + 2FA. Branches: restricted role, 2FA failure lock and an expired admin session.',
  checks: ['Restrictions never change balances, ledger entries, active entries or round results', 'Every action needs a reason (≥ 20 characters), a fresh 2FA code and writes an immutable, hash-chained audit entry', 'Withdrawal holds and sign-in suspensions need a second approver (four-eyes); the requester cannot approve', 'Role-based access: Support L2 sees read-only tiles and can only request access', 'Users, admins, IDs and amounts are DEMO'],
  frames: [
    { k: 'OV', step: '1', src: '171:73506', code: 'ADM-02', title: 'Admin overview', row: 0, col: 0 },
    { k: 'U1', step: '2', src: '34:461531', code: 'ADM-U1', title: 'Users list', row: 0, col: 1 },
    { k: 'U2', step: '3', src: '32:99005', code: 'ADM-U2', title: 'User profile — @nova.k', row: 0, col: 2 },
    { k: 'U8D', step: '4', src: '33:316337', code: 'ADM-U8', title: 'Restrictions — none active', row: 0, col: 3 },
    { k: 'U8A', step: '5', src: '34:331125', code: 'ADM-U8', title: 'Apply hold — reason + 2FA + four-eyes', row: 0, col: 4 },
    { k: 'U8R', step: '6', src: '34:401900', code: 'ADM-U8', title: 'Restriction active — after 2nd approval', row: 0, col: 5 },
    { k: 'U8L', step: '7', src: '34:402702', code: 'ADM-U8', title: 'Lift restriction — reason + 2FA', row: 0, col: 6 },
    { k: 'B1', step: 'B1', src: '221:192192', code: 'ADM-02', title: 'Restricted role — Support L2', kind: 'error', row: 1, col: 0, cond: 'IF the signed-in role has no user-management write permission (Support L2) → tiles are read-only, actions hidden, Request access offered.' },
    { k: 'B2', step: 'B2', src: '170:67433', code: 'ADM-01', title: '2FA failed 5× — locked', kind: 'error', row: 1, col: 4, cond: 'IF five wrong 2FA codes are entered while confirming → admin sign-in locks for 15 min, Security is alerted; nothing was applied.' },
    { k: 'B3', step: 'B3', src: '170:67648', code: 'ADM-01', title: 'Session expired — re-authenticate', kind: 'error', row: 1, col: 6, cond: 'IF the admin session expires (30 min idle) during the action → re-authenticate with password + 2FA; the draft reason is kept.' }
  ],
  links: [
    { from: 'OV', to: 'U1', hot: [12, 134, 224, 36], label: 'User Management → Users' },
    { from: 'OV', to: 'B1', chip: 'Signed in as Support L2', kind: 'error' },
    { from: 'U1', to: 'U2', hot: [297, 677, 1094, 40], label: 'Open @nova.k' },
    { from: 'U2', to: 'U8D', hot: [852, 482, 101, 44], label: 'Restrictions tab' },
    { from: 'U8D', to: 'U8A', hot: [[562, 1031, 76, 32], [918, 1031, 76, 32], [555, 1193, 76, 32]], label: 'Apply… withdrawal hold' },
    { from: 'U8A', to: 'U8R', find: /^(Submit for approval|Request approval|Send for approval|Submit request)$/, chip: 'Second approver approves', label: 'Submit → Compliance approves (four-eyes)' },
    { from: 'U8A', to: 'B2', chip: '2FA wrong 5×', kind: 'error' },
    { from: 'U8R', to: 'U8L', hot: [839, 636, 155, 32], label: 'Lift restriction…' },
    { from: 'U8L', to: 'U8D', find: /^(Lift restriction|Lift now|Confirm lift|Lift hold)$/, chip: 'Lift confirmed', label: 'Reason + 2FA → lifted, audit entry', loop: true },
    { from: 'U8L', to: 'B3', chip: 'Session expired', kind: 'error' },
    { from: 'B3', to: 'U8L', find: /^(Re-authenticate|Verify and continue|Continue|Sign in)$/, label: 'Re-authenticate → back to the draft', loop: true }
  ]
};


const main = mainSection(); await mainHeader(main);
const sub = subSection(main); const card = await flowCard(sub);
const made = await cloneSteps(sub, ["B1","B2","B3"]);
let wired = null;
wired = await wire(sub);
fitSection(sub); restack(main); fitSection(main); const nFlows = syncFlows(main);
const frames = FLOW.frames.map(f => { const w = wrapOf(sub, f); return w ? f.step + ' ' + w.id + ' ' + Math.round(w.width) + 'x' + Math.round(w.height) + ' @' + Math.round(w.x) + ',' + Math.round(w.y) : f.step + ' -'; });
await sub.screenshot();
{ const sf = FLOW.frames.find(f => f.k === "U8A"); const sw = sf && wrapOf(sub, sf); if (sw) await sw.screenshot({ scale: 0.4 }); }
return { main: main.id, mainSize: [Math.round(main.width), Math.round(main.height), Math.round(main.y)], sub: sub.id, subSize: [Math.round(sub.width), Math.round(sub.height), Math.round(sub.y)], card: card.id, made, wired, frames, flows: nFlows, flowNames: P11.flowStartingPoints.map(p => p.name.slice(0, 12)), log: LOG };
