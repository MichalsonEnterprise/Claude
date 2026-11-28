const LIST = [["[ADM-B1] Supported Networks / 1440 / Default", "B1"], ["[ADM-B2] Smart Contracts / 1440 / Default", "B2"], ["[ADM-B3] Contract Addresses / 1440 / Default", "B3"], ["[ADM-B4] Transaction Monitoring / 1440 / Live", "B4"]];
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
const made = [];
for (const [srcName, key] of LIST) {
  const src = sec.children.find(n => n.name === srcName); if (!src) { MISS.push('missing ' + srcName); continue; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { MISS.push('exists ' + nm); continue; }
  const band = src.name.startsWith('[ADM-C') ? 'C-1280' : 'B-1280';
  const p = POS(band, key); const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = p.x; f.y = p.y;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  for (const t of f.findAll(n => n.name.startsWith('Table — ') && n.name.includes('{hideL:'))) { const ks = t.name.match(/\{hideL:([^}]*)\}/)[1].split(','); for (const n of t.findAll(x => ks.some(k => x.name === 'Col/' + k || x.name === 'H/' + k))) n.visible = false; }
  for (const n of f.findAll(x => x.name.includes('[hideL]'))) n.visible = false;
  made.push(f);
}
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.35 });
return { made: made.map(f => [f.id, f.name, Math.round(f.height), f.x, f.y]), miss: [...new Set(MISS)] };
