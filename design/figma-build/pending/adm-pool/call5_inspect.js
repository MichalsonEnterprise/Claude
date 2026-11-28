await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === '09 — Admin Panel'));
// overflow scan: text whose right edge runs past its frame's right edge, or past a clipping ancestor
const R = {};
for (const id of ['172:71873', '172:72701', '172:73435', '172:74324', '172:75163', '79:58445', '79:60246', '80:61181']) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { R[id] = 'missing'; continue; }
  const fb = f.absoluteBoundingBox; const off = [];
  for (const t of f.findAllWithCriteria({ types: ['TEXT'] })) {
    if (!t.visible) continue; let p = t.parent, hidden = false; while (p && p !== f) { if (p.visible === false) { hidden = true; break; } p = p.parent; } if (hidden) continue;
    const b = t.absoluteBoundingBox; if (!b) continue;
    let clip = null; p = t.parent; while (p && p !== f) { if (p.clipsContent && p.type !== 'INSTANCE') { clip = p; break; } p = p.parent; }
    const lim = clip ? clip.absoluteBoundingBox : fb;
    if (b.x + b.width > lim.x + lim.width + 1 || b.x < lim.x - 1) off.push({ c: t.characters.slice(0, 50), by: Math.round(b.x + b.width - (lim.x + lim.width)), in: clip ? clip.name : 'frame', par: t.parent.name });
    if (t.textTruncation === 'ENDING') { /* truncation flagged separately */ }
  }
  R[id] = { name: f.name, h: Math.round(f.height), off: off.slice(0, 12), n: off.length };
}
const p2 = await figma.getNodeByIdAsync('172:72701'); const c2 = p2.findOne(n => n.name === 'Content');
const p3 = await figma.getNodeByIdAsync('172:73435'); const c3 = p3.findOne(n => n.name === 'Content');
R.p2kids = c2.children.map(k => k.name + ' ' + Math.round(k.height));
R.p3kids = c3.children.map(k => k.name + ' ' + Math.round(k.height));
// close-ups: lower half of P2 tablet, middle of P3 tablet
const k2 = c2.children.slice(-2); for (const k of k2) await k.screenshot({ scale: 0.6 });
const es = c3.children.find(k => /entry stream|Live/i.test(k.name)) || c3.children[c3.children.length - 3];
const i3 = c3.children.indexOf(es); await c3.children[Math.max(0, i3 - 1)].screenshot({ scale: 0.6 });
await es.screenshot({ scale: 0.6 });

// mobile P3 (page 10, by id): move DEMO to the handle row and let row 2 wrap
try {
  const m = await figma.getNodeByIdAsync('173:71504');
  const sp4 = (await figma.variables.getLocalVariablesAsync()).find(v => v.name === 'space/1');
  const cards = m.findAll(n => n.type === 'FRAME' && n.name.startsWith('Entry 0x'));
  for (const card of cards) {
    const [r1, r2] = card.children; const demo = r2.children.find(k => k.type === 'INSTANCE');
    if (demo) { r1.insertChild(2, demo); }
    r2.layoutWrap = 'WRAP'; if (sp4) r2.setBoundVariable('counterAxisSpacing', sp4); else r2.counterAxisSpacing = 4;
  }
  R.mob = { cards: cards.length };
  await cards[0].parent.screenshot({ scale: 0.8 });
} catch (e) { R.mob = 'ERR ' + String(e); }
return R;
