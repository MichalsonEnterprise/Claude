const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = section('USR-RG1..RG7 Responsible gaming', 60000, 0);
const NAME = '[USR-RG3] Participation Limits / 1440 / Default';
const old = byName(sec, NAME); if (old) old.remove();
const S = await shellD(NAME, 'Participation limits', { title: 'Participation limits', sub: 'Cap what you spend on Global Pool entries and game stakes, and how much you can lose, each day. When a limit is reached, new entries and bets pause until it resets.' });
const C = S.C; const MW = 672; const RW = 440; const { m, rail } = cols(C, RW);
const ls = await I('23:21988', { Type: 'Participation', State: 'Default' }); add(m, [ls, 'FILL']); ls.name = 'RG/Limit Setter — Participation';
// loss limit card
const lc = card('Card — Daily loss limit', { gap: 16, p: 24 }); add(m, [lc, 'FILL']);
const lh = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER' }); add(lc, [lh, 'FILL']); lh.appendChild(await iconTile('trending-down'));
const lht = AL('VERTICAL', { name: 'Title', gap: 2 }); add(lh, [lht, 'FILL']); lht.appendChild(await T('Daily loss limit', 'Heading/H5', 'text/primary')); lht.appendChild(await T('Net result = winnings minus stakes and entry costs, since 00:00 UTC', 'Body/S', 'text/tertiary'));
lh.appendChild(await chip('check-circle', 'On', 'success'));
const lv = AL('HORIZONTAL', { name: 'Values', gap: 32 }); add(lc, [lv, 'FILL']);
async function stat(label, value, color = 'text/primary') { const s = AL('VERTICAL', { name: 'Stat — ' + label, gap: 4 }); s.appendChild(await T(label, 'Caption', 'text/tertiary')); const r = AL('HORIZONTAL', { name: 'Value', gap: 8, align: 'CENTER' }); s.appendChild(r); r.appendChild(await T(value, 'Number/M', color)); r.appendChild(await DEMO('XS')); return s; }
lv.appendChild(await stat('Limit', '200.00 USDT / day')); lv.appendChild(await stat('Net result today', '−24.60 USDT', 'text/danger')); lv.appendChild(await stat('Left before pause', '175.40 USDT'));
add(lc, [meter(MW - 48, 0.123, 'brand/primary'), 'FILL']);
const lf = AL('HORIZONTAL', { name: 'Footer', gap: 12, align: 'CENTER' }); add(lc, [lf, 'FILL']); add(lf, [await T('Weekly and monthly loss limits are not set.', 'Body/S', 'text/secondary'), 'FILL']);
lf.appendChild(await BTN('Ghost', 'Add weekly limit', { size: 'S', lead: 'plus' })); lf.appendChild(await BTN('Secondary', 'Change daily limit', { size: 'S' }));
// what counts
const wc = card('Card — What counts', { gap: 16, p: 24 }); add(m, [wc, 'FILL']);
wc.appendChild(await T('What counts toward participation', 'Heading/H5', 'text/primary'));
const BW = MW - 48;
add(wc, [await bullet('pool', 'Global Pool entries', '10.00 USDT per entry plus the 0.05 USDT platform fee per qualifying entry. Network fees never apply to entries — they are paid from your balance.', BW), 'FILL']);
add(wc, [await bullet('games', 'Game stakes', 'Every stake in Originals, table, live, slot, draw and bingo games — including stakes placed with bonus funds.', BW), 'FILL']);
add(wc, [await bullet('pause-circle', 'When you reach a limit', 'New entries and bets are blocked until 00:00 UTC. Entries you already hold stay in their round, and withdrawals are never blocked.', BW, 'icon/muted'), 'FILL']);
// rail
const tg = card('Card — Today at a glance', { gap: 0, p: 24 }); add(rail, [tg, 'FILL']);
const th = AL('HORIZONTAL', { name: 'Header', gap: 12, align: 'CENTER', p: [0, 0, 8, 0] }); add(tg, [th, 'FILL']); add(th, [await T('Today at a glance', 'Heading/H5', 'text/primary'), 'FILL']); th.appendChild(await DEMO('S'));
add(tg, [await kv('Participation used', '351.75 of 500.00 USDT'), 'FILL']);
add(tg, [await kv('Participation left', '148.25 USDT'), 'FILL']);
add(tg, [await kv('Net result', '−24.60 of −200.00 USDT'), 'FILL']);
add(tg, [await kv('Limits reset', '00:00 UTC · in 7 h 18 min', { divider: false }), 'FILL']);
const help = await I('24:14743'); add(rail, [help, 'FILL']);
await footD(C);
await placeD(S.f, sec, 3240, 160);
await S.f.screenshot({ scale: 0.5 });
return { frame: S.f.id, name: NAME, h: Math.round(S.f.height), ls: ls.findAllWithCriteria({ types: ['TEXT'] }).map(t => t.characters.slice(0, 50)).slice(0, 30) };
