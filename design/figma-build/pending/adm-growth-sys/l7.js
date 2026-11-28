// batch 7: laptop clones of the two error/review states whose layout differs (S3 Integrity alert, M2 Changes requested) + screenshots of the 1440 state frames + S3 table structure for the tablet build
const made = [];
const s3d = sec.children.find(n => n.name === '[ADM-S3] Audit Logs / 1280 / Default');
const m2d = sec.children.find(n => n.name === '[ADM-M2] Promotions / 1280 / Default');
{ const r = await LAPTOP('80:67571', LY + Math.round(s3d.height) + 160); if (r) made.push(r); }
{ const r = await LAPTOP('34:403572', LY + Math.round(m2d.height) + 160); if (r) made.push(r); }
const m2c = made.find(r => r.f.name.startsWith('[ADM-M2]')); if (m2c) { hideCols(m2c.f, ['c:ty']); setColW(m2c.f, 'c:kt', 280); }
const s3 = await figma.getNodeByIdAsync('66:51328');
function tree(n, d) { const o = n.name.slice(0, 20) + '|' + n.type.slice(0, 2) + '|' + Math.round(n.width) + 'x' + Math.round(n.height); if (d > 0 && 'children' in n && n.type !== 'INSTANCE') return [o, n.children.slice(0, 9).map(c => tree(c, d - 1))]; return o; }
const tbl = s3.findOne(n => n.name === 'Audit table');
const S = { tbl: tree(tbl, 3) };
fitSection(sec);
for (const id of ['34:403572', '80:66941', '80:67571']) await (await figma.getNodeByIdAsync(id)).screenshot({ scale: 0.3 });
for (const r of made) await r.f.screenshot({ scale: 0.3 });
return { S, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 8), ov: r.ov })), log: LOG };
