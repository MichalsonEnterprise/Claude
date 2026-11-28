const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const info = [];
info.push(await compose([{ id: '34:435744' }, { id: '34:491926' }], 0.7));
info.push(await compose([{ id: '34:472716', part: 0, of: 2 }, { id: '34:472716', part: 1, of: 2 }], 0.7));
info.push(await compose([{ id: '36:503505', hideFooter: false }, { id: '36:518622', hideFooter: false }], 0.9));
const ov = {}; for (const id of ['34:435744', '34:472716', '34:491926', '36:503505', '36:518622']) { const f = await figma.getNodeByIdAsync(id); ov[id] = overflowList(f).slice(0, 8); }
return { info, ov };
