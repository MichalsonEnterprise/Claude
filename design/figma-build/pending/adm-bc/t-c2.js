const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-C2] AML Alerts / 768 / Default';
const { f, c } = await TSHELL(NAME, 'C2', 'AML alerts');
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('AML alerts', 'Heading/H3', 'text/primary'), await ST('Live', 'Live'), await DEMO('M')); add(tr, [SPC(), 'FILL']); add(tr, await BTN('Primary', 'Take next alert', { size: 'S', lead: 'play' })); add(c, [tr, 'FILL']);
await WT(c, 'Rules raise alerts; a person decides. Closing needs a written reason, escalation opens a suspicious-transaction case, and holds go through Account restrictions (reason + 2FA + four-eyes).', 'Body/S', 'text/secondary', 704);
await ROW(c, [await KPI('Flat', 'Open alerts', '23', 'alerts', '+3 today', 'High 4 · medium 11 · low 8 · 1 past SLA', 'vs yesterday'), await KPI('Up', 'Alerts closed (7 days)', '142', 'alerts', '+9.2%', 'Median time to close 9 h 40 min', 'vs previous 7 d')], { spark: 1 });
const tb = AL('HORIZONTAL', { name: 'Controls', gap: 8, align: 'CENTER' }); add(tb, [await SEARCH('Search alert, user, WD-/DP- ID or hash', 'M'), 'FILL']); add(tb, await I('23:5397', { State: 'Default' }, { Label: 'Filters' })); add(c, [tb, 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Quick filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['Open · 23', 1], ['Assigned to me · 6', 0], ['High · 4', 0], ['Past SLA · 1', 0], ['Escalated · 2', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const grid = AL('HORIZONTAL', { name: 'Alert cards (2 columns)', gap: 16, wrap: 1, cgap: 16 }); add(c, [grid, 'FILL']);
const A = [['AML-5509', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'WD-20952', 'High', 86, '12,400.00', ['Under review', 'Escalated · STR-0093'], ['Case open', null]], ['AML-5530', 'SA', '@sable', 'Mixer exposure · 2 hops', 'WD-20960', 'High', 72, '4,800.00', ['Under review', 'In review'], ['2 h 10 min left', 'warning']], ['AML-5528', 'TW', '@tidewalker', 'Rapid in-out · 96 % out in 3 h', 'WD-20957', 'High', 69, '9,600.00', ['Pending', 'New'], ['5 h 30 min left', null]], ['AML-5519', 'Q9', '@quasar_9', 'Structuring · 6 deposits < 1,000', 'DP-77301…77366', 'Medium', 58, '5,820.00', ['Under review', 'In review'], ['11 h 05 min left', null]], ['AML-5521', 'DS', '@drift.sol', 'Shared device · 3 accounts', '3 accounts', 'Medium', 52, '2,140.00', ['Pending', 'New'], ['Past SLA', 'danger']], ['AML-3317', 'NK', '@nova.k', 'New address · 3× median payout', 'WD-20931', 'Medium', 41, '1,500.00', ['Under review', 'In review'], ['19 h 15 min left', null]]];
for (const a of A) {
  const k = CARD('Alert ' + a[0], { gap: 10, p: 16, w: 344, stroke: a[0] === 'AML-5530' ? 'border/brand' : 'border/subtle', fill: a[0] === 'AML-5530' ? 'surface/selected' : 'surface/default' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(a[0], 'Mono/S', 'text/primary')); add(l1, [SPC(), 'FILL']); add(l1, await ST(a[8][0], a[8][1])); add(k, [l1, 'FILL']);
  await WT(k, a[3], 'Body/M Strong', 'text/primary', 300);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'XS' }, { Initials: a[1] }), await T(a[2] + ' · ' + a[4], 'Body/S', 'text/secondary')); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'L3', gap: 8, align: 'CENTER' }); const rk = await I('23:5378', { Level: a[5], Density: 'Compact' }); await setT(rk, 'Score', '· ' + a[6]); add(l3, rk); add(l3, [SPC(), 'FILL']); add(l3, await T(a[7], 'Number/S', 'text/primary'), await T('USDT', 'Caption', 'text/tertiary')); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER' }); add(l4, await IC('clock', 14, a[9][1] === 'danger' ? 'status/danger' : a[9][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(a[9][0], 'Caption', a[9][1] === 'danger' ? 'text/danger' : a[9][1] === 'warning' ? 'text/warning' : 'text/tertiary')); add(k, [l4, 'FILL']);
  add(grid, k);
}
add(c, [await PAGER('Cursor'), 'FILL']);
const pv = CARD('Selected alert — AML-5530', { stroke: 'border/brand', gap: 16 }); add(c, [pv, 'FILL']);
await CHEAD(pv, 'AML-5530 · @sable', { icon: 'shield-alert', ic: 'status/danger', badges: [await ST('Under review', 'In review')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 16 }); add(pv, [cols, 'FILL']);
const rm = await RISKM('High', '@sable', 'Destination 2 hops from a mixer-linked cluster · Arbitrum in, BNB Chain out · 2.4 % played', 'Policy AML-3.2: hold and escalate if confirmed'); add(cols, rm);
const act = AL('VERTICAL', { name: 'Actions', gap: 8 }); add(cols, [act, 'FILL']);
for (const [ty, l, ic] of [['Primary', 'Escalate to STR case', 'shield-alert'], ['Secondary', 'Request info from user', 'mail'], ['Secondary', 'Request withdrawal hold', 'lock'], ['Ghost', 'Close — no issue', 'check']]) add(act, [await BTN(ty, l, { size: 'M', lead: ic }), 'FILL']);
await WT(act, 'Reason required for every action · hold also needs 2FA + second approver · WD-20960 stays “Under review” for the user.', 'Caption', 'text/tertiary', 300);
return await DONE(f);
