// Laptop 1280 pass: clone desktop masters, switch Breakpoint mode, reflow (FILL layouts), hide low-priority columns.
// Edit LIST before running: [desktopFrameId, orderKey]
const LIST = [['68:53474', 'C1Q'], ['75:56265', 'C1R'], ['77:56703', 'C2'], ['86:116072', 'C3']];
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-B1..B8 Blockchain & ADM-C1..C7 Compliance', 70000, 0);
// fixes on desktop masters before cloning
const CTX = { '68:53474': { 'Decisions today': 'vs yesterday', 'Median time to decision': 'vs previous 7 d' }, '77:56703': { 'Open alerts': 'vs yesterday', 'Alerts closed (7 days)': 'vs previous 7 d' }, '86:116072': { 'Open cases': 'vs yesterday', 'Reports filed in November': 'vs October', 'Funds held by restriction': 'held, not seized' } };
for (const [fid, m] of Object.entries(CTX)) { const fr = await figma.getNodeByIdAsync(fid); if (!fr) continue; for (const k of fr.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile — '))) { const lab = k.name.replace('Admin/KPI Tile — ', ''); if (m[lab]) { const t = k.findOne(n => n.type === 'TEXT' && /^vs /.test(n.characters)); if (t) await setText(t, m[lab]); else MISS.push('ctx ' + lab); } } }
{ const c3 = await figma.getNodeByIdAsync('86:116072'); const k = c3 && c3.findOne(n => n.name === 'Admin/KPI Tile — Funds held by restriction'); if (k) await setT(k, 'Definition', 'WD-20952 + WD-20960 · held under restriction, not seized'); }
const made = [];
for (const [id, key] of LIST) {
  const src = await figma.getNodeByIdAsync(id); if (!src) { MISS.push('no ' + id); continue; }
  const nm = src.name.replace('/ 1440 /', '/ 1280 /'); if (sec.children.find(n => n.name === nm)) { MISS.push('exists ' + nm); continue; }
  const band = src.name.startsWith('[ADM-C') ? 'C-1280' : 'B-1280';
  const p = POS(band, key); const f = src.clone(); sec.appendChild(f); f.name = nm; f.x = p.x; f.y = p.y;
  f.resize(1280, f.height); f.primaryAxisSizingMode = 'AUTO';
  const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === 'Laptop 1280'); if (bm) f.setExplicitVariableModeForCollection(bc, bm.modeId);
  for (const t of f.findAll(n => n.name.startsWith('Table — ') && n.name.includes('{hideL:'))) { const ks = t.name.match(/\{hideL:([^}]*)\}/)[1].split(','); for (const n of t.findAll(x => ks.some(k => x.name === 'Col/' + k || x.name === 'H/' + k))) n.visible = false; }
  for (const n of f.findAll(x => x.name.includes('[hideL]'))) n.visible = false;
  for (const t of f.findAll(n => n.type === 'TEXT' && n.parent && n.parent.name && n.parent.name.startsWith('Doc — '))) { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; }
  if (f.name.startsWith('[ADM-C1] KYC Review')) { const rr = f.findOne(n => n.name === 'Decision rail'); if (rr) { rr.resize(360, rr.height); rr.primaryAxisSizingMode = 'AUTO'; } const pm = f.findOne(n => n.name === 'Passport mock'); if (pm) pm.rescale(0.85); for (const t of f.findAll(n => n.type === 'TEXT')) { if (t.characters === 'Chrome 131 · macOS · Berlin') await setText(t, 'Chrome · Berlin'); else if (t.characters === 'IP country matches residence') await setText(t, 'IP matches residence'); } }
  made.push(f);
}
fitSection(sec);
for (const f of made) await f.screenshot({ scale: 0.35 });
return { made: made.map(f => [f.id, f.name, Math.round(f.height), f.x, f.y]), miss: [...new Set(MISS)] };
