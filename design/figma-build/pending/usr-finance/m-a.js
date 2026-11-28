const PRE = SEC.children.map(c => ({ n: c.name, id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
// m-a: patch F1 mobile DEMO bars (short message, decision #29) + build F2, F3, F4 mobile (MOB-10)
{ for (const fr of SEC.children.filter(n => n.type === 'FRAME' && n.name.startsWith('MOB-10 · [USR-F1]'))) { const db = fr.children[0]; if (db && db.type === 'INSTANCE') { const key = Object.keys(db.componentProperties).find(k => k.split('#')[0] === 'Message'); if (key) { db.setProperties({ [key]: DEMO_MSG }); OUT.push({ patchedDemoBar: fr.id }); } } } }
{
let R; try {
R = await MOB('MOB-10 · [USR-F2] Withdrawals / 390 / Default', { col: 1 }); const { f, c } = R;
await MTOP(c, { title: 'Withdrawals', tab: 'Withdrawals', sub: 'Sent only to your whitelisted addresses. GLOBAL POOL charges no withdrawal fee; the network fee is shown before you confirm.' });
const tr = AL('VERTICAL', { name: 'In review — WD-20931', fill: 'surface/default', stroke: 'border/default', r: 14, p: 16, gap: 12 }); add(c, [tr, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(tr, [th, 'FILL']); add(th, await TILE('hourglass', 'status/pending-tint', 'status/pending', 40));
const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']); add(tt, [await T('WD-20931 is under review', 'Label/L'), 'FILL'], [await T('1,500.00 USDT → 0x7c4e…a21D · Arbitrum One', 'Caption', 'text/tertiary'), 'FILL']); add(th, await DEMO('XS'));
add(tr, [await T('Routine AML screening for a new destination: this is your first withdrawal to 0x7c4e…a21D since you whitelisted it on 14 Oct 2026. Usually under 4 h — decision expected by 22:44 UTC today. The amount stays Locked until it is sent.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
const fe = AL('VERTICAL', { name: 'Fee breakdown', fill: 'surface/raised', r: 10, p: 12, gap: 6 }); add(tr, [fe, 'FILL']);
for (const [a, b, s] of [['Amount', '1,500.00 USDT'], ['Network fee · Arbitrum', '−0.08 USDT'], ['Platform fee', '0.00 USDT'], ['You receive', '1,499.92 USDT', 1]]) { const r = AL('HORIZONTAL', { name: 'KV — ' + a, gap: 8, align: 'CENTER' }); add(fe, [r, 'FILL']); add(r, [await T(a, s ? 'Body/S Strong' : 'Body/S', s ? 'text/primary' : 'text/secondary'), 'FILL'], await T(b, s ? 'Number/S' : 'Body/S Strong', s ? 'text/primary' : 'text/primary')); }
const st = AL('VERTICAL', { name: 'Status steps', gap: 8 }); add(tr, [st, 'FILL']);
for (const [ic, col, lab, tm] of [['check-circle', 'status/success', 'Risk check · 6 automatic checks', '18:43'], ['check-circle', 'status/success', '2FA confirmed · submitted', '18:44'], ['spinner', 'status/pending', 'Manual AML review', 'by 22:44'], ['clock', 'icon/muted', 'Sent on Arbitrum · 20 confirmations', '—'], ['clock', 'icon/muted', 'Completed', '—']]) { const r = AL('HORIZONTAL', { name: 'Step — ' + lab, gap: 8, align: 'CENTER' }); add(st, [r, 'FILL']); add(r, await IC(ic, 16, col)); add(r, [await T(lab, 'Body/S', col === 'icon/muted' ? 'text/tertiary' : 'text/primary'), 'FILL'], await T(tm, 'Caption', 'text/tertiary')); }
const ta = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(tr, [ta, 'FILL']); add(ta, [await BTN('Secondary', 'Cancel withdrawal', { size: 'L' }), 'FILL'], [await BTN('Ghost', 'Track', { size: 'L', trail: 'chevron-right' }), 'FILL']);
add(tr, [await T('You can cancel until it is broadcast. Times in UTC.', 'Caption', 'text/tertiary', { w: 326 }), 'FILL']);
await KROW(c, await MKPI('Withdrawn · lifetime', '11,950.00', 'USDT', '9 completed'), await MKPI('Daily limit used', '1,500.00', '/ 25,000.00', 'KYC Level 2 · resets 00:00 UTC'));
const wc = (id, ch, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'withdraw', tone: 'out', title: id, sub: ch + ' · ' + sub, amt, ac: 'text/danger', st: s, stl: sl, chain: ch, date }, o);
await MLIST(c, [
  ['Today · 27 Nov 2026', [wc('WD-20931', 'Arbitrum', 'you receive 1,499.92', '−1,500.00', 'Under review', 'Under review', '18:44 UTC', { hl: true, tone: 'pend' })]],
  ['November', [wc('WD-20877', 'BNB Chain', 'received 799.88', '−800.00', 'Confirmed', 'Completed', '20 Nov · 10:26 UTC'), wc('WD-20850', 'Arbitrum', 'amount returned to Available', '600.00', 'Rejected', 'Rejected', '18 Nov · 15:02 UTC', { tone: 'bad', ac: 'text/primary' }), wc('WD-20791', 'BNB Chain', 'received 1,999.88', '−2,000.00', 'Confirmed', 'Completed', '13 Nov · 09:41 UTC'), wc('WD-20702', 'BNB Chain', 'received 1,249.88', '−1,250.00', 'Confirmed', 'Completed', '4 Nov · 18:15 UTC')]],
  ['October', [wc('WD-20655', 'Polygon', 'received 899.98', '−900.00', 'Confirmed', 'Completed', '29 Oct · 12:03 UTC')]]
]);
const rj = AL('HORIZONTAL', { name: 'Rejection note', gap: 8, fill: 'status/danger-tint', r: 10, p: 12 }); add(c, [rj, 'FILL']); add(rj, await IC('shield-alert', 16, 'status/danger')); add(rj, [await T('WD-20850 was rejected by sanctions screening and the full 600.00 USDT went back to Available — no fee was charged. Contact support if you think this is a mistake.', 'Caption', 'text/secondary', { w: 300 }), 'FILL']);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 6 of 11 withdrawals', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 5 more', { size: 'L' }), 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await STICKY(f, [await BTN('Primary', 'Withdraw', { size: 'L', lead: 'withdraw' })]);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F2 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F2' });
}
{
let R; try {
R = await MOB('MOB-10 · [USR-F3] Fees / 390 / Default', { col: 2 }); const { f, c } = R;
await MTOP(c, { title: 'Fees', tab: 'Fees', sub: 'The only platform fee is 0.05 USDT per qualifying Global Pool entry. Deposits and withdrawals carry no platform fee; network fees go to the blockchain.' });
const hero = AL('VERTICAL', { name: 'Lifetime platform fees', fill: 'surface/default', stroke: 'border/default', r: 14, p: 20, gap: 12 }); add(c, [hero, 'FILL']);
const hh = AL('HORIZONTAL', { name: 'Header', gap: 8, align: 'CENTER' }); add(hh, await T('Platform fees paid · lifetime', 'Overline', 'text/tertiary'), await DEMO('XS')); add(hero, hh);
const hv = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'BASELINE' }); add(hv, await T('64.20', 'Number/L'), await T('USDT', 'Body/M Strong', 'text/secondary')); add(hero, hv);
const eq = AL('HORIZONTAL', { name: 'Equation', gap: 8, align: 'CENTER' }); add(hero, [eq, 'FILL']);
const chip = async (v, l, hl) => { const k = AL('VERTICAL', { name: 'Term — ' + l, fill: hl ? 'brand/tint' : 'surface/raised', r: 10, p: [8, 10, 8, 10], gap: 2 }); add(k, await T(v, 'Number/S', hl ? 'text/brand' : 'text/primary'), await T(l, 'Caption', 'text/tertiary')); return k; };
add(eq, [await chip('1,284', 'entries'), 'FILL'], await T('×', 'Body/M', 'text/tertiary'), [await chip('0.05', 'USDT each'), 'FILL'], await T('=', 'Body/M', 'text/tertiary'), [await chip('64.20', 'USDT', true), 'FILL']);
add(hero, [await T('Always shown as its own line before you confirm. Never added to the prize pool. Reversed automatically if a round is cancelled.', 'Caption', 'text/secondary', { w: 318 }), 'FILL']);
await KROW(c, await MKPI('Round #1,248', '1.75', 'USDT', '35 × 0.05 · in progress'), await MKPI('Last 30 days', '18.45', 'USDT', '369 entries × 0.05'));
const fc = (t, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'receipt', tone: 'fee', title: t, sub, amt, ac: 'text/danger', st: s, stl: sl, date }, o);
await MLIST(c, [
  ['Today · 27 Nov 2026', [fc('WD-20931 · network fee', 'Paid to the Arbitrum network', '−0.08', 'Under review', 'Reserved', '18:44 UTC', { chain: 'Arbitrum' }), fc('Round #1,248 · 35 entries', 'Platform fee · 35 × 0.05', '−1.75', 'Confirmed', 'Charged', '18:05 UTC')]],
  ['This week', [fc('Round #1,247 · 40 entries', 'Platform fee · 40 × 0.05', '−2.00', 'Confirmed', 'Charged', '26 Nov · 12:40 UTC'), fc('Round #1,246 · 24 entries', 'Platform fee · 24 × 0.05', '−1.20', 'Confirmed', 'Charged', '25 Nov · 19:12 UTC'), fc('Round #1,245 · fee reversal', 'Round cancelled · 30 × 0.05', '+1.50', 'Neutral', 'Reversed', '24 Nov · 20:00 UTC', { icon: 'rotate-ccw', tone: 'info', ac: 'text/success' }), fc('Round #1,245 · 30 entries', 'Platform fee · 30 × 0.05', '−1.50', 'Expired', 'Round cancelled', '24 Nov · 14:22 UTC'), fc('DP-77380 · deposit', 'No platform fee on deposits', '0.00', 'Confirmed', 'No fee', '24 Nov · 09:12 UTC', { ac: 'text/primary', chain: 'BNB Chain' })]]
]);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 7 of 196 fee lines', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
const sch = AL('VERTICAL', { name: 'Fee schedule', fill: 'surface/default', stroke: 'border/subtle', r: 14, p: 16, gap: 0 }); add(c, [sch, 'FILL']);
add(sch, await T('Fee schedule', 'Heading/H5'));
for (const [a, b] of [['Global Pool entry', '10.00 · 100% to pool'], ['Platform fee', '0.05 per entry'], ['Deposits', '0.00'], ['Withdrawals', '0.00 + network fee'], ['Originals & table games', 'No per-bet fee']]) { const r = AL('HORIZONTAL', { name: 'Fee — ' + a, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); strokeSides(r, 'border/subtle', { b: 1 }); add(sch, [r, 'FILL']); add(r, [await T(a, 'Body/S', 'text/secondary'), 'FILL'], await T(b, 'Body/S Strong', a === 'Platform fee' ? 'text/brand' : 'text/primary')); }
const nf = await T('Network fees: BNB Chain 0.12 · Polygon 0.02 · Arbitrum 0.08 · Ethereum 2.40 · Solana 0.01 USDT. House edge is disclosed on every game.', 'Caption', 'text/tertiary', { w: 326 }); add(sch, [nf, 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F3 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F3' });
}
{
let R; try {
R = await MOB('MOB-10 · [USR-F4] Rewards / 390 / Default', { col: 3 }); const { f, c } = R;
await MTOP(c, { title: 'Rewards', tab: 'Rewards', sub: 'What you earned, how it was paid and what is still waiting. Rewards never change odds, outcomes or your limits.' });
const cl = AL('VERTICAL', { name: 'Claim — VIP Gold weekly reward', fill: 'surface/default', stroke: 'border/gold', r: 14, p: 16, gap: 12 }); add(c, [cl, 'FILL']);
const ch = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(cl, [ch, 'FILL']); add(ch, await TILE('crown', 'accent/gold-tint', 'icon/gold', 40));
const ct = AL('VERTICAL', { name: 'Text', gap: 2 }); add(ch, [ct, 'FILL']); add(ct, [await T('VIP Gold weekly reward', 'Label/L'), 'FILL'], [await T('Week 16 – 22 Nov · cash, no wagering', 'Caption', 'text/tertiary'), 'FILL']);
const ca = AL('VERTICAL', { name: 'Amount', gap: 2, align: 'MAX' }); add(ca, await T('115.20', 'Number/M', 'text/gold'), await T('USDT · Owed', 'Caption', 'text/tertiary')); add(ch, ca);
add(cl, [await BTN('Primary', 'Claim 115.20 USDT', { size: 'L', lead: 'gift' }), 'FILL']);
add(cl, [await T('Not claimed? It settles to Available automatically on Mon 30 Nov 2026, 10:00 UTC — you never lose it.', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
const cf = AL('HORIZONTAL', { name: 'Terms', gap: 8, align: 'CENTER' }); add(cl, [cf, 'FILL']); add(cf, await DEMO('XS')); const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(cf, [sp, 'FILL']); add(cf, await BTN('Ghost', 'Terms apply', { size: 'S' }));
await KROW(c, await MKPI('Earned · lifetime', '1,842.60', 'USDT', '64 cash rewards'), await MKPI('Claimable now', '118.62', 'USDT', 'VIP 115.20 + rakeback 3.42'));
add(c, [await I('30:21644'), 'FILL']);
const rc = (t, sub, amt, s, sl, date, o = {}) => Object.assign({ icon: 'gift', tone: 'gold', title: t, sub, amt, ac: 'text/success', st: s, stl: sl, date }, o);
await MLIST(c, [
  ['This week · since Mon 23 Nov', [
    rc('Daily reward · day 3', 'Bonus funds · 30× wagering', '+1.00', 'Confirmed', 'Credited', '26 Nov · 00:05 UTC'),
    rc('VIP level-up · Gold III', 'Level 14 · cash, no wagering', '+5.00', 'Confirmed', 'Credited', '25 Nov · 19:32 UTC', { icon: 'crown' }),
    rc('Daily reward · day 2', 'Bonus funds · 30× wagering', '+0.75', 'Confirmed', 'Credited', '25 Nov · 00:06 UTC'),
    rc('Rakeback claim', 'Cash · 5% of house edge', '+2.96', 'Confirmed', 'Credited', '24 Nov · 09:12 UTC', { icon: 'percent' }),
    rc('Daily reward · day 1', 'Bonus funds · 30× wagering', '+0.50', 'Confirmed', 'Credited', '24 Nov · 00:04 UTC'),
    rc('VIP weekly · 16 – 22 Nov', 'Owed · claim or auto-settles 30 Nov', '+115.20', 'Pending', 'Owed', '23 Nov · 10:00 UTC', { icon: 'crown', hl: true, ac: 'text/gold' }),
    rc('VIP weekly · 9 – 15 Nov', 'Cash · moved from Owed to Available', '+108.40', 'Confirmed', 'Auto-settled', '23 Nov · 10:00 UTC', { icon: 'crown' }),
    rc('Weekly cashback', 'Cash · 10% of net losses 16 – 22 Nov', '+12.80', 'Confirmed', 'Credited', '23 Nov · 10:00 UTC', { icon: 'refresh' }),
    rc('Orbit Rush Sprint · rank #9', 'Tournament 16 – 22 Nov · cash', '+75.00', 'Confirmed', 'Credited', '23 Nov · 00:10 UTC', { icon: 'trophy' })]]
]);
const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(c, [lm, 'FILL']); add(lm, await T('Showing 9 of 64 rewards', 'Caption', 'text/tertiary')); add(lm, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
add(c, [await T('Lifetime total counts cash rewards. Bonus funds must be wagered 30× before they can be withdrawn; Global Pool entries contribute 0%. Terms apply to every promotion.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
add(c, [await I('6:158', { Variant: 'Compact' }), 'FILL']);
await TABBAR(f, 'Wallet');
} catch (e) { ISSUES.push('F4 FATAL ' + e.message); }
if (R) { fitSection(R.sec); await R.f.screenshot({ scale: 0.5 }); }
OUT.push(R ? { id: R.f.id, name: R.f.name, h: Math.round(R.f.height), x: R.f.x, y: R.f.y } : { failed: 'F4' });
}
return { section: SEC.id, existingBefore: PRE, frames: OUT, issues: ISSUES };
