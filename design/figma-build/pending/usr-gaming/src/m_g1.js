// [USR-G1] My Games / 390 / Default — section-local x=120, y=160
const S = await shellG('[USR-G1] My Games / 390 / Default', 'My games', 'My games', 'Everything you play in one place — your open round, competitions in progress and the games you played recently.');
const C = S.C;
// RG session strip
const ss = card('Session strip (RG)', { gap: 8, p: 12 }); add(C, [ss, 'FILL']);
const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(ss, [r1, 'FILL']);
r1.appendChild(await IC('timer', 16, 'icon/muted')); r1.appendChild(await T('Session 00:42:18', 'Label/M', 'text/primary')); add(r1, [spacer(), 'FILL']);
r1.appendChild(await T('Net −24.60 USDT', 'Number/S', 'text/primary')); r1.appendChild(await DEMO('XS'));
ss.appendChild(meter(334, 24.6 / 200, 'brand/primary', 6));
const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(ss, [r2, 'FILL']);
add(r2, [await T('Daily loss limit 24.60 of 200.00 USDT · 175.40 left', 'Caption', 'text/tertiary', { w: 250 }), 'FILL']); r2.appendChild(await T('Limits', 'Label/S', 'text/brand'));
// In progress
const ip = AL('VERTICAL', { name: 'In progress', gap: 12 }); add(C, [ip, 'FILL']);
add(ip, [await secHead('In progress', { demo: true }), 'FILL']);
const rc = card('Card — Round #1,248 (Global Pool)', { gap: 12, p: 16, stroke: 'border/gold' }); add(ip, [rc, 'FILL']);
const h = AL('HORIZONTAL', { name: 'Head', gap: 12, align: 'CENTER' }); add(rc, [h, 'FILL']);
h.appendChild(await thumbArt('Global Pool', 0.3));
const ht = AL('VERTICAL', { name: 'Text', gap: 4 }); add(h, [ht, 'FILL']);
const hr = AL('HORIZONTAL', { name: 'Title', gap: 8, align: 'CENTER' }); ht.appendChild(hr); hr.appendChild(await T('Round #1,248', 'Body/M Strong', 'text/primary')); const lv = await BADGE('Live', 'S'); hr.appendChild(lv);
add(ht, [await T('Global Pool · 35 entries · 351.75 USDT (350.00 + 1.75 platform fee)', 'Body/S', 'text/secondary', { w: 220 }), 'FILL']);
h.appendChild(await DEMO('XS'));
const cdw = AL('HORIZONTAL', { name: 'Countdown row', gap: 12, align: 'CENTER' }); add(rc, [cdw, 'FILL']);
cdw.appendChild(await cdBoxes([['03', 'hrs'], ['17', 'min'], ['42', 'sec']]));
add(cdw, [await T('until entries close · 27 Nov 2026, 20:00:00 UTC', 'Caption', 'text/tertiary', { w: 120 }), 'FILL']);
add(rc, [await BTN('Secondary', 'Go to active round', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const tc = card('Card — Orbit Rush Sprint (tournament)', { gap: 12, p: 16 }); add(ip, [tc, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Head', gap: 12, align: 'CENTER' }); add(tc, [th, 'FILL']);
th.appendChild(await iconTile('trophy', 'icon/gold', 48));
const tt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(th, [tt, 'FILL']); add(tt, [await T('Orbit Rush Sprint', 'Body/M Strong', 'text/primary', { w: 220 }), 'FILL']); add(tt, [await T('Weekly tournament · prize pool 2,500.00 USDT', 'Body/S', 'text/secondary', { w: 220 }), 'FILL']);
th.appendChild(await DEMO('XS'));
const rk = AL('HORIZONTAL', { name: 'Rank', gap: 12, align: 'CENTER', p: 12, fill: 'surface/raised', r: 10 }); add(tc, [rk, 'FILL']);
const rkl = AL('VERTICAL', { name: 'Rank value', gap: 0 }); rk.appendChild(rkl); rkl.appendChild(await overline('Your rank')); rkl.appendChild(await T('#14', 'Number/L', 'text/primary'));
add(rk, [await T('1,284 pts · 22.50 USDT if you hold this place', 'Body/S', 'text/secondary', { w: 200 }), 'FILL']);
const te = AL('HORIZONTAL', { name: 'Ends', gap: 6, align: 'CENTER' }); add(tc, [te, 'FILL']); te.appendChild(await IC('clock', 16, 'icon/muted')); add(te, [await T('Ends Sun 29 Nov 2026, 23:59 UTC', 'Caption', 'text/tertiary', { w: 280 }), 'FILL']);
const ta = AL('HORIZONTAL', { name: 'Actions', gap: 12, align: 'CENTER' }); add(tc, [ta, 'FILL']);
ta.appendChild(await BTN('Secondary', 'Leaderboard', { size: 'M' })); ta.appendChild(await T('Terms apply', 'Label/S', 'text/brand')); add(ta, [spacer(), 'FILL']);
// Continue playing
const cps = AL('VERTICAL', { name: 'Continue playing', gap: 12 }); add(C, [cps, 'FILL']);
add(cps, [await secHead('Continue playing', { link: 'All', demo: true }), 'FILL']);
const car = AL('HORIZONTAL', { name: 'Carousel (scrolls horizontally)', gap: 12, w: 358, clip: true }); add(cps, [car, 'FILL']);
for (const [g, pl, he, last] of [['Pool Dice', '66', 'House edge 1.00%', 'Last bet 16:41 UTC'], ['Orbit Rush', '1,062', 'House edge 1.00%', 'Last bet 16:37 UTC'], ['Double Side', '48', 'House edge 2.00%', 'Last bet 16:28 UTC'], ['Twenty-One', '92', 'House edge ≈0.50%', 'Last hand 16:22 UTC'], ['Vault Sweeper', '146', 'House edge 1.00%', 'Last game 16:17 UTC']]) {
  const it = AL('VERTICAL', { name: 'Item — ' + g, gap: 6 }); car.appendChild(it);
  it.appendChild(await tileG(g, pl, he)); it.appendChild(await T(last, 'Caption', 'text/tertiary'));
}
// Your games
const yg = AL('VERTICAL', { name: 'Your games', gap: 12 }); add(C, [yg, 'FILL']);
add(yg, [await secHead('Your games', { sub: 'Last 30 days · sorted by last played', demo: true }), 'FILL']);
const tot = card('Totals — last 30 days', { gap: 12, p: 16 }); add(yg, [tot, 'FILL']);
const tr2 = AL('HORIZONTAL', { name: 'Totals', gap: 16 }); add(tot, [tr2, 'FILL']);
for (const [lab, val, unit, col] of [['Wagered', '11,000.00', 'USDT · 1,334 bets', 'text/primary'], ['Net result', '−71.80', 'USDT · all games', 'text/danger']]) {
  const m = AL('VERTICAL', { name: 'Metric — ' + lab, gap: 2 }); add(tr2, [m, 'FILL']); m.appendChild(await overline(lab)); m.appendChild(await T(val, 'Number/M', col)); m.appendChild(await T(unit, 'Caption', 'text/tertiary'));
}
add(tot, [await noteBox('info', 'Over time, the house edge means the expected result is a loss. A 1.00% edge means that for every 100.00 USDT wagered, about 1.00 USDT is expected to be lost on average.', 'info', 326), 'FILL']);
const lc = card('Game list (stacked rows)', { gap: 0, p: [4, 16, 4, 16] }); add(yg, [lc, 'FILL']);
const rows = [['Pool Dice', 'Originals · dice · edge 1.00%', 'Today 16:41'], ['Orbit Rush', 'Originals · crash · edge 1.00%', 'Today 16:37'], ['Double Side', 'Originals · coinflip · edge 2.00%', 'Today 16:28'], ['Twenty-One', 'Table · blackjack · edge ≈0.50%', 'Today 16:22'], ['Vault Sweeper', 'Originals · mines · edge 1.00%', 'Today 16:17'], ['Pool Roulette', 'Table · European · edge 2.70%', 'Today 16:08'], ['Neon Koi', 'Slots · GP Studios · RTP 96.0–96.7%', '24 Nov']];
for (let i = 0; i < rows.length; i++) {
  const [g, meta, last] = rows[i];
  const rt = AL('HORIZONTAL', { name: 'Right', gap: 4, align: 'CENTER' }); rt.appendChild(await T(last, 'Caption', 'text/secondary')); rt.appendChild(await IC('chevron-right', 20, 'icon/muted'));
  add(lc, [await listRow(g, meta, rt, { last: i === rows.length - 1 }), 'FILL']);
}
add(yg, [await BTN('Ghost', 'Open full game history', { size: 'L', trail: 'arrow-right' }), 'FILL']);
const lim = AL('HORIZONTAL', { name: 'RG prompt', gap: 12, align: 'CENTER', p: 12, fill: 'surface/default', r: 14 }); stroke(lim, 'border/subtle'); add(C, [lim, 'FILL']);
lim.appendChild(await iconTile('shield', 'icon/brand', 40)); add(lim, [await T('Results are independent — a losing streak does not make a win more likely. Set a loss or time limit any time.', 'Body/S', 'text/secondary', { w: 200 }), 'FILL']); lim.appendChild(await BTN('Secondary', 'Limits', { size: 'S' }));
await endG(S, 'Games');
await placeG(S.f, 120, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), section: sec.id };
