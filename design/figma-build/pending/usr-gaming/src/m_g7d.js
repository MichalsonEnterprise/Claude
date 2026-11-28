// [USR-G7] Favourites / 390 / Default — section-local x=3180, y=160
const S = await shellG('[USR-G7] Favourites / 390 / Default', 'Favourites', 'Favourites', 'Games you pinned with the heart, ready to open in one tap. Remove a game at any time — nothing else changes.', { count: '6' });
const C = S.C;
// Pinned Global Pool
const pc = card('Card — Pinned: Global Pool', { gap: 12, p: 16, stroke: 'border/gold' }); add(C, [pc, 'FILL']);
const ph = AL('HORIZONTAL', { name: 'Head', gap: 12, align: 'CENTER' }); add(pc, [ph, 'FILL']);
ph.appendChild(await thumbArt('Global Pool', 0.3));
const pt = AL('VERTICAL', { name: 'Text', gap: 2 }); add(ph, [pt, 'FILL']);
const pr = AL('HORIZONTAL', { name: 'Overline row', gap: 6, align: 'CENTER' }); pt.appendChild(pr); pr.appendChild(await IC('heart', 14, 'icon/brand')); pr.appendChild(await overline('Pinned'));
add(pt, [await T('Global Pool', 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL']);
add(pt, [await T('Round #1,248 · Open · entries close 27 Nov 2026, 20:00 UTC', 'Body/S', 'text/secondary', { w: 200 }), 'FILL']);
ph.appendChild(await DEMO('XS'));
const pa = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(pc, [pa, 'FILL']);
add(pa, [await T('You have 35 entries in this round · 351.75 USDT', 'Caption', 'text/tertiary', { w: 200 }), 'FILL']);
pa.appendChild(await BTN('Secondary', 'Open', { size: 'M', trail: 'arrow-right' }));
// Favourite games
const fg = AL('VERTICAL', { name: 'Your favourite games', gap: 12 }); add(C, [fg, 'FILL']);
add(fg, [await secHead('Your favourite games', { sub: '6 games · player counts are live', demo: true }), 'FILL']);
add(fg, [await chipRow([['All · 6', true], ['Originals · 3', false], ['Table · 2', false], ['Slots · 1', false]], { name: 'Category chips (scroll)' }), 'FILL']);
const grid = AL('HORIZONTAL', { name: 'Favourites grid (2 columns)', gap: 16, wrap: true, cgap: 16, w: 358 }); add(fg, [grid, 'FILL']);
for (const [g, pl, he, last] of [['Orbit Rush', '1,062', 'House edge 1.00%', 'Played today, 16:37 UTC'], ['Pool Dice', '66', 'House edge 1.00%', 'Played today, 16:41 UTC'], ['Twenty-One', '92', 'House edge ≈0.50%', 'Played today, 16:22 UTC'], ['Pool Roulette', '128', 'House edge 2.70%', 'Played today, 16:08 UTC'], ['Vault Sweeper', '146', 'House edge 1.00%', 'Played today, 16:17 UTC'], ['Neon Koi', '57', 'RTP 96.0–96.7%', 'Played 24 Nov 2026']]) {
  const it = AL('VERTICAL', { name: 'Favourite — ' + g, gap: 4, w: 171 }); grid.appendChild(it);
  it.appendChild(await tileG(g, pl, he, { scale: 171 / 160 }));
  const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 4, align: 'CENTER' }); add(it, [mr, 'FILL']);
  add(mr, [await T(last, 'Caption', 'text/tertiary', { w: 110 }), 'FILL']); mr.appendChild(await heartBtn(true));
}
// Reminders (off by default)
const rm = card('Card — Optional reminders', { gap: 12, p: 16 }); add(C, [rm, 'FILL']);
add(rm, [await T('Optional reminders — off unless you turn them on', 'Body/M Strong', 'text/primary', { w: 326 }), 'FILL']);
for (const [lab, desc] of [['Tournament starts', 'Tell me when a weekly tournament starts on a pinned game.'], ['Round closing', 'Remind me 30 min before a Global Pool round I joined closes.']]) {
  const tg = await I('20:3309', { On: 'No', State: 'Default' }, { Label: lab, Description: desc, 'Show description': true }); add(rm, [tg, 'FILL']);
}
add(rm, [await noteBox('info', 'Reminders never auto-enter you in a round, and they pause automatically during a cooling-off period or self-exclusion.', 'info', 326), 'FILL']);
// Suggestions
const sg = AL('VERTICAL', { name: 'You might also like', gap: 12 }); add(C, [sg, 'FILL']);
add(sg, [await secHead('You might also like', { link: 'Lobby', demo: true }), 'FILL']);
const car = AL('HORIZONTAL', { name: 'Carousel (scrolls horizontally)', gap: 12, w: 358, clip: true }); add(sg, [car, 'FILL']);
for (const [g, pl, he, tag] of [['Skyline', '206', 'House edge 1.00%', 'NEW'], ['Pinfall', '100', 'House edge 1.00%', null], ['Fortune Ring', '34', 'House edge 1.00%', null]]) {
  const it = AL('VERTICAL', { name: 'Item — ' + g, gap: 4 }); car.appendChild(it);
  it.appendChild(await tileG(g, pl, he, { tag })); const mr = AL('HORIZONTAL', { name: 'Meta row', gap: 4, align: 'CENTER' }); add(it, [mr, 'FILL']); add(mr, [await T('Originals', 'Caption', 'text/tertiary'), 'FILL']); mr.appendChild(await heartBtn(false));
}
add(sg, [await T('Suggestions are based only on the games you play here. Every Original shows its house edge, and pinning a game never changes its odds.', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']);
await endG(S, 'Games');
await placeG(S.f, 3180, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: S.f.name, h: Math.round(S.f.height), section: sec.id };
