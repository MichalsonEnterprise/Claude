// batch 6: A5 cases table hug (master + laptop), S2 laptop matrix cell widths, clone S5 + S6; dump S3 master copy for the tablet build
const FX = {};
for (const id of ['33:322372', '285:269410']) { const f = await figma.getNodeByIdAsync(id); const t = f.findOne(n => n.name === 'Cases table'); if (t) { t.layoutSizingVertical = 'HUG'; FX[id] = Math.round(t.height); } }
const s2 = await figma.getNodeByIdAsync('290:104469'); let rs = 0;
for (const r of s2.findAll(n => n.type === 'FRAME' && !inInst(n) && n.layoutMode === 'HORIZONTAL' && n.children.some(c => c.name === 'Permission' || c.name === 'Col permission'))) { for (const c of r.children) { if (c.name === 'Permission' || c.name === 'Col permission') continue; if (Math.abs(c.width - 152) < 2) { try { c.resize(128, c.height); if (c.type === 'FRAME' && c.layoutMode === 'HORIZONTAL') c.counterAxisSizingMode = 'AUTO'; rs++; } catch (e) {} } } }
FX.s2 = [rs, Math.round(s2.height), narrowFill(s2).slice(0, 3), instOverflow(s2).slice(0, 4)];
const made = [];
for (const id of ['80:65828', '80:66459']) { const r = await LAPTOP(id); if (r) made.push(r); }
const s3 = await figma.getNodeByIdAsync('66:51328'); const seen = new Set(); const copy = [];
for (const t of s3.findOne(n => n.name === 'Page').findAll(n => n.type === 'TEXT' && n.visible)) { const c = t.characters.trim(); if (c.length < 3 || seen.has(c)) continue; seen.add(c); copy.push(c.slice(0, 110)); if (copy.length >= 170) break; }
fitSection(sec);
await (await figma.getNodeByIdAsync('33:322372')).findOne(n => n.name === 'Cases & detail').screenshot({ scale: 0.3 });
await s2.screenshot({ scale: 0.33 });
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { FX, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 10), ov: r.ov })), copy, log: LOG };
