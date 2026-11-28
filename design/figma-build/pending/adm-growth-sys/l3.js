// batch 3: fixes A4 (approval row hug + payout table columns), A5 (cases table columns); dump table headers of M2–M4; clone M5, M6 Draft, M6 Compliance review (stacked), S1
const FX = {};
const a4 = await figma.getNodeByIdAsync('285:268766');
const otp = a4.findOne(n => n.name === 'Input/OTP'); let col = otp.parent; while (col && col.parent && col.parent.name !== 'Row') col = col.parent; const row = col.parent;
row.primaryAxisSizingMode = 'AUTO'; try { row.layoutSizingVertical = 'HUG'; } catch (e) {} FX.a4row = [row.layoutMode, Math.round(row.height)];
FX.a4 = [hideCols(a4, ['c:net']), setColW(a4, 'c:chk', 200)];
const a5 = await figma.getNodeByIdAsync('285:269410');
for (const n of a5.findAll(x => x.name === 'c:sig' && !inInst(x))) { n.layoutSizingHorizontal = 'FIXED'; n.resize(226, n.height); if (n.type === 'FRAME') { if (n.layoutMode === 'HORIZONTAL') n.counterAxisSizingMode = 'AUTO'; else if (n.layoutMode === 'VERTICAL') n.primaryAxisSizingMode = 'AUTO'; } }
FX.a5 = hideCols(a5, ['c:risk']);
const hdrs = {};
for (const [k, id] of [['m2', '287:102004'], ['m3', '287:102595'], ['m4', '287:103118']]) { const f = await figma.getNodeByIdAsync(id); hdrs[k] = f.findAll(n => /header row/i.test(n.name) && !inInst(n)).map(h => h.children.map(c => c.name.slice(0, 10) + ':' + Math.round(c.width) + (c.layoutSizingHorizontal === 'FILL' ? 'F' : '')).join(' ')); }
const made = [];
for (const id of ['34:475127', '34:495176']) { const r = await LAPTOP(id); if (r) made.push(r); }
const m6d = sec.children.find(n => n.name === '[ADM-M6] CMS / 1280 / Editor — Draft');
{ const r = await LAPTOP('36:528110', LY + (m6d ? Math.round(m6d.height) : 1300) + 160); if (r) made.push(r); }
{ const r = await LAPTOP('36:540626'); if (r) made.push(r); }
for (const r of made) hdrs[r.f.name.slice(0, 12)] = r.f.findAll(n => /header row/i.test(n.name) && !inInst(n)).map(h => h.children.map(c => c.name.slice(0, 10) + ':' + Math.round(c.width) + (c.layoutSizingHorizontal === 'FILL' ? 'F' : '')).join(' '));
fitSection(sec);
await a4.findOne(n => n.name === 'Payout batch table').screenshot({ scale: 0.4 });
await a4.findOne(n => n.name === 'Approval & policy').screenshot({ scale: 0.4 });
await a5.findOne(n => n.name === 'Cases & detail').screenshot({ scale: 0.4 });
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { FX, hdrs, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 10), ov: r.ov })), log: LOG };
