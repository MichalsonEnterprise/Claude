// DI-05 History (x 6360)
{ const R = await mk('[DI-05] History / 1440 / My rolls — today', 6360, () => buildHistory('n', 0, 0)); await R.f.screenshot({ scale: 0.5 }); }
