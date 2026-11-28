await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === '09 — Admin Panel'));
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
const R = {};
for (const id of ['80:59955', '80:61181']) {
  const f = await figma.getNodeByIdAsync(id); const tb = f.findOne(n => n.type === 'FRAME' && n.name === 'Table — Split');
  const find = lab => tb.children.find(r => r.findOne(n => n.type === 'TEXT' && n.characters === lab));
  const r3 = find('3rd prize'), rr = find('Runner-up');
  const old = rr.children[1];
  const good = r3.children[1].clone(); rr.insertChild(1, good);
  good.layoutSizingHorizontal = old.layoutSizingHorizontal; good.layoutSizingVertical = old.layoutSizingVertical;
  const nm = old.name; old.remove(); good.name = nm;
  const t = good.findAll(n => n.type === 'TEXT')[0]; await lf(t); t.characters = '2.00%';
  R[id] = { newCell: good.id, text: t.characters };
}
return R;
