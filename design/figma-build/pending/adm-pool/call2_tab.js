await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === '09 — Admin Panel'));
const AF = (async () => {}).constructor; const { VAR, __COLS, paint, fill, stroke, strokeSides, bnum, gap, pad, radius, AL, add, T, fx, rect, I, tint, screen, fitSection, nextX, ICONS, CHAINS, IC, CHAIN, DEMO, DEMOBAR, BTN, BADGE, section, sec, LY, COLX, lf, setT, sp, row, col, panel, W, ph, SB, stat, kv, check, step, pipeline, meter, segbar, chip, bars, cell, table, tfoot, shell, pageHead, subnav, immut, kpi, kpiRow, split, overlay, laptop } = await new AF('figma', (await figma.getNodeByIdAsync('78:57471')).characters)(figma);
{ const d = await figma.getNodeByIdAsync('171:72535'); if (d) for (const t of d.findAll(n => n.type === 'TEXT' && n.characters.includes('00:14:32'))) { await lf(t); t.characters = t.characters.replace('00:14:32', '00:12:26'); } }
async function tabletBar() { const b = row({ name: 'Admin Topbar — Tablet (inline)', gap: 8, p: [10, 24], h: 64 }); fill(b, 'bg/secondary'); strokeSides(b, 'border/subtle', { b: 1 }); add(b, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.menu }), await I('4:792'), await T('Admin', 'Label/L', 'text/primary'), await chip(null, 'PROD', 'text/danger', 'status/danger-tint')); add(b, [sp(), 'FILL']); for (const ic of ['search', 'user-check', 'bell']) add(b, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS[ic] })); add(b, await I('9:238', { Size: 'S' }, { Initials: 'SI', 'Show status': false })); return b; }
async function tablet(srcId, y, extra) {
  const src = await figma.getNodeByIdAsync(srcId);
  const name = src.name.replace('/ 1440 /', '/ 768 /').replace(/ \/ ([^/]+)$/, ' / $1');
  { const old = sec.children.find(n => n.name === name); if (old) old.remove(); }
  const t = src.clone(); sec.appendChild(t); t.name = name; t.x = src.x; t.y = y;
  t.resize(768, t.height); t.counterAxisSizingMode = 'FIXED'; t.primaryAxisSizingMode = 'AUTO';
  const bcol = __COLS['Breakpoint']; t.setExplicitVariableModeForCollection(bcol, bcol.modes.find(m => m.name === 'Tablet 768').modeId);
  const body = t.findOne(n => n.name === 'Body'); body.findOne(n => n.name === 'Nav/Admin Sidebar').remove();
  const main = body.findOne(n => n.name === 'Main'); main.minHeight = 0;
  const tb = main.findOne(n => n.name === 'Nav/Admin Topbar'); const bar = await tabletBar(); main.insertChild(0, bar); bar.layoutSizingHorizontal = 'FILL'; tb.remove();
  const c = main.findOne(n => n.name === 'Content'); pad(c, 24, 32, 48, 32);
  // page header -> stacked, actions in a row below the title
  const ph_ = c.findOne(n => n.name === 'Page header');
  if (ph_) { const acts = ph_.children.slice(1); ph_.layoutMode = 'VERTICAL'; ph_.counterAxisAlignItems = 'MIN'; gap(ph_, 12); ph_.children[0].layoutSizingHorizontal = 'FILL'; if (acts.length) { const ar = row({ name: 'Header actions', gap: 8 }); ph_.appendChild(ar); for (const a of acts) ar.appendChild(a); } }
  // sub-nav -> horizontal scroller with chevron
  const nav = c.findOne(n => n.name === 'Pool sub-nav');
  if (nav) { const idx = c.children.indexOf(nav); const wrap = row({ name: 'Pool sub-nav — scroll (tablet)', gap: 0, align: 'MAX' }); strokeSides(wrap, 'border/subtle', { b: 1 }); c.insertChild(idx, wrap); wrap.layoutSizingHorizontal = 'FILL'; const vp = AL('HORIZONTAL', { name: 'Viewport', clip: true }); add(wrap, [vp, 'FILL']); vp.appendChild(nav); nav.strokes = []; const tabs = nav.children; const ai = tabs.findIndex(x => x.componentProperties && x.componentProperties.State && x.componentProperties.State.value === 'Active'); for (let i = 0; i < Math.max(0, ai - 2); i++) tabs[i].visible = false; const more = await I('7:774', { Type: 'Ghost', Size: 'S', State: 'Default' }, { Icon: ICONS['chevron-right'] }); add(wrap, more); }
  for (const k of c.findAll(n => n.name === 'KPI row')) { k.layoutWrap = 'WRAP'; bnum(k, 'counterAxisSpacing', 16); for (const ch of k.children) { ch.layoutSizingHorizontal = 'FIXED'; ch.resize(344, ch.height); } }
  for (const s of c.findAll(n => n.name === 'Split' || n.name === 'Policy columns' || n.name === 'Notes')) { s.layoutMode = 'VERTICAL'; s.counterAxisSizingMode = 'FIXED'; for (const ch of s.children) { ch.layoutSizingHorizontal = 'FILL'; ch.layoutSizingVertical = 'HUG'; } }
  for (const p of c.findAll(n => n.name === 'Pipeline')) { p.layoutWrap = 'WRAP'; bnum(p, 'counterAxisSpacing', 8); p.counterAxisAlignItems = 'MIN'; for (const ch of p.children) { ch.layoutSizingVertical = 'HUG'; ch.layoutSizingHorizontal = 'FIXED'; ch.resize(p.children.length > 4 ? 206 : 314, ch.height); } }
  for (const n of t.findAll(n => n.name.includes('[t-]') || n.name.includes('[l-]'))) n.visible = false;
  for (const s of c.findAll(n => n.name === 'Summary strip')) { s.layoutWrap = 'WRAP'; for (const ch of s.children) { if (ch.name.startsWith('Stat')) { ch.layoutSizingHorizontal = 'FIXED'; ch.resize(213, ch.height); } } }
  for (const rr of c.findAll(n => n.name === 'Round row')) { const rh = rr.findOne(n => n.name === 'Round header'); if (rh) rh.visible = false; }
  if (extra) await extra(t, c);
  return t;
}
const TY = Math.max(...sec.children.filter(n => n.name.includes('/ 1280 /')).map(n => n.y + n.height)) + 400;
async function roundCard(t, c) { for (const rr of c.findAll(n => n.name === 'Round row')) { const rc = await I('23:9602', { Status: 'Open' }); rc.name = 'Card/Round (tablet)'; rr.insertChild(0, rc); } }
async function wraps(t, c) { for (const n of c.findAll(n => n.name === 'Legend' || n.name === 'Equation' || n.name === 'Holdings row')) { n.layoutWrap = 'WRAP'; bnum(n, 'counterAxisSpacing', 8); } }
const OUT = [];
for (const [id, extra] of [['67:52462', roundCard], ['69:55111', wraps], ['69:56617', roundCard], ['80:62189', null], ['80:63898', null]]) { const t = await tablet(id, TY, extra); fitSection(sec); OUT.push({ id: t.id, name: t.name, h: Math.round(t.height) }); }
for (const o of OUT) { const n = await figma.getNodeByIdAsync(o.id); await n.screenshot({ scale: 0.3 }); }
return OUT;
