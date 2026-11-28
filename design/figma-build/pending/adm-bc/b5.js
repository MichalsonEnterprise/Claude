const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-B5] Blockchain Events / 1440 / Live';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B5'), 'B', 4, 'SI', 'Search event, round, tx hash…');
await HEAD(c, ['Admin', 'Blockchain', 'Blockchain events'], 'Blockchain events', 'Decoded events emitted by GLOBAL POOL contracts, streamed by our indexer and cross-checked against two independent RPC providers. Read-only — events can’t be edited, hidden or re-ordered. Snapshot 27 Nov 2026, 20:05 UTC, after round #1,248 settled.', { badges: [await ST('Live', 'Live'), await DEMO('M')], actions: [await BTN('Secondary', 'Export events (CSV)', { size: 'S', lead: 'download' }), await BTN('Ghost', 'Pause stream', { size: 'S', lead: 'pause' })] });
const ix = []; for (const [ic, l, v, s, tone] of [['database', 'Indexer head · Arbitrum', '274,121,406', 'Block time 0.25 s', 'ok'], ['activity', 'Indexer lag', '2 blocks · 0.5 s', 'Alert above 40 blocks', 'ok'], ['server', 'RPC providers', 'A and B agree', 'Last disagreement 3 days ago', 'ok'], ['refresh', 'Re-orgs (24 h)', 'None', 'Events final after 20 blocks', 'ok']]) { const k = CARD(l, { gap: 6, p: 16 }); const h = AL('HORIZONTAL', { name: 'Head', gap: 8, align: 'CENTER' }); add(h, await IC(ic, 16, 'icon/muted'), await T(l, 'Caption', 'text/tertiary')); add(k, h); add(k, await T(v, 'Number/S', 'text/primary')); const s2 = AL('HORIZONTAL', { name: 'Sub', gap: 6, align: 'CENTER' }); add(s2, await IC('check-circle', 14, 'status/success'), await T(s, 'Caption', 'text/secondary')); add(k, s2); ix.push(k); }
await ROW(c, ix);
const chips = AL('HORIZONTAL', { name: 'Event filters', gap: 8, align: 'CENTER' }); for (const [l, sel] of [['All events', 1], ['Entries', 0], ['VRF', 0], ['Settlement', 0], ['Withdrawals', 0], ['Refunds', 0]]) add(chips, await CHIP(l, sel)); add(chips, [SPC(), 'FILL']); add(chips, await T('7 newest of 18,912 events today', 'Caption', 'text/tertiary'), await DEMO('XS')); add(c, [chips, 'FILL']);
const tbl = AL('VERTICAL', { name: 'Table — Event stream', fill: 'surface/default', stroke: 'border/subtle', r: 14, clip: true }); add(c, [tbl, 'FILL']);
add(tbl, [await TH('Event stream', { meta: 'Newest first · WebSocket' }), 'FILL']);
const eh = await I('24:14325'); add(tbl, [eh, 'FILL']);
for (const ev of ['RoundSettled', 'VRFFulfilled', 'VRFRequested', 'EntryPurchased', 'WithdrawalExecuted', 'WithdrawalFailed', 'RefundClaimed']) { const r = await I('24:14528', { Event: ev }); add(tbl, [r, 'FILL']); }
add(tbl, [await PAGER('Cursor'), 'FILL']);
const det = CARD('Event detail', { stroke: 'border/brand', gap: 16 }); add(c, [det, 'FILL']);
await CHEAD(det, 'RoundSettled · round #1,248', { icon: 'check-circle', ic: 'status/success', badges: [await ST('Confirmed', 'Final · 20 blocks')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(det, [cols, 'FILL']);
const kv = AL('VERTICAL', { name: 'Decoded fields', gap: 0 }); add(cols, [kv, 'FILL']);
add(kv, await T('Decoded fields', 'Label/L', 'text/primary'));
for (const [k, v] of [['roundId', '1248'], ['requestId', '0x9f2c…e71a'], ['randomWords[0]', '0x41c7…9d03'], ['winningEntries', '13 (1st, 2nd, 3rd + 10 runners-up)'], ['poolAmount', '186,400.00 USDT'], ['platformFee (excluded from pool)', '932.00 USDT'], ['settledAt', '27 Nov 2026, 20:02:10 UTC']]) await KV(kv, k, v, { line: 1, style: k.startsWith('r') ? 'Mono/S' : 'Body/S Strong' });
const hs = await I('20:5893', { State: 'Default' }, { Hash: '0x6d0b…c219', 'Show explorer link': true }); add(kv, hs);
await WT(kv, 'Anyone can verify this settlement from the transaction and the VRF proof. The console shows the result; it cannot change it.', 'Caption', 'text/tertiary', 400);
const vs = await I('23:11967', { Step: 'Settled' }); add(cols, vs);
return await DONE(f);
