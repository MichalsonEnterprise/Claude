const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'AUTH — Mobile D');
const out = [];
for (const f of sec.children) { if (f.type !== 'FRAME' || f.width !== 390) continue; if (f.height < 844) { const c = f.children.find(n => n.name === 'Content'); if (c) { f.minHeight = 844; c.layoutGrow = 1; out.push({ id: f.id, name: f.name, h: Math.round(f.height) }); } } }
const s = sec.children; let maxX = 0, maxY = 0; for (const c of s) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); } sec.resizeWithoutConstraints(maxX + 120, maxY + 120);
const a = await figma.getNodeByIdAsync('140:159327'); if (a) await a.screenshot({ scale: 0.6 });
const b = await figma.getNodeByIdAsync('142:62737'); if (b) await b.screenshot({ scale: 0.6 });
return { fixed: out, frames: s.filter(n => n.type === 'FRAME').length, section: sec.id };
