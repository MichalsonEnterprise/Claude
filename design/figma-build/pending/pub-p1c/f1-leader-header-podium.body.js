// FIX (pub-p1c continuation, 28 Nov 2026): leaderboard 1440 frames — (1) standings column header row had fixed 730/120/120 cells
// overflowing the 702 px row behind the right column; (2) podium handles overflowed their 51 px Handle frame under the DEMO badge.
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const mutated = [], created = [], notes = [];
for (const fid of ['84:103900', '84:104905', '84:105918']) {
  const f = await figma.getNodeByIdAsync(fid);
  // (1) column header
  const hRank = f.findOne(n => n.name === 'H/Rank');
  const hdr = hRank && hRank.parent;
  if (hdr && hdr.layoutMode === 'HORIZONTAL') {
    const row = hdr.parent.children.find(c => c.type === 'INSTANCE' && c.name === 'Table/Leaderboard Row');
    const cols = row ? row.children.map(k => ({ name: k.name, x: Math.round(k.x), w: Math.round(k.width) })) : [];
    const hPlayer = hdr.children.find(k => k.name === 'H/Player');
    const hPoints = hdr.children.find(k => k.name === 'H/Points');
    const hPrize = hdr.children.find(k => k.name.startsWith('H/Prize'));
    if (hPlayer) { hPlayer.layoutSizingHorizontal = 'FILL'; mutated.push(hPlayer.id); }
    // match the row instance's column geometry when it is readable
    if (row) {
      pad(hdr, hdr.paddingTop, row.paddingRight, hdr.paddingBottom, row.paddingLeft); gap(hdr, row.itemSpacing);
      const pick = re => row.children.find(k => re.test(k.name));
      const cPts = pick(/point/i), cPrz = pick(/prize/i), cRank = pick(/rank/i);
      if (cRank && hRank) { hRank.resize(cRank.width, hRank.height); }
      if (cPts && hPoints) { hPoints.resize(cPts.width, hPoints.height); }
      if (cPrz && hPrize) { hPrize.resize(cPrz.width, hPrize.height); }
    }
    mutated.push(hdr.id);
    const hb = hdr.absoluteBoundingBox;
    notes.push({ fid, rowCols: cols, rowPad: row ? [row.paddingLeft, row.paddingRight, row.itemSpacing] : null, hdrKids: hdr.children.map(k => k.name + ':' + Math.round(k.x) + '/' + Math.round(k.width)), hdrW: Math.round(hb.width) });
  }
  // (2) podium handles: DEMO badge moves under the handle next to the place label
  for (const h of f.findAll(n => n.name === 'Handle' && n.type === 'FRAME' && n.layoutMode === 'VERTICAL')) {
    const who = h.parent; if (!who || who.name !== 'Who') continue;
    const badge = who.children.find(k => k.type === 'INSTANCE' && k.name === 'Badge/DEMO');
    if (!badge) continue; // already fixed
    const placeT = h.children.find(k => k.type === 'TEXT' && /place$/.test(k.characters));
    const placeRow = AL('HORIZONTAL', { name: 'Place', gap: 6, align: 'CENTER' });
    h.insertChild(1, placeRow);
    if (placeT) placeRow.appendChild(placeT);
    placeRow.appendChild(badge);
    gap(who, 8);
    created.push(placeRow.id); mutated.push(h.id, who.id);
  }
}
// generic audit on all frames in the section: nodes that overflow their auto-layout parent horizontally
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'PUB-24/25/26 Errors & PUB-06 Leaderboard');
const audit = {};
for (const fr of sec.children) {
  if (fr.type !== 'FRAME') continue; const bad = [];
  for (const n of fr.findAll(n => n.visible && n.parent && n.parent.type !== 'INSTANCE' && n.parent.layoutMode && n.parent.layoutMode !== 'NONE' && n.layoutPositioning !== 'ABSOLUTE')) {
    const b = n.absoluteBoundingBox, pb = n.parent.absoluteBoundingBox; if (!b || !pb) continue;
    if (b.x + b.width > pb.x + pb.width + 1.5 || b.x < pb.x - 1.5) bad.push(n.name.slice(0, 28) + '>' + n.parent.name.slice(0, 20) + '(' + Math.round(b.x + b.width - pb.x - pb.width) + ')');
  }
  audit[fr.id] = bad.slice(0, 12).concat(bad.length > 12 ? ['+' + (bad.length - 12)] : []);
}
const m = await figma.getNodeByIdAsync('84:106652');
await m.screenshot({ scale: 0.75 });
return { mutated: [...new Set(mutated)], created, notes, audit };
