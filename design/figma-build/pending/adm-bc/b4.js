const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-B4] Transaction Monitoring / 1440 / Live';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B4'), 'B', 3, 'SI', 'Search tx hash, address, DP-/WD- ID…');
await HEAD(c, ['Admin', 'Blockchain', 'Transaction monitoring'], 'Transaction monitoring', 'Every on-chain transfer in or out of platform wallets, matched to a deposit, withdrawal or treasury operation. Read-only · streamed over WebSocket · times UTC.', { badges: [await ST('Live', 'Live'), await DEMO('M')], actions: [await BTN('Ghost', 'Pause stream', { size: 'S', lead: 'pause' }), await BTN('Secondary', 'Open explorer list', { size: 'S', lead: 'external-link' })] });
await ROW(c, [await KPI('Flat', 'In flight now', '19', 'transfers', '14 in · 5 out', 'Deposits confirming 14 · withdrawals broadcasting 5', 'right now'), await KPI('Up', 'Confirmed (24 h)', '4,203', 'transfers', '+3.4%', 'Deposits 3,018 · withdrawals 1,185', 'vs previous 24 h'), await KPI('Flat', 'Unmatched transfers', '2', 'transfers', '+1 today', 'Inbound without a matching deposit request · see Failed transactions', 'vs yesterday')], { spark: 1 });
await TOOLBAR(c, 'Search tx hash, address, DP-/WD- ID', [['All types', true], ['Deposits', false], ['Withdrawals', false], ['Treasury', false], ['Confirming · 19', false]], { summary: 'Showing the 10 newest of 4,203 in the last 24 h · newest first', sort: 'Auto-refresh · 15 s' });
async function conf(n, d, tone) { const pct = Math.round(100 * n / d); return C(await BAR(pct, tone === 'ok' ? 'status/success' : tone === 'bad' ? 'status/danger' : 'status/info', 56), await T(n + ' / ' + d, 'Mono/S', 'text/secondary')); }
const X = [
  ['18:44:12', 'DP-77412', 'Deposit', 'Ethereum', '0x5e1f…c0a8', 'Positive', '+1,000.00', [7, 12, 'info'], ['Processing', 'Confirming']],
  ['18:43:51', 'WD-20941', 'Withdrawal', 'BNB Chain', '0x2d7c…a913', 'Negative', '−350.00', [9, 15, 'info'], ['Processing', 'Broadcasting']],
  ['18:43:20', 'DP-77418', 'Deposit', 'BNB Chain', '0x6f0e…13ab', 'Positive', '+250.00', [15, 15, 'ok'], ['Confirmed', 'Credited']],
  ['18:42:58', 'SW-1184', 'Sweep → hot wallet', 'Polygon', '0xc81d…7e40', 'Neutral', '8,420.00', [64, 64, 'ok'], ['Confirmed', 'Settled']],
  ['18:42:30', 'DP-77416', 'Deposit', 'Solana', '5Jx2…eR7q', 'Positive', '+75.00', [32, 32, 'ok'], ['Confirmed', 'Credited']],
  ['18:41:47', 'WD-20936', 'Withdrawal', 'Polygon', '0x4b9a…d02f', 'Negative', '−1,120.00', [64, 64, 'ok'], ['Confirmed', 'Completed']],
  ['18:40:05', 'IN-0093', 'Unmatched inbound', 'Ethereum', '0xe3a0…5b19', 'Neutral', '500.00 USDC', [12, 12, 'bad'], ['Failed', 'Unsupported token']],
  ['18:39:40', 'DP-77409', 'Deposit', 'Arbitrum', '0x1c7d…f8a2', 'Positive', '+3,000.00', [20, 20, 'ok'], ['Confirmed', 'Credited']],
  ['18:38:12', 'WD-20933', 'Withdrawal', 'Ethereum', '0x7e55…a0c4', 'Negative', '−5,000.00', [12, 12, 'ok'], ['Confirmed', 'Completed']],
  ['18:37:44', 'TR-0412', 'Treasury → hot wallet', 'Arbitrum', '0xb0e2…6d71', 'Neutral', '25,000.00', [20, 20, 'ok'], ['Confirmed', 'Settled · multisig']]];
const rows = []; for (const x of X) rows.push([{ T: 'Text', p: x[0], mono: 1, c: 'text/secondary' }, { T: 'Text', p: x[1], s: x[2], mono: 1 }, { T: 'Network', p: x[3] }, { T: 'Text', p: x[4], mono: 1 }, { T: 'Amount', p: x[6].replace('+', '').replace('−', ''), sign: x[5] }, await conf(...x[7]), { T: 'Status', st: x[8][0], p: x[8][1] }, { T: 'Actions' }]);
await TABLE(c, 'Transfers', [{ k: 'time', l: 'Time', w: 96 }, { k: 'ref', l: 'Reference', w: 172 }, { k: 'net', l: 'Network', w: 148 }, { k: 'hash', l: 'Tx hash', w: 'FILL' }, { k: 'amount', l: 'Amount (USDT)', w: 156, r: 1 }, { k: 'conf', l: 'Confirmations', w: 156 }, { k: 'status', l: 'Status', w: 160 }, { k: 'act', l: '', w: 44 }], rows, { sel: [0], hideL: ['conf'], head: await TH('Live transfers', { meta: 'Block heights cross-checked with 2 RPC providers' }), foot: await PAGER('Cursor') });
const d1 = CARD('DP-77412 detail', { stroke: 'border/brand', gap: 16 }); add(c, [d1, 'FILL']);
await CHEAD(d1, 'DP-77412 · 1,000.00 USDT on Ethereum · @nova.k', { icon: 'arrow-down-left', badges: [await ST('Processing', 'Confirming')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(d1, [cols, 'FILL']);
const cp = await I('20:3076', { State: 'Confirming' }); add(cols, cp);
const tl = await I('20:8473', { State: 'Confirming' }); tl.name = 'Tx/Status Timeline [hideL]'; add(cols, tl);
const kv = AL('VERTICAL', { name: 'Details', gap: 0 }); add(cols, [kv, 'FILL']);
for (const [k, v] of [['From', '0x91be…44d0 (external)'], ['To (deposit address)', '0x55f1…3b9e router · user GP-48213'], ['Required confirmations', '12 (Ethereum policy v31)'], ['Expected credit', '≈ 2 min · network congested'], ['Ledger state', 'Pending bucket · not withdrawable yet']]) await KV(kv, k, v, { line: 1 });
await WT(kv, 'Credits only after 12 confirmations. If a chain re-organisation drops the transfer, the pending amount is removed automatically and logged.', 'Caption', 'text/tertiary', 360);
return await DONE(f);
