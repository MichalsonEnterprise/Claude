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
async function mainHeader(main) {
  let h = main.children.find(n => n.name === 'Header — PRO-06..10');
  if (h) return h;
  h = AL('VERTICAL', { name: 'Header — PRO-06..10', gap: 20, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20, w: 3000 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('11 — PROTOTYPES · P1 FLOWS', 'Overline', 'text/brand'), await DEMO('M'));
  add(h, ov, await T('PRO-06..10 — Games, KYC and admin prototypes', 'Display/M', 'text/primary'));
  add(h, await T('Five clickable flows built from clones of the verified source screens (pages 03, 04, 05, 08, 09). Each flow has its own section: a flow map card (steps, branch conditions, rules it proves), the cloned frames left → right with numbered headers, mint arrows for the happy path, amber arrows for error branches and sky arrows for alternate outcomes. Every frame carries a prototype bar (not product UI) with Simulate chips for branches plus Back and Restart, so no frame is a dead end. Start any flow from Present ▶ → Flows.', 'Body/L', 'text/secondary', { w: 2880 }));
  const row = AL('HORIZONTAL', { gap: 24, wrap: true, cgap: 12 });
  for (const t of ['PRO-06 Games Lobby → Game → Result', 'PRO-07 Profile → KYC', 'PRO-08 Admin → User Management', 'PRO-09 Admin → Finance', 'PRO-10 Admin → Pool Monitoring']) { const c = AL('HORIZONTAL', { gap: 8, p: [8, 16, 8, 16], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(c, await IC('play', 16, 'icon/brand'), await T(t, 'Label/M', 'text/primary')); add(row, c); }
  add(h, row);
  add(h, await T('Source of truth = the original frames. These are clones for prototyping: after a source changes, re-run pending/proto-b scripts (they rebuild the clones idempotently by name).', 'Caption', 'text/tertiary', { w: 2880 }));
  main.appendChild(h); h.x = 120; h.y = 120; return h;
}
async function flowCard(sub) {
  let card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id);
  if (card) return card;
  card = AL('HORIZONTAL', { name: 'Flow map — ' + FLOW.id, gap: 64, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20 });
  const c1 = AL('VERTICAL', { name: 'Intro', gap: 24, w: 880 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('PROTOTYPE FLOW · ' + FLOW.pri + ' · PAGE 11', 'Overline', 'text/brand'), await DEMO('S'));
  add(c1, ov, await T(FLOW.name, 'Heading/H1', 'text/primary', { w: 880 }), await T(FLOW.goal, 'Body/L', 'text/secondary', { w: 880 }));
  const how = AL('VERTICAL', { name: 'How to play', gap: 8, p: 24, fill: 'surface/raised', r: 14, w: 880 });
  add(how, await T('How to play', 'Label/L', 'text/primary'), await T('Present ▶ → Flows → "' + FLOW.flowName + '". Click the dashed hotspots for the happy path. The prototype bar on top of every frame holds Simulate chips for the error branches plus Back and Restart — every frame has a way out.', 'Body/M', 'text/secondary', { w: 832 }));
  const lg = AL('VERTICAL', { name: 'Legend', gap: 10 });
  for (const [c, t] of [['brand/primary', 'Happy path — click the dashed hotspot'], ['status/warning', 'Error branch — Simulate chip or a failing action'], ['status/info', 'Alternate outcome — still a valid end state']]) { const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, rect(56, 4, c, 0, 'Legend line'), await T(t, 'Body/S', 'text/secondary')); add(lg, r); }
  const ck = AL('VERTICAL', { name: 'Rules this flow proves', gap: 10 }); add(ck, await T('Rules this flow proves', 'Label/L', 'text/primary'));
  for (const s of FLOW.checks) { const r = AL('HORIZONTAL', { gap: 10 }); add(r, await IC('shield-check', 16, 'icon/brand'), await T(s, 'Body/S', 'text/secondary', { w: 840 })); add(ck, r); }
  add(c1, how, lg, ck);
  const c2 = AL('VERTICAL', { name: 'Happy path', gap: 14, w: 1040 }); add(c2, await T('Happy path', 'Heading/H4', 'text/primary'));
  const mains = MAINS();
  for (let i = 0; i < mains.length; i++) {
    const f = mains[i]; const nx = mains[i + 1];
    const out = nx ? FLOW.links.find(l => l.from === f.k && l.to === nx.k) : null;
    const loops = FLOW.links.filter(l => l.from === f.k && l.loop).map(l => 'Loop: ' + linkLabel(l) + ' → ' + (FLOW.frames.find(x => x.k === l.to) || {}).step);
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T((out ? linkLabel(out) + ' → step ' + nx.step : 'End of flow — Restart or Back from the prototype bar') + (loops.length ? '. ' + loops.join('. ') : ''), 'Body/S', 'text/secondary', { w: 980 }));
    add(r, await circ(f.step, 'brand/primary'), st); add(c2, r);
  }
  const c3 = AL('VERTICAL', { name: 'Branches', gap: 14, w: 1040 }); add(c3, await T('Branches & alternate outcomes', 'Heading/H4', 'text/primary'));
  for (const f of FLOW.frames.filter(f => String(f.step).startsWith('B'))) {
    const inl = FLOW.links.find(l => l.to === f.k);
    const from = inl ? FLOW.frames.find(x => x.k === inl.from) : null;
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T(f.cond, 'Body/S', 'text/secondary', { w: 980 }));
    if (from) add(st, await T('From ' + (String(from.step).startsWith('B') ? 'branch ' : 'step ') + from.step + ' via ' + (inl.chip && !inl.hot ? 'Simulate chip "' + inl.chip + '"' : 'hotspot "' + linkLabel(inl) + '"') + (f.exit ? ' · exit: ' + f.exit : ''), 'Caption', 'text/tertiary', { w: 980 }));
    add(r, await circ(f.step, COLOR(f.kind)), st); add(c3, r);
  }
  add(card, c1, c2, c3);
  sub.appendChild(card); card.x = 120; card.y = 120; return card;
}
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
// ===== END PROTO-B LIB =====

const FLOW = {
  id: 'PRO-07', pri: 'P1', name: 'PRO-07 Profile → KYC', flowName: 'PRO-07 · Profile → KYC', start: 'A4N',
  goal: '@nova.k (DEMO) opens Account & security → KYC, starts Level 2 verification (personal details, ID front + back, 3-second liveness), waits for review and lands on the approved KYC status. Branches: validation errors, a blurry document photo, blocked camera, a failed liveness check and a rejected review with resubmission.',
  checks: ['No pre-checked consent; what is collected and why is explained before any upload', 'Every failure says exactly what to fix (field, blur/glare, camera permission, lighting)', 'A rejected review always offers Fix and resubmit, a re-check request and support — never a dead end', 'Level limits are stated up front (Level 2: withdrawals up to 25,000.00 USDT/day)', 'Names, documents and dates shown are DEMO'],
  frames: [
    { k: 'A4N', step: '1', src: '33:221847', code: 'USR-A4', title: 'Account → KYC status (not started)', row: 0, col: 0 },
    { k: 'I', step: '2', src: '128:55999', code: 'AUTH-11', title: 'KYC intro & levels', row: 0, col: 1 },
    { k: 'P', step: '3', src: '130:69057', code: 'AUTH-12', title: 'Personal details', row: 0, col: 2 },
    { k: 'U', step: '4', src: '131:128471', code: 'AUTH-13', title: 'ID upload — requirements', row: 0, col: 3 },
    { k: 'UP', step: '5', src: '131:129981', code: 'AUTH-13', title: 'ID preview — checks passed', row: 0, col: 4 },
    { k: 'LV', step: '6', src: '132:75343', code: 'AUTH-14', title: 'Liveness — camera ready', row: 0, col: 5 },
    { k: 'PD', step: '7', src: '138:90288', code: 'AUTH-15', title: 'Submitted — in review', row: 0, col: 6 },
    { k: 'AP', step: '8', src: '138:91699', code: 'AUTH-16', title: 'Approved — Level 2', row: 0, col: 7 },
    { k: 'A4A', step: '9', src: '33:262703', code: 'USR-A4', title: 'Account → KYC status (approved)', row: 0, col: 8 },
    { k: 'B1', step: 'B1', src: '130:70575', code: 'AUTH-12', title: 'Validation errors', kind: 'error', row: 1, col: 2, cond: 'IF required fields are missing or invalid (e.g. under 18, PO box address) → inline errors with the fix; Continue stays blocked.' },
    { k: 'B2', step: 'B2', src: '131:131529', code: 'AUTH-13', title: 'Back photo failed the quality check', kind: 'error', row: 1, col: 3, cond: 'IF the uploaded photo is blurred, has glare or cropped corners → Retake photo; attempts are counted and explained.' },
    { k: 'B4', step: 'B3', src: '132:78270', code: 'AUTH-14', title: 'Liveness failed — face too dark', kind: 'error', row: 1, col: 4, cond: 'IF the liveness capture fails (lighting, face out of frame) → Retake video with tips; nothing is submitted yet.' },
    { k: 'B3', step: 'B4', src: '132:76801', code: 'AUTH-14', title: 'Camera permission denied', kind: 'error', row: 1, col: 5, cond: 'IF the browser blocks the camera → steps to allow access, Try again, or continue on a phone via QR / email link.' },
    { k: 'B5', step: 'B5', src: '140:97309', code: 'AUTH-17', title: 'Review rejected — reasons', kind: 'error', row: 1, col: 6, cond: 'IF the reviewer rejects the submission (e.g. expired or unreadable document) → each reason with the fix, Fix and resubmit or Ask for a re-check.' },
    { k: 'B6', step: 'B6', src: '140:98769', code: 'AUTH-17', title: 'Resubmit — new document', kind: 'alt', row: 1, col: 7, cond: 'THEN only the rejected items are requested again (here: passport photo page) → Submit again returns to review.' },
    { k: 'B7', step: 'B7', src: '33:280974', code: 'USR-A4', title: 'Account → KYC status (rejected)', kind: 'alt', row: 2, col: 6, cond: 'IF the player leaves and comes back later → the KYC status page shows the rejection, the reason and Retake ID photo.' }
  ],
  links: [
    { from: 'A4N', to: 'I', hot: [306, 632, 198, 48], label: 'Start verification' },
    { from: 'I', to: 'P', hot: [1054, 1122, 166, 48], label: 'Start Level 2' },
    { from: 'I', to: 'A4N', hot: [560, 1122, 105, 48], label: 'Not now', loop: true },
    { from: 'P', to: 'U', hot: [1081, 1164, 139, 48], label: 'Continue (all fields valid)' },
    { from: 'P', to: 'B1', chip: 'Submit invalid fields', kind: 'error' },
    { from: 'U', to: 'UP', hot: [[654, 924, 135, 32], [992, 924, 135, 32], [1081, 1058, 139, 48]], label: 'Upload front + back → Continue' },
    { from: 'U', to: 'B2', chip: 'Blurry back photo', kind: 'error' },
    { from: 'UP', to: 'LV', hot: [1015, 1012, 205, 48], label: 'Continue to selfie' },
    { from: 'LV', to: 'PD', hot: [[560, 804, 185, 48], [1081, 897, 139, 48]], label: 'Record 3-second video → submit' },
    { from: 'LV', to: 'B4', chip: 'Face too dark', kind: 'error' },
    { from: 'LV', to: 'B3', chip: 'Camera blocked', kind: 'error' },
    { from: 'PD', to: 'AP', chip: 'Review approved', label: 'Review approved (typically < 10 min)' },
    { from: 'PD', to: 'B5', chip: 'Review rejected', kind: 'error' },
    { from: 'AP', to: 'A4A', chip: 'Open Account → KYC', label: 'Account → KYC shows Level 2' },
    { from: 'B1', to: 'U', hot: [1081, 1398, 139, 48], label: 'Fix fields → Continue', loop: true },
    { from: 'B2', to: 'UP', hot: [[560, 1141, 152, 40], [1070, 783, 136, 32]], label: 'Retake photo', loop: true },
    { from: 'B4', to: 'LV', hot: [560, 871, 168, 48], label: 'Retake video', loop: true },
    { from: 'B3', to: 'LV', hot: [560, 889, 140, 48], label: 'Try again (camera allowed)', loop: true },
    { from: 'B5', to: 'B6', hot: [1024, 1110, 196, 48], label: 'Fix and resubmit', kind: 'alt' },
    { from: 'B5', to: 'B7', chip: 'Leave, come back later', kind: 'alt' },
    { from: 'B6', to: 'PD', hot: [1051, 1038, 169, 48], label: 'Submit again', loop: true },
    { from: 'B7', to: 'B6', hot: [306, 656, 191, 48], label: 'Retake ID photo', loop: true }
  ]
};


const main = mainSection(); await mainHeader(main);
const sub = subSection(main); const card = await flowCard(sub);
const made = await cloneSteps(sub, ["A4N","I","P","U","UP","LV","PD","AP","A4A"]);
let wired = null;

fitSection(sub); restack(main); fitSection(main); const nFlows = syncFlows(main);
const frames = FLOW.frames.map(f => { const w = wrapOf(sub, f); return w ? f.step + ' ' + w.id + ' ' + Math.round(w.width) + 'x' + Math.round(w.height) + ' @' + Math.round(w.x) + ',' + Math.round(w.y) : f.step + ' -'; });
await sub.screenshot();

return { main: main.id, mainSize: [Math.round(main.width), Math.round(main.height), Math.round(main.y)], sub: sub.id, subSize: [Math.round(sub.width), Math.round(sub.height), Math.round(sub.y)], card: card.id, made, wired, frames, flows: nFlows, flowNames: P11.flowStartingPoints.map(p => p.name.slice(0, 12)), log: LOG };
