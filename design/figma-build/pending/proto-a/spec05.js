const F = {
  key: 'PRO-05', name: 'PRO-05 Global Pool → Participation Preview → Result', flowName: 'PRO-05 Global Pool → Participation Preview → Result',
  title: 'Global Pool → Participation preview → Result',
  desc: 'Member @nova.k buys 35 entries in round #1,248 (35 × 10.00 USDT + 0.05 USDT platform fee per qualifying entry = 351.75 USDT, network fee shown separately; “You can lose your stake” on the preview), waits for on-chain confirmation, gets the receipt, then follows the Chainlink VRF draw after the real close at 27 Nov 2026 20:00 UTC to the result. The canonical DEMO outcome is “not selected”; the win screen is an illustrative alternative. 6 happy-path screens; 7 branches. All values are DEMO.',
  pages: ['1:8'],
  steps: [
    { k: 'HUB', src: '32:79976', t: 'Global Pool hub — round #1,248 open', cta: '“Participate”' },
    { k: 'PREV', src: '33:299290', t: 'Participation preview — 35 entries', cta: '“Confirm 35 entries”' },
    { k: 'PEND', src: '34:365199', t: 'Confirming entries on-chain', cta: 'Auto after 3 s' },
    { k: 'RCPT', src: '34:383862', t: 'Entry receipt', cta: '“View my entries” — skips to 20:00 UTC close' },
    { k: 'DRAW', src: '46:16373', t: 'Round drawing — VRF fulfilled, settling', cta: 'Auto after 5 s' },
    { k: 'RES', src: '53:18291', t: 'Round result — not selected (canonical)' }
  ],
  branches: [
    { k: 'RESTR', src: '33:140539', from: 'HUB', under: 'PEND', route: 'top', t: 'Restricted region', cond: 'the visitor is in a restricted country (e.g. United States)', trig: 'press 1 on step 1', ret: 'Participation blocked, withdrawals stay open · logo → step 1' },
    { k: 'DISC', src: '33:160310', from: 'HUB', under: 'RCPT', route: 'top', t: 'Wallet disconnected', cond: 'no wallet session is active', trig: 'press 2 on step 1', ret: '“Connect Wallet” → step 1' },
    { k: 'INSUF', src: '33:310193', from: 'PREV', t: 'Insufficient funds', cond: 'Available is below the 351.75 USDT total (separate DEMO balance)', trig: 'press 1 on step 2', ret: '“Reduce to 34 entries” → step 2' },
    { k: 'LIMIT', src: '34:325577', from: 'PREV', t: 'Entry limit reached', cond: 'the order exceeds the member’s responsible-gaming limit', trig: 'click “+” (more entries) on step 2', ret: '“Reduce to 28 entries” → step 2' },
    { k: 'WNET', src: '34:333053', from: 'PREV', t: 'Wrong network', cond: 'the wallet is not on Arbitrum', trig: 'press 2 on step 2', ret: '“Switch to Arbitrum” → step 2' },
    { k: 'DELAY', src: '47:17014', from: 'DRAW', t: 'Draw delayed — VRF response overdue', cond: 'Chainlink VRF has not answered in the expected window', trig: 'press 1 on step 5', ret: 'Auto after 6 s → step 5 (fulfilled)' },
    { k: 'WIN', src: '49:17697', from: 'DRAW', under: 'RES', t: 'Result — prize won (illustrative)', cond: 'alternative outcome: one of the 35 entries is drawn', trig: 'press 2 on step 5', ret: 'Logo → step 1' }
  ],
  links: [
    ['HUB', 'Participate', 313, 602, 153, 48, 'PREV'],
    ['DISC', 'Connect Wallet', 313, 754, 182, 48, 'HUB'], ['DISC', 'Connect Wallet (header)', 1162, 55, 150, 26, 'HUB'],
    ['PREV', 'Confirm 35 entries', 573, 1123, 402, 48, 'PEND'], ['PREV', 'Cancel', 465, 1123, 96, 48, 'HUB'], ['PREV', 'Branch — + entries (over limit)', 919, 198, 40, 40, 'LIMIT'],
    ['INSUF', 'Reduce to 34 entries', 658, 257, 167, 32, 'PREV'], ['INSUF', 'Cancel', 465, 1259, 96, 48, 'HUB'],
    ['LIMIT', 'Reduce to 28 entries', 481, 850, 167, 32, 'PREV'], ['LIMIT', 'Cancel', 465, 1209, 96, 48, 'HUB'],
    ['WNET', 'Switch to Arbitrum', 509, 257, 176, 32, 'PREV'], ['WNET', 'Wrong network (header)', 1130, 48, 182, 40, 'PREV'], ['WNET', 'Cancel', 465, 1259, 96, 48, 'HUB'],
    ['PEND', 'Close — we’ll notify you', 465, 835, 250, 48, 'HUB'],
    ['RCPT', 'View my entries', 727, 1171, 248, 48, 'DRAW'], ['RCPT', 'Back to Global Pool', 465, 1171, 250, 48, 'HUB'],
    ['RES', 'Remind me when it opens', 993, 1176, 390, 40, 'HUB']
  ],
  keys: [['HUB', 1, 'RESTR'], ['HUB', 2, 'DISC'], ['PREV', 1, 'INSUF'], ['PREV', 2, 'WNET'], ['DRAW', 1, 'DELAY'], ['DRAW', 2, 'WIN']],
  timeouts: [['PEND', 3, 'RCPT'], ['DRAW', 5, 'RES'], ['DELAY', 6, 'DRAW']],
  diag: ['PREV', 'RES']
};
