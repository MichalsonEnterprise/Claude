// ===== ROULETTE KIT — base (agent g-roulette; adapted from the proven CF/DI kits) =====
async function setText(root, name, value, nth = 0) { const ts = root.findAll(n => n.type === 'TEXT' && n.name === name); const t = ts[nth]; if (!t) return false; for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = String(value); return true; }
async function setTexts(root, map) { const miss = []; for (const [k, v] of Object.entries(map)) { if (!(await setText(root, k, v))) miss.push(k); } return miss; }
async function repl(root, map, sub = false) { let n = 0; for (const t of root.findAll(x => x.type === 'TEXT')) { const c = t.characters; let nc = c; for (const [k, v] of Object.entries(map)) { if (sub) { if (nc.includes(k)) nc = nc.split(k).join(v); } else if (nc === k) nc = v; } if (nc !== c) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = nc; n++; } } return n; }
function dumpT(root, max = 40) { return root.findAll(x => x.type === 'TEXT').slice(0, max).map(x => x.name.slice(0, 24) + '=' + String(x.characters).slice(0, 44) + (typeof x.fontSize === 'number' ? '@' + x.fontSize : '')); }
function grow(n) { n.layoutGrow = 1; return n; }
function ALV(o) { const f = AL('VERTICAL', o); if (o.w && !o.h) f.primaryAxisSizingMode = 'AUTO'; return f; }
function spacer() { return AL('HORIZONTAL', { name: 'Spacer', h: 1 }); }
function addSpacer(row) { const s = spacer(); add(row, s); s.layoutGrow = 1; return s; }
function tryFill(n) { try { n.layoutSizingHorizontal = 'FILL'; return true; } catch (e) { return false; } }
async function wrapT(parent, text, style, color, w, o = {}) { const t = await T(text, style, color, Object.assign({ w }, o)); add(parent, t); t.layoutSizingHorizontal = 'FILL'; return t; }
async function chip(icon, label, o = {}) { const r = AL('HORIZONTAL', { name: 'Chip — ' + label, gap: 6, p: [4, 10, 4, 8], r: 9999, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/default', align: 'CENTER' }); if (icon) add(r, await IC(icon, 14, o.icon || 'icon/muted')); add(r, await T(label, o.style || 'Label/S', o.color || 'text/secondary', { name: o.name || label })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function brandChip(icon, label) { return chip(icon, label, { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' }); }
async function statusChip(win, label) { return chip(win ? 'check-circle' : 'x-circle', label, win ? { color: 'text/brand', icon: 'icon/brand', stroke: 'border/brand', fill: 'brand/tint-subtle' } : { color: 'text/danger', icon: 'status/danger', stroke: 'border/danger', fill: 'status/danger-tint' }); }
async function iconBtn(icon, o = {}) { const b = await I('7:774', { Type: o.type || 'Secondary', Size: o.size || 'M', State: o.state || 'Default' }, { Icon: ICONS[icon] }); b.name = 'Button/Icon — ' + (o.label || icon); return b; }
async function sidebar(activeName, collapsed) { const sb = await I('23:6697', { State: collapsed ? 'Collapsed' : 'Expanded', Auth: 'Member' }); sb.name = 'Shell/Sidebar'; let found = false; for (const it of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Item/'))) { const p = it.componentProperties; const st = p.State && p.State.value; if (it.name === 'Item/' + activeName) { found = true; it.setProperties({ State: 'Active' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/brand'); } else if (st === 'Active') { it.setProperties({ State: 'Default' }); const ic = it.findOne(n => n.name === 'Icon'); if (ic) tint(ic, 'icon/muted'); } } return { sb, found }; }
async function rgBar(state, rmap) { const b = await I('23:24937', { State: state || 'Normal' }); b.name = 'RG/Session Bar'; let n = 0; if (rmap) n = await repl(b, rmap, true); return { b, n }; }
async function callout(o) { const tone = o.tone || 'info'; const c = AL('HORIZONTAL', { name: 'Callout — ' + o.title, gap: 12, p: 16, r: 14, fill: 'status/' + tone + '-tint', stroke: 'status/' + tone }); add(c, await IC(o.icon || 'info', 20, 'status/' + tone)); const col = AL('VERTICAL', { name: 'Callout text', gap: 4 }); add(c, col); grow(col); await wrapT(col, o.title, 'Body/S Strong', 'text/primary', 240, { name: 'Callout title' }); if (o.body) await wrapT(col, o.body, 'Body/S', 'text/secondary', 240, { name: 'Callout body' }); if (o.actions && o.actions.length) { const a = AL('HORIZONTAL', { name: 'Callout actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(col, a); a.layoutSizingHorizontal = 'FILL'; } return c; }
async function kv(label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 8, align: 'CENTER' }); add(r, await T(label, o.lstyle || 'Body/S', o.lcolor || 'text/secondary', { name: 'Label' })); addSpacer(r); add(r, await T(value, o.vstyle || 'Number/S', o.color || 'text/primary', { name: o.vname || 'Value' })); if (o.demo) add(r, await DEMO('XS')); return r; }
async function card(name, o = {}) { const c = ALV({ name, gap: o.gap != null ? o.gap : 16, p: o.p != null ? o.p : 20, r: 14, fill: o.fill || 'surface/default', stroke: o.stroke || 'border/subtle', w: o.w }); if (o.title) { const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); if (o.icon) add(hd, await IC(o.icon, 20, o.iconColor || 'icon/brand')); add(hd, await T(o.title, o.tstyle || 'Heading/H5', 'text/primary', { name: 'Card title' })); addSpacer(hd); if (o.demo) add(hd, await DEMO(o.demo === true ? 'S' : o.demo)); if (o.right) for (const x of o.right) add(hd, x); add(c, [hd, 'FILL']); } return c; }
async function gameHeader(o = {}) {
  const h = AL('HORIZONTAL', { name: 'Game header', gap: 16, align: 'CENTER' });
  const th = await I('25:14777'); th.rescale(o.tablet ? 0.3 : 0.35); th.name = 'Tile/Game Art — Pool Roulette (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 6 });
  const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'Table games', 'Current page': 'Pool Roulette' }); add(col, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' });
  add(tr, await T('Pool Roulette', o.tablet ? 'Heading/H4' : 'Heading/H3', 'text/primary', { name: 'Game title' }), await brandChip('shield-check', 'Provably fair'));
  const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 8, align: 'CENTER', wrap: true, cgap: 8 });
  add(mr, await chip('roulette', 'European · single zero'), await chip('percent', 'House edge 2.70%'), await chip('target', 'Straight pays 35:1'), await chip('coins', o.tablet ? 'Bet 0.10 – 1,000.00 per spot' : 'Bet 0.10 – 1,000.00 USDT per spot'));
  if (!o.tablet) add(mr, await chip('layers', 'Table max 5,000.00 USDT per spin'));
  add(col, tr, mr); add(h, col); grow(col); mr.layoutSizingHorizontal = 'FILL';
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' });
  add(act, await iconBtn(o.muted ? 'volume-x' : 'volume', { label: o.muted ? 'Sound off' : 'Sound on' }), await iconBtn('star', { label: 'Favourite' }));
  if (o.tablet) add(act, await iconBtn('history'), await iconBtn('shield-check'), await iconBtn('book'));
  else add(act, await BTN('Secondary', 'My bets', { lead: 'history' }), await BTN('Secondary', 'Fairness', { lead: 'shield-check' }), await BTN('Ghost', 'Rules & payouts', { lead: 'book' }));
  add(h, act); return h;
}
async function compliance(o = {}) { const c = AL('HORIZONTAL', { name: 'Compliance footer', gap: 16, p: [12, 16, 12, 16], r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: !!o.wrap, cgap: 8 }); add(c, await I('6:158', { Variant: o.compact ? 'Compact' : 'Inline' })); addSpacer(c); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' }), await BTN('Ghost', 'Set limits', { size: 'S', lead: 'sliders' })); return c; }
async function shellD(name, w, x, y, o = {}) {
  const f = await screen(name, w, { x, y }); add(f, [await DEMOBAR(), 'FILL']);
  if (o.region) { const rb = await I('16:3449', { Breakpoint: w < 1000 ? 'Tablet' : 'Desktop' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const { sb, found } = await sidebar('Pool Roulette', o.collapsed !== false); add(body, sb); sb.layoutSizingVertical = 'FILL';
  const main = AL('VERTICAL', { name: 'Main column' }); add(body, [main, 'FILL']);
  const tb = await I('23:9832', { State: o.topbar || 'Member' }); tb.name = 'Shell/Topbar Desktop'; add(main, [tb, 'FILL']);
  let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance }, true)) > 0; }
  const C = AL('VERTICAL', { name: 'Content', gap: 24, p: o.pad || [24, 32, 48, 32] }); add(main, [C, 'FILL']);
  return { f, body, sb, main, tb, C, found, balOk };
}
function colY(sec, x) { let m = 0; for (const c of sec.children) if (Math.abs(c.x - x) < 2) m = Math.max(m, c.y + c.height); return m ? m + 160 : 120; }
function dropByName(sec, name) { for (const c of sec.children.filter(n => n.name === name)) c.remove(); }
async function prompt(o) { const c = ALV({ name: 'Prompt — ' + o.title, gap: 16, p: 24, r: 20, fill: 'surface/overlay', stroke: 'border/subtle', w: o.w || 440 }); await fx(c, 'Elevation/4 — Modal'); const tile = AL('HORIZONTAL', { name: 'Icon tile', w: 48, h: 48, r: 14, align: 'CENTER', justify: 'CENTER', fill: 'status/' + (o.tone || 'info') + '-tint' }); add(tile, await IC(o.icon || 'info', 24, 'status/' + (o.tone || 'info'))); add(c, tile); const iw = (o.w || 440) - 48; await wrapT(c, o.title, 'Heading/H4', 'text/primary', iw, { name: 'Prompt title' }); await wrapT(c, o.body, 'Body/S', 'text/secondary', iw, { name: 'Prompt body' }); if (o.facts) { const fl = AL('VERTICAL', { name: 'Facts', gap: 8, p: 12, r: 10, fill: 'bg/secondary' }); for (const [l, v, d] of o.facts) add(fl, [await kv(l, v, { vstyle: 'Body/S Strong', demo: d }), 'FILL']); add(c, [fl, 'FILL']); } if (o.note) await wrapT(c, o.note, 'Caption', 'text/tertiary', iw, { name: 'Prompt note' }); if (o.actions) { const a = AL('HORIZONTAL', { name: 'Prompt actions', gap: 8, wrap: true, cgap: 8 }); for (const x of o.actions) add(a, x); add(c, [a, 'FILL']); } return c; }
function blockStage(stg, card, y = 96) { for (const k of stg.children) k.opacity = 0.25; stg.appendChild(card); card.layoutPositioning = 'ABSOLUTE'; card.x = Math.round((stg.width - card.width) / 2); card.y = y; return card; }
// ===== END ROULETTE KIT — base =====
// compact RG strip (tablet + mobile) — mirrors RG/Session Bar values
async function rgStrip(o = {}) {
  const tone = o.danger ? 'danger' : o.warn ? 'warning' : null;
  const r = AL('VERTICAL', { name: 'RG session strip', gap: 8, p: 12, r: 14, fill: tone ? 'status/' + tone + '-tint' : 'surface/default', stroke: tone ? 'status/' + tone : 'border/subtle' });
  const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(r1, await IC('timer', 16, 'icon/muted'), await T(o.timer || '00:42:18', 'Mono/S', 'text/primary', { name: 'Timer' }), await T('Net', 'Caption', 'text/tertiary'), await T(o.net || '−24.60 USDT', 'Body/S Strong', 'text/primary', { name: 'Net value' }), await DEMO('XS')); addSpacer(r1); add(r1, await I('6:159')); add(r1, await iconBtn('pause-circle', { type: 'Ghost', size: o.big ? 'L' : 'M', label: 'Take a break' })); add(r, [r1, 'FILL']);
  const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(r2, await T('Daily loss limit', 'Caption', 'text/tertiary'), await T(o.lim || '24.60 / 200.00 USDT', 'Caption', tone ? 'text/' + tone : 'text/secondary', { name: 'Limit value' })); addSpacer(r2);
  const tr = AL('HORIZONTAL', { name: 'Meter', w: 96, h: 4, r: 9999, fill: 'border/default', clip: true }); add(tr, rect(Math.max(4, Math.round(96 * (o.pct || 0.12))), 4, tone ? 'status/' + tone : 'status/info', 0, 'Meter fill')); add(r2, tr); add(r, [r2, 'FILL']);
  if (o.msg) await wrapT(r, o.msg, 'Caption', tone ? 'text/' + tone : 'text/secondary', 300, { name: 'Strip message' });
  return r;
}
