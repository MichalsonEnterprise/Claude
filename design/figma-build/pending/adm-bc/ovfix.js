// generic row-overflow fix (all frames in the section). Rows: longest hug text wraps (HEIGHT + FILL) and the row Spacer goes.
// Skips wrap rows, Spacers and instance internals; table cells (Col/*) are only reported. Laptop rows without text: Tabs -> hide trailing tabs, Controls -> wrap.
function inInst(n) { let p = n.parent; while (p && p.type !== 'SECTION' && p.type !== 'PAGE') { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
const OV = [];
const NEED = r => { const kids = r.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); return kids.reduce((s, k) => s + (k.name === 'Spacer' ? 0 : k.width), 0) + r.itemSpacing * Math.max(0, kids.length - 1) + r.paddingLeft + r.paddingRight; };
for (const fr of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) {
  for (const r of fr.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.visible)) {
    if (r.removed || r.name === 'Spacer' || r.layoutWrap === 'WRAP' || inInst(r)) continue;
    const kids = r.children.filter(k => k.visible && k.layoutPositioning !== 'ABSOLUTE'); if (kids.length < 2 || NEED(r) <= r.width + 1) continue;
    if (r.name.startsWith('Col/')) { OV.push('CELL ' + fr.name.slice(0, 18) + ' › ' + r.name); continue; }
    const txt = kids.filter(k => k.type === 'TEXT' && k.textAutoResize === 'WIDTH_AND_HEIGHT').sort((a, b) => b.width - a.width)[0];
    if (!txt) {
      if (/^Tabs/.test(r.name)) { const vis = kids.slice(); while (NEED(r) > r.width + 1 && vis.length > 2) vis.pop().visible = false; OV.push('TABS hidden→fit ' + fr.name.slice(0, 18)); }
      else if (r.name === 'Controls') { r.layoutWrap = 'WRAP'; bnum(r, 'counterAxisSpacing', 8); OV.push('CONTROLS wrap ' + fr.name.slice(0, 18)); }
      else OV.push('NO TEXT ' + fr.name.slice(0, 18) + ' › ' + r.name);
      continue;
    }
    const sp = kids.find(k => k.name === 'Spacer'); const right = sp && kids.indexOf(txt) > kids.indexOf(sp); if (sp) sp.remove();
    txt.textAutoResize = 'HEIGHT'; txt.layoutSizingHorizontal = 'FILL'; if (right) txt.textAlignHorizontal = 'RIGHT';
    OV.push(fr.name.slice(0, 18) + ' › ' + r.name + ' › ' + txt.characters.slice(0, 24));
  }
}
// KPI tiles: any text running past the tile's right edge wraps inside the tile
let KF = 0;
for (const fr of sec.children.filter(n => n.type === 'FRAME' && /^\[ADM-[BC]\d/.test(n.name))) for (const k of fr.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Admin/KPI Tile — '))) {
  const kb = k.absoluteBoundingBox; if (!kb) continue;
  for (const t of k.findAll(n => n.type === 'TEXT' && n.visible)) { const tb = t.absoluteBoundingBox; if (!tb) continue; const maxR = kb.x + kb.width - 16; if (tb.x + tb.width <= maxR + 0.5) continue; try { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(40, Math.floor(maxR - tb.x)), t.height); KF++; } catch (e) { MISS.push('kpi ' + String(e.message).slice(0, 60)); } }
}
fitSection(sec);
__R.push({ overflow: OV, kpiWrapped: KF, miss: [...new Set(MISS)] });
