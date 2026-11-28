const F = {
  key: 'PRO-05', name: 'PRO-05 Mobile — Global Pool → Participation Preview → Result', flowName: 'PRO-05 (390) Global Pool → Participation Preview → Result',
  title: 'Mobile 390 — Global Pool → Participation preview → Result',
  desc: 'Mobile version of PRO-05 (MOB-04): sticky Participate bar → preview bottom sheet (35 entries, 0.05 USDT platform fee per qualifying entry as its own line, “You can lose your stake”, unticked risk acknowledgement) → pending sheet → receipt sheet → VRF draw after the 20:00 UTC close → result. Canonical DEMO outcome is “not selected”; the win screen is illustrative. All values are DEMO.',
  stack: 'V', gap: 320, bgap: 420, boxOff: 210, subMax: 40, textW: 600, logoFb: [16, 40, 120, 40],
  pages: ['1:11'],
  steps: [
    { k: 'HUB', src: '34:434743', t: 'Global Pool hub', sub: 'GP-01 · MOB-04 Active', cta: 'Tap sticky “Participate”' },
    { k: 'PREV', src: '36:503945', t: 'Preview — 35 entries', sub: 'GP-02 · bottom sheet', cta: '“Confirm 35 entries”' },
    { k: 'PEND', src: '164:73073', t: 'Confirming entries', sub: 'GP-03 · sheet', cta: 'Auto after 3 s' },
    { k: 'RCPT', src: '164:73786', t: 'Entry receipt', sub: 'GP-04 · sheet', cta: '“View my entries” → 20:00 UTC' },
    { k: 'DRAW', src: '151:66521', t: 'Round drawing', sub: 'GP-05 · VRF fulfilled', cta: 'Auto after 5 s' },
    { k: 'RES', src: '152:65942', t: 'Result — not selected', sub: 'GP-06 · canonical' }
  ],
  branches: [
    { k: 'RESTR', src: '34:473267', from: 'HUB', under: 'PEND', route: 'top', t: 'Restricted region', state: 'GP-01 · Restricted', cond: 'the visitor is in a restricted country (e.g. United States)', trig: 'press 1 on step 1', ret: 'Participation blocked, withdrawals stay open · logo → step 1' },
    { k: 'INSUF', src: '36:521852', from: 'PREV', t: 'Insufficient funds', state: 'GP-02 · Insufficient', cond: 'Available is below the 351.75 USDT total (separate DEMO balance)', trig: 'press 1 on step 2', ret: '“Reduce to 34 entries” → step 2' },
    { k: 'LIMIT', src: '36:529928', from: 'PREV', t: 'Entry limit reached', state: 'GP-02 · Limit reached', cond: 'the order exceeds the member’s responsible-gaming limit', trig: 'tap “+” on step 2', ret: '“Reduce to 28 entries” → step 2' },
    { k: 'WNET', src: '36:538096', from: 'PREV', t: 'Wrong network', state: 'GP-02 · Wrong network', cond: 'the wallet is not on Arbitrum', trig: 'press 2 on step 2', ret: '“Switch to Arbitrum” → step 2' },
    { k: 'DELAY', src: '151:66817', from: 'DRAW', t: 'Draw delayed (VRF)', state: 'GP-05 · Delayed', cond: 'Chainlink VRF has not answered in the expected window', trig: 'press 1 on step 5', ret: 'Auto after 6 s → step 5' },
    { k: 'WIN', src: '152:65592', from: 'DRAW', under: 'RES', t: 'Prize won (illustrative)', state: 'GP-06 · Win', cond: 'alternative outcome: one of the 35 entries is drawn', trig: 'press 2 on step 5', ret: 'Back → step 1' }
  ],
  links: [
    ['HUB', 'Participate (sticky bar)', 221, 4850, 153, 48, 'PREV'],
    ['PREV', 'Confirm 35 entries', 16, 929, 358, 48, 'PEND'], ['PREV', 'Branch — + entries (over limit)', 314, 259, 48, 48, 'LIMIT'],
    ['INSUF', 'Reduce to 34 entries', 60, 453, 167, 32, 'PREV'], ['INSUF', 'Cancel', 16, 1623, 96, 48, 'HUB'],
    ['LIMIT', 'Reduce to 28 entries', 32, 1074, 167, 32, 'PREV'], ['LIMIT', 'Cancel', 16, 1517, 96, 48, 'HUB'],
    ['WNET', 'Switch to Arbitrum', 60, 413, 176, 32, 'PREV'], ['WNET', 'Cancel', 16, 1567, 96, 48, 'HUB'],
    ['PEND', 'Close — we’ll notify you', 17, 1095, 356, 48, 'HUB'],
    ['RCPT', 'View my entries', 17, 1289, 356, 48, 'DRAW'], ['RCPT', 'Back to Global Pool', 17, 1349, 356, 48, 'HUB'],
    ['DRAW', 'Back', 16, 108, 48, 48, 'HUB'], ['DELAY', 'Back', 16, 108, 48, 48, 'HUB'],
    ['RES', 'Remind me when it opens', 33, 1447, 324, 48, 'HUB'], ['RES', 'Back', 16, 108, 48, 48, 'HUB'],
    ['WIN', 'Back', 16, 108, 48, 48, 'HUB']
  ],
  keys: [['HUB', 1, 'RESTR'], ['PREV', 1, 'INSUF'], ['PREV', 2, 'WNET'], ['DRAW', 1, 'DELAY'], ['DRAW', 2, 'WIN']],
  timeouts: [['PEND', 3, 'RCPT'], ['DRAW', 5, 'RES'], ['DELAY', 6, 'DRAW']]
};
