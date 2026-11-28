// ===== PUB-04 TEMPLATE BUILDER =====
// Stage compositions per game: angled colour block + mint stripe + Tile/Game Art + concrete library objects cropped by the banner edge.
const STAGE = {
  'Global Pool': { tile: 'Gradient/Tile Gold', o: [
    { id: '23:8534', v: { State: 'Active' }, s: 0.6, r: 9, x: 6, y: 330, n: 'Entry ticket A' },
    { id: '23:8534', v: { State: 'Active' }, s: 0.6, r: -9, x: 246, y: 372, n: 'Entry ticket B' }] },
  'Pool Roulette': { tile: 'Gradient/Tile Red', o: [
    { id: '25:15363', v: { State: 'Idle' }, s: 0.82, r: 0, x: 262, y: 236, n: 'Roulette wheel' },
    { id: '23:12227', v: { Value: '5', State: 'Default' }, s: 1, r: 0, x: 60, y: 330, n: 'Chip 5' },
    { id: '23:12227', v: { Value: '25', State: 'Default' }, s: 1, r: 0, x: 30, y: 372, n: 'Chip 25' },
    { id: '23:12227', v: { Value: '100', State: 'Default' }, s: 1, r: 0, x: 88, y: 392, n: 'Chip 100' }] },
  'Orbit Rush': { tile: 'Gradient/Tile Violet', o: [
    { id: '25:17535', v: { State: 'Running' }, s: 0.62, r: 0, x: 168, y: 300, n: 'Crash curve preview' }] },
  'Pool Dice': { tile: 'Gradient/Tile Sky', o: [
    { id: '24:14917', v: { Face: '5' }, s: 1.5, r: 14, x: 40, y: 318, n: 'Die 5' },
    { id: '24:14917', v: { Face: '3' }, s: 1.3, r: -12, x: 372, y: 352, n: 'Die 3' }] },
  'Double Side': { tile: 'Gradient/Tile Amber', o: [
    { id: '24:14951', v: { Side: 'Heads' }, s: 1.3, r: -12, x: 34, y: 300, n: 'Coin heads' },
    { id: '24:14951', v: { Side: 'Tails' }, s: 1.1, r: 16, x: 362, y: 64, n: 'Coin tails' }] },
  'Twenty-One': { tile: 'Gradient/Tile Mint', o: [
    { id: '24:14880', v: { Suit: 'Spades' }, p: { Rank: 'A' }, s: 1.3, r: 14, x: 26, y: 286, n: 'Card A spades' },
    { id: '24:14880', v: { Suit: 'Hearts' }, p: { Rank: 'K' }, s: 1.3, r: -12, x: 352, y: 300, n: 'Card K hearts' },
    { id: '23:12227', v: { Value: '25', State: 'Default' }, s: 1, r: 0, x: 130, y: 396, n: 'Chip 25' }] },
};
async function stageGroup(key, M, SW, SH, show) {
  const g = figma.createFrame(); g.name = 'Objects — ' + key; g.fills = []; g.clipsContent = false; g.resize(SW, SH);
  const sp = STAGE[key];
  const blk = rect(M ? 300 : 420, M ? 480 : 720, null, 0, 'Angled block'); await gfill(blk, sp.tile); g.appendChild(blk); blk.rotation = 14; blk.x = M ? 168 : 196; blk.y = M ? -70 : -120;
  const str = rect(M ? 12 : 20, M ? 480 : 720, 'brand/primary', 0, 'Accent stripe'); g.appendChild(str); str.rotation = 14; str.x = M ? 140 : 160; str.y = M ? -70 : -120;
  const art = (await figma.getNodeByIdAsync(ART[key])).createInstance(); art.name = 'Hero art — ' + key; g.appendChild(art); art.rescale(M ? 0.92 : 1.5); art.rotation = -6; art.x = M ? 104 : 136; art.y = M ? 22 : 104; await fx(art, 'Elevation/2 — Raised');
  const k = M ? 0.58 : 1, kx = M ? 0.74 : 1, ky = M ? 0.47 : 1;
  for (const o of sp.o) { const i = await I(o.id, o.v || {}, o.p || {}); i.name = o.n; g.appendChild(i); i.rescale(o.s * k); i.rotation = o.r || 0; i.x = Math.round(o.x * kx); i.y = Math.round(o.y * ky); }
  g.visible = !!show; return g;
}
async function chip(name, label, o = {}) { const c = row('Chip — ' + name, { gap: 6, p: [4, 10, 4, 10], fill: o.fill || 'surface/default', r: 9999 }); if (o.stroke) stroke(c, o.stroke); if (o.icon) add(c, await IC(o.icon, 14, o.ic || 'icon/brand')); add(c, await tx(name, label, 'Label/S', o.color || 'text/secondary')); return c; }
async function ctitle(name, label, o = {}) { const r = row(name + ' row', { gap: 8, align: o.w ? 'MIN' : 'CENTER' }); if (o.icon) add(r, await IC(o.icon, 20, 'icon/brand')); if (o.w) add(r, [await tx(name, label, o.s || 'Heading/H4', 'text/primary', { w: o.w }), 'FILL']); else add(r, await tx(name, label, o.s || 'Heading/H4', 'text/primary')); if (o.demo) { const d = await DEMO(o.demo); d.name = o.demoName || 'DEMO'; add(r, d); if (o.hideDemo) d.visible = false; } return r; }
async function buildTpl(M, g) {
  const W = M ? 358 : 1136, IN = M ? 318 : 704;
  const c = figma.createComponent(); c.name = M ? 'Breakpoint=Mobile' : 'Breakpoint=Desktop';
  c.layoutMode = 'VERTICAL'; c.resize(W, 100); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.fills = []; c.clipsContent = false; gap(c, M ? 20 : 32);
  // 1 top row
  const top = row('Top row', { justify: 'SPACE_BETWEEN' }); add(c, [top, 'FILL']);
  if (M) { const b = row('Back link', { gap: 4 }); add(b, await IC('chevron-left', 20, 'icon/muted'), await tx('Back label', 'Games', 'Label/M', 'text/secondary')); add(top, b); }
  else { const bc = await I('14:1145', { Levels: '3' }); bc.name = 'Breadcrumb'; await O(bc, { 'Crumb 1': 'Games', 'Crumb 2': g.crumb, 'Current page': g.name }, 'bc'); add(top, bc); }
  const lp = row('Live pill', { gap: 8, p: [6, 12, 6, 12], fill: 'surface/default', stroke: 'border/subtle', r: 9999 }); add(lp, ellipse(8, 8, 'status/success', 'Live dot'), await tx('Live players', g.live, 'Label/S', 'text/primary'), await DEMO('XS')); add(top, lp);
  // 2 hero
  const hero = AX(M ? 'VERTICAL' : 'HORIZONTAL', M ? { name: 'Hero', fill: 'surface/raised', stroke: 'border/subtle', r: 20, clip: true } : { name: 'Hero', fill: 'surface/raised', stroke: 'border/subtle', r: 20, clip: true, h: 460 }); add(c, [hero, 'FILL']);
  const SW = M ? 358 : 476, SH = M ? 220 : 460;
  const st = figma.createFrame(); st.name = 'Art stage'; st.fills = []; st.clipsContent = true; st.resize(SW, SH);
  for (const key of GAMES6) st.appendChild(await stageGroup(key, M, SW, SH, key === g.name));
  const cp = AX('VERTICAL', { name: 'Hero copy', gap: 16, p: M ? [20, 20, 24, 20] : [40, 24, 40, 40] }); cp.primaryAxisAlignItems = 'CENTER';
  if (M) { add(hero, [st, 'FILL'], [cp, 'FILL']); } else { add(hero, [cp, 'FILL'], st); cp.layoutSizingVertical = 'FILL'; }
  const chips = row('Hero chips', { gap: 8, wrap: true, cgap: 8 }); add(cp, [chips, 'FILL']);
  add(chips, await chip('Chip category', g.cat, { fill: 'brand/tint', color: 'text/brand' }), await chip('Chip fairness', g.fair, { icon: 'shield-check', stroke: 'border/subtle' }));
  add(cp, await tx('Game name', g.name, M ? 'Heading/H2' : 'Heading/H1', 'text/primary'));
  add(cp, [await tx('Tagline', g.tag, M ? 'Body/M' : 'Body/L', 'text/secondary', { w: M ? 318 : 560 }), 'FILL']);
  const hf = row('Hero facts', { gap: 8, wrap: true, cgap: 8 }); add(cp, [hf, 'FILL']);
  for (let i = 0; i < 3; i++) add(hf, await chip('Hero fact ' + (i + 1), g.hf[i], { fill: 'surface/default', stroke: 'border/default', color: 'text/primary' }));
  add(hf, await DEMO('XS'));
  const ctas = row('Hero CTAs', { gap: 12 }); add(cp, [ctas, 'FILL']);
  const pc = await BTN('Primary', g.cta, { size: 'L', lead: 'play' }); pc.name = 'Play CTA';
  const pg = await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }); pg.name = 'Play CTA gold';
  const hb = await BTN('Secondary', 'How to play', { size: M ? 'M' : 'L' }); hb.name = 'How to play btn';
  const fv = await I('7:774', { Type: 'Secondary', Size: M ? 'M' : 'L', State: 'Default' }, { Icon: ICONS.heart }); fv.name = 'Favourite btn';
  if (M) { const c1 = col('CTA stack', { gap: 12 }); add(ctas, [c1, 'FILL']); add(c1, [pc, 'FILL'], [pg, 'FILL']); const r2 = row('CTA row 2', { gap: 12 }); add(c1, [r2, 'FILL']); add(r2, [hb, 'FILL'], fv); }
  else add(ctas, pc, pg, hb, fv);
  pg.visible = !!g.gold; pc.visible = !g.gold;
  const sm = row('Hero small print', { gap: 8, align: 'MIN' }); add(cp, [sm, 'FILL']); add(sm, await I('6:159'), [await tx('Small print', g.small, 'Caption', 'text/tertiary', { w: M ? 270 : 500 }), 'FILL']);
  // 3 facts
  const fw = col('At a glance', { gap: 12 }); add(c, [fw, 'FILL']);
  const fh = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Facts header', gap: M ? 4 : 16, align: M ? 'MIN' : 'CENTER', justify: M ? 'MIN' : 'SPACE_BETWEEN' }); add(fw, [fh, 'FILL']);
  const fl = row('Facts title row', { gap: 8 }); add(fl, await tx('Facts title', 'At a glance', 'Heading/H5', 'text/primary'), await DEMO('S')); add(fh, fl);
  add(fh, await tx('Facts note', g.fnote, 'Caption', 'text/tertiary', M ? { w: 358 } : {}));
  const grid = row('Facts grid', { gap: 12, wrap: true, cgap: 12, align: 'MIN' }); add(fw, [grid, 'FILL']);
  for (let i = 0; i < 6; i++) { const f = g.facts[i]; const t = AX('VERTICAL', { name: 'Fact ' + (i + 1), gap: 4, p: M ? [12, 14, 12, 14] : [16, 20, 16, 20], fill: 'surface/default', stroke: 'border/subtle', r: 14, w: M ? 173 : 370 }); add(grid, t);
    add(t, await tx(`Fact ${i + 1} label`, f[0], 'Caption', 'text/tertiary'), await tx(`Fact ${i + 1} value`, f[1], M ? 'Number/M' : 'Number/L', 'text/primary'), [await tx(`Fact ${i + 1} sub`, f[2], 'Caption', 'text/secondary', { w: M ? 145 : 330 }), 'FILL']); }
  // 4 body
  let mainC = c, railC = c;
  if (!M) { const body = row('Body', { gap: 24, align: 'MIN' }); add(c, [body, 'FILL']); mainC = col('Main column', { gap: 24 }); railC = col('Rail', { gap: 16, w: 360 }); add(body, [mainC, 'FILL'], railC); }
  // 4a how to play
  const hw = card('How to play', { p: M ? 20 : 24, gap: 20 }); add(mainC, [hw, 'FILL']); add(hw, await ctitle('How to play title', g.howT, { icon: 'play' }));
  const sg = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Steps', gap: M ? 12 : 16, wrap: !M, cgap: 16 }); add(hw, [sg, 'FILL']);
  for (let i = 0; i < 4; i++) { const s = row('Step ' + (i + 1), M ? { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', r: 14 } : { gap: 12, align: 'MIN', p: 16, fill: 'surface/raised', r: 14, w: 340 }); if (M) add(sg, [s, 'FILL']); else add(sg, s);
    const n = AX('HORIZONTAL', { name: 'Step num', w: 32, h: 32, r: 9999, fill: 'brand/tint', align: 'CENTER', justify: 'CENTER' }); add(n, await tx(`Step ${i + 1} num`, String(i + 1), 'Label/M', 'text/brand'));
    const sc = col('Step text', { gap: 4 }); add(s, n, [sc, 'FILL']);
    add(sc, [await tx(`Step ${i + 1} title`, g.steps[i][0], 'Body/M Strong', 'text/primary', { w: M ? 234 : 268 }), 'FILL'], [await tx(`Step ${i + 1} body`, g.steps[i][1], 'Body/S', 'text/secondary', { w: M ? 234 : 268 }), 'FILL']); }
  // 4b payouts
  const pw = card('Payouts', { p: M ? 20 : 24, gap: 16 }); add(mainC, [pw, 'FILL']);
  const ph = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Payouts header', gap: 4, align: M ? 'MIN' : 'CENTER', justify: M ? 'MIN' : 'SPACE_BETWEEN' }); add(pw, [ph, 'FILL']);
  add(ph, await ctitle('Payouts title', 'Payouts', { icon: 'coins', demo: 'S', demoName: 'Payout DEMO', hideDemo: !g.payDemo }), await tx('Payout unit', g.punit, 'Caption', 'text/tertiary'));
  const tb = AX('VERTICAL', { name: 'Payout table', fill: 'bg/secondary', stroke: 'border/subtle', r: 10, clip: true }); add(pw, [tb, 'FILL']);
  if (!M) { const hr = AX('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { b: 1 }); add(tb, [hr, 'FILL']);
    const WS = [200, 0, 120, 180]; for (let i = 0; i < 4; i++) { const h = await I('22:8309', { Align: i >= 2 ? 'Right' : 'Left', Sort: 'None' }, { Label: g.hdr[i], 'Show sort icon': false }); h.name = 'Hdr ' + (i + 1); add(hr, h); if (WS[i]) h.resize(WS[i], h.height); else h.layoutSizingHorizontal = 'FILL'; } }
  else { const hr = col('Header rows', { gap: 2, p: [10, 12, 10, 12], fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { b: 1 }); add(tb, [hr, 'FILL']);
    for (const [a, b] of [['Hdr m1', 'Hdr m2'], ['Hdr m3', 'Hdr m4']]) { const r = row('Hdr line', { justify: 'SPACE_BETWEEN' }); add(hr, [r, 'FILL']); const ia = a === 'Hdr m1' ? 0 : 1, ib = a === 'Hdr m1' ? 2 : 3; add(r, await tx(a, g.hdr[ia], 'Overline', 'text/tertiary'), await tx(b, g.hdr[ib], 'Overline', 'text/tertiary')); } }
  for (let i = 0; i < 10; i++) { const p = g.pay[i] || ['—', '—', '—', '—']; const N = i + 1;
    if (!M) { const r = AX('HORIZONTAL', { name: 'Payout row ' + N, align: 'CENTER' }); strokeSides(r, 'border/subtle', { b: 1 }); add(tb, [r, 'FILL']);
      const ca = AX('HORIZONTAL', { name: 'Cell bet', p: [12, 16, 12, 16], w: 200 }); add(ca, await tx(`Payout ${N} bet`, p[0], 'Body/S Strong', 'text/primary'));
      const cb = AX('HORIZONTAL', { name: 'Cell covers', p: [12, 16, 12, 16] });
      const cc = AX('HORIZONTAL', { name: 'Cell pays', p: [12, 16, 12, 16], w: 120, justify: 'MAX' }); add(cc, await tx(`Payout ${N} pays`, p[2], 'Number/S', 'text/brand'));
      const cd = AX('HORIZONTAL', { name: 'Cell chance', p: [12, 16, 12, 16], w: 180, justify: 'MAX' }); add(cd, await tx(`Payout ${N} chance`, p[3], 'Body/S Strong', 'text/primary'));
      add(r, ca, [cb, 'FILL'], cc, cd); add(cb, [await tx(`Payout ${N} covers`, p[1], 'Body/S', 'text/secondary', { w: 172 }), 'FILL']); r.visible = i < g.pay.length; }
    else { const r = col('Payout row ' + N, { gap: 4, p: [10, 12, 10, 12] }); strokeSides(r, 'border/subtle', { b: 1 }); add(tb, [r, 'FILL']);
      const l1 = row('Line 1', { justify: 'SPACE_BETWEEN', align: 'MIN' }); add(r, [l1, 'FILL']); add(l1, [await tx(`Payout ${N} bet`, p[0], 'Body/S Strong', 'text/primary', { w: 190 }), 'FILL'], await tx(`Payout ${N} pays`, p[2], 'Number/S', 'text/brand'));
      const l2 = row('Line 2', { justify: 'SPACE_BETWEEN', align: 'MIN' }); add(r, [l2, 'FILL']); add(l2, [await tx(`Payout ${N} covers`, p[1], 'Caption', 'text/secondary', { w: 190 }), 'FILL'], await tx(`Payout ${N} chance`, p[3], 'Caption', 'text/primary'));
      r.visible = i < g.pay.length; } }
  add(pw, [await tx('Payout footnote', g.pfoot, 'Caption', 'text/tertiary', { w: IN }), 'FILL']);
  // 4c rules
  const rw = card('Rules', { p: M ? 20 : 24, gap: 16 }); add(mainC, [rw, 'FILL']); add(rw, await ctitle('Rules title', 'Rules summary', { icon: 'book' }));
  const rl = col('Rule list', { gap: 10 }); add(rw, [rl, 'FILL']);
  for (let i = 0; i < 7; i++) { const r = row('Rule row ' + (i + 1), { gap: 10, align: 'MIN' }); add(rl, [r, 'FILL']); add(r, await IC('check-circle', 16, 'icon/brand'), [await tx('Rule ' + (i + 1), g.rules[i] || '—', 'Body/S', 'text/primary', { w: IN - 26 }), 'FILL']); r.visible = i < g.rules.length; }
  add(rw, [await tx('Rules footnote', g.rfoot, 'Caption', 'text/tertiary', { w: IN }), 'FILL']);
  // 4d provably fair
  const fwr = AX(M ? 'VERTICAL' : 'HORIZONTAL', { name: 'Provably fair', gap: 24, p: M ? 20 : 24, fill: 'surface/default', stroke: 'border/subtle', r: 14, align: 'MIN' }); add(mainC, [fwr, 'FILL']);
  const fl2 = col('PF copy', { gap: 12 }); add(fwr, [fl2, 'FILL']);
  add(fl2, [await ctitle('PF title', g.pft, { icon: 'shield-check', s: M ? 'Heading/H5' : 'Heading/H4', w: M ? 286 : 368 }), 'FILL']);
  add(fl2, [await tx('PF body', g.pfb, 'Body/S', 'text/secondary', { w: M ? 318 : 380 }), 'FILL']);
  for (let i = 0; i < 3; i++) { const r = row('PF step row ' + (i + 1), { gap: 10, align: 'MIN' }); add(fl2, [r, 'FILL']); const n = AX('HORIZONTAL', { name: 'PF num', w: 24, h: 24, r: 9999, fill: 'surface/raised', stroke: 'border/default', align: 'CENTER', justify: 'CENTER' }); add(n, await tx('PF num ' + (i + 1), String(i + 1), 'Label/S', 'text/primary')); add(r, n, [await tx('PF step ' + (i + 1), g.pfs[i], 'Body/S', 'text/primary', { w: M ? 284 : 340 }), 'FILL']); }
  const pb = row('PF actions', { gap: 8, wrap: true, cgap: 8 }); add(fl2, [pb, 'FILL']);
  const vb = await BTN('Secondary', g.pfBtn, { size: 'M', lead: 'shield-check' }); vb.name = 'PF verify btn'; const lb = await BTN('Ghost', 'How provably fair works', { size: 'M', trail: 'arrow-right' }); lb.name = 'PF learn btn'; add(pb, vb, lb);
  const pd = col('PF data', M ? { gap: 12, p: 16, fill: 'surface/raised', r: 10 } : { gap: 12, p: 16, fill: 'surface/raised', r: 10, w: 280 }); if (M) add(fwr, [pd, 'FILL']); else add(fwr, pd);
  const pdh = row('PF data header', { gap: 8 }); add(pd, pdh); add(pdh, await tx('PF data title', 'EXAMPLE DATA', 'Overline', 'text/tertiary'), await DEMO('XS'));
  for (let i = 0; i < 3; i++) { const it = col('PF item ' + (i + 1), { gap: 2 }); add(pd, [it, 'FILL']); add(it, await tx('PF key ' + (i + 1), g.pfd[i][0], 'Caption', 'text/tertiary'), [await tx('PF val ' + (i + 1), g.pfd[i][1], 'Mono/S', 'text/primary', { w: M ? 286 : 248 }), 'FILL']); }
  // R1 play / limits card
  const pl = card('Play card', { p: M ? 20 : 24, gap: 16, stroke: 'border/default' }); add(railC, [pl, 'FILL']);
  const plt = row('Rail title row', { gap: 8 }); add(pl, plt); add(plt, await tx('Rail title', g.rt, 'Heading/H5', 'text/primary'), await DEMO('XS'));
  const kv = col('Rail limits', { gap: 10 }); add(pl, [kv, 'FILL']);
  for (let i = 0; i < 5; i++) { const r = row('Rail row ' + (i + 1), { justify: 'SPACE_BETWEEN', gap: 12 }); strokeSides(r, 'border/subtle', { b: i < 4 ? 1 : 0 }); pad(r, 0, 0, i < 4 ? 10 : 0, 0); add(kv, [r, 'FILL']); add(r, await tx('Rail key ' + (i + 1), g.rail[i][0], 'Body/S', 'text/secondary'), await tx('Rail val ' + (i + 1), g.rail[i][1], 'Body/S Strong', 'text/primary')); }
  const fn = row('Fee note', { gap: 8, align: 'MIN', p: 12, fill: 'surface/raised', r: 10 }); add(pl, [fn, 'FILL']); add(fn, await IC('receipt', 16, 'icon/muted'), [await tx('Rail fee', g.fee, 'Caption', 'text/secondary', { w: M ? 270 : 260 }), 'FILL']);
  if (!M) { const rc = await BTN('Primary', g.cta, { size: 'L', lead: 'play' }); rc.name = 'Rail CTA'; const rg = await BTN('Gold', 'Participate', { size: 'L', lead: 'ticket' }); rg.name = 'Rail CTA gold'; add(pl, [rc, 'FILL'], [rg, 'FILL']); rc.visible = !g.gold; rg.visible = !!g.gold; }
  const rk = row('Risk note', { gap: 8, align: 'MIN' }); add(pl, [rk, 'FILL']); add(rk, await IC('alert-triangle', 16, 'status/warning'), [await tx('Risk text', 'You can lose your stake. Only play with money you can afford to lose.', 'Caption', 'text/primary', { w: 270 }), 'FILL']);
  add(pl, [await tx('Rail eligibility', 'Sign in to play · 18+ only · available in permitted jurisdictions', 'Caption', 'text/tertiary', { w: M ? 318 : 312 }), 'FILL']);
  // R2 live card
  const lc = card('Live card', { p: 20, gap: 12 }); add(railC, [lc, 'FILL']); add(lc, [await ctitle('Live title', g.lt, { s: 'Heading/H5', demo: 'S' }), 'FILL']);
  for (let i = 0; i < 3; i++) { const it = col('Live row ' + (i + 1), { gap: 2 }); add(lc, [it, 'FILL']); add(it, await tx('Live key ' + (i + 1), g.lv[i][0], 'Caption', 'text/tertiary'), [await tx('Live val ' + (i + 1), g.lv[i][1], 'Body/S Strong', 'text/primary', { w: 312 }), 'FILL']); }
  // R3 responsible gaming
  const rgc = card('RG card', { p: 20, gap: 12 }); add(railC, [rgc, 'FILL']);
  const rgt = row('RG title row', { gap: 8, justify: 'SPACE_BETWEEN' }); add(rgc, [rgt, 'FILL']); const rgl = row('RG title', { gap: 8 }); add(rgl, await IC('heart', 20, 'icon/brand'), await tx('RG heading', 'Play responsibly', 'Heading/H5', 'text/primary')); add(rgt, rgl, await I('6:159'));
  add(rgc, [await tx('RG body', 'Set a daily loss limit, get a reality check every 60 minutes, or take a break. Limits apply across every game and the Global Pool.', 'Body/S', 'text/secondary', { w: 318 }), 'FILL']);
  const rgb = row('RG actions', { gap: 8 }); add(rgc, rgb); add(rgb, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause' }));
  add(rgc, [await tx('RG help', 'Need to talk to someone? GamCare · Gamblers Anonymous · BeGambleAware', 'Caption', 'text/tertiary', { w: 318 }), 'FILL']);
  // R4 licence
  const lic = await I('6:158', { Variant: 'Compact' }); lic.name = 'Licence notice'; add(railC, [lic, 'FILL']);
  // 5 related games
  const rel = col('Related games', { gap: 16 }); add(c, [rel, 'FILL']);
  const rh = await I('23:17672', {}, { Title: g.relT, 'Show All': true, 'Show arrows': !!M, 'Show live dot': false }); rh.name = 'Related header'; add(rel, [rh, 'FILL']);
  const trk = row('Related track', { gap: M ? 12 : 16, clip: true, align: 'MIN' }); add(rel, [trk, 'FILL']);
  for (let i = 0; i < 6; i++) { const r = g.rel[i]; const t = await I('28:16529', { State: 'Default' }, { Art: ART[r[0]], Players: r[1], 'Show tag': false, 'House edge': r[2] }); t.name = 'Related ' + (i + 1); add(trk, t); }
  return c;
}
// ===== END PUB-04 TEMPLATE BUILDER =====
