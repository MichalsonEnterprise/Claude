// RL-09 b (x 12600): daily loss limit reached · region restricted
const X9 = 12600;
const NLL = '[RL-09] Errors & limits / 1440 / Daily loss limit reached (DEMO scenario · net −200.00 USDT)';
if (!has(NLL)) { const R = await mk(NLL, X9, async () => buildPlay('n', 0, 0, {
  rg: 'Limit reached', top: { label: 'PLAY PAUSED · LOSS LIMIT', meta: 'Resumes 28 Nov 2026, 00:00 UTC', color: 'text/danger' },
  phase: { label: 'LIMIT REACHED', icon: 'pause-circle', iconColor: 'status/danger', color: 'text/danger', title: 'Play is paused', body: 'Your daily loss limit is reached.' }, outcome: null,
  feltOff: true, tray: { off: true }, slip: 'Empty', slipCta: { label: 'Paused until 00:00 UTC', state: 'Disabled' },
  block: { tone: 'danger', icon: 'pause-circle', title: 'Daily loss limit reached — play paused', body: 'You set a daily loss limit of 200.00 USDT and today’s net result is −200.00 USDT. Pool Roulette and the other games are paused until 28 Nov 2026, 00:00 UTC. Your balance and withdrawals are not affected.', facts: [['Net today', '−200.00 USDT', true], ['Your limit', '200.00 USDT per day'], ['Play resumes', '28 Nov 2026, 00:00 UTC']], note: 'Lowering a limit applies immediately; raising it only takes effect after 24 hours.', actions: [await BTN('Secondary', 'View my limits', { lead: 'sliders' }), await BTN('Ghost', 'Take a longer break', { lead: 'pause-circle' })] }, blockY: 140
})); await R.f.screenshot({ scale: 0.45 }); } else OUT.skippedLL = NLL;
const NR = '[RL-09] Errors & limits / 1440 / Region restricted (United States)';
if (!has(NR)) { const R = await mk(NR, X9, async () => buildPlay('n', 0, 0, {
  topbar: 'Restricted region', alert: 'Regional restriction', top: { label: 'NOT AVAILABLE IN YOUR REGION', meta: 'Location: United States (restricted)', color: 'text/warning' },
  phase: { label: 'REGION RESTRICTED', icon: 'globe', iconColor: 'status/warning', color: 'text/warning', title: 'Table closed in your region', body: 'Real-money games are offered only where we are licensed.' }, outcome: null,
  felt: { cells: {}, bets: {}, obets: {} }, feltOff: true, tray: { off: true }, slip: 'Empty', slipCta: { label: 'Not available in your region', state: 'Disabled' },
  block: { tone: 'warning', icon: 'globe', title: 'Pool Roulette isn’t available in your region', body: 'You appear to be in the United States, where our licence doesn’t allow real-money games. Your account and balance are safe — you can still view your history and withdraw.', note: 'Please don’t use a VPN or proxy to get around this: accounts that do are restricted. Travelling? Games unlock again when you are back in a permitted country.', actions: [await BTN('Primary', 'Withdraw funds', { lead: 'withdraw' }), await BTN('Secondary', 'Restricted countries', { lead: 'globe' })] }, blockY: 140
})); await R.f.screenshot({ scale: 0.45 }); } else OUT.skippedR = NR;
