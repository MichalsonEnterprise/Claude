// READ-ONLY (no helpers). Screenshots + text-overflow count of the 6 desktop frames built by the earlier run (page 03, section 54:101508).
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const out = [];
for (const id of ['54:101512', '82:102573', '82:103376', '84:103900', '84:104905', '84:105918']) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { out.push(id + ' missing'); continue; }
  const fb = f.absoluteBoundingBox; let over = 0; for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) { const b = t.absoluteBoundingBox; if (b && t.visible && (b.x + b.width > fb.x + fb.width + 1 || b.x < fb.x - 1)) over++; }
  out.push({ id, name: f.name, h: Math.round(f.height), textOverflow: over });
  await f.screenshot({ scale: 0.28 });
}
return out;
