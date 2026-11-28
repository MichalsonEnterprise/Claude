// read-only audit of my section frames; PAGE + SECTION set below
const PAGE = '08 — Games', SECNAME = 'GM-02..08 Catalogue & more originals';
const page = figma.root.children.find(p => p.name === PAGE);
await figma.setCurrentPageAsync(page);
const sec = page.children.find(n => n.type === 'SECTION' && n.name === SECNAME);
if (!sec) return { error: 'no section' };
const out = [];
const PLACEHOLDER = /^(Title|Label|Button|Heading|Text|Subtitle|Description|Lorem.*|Value|Placeholder)$/;
for (const f of sec.children) {
  const r = { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), x: Math.round(f.x), y: Math.round(f.y), pas: f.primaryAxisSizingMode, kids: f.children ? f.children.length : 0 };
  if (f.type !== 'FRAME') { r.type = f.type; out.push(r); continue; }
  const fb = f.absoluteBoundingBox;
  let offCanvas = 0, clipped = [], placeholders = [], demo = 0, texts = 0, emptyText = 0, rawFill = 0;
  const all = f.findAll(() => true);
  for (const n of all) {
    if (n.type === 'INSTANCE' && n.mainComponent && /DEMO/i.test((n.mainComponent.parent && n.mainComponent.parent.type === 'COMPONENT_SET' ? n.mainComponent.parent.name : n.mainComponent.name))) demo++;
    if (n.type === 'TEXT') {
      texts++;
      if (!n.characters.trim()) emptyText++;
      if (PLACEHOLDER.test(n.characters.trim())) placeholders.push(n.characters.trim());
      const b = n.absoluteBoundingBox; if (b && fb && (b.x + b.width > fb.x + fb.width + 1 || b.x < fb.x - 1)) offCanvas++;
      if (n.visible && b) { // clipped by an ancestor that clips?
        let p = n.parent; while (p && p !== f) { if (p.clipsContent && p.absoluteBoundingBox) { const pb = p.absoluteBoundingBox; if (b.x < pb.x - 1 || b.y < pb.y - 1 || b.x + b.width > pb.x + pb.width + 1 || b.y + b.height > pb.y + pb.height + 1) { if (clipped.length < 6) clipped.push(n.characters.slice(0, 30) + ' @' + p.name.slice(0, 20)); break; } } p = p.parent; }
      }
    }
  }
  // children overflowing the screen frame vertically (fixed-height)
  let maxBottom = 0; for (const c of f.children) maxBottom = Math.max(maxBottom, c.y + c.height);
  r.overflowY = Math.round(maxBottom - f.height);
  Object.assign(r, { texts, demo, offCanvas, clipped, placeholders: placeholders.slice(0, 6), emptyText });
  out.push(r);
}
return { sec: { id: sec.id, w: Math.round(sec.width), h: Math.round(sec.height) }, n: out.length, frames: out };
