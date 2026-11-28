const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 Game Details', 40000, 0);
const set = await getTpl();
const X0 = Math.round(set.x + set.width + 240), Y0 = Math.round(set.y);
const R = [];
for (const k of __KEYS__) { const i = ['gp', 'roulette', 'crash', 'dice', 'coin', 'bj'].indexOf(k); const g = GD[k]; const { f, t } = await deskFrame(set, g, X0 + i * 1560, Y0); fitSection(sec); R.push({ k, id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id }); }
for (const r of R) { const t = await figma.getNodeByIdAsync(r.tpl); await t.screenshot({ scale: 0.42 }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
