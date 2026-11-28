// Page 05: the earlier run laid USR-A1..A10 out in 10 columns (section 15,720 wide), overlapping 'USR-F1..F6 Financial history' at X=36000.
// Move the A6..A10 columns into a second band below A1..A5 (keeps every frame and its stack offsets), refit the section, screenshot each frame.
const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'USR-A1..A10 Account & security');
const num = (n) => { const m = /\[USR-A(\d+)\]/.exec(n); return m ? +m[1] : 0; };
const fr = sec.children.filter(c => c.type === 'FRAME');
const b0 = fr.filter(c => num(c.name) >= 1 && num(c.name) <= 5);
const top1 = Math.max(...b0.map(c => c.y + c.height)) + 480;
const moved = [];
for (const c of fr) { const k = num(c.name); if (k < 6) continue; if (c.x < 7800) continue; // already in band 1
  const col = k - 6; const nx = 120 + col * 1560; const ny = top1 + (c.y - 160); c.x = nx; c.y = ny; moved.push(c.name + ' → ' + nx + ',' + Math.round(ny)); }
fitSection(sec);
const shots = [];
for (const c of fr.sort((a, b) => num(a.name) - num(b.name) || a.y - b.y)) { try { await c.screenshot({ scale: 0.3 }); shots.push(c.name); } catch (e) { shots.push('ERR ' + c.name + ' ' + e.message); } }
return { section: sec.id, bounds: [Math.round(sec.x), Math.round(sec.y), Math.round(sec.width), Math.round(sec.height)], moved, shots: shots.length };
