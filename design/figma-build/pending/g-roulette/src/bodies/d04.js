// RL-09 a (x 12600): connection lost · insufficient balance · bet above spot max
const X9 = 12600;
const NC = '[RL-09] Errors & limits / 1440 / Connection lost — spin settles on the server';
if (!has(NC)) { const R = await mk(NC, X9, async () => buildPlay('n', 0, 0, {
  balance: '9,195.30', wheel: 'Spinning', top: { label: 'RECONNECTING · SPIN RL-88191', meta: 'Accepted 18:46:12 UTC · last contact 18:46:14 UTC', color: 'text/warning' },
  phase: { label: 'CONNECTION LOST', icon: 'wifi-off', iconColor: 'status/warning', color: 'text/warning', title: 'Your spin is safe', body: 'We are reconnecting.' }, outcome: null,
  feltOff: true, tray: { off: true }, slipCta: { label: 'Waiting for connection…', state: 'Disabled' },
  block: { tone: 'warning', icon: 'wifi-off', title: 'Connection lost — your spin is safe', body: 'Spin RL-88191 was accepted at 18:46:12 UTC with 20.00 USDT staked. It settles on the server even while you are offline, and we will show the result as soon as you are back.', facts: [['Stake locked', '20.00 USDT', true], ['Reconnecting', 'attempt 3 of 10 · every 5 s'], ['Last contact', '27 Nov 2026, 18:46:14 UTC']], note: 'You won’t be charged twice: Spin stays disabled until we have confirmed this spin’s result.', actions: [await BTN('Primary', 'Retry now', { lead: 'refresh' }), await BTN('Secondary', 'Open My bets', { lead: 'history' })] }, blockY: 140
})); await R.f.screenshot({ scale: 0.45 }); } else OUT.skippedC = NC;
const NI = '[RL-09] Errors & limits / 1440 / Insufficient balance (DEMO account · Available 4.20 USDT)';
if (!has(NI)) { const R = await mk(NI, X9, async () => buildPlay('n', 0, 0, {
  balance: '4.20', phase: { label: 'CHECK YOUR BALANCE', icon: 'alert-circle', iconColor: 'status/danger', color: 'text/danger', title: 'Not enough balance to spin', body: 'Your bets add up to 20.00 USDT, but this DEMO account has 4.20 USDT available. Remove bets until the total is 4.20 USDT or less, or deposit. Nothing has been charged.' }, outcome: null,
  slipCta: { label: 'Not enough balance', state: 'Disabled' },
  limits: { rows: [['Available', '4.20 USDT', true, 'text/danger'], ['Bets on the felt', '20.00 USDT', true], ['Short by', '15.80 USDT', false, 'text/danger'], ['Per spot', '0.10 – 1,000.00 USDT'], ['House edge', '2.70% on every bet']] },
  slipNotice: { tone: 'danger', icon: 'alert-circle', title: 'Bets exceed your available balance', body: 'Spin is disabled until your bets total 4.20 USDT or less. Deposits on Arbitrum usually arrive in about 2 minutes.', actions: [await BTN('Primary', 'Deposit USDT', { size: 'S', lead: 'deposit' }), await BTN('Secondary', 'Clear bets', { size: 'S', lead: 'trash' })] }
})); await R.f.screenshot({ scale: 0.45 }); } else OUT.skippedI = NI;
const NM = '[RL-09] Errors & limits / 1440 / Bet above spot max (Straight 19 · 1,200.00 > 1,000.00 USDT)';
if (!has(NM)) { const R = await mk(NM, X9, async () => buildPlay('n', 0, 0, {
  phase: { label: 'TABLE LIMIT', icon: 'alert-triangle', iconColor: 'status/warning', color: 'text/warning', title: 'Straight 19 is over the spot limit', body: 'One spot takes at most 1,000.00 USDT. Lower Straight 19 by 200.00 USDT or move the extra to another spot. The table maximum is 5,000.00 USDT per spin.' }, outcome: null,
  slip: 'Over limit', felt: { cells: { 19: 'Bet placed' }, bets: { 19: '500' }, obets: { 'RED': '10', '2nd 12': '5' } }, tray: { sel: '100' },
  limits: { rows: [['Per spot', '0.10 – 1,000.00 USDT'], ['Straight 19', '1,200.00 USDT', true, 'text/danger'], ['Table max per spin', '5,000.00 USDT'], ['House edge', '2.70% on every bet'], ['Fees', '0.00 USDT']] },
  slipNotice: { tone: 'warning', icon: 'alert-triangle', title: 'Lower Straight 19 to 1,000.00 USDT', body: 'Spin stays disabled until every spot is between 0.10 and 1,000.00 USDT. We never change your bet without asking.', actions: [await BTN('Secondary', 'Set to 1,000.00', { size: 'S', lead: 'minus' })] }
})); await R.f.screenshot({ scale: 0.45 }); } else OUT.skippedM = NM;
