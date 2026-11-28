// read-mostly: wrap the clipped link row in [CR-08] 390 Region restricted, then verify it + desktop CR-08 x4
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('36:511527'); const log = {};
const t = f.findAll(n => n.type === 'TEXT' && /^Licence det/.test(n.characters))[0];
if (t) { let row = t.parent; while (row && row !== f && row.layoutMode !== 'HORIZONTAL') row = row.parent; let inInst = false; let p = row; while (p && p !== f) { if (p.type === 'INSTANCE') inInst = true; p = p.parent; }
  log.row = row ? row.name + ' ' + Math.round(row.width) + ' inInst=' + inInst : null;
  if (row && !inInst) { row.layoutWrap = 'WRAP'; row.counterAxisSpacing = 8; try { row.layoutSizingHorizontal = 'FILL'; } catch (e) { log.fillErr = e.message; } log.after = Math.round(row.width) + 'x' + Math.round(row.height); }
} else log.row = 'not found';
await f.screenshot({ scale: 0.5 });
for (const id of ['33:227442', '33:239177', '33:258312', '33:259170']) { const n = await figma.getNodeByIdAsync(id); await n.screenshot({ scale: 0.36 }); }
return log;
