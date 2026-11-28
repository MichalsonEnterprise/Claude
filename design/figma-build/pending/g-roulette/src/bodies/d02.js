// RL-02 inside bets (x 1680) + RL-03 outside bets (x 3240)
const C2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const N02 = '[RL-02] Inside bets / 1440 / Placing a split on 17 | 20';
if (!has(N02)) { const R = await mk(N02, 1680, async () => buildPlay('n', 0, 0, {
  phase: { label: 'INSIDE BETS', title: 'Split 17 | 20 — pays 17:1', body: 'You are adding 1.00 USDT on the line between 17 and 20. It wins if either number comes up: 2 of 37 pockets (5.41%) and returns 18.00 USDT.' },
  felt: { cells: { 19: 'Bet placed', 17: 'Hover', 20: 'Hover' }, bets: { 19: '5' }, obets: { 'RED': '10', '2nd 12': '5' }, marks: [{ type: 'split', a: 17, b: 20, value: '1', label: 'split' }], outline: [17, 20], tip: { text: 'Split 17 | 20 · pays 17:1 · 2 of 37 pockets', at: 'split' } },
  outcome: null,
  pay: { title: 'Inside bets', rows: [['Straight', 'Tap one number', '1', '35:1', '2.70%'], ['Split', 'Tap the line between two numbers', '2', '17:1', '5.41%', true], ['Street', 'Tap the outer edge of a row of three', '3', '11:1', '8.11%'], ['Corner', 'Tap where four numbers meet', '4', '8:1', '10.81%'], ['Line', 'Tap the edge between two streets', '6', '5:1', '16.22%']], foot: 'Same 2.70% house edge on every bet type. Chance = covered pockets ÷ 37.' },
  tray: { sel: '1' },
  slipNotice: { tone: 'info', icon: 'plus', title: 'Adding Split 17 | 20 · 1.00 USDT', body: 'Release to place it. Your slip total becomes 21.00 USDT; if 17 or 20 hits this bet returns 18.00 USDT.' },
  hint: 'Hovering the line between 17 and 20 previews a split · Esc cancels · Backspace removes the last chip'
})); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped2 = N02;
const N03 = '[RL-03] Outside bets / 1440 / Adding the 2nd column (2:1)';
if (!has(N03)) { const cells = { 19: 'Bet placed' }; for (const n of C2) cells[n] = 'Hover'; const R = await mk(N03, 3240, async () => buildPlay('n', 0, 0, {
  phase: { label: 'OUTSIDE BETS', title: '2nd column — pays 2:1', body: 'Covers 2, 5, 8 … 35: 12 of 37 pockets (32.43%). A 5.00 USDT bet returns 15.00 USDT if the column hits. Zero is never part of a column, dozen or even-money bet.' },
  felt: { cells, bets: { 19: '5' }, obets: { 'RED': '10', '2nd 12': '5', 'Col 2': '5' }, ostate: { 'Col 2': 'hover' } },
  outcome: null,
  pay: { title: 'Outside bets', rows: [['Red / Black', '18 numbers each', '18', '1:1', '48.65%'], ['Odd / Even', '0 is neither', '18', '1:1', '48.65%'], ['1–18 / 19–36', 'Low or high half', '18', '1:1', '48.65%'], ['Dozen', '1–12 · 13–24 · 25–36', '12', '2:1', '32.43%'], ['Column', 'One full column of the grid', '12', '2:1', '32.43%', true]], foot: 'If the ball lands on 0 every outside bet loses — no La Partage or En Prison on this table.' },
  tray: { sel: '5' },
  slipNotice: { tone: 'info', icon: 'plus', title: 'Adding 2nd column · 5.00 USDT', body: 'Your slip total becomes 25.00 USDT and the table now covers 28 of 37 pockets with at least a partial return.' },
  hint: 'Hovering a 2:1 box highlights the 12 numbers it covers · outside boxes accept any chip up to 1,000.00 USDT'
})); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped3 = N03;
