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
  add(f, [await DEMOBAR('DEMO — every figure on this page is illustrative'), 'FILL']); // default message overflows 390
  add(f, [await I('23:12908', { State: 'Guest' }), 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [16, 16, 24, 16], gap: 24 }); add(f, [main, 'FILL']);
  const t = await tplInst(set, 'Mobile'); t.name = 'Template/Game Details — ' + g.name; add(main, [t, 'FILL']); await apply(t, g, true);
  const bar = AL('HORIZONTAL', { name: 'Sticky CTA bar (fixed above tab bar)', gap: 12, p: [12, 16, 12, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { t: 1 });
  const info = col('Bar info', { gap: 2 }); const ir = row('Bar info top', { gap: 6 }); add(ir, await T(g.barK, 'Caption', 'text/tertiary'), await DEMO('XS')); add(info, ir, await T(g.barV, 'Label/M', 'text/primary'));
  const b = g.gold ? await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }) : await BTN('Primary', 'Play now', { size: 'L', lead: 'play' });
  add(bar, [info, 'FILL'], b); add(f, [bar, 'FILL']); ir.layoutSizingHorizontal = 'FILL'; for (const x of [ir.children[0], info.children[1]]) { x.layoutSizingHorizontal = 'FILL'; x.textAutoResize = 'HEIGHT'; } // (28 Nov) info fills + wraps, button hugs — FILL button was clipped at 390
  add(f, [await I('22:5413', { Active: g.tab }), 'FILL']);
  return { f, t };
}
// ===== END PUB-04 FRAMES =====
