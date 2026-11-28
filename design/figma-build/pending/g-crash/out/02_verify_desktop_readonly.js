const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const ids = ['32:90238', '33:124526', '33:156588', '33:191216', '33:209124', '33:284530', '33:311252', '34:331972', '33:227442', '33:239177', '33:258312', '33:259170', '34:350701', '34:351583'];
const res = [];
for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n) { res.push(id + ' MISSING'); continue; } await n.screenshot({ scale: n.width > 1000 ? 0.32 : 0.4 }); res.push(id + ' ' + Math.round(n.width) + 'x' + Math.round(n.height)); }
return res;
