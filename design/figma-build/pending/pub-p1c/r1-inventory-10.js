// READ-ONLY (no helpers). Page 10: sections (to check X=42000 is free) + frames in 'PUB-06/24/25/26 — Mobile'.
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const secs = page.children.filter(n => n.type === 'SECTION').map(s => [s.name, Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)].join('|'));
const mine = page.children.find(n => n.type === 'SECTION' && n.name === 'PUB-06/24/25/26 — Mobile');
const frames = mine ? mine.children.map(c => ({ id: c.id, name: c.name, w: Math.round(c.width), h: Math.round(c.height), x: Math.round(c.x), y: Math.round(c.y), sizing: c.primaryAxisSizingMode })) : null;
return { secs, mine: mine ? mine.id : null, frames };
