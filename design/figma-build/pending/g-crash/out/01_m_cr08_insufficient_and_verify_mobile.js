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
// ===== CR crash mobile: CR-08 Insufficient balance 390 (clone of CR-01 390) + verify all mobile frames =====
async function setChars(t, v) { const fonts = t.getStyledTextSegments(['fontName']).map(s => s.fontName); for (const fn of fonts) await figma.loadFontAsync(fn); t.characters = v; }
async function repl(root, from, to, exact = true) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; if (exact ? c === from : c.includes(from)) { await setChars(t, exact ? to : c.split(from).join(to)); n++; } } return n; }
function inInstance(n, stop) { let p = n.parent; while (p && p !== stop) { if (p.type === 'INSTANCE') return p; p = p.parent; } return null; }
function topInstance(n, stop) { let r = null; let p = n.parent; while (p && p !== stop) { if (p.type === 'INSTANCE') r = p; p = p.parent; } return r; }
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('Games — Mobile Crash', 189000, 0);
const NAME = '[CR-08] Orbit Rush — Error states / 390 / Insufficient balance (DEMO account · Available 4.20 USDT)';
for (const n of sec.children.filter(n => n.name === NAME)) n.remove();
const src = await figma.getNodeByIdAsync('34:386552');
const f = src.clone(); sec.appendChild(f); f.name = NAME; f.primaryAxisSizingMode = 'AUTO';
let colBottom = 0; for (const c of sec.children) { if (c !== f && Math.abs(c.x - 3690) < 2) colBottom = Math.max(colBottom, c.y + c.height); }
f.x = 3690; f.y = Math.round(colBottom + 160);
const miss = []; const log = {};
// balances
log.bal1 = await repl(f, '9,215.30', '4.20');
log.bal2 = await repl(f, '9,215.30 USDT', '4.20 USDT');
log.bal3 = await repl(f, '9,215.30', '4.20', false);
// amount field
let amt = null; for (const t of f.findAll(x => x.type === 'TEXT' && x.characters === '10.00')) { const chain = []; let p = t.parent; while (p && p !== f) { chain.push(p.name); p = p.parent; } if (chain.some(nm => /amount|input|stake/i.test(nm)) && !chain.some(nm => /live|row|list|history|summary|odds/i.test(nm))) { amt = t; break; } }
if (!amt) miss.push('amount text');
let inputBox = null, errPlaced = false;
if (amt) {
  const ti = topInstance(amt, f);
  if (ti && ti.mainComponent && ti.mainComponent.parent && ti.mainComponent.parent.name === 'Input/Amount') { try { ti.setProperties({ State: 'Error' }); errPlaced = true; } catch (e) { miss.push('Input/Amount error ' + e.message); } inputBox = ti; await repl(ti, '9,215.30', '4.20', false); }
  else {
    let p = ti || amt.parent; while (p && p !== f && !(p.strokes && p.strokes.length && p.type !== 'TEXT')) p = p.parent;
    inputBox = (p && p !== f) ? p : (ti || amt.parent);
    if (inputBox.type === 'INSTANCE') { try { inputBox.setProperties({ State: 'Error' }); } catch (e) {} }
    else stroke(inputBox, 'border/danger', 1);
  }
  log.inputBox = inputBox.name + ' / parent ' + inputBox.parent.name + ' ' + inputBox.parent.layoutMode;
  if (!errPlaced) {
    let anchor = inputBox; let host = anchor.parent;
    while (host && (host.type === 'INSTANCE' || inInstance(host, f) || host.layoutMode !== 'VERTICAL')) { anchor = host; host = host.parent; }
    const er = AL('HORIZONTAL', { name: 'Error — insufficient balance', gap: 6, align: 'CENTER' });
    add(er, await IC('alert-circle', 16, 'status/danger')); const et = await T('Exceeds your available balance (4.20 USDT)', 'Caption', 'text/danger', { name: 'Error text', w: 280 }); add(er, et); et.layoutSizingHorizontal = 'FILL';
    host.insertChild(host.children.indexOf(anchor) + 1, er); er.layoutSizingHorizontal = 'FILL'; log.errHost = host.name;
  }
}
// alert card before the bet block
const content = f.findOne(n => n.name === 'Content' && n.type === 'FRAME');
let block = null; if (amt && content) { let p = amt; while (p && p.parent !== content) p = p.parent; block = p; }
const al = AL('VERTICAL', { name: 'Alert — Not enough balance', gap: 12, p: 16, r: 14, fill: 'status/warning-tint', stroke: 'status/warning' });
const ah = AL('HORIZONTAL', { name: 'Alert head', gap: 10, align: 'MIN' }); add(ah, await IC('wallet', 20, 'status/warning'));
const ac = AL('VERTICAL', { name: 'Alert copy', gap: 4 }); add(ac, await T('Not enough balance for this bet', 'Body/M Strong', 'text/primary', { name: 'Alert title', w: 270 }));
const ab = await T('You need 5.80 USDT more to bet 10.00 USDT. USDT deposits on Arbitrum usually arrive in about 2 minutes (20 confirmations).', 'Body/S', 'text/secondary', { name: 'Alert body', w: 270 }); add(ac, ab);
const am = AL('HORIZONTAL', { name: 'Alert meta', gap: 6, align: 'CENTER' }); add(am, await T('DEMO account · Available 4.20 USDT', 'Caption', 'text/tertiary'), await DEMO('XS')); add(ac, am);
add(ah, ac); ac.layoutGrow = 1; ab.layoutSizingHorizontal = 'FILL'; ac.children[0].layoutSizingHorizontal = 'FILL'; add(al, [ah, 'FILL']);
const b1 = await BTN('Primary', 'Deposit USDT', { size: 'L', lead: 'deposit' }); const b2 = await BTN('Secondary', 'Change bet amount', { size: 'L', lead: 'edit' }); add(al, [b1, 'FILL'], [b2, 'FILL']);
if (content) { const idx = block ? content.children.indexOf(block) : 0; content.insertChild(Math.max(0, idx), al); al.layoutSizingHorizontal = 'FILL'; } else miss.push('Content');
log.block = block ? block.name : null;
// CTAs
const ctas = f.findAll(n => n.type === 'INSTANCE' && n.findAll(t => t.type === 'TEXT' && /Place bet/.test(t.characters)).length && n.mainComponent && n.mainComponent.parent && /^Button\//.test(n.mainComponent.parent.name));
log.ctas = ctas.map(c => c.name + ' @' + c.parent.name);
for (const c of ctas) { const sticky = /sticky/i.test(c.parent.name) || /sticky/i.test((c.parent.parent || {}).name || ''); const k = Object.keys(c.componentProperties); if (sticky) { const set = {}; const lk = k.find(x => x.startsWith('Label')); if (lk) set[lk] = 'Deposit USDT to bet'; const sl = k.find(x => x.startsWith('Show leading icon')); if (sl) set[sl] = true; const li = k.find(x => x.startsWith('Leading icon')); if (li) set[li] = ICONS.deposit; c.setProperties(set); } else { try { c.setProperties({ State: 'Disabled' }); } catch (e) { miss.push('cta disable'); } } }
log.risk = await repl(f, 'You can lose your stake. Your bet joins round', 'You can lose your stake. Only deposit what you can afford to lose — set a deposit limit in Responsible gaming. Your bet joins round', false);
fitSection(sec);
const shots = [];
await f.screenshot({ scale: 0.6 });
for (const id of ['34:386552', '34:410457', '34:420337', '34:420839', '34:446321', '34:480272', '34:492427', '36:511112', '36:511527', '36:519473']) { const n = await figma.getNodeByIdAsync(id); if (n) { await n.screenshot({ scale: 0.42 }); shots.push(id + ' ' + Math.round(n.height)); } }
return { id: f.id, x: f.x, y: f.y, h: f.height, miss, log, shots };
