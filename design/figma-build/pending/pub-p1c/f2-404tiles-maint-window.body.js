// FIX 2 (pub-p1c continuation): 404 'Popular right now' tiles — HOT tag + player pill (with DEMO) overflowed the 160 px tile top bar;
// Maintenance hero — 'Window' facts row (530) overflowed its 520 px copy column.
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const mutated = [], notes = [];
const f404 = await figma.getNodeByIdAsync('54:101512');
for (const tile of f404.findAll(n => n.type === 'INSTANCE' && n.name === 'Tile/Game Generic')) {
  const bar = tile.findOne(n => n.name === 'Top bar'); if (!bar) continue;
  const pl = bar.children.find(k => k.name === 'Players'), tag = bar.children.find(k => k.name === 'Tag' && k.visible);
  if (!pl || !tag) continue;
  const tb = tile.absoluteBoundingBox, pb = pl.absoluteBoundingBox;
  if (pb.x + pb.width > tb.x + tb.width - bar.paddingRight) {
    const cp = tile.componentProperties; const key = Object.keys(cp).find(k => /tag/i.test(k.split('#')[0]) && cp[k].type === 'BOOLEAN');
    if (key) tile.setProperties({ [key]: false }); else tag.visible = false;
    mutated.push(tile.id); notes.push('tag hidden on ' + tile.id + (key ? ' via ' + key.split('#')[0] : ' via visible'));
  }
}
const fm = await figma.getNodeByIdAsync('82:103376');
const win = fm.findOne(n => n.name === 'Window' && n.parent && n.parent.name === 'Copy');
if (win) {
  const kids = win.children.filter(k => k.visible).reduce((s, k) => s + k.width, 0);
  const n = win.children.filter(k => k.visible).length;
  const avail = win.parent.width - win.paddingLeft - win.paddingRight - kids;
  const g = [24, 20, 16, 12, 8].find(v => v * (n - 1) <= avail) || 8;
  gap(win, g); win.layoutSizingHorizontal = 'FILL';
  mutated.push(win.id); notes.push({ winKids: Math.round(kids), avail: Math.round(avail), gap: g, w: Math.round(win.width), copyW: Math.round(win.parent.width) });
}
const pop = f404.findOne(n => n.type === 'INSTANCE' && n.name === 'Tile/Game Generic');
if (pop) await pop.parent.screenshot({ scale: 0.8 });
if (win) await win.parent.parent.screenshot({ scale: 0.7 });
return { mutated, notes };
