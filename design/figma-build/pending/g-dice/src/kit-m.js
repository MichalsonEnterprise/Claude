// ===== DICE KIT — mobile 390 (agent g-dice) =====
const M_BASE = Object.assign({}, PLAY_BASE, { w: 390, last: [['61.08', 1], ['18.77', 0], ['44.02', 0], ['9.15', 1], ['70.44', 1], ['52.86', 0]], read: { over: 'ROLL OVER TO WIN', value: '50.50', caption: 'Results 50.50 – 99.99 win · 4,950 of 10,000' }, top: { label: 'NEXT ROLL · D-88213', meta: 'Nonce 417 · seed hash 8f3c1e…e813 committed' } });
function topRadius(n, px) { const v = VAR[RD[px]]; for (const c of ['topLeftRadius', 'topRightRadius']) { if (v) n.setBoundVariable(c, v); else n[c] = px; } }
async function mShell(name, o = {}) {
  const f = await screen(name, 390, { x: 0, y: 0 }); add(f, [await DEMOBAR('DEMO DATA — illustrative values only'), 'FILL']);
  if (o.region) { const rb = await I('16:3449', { Breakpoint: 'Mobile' }); rb.name = 'Nav/Region Banner'; add(f, [rb, 'FILL']); }
  const tb = await I('23:12908', { State: 'Member' }); tb.name = 'Shell/Topbar Mobile'; add(f, [tb, 'FILL']);
  let balOk = true; if (o.balance && o.balance !== '9,215.30') { balOk = await setText(tb, 'Balance value', o.balance); if (!balOk) balOk = (await repl(tb, { '9,215.30': o.balance })) > 0; }
  const C = AL('VERTICAL', { name: 'Content', gap: 16, p: [16, 16, 24, 16] }); add(f, [C, 'FILL']);
  return { f, tb, C, balOk };
}
async function mFoot(f, st) {
  if (st.cta) { const s = AL('VERTICAL', { name: 'Sticky CTA', gap: 8, p: [12, 16, 12, 16], fill: 'bg/secondary' }); strokeSides(s, 'border/subtle', { t: 1 });
    if (st.ctaNote !== false) { const r = AL('HORIZONTAL', { name: 'CTA summary', gap: 6, align: 'CENTER' }); await wrapT(r, st.ctaNote || ('Profit on win ' + st.profit + (st.profit === '—' ? '' : ' USDT')), 'Caption', 'text/secondary', 180, { name: 'CTA summary text' }); add(r, await T('You can lose your stake', 'Caption', 'text/tertiary')); add(s, [r, 'FILL']); }
    const b = await BTN(st.cta.type || 'Primary', st.cta.label, { size: 'L', lead: st.cta.lead || 'dice', state: st.cta.state || 'Default' }); b.name = 'CTA'; add(s, [b, 'FILL']);
    if (st.cta2) { const b2 = await BTN('Secondary', st.cta2.label, { size: 'L', lead: st.cta2.lead }); b2.name = 'CTA secondary'; add(s, [b2, 'FILL']); }
    add(f, [s, 'FILL']); }
  const tab = await I('22:5413', { Active: st.tab || 'Games' }); tab.name = 'Nav/Mobile Tab Bar'; add(f, [tab, 'FILL']);
}
async function mHeader(o = {}) {
  const h = AL('HORIZONTAL', { name: 'Game header', gap: 12, align: 'CENTER' }); const th = await I('24:13443'); th.rescale(0.3); th.name = 'Tile/Game Art — Pool Dice (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 2 }); add(h, col); grow(col); add(col, await T(o.title || 'Pool Dice', 'Heading/H4', 'text/primary', { name: 'Game title' })); await wrapT(col, o.sub || 'Original · house edge 1.00% · provably fair', 'Caption', 'text/brand', 140, { name: 'Game sub' });
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 0 }); for (const ic of (o.icons || ['history', 'book', 'volume'])) add(act, await iconBtn(ic, { type: 'Ghost', size: 'L' })); add(h, act); return h;
}
async function mBack(label, title, demo) { const g = AL('VERTICAL', { name: 'Page title', gap: 8 }); const b = await BTN('Ghost', label, { size: 'S', lead: 'chevron-left' }); add(g, b); const tr = AL('HORIZONTAL', { name: 'Title row', gap: 8, align: 'CENTER' }); add(tr, await T(title, 'Heading/H3', 'text/primary', { name: 'Page title text' })); if (demo) add(tr, await DEMO('M')); add(g, tr); return g; }
async function mTabs(active) { const r = AL('HORIZONTAL', { name: 'Game tabs (scroll)', gap: 8, clip: true }); for (const l of ['Play', 'My rolls', 'Fairness', 'Rules & payouts']) add(r, await I('20:6895', { State: l === active ? 'Active' : 'Default' }, { Label: l })); return r; }
async function mRG(o = {}) {
  const tone = o.danger ? 'danger' : o.warn ? 'warning' : null;
  const r = AL('VERTICAL', { name: 'RG session strip', gap: 8, p: 12, r: 14, fill: tone ? 'status/' + tone + '-tint' : 'surface/default', stroke: tone ? 'status/' + tone : 'border/subtle' });
  const r1 = AL('HORIZONTAL', { name: 'Session row', gap: 8, align: 'CENTER' }); add(r1, await IC('timer', 16, 'icon/muted'), await T(o.timer || '00:42:18', 'Mono/S', 'text/primary', { name: 'Timer' }), await T('Net', 'Caption', 'text/tertiary'), await T(o.net || '−24.60 USDT', 'Body/S Strong', 'text/primary', { name: 'Net value' }), await DEMO('XS')); addSpacer(r1); add(r1, await iconBtn('pause-circle', { type: 'Ghost', size: 'L' })); add(r, [r1, 'FILL']);
  const r2 = AL('HORIZONTAL', { name: 'Limit row', gap: 8, align: 'CENTER' }); add(r2, await T(o.limLabel || 'Daily loss limit', 'Caption', 'text/tertiary'), await T(o.lim || '24.60 / 200.00 USDT', 'Caption', tone ? 'text/' + tone : 'text/secondary', { name: 'Limit value' })); addSpacer(r2);
  const tr = AL('HORIZONTAL', { name: 'Meter', w: 96, h: 4, r: 9999, fill: 'border/default', clip: true }); add(tr, rect(Math.max(4, Math.round(96 * (o.pct || 0.12))), 4, tone ? 'status/' + tone : 'status/info', 0, 'Meter fill')); add(r2, tr); add(r, [r2, 'FILL']);
  if (o.msg) await wrapT(r, o.msg, 'Caption', tone ? 'text/' + tone : 'text/secondary', 300, { name: 'Strip message' });
  return r;
}
async function rollPill(v, win, newest) { const p = AL('HORIZONTAL', { name: 'Roll ' + v, gap: 4, p: [4, 8, 4, 6], r: 9999, align: 'CENTER', fill: win ? 'brand/tint' : 'surface/raised', stroke: newest ? 'border/focus' : (win ? 'border/brand' : 'border/default'), sw: newest ? 2 : 1 }); add(p, await IC(win ? 'check' : 'x', 12, win ? 'icon/brand' : 'status/danger'), await T(v, 'Label/S', win ? 'text/brand' : 'text/secondary')); return p; }
async function mLast(seq) { const g = AL('VERTICAL', { name: 'Last rolls', gap: 8 }); const hr = AL('HORIZONTAL', { name: 'Last rolls head', gap: 6, align: 'CENTER' }); add(hr, await T('Your last rolls', 'Label/M', 'text/secondary')); add(hr, await DEMO('XS')); addSpacer(hr); add(hr, await T('Each roll is independent', 'Caption', 'text/tertiary')); add(g, [hr, 'FILL']); const row = AL('HORIZONTAL', { name: 'Pills', gap: 6, wrap: true, cgap: 6 }); for (let i = 0; i < seq.length; i++) add(row, await rollPill(seq[i][0], !!seq[i][1], i === 0)); add(g, [row, 'FILL']); return g; }
async function mOdds(st) { const o = AL('HORIZONTAL', { name: 'Odds tiles', gap: 8 }); const err = st.odds === 'Out of range'; for (const [l, v, c] of [['WIN CHANCE', st.chance + '%', err ? 'text/danger' : 'text/primary'], ['MULTIPLIER', st.mult + '×', 'text/primary'], ['PAYOUT', st.receive, st.receive === '—' ? 'text/tertiary' : 'text/success']]) { const t = AL('VERTICAL', { name: 'Tile — ' + l, gap: 4, p: 12, r: 10, fill: 'bg/secondary', stroke: err && l === 'WIN CHANCE' ? 'border/danger' : (st.tFocus ? 'border/focus' : 'border/subtle') }); add(t, await T(l, 'Overline', 'text/tertiary'), await T(v, 'Number/S', c, { name: 'Value' })); add(o, [t, 'FILL']); } return o; }
async function mLegend(mode, t) { const z = zones(mode, t); const L = AL('VERTICAL', { name: 'Zone legend', gap: 6 }); for (const [k, r] of [['win', z.win], ['lose', z.lose]]) add(L, await statusChip(k === 'win', (k === 'win' ? 'Win · ' : 'Lose · ') + fmt2(r[0]) + ' – ' + fmt2(r[1]))); return L; }
async function mResult(st) { const win = st.result.v === 'Win'; const c = AL('HORIZONTAL', { name: 'Result card', gap: 12, p: 14, r: 14, align: 'CENTER', fill: win ? 'brand/tint-subtle' : 'status/danger-tint', stroke: win ? 'border/brand' : 'border/danger' }); add(c, await IC(win ? 'check-circle' : 'x-circle', 24, win ? 'icon/brand' : 'status/danger')); const col = AL('VERTICAL', { name: 'Result text', gap: 2 }); add(c, col); grow(col); add(col, await T(st.result.head, 'Body/M Strong', 'text/primary', { name: 'Headline' })); await wrapT(col, st.result.detail, 'Caption', 'text/secondary', 180, { name: 'Detail' }); const v = AL('VERTICAL', { name: 'Net', gap: 2, align: 'MAX' }); add(v, await T(st.result.net, 'Number/S', win ? 'text/success' : 'text/danger', { name: 'Net amount' }), await T('Verify', 'Label/S', 'text/brand')); add(c, v); return c; }
async function mStage(st) {
  const S = AL('VERTICAL', { name: 'Stage', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
  const top = AL('VERTICAL', { name: 'Roll id', gap: 4 }); add(top, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Roll label' })); const mr = AL('HORIZONTAL', { name: 'Roll meta row', gap: 6, align: 'CENTER' }); add(mr, await T(st.top.meta, 'Caption', 'text/secondary', { name: 'Roll meta' }), await DEMO('XS')); add(top, mr); add(S, [top, 'FILL']);
  if (st.loading) { add(S, await skel(220, 56, 'Skeleton — value', 14), await skel(306, 12, 'Skeleton — track', 9999)); const od = await skel(300, 64, 'Skeleton — odds', 10); add(S, od); od.layoutSizingHorizontal = 'FILL'; return S; }
  const R = AL('VERTICAL', { name: 'Readout', gap: 6, align: 'CENTER' }); add(R, await T(st.read.over, 'Overline', 'text/tertiary', { name: 'Readout label' }), await T(st.read.value, 'Display/M', st.read.color || 'text/primary', { name: 'Readout value' }));
  if (st.read.chip) add(R, st.read.chip === 'win' ? await statusChip(true, st.read.chipLabel) : st.read.chip === 'lose' ? await statusChip(false, st.read.chipLabel) : await chip(st.read.chipIcon || 'timer', st.read.chipLabel));
  if (st.read.caption) await wrapT(R, st.read.caption, 'Caption', 'text/secondary', 300, { name: 'Readout caption', align: 'CENTER' });
  add(S, [R, 'FILL']);
  add(S, await slider({ w: 326, mode: st.mode, target: st.target, tStr: st.tStr, thumb: st.thumb, roll: st.roll, off: st.sliderOff }));
  const lg = await mLegend(st.mode, st.target); add(S, [lg, 'FILL']);
  if (st.result) add(S, [await mResult(st), 'FILL']);
  add(S, [await mOdds(st), 'FILL']);
  if (st.motion) await wrapT(S, st.motion, 'Caption', 'text/tertiary', 300, { name: 'Motion note', align: 'CENTER' });
  return S;
}
async function mControls(st) {
  const dis = !!st.panelOff;
  const P = AL('VERTICAL', { name: 'Bet controls', gap: 16, p: 16, r: 20, fill: 'surface/default', stroke: 'border/subtle' });
  add(P, [await dirToggle(st.mode, dis, 44), 'FILL']);
  const tState = st.tErr ? 'error' : st.tFocus ? 'focus' : dis ? 'disabled' : 'default';
  const tBox = await inputBox({ name: 'Target input', value: st.tStr, style: 'Number/M', h: 56, state: tState, pr: 4, trail: [await iconBtn('minus', { type: 'Ghost', size: 'L', state: dis ? 'Disabled' : 'Default' }), await iconBtn('plus', { type: 'Ghost', size: 'L', state: dis ? 'Disabled' : 'Default' })] });
  add(P, [await fieldBlock(st.mode === 'under' ? 'Roll under' : 'Roll over', [await T(st.mode === 'under' ? '0.01 – 98.00' : '2.00 – 99.99', 'Caption', 'text/tertiary')], tBox, st.tErr ? await helperRow(st.tErr, 'error') : null), 'FILL']);
  const tk = await CHAIN('USDT', 20); tk.name = 'Token/USDT';
  const amtBox = await inputBox({ name: 'Amount input', value: st.bet, style: 'Number/M', h: 56, state: st.amtErr ? 'error' : dis ? 'disabled' : 'default', suffix: 'USDT', lead: [tk] });
  const amt = await fieldBlock('Bet amount', [await T('Available ' + st.avail, 'Caption', st.amtErr ? 'text/danger' : 'text/tertiary', { name: 'Available value' }), await DEMO('XS')], amtBox, st.amtErr ? await helperRow(st.amtErr, 'error') : null);
  const quick = AL('HORIZONTAL', { name: 'Quick amounts', gap: 8 }); for (const l of ['½', '2×', 'Max']) { const b = await BTN('Secondary', l, { size: 'L', state: dis ? 'Disabled' : 'Default' }); add(quick, [b, 'FILL']); } add(amt, [quick, 'FILL']); add(P, [amt, 'FILL']);
  const sum = AL('VERTICAL', { name: 'Payout summary', gap: 8, p: 12, r: 10, fill: 'bg/secondary' });
  add(sum, [await kv('You receive on win', st.receive === '—' ? '—' : st.receive + ' USDT', { vname: 'Receive value', demo: true }), 'FILL'], [await kv('Fees', '0.00 USDT · edge in multiplier', { vstyle: 'Body/S', vname: 'Fee value' }), 'FILL']); add(P, [sum, 'FILL']);
  await wrapT(P, 'You can lose your stake. Min 0.10 · Max 1,000.00 USDT per roll. Each roll is independent.', 'Caption', 'text/secondary', 300, { name: 'Risk text' });
  if (st.panelNotice) add(P, [await callout(st.panelNotice), 'FILL']);
  return P;
}
async function mCompliance() { const c = AL('HORIZONTAL', { name: 'Compliance strip', gap: 8, p: 12, r: 14, stroke: 'border/subtle', align: 'CENTER', wrap: true, cgap: 8 }); add(c, await I('6:158', { Variant: 'Compact' })); add(c, await I('6:159')); add(c, await BTN('Ghost', 'Responsible gaming', { size: 'S', lead: 'shield' })); return c; }
async function buildM(name, st0) {
  const st = Object.assign({}, M_BASE, st0);
  const S = await mShell(name, { balance: st.balance, region: st.region });
  add(S.C, [await mHeader(), 'FILL']);
  add(S.C, [await mRG(st.rgm || {}), 'FILL']);
  const stg = await mStage(st); add(S.C, [stg, 'FILL']);
  add(S.C, [await mControls(st), 'FILL']);
  add(S.C, [await mLast(st.last), 'FILL']);
  add(S.C, [await mCompliance(), 'FILL']);
  await mFoot(S.f, st);
  if (st.block) blockStage(stg, await prompt(Object.assign({ w: 326 }, st.block)), st.blockY || 56);
  return { f: S.f, stg, C: S.C, notes: { balance: S.balOk } };
}
// bottom sheet over a fixed 844 viewport (frame clipped)
async function mSheet(f, title, build) {
  f.primaryAxisSizingMode = 'FIXED'; f.resize(390, 844);
  const db = f.children[0]; const y0 = db ? db.height : 0;
  const sc = figma.createFrame(); sc.name = 'Scrim'; f.appendChild(sc); sc.layoutPositioning = 'ABSOLUTE'; sc.resize(390, 844 - y0); sc.x = 0; sc.y = y0; fill(sc, 'scrim/overlay');
  const sh = AL('VERTICAL', { name: 'Sheet — ' + title, gap: 16, p: [8, 16, 0, 16], fill: 'surface/overlay', stroke: 'border/subtle', w: 390, align: 'CENTER' }); topRadius(sh, 28); await fx(sh, 'Elevation/4 — Modal');
  add(sh, rect(40, 4, 'border/strong', 9999, 'Grabber'));
  const hd = AL('HORIZONTAL', { name: 'Sheet head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H4', 'text/primary', { name: 'Sheet title' })); addSpacer(hd); add(sh, [hd, 'FILL']);
  await build(sh);
  const hi = AL('HORIZONTAL', { name: 'Home indicator', h: 34, align: 'CENTER', justify: 'CENTER' }); add(sh, [hi, 'FILL']); add(hi, rect(134, 5, 'text/primary', 9999, 'Home bar'));
  f.appendChild(sh); sh.layoutPositioning = 'ABSOLUTE'; sh.x = 0; sh.y = 844 - sh.height;
  return sh;
}
// ===== END DICE KIT — mobile =====
