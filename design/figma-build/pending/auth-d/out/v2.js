const page = figma.root.children.find(p => p.name === '04 — Authentication'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'AUTH-05/06/18..21 Recovery & restrictions');
for (const id of ['137:82508', '137:84541', '137:86543']) { const f = await figma.getNodeByIdAsync(id); if (f) { const d = f.findAll(n => n.name && n.name.startsWith('Dialog — '))[0]; await (d || f).screenshot({ scale: 0.5 }); } }
return { section: sec.id, w: Math.round(sec.width), h: Math.round(sec.height), frames: sec.children.map(c => ({ id: c.id, name: c.name, h: Math.round(c.height) })) };
