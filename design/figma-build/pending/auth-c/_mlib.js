// ===== KYC MOBILE LIB (AUTH-11..17, page 10) — paste AFTER helpers.js =====
const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('AUTH — Mobile C', 77000, 0);
const LBL = ['Intro', 'Details', 'Document', 'Liveness', 'Review'];
async function setT(root, name, s, i = 0) { const t = root.findAll(n => n.type === 'TEXT' && n.name === name)[i]; if (!t) return null; for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = s; return t; }
async function tx(p, s, st = 'Body/S', c = 'text/secondary', fw = true) { const t = await T(s, st, c, { w: 100 }); p.appendChild(t); if (fw) t.layoutSizingHorizontal = 'FILL'; return t; }
function box(p, dir, o = {}, mode = 'FILL') { const b = AL(dir, o); p.appendChild(b); if (mode === 'FILL') b.layoutSizingHorizontal = 'FILL'; return b; }
async function li(p, icon, s, o = {}) { const r = box(p, 'HORIZONTAL', { name: o.name || 'Item — ' + s.slice(0, 32), gap: o.gap ?? 10 }); r.appendChild(await IC(icon, o.is || 18, o.ic || 'icon/brand')); await tx(r, s, o.st || 'Body/S', o.c || 'text/secondary'); return r; }
function R(p, x, y, w, h, c, r = 0, nm = 'Shape') { const n = rect(w, h, c, r, nm); p.appendChild(n); n.x = x; n.y = y; return n; }
function E(p, x, y, w, h, c, nm = 'Shape') { const n = ellipse(w, h, c, nm); p.appendChild(n); n.x = x; n.y = y; return n; }
async function TT(p, x, y, s, st, c) { const t = await T(s, st, c); p.appendChild(t); t.x = x; t.y = y; return t; }
function band(p, y, c, h = 120, rot = -14) { const b = R(p, -80, y, 600, h, c, 0, 'Angled colour block'); b.rotation = rot; return b; }
async function idCard(p, x, y, rot, o = {}) { const c = figma.createFrame(); c.name = 'Illustration — ID card ' + (o.back ? 'back' : 'front') + ' (DEMO)'; c.resize(240, 152); fill(c, 'paper/50'); radius(c, 14); c.clipsContent = true; p.appendChild(c);
  R(c, 0, 0, 240, 28, 'mint/600', 0, 'Header band'); await TT(c, 14, 7, o.back ? 'IDENTITY CARD · BACK' : 'IDENTITY CARD', 'Overline', 'text/on-primary');
  if (!o.back) { R(c, 14, 40, 62, 78, 'paper/200', 6, 'Photo'); E(c, 31, 50, 28, 32, 'paper/600', 'Head'); R(c, 21, 86, 48, 32, 'paper/600', 14, 'Shoulders'); await TT(c, 90, 38, 'KARLSSON', 'Label/M', 'ink/800'); await TT(c, 90, 56, 'NOVA', 'Label/S', 'ink/600'); R(c, 90, 80, 96, 6, 'paper/300', 4); R(c, 90, 92, 120, 6, 'paper/300', 4); R(c, 90, 104, 70, 6, 'paper/300', 4); R(c, 194, 40, 32, 24, 'paper/300', 4, 'Chip'); }
  else { for (let i = 0; i < 18; i++) R(c, 14 + i * 7, 40, i % 3 ? 3 : 5, 34, 'ink/700', 0, 'Barcode'); R(c, 150, 40, 76, 6, 'paper/300', 4); R(c, 150, 52, 60, 6, 'paper/300', 4); R(c, 150, 64, 70, 6, 'paper/300', 4); await TT(c, 14, 112, 'KARLSSON<<NOVA<<<<<<<<', 'Mono/S', 'ink/600'); }
  await TT(c, 14, o.back ? 92 : 124, 'IDPRT0004821<<<<<<<<<', 'Mono/S', 'ink/600');
  c.x = x; c.y = y; c.rotation = rot; return c; }
async function artBanner(p, name, h, draw) { const a = figma.createFrame(); a.name = 'Art — ' + name; a.resize(358, h); fill(a, 'surface/raised'); radius(a, 14); a.clipsContent = true; p.appendChild(a); a.layoutSizingHorizontal = 'FILL'; await draw(a); const db = await DEMO('XS'); a.appendChild(db); db.x = 358 - 47 - 12; db.y = 12; return a; }
// mobile screen: DEMOBAR → Shell/Topbar Mobile (Member) → flow header (back, title, KYC chip, step progress) → content
async function mscreen(name, col, o = {}) {
  const xs = 120 + col * 510; let ys = 440; for (const c of sec.children) if (Math.abs(c.x - xs) < 2) ys = Math.max(ys, c.y + c.height + 160);
  const f = await screen(name, 390, {}); sec.appendChild(f); f.x = xs; f.y = ys;
  const bar = await DEMOBAR(); f.appendChild(bar); bar.layoutSizingHorizontal = 'FILL';
  const tb = await I('23:12908', { State: 'Member' }); f.appendChild(tb); tb.layoutSizingHorizontal = 'FILL';
  const sh = box(f, 'VERTICAL', { name: 'Flow header', gap: 10, p: [8, 16, 14, 8], fill: 'bg/secondary' }); strokeSides(sh, 'border/subtle', { b: 1 });
  const r = box(sh, 'HORIZONTAL', { name: 'Title row', gap: 4, align: 'CENTER' }); const bk = await I('7:774', { Type: 'Ghost', Size: 'L', State: 'Default' }, { Icon: ICONS['arrow-left'] }); bk.name = 'Button/Icon — Back (44)'; r.appendChild(bk);
  await tx(r, 'Identity verification', 'Label/L', 'text/primary'); r.appendChild(await I('23:5565', { Status: o.chip[0], Level: o.chip[1] }));
  if (o.step != null) { const pg = box(sh, 'VERTICAL', { name: 'Step progress (5 steps)', gap: 8, p: [0, 0, 0, 8] }); const pr = box(pg, 'HORIZONTAL', { name: 'Labels', gap: 8 }); await tx(pr, 'Step ' + (o.step + 1) + ' of 5 · ' + LBL[o.step], 'Label/M', 'text/brand'); pr.appendChild(await T(o.step < 4 ? 'Next: ' + LBL[o.step + 1] : 'Last step', 'Caption', 'text/tertiary'));
    const sg = box(pg, 'HORIZONTAL', { name: 'Segments', gap: 4 }); for (let i = 0; i < 5; i++) { const s = rect(10, 4, o.err === i ? 'status/danger' : i <= o.step ? 'brand/primary' : 'border/default', 9999, 'Segment ' + (i + 1) + ' — ' + LBL[i]); sg.appendChild(s); s.layoutSizingHorizontal = 'FILL'; } }
  const body = box(f, 'VERTICAL', { name: 'Content', gap: 20, p: [20, 16, 24, 16] });
  return { f, body };
}
// sticky CTA bar (+ optional tab bar) then place + fit
async function mfinish(f, o = {}) {
  if (o.cta) { const s = box(f, 'VERTICAL', { name: 'Sticky CTA', gap: 10, p: [12, 16, o.tab ? 12 : 28, 16], fill: 'surface/default' }); strokeSides(s, 'border/subtle', { t: 1 }); if (o.note) { const t = await tx(s, o.note, 'Caption', 'text/tertiary'); t.textAlignHorizontal = 'CENTER'; } for (const b of o.cta) { s.appendChild(b); b.layoutSizingHorizontal = 'FILL'; } }
  if (o.tab) { const t = await I('22:5413', { Active: 'Account' }); f.appendChild(t); t.layoutSizingHorizontal = 'FILL'; }
  fitSection(sec); return f;
}
// ===== END KYC MOBILE LIB =====
