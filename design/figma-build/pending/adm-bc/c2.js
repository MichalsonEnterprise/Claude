const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
// targeted fixes on C1 review (textarea copy, risk meter user/factors) + C1 queue check
const R1 = await figma.getNodeByIdAsync('75:56265'); if (R1) for (const t of R1.findAll(n => n.type === 'TEXT')) { const ch = t.characters; if (ch.startsWith('Tell us what happened')) await setText(t, 'Required for Reject or Request more information. Visible to Compliance only — never shown to the user.'); else if (ch.startsWith('Never share passwords')) await setText(t, 'Kept in the case file for 5 years'); else if (ch.includes('@nova.k')) await setText(t, ch.replace('@nova.k', '@atlas_q')); else if (ch.startsWith('Verified KYC L2')) await setText(t, 'Account age 85 days · deposits from 1 verified wallet · no sanctions or PEP hits'); }
const Q1 = await figma.getNodeByIdAsync('68:53474'); if (Q1) await Q1.screenshot({ scale: 0.4 });
const NAME = '[ADM-C2] AML Alerts / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C2'), 'C', 1, 'KO', 'Search alert ID, user, tx hash…');
await HEAD(c, ['Admin', 'Compliance', 'AML alerts'], 'AML alerts', 'Transaction-monitoring rules raise alerts for a person to review. Closing an alert needs a written reason; escalating opens a suspicious-transaction case. Holding funds uses Account restrictions (reason + 2FA + four-eyes). Rules never move or change balances.', { badges: [await ST('Live', 'Live'), await DEMO('M')], actions: [await BTN('Secondary', 'Rules library · 34 active', { size: 'S', lead: 'sliders' }), await BTN('Primary', 'Take next alert', { size: 'S', lead: 'play' })] });
await ROW(c, [await KPI('Flat', 'Open alerts', '23', 'alerts', '+3 today', 'High 4 · medium 11 · low 8 · 1 past SLA'), await KPI('Up', 'Alerts closed (7 days)', '142', 'alerts', '+9.2%', 'Median time to close 9 h 40 min · SLA 24 h'), await KPI('Flat', 'Closed as no issue (30 days)', '64%', '', '0.0 pp', 'False-positive rate · rules are tuned monthly by the MLRO')], { spark: 1 });
await TABS(c, [['Open', '23'], ['Assigned to me', '6'], ['Escalated', '2'], ['Closed · 7 days', '142']], 'Open');
await TOOLBAR(c, 'Search alert ID, user, WD-/DP- ID or tx hash', [['Risk: high · 4', false], ['Past SLA · 1', false], ['Rule: any', false]], { date: 'Raised: last 7 days', summary: '23 open alerts · sorted by risk score (high → low)', sort: 'Sort: risk ↓' });
async function age(s, tone) { return C(await IC('clock', 14, tone === 'danger' ? 'status/danger' : tone === 'warning' ? 'status/warning' : 'icon/muted'), await T(s, 'Body/S Strong', tone === 'danger' ? 'text/danger' : tone === 'warning' ? 'text/warning' : 'text/primary')); }
const A = [
  ['AML-5509', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'R-01 · WD-20952', 'High', 86, '12,400.00', ['Under review', 'Escalated · STR-0093'], ['Case open', null]],
  ['AML-5530', 'SA', '@sable', 'Mixer exposure · 2 hops', 'R-07 · WD-20960', 'High', 72, '4,800.00', ['Under review', 'In review'], ['2 h 10 min', 'warning']],
  ['AML-5528', 'TW', '@tidewalker', 'Rapid in-out · 96 % out in 3 h', 'R-02 · WD-20957', 'High', 69, '9,600.00', ['Pending', 'New'], ['5 h 30 min', null]],
  ['AML-5519', 'Q9', '@quasar_9', 'Structuring · 6 deposits < 1,000', 'R-11 · DP-77301…77366', 'Medium', 58, '5,820.00', ['Under review', 'In review'], ['11 h 05 min', null]],
  ['AML-5521', 'DS', '@drift.sol', 'Shared device · 3 accounts', 'R-19 · 3 accounts', 'Medium', 52, '2,140.00', ['Pending', 'New'], ['Past SLA', 'danger']],
  ['AML-3317', 'NK', '@nova.k', 'New address · 3× median payout', 'R-05 · WD-20931', 'Medium', 41, '1,500.00', ['Under review', 'In review'], ['19 h 15 min', null]],
  ['AML-5524', 'MS', '@mira.sol', 'Velocity · 14 withdrawals / 24 h', 'R-09 · 14 withdrawals', 'Low', 27, '2,380.00', ['Pending', 'New'], ['21 h 40 min', null]],
  ['AML-5515', 'O7', '@orbit_77', 'Large prize withdrawal', 'R-21 · WD-20899', 'Low', 24, '80,000.00', ['Approved', 'Closed — no issue'], ['Closed 17:20', null]]];
const rows = [];
for (const a of A) rows.push([{ T: 'Text', p: a[0], mono: 1 }, { T: 'User', i: a[1], p: a[2] }, { T: 'Text', p: a[3], s: a[4] }, { T: 'Risk', lv: a[5], sc: a[6] }, { T: 'Amount', p: a[7] }, { T: 'Status', st: a[8][0], p: a[8][1] }, await age(...a[9]), { T: 'Actions' }]);
await TABLE(c, 'AML alerts', [{ k: 'alert', l: 'Alert', w: 104 }, { k: 'user', l: 'User', w: 148 }, { k: 'rule', l: 'Rule · linked activity', w: 'FILL' }, { k: 'risk', l: 'Risk', w: 124, sort: 'Desc' }, { k: 'amount', l: 'Amount', w: 132, r: 1 }, { k: 'status', l: 'Status', w: 156 }, { k: 'sla', l: 'SLA left', w: 124 }, { k: 'act', l: '', w: 44 }], rows, { density: 'Comfortable', sel: [1], hideL: ['amount', 'sla'], head: await TH('Open alerts', { meta: 'Updated 18:44 UTC · WebSocket' }), foot: await PAGER('Numbered', '1–8 of 23') });
// selected alert preview
const pv = CARD('Selected alert — AML-5530', { stroke: 'border/brand', gap: 20 }); add(c, [pv, 'FILL']);
await CHEAD(pv, 'AML-5530 · @sable · counterparty exposure', { icon: 'shield-alert', ic: 'status/danger', badges: [await ST('Under review', 'In review')], right: [await BTN('Ghost', 'Open full alert', { size: 'S', trail: 'arrow-right' })] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(pv, [cols, 'FILL']);
const why = AL('VERTICAL', { name: 'Why it fired', gap: 12 }); add(cols, [why, 'FILL']);
add(why, await T('Why this alert fired · rule R-07', 'Label/L', 'text/primary'));
await WT(why, 'The destination of withdrawal WD-20960 is two transfers away from a cluster that a chain-analytics provider (DEMO) labels as mixer-linked. The deposit arrived on Arbitrum and the withdrawal goes out on BNB Chain after 2.4 % play.', 'Body/S', 'text/secondary', 420);
const flow = AL('VERTICAL', { name: 'Funds flow', gap: 6 }); add(why, [flow, 'FILL']);
for (const [ic, t1, t2, tone] of [['arrow-down-left', 'Deposit DP-77290 · 5,000.00 USDT', 'Arbitrum · 26 Nov 2026, 09:12 UTC · tx 0x7b31…d4e2', 'neutral'], ['dice', 'Play · 120.00 USDT wagered (2.4 %)', 'Pool Dice and Orbit Rush · 26 Nov, 09:20–09:41 UTC', 'neutral'], ['arrow-up-right', 'Withdrawal request WD-20960 · 4,800.00 USDT', 'to 0x5d2a…e81B on BNB Chain · requested 27 Nov, 16:44 UTC · not broadcast', 'warning'], ['link', 'Destination is 2 hops from a mixer-linked cluster', 'Exposure 31 % of inbound volume · provider report attached (DEMO)', 'danger']]) {
  const r = AL('HORIZONTAL', { name: 'Flow — ' + t1, gap: 10, p: [8, 12, 8, 12], fill: TONE[tone][0], r: 10, align: 'CENTER' }); add(r, await IC(ic, 16, TONE[tone][1])); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t1, 'Body/S Strong', 'text/primary', 300); await WT(tx, t2, 'Caption', 'text/tertiary', 300); add(r, [tx, 'FILL']); add(flow, [r, 'FILL']); }
const rm = await RISKM('High', '@sable', 'Destination 2 hops from a mixer-linked cluster · deposit on Arbitrum, payout on BNB Chain · 2.4 % played', 'Policy AML-3.2: hold the payout and escalate if exposure is confirmed'); add(cols, rm);
const act = ALW('VERTICAL', { name: 'Actions', gap: 10, w: 300 }); add(cols, act);
add(act, await T('Next step', 'Label/L', 'text/primary'));
for (const [ty, l, ic] of [['Primary', 'Escalate to STR case', 'shield-alert'], ['Secondary', 'Request info from user', 'mail'], ['Secondary', 'Request withdrawal hold', 'lock'], ['Ghost', 'Close — no issue', 'check']]) { const b = await BTN(ty, l, { size: 'M', lead: ic }); add(act, [b, 'FILL']); }
await NOTE(act, 'eye-off', 'neutral', 'A hold and closing both need a reason; the hold also needs 2FA and a second approver. WD-20960 stays “Under review” for the user — never mention the alert (no tipping-off).', { w: 220 });
return await DONE(f);
