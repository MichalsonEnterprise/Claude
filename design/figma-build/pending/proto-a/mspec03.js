const F = {
  key: 'PRO-03', name: 'PRO-03 Mobile — Wallet → Deposit → Confirmation', flowName: 'PRO-03 (390) Wallet → Deposit → Confirmation',
  title: 'Mobile 390 — Wallet → Deposit → Confirmation (bottom sheets)',
  desc: 'Mobile version of PRO-03 using the MOB-06 bottom-sheet deposit steps: network → token → address → QR → confirmations (7 of 12) → credited → receipt for DP-77412, 1,000.00 USDT on Ethereum. Pending sheets auto-advance. Wrong-network and below-minimum address states exist only at 1440 (see desktop PRO-03). All values are DEMO.',
  stack: 'V', gap: 320, bgap: 420, boxOff: 210, subMax: 40, textW: 600, logoFb: [16, 40, 120, 40],
  pages: ['1:11', '1:7'],
  steps: [
    { k: 'WAL', src: '33:319559', t: 'Wallet overview', sub: 'MOB-05 · WAL-01 Default', cta: 'Tap “Deposit”' },
    { k: 'NET', src: '105:49687', t: 'Deposit 1 — network', sub: 'WAL-03 · sheet', cta: '“Continue with Ethereum”' },
    { k: 'TOK', src: '105:50056', t: 'Deposit 2 — token', sub: 'WAL-04 · sheet', cta: '“Show deposit address”' },
    { k: 'ADDR', src: '105:50420', t: 'Deposit 3 — address', sub: 'WAL-05 · sheet', cta: '“Show QR code”' },
    { k: 'QR', src: '111:51709', t: 'Deposit 4 — QR code', sub: 'WAL-06 · sheet', cta: '“I’ve sent USDT”' },
    { k: 'PEND', src: '111:52133', t: 'Deposit 5 — 7 of 12', sub: 'WAL-07 · confirming', cta: 'Auto after 4 s' },
    { k: 'CRED', src: '112:52888', t: 'Deposit 6 — credited', sub: 'WAL-08 · 12 of 12', cta: '“View receipt”' },
    { k: 'DONE', src: '112:53217', t: 'Deposit 7 — receipt', sub: 'WAL-09 · Successful' }
  ],
  branches: [
    { k: 'EXP', src: '105:50851', from: 'ADDR', t: 'Address session expired', state: 'WAL-05 · Expired session', cond: 'the deposit-address session timed out', trig: 'press 1 on step 4', ret: '“Generate new address” → step 4' },
    { k: 'DEL', src: '111:52536', from: 'PEND', t: 'Delayed — congested', state: 'WAL-07 · Delayed', cond: 'confirmations are slower than the estimate', trig: 'press 1 on step 6', ret: 'Auto after 6 s → step 7' },
    { k: 'FAIL', src: '112:53630', from: 'PEND', under: 'CRED', t: 'Failed — reverted', state: 'WAL-09 · Failed', cond: 'the on-chain transfer reverted (nothing credited)', trig: 'press 2 on step 6', ret: '“Try again” → step 4' },
    { k: 'UNREC', src: '245:344673', from: 'PEND', under: 'DONE', t: 'Unrecognised token', state: 'WAL-09 · Not credited', cond: 'a token other than USDT arrived at the address', trig: 'press 3 on step 6', ret: '“Request recovery” → step 1' }
  ],
  links: [
    ['WAL', 'Deposit (top bar)', 252, 48, 77, 32, 'NET'], ['WAL', 'Deposit (quick action)', { text: 'Deposit', minY: 120, up: 1 }, null, 'NET'],
    ['NET', 'Continue with Ethereum', 17, 761, 356, 48, 'TOK'], ['NET', 'Close sheet', 325, 142, 48, 48, 'WAL'],
    ['TOK', 'Show deposit address', 17, 943, 356, 48, 'ADDR'], ['TOK', 'Back', 17, 999, 356, 48, 'NET'], ['TOK', 'Close sheet', 325, 125, 48, 48, 'WAL'],
    ['ADDR', 'Show QR code', 17, 944, 356, 48, 'QR'], ['ADDR', 'I’ve sent USDT', 17, 1000, 356, 48, 'PEND'], ['ADDR', 'Close sheet', 325, 125, 48, 48, 'WAL'],
    ['EXP', 'Generate new address', 17, 847, 356, 48, 'ADDR'], ['EXP', 'Choose another network', 17, 903, 356, 48, 'NET'],
    ['QR', 'I’ve sent USDT', 17, 989, 356, 48, 'PEND'], ['QR', 'Copy address instead', 17, 1045, 356, 48, 'ADDR'],
    ['PEND', 'Go to wallet', 17, 1046, 356, 48, 'WAL'], ['PEND', 'Make another deposit', 17, 1102, 356, 48, 'NET'],
    ['DEL', 'Go to wallet', 17, 1192, 356, 48, 'WAL'], ['DEL', 'Make another deposit', 17, 1248, 356, 48, 'NET'],
    ['CRED', 'View receipt', 17, 693, 356, 48, 'DONE'], ['CRED', 'Go to wallet', 17, 749, 356, 48, 'WAL'],
    ['DONE', 'Make another deposit', 17, 1438, 356, 48, 'NET'],
    ['FAIL', 'Try again', 17, 1055, 356, 48, 'ADDR'],
    ['UNREC', 'Request recovery', { text: /Request recovery/, minY: 300, up: 2 }, null, 'WAL']
  ],
  keys: [['ADDR', 1, 'EXP'], ['PEND', 1, 'DEL'], ['PEND', 2, 'FAIL'], ['PEND', 3, 'UNREC']],
  timeouts: [['PEND', 4, 'CRED'], ['DEL', 6, 'CRED']]
};
