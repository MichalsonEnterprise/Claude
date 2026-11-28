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
// ===== CF lib (coinflip agent) =====
async function setText(root, name, value, nth = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = ts[nth]; if (!t) return false; const fonts = t.getStyledTextSegments(['fontName']).map(s => s.fontName); for (const fn of fonts) await figma.loadFontAsync(fn); t.characters = value; return true; }
function grow(n) { n.layoutGrow = 1; return n; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, 'Label/S', o.color || 'text/secondary')); if (o.demo) add(r, await DEMO('XS')); return r; }
async function disc(side, o = {}) { const s = o.size || 24; const d = AL('HORIZONTAL', { name: 'Disc/' + side, w: s, h: s, r: 9999, align: 'CENTER', justify: 'CENTER', fill: side === 'H' ? 'brand/tint' : 'surface/raised', stroke: o.newest ? 'border/focus' : (side === 'H' ? 'border/brand' : 'border/default'), sw: o.newest ? 2 : 1 }); add(d, await T(side, s >= 28 ? 'Label/M' : 'Label/S', side === 'H' ? 'text/brand' : 'text/secondary')); return d; }
async function sidebar(activeName, collapsed) { const sb = await I('23:6697', { State: collapsed ? 'Collapsed' : 'Expanded', Auth: 'Member' }); for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { const p = it.componentProperties; const st = p.State && p.State.value; if (it.name === 'Item/' + activeName) { it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } return sb; }
async function gameHeader(o = {}) {
  const h = AL('HORIZONTAL', { name: 'Game header', gap: 16, align: 'CENTER' });
  const th = await I('24:13473'); th.rescale(0.35); th.name = 'Tile/Game Art — Double Side (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 6 });
  const bc = await I('14:1145', { Levels: 3 }); await setText(bc, 'Crumb 1', 'Casino'); await setText(bc, 'Crumb 2', o.crumb2 || 'GLOBAL POOL Originals'); await setText(bc, 'Current page', o.current || 'Double Side'); add(col, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' });
  add(tr, await T(o.title || 'Double Side', 'Heading/H3', 'text/primary', { name: 'Game title' }));
  add(tr, await chip('shield-check', 'Provably fair', { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' }));
  const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 8, align: 'CENTER' }); add(mr, await chip('percent', 'House edge 2.00%'), await chip('coin', 'Payout 1.96×'), await chip('coins', 'Bet 0.10 – 1,000.00 USDT'));
  add(col, tr, mr); add(h, col); grow(col);
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' });
  if (!o.noSound) add(act, await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS.volume }));
  add(act, await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS.star }));
  add(act, await BTN('Secondary', 'Fairness', { lead: 'shield-check' }), await BTN('Ghost', 'Rules & payouts', { lead: 'book' }));
  add(h, act); return h;
}
async function rgBar(state) { const b = await I('23:24937', { State: state || 'Normal' }); b.name = 'RG/Session Bar'; return b; }
async function shellDesktop(name, w, pos, active, o = {}) {
  const f = await screen(name, w, pos); f.primaryAxisSizingMode = 'AUTO'; add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await sidebar(active || 'Double Side', o.collapsed); add(body, sb); sb.layoutSizingVertical = 'FILL';
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  const tb = await I('23:9832', { State: o.topbar || 'Member' }); tb.name = 'Shell/Topbar Desktop'; add(main, [tb, 'FILL']);
  if (o.balance) await setText(tb, 'Balance value', o.balance);
  const content = AL('VERTICAL', { name: 'Content', gap: 24, p: o.pad || [24, 32, 48, 32] }); add(main, [content, 'FILL']);
  return { f, body, sb, main, tb, content };
}
async function compliance() { const c = AL('HORIZONTAL', { name: 'Compliance footer', gap: 16, p: [12, 16, 12, 16], r: 14, stroke: 'border/subtle', align: 'CENTER' }); const lic = await I('6:158', { Variant: 'Inline' }); add(c, lic); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(c, sp); grow(sp); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Set limits', { size: 'S', lead: 'sliders' })); return c; }
// ===== END CF lib =====
// ===== CF clone helpers =====
async function swapInst(old, compId, variant, scale) { const n = await I(compId, variant); if (scale) n.rescale(scale); n.name = old.name; const p = old.parent; const i = p.children.indexOf(old); p.insertChild(i, n); old.remove(); return n; }
async function swapIcon(inst, iconName, color) { const c = await figma.getNodeByIdAsync(ICONS[iconName]); inst.swapComponent(c); tint(inst, color); inst.name = 'Icon/' + iconName; return inst; }
async function setDiscs(row, seq) { for (const d of row.children.filter(n => n.name.startsWith('Disc/'))) d.remove(); const lbl = row.children[0]; let idx = row.children.indexOf(lbl) + 1; for (let i = 0; i < seq.length; i++) { row.insertChild(idx + i, await disc(seq[i], { newest: i === 0 })); } }
async function setStrip(strip, seq) { const texts = strip.findAll(n => n.type === 'TEXT' && (n.name === 'H' || n.name === 'T') && (n.characters === 'H' || n.characters === 'T')); const tpl = {}; for (let i = 1; i < texts.length; i++) { const c = texts[i].characters; if (!tpl[c]) tpl[c] = { f: JSON.parse(JSON.stringify(texts[i].parent.fills)), s: JSON.parse(JSON.stringify(texts[i].parent.strokes)), t: JSON.parse(JSON.stringify(texts[i].fills)) }; } for (let i = 0; i < texts.length && i < seq.length; i++) { const t = texts[i]; const side = seq[i]; const tp = tpl[side]; if (!tp) continue; t.characters = side; t.name = side; t.fills = tp.t; t.parent.fills = tp.f; if (i > 0) t.parent.strokes = tp.s; } return texts.length; }
async function setTexts(root, map) { const miss = []; for (const [k, v] of Object.entries(map)) { const ok = await setText(root, k, v); if (!ok) miss.push(k); } return miss; }
// ===== END CF clone helpers =====
// ===== CF page helpers =====
async function pageHeader(o) { const h = AL('HORIZONTAL', { name: 'Page header', gap: 16, align: 'CENTER' }); const th = await I('24:13473'); th.rescale(0.35); th.name = 'Tile/Game Art — Double Side (thumb)'; add(h, th); const col = AL('VERTICAL', { name: 'Title', gap: 6 }); const bc = await I('14:1145', { Levels: 3 }); await setText(bc, 'Crumb 1', 'Casino'); await setText(bc, 'Crumb 2', 'Double Side'); await setText(bc, 'Current page', o.crumb); add(col, bc); const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(o.title, 'Heading/H3', 'text/primary', { name: 'Page title' })); for (const x of (o.chips || [])) add(tr, x); add(col, tr); add(h, col); grow(col); const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' }); for (const b of o.actions) add(act, b); add(h, act); return h; }
async function tabsRow(active, counts = {}) { const r = AL('HORIZONTAL', { name: 'Game tabs', gap: 24 }); strokeSides(r, 'border/subtle', { b: 1 }); for (const l of ['Play', 'My flips', 'All flips', 'Fairness', 'Rules & payouts']) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': !!counts[l] }); t.name = 'Tab — ' + l; if (counts[l]) { const c = t.findOne(n => n.type === 'INSTANCE' && n.name === 'Count'); if (c) { try { const k = Object.keys(c.componentProperties).find(x => x.startsWith('Count')); c.setProperties({ [k]: String(counts[l]) }); } catch (e) {} } } add(r, t); } return r; }
async function statTile(label, value, sub, color, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Label row', align: 'CENTER', justify: 'SPACE_BETWEEN' }); add(lr, await T(label, 'Overline', 'text/tertiary'), await DEMO('XS')); add(t, [lr, 'FILL']); add(t, await T(value, o.style || 'Number/L', color || 'text/primary', { name: 'Value' })); const s = await T(sub, 'Caption', 'text/tertiary', { name: 'Sub', w: 200 }); add(t, s); s.layoutSizingHorizontal = 'FILL'; return t; }
// ===== END CF page helpers =====
const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const sec = section('CF Coinflip', 48000, 0);
const NAME = '[CF-04] History / 1440 / My flips — today (CF-52107 expanded)';
const ex = sec.children.find(n => n.name === NAME); if (ex) ex.remove();
const S = await shellDesktop(NAME, 1440, { x: 52800, y: 120 }, 'Double Side', { balance: '9,214.90' });
const C = S.content;
add(C, [await pageHeader({ crumb: 'My flips', title: 'My flips', chips: [await DEMO('M')], actions: [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Primary', 'Back to game', { lead: 'arrow-left' })] }), 'FILL']);
const rg = await rgBar('Normal'); add(C, [rg, 'FILL']); try { rg.layoutSizingVertical = 'HUG'; } catch (e) {} await setTexts(rg, { 'Timer': '00:44:10', 'Net value': '−25.00 USDT', 'Limit value': '25.00 / 200.00 USDT' });
add(C, [await tabsRow('My flips', { 'My flips': 24 }), 'FILL']);
// filters
const fr = AL('HORIZONTAL', { name: 'Filters', gap: 12, align: 'CENTER' }); add(C, [fr, 'FILL']);
const seg = AL('HORIZONTAL', { name: 'Period', gap: 4, p: 4, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); for (const l of ['Today', '7 days', '30 days']) add(seg, await I('20:6953', { State: l === 'Today' ? 'Active' : 'Default' }, { Label: l })); add(fr, seg);
for (const [l, s] of [['All picks', 'Selected'], ['Picked Heads', 'Default'], ['Picked Tails', 'Default'], ['Wins', 'Default'], ['Losses', 'Default']]) add(fr, await I('17:2766', { State: s }, { Label: l, 'Show icon': false }));
const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(fr, sp); grow(sp);
const srch = await I('16:3820', { Size: 'S', State: 'Default' }); await setText(srch, 'Value text', 'Search flip ID or nonce'); add(fr, srch);
// stats
const st = AL('HORIZONTAL', { name: 'Summary', gap: 16 }); add(C, [st, 'FILL']);
add(st, [await statTile('FLIPS TODAY', '24', 'Since 00:00 UTC · Double Side only'), 'FILL'], [await statTile('WAGERED', '240.00 USDT', '24 flips × 10.00 USDT'), 'FILL'], [await statTile('NET RESULT', '−4.80 USDT', '12 wins × +9.60 · 12 losses × −10.00', 'text/danger'), 'FILL'], [await statTile('LANDED', 'Heads 13 · Tails 11', 'Each flip is independent — this is a record, not a pattern', 'text/primary', { style: 'Heading/H4' }), 'FILL']);
for (const t of st.children) t.layoutSizingVertical = 'FILL';
// table
const tbl = AL('VERTICAL', { name: 'Flips table', r: 14, fill: 'surface/default', stroke: 'border/subtle', clip: true }); add(C, [tbl, 'FILL']);
const cols = [['FLIP', 168, 'Left'], ['TIME (UTC)', 136, 'Left'], ['PICK', 136, 'Left'], ['LANDED', 136, 'Left'], ['BET', 136, 'Right'], ['PAYOUT', 120, 'Right'], ['PROFIT', 168, 'Right'], ['FAIRNESS', 0, 'Left']];
const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'bg/secondary' }); add(tbl, [hr, 'FILL']);
for (const [l, w, a] of cols) { const h = await I('22:8309', { Align: a, Sort: l === 'TIME (UTC)' ? 'Desc' : 'None' }, { Label: l, 'Show sort icon': l === 'TIME (UTC)' }); h.name = 'Head — ' + l; add(hr, h); if (w) h.resize(w, h.height); else h.layoutSizingHorizontal = 'FILL'; }
const rows = [['CF-52108', '18:44:31', 'H', 'T', 419], ['CF-52107', '18:44:06', 'H', 'H', 418], ['CF-52106', '18:41:58', 'H', 'H', 416], ['CF-52105', '18:41:31', 'H', 'T', 414], ['CF-52104', '18:40:55', 'T', 'T', 413], ['CF-52103', '18:40:12', 'T', 'H', 411], ['CF-52102', '18:39:47', 'H', 'H', 410], ['CF-52101', '18:39:20', 'H', 'T', 409], ['CF-52100', '18:38:42', 'H', 'H', 407], ['CF-52099', '18:38:05', 'T', 'T', 406]];
const word = s => s === 'H' ? 'Heads' : 'Tails';
async function cell(w, kids, align) { const c = AL('HORIZONTAL', { name: 'Cell', gap: 8, p: [0, 16, 0, 16], align: 'CENTER', justify: align === 'Right' ? 'MAX' : 'MIN', w: w || 136, h: 52 }); for (const k of kids) add(c, k); return c; }
for (const [id, tm, pk, ld, nonce] of rows) {
  const win = pk === ld; const sel = id === 'CF-52107';
  const r = AL('HORIZONTAL', { name: 'Row — ' + id, align: 'CENTER', fill: sel ? 'surface/selected' : null }); strokeSides(r, 'border/subtle', { b: 1 }); add(tbl, [r, 'FILL']);
  add(r, await cell(168, [await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')]));
  add(r, await cell(136, [await T(tm, 'Body/S', 'text/secondary')]));
  add(r, await cell(136, [await disc(pk), await T(word(pk), 'Body/S', 'text/primary')]));
  add(r, await cell(136, [await disc(ld), await T(word(ld), 'Body/S', 'text/primary')]));
  add(r, await cell(136, [await T('10.00', 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')], 'Right'));
  add(r, await cell(120, [await T(win ? '1.96×' : '—', 'Number/S', win ? 'text/primary' : 'text/tertiary')], 'Right'));
  const amt = await I('22:9421', { Sign: win ? 'Positive' : 'Negative' }); await setText(amt, 'Value', win ? '+9.60' : '−10.00');
  add(r, await cell(168, [amt], 'Right'));
  const fc = await cell(136, [await BTN('Ghost', sel ? 'Hide' : 'Verify', { size: 'S', lead: sel ? 'chevron-up' : 'shield-check' })]); add(r, fc); fc.layoutSizingHorizontal = 'FILL';
  if (sel) {
    const d = AL('VERTICAL', { name: 'Detail — CF-52107', gap: 16, p: [16, 24, 20, 24], fill: 'surface/raised' }); strokeSides(d, 'border/subtle', { b: 1 }); add(tbl, [d, 'FILL']);
    const g = AL('HORIZONTAL', { name: 'Detail grid', gap: 32, wrap: true, cgap: 16 }); add(d, [g, 'FILL']);
    for (const [k, v, mono] of [['Server seed hash (committed before the flip)', '8f3c1e9a7b52d0c4…1f4a7b09c2d6e813', true], ['Client seed', 'nova-k-7f2a91', true], ['Nonce', '418', true], ['Result', '0.2288 → below 0.5000 → Heads', false], ['Settled', '27 Nov 2026, 18:44:06 UTC', false], ['Balance after', '9,224.90 USDT', false]]) { const kv = AL('VERTICAL', { name: 'KV — ' + k, gap: 4 }); add(kv, await T(k, 'Caption', 'text/tertiary'), await T(v, mono ? 'Mono/S' : 'Body/S Strong', 'text/primary', { name: 'Value' })); add(g, kv); }
    const dr = AL('HORIZONTAL', { name: 'Detail actions', gap: 12, align: 'CENTER' }); add(dr, await BTN('Secondary', 'Verify this flip', { size: 'S', lead: 'shield-check' }), await BTN('Ghost', 'Copy details', { size: 'S', lead: 'copy' }), await DEMO('XS'));
    const nt = await T('The server seed is revealed when you rotate your seed pair — after that anyone can recompute this flip.', 'Caption', 'text/tertiary', { w: 600 }); add(dr, nt); add(d, dr);
  }
}
const pg = await I('23:16756', { Type: 'Numbered' }); add(tbl, [pg, 'FILL']); await setText(pg, 'Range', '1–10 of 24'); for (const nm of ['Page 4', 'Page 5', 'Gap', 'Page 65']) { const n = pg.findOne(x => x.name === nm); if (n) n.visible = false; }
const note = AL('HORIZONTAL', { name: 'History note', gap: 8, align: 'CENTER' }); add(note, await IC('info', 16, 'icon/muted'), await T('History is a record, not a strategy: past flips never predict the next one. Every flip is 50.00% Heads / 50.00% Tails, payout 1.96×.', 'Body/S', 'text/secondary')); add(C, note);
add(C, [await compliance(), 'FILL']);
sec.appendChild(S.f); S.f.x = 4800; S.f.y = 120; fitSection(sec);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, h: S.f.height };
