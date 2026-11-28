// batch 4: column fixes M2/M3/M4/S1, A4 approval columns hug; inspect A5 + M6 structure; screenshots (max 5 per call)
const FX = {};
const a4 = await figma.getNodeByIdAsync('285:268766');
const otp = a4.findOne(n => n.name === 'Input/OTP'); let col = otp.parent; while (col && col.parent && col.parent.name !== 'Row') col = col.parent; const row = col.parent;
for (const k of row.children) { try { k.layoutSizingVertical = 'HUG'; } catch (e) { FX.hugErr = String(e.message).slice(0, 60); } }
FX.a4kids = row.children.map(k => k.name.slice(0, 16) + ':' + Math.round(k.height) + ':' + k.layoutSizingVertical + ':' + k.layoutPositioning);
const m2 = await figma.getNodeByIdAsync('287:102004'); FX.m2 = [hideCols(m2, ['c:ty']), setColW(m2, 'c:kt', 280)];
const m3 = await figma.getNodeByIdAsync('287:102595'); FX.m3 = [hideCols(m3, ['c:ch']), setColW(m3, 'c:win', 200)];
const m4 = await figma.getNodeByIdAsync('287:103118'); FX.m4 = [hideCols(m4, ['c:ch'])];
const s1 = await figma.getNodeByIdAsync('288:104534'); FX.s1 = [hideCols(s1, ['c:exp']), setColW(s1, 'c:auth', 150)];
function tree(n, d) { const o = n.name.slice(0, 22) + '|' + Math.round(n.width) + 'x' + Math.round(n.height) + (n.layoutSizingHorizontal ? n.layoutSizingHorizontal[0] : '') + (n.visible ? '' : '|hidden'); if (d > 0 && 'children' in n && n.type !== 'INSTANCE') return [o, n.children.map(c => tree(c, d - 1))]; return o; }
const a5m = await figma.getNodeByIdAsync('33:322372'); const a5 = await figma.getNodeByIdAsync('285:269410');
FX.a5m = tree(a5m.findOne(n => n.name === 'Cases & detail'), 3); FX.a5 = tree(a5.findOne(n => n.name === 'Cases & detail'), 3);
const m6 = await figma.getNodeByIdAsync('288:103574'); const pg6 = m6.findOne(n => n.name === 'Page');
FX.m6 = tree(pg6.children[pg6.children.length - 1], 2); FX.m6kids = pg6.children.map(c => c.name.slice(0, 20) + ':' + Math.round(c.width) + 'x' + Math.round(c.height));
FX.s1ov = overflow(s1).concat(instOverflow(s1), narrowFill(s1));
await row.parent.screenshot({ scale: 0.5 });
await a5m.findOne(n => n.name === 'Cases & detail').screenshot({ scale: 0.3 });
await (await figma.getNodeByIdAsync('288:104081')).screenshot({ scale: 0.33 });
await s1.screenshot({ scale: 0.33 });
await m4.findOne(n => n.type === 'FRAME' && n.findOne(x => x.name === 'c:tp') && n.parent && n.parent.name === 'Page').screenshot({ scale: 0.4 });
return FX;
