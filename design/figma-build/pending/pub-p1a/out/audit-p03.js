// READ-ONLY audit of every frame in my section on the current page: clipped/off-canvas text, collapsed text, DEMO counts, overview screenshot.
const PAGE = '03 — Public Website', SECP = 'PUB-05/08/09/13';
const page = figma.root.children.find(p => p.name === PAGE); await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name.startsWith(SECP));
const res = [];
function clipRect(n, frame) { let r = { ...frame.absoluteBoundingBox }; let p = n.parent; while (p && p !== frame.parent) { if (p.clipsContent && p.absoluteBoundingBox) { const b = p.absoluteBoundingBox; const x1 = Math.max(r.x, b.x), y1 = Math.max(r.y, b.y), x2 = Math.min(r.x + r.width, b.x + b.width), y2 = Math.min(r.y + r.height, b.y + b.height); r = { x: x1, y: y1, width: x2 - x1, height: y2 - y1, by: p.name }; } p = p.parent; } return r; }
function path(n, frame, d = 3) { const a = []; let p = n.parent; while (p && p !== frame && a.length < d) { a.push(p.name.slice(0, 28)); p = p.parent; } return a.join(' < '); }
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const o = { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), sizing: f.primaryAxisSizingMode, flags: [], demo: 0, texts: 0 };
  const texts = f.findAllWithCriteria({ types: ['TEXT'] });
  o.texts = texts.length;
  for (const t of texts) {
    if (!t.visible) continue; let hidden = false; let q = t.parent; while (q && q !== f) { if (q.visible === false) { hidden = true; break; } q = q.parent; } if (hidden) continue;
    const rb = t.absoluteRenderBounds; if (!rb) continue;
    const cr = clipRect(t, f);
    const over = Math.max(cr.x - rb.x, rb.x + rb.width - (cr.x + cr.width), cr.y - rb.y, rb.y + rb.height - (cr.y + cr.height));
    if (over > 1.5 && o.flags.length < 30) o.flags.push(['CLIP', Math.round(over), t.characters.slice(0, 40), cr.by || 'frame', path(t, f)]);
    if (t.width < 8 && t.characters.length > 2 && o.flags.length < 30) o.flags.push(['THIN', Math.round(t.width), t.characters.slice(0, 40), path(t, f)]);
  }
  o.demo = f.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => i.name.startsWith('Badge/DEMO') || (i.mainComponent && i.mainComponent.parent && i.mainComponent.parent.id === '6:130')).length;
  const top = f.children.map(c => c.name.slice(0, 30) + ':' + Math.round(c.height));
  o.top = top;
  const body = f.children.find(c => c.name === 'Content' || c.name === 'Body' || c.name.startsWith('Body'));
  if (body && 'children' in body) o.blocks = body.children.slice(0, 40).map(c => [c.name.slice(0, 34), c.id, Math.round(c.height)]);
  res.push(o);
  await f.screenshot({ scale: Math.min(0.5, 1800 / f.height) });
}
return res;
