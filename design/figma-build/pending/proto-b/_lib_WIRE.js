function findRect(inner, rx) {
  const ib = inner.absoluteBoundingBox;
  const vis = n => { let p = n; while (p && p !== inner) { if (p.visible === false) return false; p = p.parent; } return true; };
  let best = null;
  for (const n of inner.findAll(n => n.type === 'INSTANCE' && /^Button/.test(n.name))) {
    const t = n.findOne(x => x.type === 'TEXT' && x.visible); if (!t || !rx.test(t.characters.trim()) || !vis(n)) continue;
    const b = n.absoluteBoundingBox; if (b) best = [b.x - ib.x, b.y - ib.y, b.width, b.height];
  }
  if (best) return best;
  for (const n of inner.findAllWithCriteria({ types: ['TEXT'] })) { if (!rx.test(n.characters.trim()) || !vis(n)) continue; const b = n.absoluteBoundingBox; if (b) best = [b.x - ib.x - 12, b.y - ib.y - 8, b.width + 24, b.height + 16]; }
  return best;
}
async function placeArrow(sub, pts, col, dashed, name) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const mx = Math.min(...xs), my = Math.min(...ys);
  const v = figma.createVector(); v.name = name || 'Arrow';
  await v.setVectorNetworkAsync({ vertices: pts.map((p, i) => ({ x: p[0] - mx, y: p[1] - my, strokeCap: i === pts.length - 1 ? 'ARROW_EQUILATERAL' : 'ROUND', cornerRadius: 32 })), segments: pts.slice(1).map((_, i) => ({ start: i, end: i + 1 })) });
  v.strokes = [paint(col)]; v.strokeWeight = 5; v.fills = []; if (dashed) v.dashPattern = [18, 12];
  sub.appendChild(v); v.x = mx; v.y = my; return v;
}
async function wire(sub) {
  const F = {}; for (const f of FLOW.frames) { const w = wrapOf(sub, f); if (!w) { LOG.push('missing frame ' + f.k); continue; } F[f.k] = { f, w, inner: w.children[1] }; }
  for (const n of sub.children.filter(n => /^(Arrow|Step header)/.test(n.name))) n.remove();
  for (const k in F) for (const h of F[k].inner.children.filter(n => n.name.startsWith('Hotspot'))) h.remove();
  const tr = s => s ? { type: 'SMART_ANIMATE', easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.35 } : { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.25 };
  const nav = (to, s) => [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: F[to].w.id, navigation: 'NAVIGATE', transition: tr(s), resetScrollPosition: true }] }];
  let hs = 0, ch = 0;
  for (const l of FLOW.links) {
    if (!F[l.from] || !F[l.to]) { LOG.push('skip link ' + l.from + '>' + l.to); continue; }
    const rects = l.hot ? (Array.isArray(l.hot[0]) ? l.hot.slice() : [l.hot]) : [];
    if (l.find) { const r = findRect(F[l.from].inner, l.find); if (r) rects.push(r); else LOG.push('find miss ' + l.from + ' ' + l.find); }
    for (const r of rects) {
      const h = figma.createFrame(); h.name = 'Hotspot → ' + F[l.to].f.step + ' · ' + linkLabel(l); h.fills = [];
      stroke(h, l.kind === 'error' ? 'status/warning' : l.kind === 'alt' ? 'status/info' : 'border/focus', 2, 'OUTSIDE'); h.dashPattern = [8, 6]; radius(h, 10);
      const inner = F[l.from].inner; inner.appendChild(h); if (inner.layoutMode && inner.layoutMode !== 'NONE') h.layoutPositioning = 'ABSOLUTE';
      h.resize(Math.max(24, r[2] + 8), Math.max(24, r[3] + 8)); h.x = Math.round(r[0] - 4); h.y = Math.round(r[1] - 4);
      await h.setReactionsAsync(nav(l.to, l.smart)); hs++;
    }
    if (l.chip) { const c = F[l.from].w.findOne(n => n.name === 'Chip → ' + l.to); if (c) { await c.setReactionsAsync(nav(l.to, false)); ch++; } else LOG.push('chip miss ' + l.from + '>' + l.to); }
  }
  for (const k in F) {
    const { f, w } = F[k];
    const b = w.findOne(n => n.name === 'Chip ← Back'); const bt = backOf(f); if (b && bt && F[bt]) { await b.setReactionsAsync(nav(bt, false)); ch++; }
    const r = w.findOne(n => n.name === 'Chip ↺ Restart'); if (r && F[FLOW.start]) { await r.setReactionsAsync(nav(FLOW.start, false)); ch++; }
  }
  const heads = {};
  for (const k in F) {
    const { f, w, inner } = F[k]; const isB = String(f.step).startsWith('B');
    const h = AL('HORIZONTAL', { name: 'Step header ' + f.step, gap: 20, align: 'CENTER' });
    const st = AL('VERTICAL', { gap: 6 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Heading/H3', 'text/primary', { w: 1360 }));
    add(st, await T((isB && f.cond ? f.cond + '\n' : '') + 'Clone of ' + inner.name, 'Body/M', 'text/secondary', { w: 1360 }));
    add(h, await circ(f.step, isB ? COLOR(f.kind) : 'brand/primary', 56, 'Heading/H5'), st);
    sub.appendChild(h); h.x = w.x; h.y = w.y - h.height - 40; heads[k] = h;
  }
  const down = {}; let lane = 0, arrows = 0;
  for (const l of FLOW.links) {
    const A = F[l.from], B = F[l.to]; if (!A || !B || l.loop) continue;
    const fa = A.f, fb = B.f; const kind = l.kind || fb.kind || 'main'; const col = COLOR(kind);
    if (fa.row === fb.row && fb.col === fa.col + 1) {
      const y = A.w.y + 320, x1 = A.w.x + A.w.width + 32, x2 = B.w.x - 32;
      await placeArrow(sub, [[x1, y], [x2, y]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step); arrows++;
      const t = linkLabel(l); if (t) { const p = AL('HORIZONTAL', { name: 'Arrow label ' + fa.step + '→' + fb.step, p: [10, 16, 10, 16], fill: 'surface/raised', stroke: col, sw: 2, r: 14 }); add(p, await T(t, 'Label/M', 'text/primary', t.length > 30 ? { w: 440 } : {})); sub.appendChild(p); p.x = Math.round((x1 + x2) / 2 - p.width / 2); p.y = y - p.height - 28; }
    } else if (fb.row > fa.row) {
      const hb = heads[l.to]; const ex = B.w.x + 28, ey = hb.y - 12, sy = A.w.y + A.w.height + 24;
      if (fb.col === fa.col) await placeArrow(sub, [[ex, sy], [ex, ey]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step);
      else { const kk = (down[l.from] = (down[l.from] || 0) + 1); const sx = A.w.x + 200 + kk * 300; let top = hb.y; for (const q of Object.values(F)) if (q.f.row === fb.row && q.f.col >= Math.min(fa.col, fb.col) && q.f.col <= Math.max(fa.col, fb.col) && heads[q.f.k]) top = Math.min(top, heads[q.f.k].y); const my = top - 100 - (lane++) * 72; await placeArrow(sub, [[sx, sy], [sx, my], [ex, my], [ex, ey]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step); }
      arrows++;
    }
  }
  // flow starting points are synced by syncFlows(main) in every script
  return { hotspots: hs, chips: ch, arrows, frames: Object.keys(F).length };
}
