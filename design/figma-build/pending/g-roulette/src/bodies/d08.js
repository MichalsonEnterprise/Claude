const N08 = '[RL-08] Provably-fair verification / 1440 / Spin RL-88191 verified';
if (!has(N08)) { const R = await mk(N08, 11040, () => buildPF('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); } else OUT.skipped8 = N08;
