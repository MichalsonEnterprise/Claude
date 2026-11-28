const F = {
  key: 'PRO-02', name: 'PRO-02 Mobile — Dashboard → Connect Wallet', flowName: 'PRO-02 (390) Dashboard → Connect Wallet',
  title: 'Mobile 390 — Dashboard → Connect wallet → Sign message',
  desc: 'Mobile version of PRO-02: member taps the balance pill in the mobile top bar, picks a mobile wallet, is handed off by deep link, then signs the one-time ownership message and returns to the dashboard. 390 “connecting / connected / verified” confirmation screens do not exist yet, so signing returns straight to the dashboard (closest existing state). Wallet marks are neutral placeholders. All values are DEMO.',
  stack: 'V', gap: 320, bgap: 420, boxOff: 210, subMax: 40, textW: 600, logoFb: [16, 40, 120, 40],
  pages: ['1:11'],
  steps: [
    { k: 'DASH', src: '33:193316', t: 'Dashboard — signed in', sub: 'USR-01 · Active', cta: 'Tap the balance pill' },
    { k: 'LIST', src: '124:155578', t: 'Connect wallet', sub: 'AUTH-09 · List (bottom sheet)', cta: 'Tap a mobile wallet' },
    { k: 'DEEP', src: '124:156062', t: 'Open wallet app', sub: 'AUTH-09 · WalletConnect deep link', cta: '“Open … app”' },
    { k: 'SIGN', src: '124:156284', t: 'Sign ownership message', sub: 'AUTH-10 · Request', cta: '“Open … to sign” → back to step 1' }
  ],
  branches: [
    { k: 'WNET', src: '124:155811', from: 'DEEP', t: 'Wrong network', state: 'AUTH-09 · Wrong network', cond: 'the wallet is on an unsupported network', trig: 'press 1 on step 3', ret: '“Switch to Arbitrum” → step 4' },
    { k: 'SEXP', src: '124:156503', from: 'SIGN', t: 'Message expired', state: 'AUTH-10 · Expired nonce', cond: 'the one-time message (nonce) expired before signing', trig: 'press 1 on step 4', ret: '“Get a new message” → step 4' }
  ],
  links: [
    ['DASH', 'Balance pill — wallet menu', { text: /9,215\.30/, maxY: 120, up: 1 }, [140, 48, 110, 32], 'LIST'],
    ['LIST', 'Trust Wallet', 17, 459, 356, 66, 'DEEP'], ['LIST', 'WalletConnect', 17, 369, 356, 82, 'DEEP'], ['LIST', 'Coinbase Wallet', 17, 533, 356, 66, 'DEEP'],
    ['DEEP', 'Open wallet app', 17, 705, 356, 48, 'SIGN'], ['DEEP', 'Back', 17, 270, 48, 48, 'LIST'],
    ['WNET', 'Switch to Arbitrum', 17, 705, 356, 48, 'SIGN'], ['WNET', 'Disconnect', 17, 761, 356, 48, 'LIST'],
    ['SIGN', 'Open wallet to sign', 17, 772, 356, 48, 'DASH'], ['SIGN', 'Cancel', 17, 828, 356, 48, 'DASH'],
    ['SEXP', 'Get a new message', 17, 722, 356, 48, 'SIGN'], ['SEXP', 'Cancel', 17, 778, 356, 48, 'DASH']
  ],
  keys: [['DEEP', 1, 'WNET'], ['SIGN', 1, 'SEXP']],
  timeouts: []
};
