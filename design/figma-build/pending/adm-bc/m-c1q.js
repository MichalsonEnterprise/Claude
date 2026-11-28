const PG = figma.root.children.find(p => p.name === '10 — Mobile Experience'); await figma.setCurrentPageAsync(PG);
const sec = section('ADM — Mobile', 217000, 0);
const NAME = '[ADM-C1] KYC Queue / 390 / Default';
const { f, c } = await MSHELL(NAME);
const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T('KYC queue', 'Heading/H3', 'text/primary'), await ST('Live', 'Live')); add(tr, [SPC(), 'FILL']); add(tr, await DEMO('M')); add(c, [tr, 'FILL']);
await WT(c, 'Oldest SLA first · 48 h SLA · a person makes every decision · times UTC', 'Caption', 'text/tertiary', 358);
const strip = AL('HORIZONTAL', { name: 'Stats (scrolls)', gap: 8, clip: true });
for (const [v, l, s] of [['214', 'open cases', 'oldest 47 h 34 min'], ['4', 'SLA under 12 h', '2 under 2 h'], ['95', 'decided today', '86 approved · 9 rejected']]) { const k = ALW('VERTICAL', { name: 'Stat ' + l, gap: 2, p: 12, fill: 'surface/default', stroke: 'border/subtle', r: 14, w: 156 }); add(k, await T(v, 'Number/M', 'text/primary'), await T(l, 'Body/S Strong', 'text/primary'), await T(s, 'Caption', 'text/tertiary')); add(strip, k); }
add(c, [strip, 'FILL']);
add(c, [await SEARCH('Search KYC ID, user, document', 'M'), 'FILL']);
const chips = AL('HORIZONTAL', { name: 'Filters (scroll)', gap: 8, clip: true }); for (const [l, s] of [['All open · 214', 1], ['Mine · 12', 0], ['SLA < 12 h · 4', 0], ['L3 · 31', 0], ['Restricted · 12', 0]]) add(chips, await CHIP(l, s)); add(c, [chips, 'FILL']);
const R = [['KYC-30365', 'LV', '@lyra_v', 'Poland', 'Level 2 · ID + liveness', [1, 1, 1], 'Low', 8, ['0 h 26 min', 'danger'], 'Unassigned', ['Pending', 'Pending']], ['KYC-30352', 'VI', '@velvet.io', 'Japan', 'Level 3 · enhanced (EDD)', [1, 1, 2], 'Medium', 38, ['1 h 12 min', 'danger'], 'M. Achebe', ['Under review', 'Sanctions check']], ['KYC-30377', 'J8', '@juno88', 'Brazil', 'Level 2 · ID + liveness', [1, 2, 1], 'Medium', 44, ['3 h 05 min', 'warning'], 'Unassigned', ['Pending', 'Pending']], ['KYC-30418', 'AQ', '@atlas_q', 'Germany', 'Level 2 · ID + liveness', [1, 1, 2], 'Low', 18, ['26 h 30 min'], 'K. Osei (you)', ['Under review', 'In review']]];
for (const r of R) {
  const k = CARD('Case ' + r[0], { gap: 10, p: 14, stroke: r[0] === 'KYC-30418' ? 'border/brand' : 'border/subtle' });
  const l1 = AL('HORIZONTAL', { name: 'L1', gap: 8, align: 'CENTER' }); add(l1, await T(r[0], 'Mono/S', 'text/primary'), await ST(r[10][0], r[10][1])); add(l1, [SPC(), 'FILL']); add(l1, await IC('chevron-right', 20, 'icon/muted')); add(k, [l1, 'FILL']);
  const l2 = AL('HORIZONTAL', { name: 'L2', gap: 8, align: 'CENTER' }); add(l2, await I('9:238', { Size: 'S' }, { Initials: r[1] })); const nm = AL('VERTICAL', { name: 'Who', gap: 0 }); add(nm, await T(r[2], 'Body/S Strong', 'text/primary'), await T(r[3] + ' · ' + r[4], 'Caption', 'text/tertiary')); add(l2, [nm, 'FILL']); add(k, [l2, 'FILL']);
  const l3 = AL('HORIZONTAL', { name: 'Checks', gap: 10, align: 'CENTER' }); for (const [lab, s] of [['Doc', r[5][0]], ['Face', r[5][1]], ['Lists', r[5][2]]]) { const ic = s === 1 ? ['check-circle', 'status/success'] : s === 0 ? ['x-circle', 'status/danger'] : ['alert-triangle', 'status/warning']; const g = AL('HORIZONTAL', { name: lab, gap: 3, align: 'CENTER' }); add(g, await IC(ic[0], 14, ic[1]), await T(lab, 'Caption', 'text/secondary')); add(l3, g); } add(l3, [SPC(), 'FILL']); const rk = await I('23:5378', { Level: r[6], Density: 'Compact' }); await setT(rk, 'Score', '· ' + r[7]); add(l3, rk); add(k, [l3, 'FILL']);
  const l4 = AL('HORIZONTAL', { name: 'SLA', gap: 6, align: 'CENTER', p: [8, 10, 8, 10], fill: r[8][1] === 'danger' ? 'status/danger-tint' : r[8][1] === 'warning' ? 'status/warning-tint' : 'surface/raised', r: 10 }); add(l4, await IC('clock', 14, r[8][1] === 'danger' ? 'status/danger' : r[8][1] === 'warning' ? 'status/warning' : 'icon/muted'), await T(r[8][0] + ' left', 'Body/S Strong', r[8][1] === 'danger' ? 'text/danger' : r[8][1] === 'warning' ? 'text/warning' : 'text/primary')); add(l4, [SPC(), 'FILL']); add(l4, await T(r[9], 'Caption', 'text/secondary')); add(k, [l4, 'FILL']);
  add(c, [k, 'FILL']);
}
add(c, [await BTN('Secondary', 'Load 10 more', { size: 'L' }), 'FILL']);
await WT(c, 'Showing 4 of 214 · sorted by SLA left · L3, PEP and sanctions hits need a second reviewer', 'Caption', 'text/tertiary', 358);
await MTABS(f, 'KYC');
return await DONE(f);
