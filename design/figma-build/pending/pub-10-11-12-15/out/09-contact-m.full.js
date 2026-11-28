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
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 — Mobile', 49000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
async function mshell(name, x, y) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', p: [24, 16, 40, 16], gap: 40 }); add(f, [C, 'FILL']);
  return { f, C };
}
async function mfinish(S, stickyNode) {
  const foot = await I('23:17478', { Breakpoint: 'Mobile' }); foot.name = 'Shell/Footer Mega'; add(S.f, [foot, 'FILL']);
  if (stickyNode) add(S.f, [stickyNode, 'FILL']);
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar — fixed to viewport bottom'; add(S.f, [tab, 'FILL']);
  S.f.primaryAxisSizingMode = 'AUTO';
}
async function mhead(over, title, body, right) { const v = AL('VERTICAL', { name: 'Section header — ' + title, gap: 6 }); const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, [await T(over, 'Overline', 'text/brand'), 'FILL']); if (right) add(r, right); add(v, [r, 'FILL'], [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (body) add(v, [await T(body, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']); return v; }
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 16, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
function abs(parent, node, x, y, rot) { parent.appendChild(node); if (parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
function artFrame(name, h) { const a = figma.createFrame(); a.name = name; a.resize(358, h); fill(a, 'surface/default'); radius(a, 20); stroke(a, 'border/subtle'); a.clipsContent = true; return a; }
async function sticky(label, note, lead) { const b = AL('VERTICAL', { name: 'Sticky CTA — pinned above tab bar', fill: 'bg/secondary', p: [12, 16, 12, 16], gap: 6, align: 'CENTER' }); strokeSides(b, 'border/subtle', { t: 1 }); const bt = await BTN('Primary', label, { size: 'L', lead }); bt.name = 'Button — Sticky CTA'; add(b, [bt, 'FILL']); if (note) add(b, await T(note, 'Caption', 'text/tertiary', { name: 'Sticky note' })); return b; }
async function mlic(C) { const r = AL('HORIZONTAL', { name: 'Licence + 18+', gap: 8, align: 'CENTER' }); add(r, await I('6:158', { Variant: 'Compact' }), await I('6:159')); add(C, [r, 'FILL']); }
async function rowsList(name, rows, o = {}) { const l = box(name, { gap: 0, p: [4, 16, 4, 16] }); for (let i = 0; i < rows.length; i++) { const [k, v] = rows[i]; const r = AL('HORIZONTAL', { gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); if (i < rows.length - 1) strokeSides(r, 'border/subtle', { b: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary', { w: 150 }), 'FILL']); if (v === 0) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('minus', 14, 'icon/muted'), await T('Not included', 'Body/S', 'text/tertiary')); add(r, n); } else if (v === 1) { const n = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(n, await IC('check', 14, 'icon/brand'), await T('Included', 'Body/S', 'text/primary')); add(r, n); } else add(r, await T(v, o.vs || 'Label/M', o.vc || 'text/primary', { w: o.vw || 160, align: 'RIGHT' })); add(l, [r, 'FILL']); } return l; }
async function iconRow(ic, title, body, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + title, gap: 12, p: [12, 0, 12, 0] }); if (o.line) strokeSides(r, 'border/subtle', { b: 1 }); const ib = AL('HORIZONTAL', { fill: o.tint || 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, o.ic || 'icon/brand')); const t = AL('VERTICAL', { gap: 2 }); add(t, await T(title, 'Body/M Strong', 'text/primary', { w: 270 }), [await T(body, 'Body/S', 'text/secondary', { w: 270 }), 'FILL']); add(r, ib, [t, 'FILL']); return r; }
const VIPB = { Bronze: ['Level-up rewards 0.50–1.50 USDT', 'Standard support', 'Monthly activity statement'], Silver: ['Weekly reward, paid in USDT', 'Level-up rewards 1.00–1.80 USDT', 'Standard support'], Gold: ['Weekly reward, paid in USDT', 'Level-up rewards 2.00–15.00 USDT', 'Priority support queue'], Platinum: ['Weekly + monthly reward', 'Level-up rewards 25.00–60.00 USDT', 'Dedicated VIP host', 'Platinum tournament series'], Diamond: ['Weekly + monthly reward', 'Level-up rewards 100.00–500.00 USDT', 'Dedicated VIP host', 'All VIP events & invitations'] };
async function vipFix(inst) { const mc = await inst.getMainComponentAsync(); const tier = (mc && mc.name.match(/Tier=(\w+)/) || [])[1]; const b = VIPB[tier]; if (!b) return 0; const ts = inst.findAll(n => n.type === 'TEXT' && n.name === 'Benefit'); ts.forEach((t, i) => { if (b[i]) t.characters = b[i]; }); return ts.length; }
const S = await mshell('[PUB-15] Contact / 390 / Default — empty form', 1650, 120); const C = S.C;
const hd = AL('VERTICAL', { name: 'Page header', gap: 12 }); add(C, [hd, 'FILL']);
add(hd, await T('Contact support', 'Heading/H2', 'text/primary'), [await T('Real people, around the clock. Most emails get a first reply in about 2 hours.', 'Body/M', 'text/secondary', { w: 358 }), 'FILL']);
const stt = AL('HORIZONTAL', { name: 'System status', fill: 'surface/default', stroke: 'border/subtle', r: 9999, p: [8, 14, 8, 10], gap: 8, align: 'CENTER' }); add(stt, await IC('alert-triangle', 16, 'text/warning'), await T('Ethereum slower than usual', 'Label/M', 'text/primary'), await IC('external-link', 14, 'icon/brand')); add(hd, stt);
const chat = box('Live chat', { gap: 12, p: 16 }); add(C, [chat, 'FILL']);
const chh = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); const ci = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ci, await IC('chat', 20, 'icon/brand')); const ct = AL('VERTICAL', { gap: 2 }); add(ct, await T('Live chat · 24/7', 'Body/M Strong', 'text/primary'), await T('Median wait under 2 min', 'Body/S', 'text/secondary')); add(chh, ci, [ct, 'FILL'], await DEMO('XS')); add(chat, [chh, 'FILL']);
add(chat, [await BTN('Secondary', 'Start live chat', { size: 'L', lead: 'chat' }), 'FILL']);
const form = AL('VERTICAL', { name: 'Contact form', fill: 'surface/default', stroke: 'border/subtle', r: 20, p: 16, gap: 20 }); add(C, [form, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Form header', gap: 12, align: 'CENTER' }); add(fh, [await T('Or send us a message', 'Heading/H5', 'text/primary', { name: 'Form title' }), 'FILL'], await T('* required', 'Caption', 'text/tertiary')); add(form, [fh, 'FILL']);
const an = AL('HORIZONTAL', { name: 'Anti-phishing notice', fill: 'status/info-tint', r: 10, p: 12, gap: 10 }); add(an, await IC('shield', 18, 'text/info'), [await T('We never ask for passwords, 2FA codes, seed phrases or private keys. Our emails show your anti-phishing code.', 'Caption', 'text/primary', { w: 280 }), 'FILL']); add(form, [an, 'FILL']);
const fields = AL('VERTICAL', { name: 'Fields', gap: 16 }); add(form, [fields, 'FILL']);
const topic = await I('13:565', { State: 'Default' }, { Label: 'Topic *', Value: 'Choose a topic', 'Show helper': false, 'Show leading icon': true, 'Leading icon': ICONS['list'] }); topic.name = 'Field — Topic'; const tv = topic.findOne(n => n.name === 'Value' && n.type === 'TEXT'); if (tv) tv.fills = [paint('text/tertiary')]; add(fields, [topic, 'FILL']);
async function inp(name, label, value, o = {}) { const p = { Label: label, 'Show leading icon': !!o.icon, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const i = await I('13:762', { State: 'Default', Size: 'L' }, p); i.name = 'Field — ' + name; txt(i, 'Value text', value); if (o.helper) txt(i, 'Helper text', o.helper); const v = i.findOne(n => n.name === 'Value text'); if (v) v.fills = [paint('text/tertiary')]; return i; }
add(fields, [await inp('Name', 'Name', 'How should we address you?', { icon: 'user' }), 'FILL'], [await inp('Email', 'Email *', 'name@example.com', { icon: 'mail', helper: 'We reply to this address.' }), 'FILL'], [await inp('Account ID', 'Account ID (optional)', 'GP-•••••', { icon: 'id-card' }), 'FILL'], [await inp('Reference', 'Reference (optional)', 'e.g. WD-20931 or round #1,248', { icon: 'hash' }), 'FILL']);
const msg = await I('16:3858', { State: 'Default' }, { Label: 'Message *', 'Show counter': true }); msg.name = 'Field — Message'; txt(msg, 'Value text', 'Describe what happened, when, and what you expected.'); const mv = msg.findOne(n => n.name === 'Value text'); if (mv) mv.fills = [paint('text/tertiary')]; txt(msg, 'Counter', '0 / 2,000'); add(fields, [msg, 'FILL']);
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Email me a copy of this message', 'Show description': false }); cb.name = 'Field — Copy to email'; add(fields, cb);
const pn = AL('HORIZONTAL', { name: 'Privacy note', gap: 8, align: 'CENTER' }); add(pn, await IC('lock', 14, 'icon/muted'), [await T('Used only to answer your request. Privacy Policy.', 'Caption', 'text/tertiary', { w: 280 }), 'FILL']); add(form, [pn, 'FILL']);
add(C, [await mhead('OTHER CHANNELS', 'Response times', null, await DEMO('S')), 'FILL']);
add(C, [await rowsList('Response times', [['Email', 'within 24 h'], ['Withdrawal questions', 'within 4 h'], ['Security reports', 'within 24 h'], ['Restrictions & appeals', 'within 72 h'], ['Complaints & disputes', 'decision in 14 days']], { vw: 130 }), 'FILL']);
add(C, [await T('support@globalpool.example and security@globalpool.example are placeholders for this design. Times: last 30 days, to the first reply from a person.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
const rg = box('Need help with gambling?', { gap: 10, p: 16 }); add(C, [rg, 'FILL']);
const rgh = AL('HORIZONTAL', { gap: 10, align: 'CENTER' }); const rgi = AL('HORIZONTAL', { fill: 'status/info-tint', r: 10, p: 8 }); add(rgi, await IC('heart', 18, 'text/info')); add(rgh, rgi, [await T('Need help with gambling?', 'Heading/H5', 'text/primary'), 'FILL'], await I('6:159')); add(rg, [rgh, 'FILL']);
add(rg, [await T('Free, confidential support: Gambling Therapy, Gamblers Anonymous, GamCare. You can also set limits or take a break yourself — instantly.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
const rga = AL('HORIZONTAL', { gap: 8 }); add(rga, [await BTN('Secondary', 'Help organisations', { size: 'M' }), 'FILL'], [await BTN('Ghost', 'Set limits', { size: 'M' }), 'FILL']); add(rg, [rga, 'FILL']);
await mlic(C);
const stk = await sticky('Send message', 'Typical first reply by email: about 2 h', 'mail'); await mfinish(S, stk);
const out = { default: S.f.id };
// ---------- states (clones) ----------
const base = S.f; const Fd = (k, n) => k.findOne(x => x.name === 'Field — ' + n);
function val(inst, v, color = 'text/primary', layer = 'Value text') { const t = inst.findOne(n => n.name === layer && n.type === 'TEXT'); if (t) { t.characters = v; t.fills = [paint(color)]; } }
function mk(state, y) { const name = '[PUB-15] Contact / 390 / ' + state; { const old = sec.children.find(n => n.name === name); if (old) old.remove(); } const k = base.clone(); sec.appendChild(k); k.name = name; k.x = base.x; k.y = y; return k; }
const k1 = mk('Validation error', base.y + base.height + 160); out.validation = k1.id;
{ const tp = Fd(k1, 'Topic'); tp.setProperties({ State: 'Error' }); { const tv1 = tp.findOne(n => n.type === 'TEXT' && n.name === 'Value'); if (tv1) { tv1.characters = 'Choose a topic'; tv1.fills = [paint('text/tertiary')]; } } const nm = Fd(k1, 'Name'); nm.setProperties({ State: 'Filled' }); val(nm, 'Nova K.');
  const em = Fd(k1, 'Email'); em.setProperties({ State: 'Error' }); val(em, 'nova.k@example'); txt(em, 'Helper text', 'Enter a full email address, e.g. name@example.com');
  const ms = Fd(k1, 'Message'); ms.setProperties({ State: 'Error' }); val(ms, 'It’s stuck'); txt(ms, 'Helper text', 'Add a little more detail — at least 20 characters (10 / 20).'); txt(ms, 'Counter', '10 / 2,000');
  const f1 = k1.findOne(n => n.name === 'Contact form'); const a1 = f1.findOne(n => n.name === 'Anti-phishing notice');
  const es = AL('HORIZONTAL', { name: 'Error summary', fill: 'status/danger-tint', stroke: 'border/danger', r: 10, p: 12, gap: 10 }); add(es, await IC('alert-circle', 18, 'text/danger')); const et = AL('VERTICAL', { gap: 2 }); add(et, await T('3 fields need your attention', 'Body/S Strong', 'text/primary'), [await T('Topic · Email · Message. Nothing you typed has been lost.', 'Caption', 'text/secondary', { w: 260 }), 'FILL']); add(es, [et, 'FILL']);
  f1.insertChild(f1.children.indexOf(a1) + 1, es); es.layoutSizingHorizontal = 'FILL'; }
const k2 = mk('Sent — success', k1.y + k1.height + 160); out.sent = k2.id;
{ const f2 = k2.findOne(n => n.name === 'Contact form');
  for (const nm of ['Anti-phishing notice', 'Fields', 'Privacy note', '* required']) { const n = f2.findOne(x => x.name === nm); if (n) n.visible = false; }
  f2.findOne(n => n.name === 'Form title').characters = 'Message sent';
  const sp = AL('VERTICAL', { name: 'Success panel', gap: 16 });
  const ic = AL('HORIZONTAL', { fill: 'status/success-tint', r: 9999, p: 12 }); add(ic, await IC('check-circle', 28, 'text/success'));
  add(sp, ic, [await T('Thanks, Nova — we’ve got your message', 'Heading/H4', 'text/primary', { w: 326 }), 'FILL'], [await T('A person will reply by email. We sent a copy to n•••@example.com — check our reply shows your anti-phishing code.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
  const kv = AL('VERTICAL', { name: 'Ticket summary', fill: 'surface/raised', r: 14, p: 14, gap: 0 }); add(sp, [kv, 'FILL']);
  const kh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); const st = await BADGE('Pending', 'S'); const stt2 = st.findOne(n => n.type === 'TEXT'); if (stt2) stt2.characters = 'Open'; add(kh, [await T('Ticket CS-58214', 'Mono/S', 'text/primary'), 'FILL'], st, await DEMO('XS')); add(kv, [kh, 'FILL']);
  for (const [k, v] of [['Topic', 'Withdrawals'], ['Reference', 'WD-20931'], ['Sent', '27 Nov 2026, 19:52 UTC'], ['Reply expected', 'by 23:52 UTC (within 4 h)']]) { const r = AL('HORIZONTAL', { gap: 12, p: [8, 0, 8, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, [await T(k, 'Caption', 'text/tertiary'), 'FILL'], await T(v, 'Body/S Strong', 'text/primary')); add(kv, [r, 'FILL']); }
  add(sp, [await BTN('Secondary', 'Send another message', { size: 'L' }), 'FILL']);
  f2.appendChild(sp); sp.layoutSizingHorizontal = 'FILL';
  const sb = k2.findOne(n => n.name === 'Button — Sticky CTA'); setProp(sb, 'Label', 'Track withdrawal WD-20931'); setProp(sb, 'Leading icon', ICONS['withdraw']);
  k2.findOne(n => n.name === 'Sticky note').characters = 'Withdrawal questions: reply within 4 h'; }
const MSG = 'My withdrawal WD-20931 (1,500.00 USDT to 0x7c4e…a21D on Arbitrum) was submitted at 18:44 UTC and is still under review. The tracker says a decision by 22:44 UTC — is anything else needed from me?';
const k3 = mk('Send failed — error', k2.y + k2.height + 160); out.failed = k3.id;
{ for (const [n, v] of [['Name', 'Nova K.'], ['Email', 'nova.k@example.com'], ['Account ID', 'GP-48213'], ['Reference', 'WD-20931']]) { const f = Fd(k3, n); f.setProperties({ State: 'Filled' }); val(f, v); }
  const tp = Fd(k3, 'Topic'); val(tp, 'Withdrawals', 'text/primary', 'Value');
  const ms = Fd(k3, 'Message'); val(ms, 'WD-20931 (1,500.00 USDT, Arbitrum) is still under review since 18:44 UTC. Is anything else needed from me?'); txt(ms, 'Counter', '106 / 2,000');
  const f3 = k3.findOne(n => n.name === 'Contact form'); const a3 = f3.findOne(n => n.name === 'Anti-phishing notice');
  const es = AL('HORIZONTAL', { name: 'Send error', fill: 'status/danger-tint', stroke: 'border/danger', r: 10, p: 12, gap: 10 }); add(es, await IC('wifi-off', 18, 'text/danger')); const et = AL('VERTICAL', { gap: 4 }); add(et, await T('Your message wasn’t sent', 'Body/S Strong', 'text/primary'), [await T('The request timed out after 30 seconds. Nothing is lost — everything you typed is still below.', 'Caption', 'text/secondary', { w: 260 }), 'FILL']); const er = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(er, await T('Error ref ERR-CT-5F2A', 'Mono/S', 'text/secondary'), await DEMO('XS')); add(et, er); add(es, [et, 'FILL']);
  f3.insertChild(f3.children.indexOf(a3), es); es.layoutSizingHorizontal = 'FILL';
  const sb = k3.findOne(n => n.name === 'Button — Sticky CTA'); setProp(sb, 'Label', 'Try again'); setProp(sb, 'Leading icon', ICONS['refresh']);
  k3.findOne(n => n.name === 'Sticky note').characters = 'Still failing? Use live chat above'; }
fitSection(sec);
await k1.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.6 });
await k2.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.6 });
await k3.findOne(n => n.name === 'Contact form').screenshot({ scale: 0.6 });
return out;
