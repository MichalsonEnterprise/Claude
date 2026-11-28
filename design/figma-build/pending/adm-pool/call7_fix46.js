await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === '09 — Admin Panel'));
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
async function natural(t) { const m = figma.createText(); const fn = t.getRangeFontName(0, 1); await figma.loadFontAsync(fn); m.fontName = fn; m.fontSize = t.getRangeFontSize(0, 1); const ls = t.getRangeLetterSpacing(0, 1); if (ls) m.letterSpacing = ls; m.characters = t.characters; const w = m.width; m.remove(); return w; }
const R = { p6: {}, p4: {} };
// --- P6: Runner-up share cell renders blank
for (const id of ['80:59955', '80:61181']) {
  const f = await figma.getNodeByIdAsync(id); const tb = f.findOne(n => n.type === 'FRAME' && n.name === 'Table — Split');
  const rr = tb && tb.children.find(r => r.findOne(n => n.type === 'TEXT' && n.characters === 'Runner-up'));
  if (!rr) { R.p6[id] = 'no row'; continue; }
  const cell = rr.children[1];
  const info = cell.findAll(n => n.type === 'TEXT').map(t => ({ id: t.id, c: t.characters, vis: t.visible, w: Math.round(t.width), h: Math.round(t.height), ar: t.textAutoResize, tr: t.textTruncation, op: t.opacity, fills: t.fills.length }));
  for (const t of cell.findAll(n => n.type === 'TEXT')) {
    if (t.characters.trim() === '' || /^2\.00%/.test(t.characters) || t.characters === '—') { await lf(t); t.visible = true; t.characters = '2.00%'; if (t.textAutoResize === 'NONE' || t.width < 8) t.textAutoResize = 'WIDTH_AND_HEIGHT'; }
  }
  R.p6[id] = { cell: cell.name, cw: Math.round(cell.width), before: info, after: cell.findAll(n => n.type === 'TEXT').map(t => [t.characters, Math.round(t.width), Math.round(t.height), t.visible]) };
  if (id === '80:61181') await tb.screenshot({ scale: 0.6 });
}
// --- P4 1440: Settlement column truncation -> measure and shorten copy where it does not fit
const p4 = await figma.getNodeByIdAsync('79:57471');
const cells = p4.findAll(n => n.name.startsWith('C — Settlement'));
const SH = [[/^Scheduled (\d\d:\d\d):\d\d$/, 'Due $1 UTC'], [/^(\d\d:\d\d):\d\d · (\d+) prizes? held$/, '$1 · $2 held'], [/^Refunding · (.*)$/, 'Refunds $1'], [/^(\d\d:\d\d):\d\d$/, '$1']];
const rows = [];
for (const c of cells) {
  const t = c.findAll(n => n.type === 'TEXT' && n.visible)[0]; if (!t) continue;
  const avail = c.width - (c.paddingLeft || 12) - (c.paddingRight || 12) - 4;
  let w = await natural(t); const before = t.characters;
  if (w > avail) { for (const [re, rep] of SH) { if (re.test(t.characters)) { await lf(t); t.characters = t.characters.replace(re, rep); break; } } w = await natural(t); }
  rows.push([before, t.characters, Math.round(w), Math.round(avail)]);
}
R.p4 = { cw: cells[0] && Math.round(cells[0].width), rows };
const t4 = p4.findAll(n => n.type === 'FRAME' && n.name.startsWith('Table —'))[0]; if (t4) await t4.screenshot({ scale: 0.5 });
return R;
