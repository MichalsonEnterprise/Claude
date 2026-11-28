const page = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(page);
const sec = section('GP — Mobile A', 161000, 0);
async function lf(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
async function st(root, name, val, nth = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[nth]; if (!t) return null; await lf(t); t.characters = val; return t; }
function colY(x) { let m = 0, any = false; for (const c of sec.children) if (Math.abs(c.x - x) < 2) { any = true; m = Math.max(m, c.y + c.height); } return any ? m + 160 : 160; }
async function overlayM(name, X, sheet, pre) {
  for (const o of sec.children.filter(n => n.name === name)) o.remove();
  const vh = Math.max(844, Math.round(sheet.height) + 120); const Y = colY(X);
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = X; f.y = Y; f.primaryAxisSizingMode = 'AUTO';
  add(f, [await DEMOBAR('DEMO DATA — illustrative figures only, not real.'), 'FILL']);
  const vp = figma.createFrame(); vp.name = 'Viewport — bottom sheet over Global Pool hub'; vp.fills = []; vp.clipsContent = true; vp.resize(390, vh); add(f, [vp, 'FILL']);
  const src = await figma.getNodeByIdAsync('34:434743');
  const bg = src.clone(); bg.name = 'Background — hub (inert)'; vp.appendChild(bg); bg.x = 0; bg.y = 0;
  for (const nm of ['Notice/Demo Data', 'Shell/Footer Mega', 'Sticky participate bar (pinned above tab bar)', 'Nav/Mobile Tab Bar']) { const n = bg.children.find(c => c.name === nm); if (n) n.remove(); }
  if (pre) { const me = bg.findOne(n => n.name === 'My entries'); await st(me, 'ME count', '0'); await st(me, 'ME sub', 'entries in #1,248 yet'); await st(me, 'ME locked', '0.00 USDT locked'); await st(me, 'ME fees', 'appear once confirmed'); await st(me, 'ME ids', '—'); await st(me, 'ME limit', '0.00 / 500.00'); const mf = me.findOne(n => n.name === 'Meter fill'); if (mf) mf.resize(6, 6); }
  const scrim = rect(390, vh, 'scrim/overlay', 0, 'Scrim'); vp.appendChild(scrim);
  vp.appendChild(sheet); sheet.x = 0; sheet.y = vh - Math.round(sheet.height);
  fitSection(sec);
  return { f, vp, bg };
}
async function sheetFromModal(state) {
  const w = AL('VERTICAL', { name: 'Sheet — Participation preview / ' + state, fill: 'surface/overlay', clip: true }); w.resize(390, 100); w.counterAxisSizingMode = 'FIXED';
  for (const c of ['topLeftRadius', 'topRightRadius']) w.setBoundVariable(c, VAR['radius/2xl']); strokeSides(w, 'border/subtle', { t: 1 }); await fx(w, 'Elevation/4 — Modal');
  const g = AL('HORIZONTAL', { name: 'Handle', p: [8, 0, 4, 0], justify: 'CENTER' }); add(g, rect(40, 4, 'border/strong', 9999, 'Grabber')); add(w, [g, 'FILL']);
  const m = await I('28:19099', { State: state }); add(w, [m, 'FILL']);
  m.fills = []; m.strokes = []; m.effects = []; for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) m[c] = 0;
  for (const nm of ['Header', 'Body', 'Footer']) { const n = m.findOne(x => x.name === nm); if (!n) continue; n.setBoundVariable('paddingLeft', VAR['space/4']); n.setBoundVariable('paddingRight', VAR['space/4']); }
  const hi = AL('HORIZONTAL', { name: 'Home indicator', p: [4, 0, 8, 0], justify: 'CENTER' }); add(hi, rect(134, 5, 'text/primary', 9999, 'Indicator')); add(w, [hi, 'FILL']);
  return w;
}
