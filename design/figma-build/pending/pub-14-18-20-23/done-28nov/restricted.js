// ===== Fix: wrap long questions in collapsed FAQ cards of 302:109456, restack 302:109738 =====
const FA = await figma.getNodeByIdAsync('302:109456'); const FB = await figma.getNodeByIdAsync('302:109738');
let fixed = 0;
for (const inst of FA.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('Card/FAQ Item'))) {
  const q = inst.findOne(n => n.type === 'TEXT' && n.name === 'Question'); if (!q) continue;
  const ib = inst.absoluteBoundingBox, qb = q.absoluteBoundingBox;
  if (qb.x + qb.width > ib.x + ib.width - 8) { q.textAutoResize = 'HEIGHT'; try { q.layoutSizingHorizontal = 'FILL'; } catch (e) { q.resize(ib.x + ib.width - qb.x - 56, q.height); } fixed++; }
}
FB.y = FA.y + FA.height + 160;
// ===== [PUB-20] Restricted Countries — 390 Search “united” (cloned from mobile Default 34:491926) =====
const RSRC = await figma.getNodeByIdAsync('34:491926');
const NR = '[PUB-20] Restricted Countries / 390 / Search — “united”';
const R = await cloneFrom('34:491926', NR, RSRC.y + RSRC.height + 160);
const C = R.findChild(n => n.name === 'Content');
const sI = C.findChild(n => n.name.startsWith('Input/Search')); await search(sI, 'united'); sI.name = 'Input/Search — “united” (filled, Clear)';
const chipsRow = C.findChild(n => n.name.startsWith('Status filter'));
const CH = [['All · 3', 'All'], ['Permitted · 0', 'Permitted'], ['Limited · 0', 'Limited'], ['Restricted · 3', 'Restricted']];
for (const ch of chipsRow.children) { const m = CH.find(c => ch.name.indexOf(c[1]) >= 0); if (m) { setProp(ch, 'Label', m[0]); ch.name = 'Chip — ' + m[0]; } }
// result count
const rc = AL('VERTICAL', { name: 'Result count', gap: 4 }); const r1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' });
add(r1, [await T('3 countries match “united”', 'Body/M Strong', 'text/primary', { w: 200 }), 'FILL'], await DEMO('XS'), await T('Clear search', 'Label/M', 'text/brand'));
add(rc, [r1, 'FILL'], [await T('Searching names, ISO codes and short names (UK, USA, UAE)', 'Caption', 'text/tertiary', { w: 358 }), 'FILL']); ins(C, chipsRow, rc);
// results card = repurposed Europe region card
const eu = C.findChild(n => n.name.startsWith('Region — Europe')); eu.name = 'Results — “united” (3)';
const hdr = eu.children[0]; hdr.name = 'Results header';
const t1 = hdr.findOne(n => n.type === 'TEXT' && n.characters === 'Europe'); if (t1) t1.characters = '3 matches';
const t2 = hdr.findOne(n => n.type === 'TEXT' && n.characters === '18 countries'); if (t2) t2.characters = '3 restricted · 0 limited · 0 permitted';
const chev = hdr.findOne(n => n.name === 'Icon/chevron-up'); if (chev) chev.visible = false;
const gIcon = hdr.findOne(n => n.name === 'Icon/globe'); if (gIcon) { const s2 = await figma.getNodeByIdAsync(ICONS['search']); gIcon.swapComponent(s2); tint(gIcon, 'icon/muted'); gIcon.name = 'Icon/search'; }
const uk = eu.children.find(n => n.name === 'Country — United Kingdom');
for (const n of [...eu.children]) if (n !== hdr && n !== uk) n.remove();
async function setRow(row, iso, name, region, why) {
  row.name = 'Country — ' + name;
  const isoF = row.findOne(n => n.name.startsWith('ISO — ')); if (isoF) { isoF.name = 'ISO — ' + iso; const it = isoF.findOne(n => n.type === 'TEXT'); if (it) { it.characters = iso; it.name = iso; } }
  const nm = row.findOne(n => n.type === 'TEXT' && n.name === 'United Kingdom'); if (nm) { nm.characters = name; nm.name = name; hilite(nm, 'united'); }
  const ac = row.findOne(n => n.type === 'TEXT' && n.name === 'Sign-in & withdrawals only'); if (ac) { ac.characters = region + ' · Sign-in & withdrawals only'; ac.name = 'Access'; }
  const wy = row.findOne(n => n.type === 'TEXT' && n.name.startsWith('Why:')); if (wy) { wy.characters = 'Why: ' + why; wy.name = 'Why'; }
  return row;
}
const us = uk.clone(); eu.appendChild(us); const ae = uk.clone(); eu.appendChild(ae);
await setRow(uk, 'GB', 'United Kingdom', 'Europe', 'UK licence required — not held');
await setRow(us, 'US', 'United States', 'Americas', 'Licensed state by state — no US licences held'); us.name += ' (expanded)';
await setRow(ae, 'AE', 'United Arab Emirates', 'Middle East & Africa', 'Gambling prohibited by local law');
// expanded detail for United States
const dt = AL('VERTICAL', { name: 'Expanded detail — United States', fill: 'bg/secondary', stroke: 'border/subtle', r: 10, p: 12, gap: 12 });
async function list(title, col, ic, icCol, items) { const l = AL('VERTICAL', { name: title, gap: 6 }); add(l, await T(title, 'Overline', col)); for (const s of items) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await IC(ic, 16, icCol), [await T(s, 'Body/S', 'text/secondary', { w: 260 }), 'FILL']); add(l, [r, 'FILL']); } return l; }
add(dt, [await list('YOU CAN', 'text/success', 'check-circle', 'text/success', ['Sign in and see your balances', 'Withdraw to a whitelisted address', 'Contact support or close your account']), 'FILL']);
add(dt, [await list('YOU CAN’T', 'text/danger', 'x-circle', 'text/danger', ['Create a new account', 'Deposit or claim promotions', 'Play games or enter Global Pool rounds']), 'FILL']);
const wv = AL('VERTICAL', { name: 'Why', gap: 6 }); add(wv, await T('WHY', 'Overline', 'text/tertiary'), [await T('GLOBAL POOL holds no US federal or state gambling licence, and online casino play is licensed state by state.', 'Body/S', 'text/secondary', { w: 290 }), 'FILL']); add(dt, [wv, 'FILL']);
const sm = AL('HORIZONTAL', { name: 'Since', gap: 8, align: 'CENTER' }); add(sm, [await T('Restricted since 1 Jan 2026 · reviewed 20 Nov 2026', 'Caption', 'text/tertiary', { w: 230 }), 'FILL'], await DEMO('XS')); add(dt, [sm, 'FILL']);
const lk = AL('HORIZONTAL', { name: 'Link — jurisdiction note', gap: 4, align: 'CENTER' }); add(lk, await T('Read the jurisdiction note', 'Label/M', 'text/brand'), await IC('arrow-right', 16, 'icon/brand')); add(dt, lk);
add(us, [dt, 'FILL']);
// tip + browse by region
const tip = AL('HORIZONTAL', { name: 'Tip', gap: 8 }); add(tip, await IC('info', 16, 'icon/muted'), [await T('Tip: search also matches ISO codes and short names — try “GB”, “USA” or “UAE”.', 'Caption', 'text/tertiary', { w: 320 }), 'FILL']); ins(C, eu, tip);
const amer = C.findChild(n => n.name.startsWith('Region — Americas'));
const bh = await T('Browse by region', 'Heading/H5', 'text/primary', { w: 358, name: 'Browse by region' }); ins(C, tip, bh);
const eur = amer.clone(); ins(C, bh, eur, null); eur.name = 'Region — Europe (collapsed)'; eur.layoutSizingHorizontal = amer.layoutSizingHorizontal;
const e1 = eur.findOne(n => n.type === 'TEXT' && n.characters.startsWith('Americas')); if (e1) { e1.characters = 'Europe · 18'; e1.name = 'Europe · 18'; }
const e2 = eur.findOne(n => n.type === 'TEXT' && n.characters.indexOf('permitted') >= 0); if (e2) { e2.characters = '7 permitted · 3 limited · 8 restricted'; e2.name = e2.characters; }
fitSection(sec);
const audits = [FA, FB, R].map(f => ({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), x: f.x, y: f.y, overflow: overflowList(f).slice(0, 10) }));
let shots = 0; shots += await vshots(FA, 0.7, 2140); shots += await vshots(R, 0.7, 2140);
return { section: sec.id, created: CREATED, fixedQuestions: fixed, audits, notes: NOTES, shots };
