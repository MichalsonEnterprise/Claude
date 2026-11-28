const page = figma.root.children.find(p => p.name === '05 — User Dashboard'); await figma.setCurrentPageAsync(page);
const out = []; const shots = [];
for (const [fid, tid] of [['33:253282', '33:254067'], ['33:277301', '33:277432']]) {
  const f = await figma.getNodeByIdAsync(fid); const n = await figma.getNodeByIdAsync(tid);
  const rd = f.findOne(x => x.type === 'TEXT' && /^refund details$/i.test(x.characters.trim()));
  if (!n || !rd) { out.push(tid + ' missing ' + !!rd); continue; }
  const w = Math.floor(rd.absoluteBoundingBox.x - n.absoluteBoundingBox.x - 40);
  n.textAutoResize = 'HEIGHT'; n.resize(w, n.height);
  // lowest common ancestor of the timeline text and the Refund details column -> screenshot
  const chain = (x) => { const r = []; while (x) { r.push(x); x = x.parent; } return r; };
  const ca = chain(n), cb = chain(rd); const P = ca.find(x => cb.includes(x));
  out.push({ tid, w: Math.round(n.width), h: Math.round(n.height), lca: P && P.name, overlapPx: Math.round(n.absoluteBoundingBox.x + n.width - rd.absoluteBoundingBox.x), frameH: Math.round(f.height) });
  if (P) shots.push(P);
}
for (const s of shots) await s.screenshot({ scale: 0.6 });
return { mutated: ['33:254067', '33:277432'], out };
