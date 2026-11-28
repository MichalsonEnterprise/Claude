const FLOW = {
  id: 'PRO-06', pri: 'P1', name: 'PRO-06 Games Lobby → Game → Result', flowName: 'PRO-06 · Games Lobby → Game → Result', start: 'L',
  goal: 'Signed-in player @nova.k (DEMO) opens the games lobby, launches Orbit Rush (crash, house edge 1.00%), places a 10.00 USDT bet with auto cash-out at 2.00×, sees the result and verifies the round. Branches: restricted region, insufficient balance, daily loss limit, lost connection and a crash before the target.',
  checks: ['Bet panel shows limits 0.10–1,000.00 USDT, house edge 1.00% and "You can lose your stake" before every bet', 'Licence / jurisdiction notice and 18+ on the game page; a restricted region blocks play but never withdrawals', 'RG session bar, Take a break and the daily loss-limit stop are one click away', 'Every result is verifiable (server-seed hash → reveal); losses are shown as plainly as wins', 'All balances, players, multipliers and rounds are DEMO'],
  frames: [
    { k: 'L', step: '1', src: '34:347033', code: 'PUB-03', title: 'Games lobby', row: 0, col: 0 },
    { k: 'C1', step: '2', src: '32:90238', code: 'CR-01', title: 'Orbit Rush — pre-round betting', row: 0, col: 1 },
    { k: 'C2', step: '3', src: '33:124526', code: 'CR-02', title: 'Active run — bet live at 1.64×', row: 0, col: 2 },
    { k: 'C3', step: '4', src: '33:156588', code: 'CR-03', title: 'Auto cash-out at 2.00×', row: 0, col: 3 },
    { k: 'R', step: '5', src: '33:191216', code: 'CR-04', title: 'Result — cashed out at 2.00×', row: 0, col: 4 },
    { k: 'PF', step: '6', src: '34:331972', code: 'CR-07', title: 'Verify the round (provably fair)', row: 0, col: 5 },
    { k: 'B1', step: 'B1', src: '34:373416', code: 'PUB-03', title: 'Restricted region — United States', kind: 'error', row: 1, col: 0, cond: 'IF the visitor is geolocated in a restricted jurisdiction (DEMO: United States) → games stay visible but cannot be launched; Withdraw funds stays available.' },
    { k: 'B2', step: 'B2', src: '33:239177', code: 'CR-08', title: 'Insufficient balance', kind: 'error', row: 1, col: 1, cond: 'IF the bet (10.00 USDT) is higher than Available (separate DEMO account, Available 4.20 USDT) → bet blocked with a Deposit CTA; no partial bets.' },
    { k: 'B3', step: 'B3', src: '33:209124', code: 'CR-04', title: 'Crashed before target — stake lost', kind: 'alt', row: 1, col: 2, cond: 'IF the round crashes before the auto cash-out target (5.00× scenario) → stake lost, crash point and Verify shown plainly.' },
    { k: 'B4', step: 'B4', src: '33:227442', code: 'CR-08', title: 'Connection lost — bet protected', kind: 'error', row: 1, col: 3, cond: 'IF the live connection drops mid-round → manual cash-out disabled, the server-side auto cash-out still applies; Retry now reconnects.' },
    { k: 'B5', step: 'B5', src: '33:258312', code: 'CR-08', title: 'Daily loss limit reached', kind: 'error', row: 1, col: 4, cond: 'IF net loss today reaches the 200.00 USDT daily loss limit → betting pauses until 00:00 UTC; View limits and Take a break offered.' }
  ],
  links: [
    { from: 'L', to: 'C1', hot: [272, 901, 176, 235], label: 'Click the ORBIT RUSH tile' },
    { from: 'L', to: 'B1', chip: 'Visitor in United States', kind: 'error' },
    { from: 'C1', to: 'C2', hot: [125, 813, 279, 60], label: 'Place bet · 10.00 USDT (auto cash-out 2.00×)', smart: true },
    { from: 'C1', to: 'B2', chip: 'Insufficient balance', kind: 'error' },
    { from: 'C1', to: 'B5', chip: 'Loss limit reached', kind: 'error' },
    { from: 'C2', to: 'C3', hot: [440, 230, 600, 620], chip: 'Multiplier hits 2.00×', label: 'Multiplier reaches 2.00× → auto cash-out', smart: true },
    { from: 'C2', to: 'B3', chip: 'Crash before target', kind: 'alt' },
    { from: 'C2', to: 'B4', chip: 'Connection drops', kind: 'error' },
    { from: 'C3', to: 'R', hot: [440, 230, 600, 620], chip: 'Round ends', label: 'Round ends → result', smart: true },
    { from: 'R', to: 'PF', hot: [936, 710, 86, 32], label: 'Verify result' },
    { from: 'R', to: 'C2', hot: [125, 813, 279, 60], label: 'Place bet · next round', loop: true },
    { from: 'PF', to: 'C1', hot: [104, 208, 41, 44], label: 'Play tab', loop: true },
    { from: 'B3', to: 'C2', hot: [125, 813, 279, 60], label: 'Place bet · next round', loop: true },
    { from: 'B4', to: 'C3', hot: [688, 871, 117, 32], label: 'Retry now → reconnected', loop: true }
  ]
};
