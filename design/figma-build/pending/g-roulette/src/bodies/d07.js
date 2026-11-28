const N07 = '[RL-07] Rules & payouts / 1440 / Default';
if (!has(N07)) { const R = await mk(N07, 9480, () => buildRules('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped7 = N07;
