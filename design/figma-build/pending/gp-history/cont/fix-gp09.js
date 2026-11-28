const FIX = {};
try { // ---- fix GP-09 settled frame: VRF stepper settled time must match the round header (20:02:10), response time 35 s
  const g = await figma.getNodeByIdAsync('182:110323'); let n = 0;
  for (const t of g.findAll(x => x.type === 'TEXT' && (x.characters === '20:02:05' || x.characters === '37 s' || x.characters.includes('20:02:05')))) { await fnt(t); t.characters = t.characters === '37 s' ? '35 s' : t.characters.split('20:02:05').join('20:02:10'); n++; }
  FIX.gp09 = n;
} catch (e) { FIX.err = String(e && e.message || e).slice(0, 200); }
