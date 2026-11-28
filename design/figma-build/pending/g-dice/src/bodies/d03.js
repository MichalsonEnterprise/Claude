// DI-03 Rolling (x 3240) + DI-04 Result win / lose (x 4800)
{ const shots = [];
  const A = await mk('[DI-03] Rolling / 1440 / Rolling — stake locked', 3240, () => buildPlay('n', 0, 0, { balance: '9,205.30', avail: '9,205.30', panelOff: true, thumb: 'locked', roll: { v: '41.86', state: 'rolling', ghost: true },
    top: { label: 'ROLLING · D-88213', meta: 'Nonce 417 · 10.00 USDT stake locked · the result is already fixed by the seeds', color: 'text/brand' },
    read: { over: 'ROLLING…', value: '41.86', color: 'text/tertiary', chip: 'info', chipIcon: 'spinner', chipLabel: 'Settling on the server', caption: 'If your connection drops, the roll still settles and appears in My rolls.' },
    motion: 'Roll 800 ms · digits tick, then ease out on the result · reduced motion: result appears at once',
    cta: { label: 'Rolling…', state: 'Loading' }, hint: 'Controls unlock as soon as the result is shown' }));
  shots.push(A.f);
  const W = await mk('[DI-04] Result / 1440 / Win — rolled 73.21 (+10.00 USDT)', 4800, () => buildPlay('n', 0, 0, { balance: '9,225.30', avail: '9,225.30', roll: { v: '73.21', state: 'win' },
    rgRepl: { '−24.60': '−14.60', '24.60 / 200.00': '14.60 / 200.00', '24.60 of 200.00': '14.60 of 200.00', '00:42:18': '00:42:21' },
    top: { label: 'SETTLED · D-88213', meta: 'Nonce 417 · settled 27 Nov 2026, 18:42:07 UTC · next roll D-88214 uses nonce 418' },
    read: { over: 'RESULT', value: '73.21', color: 'text/success', chip: 'win', chipLabel: 'Win · 73.21 is inside your 50.50 – 99.99 range' },
    result: { v: 'Win' }, cta: { label: 'Roll again · over 50.50 · 10.00 USDT' } }));
  shots.push(W.f);
  const L = await mk('[DI-04] Result / 1440 / Lose — rolled 31.07 (−10.00 USDT)', 4800, () => buildPlay('n', 0, 0, { roll: { v: '31.07', state: 'lose' },
    rgRepl: { '00:42:18': '00:42:47' },
    top: { label: 'SETTLED · D-88214', meta: 'Nonce 418 · settled 27 Nov 2026, 18:42:33 UTC · next roll D-88215 uses nonce 419' },
    read: { over: 'RESULT', value: '31.07', color: 'text/danger', chip: 'lose', chipLabel: 'Lose · 31.07 is below your 50.50 target' },
    result: { v: 'Lose', t: { Headline: 'No win this roll', Detail: 'Pool Dice · rolled 31.07 · you needed 50.50 or higher' }, r: { 'D-88213': 'D-88214', '73.21': '31.07' } },
    cta: { label: 'Roll again · over 50.50 · 10.00 USDT' }, hint: 'A loss doesn’t make a win “due” — the next roll is still 49.50%' }));
  shots.push(L.f);
  OUT.res = { win: W.notes, lose: L.notes };
  for (const f of shots) await f.screenshot({ scale: 0.4 }); }
