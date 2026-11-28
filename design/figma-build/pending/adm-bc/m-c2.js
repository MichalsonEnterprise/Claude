const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM — Mobile', 217000, 0);
const NAME = '[ADM-C2] AML Alerts / 390 / Default';
const { f, c } = await MSHELL(NAME);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('AML alerts', 'Heading/H3', 'text/primary'), await ST('Live', 'Live')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Rules raise alerts; a person decides. Closing needs a reason · holds need 2FA + a second approver · never tell the user (no tipping-off).', 'Caption', 'text/tertiary', 358);
const strip = AL('HORIZONTAL', { name: 'Stats (scrolls)', gap: 8, clip: true });
for (const [v, l, s, tone] of [['23', 'open alerts', 'high 4 · medium 11 · low 8', null], ['1', 'past SLA', 'AML-5521 · 1 h 20 min over', 'danger'], ['6', 'assigned to you', 'oldest 5 h 30 min', null]]) { const k = ALW('VERTICAL', { name: 'Stat ' + l, gap: 2, p: 12, fill: tone ? 'status/danger-tint' : 'surface/default', stroke: 'border/subtle', r: 14, w: 156 }); add(k, await T(v, 'Number/M', tone ? 'text/danger' : 'text/primary'), await T(l, 'Body/S Strong', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(strip, k); }
add(c, [strip, 'FILL']);
add(c, [await SEARCH('Search alert, user, WD- ID', 'M'), 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Open · 23', 1], ['Mine · 6', 0], ['High · 4', 0], ['Escalated · 2', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const A = [['AML-5509', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'WD-20952', 'High', 86, '12,400.00', ['Under review', 'Escalated'], ['Case STR-0093', null]], ['AML-5530', 'SA', '@sable', 'Mixer exposure · 2 hops', 'WD-20960', 'High', 72, '4,800.00', ['Under review', 'In review'], ['2 h 10 min left', 'warning']], ['AML-5528', 'TW', '@tidewalker', 'Rapid in-out · 96 % out in 3 h', 'WD-20957', 'High', 69, '9,600.00', ['Pending', 'New'], ['5 h 30 min left', null]], ['AML-5521', 'DS', '@drift.sol', 'Shared device · 3 accounts', '3 accounts', 'Medium', 52, '2,140.00', ['Pending', 'New'], ['Past SLA', 'danger']]];
for (const a of A) {
  const k = CARD('Alert ' + a[0], { gap: 10, p: 14, stroke: a[0] === 'AML-5530' ? 'border/brand' : 'border/subtle' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(a[0], 'Mono/S', 'text/primary'), await ST(a[8][0], a[8][1])); add(l1, [SPC(), 'FILL']); add(l1, await IC('chevron-right', 20, 'icon/muted')); add(k, [l1, 'FILL']);
  await WT(k, a[3], 'Body/M Strong', 'text/primary', 320);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'XS' }, { Initials: a[1] }), await T(a[2] + ' · ' + a[4], 'Body/S', 'text/secondary')); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'L3', gap: 8, align: 'CENTER' }); const rk = await I('23:5378', { Level: a[5], Density: 'Compact' }); await setT(rk, 'Score', '· ' + a[6]); add(l3, rk); add(l3, [SPC(), 'FILL']); add(l3, await T(a[7], 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER' }); add(l4, await IC('clock', 14, a[9][1] === 'danger' ? 'status/danger' : a[9][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(a[9][0], 'Caption', a[9][1] === 'danger' ? 'text/danger' : a[9][1] === 'warning' ? 'text/warning' : 'text/tertiary')); add(k, [l4, 'FILL']);
  add(c, [k, 'FILL']);
}
add(c, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
await MTABS(f, 'Alerts');
return await DONE(f);
