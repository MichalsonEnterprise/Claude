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

// ===== WAL-WB common (pruned) =====
const AD = '0x7c4e…a21D';
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions && o.actions.length) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0], wrap: true, cgap: 8 }); add(c, [r, 'FILL']); for (const b of o.actions) r.appendChild(b); } return a; }
async function B(status, label, size = 'S') { const b = await BADGE(status, size); if (label) { const t = b.findOne(n => n.type === 'TEXT'); if (t) t.characters = label; } b.name = 'Badge/Status — ' + (label || status); return b; }
async function fhead(fc, title, desc, M) { const h = AL('VERTICAL', { name: 'Flow header', gap: 6 }); add(fc, [h, 'FILL']); await tx(h, title, M ? 'Heading/H4' : 'Heading/H3'); if (desc) await tx(h, desc, M ? 'Body/S' : 'Body/M', 'text/secondary'); return h; }
// one automatic check row: s = pass | fail | review | wait
async function chk(p, o, M) { const r = hrow('Check — ' + o.t, 12, { p: [14, 0, 14, 0], align: M ? 'MIN' : 'CENTER' }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); const m = { pass: ['check-circle', 'status/success'], fail: ['x-circle', 'status/danger'], review: ['alert-triangle', 'status/warning'], wait: ['clock', 'icon/muted'] }[o.s]; r.appendChild(await IC(m[0], 20, m[1])); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, o.t, 'Body/M Strong', o.s === 'wait' ? 'text/secondary' : 'text/primary'); await tx(c, o.d, 'Body/S', 'text/secondary'); if (o.right) { if (M) { const w = hrow('Result', 0, { p: [6, 0, 0, 0] }); c.appendChild(w); w.appendChild(o.right); } else r.appendChild(o.right); } return r; }
async function checks(p, title, meta, rows, M) { const cc = card('Checks — ' + title, { gap: 0, p: M ? [12, 16, 4, 16] : [16, 20, 4, 20], fill: 'surface/raised' }); add(p, [cc, 'FILL']); const h = hrow('Checks header', 8, { p: [0, 0, 8, 0] }); add(cc, [h, 'FILL']); await tx(h, title, 'Body/M Strong', 'text/primary', { hug: true }); h.appendChild(await DEMO('XS')); sp(h); if (!M) await tx(h, meta, 'Caption', 'text/tertiary', { hug: true }); if (M) await tx(cc, meta, 'Caption', 'text/tertiary'); for (let i = 0; i < rows.length; i++) await chk(cc, Object.assign({ last: i === rows.length - 1 }, rows[i]), M); return cc; }
// vertical timeline: s = done | current | review | todo | error
async function antiPhish(p) { const a = AL('HORIZONTAL', { name: 'Anti-phishing code', gap: 16, p: 16, fill: 'surface/raised', stroke: 'border/default', r: 14, align: 'CENTER' }); add(p, [a, 'FILL']); const ic = AL('HORIZONTAL', { name: 'Icon tile', p: 10, fill: 'brand/tint', r: 10 }); ic.appendChild(await IC('key', 20, 'icon/brand')); a.appendChild(ic); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, 'YOUR ANTI-PHISHING CODE', 'Overline', 'text/tertiary'); const r = hrow('Code', 8); add(c, [r, 'FILL']); await tx(r, 'AURORA-27', 'Mono/M', 'text/brand', { hug: true }); r.appendChild(await DEMO('XS')); await tx(c, 'Genuine GLOBAL POOL emails show this code at the top. Missing or different? Don\'t enter the code — forward the email to security@example.com.', 'Caption', 'text/secondary'); return a; }
async function fixOtp(n, o = {}) { const info = n.findAll(x => x.type === 'TEXT' && !['Label', 'Description', 'Digit'].includes(x.name)).map(t => ({ id: t.id, ch: t.characters, pid: t.parent.id, pt: t.parent.type })); let used = false; for (const t of info) { const node = await figma.getNodeByIdAsync(t.id); if (!node) continue; const par = t.pid !== n.id && t.pt !== 'INSTANCE' ? await figma.getNodeByIdAsync(t.pid) : null; const hide = () => { if (par) par.visible = false; else node.visible = false; }; if (/Verifying/i.test(t.ch)) hide(); else if (/Resend|Didn.t get/i.test(t.ch)) { if (o.resend && !used && /Resend code in/i.test(t.ch)) { node.characters = o.resend; used = true; } else if (!o.resend) hide(); } else if (o.status) node.characters = o.status; else hide(); } return n; }
async function otp(p, state, label, desc, o = {}) { const n = await I('16:3761', { State: state }, { Label: label, Description: desc }); n.name = 'Input/OTP — ' + label; add(p, [n, 'FILL']); await fixOtp(n, o); return n; }
async function recap(p, M) { const r = AL(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Withdrawal recap', gap: M ? 8 : 16, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10, align: M ? 'MIN' : 'CENTER', wrap: !M, cgap: 8 }); add(p, [r, 'FILL']); const a = hrow('You send', 6); r.appendChild(a); await tx(a, 'You send', 'Caption', 'text/tertiary', { hug: true }); await tx(a, '1,500.00 USDT', 'Number/S', 'text/primary', { hug: true }); if (!M) r.appendChild(await IC('arrow-right', 16, 'icon/muted')); const b = hrow('You receive', 6); r.appendChild(b); await tx(b, 'You receive', 'Caption', 'text/tertiary', { hug: true }); await tx(b, '1,499.92 USDT', 'Number/S', 'text/success', { hug: true }); const c = hrow('Destination', 6); r.appendChild(c); c.appendChild(await CHAIN('Arbitrum', 16)); c.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); return r; }
// side / summary cards (desktop side column; also stacked on tablet + mobile)
// ===== WAL-WB mobile shell (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('WAL — Mobile D (Withdraw 6–9)', 154000, 0);
const MX = [120, 630, 1140, 1650, 2160];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function setStepM(s, n, label, next, err) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = next ? 'Next: ' + next : (err ? 'Withdrawal not sent — funds returned' : 'All steps complete'); const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; if (err) seg(n).fills = [paint('status/danger')]; }
async function shellM(name, n, x, label, next, o = {}) {
  const y = colY(x);
  const f = await screen(name, 390, o.sheet ? { h: 844 } : {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [ct, 'FILL']);
  const bh = hrow('Page header', 8); add(ct, [bh, 'FILL']);
  bh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }));
  await tx(bh, 'Withdraw USDT', 'Heading/H4', 'text/primary', { hug: true }); sp(bh); bh.appendChild(await DEMO('S'));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next, o.err);
  return { f, ct };
}
// sticky bottom CTA (primary + at most one alternative) + bottom tab bar
async function footM(f, s, o = {}) {
  const b = AL('VERTICAL', { name: 'Sticky CTA (pinned above tab bar)', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(f, [b, 'FILL']);
  if (s.next) add(b, [await BTN(s.nextType || 'Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']);
  for (const [ty, l, ic] of (s.alt || []).slice(0, 1)) add(b, [await BTN(ty, l, { size: 'L', lead: ic }), 'FILL']);
  if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' });
  if (!o.noTab) add(f, [await I('22:5413', { Active: 'Wallet' }), 'FILL']);
  return b;
}
// bottom sheet over the page: scrim + sheet anchored to the bottom of a fixed 844 frame
async function sheetM(f, name) {
  const scr = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scr); scr.layoutPositioning = 'ABSOLUTE'; scr.x = 0; scr.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE';
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [0, 0, 4, 0] }); add(sh, [g, 'FILL']); g.appendChild(rect(36, 4, 'border/strong', 9999, 'Handle'));
  return sh;
}
async function sheetFoot(sh, s) { const b = AL('VERTICAL', { name: 'Sheet actions', gap: 8, p: [4, 0, 8, 0] }); add(sh, [b, 'FILL']); add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', lead: s.lead, trail: s.trail === undefined ? 'arrow-right' : s.trail }), 'FILL']); add(b, [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0, 8, 0] }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Indicator')); }
// ===== END WAL-WB mobile shell =====

// ===== WAL-15 Step 6 Risk Validation — content builder (st: Pass | KYC | Flagged; M: 0 desktop/tablet, 1 mobile) =====
async function flow15(fc, st, M) {
  const kyc = st === 'KYC', flag = st === 'Flagged';
  if (st === 'Pass') await fhead(fc, 'Security check passed', 'We ran 6 automatic checks on this withdrawal at 27 Nov 2026, 18:43 UTC. Everything is clear — confirm it with two-factor authentication next.', M);
  if (kyc) await fhead(fc, 'Verify your identity to withdraw', 'Withdrawals need KYC Level 2 — an ID document plus a short selfie check. This account is at Level 1, so the withdrawal is on hold: nothing has been sent and the 1,500.00 USDT stays in Available.', M);
  if (flag) await fhead(fc, 'Almost there — this one needs a manual review', 'Five of six checks passed automatically. You can still confirm now: after 2FA the withdrawal joins a short review queue and is sent as soon as it\'s cleared.', M);
  if (st === 'Pass') add(fc, [await alertBox('success', 'All 6 checks passed in 2.4 s', 'Nothing for you to do. The result is valid for 15 minutes — until 18:58 UTC — so confirm with 2FA before then.'), 'FILL']);
  if (kyc) add(fc, [await alertBox('warning', 'KYC Level 2 is required for withdrawals', 'It takes about 5 minutes and most checks are approved within 10 minutes. We\'ll save this withdrawal and bring you straight back to this step.', { icon: 'id-card', actions: M ? [] : [await BTN('Primary', 'Verify identity — about 5 min', { size: 'S', lead: 'id-card' }), await BTN('Ghost', 'Why we ask', { size: 'S', trail: 'arrow-right' })] }), 'FILL']);
  if (flag) add(fc, [await alertBox('warning', 'Routine AML screening for new destinations — usually under 4 h', 'This is your first withdrawal to ' + AD + ' since you whitelisted it on 14 Oct 2026. A compliance analyst checks it — you don\'t need to send documents. We\'ll email you (look for AURORA-27) when it\'s done.', { icon: 'shield-alert' }), 'FILL']);
  const ok = async (l) => await B('Approved', l || 'Passed');
  const nr = async () => await B('Neutral', 'Not run yet');
  const rows = [
    { s: kyc ? 'fail' : 'pass', t: 'Identity verification (KYC)', d: kyc ? 'Level 1 only — withdrawals need Level 2 (ID document + selfie check)' : 'Level 2 — ID document and liveness verified', right: await I('23:5565', { Status: kyc ? 'Not started' : 'Approved', Level: 'L2' }) },
    { s: kyc ? 'wait' : 'pass', t: 'Withdrawal limits', d: '1,500.00 of 25,000.00 USDT daily limit · minimum 20.00 USDT', right: kyc ? await nr() : await ok('Within limit') },
    { s: 'pass', t: 'Account security', d: '2FA on · no password or email change in the last 24 h · trusted device (MacBook Pro · Chrome · Lisbon)', right: await ok() },
    { s: kyc ? 'wait' : flag ? 'review' : 'pass', t: 'AML transaction screening', d: flag ? 'First withdrawal to this destination — routed to a compliance analyst' : 'Amount and pattern match your usual activity', right: kyc ? await nr() : flag ? await B('Under review', 'Manual review') : await ok('Clear') },
    { s: kyc ? 'wait' : flag ? 'review' : 'pass', t: 'Destination address risk', d: AD + ' · whitelisted 14 Oct 2026 · screened by our blockchain-analytics provider', right: kyc ? await nr() : await I('23:5378', { Level: flag ? 'Medium' : 'Low', Density: 'Comfortable' }) },
    { s: 'pass', t: 'Network status', d: 'Arbitrum One is operational · network fee 0.08 USDT', right: await I('9:377', { Chain: 'Arbitrum', Status: 'Operational' }) }
  ];
  await checks(fc, kyc ? 'Security checks — stopped at identity' : flag ? 'Security checks — 5 of 6 passed' : 'Security checks — 6 of 6 passed', 'Checked 27 Nov 2026, 18:43 UTC', rows, M);
  if (kyc) { const nd = AL('VERTICAL', { name: 'What you\'ll need', gap: 10, p: 16, fill: 'surface/raised', r: 14 }); add(fc, [nd, 'FILL']); await tx(nd, 'What you\'ll need', 'Body/M Strong'); for (const [ic, t1] of [['id-card', 'A valid passport, national ID card or driving licence'], ['face-scan', 'A 10-second selfie video in good light'], ['smartphone', 'Your phone, or a laptop with a camera']]) { const r = hrow('Need — ' + t1.slice(0, 24), 10); add(nd, [r, 'FILL']); r.appendChild(await IC(ic, 18, 'icon/brand')); await tx(r, t1, 'Body/S', 'text/secondary'); } await tx(nd, 'Documents are encrypted and used only for verification. Your balance stays yours while you verify — nothing is frozen, and you can cancel this withdrawal at any time.', 'Caption', 'text/tertiary'); }
  if (flag) add(fc, [await alertBox('info', 'Where your 1,500.00 USDT is during the review', 'It\'s held in Locked until the review is done. You can cancel any time before it\'s sent, and the full amount returns to Available straight away.', { icon: 'lock' }), 'FILL']);
  if (kyc) return M ? { next: 'Verify identity — about 5 min', lead: 'id-card', trail: null, alt: [['Ghost', 'Cancel withdrawal', 'x']], note: 'Back here automatically once you\'re verified' } : { back: 'Back', next: 'Continue to 2FA', state: 'Disabled', note: 'Available after Level 2 verification' };
  if (flag) return { back: 'Back', next: 'Continue to 2FA', note: 'Review starts after you confirm' };
  return { back: 'Back', next: 'Continue to 2FA', note: 'Result valid until 18:58 UTC' };
}
// ===== END WAL-15 builder =====

// ===== WAL-16 Step 7 Two-Factor Confirmation — content builder (st: Default | Wrong code | Locked; M: 0 desktop, 1 mobile page, 2 mobile sheet) =====
async function flow16(fc, st, M) {
  const wrong = st === 'Wrong code', lock = st === 'Locked';
  await fhead(fc, lock ? 'Withdrawals paused for 15 minutes' : 'Confirm it\'s you', lock ? 'Too many incorrect codes were entered, so we paused withdrawals to protect your account. Nothing has been sent — the 1,500.00 USDT is still in Available.' : 'Enter the 6-digit code we emailed you and the current code from your authenticator app. Both are needed to send this withdrawal.', M);
  if (lock) add(fc, [await alertBox('danger', 'Locked until 27 Nov 2026, 18:58 UTC', '5 incorrect codes in a row. You can try again in 14 minutes. Lost your authenticator? Recover access — support will never ask for your codes or password.', { icon: 'lock', actions: [await BTN('Secondary', 'Recover 2FA access', { size: 'S', lead: 'key' }), await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })] }), 'FILL']);
  await antiPhish(fc);
  await otp(fc, lock ? 'Disabled' : 'Complete', 'Email code', lock ? 'A new code is emailed when you try again at 18:58 UTC.' : 'Sent to n•••@example.com at 18:43 UTC · valid for 10 minutes', { status: lock ? 'Locked until 18:58 UTC' : null, resend: lock ? null : 'Resend code at 18:44 UTC' });
  await otp(fc, lock ? 'Disabled' : wrong ? 'Error' : 'Complete', 'Authenticator code', 'From your authenticator app (GLOBAL POOL · @nova.k). Codes refresh every 30 seconds.', { status: lock ? 'Locked until 18:58 UTC' : wrong ? 'That code didn\'t match — enter the newest code. 3 of 5 attempts left.' : null, resend: null });
  if (!lock) { const ln = hrow('2FA help links', 4, { wrap: true, cgap: 4 }); add(fc, [ln, 'FILL']); ln.appendChild(await BTN('Ghost', 'Use a backup code', { size: 'S', lead: 'key' })); ln.appendChild(await BTN('Ghost', 'Lost your device?', { size: 'S', lead: 'smartphone' })); }
  if (wrong) add(fc, [await alertBox('danger', 'Incorrect authenticator code', 'After 5 incorrect attempts we pause withdrawals for 15 minutes. Check that your phone sets its time automatically — a clock that\'s a minute off produces wrong codes.'), 'FILL']);
  if (lock) add(fc, [await alertBox('warning', 'Weren\'t you entering these codes?', 'Someone may know your password. Change it and sign out other devices now — it takes about a minute. Your address whitelist and 24 h cooldown stay on.', { icon: 'shield-alert', actions: [await BTN('Secondary', 'Secure my account', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Review devices', { size: 'S', lead: 'monitor' })] }), 'FILL']);
  if (M !== 2) await recap(fc, M);
  if (!lock && M !== 2) add(fc, [await alertBox('info', 'Crypto withdrawals can\'t be reversed once sent', 'Check the address and network one last time. You can still cancel from Withdrawal history until the transaction is broadcast.'), 'FILL']);
  if (lock) return { back: 'Back to wallet', next: 'Try again at 18:58 UTC', state: 'Disabled', lead: 'lock', trail: null };
  if (wrong) return { back: 'Back', next: 'Confirm withdrawal', state: 'Disabled', lead: 'lock', trail: null, note: 'Re-enter the authenticator code' };
  return { back: 'Back', next: 'Confirm withdrawal · 1,500.00 USDT', lead: 'lock', trail: null };
}
// ===== END WAL-16 builder =====

// ===== BODY m1 — Mobile 390: WAL-15 Pass / KYC required, WAL-16 Default (bottom sheet) / Locked =====
const M15 = 'WAL-15 Withdraw — Step 6 Risk Validation / 390 / ', M16 = 'WAL-16 Withdraw — Step 7 Two-Factor Confirmation / 390 / ';
const names = [M15 + 'Pass', M15 + 'KYC required — separate DEMO scenario (Level 1 account)', M16 + 'Default — 2FA bottom sheet', M16 + 'Locked (15 min)'];
clean(names);
const out = {};
for (const [st, nm] of [['Pass', names[0]], ['KYC', names[1]]]) {
  const S = await shellM(nm, 6, MX[0], 'Risk check', st === 'KYC' ? 'Verify identity, then 2FA' : '2FA confirmation');
  const cta = await flow15(S.ct, st, 1);
  await footM(S.f, cta);
  out[nm] = S.f.id;
}
{ const S = await shellM(names[2], 7, MX[1], 'Two-factor confirmation', 'Pending', { sheet: true });
  add(S.ct, [await alertBox('success', 'Security check passed', 'All 6 checks passed at 18:43 UTC.'), 'FILL']);
  await recap(S.ct, 1);
  const sh = await sheetM(S.f, '2FA');
  const cta = await flow16(sh, 'Default', 2);
  await sheetFoot(sh, cta);
  sh.x = 0; sh.y = 844 - sh.height;
  out[names[2]] = S.f.id; }
{ const S = await shellM(names[3], 7, MX[1], 'Two-factor confirmation', 'Pending');
  const cta = await flow16(S.ct, 'Locked', 1);
  await footM(S.f, cta);
  out[names[3]] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes };
