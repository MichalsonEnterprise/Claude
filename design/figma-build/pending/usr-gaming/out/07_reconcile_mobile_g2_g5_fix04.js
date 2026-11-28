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
// ===== usr-gaming reconciliation edit helpers =====
const LOG = { ok: [], miss: [] };
async function loadFontsOf(n) { try { const segs = n.getStyledTextSegments(['fontName']); for (const s of segs) await figma.loadFontAsync(s.fontName); } catch (e) { if (n.fontName !== figma.mixed) await figma.loadFontAsync(n.fontName); } }
async function writeText(n, str) {
  const ref = n.componentPropertyReferences && n.componentPropertyReferences.characters;
  if (ref) { let p = n.parent; while (p) { if (p.type === 'INSTANCE' && p.componentProperties && p.componentProperties[ref]) { p.setProperties({ [ref]: str }); return; } p = p.parent; } }
  await loadFontsOf(n); n.characters = str;
}
// setTxt(id, from, to): replace substring `from` (or whole text when from===null) in text node id
async function setTxt(id, from, to) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n || n.type !== 'TEXT') { LOG.miss.push(id + ' (missing)'); return; }
  if (from !== null && !n.characters.includes(from)) { LOG.miss.push(id + ' (no "' + from.slice(0, 30) + '")'); return; }
  const next = from === null ? to : n.characters.replace(from, to);
  if (next === n.characters) return; await writeText(n, next); LOG.ok.push(id);
}
// repIn(frame, from, to, exact): replace in every TEXT node of a frame that contains `from`
async function repIn(frame, from, to, exact = false) {
  let c = 0;
  for (const n of frame.findAll(x => x.type === 'TEXT' && (exact ? x.characters === from : x.characters.includes(from)))) { await writeText(n, exact ? to : n.characters.split(from).join(to)); c++; LOG.ok.push(n.id); }
  if (!c) LOG.miss.push(frame.name.slice(0, 24) + ' (no "' + from.slice(0, 30) + '")');
  return c;
}
// swapRows(textIdA, textIdB): swap the two sibling rows that contain these text nodes (newest-first ordering)
async function swapRows(idA, idB) {
  const a = await figma.getNodeByIdAsync(idA), b = await figma.getNodeByIdAsync(idB); if (!a || !b) { LOG.miss.push('swap ' + idA); return; }
  const chain = (n) => { const r = []; while (n) { r.push(n); n = n.parent; } return r; };
  const ca = chain(a), cb = chain(b); const P = ca.find(x => cb.includes(x)); if (!P) return;
  const rowA = ca[ca.indexOf(P) - 1], rowB = cb[cb.indexOf(P) - 1];
  const ia = P.children.indexOf(rowA), ib = P.children.indexOf(rowB); if (ia < 0 || ib < 0 || ia === ib) return;
  const sw = (x) => ('strokes' in x) ? { s: x.strokes, t: x.strokeTopWeight, r: x.strokeRightWeight, b: x.strokeBottomWeight, l: x.strokeLeftWeight } : null;
  const sa = sw(rowA), sb = sw(rowB);
  const lo = Math.min(ia, ib), hi = Math.max(ia, ib), first = ia < ib ? rowA : rowB, second = ia < ib ? rowB : rowA;
  P.insertChild(lo, second); P.insertChild(hi, first);
  const ap = (x, s) => { if (!s || !('strokes' in x)) return; x.strokes = s.s; x.strokeTopWeight = s.t; x.strokeRightWeight = s.r; x.strokeBottomWeight = s.b; x.strokeLeftWeight = s.l; };
  // keep divider strokes positional (the row that is now first gets the former first row's strokes)
  if (ia < ib) { ap(rowB, sa); ap(rowA, sb); } else { ap(rowA, sb); ap(rowB, sa); }
  LOG.ok.push('swap ' + rowA.id + '<->' + rowB.id);
}
// read-only audit + screenshots of existing frames (usr-gaming continuation verify)
async function audit(f) {
  const fb = f.absoluteBoundingBox; const out = { id: f.id, name: f.name, h: Math.round(f.height), texts: 0, clipped: [], offCanvas: [], placeholder: [], tiny: [], demo: 0, inst: 0 };
  const PH = new Set(['Title', 'Label', 'Button', 'Heading', 'Text', 'Lorem ipsum', 'Title here', 'Value', 'Description']);
  for (const n of f.findAll(() => true)) {
    if (n.type === 'INSTANCE') { out.inst++; if (n.name.startsWith('Badge/DEMO') || (n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '6:130')) out.demo++; }
    if (n.type !== 'TEXT' || !n.visible) continue;
    out.texts++;
    const b = n.absoluteBoundingBox; if (!b) continue;
    if (b.x + b.width > fb.x + fb.width + 1 || b.x < fb.x - 1) { if (out.offCanvas.length < 8) out.offCanvas.push(n.characters.slice(0, 40)); }
    if (PH.has(n.characters.trim()) && out.placeholder.length < 8) out.placeholder.push(n.characters + ' @' + (n.parent && n.parent.name));
    if (b.width < 4 && n.characters.length > 1 && out.tiny.length < 8) out.tiny.push(n.characters.slice(0, 30));
    let p = n.parent; let hiddenByScroll = false;
    while (p && p.id !== f.id) {
      if ('clipsContent' in p && p.clipsContent && p.absoluteBoundingBox) {
        const pb = p.absoluteBoundingBox;
        if (/scroll|carousel|Carousel|Scroll|Art|art|Thumb|Tile/.test(p.name)) { hiddenByScroll = true; break; }
        if (b.y + b.height > pb.y + pb.height + 1 || b.x + b.width > pb.x + pb.width + 1 || b.y < pb.y - 1 || b.x < pb.x - 1) { if (out.clipped.length < 8) out.clipped.push(n.characters.slice(0, 40) + ' ⟂ ' + p.name.slice(0, 40)); break; }
      }
      p = p.parent;
    }
  }
  return out;
}
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const F = async (id) => await figma.getNodeByIdAsync(id);
const m2d = await F('34:432315'), m3e = await F('34:486169'), m4 = await F('34:503168'), m5o = await F('36:514932'), m5s = await F('36:524169'), m6x = await F('152:65321');
// 1) Rounds #1,247 (40 entries, 402.00) / #1,246 (24 entries, 241.20) — demo-data financial history extras
await setTxt('34:432572', null, '40 entries');
await setTxt('34:486458', '25 entries', '40 entries');
await setTxt('34:503331', '25 entries · 251.25 USDT', '40 entries · 402.00 USDT');
await setTxt('34:503358', '40 entries · 402.00 USDT', '24 entries · 241.20 USDT');
// 2) G5 — VIP weekly reward 115.20 (16–22 Nov) calculated Mon 23 Nov 10:00 UTC, auto-settles Mon 30 Nov 10:00 UTC
for (const f of [m5o, m5s]) {
  await repIn(f, 'Settlement is automatic — nothing to claim.', 'Settlement is automatic — you never need to claim anything.');
  await repIn(f, 'The daily run at 21:00 UTC moves them to Available', 'The daily run at 21:00 UTC moves prizes and refunds to Available (VIP weekly rewards settle by themselves after 7 days)');
  await repIn(f, 'No. Everything owed settles automatically in the daily run.', 'No. Everything owed settles automatically — prizes and refunds in the daily run, VIP rewards 7 days after they are calculated.');
}
await setTxt('36:515022', null, 'Refund settles today, 21:00 UTC');
await setTxt('36:515135', null, 'Auto-settles 30 Nov 2026, 10:00 UTC');
await setTxt('36:515177', null, '23 Nov 2026, 10:00 UTC · auto-settled');
await setTxt('36:515186', null, '12 Nov 2026 · claimed in VIP Club');
await setTxt('36:524193', null, 'Nothing is owed right now. 415.20 USDT moved to Available on its own — the refund on 27 Nov, the VIP reward on 30 Nov. No action was needed.');
await setTxt('36:524197', null, 'Last item settled 30 Nov 2026, 10:00 UTC');
await setTxt('36:524198', null, 'Refund batch tx 0x6b2e…41a9 · next run 30 Nov, 21:00 UTC');
await setTxt('36:524216', null, 'Settled · last 7 days');
await setTxt('36:524279', null, 'Settled 30 Nov 2026, 10:00 UTC');
await setTxt('36:524314', null, '30 Nov 2026, 10:00 UTC');
await swapRows('36:524306', '36:524314');
// 3) fix 04 — G6 390 Export: filename gets the full width (DEMO badge moves under it), sheet re-pinned to the bottom
const fc = m6x.findOne(n => n.type === 'FRAME' && n.name === 'File preview');
const ft = fc.findOne(n => n.type === 'FRAME' && n.name === 'File');
const demo = fc.children.find(c => c.type === 'INSTANCE');
if (demo) { ft.appendChild(demo); LOG.ok.push(demo.id); }
const fname = ft.findOne(n => n.type === 'TEXT' && n.characters.startsWith('game-history'));
if (fname) { fname.layoutSizingHorizontal = 'FILL'; LOG.ok.push(fname.id); }
const sh6 = m6x.findOne(n => n.type === 'FRAME' && n.name.startsWith('Bottom sheet')); sh6.y = m6x.height - sh6.height;

const res = []; for (const f of [m2d, m3e, m4, m5o, m5s, m6x]) res.push(await audit(f));
for (const f of [m2d, m3e, m4, m5o, m5s, m6x]) await f.screenshot({ scale: 0.7 });
return { mutated: LOG.ok, miss: LOG.miss, fnameH: fname ? Math.round(fname.height) : null, audit: res.map(r => ({ n: r.name, h: r.h, clipped: r.clipped, off: r.offCanvas, ph: r.placeholder, demo: r.demo })) };
