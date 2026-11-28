// ===== usr-gaming reconciliation edit helpers =====
const LOG = { ok: [], miss: [] };
async function loadFontsOf(n) { try { const segs = n.getStyledTextSegments(['fontName']); for (const s of segs) await figma.loadFontAsync(s.fontName); } catch (e) { if (n.fontName !== figma.mixed) await figma.loadFontAsync(n.fontName); } }
async function writeText(n, str) {
  const ref = n.componentPropertyReferences && n.componentPropertyReferences.characters;
  if (ref) { let p = n.parent; while (p) { if (p.type === 'INSTANCE' && p.componentProperties && p.componentProperties[ref]) { p.setProperties({ [ref]: str }); return; } p = p.parent; } }
  await loadFontsOf(n); n.characters = str;
}
// setTxt(id, from, to): replace substring `from` (or whole text when from===null) in text node id
async function setTxt(id, from, to) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n || n.type !== 'TEXT') { LOG.miss.push(id + ' (missing)'); return; }
  if (from !== null && !n.characters.includes(from)) { LOG.miss.push(id + ' (no "' + from.slice(0, 30) + '")'); return; }
  const next = from === null ? to : n.characters.replace(from, to);
  if (next === n.characters) return; await writeText(n, next); LOG.ok.push(id);
}
// repIn(frame, from, to, exact): replace in every TEXT node of a frame that contains `from`
async function repIn(frame, from, to, exact = false) {
  let c = 0;
  for (const n of frame.findAll(x => x.type === 'TEXT' && (exact ? x.characters === from : x.characters.includes(from)))) { await writeText(n, exact ? to : n.characters.split(from).join(to)); c++; LOG.ok.push(n.id); }
  if (!c) LOG.miss.push(frame.name.slice(0, 24) + ' (no "' + from.slice(0, 30) + '")');
  return c;
}
// swapRows(textIdA, textIdB): swap the two sibling rows that contain these text nodes (newest-first ordering)
async function swapRows(idA, idB) {
  const a = await figma.getNodeByIdAsync(idA), b = await figma.getNodeByIdAsync(idB); if (!a || !b) { LOG.miss.push('swap ' + idA); return; }
  const chain = (n) => { const r = []; while (n) { r.push(n); n = n.parent; } return r; };
  const ca = chain(a), cb = chain(b); const P = ca.find(x => cb.includes(x)); if (!P) return;
  const rowA = ca[ca.indexOf(P) - 1], rowB = cb[cb.indexOf(P) - 1];
  const ia = P.children.indexOf(rowA), ib = P.children.indexOf(rowB); if (ia < 0 || ib < 0 || ia === ib) return;
  const sw = (x) => ('strokes' in x) ? { s: x.strokes, t: x.strokeTopWeight, r: x.strokeRightWeight, b: x.strokeBottomWeight, l: x.strokeLeftWeight } : null;
  const sa = sw(rowA), sb = sw(rowB);
  const lo = Math.min(ia, ib), hi = Math.max(ia, ib), first = ia < ib ? rowA : rowB, second = ia < ib ? rowB : rowA;
  P.insertChild(lo, second); P.insertChild(hi, first);
  const ap = (x, s) => { if (!s || !('strokes' in x)) return; x.strokes = s.s; x.strokeTopWeight = s.t; x.strokeRightWeight = s.r; x.strokeBottomWeight = s.b; x.strokeLeftWeight = s.l; };
  // keep divider strokes positional (the row that is now first gets the former first row's strokes)
  if (ia < ib) { ap(rowB, sa); ap(rowA, sb); } else { ap(rowA, sb); ap(rowB, sa); }
  LOG.ok.push('swap ' + rowA.id + '<->' + rowB.id);
}
