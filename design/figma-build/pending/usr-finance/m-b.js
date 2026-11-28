// fix from m-a review: F2 'Daily limit used' KPI unit overflowed its card
{ const f2 = await figma.getNodeByIdAsync('161:69577'); const k = f2 && f2.findOne(n => n.type === 'FRAME' && n.name === 'KPI — Daily limit used'); if (k) { for (const t of k.findAll(n => n.type === 'TEXT')) { if (t.characters === '/ 25,000.00') t.characters = 'USDT'; else if (t.characters === 'KYC Level 2 · resets 00:00 UTC') t.characters = 'of 25,000.00 · KYC L2 · resets 00:00 UTC'; } OUT.push({ fixedKpi: k.id }); } else ISSUES.push('F2 KPI not found'); }
// m-b: build F5, F6 default, F6 export (bottom sheet) mobile (MOB-10)
{
let R; try {
R = await MOB('MOB-10 · [USR-F5] Refunds / 390 / Default', { col: 4 }); const { f, c } = R;
await MTOP(c, { title: 'Refunds', tab: 'Refunds', sub: 'Money returned when a Global Pool round is cancelled, following the smart-contract rules. Nobody at GLOBAL POOL can change or hold back a refund.' });
const st = AL('VERTICAL', { name: 'Refund status — RF-1245-0042', fill: 'surface/default', stroke: 'border/default', r: 14, p: 16, gap: 12 }); add(c, [st, 'FILL']);
const sh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(st, [sh, 'FILL']); add(sh, await TILE('rotate-ccw', 'status/info-tint', 'status/info', 40));
const stt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(sh, [stt, 'FILL']); add(stt, [await T('Round #1,245 refund', 'Label/L'), 'FILL'], [await T('RF-1245-0042 · 30 entries × 10.00', 'Caption', 'text/tertiary'), 'FILL']);
const sa = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(sa, await T('300.00', 'Number/M', 'balance/owed'), await T('USDT · Owed', 'Caption', 'text/tertiary')); add(sh, sa);
const tl = AL('VERTICAL', { name: 'Timeline', gap: 10 }); add(st, [tl, 'FILL']);
for (const [ic, col, lab, sub] of [['check-circle', 'status/success', 'Round closed below threshold', '24 Nov, 20:00 UTC · 412 / 500 players · 46,850.00 / 50,000.00 USDT'], ['check-circle', 'status/success', 'Round cancelled — no draw requested', '24 Nov, 20:00 UTC · your 1.50 fees reversed instantly'], ['spinner', 'status/info', 'Refund batch 2 of 3 on Arbitrum', 'Processing · contract call 0xc71e…5b02'], ['clock', 'icon/muted', 'Credited to Available', 'Automatic — nothing for you to do']]) { const r = AL('HORIZONTAL', { name: 'Step — ' + lab, gap: 10 }); add(tl, [r, 'FILL']); add(r, await IC(ic, 16, col)); const cc = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [cc, 'FILL']); add(cc, [await T(lab, 'Body/S Strong', col === 'icon/muted' ? 'text/tertiary' : 'text/primary'), 'FILL'], [await T(sub, 'Caption', 'text/tertiary', { w: 280 }), 'FILL']); }
const sb = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' }); add(st, [sb, 'FILL']); add(sb, [await BTN('Secondary', 'View on explorer', { size: 'L', lead: 'external-link' }), 'FILL'], await DEMO('XS'));
await KROW(c, await MKPI('Refund owed', '300.00', 'USDT', 'Round #1,245 · 30 entries', { vc: 'balance/owed' }), await MKPI('Refunded · lifetime', '120.60', 'USDT', 'Round #1,189 · 29 Sep'));
const rc = (t, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'rotate-ccw', tone: 'info', title: t, sub, amt, ac: 'text/success', st: s, stl: sl, date }, o);
await MLIST(c, [
  ['November', [rc('RF-1245-0042', 'Round #1,245 · entry amounts · 30', '+300.00', 'Processing', 'Owed · batch 2/3', '24 Nov · 20:00 UTC', { hl: true, chain: 'Arbitrum', ac: 'balance/owed' }), rc('RF-1245-0042-F', 'Round #1,245 · fees · 30 × 0.05', '+1.50', 'Confirmed', 'Credited', '24 Nov · 20:00 UTC')]],
  ['September', [rc('RF-1189-0017', 'Round #1,189 · entry amounts · 12', '+120.00', 'Confirmed', 'Credited', '29 Sep · 20:04 UTC', { chain: 'Arbitrum' }), rc('RF-1189-0017-F', 'Round #1,189 · fees · 12 × 0.05', '+0.60', 'Confirmed', 'Credited', '29 Sep · 20:00 UTC')]]
]);
const how = AL('VERTICAL', { name: 'How refunds work', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 12 }); add(c, [how, 'FILL']); add(how, await T('How refunds work', 'Heading/H5'));
for (const [i, a] of [['1', 'A round that misses 500 participants or a 50,000.00 USDT pool at close is cancelled on-chain.'], ['2', 'No randomness is requested and no winners are drawn.'], ['3', 'Entry amounts return from the round escrow: first Owed, then Available.'], ['4', 'Platform fees (0.05 USDT per entry) go straight back to Available.']]) { const r = AL('HORIZONTAL', { name: 'Step ' + i, gap: 12 }); add(how, [r, 'FILL']); const n = AL('HORIZONTAL', { name: 'Number', fill: 'status/info-tint', r: 9999, w: 24, h: 24, align: 'CENTER', justify: 'CENTER' }); add(n, await T(i, 'Caption', 'text/info')); add(r, n, [await T(a, 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); }
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F5 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F5' });
}
const X = (icon, tone, t, sub, amt, ac, s, sl, date, chain, o = {}) => Object.assign({ icon, tone, title: t, sub, amt, ac, st: s, stl: sl, date, chain }, o);
{
let R; try {
R = await MOB('MOB-10 · [USR-F6] Complete Transaction History / 390 / Default', { col: 5 }); const { f, c } = R;
await MTOP(c, { title: 'Transaction history', tab: 'All', sub: 'Every movement of your USDT balance, newest first. Bonus funds are listed under Rewards. Times in UTC.' });
await KROW(c, await MKPI('Total balance', '12,480.50', 'USDT', 'Available 9,215.30'), await MKPI('Not yet available', '3,265.20', 'USDT', 'Locked 1,850.00 · Pending 1,000.00 · Owed 415.20'));
const sr = AL('HORIZONTAL', { name: 'Search & filters', gap: 8, align: 'CENTER' }); add(c, [sr, 'FILL']);
const se = await I('16:3820', { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); await setT(se, 'Value text', 'Search ID or hash'); add(sr, [se, 'FILL']);
add(sr, await I('23:5397', { State: 'Default' }, { Label: 'Filters' }), await I('7:774', { Type: 'Secondary', Size: 'M', State: 'Default' }, { Icon: ICONS.download }));
await MLIST(c, [
  ['Today · 27 Nov 2026', [X('withdraw', 'pend', 'WD-20931', 'Withdrawal · to 0x7c4e…a21D', '−1,500.00', 'text/danger', 'Under review', 'Under review', '18:44 UTC', 'Arbitrum'), X('deposit', 'info', 'DP-77412', 'Deposit · tx 0x5e1f…c0a8', '+1,000.00', 'text/success', 'Processing', 'Confirming 7/12', '18:39 UTC', 'Ethereum', { hl: true }), X('ticket', 'out', 'Round #1,248 · 35 entries', 'Entry · 350.00 + fee 1.75', '−351.75', 'text/danger', 'Live', 'In round', '18:05 UTC')]],
  ['26 – 25 Nov 2026', [X('ticket', 'out', 'Round #1,247 · 40 entries', 'Entry · 400.00 + fee 2.00', '−402.00', 'text/danger', 'Confirmed', 'Settled', '26 Nov · 12:40 UTC'), X('crown', 'gold', 'VIP level-up · Gold III', 'Reward · cash, no wagering', '+5.00', 'text/success', 'Confirmed', 'Credited', '25 Nov · 19:32 UTC'), X('ticket', 'out', 'Round #1,246 · 24 entries', 'Entry · 240.00 + fee 1.20', '−241.20', 'text/danger', 'Confirmed', 'Settled', '25 Nov · 19:12 UTC')]],
  ['24 Nov 2026', [X('rotate-ccw', 'info', 'Refund · round #1,245', 'Refund · round cancelled', '+300.00', 'balance/owed', 'Processing', 'Owed', '20:00 UTC', 'Arbitrum'), X('receipt', 'fee', 'Fee reversal · #1,245', 'Fee · 30 × 0.05', '+1.50', 'text/success', 'Confirmed', 'Credited', '20:00 UTC'), X('ticket', 'out', 'Round #1,245 · 30 entries', 'Entry · 300.00 + fee 1.50', '−301.50', 'text/danger', 'Expired', 'Cancelled', '14:22 UTC'), X('deposit', 'in', 'DP-77380', 'Deposit · tx 0x41aa…7d10', '+2,500.00', 'text/success', 'Confirmed', 'Credited', '09:12 UTC', 'BNB Chain')]]
]);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 10 of 212 transactions', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await STICKY(f, [await BTN('Primary', 'Export CSV', { size: 'L', lead: 'download' })]);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F6 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F6' });
}
{
let R; try {
R = await MOB('MOB-10 · [USR-F6] Complete Transaction History / 390 / Export (bottom sheet)', { col: 5, h: 844 }); const { f, c } = R;
await MTOP(c, { title: 'Transaction history', tab: 'All' });
await MLIST(c, [['Today · 27 Nov 2026', [X('withdraw', 'pend', 'WD-20931', 'Withdrawal · to 0x7c4e…a21D', '−1,500.00', 'text/danger', 'Under review', 'Under review', '18:44 UTC', 'Arbitrum'), X('deposit', 'info', 'DP-77412', 'Deposit · tx 0x5e1f…c0a8', '+1,000.00', 'text/success', 'Processing', 'Confirming 7/12', '18:39 UTC', 'Ethereum')]]]);
const scrim = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
const sh = AL('VERTICAL', { name: 'Sheet — Export transaction history', fill: 'surface/overlay', w: 390 }); radius(sh, 0); for (const k of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(k, VAR['radius/2xl']); strokeSides(sh, 'border/subtle', { t: 1 }); await fx(sh, 'Elevation/4 — Modal');
const hd = AL('VERTICAL', { name: 'Handle', p: [8, 0, 0, 0], align: 'CENTER' }); add(sh, [hd, 'FILL']); add(hd, rect(40, 4, 'border/strong', 9999, 'Grabber'));
const hr = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [12, 16, 8, 16] }); add(sh, [hr, 'FILL']); const ht = AL('VERTICAL', { name: 'Title group', gap: 2 }); add(hr, [ht, 'FILL']); add(ht, await T('Export as CSV', 'Heading/H5'), await T('USDT balance movements · times in UTC', 'Caption', 'text/tertiary')); add(hr, await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS.x }));
const bd = AL('VERTICAL', { name: 'Content', gap: 12, p: [8, 16, 16, 16] }); add(sh, [bd, 'FILL']);
const grp = async (label, items) => { add(bd, await T(label, 'Overline', 'text/tertiary')); const w = AL('HORIZONTAL', { name: 'Chips — ' + label, gap: 8, wrap: true, cgap: 8 }); add(bd, [w, 'FILL']); for (const [l, sel] of items) add(w, await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); };
await grp('Period', [['This month', 0], ['Last 90 days', 0], ['This year', 1], ['All time', 0], ['Custom', 0]]);
await grp('Include', [['Deposits', 1], ['Withdrawals', 1], ['Entries', 1], ['Prizes', 1], ['Rewards', 1], ['Refunds', 1], ['Fees', 1], ['Bonus funds', 0]]);
await grp('Format · pick one', [['CSV · comma separated', 1], ['CSV · semicolon', 0]]);
add(bd, [await I('20:3309', { On: 'Yes', State: 'Default' }, { Label: 'Include tx hashes and addresses', 'Show description': false }), 'FILL']);
const sm = AL('VERTICAL', { name: 'Summary', fill: 'surface/raised', r: 10, p: 12, gap: 6 }); add(bd, [sm, 'FILL']);
for (const [a, b] of [['Rows', '212 transactions'], ['Period', '1 Jan – 27 Nov 2026']]) { const r = AL('HORIZONTAL', { name: 'KV — ' + a, gap: 8, align: 'CENTER' }); add(sm, [r, 'FILL']); add(r, [await T(a, 'Body/S', 'text/secondary'), 'FILL'], await T(b, 'Body/S Strong')); if (a === 'Rows') add(r, await DEMO('XS')); }
add(sm, [await T('globalpool_transactions_2026-01-01_2026-11-27.csv', 'Mono/S', 'text/tertiary', { w: 334 }), 'FILL']);
const ft = AL('VERTICAL', { name: 'Sticky footer', gap: 8, p: [12, 16, 4, 16] }); strokeSides(ft, 'border/subtle', { t: 1 }); add(sh, [ft, 'FILL']); add(ft, [await BTN('Primary', 'Export 212 rows', { size: 'L', lead: 'download' }), 'FILL']); add(ft, [await T('Exports contain personal financial data — store the file securely. Every export is logged.', 'Caption', 'text/tertiary', { w: 358, align: 'CENTER' }), 'FILL']);
const hi = AL('VERTICAL', { name: 'Home indicator', p: [8, 0, 8, 0], align: 'CENTER' }); add(sh, [hi, 'FILL']); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator'));
f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = Math.max(56, 844 - sh.height);
if (844 - sh.height < 56) ISSUES.push('F6 export sheet taller than viewport: ' + Math.round(sh.height));
} catch (e) { ISSUES.push('F6 export FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F6 export' });
}
return { frames: OUT, issues: ISSUES };
