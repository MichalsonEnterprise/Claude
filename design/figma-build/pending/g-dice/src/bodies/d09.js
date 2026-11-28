// DI-01 Tablet 768 — placed in a row below all desktop frames
{ const NAME = '[DI-01] Dice interface / 768 / Default — roll over 50.50'; dropByName(sec, NAME);
  let maxB = 0; for (const c of sec.children) maxB = Math.max(maxB, c.y + c.height);
  const R = await mk(NAME, 120, async () => buildPlay('n', 0, 0, { w: 768 }), maxB + 400);
  await R.f.screenshot({ scale: 0.5 }); }
