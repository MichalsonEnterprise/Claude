const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name.startsWith('PUB-05/08/09/13'));
const fixed = [];
for (const t of sec.findAllWithCriteria({ types: ['TEXT'] })) {
  if (!t.characters.includes('AURORA-27')) continue;
  for (const fn of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(fn);
  t.characters = t.characters.split('AURORA-27').join('SUNSET-42');
  fixed.push({ id: t.id, now: t.characters.slice(0, 60), parent: t.parent.name });
}
const ids = ['33:318074', '34:345543', '34:394740', '34:407847'];
for (const id of ids) { const f = await figma.getNodeByIdAsync(id); await f.screenshot({ scale: Math.min(0.5, 1800 / f.height) }); }
return { fixed };
