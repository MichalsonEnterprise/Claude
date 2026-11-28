async function BAR(f) {
  const nMain = MAINS().length; const isB = String(f.step).startsWith('B');
  const bar = AL('HORIZONTAL', { name: 'Prototype bar (not product UI)', gap: 12, p: [8, 24, 8, 24], fill: 'bg/secondary', align: 'CENTER' });
  strokeSides(bar, isB ? COLOR(f.kind) : 'border/brand', { b: 2 });
  const tag = AL('HORIZONTAL', { name: 'Tag', gap: 6, p: [4, 10, 4, 10], fill: isB ? (f.kind === 'error' ? 'status/warning-tint' : 'status/info-tint') : 'brand/tint', r: 9999, align: 'CENTER' });
  add(tag, await IC('play', 14, isB ? (f.kind === 'error' ? 'text/warning' : 'text/info') : 'icon/brand'), await T('PROTOTYPE', 'Overline', isB ? (f.kind === 'error' ? 'text/warning' : 'text/info') : 'text/brand'));
  add(bar, tag, await T(FLOW.id + ' · ' + (isB ? 'Branch ' + f.step : 'Step ' + f.step + ' of ' + nMain) + ' — ' + f.title, 'Label/M', 'text/primary', { name: 'Step label' }));
  const sp = AL('HORIZONTAL', { name: 'Spacer' }); add(bar, [sp, 'FILL']);
  const outs = FLOW.links.filter(l => l.from === f.k && l.chip);
  if (outs.length) add(bar, await T('Prototype actions:', 'Caption', 'text/tertiary'));
  for (const l of outs) { const k = l.kind || 'main'; const b = await BTN(k === 'main' ? 'Primary' : 'Secondary', l.chip, { size: 'S', lead: k === 'main' ? 'arrow-right' : k === 'error' ? 'alert-triangle' : 'refresh' }); b.name = 'Chip → ' + l.to; add(bar, b); }
  if (backOf(f)) { const b = await BTN('Ghost', 'Back', { size: 'S', lead: 'arrow-left' }); b.name = 'Chip ← Back'; add(bar, b); }
  if (f.k !== FLOW.start) { const b = await BTN('Ghost', 'Restart flow', { size: 'S', lead: 'rotate-ccw' }); b.name = 'Chip ↺ Restart'; add(bar, b); }
  return bar;
}
function rowTop(sub, r, f) {
  if (r === 0) { const card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id); return (card ? card.y + card.height : 120) + 480; }
  const cols = f && f.align ? f.align : f ? [f.col] : null;
  let m = 0; for (const x of FLOW.frames.filter(x => x.row === r - 1 && (!cols || cols.includes(x.col)))) { const w = wrapOf(sub, x); if (w) m = Math.max(m, w.y + w.height); }
  if (!m) for (const x of FLOW.frames.filter(x => x.row === r - 1)) { const w = wrapOf(sub, x); if (w) m = Math.max(m, w.y + w.height); }
  if (!m) throw new Error('Row ' + (r - 1) + ' must exist before row ' + r);
  return m + ROWGAP;
}
async function cloneSteps(sub, keys) {
  for (const s of P11.children.filter(n => n.type === 'FRAME' && n.name.startsWith(FLOW.id + ' · '))) s.remove(); // strays from a failed run
  const made = {};
  for (const k of keys) {
    const f = FLOW.frames.find(x => x.k === k); if (!f) throw new Error('No spec ' + k);
    let w = wrapOf(sub, f); if (w) { made[k] = w.id + ' (existing)'; continue; }
    const src = await figma.getNodeByIdAsync(f.src); if (!src) throw new Error('Missing source ' + f.src);
    let pg = src; while (pg && pg.type !== 'PAGE') pg = pg.parent; if (pg && pg.loadAsync) await pg.loadAsync();
    w = AL('VERTICAL', { name: PRE(f) + src.name, fill: 'bg/base', w: src.width }); w.clipsContent = true;
    const cc = __COLS['Color']; const cm = cc.modes.find(m => m.name === 'Dark'); if (cm) w.setExplicitVariableModeForCollection(cc, cm.modeId);
    const bc = __COLS['Breakpoint']; const bm = bc.modes.find(m => m.name === (src.width >= 1440 ? 'Desktop 1440' : 'Mobile 390')); if (bm) w.setExplicitVariableModeForCollection(bc, bm.modeId);
    add(w, [await BAR(f), 'FILL']);
    const c = src.clone(); w.appendChild(c);
    sub.appendChild(w); w.x = colX(f.col); w.y = rowTop(sub, f.row, f);
    made[k] = w.id;
  }
  return made;
}
