const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-10] Entry History / 390 / Default';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 1140, 160);
add(main, [await mhead('Global Pool', 'Entry history', 'Every entry you bought, what you paid and what happened to it. 10.00 USDT + 0.05 USDT fee per entry.'), 'FILL']);
add(main, [await mtabs('My entries'), 'FILL']);
const sm = card('Card — Summary', { p: 16, gap: 10 });
const g = AL('HORIZONTAL', { name: 'Summary grid', gap: 12, wrap: true, cgap: 12 });
for (const [l, v, u, c] of [['Qualifying entries', '1,284', 'lifetime', 'text/primary'], ['Fees paid', '64.20', 'USDT · 1,284 × 0.05', 'text/primary'], ['In the draw', '35', 'entries · #1,248', 'text/primary'], ['Refund owed', '300.00', 'USDT · #1,245', 'balance/owed']]) { const t = col('Stat ' + l, { gap: 2, w: 151 }); t.primaryAxisSizingMode = 'AUTO'; add(t, await T(l.toUpperCase(), 'Overline', 'text/tertiary'), await T(v, 'Number/M', c), await T(u, 'Caption', 'text/secondary')); add(g, t); }
add(sm, [g, 'FILL']); const dm = row('Demo', { gap: 6 }); add(dm, await DEMO('XS'), await T('Illustrative account values', 'Caption', 'text/tertiary')); add(sm, dm); add(main, [sm, 'FILL']);
const ch = AL('HORIZONTAL', { name: 'Status chips (scroll)', gap: 8, clip: true }); for (const [l, x] of [['All', 1], ['In the draw', 0], ['Won', 0], ['Not selected', 0], ['Refunded', 0]]) add(ch, await I(C.CHIP, { State: x ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); add(main, [ch, 'FILL']);
const list = col('Purchase cards', { gap: 12 });
const P = [
  ['#1,248', '27 Nov 2026, 18:05 UTC', ['Pending', 'In the draw'], [['Entries', '35 · E-1248-00981 … 01015', { vs: 'Mono/S' }], ['Paid', '351.75 (350.00 + 1.75 fee)'], ['Outcome', 'Draws today 20:00 UTC']]],
  ['#1,247', '26 Nov 2026, 12:40 UTC', ['Neutral', 'Not selected'], [['Entries', '__E1247__ · __R1247S__', { vs: 'Mono/S' }], ['Paid', '__P1247__ (__F1247__)'], ['Outcome', '0.00 USDT']]],
  ['#1,246', '25 Nov 2026, 19:12 UTC', ['Neutral', 'Not selected'], [['Entries', '__E1246__ · __R1246S__', { vs: 'Mono/S' }], ['Paid', '__P1246__ (__F1246__)'], ['Outcome', '0.00 USDT']]],
  ['#1,245', '24 Nov 2026, 14:22 UTC', ['Pending', 'Refund owed'], [['Entries', '30 · E-1245-00383 … 00412', { vs: 'Mono/S' }], ['Paid', '301.50 (300.00 + 1.50 fee)'], ['Outcome', '+301.50 · 300.00 owed', { vc: 'balance/owed' }]]],
  ['#1,244', '23 Nov 2026, 16:12 UTC', ['Approved', 'Won · runner-up'], [['Entries', '20 · E-1244-11803 … 11822', { vs: 'Mono/S' }], ['Paid', '201.00 (200.00 + 1.00 fee)'], ['Outcome', '+3,620.60 USDT', { vc: 'text/gold', demo: true }]]]];
for (const [r, d, b, kvs] of P) { const c = await mcard('Round ' + r, await badge(b[0], b[1]), kvs, { sub: d }); add(list, [c, 'FILL']); }
add(main, [list, 'FILL']);
add(main, [await BTN('Secondary', 'Load 20 more', { size: 'L' }), 'FILL']);
add(main, [await mnote('Entries in a cancelled round never qualify: their stakes become Owed and their fees go straight back to Available. You can lose your stake in rounds that draw.'), 'FILL']);
const rg = card('RG — participation limit', { p: 16, gap: 8 }); const rt = row('Head', { gap: 8 }); add(rt, await IC('shield', 20, 'icon/brand'), await T('Daily participation limit', 'Body/S Strong', 'text/primary'), [spacer(), 'FILL'], await DEMO('XS'));
const bar = AL('HORIZONTAL', { name: 'Usage bar', h: 8, fill: 'surface/raised', r: 9999, clip: true }); const fb = rect(229, 8, 'status/warning', 0, 'Used 70%'); add(bar, fb);
const rb = row('Actions', { gap: 8 }); add(rb, await BTN('Secondary', 'Change limit', { size: 'S' }), await BTN('Ghost', 'Take a break', { size: 'S' }));
add(rg, [rt, 'FILL'], await T('351.75 of 500.00 USDT used today · resets 00:00 UTC', 'Caption', 'text/secondary'), [bar, 'FILL'], rb); add(main, [rg, 'FILL']);
await mfoot(main); await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
