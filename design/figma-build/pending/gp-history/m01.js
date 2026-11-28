const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile C', 175000, 0);
const NAME = '[GP-08] Round History / 390 / Default';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await mshell(NAME, 120, 160);
add(main, [await mhead('Global Pool', 'Round history', 'Every round with its pool, result and proof. A round opens daily at 08:00 UTC and draws at 20:00 UTC.'), 'FILL']);
add(main, [await mtabs('Round history'), 'FILL']);
const tb = row('Search + filter', { gap: 8 }); const s = await I(C.SRCH, { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); await O(s, { 'Value text': 'Round # or request ID' }, 'srch'); add(tb, [s, 'FILL']); add(tb, await I(C.FBTN, { State: 'Default' }, { Label: 'Filters' })); add(main, [tb, 'FILL']);
const ch = AL('HORIZONTAL', { name: 'Status chips (scroll)', gap: 8, clip: true }); for (const [l, x] of [['All rounds', 1], ['Open', 0], ['Settled', 0], ['Cancelled', 0], ['Rounds I entered', 0]]) add(ch, await I(C.CHIP, { State: x ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false })); add(main, [ch, 'FILL']);
const list = col('Round cards', { gap: 12 });
const c48 = await I(C.CR, { Status: 'Open' });
const c47 = await I(C.CR, { Status: 'Settled' });
const c46 = await I(C.CR, { Status: 'Settled' }); await O(c46, { '~#1,247': '#1,246', '~172,950.00': '168,420.00', '~3,198': '3,104', '~17,295': '16,842', '~26 Nov 2026': '25 Nov 2026', Initials: 'MS', '~@orbit_77': '@mira.sol', '~86,475.00': '84,210.00' }, 'c46');
const c45 = await I(C.CR, { Status: 'Cancelled' }); await O(c45, { '~29,640.00': '41,200.00', '~2,964': '4,120' }, 'c45');
const c44 = await I(C.CR, { Status: 'Settled' }); await O(c44, { '~#1,247': '#1,244', '~172,950.00': '181,030.00', '~3,198': '3,287', '~17,295': '18,103', '~26 Nov 2026': '23 Nov 2026', Initials: 'KE', '~@orbit_77': '@kestrel', '~86,475.00': '90,515.00' }, 'c44');
async function mine(t, c) { const r = row('Your entries', { gap: 8, p: [10, 12, 10, 12], fill: 'surface/raised', r: 10 }); add(r, await IC('ticket', 16, 'icon/muted'), await T(t, 'Body/S Strong', c || 'text/primary'), [spacer(), 'FILL'], await DEMO('XS')); return r; }
for (const [cr, t, c] of [[c48, '35 entries · 351.75 USDT · in the draw'], [c47, '__E1247__ entries · not selected'], [c46, '__E1246__ entries · not selected'], [c45, '30 entries · refund 300.00 owed', 'balance/owed'], [c44, '20 entries · runner-up +3,620.60', 'text/gold']]) { const w = col('Round item', { gap: 8 }); add(w, [cr, 'FILL'], [await mine(t, c), 'FILL']); add(list, [w, 'FILL']); }
add(main, [list, 'FILL']);
const lm = await BTN('Secondary', 'Load older rounds', { size: 'L' }); add(main, [lm, 'FILL']);
add(main, [await mnote('A round is cancelled automatically if fewer than 500 players or less than 50,000.00 USDT are in at close. Stakes and fees are then returned — nothing to claim.'), 'FILL']);
await mfoot(main); await mtab(f);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { sec: sec.id, id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30), o48: c48.findAll(x => x.type === 'TEXT').map(t => t.characters.slice(0, 40)).slice(0, 24) };
