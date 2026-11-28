// ===== MAIN mobile frames (page 10) =====
const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 — Mobile', 56000, 0);
const set = await getTpl();
const R = [];
for (const D of [__KEY__]) { const { f, t } = await mobFrame(set, D, 120 + IDX[D.key] * 510, 120); fitSection(sec); R.push({ id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id, over: overflowList(f).slice(0, 8) }); }
const sb = sec.absoluteBoundingBox; const overlaps = figma.currentPage.children.filter(n => n.type === 'SECTION' && n !== sec && n.x < sb.x + sb.width && n.x + n.width > sb.x && n.y < sb.y + sb.height && n.y + n.height > sb.y).map(n => n.name);
const SH = []; for (const r of R) { const f = await figma.getNodeByIdAsync(r.id); SH.push(await vshot(f, { cols: 4, chunkH: Math.ceil(f.height / 4), scale: 0.45 })); }
return { sec: sec.id, R, overlaps, SH, MISS: MISS.slice(0, 40) };
