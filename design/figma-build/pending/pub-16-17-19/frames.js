// ===== PUB-16/17/19 FRAMES =====
const IDX = { terms: 0, privacy: 1, aml: 2 };
async function getTpl() { const n = await figma.getNodeByIdAsync('__TPL__'); if (n && n.type === 'COMPONENT_SET') return n; throw new Error('Template/Legal Document set __TPL__ not found — run t1 first'); }
function variant(set, bp) { return set.children.find(c => c.name === 'Breakpoint=' + bp) || set.defaultVariant; }
function navOff(sb) { let n = 0; for (const it of sb.findAll(x => x.type === 'INSTANCE')) { let cp; try { cp = it.componentProperties; } catch (e) { continue; } if (cp && cp.State && cp.Collapsed && cp.State.value === 'Active') { try { it.setProperties({ State: 'Default' }); n++; } catch (e) { MISS.push('navoff'); } } } return n; }
async function apply(inst, D, M) {
  const m = { 'Doc overline': D.over, 'Doc title': D.title, 'Doc lead': D.lead, 'Version': D.version, 'Effective': D.effective, 'Updated': D.updated, 'Read time': readTime(D), 'PDF meta': D.pdf, 'TOC count': D.s.length + ' sections · ' + readTime(D), 'Summary title': D.sumT, 'Summary note': D.sumN };
  if (!M) { m['Current page'] = D.title; D.det.forEach((v, k) => { m['Det v' + (k + 1)] = v; }); }
  D.sum.forEach((v, k) => { m['Summary ' + (k + 1)] = v; });
  for (let i = 1; i <= NSEC; i++) { const s = D.s[i - 1]; if (!s) continue; m['TOC ' + i] = s.h; m['S' + i + ' heading'] = s.h; m['S' + i + ' p1'] = s.p[0]; if (s.p[1]) m['S' + i + ' p2'] = s.p[1]; if (s.note) m['S' + i + ' note'] = s.note; }
  D.hist.forEach((h, k) => { m['Hist ' + (k + 1) + ' ver'] = 'v' + h[0]; m['Hist ' + (k + 1) + ' date'] = h[1]; m['Hist ' + (k + 1) + ' change'] = h[2]; });
  await O(inst, m, D.key + (M ? 'M' : 'D'));
  for (let i = 1; i <= NSEC; i++) { const s = D.s[i - 1]; vis(inst, 'Section ' + i, !!s, D.key); vis(inst, 'TOC row ' + i, !!s, D.key); if (s) { vis(inst, 'S' + i + ' p2', !!s.p[1], D.key); vis(inst, 'S' + i + ' note box', !!s.note, D.key); vis(inst, 'S' + i + ' note DEMO', !!s.demo, D.key); } }
  for (let i = 1; i <= 6; i++) { const on = i === D.cur; for (const r of inst.findAll(n => n.name === 'Doc row ' + i)) r.fills = on ? [paint('surface/selected')] : []; for (const t of inst.findAll(n => n.name === 'Doc link ' + i && n.type === 'TEXT')) t.fills = [paint(on ? 'text/brand' : 'text/secondary')]; for (const ic of inst.findAll(n => n.name === 'Doc icon ' + i)) tint(ic, on ? 'icon/brand' : 'icon/muted'); }
}
async function deskFrame(set, D, X, Y) {
  const name = `[${D.id}] ${D.title} / 1440 / Default — long-form (logged out)`;
  for (const o of sec.children.filter(c => c.name === name)) o.remove();
  const f = await screen(name, 1440, {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR(), 'FILL']);
  const body = AL('HORIZONTAL', { name: 'Body' }); add(f, [body, 'FILL']);
  const rail = AL('VERTICAL', { name: 'Sidebar rail', fill: 'bg/secondary' }); add(body, rail);
  const sb = await I('23:6697', { State: 'Expanded', Auth: 'Guest' }); sb.name = 'Shell/Sidebar'; add(rail, sb); rail.layoutSizingVertical = 'FILL'; const off = navOff(sb);
  const mc = AL('VERTICAL', { name: 'Main column' }); add(body, [mc, 'FILL']);
  const tb = await I('23:9832', { State: 'Guest' }); tb.name = 'Shell/Topbar Desktop'; add(mc, [tb, 'FILL']);
  const main = AL('VERTICAL', { name: 'Content', p: [24, 32, 64, 32], gap: 24 }); add(mc, [main, 'FILL']);
  const t = variant(set, 'Desktop').createInstance(); t.name = 'Template/Legal Document — ' + D.title; add(main, [t, 'FILL']); await apply(t, D, false);
  const ft = await I('23:17478', { Breakpoint: 'Desktop' }); ft.name = 'Shell/Footer Mega'; add(mc, [ft, 'FILL']); try { bnum(ft, 'paddingLeft', 24); bnum(ft, 'paddingRight', 24); } catch (e) { MISS.push('footpad'); }
  return { f, t, off };
}
async function mobFrame(set, D, X, Y, o = {}) {
  const name = `[${D.id}] ${D.title} / 390 / ` + (o.expanded ? 'Contents expanded (viewport 390×844, scrolled to contents)' : 'Default — long-form, contents collapsed');
  for (const x of sec.children.filter(c => c.name === name)) x.remove();
  const f = await screen(name, 390, o.expanded ? { h: 844 } : {}); sec.appendChild(f); f.x = X; f.y = Y;
  add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const tb = await I('23:12908', { State: 'Guest' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  const main = AL('VERTICAL', { name: o.expanded ? 'Content (scrolls)' : 'Content', p: [16, 16, 32, 16], gap: 24, clip: !!o.expanded }); add(f, [main, 'FILL']); if (o.expanded) main.layoutSizingVertical = 'FILL';
  const t = variant(set, 'Mobile').createInstance(); t.name = 'Template/Legal Document — ' + D.title; add(main, [t, 'FILL']); await apply(t, D, true);
  if (o.expanded) { vis(t, 'TOC list', true); vis(t, 'Chevron down', false); vis(t, 'Chevron up', true); const acc = t.findOne(n => n.name === 'Contents — collapsible'); if (acc) { const ay = acc.y; t.layoutPositioning = 'ABSOLUTE'; t.resize(358, t.height); t.x = 16; t.y = 12 - ay; } else MISS.push('contents accordion'); } // viewport scrolled so the open contents list is fully in view
  else {
    const ft = await I('23:17478', { Breakpoint: 'Mobile' }); ft.name = 'Shell/Footer Mega'; add(f, [ft, 'FILL']);
    const bar = AL('HORIZONTAL', { name: 'Reading bar (sticky above tab bar after the header scrolls away)', gap: 12, p: [8, 16, 8, 16], fill: 'bg/secondary', align: 'CENTER' }); strokeSides(bar, 'border/subtle', { t: 1 });
    const info = col('Reading position', { gap: 2 }); add(bar, [info, 'FILL']); await wt(info, 'Reading caption', 'Section 1 of ' + D.s.length, 'Caption', 'text/tertiary'); await wt(info, 'Reading section', D.s[0].h, 'Label/M', 'text/primary');
    add(bar, await BTN('Secondary', 'Contents', { size: 'L', lead: 'list' })); add(f, [bar, 'FILL']);
  }
  const tab = await I('22:5413', { Active: 'Home' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']);
  return { f, t };
}
// ===== END FRAMES =====
