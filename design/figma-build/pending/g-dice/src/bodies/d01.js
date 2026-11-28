// DI-01 master — Desktop 1440 default
{ const R = await mk('[DI-01] Dice interface / 1440 / Default — roll over 50.50', 120, () => buildPlay('[DI-01] Dice interface / 1440 / Default — roll over 50.50', 0, 0, {}));
  OUT.hsTexts = R.hs.findAll(n => n.type === 'TEXT').map(t => t.characters).slice(0, 24);
  await R.f.screenshot({ scale: 0.5 }); }
