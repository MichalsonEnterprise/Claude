const FIX = {};
try { // ---- fix GP-08 1440 frames built in the first call (spacers, truncation, date range)
  for (const id of ['179:100737', '179:101660']) {
    const f = await figma.getNodeByIdAsync(id); if (!f) { FIX[id] = 'missing'; continue; } let sp = 0, tx = 0;
    for (const s of f.findAll(n => n.type === 'FRAME' && n.name === 'Spacer')) { const w = s.width; s.resize(Math.max(1, w), 1); if (s.parent && s.parent.layoutMode !== 'NONE') s.layoutSizingHorizontal = 'FILL'; sp++; }
    const rep = [['min 500 · 4,120 entries', '4,120 entries'], ['Runner-up · +3,620.60 USDT', 'Runner-up · +3,620.60'], ['351.75 USDT · in the draw', 'In the draw · 351.75'], ['Closes 27 Nov 2026, 20:00 UTC', 'Fri 27 Nov'], ['Draws 20:00 UTC', 'Closes 20:00 UTC'], ['#1,244 · #1,246 · #1,247', '3 rounds'], ['Entered 5 of 5 rounds', 'Entered 5/5']];
    for (const t of f.findAll(n => n.type === 'TEXT')) {
      const c = t.characters; let n = c;
      for (const [a, b] of rep) if (n === a || (a.length > 14 && n.includes(a))) n = n.split(a).join(b);
      if (f.name.includes('Filters') && /20 Nov 2026/.test(n) && /27 Nov 2026/.test(n)) n = n.replace('20 Nov 2026', '23 Nov 2026').replace('27 Nov 2026', '25 Nov 2026');
      if (c === '412' && t.name === 'Primary') n = '412 / 500';
      if (n !== c) { await fnt(t); t.characters = n; tx++; }
    }
    const tbx = f.findOne(n => n.name === 'Toolbar'); const sx = tbx && tbx.children.find(n => n.type === 'INSTANCE'); if (sx) sx.resize(240, sx.height);
    FIX[id] = { sp, tx, srch: sx ? sx.name : null };
  }
  const g1 = await figma.getNodeByIdAsync('179:100737'), g2 = await figma.getNodeByIdAsync('179:101660'); const tbz = g2.findOne(n => n.name === 'Toolbar'); const popz = await figma.getNodeByIdAsync('179:102438'); if (popz) popz.y = tbz.y + tbz.height + 8;
  g2.y = g1.y + g1.height + 160; FIX.h = [Math.round(g1.height), Math.round(g2.height)];
  await g1.screenshot({ scale: 0.5 }); await g2.screenshot({ scale: 0.5 });
} catch (e) { FIX.err = String(e && e.message || e).slice(0, 200); }
fitSection(sec);
