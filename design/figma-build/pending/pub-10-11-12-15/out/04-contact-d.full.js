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
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-10/11/12/15 VIP, Affiliates, About, Contact', 80000, 0);
function txt(inst, name, val, nth = 0) { const ts = inst.findAll(n => n.type === 'TEXT' && n.name === name); if (ts[nth]) ts[nth].characters = val; return ts.length; }
function setProp(inst, base, val) { const cp = inst.componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === base); if (k) inst.setProperties({ [k]: val }); return !!k; }
function setNav(sb, label) { for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { if (it.name === 'Item/Lobby') it.setProperties({ State: 'Default' }); if (it.name === 'Item/' + label) it.setProperties({ State: 'Active' }); } }
async function shell(name, x, y, nav) {
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = x; f.y = y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); sb.name = 'Shell/Sidebar'; body.appendChild(sb); sb.layoutSizingVertical = 'FILL'; setNav(sb, nav);
  const col = AL('VERTICAL', { name: 'Column' }); add(body, [col, 'FILL']);
  const tb = await I('23:9832', { State: 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(col, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', p: [32, 32, 64, 32], gap: 56 }); add(col, [content, 'FILL']);
  const foot = await I('23:17478', { Breakpoint: 'Desktop' }); foot.name = 'Shell/Footer Mega'; add(col, [foot, 'FILL']); bnum(foot, 'paddingLeft', 32); bnum(foot, 'paddingRight', 32);
  return { f, body, col, content, foot };
}
async function head(over, title, body, right) {
  const row = AL('HORIZONTAL', { name: 'Section header — ' + title, gap: 24, align: 'MAX' });
  const l = AL('VERTICAL', { gap: 8 }); add(row, [l, 'FILL']);
  add(l, await T(over, 'Overline', 'text/brand'), await T(title, 'Heading/H3', 'text/primary'));
  if (body) add(l, await T(body, 'Body/M', 'text/secondary', { w: 760 }));
  if (right) add(row, right);
  return row;
}
function box(name, o = {}) { return AL(o.dir || 'VERTICAL', { name, fill: o.fill || 'surface/default', stroke: o.stroke === false ? null : (o.stroke || 'border/subtle'), r: o.r ?? 14, p: o.p ?? 24, gap: o.gap ?? 12, align: o.align, justify: o.justify, w: o.w }); }
async function crumbHero(C, crumb, heroName) {
  const top = AL('VERTICAL', { name: 'Page top', gap: 16 }); add(C, [top, 'FILL']);
  const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', crumb); add(top, bc);
  const hero = AL('HORIZONTAL', { name: heroName, fill: 'surface/default', r: 20, p: 48, clip: true }); stroke(hero, 'border/subtle'); add(top, [hero, 'FILL']);
  const copy = AL('VERTICAL', { name: 'Copy', gap: 20, w: 560 }); add(hero, copy);
  return { top, hero, copy };
}
function abs(parent, node, x, y, rot) { parent.appendChild(node); node.layoutPositioning = 'ABSOLUTE'; if (rot) node.rotation = rot; node.x = x; node.y = y; return node; }
async function licence(C) { const lic = AL('VERTICAL', { name: 'Licence & trust', gap: 16 }); add(C, [lic, 'FILL']); add(lic, [await I('25:16197'), 'FILL'], await I('6:158', { Variant: 'Inline' })); return lic; }
const NAME = '[PUB-15] Contact / 1440 / Default — empty form';
const S = await shell(NAME, 4800, 120, 'Support'); const C = S.content;
const top = AL('VERTICAL', { name: 'Page top', gap: 16 }); add(C, [top, 'FILL']);
const bc = await I('14:1145', { Levels: '2' }); txt(bc, 'Crumb 1', 'Home'); txt(bc, 'Current page', 'Contact'); add(top, bc);
const ph = AL('HORIZONTAL', { name: 'Page header', gap: 24, align: 'MAX' }); add(top, [ph, 'FILL']);
const pl = AL('VERTICAL', { gap: 8 }); add(pl, await T('Contact support', 'Heading/H1', 'text/primary'), [await T('Real people, around the clock. Tell us what happened and we’ll get back to you — most emails get a first reply in about 2 hours.', 'Body/L', 'text/secondary', { w: 680 }), 'FILL']); add(ph, [pl, 'FILL']);
const stt = AL('HORIZONTAL', { name: 'System status', fill: 'surface/default', stroke: 'border/subtle', r: 9999, p: [8, 16, 8, 12], gap: 8, align: 'CENTER' }); add(stt, await IC('alert-triangle', 16, 'text/warning'), await T('Ethereum deposits slower than usual · all else operational', 'Label/M', 'text/primary'), await T('Status page', 'Label/M', 'text/brand'), await IC('external-link', 14, 'icon/brand')); add(ph, stt);
const cols = AL('HORIZONTAL', { name: 'Form + channels', gap: 24 }); add(C, [cols, 'FILL']);
const form = AL('VERTICAL', { name: 'Contact form', fill: 'surface/default', stroke: 'border/subtle', r: 20, p: 32, gap: 24 }); add(cols, [form, 'FILL']);
const fh = AL('HORIZONTAL', { name: 'Form header', gap: 12, align: 'CENTER' }); add(fh, [await T('Send us a message', 'Heading/H4', 'text/primary', { name: 'Form title' }), 'FILL'], await T('* required', 'Caption', 'text/tertiary')); add(form, [fh, 'FILL']);
const an = AL('HORIZONTAL', { name: 'Anti-phishing notice', fill: 'status/info-tint', r: 10, p: [12, 16, 12, 16], gap: 10 }); add(an, await IC('shield', 18, 'text/info'), [await T('We will never ask for your password, 2FA codes, seed phrase or private keys. Every email from us shows your anti-phishing code.', 'Body/S', 'text/primary', { w: 560 }), 'FILL']); add(form, [an, 'FILL']);
const fields = AL('VERTICAL', { name: 'Fields', gap: 20 }); add(form, [fields, 'FILL']);
const topic = await I('13:565', { State: 'Default' }, { Label: 'Topic *', Value: 'Choose a topic', 'Show helper': true, 'Show leading icon': true, 'Leading icon': ICONS['list'] }); topic.name = 'Field — Topic'; txt(topic, 'Helper text', 'Account & security, deposits, withdrawals, Global Pool, games, responsible gaming or something else.');
const tv = topic.findOne(n => n.name === 'Value' && n.type === 'TEXT'); if (tv) tv.fills = [paint('text/tertiary')];
add(fields, [topic, 'FILL']);
async function inp(name, label, value, o = {}) { const p = { Label: label, 'Show leading icon': !!o.icon, 'Show trailing icon': false, 'Show helper': !!o.helper }; if (o.icon) p['Leading icon'] = ICONS[o.icon]; const i = await I('13:762', { State: o.state || 'Default', Size: 'M' }, p); i.name = 'Field — ' + name; txt(i, 'Value text', value); if (o.helper) txt(i, 'Helper text', o.helper); const v = i.findOne(n => n.name === 'Value text'); if (v) v.fills = [paint(o.ph ? 'text/tertiary' : 'text/primary')]; return i; }
const r1 = AL('HORIZONTAL', { name: 'Row — name & email', gap: 16 }); add(r1, [await inp('Name', 'Name', 'How should we address you?', { icon: 'user', ph: true, helper: 'Optional — first name is fine.' }), 'FILL'], [await inp('Email', 'Email *', 'name@example.com', { icon: 'mail', ph: true, helper: 'We reply here. Signed in? Use your account email.' }), 'FILL']); add(fields, [r1, 'FILL']);
const r2 = AL('HORIZONTAL', { name: 'Row — account & reference', gap: 16 }); add(r2, [await inp('Account ID', 'Account ID (optional)', 'GP-•••••', { icon: 'id-card', ph: true, helper: 'Find it under Account → Profile.' }), 'FILL'], [await inp('Reference', 'Reference (optional)', 'e.g. WD-20931 or round #1,248', { icon: 'hash', ph: true, helper: 'A transaction, withdrawal or round ID speeds things up.' }), 'FILL']); add(fields, [r2, 'FILL']);
const msg = await I('16:3858', { State: 'Default' }, { Label: 'Message *', 'Show counter': true }); msg.name = 'Field — Message'; txt(msg, 'Value text', 'Describe what happened, when it happened and what you expected to see.'); const mv = msg.findOne(n => n.name === 'Value text'); if (mv) mv.fills = [paint('text/tertiary')]; txt(msg, 'Counter', '0 / 2,000');
add(fields, [msg, 'FILL']);
const cb = await I('20:3205', { Value: 'Unchecked', State: 'Default' }, { Label: 'Email me a copy of this message', 'Show description': false }); cb.name = 'Field — Copy to email'; add(fields, cb);
const pn = AL('HORIZONTAL', { name: 'Privacy note', gap: 8, align: 'CENTER' }); add(pn, await IC('lock', 14, 'icon/muted'), await T('We use these details only to answer your request. Read our Privacy Policy.', 'Caption', 'text/tertiary')); add(form, pn);
const fa = AL('HORIZONTAL', { name: 'Form actions', gap: 16, align: 'CENTER' }); strokeSides(fa, 'border/subtle', { t: 1 }); pad(fa, 24, 0, 0, 0);
const send = await BTN('Primary', 'Send message', { size: 'L', lead: 'mail' }); send.name = 'Button — Send'; add(fa, send);
const fcap = AL('HORIZONTAL', { name: 'Action note', gap: 6, align: 'CENTER' }); add(fcap, await IC('clock', 14, 'icon/muted'), await T('Typical first reply by email: about 2 h', 'Caption', 'text/tertiary', { name: 'Action note text' }), await DEMO('XS')); add(fa, fcap); add(form, [fa, 'FILL']);
// ---- side column ----
const side = AL('VERTICAL', { name: 'Channels & help', gap: 16, w: 440 }); add(cols, side);
const ch = box('Other ways to reach us', { gap: 0, p: 24 }); add(side, [ch, 'FILL']);
const chh = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(chh, [await T('Other ways to reach us', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('XS')); add(ch, [chh, 'FILL']);
for (const [ic, t, d, b] of [['chat', 'Live chat', '24/7 · median wait under 2 min', 'Start chat'], ['mail', 'Email', 'support@globalpool.example · reply within 24 h', null], ['shield-alert', 'Security reports', 'security@globalpool.example · acknowledged within 24 h', null], ['scale', 'Complaints & disputes', 'Formal complaint with a written decision within 14 days', null]]) {
  const r = AL('HORIZONTAL', { name: 'Channel — ' + t, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 });
  const ib = AL('HORIZONTAL', { fill: 'brand/tint', r: 10, p: 8 }); add(ib, await IC(ic, 18, 'icon/brand'));
  const tx = AL('VERTICAL', { gap: 2 }); add(tx, await T(t, 'Body/M Strong', 'text/primary'), [await T(d, 'Body/S', 'text/secondary', { w: 260 }), 'FILL']);
  add(r, ib, [tx, 'FILL']); if (b) add(r, await BTN('Secondary', b, { size: 'S' })); add(ch, [r, 'FILL']); }
add(ch, await T('Email addresses are placeholders for this design.', 'Caption', 'text/tertiary'));
const rt = box('Response times', { gap: 0, p: 24 }); add(side, [rt, 'FILL']);
const rth = AL('HORIZONTAL', { gap: 8, align: 'CENTER', p: [0, 0, 8, 0] }); add(rth, [await T('Response times', 'Heading/H5', 'text/primary'), 'FILL'], await DEMO('S')); add(rt, [rth, 'FILL']);
for (const [k, v] of [['Live chat', 'under 2 min'], ['Email (median 2 h 10 min)', 'within 24 h'], ['Withdrawal questions', 'within 4 h'], ['Security reports', 'within 24 h'], ['Restrictions & appeals', 'within 72 h']]) { const r = AL('HORIZONTAL', { gap: 12, p: [10, 0, 10, 0], align: 'CENTER' }); strokeSides(r, 'border/subtle', { t: 1 }); add(r, [await T(k, 'Body/S', 'text/secondary'), 'FILL'], await T(v, 'Label/M', 'text/primary')); add(rt, [r, 'FILL']); }
add(rt, await T('Last 30 days, measured to the first reply from a person.', 'Caption', 'text/tertiary'));
const rgh = await I('24:14743'); rgh.name = 'RG/Help Resources'; add(side, [rgh, 'FILL']);
// ---- before you write ----
add(C, [await head('BEFORE YOU WRITE', 'You might get an answer faster here', null), 'FILL']);
const ql = AL('HORIZONTAL', { name: 'Quick links', gap: 16 }); add(C, [ql, 'FILL']);
for (const [ic, t, d, l] of [['withdraw', 'Track a withdrawal', 'Live status for every withdrawal, including AML review and network confirmations.', 'Open tracker'], ['help-circle', 'Browse the FAQ', 'Fees, withdrawals, fairness, KYC and restricted regions in plain language.', 'Go to FAQ'], ['sliders', 'Change your limits', 'Lower a limit instantly or take a break — no need to contact us.', 'Responsible gaming']]) {
  const c = await I('23:16859', { State: 'Default' }, { Title: t, Body: d, Link: l, 'Show link': true, Icon: ICONS[ic] }); c.name = 'Card/Feature — ' + t; tint(c.findOne(n => n.name === 'Icon') || c.findOne(n => n.type === 'INSTANCE' && n.componentPropertyReferences && n.componentPropertyReferences.mainComponent), 'icon/brand'); add(ql, [c, 'FILL_BOTH']); }
await licence(C);
S.f.primaryAxisSizingMode = 'AUTO'; fitSection(sec);
await cols.screenshot({ scale: 0.6 });
return { frame: S.f.id, content: C.id, form: form.id, h: S.f.height };
