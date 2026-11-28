// RL-01 tablet 768 — row below the whole desktop band
const NT = '[RL-01] Table / 768 / Bets placed — ready to spin';
if (!has(NT)) { let ym = 0; for (const c of sec.children) if (c.name !== NT) ym = Math.max(ym, c.y + c.height); const R = await mk(NT, 120, async () => buildPlay('n', 0, 0, { w: 768, rgStrip: () => rgStrip({}) }), ym + 400); await R.f.screenshot({ scale: 0.6 }); } else OUT.skippedT = NT;
