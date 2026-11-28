const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const res = [];
for (const id of ['34:350701', '34:351583']) { const n = await figma.getNodeByIdAsync(id); await n.screenshot({ scale: 0.4 }); res.push(id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height)); }
const notes = await figma.getNodeByIdAsync('36:527187'); await notes.screenshot({ scale: 0.6 });
return res;
