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

// ===== pub-p1c DESKTOP prelude (paste after helpers.js; art.js follows) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-24/25/26 Errors & PUB-06 Leaderboard', 70000, 0);
const OUT = { section: sec.id, created: {}, skipped: [], audits: [], notes: [] };
// returns true when the frame must be built (missing, or an incomplete fixed 800 px leftover that gets replaced)
function need(name) { const f = sec.children.find(c => c.name === name); if (!f) return true; if (Math.round(f.height) === 800 && f.primaryAxisSizingMode === 'FIXED') { f.remove(); OUT.notes.push('replaced incomplete ' + name); return true; } OUT.skipped.push(name + ' = ' + f.id); return false; }
function frameH(name, fb) { const f = sec.children.find(c => c.name === name); return f ? f.height : fb; }
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function setNav(sb, label) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { try { if (it.name === 'Item/Lobby') it.setProperties({ State: 'Default' }); if (label && it.name === 'Item/' + label) it.setProperties({ State: 'Active' }); } catch (e) { } } }
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w, clip: o.clip }); }
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841' };
async function shell(name, x, y, o = {}) {
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: o.auth || 'Guest' }); sb.name = 'Shell/Sidebar'; body.appendChild(sb); sb.layoutSizingVertical = 'FILL'; setNav(sb, o.nav);
  const col = AL('VERTICAL', { name: 'Column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: o.auth === 'Member' ? 'Member' : 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(col, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', p: [32, 32, 64, 32], gap: o.gap ?? 48 }); add(col, [content, 'FILL']);
  if (o.footer !== false) { const foot = await I('23:17478', { Breakpoint: 'Desktop' }); foot.name = 'Shell/Footer Mega'; add(col, [foot, 'FILL']); bnum(foot, 'paddingLeft', 32); bnum(foot, 'paddingRight', 32); }
  OUT.created[name] = f.id; return { f, body, col, content };
}
async function statusChip(kind, label, icon) { const m = { ok: ['check-circle', 'status/success-tint', 'text/success'], warn: ['alert-triangle', 'status/warning-tint', 'text/warning'], info: ['info', 'status/info-tint', 'text/info'], bad: ['x-circle', 'status/danger-tint', 'text/danger'], pause: ['pause-circle', 'status/warning-tint', 'text/warning'], work: ['wrench', 'status/info-tint', 'text/info'] }[kind]; const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: m[1], align: 'CENTER' }); add(c, await IC(icon || m[0], 14, m[2]), await T(label, 'Label/S', m[2])); return c; }
async function linkRow(label, icon = 'arrow-right') { const r = AL('HORIZONTAL', { name: 'Link — ' + label, gap: 6, align: 'CENTER' }); add(r, await T(label, 'Label/M', 'text/brand'), await IC(icon, 16, 'icon/brand')); return r; }
async function iconTile(ic, tint = 'brand/tint', col = 'icon/brand', size = 20) { const b = AL('HORIZONTAL', { name: 'Icon tile — ' + ic, fill: tint, r: 10, p: 10 }); add(b, await IC(ic, size, col)); return b; }
// quick-link card: icon, title, body, link
async function linkCard(ic, title, body, link, o = {}) { const c = box('Card — ' + title, { gap: 12, p: 20 }); add(c, await iconTile(ic, o.tint, o.ic)); const tr = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H5', 'text/primary')); if (o.demo) add(tr, await DEMO('XS')); add(c, [tr, 'FILL'], [await T(body, 'Body/S', 'text/secondary', { w: 220 }), 'FILL'], await linkRow(link)); return c; }
async function row4(C, cards) { const r = AL('HORIZONTAL', { name: 'Quick links', gap: 16 }); add(C, [r, 'FILL']); for (const c of cards) { add(r, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; } return r; }
async function sectionHead(over, title, body, right) { const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' }); const l = AL('VERTICAL', { gap: 6 }); add(row, [l, 'FILL']); add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H4', 'text/primary')); if (body) add(l, await T(body, 'Body/S', 'text/secondary', { w: 760 })); if (right) add(row, right); return row; }
async function kvList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 20, 4, 20], fill: o.fill, stroke: o.stroke }); for (let i = 0; i < rows.length; i++) { const [k, v, ro = {}] = rows[i]; const r = AL('HORIZONTAL', { name: 'Row — ' + k, gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: o.kw || 160 }), 'FILL']); const vv = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); if (ro.icon) add(vv, await IC(ro.icon, 14, ro.ic || 'icon/brand')); add(vv, await T(v, ro.mono ? 'Mono/S' : (ro.style || 'Label/M'), ro.color || 'text/primary')); if (ro.demo) add(vv, await DEMO('XS')); add(r, vv); add(l, [r, 'FILL']); } return l; }
async function compliance(C) { const v = AL('VERTICAL', { name: 'Trust & licence', gap: 16 }); add(C, [v, 'FILL']); const st = await I('25:16197'); st.name = 'Strip/Trust'; add(v, [st, 'FILL']); const lic = await I('6:158', { Variant: 'Inline' }); add(v, lic); return v; }
// hero banner (hug height, min 420) with angled colour blocks: returns { hero, copy }; place art after the copy is built
function placeArt(H, a, x, dy = 24) { abs(H, a, x, Math.round(Math.max(-12, (H.height - a.height) / 2 + dy))); return a; }
async function hero(C, name, o = {}) {
  const h = AL('HORIZONTAL', { name, fill: 'surface/default', r: 20, p: [48, 48, 48, 48], clip: true, align: 'CENTER' }); stroke(h, 'border/subtle'); add(C, [h, 'FILL']); h.minHeight = o.h || 420;
  const copy = AL('VERTICAL', { name: 'Copy', gap: 20, w: o.cw || 540 }); add(h, copy);
  abs(h, rect(560, 980, o.block || 'surface/raised', 0, 'Angled colour block'), o.bx ?? 700, -220, 14);
  abs(h, rect(44, 980, o.stripe || 'brand/primary', 0, 'Angled colour block — stripe'), (o.bx ?? 700) - 70, -220, 14);
  return { hero: h, copy };
}
function audit(f) { const fb = f.absoluteBoundingBox; const bad = []; for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) { const b = t.absoluteBoundingBox; if (!b || !t.visible) continue; let q = t.parent, art = false; while (q && q !== f) { if (q.name && q.name.startsWith('Object —')) { art = true; break; } q = q.parent; } if (art) continue; if (b.width < 2 || b.x < fb.x - 1 || b.x + b.width > fb.x + fb.width + 1) bad.push(t.name.slice(0, 32)); } OUT.audits.push({ id: f.id, name: f.name, h: Math.round(f.height), overflow: bad.slice(0, 8), n: bad.length }); }
// ===== end desktop prelude =====

// ===== pub-p1c ART — concrete casino objects as token-bound vectors (no glows / rings / sparkles) =====
// SVG placeholder colours are remapped to variables after import, so every vector paint is token-bound.
const ARTMAP = { '#F1F1F1': 'paper/50', '#BDBDBD': 'paper/300', '#141414': 'ink/900', '#2CD97D': 'brand/primary', '#1B7A4A': 'mint/700', '#E5484D': 'status/danger', '#8A2C2F': 'red/700', '#F4C96C': 'accent/gold', '#E9A044': 'accent/gold-strong' };
const ARTFB = { 'paper/50': 'text/primary', 'paper/300': 'text/tertiary', 'ink/900': 'bg/secondary', 'ink/700': 'text/on-primary', 'mint/700': 'brand/primary-strong', 'red/700': 'status/danger-strong' };
function cv(n) { return VAR[n] ? n : (ARTFB[n] && VAR[ARTFB[n]] ? ARTFB[n] : 'text/on-primary'); }
function __hex(c) { const h = v => Math.round(v * 255).toString(16).padStart(2, '0'); return ('#' + h(c.r) + h(c.g) + h(c.b)).toUpperCase(); }
function __near(hx) { let best = null, bd = 1e9; const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const a = p(hx); for (const k of Object.keys(ARTMAP)) { const b = p(k); const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); if (d < bd) { bd = d; best = k; } } return bd < 24 ? ARTMAP[best] : null; }
function svgArt(svg, name) {
  const f = figma.createNodeFromSvg(svg); f.name = name; f.fills = []; f.clipsContent = false; const miss = new Set();
  const swap = arr => arr.map(p => { if (p.type !== 'SOLID') return p; const k = ARTMAP[__hex(p.color)] || __near(__hex(p.color)); if (!k) { miss.add(__hex(p.color)); return p; } return paint(cv(k)); });
  for (const n of f.findAll(() => true)) {
    if ('fills' in n && Array.isArray(n.fills) && n.fills.length) n.fills = swap(n.fills);
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) n.strokes = swap(n.strokes);
  }
  if (miss.size && typeof OUT !== 'undefined') OUT.notes.push(name + ': unmapped colours ' + [...miss].join(','));
  return f;
}
function __die(tx, ty, rot) { const pip = (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#141414"/>`; return `<g transform="translate(${tx} ${ty}) rotate(${rot} 90 90)"><rect x="16" y="18" width="180" height="180" rx="34" fill="#BDBDBD"/><rect x="0" y="0" width="180" height="180" rx="34" fill="#F1F1F1"/>${pip(50, 50)}${pip(130, 50)}${pip(50, 130)}${pip(130, 130)}</g>`; }
// 404: "4 · 0 · 4" spelled by two dice and a cracked mint casino chip (+ a broken-off chip fragment)
function art404() {
  let spots = ''; for (let a = 0; a < 360; a += 45) spots += `<rect x="-15" y="-112" width="30" height="40" rx="6" fill="#F1F1F1" transform="rotate(${a})"/>`;
  const svg = `<svg width="640" height="430" viewBox="0 0 640 430" xmlns="http://www.w3.org/2000/svg">${__die(30, 150, -16)}<g transform="translate(330 205)"><circle cx="0" cy="14" r="112" fill="#1B7A4A"/><circle cx="0" cy="0" r="112" fill="#2CD97D"/>${spots}<circle cx="0" cy="0" r="74" fill="#1B7A4A"/><ellipse cx="0" cy="0" rx="28" ry="40" fill="none" stroke="#F1F1F1" stroke-width="16"/><polyline points="-6,-118 10,-72 -12,-38 12,-4 -8,30 10,68 -4,122" fill="none" stroke="#141414" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(430 336) rotate(18)"><polygon points="0,0 34,-6 40,22 8,30" fill="#1B7A4A"/><polygon points="0,-6 34,-12 40,16 8,24" fill="#2CD97D"/></g>${__die(470, 96, 14)}</svg>`;
  return svgArt(svg, 'Art — two dice + cracked chip (404)');
}
// 500: slot machine with a drooping lever, its power cable unplugged from the wall socket
function art500() {
  const svg = `<svg width="620" height="450" viewBox="0 0 620 450" xmlns="http://www.w3.org/2000/svg"><rect x="74" y="34" width="300" height="372" rx="30" fill="#8A2C2F"/><rect x="60" y="24" width="300" height="372" rx="30" fill="#E5484D"/><rect x="88" y="48" width="244" height="60" rx="14" fill="#F1F1F1"/><rect x="108" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="242" y="72" width="70" height="12" rx="6" fill="#BDBDBD"/><rect x="200" y="58" width="20" height="28" rx="6" fill="#141414"/><rect x="200" y="90" width="20" height="10" rx="5" fill="#141414"/><rect x="88" y="126" width="244" height="130" rx="16" fill="#141414"/><rect x="100" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="176" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="252" y="138" width="68" height="106" rx="10" fill="#F1F1F1"/><rect x="116" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="192" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="268" y="185" width="36" height="12" rx="6" fill="#BDBDBD"/><rect x="88" y="274" width="244" height="44" rx="12" fill="#141414"/><circle cx="128" cy="296" r="11" fill="#BDBDBD"/><circle cx="168" cy="296" r="11" fill="#BDBDBD"/><circle cx="208" cy="296" r="11" fill="#BDBDBD"/><rect x="244" y="286" width="72" height="20" rx="10" fill="#BDBDBD"/><rect x="108" y="336" width="204" height="40" rx="12" fill="#141414"/><rect x="356" y="222" width="36" height="60" rx="10" fill="#BDBDBD"/><g transform="rotate(34 384 252)"><rect x="376" y="102" width="16" height="152" rx="8" fill="#BDBDBD"/><circle cx="384" cy="96" r="26" fill="#F1F1F1"/></g><path d="M300 396 C 300 436, 396 438, 438 404" fill="none" stroke="#141414" stroke-width="12" stroke-linecap="round"/><rect x="434" y="384" width="56" height="40" rx="10" fill="#BDBDBD"/><rect x="490" y="392" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="490" y="408" width="24" height="7" rx="3" fill="#BDBDBD"/><rect x="552" y="350" width="72" height="96" rx="14" fill="#F1F1F1"/><rect x="570" y="384" width="9" height="20" rx="3" fill="#141414"/><rect x="596" y="384" width="9" height="20" rx="3" fill="#141414"/></svg>`;
  return svgArt(svg, 'Art — unplugged slot machine (500)');
}
// Maintenance: open-end wrench + hex nut (vectors); the ticket stub is built from real text layers (see ticket()).
function artWrench() { return svgArt(`<svg width="160" height="420" viewBox="0 0 160 420" xmlns="http://www.w3.org/2000/svg"><path d="M20 10 L20 70 Q20 110 60 110 L60 400 Q60 418 80 418 Q100 418 100 400 L100 110 Q140 110 140 70 L140 10 L112 10 L112 62 L48 62 L48 10 Z" fill="#BDBDBD"/><circle cx="80" cy="372" r="11" fill="#141414"/></svg>`, 'Art — open-end wrench'); }
function artNut() { return svgArt(`<svg width="120" height="110" viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg"><polygon points="30,4 90,4 118,55 90,106 30,106 2,55" fill="#BDBDBD"/><circle cx="60" cy="55" r="24" fill="#141414"/></svg>`, 'Art — hex nut'); }
// Leaderboard: trophy cup (gold = prize moment)
function artTrophy() { return svgArt(`<svg width="300" height="320" viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg"><path d="M70 40 H32 Q20 40 20 58 Q20 122 84 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M230 40 H268 Q280 40 280 58 Q280 122 216 142" fill="none" stroke="#E9A044" stroke-width="16" stroke-linecap="round"/><path d="M70 20 H230 V110 Q230 190 150 202 Q70 190 70 110 Z" fill="#F4C96C"/><path d="M104 44 Q100 120 140 168" fill="none" stroke="#F1F1F1" stroke-width="10" stroke-linecap="round"/><rect x="130" y="196" width="40" height="50" fill="#E9A044"/><rect x="90" y="240" width="120" height="30" rx="8" fill="#F4C96C"/><rect x="70" y="266" width="160" height="44" rx="10" fill="#141414"/><rect x="104" y="280" width="92" height="16" rx="4" fill="#BDBDBD"/></svg>`, 'Art — trophy cup'); }
// Ticket stub with real text: "Back at 02:30 UTC" + stub "WITHDRAWALS OPEN"
async function ticket(scale = 1) {
  const t = AL('HORIZONTAL', { name: 'Object — maintenance ticket stub', fill: cv('paper/50'), r: 14, clip: true });
  const m = AL('VERTICAL', { name: 'Ticket main', p: [24, 24, 24, 28], gap: 6 });
  add(m, await T('MAINTENANCE WINDOW', 'Overline', cv('ink/700')), await T('Back at 02:30 UTC', 'Heading/H3', 'text/on-primary'), await T('Tue 1 Dec 2026 · 02:00–02:30 UTC', 'Body/S', cv('ink/700')), await T('Notice AN-88', 'Mono/S', cv('ink/700')));
  const perf = AL('VERTICAL', { name: 'Perforation', p: [10, 0, 10, 0], gap: 10, justify: 'CENTER' }); for (let i = 0; i < 9; i++) perf.appendChild(ellipse(8, 8, cv('paper/300'), 'Hole'));
  const s = AL('VERTICAL', { name: 'Ticket stub', p: [24, 24, 24, 20], gap: 4, justify: 'CENTER' });
  add(s, await T('WITHDRAWALS', 'Overline', cv('ink/700')), await T('OPEN', 'Heading/H3', cv('mint/700')));
  add(t, m, perf, s); perf.layoutSizingVertical = 'FILL'; s.layoutSizingVertical = 'FILL';
  if (scale !== 1) t.rescale(scale);
  return t;
}
// ===== end ART =====

// ===== d2: [PUB-26] Maintenance / 1440 / Scheduled — in progress (Guest, focused page) =====
const NM = '[PUB-26] Maintenance / 1440 / Scheduled window — in progress, withdrawals available';
const shots = [];
async function bullet(ic, col, title, body) { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12, p: [10, 0, 10, 0] }); add(r, await IC(ic, 20, col)); const t = AL('VERTICAL', { gap: 2 }); add(t, [await T(title, 'Body/M Strong', 'text/primary', { w: 300 }), 'FILL']); if (body) add(t, [await T(body, 'Body/S', 'text/secondary', { w: 300 }), 'FILL']); add(r, [t, 'FILL']); return r; }
async function col3(title, chip, items) { const c = box('Column — ' + title, { gap: 4, p: 24 }); const h = AL('VERTICAL', { gap: 8, p: [0, 0, 8, 0] }); add(h, chip, await T(title, 'Heading/H4', 'text/primary')); add(c, [h, 'FILL']); for (const it of items) add(c, [await bullet(...it), 'FILL']); return c; }
if (need(NM)) {
  const f = await screen(NM, 1440, {}); sec.appendChild(f); f.x = 3240; f.y = 160; OUT.created[NM] = f.id;
  add(f, [await DEMOBAR(), 'FILL']);
  // slim focused top bar (navigation to paused areas removed during maintenance)
  const bar = AL('HORIZONTAL', { name: 'Top bar — maintenance mode', fill: 'bg/secondary', p: [12, 100, 12, 100], gap: 16, align: 'CENTER' }); strokeSides(bar, 'border/subtle', { b: 1 }); add(f, [bar, 'FILL']);
  const logo = await I('4:797'); logo.name = 'Brand/Logo'; add(bar, logo, await statusChip('work', 'Scheduled maintenance', 'wrench'));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bar, [sp, 'FILL']);
  add(bar, await BTN('Ghost', 'Status page', { size: 'S', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Support', { size: 'S', lead: 'chat' }), await BTN('Secondary', 'Sign in', { size: 'S', lead: 'log-in' }));
  const C = AL('VERTICAL', { name: 'Content', p: [40, 100, 64, 100], gap: 40 }); add(f, [C, 'FILL']);
  const { hero: H, copy } = await hero(C, 'Hero — maintenance in progress', { cw: 580, bx: 860 });
  const ov = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); add(ov, await statusChip('work', 'In progress · updated 02:12 UTC', 'wrench'), await T('SCHEDULED MAINTENANCE', 'Overline', 'text/brand')); add(copy, ov);
  add(copy, [await T('We’re upgrading the tables', 'Heading/H1', 'text/primary', { w: 580 }), 'FILL']);
  add(copy, [await T('Games are paused from 02:00 to 02:30 UTC on Tue 1 Dec 2026 while we move our game servers. Withdrawals remain available the whole time — sign in and withdraw as usual.', 'Body/L', 'text/secondary', { w: 580 }), 'FILL']);
  const win = AL('VERTICAL', { name: 'Maintenance window', fill: 'surface/raised', r: 14, p: 20, gap: 14 }); stroke(win, 'border/default');
  const wr = AL('HORIZONTAL', { name: 'Window times', gap: 24 });
  for (const [k, v] of [['Started', '02:00 UTC'], ['Expected back', '02:30 UTC'], ['Your time (Lisbon)', '02:00–02:30 WET']]) { const c = AL('VERTICAL', { gap: 4 }); add(c, await T(k, 'Caption', 'text/tertiary'), await T(v, 'Number/S', 'text/primary')); add(wr, [c, 'FILL']); }
  add(win, [wr, 'FILL']);
  const track = AL('HORIZONTAL', { name: 'Progress — 12 of 30 min', fill: 'surface/default', r: 9999, h: 8, clip: true }); add(track, rect(216, 8, 'brand/primary', 9999, 'Elapsed 40%')); add(win, [track, 'FILL']);
  const wc = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(wc, [await T('Back in about 18 min (12 of 30 min done). If it runs late we post the new time here and on the status page.', 'Caption', 'text/secondary', { w: 480 }), 'FILL'], await DEMO('XS')); add(win, [wc, 'FILL']);
  add(copy, [win, 'FILL']);
  const acts = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(acts, await BTN('Primary', 'Sign in to withdraw', { size: 'L', lead: 'withdraw' }), await BTN('Secondary', 'Status page', { size: 'L', lead: 'activity', trail: 'external-link' }), await BTN('Ghost', 'Contact support', { size: 'L', lead: 'chat' })); add(copy, acts);
  // objects: ticket stub + wrench + nut, cropped by the banner edge
  const tk = await ticket(); abs(H, tk, 700, 150, 8);
  const wrn = artWrench(); abs(H, wrn, 1060, -30, -32);
  const nut = artNut(); abs(H, nut, 1000, Math.round(H.height) - 120, 12);
  // what works / paused / your money
  const r3 = AL('HORIZONTAL', { name: 'Impact', gap: 16 }); add(C, [r3, 'FILL']);
  const a1 = await col3('Available now', await statusChip('ok', 'Operational'), [
    ['withdraw', 'icon/brand', 'Withdrawals on all 5 networks', 'Normal limits, fees and security checks. WD requests are processed as usual.'],
    ['log-in', 'icon/brand', 'Sign-in, account & security', 'Change limits, 2FA and whitelisted addresses.'],
    ['heart', 'icon/brand', 'Responsible gaming tools', 'Limits, cooling-off and self-exclusion work as normal.'],
    ['chat', 'icon/brand', 'Live support', '24/7 chat and support@globalpool.example.']]);
  const a2 = await col3('Paused until 02:30 UTC', await statusChip('pause', 'Maintenance'), [
    ['games', 'icon/muted', 'Originals & table games', 'New bets are paused. Rounds open at 02:00 UTC were settled first.'],
    ['deposit', 'icon/muted', 'Deposit crediting', 'Deposits are still detected on-chain and credited automatically after 02:30 UTC — don’t send twice.'],
    ['gift', 'icon/muted', 'Promotion deadlines', 'Daily-reward streaks and mission deadlines inside the window are extended by 30 min.']]);
  const a3 = await col3('Your balance & Global Pool', await statusChip('info', 'Unchanged'), [
    ['shield-check', 'icon/brand', 'Balances don’t move', 'Nothing is debited, locked or expired by the maintenance.'],
    ['pool', 'icon/gold', 'No round is affected', 'Round #1,252 opens 1 Dec 2026, 08:00 UTC as scheduled; the last draw settled 30 Nov, 20:02 UTC.'],
    ['history', 'icon/brand', 'Game history is complete', 'Every settled bet keeps its seeds and result for verification.']]);
  for (const c of [a1, a2, a3]) { add(r3, [c, 'FILL']); c.layoutSizingVertical = 'FILL'; }
  // updates + service status
  const r2 = AL('HORIZONTAL', { name: 'Updates & status', gap: 16 }); add(C, [r2, 'FILL']);
  const up = box('Live updates', { gap: 0, p: 24 }); const uh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 12, 0] }); add(uh, [await T('Live updates', 'Heading/H4', 'text/primary'), 'FILL'], await DEMO('M')); add(up, [uh, 'FILL']);
  const ups = [['02:12 UTC', 'info', 'Game servers 3 of 5 migrated — on schedule for 02:30 UTC.'], ['02:00 UTC', 'work', 'Maintenance started. New bets paused after open rounds settled; withdrawals online.'], ['01:45 UTC', 'info', 'In-app reminder: games pause in 15 minutes.'], ['26 Nov 2026, 10:00 UTC', 'info', 'Announced 5 days ahead by email and in-app (notice AN-88).']];
  for (let i = 0; i < ups.length; i++) { const [tm, k, msg] = ups[i]; const r = AL('HORIZONTAL', { name: 'Update — ' + tm, gap: 16, p: [12, 0, 12, 0] }); if (i < ups.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); const tl = AL('VERTICAL', { gap: 6, w: 190 }); add(tl, await T(tm, 'Mono/S', 'text/tertiary'), await statusChip(k, k === 'work' ? 'Started' : 'Update', k === 'work' ? 'wrench' : 'info')); add(r, tl, [await T(msg, 'Body/M', 'text/primary', { w: 400 }), 'FILL']); add(up, [r, 'FILL']); }
  const ss = box('Service status', { gap: 0, p: 24, w: 480 }); const sh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 12, 0] }); add(sh, [await T('Service status', 'Heading/H4', 'text/primary'), 'FILL'], await linkRow('status.globalpool.example', 'external-link')); add(ss, [sh, 'FILL']);
  const svc = [['Withdrawals', 'ok', 'Operational'], ['Sign-in & account', 'ok', 'Operational'], ['Deposits', 'warn', 'Credited after 02:30'], ['Originals & table games', 'pause', 'Maintenance'], ['Global Pool', 'info', 'Next round 08:00 UTC'], ['Live support', 'ok', 'Operational']];
  for (let i = 0; i < svc.length; i++) { const [n, k, l] = svc[i]; const r = AL('HORIZONTAL', { name: 'Service — ' + n, gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(n, 'Body/M', 'text/primary', { w: 200 }), 'FILL'], await statusChip(k, l)); add(ss, [r, 'FILL']); }
  const nets = AL('HORIZONTAL', { name: 'Networks — withdrawals', gap: 8, p: [14, 0, 0, 0], wrap: true, cgap: 8, align: 'CENTER' });
  for (const ch of ['BNB Chain', 'Polygon', 'Arbitrum', 'Ethereum', 'Solana']) { const np = await I('9:377', { Chain: ch, Status: 'Operational' }, { 'Show status label': false, 'Show chevron': false }); add(nets, np); }
  add(ss, [nets, 'FILL']);
  add(r2, [up, 'FILL'], ss); up.layoutSizingVertical = 'FILL'; ss.layoutSizingVertical = 'FILL';
  const lic = AL('HORIZONTAL', { name: 'Licence & 18+', gap: 16, align: 'CENTER' }); add(lic, [await I('6:158', { Variant: 'Inline' }), 'FILL'], await I('6:159')); add(C, [lic, 'FILL']);
  const ft = AL('HORIZONTAL', { name: 'Footer — compact (maintenance mode)', fill: 'bg/secondary', p: [24, 100, 24, 100], gap: 24, align: 'CENTER' }); strokeSides(ft, 'border/subtle', { t: 1 });
  add(ft, [await T('© 2026 GLOBAL POOL · Available only in permitted jurisdictions · Play responsibly', 'Caption', 'text/tertiary', { w: 520 }), 'FILL']);
  for (const l of ['Terms', 'Privacy', 'Responsible gaming', 'Restricted countries']) add(ft, await T(l, 'Label/S', 'text/secondary'));
  add(ft, await I('6:159')); add(f, [ft, 'FILL']);
  audit(f); shots.push(f);
}
fitSection(sec);
for (const f of shots) await f.screenshot({ scale: 0.5 });
return OUT;
