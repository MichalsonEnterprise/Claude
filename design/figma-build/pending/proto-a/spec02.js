const F = {
  key: 'PRO-02', name: 'PRO-02 Dashboard → Connect Wallet', flowName: 'PRO-02 Dashboard → Connect Wallet',
  title: 'Dashboard → Connect wallet → Verify ownership',
  desc: 'Signed-in member @nova.k opens the wallet menu from the dashboard top bar, picks a wallet, approves the connection in the wallet pop-up and proves ownership by signing a one-time message (no gas, no transaction). Wallet pop-ups and provider marks are neutral placeholders, not real wallet brands. 6 happy-path screens; 5 branches below their trigger screen. All values are DEMO.',
  pages: ['1:5', '1:6'],
  steps: [
    { k: 'DASH', src: '32:27882', t: 'Dashboard — signed in', cta: 'Click the wallet pill (top bar)' },
    { k: 'LIST', src: '116:36629', t: 'Connect wallet — choose a wallet', cta: '“Browser wallet”' },
    { k: 'CONN', src: '117:40434', t: 'Connecting — approve in your wallet', cta: '“Connect” in the wallet pop-up' },
    { k: 'OK', src: '117:46336', t: 'Wallet connected', cta: '“Verify ownership”' },
    { k: 'SIGN', src: '120:144957', t: 'Verify ownership — sign message', cta: '“Sign” in the wallet pop-up' },
    { k: 'SIGNOK', src: '120:146919', t: 'Wallet verified' }
  ],
  branches: [
    { k: 'QR', src: '117:38530', from: 'LIST', t: 'WalletConnect QR', cond: 'the member picks WalletConnect instead', trig: 'click “WalletConnect” on step 2', ret: 'Click the QR code (simulated phone scan) → step 4' },
    { k: 'REJ', src: '117:42355', from: 'CONN', t: 'Connection rejected', cond: 'the request is cancelled in the wallet', trig: 'click “Cancel” in the wallet pop-up on step 3', ret: '“Try again” → step 3 · “Choose another wallet” → step 2' },
    { k: 'WNET', src: '117:44238', from: 'CONN', t: 'Wrong network', cond: 'the wallet is on an unsupported network', trig: 'press 1 on step 3', ret: '“Switch to Arbitrum” → step 4' },
    { k: 'SREJ', src: '120:148852', from: 'SIGN', t: 'Signature rejected', cond: 'the member rejects the signature request', trig: 'click “Reject” in the wallet pop-up on step 5', ret: '“Try again” → step 5 · “Later” → step 1' },
    { k: 'SEXP', src: '120:150769', from: 'SIGN', t: 'Sign-in message expired', cond: 'the one-time message (nonce) expired before signing', trig: 'press 1 on step 5', ret: '“Get a new message” → step 5' }
  ],
  links: [
    ['DASH', 'Wallet pill — connect wallet', 1189, 55, 123, 26, 'LIST'],
    ['LIST', 'Browser wallet', 465, 279, 510, 82, 'CONN'], ['LIST', 'WalletConnect', 465, 373, 510, 66, 'QR'],
    ['QR', 'QR code — simulated scan', 610, 363, 220, 220, 'OK'],
    ['CONN', 'Connect (wallet pop-up)', 1251, 323, 148, 40, 'OK'], ['CONN', 'Cancel (wallet pop-up)', 1093, 323, 150, 40, 'REJ'], ['CONN', 'Cancel', 893, 761, 82, 40, 'LIST'],
    ['REJ', 'Try again', 852, 691, 123, 40, 'CONN'], ['REJ', 'Choose another wallet', 653, 691, 187, 40, 'LIST'],
    ['WNET', 'Switch to Arbitrum', 787, 722, 188, 40, 'OK'], ['WNET', 'Disconnect', 638, 722, 137, 40, 'LIST'],
    ['OK', 'Verify ownership', 800, 716, 175, 40, 'SIGN'], ['OK', 'Later', 720, 716, 68, 40, 'DASH'],
    ['SIGN', 'Sign (wallet pop-up)', 1251, 437, 148, 40, 'SIGNOK'], ['SIGN', 'Reject (wallet pop-up)', 1093, 437, 150, 40, 'SREJ'], ['SIGN', 'Cancel', 353, 869, 80, 40, 'DASH'],
    ['SREJ', 'Try again', 844, 863, 123, 40, 'SIGN'], ['SREJ', 'Later', 762, 863, 70, 40, 'DASH'], ['SREJ', 'Disconnect wallet', 473, 863, 153, 40, 'LIST'],
    ['SEXP', 'Get a new message', 774, 841, 193, 40, 'SIGN'], ['SEXP', 'Cancel', 473, 841, 80, 40, 'DASH'],
    ['SIGNOK', 'Done', 473, 851, 68, 40, 'DASH']
  ],
  keys: [['CONN', 1, 'WNET'], ['SIGN', 1, 'SEXP']],
  timeouts: []
};
