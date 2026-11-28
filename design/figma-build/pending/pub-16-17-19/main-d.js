// ===== MAIN desktop frames (page 03) =====
const page = figma.root.children.find(p => p.name === '03 — Public Website'); await figma.setCurrentPageAsync(page);
const sec = section('PUB-16/17/19 Legal documents', 90000, 0);
const set = await getTpl();
const X0 = Math.round(set.x + set.width + 240), Y0 = 120;
const R = [];
for (const D of [__KEY__]) { const { f, t, off } = await deskFrame(set, D, X0 + IDX[D.key] * 1560, Y0); fitSection(sec); R.push({ id: f.id, name: f.name, h: Math.round(f.height), tpl: t.id, navOff: off, over: overflowList(f).slice(0, 8) }); }
const SH = []; for (const r of R) { const t = await figma.getNodeByIdAsync(r.tpl); await t.screenshot({ scale: 0.32 }); SH.push(r.tpl); }
return { sec: sec.id, R, SH, MISS: MISS.slice(0, 40) };
