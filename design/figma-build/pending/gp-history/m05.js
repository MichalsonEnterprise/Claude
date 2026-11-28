const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-11] Prize Distribution breakdown / 390 / Default (round #1,248)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 1650, 160);
add(main, [await mhead('Global Pool', 'Prize distribution', 'How round #1,248’s pool is split between 13 winning entries. Shares are fixed in the GlobalPool contract; amounts follow the live pool until 20:00 UTC.'), 'FILL']);
add(main, [await mtabs('Prize distribution'), 'FILL']);
const pc = card('Card — Pool basis', { p: 16, gap: 8 });
const pr = row('Round', { gap: 8 }); add(pr, await T('Round #1,248', 'Label/L', 'text/primary'), await badge('Live', 'Open'), [spacer(), 'FILL'], await DEMO('XS'));
const amt = await T('186,400.00 USDT', 'Number/L', 'accent/gold'); await gfill(amt, 'Gradient/Gold Jackpot');
add(pc, [pr, 'FILL'], amt, [await T('18,640 qualifying entries × 10.00 USDT · closes 27 Nov 2026, 20:00:00 UTC (in 03:17:42)', 'Caption', 'text/secondary', { w: 326 }), 'FILL']);
add(main, [pc, 'FILL']);
const tc_ = card('Card — Prize tiers', { p: 16, gap: 16 }); add(tc_, [await ttl('Prize tiers', { s: 'Label/L' }), 'FILL']);
for (const [t, sh, amt2, sub, pct] of [['1st', '50%', '93,200.00', '1 winning entry · 1 in 18,640', 0.5], ['2nd', '20%', '37,280.00', '1 winning entry · 1 in 18,640', 0.2], ['3rd', '10%', '18,640.00', '1 winning entry · 1 in 18,640', 0.1], ['Runner-up ×10', '2% each', '3,728.00 USDT each', '10 entries · 37,280.00 in total', 0.2]]) {
  const r = col('Tier ' + t, { gap: 6 }); const h = row('Head', { gap: 8 }); add(h, await T(t, 'Body/S Strong', 'text/primary'), await T(sh, 'Caption', 'text/tertiary'), [spacer(), 'FILL'], await T(amt2.includes('USDT') ? amt2 : amt2 + ' USDT', 'Number/S', 'text/gold'));
  const bar = AL('HORIZONTAL', { name: 'Share bar', h: 8, fill: 'surface/raised', r: 9999, clip: true }); add(bar, rect(Math.round(326 * pct), 8, 'chart/prize-1', 0, 'Share ' + sh));
  add(r, [h, 'FILL'], [bar, 'FILL'], await T(sub, 'Caption', 'text/secondary')); add(tc_, [r, 'FILL']); }
add(tc_, [line(), 'FILL'], [await kv('Total · 13 prizes', '186,400.00 USDT · 100%', { vs: 'Number/S', vw: 170 }), 'FILL']);
add(main, [tc_, 'FILL']);
const yc = await mcard('Your chances · 35 entries', await DEMO('XS'), [['1st prize', '≈ 0.188%'], ['Any prize', '≈ 2.44%'], ['At stake', '350.00 + 1.75 fee']], { demo: true });
const rk = row('Risk', { gap: 8, align: 'MIN' }); add(rk, await IC('alert-triangle', 16, 'status/warning'), await T('You can lose your stake. More entries raise your chance but never guarantee a prize.', 'Body/S', 'text/warning', { w: 300 })); add(yc, [rk, 'FILL']); add(main, [yc, 'FILL']);
add(main, [await mcard('Not part of the pool', null, [['Platform fees', '932.00 USDT'], ['Fee basis', '18,640 × 0.05'], ['Network fee on entries', '0.00 USDT']], { foot: [await T('Fees are collected separately and never added to or taken from the pool.', 'Caption', 'text/secondary', { w: 326 })] }), 'FILL']);
const past = card('Card — Past rounds', { p: 16, gap: 12 }); add(past, [await ttl('Same split in past rounds', { s: 'Label/L' }), 'FILL']);
for (const [r, p, w, a] of [['#1,247', '172,950.00', '@orbit_77', '86,475.00'], ['#1,246', '168,420.00', '@mira.sol', '84,210.00'], ['#1,245', '41,200.00', 'Cancelled', 'Refunded'], ['#1,244', '181,030.00', '@kestrel', '90,515.00']]) { const it = row('Past ' + r, { gap: 8 }); const lc = col('L', { gap: 2 }); add(lc, await T(r + ' · pool ' + p, 'Body/S Strong', 'text/primary'), await T(r === '#1,245' ? 'Threshold not met — no prizes' : '1st ' + w + ' · runner-ups ' + (r === '#1,247' ? '3,459.00' : r === '#1,246' ? '3,368.40' : '3,620.60'), 'Caption', 'text/secondary')); add(it, [lc, 'FILL'], await T(r === '#1,245' ? a : a, 'Number/S', r === '#1,245' ? 'text/secondary' : 'text/gold')); add(past, [it, 'FILL']); }
add(main, [past, 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Gold', 'Participate · 10.05 USDT per entry', { size: 'L', lead: 'ticket' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
