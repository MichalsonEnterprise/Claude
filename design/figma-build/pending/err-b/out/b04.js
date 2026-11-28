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
// ===== ERR-B BOARD LIB (pending/err-b/lib.js) — paste after helpers.js =====
const CW = 1312, PW = 760, TXW = 504;
const PAGE12 = '12 — Empty & Error States', SEC_NAME = 'ERR-04..07 Permission, regulatory, maintenance & security';
async function ensureFont(t) { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); else for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); }
function inBadge(t) { let p = t.parent; while (p) { if (p.type === 'INSTANCE' && p.name.startsWith('Badge/')) return true; p = p.parent; } return false; }
async function ov(inst, layer, text, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === layer && !inBadge(n))[nth]; if (!t) return false; await ensureFont(t); t.characters = text; return true; }
function txt(inst, name, nth = 0) { const t = inst.findAll(n => n.type === 'TEXT' && n.name === name && !inBadge(n))[nth]; return t ? t.characters : ''; }
function relabel(inst, oldLabel, label) { for (const b of inst.findAll(n => n.type === 'INSTANCE')) { const cp = b.componentProperties; const k = Object.keys(cp).find(x => x.startsWith('Label#')); if (k && cp[k].value === oldLabel) { b.setProperties({ [k]: label }); return true; } } return false; }
function hide(inst, name) { for (const n of inst.findAll(x => x.name === name)) n.visible = false; }
const SEV = { Blocking: ['status/danger-tint', 'text/danger', 'ban'], Restricted: ['status/warning-tint', 'text/warning', 'lock'], Warning: ['status/warning-tint', 'text/warning', 'alert-triangle'], Advisory: ['status/info-tint', 'text/info', 'info'], Security: ['status/danger-tint', 'text/danger', 'shield-alert'], Recovery: ['status/success-tint', 'text/success', 'check-circle'] };
async function sev(k) { const [bg, fg, ic] = SEV[k]; const r = AL('HORIZONTAL', { name: 'Severity — ' + k, gap: 6, p: [4, 10, 4, 8], fill: bg, r: 9999, align: 'CENTER' }); add(r, await IC(ic, 14, fg), await T(k, 'Label/S', fg)); return r; }
async function chip(txt, mono = true, color = 'text/secondary') { const r = AL('HORIZONTAL', { name: 'Chip — ' + txt, p: [4, 10], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(r, await T(txt, mono ? 'Mono/S' : 'Label/S', color)); return r; }
async function stat(icon, label, fg) { const r = AL('HORIZONTAL', { name: 'Status — ' + label, gap: 6, align: 'CENTER' }); add(r, await IC(icon, 16, fg), await T(label, 'Label/S', fg)); return r; }
async function grp(label, kids) { const g = AL('VERTICAL', { name: 'Group — ' + label, gap: 8, w: TXW }); add(g, await T(label, 'Overline', 'text/tertiary')); for (const k of kids) add(g, [k, 'FILL']); return g; }
async function kv(k, v) { const r = AL('VERTICAL', { name: 'Copy — ' + k, gap: 2, w: TXW }); add(r, await T(k, 'Caption', 'text/tertiary'), [await T('“' + v + '”', 'Body/S', 'text/primary', { w: TXW }), 'FILL']); return r; }
async function act(type, label, dest, lead) { const r = AL('HORIZONTAL', { name: 'Action — ' + label, gap: 12, align: 'CENTER', w: TXW }); add(r, await BTN(type, label, { size: 'S', lead })); const t = await T('→ ' + dest, 'Body/S', 'text/secondary', { w: 200 }); add(r, t); t.layoutSizingHorizontal = 'FILL'; return r; }
async function bul(items, w = TXW, color = 'text/secondary') { const c = AL('VERTICAL', { name: 'Notes', gap: 6, w }); for (const s of items) { const r = AL('HORIZONTAL', { gap: 8, w }); const t = await T(s, 'Body/S', color, { w: w - 16 }); add(r, await T('•', 'Body/S', 'text/tertiary'), t); t.layoutSizingHorizontal = 'FILL'; add(c, [r, 'FILL']); } return c; }
async function tile(icon, bg, fg, size = 40) { const t = AL('HORIZONTAL', { name: 'Icon tile', fill: bg, r: 10, align: 'CENTER', justify: 'CENTER', w: size, h: size }); add(t, await IC(icon, Math.round(size / 2), fg)); return t; }
async function note(icon, txt, w, bg = 'surface/default', fg = 'icon/muted') { const r = AL('HORIZONTAL', { name: 'Note', gap: 8, p: [10, 12], fill: bg, r: 10, align: 'MIN', w }); add(r, await IC(icon, 16, fg), await T(txt, 'Body/S', 'text/secondary', { w: w - 48 })); return r; }
// panel({w, icon, bg, fg, title, body, h, extra:[node|[node,'FILL']], btns:[[type,label,lead]], bs, modal, fill, name})
async function panel(o) {
  const w = o.w || 720; const p = AL('VERTICAL', { name: o.name || 'Panel — ' + o.title, gap: 16, p: 24, fill: o.fill || (o.modal ? 'surface/overlay' : 'surface/raised'), stroke: 'border/subtle', r: o.modal ? 20 : 14, w });
  if (o.modal) await fx(p, 'Elevation/4 — Modal');
  const hd = AL('HORIZONTAL', { name: 'Head', gap: 16, align: 'MIN' }); const tx = AL('VERTICAL', { name: 'Text', gap: 6 }); const tw = w - 48 - 56;
  add(tx, await T(o.title, o.h || 'Heading/H5', 'text/primary', { w: tw }), await T(o.body, 'Body/S', 'text/secondary', { w: tw }));
  add(hd, await tile(o.icon, o.bg, o.fg), tx); add(p, hd);
  for (const e of o.extra || []) add(p, e);
  if (o.btns) { const br = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); for (const [ty, lb, ld, st] of o.btns) add(br, await BTN(ty, lb, { size: o.bs || 'M', lead: ld, state: st })); add(p, [br, 'FILL']); }
  return p;
}
// cell({no, sev, name, lib, stage: async()=>[nodes], trigger, where, copy:[[k,v]], actions:[[type,label,dest,lead]], notes:[]})
async function cell(o) {
  const c = AL('HORIZONTAL', { name: 'Cell ' + o.no + ' — ' + o.name, fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true, w: CW });
  const pv = AL('VERTICAL', { name: 'Preview', gap: 12, p: 20, fill: 'bg/base', w: PW }); strokeSides(pv, 'border/subtle', { r: 1 });
  const cap = AL('HORIZONTAL', { name: 'Preview label', gap: 6, align: 'CENTER' }); add(cap, await IC('layers', 14, 'icon/muted'), await T(o.lib, 'Caption', 'text/tertiary', { w: 690 })); add(pv, cap);
  const st = AL('VERTICAL', { name: 'Stage', gap: 16, align: 'CENTER', justify: 'CENTER', p: [12, 0] }); add(pv, [st, 'FILL']);
  for (const k of await o.stage()) add(st, k);
  const sp = AL('VERTICAL', { name: 'Spec', gap: 20, p: 24 });
  const top = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(top, await chip(o.no), await sev(o.sev));
  add(sp, top, await T(o.name, 'Heading/H5', 'text/primary', { w: TXW }));
  add(sp, await grp('TRIGGER', [await T(o.trigger, 'Body/S', 'text/secondary', { w: TXW })]));
  if (o.where) add(sp, await grp('WHERE IT APPEARS', [await T(o.where, 'Body/S', 'text/secondary', { w: TXW })]));
  const cp = []; for (const [k, v] of (typeof o.copy === 'function' ? await o.copy() : o.copy)) cp.push(await kv(k, v)); add(sp, await grp('EXACT COPY', cp));
  const ac = []; for (const [ty, lb, de, ld] of o.actions) ac.push(await act(ty, lb, de, ld)); add(sp, await grp('ACTIONS', ac));
  if (o.notes) add(sp, await grp('BEHAVIOUR & DEV NOTES', [await bul(o.notes)]));
  add(c, pv, sp); sp.layoutSizingHorizontal = 'FILL';
  if (sp.height > pv.height) { const extra = sp.height - pv.height; st.resize(st.width, st.height + extra); st.layoutSizingHorizontal = 'FILL'; }
  return c;
}
function audit(root) { const flags = []; const rb = root.absoluteBoundingBox; for (const t of root.findAll(n => n.type === 'TEXT' && n.visible)) { const b = t.absoluteRenderBounds || t.absoluteBoundingBox; if (!b) continue; let p = t.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { const pb = p.absoluteBoundingBox; if (pb && p.clipsContent && (b.x < pb.x - 1 || b.y < pb.y - 1 || b.x + b.width > pb.x + pb.width + 1 || b.y + b.height > pb.y + pb.height + 1)) { flags.push(t.characters.slice(0, 40) + ' ⟂ ' + p.name); break; } if (p === root) break; p = p.parent; } if (b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) flags.push('off-frame: ' + t.characters.slice(0, 30)); if (t.width < 4) flags.push('thin: ' + t.characters.slice(0, 30)); } return flags.slice(0, 30); }
// board({col, id, pri, frameName, title, desc, rules[], map[[code, state]], cells[], extra: async()=>node, related[]})
async function board(o) {
  const page = figma.root.children.find(p => p.name === PAGE12); await figma.setCurrentPageAsync(page);
  let sec = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === SEC_NAME);
  if (!sec) { let mx = 0; for (const n of figma.currentPage.children) mx = Math.max(mx, n.x + n.width); sec = section(SEC_NAME, figma.currentPage.children.length ? Math.max(2000, Math.ceil((mx + 400) / 1000) * 1000) : 2000, 0); }
  const old = sec.children.find(n => n.name === o.frameName); const pos = old ? { x: old.x, y: old.y } : { x: 120 + o.col * 1560, y: 120 }; if (old) old.remove();
  const f = await screen(o.frameName, 1440, {}); sec.appendChild(f); f.x = pos.x; f.y = pos.y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('VERTICAL', { name: 'Board', gap: 32, p: [64, 64, 96, 64] }); add(f, [body, 'FILL']);
  const hd = AL('VERTICAL', { name: 'Header', gap: 12, w: CW });
  const o1 = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(o1, await T('PAGE 12 · EMPTY & ERROR STATES · ' + o.id, 'Overline', 'text/brand'), await chip(o.pri, false), await chip('Documentation board · library instances', false), await DEMO('M'));
  add(hd, o1, await T(o.title, 'Heading/H2', 'text/primary', { w: 1100 }), await T(o.desc, 'Body/L', 'text/secondary', { w: 1040 }));
  add(body, hd);
  const row = AL('HORIZONTAL', { name: 'Rules & trigger map', gap: 16, w: CW });
  const rc = AL('VERTICAL', { name: 'Rules', gap: 12, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(rc, await T('Rules for this group', 'Heading/H5', 'text/primary'));
  for (const s of o.rules) { const r = AL('HORIZONTAL', { gap: 8, align: 'MIN' }); add(r, await IC('check', 16, 'icon/brand'), await T(s, 'Body/S', 'text/secondary', { w: 568 })); add(rc, r); }
  const mc = AL('VERTICAL', { name: 'Trigger map', gap: 4, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14 }); add(mc, await T('Trigger → state', 'Heading/H5', 'text/primary'));
  for (const [code, s] of o.map) { const r = AL('HORIZONTAL', { gap: 16, p: [10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(r, await T(code, 'Mono/S', 'text/secondary', { w: 312 }), await T(s, 'Body/S', 'text/primary', { w: 264 })); add(mc, [r, 'FILL']); }
  add(row, [rc, 'FILL'], [mc, 'FILL']); add(body, row);
  const rh = Math.max(rc.height, mc.height); for (const x of [rc, mc]) { x.resize(x.width, rh); x.layoutSizingHorizontal = 'FILL'; }
  const cl = AL('VERTICAL', { name: 'Cells', gap: 24, w: CW }); add(body, cl);
  for (const c of o.cells) add(cl, await cell(c));
  if (o.extra) add(body, await o.extra());
  const rel = AL('VERTICAL', { name: 'Related screens', gap: 10, p: 24, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, w: CW });
  add(rel, await T('Full-screen versions elsewhere in this file', 'Label/M', 'text/primary'));
  for (const s of o.related) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC('arrow-right', 14, 'icon/muted'), await T(s, 'Body/S', 'text/secondary', { w: 1200 })); add(rel, r); }
  const lic = AL('HORIZONTAL', { name: 'Licence & 18+', gap: 12, align: 'CENTER' }); add(lic, await I('6:159'), await I('6:158', { Variant: 'Inline' })); add(rel, lic);
  add(body, rel);
  return { sec, f };
}
// ===== END ERR-B LIB =====
// ERR-04 board — Permission, session & connectivity states
const { sec, f } = await board({
  col: 0, id: 'ERR-04', pri: 'P1',
  frameName: '[ERR-04] Permission, session & offline states / 1440 / Board',
  title: 'Permission, session & connectivity states',
  desc: 'What players and admins see when access is refused, a session ends or the connection drops. Each state says what happened, confirms that balances and entries are safe, and offers one clear next step. Previews are library instances with per-state copy overrides.',
  rules: [
    'Money and entries are never lost or duplicated: every write carries an idempotency key, and after a drop we show the server’s answer, not a guess.',
    'Say what happened, what is safe and the one next step — never a bare 401, 403 or “Something went wrong”.',
    'After signing in again, players land on the same page; drafts are kept except passwords and codes.',
    'Permission messages name the level or role that is needed and how to get it.',
    'Status is always icon + label, never colour alone.'
  ],
  map: [
    ['403 kyc_level_required', '04.1 Verification level required'],
    ['403 role_forbidden · admin RBAC', '04.2 Admin — no access'],
    ['401 session_expired · idle 30 min', '04.3 Session expired'],
    ['401 step_up_required · 2FA > 15 min', '04.4 Confirm it’s you'],
    ['offline · WebSocket closed > 5 s', '04.5 Offline, reconnecting'],
    ['reconnected · request state unknown', '04.6 Back online / check before retry']
  ],
  cells: [
    { no: '04.1', sev: 'Restricted', name: 'Verification level required (player)', lib: 'Inline gate card · User/KYC Status Chip ×2 · Button/Primary · Button/Ghost — DEMO scenario: Level 1 account',
      stage: async () => { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await I('23:5565', { Status: 'Approved', Level: 'L1' }), await IC('arrow-right', 16, 'icon/muted'), await I('23:5565', { Status: 'Not started', Level: 'L2' }), await DEMO('S'));
        return [await panel({ w: 560, icon: 'id-card', bg: 'status/warning-tint', fg: 'text/warning', title: 'Level 2 verification needed', body: 'Withdrawals above 2,000.00 USDT a day need KYC Level 2 (photo ID + liveness check). Until then you can still withdraw up to 2,000.00 USDT today — your balance stays fully available.', extra: [r], btns: [['Primary', 'Verify identity', 'id-card'], ['Ghost', 'Withdraw up to 2,000.00']] })]; },
      trigger: 'API returns 403 kyc_level_required when a Level 1 account (separate DEMO scenario) asks to withdraw more than its daily limit, or opens referral payouts (Level 2 + 2FA required).',
      where: 'Inline, in place of the step that was refused (withdraw step 4, referral payout dialog).',
      copy: [['Title', 'Level 2 verification needed'], ['Body', 'Withdrawals above 2,000.00 USDT a day need KYC Level 2 (photo ID + liveness check). Until then you can still withdraw up to 2,000.00 USDT today — your balance stays fully available.'], ['Status chips', 'KYC L1 · Approved → KYC L2 · Not started']],
      actions: [['Primary', 'Verify identity', 'KYC Level 2 step (AUTH-11…17), then back to the withdrawal'], ['Ghost', 'Withdraw up to 2,000.00', 'Withdraw step 4 with the amount capped at the Level 1 limit']],
      notes: ['Never a bare “403”: the card names the level and what it unlocks.', 'Deposits and play are not blocked by this gate.', 'While Level 2 is being reviewed, the card shows KYC Pending instead.'] },
    { no: '04.2', sev: 'Restricted', name: 'Admin — role does not include this module', lib: 'Nav/Admin Item (Default · Child · No access) · Admin/Role Chip ×2 · inline no-access card',
      stage: async () => {
        const nav = AL('VERTICAL', { name: 'Admin nav (excerpt)', gap: 2, p: 8, fill: 'bg/secondary', stroke: 'border/subtle', r: 14, w: 248 });
        for (const [v, p] of [[{ Level: 'Group', State: 'Default' }, { Label: 'Finance', Icon: ICONS.wallet }], [{ Level: 'Child', State: 'Default' }, { Label: 'Withdrawals' }], [{ Level: 'Group', State: 'No access' }, { Label: 'Marketing', Icon: ICONS.megaphone }], [{ Level: 'Group', State: 'No access' }, { Label: 'System', Icon: ICONS.server }]]) add(nav, [await I('22:5497', v, p), 'FILL']);
        const rr = AL('HORIZONTAL', { gap: 8, align: 'CENTER', wrap: true, cgap: 8 }); add(rr, await T('Your role', 'Caption', 'text/tertiary'), await I('23:18440', { Role: 'Finance', Size: 'M' }), await T('Needed', 'Caption', 'text/tertiary'), await I('23:18440', { Role: 'Super Admin', Size: 'M' }), await DEMO('S'));
        const pn = await panel({ w: 456, icon: 'lock', bg: 'status/warning-tint', fg: 'text/warning', title: 'You don’t have access to System', body: 'System settings are limited to the Super Admin role. Ask S. Iyer for access — requests need a second approver and are recorded in the audit log.', extra: [[rr, 'FILL']], btns: [['Primary', 'Request access'], ['Secondary', 'Back to Finance']], bs: 'S' });
        const row = AL('HORIZONTAL', { gap: 16, align: 'MIN' }); add(row, nav, pn); return [row]; },
      trigger: 'Admin RBAC returns 403 role_forbidden — e.g. A. Marin (Finance Lead) opens System › Settings from a shared link. Modules outside the role show the “No access” lock in the sidebar.',
      copy: [['Title', 'You don’t have access to System'], ['Body', 'System settings are limited to the Super Admin role. Ask S. Iyer for access — requests need a second approver and are recorded in the audit log.'], ['Role chips', 'Your role · Finance → Needed · Super Admin']],
      actions: [['Primary', 'Request access', 'Access request in Approvals (ADM-00) with a mandatory reason, four-eyes'], ['Secondary', 'Back to Finance', 'Finance overview']],
      notes: ['Checked server-side: restricted data is never sent to the browser behind the message.', 'Every denied attempt is written to the audit log (actor, module, time).', 'Read-only roles get the same card titled “Read-only access”.'] },
    { no: '04.3', sev: 'Advisory', name: 'Session expired', lib: 'Inline re-auth dialog over scrim · Input/Text (Filled) · Input/Password · Button/Primary · Button/Ghost',
      stage: async () => {
        const em = await I('13:762', { State: 'Filled', Size: 'M' }, { Label: 'Email', 'Show helper': false }); await ov(em, 'Value text', 'n•••@example.com');
        const pw = await I('14:1735', { State: 'Default', Strength: 'Empty' }, { Label: 'Password', 'Show strength': false, 'Show requirements': false }); await ov(pw, 'Value text', 'Enter your password');
        const safe = await note('shield-check', 'Your balances, 35 entries in round #1,248 (closes 20:00 UTC) and withdrawal WD-20931 are exactly as you left them.', 392, 'status/success-tint', 'text/success');
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Values illustrative', 'Caption', 'text/tertiary'));
        const pn = await panel({ w: 440, modal: true, icon: 'clock', bg: 'status/info-tint', fg: 'text/info', title: 'You were signed out to keep your account safe', body: 'No activity for 30 minutes — last activity 27 Nov 2026, 18:12 UTC. Sign in again and we’ll bring you back to where you were.', extra: [[safe, 'FILL'], [em, 'FILL'], [pw, 'FILL'], dm], btns: [['Primary', 'Sign in', 'log-in'], ['Ghost', 'Go to lobby']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, pn); return [scr]; },
      trigger: 'API returns 401 session_expired: no activity for 30 minutes (timeout set in Security settings) or the refresh token expired. Raised by the idle timer or the next request.',
      copy: [['Title', 'You were signed out to keep your account safe'], ['Body', 'No activity for 30 minutes — last activity 27 Nov 2026, 18:12 UTC. Sign in again and we’ll bring you back to where you were.'], ['Reassurance', 'Your balances, 35 entries in round #1,248 (closes 20:00 UTC) and withdrawal WD-20931 are exactly as you left them.']],
      actions: [['Primary', 'Sign in', 'Password, then authenticator code (AUTH-08); returns to the same page'], ['Ghost', 'Go to lobby', 'Signed-out lobby']],
      notes: ['Form drafts are kept (never passwords or 2FA codes); open bet slips are cleared — nothing is placed.', 'Live data stops behind the scrim; balances are re-fetched after sign-in.', 'Full screens: [AUTH-20] Session Expired / Re-auth Modal (1440, 390).'] },
    { no: '04.4', sev: 'Security', name: 'Confirm it’s you (step-up re-auth)', lib: 'Modal/2FA · State=Default (title, description and primary label overridden)',
      stage: async () => { const m = await I('25:16745', { State: 'Default' }); await ov(m, 'Title', 'Confirm it’s you'); await ov(m, 'Description', 'Adding a new withdrawal address needs a fresh 2FA check. Your last check was 47 min ago.'); relabel(m, 'Confirm withdrawal', 'Confirm'); return [m]; },
      trigger: 'API returns 401 step_up_required when the last 2FA check is older than 15 minutes and the player adds or removes a whitelisted address, changes email, password or 2FA, raises a limit or reveals backup codes.',
      copy: [['Title', 'Confirm it’s you'], ['Body', 'Adding a new withdrawal address needs a fresh 2FA check. Your last check was 47 min ago.'], ['Anti-phishing block', 'YOUR ANTI-PHISHING CODE · AURORA-27']],
      actions: [['Primary', 'Confirm', 'Completes the original action — the player doesn’t start again'], ['Secondary', 'Cancel', 'Back to the form, nothing changed'], ['Ghost', 'Use backup code', 'Backup-code entry; “Lost your device?” opens recovery (AUTH-19)']],
      notes: ['5 wrong codes lock 2FA for 15 minutes (Modal/2FA · Locked) — the lock end time is shown.', 'The anti-phishing code is always shown so players can spot fake prompts.'] },
    { no: '04.5', sev: 'Warning', name: 'Offline — reconnecting', lib: 'Alert/Banner · Warning · Inline (copy + action overridden, close hidden) · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'You’re offline'); await ov(a, 'Body', 'We can’t reach GLOBAL POOL. Figures on this page are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.'); relabel(a, 'Switch network', 'Try again'); hide(a, 'Close');
        const r = AL('HORIZONTAL', { gap: 16, align: 'CENTER' }); add(r, await stat('wifi-off', 'Offline', 'text/warning'), await T('Reconnecting automatically · attempt 3 · next try in 8 s', 'Body/S', 'text/secondary'), await DEMO('S'));
        return [a, r, await BTN('Gold', 'Reconnect to enter', { size: 'L', state: 'Disabled' })]; },
      trigger: 'The browser reports offline, or the live WebSocket has been closed for more than 5 s and two REST retries failed.',
      where: 'Pinned under the top bar on every page; money buttons switch to their Disabled state.',
      copy: [['Title', 'You’re offline'], ['Body', 'We can’t reach GLOBAL POOL. Figures on this page are from 18:42 UTC and may be out of date. Entries, bets and withdrawals are paused until you’re back — nothing is sent twice.'], ['Status line', 'Reconnecting automatically · attempt 3 · next try in 8 s'], ['Disabled CTA', 'Reconnect to enter']],
      actions: [['Secondary', 'Try again', 'Immediate reconnect; otherwise back-off 2 → 4 → 8 → 16 s, max 30 s']],
      notes: ['Not dismissible while offline; replaced by the 04.6 toast on reconnect.', 'Countdowns keep running from the absolute close time (20:00 UTC) — they never freeze or reset.', 'History, limits and self-exclusion stay readable from cache.'] },
    { no: '04.6', sev: 'Recovery', name: 'Back online / check before you retry', lib: 'Toast · Success + Toast · Warning (copy overridden)',
      stage: async () => {
        const s = await I('30:16872', { Type: 'Success' }); await ov(s, 'Title', 'Back online'); await ov(s, 'Body', 'Live data refreshed at 18:44 UTC. Round #1,248 still closes at 20:00 UTC.'); await ov(s, 'Label', 'View round');
        const w = await I('30:16872', { Type: 'Warning' }); await ov(w, 'Title', 'Check before you retry'); await ov(w, 'Body', 'We lost the connection while buying 5 entries. Check My entries — if they aren’t there, nothing was charged.'); await ov(w, 'Label', 'Open My entries');
        return [s, w]; },
      trigger: 'Connection restored. Requests in flight are replayed with the same idempotency key; if the server’s answer still can’t be confirmed, the warning toast replaces any automatic retry.',
      copy: [['Success toast', 'Back online — Live data refreshed at 18:44 UTC. Round #1,248 still closes at 20:00 UTC.'], ['Warning toast', 'Check before you retry — We lost the connection while buying 5 entries. Check My entries — if they aren’t there, nothing was charged.']],
      actions: [['Ghost', 'View round', 'Global Pool round #1,248'], ['Ghost', 'Open My entries', 'Dashboard › My entries filtered to round #1,248']],
      notes: ['Success toast auto-dismisses after 6 s; the warning stays until closed.', 'Purchases are never retried automatically without the original idempotency key.'] }
  ],
  related: ['[AUTH-20] Session Expired / Re-auth Modal / 1440 + 390 (pages 04, 10)', '[AUTH-08] 2FA Challenge — Withdrawal / Default · Wrong code · Locked (page 04)', '[ADM-00] Admin shell — no permission state (page 09, Tablet 768 band)', '[AUTH-11…17] KYC verification levels and flow (page 04)']
});
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, secX: sec.x, frame: f.id, name: f.name, w: f.width, h: f.height, flags };
