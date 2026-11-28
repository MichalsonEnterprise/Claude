// DI-02 Number selection + live probability/payout — 3 states (column x 1680)
{ const X = 1680; const shots = [];
  const A = await mk('[DI-02] Number selection / 1440 / Dragging target to 34.00 — odds update live', X, () => buildPlay('n', 0, 0, { target: 34, tStr: '34.00', chance: '66.00', mult: '1.5000', profit: '+5.00', receive: '15.00', odds: 'Updating', thumb: 'focus', tFocus: true,
    read: { over: 'ROLL OVER TO WIN', value: '34.00', caption: 'Any result from 34.00 to 99.99 wins · 6,600 of 10,000 possible results', chip: 'info', chipIcon: 'refresh', chipLabel: 'Updating live while you drag' },
    cta: { label: 'Roll over 34.00 · 10.00 USDT' }, linkNote: 'Dragging updates win chance, multiplier and payout instantly. The server re-checks them when you roll.',
    motion: 'Recalculates on every 0.01 step · figures tween 120 ms · nothing is sent until you press Roll' }));
  shots.push(A.f);
  const B = await mk('[DI-02] Number selection / 1440 / Roll under 50.50 — 50.50% · 1.9604×', X, () => buildPlay('n', 0, 0, { mode: 'under', chance: '50.50', mult: '1.9604', profit: '+9.60', receive: '19.60',
    oddsRepl: { 'Roll over': 'Roll under', 'roll over': 'roll under', '49.50%': '50.50%', '2.0000×': '1.9604×', '20.00': '19.60' },
    read: { over: 'ROLL UNDER TO WIN', value: '50.50', caption: 'Any result from 0.00 to 50.49 wins · 5,050 of 10,000 possible results' },
    cta: { label: 'Roll under 50.50 · 10.00 USDT' } }));
  shots.push(B.f);
  const Cc = await mk('[DI-02] Number selection / 1440 / Out of range — win chance above 98.00%', X, () => buildPlay('n', 0, 0, { target: 1.5, tStr: '1.50', chance: '98.50', mult: '1.0051', profit: '—', receive: '—', odds: 'Out of range',
    tErr: 'Max win chance is 98.00% (1.0102×). Set the target to 2.00 or higher.',
    read: { over: 'ROLL OVER TO WIN', value: '1.50', color: 'text/danger', chip: 'lose', chipLabel: 'Out of range · 98.50% is above the 98.00% maximum', caption: 'Targets are limited to 0.01% – 98.00% win chance' },
    cta: { label: 'Set a target from 2.00 to roll', state: 'Disabled' } }));
  shots.push(Cc.f);
  for (const f of shots) await f.screenshot({ scale: 0.4 }); }
