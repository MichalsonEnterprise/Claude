const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const info = [];
info.push(await compose([{ id: '33:279676', part: 0, of: 2 }, { id: '33:279676', part: 1, of: 2 }], 0.53));
info.push(await compose([{ id: '33:323120', part: 0, of: 2 }, { id: '33:323120', part: 1, of: 2 }], 0.53));
info.push(await compose([{ id: '34:356600' }], 0.53));
info.push(await compose([{ id: '34:396216', hideFooter: false }, { id: '34:409284', hideFooter: false }], 0.53));
return { info };
