const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
// targeted fixes: C1 queue (level column, pagination, KPI context) + C2 (column widths, pagination, KPI context)
const Q1 = await figma.getNodeByIdAsync('68:53474');
if (Q1) { for (const cell of Q1.findAll(n => n.name === 'Col/level' && n.type === 'FRAME')) { const chip = cell.findOne(n => n.type === 'INSTANCE'); const lv = chip && chip.mainComponent ? ((chip.mainComponent.name.match(/Level=(L\d)/) || [])[1] || 'L2') : 'L2'; if (chip) chip.remove(); const st = AL('VERTICAL', { name: 'Level', gap: 2 }); add(st, await T({ L1: 'Level 1', L2: 'Level 2', L3: 'Level 3' }[lv], 'Body/S Strong', 'text/primary'), await T({ L1: 'Basic · onboarding', L2: 'ID + liveness', L3: 'Enhanced (EDD)' }[lv], 'Caption', 'text/tertiary')); add(cell, st); }
  PAGEFIX(byMain(Q1, 'Pagination'), 10, 22); for (const k of Q1.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile'))) await setT(k, 'Delta context', k.name.includes('Decisions') ? 'vs yesterday' : 'vs previous 7 d'); }
const Q2 = await figma.getNodeByIdAsync('77:56703');
if (Q2) { const W2 = { user: 140, risk: 148, sla: 112 }; for (const n of Q2.findAll(n => /^(H|Col)\/(user|risk|sla)$/.test(n.name))) { const k = n.name.split('/')[1]; n.resize(W2[k], n.height); if (n.type === 'FRAME') n.counterAxisSizingMode = 'AUTO'; }
  PAGEFIX(byMain(Q2, 'Pagination'), 8, 3); for (const k of Q2.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile'))) await setT(k, 'Delta context', k.name.includes('Open alerts') ? 'vs yesterday' : k.name.includes('7 days') ? 'vs previous 7 d' : 'vs previous 30 d'); }
const NAME = '[ADM-C3] Suspicious Transactions / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('C-1440', 'C3'), 'C', 2, 'KO', 'Search case ID, user, alert or tx…');
await HEAD(c, ['Admin', 'Compliance', 'Suspicious transactions'], 'Suspicious transactions', 'Escalated cases and suspicious-transaction reports (STR). The MLRO approves every report before it is filed with the financial intelligence unit. Filing never changes balances — funds stay under the existing account restriction until a decision.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Filing calendar', { size: 'S', lead: 'calendar' }), await BTN('Primary', 'New case from alert', { size: 'S', lead: 'plus' })] });
await NOTE(c, 'eye-off', 'danger', 'Do not tell a user that a report is being considered or has been filed, and do not change their experience in a way that reveals it. Use the neutral “Under review” status only. Breaches are a criminal offence in most jurisdictions.', { title: 'Tipping-off is prohibited', w: 900 });
await ROW(c, [await KPI('Flat', 'Open cases', '3', 'cases', '0 today', 'STR-0091, STR-0093, STR-0094 · oldest 6 days', 'vs yesterday'), await KPI('Flat', 'Reports filed in November', '2', 'reports', '−1 vs October', 'Last filed 19 Nov 2026 · FIU portal (DEMO placeholder)', 'vs October'), await KPI('Flat', 'Funds held by restriction', '17,200.00', 'USDT', '2 withdrawals', 'WD-20952 12,400.00 + WD-20960 4,800.00 — held, not seized', 'under restriction')], { spark: 1 });
await TABS(c, [['Open', '3'], ['Awaiting MLRO', '1'], ['Filed', '2'], ['Closed — no filing', '1']], 'Open');
const S = [
  ['STR-0094', 'SA', '@sable', 'Mixer-linked cross-chain in-out', 'AML-5530', '4,800.00', ['Pending', 'Draft'], ['Due 4 Dec', 'warning'], 'K. Osei'],
  ['STR-0093', 'KE', '@kestrel', 'Sanctions proximity · 1 hop', 'AML-5509', '12,400.00', ['Under review', 'MLRO review'], ['Due 30 Nov', 'warning'], 'M. Achebe'],
  ['STR-0091', 'Z2', '@zephyr21', 'Third-party funding · 9 wallets', 'AML-5476 +1', '7,350.00', ['Pending', 'Info requested'], ['Due 2 Dec', null], 'P. Novak'],
  ['STR-0090', 'LV', '@lyra_v', 'Gift-card resale funding', 'AML-5402', '3,120.00', ['Confirmed', 'Filed 12 Nov'], ['—', null], 'M. Achebe'],
  ['STR-0089', 'DS', '@drift.sol', 'Structuring below 1,000.00', 'AML-5388 +2', '5,910.00', ['Confirmed', 'Filed 19 Nov'], ['—', null], 'M. Achebe'],
  ['STR-0086', 'RE', '@rook.eth', 'Account takeover suspicion', 'AML-5341', '2,200.00', ['Neutral', 'Closed — no filing'], ['—', null], 'K. Osei']];
const rows = [];
for (const s of S) rows.push([{ T: 'Text', p: s[0], mono: 1 }, { T: 'User', i: s[1], p: s[2] }, { T: 'Text', p: s[3] }, { T: 'Text', p: s[4], mono: 1 }, { T: 'Amount', p: s[5] }, { T: 'Status', st: s[6][0], p: s[6][1] }, C(await T(s[7][0], 'Body/S Strong', s[7][1] ? 'text/warning' : 'text/tertiary')), { T: 'Text', p: s[8] }, { T: 'Actions' }]);
await TABLE(c, 'Cases', [{ k: 'case', l: 'Case', w: 104 }, { k: 'user', l: 'Subject', w: 148 }, { k: 'typ', l: 'Typology', w: 'FILL' }, { k: 'alerts', l: 'Alerts', w: 120 }, { k: 'amount', l: 'Amount', w: 132, r: 1 }, { k: 'stage', l: 'Stage', w: 160 }, { k: 'due', l: 'Filing due', w: 112 }, { k: 'owner', l: 'Owner', w: 112 }, { k: 'act', l: '', w: 44 }], rows, { sel: [0], hideL: ['alerts', 'owner'], head: await TH('Cases', { meta: 'Retention 5 years after closure' }) });
// case detail
const det = CARD('Case STR-0094', { stroke: 'border/brand', gap: 20 }); add(c, [det, 'FILL']);
await CHEAD(det, 'STR-0094 · @sable · draft report', { icon: 'file', badges: [await ST('Pending', 'Draft')] });
const stp = AL('HORIZONTAL', { name: 'Stage stepper', gap: 0 }); add(det, [stp, 'FILL']);
const SS = [['Complete', 'Escalated · 27 Nov 16:05'], ['Current', 'Draft report'], ['Upcoming', 'MLRO approval'], ['Upcoming', 'Filed with FIU']];
for (let i = 0; i < SS.length; i++) { const s = await I('14:1193', { State: SS[i][0] }, { Number: String(i + 1), Label: SS[i][1], 'Show leading line': i > 0, 'Show trailing line': i < SS.length - 1 }); add(stp, [s, 'FILL']); }
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(det, [cols, 'FILL']);
const ev = AL('VERTICAL', { name: 'Evidence pack', gap: 8 }); add(cols, [ev, 'FILL']);
add(ev, await T('Evidence pack · 6 items', 'Label/L', 'text/primary'));
for (const [ic, t1, t2] of [['shield-alert', 'Alert AML-5530 · rule R-07', 'Raised 27 Nov 2026, 16:02 UTC · score 72 (High)'], ['arrow-down-left', 'Deposit DP-77290 · 5,000.00 USDT', 'Arbitrum · tx 0x7b31…d4e2 · 26 Nov 2026, 09:12 UTC'], ['arrow-up-right', 'Withdrawal request WD-20960 · 4,800.00 USDT', 'BNB Chain → 0x5d2a…e81B · held by restriction RS-3312 · not broadcast'], ['activity', 'Play history · 120.00 USDT wagered', 'Pool Dice, Orbit Rush · 2.4 % of the deposit'], ['link', 'Chain-analytics exposure report', 'Destination 2 hops from a mixer-linked cluster (provider DEMO)'], ['id-card', 'KYC file KYC-29870 · Level 2', 'Approved 2 Oct 2026 · resident in Romania']]) {
  const r = AL('HORIZONTAL', { name: 'Evidence — ' + t1, gap: 12, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10, align: 'CENTER' }); add(r, await IC(ic, 18, 'icon/muted')); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); await WT(tx, t1, 'Body/S Strong', 'text/primary', 300); await WT(tx, t2, 'Caption', 'text/tertiary', 300); add(r, [tx, 'FILL']); add(r, await ST('Approved', 'Included')); add(ev, [r, 'FILL']); }
const fl = CARD('Filing', { fill: 'surface/raised', gap: 12, w: 380 }); add(cols, fl);
await CHEAD(fl, 'Filing', { icon: 'receipt', demo: false });
await KV(fl, 'Report type', 'STR (DEMO jurisdiction)'); await KV(fl, 'Recipient', 'FIU portal · DEMO placeholder'); await KV(fl, 'Deadline', '4 Dec 2026 · 7 days from escalation', { color: 'text/warning' }); await KV(fl, 'Prepared by', 'K. Osei · Compliance'); await KV(fl, 'Approver (MLRO)', 'M. Achebe'); await KV(fl, 'Restriction in place', 'RS-3312 · withdrawals held');
add(fl, [await BTN('Primary', 'Submit to MLRO for approval', { size: 'M', lead: 'user-check' }), 'FILL']);
add(fl, [await BTN('Secondary', 'Export case file', { size: 'M', lead: 'download' }), 'FILL']);
await WT(fl, 'Four-eyes: the preparer cannot approve or file. Export is watermarked with your name and logged.', 'Caption', 'text/tertiary', 300);
if (Q1) await Q1.screenshot({ scale: 0.4 }); if (Q2) await Q2.screenshot({ scale: 0.4 });
return await DONE(f);
