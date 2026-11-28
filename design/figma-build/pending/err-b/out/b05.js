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
// ERR-05 board — Regulatory states (P0)
const K = { ok: ['check-circle', 'text/success'], no: ['ban', 'text/danger'], hide: ['eye-off', 'text/tertiary'], view: ['eye', 'text/info'] };
const { sec, f } = await board({
  col: 1, id: 'ERR-05', pri: 'P0',
  frameName: '[ERR-05] Regulatory states — region, licence, self-exclusion, age gate / 1440 / Board',
  title: 'Regulatory states — restricted region, licence required, self-excluded, age gate',
  desc: 'Honest, specific states for when the law or the player’s own choice stops play. Each one names the rule, keeps money and history reachable, and points to support and help organisations. None of them suggests a way around the restriction.',
  rules: [
    'Name the rule and the jurisdiction — never a vague “not available”.',
    'Never suggest a VPN, proxy, mirror domain or any other way around a restriction.',
    'Withdrawals, statements, account security and support stay open in every state.',
    'Not dismissible while the condition applies; no countdowns, offers or “play now” shortcuts.',
    'Help organisations and 18+ are visible on every regulatory state.'
  ],
  map: [
    ['geo.country ∈ restricted · IP + residence', '05.1 Banner + locked game tiles'],
    ['403 jurisdiction_blocked · play/deposit', '05.2 Blocked-action interstitial'],
    ['403 product_unlicensed · per product', '05.3 Licence required'],
    ['403 self_excluded · until 27 Nov 2027', '05.4 Self-excluded'],
    ['age_gate = under_18 · DOB < 18', '05.5 Age-gate fail'],
    ['every request · server-side checks', 'Availability matrix (below)']
  ],
  cells: [
    { no: '05.1', sev: 'Restricted', name: 'Restricted region — banner and locked games', lib: 'Alert/Banner · Regional restriction · Inline · Tile/Game · Restricted ×3 · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Regional restriction', Layout: 'Inline' });
        const r = AL('HORIZONTAL', { name: 'Locked tiles', gap: 12 }); for (const g of ['Global Pool', 'Roulette', 'Crash']) add(r, await I('23:14885', { Game: g, State: 'Restricted' }));
        return [a, r, await BTN('Gold', 'Not available in your region', { size: 'L', state: 'Disabled', lead: 'lock' })]; },
      trigger: 'Network location (IP) or declared residence is on the Restricted Countries list — example: United States. Checked at sign-in and before every deposit, bet or entry.',
      where: 'Pinned under the top bar on every page (Nav/Region Banner full width on the public site); game tiles switch to their Restricted state; Gold CTAs disabled.',
      copy: [['Title', 'Not available in your region'], ['Body', 'GLOBAL POOL games are not available in your region (United States). You can still view your account and withdraw funds.'], ['Tile overlay', 'Not available in your region'], ['Disabled CTA', 'Not available in your region']],
      actions: [['Secondary', 'Withdraw funds', 'Withdraw step 1 — to a whitelisted address'], ['Ghost', 'Restricted countries', 'Restricted Countries page with the reason per country']],
      notes: ['Not dismissible; no VPN, proxy or mirror-domain hint anywhere.', 'Location looks wrong? Support checks proof of residence — we never ask players to change their location.', 'Entries already bought stay in the draw.'] },
    { no: '05.2', sev: 'Blocking', name: 'Restricted region — blocked action interstitial', lib: 'Inline interstitial card · Button/Primary · Button/Secondary · Button/Ghost · Badge/DEMO',
      stage: async () => {
        const det = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(det, await IC('map-pin', 16, 'icon/muted'), await T('From your network location · checked 27 Nov 2026, 18:42 UTC', 'Caption', 'text/tertiary'), await DEMO('S'));
        return [await panel({ w: 640, h: 'Heading/H4', icon: 'map-pin', bg: 'status/warning-tint', fg: 'text/warning', title: 'GLOBAL POOL isn’t available in your region', body: 'Real-money games — Global Pool rounds, Originals and table games — need a licence in every country where they’re offered. We don’t hold one for the United States, so from here you can’t play, deposit or enter rounds.',
          extra: [det, [await note('globe', 'Travelling? Your account, balance and open entries are safe — access returns automatically when you’re back in a permitted country.', 592), 'FILL'], [await note('help-circle', 'Location looks wrong? Support can check it with you — we never ask you to change it.', 592), 'FILL']],
          btns: [['Primary', 'Withdraw funds', 'withdraw'], ['Secondary', 'Contact support', 'chat'], ['Ghost', 'Restricted countries']] })]; },
      trigger: 'API returns 403 jurisdiction_blocked when a player in a restricted region opens a game, deposit or Global Pool deep link (e.g. /games/orbit-rush from the United States).',
      copy: [['Title', 'GLOBAL POOL isn’t available in your region'], ['Body', 'Real-money games — Global Pool rounds, Originals and table games — need a licence in every country where they’re offered. We don’t hold one for the United States, so from here you can’t play, deposit or enter rounds.'], ['Travel note', 'Travelling? Your account, balance and open entries are safe — access returns automatically when you’re back in a permitted country.'], ['Location note', 'Location looks wrong? Support can check it with you — we never ask you to change it.']],
      actions: [['Primary', 'Withdraw funds', 'Withdraw step 1 (whitelisted address, normal security checks)'], ['Secondary', 'Contact support', 'Help centre ticket, topic “Location”'], ['Ghost', 'Restricted countries', 'Restricted Countries page']],
      notes: ['Replaces the blocked page; header, wallet and account menu stay usable.', 'Full screen: [PUB-21] Geo-block interstitial (1440, 390).'] },
    { no: '05.3', sev: 'Restricted', name: 'Licence required — product not licensed here', lib: 'Alert/Banner · Regulatory notice · Inline (copy overridden) · Notice/Licence · Card · Button/Gold · Disabled',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Regulatory notice', Layout: 'Inline' }); await ov(a, 'Title', 'Global Pool isn’t licensed where you live'); await ov(a, 'Body', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Entries are switched off for accounts registered there; Originals and table games stay available, and your balance and any owed refunds are unaffected.');
        return [a, await I('6:158', { Variant: 'Card' }), await BTN('Gold', 'Entries not available in Ontario', { size: 'L', state: 'Disabled', lead: 'lock' })]; },
      trigger: 'API returns 403 product_unlicensed: the player’s jurisdiction is permitted for some products but not this one (DEMO scenario: Global Pool in Ontario, Canada). Evaluated per product, not per site.',
      where: 'Global Pool hub, round pages and the participation preview; the lobby tile shows the same lock.',
      copy: [['Title', 'Global Pool isn’t licensed where you live'], ['Body', 'Global Pool participation needs a separate local licence in Ontario, Canada, which we don’t hold. Entries are switched off for accounts registered there; Originals and table games stay available, and your balance and any owed refunds are unaffected.'], ['Disabled CTA', 'Entries not available in Ontario']],
      actions: [['Ghost', 'Licence details', 'Licence & jurisdiction page (licence number placeholder, regulator, permitted regions)']],
      notes: ['The persistent licence notice (Notice/Licence) stays on every gambling surface in every state.', 'Refunds from cancelled rounds are still paid to Owed → Available.', 'No “notify me when available” marketing opt-in is pre-checked.'] },
    { no: '05.4', sev: 'Restricted', name: 'Self-excluded', lib: 'Inline account-state card · Button/Primary · Button/Secondary · Button/Ghost · RG/Help Resources',
      stage: async () => {
        const facts = await bul(['Entries bought before your break (35 in round #1,248) still settle; prizes go to Available.', 'Owed 415.20 USDT (refund + VIP reward earned before your break) settles to Available and can be withdrawn.', 'No emails, push messages or bonus offers until the break ends.'], 672);
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Values illustrative', 'Caption', 'text/tertiary'));
        const p = await panel({ w: 720, h: 'Heading/H4', icon: 'pause-circle', bg: 'status/info-tint', fg: 'text/info', title: 'You’re taking a break until 27 Nov 2027, 16:45 UTC', body: 'You chose to self-exclude on 27 Nov 2026, 16:45 UTC. Until then you can’t play, enter Global Pool rounds or deposit — and the break can’t be shortened or undone early, not even by support.', extra: [[facts, 'FILL'], dm], btns: [['Primary', 'Withdraw balance', 'withdraw'], ['Secondary', 'Download statements', 'download'], ['Ghost', 'Talk to support']] });
        return [p, await I('24:14743')]; },
      trigger: 'Account flag rg.self_excluded is active (1 year, set 27 Nov 2026, 16:45 UTC). Shown at sign-in and in place of any game, Global Pool, promotion or VIP page; API answers 403 self_excluded.',
      copy: [['Title', 'You’re taking a break until 27 Nov 2027, 16:45 UTC'], ['Body', 'You chose to self-exclude on 27 Nov 2026, 16:45 UTC. Until then you can’t play, enter Global Pool rounds or deposit — and the break can’t be shortened or undone early, not even by support.'], ['Help block', 'Support is available — free, confidential help with gambling, 24/7.']],
      actions: [['Primary', 'Withdraw balance', 'Withdraw step 1 — security checks as usual'], ['Secondary', 'Download statements', 'Financial history export (CSV)'], ['Ghost', 'Talk to support', 'Support can help withdraw or close the account — never end the break']],
      notes: ['There is no “end early” or “play now” option anywhere; games, Global Pool, promotions and VIP are hidden from navigation.', 'The break can be made longer or permanent, never shorter.', 'Full screen: [AUTH-18] Restricted Account / Self-excluded (1440, 390).'] },
    { no: '05.5', sev: 'Blocking', name: 'Age-gate fail — under 18', lib: 'Inline age-gate result dialog over scrim · Badge/18+ · Button/Secondary · Button/Ghost',
      stage: async () => {
        const b18 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(b18, await I('6:159'), await T('Adults only', 'Label/S', 'text/secondary'));
        const lock = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(lock, await IC('lock', 14, 'icon/muted'), await T('The site stays locked on this device.', 'Caption', 'text/tertiary'));
        const p = await panel({ w: 520, modal: true, icon: 'ban', bg: 'status/danger-tint', fg: 'text/danger', title: 'You must be 18 or older to use GLOBAL POOL', body: 'You told us you’re under 18, so we can’t let you in. GLOBAL POOL — including Global Pool rounds, Originals and every promotion — is for adults only.',
          extra: [b18, [await note('heart', 'Free, confidential support about gambling — for you or someone you know: Gambling Therapy (gamblingtherapy.org) · GamCare (gamcare.org.uk).', 472), 'FILL'], [await note('info', 'Parents and carers: free filtering tools can block gambling sites on shared phones and computers.', 472), 'FILL'], lock],
          btns: [['Secondary', 'Leave GLOBAL POOL'], ['Ghost', 'Responsible Gaming policy']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, p); return [scr]; },
      trigger: 'Visitor answers “No, I’m under 18” in the age gate, or the date of birth at registration is under 18 (or the higher legal age where they live).',
      copy: [['Title', 'You must be 18 or older to use GLOBAL POOL'], ['Body', 'You told us you’re under 18, so we can’t let you in. GLOBAL POOL — including Global Pool rounds, Originals and every promotion — is for adults only.'], ['Help', 'Free, confidential support about gambling — for you or someone you know.'], ['Parents', 'Parents and carers: free filtering tools can block gambling sites on shared phones and computers.'], ['Footer', 'The site stays locked on this device.']],
      actions: [['Secondary', 'Leave GLOBAL POOL', 'Neutral exit page (no games, no offers)'], ['Ghost', 'Responsible Gaming policy', 'Responsible Gaming page']],
      notes: ['No “change my answer” or retry button; the 18+ and jurisdiction checkboxes are never pre-checked.', 'Details typed before the answer are discarded, not stored.', 'Full screens: [PUB-22] Age gate · Failure (1440, 390).'] }
  ],
  extra: async () => {
    const c = AL('VERTICAL', { name: 'Availability matrix', gap: 0, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: CW });
    const h = AL('VERTICAL', { gap: 6, p: [0, 0, 16, 0] }); add(h, await T('Availability by regulatory state', 'Heading/H4', 'text/primary'), await T('Enforced server-side on every request; the UI mirrors the API answer. Status is icon + label, never colour alone.', 'Body/S', 'text/secondary', { w: 900 })); add(c, h);
    const cols = ['FEATURE', 'RESTRICTED REGION', 'LICENCE REQUIRED', 'SELF-EXCLUDED', 'AGE-GATE FAIL'];
    const hr = AL('HORIZONTAL', { name: 'Header row', p: [10, 0] }); strokeSides(hr, 'border/default', { b: 1 }); for (let i = 0; i < 5; i++) { const x = AL('HORIZONTAL', { w: i ? 246 : 280 }); add(x, await T(cols[i], 'Overline', 'text/tertiary')); add(hr, x); } add(c, [hr, 'FILL']);
    const rows = [
      ['Browse lobby & game pages', ['view', 'View only'], ['ok', 'Available'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Originals & table games', ['no', 'Blocked'], ['ok', 'Available'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Global Pool entries', ['no', 'Blocked'], ['no', 'Not licensed'], ['hide', 'Hidden'], ['no', 'Locked']],
      ['Deposits', ['no', 'Blocked'], ['ok', 'Available'], ['no', 'Blocked'], ['no', 'Locked']],
      ['Withdrawals', ['ok', 'Open · whitelisted address'], ['ok', 'Open'], ['ok', 'Open'], ['view', 'No account created']],
      ['Entries already bought', ['ok', 'Stay in the draw'], ['ok', 'Stay in the draw'], ['ok', 'Settle as normal'], ['view', 'Not applicable']],
      ['Promotions & marketing', ['hide', 'Paused'], ['hide', 'Global Pool offers hidden'], ['hide', 'Hidden · no emails or push'], ['hide', 'Hidden']],
      ['Account, history, RG tools & support', ['ok', 'Available'], ['ok', 'Available'], ['ok', 'Available'], ['view', 'Help pages only']]
    ];
    for (const [feat, ...vals] of rows) {
      const r = AL('HORIZONTAL', { name: 'Row — ' + feat, p: [12, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 });
      const fc = AL('HORIZONTAL', { w: 280 }); add(fc, await T(feat, 'Body/S', 'text/primary', { w: 264 })); add(r, fc);
      for (const [k, lb] of vals) { const x = AL('HORIZONTAL', { w: 246 }); add(x, await stat(K[k][0], lb, K[k][1])); add(r, x); }
      add(c, [r, 'FILL']);
    }
    return c;
  },
  related: ['[PUB-21] Geo-block interstitial / United States (restricted) / 1440 + 390 (pages 03, 10)', '[PUB-22] Age gate + licence notice / Default · Failure / 1440 + 390 (pages 03, 10)', '[AUTH-18] Restricted Account / Suspended · Under review · Self-excluded · Geo-restricted / 1440 + 390 (pages 04, 10)', '[USR-RG] Responsible gaming — self-exclusion and cooling-off flow (page 05)', '[GP-01] Global Pool hub / Restricted (page 07)']
});
// carry-over fix for the ERR-04 board (04.3 password placeholder)
const b4 = await figma.getNodeByIdAsync('275:2410');
if (b4) { const c3 = b4.findOne(n => n.name.startsWith('Cell 04.3')); const pw = c3 && c3.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === 'Input/Password')[0]; if (pw) await ov(pw, 'Value text', 'Enter your password'); }
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, name: f.name, x: f.x, w: f.width, h: f.height, flags };
