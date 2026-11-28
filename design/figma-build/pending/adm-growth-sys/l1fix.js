// targeted fixes on batch-1 laptop clones (A1 partner column, KPI sparklines/definitions) + inspection of A4 approval card
const F = { a1: '285:266479', a2: '285:267373', a3: '285:268097', a4: '285:268766', a5: '285:269410' };
const res = {};
for (const [k, id] of Object.entries(F)) { const f = await figma.getNodeByIdAsync(id); res[k] = { kpi: KPIFIX(f) }; }
const a1 = await figma.getNodeByIdAsync(F.a1);
res.a1.hide = hideCols(a1, ['c:pl']); res.a1.plan = setColW(a1, 'c:plan', 164); res.a1.st = setColW(a1, 'c:st', 152);
for (const [k, id] of Object.entries(F)) { const f = await figma.getNodeByIdAsync(id); res[k].ov = overflow(f).concat(instOverflow(f)); res[k].narrow = narrowFill(f); }
const a4 = await figma.getNodeByIdAsync(F.a4); const ap = a4.findOne(n => n.name === 'Approval & policy');
const p1 = a1.findOne(n => n.name === 'Affiliates table');
await p1.screenshot({ scale: 0.5 });
const k5 = (await figma.getNodeByIdAsync(F.a5)).findOne(n => n.name === 'KPIs'); await k5.screenshot({ scale: 0.5 });
const k2 = (await figma.getNodeByIdAsync(F.a2)).findAll(n => n.type === 'FRAME' && n.parent && n.parent.name === 'Page')[2]; if (k2) await k2.screenshot({ scale: 0.5 });
if (ap) await ap.screenshot({ scale: 0.6 });
return res;
