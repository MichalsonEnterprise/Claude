// ===== ACCOUNT KIT — MOBILE (390) =====
const MSTEP = 510; const W = 358; const IW = W - 32; // inner width of a 16-padded card
async function shellM(name, o = {}) {
  const f = await screen(name, 390, {}); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); add(f, [tb, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  if (o.back !== false) C.appendChild(await BTN('Ghost', o.back || 'Account', { size: 'S', lead: 'chevron-left' }));
  const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(C, [tt, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tt, [tr, 'FILL']); add(tr, [await T(o.title, 'Heading/H3', 'text/primary', { w: 280 }), 'FILL']); tr.appendChild(await DEMO('S'));
  if (o.sub) add(tt, [await T(o.sub, 'Body/S', 'text/secondary', { w: W }), 'FILL']);
  return { f, tb, C };
}
async function licM(C) { const l = await I('6:158', { Variant: 'Compact' }); add(C, [l, 'FILL']); return l; }
async function endM(S, o = {}) {
  if (o.cta) { const b = AL(o.stack ? 'VERTICAL' : 'HORIZONTAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(S.f, [b, 'FILL']); for (const x of o.cta) add(b, [x, 'FILL']); }
  const tab = await I('22:5413', { Active: 'Account' }); add(S.f, [tab, 'FILL']); return tab;
}
async function sheetM(f, title, sub, build, vp = 844) {
  if (vp) { f.resize(390, vp); f.primaryAxisSizingMode = 'FIXED'; } // sheet states show one phone viewport
  scrimOver(f);
  const sh = ALX('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 16, p: [12, 16, 32, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER' }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('VERTICAL', { name: 'Header', gap: 4 }); add(sh, [hd, 'FILL']); add(hd, [await T(title, 'Heading/H4', 'text/primary', { w: W }), 'FILL']); if (sub) add(hd, [await T(sub, 'Body/S', 'text/secondary', { w: W }), 'FILL']);
  await build(sh);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = Math.max(0, f.height - sh.height); return sh;
}
// 52px list row: icon tile | label + value | trailing nodes | chevron
async function lrow(icon, label, value, o = {}) { const r = AL('HORIZONTAL', { name: 'Row — ' + label, gap: 12, align: 'CENTER', p: [12, 0, 12, 0] }); if (!o.last) strokeSides(r, 'border/subtle', { b: 1 }); r.appendChild(await iconTile(icon, o.ic || 'icon/brand', 36)); const tx = AL('VERTICAL', { name: 'Text', gap: 2 }); add(r, [tx, 'FILL']); add(tx, [await T(label, 'Body/S Strong', 'text/primary', { w: 220 }), 'FILL']); if (value) { const vr = AL('HORIZONTAL', { name: 'Value', gap: 6, align: 'CENTER' }); add(tx, [vr, 'FILL']); add(vr, [await T(value, 'Caption', o.vTone || 'text/secondary', { w: 200 }), 'FILL']); if (o.demo) vr.appendChild(await DEMO('XS')); } for (const x of (o.right || [])) if (x) r.appendChild(x); if (o.chev !== false) r.appendChild(await IC('chevron-right', 20, 'icon/muted')); return r; }
function list(C, name) { const l = AL('VERTICAL', { name, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: [4, 16, 4, 16] }); add(C, [l, 'FILL']); return l; }
async function groupLabel(C, t) { const g = AL('HORIZONTAL', { name: 'Group — ' + t, p: [8, 4, 0, 4] }); add(C, [g, 'FILL']); g.appendChild(await T(t, 'Overline', 'text/tertiary')); return g; }
async function placeM(f, sec, col) { return await place(f, sec, col, MSTEP); }
// sheet states reuse the default frame of the same screen (clone) so the page under the scrim matches it exactly
function cloneBase(sec, baseName, name) { const b = byName(sec, baseName); if (!b) return null; const f = b.clone(); f.name = name; figma.currentPage.appendChild(f); for (const c of [...f.children]) if (c.layoutPositioning === 'ABSOLUTE') c.remove(); return f; }
async function pill(label, on) { const c = AL('HORIZONTAL', { name: 'Channel — ' + label, gap: 4, p: [4, 10, 4, 8], r: 9999, align: 'CENTER', fill: on ? 'brand/tint' : 'surface/raised', stroke: on ? 'border/brand' : 'border/subtle' }); c.appendChild(await IC(on ? 'check' : 'minus', 14, on ? 'icon/brand' : 'icon/muted')); c.appendChild(await T(label, 'Label/S', on ? 'text/brand' : 'text/tertiary')); return c; }
// ===== END ACCOUNT KIT — MOBILE =====
