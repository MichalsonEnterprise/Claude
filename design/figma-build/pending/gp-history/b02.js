const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-08] Round History / 1440 / Filters';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 120, colY(120));
add(main, [await phead(['Global Pool', 'Round history'], 'Round history', 'Every Global Pool round with its pool, result and on-chain proof. A new round opens daily at 08:00 UTC and draws at 20:00 UTC with Chainlink VRF.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Ghost', 'How draws work', { lead: 'help-circle' })]), 'FILL']);
add(main, [await subnav('Round history'), 'FILL']);
const tb = row('Toolbar', { gap: 8 });
const srch = await I(C.SRCH, { Size: 'M', State: 'Default' }, { 'Show shortcut': false }); await O(srch, { 'Value text': 'Search round # or VRF request ID' }, 'srch'); add(tb, srch); srch.resize(240, srch.height);
for (const [l, s] of [['All rounds', 0], ['Open', 0], ['Settled', 1], ['Cancelled', 1]]) add(tb, await I(C.CHIP, { State: s ? 'Selected' : 'Default' }, { Label: l, 'Show icon': false }));
add(tb, await I(C.CHIP, { State: 'Selected' }, { Label: 'Rounds I entered', 'Show icon': true, Icon: ICONS.user }));
const fb = await I(C.FBTN, { State: 'Active' }, { Label: 'Filters' }); setP(nest(fb, 'Count'), { Count: '3' }, 'fcount');
add(tb, [spacer(), 'FILL'], await BTN('Secondary', '23–25 Nov 2026', { lead: 'calendar' }), fb);
add(main, [tb, 'FILL']);
const ap = row('Applied filters', { gap: 8 });
for (const l of ['Status: Settled, Cancelled', 'Rounds I entered', 'Date: 23–25 Nov 2026']) add(ap, await I(C.SCHIP, {}, { Label: l, Removable: true }));
add(ap, await BTN('Ghost', 'Clear all', { size: 'S' }), [spacer(), 'FILL'], await T('3 of 1,248 rounds match', 'Body/S', 'text/secondary'), await DEMO('XS'));
add(main, [ap, 'FILL']);
const cols = [{ h: 'Round', w: 140, sort: 'Desc' }, { h: 'Status', w: 132 }, { h: 'Participants', w: 140 }, { h: 'Pool', w: 172, right: 1 }, { h: 'Result', w: 'F' }, { h: 'Your entries', w: 176 }, { h: '', w: 72 }];
const rows = [
  { key: '#1,246', c: [{ p: '#1,246', s: 'Wed 25 Nov 2026' }, { st: 'Confirmed', lab: 'Settled' }, { p: '3,104', s: '16,842 entries' }, { amt: '168,420.00' }, { p: '1st @mira.sol · 84,210.00 USDT', s: 'Settled 25 Nov 2026, 20:02 UTC' }, { p: '__E1246__ entries', s: 'Not selected' }, { act: 1 }] },
  { key: '#1,245', c: [{ p: '#1,245', s: 'Tue 24 Nov 2026' }, { st: 'Expired', lab: 'Cancelled' }, { p: '412 / 500', s: '4,120 entries' }, { amt: '41,200.00' }, { p: 'Cancelled — threshold not met', s: 'Stakes and fees refunded to all 412 players' }, { p: '30 entries', s: 'Refund 300.00 owed', sc: 'balance/owed' }, { act: 1 }] },
  { key: '#1,244', c: [{ p: '#1,244', s: 'Mon 23 Nov 2026' }, { st: 'Confirmed', lab: 'Settled' }, { p: '3,287', s: '18,103 entries' }, { amt: '181,030.00' }, { p: '1st @kestrel · 90,515.00 USDT', s: 'Settled 23 Nov 2026, 20:02 UTC' }, { p: '20 entries', s: 'Runner-up · +3,620.60', sc: 'text/gold' }, { act: 1 }] }];
const pg = await I(C.PAG, { Type: 'Load more' }); await O(pg, { Range: 'Showing all 3 matching rounds' }, 'pg'); await btnLabel(pg, 'Button/Secondary — Load 20 more', 'No older matches');
const tbl = await table(cols, rows, 'Table — Round history (filtered)', pg);
setP(nest(pg, 'Button/Secondary — Load 20 more'), { State: 'Disabled' }, 'pgbtn');
const tw = col('Round history table', { gap: 12 }); add(tw, [await ttl('Filtered rounds', { s: 'Heading/H5', ds: 'M', right: [await T('Times in UTC · updates live', 'Caption', 'text/tertiary')] }), 'FILL'], [tbl, 'FILL'], await note('Filters apply to the list and to Export CSV. Your filters are kept for this session only.', { w: 860 }));
add(main, [tw, 'FILL']);
await foot(main);
// open filter popover anchored under the Filters button
const pop = AL('VERTICAL', { name: 'Popover — Filter rounds', p: 20, gap: 16, fill: 'surface/overlay', stroke: 'border/subtle', r: 14, w: 360 }); pop.primaryAxisSizingMode = 'AUTO'; await fx(pop, 'Elevation/3 — Popover');
add(pop, [await ttl('Filter rounds', { demo: false, right: [await BTN('Ghost', 'Reset', { size: 'S' })] }), 'FILL']);
async function grp(label, kids, wrap) { const g = col('Group ' + label, { gap: 8 }); add(g, await T(label, 'Overline', 'text/tertiary')); const k = AL(wrap ? 'HORIZONTAL' : 'VERTICAL', { name: 'Options', gap: 8, wrap: !!wrap, cgap: 8 }); for (const x of kids) add(k, x); add(g, [k, 'FILL']); add(pop, [g, 'FILL']); }
await grp('Status', [await I(C.CBX, { Value: 'Unchecked', State: 'Default' }, { Label: 'Open', 'Show description': false }), await I(C.CBX, { Value: 'Unchecked', State: 'Default' }, { Label: 'Drawing', 'Show description': false }), await I(C.CBX, { Value: 'Checked', State: 'Default' }, { Label: 'Settled', 'Show description': false }), await I(C.CBX, { Value: 'Checked', State: 'Focus' }, { Label: 'Cancelled', 'Show description': false })]);
await grp('My participation', [await I(C.RAD, { Selected: 'No', State: 'Default' }, { Label: 'All rounds', 'Show description': false }), await I(C.RAD, { Selected: 'Yes', State: 'Default' }, { Label: 'Rounds I entered', 'Show description': false }), await I(C.RAD, { Selected: 'No', State: 'Default' }, { Label: 'Rounds I won a prize in', 'Show description': false })]);
await grp('Pool size', [await I(C.CHIP, { State: 'Selected' }, { Label: 'Any', 'Show icon': false }), await I(C.CHIP, { State: 'Default' }, { Label: 'Under 50,000', 'Show icon': false }), await I(C.CHIP, { State: 'Default' }, { Label: '50,000–150,000', 'Show icon': false }), await I(C.CHIP, { State: 'Default' }, { Label: 'Over 150,000', 'Show icon': false })], true);
const dr = await I(C.DR, { State: 'Default' }, { Label: 'Round date' }); await O(dr, { '~20 Nov 2026': '23 Nov 2026', '~27 Nov 2026': '25 Nov 2026' }, 'dr');
await grp('Round date', [dr]); dr.layoutSizingHorizontal = 'FILL';
const pf = row('Popover footer', { gap: 8 }); const ap2 = await BTN('Primary', 'Show 3 rounds'); add(pf, await BTN('Secondary', 'Cancel'), [ap2, 'FILL']); add(pop, [pf, 'FILL']);
add(main, pop); pop.layoutPositioning = 'ABSOLUTE';
pop.x = 32 + 1136 - 360; pop.y = tb.y + tb.height + 8;
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), pop: pop.id, MISS: MISS.slice(0, 30) };
