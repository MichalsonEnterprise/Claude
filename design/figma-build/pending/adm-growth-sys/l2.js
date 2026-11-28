// batch 2: finish batch-1 fixes (sparkline vectors, A1 widths, A4 approval stack) + inspect A4/A5 tables + clone M1–M4 to 1280
const FX = {};
for (const id of ['285:266479', '285:267373', '285:269410']) { const f = await figma.getNodeByIdAsync(id); let n = 0; for (const k of f.findAll(isKPI)) { const sp = k.findOne(x => x.name === 'Sparkline'); if (sp) { SPARKSCALE(sp); n++; } } FX[id] = n; }
const a1 = await figma.getNodeByIdAsync('285:266479'); FX.a1 = [setColW(a1, 'c:plan', 160), setColW(a1, 'c:st', 172)];
const a4 = await figma.getNodeByIdAsync('285:268766'); const otp = a4.findOne(n => n.name === 'Input/OTP');
if (otp) { let col = otp.parent; while (col && col.parent && col.parent.layoutMode !== 'HORIZONTAL') col = col.parent; const row = col && col.parent; if (row && row.type === 'FRAME') { row.layoutMode = 'VERTICAL'; for (const k of row.children) { try { k.layoutSizingHorizontal = 'FILL'; } catch (e) {} } FX.a4row = row.name; } }
const hdrs = {};
for (const [k, id] of [['a4', '285:268766'], ['a5', '285:269410'], ['a5m', '33:322372']]) { const f = await figma.getNodeByIdAsync(id); hdrs[k] = f.findAll(n => /header row/i.test(n.name) && !inInst(n)).map(h => h.children.map(c => c.name.slice(0, 10) + ':' + Math.round(c.width) + (c.layoutSizingHorizontal === 'FILL' ? 'F' : '')).join(' ')); }
const made = [];
for (const id of ['34:355822', '34:381855', '34:419221', '34:447541']) { const r = await LAPTOP(id); if (r) made.push(r); }
fitSection(sec);
await a4.findOne(n => n.name === 'Approval & policy').screenshot({ scale: 0.45 });
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { FX, hdrs, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 12), ov: r.ov })), log: LOG };
