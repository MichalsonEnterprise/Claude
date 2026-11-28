// DI-06 Provably-fair verification (x 7920): verified + mismatch
{ const A = await mk('[DI-06] Provably-fair verification / 1440 / Roll D-88213 verified', 7920, () => buildPF('n', 0, 0, false));
  const B = await mk('[DI-06] Provably-fair verification / 1440 / Mismatch — server seed from another pair', 7920, () => buildPF('n', 0, 0, true));
  await A.f.screenshot({ scale: 0.45 }); await B.f.screenshot({ scale: 0.45 }); }
