// ===== PRO prototype builder lib (after GP HELPERS) =====
const page = figma.root.children.find(p => p.name === __PAGE_NAME__); await figma.setCurrentPageAsync(page);
const parent = section(__PARENT_NAME__, __PARENT_X__, __PARENT_Y__);
for (const pid of F.pages) { const sp = await figma.getNodeByIdAsync(pid); if (sp && sp.loadAsync) await sp.loadAsync(); }
const GAP = F.gap || 320, BGAP = F.bgap || 380, ROWY = F.rowY || 760;
// idempotent: rebuild this flow's section from scratch
for (const c of [...parent.children]) if (c.type === 'SECTION' && c.name.startsWith(F.key + ' ')) c.remove();
// flows sit side by side (PRO-06..10 section of the parallel agent sits directly below this parent at Y≈8884)
function restack() { const ss = parent.children.filter(c => c.type === 'SECTION').sort((a, b) => a.name.localeCompare(b.name)); let xx = 120; for (const c of ss) { fitSection(c, 160); c.x = xx; c.y = 120; xx += c.width + 400; } }
restack();
let fx0 = 120; for (const c of parent.children) fx0 = Math.max(fx0, c.x + c.width + 400);
const fs = figma.createSection(); fs.name = F.name; parent.appendChild(fs); fs.x = fx0; fs.y = 120; fs.fills = [paint('bg/base')];
const N = {}, SRC = {}, META = {}, out = { frames: {}, hotspots: 0, warn: [] };
// ---- clone frames ----
let x = 120;
const steps = F.steps.map((s, i) => ({ ...s, n: String(i + 1), happy: true }));
for (const s of steps) {
  const src = await figma.getNodeByIdAsync(s.src); if (!src) throw new Error('Missing source ' + s.src + ' ' + s.k);
  const c = src.clone(); fs.appendChild(c); c.x = x; c.y = ROWY; c.name = F.key + ' · ' + s.n + ' — ' + src.name;
  N[s.k] = c; SRC[s.k] = { w: src.width, h: src.height }; META[s.k] = s; out.frames[s.k] = c.id; x += src.width + GAP;
}
const colBottom = {}; for (const s of steps) colBottom[s.k] = ROWY + SRC[s.k].h;
const brs = []; const letters = {};
for (const b of (F.branches || [])) {
  const fromM = META[b.from]; const under = b.under || (fromM.happy ? b.from : fromM.under);
  letters[b.from] = (letters[b.from] || 0) + 1;
  const n = b.n || (fromM.happy ? fromM.n + 'abcdefgh'[letters[b.from] - 1] : fromM.n + '·' + letters[b.from]);
  const src = await figma.getNodeByIdAsync(b.src); if (!src) throw new Error('Missing source ' + b.src + ' ' + b.k);
  const c = src.clone(); fs.appendChild(c);
  const colX = N[under].x; const by = colBottom[under] + BGAP;
  c.x = colX; c.y = by; c.name = F.key + ' · ' + n + ' — ' + src.name;
  colBottom[under] = by + src.height;
  N[b.k] = c; SRC[b.k] = { w: src.width, h: src.height }; META[b.k] = { ...b, n, happy: false, under }; out.frames[b.k] = c.id; brs.push(META[b.k]);
}
// ---- reactions ----
const TR = { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: 0.3 };
const act = (to) => ({ type: 'NODE', destinationId: N[to].id, navigation: 'NAVIGATE', transition: TR, resetScrollPosition: true });
const RC = {}; const bump = (k, n = 1) => { RC[k] = (RC[k] || 0) + n; };
async function hot(k, label, hx, hy, hw, hh, to) {
  const f = N[k]; if (!f) { out.warn.push('no frame ' + k); return; } if (!N[to]) { out.warn.push('no dest ' + to); return; }
  const r = figma.createRectangle(); r.name = 'Hotspot/' + label; r.fills = []; f.appendChild(r);
  if (f.layoutMode && f.layoutMode !== 'NONE') r.layoutPositioning = 'ABSOLUTE'; r.resize(Math.max(8, hw), Math.max(8, hh)); r.x = hx; r.y = hy;
  await r.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [act(to)] }]); out.hotspots++; bump(k);
}
for (const l of (F.links || [])) await hot(l[0], l[1], l[2], l[3], l[4], l[5], l[6]);
// logo → restart on every frame except the start
const startK = steps[0].k;
for (const k of Object.keys(N)) {
  if (k === startK || (F.noLogo || []).includes(k)) continue;
  const f = N[k]; const fb = f.absoluteBoundingBox;
  const logo = f.findOne(n => n.type === 'INSTANCE' && /Brand\/Logo/.test(n.name) && n.visible !== false && n.absoluteBoundingBox && n.absoluteBoundingBox.y - fb.y < 260);
  let bx = 16, byy = 36, bw = 200, bh = 56;
  if (logo) { const b = logo.absoluteBoundingBox; bx = Math.round(b.x - fb.x); byy = Math.round(b.y - fb.y); bw = Math.round(b.width); bh = Math.round(b.height); } else out.warn.push('logo fallback ' + k);
  await hot(k, 'Logo — restart ' + F.key, bx, byy, bw, bh, startK);
}
const KC = { 1: 49, 2: 50, 3: 51, 4: 52 };
const FR = {}; // frame-level reactions
for (const [k, key, to] of (F.keys || [])) { (FR[k] = FR[k] || []).push({ trigger: { type: 'ON_KEY_DOWN', device: 'KEYBOARD', keyCodes: [KC[key]] }, actions: [act(to)] }); }
for (const [k, sec, to] of (F.timeouts || [])) { (FR[k] = FR[k] || []).push({ trigger: { type: 'AFTER_TIMEOUT', timeout: sec }, actions: [act(to)] }); }
for (const [k, arr] of Object.entries(FR)) { await N[k].setReactionsAsync(arr); bump(k, arr.length); }
// ---- flow map (locked container behind the screens) ----
const map = figma.createFrame(); map.name = 'Flow map / ' + F.key; map.fills = []; map.clipsContent = false; fs.insertChild(0, map); map.x = 0; map.y = 0;
async function arrow(pts, color, dashed, w = 3) {
  const minX = Math.min(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
  const v = figma.createVector(); map.appendChild(v);
  await v.setVectorNetworkAsync({ vertices: pts.map((p, i) => ({ x: p[0] - minX, y: p[1] - minY, strokeCap: i === pts.length - 1 ? 'ARROW_LINES' : 'NONE', strokeJoin: 'ROUND' })), segments: pts.slice(1).map((p, i) => ({ start: i, end: i + 1 })), regions: [] });
  v.x = minX; v.y = minY; v.strokes = [paint(color)]; v.strokeWeight = w; v.strokeJoin = 'ROUND'; if (dashed) v.dashPattern = [14, 10];
  v.name = 'Connector' + (dashed ? ' (branch)' : ''); return v;
}
async function chip(n, title, sub, kind) {
  const c = AL('HORIZONTAL', { name: 'Step ' + n, gap: 12, p: [8, 20, 8, 8], fill: 'surface/default', stroke: kind === 'B' ? 'status/warning' : 'border/brand', r: 9999, align: 'CENTER' });
  const dot = AL('HORIZONTAL', { name: 'Number', fill: kind === 'B' ? 'status/warning' : 'brand/primary', r: 9999, align: 'CENTER', justify: 'CENTER', w: 40, h: 40 });
  add(dot, await T(n, 'Label/L', 'text/on-primary'));
  const col = AL('VERTICAL', { name: 'Text', gap: 2 });
  add(col, await T(title, 'Label/L', 'text/primary'), await T(sub, 'Caption', 'text/tertiary'));
  add(c, dot, col); return c;
}
// title block
const tb = AL('VERTICAL', { name: 'Flow title', gap: 12, w: 1800 });
add(tb, await T(F.key + ' — Prototype flow', 'Overline', 'text/brand'));
add(tb, await T(F.title, 'Heading/H2', 'text/primary'));
const d = await T(F.desc, 'Body/M', 'text/secondary', { w: 1800 }); add(tb, [d, 'FILL']);
const lg = AL('HORIZONTAL', { name: 'Legend', gap: 24, align: 'CENTER' });
async function leg(color, dashed, txt) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); const ln = figma.createLine(); ln.resize(48, 0); ln.strokes = [paint(color)]; ln.strokeWeight = 3; if (dashed) ln.dashPattern = [10, 6]; add(r, ln, await T(txt, 'Caption', 'text/secondary')); return r; }
add(lg, await leg('brand/primary', false, 'Happy path — click the CTA (hotspot)'), await leg('status/warning', true, 'Branch — click the field named in the label, or press the key shown'), await T('Logo on every screen restarts the flow · pending screens auto-advance after the delay shown', 'Caption', 'text/tertiary'));
add(tb, lg); map.appendChild(tb); tb.x = 120; tb.y = 120;
// happy chips + arrows
const chipY = ROWY - 190;
const chipN = {};
for (const s of steps) { const c = await chip(s.n, s.t, s.sub || N[s.k].name.split(' — ').slice(1).join(' — ').slice(0, 90), 'H'); map.appendChild(c); c.x = N[s.k].x; c.y = chipY; chipN[s.k] = c; }
for (let i = 0; i < steps.length - 1; i++) {
  const a = steps[i], b = steps[i + 1]; const ca = chipN[a.k];
  const sx = ca.x + ca.width + 24, ex = N[b.k].x - 24, yy = chipY + ca.height / 2;
  await arrow([[sx, yy], [ex, yy]], 'brand/primary', false, 3);
  const lab = await T(a.cta || 'Continue', 'Label/M', 'text/brand'); map.appendChild(lab); lab.x = Math.round((sx + ex) / 2 - lab.width / 2); lab.y = yy - 34;
}
// branch annotations
let firstBox = null;
for (const b of brs) {
  const src = N[b.from], dst = N[b.k]; const sx0 = src.x, sy0 = src.y;
  const spineX = dst.x - 64; let pts;
  if (b.route === 'top') { const tx = sx0 + SRC[b.from].w - 160, yb = ROWY - 40; pts = [[tx, sy0 - 6], [tx, yb], [spineX, yb], [spineX, dst.y + 90], [dst.x - 8, dst.y + 90]]; }
  else if (src.x === dst.x) pts = [[sx0 - 4, sy0 + 140], [spineX, sy0 + 140], [spineX, dst.y + 90], [dst.x - 8, dst.y + 90]];
  else { const sw = SRC[b.from].w; pts = [[sx0 + sw + 4, sy0 + 260], [spineX, sy0 + 260], [spineX, dst.y + 90], [dst.x - 8, dst.y + 90]]; }
  await arrow(pts, 'status/warning', true, 2);
  const box = AL('VERTICAL', { name: 'Branch ' + b.n, gap: 8 });
  add(box, await chip(b.n, b.t, (b.state || dst.name.split(' / ').slice(-1)[0]).slice(0, 80), 'B'));
  add(box, await T('IF ' + b.cond + '  ·  Trigger: ' + b.trig, 'Label/M', 'text/warning'));
  add(box, await T('↩ ' + b.ret, 'Caption', 'text/secondary'));
  map.appendChild(box); box.x = dst.x; box.y = dst.y - 176; if (!firstBox) firstBox = box;
}
// size map container to content
let mx = 0, my = 0; for (const c of fs.children) { if (c === map) continue; mx = Math.max(mx, c.x + c.width); my = Math.max(my, c.y + c.height); }
for (const c of map.children) { mx = Math.max(mx, c.x + c.width); my = Math.max(my, c.y + c.height); }
map.resizeWithoutConstraints(mx + 120, my + 120); map.locked = true;
fitSection(fs, 160); restack(); fitSection(parent, 160);
// flow starting point
const ours = new Set(Object.values(N).map(n => n.id)); const fsp = [];
for (const p of (page.flowStartingPoints || [])) { if (p.name === F.name || p.name === F.flowName || ours.has(p.nodeId)) continue; if (await figma.getNodeByIdAsync(p.nodeId)) fsp.push({ nodeId: p.nodeId, name: p.name }); }
fsp.push({ nodeId: N[startK].id, name: F.flowName || F.name }); page.flowStartingPoints = fsp;
out.section = fs.id; out.parent = parent.id; out.map = map.id; out.reactions = RC; out.size = [Math.round(fs.width), Math.round(fs.height)];
out.fsp = page.flowStartingPoints.map(p => p.name + ' → ' + p.nodeId);
if (F.diag) { out.diag = {}; for (const k of F.diag) { const f = N[k]; const fb = f.absoluteBoundingBox; out.diag[k] = f.findAll(n => /logo|brand|burger|menu/i.test(n.name) && n.absoluteBoundingBox && n.absoluteBoundingBox.y - fb.y < 200).slice(0, 8).map(n => [n.name.slice(0, 40), n.type, Math.round(n.absoluteBoundingBox.x - fb.x), Math.round(n.absoluteBoundingBox.y - fb.y), Math.round(n.absoluteBoundingBox.width), Math.round(n.absoluteBoundingBox.height)]); } }
