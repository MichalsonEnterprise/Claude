// C5 master check (its screenshot was dropped in r1: 5-image cap per call)
{ const c5 = sec.children.find(n => n.name === '[ADM-C5] Restricted Countries / 1440 / Default'); if (c5) await c5.screenshot({ scale: 0.5 }); else MISS.push('no C5'); }
// widen truncated table columns on the C4 + C6 masters before their Laptop clones are made (Cell/Custom frames keep hug height)
const FIX = { '[ADM-C4] Sanctions Screening / 1440 / Default': ['Screening results', { ref: 100, user: 140, score: 72, basis: 204, status: 176, raised: 136, act: 40 }], '[ADM-C6] Self-Exclusion / 1440 / Default': ['Exclusions', { type: 212, start: 128, end: 152, source: 148, bal: 112, status: 168, act: 40 }] };
for (const [fn, [tn, W]] of Object.entries(FIX)) {
  const fr = sec.children.find(n => n.name === fn); if (!fr) { MISS.push('fix: no ' + fn); continue; }
  const tb = fr.findOne(n => n.name.startsWith('Table — ' + tn)); if (!tb) { MISS.push('fix: no table ' + tn); continue; }
  for (const [k, w] of Object.entries(W)) for (const n of tb.findAll(x => x.name === 'Col/' + k || x.name === 'H/' + k)) { n.resize(w, n.height); if (n.type === 'FRAME') n.counterAxisSizingMode = 'AUTO'; }
  await tb.screenshot({ scale: 0.5 });
}
