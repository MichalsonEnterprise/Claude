const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-04 — Mobile', 21000, 0);
const nb = page.children.filter(n => n !== sec && n.x < 24800 && n.x + n.width > 21000).map(n => n.name + ' x' + Math.round(n.x) + '..' + Math.round(n.x + n.width) + ' y' + Math.round(n.y));
const set = await getTpl();
let hd = sec.findOne(x => x.name === 'Doc/PUB-04 mobile header');
if (!hd) { hd = col('Doc/PUB-04 mobile header', { gap: 8 }); sec.appendChild(hd); hd.x = 120; hd.y = 60; add(hd, await T('PUB-04 Game Details — Mobile 390', 'Heading/H3', 'text/primary'), await T('Instances of Template/Game Details (Breakpoint=Mobile) · Shell/Topbar Mobile · sticky CTA bar · Nav/Mobile Tab Bar. Payouts become stacked rows; related games scroll horizontally.', 'Body/S', 'text/secondary', { w: 3000 })); }
const R = [];
for (const k of __KEYS__) { const i = ['gp', 'roulette', 'crash', 'dice', 'coin', 'bj'].indexOf(k); const g = GD[k]; const { f, t } = await mobFrame(set, g, 120 + i * 510, 220); fitSection(sec); R.push({ k, id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id }); }
for (const r of R) { const f = await figma.getNodeByIdAsync(r.id); await f.screenshot({ scale: 0.5 }); }
return { sec: sec.id, header: hd.id, nb, R, MISS: MISS.slice(0, 60) };
