// ===== m1 — [PUB-05] Winners Hall / 390 : Default, Filters (bottom sheet), Empty =====
const N_DEF = '[PUB-05] Winners Hall / 390 / Default';
const N_FIL = '[PUB-05] Winners Hall / 390 / Filters — bottom sheet';
const N_EMP = '[PUB-05] Winners Hall / 390 / Empty — no wins match filters';
const COLX = 120;
const R_DEF = /^\[PUB-05\].*\/ 390 \/ Default/, R_FIL = /^\[PUB-05\].*\/ 390 \/ Filter/, R_EMP = /^\[PUB-05\].*\/ 390 \/ Empty/;
async function winRow(rank, art, handle, meta, when, amt, gold, verify, last) {
  const r = AL('HORIZONTAL', { name: 'Winner row — #' + rank + ' ' + handle, gap: 12, p: [12, 0, 12, 0], align: 'CENTER' });
  if (!last) strokeSides(r, 'border/subtle', { b: 1 });
  const tf = figma.createFrame(); tf.name = 'Thumb + rank'; tf.resize(40, 53); tf.fills = []; tf.clipsContent = false;
  const th = await I(ART[art]); th.name = 'Thumb — Tile/Game Art ' + art; th.rescale(0.25); tf.appendChild(th); th.x = 0; th.y = 0;
  if (rank) { const rk = AL('HORIZONTAL', { name: 'Rank ' + rank, w: 22, h: 22, r: 9999, fill: rank <= 3 ? 'accent/gold' : 'surface/raised', stroke: 'bg/base', sw: 2, align: 'CENTER', justify: 'CENTER' }); add(rk, await T(String(rank), 'Label/S', rank <= 3 ? 'text/on-gold' : 'text/primary')); tf.appendChild(rk); rk.x = -6; rk.y = -6; }
  const mid = AL('VERTICAL', { name: 'Details', gap: 2 });
  const hr = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(hr, await T(handle, 'Label/M', handle === 'Hidden player' ? 'text/secondary' : 'text/primary'), await DEMO('XS'));
  add(mid, hr, [await T(meta, 'Caption', 'text/secondary', { w: 150 }), 'FILL'], [await T(when, 'Caption', 'text/tertiary', { w: 150 }), 'FILL']);
  const rt = AL('VERTICAL', { name: 'Prize + verify', gap: 12, align: 'MAX' });
  const am = AL('HORIZONTAL', { name: 'Prize', gap: 4, align: 'BASELINE' }); add(am, await T(amt, 'Number/S', gold ? 'text/gold' : 'text/brand'), await T('USDT', 'Caption', 'text/tertiary'));
  const vf = AL('HORIZONTAL', { name: 'Link — ' + verify, gap: 4, align: 'CENTER' }); add(vf, await IC('shield-check', 14, 'icon/brand'), await T(verify, 'Label/S', 'text/brand'));
  add(rt, am, vf); add(r, tf, [mid, 'FILL'], rt); return r;
}
async function headerBlock(C) {
  add(C, [await pageHead('WINNERS HALL', 'Every win, with its proof', 'Global Pool prizes and the biggest wins in GLOBAL POOL Originals. Each row links to its Chainlink VRF request or seed pair — tap Verify and check it yourself.', true), 'FILL']);
}
async function filterBar(C, labels) {
  const fb = AL('HORIZONTAL', { name: 'Filter bar — scrolls horizontally', gap: 8, align: 'CENTER' }); add(C, [fb, 'FILL']); fb.clipsContent = true;
  const fbtn = await BTN('Secondary', 'Filters', { size: 'M', lead: 'filter' }); add(fb, fbtn);
  for (const [l, sel, ic] of labels) add(fb, await chip(l, sel, ic));
  return fb;
}
async function verifyExplainer(C) {
  const v = box('How to verify a win', { gap: 12, p: 20, fill: 'bg/secondary' }); add(C, [v, 'FILL']);
  add(v, await T('HOW VERIFY WORKS', 'Overline', 'text/brand'), [await T('Nobody at GLOBAL POOL picks winners', 'Heading/H5', 'text/primary', { w: 318 }), 'FILL']);
  const steps = [['1', 'Tap Verify on any win', 'Opens the proof for that exact round or bet.'], ['2', 'See the inputs', 'Global Pool: VRF request ID (e.g. 0x9f2c…e71a), random word and entry snapshot. Originals: server seed hash, client seed and nonce.'], ['3', 'Recompute it yourself', 'Provably Fair runs the same calculation in your browser — the winner or result must match.']];
  for (const [n, t, b] of steps) { const r = AL('HORIZONTAL', { gap: 12 }); const c = AL('HORIZONTAL', { w: 28, h: 28, r: 9999, fill: 'brand/tint', align: 'CENTER', justify: 'CENTER' }); add(c, await T(n, 'Label/S', 'text/brand')); const t2 = AL('VERTICAL', { gap: 2 }); add(t2, [await T(t, 'Body/S Strong', 'text/primary', { w: 270 }), 'FILL'], [await T(b, 'Body/S', 'text/secondary', { w: 270 }), 'FILL']); add(r, c, [t2, 'FILL']); add(v, [r, 'FILL']); }
  add(v, [await BTN('Secondary', 'Open Provably Fair', { size: 'L', lead: 'shield-check' }), 'FILL']);
}
async function privacyNote(C) { const p = AL('HORIZONTAL', { name: 'Privacy note', gap: 12, p: 16, r: 14, stroke: 'border/subtle' }); add(p, await IC('eye-off', 20, 'icon/muted'), [await T('Players can hide their handle in Settings → Privacy. Hidden wins show as “Hidden player”; the amount and the proof stay public.', 'Caption', 'text/secondary', { w: 290 }), 'FILL']); add(C, [p, 'FILL']); }

// ---------- Default ----------
if (!skipIf(R_DEF, N_DEF)) {
  const S = await mshell(N_DEF, COLX, 120); const C = S.C;
  await headerBlock(C);
  // latest draw hero — gold card with a coin object cropped by the edge
  const hero = AL('VERTICAL', { name: 'Latest draw — round #1,247', fill: 'surface/default', stroke: 'border/gold', r: 20, p: 20, gap: 12 }); add(C, [hero, 'FILL']); hero.clipsContent = true;
  abs(hero, rect(150, 520, 'accent/gold-tint', 0, 'Angled colour block — gold tint'), 262, -150, 16);
  const coin = await I('23:10035', { Motif: 'Coin' }); coin.name = 'Object — USDT coin (cropped by edge)'; coin.resize(150, 150); abs(hero, coin, 250, 36);
  const tc = AL('VERTICAL', { name: 'Text column', gap: 10 }); tc.resize(228, 10); tc.counterAxisSizingMode = 'FIXED'; tc.primaryAxisSizingMode = 'AUTO'; add(hero, tc);
  const o1 = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(o1, await T('LATEST DRAW · ROUND #1,247', 'Overline', 'text/gold'), await DEMO('S')); add(tc, o1);
  add(tc, await T('172,950.00 USDT', 'Number/L', 'text/gold'), [await T('paid to 13 winners · settled 26 Nov 2026, 20:02 UTC by Chainlink VRF', 'Caption', 'text/secondary', { w: 228 }), 'FILL']);
  const pod = AL('VERTICAL', { name: 'Podium', gap: 6, p: [4, 0, 0, 0] }); add(tc, [pod, 'FILL']);
  for (const [pl, h, a] of [['1st', '@orbit_77', '86,475.00'], ['2nd', '@juno88', '34,590.00'], ['3rd', '@sable', '17,295.00']]) { const r = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(r, await T(pl, 'Label/S', 'text/tertiary', { w: 28 }), [await T(h, 'Label/M', 'text/primary'), 'FILL'], await T(a, 'Number/S', 'text/gold')); add(pod, [r, 'FILL']); }
  const ha = AL('HORIZONTAL', { name: 'Actions', gap: 8 }); add(ha, await BTN('Secondary', 'All 13 winners', { size: 'M' }), await BTN('Ghost', 'Verify draw', { size: 'M', lead: 'shield-check' })); add(hero, ha);
  add(C, [await segmented(3, ['All wins', 'Global Pool', 'Games'], 0), 'FILL']);
  await filterBar(C, [['Last 7 days', true, 'calendar'], ['All games', false], ['Any prize', false], ['Biggest prize', false, 'sort']]);
  const mh = AL('HORIZONTAL', { name: 'List meta', gap: 8, align: 'CENTER' }); add(mh, await T('Top wins · 21–27 Nov 2026', 'Label/M', 'text/primary'), await DEMO('XS'), [AL('HORIZONTAL', { name: 'spacer' }), 'FILL'], await T('Updated 18:42 UTC', 'Caption', 'text/tertiary')); add(C, [mh, 'FILL']);
  const lb = box('Leaderboard — top wins (stacked rows)', { gap: 0, p: [4, 16, 4, 16] }); add(C, [lb, 'FILL']);
  const W = [[1, '@kestrel', 'Global Pool · #1,244 · 1st prize', '23 Nov 2026, 20:02 UTC', '90,515.00'], [2, '@orbit_77', 'Global Pool · #1,247 · 1st prize', '26 Nov 2026, 20:02 UTC', '86,475.00'], [3, '@mira.sol', 'Global Pool · #1,246 · 1st prize', '25 Nov 2026, 20:02 UTC', '84,210.00'], [4, '@lumen.eth', 'Global Pool · #1,244 · 2nd prize', '23 Nov 2026, 20:02 UTC', '36,206.00'], [5, '@juno88', 'Global Pool · #1,247 · 2nd prize', '26 Nov 2026, 20:02 UTC', '34,590.00'], [6, 'Hidden player', 'Global Pool · #1,246 · 2nd prize', '25 Nov 2026, 20:02 UTC', '33,684.00'], [7, '@atlas_q', 'Global Pool · #1,244 · 3rd prize', '23 Nov 2026, 20:02 UTC', '18,103.00'], [8, '@sable', 'Global Pool · #1,247 · 3rd prize', '26 Nov 2026, 20:02 UTC', '17,295.00']];
  for (let i = 0; i < W.length; i++) { const [rk, h, m, w, a] = W[i]; add(lb, [await winRow(rk, 'Global Pool', h, m, w, a, true, 'Verify draw', i === W.length - 1), 'FILL']); }
  const lm = AL('VERTICAL', { name: 'Load more', gap: 8, align: 'CENTER' }); add(lm, [await BTN('Secondary', 'Load 8 more', { size: 'L' }), 'FILL']); const lc = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(lc, await T('Showing 8 of 214 wins · round #1,245 was cancelled and refunded', 'Caption', 'text/tertiary'), await DEMO('XS')); add(lm, lc); add(C, [lm, 'FILL']);
  // game wins — horizontal tiles
  add(C, [await mhead('GLOBAL POOL ORIGINALS', 'Biggest multipliers this week', 'Game wins are settled instantly; each one has its own seed check.', await DEMO('S')), 'FILL']);
  const gw = AL('HORIZONTAL', { name: 'Game wins — scrolls horizontally', gap: 12 }); add(C, [gw, 'FILL']); gw.clipsContent = true;
  for (const [g, x, h, a, st, w] of [['Skyline', '25.00×', 'Hidden player', '1,000.00', '40.00', '27 Nov, 17:56 UTC'], ['Orbit Rush', '12.40×', '@mira.sol', '248.00', '20.00', '27 Nov, 18:31 UTC'], ['Vault Sweeper', '9.08×', '@pixelfox', '454.00', '50.00', '27 Nov, 16:12 UTC']]) {
    const t = AL('VERTICAL', { name: 'Game win — ' + g, gap: 8, fill: 'surface/default', stroke: 'border/subtle', r: 14, p: [0, 0, 12, 0] }); t.clipsContent = true;
    const a1 = await I(ART[g]); a1.name = 'Tile/Game Art — ' + g; a1.rescale(0.875); add(t, a1);
    const tx = AL('VERTICAL', { gap: 2, p: [0, 12, 0, 12] }); const r1 = AL('HORIZONTAL', { gap: 6, align: 'CENTER' }); add(r1, await T(x, 'Heading/H5', 'text/brand'), await DEMO('XS'));
    add(tx, r1, await T(g + ' · ' + st + ' stake', 'Caption', 'text/secondary'), await T(h + ' · ' + w, 'Caption', 'text/tertiary'));
    const r2 = AL('HORIZONTAL', { gap: 4, align: 'BASELINE' }); add(r2, await T('+' + a, 'Number/S', 'text/brand'), await T('USDT', 'Caption', 'text/tertiary')); add(tx, r2);
    const vf = AL('HORIZONTAL', { gap: 4, align: 'CENTER', p: [4, 0, 0, 0] }); add(vf, await IC('shield-check', 14, 'icon/brand'), await T('Verify result', 'Label/S', 'text/brand')); add(tx, vf);
    add(t, [tx, 'FILL']); add(gw, t);
  }
  await verifyExplainer(C); await privacyNote(C); await mlic(C);
  await mfinish(S, null, 'Home');
  OUT.created[N_DEF] = S.f.id; EXIST[N_DEF] = S.f;
}

// ---------- Filters (bottom sheet over the default page) ----------
if (!skipIf(R_FIL, N_FIL)) {
  const def = found(R_DEF);
  const sh = await sheet('Filter wins', 'Results update when you tap Show');
  const B = sh.body;
  const g1 = AL('VERTICAL', { name: 'Game', gap: 8 }); add(g1, await T('GAME', 'Overline', 'text/tertiary')); const gc = chips('Game chips'); for (const [l, s] of [['All games', false], ['Global Pool', true], ['Orbit Rush', false], ['Skyline', false], ['Vault Sweeper', false], ['Pinfall', false], ['Pool Dice', false], ['Double Side', false], ['Pool Roulette', false], ['Twenty-One', false]]) add(gc, await chip(l, s)); add(g1, [gc, 'FILL']); add(B, [g1, 'FILL']);
  const g2 = AL('VERTICAL', { name: 'Period', gap: 8 }); add(g2, await T('PERIOD', 'Overline', 'text/tertiary'), [await segmented(4, ['24 h', '7 days', '30 days', 'All time'], 1), 'FILL']); add(B, [g2, 'FILL']);
  const g3 = AL('VERTICAL', { name: 'Minimum prize', gap: 8 }); add(g3, await T('MINIMUM PRIZE', 'Overline', 'text/tertiary')); const pc = chips('Prize chips'); for (const [l, s] of [['Any', false], ['100+ USDT', false], ['1,000+ USDT', false], ['10,000+ USDT', true]]) add(pc, await chip(l, s)); add(g3, [pc, 'FILL']); add(B, [g3, 'FILL']);
  const g4 = AL('VERTICAL', { name: 'Sort by', gap: 4 }); add(g4, await T('SORT BY', 'Overline', 'text/tertiary'));
  for (const [l, s] of [['Biggest prize first', 'Yes'], ['Newest first', 'No']]) { const rd = await I('20:3259', { Selected: s, State: 'Default' }, { Label: l, 'Show description': false }); rd.name = 'Control/Radio — ' + l; add(g4, [rd, 'FILL']); }
  add(B, [g4, 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'Actions', gap: 12 }); add(fr, await BTN('Ghost', 'Clear all', { size: 'L' }), [await BTN('Primary', 'Show 9 wins', { size: 'L' }), 'FILL']); add(sh.foot, [fr, 'FILL']);
  const fc = AL('HORIZONTAL', { gap: 6, align: 'CENTER', justify: 'CENTER' }); add(fc, await T('Global Pool · 21–27 Nov 2026 · 10,000+ USDT → rounds #1,244, #1,246, #1,247', 'Caption', 'text/tertiary'), await DEMO('XS')); add(sh.foot, [fc, 'FILL']); homeIndicator(sh.foot);
  sh.s.primaryAxisSizingMode = 'AUTO';
  const y = def.y + def.height + 160;
  const f = await sheetState(R_DEF, N_FIL, COLX, y, sh.s);
  OUT.created[N_FIL] = f.id; EXIST[N_FIL] = f;
}

// ---------- Empty ----------
if (!skipIf(R_EMP, N_EMP)) {
  const fil = found(R_FIL);
  const y = fil ? fil.y + fil.height + 160 : nextY(sec);
  const S = await mshell(N_EMP, COLX, y); const C = S.C;
  await headerBlock(C);
  add(C, [await segmented(3, ['All wins', 'Global Pool', 'Games'], 2), 'FILL']);
  const af = AL('VERTICAL', { name: 'Active filters', gap: 8 }); const ar = chips('Removable filter chips');
  for (const l of ['Pool Keno', 'Last 24 h', '1,000+ USDT']) { const c = await I('16:3551', {}, { Label: l, Removable: true }); c.name = 'Select/Chip — ' + l; add(ar, c); }
  add(af, [ar, 'FILL']); const ac = AL('HORIZONTAL', { gap: 8, align: 'CENTER' }); add(ac, await T('0 wins', 'Label/M', 'text/primary'), await DEMO('XS'), [AL('HORIZONTAL', { name: 'spacer' }), 'FILL'], await T('Clear all', 'Label/M', 'text/brand')); add(af, [ac, 'FILL']); add(C, [af, 'FILL']);
  const es = box('Empty state — no matching wins', { gap: 16, p: [32, 20, 24, 20], align: 'CENTER' }); add(C, [es, 'FILL']);
  const it = AL('HORIZONTAL', { w: 64, h: 64, r: 20, fill: 'surface/raised', align: 'CENTER', justify: 'CENTER' }); add(it, await IC('trophy', 32, 'icon/muted')); add(es, it);
  add(es, [await T('No wins match these filters', 'Heading/H4', 'text/primary', { w: 318, align: 'CENTER' }), 'FILL'], [await T('Nobody won 1,000.00 USDT or more on Pool Keno in the last 24 hours (26 Nov 18:42 – 27 Nov 2026, 18:42 UTC). Try a longer period or a lower minimum prize.', 'Body/S', 'text/secondary', { w: 318, align: 'CENTER' }), 'FILL']);
  add(es, [await BTN('Primary', 'Clear all filters', { size: 'L' }), 'FILL'], [await BTN('Secondary', 'Show last 30 days', { size: 'L', lead: 'calendar' }), 'FILL']);
  add(C, [await mhead('CLOSEST MATCHES', 'Pool Keno wins in the last 24 h', 'Below your 1,000+ USDT minimum — shown so you can widen the filter if you want.', await DEMO('S')), 'FILL']);
  const cm = box('Closest matches', { gap: 0, p: [4, 16, 4, 16] }); add(C, [cm, 'FILL']);
  add(cm, [await winRow(0, 'Pool Keno', '@drift.sol', 'Pool Keno · 8 of 10 hits · 41.20× on 10.00', '27 Nov 2026, 15:08 UTC', '412.00', false, 'Verify result', false), 'FILL']);
  add(cm, [await winRow(0, 'Pool Keno', '@lyra_v', 'Pool Keno · 6 of 10 hits · 18.00× on 20.00', '27 Nov 2026, 09:47 UTC', '360.00', false, 'Verify result', true), 'FILL']);
  await privacyNote(C); await mlic(C);
  await mfinish(S, null, 'Home');
  OUT.created[N_EMP] = S.f.id; EXIST[N_EMP] = S.f;
}

// compact dump of the desktop frames' own copy (page 03, cross-page by id) to align the remaining mobile scripts
const DIDS = { WD: '33:149514', WF: '33:196810', WE: '33:219380', HIW: '33:245465', NA: '33:281751', NE: '33:318074', SEC: '34:345543' };
const seenT = new Set(); OUT.dump = {};
function dwalk(n, o) { if (n.type === 'INSTANCE') { const mc = n.mainComponent; const nm = mc ? (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name) : '?'; o.i[nm] = (o.i[nm] || 0) + 1; return; } if (n.type === 'TEXT') { const c = n.characters.replace(/\s+/g, ' ').slice(0, 70); if (!seenT.has(c) && o.t.length < 60) { seenT.add(c); o.t.push(c); } return; } if ('children' in n) for (const k of n.children) dwalk(k, o); }
for (const [k, id] of Object.entries(DIDS)) { try { const f = await figma.getNodeByIdAsync(id); if (!f) { OUT.dump[k] = 'missing'; continue; } const o = { t: [], i: {} }; dwalk(f, o); OUT.dump[k] = o; } catch (e) { OUT.dump[k] = 'ERR ' + String(e).slice(0, 100); } }
fitSection(sec);
const shots = [];
for (const n of [N_DEF, N_FIL, N_EMP]) { const f = sec.children.find(x => x.name === n); if (f && OUT.created[n]) shots.push(await f.screenshot({ scale: 0.5 })); }
OUT.bounds = sec.children.map(c => [c.name, c.id, Math.round(c.x), Math.round(c.y), Math.round(c.height)]);
return OUT;
