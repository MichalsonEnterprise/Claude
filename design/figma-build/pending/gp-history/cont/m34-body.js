try { // ---- m05
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
R.push({ id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) });
} catch (e) { R.push({ part: 'm05', err: String(e && e.message || e).slice(0, 240) }); }
try { // ---- m06
const NAME = '[GP-13] Edge state — Round closed / 390 / Entries arrived after close (sheet)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 2160, 160, { h: 844 });
add(main, [await mhead(null, 'Round #1,248', 'Entries closed at 20:00:00 UTC · draw running on Chainlink VRF.', await badge('Processing', 'Entries closed')), 'FILL']);
add(main, [await I(C.CR, { Status: 'Drawing' }), 'FILL']);
const scrim = rect(390, 844, 'scrim/overlay', 0, 'Scrim'); f.appendChild(scrim); scrim.layoutPositioning = 'ABSOLUTE'; scrim.x = 0; scrim.y = 0;
const sh = AL('VERTICAL', { name: 'Bottom sheet — Round closed (inline)', fill: 'surface/overlay', stroke: 'border/subtle', w: 390 }); sh.primaryAxisSizingMode = 'AUTO'; for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']); await fx(sh, 'Elevation/4 — Modal');
const gr = AL('HORIZONTAL', { name: 'Grabber', p: [8, 0, 4, 0], justify: 'CENTER' }); add(gr, rect(36, 4, 'border/strong', 9999, 'Handle')); add(sh, [gr, 'FILL']);
const bd = col('Sheet body', { gap: 16, p: [12, 16, 16, 16] });
const hh = row('Head', { gap: 12, align: 'MIN' }); const it = AL('HORIZONTAL', { name: 'Icon tile', p: 10, fill: 'status/warning-tint', r: 10 }); add(it, await IC('clock', 20, 'status/warning'));
add(hh, it, [await T('Round #1,248 closed before your entries were placed', 'Heading/H5', 'text/primary', { w: 260 }), 'FILL'], await I('7:774', { Type: 'Ghost', Size: 'M', State: 'Default' }, { Icon: ICONS.x }));
add(bd, [hh, 'FILL'], [await T('Entries closed at 20:00:00 UTC. Your confirmation reached us at 20:00:02 UTC, so nothing was placed and nothing was charged.', 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
const box = AL('VERTICAL', { name: 'Summary', p: 12, gap: 8, fill: 'surface/raised', r: 10 });
for (const [k, v, c] of [['Not placed', '10 entries', 'text/primary'], ['Would have cost', '100.50 USDT', 'text/primary'], ['Charged', '0.00 USDT', 'text/success'], ['Available', '9,215.30 · unchanged', 'text/primary']]) add(box, [await kv(k, v, { vc: c, demo: true }), 'FILL']);
add(bd, [box, 'FILL']);
for (const [ic, c, t] of [['check-circle', 'status/success', 'Your 35 earlier entries are in the draw (VRF requested 20:00:04 UTC).'], ['calendar', 'icon/muted', 'Round #1,249 opens 28 Nov 2026, 08:00 UTC. Entries are never moved to the next round automatically.']]) { const r = row('Info', { gap: 8, align: 'MIN' }); add(r, await IC(ic, 16, c), await T(t, 'Body/S', 'text/secondary', { w: 300 })); add(bd, [r, 'FILL']); }
add(sh, [bd, 'FILL']);
const ft = AL('VERTICAL', { name: 'Sheet footer (sticky)', p: [12, 16, 12, 16], gap: 8 }); strokeSides(ft, 'border/subtle', { t: 1 }); add(ft, [await BTN('Primary', 'Watch the draw', { size: 'L' }), 'FILL'], [await BTN('Secondary', 'Remind me at 08:00 UTC', { size: 'L', lead: 'bell' }), 'FILL']); add(sh, [ft, 'FILL']);
const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [8, 0, 8, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(sh, [hi, 'FILL']);
f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
fitSection(sec);
await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, h: Math.round(f.height), sheetH: Math.round(sh.height), MISS: MISS.slice(0, 30) });
} catch (e) { R.push({ part: 'm06', err: String(e && e.message || e).slice(0, 240) }); }
try { // ---- m07
const NAME = '[GP-13] Edge state — Round cancelled, refund owed / 390 / Hub banner (#1,245)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 2160, colY(2160));
const bn = AL('VERTICAL', { name: 'Banner — refund owed (inline; Alert/Banner is 720+)', p: 16, gap: 10, fill: 'status/warning-tint', stroke: 'border/default', r: 14 });
const bh = row('Head', { gap: 8, align: 'MIN' }); add(bh, await IC('alert-triangle', 20, 'status/warning'), [await T('Round #1,245 was cancelled — 300.00 USDT is owed back to you', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']);
add(bn, [bh, 'FILL'], [await T('Below the draw threshold at close (412 of 500 players). Fees (1.50 USDT) are back in Available; the stake settles to Available on 27 Nov 2026, 21:00 UTC. Nothing to claim.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL'], await BTN('Secondary', 'View refund', { size: 'S', trail: 'arrow-right' }));
add(main, [bn, 'FILL']);
add(main, [await mhead(null, 'Global Pool', 'Drawn daily at 20:00 UTC with Chainlink VRF · 10.00 USDT + 0.05 USDT fee per entry.'), 'FILL']);
add(main, [await mtabs('Overview'), 'FILL']);
const dc = await I(C.DC, { State: 'Open' }); add(main, [dc, 'FILL']);
const cr = await I(C.CR, { Status: 'Cancelled' }); await O(cr, { '~29,640.00': '41,200.00', '~2,964': '4,120' }, 'cr'); add(main, [cr, 'FILL']);
const cb = await I(C.CBAL, { Type: 'Owed' }); await O(cb, { '~Updated 18:42 UTC': 'Updated 16:42 UTC' }, 'cb'); add(main, [cb, 'FILL']);
const st = card('Card — Where your refund is', { p: 16, gap: 12 }); add(st, [await ttl('Where your 301.50 USDT is', { s: 'Label/L' }), 'FILL']);
add(st, [await stepper([
  { s: 'done', t: 'Fees returned · 1.50', d: '24 Nov 2026, 20:01 UTC → Available.' },
  { s: 'current', t: 'Stake owed · 300.00', d: 'Counted in your total balance as Owed.' },
  { s: 'todo', t: 'Settles to Available', d: '27 Nov 2026, 21:00 UTC · Available then reads 9,515.30 USDT if nothing else changes.' }]), 'FILL']);
add(main, [st, 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Gold', 'Enter round #1,248', { size: 'L', lead: 'ticket' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) });
} catch (e) { R.push({ part: 'm07', err: String(e && e.message || e).slice(0, 240) }); }
try { // ---- m08
const NAME = '[GP-13] Edge state — VRF delayed / 390 / Waiting 00:14:32 (20:14:36 UTC)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 2160, colY(2160));
add(main, [await mhead('Global Pool', 'Round #1,248', 'Entries closed 20:00:00 UTC · randomness requested 20:00:04 UTC.', await badge('Processing', 'Draw delayed')), 'FILL']);
const bn = AL('VERTICAL', { name: 'Callout — VRF delayed', p: 16, gap: 8, fill: 'status/warning-tint', stroke: 'border/default', r: 14 });
const bh = row('Head', { gap: 8, align: 'MIN' }); add(bh, await IC('hourglass', 20, 'status/warning'), [await T('The draw is taking longer than usual', 'Body/S Strong', 'text/primary', { w: 290 }), 'FILL']);
add(bn, [bh, 'FILL'], [await T('Chainlink VRF hasn’t answered yet (waiting 00:14:32). Your entries are safe and nothing about the round has changed. No action needed.', 'Body/S', 'text/secondary', { w: 326 }), 'FILL']);
add(main, [bn, 'FILL']);
const vs = card('Card — Draw randomness', { p: 16, gap: 12 }); const hs = await I(C.HASH, { State: 'Default' }, { Hash: '0x9f2c…e71a', 'Show explorer link': false });
add(vs, [await ttl('Draw randomness', { s: 'Label/L', right: [await badge('Pending', 'Delayed')] }), 'FILL']);
add(vs, [await stepper([
  { s: 'done', t: 'Randomness requested', d: '20:00:04 UTC · Chainlink VRF on Arbitrum One', extra: hs },
  { s: 'warn', t: 'Awaiting VRF response', d: 'Elapsed 00:14:32 · typical response under 1 minute' },
  { s: 'todo', t: 'Randomness fulfilled', d: 'Random words and proof verified on-chain.' },
  { s: 'todo', t: 'Round settled', d: 'Winners mapped from the random words; prizes credited.' }]), 'FILL']);
add(main, [vs, 'FILL']);
const net = await I(C.NET, { Chain: 'Arbitrum', Status: 'Degraded' }, { 'Show status label': true, 'Show chevron': false });
add(main, [await mcard('What this means for you', null, [['Your entries', '35 · 350.00 USDT locked'], ['Winners decided by', 'VRF random words only'], ['Network', '', { node: net }], ['Last checked', '20:14:36 UTC · every 15 s']]), 'FILL']);
const fb = card('Card — If it keeps failing', { p: 16, gap: 8 }); add(fb, [await ttl('If the response keeps failing', { s: 'Label/L', demo: false }), 'FILL']);
for (const t of ['After 1 hour (21:00:04 UTC) the contract re-requests randomness for the same entries.', 'After 24 hours (28 Nov 2026, 20:00:04 UTC) the round is cancelled: stakes become Owed, fees return to Available.']) { const r = row('Rule', { gap: 8, align: 'MIN' }); add(r, await IC('info', 16, 'icon/muted'), await T(t, 'Body/S', 'text/secondary', { w: 300 })); add(fb, [r, 'FILL']); }
add(main, [fb, 'FILL']);
await mfoot(main);
await sticky(f, [await BTN('Secondary', 'Notify me when settled', { size: 'L', lead: 'bell' })]);
await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
R.push({ id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) });
} catch (e) { R.push({ part: 'm08', err: String(e && e.message || e).slice(0, 240) }); }
