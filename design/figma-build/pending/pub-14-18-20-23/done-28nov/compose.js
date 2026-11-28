// compose(items, scale): render chunks of several frames side by side in ONE temporary viewport, screenshot, remove.
// item = {id, part:0, of:1, hideFooter:true}
async function compose(items, scale) {
  const vp = figma.createFrame(); vp.name = 'TMP verify viewport'; fill(vp, 'bg/secondary'); vp.x = -60000; vp.y = -60000; vp.clipsContent = true; const info = [];
  try {
    let x = 0, H = 0;
    for (const it of items) {
      const f = await figma.getNodeByIdAsync(it.id); const hold = figma.createFrame(); hold.name = 'hold'; hold.clipsContent = true; fill(hold, 'bg/base'); vp.appendChild(hold);
      const cl = f.clone(); hold.appendChild(cl);
      if (it.hideFooter !== false) { const ft = cl.findOne(n => n.type === 'INSTANCE' && n.name.startsWith('Shell/Footer')); if (ft) ft.visible = false; }
      const total = cl.height; const of = it.of || 1; const ph = Math.ceil(total / of); const y0 = (it.part || 0) * ph; const h = Math.min(ph, total - y0);
      hold.resize(cl.width, h); hold.x = x; hold.y = 0; cl.x = 0; cl.y = -y0; x += cl.width + 40; H = Math.max(H, h); info.push(f.name.slice(0, 40) + ' p' + (it.part || 0) + '/' + of + ' h' + Math.round(h) + ' of ' + Math.round(total));
    }
    vp.resize(x - 40, H); await vp.screenshot({ scale });
  } finally { vp.remove(); }
  return info;
}
function overflowList(root) { const rb = root.absoluteBoundingBox; const bad = []; for (const t of root.findAllWithCriteria({ types: ['TEXT'] })) { let vis = true, p = t; while (p && p !== root) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) continue; const b = t.absoluteBoundingBox; if (!b) continue; if (b.width < 2 || b.x + b.width > rb.x + rb.width + 1 || b.x < rb.x - 1) bad.push(t.characters.slice(0, 24) + '@' + Math.round(b.x - rb.x) + '+' + Math.round(b.width)); } return bad; }
