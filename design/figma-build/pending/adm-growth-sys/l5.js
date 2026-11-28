// batch 5: clipped-content audit (+auto-fix severe collapses) on every frame in the section; M6 Draft laptop column widths; clone S2, S3, S4
const AUD = {};
for (const f of sec.children) { if (f.type !== 'FRAME' || !/^\[ADM-/.test(f.name)) continue; const r = clipAudit(f, true); if (r.length) AUD[f.name.replace(/ \/ (\d+) \/ /, '·$1·').slice(0, 40)] = r; }
const m6 = await figma.getNodeByIdAsync('288:103574'); const tree = m6.findOne(n => n.name === 'Content tree'); const pub = m6.findOne(n => n.name === 'Publishing');
const FX = {}; try { tree.resize(208, tree.height); tree.layoutSizingVertical = 'HUG'; pub.resize(288, pub.height); pub.layoutSizingVertical = 'HUG'; } catch (e) { FX.m6err = String(e.message).slice(0, 80); }
FX.m6 = [Math.round(tree.width), Math.round(pub.width), Math.round(m6.findOne(n => n.name === 'Editor').width)];
const made = [];
for (const id of ['50:50682', '66:51328', '66:52353']) { const r = await LAPTOP(id); if (r) made.push(r); }
const hdrs = {}; for (const r of made) { hdrs[r.f.name.slice(0, 9)] = r.f.findAll(n => /header row/i.test(n.name) && !inInst(n)).map(h => h.children.filter(c => c.visible).map(c => c.name.slice(0, 10) + ':' + Math.round(c.width) + (c.layoutSizingHorizontal === 'FILL' ? 'F' : '')).join(' ')); }
fitSection(sec);
const a5m = await figma.getNodeByIdAsync('33:322372'); await a5m.findOne(n => n.name === 'Cases & detail').screenshot({ scale: 0.4 });
await m6.findOne(n => n.name === 'CMS workspace').screenshot({ scale: 0.4 });
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { AUD, FX, hdrs, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 10), ov: r.ov })), log: LOG };
