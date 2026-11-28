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
// ===== USR-GAMING MOBILE KIT (usr-gaming continuation, 28 Nov 2026) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('USR — Mobile B', 98000, 0);
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
const GT = ['My games', 'My entries', 'Active rounds', 'Results', 'Winnings', 'Game history', 'Favourites'];
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Neon Koi': '25:14992' };
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 12, p: o.p ?? 16, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14, clip: !!o.clip }); }
function meter(w, pct, color = 'brand/primary', h = 6) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function noteBox(icon, text, tone, w = 358) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function overline(s) { return await T(s, 'Overline', 'text/tertiary'); }
async function secHead(title, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 8, align: 'CENTER' });
  const l = AL('VERTICAL', { name: 'Title', gap: 2 }); add(r, [l, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); l.appendChild(tr);
  tr.appendChild(await T(title, 'Heading/H5', 'text/primary')); if (o.demo) tr.appendChild(await DEMO('S'));
  if (o.sub) add(l, [await T(o.sub, 'Caption', 'text/tertiary', { w: 240 }), 'FILL']);
  if (o.link) { const lk = AL('HORIZONTAL', { name: 'Link — ' + o.link + ' (44px target)', gap: 4, align: 'CENTER', p: [12, 0, 12, 8] }); lk.appendChild(await T(o.link, 'Label/M', 'text/brand')); lk.appendChild(await IC('arrow-right', 16, 'icon/brand')); r.appendChild(lk); }
  return r;
}
async function thumbArt(g, s = 0.3) { const c = await figma.getNodeByIdAsync(ART[g]); const i = c.createInstance(); try { i.rescale(s); } catch (e) { i.resize(Math.round(160 * s), Math.round(213 * s)); } i.name = 'Thumb — ' + g; return i; }
async function tileG(g, players, he, o = {}) { const t = await I('28:16529', { State: 'Default' }, { Art: ART[g], Players: players, 'Show tag': !!o.tag, Tag: o.tag || 'HOT', 'House edge': he }); t.name = 'Tile — ' + g; if (o.scale) { try { t.rescale(o.scale); } catch (e) {} } return t; }
async function heartBtn(on) { const b = await I('7:774', { Type: on ? 'Ghost' : 'Secondary', Size: 'L', State: 'Default' }, { Icon: ICONS.heart }); tint(b, on ? 'icon/brand' : 'icon/default'); b.name = on ? 'Remove from favourites (♥ on)' : 'Add to favourites (♥ off)'; return b; }
async function cdBoxes(parts) { const r = AL('HORIZONTAL', { name: 'Countdown (real close 20:00:00 UTC)', gap: 4, align: 'CENTER' }); for (let i = 0; i < parts.length; i++) { if (i) r.appendChild(await T(':', 'Number/M', 'text/tertiary')); const b = AL('VERTICAL', { name: 'Box ' + parts[i][1], p: [6, 8, 6, 8], fill: 'surface/raised', r: 10, align: 'CENTER' }); b.appendChild(await T(parts[i][0], 'Number/M', 'text/gold')); b.appendChild(await T(parts[i][1], 'Caption', 'text/tertiary')); r.appendChild(b); } return r; }
async function shellG(name, active, title, sub, o = {}) {
  for (const c of sec.children.filter(c => c.name === name)) c.remove();
  const f = await screen(name, 390, o.h ? { h: o.h } : {});
  add(f, [await DEMOBAR('DEMO DATA — every figure here is illustrative.'), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const H = AL('VERTICAL', { name: 'Page header', gap: 8, p: [12, 16, 12, 16] }); add(f, [H, 'FILL']);
  const back = AL('HORIZONTAL', { name: 'Back (44px target)', gap: 4, align: 'CENTER' }); back.appendChild(await IC('chevron-left', 20, 'icon/muted')); back.appendChild(await T('Dashboard · Gaming', 'Label/M', 'text/secondary')); H.appendChild(back);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(H, [tr, 'FILL']); add(tr, [await T(title, 'Heading/H3', 'text/primary'), 'FILL']); if (o.titleRight) tr.appendChild(o.titleRight);
  add(H, [await T(sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const nav = figma.createFrame(); nav.name = 'Gaming sub-nav (horizontal scroll)'; nav.fills = []; nav.clipsContent = true; nav.resize(390, 44);
  const row = AL('HORIZONTAL', { name: 'Tabs', gap: 8, p: [4, 16, 4, 16] }); nav.appendChild(row); let act = null;
  for (const t of GT) { const p = await I('20:6895', { State: t === active ? 'Active' : 'Default' }, { Label: t === active && o.count ? t + ' · ' + o.count : t, 'Show icon': false }); p.name = 'Gaming tab/' + t; row.appendChild(p); if (t === active) act = p; }
  const off = Math.max(0, Math.min((act ? act.x : 0) - 60, row.width - 390)); row.x = -off; row.y = 0;
  add(f, [nav, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  return { f, C };
}
async function complianceG(f) { const cp = AL('HORIZONTAL', { name: 'Compliance', gap: 12, p: 16, align: 'CENTER' }); strokeSides(cp, 'border/subtle', { t: 1 }); add(f, [cp, 'FILL']); cp.appendChild(await I('6:159')); add(cp, [await T('Licensed play in permitted regions only · 18+ · Outcomes are random and verifiable — you can lose your stake.', 'Caption', 'text/tertiary', { w: 300 }), 'FILL']); return cp; }
async function endG(S, tab = 'Games') { await complianceG(S.f); const tb = await I('22:5413', { Active: tab }); add(S.f, [tb, 'FILL']); return tb; }
async function tabAbs(f, tab = 'Games') { const tb = await I('22:5413', { Active: tab }); f.appendChild(tb); tb.layoutPositioning = 'ABSOLUTE'; tb.x = 0; tb.y = f.height - tb.height; return tb; }
function scrimOver(f) { const s = rect(f.width, f.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
async function sheetG(f, title, sub, build, footer) {
  scrimOver(f);
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 20, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER', p: [0, 0, 0, 0] }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('HORIZONTAL', { name: 'Header', gap: 12 }); add(sh, [hd, 'FILL']);
  const ht = AL('VERTICAL', { name: 'Title', gap: 4 }); add(hd, [ht, 'FILL']); add(ht, [await T(title, 'Heading/H4', 'text/primary', { w: 300 }), 'FILL']); if (sub) add(ht, [await T(sub, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
  const x = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x }); x.name = 'Close sheet'; hd.appendChild(x);
  await build(sh);
  const ft = AL('HORIZONTAL', { name: 'Sticky footer', gap: 12, p: [12, 0, 12, 0] }); strokeSides(ft, 'border/subtle', { t: 1 }); add(sh, [ft, 'FILL']);
  for (const [b, m] of footer) add(ft, m ? [b, m] : b);
  const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', align: 'CENTER', h: 34 }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Home indicator bar'));
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = f.height - sh.height; return sh;
}
async function chipRow(items, o = {}) { const r = AL('HORIZONTAL', { name: o.name || 'Chips', gap: 8, w: 358, wrap: !!o.wrap, cgap: 8, clip: !o.wrap }); for (const [label, sel] of items) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Chip — ' + label; r.appendChild(c); } return r; }
async function listRow(g, meta, right, o = {}) {
  const r = AL('HORIZONTAL', { name: 'Row — ' + g, gap: 12, align: 'CENTER', p: [10, 0, 10, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 });
  r.appendChild(await thumbArt(g, 0.3));
  const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(g, 'Body/M Strong', 'text/primary', { w: 180 }), 'FILL']); add(tx, [await T(meta, 'Caption', 'text/tertiary', { w: 180 }), 'FILL']);
  if (right) r.appendChild(right);
  return r;
}
async function placeG(f, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
// ===== END KIT =====
async function part0() {
// [USR-G7] Favourites / 390 / Default — section-local x=3180, y=160
const S = await shellG('[USR-G7] Favourites / 390 / Default', 'Favourites', 'Favourites', 'Games you pinned with the heart, ready to open in one tap. Remove a game at any time — nothing else changes.', { count: '6' });
const C = S.C;
// Pinned Global Pool
const pc = card('Card — Pinned: Global Pool', { gap: 12, p: 16, stroke: 'border/gold' }); add(C, [pc, 'FILL']);
const ph = AL('HORIZONTAL', { name: 'Head', gap: 12, align: 'CENTER' }); add(pc, [ph, 'FILL']);
ph.appendChild(await thumbArt('Global Pool', 0.3));
const pt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(ph, [pt, 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Overline row', gap: 6, align: 'CENTER' }); pt.appendChild(pr); pr.appendChild(await IC('heart', 14, 'icon/brand')); pr.appendChild(await overline('Pinned'));
add(pt, [await T('Global Pool', 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL']);
add(pt, [await T('Round #1,248 · Open · entries close 27 Nov 2026, 20:00 UTC', 'Body/S', 'text/secondary', { w: 200 }), 'FILL']);
ph.appendChild(await DEMO('XS'));
const pa = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(pc, [pa, 'FILL']);
add(pa, [await T('You have 35 entries in this round · 351.75 USDT', 'Caption', 'text/tertiary', { w: 200 }), 'FILL']);
pa.appendChild(await BTN('Secondary', 'Open', { size: 'M', trail: 'arrow-right' }));
// Favourite games
const fg = AL('VERTICAL', { name: 'Your favourite games', gap: 12 }); add(C, [fg, 'FILL']);
add(fg, [await secHead('Your favourite games', { sub: '6 games · player counts are live', demo: true }), 'FILL']);
add(fg, [await chipRow([['All · 6', true], ['Originals · 3', false], ['Table · 2', false], ['Slots · 1', false]], { name: 'Category chips (scroll)' }), 'FILL']);
const grid = AL('HORIZONTAL', { name: 'Favourites grid (2 columns)', gap: 16, wrap: true, cgap: 16, w: 358 }); add(fg, [grid, 'FILL']);
for (const [g, pl, he, last] of [['Orbit Rush', '1,062', 'House edge 1.00%', 'Played today, 16:37 UTC'], ['Pool Dice', '66', 'House edge 1.00%', 'Played today, 16:41 UTC'], ['Twenty-One', '92', 'House edge ≈0.50%', 'Played today, 16:22 UTC'], ['Pool Roulette', '128', 'House edge 2.70%', 'Played today, 16:08 UTC'], ['Vault Sweeper', '146', 'House edge 1.00%', 'Played today, 16:17 UTC'], ['Neon Koi', '57', 'RTP 96.0–96.7%', 'Played 24 Nov 2026']]) {
  const it = AL('VERTICAL', { name: 'Favourite — ' + g, gap: 4, w: 171 }); grid.appendChild(it);
  it.appendChild(await tileG(g, pl, he, { scale: 171 / 160 }));
  const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 4, align: 'CENTER' }); add(it, [mr, 'FILL']);
  add(mr, [await T(last, 'Caption', 'text/tertiary', { w: 110 }), 'FILL']); mr.appendChild(await heartBtn(true));
}
// Reminders (off by default)
const rm = card('Card — Optional reminders', { gap: 12, p: 16 }); add(C, [rm, 'FILL']);
add(rm, [await T('Optional reminders — off unless you turn them on', 'Body/M Strong', 'text/primary', { w: 326 }), 'FILL']);
for (const [lab, desc] of [['Tournament starts', 'Tell me when a weekly tournament starts on a pinned game.'], ['Round closing', 'Remind me 30 min before a Global Pool round I joined closes.']]) {
  const tg = await I('20:3309', { On: 'No', State: 'Default' }, { Label: lab, Description: desc, 'Show description': true }); add(rm, [tg, 'FILL']);
}
add(rm, [await noteBox('info', 'Reminders never auto-enter you in a round, and they pause automatically during a cooling-off period or self-exclusion.', 'info', 326), 'FILL']);
// Suggestions
const sg = AL('VERTICAL', { name: 'You might also like', gap: 12 }); add(C, [sg, 'FILL']);
add(sg, [await secHead('You might also like', { link: 'Lobby', demo: true }), 'FILL']);
const car = AL('HORIZONTAL', { name: 'Carousel (scrolls horizontally)', gap: 12, w: 358, clip: true }); add(sg, [car, 'FILL']);
for (const [g, pl, he, tag] of [['Skyline', '206', 'House edge 1.00%', 'NEW'], ['Pinfall', '100', 'House edge 1.00%', null], ['Fortune Ring', '34', 'House edge 1.00%', null]]) {
  const it = AL('VERTICAL', { name: 'Item — ' + g, gap: 4 }); car.appendChild(it);
  it.appendChild(await tileG(g, pl, he, { tag })); const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 4, align: 'CENTER' }); add(it, [mr, 'FILL']); add(mr, [await T('Originals', 'Caption', 'text/tertiary'), 'FILL']); mr.appendChild(await heartBtn(false));
}
add(sg, [await T('Suggestions are based only on the games you play here. Every Original shows its house edge, and pinning a game never changes its odds.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
await endG(S, 'Games');
await placeG(S.f, 3180, 160);

return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height) };
}
async function part1() {
// [USR-G7] Favourites / 390 / Empty — section-local x=3180, below Default
const S = await shellG('[USR-G7] Favourites / 390 / Empty', 'Favourites', 'Favourites', 'Games you pin with the heart appear here, ready to open in one tap.');
const C = S.C;
const ec = card('Empty state — No favourites yet', { gap: 0, p: 0, clip: true }); add(C, [ec, 'FILL']);
// illustration strip: real game tiles cropped by the strip edge + angled colour block (no glows/rings)
const il = figma.createFrame(); il.name = 'Illustration — pinned tiles preview'; il.resize(358, 164); il.clipsContent = true; fill(il, 'surface/raised');
const blk = rect(420, 120, 'brand/tint', 0, 'Angled colour block'); il.appendChild(blk); blk.rotation = 12; blk.x = -30; blk.y = 96;
const arts = [['Pool Dice', 46, 52, 8], ['Twenty-One', 222, 52, -8], ['Orbit Rush', 134, 30, 0]];
for (const [g, x, y, rot] of arts) { const a = await thumbArt(g, 0.58); il.appendChild(a); a.x = x; a.y = y; a.rotation = rot; }
const pill = AL('HORIZONTAL', { name: 'Hint pill — Tap ♥ to pin', gap: 6, p: [6, 12, 6, 10], fill: 'surface/overlay', stroke: 'border/subtle', r: 9999, align: 'CENTER' }); il.appendChild(pill); pill.appendChild(await IC('heart', 16, 'icon/brand')); pill.appendChild(await T('Tap ♥ to pin', 'Label/S', 'text/primary')); pill.x = 16; pill.y = 14;
add(ec, [il, 'FILL']);
const eb = AL('VERTICAL', { name: 'Body', gap: 12, p: [20, 16, 16, 16] }); add(ec, [eb, 'FILL']);
add(eb, [await T('No favourites yet', 'Heading/H4', 'text/primary', { w: 326 }), 'FILL']);
add(eb, [await T('Tap the heart on any game — in the lobby, on a game page or in your game history — to pin it here. Favourites sync across your devices.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
add(eb, [await BTN('Primary', 'Browse the lobby', { size: 'L', trail: 'arrow-right' }), 'FILL']);
add(eb, [await BTN('Ghost', 'See GLOBAL POOL Originals', { size: 'L' }), 'FILL']);
// Recently played — quick add
const rp = AL('VERTICAL', { name: 'Recently played', gap: 12 }); add(C, [rp, 'FILL']);
add(rp, [await secHead('Recently played', { sub: 'Tap ♥ to add one of these', demo: true }), 'FILL']);
const lc = card('Recently played list (stacked rows)', { gap: 0, p: [4, 16, 4, 16] }); add(rp, [lc, 'FILL']);
const rows = [['Pool Dice', 'Originals · Today, 16:41 UTC'], ['Orbit Rush', 'Originals · Today, 16:37 UTC'], ['Double Side', 'Originals · Today, 16:28 UTC'], ['Twenty-One', 'Table · Today, 16:22 UTC']];
for (let i = 0; i < rows.length; i++) add(lc, [await listRow(rows[i][0], rows[i][1], await heartBtn(false), { last: i === rows.length - 1 }), 'FILL']);
add(rp, [await T('Popularity never affects a game’s odds — house edge and RTP are fixed for each game and shown on its tile.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
await endG(S, 'Games');
const dflt = sec.children.find(c => c.name === '[USR-G7] Favourites / 390 / Default');
await placeG(S.f, 3180, dflt ? dflt.y + dflt.height + 160 : 2400);

return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height) };
}
const results = [];
results.push(await part0());
results.push(await part1());
for (const r of results) { const n = await figma.getNodeByIdAsync(r.frame); await n.screenshot({ scale: 0.5 }); }
return { section: sec.id, results };
