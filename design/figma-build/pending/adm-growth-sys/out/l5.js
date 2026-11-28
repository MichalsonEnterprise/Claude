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

// ===== ADM-GROWTH-SYS laptop pass: clone 1440 masters -> 1280 (Breakpoint Laptop 1280), generic reflow fix, overflow report, screenshots =====
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-A/M Affiliates & marketing, ADM-S System', 86000, 0);
const LY = 6440; // laptop row (section-local y), below the deepest 1440 state (ends 6271)
const LOG = [];
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE' && p.type !== 'SECTION') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
function vis(k) { return k.visible && k.layoutPositioning !== 'ABSOLUTE'; }
function setFill(k) { try { if (k.type === 'TEXT') k.textAutoResize = 'HEIGHT'; k.layoutSizingHorizontal = 'FILL'; return true; } catch (e) { return false; } }
function reflow(f, log) {
  const al = f.findAll(n => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && !inInst(n));
  for (const P of al) {
    const inner = P.width - P.paddingLeft - P.paddingRight; const kids = P.children.filter(vis); if (!kids.length) continue;
    if (P.layoutMode === 'VERTICAL' || P.layoutWrap === 'WRAP') { for (const k of kids) if (k.width > inner + 1) { if (setFill(k)) log.push('V ' + k.name.slice(0, 28)); else log.push('!V ' + k.name.slice(0, 28)); } }
    else {
      const sp = P.itemSpacing > 0 ? P.itemSpacing : 0; const need = () => kids.reduce((s, k) => s + k.width, 0) + sp * (kids.length - 1); let g = 0;
      while (need() > inner + 1 && g++ < 6) {
        const c = kids.filter(k => k.layoutSizingHorizontal !== 'FILL' && k.width >= (k.type === 'INSTANCE' ? 240 : 120));
        if (!c.length) { log.push('!H ' + P.name.slice(0, 28) + ' ' + Math.round(need()) + '>' + Math.round(inner)); break; }
        const ws = c.map(k => k.width); if (c.length > 1 && Math.max(...ws) / Math.min(...ws) < 1.3 && c.length >= kids.filter(k => k.width >= 120).length) { c.forEach(setFill); log.push('Hall ' + P.name.slice(0, 28)); }
        else { const k = c.sort((a, b) => b.width - a.width)[0]; setFill(k); log.push('H ' + P.name.slice(0, 20) + '>' + k.name.slice(0, 20)); }
      }
    }
  }
}
function overflow(f) { const R = f.absoluteBoundingBox.x + f.width + 1; return f.findAll(n => n.visible && !inInst(n) && n.absoluteBoundingBox && n.absoluteBoundingBox.x + n.absoluteBoundingBox.width > R).slice(0, 8).map(n => n.name.slice(0, 30) + ':' + Math.round(n.absoluteBoundingBox.x + n.absoluteBoundingBox.width - R)); }
async function LAPTOP(srcId, yOverride) {
  const src = await figma.getNodeByIdAsync(srcId); if (!src) { LOG.push('no ' + srcId); return null; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { LOG.push('exists ' + nm); return null; }
  const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = src.x; f.y = yOverride != null ? yOverride : LY;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  const log = []; reflow(f, log); const kf = KPIFIX(f); if (kf) log.push('kpi ' + kf); const ov = overflow(f).concat(instOverflow(f), narrowFill(f).map(x => 'narrow ' + x));
  return { f, log, ov };
}

// ---- generic laptop fixes (added after batch 1 review) ----
function isKPI(x) { return x.type === 'INSTANCE' && x.mainComponent && x.mainComponent.parent && x.mainComponent.parent.name === 'Admin/KPI Tile'; }
function KPIFIX(f) { let n = 0; for (const k of f.findAll(isKPI)) { const kb = k.absoluteBoundingBox; const sp = k.findOne(x => x.name === 'Sparkline'); if (sp) { const w0 = sp.width; try { sp.layoutSizingHorizontal = 'FILL'; n++; } catch (e) { try { sp.resize(k.width - 40, sp.height); n++; } catch (e2) {} } SPARKSCALE(sp); }
  for (const t of k.findAll(x => x.type === 'TEXT' && x.visible)) { const ab = t.absoluteBoundingBox; if (ab && ab.x + ab.width > kb.x + kb.width - 12) { try { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; n++; } catch (e) { try { t.resize(Math.max(40, kb.x + kb.width - 20 - ab.x), t.height); t.textAutoResize = 'HEIGHT'; n++; } catch (e2) {} } } } } return n; }
function SPARKSCALE(sp) { const kids = sp.children.filter(c => c.name !== 'End dot'); if (!kids.length) return; const full = Math.max(...kids.map(c => c.x + c.width)); const r = (sp.width - 4) / full; if (Math.abs(r - 1) < 0.01) return; sp.clipsContent = true; for (const c of sp.children) { try { const x0 = c.x; if (c.name === 'End dot') { c.x = Math.min(x0 * r, sp.width - c.width); } else { c.resize(Math.max(1, c.width * r), c.height); c.x = x0 * r; } } catch (e) {} } }
// inner overflow: nodes that stick out of their nearest instance ancestor (instance internals don't reflow)
function instOverflow(f) { const r = []; for (const k of f.findAll(x => x.type === 'INSTANCE' && !inInst(x) && x.visible)) { const kb = k.absoluteBoundingBox; if (!kb) continue; const bad = k.findAll(x => x.visible && x.absoluteBoundingBox && x.absoluteBoundingBox.x + x.absoluteBoundingBox.width > kb.x + kb.width + 2); if (bad.length) r.push(k.name.slice(0, 26) + '>' + bad[0].name.slice(0, 20)); } return r.slice(0, 10); }
function narrowFill(f) { return f.findAll(n => !inInst(n) && n.visible && n.layoutSizingHorizontal === 'FILL' && n.parent && n.parent.layoutMode === 'HORIZONTAL' && n.width < 90 && n.width > 0 && n.type !== 'TEXT' && !/Spacer/.test(n.name)).slice(0, 8).map(n => n.name.slice(0, 24) + ':' + Math.round(n.width)); }
function hideCols(f, keys) { let c = 0; for (const n of f.findAll(x => keys.includes(x.name) && !inInst(x))) { n.visible = false; c++; } return c; }
function setColW(f, key, w) { let c = 0; for (const n of f.findAll(x => x.name === key && !inInst(x))) { try { n.resize(w, n.height); if (n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL') n.counterAxisSizingMode = 'AUTO'; if (n.type === 'FRAME' && n.layoutMode === 'VERTICAL') n.primaryAxisSizingMode = 'AUTO'; c++; } catch (e) {} } return c; }

// clipped-content audit: fixed-size auto-layout frames whose children need more room (severe collapse => auto-fix to HUG)
function clipAudit(f, fix) { const r = []; for (const P of f.findAll(n => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && !inInst(n) && n.visible)) { const kids = P.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (!kids.length) continue; const sp = P.itemSpacing > 0 ? P.itemSpacing : 0;
  const need = P.layoutMode === 'VERTICAL' ? kids.reduce((s, k) => s + k.height, 0) + sp * (kids.length - 1) + P.paddingTop + P.paddingBottom : Math.max(...kids.map(k => k.height)) + P.paddingTop + P.paddingBottom;
  if (need > P.height + 2) { const sev = P.height < need * 0.6; let done = ''; if (fix && sev && P.layoutSizingVertical === 'FIXED') { try { P.layoutSizingVertical = 'HUG'; done = ' →HUG'; } catch (e) { done = ' !fix'; } } r.push((sev ? 'SEV ' : '') + P.name.slice(0, 22) + ':' + Math.round(P.height) + '<' + Math.round(need) + ':' + P.layoutSizingVertical[0] + done); } } return r.slice(0, 12); }
// ===== END laptop pass lib =====

// batch 5: clipped-content audit (+auto-fix severe collapses) on every frame in the section; M6 Draft laptop column widths; clone S2, S3, S4
const AUD = {};
for (const f of sec.children) { if (f.type !== 'FRAME' || !/^\[ADM-/.test(f.name)) continue; const r = clipAudit(f, true); if (r.length) AUD[f.name.replace(/ \/ (\d+) \/ /, '·$1·').slice(0, 40)] = r; }
const m6 = await figma.getNodeByIdAsync('288:103574'); const tree = m6.findOne(n => n.name === 'Content tree'); const pub = m6.findOne(n => n.name === 'Publishing');
const FX = {}; try { tree.resize(208, tree.height); tree.layoutSizingVertical = 'HUG'; pub.resize(288, pub.height); pub.layoutSizingVertical = 'HUG'; } catch (e) { FX.m6err = String(e.message).slice(0, 80); }
FX.m6 = [Math.round(tree.width), Math.round(pub.width), Math.round(m6.findOne(n => n.name === 'Editor').width)];
const made = [];
for (const id of ['50:50682', '66:51328', '66:52353']) { const r = await LAPTOP(id); if (r) made.push(r); }
const hdrs = {}; for (const r of made) { hdrs[r.f.name.slice(0, 9)] = r.f.findAll(n => /header row/i.test(n.name) && !inInst(n)).map(h => h.children.filter(c => c.visible).map(c => c.name.slice(0, 10) + ':' + Math.round(c.width) + (c.layoutSizingHorizontal === 'FILL' ? 'F' : '')).join(' ')); }
fitSection(sec);
const a5m = await figma.getNodeByIdAsync('33:322372'); await a5m.findOne(n => n.name === 'Cases & detail').screenshot({ scale: 0.4 });
await m6.findOne(n => n.name === 'CMS workspace').screenshot({ scale: 0.4 });
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { AUD, FX, hdrs, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 10), ov: r.ov })), log: LOG };
