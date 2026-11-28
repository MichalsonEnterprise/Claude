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

// ===== WAL-WA common (pruned) =====
const AD = '0x7c4e…a21D';
async function tx(p, s, st = 'Body/M', c = 'text/primary', o = {}) { const t = await T(s, st, c, o.hug ? {} : { w: 200 }); if (o.name) t.name = o.name; p.appendChild(t); if (!o.hug) t.layoutSizingHorizontal = 'FILL'; if (o.align) t.textAlignHorizontal = o.align; return t; }
function sp(p) { const s = AL('HORIZONTAL', { name: 'Spacer', w: 1, h: 1 }); p.appendChild(s); s.layoutSizingHorizontal = 'FILL'; return s; }
function card(name, o = {}) { return AL('VERTICAL', { name, gap: o.gap ?? 16, p: o.p ?? 20, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14, w: o.w }); }
function hrow(name, g = 8, o = {}) { return AL('HORIZONTAL', Object.assign({ name, gap: g, align: 'CENTER' }, o)); }
async function kv(p, label, val, o = {}) { const r = hrow('Row — ' + label, 12, { p: [10, 0, 10, 0] }); strokeSides(r, 'border/subtle', { b: o.last ? 0 : 1 }); add(p, [r, 'FILL']); await tx(r, label, 'Body/S', 'text/secondary', { hug: true }); sp(r); if (typeof val === 'string') await tx(r, val, o.vs || 'Body/S Strong', o.vc || 'text/primary', { hug: true }); else for (const v of [].concat(val)) r.appendChild(v); return r; }
async function alertBox(t, title, body, o = {}) { const a = AL('HORIZONTAL', { name: 'Alert/' + t + ' — ' + title.slice(0, 40), gap: 12, p: [14, 16, 14, 16], fill: 'status/' + t + '-tint', stroke: 'status/' + t, r: 14 }); a.appendChild(await IC(o.icon || ({ info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' })[t], 20, 'status/' + t)); const c = AL('VERTICAL', { name: 'Text', gap: 4 }); add(a, [c, 'FILL']); await tx(c, title, 'Body/M Strong', 'text/primary'); if (body) await tx(c, body, 'Body/S', 'text/secondary'); if (o.actions && o.actions.length) { const r = hrow('Actions', 8, { p: [6, 0, 0, 0], wrap: true, cgap: 8 }); add(c, [r, 'FILL']); for (const b of o.actions) r.appendChild(b); } return a; }
async function hdr(p, icon, title, o = {}) { const h = hrow('Card header — ' + title, 8); add(p, [h, 'FILL']); if (icon) h.appendChild(await IC(icon, 20, o.ic || 'icon/brand')); await tx(h, title, o.st || 'Heading/H5', 'text/primary', { hug: true }); if (o.demo) h.appendChild(await DEMO('S')); sp(h); if (o.right) h.appendChild(o.right); return h; }
// Badge/Status relabelled (status = icon + label)
async function B(status, label, size = 'S') { const b = await BADGE(status, size); if (label) { const t = b.findOne(n => n.type === 'TEXT'); if (t) t.characters = label; } b.name = 'Badge/Status — ' + (label || status); return b; }
async function fhead(fc, title, desc, M) { const h = AL('VERTICAL', { name: 'Flow header', gap: 6 }); add(fc, [h, 'FILL']); await tx(h, title, M ? 'Heading/H4' : 'Heading/H3'); if (desc) await tx(h, desc, M ? 'Body/S' : 'Body/M', 'text/secondary'); return h; }
// set the idx-th TEXT layer called `layer` inside an instance (per-variant text that is not a component property)
function setT(inst, layer, value, idx = 0, color) { const ts = inst.findAll(x => x.type === 'TEXT' && x.name === layer); const t = ts[idx]; if (!t) return false; t.characters = value; if (color) t.fills = [paint(color)]; return true; }
async function chips(p, sel, st, M) { const r = hrow('Quick amounts', 8, { wrap: true, cgap: 8 }); add(p, [r, 'FILL']); for (const l of ['500.00', '1,000.00', '1,500.00', '5,000.00', 'MAX · 9,215.30']) { const c = await I('17:2766', { State: st || (l === sel ? 'Selected' : 'Default') }, { Label: l, 'Show icon': false }); c.name = 'Chip — ' + l; r.appendChild(c); } return r; }
async function limitCard(sd, s = {}) {
  const l = card('Daily withdrawal limit', { gap: 12 }); add(sd, [l, 'FILL']);
  await hdr(l, 'shield', 'Daily withdrawal limit', { right: await I('23:5565', { Status: 'Approved', Level: 'L2' }) });
  const u = hrow('Usage', 6); add(l, [u, 'FILL']); await tx(u, s.used || '0.00', 'Number/S', s.full ? 'text/warning' : 'text/primary', { hug: true }); await tx(u, s.usedLabel || 'of 25,000.00 USDT used today', 'Body/S', 'text/secondary', { hug: true }); u.appendChild(await DEMO('XS'));
  const m = AL('HORIZONTAL', { name: 'Meter', fill: 'surface/raised', r: 9999, h: 8, w: 300, clip: true }); add(l, [m, 'FILL']);
  if (s.pct) { const bar = rect(Math.max(4, Math.round(m.width * s.pct)), 8, s.full ? 'status/warning' : 'brand/primary', 9999, 'Used'); m.appendChild(bar); if (s.full) bar.layoutSizingHorizontal = 'FILL'; }
  await tx(l, s.limitNote || 'Resets 28 Nov 2026, 00:00 UTC · minimum 20.00 USDT per withdrawal · verify Level 3 for a higher limit.', 'Caption', 'text/tertiary');
  return l;
}
// desktop side column (summary + limit + protections + help). s = {n, net, addr, amt, recv, used, usedLabel, pct, full, limitNote, help}
async function side(sd, s) {
  const c = card('Withdrawal summary', { gap: 0 }); add(sd, [c, 'FILL']);
  const st = AL('HORIZONTAL', { name: 'Step chip', p: [2, 8, 2, 8], fill: 'surface/raised', r: 9999 }); await tx(st, 'Step ' + s.n + ' of 9', 'Caption', 'text/secondary', { hug: true });
  const h = await hdr(c, null, 'Withdrawal summary', { demo: true, right: st }); pad(h, 0, 0, 8, 0);
  const pend = { vs: 'Body/S', vc: 'text/tertiary' };
  const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Asset', a);
  if (s.net) { const v = hrow('Network value', 6); v.appendChild(await CHAIN('Arbitrum', 16)); await tx(v, 'Arbitrum One', 'Body/S Strong', 'text/primary', { hug: true }); await kv(c, 'Network', v); } else await kv(c, 'Network', 'Choose in step 2', pend);
  if (s.addr) await kv(c, 'Destination', await I('9:418', { Size: 'S' }, { Address: s.addr, 'Show DEMO': true })); else await kv(c, 'Destination', 'Enter in step 3', pend);
  await kv(c, 'Amount', s.amt ? s.amt + ' USDT' : 'Enter in step 4', s.amt ? { vs: 'Number/S' } : pend);
  await kv(c, 'Network fee', s.net ? (s.amt ? '−0.08 USDT' : '≈ 0.08 USDT') : 'Depends on network', s.net ? { vs: 'Number/S' } : pend);
  await kv(c, 'Platform fee', '0.00 USDT', { vs: 'Number/S' });
  await kv(c, 'You receive', s.recv ? s.recv + ' USDT' : '—', s.recv ? { vs: 'Number/M', vc: 'text/success', last: true } : Object.assign({ last: true }, pend));
  await limitCard(sd, s);
  const p = card('Withdrawal protections', { gap: 10 }); add(sd, [p, 'FILL']);
  await hdr(p, 'shield-check', 'Withdrawal protections');
  for (const [ic, t1, t2] of [['check-circle', '2FA on', 'Email code + authenticator at step 7'], ['check-circle', 'Address whitelist on', '1 Arbitrum address · 1 BNB Chain address'], ['clock', '24 h cooldown', 'For every new destination address'], ['key', 'Anti-phishing code', 'AURORA-27 — shown in every genuine email']]) { const r = hrow('Protection — ' + t1, 10); add(p, [r, 'FILL']); r.appendChild(await IC(ic, 18, ic === 'check-circle' ? 'status/success' : 'icon/muted')); await tx(r, t1, 'Body/S Strong', 'text/primary', { hug: true }); sp(r); await tx(r, t2, 'Caption', 'text/secondary', { hug: true }); }
  if (s.help !== false) { const hc = card('Help', { gap: 8 }); add(sd, [hc, 'FILL']); await hdr(hc, 'help-circle', 'How long does a withdrawal take?', { ic: 'icon/muted' }); await tx(hc, 'Most withdrawals are sent within 30 minutes. A new destination or a large amount can be held for routine AML screening — usually under 4 hours. You can track every step in Withdrawal history.', 'Body/S', 'text/secondary'); const lk = hrow('Links', 4); hc.appendChild(lk); lk.appendChild(await BTN('Ghost', 'Withdrawal FAQ', { size: 'S', trail: 'arrow-right' })); lk.appendChild(await BTN('Ghost', 'Contact support', { size: 'S', lead: 'chat' })); }
  return c;
}
// limit tiles (desktop) / facts card (mobile)
async function limitTiles(p, M, o = {}) {
  const arr = [['MINIMUM', '20.00 USDT', 'per withdrawal, every network', false], ['AVAILABLE NOW', '9,215.30 USDT', 'your withdrawable balance', true], ['LEFT TODAY', o.left || '25,000.00 USDT', o.leftSub || 'KYC Level 2 daily limit', false]];
  if (M) { const c = card('Limits', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(p, [c, 'FILL']); for (let i = 0; i < arr.length; i++) { const [l, v, , d] = arr[i]; const vals = [await T(v, 'Number/S', i === 2 && o.left ? 'text/warning' : 'text/primary')]; if (d) vals.push(await DEMO('XS')); const r = await kv(c, l.charAt(0) + l.slice(1).toLowerCase(), vals, { last: i === 2 }); gap(r, 8); } return c; }
  const r = AL('HORIZONTAL', { name: 'Limit tiles', gap: 12 }); add(p, [r, 'FILL']);
  for (const [l, v, sub, d] of arr) { const t = AL('VERTICAL', { name: 'Tile — ' + l, gap: 4, p: [12, 16, 12, 16], fill: 'surface/raised', r: 10 }); add(r, [t, 'FILL']); const h = hrow('Tile head', 6); add(t, [h, 'FILL']); await tx(h, l, 'Overline', 'text/tertiary', { hug: true }); if (d) h.appendChild(await DEMO('XS')); await tx(t, v, 'Number/S', l === 'LEFT TODAY' && o.left ? 'text/warning' : 'text/primary', { name: 'Value' }); await tx(t, sub, 'Caption', 'text/secondary', { name: 'Sub' }); }
  return r;
}
async function lockNote(p) { const lr = hrow('Lock note', 10, { p: [12, 16, 12, 16], fill: 'surface/raised', r: 10, align: 'MIN' }); add(p, [lr, 'FILL']); lr.appendChild(await IC('lock', 18, 'balance/locked')); await tx(lr, 'When you confirm at step 7, 1,500.00 USDT moves from Available to Locked until the network confirms the transfer. If it fails or is rejected, the full amount returns to Available — no fee is charged.', 'Body/S', 'text/secondary'); return lr; }
// "You receive" hero block
// ===== WAL-WA mobile shell (page 10, MOB-07 bottom-sheet pattern) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('WAL — Mobile C (Withdraw 1–5)', 147000, 0);
const MX = [120, 630, 1140, 1650, 2160];
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { m = Math.max(m, c.y + c.height); any = true; } return any ? m + 160 : 120; }
function clean(names) { for (const c of [...sec.children]) if (names.includes(c.name)) c.remove(); }
function setStepM(s, n, label, next) { const t = k => s.findOne(x => x.type === 'TEXT' && x.name === k); t('Current label').characters = label; t('Progress text').characters = 'Step ' + n + ' of 9'; t('Next step').characters = 'Next: ' + next; const seg = i => s.findOne(x => x.name === 'Segment ' + i); const done = seg(1).fills, todo = seg(9).fills; for (let i = 1; i <= 9; i++) seg(i).fills = i <= n ? done : todo; }
async function shellM(name, n, x, label, next, o = {}) {
  const y = colY(x);
  const f = await screen(name, 390, o.sheet ? { h: 844 } : {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR('DEMO DATA — all figures are illustrative, not real.'), 'FILL']);
  add(f, [await I('23:12908', { State: 'Member' }), 'FILL']);
  const ct = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [ct, 'FILL']); if (o.sheet) ct.layoutSizingVertical = 'FILL';
  const bh = hrow('Page header', 8); add(ct, [bh, 'FILL']);
  bh.appendChild(await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }));
  await tx(bh, 'Withdraw USDT', 'Heading/H4', 'text/primary', { hug: true }); sp(bh); bh.appendChild(await DEMO('S'));
  const stp = await I('15:3270', { Steps: '9' }); add(ct, [stp, 'FILL']); setStepM(stp, n, label, next);
  return { f, ct };
}
async function tabM(f) { const t = await I('22:5413', { Active: 'Wallet' }); add(f, [t, 'FILL']); return t; }
// sticky bottom CTA + bottom tab bar
async function footM(f, s) {
  const b = AL('VERTICAL', { name: 'Sticky CTA (pinned above tab bar)', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(f, [b, 'FILL']);
  if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' });
  add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', trail: 'arrow-right' }), 'FILL']);
  await tabM(f); return b;
}
// bottom sheet over the page: scrim + sheet (absolute), pinned to the bottom by pinSheet()
async function sheetM(f, name) {
  const scr = rect(390, f.height, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scr); scr.layoutPositioning = 'ABSOLUTE'; scr.x = 0; scr.y = 0;
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + name, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', w: 390 }); f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE';
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Grabber', justify: 'CENTER', p: [0, 0, 4, 0] }); add(sh, [g, 'FILL']); g.appendChild(rect(36, 4, 'border/strong', 9999, 'Handle'));
  return { sh, scr };
}
async function sheetHead(sh, title, desc) { const h = AL('VERTICAL', { name: 'Sheet header', gap: 4 }); add(sh, [h, 'FILL']); const r = hrow('Title row', 8); add(h, [r, 'FILL']); await tx(r, title, 'Heading/H4', 'text/primary'); r.appendChild(await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['x'] })); if (desc) await tx(h, desc, 'Body/S', 'text/secondary'); return h; }
async function sheetFoot(sh, s = {}) { const b = AL('VERTICAL', { name: 'Sheet actions', gap: 8, p: [4, 0, 8, 0] }); add(sh, [b, 'FILL']); if (s.note) await tx(b, s.note, 'Caption', 'text/tertiary', { align: 'CENTER' }); if (s.next) add(b, [await BTN('Primary', s.next, { size: 'L', state: s.state || 'Default', trail: 'arrow-right' }), 'FILL']); if (s.cancel !== false) add(b, [await BTN('Ghost', 'Cancel', { size: 'L' }), 'FILL']); const hi = AL('HORIZONTAL', { name: 'Home indicator', justify: 'CENTER', p: [8, 0, 8, 0] }); add(sh, [hi, 'FILL']); hi.appendChild(rect(134, 5, 'text/primary', 9999, 'Indicator')); }
function pinSheet(f, sh, scr) { let H = f.height; if (sh.height > H - 48) { H = Math.ceil(sh.height + 48); f.resize(390, H); scr.resize(390, H); } sh.x = 0; sh.y = H - sh.height; return H; }
async function optCard(p, ic, t1, t2, btn) { const w = AL('VERTICAL', { name: 'Option — ' + t1.slice(0, 30), gap: 10, p: 12, fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(p, [w, 'FILL']); const r = hrow('Option row', 12, { align: 'MIN' }); add(w, [r, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 8, fill: 'brand/tint', r: 10 }); it.appendChild(await IC(ic, 20, 'icon/brand')); r.appendChild(it); const c = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [c, 'FILL']); await tx(c, t1, 'Body/S Strong'); await tx(c, t2, 'Caption', 'text/secondary'); if (btn) add(w, [btn, 'FILL']); return w; }
// WAL-12 page content. st = Default | Invalid
async function addr12(ct, st) {
  await fhead(ct, 'Where should we send it?', 'Pick a whitelisted Arbitrum address or paste a new one. We check the format as you type.', true);
  const wh = hrow('Whitelist header', 6); add(ct, [wh, 'FILL']); await tx(wh, 'YOUR WHITELIST ON ARBITRUM', 'Overline', 'text/tertiary', { hug: true }); wh.appendChild(await DEMO('XS')); sp(wh); await tx(wh, 'Manage', 'Label/M', 'text/brand', { hug: true });
  const sa = hrow('Saved address — Arbitrum cold wallet', 12, { p: [12, 16, 12, 16], fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(ct, [sa, 'FILL']);
  const rd = AL('HORIZONTAL', { name: 'Radio', w: 20, h: 20, r: 9999, align: 'CENTER', justify: 'CENTER' }); stroke(rd, 'border/strong', 2); sa.appendChild(rd);
  sa.appendChild(await CHAIN('Arbitrum', 24));
  const c = AL('VERTICAL', { name: 'Text', gap: 6 }); add(sa, [c, 'FILL']); const tr = hrow('Title row', 8); add(c, [tr, 'FILL']); await tx(tr, 'Arbitrum cold wallet', 'Body/S Strong', 'text/primary', { hug: true }); tr.appendChild(await B('Approved', 'Whitelisted'));
  c.appendChild(await I('9:418', { Size: 'S' }, { Address: AD, 'Show DEMO': true })); await tx(c, 'Since 14 Oct 2026 · no cooldown', 'Caption', 'text/tertiary');
  const dv = hrow('Divider — or paste a new address', 12); add(ct, [dv, 'FILL']); const l1 = rect(10, 1, 'border/subtle', 0, 'Line'); dv.appendChild(l1); l1.layoutSizingHorizontal = 'FILL'; await tx(dv, 'or paste a new address', 'Caption', 'text/tertiary', { hug: true }); const l2 = rect(10, 1, 'border/subtle', 0, 'Line'); dv.appendChild(l2); l2.layoutSizingHorizontal = 'FILL';
  const ia = await I('15:3617', { State: st === 'Invalid' ? 'Invalid' : 'Default' }, { Label: 'Destination address' }); ia.name = 'Input/Address'; add(ct, [ia, 'FILL']);
  if (st === 'Invalid') { const al = await alertBox('danger', 'This looks like a Solana address', 'You chose Arbitrum One, but 7Hq3…Xk9P is a Solana (SPL) address. Paste an address that starts with 0x, or switch the network to Solana.', { actions: [await BTN('Secondary', 'Switch network to Solana', { size: 'M', lead: 'swap' })] }); add(ct, [al, 'FILL']); }
  const bad = st === 'Invalid';
  const fc = card('Format checks', { gap: 8, p: [12, 16, 12, 16], fill: 'surface/raised' }); add(ct, [fc, 'FILL']);
  for (const [k, t] of [[bad ? 'x' : 'n', bad ? 'Doesn\'t start with 0x — not an Arbitrum One address' : 'Starts with 0x and is 42 characters long'], [bad ? 'x' : 'n', bad ? 'Checksum can\'t be verified for this format' : 'Checksum is verified automatically'], ['i', 'Exchange deposit addresses work if the exchange lists USDT on Arbitrum One']]) { const r = hrow('Check — ' + t.slice(0, 30), 8, { align: 'MIN' }); add(fc, [r, 'FILL']); r.appendChild(await IC(k === 'x' ? 'x-circle' : k === 'i' ? 'info' : 'check', 16, k === 'x' ? 'status/danger' : 'icon/muted')); await tx(r, t, 'Caption', k === 'x' ? 'text/danger' : 'text/secondary'); }
  const wa = await alertBox('warning', 'Double-check before you continue', 'Transfers are irreversible. Clipboard malware can swap a copied address — compare the first and last 4 characters with your wallet app.'); add(ct, [wa, 'FILL']);
}
// WAL-13 page content. st = Default | Over | Limit
async function amt13(ct, st) {
  await fhead(ct, 'How much do you want to withdraw?', 'The Arbitrum network fee is taken from this amount — you see exactly what arrives before you confirm.', true);
  const ia = await I('15:3387', { State: st === 'Over' ? 'Error' : st === 'Limit' ? 'Disabled' : 'Focus' }, { Label: 'Amount to withdraw', 'Show limits': true }); ia.name = 'Input/Amount'; add(ct, [ia, 'FILL']);
  if (st === 'Limit') setT(ia, 'Helper text', 'Daily limit reached — reopens 28 Nov 2026, 00:00 UTC.', 0);
  await chips(ct, st === 'Default' ? '1,500.00' : null, st === 'Limit' ? 'Disabled' : null);
  if (st === 'Default') { await limitTiles(ct, true); const fe = await I('20:3002', { State: 'Normal' }); fe.name = 'Wallet/Fee Estimator'; add(ct, [fe, 'FILL']); await lockNote(ct); }
  if (st === 'Over') { const al = await alertBox('warning', 'Only your Available balance can be withdrawn', 'You entered 12,000.00 USDT; 9,215.30 USDT is Available. Pending deposits (1,000.00) and Owed refunds/rewards (415.20) become withdrawable once they settle. Entry funds stay Locked until the draw.', { actions: [await BTN('Secondary', 'Withdraw max · 9,215.30', { size: 'M' })] }); add(ct, [al, 'FILL']); await limitTiles(ct, true); }
  if (st === 'Limit') { const al = await alertBox('warning', 'Today\'s 25,000.00 USDT limit is reached', 'Separate DEMO scenario: 25,000.00 USDT already withdrawn today. Withdrawals reopen 28 Nov 2026, 00:00 UTC (in 5 h 18 min). Your Available balance stays safe in your account.', { actions: [await BTN('Secondary', 'Raise limit — verify Level 3', { size: 'M', lead: 'shield-check' })] }); add(ct, [al, 'FILL']); await limitCard(ct, { used: '25,000.00', usedLabel: 'of 25,000.00 USDT today', pct: 1, full: true, limitNote: 'Resets 28 Nov 2026, 00:00 UTC · Level 3 (source of funds) can raise it.' }); }
}
// ===== END WAL-WA mobile shell =====

// ===== BODY m1 — Mobile 390: WAL-10 asset sheet, WAL-11 network sheet, WAL-12 Default =====
const P = 'MOB-07 · ';
const N10 = P + 'WAL-10 Withdraw — Step 1 Select Asset / 390 / Default — asset sheet';
const N11 = P + 'WAL-11 Withdraw — Step 2 Select Network / 390 / Default — network sheet';
const N12 = P + 'WAL-12 Withdraw — Step 3 Enter Address / 390 / Default';
clean([N10, N11, N12]);
const out = {}, H = {};
{ const S = await shellM(N10, 1, MX[0], 'Select asset', 'Select network', { sheet: true });
  const bb = await I('14:1974', { Layout: 'Compact' }); add(S.ct, [bb, 'FILL']);
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'Choose asset');
  await sheetHead(sh, 'Choose what to withdraw', 'Withdrawals are paid out in USDT. Only your Available balance can leave your account.');
  const o1 = hrow('Asset option — USDT (selected)', 12, { p: 16, fill: 'surface/selected', stroke: 'border/brand', r: 14 }); add(sh, [o1, 'FILL']);
  o1.appendChild(await CHAIN('USDT', 32));
  const c1 = AL('VERTICAL', { name: 'Text', gap: 2 }); add(o1, [c1, 'FILL']); await tx(c1, 'USDT', 'Body/M Strong'); await tx(c1, 'Tether USD · 5 networks', 'Caption', 'text/secondary');
  const v1 = AL('VERTICAL', { name: 'Value', gap: 2, align: 'MAX' }); o1.appendChild(v1); const vr = hrow('Amount', 4); v1.appendChild(vr); await tx(vr, '9,215.30', 'Number/S', 'text/primary', { hug: true }); vr.appendChild(await DEMO('XS')); await tx(v1, 'Available', 'Caption', 'text/success', { hug: true });
  o1.appendChild(await IC('check-circle', 20, 'icon/brand'));
  const o2 = AL('VERTICAL', { name: 'Asset option — Bonus funds (not withdrawable)', gap: 10, p: 16, fill: 'surface/raised', stroke: 'border/subtle', r: 14 }); add(sh, [o2, 'FILL']);
  const r2 = hrow('Row', 12); add(o2, [r2, 'FILL']); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 6, fill: 'surface/default', r: 10 }); it.appendChild(await IC('gift', 20, 'icon/muted')); r2.appendChild(it);
  const c2 = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r2, [c2, 'FILL']); await tx(c2, 'Bonus funds', 'Body/M Strong', 'text/secondary'); await tx(c2, 'Not withdrawable yet', 'Caption', 'text/tertiary');
  const v2 = hrow('Value', 4); r2.appendChild(v2); await tx(v2, '50.00', 'Number/S', 'text/tertiary', { hug: true }); v2.appendChild(await DEMO('XS'));
  const m = AL('HORIZONTAL', { name: 'Wagering meter', fill: 'surface/default', r: 9999, h: 6, w: 300, clip: true }); add(o2, [m, 'FILL']); m.appendChild(rect(Math.round(m.width * 0.428), 6, 'brand/primary', 9999, 'Progress'));
  await tx(o2, 'Wagering 642.00 of 1,500.00 USDT (30×) · expires 11 Dec 2026, 23:59 UTC. Moves to Available when complete.', 'Caption', 'text/secondary');
  const al = await alertBox('info', 'Nothing leaves your account until step 7', 'You\'ll review the network, address and every fee first.'); add(sh, [al, 'FILL']);
  await sheetFoot(sh, { next: 'Continue with USDT' });
  H[N10] = pinSheet(S.f, sh, scr); out[N10] = S.f.id; }
{ const S = await shellM(N11, 2, MX[1], 'Select network', 'Enter address', { sheet: true });
  const rc = card('Asset recap', { gap: 0, p: [4, 16, 4, 16], fill: 'surface/raised' }); add(S.ct, [rc, 'FILL']);
  { const a = hrow('Asset value', 6); a.appendChild(await CHAIN('USDT', 16)); await tx(a, 'USDT · Tether USD', 'Body/S Strong', 'text/primary', { hug: true }); await kv(rc, 'Asset', a); }
  await kv(rc, 'Available', [await T('9,215.30 USDT', 'Number/S', 'text/primary'), await DEMO('XS')], { last: true });
  await tabM(S.f);
  const { sh, scr } = await sheetM(S.f, 'Choose network');
  await sheetHead(sh, 'Choose the network', 'Your wallet must accept USDT on the same network. The network fee is taken from your amount.');
  const list = AL('VERTICAL', { name: 'Network list', gap: 8 }); add(sh, [list, 'FILL']);
  for (const [chain, std, fee, status, sel, warn] of [['BNB Chain', 'USDT (BEP-20) · ~2 min', '0.12 USDT', 'Operational'], ['Polygon', 'USDT (PoS) · ~3 min', '0.02 USDT', 'Operational'], ['Arbitrum', 'USDT (Arbitrum One) · ~1 min', '0.08 USDT', 'Operational', true], ['Ethereum', 'USDT (ERC-20) · slower', '2.40 USDT', 'Congested', false, true], ['Solana', 'USDT (SPL) · ~1 min', '0.01 USDT', 'Operational']]) {
    const o = await I('15:890', { State: sel ? 'Selected' : 'Default' }, { Chain: CHAINS[chain], 'Show warning': !!warn }); o.name = 'Network option — ' + chain; add(list, [o, 'FILL']);
    setT(o, 'Name', chain); setT(o, 'Standard', std); setT(o, 'Fee', fee); setT(o, 'Status', status, 0, status === 'Congested' ? 'text/warning' : null);
  }
  const al = await alertBox('warning', 'Wrong-network withdrawals can\'t be recovered', 'Pick Arbitrum One only if your wallet or exchange lists USDT on Arbitrum One.'); add(sh, [al, 'FILL']);
  await sheetFoot(sh, { next: 'Continue with Arbitrum', cancel: false });
  H[N11] = pinSheet(S.f, sh, scr); out[N11] = S.f.id; }
{ const S = await shellM(N12, 3, MX[2], 'Enter address', 'Enter amount');
  await addr12(S.ct, 'Default');
  await footM(S.f, { next: 'Continue to amount', state: 'Disabled', note: 'Choose or paste an address to continue' });
  out[N12] = S.f.id; }
fitSection(sec);
const sizes = {}; for (const [nm, id] of Object.entries(out)) { const f = await figma.getNodeByIdAsync(id); sizes[nm.slice(9, 15)] = [f.x, f.y, f.width, f.height]; }
for (const id of Object.values(out)) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: 0.6 }); }
return { section: sec.id, out, sizes, H };
