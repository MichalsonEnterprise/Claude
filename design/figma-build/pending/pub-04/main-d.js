const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 Game Details', 40000, 0);
const set = await getTpl();
// (28 Nov) template Steps already fixed to 340 wide in the main component; screenshots are taken in a separate call (60 s tool timeout)
const X0 = 120, Y0 = Math.round(set.y + set.height + 240); // row below the template: 6 x 1560 fits before PUB-05 at x=50000
const R = [];
for (const k of __KEYS__) { const i = ['gp', 'roulette', 'crash', 'dice', 'coin', 'bj'].indexOf(k); const g = GD[k]; const { f, t } = await deskFrame(set, g, X0 + i * 1560, Y0); fitSection(sec); R.push({ k, id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id, objs: t.findAll(n => n.name.startsWith('Objects — ') && n.visible).map(n => n.name), ctas: t.findAll(n => n.type === 'INSTANCE' && /^(Play CTA|Rail CTA)/.test(n.name) && n.visible).map(n => n.name), rules: t.findAll(n => n.name.startsWith('Rule row ') && n.visible).length, pays: t.findAll(n => n.name.startsWith('Payout row ') && n.visible).length }); }
return { sec: sec.id, R, MISS: MISS.slice(0, 60) };
