const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const out = {};
// A) G6 390 Filters — compact the sheet so the page header stays visible behind the scrim
const ff = await figma.getNodeByIdAsync('229:241469');
const sh = ff.findOne(n => n.type === 'FRAME' && n.name.startsWith('Bottom sheet'));
const sub = sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('3 filters set')); if (sub) sub.characters = '3 filters set · 38 of 486 bets match';
const link = sh.findOne(n => n.type === 'FRAME' && n.name.startsWith('Show all 33 games')); if (link) link.remove();
const gc = sh.findOne(n => n.type === 'FRAME' && n.name === 'Game chips (multi-select)');
if (gc && !gc.findOne(n => n.name === 'Chip — + 27 more games')) { const c = await I('17:2766', { State: 'Default' }, { Label: '+ 27 more games', 'Show icon': true, Icon: ICONS['chevron-down'] }); c.name = 'Chip — + 27 more games'; gc.appendChild(c); }
const cap = sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('20 – 27 Nov 2026')); if (cap) cap.remove();
const note = sh.findOne(n => n.type === 'TEXT' && n.characters.startsWith('38 of 486 bets match')); if (note) note.characters = '38 of 486 bets match — Orbit Rush wins, 20 – 27 Nov 2026 (UTC). Filters never change odds or limits.';
sh.y = ff.height - sh.height; out.sheet = { h: Math.round(sh.height), y: Math.round(sh.y) };
// B) G6 390 Default — session strip: 'Take a break' overflowed the right edge -> let the row wrap inside the card
const gd = await figma.getNodeByIdAsync('36:535016'); const fb = gd.absoluteBoundingBox;
const tb = gd.findAll(n => n.type === 'TEXT' && n.characters === 'Take a break').find(n => n.absoluteBoundingBox.x + n.absoluteBoundingBox.width > fb.x + fb.width);
if (tb) {
  let row = tb.parent; while (row && !(row.layoutMode === 'HORIZONTAL' && row.children.length > 1 && !row.name.startsWith('Link'))) row = row.parent;
  out.row = { name: row.name, w: Math.round(row.width), sizing: row.layoutSizingHorizontal, kids: row.children.map(c => c.name.slice(0, 30)) };
  if (row.layoutSizingHorizontal === 'HUG' && row.parent && row.parent.layoutMode && row.parent.layoutMode !== 'NONE') row.layoutSizingHorizontal = 'FILL';
  row.layoutWrap = 'WRAP'; bnum(row, 'counterAxisSpacing', 4);
  out.after = { w: Math.round(row.width), h: Math.round(row.height), right: Math.round(tb.absoluteBoundingBox.x + tb.absoluteBoundingBox.width - fb.x) };
}
await ff.screenshot({ scale: 0.8 });
const strip = tb ? (() => { let p = tb.parent; while (p && p.parent && p.parent.id !== gd.id && p.width < 350) p = p.parent; return p; })() : gd;
await strip.screenshot({ scale: 1 });
return { mutated: ['229:241469', '36:535016'], out };
