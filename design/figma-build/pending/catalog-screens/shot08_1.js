const page = figma.root.children.find(p => p.name === '08 — Games');
await figma.setCurrentPageAsync(page);
const ids = ["33:218161", "33:231778", "33:254288"];
const res = [];
for (const id of ids) { const n = await figma.getNodeByIdAsync(id); if (!n) { res.push({id, missing:true}); continue; } res.push({id, name:n.name, w:Math.round(n.width), h:Math.round(n.height)}); await n.screenshot({scale:0.35}); }
return res;