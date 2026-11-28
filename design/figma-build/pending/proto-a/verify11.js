const page = figma.root.children.find(p => p.name === '11 — Prototypes'); await figma.setCurrentPageAsync(page);
const parent = page.children.find(n => n.type === 'SECTION' && n.name === 'PRO-01..05 Prototypes (P0)');
const out = { flows: {}, fixedLogos: 0, missingLogo: [], badDest: 0, unreachable: [], noOut: [] };
function fitSection(s, padPx = 120) { if (!s.children.length) return; let maxX = 0, maxY = 0; for (const c of s.children) { maxX = Math.max(maxX, c.x + c.width); maxY = Math.max(maxY, c.y + c.height); } s.resizeWithoutConstraints(maxX + padPx, maxY + padPx); }
const startIds = new Set((page.flowStartingPoints || []).map(p => p.nodeId));
for (const fs of parent.children.filter(c => c.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name))) {
  const frames = fs.children.filter(c => c.type === 'FRAME' && !c.name.startsWith('Flow map'));
  const ids = new Set(frames.map(f => f.id)); const incoming = new Set(); const rows = [];
  for (const f of frames) {
    const fb = f.absoluteBoundingBox; const hs = f.children.filter(c => c.name.startsWith('Hotspot/'));
    const lh = hs.find(h => h.name.startsWith('Hotspot/Logo'));
    if (lh && Math.round(lh.x) === 16 && Math.round(lh.y) === 36 && Math.round(lh.width) === 200) {
      const logo = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Brand/Logo' && n.visible !== false && n.absoluteBoundingBox && n.absoluteBoundingBox.y - fb.y < 260);
      if (logo) { const b = logo.absoluteBoundingBox; lh.resize(Math.round(b.width), Math.round(b.height)); lh.x = Math.round(b.x - fb.x); lh.y = Math.round(b.y - fb.y); out.fixedLogos++; } else out.missingLogo.push(f.name.slice(0, 50));
    }
    let rc = f.reactions.length; for (const h of hs) rc += h.reactions.length;
    for (const n of [f, ...hs]) for (const r of n.reactions) for (const a of (r.actions || [])) { if (a.type === 'NODE') { if (!ids.has(a.destinationId)) out.badDest++; else incoming.add(a.destinationId); } }
    const oob = hs.filter(h => h.x < 0 || h.y < 0 || h.x + h.width > f.width + 1 || h.y + h.height > f.height + 1).length;
    if (rc === 0) out.noOut.push(f.name.slice(0, 40));
    rows.push(f.name.split(' — ')[0] + ' | ' + f.id + ' | r' + rc + ' h' + hs.length + (oob ? ' OOB' + oob : '') + ' | ' + Math.round(f.height));
  }
  for (const f of frames) if (!incoming.has(f.id) && !startIds.has(f.id)) out.unreachable.push(f.name.slice(0, 40));
  out.flows[fs.name.slice(0, 6)] = { id: fs.id, rows };
}
const ss = parent.children.filter(c => c.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name)); let xx = 120;
for (const c of ss) { const m = c.children.find(k => k.name.startsWith('Flow map')); if (m) { m.locked = false; let mx = 0, my = 0; for (const k of c.children) { if (k === m) continue; mx = Math.max(mx, k.x + k.width); my = Math.max(my, k.y + k.height); } for (const k of m.children) { mx = Math.max(mx, k.x + k.width); my = Math.max(my, k.y + k.height); } m.resizeWithoutConstraints(mx + 120, my + 120); m.locked = true; } fitSection(c, 160); c.x = xx; c.y = 120; xx += c.width + 400; }
fitSection(parent, 160);
out.parent = [parent.id, Math.round(parent.x), Math.round(parent.y), Math.round(parent.width), Math.round(parent.height)];
out.sections = ss.map(c => c.name.slice(0, 6) + ' ' + c.id + ' @' + Math.round(c.x) + ',' + Math.round(c.y) + ' ' + Math.round(c.width) + 'x' + Math.round(c.height));
out.others = page.children.filter(n => n !== parent).map(n => n.name.slice(0, 30) + ' @' + Math.round(n.x) + ',' + Math.round(n.y) + ' ' + Math.round(n.width) + 'x' + Math.round(n.height));
out.fsp = page.flowStartingPoints.map(p => p.name.slice(0, 14) + '→' + p.nodeId);
await parent.screenshot({ scale: Math.min(0.03, 1800 / parent.width) });
return out;
