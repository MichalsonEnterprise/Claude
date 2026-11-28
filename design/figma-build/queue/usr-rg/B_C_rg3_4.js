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
function cols(C, railW = 440) { const r = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [r, 'FILL']); const m = AL('VERTICAL', { name: 'Main', gap: 24 }); add(r, [m, 'FILL']); const rail = AL('VERTICAL', { name: 'Rail', gap: 24, w: railW }); r.appendChild(rail); return { m, rail }; }
const TABS = ['Overview', 'Deposit limits', 'Participation limits', 'Time limits', 'Reality checks', 'Cooling-off', 'Self-exclusion'];
async function sbActive(sb, label) { for (const it of sb.findAllWithCriteria({ types: ['INSTANCE'] })) { const mc = it.mainComponent; if (!mc || !mc.parent || mc.parent.name !== 'Shell/Sidebar Item') continue; const p = it.componentProperties; const lk = Object.keys(p).find(k => k.startsWith('Label')); const lab = lk ? p[lk].value : ''; if (lab === label) { it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (p.State && p.State.value === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } }
// Desktop shell: DEMOBAR → [Sidebar | Topbar → Content(header, tabs)]
async function shellD(name, tab, o = {}) {
  const f = await screen(name, 1440, {}); add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Member' }); body.appendChild(sb); sb.layoutSizingVertical = 'FILL';
  if (o.sbLabel !== null) { try { await sbActive(sb, o.sbLabel || 'Responsible gaming'); } catch (e) {} }
  const col = AL('VERTICAL', { name: 'Main column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Member' }); add(col, [tb, 'FILL']); if (o.noDeposit) { try { await noDeposit(tb); } catch (e) {} }
  if (o.banner) add(col, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: [32, 32, 48, 32] }); add(col, [C, 'FILL']);
  if (o.bare) return { f, sb, tb, col, C };
  const crumb = AL('HORIZONTAL', { name: 'Breadcrumb', gap: 8, align: 'CENTER' }); const parts = ['Account', 'Responsible gaming'].concat(tab === 'Overview' ? [] : [tab]);
  for (let i = 0; i < parts.length; i++) { if (i) crumb.appendChild(await IC('chevron-right', 14, 'icon/muted')); crumb.appendChild(await T(parts[i], 'Body/S', i === parts.length - 1 ? 'text/primary' : 'text/tertiary')); }
  C.appendChild(crumb);
  const hr = AL('HORIZONTAL', { name: 'Title row', gap: 24, align: 'MAX' }); add(C, [hr, 'FILL']);
  const hl = AL('VERTICAL', { name: 'Title', gap: 8 }); add(hr, [hl, 'FILL']);
  hl.appendChild(await T(o.title || 'Responsible gaming', 'Heading/H2', 'text/primary'));
  hl.appendChild(await T(o.sub || 'Tools to keep play enjoyable. Lowering a limit applies straight away; raising one waits 24 hours, so the decision is never made in the moment.', 'Body/M', 'text/secondary', { w: 720 }));
  const hra = AL('HORIZONTAL', { name: 'Title actions', gap: 12, align: 'CENTER' }); hr.appendChild(hra);
  hra.appendChild(await DEMO('M')); hra.appendChild(await I('6:159')); hra.appendChild(await BTN('Secondary', 'Talk to support', { size: 'M', lead: 'chat' }));
  const tabs = AL('HORIZONTAL', { name: 'RG tabs', gap: 4 }); add(C, [tabs, 'FILL']); strokeSides(tabs, 'border/subtle', { b: 1 });
  for (const t of TABS) { const ti = await I('20:6831', { State: t === tab ? 'Active' : 'Default' }, { Label: t }); ti.name = 'Tab — ' + t; tabs.appendChild(ti); }
  return { f, sb, tb, col, C };
}
async function footD(C) { const lic = await I('6:158', { Variant: 'Inline' }); add(C, [lic, 'FILL']); return lic; }
// overlay helpers (absolute children of a screen frame)
function scrimOver(f, tok = 'scrim/overlay') { const s = rect(f.width, f.height, tok, 0, 'Scrim'); f.appendChild(s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; s.resize(f.width, f.height); return s; }
function floatIn(f, n, x, y) { f.appendChild(n); n.layoutPositioning = 'ABSOLUTE'; n.x = x; n.y = y; return n; }
async function placeD(f, sec, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
function byName(sec, name) { return sec.children.find(c => c.name === name); }
async function noDeposit(root) { for (const b of root.findAllWithCriteria({ types: ['INSTANCE'] })) { const p = b.componentProperties; const lk = Object.keys(p).find(x => x.startsWith('Label')); if (lk && p[lk].value === 'Deposit' && p.State) b.setProperties({ State: 'Disabled' }); } }
function hidePromos(sb) { let n = 0; for (const c of sb.findAll(x => /promo|tile/i.test(x.name) && x.type !== 'TEXT')) { if (c.parent && /promo/i.test(c.parent.name)) continue; c.visible = false; n++; } return n; }
async function banner(icon, title, body, tone, btns = []) { const b = AL('HORIZONTAL', { name: 'Banner — ' + title, gap: 16, p: [16, 32, 16, 32], fill: tk('status/' + tone + '-tint'), align: 'CENTER' }); strokeSides(b, tk('status/' + tone, 'border/default'), { b: 1 }); b.appendChild(await iconTile(icon, tk('status/' + tone, 'icon/default'), 40, 'surface/default')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(b, [tx, 'FILL']); add(tx, [await T(title, 'Body/M Strong', 'text/primary', { w: 700 }), 'FILL']); if (body) add(tx, [await T(body, 'Body/S', 'text/secondary', { w: 700 }), 'FILL']); for (const x of btns) b.appendChild(x); return b; }
// ===== END RG KIT =====
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
async function b3() {
const NAME = '[USR-RG3] Participation Limits / 1440 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellD(NAME, 'Participation limits', { title: 'Participation limits', sub: 'Cap what you spend on Global Pool entries and game stakes, and how much you can lose, each day. When a limit is reached, new entries and bets pause until it resets.' });
const C = S.C; const MW = 672; const RW = 440; const { m, rail } = cols(C, RW);
const ls = await I('23:21988', { Type: 'Participation', State: 'Default' }); add(m, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Participation';
// loss limit card
const lc = card('Card — Daily loss limit', { gap: 16, p: 24 }); add(m, [lc, 'FILL']);
const lh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(lc, [lh, 'FILL']); lh.appendChild(await iconTile('trending-down'));
const lht = AL('VERTICAL', { name: 'Title', gap: 2 }); add(lh, [lht, 'FILL']); lht.appendChild(await T('Daily loss limit', 'Heading/H5', 'text/primary')); lht.appendChild(await T('Net result = winnings minus stakes and entry costs, since 00:00 UTC', 'Body/S', 'text/tertiary'));
lh.appendChild(await chip('check-circle', 'On', 'success'));
const lv = AL('HORIZONTAL', { name: 'Values', gap: 32 }); add(lc, [lv, 'FILL']);
async function stat(label, value, color = 'text/primary') { const s = AL('VERTICAL', { name: 'Stat — ' + label, gap: 4 }); s.appendChild(await T(label, 'Caption', 'text/tertiary')); const r = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); s.appendChild(r); r.appendChild(await T(value, 'Number/M', color)); r.appendChild(await DEMO('XS')); return s; }
lv.appendChild(await stat('Limit', '200.00 USDT / day')); lv.appendChild(await stat('Net result today', '−24.60 USDT', 'text/danger')); lv.appendChild(await stat('Left before pause', '175.40 USDT'));
add(lc, [meter(MW - 48, 0.123, 'brand/primary'), 'FILL']);
const lf = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(lc, [lf, 'FILL']); add(lf, [await T('Weekly and monthly loss limits are not set.', 'Body/S', 'text/secondary'), 'FILL']);
lf.appendChild(await BTN('Ghost', 'Add weekly limit', { size: 'S', lead: 'plus' })); lf.appendChild(await BTN('Secondary', 'Change daily limit', { size: 'S' }));
// what counts
const wc = card('Card — What counts', { gap: 16, p: 24 }); add(m, [wc, 'FILL']);
wc.appendChild(await T('What counts toward participation', 'Heading/H5', 'text/primary'));
const BW = MW - 48;
add(wc, [await bullet('pool', 'Global Pool entries', '10.00 USDT per entry plus the 0.05 USDT platform fee per qualifying entry. Network fees never apply to entries — they are paid from your balance.', BW), 'FILL']);
add(wc, [await bullet('games', 'Game stakes', 'Every stake in Originals, table, live, slot, draw and bingo games — including stakes placed with bonus funds.', BW), 'FILL']);
add(wc, [await bullet('pause-circle', 'When you reach a limit', 'New entries and bets are blocked until 00:00 UTC. Entries you already hold stay in their round, and withdrawals are never blocked.', BW, 'icon/muted'), 'FILL']);
// rail
const tg = card('Card — Today at a glance', { gap: 0, p: 24 }); add(rail, [tg, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); add(tg, [th, 'FILL']); add(th, [await T('Today at a glance', 'Heading/H5', 'text/primary'), 'FILL']); th.appendChild(await DEMO('S'));
add(tg, [await kv('Participation used', '351.75 of 500.00 USDT'), 'FILL']);
add(tg, [await kv('Participation left', '148.25 USDT'), 'FILL']);
add(tg, [await kv('Net result', '−24.60 of −200.00 USDT'), 'FILL']);
add(tg, [await kv('Limits reset', '00:00 UTC · in 7 h 18 min', { divider: false }), 'FILL']);
const help = await I('24:14743'); add(rail, [help, 'FILL']);
await footD(C);
await placeD(S.f, sec, 3240, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), ls: ls.findAllWithCriteria({ types: ['TEXT'] }).map(t => t.characters.slice(0, 50)).slice(0, 30) };

}
async function b4() {
const NAME = '[USR-RG4] Time Limits / 1440 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellD(NAME, 'Time limits', { title: 'Time limits', sub: 'Decide how long you play. When time is up we let the current round finish, then pause new bets — no mid-round cut-offs and nothing placed for you.' });
const C = S.C; const MW = 672; const RW = 440; const { m, rail } = cols(C, RW);
const ls = await I('23:21988', { Type: 'Time', State: 'Default' }); add(m, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Time';
const sc = card('Card — Session length', { gap: 16, p: 24 }); add(m, [sc, 'FILL']);
const sh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(sc, [sh, 'FILL']); sh.appendChild(await iconTile('hourglass'));
const sht = AL('VERTICAL', { name: 'Title', gap: 2 }); add(sh, [sht, 'FILL']); sht.appendChild(await T('Session length limit', 'Heading/H5', 'text/primary')); sht.appendChild(await T('A session ends after 15 minutes without play.', 'Body/S', 'text/tertiary'));
sh.appendChild(await chip('check-circle', 'On', 'success'));
const sv = AL('HORIZONTAL', { name: 'Values', gap: 8, align: 'CENTER' }); add(sc, [sv, 'FILL']); sv.appendChild(await T('1 h 30 min', 'Number/M', 'text/primary')); sv.appendChild(await T('per session', 'Body/S', 'text/secondary')); sv.appendChild(await DEMO('S'));
add(sc, [meter(MW - 48, 0.47), 'FILL']);
const sf = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(sc, [sf, 'FILL']); add(sf, [await T('Current session 00:42:18 · started 16:00 UTC · 47 min left', 'Body/S', 'text/secondary'), 'FILL']); sf.appendChild(await BTN('Secondary', 'Change', { size: 'S' }));
const qh = card('Card — Quiet hours', { gap: 16, p: 24 }); add(m, [qh, 'FILL']);
const qhh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(qh, [qhh, 'FILL']); qhh.appendChild(await iconTile('clock', 'icon/default'));
const qht = AL('VERTICAL', { name: 'Title', gap: 2 }); add(qhh, [qht, 'FILL']); qht.appendChild(await T('Quiet hours', 'Heading/H5', 'text/primary')); add(qht, [await T('Block games and Global Pool entries at set times every day — useful for late nights.', 'Body/S', 'text/tertiary', { w: 420 }), 'FILL']);
qhh.appendChild(await chip('minus', 'Off', 'info'));
const tgl = await I('20:3309', { On: 'No', State: 'Default' }, { Label: 'Block play between 01:00 and 07:00', Description: 'Lisbon time (UTC+0). Turning this on applies at once; turning it off waits 24 hours.', 'Show description': true }); add(qh, [tgl, 'FILL']);
const wu = card('Card — When time is up', { gap: 16, p: 24 }); add(m, [wu, 'FILL']);
wu.appendChild(await T('When time is up', 'Heading/H5', 'text/primary'));
const BW = MW - 48;
add(wu, [await bullet('bell', '10 minutes before', 'A banner shows the time left. Nothing interrupts your game.', BW), 'FILL']);
add(wu, [await bullet('pause-circle', 'At the limit', 'Your current round finishes, then new bets and entries pause until the limit resets at 00:00 UTC.', BW), 'FILL']);
add(wu, [await bullet('wallet', 'Always available', 'You can still view your account, check results and withdraw.', BW, 'icon/muted'), 'FILL']);
const td = card('Card — Today', { gap: 0, p: 24 }); add(rail, [td, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); add(td, [th, 'FILL']); add(th, [await T('Your time today', 'Heading/H5', 'text/primary'), 'FILL']); th.appendChild(await DEMO('S'));
add(td, [await kv('Played today', '1 h 12 min of 2 h 00 min'), 'FILL']);
add(td, [await kv('Current session', '00:42:18'), 'FILL']);
add(td, [await kv('Sessions today', '2'), 'FILL']);
add(td, [await kv('Daily time resets', '00:00 UTC', { divider: false }), 'FILL']);
const help = await I('24:14743'); add(rail, [help, 'FILL']);
await footD(C);
await placeD(S.f, sec, 4800, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), ls: ls.findAllWithCriteria({ types: ['TEXT'] }).map(t => t.characters.slice(0, 50)).slice(0, 30) };

}
const results = [];
results.push(await b3());
results.push(await b4());
return { section: sec.id, results };
