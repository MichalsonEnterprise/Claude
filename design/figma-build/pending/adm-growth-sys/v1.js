// final verification: audits on every frame + section overview + spot checks of fixed regions
const PG = figma.root.children.find(p => p.name === '09 — Admin Panel'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM-A/M Affiliates & marketing, ADM-S System', 86000, 0);
function inInst(n) { let p = n.parent; while (p && p.type !== 'PAGE' && p.type !== 'SECTION') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
function overflow(f) { const R = f.absoluteBoundingBox.x + f.width + 1; return f.findAll(n => n.visible && !inInst(n) && n.absoluteBoundingBox && n.absoluteBoundingBox.x + n.absoluteBoundingBox.width > R).length; }
function clip(f) { let c = 0; for (const P of f.findAll(n => n.type === 'FRAME' && n.layoutMode && n.layoutMode !== 'NONE' && !inInst(n) && n.visible)) { const kids = P.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (!kids.length) continue; const sp = P.itemSpacing > 0 ? P.itemSpacing : 0; const need = P.layoutMode === 'VERTICAL' ? kids.reduce((s, k) => s + k.height, 0) + sp * (kids.length - 1) + P.paddingTop + P.paddingBottom : Math.max(...kids.map(k => k.height)) + P.paddingTop + P.paddingBottom; if (need > P.height * 1.4 + 4) c++; } return c; }
const frames = sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-/.test(n.name)).sort((a, b) => a.x - b.x || a.y - b.y);
const rows = frames.map(f => [f.id, f.name, Math.round(f.width), Math.round(f.height), Math.round(f.x), Math.round(f.y), overflow(f), clip(f), f.children[0] && f.children[0].name]);
// overlap check between frames
const ov = []; for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) { const a = frames[i], b = frames[j]; if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) ov.push(a.name.slice(0, 20) + ' × ' + b.name.slice(0, 20)); }
await sec.screenshot({ scale: 0.03 });
const m2 = await figma.getNodeByIdAsync('287:102004'); await m2.findOne(n => n.type === 'FRAME' && n.findOne(x => x.name === 'c:pr') && n.parent && n.parent.name === 'Page').screenshot({ scale: 0.4 });
const m3 = await figma.getNodeByIdAsync('287:102595'); await m3.findOne(n => n.type === 'FRAME' && n.findOne(x => x.name === 'c:an') && n.parent && n.parent.name === 'Page').screenshot({ scale: 0.4 });
const a1 = await figma.getNodeByIdAsync('285:266479'); await a1.findOne(n => n.name === 'KPIs').screenshot({ scale: 0.5 });
await (await figma.getNodeByIdAsync('33:322372')).screenshot({ scale: 0.3 });
return { n: frames.length, rows, overlaps: ov, section: [sec.id, Math.round(sec.width), Math.round(sec.height)] };
