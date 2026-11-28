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
// ERR-07 board — Security warnings library (P0)
let m71, a76, n76, ad73;
const { sec, f } = await board({
  col: 3, id: 'ERR-07', pri: 'P0',
  frameName: '[ERR-07] Security warnings library — wrong network, new address, phishing, suspicious sign-in / 1440 / Board',
  title: 'Security warnings library — wrong network, new address, phishing, suspicious sign-in',
  desc: 'Warnings that protect funds and accounts. They appear before the risky step, explain the risk in one sentence, and offer the safe action first. Every security message carries the player’s anti-phishing code so fake messages are easy to spot.',
  rules: [
    'Warn before the risky step, not after it.',
    'Security alerts can’t be dismissed until the player chooses an action.',
    'The anti-phishing code AURORA-27 appears in every email and every 2FA prompt.',
    'We never ask for a seed phrase, private key or 2FA code — by chat, email, phone or DM.',
    'Holds and cooldowns show their exact end time and can’t be skipped, not even by support or VIP status.'
  ],
  map: [
    ['wallet.chainId ∉ supported', '07.1 Wrong network — wallet'],
    ['deposit network ≠ wallet chain', '07.2 Wrong network or token — deposit'],
    ['withdraw.to ∉ whitelist', '07.3 New address — 24 h hold'],
    ['security email · 2FA prompt', '07.4 Anti-phishing code'],
    ['link.domain ∉ allow-list', '07.5 Leaving GLOBAL POOL'],
    ['risk.login = new device / city', '07.6 Suspicious sign-in']
  ],
  cells: [
    { no: '07.1', sev: 'Warning', name: 'Wrong network — connected wallet', lib: 'Modal/Connect Wallet · State=Wrong network · Button/Wallet · Wrong network',
      stage: async () => { m71 = await I('27:16569', { State: 'Wrong network' }); const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, await I('7:859', { Size: 'M', State: 'Wrong network' }), await T('Top-bar wallet button while the wallet is on an unsupported chain', 'Caption', 'text/tertiary')); return [m71, r]; },
      trigger: 'The connected wallet reports a chain we don’t support (example: chain ID 10), or a different chain from the one the current step needs (e.g. Arbitrum withdrawal while the wallet is on BNB Chain).',
      where: 'Connect Wallet modal, top-bar wallet button, and any step that needs a wallet signature.',
      copy: async () => [['Title', txt(m71, 'Title')], ['Body', txt(m71, 'Description')], ['Network tag', txt(m71, 'Tag label')]],
      actions: [['Primary', 'Switch to Arbitrum', 'Wallet switch-network prompt; returns to the same step once switched'], ['Secondary', 'Disconnect', 'Disconnects the wallet — platform balance is unaffected']],
      notes: ['Balances, history and entries paid from the platform balance keep working — only on-chain signatures wait.', '“We never ask for your seed phrase” is shown in every state of the modal.', 'Solana is supported through Phantom only.'] },
    { no: '07.2', sev: 'Warning', name: 'Wrong network or token — deposit', lib: 'Alert/Banner · Warning · Inline (copy + action overridden, close hidden) · Wallet/Network Pill · Token/USDT',
      stage: async () => {
        const a = await I('30:17116', { Type: 'Warning', Layout: 'Inline' }); await ov(a, 'Title', 'Send USDT on Arbitrum One only'); await ov(a, 'Body', 'This address accepts USDT on Arbitrum One only. Other tokens, or USDT sent on another network, can’t be credited automatically and may be lost. Check the network in your wallet before you send.'); relabel(a, 'Switch network', 'Change network'); hide(a, 'Close');
        const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const tk = AL('HORIZONTAL', { gap: 6, p: [4, 10], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(tk, await CHAIN('USDT', 16), await T('USDT · Arbitrum One', 'Label/S', 'text/primary'));
        add(r, await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' }, { 'Show status label': true, 'Show chevron': true }), tk, await T('Only this pair is accepted at this address', 'Caption', 'text/tertiary'));
        return [a, r]; },
      trigger: 'Always shown on deposit steps 3–4 (address and QR); becomes a confirm-before-copy step when the connected wallet’s chain differs from the selected deposit network.',
      copy: [['Title', 'Send USDT on Arbitrum One only'], ['Body', 'This address accepts USDT on Arbitrum One only. Other tokens, or USDT sent on another network, can’t be credited automatically and may be lost. Check the network in your wallet before you send.'], ['Pair label', 'USDT · Arbitrum One']],
      actions: [['Secondary', 'Change network', 'Deposit step 1 — network picker with fees and confirmations']],
      notes: ['Address format is validated per chain (0x… for EVM networks, base58 for Solana) before an address is shown or accepted.', 'Unrecognised tokens follow the recovery flow in the deposit states — never silently ignored.', 'Not dismissible on the address and QR steps.'] },
    { no: '07.3', sev: 'Security', name: 'New withdrawal address — 24 h security hold', lib: 'Input/Address · State=New address · Button/Primary · Button/Secondary · inline email notice',
      stage: async () => {
        ad73 = await I('15:3617', { State: 'New address' });
        const br = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(br, await BTN('Primary', 'Use 0x7c4e…a21D (whitelisted)', { lead: 'shield-check' }), await BTN('Secondary', 'Add to whitelist'));
        const nt = await note('mail', 'We emailed n•••@example.com about this address. The email shows your anti-phishing code AURORA-27.', 460, 'surface/default', 'icon/brand');
        const dm = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(dm, await DEMO('S'), await T('Addresses and times illustrative', 'Caption', 'text/tertiary'));
        return [ad73, nt, br, dm]; },
      trigger: 'The withdrawal destination (0x3f9a…c47E) isn’t on the whitelist. Whitelisting needs 2FA + email confirmation and starts a 24 h hold; withdrawals to it unlock afterwards.',
      where: 'Withdraw step 3 (Address), Account › Security › Withdrawal whitelist.',
      copy: async () => [['Warning title', txt(ad73, 'Warning title')], ['Warning body', txt(ad73, 'Warning body')], ['Email notice', 'We emailed n•••@example.com about this address. The email shows your anti-phishing code AURORA-27.']],
      actions: [['Primary', 'Use 0x7c4e…a21D (whitelisted)', 'Selects the address whitelisted on 14 Oct 2026'], ['Secondary', 'Add to whitelist', 'Modal/2FA + email link, then the 24 h hold starts'], ['Ghost', 'Cancel', 'Back to the withdrawal amount, nothing saved']],
      notes: ['The hold can’t be shortened by support or VIP status.', 'Removing an address is instant; adding one always starts a new 24 h hold.', 'Full screens: withdraw address step, New address state (page 06).'] },
    { no: '07.4', sev: 'Security', name: 'Anti-phishing code — spot fake messages', lib: 'Inline security-email preview · Badge/DEMO · Button/Secondary · Button/Ghost',
      stage: async () => {
        const em = AL('VERTICAL', { name: 'Security email preview', gap: 16, p: 24, fill: 'surface/raised', stroke: 'border/subtle', r: 14, w: 600 });
        for (const [k, v] of [['From', 'GLOBAL POOL Security <security@example.com>'], ['Subject', 'Confirm your new withdrawal address']]) { const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, await T(k, 'Caption', 'text/tertiary', { w: 64 }), await T(v, 'Body/S', 'text/primary')); add(em, r); }
        const code = AL('HORIZONTAL', { name: 'Code block', gap: 12, p: [12, 16], fill: 'brand/tint-subtle', stroke: 'border/brand', r: 10, align: 'CENTER' });
        const cv = AL('VERTICAL', { gap: 2 }); add(cv, await T('YOUR ANTI-PHISHING CODE', 'Overline', 'text/tertiary'), await T('AURORA-27', 'Mono/M', 'text/brand')); add(code, await IC('shield-check', 20, 'icon/brand'), cv, await DEMO('S')); add(em, [code, 'FILL']);
        add(em, await T('You asked to whitelist 0x3f9a…c47E on Arbitrum. If this wasn’t you, don’t click anything in this email — open the GLOBAL POOL app and secure your account.', 'Body/S', 'text/secondary', { w: 552 }));
        add(em, [await note('alert-triangle', 'No code, or a different one? It isn’t from us. Forward it to security@example.com and delete it.', 552, 'status/warning-tint', 'text/warning'), 'FILL']);
        return [em]; },
      trigger: 'Every email we send (security, transactions and marketing) and every in-app 2FA prompt shows the player’s code AURORA-27, set in Account › Security.',
      copy: [['Code block', 'YOUR ANTI-PHISHING CODE · AURORA-27'], ['Email warning', 'No code, or a different one? It isn’t from us. Forward it to security@example.com and delete it.'], ['In-app caption (Modal/2FA)', 'Only GLOBAL POOL shows this code. If it’s missing or different, close this window and contact support.']],
      actions: [['Secondary', 'Report phishing', 'In-app report form (or forward to security@example.com)'], ['Ghost', 'Change code', 'Account › Security › Anti-phishing code — 2FA required']],
      notes: ['Changing the code needs 2FA and sends a confirmation to the account email.', 'security@example.com is a placeholder address (DEMO).'] },
    { no: '07.5', sev: 'Warning', name: 'Leaving GLOBAL POOL — unverified link', lib: 'Inline link-check dialog over scrim · Button/Primary · Button/Ghost',
      stage: async () => {
        const dr = AL('HORIZONTAL', { gap: 12, align: 'CENTER', wrap: true, cgap: 8 }); add(dr, await chip('globalpool-bonus.example'), await stat('alert-triangle', 'Not a GLOBAL POOL domain', 'text/warning'));
        const p = await panel({ w: 520, modal: true, icon: 'external-link', bg: 'status/warning-tint', fg: 'text/warning', title: 'You’re leaving GLOBAL POOL', body: 'globalpool-bonus.example isn’t one of our sites. We never ask for your seed phrase, private key or 2FA codes, and support never messages you first.', extra: [dr, [await note('shield', 'Our official domains are listed on the Security page.', 472), 'FILL']], btns: [['Primary', 'Go back to GLOBAL POOL'], ['Ghost', 'Continue to site']] });
        const scr = AL('VERTICAL', { name: 'Scrim (dimmed page)', p: 32, fill: 'scrim/overlay', r: 14, align: 'CENTER', w: 720 }); add(scr, p); return [scr]; },
      trigger: 'A player opens an external link from chat, a profile, an announcement or a pasted URL whose domain isn’t on the allow-list. Known phishing domains are blocked outright.',
      copy: [['Title', 'You’re leaving GLOBAL POOL'], ['Body', 'globalpool-bonus.example isn’t one of our sites. We never ask for your seed phrase, private key or 2FA codes, and support never messages you first.'], ['Domain status', 'Not a GLOBAL POOL domain'], ['Known phishing variant', 'This site has been reported as phishing. We’ve blocked it to protect your account.']],
      actions: [['Primary', 'Go back to GLOBAL POOL', 'Previous page'], ['Ghost', 'Continue to site', 'Opens in a new tab (noopener) — removed for known phishing domains']],
      notes: ['Look-alike domains (e.g. g1obalpool) are flagged even before anyone reports them.', 'The safe action is primary and focused by default.'] },
    { no: '07.6', sev: 'Security', name: 'Suspicious sign-in — new device', lib: 'Alert/Banner · Security · Inline (time aligned to the device record) · User/Notification Item · Security',
      stage: async () => {
        a76 = await I('30:17116', { Type: 'Security', Layout: 'Inline' }); await ov(a76, 'Body', '25 Nov 2026, 19:06 UTC. If this wasn’t you, secure your account now. Withdrawals requested from a new device are held for 24 h.');
        n76 = await I('23:11317', { Type: 'Security', Read: 'No' });
        return [a76, n76]; },
      trigger: 'Risk engine flags a sign-in from a new device and city (Windows · Edge · Madrid, 25 Nov 2026, 19:06 UTC) for @nova.k, whose usual devices are in Lisbon.',
      where: 'Banner on every page until answered, notification centre, and an email with AURORA-27.',
      copy: async () => [['Title', txt(a76, 'Title')], ['Body', txt(a76, 'Body')], ['Notification', txt(n76, 'Title') + ' — ' + txt(n76, 'Body')]],
      actions: [['Primary', 'Secure account', 'Signs out every other session, then password reset and 2FA check'], ['Ghost', 'This was me', 'Marks the device trusted after a 2FA check']],
      notes: ['Not dismissible until the player picks an action.', 'Withdrawals requested from the new device are held 24 h either way.', 'Full screens: [AUTH-21] New-device Login Alert (1440, 390); devices list in Account & security.'] }
  ],
  extra: async () => {
    const c = AL('VERTICAL', { name: 'We will never ask', gap: 16, p: 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: CW });
    add(c, await T('We will never ask you to…', 'Heading/H4', 'text/primary'), await T('Shown on the Security page, in the help centre and linked from every warning above. Reused as-is in support macros.', 'Body/S', 'text/secondary', { w: 900 }));
    const g = AL('HORIZONTAL', { name: 'Never list', gap: 12, wrap: true, cgap: 12, w: 1264 });
    for (const s of ['Share your seed phrase or private key', 'Read out a 2FA or email code', 'Install remote-access software', 'Pay a fee to “unlock” a withdrawal', 'Send funds to a “verification” address', 'Sign a wallet message you don’t recognise']) { const it = AL('HORIZONTAL', { gap: 10, p: [12, 16], fill: 'surface/raised', stroke: 'border/default', r: 10, align: 'CENTER', w: 413 }); add(it, await IC('ban', 18, 'text/danger'), await T(s, 'Body/S', 'text/primary', { w: 350 })); add(g, it); }
    add(c, g);
    return c;
  },
  related: ['[AUTH-09] Connect Wallet / Wrong network / 1440 + 390 (pages 04, 10)', '[AUTH-21] New-device Login Alert / 1440 + 390 (pages 04, 10)', '[WAL-12/13] Withdraw — address step / New address (page 06)', '[WAL-04/05] Deposit — network and address steps (page 06)', '[USR-A] Account & security — anti-phishing code, devices, withdrawal whitelist (page 05)']
});
fitSection(sec);
const flags = audit(f);
await f.screenshot({ scale: 0.5 });
return { section: sec.id, frame: f.id, name: f.name, x: f.x, w: f.width, h: f.height, flags };
