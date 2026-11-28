// cursor pagers kept the component default "1–20 of 1,284": set each frame's real total; report any other frame still showing the default
const TOT = [['[ADM-B4] Transaction Monitoring', '1–20 of 4,203'], ['[ADM-B5] Blockchain Events', '1–20 of 18,912'], ['[ADM-C1] KYC Queue', '1–20 of 214'], ['[ADM-C2] AML Alerts', '1–20 of 23']];
const PGF = []; const PGLEFT = [];
for (const fr of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) { const ts = fr.findAll(n => n.type === 'TEXT' && n.characters === '1–20 of 1,284'); if (!ts.length) continue; const m = TOT.find(([p]) => fr.name.startsWith(p)); if (!m) { PGLEFT.push(fr.name); continue; } for (const t of ts) await setText(t, m[1]); PGF.push(fr.name.slice(0, 30) + ' → ' + m[1]); }
__R.push({ pagerFixed: PGF, pagerDefaultLeft: PGLEFT });
