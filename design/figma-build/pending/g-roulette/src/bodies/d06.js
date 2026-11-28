const N06 = '[RL-06] Bet history / 1440 / My spins — today';
if (!has(N06)) { const R = await mk(N06, 7920, () => buildHistory('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped6 = N06;
