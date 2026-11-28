// ===== RG MOBILE KIT =====
async function shellM(name, tab, o = {}) {
  const f = await screen(name, 390, {}); add(f, [await DEMOBAR(), 'FILL']);
  const tb = await I('23:12908', { State: 'Member' }); add(f, [tb, 'FILL']); if (o.noDeposit) { try { await noDeposit(tb); } catch (e) {} }
  if (o.banner) add(f, [o.banner, 'FILL']);
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  if (o.bare) return { f, tb, C };
  C.appendChild(await BTN('Ghost', tab === 'Overview' ? 'Account' : 'Responsible gaming', { size: 'S', lead: 'chevron-left' }));
  const tt = AL('VERTICAL', { name: 'Title', gap: 4 }); add(C, [tt, 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tt, [tr, 'FILL']); add(tr, [await T(o.title || 'Responsible gaming', 'Heading/H3', 'text/primary'), 'FILL']); tr.appendChild(await I('6:159'));
  if (o.sub) add(tt, [await T(o.sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  const pills = AL('HORIZONTAL', { name: 'RG sub-nav (scrolls)', gap: 8, w: 358, clip: true }); C.appendChild(pills); pills.layoutSizingHorizontal = 'FILL';
  const idx = Math.max(0, TABS.indexOf(tab) - 1);
  for (const t of TABS.slice(idx).concat(TABS.slice(0, idx))) { const p = await I('20:6895', { State: t === tab ? 'Active' : 'Default' }, { Label: t, 'Show icon': false }); p.name = 'Pill — ' + t; pills.appendChild(p); }
  return { f, tb, C };
}
async function endM(S, o = {}) {
  if (o.cta) { const b = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(b, 'border/subtle', { t: 1 }); add(S.f, [b, 'FILL']); for (const x of o.cta) add(b, [x, 'FILL']); }
  const tab = await I('22:5413', { Active: 'Account' }); add(S.f, [tab, 'FILL']); return tab;
}
async function licM(C) { const l = await I('6:158', { Variant: 'Compact' }); add(C, [l, 'FILL']); return l; }
async function sheetM(f, title, sub, build) {
  scrimOver(f);
  const sh = AL('VERTICAL', { name: 'Bottom sheet — ' + title, gap: 16, p: [12, 16, 32, 16], fill: 'surface/overlay', w: 390 }); stroke(sh, 'border/subtle'); await fx(sh, 'Elevation/4 — Modal');
  for (const c of ['topLeftRadius', 'topRightRadius']) sh.setBoundVariable(c, VAR['radius/2xl']);
  const gr = AL('HORIZONTAL', { name: 'Grabber row', justify: 'CENTER' }); add(sh, [gr, 'FILL']); gr.appendChild(rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('VERTICAL', { name: 'Header', gap: 4 }); add(sh, [hd, 'FILL']); add(hd, [await T(title, 'Heading/H4', 'text/primary', { w: 358 }), 'FILL']); if (sub) add(hd, [await T(sub, 'Body/S', 'text/secondary', { w: 358 }), 'FILL']);
  await build(sh);
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = f.height - sh.height; return sh;
}
async function placeM(f, sec, x, y) { sec.appendChild(f); f.x = x; f.y = y; fitSection(sec); return f; }
// ===== END RG MOBILE KIT =====
