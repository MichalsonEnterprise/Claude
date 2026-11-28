// page 07 final: refit section to settled frame heights and check for overlaps
const page = figma.root.children.find(p => p.name === '07 — Global Pool'); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'GP-01..04 Hub & participation');
let maxX = 0, maxY = 0; for (const c of sec.children) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); } sec.resizeWithoutConstraints(maxX + 120, maxY + 120);
const fr = sec.children.map(c => ({ id: c.id, name: c.name, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }));
const overlaps = []; for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) { const a = fr[i], b = fr[j]; if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) overlaps.push([a.name, b.name]); }
const others = page.children.filter(n => n.type === 'SECTION' && n.id !== sec.id).map(s => ({ name: s.name, x: s.x, y: s.y, w: Math.round(s.width), h: Math.round(s.height) }));
{ const g4 = await figma.getNodeByIdAsync('34:383862'); const m4 = g4 && g4.findOne(n => n.name.startsWith('Modal — ')); if (m4) await m4.screenshot({ scale: 0.6 }); }
return { sec: { id: sec.id, w: Math.round(sec.width), h: Math.round(sec.height) }, frames: fr.filter(f => /1280|768/.test(f.name)), overlaps, others };
// (appended) visual re-check of the 1440 GP-04 receipt modal after its last label change
