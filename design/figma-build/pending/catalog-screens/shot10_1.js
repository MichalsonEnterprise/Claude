const page = figma.root.children.find(p => p.name === '10 — Mobile Experience');
await figma.setCurrentPageAsync(page);
const ids = ["42:45652", "44:45796", "49:63106"];
const res = [];
for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n) { res.push({id, missing:true}); continue; } res.push({id, name:n.name, w:Math.round(n.width), h:Math.round(n.height)}); await n.screenshot({scale:0.5}); }
return res;