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
async function b7(STEP) {
const LBL = { 1: 'Step 1 — Choose period', 2: 'Step 2 — Consequences (1 year)', 3: 'Step 3 — Confirm with password', 4: 'Active — until 27 Nov 2027, 16:45 UTC' };
const NAME = '[USR-RG7] Self-Exclusion / 1440 / ' + LBL[STEP];
const old = byName(sec, NAME); if (old) old.remove();
const ACT = STEP === 4;
const bn = ACT ? await banner('shield-check', 'Self-exclusion is active until 27 Nov 2027, 16:45 UTC', 'Games, the Global Pool, deposits and all marketing are closed for this account. You can still log in to withdraw, view your history and contact support. This cannot be reversed before the end date.', 'info', [await DEMO('S'), await BTN('Primary', 'Withdraw funds', { size: 'S', lead: 'withdraw' })]) : null;
const S = await shellD(NAME, 'Self-exclusion', { title: 'Self-exclusion', sub: 'If you want a long break from gambling, self-exclusion closes your access for the period you choose. We will not ask you to come back, and it cannot be undone early.', banner: bn, noDeposit: ACT });
if (ACT) { try { hidePromos(S.sb); } catch (e) {} }
const C = S.C;
const row = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(C, [row, 'FILL']);
const left = AL('VERTICAL', { name: 'Step', gap: 16, w: 520 }); row.appendChild(left);
const right = AL('VERTICAL', { name: 'Context', gap: 24 }); add(row, [right, 'FILL']);
const RWID = 1136 - 520 - 24; const BW = RWID - 48;
if (STEP !== 3) {
  const st = await I('25:14013', { Step: ['Choose period', 'Consequences', 'Confirm', 'Active'][STEP - 1] }); add(left, [st, 'FILL']); st.name = 'RG/Self-Exclusion Step';
  await txt(st, 'Indefinite', 'Permanent');
} else {
  const sc = card('Self-Exclusion Step — Confirm (password + typed confirmation)', { gap: 20, p: 28, fill: 'surface/default', r: 20 }); add(left, [sc, 'FILL']);
  const pr = AL('HORIZONTAL', { name: 'Progress', gap: 8 }); add(sc, [pr, 'FILL']);
  for (let i = 0; i < 3; i++) { const b = rect(10, 4, i < 3 ? 'brand/primary' : 'surface/raised', 9999, 'Segment ' + (i + 1)); pr.appendChild(b); b.layoutSizingHorizontal = 'FILL'; }
  sc.appendChild(await T('Step 3 of 3 · Confirm', 'Overline', 'text/tertiary'));
  add(sc, [await T('Confirm self-exclusion for 1 year', 'Heading/H4', 'text/primary'), 'FILL']);
  const sm = AL('VERTICAL', { name: 'Summary', gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised', r: 14 }); add(sc, [sm, 'FILL']);
  add(sm, [await kv('Period', '1 year', { demo: false }), 'FILL']);
  add(sm, [await kv('Starts', 'As soon as you confirm', { demo: false }), 'FILL']);
  add(sm, [await kv('Ends', '27 Nov 2027, 16:45 UTC'), 'FILL']);
  add(sm, [await kv('Early reversal', 'Not possible', { demo: false, divider: false, color: 'text/warning' }), 'FILL']);
  const pw = await I('14:1735', { State: 'Default', Strength: 'Empty' }, { Label: 'Your password', 'Show strength': false, 'Show requirements': false }); add(sc, [pw, 'FILL']);
  const ty = await I('13:762', { State: 'Default', Size: 'M' }, { Label: 'Type SELF-EXCLUDE to confirm', 'Show label': true, 'Show helper': true }); add(sc, [ty, 'FILL']);
  await txt(ty, 'Placeholder', 'SELF-EXCLUDE');
  const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'I understand this cannot be reversed before 27 Nov 2027.', 'Show description': false }); add(sc, [cb, 'FILL']);
  const bt = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(sc, [bt, 'FILL']);
  bt.appendChild(await BTN('Ghost', 'Back', { size: 'L', lead: 'arrow-left' })); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bt, [sp, 'FILL']);
  bt.appendChild(await BTN('Danger', 'Self-exclude for 1 year', { size: 'L', state: 'Disabled' }));
  add(sc, [await T('The button unlocks when your password is entered, the phrase matches and the box is ticked. Leaving this page changes nothing.', 'Caption', 'text/tertiary', { w: 464 }), 'FILL']);
}
if (STEP === 1) {
  const alt = card('Card — Is a shorter break enough', { gap: 16, p: 24 }); add(right, [alt, 'FILL']);
  alt.appendChild(await T('Not sure you need this long?', 'Heading/H5', 'text/primary'));
  add(alt, [await T('There is no wrong choice — pick what feels right today. These shorter options also work:', 'Body/S', 'text/secondary', { w: BW }), 'FILL']);
  async function opt(icon, t, b, btn) { const r = AL('HORIZONTAL', { name: 'Option — ' + t, gap: 12, align: 'CENTER', p: 16, fill: 'surface/raised', r: 14 }); r.appendChild(await iconTile(icon, 'icon/brand', 40, 'surface/default')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(t, 'Body/S Strong', 'text/primary', { w: BW - 220 }), 'FILL']); add(tx, [await T(b, 'Body/S', 'text/secondary', { w: BW - 220 }), 'FILL']); r.appendChild(await BTN('Secondary', btn, { size: 'S' })); return r; }
  add(alt, [await opt('pause-circle', 'Cooling-off: 24 hours to 30 days', 'A short pause with the same protections.', 'Take a break'), 'FILL']);
  add(alt, [await opt('sliders', 'Lower your limits', 'Lower deposit, participation or time limits — applies at once.', 'Review limits'), 'FILL']);
  const reg = card('Card — Wider protection', { gap: 8, p: 24 }); add(right, [reg, 'FILL']);
  reg.appendChild(await T('Want to block other sites too?', 'Body/M Strong', 'text/primary'));
  add(reg, [await T('Self-exclusion here covers this GLOBAL POOL account and any new account opened with the same verified identity. Your national gambling regulator may run a register that covers every licensed operator, and blocking software can add another layer.', 'Body/S', 'text/secondary', { w: BW }), 'FILL']);
}
if (STEP === 2 || STEP === 3) {
  const mc = card('Card — Your money', { gap: 0, p: 24 }); add(right, [mc, 'FILL']);
  const mh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); add(mc, [mh, 'FILL']); add(mh, [await T(STEP === 2 ? 'What happens to your money' : 'When you confirm', 'Heading/H5', 'text/primary'), 'FILL']); mh.appendChild(await DEMO('S'));
  add(mc, [await kv('Available balance · stays withdrawable', '9,215.30 USDT'), 'FILL']);
  add(mc, [await kv('35 open entries, round #1,248 · refunded per round rules', '+350.00 USDT'), 'FILL']);
  add(mc, [await kv('Owed (refund #1,245 + VIP reward) · credited', '+415.20 USDT'), 'FILL']);
  add(mc, [await kv('Deposit DP-77412 · credited when confirmed', '1,000.00 USDT'), 'FILL']);
  add(mc, [await kv('Withdrawal WD-20931 · keeps processing', '1,500.00 USDT'), 'FILL']);
  const tt = AL('HORIZONTAL', { name: 'Total', gap: 12, align: 'CENTER', p: [16, 0, 0, 0] }); add(mc, [tt, 'FILL']); add(tt, [await T('Total — all of it remains yours', 'Body/S Strong', 'text/primary'), 'FILL']); tt.appendChild(await T('12,480.50 USDT', 'Number/S', 'text/primary')); tt.appendChild(await DEMO('XS'));
  const wh = card('Card — Also changes', { gap: 16, p: 24 }); add(right, [wh, 'FILL']);
  wh.appendChild(await T('Also changes straight away', 'Heading/H5', 'text/primary'));
  add(wh, [await bullet('ban', 'Games, Global Pool and deposits close', 'Deposit addresses are removed; transfers sent to old addresses are returned or held for withdrawal.', BW), 'FILL']);
  add(wh, [await bullet('megaphone', 'All marketing stops', 'No bonus offers, emails, push messages or VIP contact for the whole period.', BW), 'FILL']);
  add(wh, [await bullet('lock', 'No reversal until the end date', 'Support cannot lift it early. When it ends, you must ask to reopen — nothing reopens automatically.', BW, 'icon/muted'), 'FILL']);
}
if (STEP === 4) {
  const wd = card('Card — Withdraw your balance', { gap: 0, p: 24 }); add(right, [wd, 'FILL']);
  const wdh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 12, 0] }); add(wd, [wdh, 'FILL']);
  const wdt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(wdh, [wdt, 'FILL']); wdt.appendChild(await T('Available to withdraw now', 'Body/S', 'text/secondary'));
  const wv = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); wdt.appendChild(wv); wv.appendChild(await T('9,980.50 USDT', 'Number/L', 'balance/available')); wv.appendChild(await DEMO('S'));
  wdh.appendChild(await BTN('Primary', 'Withdraw funds', { size: 'L', lead: 'withdraw' }));
  add(wd, [await kv('Available before self-exclusion', '9,215.30 USDT'), 'FILL']);
  add(wd, [await kv('Entries refunded · round #1,248, 35 entries', '+350.00 USDT'), 'FILL']);
  add(wd, [await kv('Owed amounts credited', '+415.20 USDT'), 'FILL']);
  add(wd, [await kv('Deposit DP-77412 · withdrawable once confirmed', '1,000.00 USDT'), 'FILL']);
  add(wd, [await kv('Withdrawal WD-20931 · under review, continues', '1,500.00 USDT', { divider: false }), 'FILL']);
  const nx = card('Card — What happens next', { gap: 16, p: 24 }); add(right, [nx, 'FILL']);
  nx.appendChild(await T('What happens next', 'Heading/H5', 'text/primary'));
  add(nx, [await bullet('mail', 'Confirmation sent to n•••@example.com', 'With your end date and how to reach support. Sent 27 Nov 2026, 16:45 UTC.', BW), 'FILL']);
  add(nx, [await bullet('calendar', 'On 27 Nov 2027', 'Your account stays closed until you ask to reopen it. We will not contact you to come back.', BW), 'FILL']);
}
const help = await I('24:14743'); right.appendChild(help);
await footD(C);
if (STEP === 1) await placeD(S.f, sec, 120, nextY(sec)); else { const d = byName(sec, '[USR-RG7] Self-Exclusion / 1440 / Step 1 — Choose period'); await placeD(S.f, sec, 120 + (STEP - 1) * 1560, d ? d.y : nextY(sec)); }
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height) };

}
const results = [];
results.push(await b7(1));
results.push(await b7(2));
results.push(await b7(3));
results.push(await b7(4));
return { section: sec.id, results };
