// read-only audit + screenshots of existing frames (usr-gaming continuation verify)
async function audit(f) {
  const fb = f.absoluteBoundingBox; const out = { id: f.id, name: f.name, h: Math.round(f.height), texts: 0, clipped: [], offCanvas: [], placeholder: [], tiny: [], demo: 0, inst: 0 };
  const PH = new Set(['Title', 'Label', 'Button', 'Heading', 'Text', 'Lorem ipsum', 'Title here', 'Value', 'Description']);
  for (const n of f.findAll(() => true)) {
    if (n.type === 'INSTANCE') { out.inst++; if (n.name.startsWith('Badge/DEMO') || (n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === '6:130')) out.demo++; }
    if (n.type !== 'TEXT' || !n.visible) continue;
    out.texts++;
    const b = n.absoluteBoundingBox; if (!b) continue;
    if (b.x + b.width > fb.x + fb.width + 1 || b.x < fb.x - 1) { if (out.offCanvas.length < 8) out.offCanvas.push(n.characters.slice(0, 40)); }
    if (PH.has(n.characters.trim()) && out.placeholder.length < 8) out.placeholder.push(n.characters + ' @' + (n.parent && n.parent.name));
    if (b.width < 4 && n.characters.length > 1 && out.tiny.length < 8) out.tiny.push(n.characters.slice(0, 30));
    let p = n.parent; let hiddenByScroll = false;
    while (p && p.id !== f.id) {
      if ('clipsContent' in p && p.clipsContent && p.absoluteBoundingBox) {
        const pb = p.absoluteBoundingBox;
        if (/scroll|carousel|Carousel|Scroll|Art|art|Thumb|Tile/.test(p.name)) { hiddenByScroll = true; break; }
        if (b.y + b.height > pb.y + pb.height + 1 || b.x + b.width > pb.x + pb.width + 1 || b.y < pb.y - 1 || b.x < pb.x - 1) { if (out.clipped.length < 8) out.clipped.push(n.characters.slice(0, 40) + ' ⟂ ' + p.name.slice(0, 40)); break; }
      }
      p = p.parent;
    }
  }
  return out;
}
