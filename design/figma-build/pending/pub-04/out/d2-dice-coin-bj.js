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
// ===== PUB-04 LIB (agent pub-04 game details) =====
const MISS = [];
async function fnt(t) { const L = t.characters.length; if (L) { for (const f of t.getRangeAllFontNames(0, L)) await figma.loadFontAsync(f); } else if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); }
// O(node, {layerName: text}) -> overrides the first TEXT layer with that exact name (logs misses)
async function O(n, map, tag = '') { const idx = {}; for (const t of n.findAll(x => x.type === 'TEXT')) (idx[t.name] = idx[t.name] || []).push(t); for (const [k, v] of Object.entries(map)) { if (v == null) continue; const t = (idx[k] || [])[0]; if (!t) { MISS.push(tag + ':' + k); continue; } if (t.characters === String(v)) continue; await fnt(t); t.characters = String(v); } return n; }
function nest(n, name) { return n.findOne(x => x.type === 'INSTANCE' && x.name === name); }
function setP(inst, props, tag = '') { if (!inst) { MISS.push('nest:' + tag); return; } try { const cp = inst.componentProperties; const set = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(cp).find(x => x.split('#')[0] === k); if (key) set[key] = v; else MISS.push(tag + ':prop ' + k); } if (Object.keys(set).length) inst.setProperties(set); } catch (e) { MISS.push(tag + ':' + String(e.message || e).slice(0, 90)); } }
async function navActive(sb, label) { let hit = false; for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (!cp || !cp.State || !cp.Collapsed) continue; const lk = Object.keys(cp).find(k => k.split('#')[0] === 'Label'); const lab = lk ? cp[lk].value : ''; const isA = cp.State.value === 'Active'; try { if (lab === label) { hit = true; if (!isA) it.setProperties({ State: 'Active' }); } else if (isA) it.setProperties({ State: 'Default' }); } catch (e) { MISS.push('nav:' + lab); } } if (!hit) MISS.push('nav-miss:' + label); }
async function tx(name, chars, style, color, o = {}) { const t = await T(chars, style, color, o); t.name = name; return t; }
// AX = AL() but keeps the axis that was not given a size on HUG (helpers' resize() resets both axes to FIXED)
function AX(dir, o = {}) { const f = AL(dir, o); if (o.w && !o.h) { if (dir === 'VERTICAL') f.primaryAxisSizingMode = 'AUTO'; else f.counterAxisSizingMode = 'AUTO'; } if (o.h && !o.w) { if (dir === 'VERTICAL') f.counterAxisSizingMode = 'AUTO'; else f.primaryAxisSizingMode = 'AUTO'; } return f; }
function row(name, o = {}) { return AX('HORIZONTAL', Object.assign({ name, gap: 12, align: 'CENTER' }, o)); }
function col(name, o = {}) { return AX('VERTICAL', Object.assign({ name, gap: 8 }, o)); }
function card(name, o = {}) { return AX('VERTICAL', { name, p: o.p ?? 24, gap: o.gap ?? 16, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', r: o.r ?? 14 }); }
// Tile/Game Art component ids (registry-catalog.json _art)
const ART = { 'Global Pool': '24:13141', 'Orbit Rush': '24:13176', 'Orbit Rush Duel': '24:13206', 'Vault Sweeper': '24:13239', 'Skyline': '24:13297', 'Pinfall': '24:13333', 'Fortune Ring': '24:13399', 'Pool Dice': '24:13443', 'Double Side': '24:13473', 'High Card': '24:13496', 'Ascend': '24:13528', 'Pool Keno': '24:13564', 'Pool Roulette': '25:14777', 'Twenty-One': '25:14841', 'Baccarat Lounge': '25:14875', 'Sic Bo Triad': '25:14922', 'Dragon & Phoenix': '25:14961', 'Live Pool Roulette': '27:15060', 'Speed Twenty-One': '27:15096', 'Keno Express 20/80': '27:15267', 'Daily Draw 6/45': '27:15370', 'Bingo 90 Classic': '27:15495' };
const GAMES6 = ['Global Pool', 'Pool Roulette', 'Orbit Rush', 'Pool Dice', 'Double Side', 'Twenty-One'];
const TPL_NAME = 'Template/Game Details';
// ===== END PUB-04 LIB =====
// ===== PUB-04 FRAMES =====
// apply per-game content to a Template/Game Details instance (same layer names in both variants)
async function apply(inst, g, M) {
  const m = { 'Live players': g.live, 'Chip category': g.cat, 'Chip fairness': g.fair, 'Game name': g.name, 'Tagline': g.tag, 'Small print': g.small, 'Facts note': g.fnote, 'How to play title': g.howT, 'Payout unit': g.punit, 'Payout footnote': g.pfoot, 'Rules footnote': g.rfoot, 'PF title': g.pft, 'PF body': g.pfb, 'Rail title': g.rt, 'Rail fee': g.fee, 'Live title': g.lt };
  if (M) { m['Hdr m1'] = g.hdr[0]; m['Hdr m2'] = g.hdr[2]; m['Hdr m3'] = g.hdr[1]; m['Hdr m4'] = g.hdr[3]; } else { m['Crumb 1'] = 'Games'; m['Crumb 2'] = g.crumb; m['Current page'] = g.name; }
  g.hf.forEach((v, i) => { m['Hero fact ' + (i + 1)] = v; });
  g.facts.forEach((f, i) => { m[`Fact ${i + 1} label`] = f[0]; m[`Fact ${i + 1} value`] = f[1]; m[`Fact ${i + 1} sub`] = f[2]; });
  g.steps.forEach((s, i) => { m[`Step ${i + 1} title`] = s[0]; m[`Step ${i + 1} body`] = s[1]; });
  g.rules.forEach((r, i) => { m['Rule ' + (i + 1)] = r; });
  g.pay.forEach((p, i) => { const N = i + 1; m[`Payout ${N} bet`] = p[0]; m[`Payout ${N} covers`] = p[1]; m[`Payout ${N} pays`] = p[2]; m[`Payout ${N} chance`] = p[3]; });
  g.pfs.forEach((s, i) => { m['PF step ' + (i + 1)] = s; });
  g.pfd.forEach((d, i) => { m['PF key ' + (i + 1)] = d[0]; m['PF val ' + (i + 1)] = d[1]; });
  g.rail.forEach((d, i) => { m['Rail key ' + (i + 1)] = d[0]; m['Rail val ' + (i + 1)] = d[1]; });
  g.lv.forEach((d, i) => { m['Live key ' + (i + 1)] = d[0]; m['Live val ' + (i + 1)] = d[1]; });
  await O(inst, m, g.key + (M ? 'M' : 'D'));
  for (let i = 1; i <= 10; i++) { const r = inst.findOne(n => n.name === 'Payout row ' + i); if (r) r.visible = i <= g.pay.length; else MISS.push('payrow' + i); }
  for (let i = 1; i <= 7; i++) { const r = inst.findOne(n => n.name === 'Rule row ' + i); if (r) r.visible = i <= g.rules.length; else MISS.push('rulerow' + i); }
  for (const n of inst.findAll(n => n.name.startsWith('Objects — '))) n.visible = n.name === 'Objects — ' + g.name;
  const pd = inst.findOne(n => n.name === 'Payout DEMO'); if (pd) pd.visible = !!g.payDemo;
  for (const [a, b] of [['Play CTA', 'Play CTA gold'], ['Rail CTA', 'Rail CTA gold']]) { const p = nest(inst, a), q = nest(inst, b); if (p) { setP(p, { Label: g.cta }, a); p.visible = !g.gold; } if (q) q.visible = !!g.gold; }
  setP(nest(inst, 'PF verify btn'), { Label: g.pfBtn }, 'pfbtn');
  if (!M) for (let i = 0; i < 4; i++) setP(nest(inst, 'Hdr ' + (i + 1)), { Label: g.hdr[i] }, 'hdr');
  setP(nest(inst, 'Related header'), { Title: g.relT }, 'relh');
  g.rel.forEach((r, i) => setP(nest(inst, 'Related ' + (i + 1)), { Art: ART[r[0]], Players: r[1], 'House edge': r[2] }, 'rel' + i));
}
function tplSet() { const id = '__TPL__'; return id.startsWith('__') ? null : id; }
async function getTpl() { const id = tplSet(); if (id) { const n = await figma.getNodeByIdAsync(id); if (n) return n; } const n = figma.currentPage.findOne(x => x.type === 'COMPONENT_SET' && x.name === TPL_NAME); if (!n) throw new Error('Template/Game Details not found — run t1 first and put its id in tpl_id.txt'); return n; }
async function tplInst(set, bp) { const v = set.children.find(c => c.name === 'Breakpoint=' + bp) || set.defaultVariant; return v.createInstance(); }
async function deskFrame(set, g, X, Y) {
  const name = `[PUB-04] Game Details · ${g.name} (${g.genre}) / 1440 / Default — logged out`;
  for (const o of sec.children.filter(c => c.name === name)) o.remove();
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const rail = AL('VERTICAL', { name: 'Sidebar rail', fill: 'bg/secondary' }); add(body, rail);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); add(rail, sb); rail.layoutSizingVertical = 'FILL'; await navActive(sb, g.nav);
  const mc = AL('VERTICAL', { name: 'Main column' }); add(body, [mc, 'FILL']);
  add(mc, [await I('23:9832', { State: 'Guest' }), 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [24, 32, 48, 32], gap: 24 }); add(mc, [main, 'FILL']);
  const t = await tplInst(set, 'Desktop'); t.name = 'Template/Game Details — ' + g.name; add(main, [t, 'FILL']); await apply(t, g, false);
  const ft = await I('23:17478', { Breakpoint: 'Desktop' }); add(mc, [ft, 'FILL']); try { bnum(ft, 'paddingLeft', 24); bnum(ft, 'paddingRight', 24); } catch (e) { MISS.push('footpad'); }
  return { f, t };
}
async function mobFrame(set, g, X, Y) {
  const name = `[PUB-04] Game Details · ${g.name} (${g.genre}) / 390 / Default — logged out`;
  for (const o of sec.children.filter(c => c.name === name)) o.remove();
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  add(f, [await I('23:12908', { State: 'Guest' }), 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [16, 16, 24, 16], gap: 24 }); add(f, [main, 'FILL']);
  const t = await tplInst(set, 'Mobile'); t.name = 'Template/Game Details — ' + g.name; add(main, [t, 'FILL']); await apply(t, g, true);
  const bar = AL('HORIZONTAL', { name: 'Sticky CTA bar (fixed above tab bar)', gap: 12, p: [12, 16, 12, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { t: 1 });
  const info = col('Bar info', { gap: 2 }); const ir = row('Bar info top', { gap: 6 }); add(ir, await T(g.barK, 'Caption', 'text/tertiary'), await DEMO('XS')); add(info, ir, await T(g.barV, 'Label/M', 'text/primary'));
  const b = g.gold ? await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }) : await BTN('Primary', 'Play now', { size: 'L', lead: 'play' });
  add(bar, info, [b, 'FILL']); add(f, [bar, 'FILL']);
  add(f, [await I('22:5413', { Active: g.tab }), 'FILL']);
  return { f, t };
}
// ===== END PUB-04 FRAMES =====
const GD = {};
GD.dice = {
  key: 'dice', name: 'Pool Dice', genre: 'Dice', nav: 'Pool Dice', crumb: 'Originals', gold: false, tab: 'Games',
  cat: 'GLOBAL POOL ORIGINAL · DICE', fair: 'Provably fair',
  tag: 'Pick a target between 0.00 and 99.99, choose Roll over or Roll under, and see your exact win chance, multiplier and payout before you roll.',
  hf: ['House edge 1.00%', 'RTP 99.00%', 'Win chance 1.00–98.00%'],
  small: 'You can lose your stake. 18+. Real-money play needs an account in a permitted jurisdiction; operated under an applicable licence (DEMO placeholder).',
  cta: 'Play Pool Dice', live: '66 playing now',
  fnote: 'Limits are DEMO values. Responsible-gaming limits you set can lower them.',
  facts: [['House edge', '1.00%', 'built into every multiplier'], ['Return to player', '99.00%', 'theoretical, over the long run'], ['Min bet', '0.10', 'USDT per roll'], ['Max bet', '1,000.00', 'USDT per roll'], ['Win chance', '1–98%', 'you choose it with the slider'], ['Max multiplier', '99.0000×', 'at a 1.00% win chance']],
  howT: 'How to play',
  steps: [['Set your bet', 'Enter a stake from 0.10 to 1,000.00 USDT.'], ['Choose over or under', 'Drag the slider to a target. Roll over 50.50 wins if the roll is above 50.50; Roll under wins if it is below your target.'], ['Check the odds', 'Win chance, multiplier and payout update live — e.g. 49.50% → 2.0000× → 20.00 USDT on a 10.00 bet.'], ['Roll and verify', 'The roll lands between 0.00 and 99.99. Open the result to check it against your seeds.']],
  rules: ['Each roll is a number from 0.00 to 99.99, and every value is equally likely.', 'Roll over wins when the roll is above your target; Roll under wins when it is below. Win chance = 100 − target (over) or = target (under).', 'Multiplier = 99 ÷ win chance in %. Example: 49.50% → 2.0000×.', 'Win chance can be set from 1.00% to 98.00%, so multipliers run from 1.0102× to 99.0000×.', 'Payout = stake × multiplier. If the roll misses your target, you lose your stake.', 'Each roll is fixed by a committed server seed, your client seed and a nonce — check any roll in the verifier.'],
  rfoot: 'Full rules: Help Centre › Pool Dice rules (v1.2, updated 18 Nov 2026).',
  hdr: ['Roll over', 'Win chance', 'Multiplier', '10.00 bet returns'], payDemo: false,
  punit: 'Example for a 10.00 USDT bet',
  pay: [['Over 2.00', '98.00%', '1.0102×', '10.10 USDT'], ['Over 25.00', '75.00%', '1.3200×', '13.20 USDT'], ['Over 34.00', '66.00%', '1.5000×', '15.00 USDT'], ['Over 50.50', '49.50%', '2.0000×', '20.00 USDT'], ['Over 75.25', '24.75%', '4.0000×', '40.00 USDT'], ['Over 90.10', '9.90%', '10.0000×', '100.00 USDT'], ['Over 99.00', '1.00%', '99.0000×', '990.00 USDT']],
  pfoot: 'Roll under works the same way with win chance = target (e.g. under 49.50 → 49.50% → 2.0000×). Multipliers are shown to 4 decimals.',
  pft: 'Provably fair — check any roll',
  pfb: 'Your roll comes from a server seed (hashed and shown before you bet), your own client seed and a nonce that counts your bets. Change your client seed any time; rotate the server seed to reveal it.',
  pfs: ['Commit — the server seed hash is shown before you roll.', 'Roll — server seed + client seed + nonce → a roll from 0.00 to 99.99.', 'Verify — e.g. nonce 417 → roll 73.21, recomputed in the verifier.'],
  pfd: [['Server seed hash', '8f3c1e…e813'], ['Client seed · nonce', 'nova-k-2711 · 417'], ['Result', 'Roll 73.21 — over 50.50 won']],
  pfBtn: 'Verify a roll',
  rt: 'Play Pool Dice',
  rail: [['House edge', '1.00%'], ['RTP', '99.00%'], ['Bet per roll', '0.10–1,000.00 USDT'], ['Win chance', '1.00–98.00%'], ['Max multiplier', '99.0000×']],
  fee: 'No extra fee per bet — the 1.00% house edge is the only cost. Bets use your platform balance (network fee 0.00 USDT).',
  lt: 'Right now',
  lv: [['Players', '66 playing now'], ['Last 1,000 rolls', '46–55 per 5-point bin · expected 50'], ['Last result', 'Roll 73.21 — over 50.50 won']],
  relT: 'More GLOBAL POOL Originals',
  rel: [['Double Side', '214', 'House edge 2.00%'], ['Pool Keno', '58', 'House edge 1.00%'], ['High Card', '41', 'House edge 1.00%'], ['Skyline', '206', 'House edge 1.00%'], ['Vault Sweeper', '146', 'House edge 1.00%'], ['Pinfall', '100', 'House edge 1.00%']],
  barK: 'House edge 1.00% · win chance 1–98%', barV: '0.10–1,000.00 USDT per roll'
};

GD.coin = {
  key: 'coin', name: 'Double Side', genre: 'Coinflip', nav: 'Double Side', crumb: 'Originals', gold: false, tab: 'Games',
  cat: 'GLOBAL POOL ORIGINAL · COINFLIP', fair: 'Provably fair',
  tag: 'Call heads or tails and flip. A correct call pays 1.96× your stake — the simplest game on GLOBAL POOL, and every flip is verifiable.',
  hf: ['Pays 1.96×', 'House edge 2.00%', 'Win chance 50.00%'],
  small: 'You can lose your stake. 18+. Real-money play needs an account in a permitted jurisdiction; operated under an applicable licence (DEMO placeholder).',
  cta: 'Play Double Side', live: '214 playing now',
  fnote: 'Limits are DEMO values. Responsible-gaming limits you set can lower them.',
  facts: [['Payout', '1.96×', 'your stake on a correct call'], ['House edge', '2.00%', 'RTP 98.00%'], ['Win chance', '50.00%', 'heads or tails'], ['Min bet', '0.10', 'USDT per flip'], ['Max bet', '1,000.00', 'USDT per flip'], ['Max profit', '960.00', 'USDT on a 1,000.00 bet']],
  howT: 'How to play',
  steps: [['Choose a side', 'Pick Heads or Tails. Nothing is pre-selected — you always make the call.'], ['Enter your bet', 'Stake 0.10–1,000.00 USDT. The payout shows before you flip: 10.00 → 19.60 USDT.'], ['Flip', 'The side is fixed by your seeds the moment you confirm. The animation only reveals it.'], ['Win or lose', 'Correct call: stake × 1.96 to Available. Wrong call: you lose your stake. Verify the flip any time.']],
  rules: ['Two outcomes, each 50.00%. There is no edge-landing outcome.', 'A correct call returns 1.96× your stake (0.96× profit); a wrong call loses the stake.', 'House edge 2.00% = 1 − (50% × 1.96).', 'Limits: 0.10–1,000.00 USDT per flip.', 'Previous flips don’t affect the next — a run of heads makes tails no more likely.', 'Each flip is fixed by a committed server seed, your client seed and a nonce.'],
  rfoot: 'Full rules: Help Centre › Double Side rules (v1.1, updated 18 Nov 2026).',
  hdr: ['Your call', 'Win chance', 'Pays', '10.00 bet returns'], payDemo: false,
  punit: 'Example for a 10.00 USDT bet',
  pay: [['Heads — correct', '50.00%', '1.96×', '19.60 USDT'], ['Tails — correct', '50.00%', '1.96×', '19.60 USDT'], ['Wrong call', '50.00%', '0×', '0.00 — stake lost']],
  pfoot: 'Profit on a correct 10.00 USDT call is 9.60 USDT. Expected return is 98.00% of stakes over the long run.',
  pft: 'Provably fair — every flip is checkable',
  pfb: 'The side comes from a hashed server seed you see before flipping, your client seed and the flip’s nonce. Rotate the server seed to reveal it and re-check any flip.',
  pfs: ['Commit — the server seed hash is shown before you flip.', 'Flip — server seed + client seed + nonce → heads or tails.', 'Verify — recompute the side of any past flip in the verifier.'],
  pfd: [['Server seed hash', '8f3c1e…e813'], ['Client seed · nonce', 'nova-k-2711 · 418'], ['Last flip', 'Tails — call Heads lost']],
  pfBtn: 'Verify a flip',
  rt: 'Play Double Side',
  rail: [['Payout', '1.96×'], ['House edge', '2.00%'], ['Win chance', '50.00%'], ['Bet per flip', '0.10–1,000.00 USDT'], ['Max profit', '960.00 USDT']],
  fee: 'No extra fee per bet — the 2.00% house edge is the only cost. Bets use your platform balance (network fee 0.00 USDT).',
  lt: 'Right now',
  lv: [['Players', '214 playing now'], ['Last 12 flips', 'H · T · T · H · H · T · H · T · T · T · H · H'], ['Heads in the last 1,000', '497 heads · 503 tails']],
  relT: 'More GLOBAL POOL Originals',
  rel: [['Pool Dice', '66', 'House edge 1.00%'], ['High Card', '41', 'House edge 1.00%'], ['Fortune Ring', '34', 'House edge 1.00%'], ['Skyline', '206', 'House edge 1.00%'], ['Orbit Rush', '1,062', 'House edge 1.00%'], ['Pool Keno', '58', 'House edge 1.00%']],
  barK: 'Pays 1.96× · house edge 2.00%', barV: '0.10–1,000.00 USDT per flip'
};

GD.bj = {
  key: 'bj', name: 'Twenty-One', genre: 'Blackjack', nav: 'Twenty-One', crumb: 'Table games', gold: false, tab: 'Games',
  cat: 'TABLE GAME · BLACKJACK', fair: 'Provably fair',
  tag: 'Classic blackjack against the dealer with six decks. Blackjack pays 3:2, the dealer stands on soft 17, and with basic strategy the house edge is about 0.50%.',
  hf: ['Blackjack pays 3:2', 'Dealer stands on soft 17', 'House edge ≈ 0.50%'],
  small: 'You can lose your stake. 18+. Real-money play needs an account in a permitted jurisdiction; operated under an applicable licence (DEMO placeholder).',
  cta: 'Play Twenty-One', live: '347 playing now',
  fnote: 'Limits are DEMO values. Responsible-gaming limits you set can lower them.',
  facts: [['House edge', '≈ 0.50%', 'with perfect basic strategy'], ['Return to player', '≈ 99.50%', 'depends on your decisions'], ['Decks', '6', '312 cards, shuffled for every hand'], ['Min bet', '0.10', 'USDT per hand'], ['Max bet', '1,000.00', 'USDT per hand'], ['Blackjack pays', '3 : 2', 'dealer stands on soft 17']],
  howT: 'How to play',
  steps: [['Place your bet', 'Choose chips from 0.10 to 1,000.00 USDT and press Deal.'], ['Read the hands', 'You get two cards face up. The dealer shows one card and keeps the hole card face down.'], ['Make your move', 'Hit, Stand, Double on any first two cards, or Split a pair. Insurance is offered when the dealer shows an Ace.'], ['Dealer plays, you get paid', 'The dealer draws to 17 and stands on soft 17. Wins pay 1:1, blackjack pays 3:2, ties push.']],
  rules: ['6 decks (312 cards), shuffled from your seeds for every hand.', 'Dealer stands on all 17s, including soft 17 (S17).', 'Double down on any first two cards; doubling after a split is allowed.', 'Split a pair once (2 hands). Split Aces get one card each.', 'Dealer peeks for blackjack with an Ace or 10 showing, so you only lose your original bet to a dealer blackjack.', 'Insurance costs half your bet and pays 2:1. Surrender is not offered.'],
  rfoot: 'Full rules: Help Centre › Twenty-One rules (v2.0, updated 20 Nov 2026).',
  hdr: ['Outcome', 'When', 'Pays', '10.00 bet returns'], payDemo: false,
  punit: 'Example for a 10.00 USDT bet',
  pay: [['Blackjack', 'Ace + a 10-value card as your first two cards', '3 : 2', '25.00 USDT'], ['Win', 'Your total beats the dealer’s, or the dealer busts', '1 : 1', '20.00 USDT'], ['Double down win', 'You doubled to 20.00 and won', '1 : 1', '40.00 USDT'], ['Push', 'Same total as the dealer', 'Stake back', '10.00 USDT'], ['Insurance', 'Dealer has blackjack (insurance 5.00)', '2 : 1', '15.00 USDT'], ['Lose / bust', 'Over 21, or the dealer’s total is higher', '—', '0.00 USDT']],
  pfoot: 'House edge ≈ 0.50% assumes perfect basic strategy; your actual return depends on your decisions. Insurance returns are on the 5.00 USDT side bet.',
  pft: 'Provably fair — every shuffle is checkable',
  pfb: 'Each hand’s six-deck shuffle comes from a hashed server seed shown before you deal, your client seed and a nonce. After the hand, reveal the seed to re-create the exact card order.',
  pfs: ['Commit — the server seed hash is shown before you deal.', 'Deal — the 312-card order is fixed when you press Deal.', 'Verify — re-create hand BJ-40517 card by card in the verifier.'],
  pfd: [['Hand', 'BJ-40517'], ['Server seed hash', '8f3c1e…e813'], ['Result', 'Blackjack — paid 3:2 (+15.00)']],
  pfBtn: 'Verify a hand',
  rt: 'Play Twenty-One',
  rail: [['House edge', '≈ 0.50%'], ['Decks · dealer', '6 decks · stands soft 17'], ['Blackjack pays', '3 : 2'], ['Bet per hand', '0.10–1,000.00 USDT'], ['Insurance', 'Pays 2 : 1']],
  fee: 'No extra fee per bet — the house edge is the only cost. Bets use your platform balance (network fee 0.00 USDT).',
  lt: 'Right now',
  lv: [['Players', '347 playing now'], ['Tables', 'Single-player tables — no waiting for a seat'], ['Last verified hand', 'BJ-40517 · blackjack paid 3:2']],
  relT: 'More table games',
  rel: [['Speed Twenty-One', '96', 'House edge ≈0.50%'], ['Pool Roulette', '538', 'House edge 2.70%'], ['Baccarat Lounge', '129', 'House edge 1.06% banker'], ['High Card', '41', 'House edge 1.00%'], ['Dragon & Phoenix', '57', 'House edge 3.73%'], ['Sic Bo Triad', '44', 'House edge 2.78%']],
  barK: 'Blackjack 3:2 · S17 · 6 decks', barV: '0.10–1,000.00 USDT per hand'
};
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 Game Details', 40000, 0);
const set = await getTpl();
const X0 = Math.round(set.x + set.width + 240), Y0 = Math.round(set.y);
const R = [];
for (const k of ["dice", "coin", "bj"]) { const i = ['gp', 'roulette', 'crash', 'dice', 'coin', 'bj'].indexOf(k); const g = GD[k]; const { f, t } = await deskFrame(set, g, X0 + i * 1560, Y0); fitSection(sec); R.push({ k, id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id }); }
for (const r of R) { const t = await figma.getNodeByIdAsync(r.tpl); await t.screenshot({ scale: 0.42 }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
