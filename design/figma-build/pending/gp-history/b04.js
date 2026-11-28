const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-10] Entry History / 1440 / Default';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'My entries', 3240, 160);
add(main, [await phead(['Global Pool', 'Entry history'], 'Entry history', 'Every entry you bought, what you paid for it and what happened to it. Each entry costs 10.00 USDT plus a 0.05 USDT platform fee and is paid from your platform balance.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Ghost', 'Set a participation limit', { lead: 'shield' })]), 'FILL']);
add(main, [await subnav('My entries'), 'FILL']);
const sr = row('Summary', { gap: 16, align: 'MIN' });
for (const s of [['Qualifying entries · lifetime', '1,284', 'entries', '35 in the draw now', 'Round #1,248 closes 20:00 UTC'], ['Platform fees paid · lifetime', '64.20', 'USDT', '1,284 × 0.05', 'Never added to a pool'], ['Prizes won · last 5 rounds', '3,620.60', 'USDT', 'Runner-up #1,244', 'Settled to Available'], ['Refund owed', '300.00', 'USDT', '#1,245 cancelled', 'Settles 27 Nov, 21:00 UTC']]) add(sr, [await stat(...s), 'FILL']);
add(main, [sr, 'FILL']);
const tb = row('Toolbar', { gap: 8 });
const srch = await I(C.SRCH, { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); await O(srch, { 'Value text': 'Search entry ID, e.g. E-1248-00981' }, 'srch'); add(tb, srch); srch.resize(300, srch.height);
for (const [l, s] of [['All', 1], ['In the draw', 0], ['Won', 0], ['Not selected', 0], ['Refunded', 0]]) add(tb, await I(C.CHIP, { State: s ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false }));
add(tb, [spacer(), 'FILL'], await BTN('Secondary', '23–27 Nov 2026', { lead: 'calendar' }), await I(C.FBTN, { State: 'Default' }, { Label: 'Filters' }));
add(main, [tb, 'FILL']);
// expanded detail for the open purchase
const det = AL('HORIZONTAL', { name: 'Detail panel — purchase #1,248', p: [20, 24, 20, 24], gap: 24, fill: 'surface/default' }); strokeSides(det, 'border/subtle', { b: 1 });
const dc = col('Purchase facts', { gap: 12 });
const hs = await I(C.HASH, { State: 'Default' }, { Hash: '0x3a7c…9e02', 'Show explorer link': true });
add(dc, await T('PURCHASE RECEIPT', 'Overline', 'text/tertiary'), [await lv('Paid from', 'Available balance · network fee 0.00'), 'FILL'], [await lv('Odds · 35 of 18,640 entries', '1st ≈ 0.188% · any prize ≈ 2.44%', { demo: true, w: 190 }), 'FILL'], [await lv('Purchase reference', '', { node: hs }), 'FILL']);
const rk = row('Risk', { gap: 8, align: 'MIN' }); add(rk, await IC('alert-triangle', 16, 'status/warning'), await T('You can lose your stake. Entries are final once bought and are drawn by Chainlink VRF.', 'Body/S', 'text/warning', { w: 200 })); add(dc, [rk, 'FILL']);
add(det, await I(C.TK, { State: 'Active' }), await I(C.FEE, { Type: 'Entry' }), [dc, 'FILL']);
const cols = [{ h: 'Bought', w: 150, sort: 'Desc' }, { h: 'Round', w: 120 }, { h: 'Entries', w: 'F' }, { h: 'Paid', w: 168 }, { h: 'Status', w: 156 }, { h: 'Outcome', w: 168, right: 1 }, { h: '', w: 88 }];
const rows = [
  { key: '#1,248', fill: 'surface/selected', c: [{ p: '27 Nov 2026', s: '14:06 UTC', date: 1 }, { p: '#1,248', s: 'Open' }, { p: '35 entries', s: 'E-1248-00981 … E-1248-01015', ss: 'Mono/S' }, { p: '351.75 USDT', s: '350.00 + 1.75 fee' }, { st: 'Pending', lab: 'In the draw' }, { p: 'Draws 20:00 UTC', s: 'Today · VRF' }, { act: 1, exp: 1 }], after: det },
  { key: '#1,247', c: [{ p: '26 Nov 2026', s: '10:15 UTC', date: 1 }, { p: '#1,247', s: 'Settled' }, { p: '__E1247__ entries', s: '__R1247__', ss: 'Mono/S' }, { p: '__P1247__ USDT', s: '__F1247__' }, { st: 'Neutral', lab: 'Not selected' }, { amt: '0.00', sign: 'Neutral' }, { act: 1, exp: 0 }] },
  { key: '#1,246', c: [{ p: '25 Nov 2026', s: '12:31 UTC', date: 1 }, { p: '#1,246', s: 'Settled' }, { p: '__E1246__ entries', s: '__R1246__', ss: 'Mono/S' }, { p: '__P1246__ USDT', s: '__F1246__' }, { st: 'Neutral', lab: 'Not selected' }, { amt: '0.00', sign: 'Neutral' }, { act: 1, exp: 0 }] },
  { key: '#1,245', c: [{ p: '24 Nov 2026', s: '09:40 UTC', date: 1 }, { p: '#1,245', s: 'Cancelled' }, { p: '30 entries', s: 'E-1245-00383 … E-1245-00412', ss: 'Mono/S' }, { p: '301.50 USDT', s: '300.00 + 1.50 fee' }, { st: 'Pending', lab: 'Refund owed' }, { p: '+301.50 USDT', s: '300.00 owed · 1.50 returned', pc: 'balance/owed' }, { act: 1, exp: 0 }] },
  { key: '#1,244', c: [{ p: '23 Nov 2026', s: '16:12 UTC', date: 1 }, { p: '#1,244', s: 'Settled' }, { p: '20 entries', s: 'E-1244-11803 … E-1244-11822', ss: 'Mono/S' }, { p: '201.00 USDT', s: '200.00 + 1.00 fee' }, { st: 'Approved', lab: 'Won · runner-up' }, { amt: '+3,620.60', sign: 'Positive' }, { act: 1, exp: 0 }] }];
const pg = await I(C.PAG, { Type: 'Load more' }); await O(pg, { Range: 'Showing 5 of 64 purchases (1,284 qualifying entries)' }, 'pg');
const tbl = await table(cols, rows, 'Table — Entry history', pg);
const tw = col('Entry history table', { gap: 12 }); add(tw, [await ttl('Purchases', { ds: 'M', right: [await T('Newest first · times in UTC', 'Caption', 'text/tertiary')] }), 'FILL'], [tbl, 'FILL'], await note('Only entries in rounds that draw count as qualifying and pay the 0.05 USDT fee. Entries in a cancelled round never qualify: their stakes become Owed and their fees go straight back to Available.', { w: 880 }));
add(main, [tw, 'FILL']);
// RG limit strip
const rg = card('RG — participation limit', { p: [16, 20, 16, 20] }); rg.layoutMode = 'HORIZONTAL'; rg.counterAxisAlignItems = 'CENTER'; gap(rg, 16);
const rgc = col('Limit text', { gap: 8 }); const rgt = row('Limit head', { gap: 8 }); add(rgt, await T('Daily participation limit', 'Body/M Strong', 'text/primary'), await T('351.75 of 500.00 USDT used today · resets 00:00 UTC', 'Body/S', 'text/secondary'), await DEMO('XS'));
const bar = AL('HORIZONTAL', { name: 'Usage bar', h: 8, fill: 'surface/raised', r: 9999, clip: true }); const fillb = rect(10, 8, 'status/warning', 0, 'Used 70%'); add(bar, fillb);
add(rgc, rgt, [bar, 'FILL']);
add(rg, await IC('shield', 24, 'icon/brand'), [rgc, 'FILL'], await I(C.B18), await BTN('Secondary', 'Change limit', { size: 'S' }), await BTN('Ghost', 'Take a break', { size: 'S' }));
add(main, [rg, 'FILL']); fillb.resize(Math.max(40, Math.round(bar.width * 0.7035)), 8);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
