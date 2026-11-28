// RL-04 spinning (x 4800) + RL-05 result win / lose (x 6360)
const N04 = '[RL-04] Spinning / 1440 / No more bets — stake locked';
if (!has(N04)) { const R = await mk(N04, 4800, async () => buildPlay('n', 0, 0, {
  balance: '9,195.30', wheel: 'Spinning',
  top: { label: 'NO MORE BETS · SPIN RL-88191', meta: 'Nonce 417 · accepted 27 Nov 2026, 18:46:12 UTC · stake locked' },
  phase: { label: 'SPINNING', icon: 'spinner', title: 'No more bets', body: 'Your 20.00 USDT stake is locked and the pocket is already fixed by your seed pair. The animation only reveals it — nothing you do now can change the result.' },
  outcome: null,
  settle: { title: 'This spin — locked', rows: [['Straight 19', '5.00 USDT'], ['Red', '10.00 USDT'], ['2nd dozen (13–24)', '5.00 USDT'], ['Total stake', '20.00 USDT', 'total'], ['Available while spinning', '9,195.30 USDT']] },
  motion: 'Spin 4.5 s · ball drops at 3.2 s · reduced motion: result appears instantly',
  feltOff: true, tray: { off: true }, slipCta: { label: 'Spinning…', state: 'Loading' },
  hint: 'Bets are locked until the spin settles · if you lose connection the spin still settles on the server'
})); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped4 = N04;
const FACTS = 'Red · odd · 2nd dozen (13–24) · 1st column · high (19–36)';
const NW = '[RL-05] Result / 1440 / Win — 19 Red (+195.00 USDT)';
if (!has(NW)) { const R = await mk(NW, 6360, async () => buildPlay('n', 0, 0, {
  balance: '9,410.30', wheel: 'Result',
  top: { label: 'SETTLED · SPIN RL-88191', meta: 'Nonce 417 · settled 27 Nov 2026, 18:46:17 UTC' },
  pocket: 19, pocketFacts: FACTS, phase: { label: 'RESULT', icon: 'check-circle', title: '19 Red' },
  result: { v: 'Win', t: { 'Headline': 'You won 215.00 USDT', 'Detail': 'Pool Roulette · 19 Red · 3 of 3 bets won', 'Net amount': '+195.00 USDT' }, r: { 'Round D-88213': 'Spin RL-88191', 'D-88213': 'RL-88191', '18:42': '18:46', 'Pool Dice': 'Pool Roulette' } },
  outcome: null,
  settle: { title: 'Settlement', rows: [['Straight 19 · 5.00 × 36', '180.00 USDT', 'win'], ['Red · 10.00 × 2', '20.00 USDT', 'win'], ['2nd dozen · 5.00 × 3', '15.00 USDT', 'win'], ['Total returned', '215.00 USDT', 'total'], ['Net this spin', '+195.00 USDT', 'win']] },
  felt: { cells: { 19: 'Winning' }, bets: { 19: '5' }, obets: { 'RED': '10', '2nd 12': '5' }, ostate: { 'RED': 'win', '2nd 12': 'win' } },
  slip: 'Empty', rgMap: { '00:42:18': '00:42:51', '−24.60': '+170.40', '24.60 / 200.00': '0.00 / 200.00' },
  hint: 'Bets settled and paid to Available · Repeat places the same 20.00 USDT again · Clear starts fresh'
})); await R.f.screenshot({ scale: 0.5 }); } else OUT.skippedW = NW;
const NL = '[RL-05] Result / 1440 / Lose — 19 Red, alternative bets on Black · 1st 12 · 26 (−20.00 USDT)';
if (!has(NL)) { const R = await mk(NL, 6360, async () => buildPlay('n', 0, 0, {
  balance: '9,195.30', wheel: 'Result',
  top: { label: 'SETTLED · SPIN RL-88191 · ALTERNATIVE BETS', meta: 'Nonce 417 · same seeds give the same pocket whatever you bet' },
  pocket: 19, pocketFacts: FACTS, phase: { label: 'RESULT', icon: 'x-circle', iconColor: 'status/danger', color: 'text/danger', title: '19 Red' },
  result: { v: 'Lose', t: { 'Headline': 'No win this spin', 'Detail': 'Pool Roulette · 19 Red · 0 of 3 bets won', 'Net amount': '−20.00 USDT' }, r: { 'Round D-88214': 'Spin RL-88191', 'Round D-88213': 'Spin RL-88191', 'D-88214': 'RL-88191', 'D-88213': 'RL-88191', '18:42': '18:46', 'Pool Dice': 'Pool Roulette' } },
  outcome: null,
  settle: { title: 'Settlement', rows: [['Straight 26 · 5.00', '0.00 USDT', 'lose'], ['Black · 10.00', '0.00 USDT', 'lose'], ['1st dozen · 5.00', '0.00 USDT', 'lose'], ['Total returned', '0.00 USDT', 'total'], ['Net this spin', '−20.00 USDT', 'lose']] },
  felt: { cells: { 19: 'Winning', 26: 'Bet placed' }, bets: { 26: '5' }, obets: { 'BLACK': '10', '1st 12': '5' }, ostate: { 'BLACK': 'lose', '1st 12': 'lose' } },
  slip: 'Empty', rgMap: { '00:42:18': '00:42:51', '−24.60': '−44.60', '24.60 / 200.00': '44.60 / 200.00' },
  hint: 'A loss never makes a number “due” — every spin is independent, and each pocket keeps a 1-in-37 chance'
})); await R.f.screenshot({ scale: 0.5 }); } else OUT.skippedL = NL;
