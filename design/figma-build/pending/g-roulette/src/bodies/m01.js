const M1 = '[RL-01] Table / 390 / Bets placed — ready to spin';
if (!has(M1)) { const R = await mk(M1, 120, async () => buildM('n', {})); await R.f.screenshot({ scale: 0.5 }); } else OUT.s1 = M1;
const M2 = '[RL-02] Inside bets / 390 / Tapped 19 — choose the bet type (bottom sheet)';
if (!has(M2)) { const R = await mk(M2, 630, async () => { const B = await buildM('n', { felt: { cells: { 19: 'Hover' }, bets: {}, obets: { 'RED': '10', '2nd 12': '5' } }, bar: { summary: '2 bets · 15.00 USDT', sub: 'Adding a bet on 19…', sel: '1' } });
  await mSheet(B.f, 'Bet on 19', async (sh) => {
    await wrapT(sh, 'Choose how to cover 19 with your 1.00 USDT chip. The neighbours come from the felt layout.', 'Body/S', 'text/secondary', 358, { name: 'Sheet intro' });
    const L = AL('VERTICAL', { name: 'Bet types', gap: 4 }); add(sh, [L, 'FILL']);
    for (const [l, d, s] of [['Straight 19', 'Pays 35:1 · 1 of 37 pockets (2.70%)', true], ['Split 19 | 20', 'Pays 17:1 · 2 pockets (5.41%)'], ['Split 19 | 22', 'Pays 17:1 · 2 pockets (5.41%)'], ['Street 19 · 20 · 21', 'Pays 11:1 · 3 pockets (8.11%)'], ['Corner 19 · 20 · 22 · 23', 'Pays 8:1 · 4 pockets (10.81%)'], ['Line 19 – 24', 'Pays 5:1 · 6 pockets (16.22%)']]) add(L, [await radioRow(l, d, !!s), 'FILL']);
    const cr = AL('HORIZONTAL', { name: 'Chip value', gap: 4, align: 'CENTER' }); for (const v of ['0.10', '1', '5', '10', '25', '100', '500']) add(cr, await chipI(v, 44, v === '1' ? 'Selected' : 'Default')); add(sh, cr);
  }, [await BTN('Primary', 'Add Straight 19 · 1.00 USDT', { size: 'L', lead: 'plus' }), await T('Returns 36.00 USDT if 19 hits. You can lose your stake.', 'Caption', 'text/tertiary', { w: 326, align: 'CENTER' })]);
  return B; }); await R.f.screenshot({ scale: 0.5 }); } else OUT.s2 = M2;
const M3 = '[RL-03] Outside bets / 390 / Outside view — adding the 2nd column';
if (!has(M3)) { const R = await mk(M3, 1140, async () => buildM('n', { view: 'outside', felt: { obets: { 'RED': '10', '2nd 12': '5', 'Col 2': '5' }, ostate: { 'Col 2': 'hover' } }, phase: { label: 'OUTSIDE BETS', title: '2nd column · pays 2:1', body: 'Covers 2, 5, 8 … 35 — 12 of 37 pockets (32.43%). Zero loses every outside bet.' }, bar: { summary: '4 bets · 25.00 USDT', sub: 'Max payout 215.00 USDT · edge 2.70%' }, hint: 'Outside bets are big targets for one-thumb play · switch back to Numbers for inside bets' })); await R.f.screenshot({ scale: 0.5 }); } else OUT.s3 = M3;
