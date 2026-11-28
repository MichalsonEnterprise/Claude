// DI-07 Error / limit / region — part 1 (x 9480): loading, connection lost, insufficient balance
{ const X = 9480; const shots = [];
  shots.push((await mk('[DI-07] Errors & limits / 1440 / Loading game', X, async () => buildPlay('n', 0, 0, { loading: true, panelOff: true, thumb: 'locked',
    top: { label: 'LOADING · POOL DICE', meta: 'Fetching your seed pair, limits and balance · usually under 2 s' },
    cta: { label: 'Loading game…', state: 'Loading' }, hint: 'Nothing is staked until you press Roll' }))).f);
  shots.push((await mk('[DI-07] Errors & limits / 1440 / Connection lost — roll held on server', X, async () => buildPlay('n', 0, 0, { balance: '9,205.30', avail: '9,205.30', panelOff: true, thumb: 'locked', roll: { v: '41.86', state: 'rolling', ghost: true },
    top: { label: 'ROLL D-88213 · WAITING FOR CONNECTION', meta: 'Nonce 417 · 10.00 USDT stake received by the server at 18:42:06 UTC', color: 'text/warning' },
    read: { over: 'RESULT PENDING', value: '41.86', color: 'text/tertiary', caption: 'The result is fixed on the server — it is shown when you reconnect' },
    cta: { label: 'Reconnecting…', state: 'Disabled', lead: 'wifi-off' }, hint: 'Roll stays blocked until this result is shown, so nothing is charged twice',
    block: { tone: 'warning', icon: 'wifi-off', title: 'Connection lost — reconnecting', body: 'Your roll D-88213 (10.00 USDT · roll over 50.50) reached the server and settles there whatever happens to your connection. The result appears here and in My rolls.', facts: [['Reconnect attempt', '2 of 5'], ['Stake', '10.00 USDT · locked', true], ['Last contact', '18:42:06 UTC']], note: 'If we can’t reconnect, refresh the page — your balance and this roll are safe.', actions: [await BTN('Secondary', 'Retry now', { lead: 'refresh' }), await BTN('Ghost', 'View my rolls', { lead: 'history' })] } }))).f);
  shots.push((await mk('[DI-07] Errors & limits / 1440 / Insufficient balance (DEMO account · Available 4.20 USDT)', X, async () => buildPlay('n', 0, 0, { balance: '4.20', avail: '4.20', amtErr: 'Your bet is more than your available balance (4.20 USDT).',
    panelNotice: { tone: 'info', icon: 'deposit', title: 'Top up to keep playing', body: 'Deposit USDT on 5 networks (min 10.00 USDT), or lower your bet to 4.20 USDT or less.' },
    cta: { label: 'Deposit USDT', lead: 'deposit' }, cta2: { label: 'Bet 4.20 USDT instead', lead: 'minus' } }))).f);
  for (const f of shots) await f.screenshot({ scale: 0.4 }); }
