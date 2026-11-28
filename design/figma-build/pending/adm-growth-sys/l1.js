// rename the 17+ desktop masters to the file convention "[ID] Name / BP / State", then clone A1–A5 to 1280
const ren = [];
for (const n of sec.children) { if (n.type === 'FRAME' && /^ADM-[AMS]\d /.test(n.name)) { const old = n.name; n.name = n.name.replace(/^(ADM-[AMS]\d) /, '[$1] '); ren.push(old.slice(0, 12)); } }
const made = [];
for (const id of ['33:192225', '33:230940', '33:265034', '33:294350', '33:322372']) { const r = await LAPTOP(id); if (r) made.push(r); }
fitSection(sec);
for (const r of made) await r.f.screenshot({ scale: 0.33 });
return { renamed: ren.length, made: made.map(r => ({ id: r.f.id, name: r.f.name, h: Math.round(r.f.height), x: r.f.x, y: r.f.y, fixes: r.log.slice(0, 14), overflow: r.ov })), log: LOG };
