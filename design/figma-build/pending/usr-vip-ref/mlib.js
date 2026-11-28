// ===== usr-vip-ref MOBILE SHELL =====
async function MOB(NAME, X, Y, m) {
  for (const c of [...sec.children]) if (c.name === NAME) c.remove();
  if (Y === 'BELOW') { let my = 0; for (const c of sec.children) if (Math.abs(c.x - X) < 2) my = Math.max(my, c.y + c.height); Y = my + 160; }
  const f = await screen(NAME, 390, {}); sec.appendChild(f); f.x = X; f.y = Y;
  const bar = await DEMOBAR('DEMO DATA — illustrative values only'); add(f, [bar, 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const content = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [content, 'FILL']);
  const hr = ROW({ name: 'Page header', gap: 8 }); add(content, [hr, 'FILL']);
  add(hr, await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS['chevron-left'] }));
  const hl = COL({ gap: 2 }); add(hl, await T(m.title, 'Heading/H4', 'text/primary')); add(hl, await T(m.sub, 'Caption', 'text/tertiary', { w: 250 })); add(hr, [hl, 'FILL']); add(hr, await DEMO('S'));
  const pills = AL('HORIZONTAL', { name: 'Sub-nav (scrolls horizontally)', gap: 8, clip: true }); add(content, [pills, 'FILL']);
  for (const x of m.tabs) add(pills, await I('20:6895', { State: x.on ? 'Active' : 'Default' }, { Label: x.l, 'Show icon': false }));
  { const act = pills.children.find((c, i) => m.tabs[i] && m.tabs[i].on); const idx = content.children.indexOf(pills); const wrap = figma.createFrame(); wrap.name = 'Sub-nav (scrolled to active tab)'; wrap.fills = []; wrap.clipsContent = true; wrap.resize(358, pills.height); content.insertChild(idx, wrap); wrap.layoutSizingHorizontal = 'FILL'; wrap.appendChild(pills); pills.clipsContent = false; pills.primaryAxisSizingMode = 'AUTO'; pills.y = 0; pills.x = act ? Math.min(0, 358 - (act.x + act.width)) : 0; }
  return { f, content };
}
const MVT = (on) => ['Level', 'Points', 'Rewards', 'Benefits'].map(l => ({ l, on: l === on }));
const MRT = (on) => ['Overview', 'Stats', 'Invited', 'Earnings', 'Payouts'].map(l => ({ l, on: l === on }));
async function MCARD(name, o = {}) { return CARD({ name, gap: o.gap ?? 12, p: o.p ?? 16, fill: o.fill, stroke: o.stroke, r: o.r ?? 14 }); }
async function MFOOT(content, text) { const r = ROW({ name: 'Compliance note', gap: 8, align: 'MIN' }); add(r, await I('6:159')); add(r, [await T(text, 'Caption', 'text/tertiary', { w: 300 }), 'FILL']); add(content, [r, 'FILL']); }
async function MEND(f) { const tab = await I('22:5413', { Active: 'Account' }); add(f, [tab, 'FILL']); }
// ===== END MOBILE SHELL =====
