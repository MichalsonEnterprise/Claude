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
// ===== RG KIT (USR-RG agent) =====
function tk(n, fb = 'surface/raised') { return VAR[n] ? n : fb; }
async function txt(node, from, to) { let n = 0; for (const t of node.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(from)) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = t.characters.split(from).join(to); n++; } } return n; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 24, fill: tk(o.fill || 'surface/default'), stroke: tk(o.stroke || 'border/subtle', 'border/default'), r: o.r ?? 14 }); }
function meter(w, pct, color = 'brand/primary', h = 8) { const tr = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, w, h, clip: true }); tr.appendChild(rect(Math.max(6, Math.round(w * pct)), h, color, 9999, 'Meter fill')); return tr; }
async function iconTile(icon, color = 'icon/brand', s = 40, fillTok = 'surface/raised') { const t = AL('HORIZONTAL', { name: 'Icon tile', w: s, h: s, fill: fillTok, r: 10, align: 'CENTER', justify: 'CENTER' }); t.appendChild(await IC(icon, Math.round(s / 2), color)); return t; }
async function chip(icon, label, tone = 'success') { const c = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 4, p: [4, 10, 4, 8], fill: tk('status/' + tone + '-tint'), r: 9999, align: 'CENTER' }); c.appendChild(await IC(icon, 14, tk('status/' + tone, 'icon/default'))); c.appendChild(await T(label, 'Label/S', tk('status/' + tone, 'text/secondary'))); return c; }
async function tag(label) { const c = AL('HORIZONTAL', { name: 'Tag — ' + label, p: [4, 10, 4, 10], fill: 'surface/raised', stroke: 'border/subtle', r: 9999 }); c.appendChild(await T(label, 'Label/S', 'text/secondary')); return c; }
async function noteBox(icon, text, tone, w) { const b = AL('HORIZONTAL', { name: 'Note — ' + tone, gap: 8, p: 12, fill: tk('status/' + tone + '-tint'), r: 10 }); b.appendChild(await IC(icon, 16, tk('status/' + tone, 'icon/default'))); const t = await T(text, 'Body/S', 'text/primary', { w: w - 48 }); add(b, [t, 'FILL']); return b; }
async function secHead(title, sub, w = 900) { const s = AL('VERTICAL', { name: 'Section header — ' + title, gap: 4 }); s.appendChild(await T(title, 'Heading/H4', 'text/primary')); if (sub) s.appendChild(await T(sub, 'Body/S', 'text/secondary', { w })); return s; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: o.p ?? [12, 0, 12, 0] }); const l = await T(label, 'Body/S', 'text/secondary'); add(r, [l, 'FILL']); const v = await T(value, o.style || 'Body/S Strong', o.color || 'text/primary'); r.appendChild(v); if (o.demo !== false) r.appendChild(await DEMO('XS')); if (o.divider !== false) strokeSides(r, 'border/subtle', { b: 1 }); return r; }
async function bullet(icon, title, body, w, color = 'icon/brand') { const r = AL('HORIZONTAL', { name: 'Item — ' + title, gap: 12 }); r.appendChild(await iconTile(icon, color, 32)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(title, 'Body/S Strong', 'text/primary', { w: w - 44 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: w - 44 }), 'FILL']); return r; }
const TABS = ['Overview', 'Deposit limits', 'Participation limits', 'Time limits', 'Reality checks', 'Cooling-off', 'Self-exclusion'];
function scrimOver(f, tok = 'scrim/overlay') { const s = rect(f.width, f.height, tok, 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
function byName(sec, name) { return sec.children.find(c => c.name === name); }
async function noDeposit(root) { for (const b of root.findAllWithCriteria({ types: ['INSTANCE'] })) { const p = b.componentProperties; const lk = Object.keys(p).find(x => x.startsWith('Label')); if (lk && p[lk].value === 'Deposit' && p.State) b.setProperties({ State: 'Disabled' }); } }
// ===== END RG KIT =====
// ===== RG MOBILE KIT =====
async function shellM(name, tab, o = {}) {
  const f = await screen(name, 390, {}); add(f, [await DEMOBAR(), 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); add(f, [tb, 'FILL']); if (o.noDeposit) { try { await noDeposit(tb); } catch (e) {} }
  if (o.banner) add(f, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  if (o.bare) return { f, tb, C };
  C.appendChild(await BTN('Ghost', tab === 'Overview' ? 'Account' : 'Responsible gaming', { size: 'S', lead: 'chevron-left' }));
  const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(C, [tt, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tt, [tr, 'FILL']); add(tr, [await T(o.title || 'Responsible gaming', 'Heading/H3', 'text/primary'), 'FILL']); tr.appendChild(await I('6:159'));
  if (o.sub) add(tt, [await T(o.sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const pills = AL('HORIZONTAL', { name: 'RG sub-nav (scrolls)', gap: 8, w: 358, clip: true }); C.appendChild(pills); pills.layoutSizingHorizontal = 'FILL';
  const idx = Math.max(0, TABS.indexOf(tab) - 1);
  for (const t of TABS.slice(idx).concat(TABS.slice(0, idx))) { const p = await I('20:6895', { State: t === tab ? 'Active' : 'Default' }, { Label: t, 'Show icon': false }); p.name = 'Pill — ' + t; pills.appendChild(p); }
  return { f, tb, C };
}
async function endM(S, o = {}) {
  if (o.cta) { const b = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(S.f, [b, 'FILL']); for (const x of o.cta) add(b, [x, 'FILL']); }
  const tab = await I('22:5413', { Active: 'Account' }); add(S.f, [tab, 'FILL']); return tab;
}
async function licM(C) { const l = await I('6:158', { Variant: 'Compact' }); add(C, [l, 'FILL']); return l; }
async function sheetM(f, title, sub, build) {
  scrimOver(f);
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 16, p: [12, 16, 32, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER' }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('VERTICAL', { name: 'Header', gap: 4 }); add(sh, [hd, 'FILL']); add(hd, [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (sub) add(hd, [await T(sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  await build(sh);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = f.height - sh.height; return sh;
}
async function placeM(f, sec, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
// ===== END RG MOBILE KIT =====
// ===== RG FIX LIB =====
async function setExact(root, map) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { const c = t.characters; if (Object.prototype.hasOwnProperty.call(map, c)) { for (const f of t.getRangeAllFontNames(0, c.length)) await figma.loadFontAsync(f); t.characters = map[c]; n++; } } return n; }
async function setPeriod(ls, to) {
  const log = []; const lt = i => i.findAllWithCriteria({ types: ['TEXT'] })[0];
  for (const it of ls.findAllWithCriteria({ types: ['INSTANCE'] })) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } for (const [k, v] of Object.entries(cp)) { if (v.type === 'VARIANT' && v.value === 'Daily') { try { it.setProperties({ [k]: to }); log.push('prop ' + it.name + ' ' + k); } catch (e) { log.push('err ' + e.message); } } } }
  if (log.length) return log;
  const items = ls.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => { const t = i.findAllWithCriteria({ types: ['TEXT'] }); return t.length === 1 && ['Daily', 'Weekly', 'Monthly'].includes(t[0].characters); });
  const d = items.find(i => lt(i).characters === 'Daily'); const w = items.find(i => lt(i).characters === to);
  if (d && w) { const vd = {}, vw = {}; for (const [k, v] of Object.entries(d.componentProperties)) if (v.type === 'VARIANT') vd[k] = v.value; for (const [k, v] of Object.entries(w.componentProperties)) if (v.type === 'VARIANT') vw[k] = v.value; d.setProperties(vw); w.setProperties(vd); log.push('swap ' + JSON.stringify(vd) + ' ' + JSON.stringify(vw));
    for (const [i, lab] of [[d, 'Daily'], [w, to]]) { const t = lt(i); if (t && t.characters !== lab) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = lab; } } }
  else log.push('no items: ' + items.length);
  return log;
}
function setMeter(ls, pct) { const out = []; for (const n of ls.findAll(x => /fill/i.test(x.name) && (x.type === 'RECTANGLE' || x.type === 'FRAME') && x.parent && x.parent.type !== 'INSTANCE' && x.parent.width > 100 && x.height <= 12)) { const pw = n.parent.width; try { if (n.parent.layoutMode && n.parent.layoutMode !== 'NONE') n.layoutSizingHorizontal = 'FIXED'; n.resize(Math.max(6, Math.round(pw * pct)), n.height); out.push(n.name + ' ' + Math.round(n.width) + '/' + Math.round(pw)); } catch (e) { out.push('err ' + n.name + ' ' + e.message); } } return out; }
function meterInfo(ls) { return ls.findAll(n => /fill|progress|bar|meter|track/i.test(n.name) && n.type !== 'TEXT').slice(0, 8).map(n => n.name + ':' + n.type + ':' + Math.round(n.width) + 'x' + Math.round(n.height) + '/' + (n.parent ? n.parent.name + ':' + Math.round(n.parent.width) : '')); }
function trackFill(ls, pct) { const tr = ls.findOne(n => n.name === 'Track'); if (!tr || !('children' in tr) || !tr.children.length) return 'no track'; const f = tr.children[0]; try { if (tr.layoutMode && tr.layoutMode !== 'NONE') f.layoutSizingHorizontal = 'FIXED'; f.resize(Math.max(6, Math.round(tr.width * pct)), f.height); return f.name + ' ' + Math.round(f.width) + '/' + Math.round(tr.width); } catch (e) { return 'err ' + e.message; } }
async function setContains(root, sub, to) { let n = 0; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { if (t.characters.includes(sub)) { for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = to; n++; } } return n; }
async function fixSE(sc) {
  const out = {};
  out.a = await setExact(sc, { 'Create a password': 'Enter your current password', 'you@example.com': 'SELF-EXCLUDE' });
  out.b = await setContains(sc, '6-digit', 'Capital letters, exactly as shown, so nobody confirms by accident.');
  const ty = sc.children.find(c => c.type === 'INSTANCE' && c.findAllWithCriteria({ types: ['TEXT'] }).some(t => t.characters.startsWith('Type SELF-EXCLUDE')));
  if (ty) { const cp = ty.componentProperties; const hide = {}; for (const [k, v] of Object.entries(cp)) if (v.type === 'BOOLEAN' && /lead|icon/i.test(k) && !/trail/i.test(k)) hide[k] = false; if (Object.keys(hide).length) { ty.setProperties(hide); out.c = Object.keys(hide); } else { const ic = ty.findAll(n => n.type === 'INSTANCE' && /icon|mail/i.test(n.name)); for (const i of ic) i.visible = false; out.c = ic.map(i => i.name); } }
  return out;
}
// ===== END RG FIX LIB =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('USR — Mobile F', 126000, 0);
const existing = sec.children.map(c => c.name + ' | ' + c.id + ' | ' + Math.round(c.width) + 'x' + Math.round(c.height));
async function fixD() { const out = {}; const f = await figma.getNodeByIdAsync('126:62954'); if (f) { const sc = f.findOne(n => n.name.startsWith('Self-Exclusion Step — Confirm')); out.se = await fixSE(sc); try { await f.screenshot({ scale: 0.5 }); } catch (e) { out.shot = e.message; } } const f4 = await figma.getNodeByIdAsync('126:63670'); if (f4) { try { await f4.screenshot({ scale: 0.5 }); } catch (e) { out.shot4 = e.message; } } return out; }
async function m1() {
const NAME = '[USR-RG1] Responsible Gaming Hub / 390 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellM(NAME, 'Overview', { sub: 'Lowering a limit applies at once. Raising one waits 24 hours.' });
const C = S.C; const W = 358;
const td = card('Card — Today', { gap: 12, p: 16 }); add(C, [td, 'FILL']);
const tdh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(td, [tdh, 'FILL']); tdh.appendChild(await IC('timer', 16, 'icon/brand')); add(tdh, [await T('This session 00:42:18', 'Label/M', 'text/primary'), 'FILL']); tdh.appendChild(await DEMO('XS'));
const tv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); add(td, [tv, 'FILL']); add(tv, [await T('Net today', 'Body/S', 'text/secondary'), 'FILL']); tv.appendChild(await T('−24.60 USDT', 'Number/S', 'text/danger'));
add(td, [meter(W - 32, 0.123), 'FILL']); add(td, [await T('Daily loss limit 24.60 of 200.00 USDT used', 'Caption', 'text/tertiary'), 'FILL']);
C.appendChild(await secHead('Your limits', 'Daily limits reset at 00:00 UTC.', W));
const lst = AL('VERTICAL', { name: 'Limits list', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: [4, 16, 4, 16] }); add(C, [lst, 'FILL']);
async function lrow(icon, t, v, st, last) { const r = AL('HORIZONTAL', { name: 'Row — ' + t, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!last) strokeSides(r, 'border/subtle', { b: 1 }); r.appendChild(await iconTile(icon, 'icon/brand', 36)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); tx.appendChild(await T(t, 'Body/S Strong', 'text/primary')); const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); tx.appendChild(vr); vr.appendChild(await T(v, 'Caption', 'text/secondary')); vr.appendChild(await DEMO('XS')); if (st) r.appendChild(st); r.appendChild(await IC('chevron-right', 20, 'icon/muted')); return r; }
add(lst, [await lrow('deposit', 'Deposit limit', '5,000.00 USDT / week · 3,500.00 used', await chip('clock', 'Pending', 'pending')), 'FILL']);
add(lst, [await lrow('ticket', 'Participation limit', '500.00 / day · 351.75 used'), 'FILL']);
add(lst, [await lrow('trending-down', 'Loss limit', '200.00 / day · −24.60 today'), 'FILL']);
add(lst, [await lrow('timer', 'Time limit', '2 h / day · 1 h 12 min today'), 'FILL']);
add(lst, [await lrow('bell', 'Reality checks', 'Every 60 min · next 17:00 UTC', null, true), 'FILL']);
add(C, [await noteBox('hourglass', 'Deposit limit increase to 7,500.00 starts 28 Nov 2026, 16:42 UTC. Cancel any time before then.', 'pending', W), 'FILL']);
C.appendChild(await secHead('Need a pause?', 'Withdrawals stay open during both.', W));
async function pc(icon, t, b, tags, btn) { const c = card('Card — ' + t, { gap: 12, p: 16 }); const h = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(c, [h, 'FILL']); h.appendChild(await iconTile(icon, 'icon/default', 40)); add(h, [await T(t, 'Heading/H5', 'text/primary'), 'FILL']); add(c, [await T(b, 'Body/S', 'text/secondary', { w: W - 32 }), 'FILL']); const tg = AL('HORIZONTAL', { name: 'Options', gap: 8, wrap: true, cgap: 8 }); add(c, [tg, 'FILL']); for (const x of tags) tg.appendChild(await tag(x)); const bb = await BTN('Secondary', btn, { size: 'L' }); add(c, [bb, 'FILL']); return c; }
add(C, [await pc('pause-circle', 'Take a short break', 'Pause games, Global Pool entries and deposits.', ['24 hours', '7 days', '30 days'], 'Choose a break'), 'FILL']);
add(C, [await pc('ban', 'Self-exclusion', 'Close access for a long period. Balance stays withdrawable, marketing stops.', ['6 months', '1 year', '5 years', 'Permanent'], 'Learn about self-exclusion'), 'FILL']);
const help = await I('24:14743'); add(C, [help, 'FILL']);
await licM(C);
await endM(S);
await placeM(S.f, sec, 120, 160);
await S.f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: S.f.id, name: NAME, h: Math.round(S.f.height), helpW: Math.round(help.width) };

}
async function m2(STATE) {
 const PEND = STATE === 'Pending increase';
const NAME = '[USR-RG2] Deposit Limits / 390 / ' + (PEND ? 'Pending increase — 24 h cool-down' : 'Default');
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellM(NAME, 'Deposit limits', { title: 'Deposit limits', sub: 'Lower it and it applies at once. A higher limit waits 24 hours.' });
const C = S.C; const W = 358;
if (PEND) { const pb = card('Pending increase notice', { gap: 12, p: 16, fill: 'status/pending-tint', stroke: 'status/pending' }); add(C, [pb, 'FILL']); const h = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(pb, [h, 'FILL']); h.appendChild(await IC('hourglass', 20, 'status/pending')); add(h, [await T('Increase to 7,500.00 / week pending', 'Body/S Strong', 'text/primary'), 'FILL']); h.appendChild(await DEMO('XS')); add(pb, [await T('Starts 28 Nov 2026, 16:42 UTC. Until then your limit stays 5,000.00 USDT / week.', 'Body/S', 'text/secondary', { w: W - 32 }), 'FILL']); }
const ls = await I('23:21988', { Type: 'Deposit', State: PEND ? 'Pending increase' : 'Default' }); add(C, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Deposit';
const wk = card('Card — Deposits this week', { gap: 0, p: 16 }); add(C, [wk, 'FILL']);
const wh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(wk, [wh, 'FILL']); add(wh, [await T('Counted this week', 'Heading/H5', 'text/primary'), 'FILL']); wh.appendChild(await DEMO('S'));
async function dr(id, chain, meta, ic, lab, tone, amt) { const r = AL('VERTICAL', { name: 'Deposit — ' + id, gap: 8, p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { t: 1 }); const a = AL('HORIZONTAL', { name: 'Top', gap: 8, align: 'CENTER' }); add(r, [a, 'FILL']); a.appendChild(await CHAIN(chain, 20)); add(a, [await T(id + ' · ' + chain, 'Mono/S', 'text/primary'), 'FILL']); a.appendChild(await T(amt, 'Number/S', 'text/primary')); const b = AL('HORIZONTAL', { name: 'Bottom', gap: 8, align: 'CENTER' }); add(r, [b, 'FILL']); add(b, [await T(meta, 'Caption', 'text/tertiary'), 'FILL']); b.appendChild(await chip(ic, lab, tone)); return r; }
add(wk, [await dr('DP-77380', 'BNB Chain', 'Tue 24 Nov, 10:18 UTC', 'check-circle', 'Credited', 'success', '2,500.00'), 'FILL']);
add(wk, [await dr('DP-77412', 'Ethereum', 'Today 16:31 UTC · 7/12', 'clock', 'Confirming', 'info', '1,000.00'), 'FILL']);
add(wk, [await kv('Used of 5,000.00 USDT', '3,500.00 · 1,500.00 left', { divider: false }), 'FILL']);
const how = card('Card — How it works', { gap: 12, p: 16 }); add(C, [how, 'FILL']); how.appendChild(await T('How deposit limits work', 'Heading/H5', 'text/primary'));
add(how, [await bullet('trending-down', 'Lower: applies immediately', null, W - 32), 'FILL']);
add(how, [await bullet('hourglass', 'Raise or remove: waits 24 hours, cancel any time', null, W - 32, 'status/pending'), 'FILL']);
add(how, [await bullet('layers', 'All five networks are added together', null, W - 32), 'FILL']);
add(how, [await bullet('lock', 'Transfers over the limit are held for withdrawal only', null, W - 32, 'icon/muted'), 'FILL']);
const help = await I('24:14743'); add(C, [help, 'FILL']);
await setPeriod(ls, 'Weekly'); if (PEND) { await setExact(ls, { 'Daily limit': 'Weekly limit', 'Active until then: 2,500.00 USDT': 'Active until then: 5,000.00 USDT', '5,000.00': '7,500.00', 'Deposited today': 'Deposited this week', '1,000.00 of 2,500.00 USDT': '3,500.00 of 5,000.00 USDT', 'Increase to 5,000.00 USDT is pending': 'Increase to 7,500.00 USDT / week is pending' }); await txt(ls, '2,500.00 USDT limit', '5,000.00 USDT / week limit'); } else await setExact(ls, { 'Daily limit': 'Weekly limit', 'Current: 2,500.00 USDT': 'Current: 5,000.00 USDT', '2,500.00': '5,000.00', 'Deposited today': 'Deposited this week', '1,000.00 of 2,500.00 USDT': '3,500.00 of 5,000.00 USDT' }); trackFill(ls, 0.7);
await licM(C); await endM(S);
if (PEND) { const d = byName(sec, '[USR-RG2] Deposit Limits / 390 / Default'); await placeM(S.f, sec, 630, d ? d.y + d.height + 160 : nextY(sec)); } else await placeM(S.f, sec, 630, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), lsW: Math.round(ls.width) };

}
const results = [];
results.push(await fixD());
results.push(await m1());
results.push(await m2('Default'));
results.push(await m2('Pending increase'));
return { section: sec.id, existing, results };
