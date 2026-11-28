const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-08] Round History / 1440 / Default';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 120, 160);
add(main, [await phead(['Global Pool', 'Round history'], 'Round history', 'Every Global Pool round with its pool, result and on-chain proof. A new round opens daily at 08:00 UTC and draws at 20:00 UTC with Chainlink VRF.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Ghost', 'How draws work', { lead: 'help-circle' })]), 'FILL']);
add(main, [await subnav('Round history'), 'FILL']);
const sr = row('Summary', { gap: 16, align: 'MIN' });
for (const s of [['Current round', '#1,248', 'Open', 'Draws 20:00 UTC', 'Closes 27 Nov 2026, 20:00 UTC'], ['Prizes paid · last 3 draws', '522,400.00', 'USDT', '100% of pools', '#1,244 · #1,246 · #1,247'], ['Cancelled · last 5 rounds', '1', 'round', '#1,245', 'Stakes and fees refunded'], ['Your result · last 5 rounds', '+3,620.60', 'USDT', 'Runner-up #1,244', '__ENTERED__']]) add(sr, [await stat(...s), 'FILL']);
add(main, [sr, 'FILL']);
const tb = row('Toolbar', { gap: 8 });
const srch = await I(C.SRCH, { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); await O(srch, { 'Value text': 'Search round # or VRF request ID' }, 'srch'); add(tb, srch); srch.resize(300, srch.height);
for (const [l, s] of [['All rounds', 1], ['Open', 0], ['Settled', 0], ['Cancelled', 0]]) add(tb, await I(C.CHIP, { State: s ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false }));
add(tb, await I(C.CHIP, { State: 'Default' }, { Label: 'Rounds I entered', 'Show icon': true, Icon: ICONS.user }));
add(tb, [spacer(), 'FILL'], await BTN('Secondary', '23–27 Nov 2026', { lead: 'calendar' }), await I(C.FBTN, { State: 'Default' }, { Label: 'Filters' }));
add(main, [tb, 'FILL']);
const cols = [{ h: 'Round', w: 140, sort: 'Desc' }, { h: 'Status', w: 132 }, { h: 'Participants', w: 140 }, { h: 'Pool', w: 172, right: 1 }, { h: 'Result', w: 'F' }, { h: 'Your entries', w: 176 }, { h: '', w: 72 }];
const rows = [
  { key: '#1,248', c: [{ p: '#1,248', s: 'Fri 27 Nov 2026' }, { st: 'Live', lab: 'Open' }, { p: '3,412', s: '18,640 entries' }, { amt: '186,400.00' }, { p: 'Draws 27 Nov 2026, 20:00 UTC', s: 'Closes in 03 h 17 m · threshold met' }, { p: '35 entries', s: '351.75 USDT · in the draw' }, { act: 1 }] },
  { key: '#1,247', c: [{ p: '#1,247', s: 'Thu 26 Nov 2026' }, { st: 'Confirmed', lab: 'Settled' }, { p: '3,198', s: '17,295 entries' }, { amt: '172,950.00' }, { p: '1st @orbit_77 · 86,475.00 USDT', s: 'Settled 26 Nov 2026, 20:02 UTC' }, { p: '__E1247__ entries', s: 'Not selected' }, { act: 1 }] },
  { key: '#1,246', c: [{ p: '#1,246', s: 'Wed 25 Nov 2026' }, { st: 'Confirmed', lab: 'Settled' }, { p: '3,104', s: '16,842 entries' }, { amt: '168,420.00' }, { p: '1st @mira.sol · 84,210.00 USDT', s: 'Settled 25 Nov 2026, 20:02 UTC' }, { p: '__E1246__ entries', s: 'Not selected' }, { act: 1 }] },
  { key: '#1,245', c: [{ p: '#1,245', s: 'Tue 24 Nov 2026' }, { st: 'Expired', lab: 'Cancelled' }, { p: '412', s: 'min 500 · 4,120 entries' }, { amt: '41,200.00' }, { p: 'Cancelled — threshold not met', s: 'Stakes and fees refunded to all 412 players' }, { p: '30 entries', s: 'Refund 300.00 owed', sc: 'balance/owed' }, { act: 1 }] },
  { key: '#1,244', c: [{ p: '#1,244', s: 'Mon 23 Nov 2026' }, { st: 'Confirmed', lab: 'Settled' }, { p: '3,287', s: '18,103 entries' }, { amt: '181,030.00' }, { p: '1st @kestrel · 90,515.00 USDT', s: 'Settled 23 Nov 2026, 20:02 UTC' }, { p: '20 entries', s: 'Runner-up · +3,620.60 USDT', sc: 'text/gold' }, { act: 1 }] }];
const pg = await I(C.PAG, { Type: 'Load more' }); await O(pg, { Range: 'Showing 5 most recent of 1,248 rounds' }, 'pg'); await btnLabel(pg, 'Button/Secondary — Load 20 more', 'Load 10 older rounds');
const tbl = await table(cols, rows, 'Table — Round history', pg);
const tw = col('Round history table', { gap: 12 }); add(tw, [await ttl('All rounds', { s: 'Heading/H5', ds: 'M', right: [await T('Times in UTC · updates live', 'Caption', 'text/tertiary')] }), 'FILL'], [tbl, 'FILL'], await note('A round is cancelled automatically if, at close, it has fewer than 500 players or less than 50,000.00 USDT in the pool. Every stake and platform fee is then returned — there is nothing to claim.', { link: 'Refund rules', w: 860 }));
add(main, [tw, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { sec: sec.id, id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
