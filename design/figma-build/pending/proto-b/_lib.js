// SUPERSEDED — kept for reference only. The authoritative library is the _lib_*.js chunks assembled by build.cjs.
// ===== PROTO-B LIB v1 (PRO-06..10 prototypes, page 11) =====
const P11 = figma.root.children.find(p => p.name === '11 — Prototypes');
await figma.setCurrentPageAsync(P11);
const MAINNAME = 'PRO-06..10 Prototypes (P1)';
const GAPX = 560, ROWGAP = 760, LOG = [];
const MAINS = () => FLOW.frames.filter(f => !String(f.step).startsWith('B'));
const COLOR = k => k === 'error' ? 'status/warning' : k === 'alt' ? 'status/info' : 'brand/primary';
const PRE = f => `${FLOW.id} · ${f.step} — `;
const colX = c => 120 + c * (1440 + GAPX);
function mainSection() {
  let s = P11.children.find(n => n.type === 'SECTION' && n.name === MAINNAME);
  if (!s) { let y = 0; for (const c of P11.children) y = Math.max(y, c.y + c.height + 600); s = figma.createSection(); s.name = MAINNAME; s.x = 0; s.y = P11.children.length > 1 ? y : 0; s.fills = [paint('bg/secondary')]; s.resizeWithoutConstraints(4000, 2000); }
  return s;
}
async function mainHeader(main) {
  let h = main.children.find(n => n.name === 'Header — PRO-06..10');
  if (h) return h;
  h = AL('VERTICAL', { name: 'Header — PRO-06..10', gap: 20, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20, w: 3000 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('11 — PROTOTYPES · P1 FLOWS', 'Overline', 'text/brand'), await DEMO('M'));
  add(h, ov, await T('PRO-06..10 — Games, KYC and admin prototypes', 'Display/M', 'text/primary'));
  add(h, await T('Five clickable flows built from clones of the verified source screens (pages 03, 04, 05, 08, 09). Each flow has its own section: a flow map card (steps, branch conditions, rules it proves), the cloned frames left → right with numbered headers, mint arrows for the happy path, amber arrows for error branches and sky arrows for alternate outcomes. Every frame carries a prototype bar (not product UI) with Simulate chips for branches plus Back and Restart, so no frame is a dead end. Start any flow from Present ▶ → Flows.', 'Body/L', 'text/secondary', { w: 2880 }));
  const row = AL('HORIZONTAL', { gap: 24, wrap: true, cgap: 12 });
  for (const t of ['PRO-06 Games Lobby → Game → Result', 'PRO-07 Profile → KYC', 'PRO-08 Admin → User Management', 'PRO-09 Admin → Finance', 'PRO-10 Admin → Pool Monitoring']) { const c = AL('HORIZONTAL', { gap: 8, p: [8, 16, 8, 16], fill: 'surface/raised', stroke: 'border/default', r: 9999, align: 'CENTER' }); add(c, await IC('play', 16, 'icon/brand'), await T(t, 'Label/M', 'text/primary')); add(row, c); }
  add(h, row);
  add(h, await T('Source of truth = the original frames. These are clones for prototyping: after a source changes, re-run pending/proto-b scripts (they rebuild the clones idempotently by name).', 'Caption', 'text/tertiary', { w: 2880 }));
  main.appendChild(h); h.x = 120; h.y = 120; return h;
}
function restack(main) {
  const hd = main.children.find(n => n.name === 'Header — PRO-06..10');
  let y = hd ? hd.y + hd.height + 240 : 160;
  for (const s of main.children.filter(n => n.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name))) { s.x = 120; s.y = y; y += s.height + 320; }
}
function subSection(main) {
  let s = main.children.find(n => n.type === 'SECTION' && n.name === FLOW.name);
  if (!s) { s = figma.createSection(); s.name = FLOW.name; s.fills = [paint('bg/base')]; main.appendChild(s); s.resizeWithoutConstraints(4000, 2000); s.x = 120; s.y = nextY(main, 320); }
  return s;
}
async function circ(txt, col, d = 32, style = 'Label/M') { const b = AL('HORIZONTAL', { name: 'Badge ' + txt, w: d, h: d, r: 9999, fill: col, align: 'CENTER', justify: 'CENTER' }); add(b, await T(txt, style, 'text/on-primary')); return b; }
function linkLabel(l) { return l.label || l.chip || ''; }
async function flowCard(sub) {
  let card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id);
  if (card) return card;
  card = AL('HORIZONTAL', { name: 'Flow map — ' + FLOW.id, gap: 64, p: 56, fill: 'surface/default', stroke: 'border/subtle', r: 20 });
  const c1 = AL('VERTICAL', { name: 'Intro', gap: 24, w: 880 });
  const ov = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(ov, await T('PROTOTYPE FLOW · ' + FLOW.pri + ' · PAGE 11', 'Overline', 'text/brand'), await DEMO('S'));
  add(c1, ov, await T(FLOW.name, 'Heading/H1', 'text/primary', { w: 880 }), await T(FLOW.goal, 'Body/L', 'text/secondary', { w: 880 }));
  const how = AL('VERTICAL', { name: 'How to play', gap: 8, p: 24, fill: 'surface/raised', r: 14, w: 880 });
  add(how, await T('How to play', 'Label/L', 'text/primary'), await T('Present ▶ → Flows → "' + FLOW.flowName + '". Click the dashed hotspots for the happy path. The prototype bar on top of every frame holds Simulate chips for the error branches plus Back and Restart — every frame has a way out.', 'Body/M', 'text/secondary', { w: 832 }));
  const lg = AL('VERTICAL', { name: 'Legend', gap: 10 });
  for (const [c, t] of [['brand/primary', 'Happy path — click the dashed hotspot'], ['status/warning', 'Error branch — Simulate chip or a failing action'], ['status/info', 'Alternate outcome — still a valid end state']]) { const r = AL('HORIZONTAL', { gap: 12, align: 'CENTER' }); add(r, rect(56, 4, c, 0, 'Legend line'), await T(t, 'Body/S', 'text/secondary')); add(lg, r); }
  const ck = AL('VERTICAL', { name: 'Rules this flow proves', gap: 10 }); add(ck, await T('Rules this flow proves', 'Label/L', 'text/primary'));
  for (const s of FLOW.checks) { const r = AL('HORIZONTAL', { gap: 10 }); add(r, await IC('shield-check', 16, 'icon/brand'), await T(s, 'Body/S', 'text/secondary', { w: 840 })); add(ck, r); }
  add(c1, how, lg, ck);
  const c2 = AL('VERTICAL', { name: 'Happy path', gap: 14, w: 1040 }); add(c2, await T('Happy path', 'Heading/H4', 'text/primary'));
  const mains = MAINS();
  for (let i = 0; i < mains.length; i++) {
    const f = mains[i]; const nx = mains[i + 1];
    const out = nx ? FLOW.links.find(l => l.from === f.k && l.to === nx.k) : null;
    const loops = FLOW.links.filter(l => l.from === f.k && l.loop).map(l => 'Loop: ' + linkLabel(l) + ' → ' + (FLOW.frames.find(x => x.k === l.to) || {}).step);
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T((out ? linkLabel(out) + ' → step ' + nx.step : 'End of flow — Restart or Back from the prototype bar') + (loops.length ? '. ' + loops.join('. ') : ''), 'Body/S', 'text/secondary', { w: 980 }));
    add(r, await circ(f.step, 'brand/primary'), st); add(c2, r);
  }
  const c3 = AL('VERTICAL', { name: 'Branches', gap: 14, w: 1040 }); add(c3, await T('Branches & alternate outcomes', 'Heading/H4', 'text/primary'));
  for (const f of FLOW.frames.filter(f => String(f.step).startsWith('B'))) {
    const inl = FLOW.links.find(l => l.to === f.k);
    const from = inl ? FLOW.frames.find(x => x.k === inl.from) : null;
    const r = AL('HORIZONTAL', { gap: 16 }); const st = AL('VERTICAL', { gap: 2 });
    add(st, await T(f.title + '  ·  ' + f.code, 'Label/L', 'text/primary', { w: 980 }), await T(f.cond, 'Body/S', 'text/secondary', { w: 980 }));
    if (from) add(st, await T('From ' + (String(from.step).startsWith('B') ? 'branch ' : 'step ') + from.step + ' via ' + (inl.chip && !inl.hot ? 'Simulate chip "' + inl.chip + '"' : 'hotspot "' + linkLabel(inl) + '"') + (f.exit ? ' · exit: ' + f.exit : ''), 'Caption', 'text/tertiary', { w: 980 }));
    add(r, await circ(f.step, COLOR(f.kind)), st); add(c3, r);
  }
  add(card, c1, c2, c3);
  sub.appendChild(card); card.x = 120; card.y = 120; return card;
}
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
function backOf(f) { if (f.back) return f.back; const m = MAINS(); const i = m.findIndex(x => x.k === f.k); if (i > 0) return m[i - 1].k; if (i === 0) return null; const inl = FLOW.links.find(l => l.to === f.k && !l.loop); return inl ? inl.from : null; }
function wrapOf(sub, f) { return sub.children.find(n => n.type === 'FRAME' && n.name.startsWith(PRE(f))); }
function rowTop(sub, r) {
  if (r === 0) { const card = sub.children.find(n => n.name === 'Flow map — ' + FLOW.id); return (card ? card.y + card.height : 120) + 480; }
  let m = 0; for (const f of FLOW.frames.filter(x => x.row === r - 1)) { const w = wrapOf(sub, f); if (w) m = Math.max(m, w.y + w.height); }
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
    sub.appendChild(w); w.x = colX(f.col); w.y = rowTop(sub, f.row);
    made[k] = w.id;
  }
  return made;
}
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
      else { const kk = (down[l.from] = (down[l.from] || 0) + 1); const sx = A.w.x + 200 + kk * 300; const my = hb.y - 140 - (lane++) * 72; await placeArrow(sub, [[sx, sy], [sx, my], [ex, my], [ex, ey]], col, kind === 'alt', 'Arrow ' + fa.step + '→' + fb.step); }
      arrows++;
    }
  }
  if (F[FLOW.start]) { const fsp = P11.flowStartingPoints.filter(p => p.name !== FLOW.flowName); fsp.push({ nodeId: F[FLOW.start].w.id, name: FLOW.flowName }); fsp.sort((a, b) => a.name.localeCompare(b.name)); try { P11.flowStartingPoints = fsp; } catch (e) { LOG.push('flowStart: ' + e.message); } }
  return { hotspots: hs, chips: ch, arrows, frames: Object.keys(F).length };
}
// ===== END PROTO-B LIB =====
