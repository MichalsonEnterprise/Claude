const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = section('GP-08..11/13 History & edge states', 32000, 0);
const NAME = '[GP-11] Prize Distribution breakdown / 1440 / Default (round #1,248)';
const old = sec.children.find(c => c.name === NAME); if (old) old.remove();
const { f, main } = await shell(NAME, 'Global Pool', 4800, 160);
add(main, [await phead(['Global Pool', 'Prize distribution'], 'Prize distribution', 'How the pool of round #1,248 is split between 13 winning entries. Shares are fixed in the GlobalPool contract v1.3.0; amounts follow the live pool until entries close at 20:00 UTC.', [await BTN('Secondary', 'Verify a past draw', { lead: 'shield-check' }), await BTN('Ghost', 'Contract rules', { lead: 'contract' })]), 'FILL']);
add(main, [await subnav('Prize distribution'), 'FILL']);
// pool basis
const pb = card('Card — Pool basis', { p: [20, 24, 20, 24] }); pb.layoutMode = 'HORIZONTAL'; pb.counterAxisAlignItems = 'CENTER'; gap(pb, 32);
const jc = await I('22:8356', { Size: 'M' });
const pm = col('Pool basis facts', { gap: 10 });
const pr = row('Round line', { gap: 8 }); add(pr, await T('Round #1,248', 'Heading/H5', 'text/primary'), await badge('Live', 'Open'));
add(pm, pr);
for (const [k, v] of [['Pool basis', '18,640 qualifying entries × 10.00 USDT'], ['Entries close', '27 Nov 2026, 20:00:00 UTC · in 03:17:42'], ['Final amounts', 'Fixed at close, paid at settlement (≈ 20:02 UTC)']]) add(pm, [await kv(k, v, { vw: 0 }), 'FILL']);
add(pb, jc, [pm, 'FILL']); add(main, [pb, 'FILL']);
// donut + bars
const vr = row('Row — visuals', { gap: 16, align: 'MIN' }); add(vr, await I(C.DON, { State: 'Default' }), [await I(C.PD), 'FILL']); add(main, [vr, 'FILL']);
// tiers table
const cols = [{ h: 'Prize tier', w: 220 }, { h: 'Share of pool', w: 150 }, { h: 'Winning entries', w: 150 }, { h: 'Prize per winner', w: 200, right: 1 }, { h: 'Tier total', w: 200, right: 1 }, { h: 'Chance per entry', w: 'F' }];
const rows = [
  { key: '1st', c: [{ p: '1st prize', s: 'One winning entry', pc: 'text/gold' }, '50%', '1', { amt: '93,200.00' }, { amt: '93,200.00' }, { p: '1 in 18,640', s: '≈ 0.0054%' }] },
  { key: '2nd', c: [{ p: '2nd prize', s: 'One winning entry', pc: 'text/gold' }, '20%', '1', { amt: '37,280.00' }, { amt: '37,280.00' }, { p: '1 in 18,640', s: '≈ 0.0054%' }] },
  { key: '3rd', c: [{ p: '3rd prize', s: 'One winning entry', pc: 'text/gold' }, '10%', '1', { amt: '18,640.00' }, { amt: '18,640.00' }, { p: '1 in 18,640', s: '≈ 0.0054%' }] },
  { key: 'Runner-up', c: [{ p: 'Runner-up', s: 'Ten winning entries', pc: 'text/gold' }, '2% each · 20%', '10', { amt: '3,728.00' }, { amt: '37,280.00' }, { p: '10 in 18,640', s: '≈ 0.054%' }] },
  { key: 'Total', fill: 'surface/default', c: [{ p: 'Total', s: 'Whole pool is paid out' }, '100%', '13', { p: '—' }, { amt: '186,400.00' }, { p: '13 in 18,640', s: '≈ 0.070% for any prize' }] }];
const tw = col('Tiers', { gap: 12 }); add(tw, [await ttl('Prize tiers', { ds: 'M', right: [await T('Live · recalculates on every new entry', 'Caption', 'text/tertiary')] }), 'FILL'], [await table(cols, rows, 'Table — Prize tiers'), 'FILL']); add(main, [tw, 'FILL']);
// three explainer cards
const ec = row('Row — explainers', { gap: 16, align: 'MIN' });
const c1 = card('Card — Your chances'); add(c1, [await ttl('Your chances · 35 entries'), 'FILL']);
for (const [k, v] of [['1st prize', '≈ 0.188%'], ['Any prize', '≈ 2.44%'], ['At stake', '350.00 + 1.75 fee']]) add(c1, [await kv(k, v, { vs: 'Number/S' }), 'FILL']);
const rk = row('Risk', { gap: 8, align: 'MIN' }); add(rk, await IC('alert-triangle', 16, 'status/warning'), await T('You can lose your stake. More entries raise your chance but never guarantee a prize.', 'Body/S', 'text/warning', { w: 280 })); add(c1, [rk, 'FILL']);
const c2 = card('Card — Not part of the pool'); add(c2, [await ttl('Not part of the pool'), 'FILL']);
for (const [k, v] of [['Platform fees', '932.00 USDT'], ['Fee basis', '18,640 × 0.05 USDT'], ['Network fee on entries', '0.00 USDT']]) add(c2, [await kv(k, v), 'FILL']);
add(c2, [await T('Fees are collected separately and are never added to or taken from the prize pool.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL']);
const c3 = card('Card — If the round does not draw'); add(c3, [await ttl('If the round doesn’t draw', { demo: false }), 'FILL']);
add(c3, [await T('A round needs at least 500 players and 50,000.00 USDT at close. Otherwise no prizes are paid: every stake becomes Owed and every fee goes back to Available.', 'Body/S', 'text/secondary', { w: 300 }), 'FILL'], await BTN('Ghost', 'See cancelled round #1,245', { size: 'S', trail: 'arrow-right' }));
add(ec, [c1, 'FILL'], [c2, 'FILL'], [c3, 'FILL']); add(main, [ec, 'FILL']);
// past rounds
const pc = [{ h: 'Round', w: 150 }, { h: 'Pool', w: 170, right: 1 }, { h: '1st · 50%', w: 'F' }, { h: '2nd · 20%', w: 140, right: 1 }, { h: '3rd · 10%', w: 140, right: 1 }, { h: 'Runner-up · 2% ×10', w: 180, right: 1 }, { h: 'Status', w: 136 }];
const prr = [
  { key: '#1,247', c: [{ p: '#1,247', s: '26 Nov 2026' }, { amt: '172,950.00' }, { p: '86,475.00 USDT', s: '@orbit_77', pc: 'text/gold' }, { amt: '34,590.00' }, { amt: '17,295.00' }, { amt: '3,459.00' }, { st: 'Confirmed', lab: 'Settled' }] },
  { key: '#1,246', c: [{ p: '#1,246', s: '25 Nov 2026' }, { amt: '168,420.00' }, { p: '84,210.00 USDT', s: '@mira.sol', pc: 'text/gold' }, { amt: '33,684.00' }, { amt: '16,842.00' }, { amt: '3,368.40' }, { st: 'Confirmed', lab: 'Settled' }] },
  { key: '#1,245', c: [{ p: '#1,245', s: '24 Nov 2026' }, { amt: '41,200.00' }, { p: 'No prizes — round cancelled', s: 'Stakes and fees refunded' }, { p: '—' }, { p: '—' }, { p: '—' }, { st: 'Expired', lab: 'Cancelled' }] },
  { key: '#1,244', c: [{ p: '#1,244', s: '23 Nov 2026' }, { amt: '181,030.00' }, { p: '90,515.00 USDT', s: '@kestrel', pc: 'text/gold' }, { amt: '36,206.00' }, { amt: '18,103.00' }, { amt: '3,620.60' }, { st: 'Confirmed', lab: 'Settled' }] }];
const pw = col('Past rounds', { gap: 12 }); add(pw, [await ttl('Same split in past rounds', { ds: 'M', right: [await BTN('Ghost', 'All rounds', { size: 'S', trail: 'arrow-right' })] }), 'FILL'], [await table(pc, prr, 'Table — Past distributions'), 'FILL'], await note('You were one of the ten runners-up in #1,244 (+3,620.60 USDT, settled to Available). Each prize is an exact share of the pool at close.', { w: 880 }));
add(main, [pw, 'FILL']);
await foot(main);
fitSection(sec);
await f.screenshot({ scale: 0.5 });
return { id: f.id, h: Math.round(f.height), MISS: MISS.slice(0, 30) };
