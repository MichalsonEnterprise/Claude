const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION' && n.x > 180000 && n.x < 230000).map(n => ({ n: n.name, id: n.id, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) }));
const di = page.children.find(n => n.type === 'SECTION' && n.name === 'Games — Mobile Dice');
const frames = di ? di.children.map(n => ({ n: n.name, id: n.id, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) })) : null;
return { secs, frames };
