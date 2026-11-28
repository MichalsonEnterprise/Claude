const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const NAME = '[ADM-B7] Failed Transactions / 1440 / Default';
const { f, c } = await SHELL(NAME, POS('B-1440', 'B7'), 'B', 6, 'SI', 'Search WD-, SW-, IN- ID or tx hash…');
await HEAD(c, ['Admin', 'Blockchain', 'Failed transactions'], 'Failed transactions', 'On-chain operations that failed, were dropped or arrived in an unsupported form. A retry re-sends the SAME amount to the SAME destination; a return credits the player’s Available balance through the ledger. Both need a reason and 2FA — amounts and destinations can’t be edited.', { badges: [await DEMO('M')], actions: [await BTN('Secondary', 'Runbook RB-07', { size: 'S', lead: 'book' })] });
await ROW(c, [await KPI('Flat', 'Needs action', '4', 'items', '+1 today', 'Oldest 2 h 39 min · SLA 4 h', 'vs yesterday'), await KPI('Up', 'Auto-retried (24 h)', '9', 'items', '+2', 'Gas or nonce replacement · no admin action needed', 'vs previous 24 h'), await KPI('Flat', 'Value affected', '6,460.00', 'USDT', '4 open items', 'All amounts are held in the ledger — nothing is lost or double-spent', 'reconciled')], { spark: 1 });
await TABS(c, [['Needs action', '4'], ['Auto-retried', '9'], ['Resolved · 30 days', '61']], 'Needs action');
const F = [
  ['WD-20918', 'Ethereum', 'Negative', '2,400.00', 'Out of gas during the gas spike (INC-0457)', '2', '17:31', ['Failed', 'Retry ready']],
  ['SW-1179', 'BNB Chain', 'Neutral', '3,100.00', 'RPC timeout — sweep not broadcast; funds still in the router', '3', '16:05', ['Pending', 'Auto-retry 18:50']],
  ['IN-0093', 'Ethereum', 'Neutral', '500.00', 'USDC sent to a USDT deposit address (GP-52114)', '1', '18:40', ['Under review', 'Recovery request']],
  ['WD-20924', 'Solana', 'Negative', '460.00', 'Destination has no USDT (SPL) token account', '1', '18:22', ['Failed', 'Player action needed']]];
const rows = []; for (const x of F) rows.push([{ T: 'Text', p: x[0], mono: 1 }, { T: 'Network', p: x[1] }, { T: 'Amount', p: x[3], sign: x[2] }, { T: 'Text', p: x[4], c: 'text/secondary' }, CR(await T(x[5], 'Number/S', 'text/primary')), { T: 'Text', p: x[6] + ' UTC', c: 'text/tertiary' }, { T: 'Status', st: x[7][0], p: x[7][1] }, { T: 'Actions' }]);
await TABLE(c, 'Failed', [{ k: 'ref', l: 'Reference', w: 112 }, { k: 'net', l: 'Network', w: 144 }, { k: 'amount', l: 'Amount (USDT)', w: 140, r: 1 }, { k: 'reason', l: 'Failure', w: 'FILL' }, { k: 'att', l: 'Attempts', w: 96, r: 1 }, { k: 'since', l: 'Since', w: 96 }, { k: 'status', l: 'Status', w: 176 }, { k: 'act', l: '', w: 44 }], rows, { density: 'Comfortable', sel: [0], hideL: ['att', 'since'], head: await TH('Needs action', { meta: 'Sorted by value at risk' }) });
const det = CARD('WD-20918 detail', { stroke: 'border/brand', gap: 16 }); add(c, [det, 'FILL']);
await CHEAD(det, 'WD-20918 · 2,400.00 USDT → 0x58b0…2e9d (Ethereum) · @lumen.eth', { icon: 'x-circle', ic: 'status/danger', badges: [await ST('Failed', 'Retry ready')] });
const cols = AL('HORIZONTAL', { name: 'Columns', gap: 24 }); add(det, [cols, 'FILL']);
const lft = AL('VERTICAL', { name: 'Attempts', gap: 12 }); add(cols, [lft, 'FILL']);
add(lft, await T('Attempt history', 'Label/L', 'text/primary'));
await STEPS(lft, [['done', 'Requested and approved · 17:12 UTC', 'Single approver (below 10,000.00) · destination whitelisted 2 Sep 2026'], ['bad', 'Attempt 1 · 17:31:08 UTC · out of gas', 'tx 0x91fe…07ab · gas used 65,000 of 65,000'], ['bad', 'Attempt 2 · 17:46:40 UTC · out of gas', 'Replacement tx 0x2ac4…f913 · limit 80,000'], ['next', 'Attempt 3 · ready', 'Fee estimate from provider B · gas limit 120,000 · est. network fee 2.40 USDT']]);
const rt = AL('VERTICAL', { name: 'Ledger & actions', gap: 12, }); add(cols, [rt, 'FILL']);
add(rt, await T('Ledger state', 'Label/L', 'text/primary'));
for (const [k, v] of [['Player balance', 'Locked 2,400.00 USDT'], ['Original nonce', 'Cancelled before any retry'], ['Double-spend check', 'Passed · 0 pending tx for this nonce'], ['Hot wallet · Ethereum', '39,610.00 USDT · sufficient']]) await KV(rt, k, v, { line: 1 });
const ab = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(ab, [await BTN('Primary', 'Retry broadcast', { size: 'M', lead: 'refresh' }), 'FILL'], [await BTN('Secondary', 'Return to player', { size: 'M', lead: 'undo' }), 'FILL']); add(rt, [ab, 'FILL']);
await NOTE(rt, 'lock', 'neutral', 'Retry: reason + 2FA. Return to the player’s Available balance: reason + 2FA + second approver (Finance). Amount and destination are locked for both.', { w: 380 });
return await DONE(f);
