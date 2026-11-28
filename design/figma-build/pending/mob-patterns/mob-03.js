// PENDING use_figma script (agent mob-patterns) — run order 03 · MOB-02 — Tab bar Wallet / Account active + tab bar states & rules board.
// fileKey QHF8iRUMFgGMcEn3bD25jl · sessionId 55ee4abe-3cf3-4b8a-9391-56f6bca3e3ce · skillNames figma-use,figma-generate-design. Idempotent: same-name frames in the section are removed and rebuilt in place. Not run yet — Figma MCP seat limit (3 consecutive limit errors, 27 Nov 2026).
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

// ===== MOB KIT (agent mob-patterns) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('MOB-01/02/10/12 Mobile patterns', 224000, 0);
const C = { TOPM: '23:12908', DRAWER: '23:13536', TAB: '22:5413', REG: '16:3449', DC: '24:13861', TILE: '28:16529', LIC: '6:158', B18: '6:159', TK: '23:8534', BB: '14:1974', AV: '9:238', VIP: '6:211', KYC: '23:5565', ICB: '7:774', PILL: '20:6895', SEG: '20:6978', SRCH: '16:3820', CHIP: '17:2766', FEE: '20:8583', ADDR: '9:418', SB: '23:6697', LOGO: '4:797', MARK: '4:792', HC: '22:8309', CELL: '22:9559', PPV: '28:19099', NOTIF: '16:3356', JC: '22:8356', FOOT: '22:7450', CNT: '6:216' };
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Orbit Rush Duel': '24:13206', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'High Card': '24:13496', 'Ascend': '24:13528', 'Pool Keno': '24:13564', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Neon Koi': '25:14992', 'Atlas Vault': '25:15031', 'Live Pool Roulette': '27:15060', 'Daily Draw 6/45': '27:15370' };
const MISS = [];
async function ST(n, s) { if (!n || n.type !== 'TEXT') { MISS.push('ST'); return n; } const L = n.characters.length; const fs = L ? n.getRangeAllFontNames(0, L) : [n.fontName]; await Promise.all(fs.map(f => figma.loadFontAsync(f))); n.characters = String(s); return n; }
async function TX(root, name, s, i = 0) { const a = root.findAll(x => x.type === 'TEXT' && x.name === name); if (a[i]) await ST(a[i], s); else MISS.push('TX:' + name); return a[i]; }
async function RB(status, label, size = 'S') { const b = await BADGE(status, size); if (label) await TX(b, 'Label', label); return b; }
function SPC() { const s = AL('HORIZONTAL', { name: 'Spacer' }); s.resize(1, 1); return s; }
function ROW(name, kids = [], o = {}) { const r = AL('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); for (const k of kids) add(r, k); return r; }
function COL(name, kids = [], o = {}) { const r = AL('VERTICAL', Object.assign({ name, gap: 8 }, o)); for (const k of kids) add(r, k); return r; }
function CARD(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, gap: o.gap ?? 12, p: o.p ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, align: o.align }); }
function grow(n) { n.layoutSizingHorizontal = 'FILL'; return n; }
async function SLOT(id, title, sub) {
  const ln = 'Row label — ' + id; let lab = sec.children.find(n => n.name === ln);
  if (!lab) { const y = sec.children.length ? nextY(sec, 240) : 120; lab = AL('VERTICAL', { name: ln, gap: 8 }); sec.appendChild(lab); lab.x = 120; lab.y = y; add(lab, await T(title || id, 'Heading/H2', 'text/primary'), await T(sub || '', 'Body/L', 'text/secondary', { w: 1600 })); }
  let x = 120; for (const m of sec.children.filter(n => n.name.startsWith('[' + id + ']'))) x = Math.max(x, m.x + m.width + 120);
  return { x, y: lab.y + lab.height + 48 };
}
async function FRAME(id, name, w, o = {}) {
  const old = sec.children.find(n => n.name === name); let pos;
  if (old) { pos = { x: old.x, y: old.y }; old.remove(); } else pos = await SLOT(id, o.rowTitle, o.rowSub);
  const f = await screen(name, w, o.h ? { h: o.h, grid: o.grid } : { grid: o.grid }); if (!o.h) f.primaryAxisSizingMode = 'AUTO';
  sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  if (o.demo !== false) add(f, [await DEMOBAR(), 'FILL']);
  return f;
}
function VP(f, h = 844, name = 'Viewport 390×844') { const v = AL('VERTICAL', { name, w: f.width, h, clip: true, fill: 'bg/base' }); add(f, [v, 'FILL']); return v; }
function SCROLL(v, o = {}) { const c = AL('VERTICAL', { name: 'Content (scrolls)', p: o.p ?? [16, 16, 24, 16], gap: o.gap ?? 16, clip: true }); add(v, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; return c; }
async function SECH(title, o = {}) { const r = ROW('Section header — ' + title, [], { gap: 8 }); add(r, await T(title, o.s || 'Heading/H5', 'text/primary')); if (o.demo) add(r, await DEMO(o.demo)); add(r, [SPC(), 'FILL']); if (o.link) add(r, await BTN('Ghost', o.link, { size: 'S', trail: 'chevron-right' })); return r; }
async function TILE(game, players, o = {}) { const p = { Art: ART[game], Players: players, 'Show tag': !!o.tag, 'House edge': o.edge || 'House edge 1.00%' }; if (o.tag) p.Tag = o.tag; const t = await I(C.TILE, { State: o.state || 'Default' }, p); t.name = 'Tile/Game — ' + game; if (o.scale) t.rescale(o.scale); return t; }
async function TILEROW(list, scale = 0.69, o = {}) { const r = ROW('Tiles — ' + list.map(x => x[0]).join(', ').slice(0, 40), [], { gap: 12, justify: 'SPACE_BETWEEN', align: 'MIN' }); for (const [g, p, e] of list) add(r, await TILE(g, p, { scale, edge: e, state: o.state })); return r; }
async function ICT(icon, color = 'icon/default', tile = 'surface/raised', s = 20, p = 8) { const t = AL('HORIZONTAL', { name: 'Icon tile — ' + icon, p, fill: tile, r: 10 }); add(t, await IC(icon, s, color)); return t; }
// mobile hero banner: concrete objects cropped by the banner edge (entry ticket + coin stack + angled gold block)
async function HERO(o = {}) {
  const W = o.w || 358, H = o.h || 196;
  const b = AL('VERTICAL', { name: 'Hero banner — Global Pool', p: [20, 20, 20, 20], gap: 8, fill: 'surface/raised', stroke: 'border/subtle', r: 20, clip: true, h: H }); b.resize(W, H);
  const BW = o.bw || 190; const blk = rect(BW, H + 140, 'accent/gold-tint-strong', 0, 'Angled gold block'); b.appendChild(blk); blk.layoutPositioning = 'ABSOLUTE'; blk.rotation = -16; blk.x = W - BW + 68; blk.y = -40;
  const blk2 = rect(40, H + 140, 'brand/tint', 0, 'Angled mint stripe'); b.appendChild(blk2); blk2.layoutPositioning = 'ABSOLUTE'; blk2.rotation = -16; blk2.x = W - BW + 38; blk2.y = -30;
  const tk = await I(C.TK, { State: 'Active' }, { 'Show DEMO': false }); b.appendChild(tk); tk.layoutPositioning = 'ABSOLUTE'; tk.rescale(o.ts || 0.5); tk.rotation = 14; tk.x = o.tx != null ? o.tx : W - 130; tk.y = H - 100; tk.name = 'Entry ticket (cropped)';
  for (let i = 0; i < 4; i++) { const cn = ellipse(56, 18, i === 3 ? 'accent/gold' : 'accent/gold-strong', 'Coin ' + (i + 1)); stroke(cn, 'accent/gold-soft', 1); b.appendChild(cn); cn.layoutPositioning = 'ABSOLUTE'; cn.x = W - 72; cn.y = 64 - i * 9; }
  const ov = await T(o.over || 'GLOBAL POOL · ROUND #1,248', 'Overline', 'text/gold'); add(b, ov);
  const nr = ROW('Pool value', [], { gap: 6 }); const num = await T('186,400.00', o.ns || 'Number/L', 'accent/gold'); await gfill(num, 'Gradient/Gold Jackpot'); add(nr, num, await T('USDT', 'Label/M', 'text/secondary'), await DEMO('S')); add(b, nr);
  add(b, await T(o.sub || 'Draws 27 Nov 2026, 20:00 UTC\n10.00 USDT + 0.05 USDT fee per entry', 'Caption', 'text/secondary', { w: o.subw || 200 }));
  const sp = SPC(); add(b, sp); sp.layoutSizingVertical = 'FILL';
  add(b, ROW('Actions', [await BTN('Gold', o.cta || 'Participate', { size: 'S' }), await T('18+ · Terms apply', 'Caption', 'text/tertiary')], { gap: 12 }));
  return b;
}
async function NOTE(text, o = {}) { const n = AL('HORIZONTAL', { name: 'Annotation — ' + text.slice(0, 32), gap: 8, p: [10, 12, 10, 12], fill: 'status/info-tint', stroke: 'status/info', r: 10 }); if (o.n) add(n, await PIN(o.n)); else add(n, await IC('info', 16, 'text/info')); add(n, [await T(text, 'Caption', 'text/primary', { w: o.w || 300 }), 'FILL']); return n; }
async function PIN(n) { const p = AL('HORIZONTAL', { name: 'Pin ' + n, w: 22, h: 22, fill: 'status/info', r: 9999, align: 'CENTER', justify: 'CENTER' }); add(p, await T(String(n), 'Label/S', 'text/on-primary')); return p; }
async function PINAT(parent, n, x, y) { const p = await PIN(n); parent.appendChild(p); p.layoutPositioning = 'ABSOLUTE'; p.x = x; p.y = y; return p; }
async function BUL(text, o = {}) { const r = ROW('Rule — ' + text.slice(0, 30), [], { gap: 8, align: 'MIN' }); add(r, await IC(o.icon || 'check', 16, o.ic || 'icon/brand')); add(r, [await T(text, o.s || 'Body/S', 'text/secondary', { w: o.w || 400 }), 'FILL']); return r; }
function OVER(fr, o = {}) { const ov = figma.createFrame(); ov.name = o.name || 'Overlay — scrim'; fr.appendChild(ov); ov.layoutPositioning = 'ABSOLUTE'; ov.resize(fr.width, fr.height); ov.x = 0; ov.y = 0; fill(ov, o.scrim || 'scrim/overlay'); ov.clipsContent = true; return ov; }
async function SHEET(v, o = {}) { const ov = OVER(v, o); const s = AL('VERTICAL', { name: o.name || 'Bottom sheet', gap: o.gap ?? 16, p: [8, 16, 24, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: v.width }); s.setBoundVariable('topLeftRadius', VAR['radius/2xl']); s.setBoundVariable('topRightRadius', VAR['radius/2xl']); await fx(s, 'Elevation/4 — Modal'); ov.appendChild(s); const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [4, 0, 4, 0] }); add(g, rect(36, 4, 'border/strong', 9999, 'Handle')); add(s, [g, 'FILL']); return { ov, s }; }
function DOCK(ov, s) { s.x = 0; s.y = ov.height - s.height; }
async function DOC(id, name, w, o = {}) { const f = await FRAME(id, name, w, Object.assign({ demo: false }, o)); fill(f, 'surface/default'); stroke(f, 'border/subtle'); radius(f, 20); pad(f, 40); gap(f, 32); return f; }
async function DOCHEAD(f, title, sub, o = {}) { const h = COL('Doc header', [], { gap: 8 }); const r = ROW('Title row', [], { gap: 12 }); add(r, await T(o.tag || 'PATTERN', 'Overline', 'text/info'), await DEMO('M')); add(h, r, [await T(title, 'Heading/H2', 'text/primary', { w: f.width - 80 }), 'FILL'], [await T(sub, 'Body/M', 'text/secondary', { w: f.width - 80 }), 'FILL']); add(f, [h, 'FILL']); return h; }
// ===== END MOB KIT =====

// ---- MOB-02 part 2: Wallet, Account active + tab bar spec board ----
const RT2 = 'MOB-02 · Bottom tab bar states — Home, Pool, Games, Wallet, Account (P0)';
const RS2 = 'Nav/Mobile Tab Bar is the primary navigation below 768 px. One frame per active tab, each showing that destination’s real first screen in the 390 × 844 viewport. The bar stays visible on every primary screen; it hides only in full-screen game play and while the keyboard is open.';
const out = {};
async function tabScreen(name, active, body) { const f = await FRAME('MOB-02', name, 390, { rowTitle: RT2, rowSub: RS2 }); const v = VP(f); add(v, [await I(C.TOPM, { State: 'Member' }), 'FILL']); const c = SCROLL(v); await body(c); add(v, [await I(C.TAB, { Active: active }), 'FILL']); out[name] = f.id; return f; }
async function listRow(icon, title, sub, right, o = {}) { const r = ROW('Row — ' + title, [], { gap: 12, p: [12, 16, 12, 16] }); r.minHeight = 56; strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(r, await ICT(icon, o.ic || 'icon/default', 'surface/raised', 20, 6)); const t = COL('Text', [await T(title, 'Body/S Strong', o.tc || 'text/primary')], { gap: 2 }); if (sub) add(t, [await T(sub, 'Caption', 'text/tertiary', { w: 180 }), 'FILL']); add(r, [t, 'FILL']); if (right) add(r, right); if (!o.noChev) add(r, await IC('chevron-right', 20, 'icon/muted')); return r; }
// WALLET
const fW = await tabScreen('[MOB-02] Tab bar — Wallet active / 390 / Member', 'Wallet', async c => {
  add(c, [ROW('Title', [await T('Wallet', 'Heading/H3', 'text/primary'), await DEMO('M'), SPC(), await T('Updated 18:42 UTC', 'Caption', 'text/tertiary')], { gap: 8 }), 'FILL']); c.children[0].children[2].layoutSizingHorizontal = 'FILL';
  add(c, [await I(C.BB, { Layout: 'Compact' }), 'FILL']);
  const qa = ROW('Quick actions', [], { gap: 8 }); add(c, [qa, 'FILL']);
  for (const [ic, l, pri] of [['deposit', 'Deposit', true], ['withdraw', 'Withdraw'], ['history', 'History'], ['shield-check', 'Whitelist']]) { const b = COL('Action — ' + l, [await ICT(ic, pri ? 'text/on-primary' : 'icon/default', pri ? 'brand/primary' : 'surface/raised', 20, 10), await T(l, 'Label/S', 'text/primary')], { gap: 6, p: [12, 4, 12, 4], fill: 'surface/default', stroke: 'border/subtle', r: 14, align: 'CENTER' }); add(qa, [b, 'FILL']); }
  add(c, [await SECH('In progress', { demo: 'S' }), 'FILL']);
  const dp = CARD('DP-77412 pending', { gap: 8, p: 16 });
  add(dp, [ROW('Head', [await ICT('deposit', 'balance/pending', 'surface/raised', 18, 6), COL('T', [await T('Deposit · DP-77412', 'Body/S Strong'), await T('Ethereum · 7 / 12 confirmations · est. 2 min', 'Caption', 'text/tertiary')], { gap: 2 }), await T('+1,000.00', 'Number/S', 'text/success')], { gap: 10 }), 'FILL']); dp.children[0].children[1].layoutSizingHorizontal = 'FILL';
  const bar = AL('HORIZONTAL', { name: 'Confirmations 7/12', h: 6, fill: 'surface/raised', r: 9999, clip: true }); add(dp, [bar, 'FILL']); add(bar, rect(190, 6, 'balance/pending', 0, '7 of 12'));
  add(c, [dp, 'FILL']);
  const wd = CARD('WD-20931 under review', { gap: 8, p: 16 });
  add(wd, [ROW('Head', [await ICT('withdraw', 'text/warning', 'surface/raised', 18, 6), COL('T', [await T('Withdrawal · WD-20931', 'Body/S Strong'), await T('→ 0x7c4e…a21D · Arbitrum · you receive 1,499.92', 'Caption', 'text/tertiary')], { gap: 2 }), await T('−1,500.00', 'Number/S', 'text/danger')], { gap: 10 }), 'FILL']); wd.children[0].children[1].layoutSizingHorizontal = 'FILL';
  add(wd, ROW('Status', [await RB('Under review', 'Under review'), await T('AML screening · ETA < 4 h', 'Caption', 'text/tertiary')], { gap: 8 }));
  add(c, [wd, 'FILL']);
});
// ACCOUNT
const fA = await tabScreen('[MOB-02] Tab bar — Account active / 390 / Member', 'Account', async c => {
  const pc = CARD('Profile', { gap: 12, p: 16 });
  const av = await I(C.AV, { Size: 'L' }, { Initials: 'NK', 'Show status': false });
  add(pc, [ROW('Identity', [av, COL('Name', [ROW('Handle', [await T('@nova.k', 'Heading/H5'), await DEMO('XS')], { gap: 6 }), await T('Nova K. · GP-48213', 'Caption', 'text/tertiary'), ROW('Chips', [await I(C.VIP, { Tier: 'Gold', Size: 'S' }), await I(C.KYC, { Status: 'Approved', Level: 'L2' })], { gap: 6 })], { gap: 4 })], { gap: 12 }), 'FILL']);
  const vp = COL('VIP progress', [ROW('L', [await T('VIP Gold → Platinum', 'Label/S', 'text/secondary'), SPC(), await T('12,840 / 20,000 pts', 'Label/S', 'text/primary')], { gap: 6 })], { gap: 6 }); vp.children[0].children[1].layoutSizingHorizontal = 'FILL';
  const vb = AL('HORIZONTAL', { name: 'VIP bar 64%', h: 6, fill: 'surface/raised', r: 9999, clip: true }); add(vp, [vb, 'FILL']); add(vb, rect(208, 6, 'vip/gold', 0, 'Progress')); add(pc, [vp, 'FILL']);
  add(c, [pc, 'FILL']);
  const al = CARD('Security nudge', { dir: 'HORIZONTAL', gap: 12, p: [12, 12, 12, 16], fill: 'status/warning-tint', stroke: 'status/warning', align: 'CENTER' });
  add(al, await IC('shield-alert', 20, 'text/warning')); add(al, [COL('T', [await T('New device sign-in', 'Body/S Strong'), await T('Windows · Edge · Madrid · 25 Nov 2026', 'Caption', 'text/secondary')], { gap: 2 }), 'FILL']); add(al, await BTN('Secondary', 'Review', { size: 'S' })); add(c, [al, 'FILL']);
  const ls = CARD('Account menu', { gap: 0, p: 0 }); add(c, [ls, 'FILL']);
  const cnt = await I(C.CNT, { Size: 'S' }, { Count: '3' });
  for (const [ic, t, s, r, o] of [['shield', 'Security & 2FA', '2FA on · anti-phishing code set', null], ['id-card', 'Verification', 'KYC Level 2 — Verified', null], ['bell', 'Notifications', '3 unread', cnt], ['heart', 'Responsible gaming', 'Daily limit 500.00 USDT · reality check 60 min', null], ['history', 'Transaction history', 'Deposits, withdrawals, entries', null], ['crown', 'VIP Club', 'Gold · weekly reward 115.20 USDT owed', null], ['settings', 'Settings', 'English · Portugal', null], ['logout', 'Log out', null, null, { last: true, noChev: true, tc: 'text/danger', ic: 'text/danger' }]]) add(ls, [await listRow(ic, t, s, r, o || {}), 'FILL']);
});
// SPEC BOARD
const d = await DOC('MOB-02', '[MOB-02] Spec — Bottom tab bar states & rules / Board', 760, { rowTitle: RT2, rowSub: RS2 });
await DOCHEAD(d, 'Bottom tab bar — states & rules', 'Nav/Mobile Tab Bar (390 × 83: 49 tabs + 34 home-indicator inset). Five fixed destinations; one is active at a time. Shown here with every Active variant.');
const plate = AL('VERTICAL', { name: 'Variants plate', gap: 16, p: [24, 24, 24, 24], fill: 'bg/base', r: 14 }); add(d, [plate, 'FILL']);
for (const a of ['Home', 'Pool', 'Games', 'Wallet', 'Account']) add(plate, ROW('Variant ' + a, [await T('Active = ' + a, 'Label/S', 'text/tertiary', { w: 120 }), await I(C.TAB, { Active: a })], { gap: 24 }));
add(d, [await SECH('Tab item states'), 'FILL']);
const st = ROW('States', [], { gap: 12, align: 'MIN' }); add(d, [st, 'FILL']);
for (const [l, bg, ic, tc, desc] of [['Default', null, 'icon/muted', 'text/secondary', 'Muted icon + label'], ['Active', null, 'icon/brand', 'text/brand', 'Mint icon + label + 2 px top indicator; aria-current'], ['Pressed', 'surface/pressed', 'icon/default', 'text/primary', 'surface/pressed for 100 ms, then navigate'], ['Focus', null, 'icon/default', 'text/primary', '2 px border/focus ring (keyboard / switch access)']]) {
  const cell = COL('Cell ' + l, [await IC(l === 'Active' ? 'home' : 'games', 24, ic), await T(l === 'Active' ? 'Home' : 'Games', 'Caption', tc)], { gap: 2, w: 78, h: 49, align: 'CENTER', justify: 'CENTER', r: 10 }); if (bg) fill(cell, bg); if (l === 'Active') { const ind = rect(28, 2, 'brand/primary', 0, 'Top indicator'); cell.appendChild(ind); ind.layoutPositioning = 'ABSOLUTE'; ind.x = 25; ind.y = 0; } if (l === 'Focus') stroke(cell, 'border/focus', 2, 'OUTSIDE');
  const w = COL('State — ' + l, [ROW('Cell wrap', [cell], { p: 8, fill: 'bg/secondary', r: 10 }), await T(l, 'Label/M', 'text/primary'), await T(desc, 'Caption', 'text/tertiary', { w: 150 })], { gap: 6 }); add(st, [w, 'FILL']); }
add(d, [await SECH('Behaviour rules'), 'FILL']);
const rules = COL('Rules', [], { gap: 10 }); add(d, [rules, 'FILL']);
for (const t of ['Fixed order Home · Pool · Games · Wallet · Account; labels always visible, never icon-only. Each tab is 78 × 49 (≥ 44 × 44 target).', 'Re-tapping the active tab scrolls to top, then pops to the tab root; every tab keeps its own back stack.', 'Visible on all primary screens. Hidden in full-screen game play (landscape) and while the keyboard is open; bottom sheets and the full-screen menu cover it with the scrim.', 'Sticky CTAs (Participate on Pool, Place bet in games) sit directly above the tab bar, never on top of it.', 'Guests: Wallet and Account open the sign-in sheet instead of switching tabs; Home, Pool and Games stay browsable.', 'Account shows the unread-notification count (Badge/Count, max “9+”), announced as “Account, 3 unread”. No promotional badges or countdowns on tabs.', 'Active state never relies on colour alone: mint colour + top indicator + aria-current="page".']) add(rules, [await BUL(t, { w: 640 }), 'FILL']);
add(d, [await NOTE('Nav/Mobile Tab Bar has no Pressed or Focus variant yet — the two cells above are inline specs for engineering (logged as a component gap).', { w: 620 }), 'FILL']);
fitSection(sec);
for (const fr of [fW, fA]) await fr.screenshot({ scale: 0.8 });
await d.screenshot({ scale: 0.6 });
return { sec: sec.id, out, board: d.id, pos: [fW, fA, d].map(n => [Math.round(n.x), Math.round(n.y), Math.round(n.height)]), MISS };
