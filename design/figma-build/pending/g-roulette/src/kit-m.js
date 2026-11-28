// ===== ROULETTE KIT — mobile 390 (agent g-roulette) =====
function topRadius(n, px) { const v = VAR[RD[px]]; for (const c of ['topLeftRadius', 'topRightRadius']) { if (v) n.setBoundVariable(c, v); else n[c] = px; } }
async function mShell(name, o = {}) {
  const f = await screen(name, 390, { x: 0, y: 0 }); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
  const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance }, true)) > 0; }
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  return { f, tb, C, balOk };
}
async function mHeader(o = {}) {
  const h = AL('HORIZONTAL', { name: 'Game header', gap: 12, align: 'CENTER' }); const th = await I('25:14777'); th.rescale(0.25); th.name = 'Tile/Game Art — Pool Roulette (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 2 }); add(h, col); grow(col); add(col, await T(o.title || 'Pool Roulette', 'Heading/H4', 'text/primary', { name: 'Game title' })); await wrapT(col, o.sub || 'European · single zero · edge 2.70% · provably fair', 'Caption', 'text/brand', 150, { name: 'Game sub' });
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 0 }); for (const ic of (o.icons || ['history', 'book', 'volume'])) add(act, await iconBtn(ic, { type: 'Ghost', size: 'L' })); add(h, act); return h;
}
async function mBack(label, title) { const g = AL('VERTICAL', { name: 'Page title', gap: 8 }); add(g, await BTN('Ghost', label, { size: 'S', lead: 'chevron-left' })); const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H3', 'text/primary', { name: 'Page title text' }), await DEMO('M')); add(g, tr); return g; }
async function mTabs(active) { const r = AL('HORIZONTAL', { name: 'Game tabs (scroll)', gap: 8, clip: true }); for (const l of ['Play', 'My bets', 'Fairness', 'Rules']) add(r, await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l })); return r; }
const LAST_PRE = [26, 14, 0, 32, 17, 8, 23, 11];
async function mLast(seq) { const g = AL('VERTICAL', { name: 'Last results', gap: 8 }); const hr = AL('HORIZONTAL', { name: 'Last results head', gap: 6, align: 'CENTER' }); add(hr, await T('Last spins', 'Label/M', 'text/secondary'), await DEMO('XS')); addSpacer(hr); add(hr, await T('Each spin is independent', 'Caption', 'text/tertiary')); add(g, [hr, 'FILL']); const row = AL('HORIZONTAL', { name: 'Pockets', gap: 6 }); for (let i = 0; i < seq.length; i++) add(row, await discNum(seq[i], 32, { newest: i === 0 })); add(g, row); return g; }
async function mFelt(o = {}) {
  const cw = 64, ch = 44, g = 2, sw = 44; const st = n => (o.cells && o.cells[n]) || 'Default';
  const F = AL('VERTICAL', { name: 'Felt (vertical, scrolls with page)', gap: g, p: 10, r: 14, fill: 'bg/secondary', stroke: 'border/default' });
  const z = AL('HORIZONTAL', { name: 'Zero row', gap: g }); add(z, AL('HORIZONTAL', { name: 'Offset', w: 2 * sw + g, h: 4 })); add(z, await cell(0, st(0), 3 * cw + 2 * g, ch, o.bets && o.bets[0])); add(F, z);
  const body = AL('HORIZONTAL', { name: 'Board', gap: g }); add(F, body);
  const ev = AL('VERTICAL', { name: 'Even-money', gap: g }); add(body, ev);
  for (const [k, dot] of [['1–18'], ['EVEN'], ['RED', 'status/danger-strong'], ['BLACK', 'ink/950'], ['ODD'], ['19–36']]) add(ev, await obox(k, sw, 2 * ch + g, { st: oState(o, k), chip: o.obets && o.obets[k], dot, style: 'Label/S', vertical: true, chipSize: 24 }));
  const dz = AL('VERTICAL', { name: 'Dozens', gap: g }); add(body, dz);
  for (const k of ['1st 12', '2nd 12', '3rd 12']) add(dz, await obox(k, sw, 4 * ch + 3 * g, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', vertical: true, chipSize: 24 }));
  const grid = AL('VERTICAL', { name: 'Grid 1–36', gap: g }); add(body, grid);
  for (let i = 0; i < 12; i++) { const row = AL('HORIZONTAL', { name: 'Row ' + (3 * i + 1) + '–' + (3 * i + 3), gap: g }); for (const n of [3 * i + 1, 3 * i + 2, 3 * i + 3]) add(row, await cell(n, st(n), cw, ch, o.bets && o.bets[n])); add(grid, row); }
  const cr = AL('HORIZONTAL', { name: 'Column bets', gap: g }); add(cr, AL('HORIZONTAL', { name: 'Offset', w: 2 * sw + g, h: 4 })); for (const k of ['Col 1', 'Col 2', 'Col 3']) { const b = await obox('2:1', cw, 40, { st: oState(o, k), chip: o.obets && o.obets[k], style: 'Label/S', chipSize: 24 }); b.name = 'Bet — ' + k; add(cr, b); } add(F, cr);
  return F;
}
async function mOutside(o = {}) {
  const P = AL('VERTICAL', { name: 'Outside bets panel', gap: 8 });
  const box = async (k, pays, cov, dot) => { const s = oState(o, k); const on = s === 'bet' || s === 'win' || s === 'hover'; const b = AL('VERTICAL', { name: 'Outside — ' + k, gap: 2, p: [10, 12, 10, 12], r: 10, fill: on ? 'brand/tint-subtle' : 'surface/raised', stroke: s === 'hover' ? 'border/focus' : on ? 'border/brand' : 'border/default', sw: s === 'hover' ? 2 : 1 }); const tr = AL('HORIZONTAL', { name: 'Box title', gap: 6, align: 'CENTER', h: 28 }); if (dot) { const d = ellipse(12, 12, dot, 'Colour dot'); stroke(d, 'border/strong', 1); add(tr, d); } add(tr, await T(k, 'Label/L', 'text/primary', { name: 'Bet label' })); addSpacer(tr); if (o.obets && o.obets[k]) add(tr, await chipI(o.obets[k], 28)); add(b, [tr, 'FILL']); add(b, await T(pays + ' · ' + cov, 'Caption', 'text/tertiary', { name: 'Pays' })); return b; };
  const pairs = [[['RED', '1:1', '18 numbers', 'status/danger-strong'], ['BLACK', '1:1', '18 numbers', 'ink/950']], [['ODD', '1:1', '18 numbers'], ['EVEN', '1:1', '18 numbers']], [['1–18', '1:1', 'low half'], ['19–36', '1:1', 'high half']]];
  for (const pr of pairs) { const r = AL('HORIZONTAL', { name: 'Pair', gap: 8 }); for (const a of pr) add(r, [await box(...a), 'FILL']); add(P, [r, 'FILL']); }
  for (const [lab, keys] of [['Dozens · 2:1 · 12 numbers', ['1st 12', '2nd 12', '3rd 12']], ['Columns · 2:1 · 12 numbers', ['Col 1', 'Col 2', 'Col 3']]]) { add(P, await T(lab, 'Overline', 'text/tertiary')); const r = AL('HORIZONTAL', { name: lab, gap: 8 }); for (const k of keys) add(r, [await box(k, '2:1', k.startsWith('Col') ? 'column ' + k.slice(4) : (k === '1st 12' ? '1–12' : k === '2nd 12' ? '13–24' : '25–36')), 'FILL']); add(P, [r, 'FILL']); }
  return P;
}
async function seg(a, b, active) { const t = AL('HORIZONTAL', { name: 'Felt view toggle', gap: 4, p: 4, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); for (const l of [a, b]) { const on = l === active; const o = AL('HORIZONTAL', { name: 'Option — ' + l, h: 40, r: 6, align: 'CENTER', justify: 'CENTER', fill: on ? 'brand/tint' : null, stroke: on ? 'border/brand' : null }); add(o, await T(l, 'Label/M', on ? 'text/brand' : 'text/secondary')); add(t, [o, 'FILL']); } return t; }
async function mStage(st) {
  const S = AL('VERTICAL', { name: 'Stage', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
  const top = AL('VERTICAL', { name: 'Spin id', gap: 4 }); add(top, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Spin label' })); const mr = AL('HORIZONTAL', { name: 'Spin meta row', gap: 6, align: 'CENTER' }); await wrapT(mr, st.top.meta, 'Caption', 'text/secondary', 260, { name: 'Spin meta' }); add(mr, await DEMO('XS')); add(top, [mr, 'FILL']); add(S, [top, 'FILL']);
  const ph = st.phase; const big = st.bigWheel;
  const wr = AL(big ? 'VERTICAL' : 'HORIZONTAL', { name: 'Wheel row', gap: 16, align: 'CENTER' }); add(S, [wr, 'FILL']);
  add(wr, await wheelI(st.wheel, big ? 240 : 132));
  const col = AL('VERTICAL', { name: 'Spin status', gap: 6, align: big ? 'CENTER' : null }); add(wr, [col, 'FILL']);
  const pr = AL('HORIZONTAL', { name: 'Phase row', gap: 6, align: 'CENTER' }); add(pr, await IC(ph.icon || 'roulette', 14, ph.iconColor || 'icon/brand'), await T(ph.label, 'Overline', ph.color || 'text/brand', { name: 'Phase label' })); add(col, pr);
  await wrapT(col, ph.title, 'Heading/H4', 'text/primary', 170, { name: 'Phase title', align: big ? 'CENTER' : null });
  if (ph.body) await wrapT(col, ph.body, 'Caption', 'text/secondary', 170, { name: 'Phase body', align: big ? 'CENTER' : null });
  if (st.mResult) { const r = st.mResult; const win = r.win; const c = AL('HORIZONTAL', { name: 'Result card', gap: 12, p: 14, r: 14, align: 'CENTER', fill: win ? 'brand/tint-subtle' : 'status/danger-tint', stroke: win ? 'border/brand' : 'border/danger' }); add(c, await discNum(r.pocket, 48, { newest: true })); const tc = AL('VERTICAL', { name: 'Result text', gap: 2 }); add(c, tc); grow(tc); add(tc, await T(r.head, 'Body/M Strong', 'text/primary', { name: 'Headline' })); await wrapT(tc, r.detail, 'Caption', 'text/secondary', 160, { name: 'Detail' }); const v = AL('VERTICAL', { name: 'Net', gap: 2, align: 'MAX' }); add(v, await T(r.net, 'Number/S', win ? 'text/success' : 'text/danger', { name: 'Net amount' }), await T('Verify', 'Label/S', 'text/brand')); add(c, v); add(S, [c, 'FILL']); }
  if (st.settle) { const c = await card('Settlement', { title: st.settle.title, icon: 'receipt', p: 14, gap: 8, fill: 'bg/secondary', demo: 'XS' }); for (const [l, v, tone] of st.settle.rows) add(c, [await kv(l, v, { color: tone === 'win' ? 'text/success' : tone === 'lose' ? 'text/danger' : 'text/primary', lstyle: tone === 'total' ? 'Body/S Strong' : 'Body/S', lcolor: tone === 'total' ? 'text/primary' : 'text/secondary' }), 'FILL']); add(S, [c, 'FILL']); }
  if (st.motion) await wrapT(S, st.motion, 'Caption', 'text/tertiary', 300, { name: 'Motion note', align: 'CENTER' });
  if (st.last !== false) add(S, [await mLast(st.last || LAST_PRE), 'FILL']);
  if (st.view !== 'none') {
    add(S, [await seg('Numbers', 'Outside bets', st.view === 'outside' ? 'Outside bets' : 'Numbers'), 'FILL']);
    const F = st.view === 'outside' ? await mOutside(st.felt || PLAY.felt) : await mFelt(st.felt || PLAY.felt); add(S, F); if (st.view === 'outside') F.layoutSizingHorizontal = 'FILL'; if (st.feltOff) F.opacity = 0.55;
    await wrapT(S, st.hint || 'Tap a number to choose straight, split, street, corner or line · long-press removes a chip', 'Caption', 'text/tertiary', 300, { name: 'Felt hint', align: 'CENTER' });
  }
  return S;
}
async function mBar(f, st) {
  const b = st.bar || {};
  if (b.hide !== true) {
    const s = AL('VERTICAL', { name: 'Sticky chip tray + Spin', gap: 10, p: [12, 12, 12, 12], fill: 'bg/secondary' }); strokeSides(s, 'border/subtle', { t: 1 });
    const sr = AL('HORIZONTAL', { name: 'Slip summary', gap: 8, align: 'CENTER' }); add(sr, await IC('layers', 16, 'icon/muted')); const sc = AL('VERTICAL', { name: 'Slip summary text', gap: 0 }); add(sc, await T(b.summary || '3 bets · 20.00 USDT', 'Body/S Strong', 'text/primary', { name: 'Slip total' }), await T(b.sub || 'Max payout 215.00 USDT · edge 2.70%', 'Caption', 'text/tertiary', { name: 'Slip sub' })); add(sr, sc); add(sr, await DEMO('XS')); addSpacer(sr); add(sr, await BTN('Ghost', 'Bet slip', { size: 'S', trail: 'chevron-up' })); add(s, [sr, 'FILL']);
    if (!b.noChips) { const cr = AL('HORIZONTAL', { name: 'Chips', gap: 4, align: 'CENTER' }); for (const v of ['0.10', '1', '5', '10', '25', '100', '500']) add(cr, await chipI(v, 44, b.off ? 'Disabled' : (v === (b.sel || '5') ? 'Selected' : 'Default'))); add(s, cr); }
    const ar = AL('HORIZONTAL', { name: 'Actions', gap: 8, align: 'CENTER' });
    if (!b.noTools) for (const [ic, l] of [['undo', 'Undo'], ['trash', 'Clear'], ['refresh', 'Repeat']]) add(ar, await iconBtn(ic, { type: 'Secondary', size: 'L', label: l, state: b.off || (b.toolsOff && b.toolsOff.includes(l)) ? 'Disabled' : 'Default' }));
    const cta = await BTN(b.type || 'Primary', b.cta || 'Spin · 20.00 USDT', { size: 'L', lead: b.lead || 'roulette', state: b.state || 'Default' }); cta.name = 'CTA'; add(ar, [cta, 'FILL']);
    if (b.cta2) { const c2 = await BTN('Secondary', b.cta2, { size: 'L', lead: b.lead2 }); c2.name = 'CTA secondary'; add(s, [ar, 'FILL']); add(s, [c2, 'FILL']); } else add(s, [ar, 'FILL']);
    await wrapT(s, b.note || 'You can lose your stake · each spin is independent · 18+', 'Caption', 'text/tertiary', 300, { name: 'Risk note', align: 'CENTER' });
    add(f, [s, 'FILL']);
  }
  if (!st.noTab) { const tab = await I('22:5413', { Active: st.tab || 'Games' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']); }
}
async function mCompliance() { const c = AL('HORIZONTAL', { name: 'Compliance strip', gap: 8, p: 12, r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: true, cgap: 8 }); add(c, await I('6:158', { Variant: 'Compact' })); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); return c; }
const MPLAY = { balance: '9,215.30', wheel: 'Idle', view: 'numbers', top: { label: 'BETS OPEN · SPIN RL-88191', meta: 'Nonce 417 · seed hash 8f3c1e…e813 committed' }, phase: { label: 'PLACE YOUR BETS', title: 'Place your bets', body: 'The pocket is fixed by your seeds; the wheel only reveals it.' } };
async function buildM(name, st0) {
  const st = Object.assign({}, MPLAY, st0);
  const S = await mShell(name, { balance: st.balance, region: st.region });
  add(S.C, [await mHeader(), 'FILL']);
  add(S.C, [await rgStrip(Object.assign({ big: true }, st.rgm || {})), 'FILL']);
  if (st.pre) for (const n of await st.pre()) add(S.C, [n, 'FILL']);
  const stg = await mStage(st); add(S.C, [stg, 'FILL']);
  add(S.C, [await mCompliance(), 'FILL']);
  await mBar(S.f, st);
  if (st.block) blockStage(stg, await prompt(Object.assign({ w: 326 }, st.block)), st.blockY || 64);
  return { f: S.f, stg, C: S.C, notes: { balance: S.balOk } };
}
async function mSheet(f, title, build, foot) {
  f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844);
  const db = f.children[0]; const y0 = db ? db.height : 0;
  const sc = figma.createFrame(); sc.name = 'Scrim'; f.appendChild(sc); sc.layoutPositioning = 'ABSOLUTE'; sc.resize(390, 844 - y0); sc.x = 0; sc.y = y0; fill(sc, 'scrim/overlay');
  const sh = ALV({ name: 'Sheet — ' + title, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: 390, align: 'CENTER' }); topRadius(sh, 28); await fx(sh, 'Elevation/4 — Modal');
  add(sh, rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('HORIZONTAL', { name: 'Sheet head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H4', 'text/primary', { name: 'Sheet title' })); addSpacer(hd); add(hd, await iconBtn('x', { type: 'Ghost', size: 'L', label: 'Close' })); add(sh, [hd, 'FILL']);
  await build(sh);
  if (foot) { const ft = AL('VERTICAL', { name: 'Sheet footer (sticky)', gap: 8, p: [12, 0, 4, 0] }); strokeSides(ft, 'border/subtle', { t: 1 }); for (const n of foot) add(ft, [n, 'FILL']); add(sh, [ft, 'FILL']); }
  const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(sh, [hi, 'FILL']); add(hi, rect(134, 5, 'text/primary', 9999, 'Home bar'));
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
  return sh;
}
async function radioRow(label, desc, sel) { const r = await I('20:3259', { Selected: sel ? 'Yes' : 'No', State: 'Default' }, { Label: label, Description: desc, 'Show description': true }); r.name = 'Option — ' + label; return r; }
// ===== END ROULETTE KIT — mobile =====
