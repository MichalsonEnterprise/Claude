// [USR-G6] Game History / 390 / Filters — bottom sheet over Game history (matches desktop Filters: Orbit Rush · Wins · last 7 days → 38 of 486 bets)
const S = await shellG('[USR-G6] Game History / 390 / Filters', 'Game history', 'Game history', 'Every bet you placed in Originals, table and live games, with the seeds to verify each result.', { h: 844 });
const C = S.C; C.name = 'Content (behind sheet)';
const fr = AL('HORIZONTAL', { name: 'Filter row (horizontal scroll)', gap: 8, align: 'CENTER', w: 358, clip: true }); add(C, [fr, 'FILL']);
const fb = await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Pressed' }, { Icon: ICONS.filter }); fb.name = 'Filter (opens sheet)'; fr.appendChild(fb);
for (const [l, s] of [['All games', false], ['Orbit Rush', true], ['Pool Dice', false], ['Double Side', false]]) { const c = await I('17:2766', { State: s ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false }); c.name = 'Chip — ' + l; fr.appendChild(c); }
const mg = AL('HORIZONTAL', { name: 'Metrics grid', gap: 12, wrap: true, cgap: 12, w: 358 }); add(C, [mg, 'FILL']);
for (const [lab, val, sub, col] of [['Bets today', '10', 'Session started 16:00 UTC · 8 games', 'text/primary'], ['Net today', '−24.60', 'Daily loss limit 200.00 · 175.40 left', 'text/danger']]) {
  const m = card('Metric — ' + lab, { gap: 4, p: 12 }); m.resize(173, m.height); m.counterAxisSizingMode = 'FIXED'; m.primaryAxisSizingMode = 'AUTO'; mg.appendChild(m);
  const hr = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(m, [hr, 'FILL']); add(hr, [await overline(lab), 'FILL']); hr.appendChild(await DEMO('XS'));
  m.appendChild(await T(val, 'Number/M', col)); add(m, [await T(sub, 'Caption', 'text/tertiary', { w: 149 }), 'FILL']);
}
await tabAbs(S.f, 'Games');
const sheet = await sheetG(S.f, 'Filter bets', '3 filters set · 38 of 486 bets match', async (sh) => {
  const s1 = AL('VERTICAL', { name: 'Games', gap: 8 }); add(sh, [s1, 'FILL']); s1.appendChild(await overline('Games'));
  add(s1, [await chipRow([['All games', false], ['Orbit Rush', true], ['Orbit Rush Duel', false], ['Pool Dice', false], ['Double Side', false], ['Twenty-One', false]], { wrap: true, name: 'Game chips (multi-select)' }), 'FILL']);
  { const gc = s1.findOne(n => n.name === 'Game chips (multi-select)'); const c = await I('17:2766', { State: 'Default' }, { Label: '+ 27 more games', 'Show icon': true, Icon: ICONS['chevron-down'] }); c.name = 'Chip — + 27 more games'; gc.appendChild(c); }
  const s2 = AL('VERTICAL', { name: 'Result', gap: 8 }); add(sh, [s2, 'FILL']); s2.appendChild(await overline('Result'));
  let seg = null;
  try {
    seg = await I('20:6978', { Segments: '3' }); const segs = seg.findAll(n => n.type === 'INSTANCE' && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '20:6953');
    const L = ['All', 'Wins', 'Losses'];
    for (let i = 0; i < segs.length && i < 3; i++) { segs[i].setProperties({ State: i === 1 ? 'Active' : 'Default' }); const cp = segs[i].componentProperties; const k = Object.keys(cp).find(x => x.split('#')[0] === 'Label'); if (k) segs[i].setProperties({ [k]: L[i] }); }
    seg.name = 'Result (segmented: All · Wins · Losses)'; add(s2, [seg, 'FILL']);
  } catch (e) { if (seg) seg.remove(); add(s2, [await chipRow([['All', false], ['Wins', true], ['Losses', false]], { name: 'Result (single-select)' }), 'FILL']); }
  const s3 = AL('VERTICAL', { name: 'Stake & date', gap: 8 }); add(sh, [s3, 'FILL']); s3.appendChild(await overline('Stake & date'));
  const rr = AL('HORIZONTAL', { name: 'Stake range', gap: 12 }); add(s3, [rr, 'FILL']);
  for (const [l, v] of [['Min stake', '0.10 USDT'], ['Max stake', 'Any']]) { const sf = await I('13:565', { State: 'Default' }, { Label: l, Value: v, 'Show helper': false, 'Show leading icon': false }); add(rr, [sf, 'FILL']); }
  add(s3, [await chipRow([['Today', false], ['7 days', true], ['30 days', false], ['Custom', false]], { name: 'Date presets' }), 'FILL']);
  const nb = await noteBox('info', '38 of 486 bets match — Orbit Rush wins, 20 – 27 Nov 2026 (UTC). Filters never change odds or limits.', 'info', 358); nb.appendChild(await DEMO('XS')); add(sh, [nb, 'FILL']);
}, [[await BTN('Ghost', 'Reset', { size: 'L' }), null], [await BTN('Primary', 'Show 38 results', { size: 'L' }), 'FILL']]);
const ex = sec.children.find(c => c.name === '[USR-G6] Game History / 390 / Export');
await placeG(S.f, 2670, ex ? ex.y + ex.height + 160 : 2982);
await S.f.screenshot({ scale: 0.8 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), sheetH: Math.round(sheet.height), sheetY: Math.round(sheet.y), section: sec.id };
