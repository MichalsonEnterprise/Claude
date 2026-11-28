// ===== ADM-F (page 09): align WD-20931 detail SLA countdown with the queue (18:48 UTC → 3 h 07 min left) + verification shots of F6 1280 and F9 frames =====
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = page_sec(); function page_sec() { return figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === 'ADM-F1..F9 Finance'); }
const changed = [];
for (const f of sec.children.filter(n => n.name.startsWith('[ADM-F2] Withdrawal WD-20931 — Detail'))) {
  for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) {
    if (!t.characters.includes('3 h 40 min left')) continue;
    const fonts = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]; for (const fn of fonts) await figma.loadFontAsync(fn);
    t.characters = t.characters.replace('3 h 40 min left', '3 h 07 min left'); changed.push([f.name.split(' / ').slice(1).join(' / '), t.id]);
  }
}
const shots = ['34:470654', '34:443539', '34:444049', '34:444305'];
for (const id of shots) { const n = await figma.getNodeByIdAsync(id); if (n) await n.screenshot({ scale: 0.35 }); }
return { changed, shots };
