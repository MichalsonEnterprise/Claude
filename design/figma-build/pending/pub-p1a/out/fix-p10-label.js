// Page 10: relabel 'Your code:' -> 'Example code:' beside the illustrative anti-phishing code SUNSET-42 (PUB-13 390, text 36:523783)
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const code = await figma.getNodeByIdAsync('36:523783');
const row = code.parent; const out = [];
for (const t of row.findAllWithCriteria({ types: ['TEXT'] })) {
  if (t.characters.trim() === 'Your code:') { for (const fn of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(fn); t.characters = 'Example code:'; out.push(t.id); }
}
const card = row.parent && row.parent.parent ? row.parent.parent : row.parent;
await card.screenshot({ scale: 1 });
return { changed: out, card: card.name, cardId: card.id };
