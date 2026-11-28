// ===== MAIN mobile Terms — contents expanded viewport (page 10), stacked below the Terms default =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 — Mobile', 56000, 0);
const set = await getTpl(); const D = __KEY__;
const def = sec.children.find(c => c.name === `[${D.id}] ${D.title} / 390 / Default — long-form, contents collapsed`);
const { f, t } = await mobFrame(set, D, def ? def.x : 120, def ? Math.round(def.y + def.height + 160) : 120, { expanded: true }); fitSection(sec);
await f.screenshot({ scale: 0.9 });
return { sec: sec.id, id: f.id, name: f.name, size: [f.width, f.height], over: overflowList(f).slice(0, 8), MISS: MISS.slice(0, 40) };
