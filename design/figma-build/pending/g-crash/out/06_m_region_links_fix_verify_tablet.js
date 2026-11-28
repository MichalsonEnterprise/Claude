const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('36:511527'); const log = {};
const findRow = () => { const t = f.findAll(n => n.type === 'TEXT' && /^Licence det/.test(n.characters))[0]; if (!t) return null; let row = t.parent; while (row && row !== f && row.layoutMode !== 'HORIZONTAL') row = row.parent; return row; };
let row = findRow();
if (row) {
  log.before = row.children.map(c => c.name + ':' + c.visible);
  const target = row.children.find(c => { const tx = c.type === 'TEXT' ? c : (c.findOne ? c.findOne(n => n.type === 'TEXT') : null); return tx && /^Restricted countries/.test(tx.characters); });
  if (target && target.visible) target.visible = false;
  row = findRow();
  log.after = row ? row.children.map(c => c.name + ':' + c.visible) : null;
  log.rowW = row ? Math.round(row.width) : null;
} else log.row = 'not found';
await f.screenshot({ scale: 0.5 });
for (const id of ['34:350701', '34:351583', '36:527187']) { const n = await figma.getNodeByIdAsync(id); await n.screenshot({ scale: id === '36:527187' ? 0.6 : 0.4 }); }
return log;
