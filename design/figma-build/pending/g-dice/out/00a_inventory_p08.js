const page = figma.root.children.find(p => p.name === '08 — Games'); await figma.setCurrentPageAsync(page);
const secs = page.children.map(n => ({ n: n.name, id: n.id, t: n.type, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height) }));
const di = page.children.find(n => n.type === 'SECTION' && n.name === 'DI Dice & GM-01');
const frames = di ? di.children.map(n => ({ n: n.name, id: n.id, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) })) : null;
return { secs, frames };
