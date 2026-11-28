// Mobile DI-01 default (x 120), DI-02 adjusting (x 630), DI-03 rolling (x 1140)
{ const shots = [];
  shots.push((await mk('[DI-01] Dice interface / 390 / Default — roll over 50.50', 120, async () => buildM('n', {}))).f);
  shots.push((await mk('[DI-02] Number selection / 390 / Dragging target to 34.00 — odds update live', 630, async () => buildM('n', { target: 34, tStr: '34.00', chance: '66.00', mult: '1.5000', profit: '+5.00', receive: '15.00', thumb: 'focus', tFocus: true,
    read: { over: 'ROLL OVER TO WIN', value: '34.00', chip: 'info', chipIcon: 'refresh', chipLabel: 'Updating live while you drag', caption: 'Results 34.00 – 99.99 win · 6,600 of 10,000' },
    motion: 'Win chance, multiplier and payout update on every 0.01 step. Nothing is sent until you tap Roll.', cta: { label: 'Roll over 34.00 · 10.00 USDT' } }))).f);
  shots.push((await mk('[DI-03] Rolling / 390 / Rolling — stake locked', 1140, async () => buildM('n', { balance: '9,205.30', avail: '9,205.30', panelOff: true, thumb: 'locked', roll: { v: '41.86', state: 'rolling', ghost: true },
    top: { label: 'ROLLING · D-88213', meta: 'Nonce 417 · 10.00 USDT locked · result fixed by the seeds', color: 'text/brand' },
    read: { over: 'ROLLING…', value: '41.86', color: 'text/tertiary', chip: 'info', chipIcon: 'spinner', chipLabel: 'Settling on the server', caption: 'If your connection drops, the roll still settles and appears in My rolls.' },
    cta: { label: 'Rolling…', state: 'Loading' }, ctaNote: 'Roll D-88213 · 10.00 USDT locked' }))).f);
  for (const f of shots) await f.screenshot({ scale: 0.5 }); }
