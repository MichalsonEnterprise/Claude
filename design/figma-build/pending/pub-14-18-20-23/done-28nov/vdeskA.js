const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const info = [];
info.push(await compose([{ id: '33:205848', part: 0, of: 2 }, { id: '33:205848', part: 1, of: 2 }], 0.53));
info.push(await compose([{ id: '33:242174' }, { id: '36:534066' }], 0.53));
return { info };
