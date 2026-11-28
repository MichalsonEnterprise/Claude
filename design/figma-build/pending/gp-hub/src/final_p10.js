// page 10 final: re-anchor GP-03 sheet to the viewport bottom after the hash-row fix (sheet grew), check sticky bars, refit section
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'GP — Mobile A');
const out = {};
const f3 = await figma.getNodeByIdAsync('164:73073'); const vp = f3.findOne(n => n.name.startsWith('Viewport')); const sh = vp.children.find(n => n.name === 'Sheet — Participation pending'); const scrim = vp.children.find(n => n.name === 'Scrim');
out.before = { vpH: Math.round(vp.height), sheetY: Math.round(sh.y), sheetH: Math.round(sh.height) };
if (vp.height - sh.height < 96) { const nh = Math.round(sh.height) + 120; vp.resize(390, nh); if (scrim) scrim.resize(390, nh); }
sh.y = Math.round(vp.height - sh.height);
out.after = { vpH: Math.round(vp.height), sheetY: Math.round(sh.y), sheetH: Math.round(sh.height), frameH: Math.round(f3.height) };
const chk = [];
for (const id of ['34:473267', '34:482737', '34:492964']) {
  const f = await figma.getNodeByIdAsync(id); const sb = f.findOne(n => n.name === 'Sticky participate bar (pinned above tab bar)'); const tb = f.findOne(n => n.name === 'Nav/Mobile Tab Bar');
  const r = (n) => n && { y: Math.round(n.absoluteBoundingBox.y - f.absoluteBoundingBox.y), h: Math.round(n.height), parent: n.parent.name, pos: n.layoutPositioning };
  chk.push({ id, frameH: Math.round(f.height), sticky: r(sb), tab: r(tb) });
}
out.chk = chk;
let maxX = 0, maxY = 0; for (const c of sec.children) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); } sec.resizeWithoutConstraints(maxX + 120, maxY + 120);
out.sec = { id: sec.id, w: Math.round(sec.width), h: Math.round(sec.height) };
await f3.screenshot({ scale: 0.6 });
return out;
