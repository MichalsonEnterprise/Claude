// read-only: screenshot ADM-G frames for visual verification (no helpers needed, creates nothing)
const page = figma.root.children.find(p => p.name === '09 — Admin Panel');
await figma.setCurrentPageAsync(page);
const res = [];
for (const id of ['33:166714','33:215941','34:421954']) { const f = await figma.getNodeByIdAsync(id); if (!f) { res.push({ id, missing: true }); continue; } res.push({ id, name: f.name, w: Math.round(f.width), h: Math.round(f.height) }); await f.screenshot({ scale: 0.45 }); }
return res;
