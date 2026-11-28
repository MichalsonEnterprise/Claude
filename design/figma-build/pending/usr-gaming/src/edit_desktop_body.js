const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const F = async (id) => await figma.getNodeByIdAsync(id);
const g2d = await F('32:97641'), g2f = await F('33:146972'), g3e = await F('33:198857'), g4 = await F('33:222628'), g5o = await F('33:253282'), g5s = await F('33:277301');
// 1) Rounds #1,247 / #1,246 entry counts (demo-data: #1,247 = 40 entries 402.00; #1,246 = 24 entries 241.20) + #1,245 bought 24 Nov 14:22 UTC
await setTxt('32:98715', '40 entries · 402.00 USDT', '24 entries · 241.20 USDT');
await setTxt('32:98698', '25 entries · 251.25 USDT', '40 entries · 402.00 USDT');
await setTxt('33:199591', '25 entries · 251.25 USDT', '40 entries · 402.00 USDT');
await setTxt('33:223150', 'Your 25 entries (251.25 USDT', 'Your 40 entries (402.00 USDT');
await setTxt('I33:223351;22:9427', null, '24'); await setTxt('I33:223353;22:9447;22:9419', null, '241.20');
await setTxt('I33:223310;22:9427', null, '40'); await setTxt('I33:223312;22:9447;22:9419', null, '402.00');
for (const id of ['I32:98740;22:9455', 'I32:98779;22:9455', 'I33:147189;22:9455', 'I33:147197;22:9455']) await setTxt(id, '11:02 UTC', '14:22 UTC');
// 2) G4 proof cell for cancelled #1,245 was truncated
await setTxt('I33:223380;22:9424', null, 'No draw · refunded'); await setTxt('I33:223380;22:9425', null, 'Settles 27 Nov, 21:00 UTC');
// 3) G5 Owed — VIP weekly reward (16–22 Nov) calculated Mon 23 Nov 10:00 UTC, auto-settles Mon 30 Nov 10:00 UTC (demo-data VIP extras)
for (const f of [g5o, g5s]) {
  await repIn(f, 'there is nothing to claim and no deadline to miss', 'you never need to claim anything, and nothing expires');
  await repIn(f, 'added to your Owed balance.', 'added to your Owed balance. The 1.50 USDT platform fees went straight back to Available.');
  await repIn(f, 'Calculated 27 Nov 2026, 00:00 UTC', 'Calculated 23 Nov 2026, 10:00 UTC');
  await repIn(f, 'No. Prizes, refunds and VIP rewards settle automatically in the daily run at 21:00 UTC.', 'No. Prizes and refunds settle automatically in the daily run at 21:00 UTC; VIP weekly rewards settle on their own 7 days after they are calculated.');
}
await setTxt('33:277298', null, 'Auto-settles 30 Nov 2026, 10:00 UTC');
{ const bi = g5o.findAll(n => n.type === 'TEXT' && n.characters.startsWith('Both items')); for (const n of bi) { await writeText(n, 'Your round #1,245 refund is in this run and reaches Available on its own, usually within 5 minutes. The VIP reward settles by itself on Mon 30 Nov, 10:00 UTC — you can claim it sooner in VIP Club, but you never have to.'); LOG.ok.push(n.id); } if (!bi.length) LOG.miss.push('Both items'); }
await setTxt('33:253812', 'After settlement,', 'After both settle,');
await setTxt('I33:254158;22:9454', null, '30 Nov 2026'); await setTxt('I33:254158;22:9455', null, '10:00 UTC');
await setTxt('33:254252', null, '23 Nov 2026, 10:00 UTC · auto-settled'); await setTxt('33:254261', null, '12 Nov 2026 · claimed in VIP Club');
// 4) G5 Settled — snapshot after the VIP reward auto-settled (Mon 30 Nov 2026, 10:00 UTC); refund settled in the 27 Nov run
await setTxt('33:277344', null, 'Nothing is owed to you right now. Your round #1,245 refund settled in the 27 Nov daily run and your VIP Gold weekly reward settled on its own on 30 Nov — 415.20 USDT moved to Available.');
await setTxt('33:277353', null, 'Settled 30 Nov 2026, 10:00 UTC');
await setTxt('33:277357', null, 'Settled automatically — last item 30 Nov 2026, 10:00 UTC');
await setTxt('33:277358', null, 'Refund: daily run on Arbitrum, batch tx 0x6b2e…41a9. VIP reward: auto-settled after 7 days. Next run: 30 Nov 2026, 21:00 UTC — nothing is waiting for it.');
await setTxt('33:277393', null, 'Settled · last 7 days');
await setTxt('33:277395', null, '2 items · 415.20 USDT · 27 Nov, 21:03 and 30 Nov, 10:00 UTC');
await setTxt('I33:277483;22:9454', null, '30 Nov 2026'); await setTxt('I33:277483;22:9455', null, 'Settled 10:00 UTC');
await setTxt('33:277486', null, 'Total settled');
await setTxt('33:277513', null, '30 Nov 2026, 10:00 UTC · Available');
await swapRows('33:277505', '33:277513');
// receipt card now documents the 27 Nov refund run only
const rt = await F('33:278101'); let rc = rt.parent; while (rc && !(rc.height >= 300 && rc.width < 520)) rc = rc.parent;
await repIn(rc, '2 (refund + VIP reward)', '1 (round #1,245 refund)', true);
const amt = rc.findAll(n => n.type === 'TEXT' && /^415\.20( USDT)?$/.test(n.characters)); for (const n of amt) { await writeText(n, n.characters.replace('415.20', '300.00')); LOG.ok.push(n.id); }
await repIn(rt.parent, 'Settlement receipt', 'Settlement receipt · 27 Nov run', true);
