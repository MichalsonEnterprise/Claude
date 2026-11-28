// Targeted cosmetic fix (optional): [USR-G6] Game History / 390 / Export (152:65321) — the export filename wraps after "game-";
// move the DEMO badge from the File preview row into the File text stack so the Mono/S filename gets the full width. Idempotent.
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
await Promise.all([['Inter','Regular'],['Inter','Medium'],['Inter','Semi Bold'],['Inter','Bold'],['Geist Mono','Regular'],['Geist Mono','Medium']].map(([family, style]) => figma.loadFontAsync({ family, style })));
const f = await figma.getNodeByIdAsync('152:65321');
const fc = f.findOne(n => n.type === 'FRAME' && n.name === 'File preview');
const ft = fc.findOne(n => n.type === 'FRAME' && n.name === 'File');
const demo = fc.children.find(c => c.type === 'INSTANCE');
const mutated = [];
if (demo) { ft.appendChild(demo); mutated.push(demo.id); }
const name = ft.findOne(n => n.type === 'TEXT' && n.characters.startsWith('game-history'));
if (name) { name.layoutSizingHorizontal = 'FILL'; mutated.push(name.id); }
const sh = f.findOne(n => n.type === 'FRAME' && n.name.startsWith('Bottom sheet'));
sh.y = f.height - sh.height;
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'USR — Mobile B');
const frames = sec.children.map(c => ({ n: c.name, id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
await fc.screenshot({ scale: 1 });
return { mutated, nameLines: name ? Math.round(name.height) : null, frames };
