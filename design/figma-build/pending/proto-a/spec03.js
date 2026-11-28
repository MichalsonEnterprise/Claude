const F = {
  key: 'PRO-03', name: 'PRO-03 Wallet → Deposit → Confirmation', flowName: 'PRO-03 Wallet → Deposit → Confirmation',
  title: 'Wallet → Deposit → Confirmation',
  desc: 'Member @nova.k deposits 1,000.00 USDT (DP-77412) on Ethereum from the wallet overview: network → token → deposit address → QR → on-chain confirmations (7 of 12) → credited → receipt. Pending screens auto-advance to simulate block confirmations; press the keys shown to see system outcomes. 8 happy-path screens; 6 branches below their trigger screen. All values are DEMO.',
  pages: ['1:7'],
  steps: [
    { k: 'WAL', src: '32:19458', t: 'Wallet overview', cta: '“Deposit”' },
    { k: 'NET', src: '34:432757', t: 'Deposit 1 — select network', cta: '“Continue with Ethereum”' },
    { k: 'TOK', src: '34:465213', t: 'Deposit 2 — select token', cta: '“Show deposit address”' },
    { k: 'ADDR', src: '34:496874', t: 'Deposit 3 — deposit address', cta: '“Show QR code”' },
    { k: 'QR', src: '91:31216', t: 'Deposit 4 — QR code', cta: '“I’ve sent USDT”' },
    { k: 'PEND', src: '97:33583', t: 'Deposit 5 — confirming (7 of 12)', cta: 'Auto after 4 s — 12 of 12 confirmations' },
    { k: 'CRED', src: '99:34694', t: 'Deposit 6 — credited', cta: '“View receipt”' },
    { k: 'DONE', src: '99:35635', t: 'Deposit 7 — successful, receipt' }
  ],
  branches: [
    { k: 'WNET', src: '36:515243', from: 'ADDR', t: 'Wrong-network warning', cond: 'the connected wallet is on BNB Chain, not Ethereum', trig: 'press 1 on step 4', ret: '“Switch wallet to Ethereum” → step 4 · “Deposit on BNB Chain instead” → step 2' },
    { k: 'EXP', src: '36:536299', from: 'ADDR', t: 'Address session expired', cond: 'the deposit-address session timed out', trig: 'press 2 on step 4', ret: '“Generate new address” → step 4' },
    { k: 'BMIN', src: '91:30409', from: 'ADDR', t: 'Below minimum deposit', cond: 'the amount is under the 10.00 USDT minimum', trig: 'press 3 on step 4', ret: '“I’ve sent USDT” → step 6' },
    { k: 'DEL', src: '97:34460', from: 'PEND', t: 'Delayed — Ethereum congested', cond: 'confirmations are slower than the estimate', trig: 'press 1 on step 6', ret: 'Auto after 6 s → step 7' },
    { k: 'FAIL', src: '101:36554', from: 'PEND', under: 'CRED', t: 'Failed — transfer reverted', cond: 'the on-chain transfer reverted (nothing credited)', trig: 'press 2 on step 6', ret: '“Try again” → step 4' },
    { k: 'UNREC', src: '101:37387', from: 'PEND', under: 'CRED', t: 'Unrecognised token — not credited', cond: 'a token other than USDT arrived at the address', trig: 'press 3 on step 6', ret: '“Request recovery” → step 1' }
  ],
  links: [
    ['WAL', 'Deposit', 801, 460, 185, 48, 'NET'], ['WAL', 'Deposit (header)', 1295, 150, 113, 40, 'NET'],
    ['NET', 'Continue with Ethereum', 632, 1239, 255, 48, 'TOK'], ['NET', 'Cancel', 297, 1239, 94, 48, 'WAL'],
    ['TOK', 'Show deposit address', 647, 1382, 240, 48, 'ADDR'], ['TOK', 'Back', 297, 1382, 106, 48, 'NET'],
    ['ADDR', 'Show QR code', 710, 1303, 181, 48, 'QR'], ['ADDR', 'I’ve sent USDT', 543, 1303, 155, 48, 'PEND'], ['ADDR', 'Back', 293, 1303, 106, 48, 'TOK'],
    ['WNET', 'Switch wallet to Ethereum', 342, 643, 201, 32, 'ADDR'], ['WNET', 'Deposit on BNB Chain instead', 551, 643, 228, 32, 'NET'], ['WNET', 'Back', 293, 1473, 106, 48, 'TOK'],
    ['EXP', 'Generate new address', 516, 991, 213, 40, 'ADDR'], ['EXP', 'Choose another network', 657, 1435, 234, 48, 'NET'],
    ['BMIN', 'I’ve sent USDT', 543, 1473, 155, 48, 'PEND'], ['BMIN', 'Back', 293, 1473, 106, 48, 'TOK'],
    ['QR', 'I’ve sent USDT', 706, 1245, 181, 48, 'PEND'], ['QR', 'Back', 297, 1245, 106, 48, 'ADDR'],
    ['PEND', 'Go to wallet', 727, 1354, 160, 48, 'WAL'], ['PEND', 'Make another deposit', 297, 1354, 211, 48, 'NET'],
    ['DEL', 'Go to wallet', 727, 1504, 160, 48, 'WAL'], ['DEL', 'Make another deposit', 297, 1504, 211, 48, 'NET'],
    ['CRED', 'View receipt', 722, 1346, 165, 48, 'DONE'], ['CRED', 'Go to wallet', 297, 1346, 134, 48, 'WAL'],
    ['DONE', 'Make another deposit', 297, 1523, 237, 48, 'NET'],
    ['FAIL', 'Try again', 747, 1428, 140, 48, 'ADDR'],
    ['UNREC', 'Request recovery', 711, 1278, 176, 48, 'WAL']
  ],
  keys: [['ADDR', 1, 'WNET'], ['ADDR', 2, 'EXP'], ['ADDR', 3, 'BMIN'], ['PEND', 1, 'DEL'], ['PEND', 2, 'FAIL'], ['PEND', 3, 'UNREC']],
  timeouts: [['PEND', 4, 'CRED'], ['DEL', 6, 'CRED']]
};
