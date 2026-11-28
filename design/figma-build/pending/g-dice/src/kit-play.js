// ===== DICE KIT — play screen (agent g-dice) =====
function fmt2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function zones(mode, t) { const tm = Math.round((t - 0.01) * 100) / 100; return mode === 'under' ? { win: [0, tm], lose: [t, 99.99] } : { win: [t, 99.99], lose: [0, tm] }; }
function outcomes(a, b) { return Math.round((b - a) * 100) + 1; }
const PLAY_BASE = {
  w: 1440, balance: '9,215.30', avail: '9,215.30', topbar: 'Member', rg: 'Normal', rgTexts: null,
  mode: 'over', target: 50.5, tStr: '50.50', chance: '49.50', mult: '2.0000', bet: '10.00', profit: '+10.00', receive: '20.00',
  odds: 'Default', oddsRepl: null, thumb: 'default', roll: null,
  top: { label: 'NEXT ROLL · D-88213', meta: 'Nonce 417 · server seed hash 8f3c1e…e813 committed before you bet' },
  read: { over: 'ROLL OVER TO WIN', value: '50.50', color: 'text/primary', caption: 'Any result from 50.50 to 99.99 wins · 4,950 of 10,000 possible results' },
  cta: { label: 'Roll over 50.50 · 10.00 USDT', state: 'Default' }
};
async function slider(o) {
  const W = o.w, H = 132; const f = figma.createFrame(); f.name = 'Slider'; f.resize(W, H); f.fills = []; f.clipsContent = false;
  const P = 20, TW = W - 2 * P, TY = 80, TH = 12; const X = v => P + TW * v / 100;
  const t = o.target; const leftWin = o.mode === 'under'; const xl = X(t);
  const cL = o.off ? 'border/strong' : (leftWin ? 'brand/primary' : 'status/danger'); const cR = o.off ? 'border/strong' : (leftWin ? 'status/danger' : 'brand/primary');
  const sL = rect(Math.max(4, Math.round(xl - P)), TH, cL, 9999, leftWin ? 'Track — win zone' : 'Track — lose zone'); f.appendChild(sL); sL.x = P; sL.y = TY;
  const sR = rect(Math.max(4, Math.round(P + TW - xl)), TH, cR, 9999, leftWin ? 'Track — lose zone' : 'Track — win zone'); f.appendChild(sR); sR.x = Math.round(xl); sR.y = TY;
  for (const v of [0, 25, 50, 75, 100]) { const tk = rect(2, 6, 'border/strong', 0, 'Tick ' + v); f.appendChild(tk); tk.x = Math.round(X(v) - 1); tk.y = TY + TH + 6; const lb = await T(String(v), 'Caption', 'text/tertiary', { name: 'Scale ' + v }); f.appendChild(lb); lb.x = Math.round(X(v) - lb.width / 2); lb.y = TY + TH + 16; }
  const foc = o.thumb === 'focus';
  const th = AL('HORIZONTAL', { name: 'Thumb', w: 40, h: 40, r: 10, fill: 'surface/raised', stroke: foc ? 'border/focus' : 'border/strong', sw: foc ? 2 : 1, align: 'CENTER', justify: 'CENTER', gap: 4 });
  if (foc) th.strokeAlign = 'OUTSIDE';
  if (o.thumb === 'locked') add(th, await IC('lock', 16, 'icon/muted')); else for (let i = 0; i < 3; i++) add(th, rect(2, 14, foc ? 'icon/brand' : 'icon/muted', 0, 'Grip'));
  await fx(th, 'Elevation/2 — Raised'); f.appendChild(th); th.x = Math.round(xl - 20); th.y = TY + TH / 2 - 20;
  if (foc) { const tip = AL('HORIZONTAL', { name: 'Drag value', p: [4, 10, 4, 10], r: 6, fill: 'surface/overlay', stroke: 'border/focus', align: 'CENTER' }); add(tip, await T(o.tStr, 'Label/M', 'text/primary', { name: 'Drag value text' })); f.appendChild(tip); tip.x = Math.round(xl - tip.width / 2); tip.y = TY - 44; await fx(tip, 'Elevation/3 — Popover'); }
  if (o.roll) {
    const win = o.roll.state === 'win', lose = o.roll.state === 'lose';
    const pill = AL('HORIZONTAL', { name: 'Roll marker', gap: 6, p: [6, 12, 6, 10], r: 10, align: 'CENTER', fill: win ? 'brand/primary' : lose ? 'status/danger' : 'surface/raised', stroke: (win || lose) ? null : 'border/strong' });
    add(pill, await IC(win ? 'check' : lose ? 'x' : 'dice', 16, win ? 'text/on-primary' : lose ? 'text/on-danger' : 'icon/muted'));
    add(pill, await T(o.roll.v, 'Label/L', win ? 'text/on-primary' : lose ? 'text/on-danger' : 'text/secondary', { name: 'Roll marker value' }));
    f.appendChild(pill); const px = X(parseFloat(o.roll.v)); pill.x = Math.round(Math.min(W - pill.width, Math.max(0, px - pill.width / 2))); pill.y = 0;
    const stem = rect(2, Math.max(2, Math.round(TY - pill.height)), win ? 'brand/primary' : lose ? 'status/danger' : 'border/strong', 0, 'Roll marker stem'); f.appendChild(stem); stem.x = Math.round(px - 1); stem.y = Math.round(pill.height);
    if (o.roll.ghost) { pill.opacity = 0.55; stem.opacity = 0.55; }
  }
  if (o.off) for (const k of [sL, sR]) k.opacity = 0.6;
  return f;
}
async function readout(st) {
  const R = AL('VERTICAL', { name: 'Readout', gap: 8, align: 'CENTER' }); const rd = st.read;
  add(R, await T(rd.over, 'Overline', rd.overColor || 'text/tertiary', { name: 'Readout label' }));
  const big = AL('HORIZONTAL', { name: 'Readout value row', gap: 12, align: 'CENTER' }); add(big, await T(rd.value, 'Display/L', rd.color || 'text/primary', { name: 'Readout value' })); if (rd.demo) add(big, await DEMO('S')); add(R, big);
  if (rd.chip) add(R, rd.chip === 'win' ? await statusChip(true, rd.chipLabel) : rd.chip === 'lose' ? await statusChip(false, rd.chipLabel) : await chip(rd.chipIcon || 'timer', rd.chipLabel));
  if (rd.caption) add(R, await T(rd.caption, 'Body/S', 'text/secondary', { name: 'Readout caption', align: 'CENTER' }));
  return R;
}
async function legend(mode, t) { const z = zones(mode, t); const L = AL('HORIZONTAL', { name: 'Zone legend', gap: 12, align: 'CENTER' }); const seq = mode === 'under' ? [['win', z.win], ['lose', z.lose]] : [['lose', z.lose], ['win', z.win]]; for (let i = 0; i < 2; i++) { const [k, r] = seq[i]; add(L, await statusChip(k === 'win', (k === 'win' ? 'Win · ' : 'Lose · ') + fmt2(r[0]) + ' – ' + fmt2(r[1]) + ' · ' + commas(outcomes(r[0], r[1])) + ' results')); if (i === 0) addSpacer(L); } return L; }
async function skel(w, h, nm, r = 10) { const x = rect(w, h, null, r, nm); await gfill(x, 'Gradient/Skeleton'); return x; }
async function stage(st, sw, padPx = 32) {
  const S = AL('VERTICAL', { name: 'Stage', gap: 24, p: padPx, r: 20, fill: 'surface/default', stroke: 'border/subtle', align: 'CENTER' });
  const top = AL('HORIZONTAL', { name: 'Stage top', gap: 12, align: 'CENTER' });
  const tl = AL('VERTICAL', { name: 'Roll id', gap: 4 }); add(tl, await T(st.top.label, 'Overline', st.top.color || 'text/tertiary', { name: 'Roll label' }));
  const mr = AL('HORIZONTAL', { name: 'Roll meta row', gap: 6, align: 'CENTER' }); add(mr, await T(st.top.meta, 'Caption', 'text/secondary', { name: 'Roll meta' }), await DEMO('XS')); add(tl, mr); add(top, tl); addSpacer(top);
  add(top, await chip('hash', '10,000 possible results')); add(S, [top, 'FILL']);
  if (st.loading) {
    const R = AL('VERTICAL', { name: 'Readout (loading)', gap: 12, align: 'CENTER' }); add(R, await skel(140, 12, 'Skeleton — label', 6), await skel(220, 64, 'Skeleton — value', 14), await skel(320, 14, 'Skeleton — caption', 6)); add(S, [R, 'FILL']);
    add(S, await skel(sw - 40, 12, 'Skeleton — track', 9999));
    const lg = AL('HORIZONTAL', { name: 'Legend (loading)', gap: 12 }); add(lg, await skel(240, 28, 'Skeleton — lose zone', 9999)); addSpacer(lg); add(lg, await skel(240, 28, 'Skeleton — win zone', 9999)); add(S, [lg, 'FILL']);
    const od = await skel(520, 96, 'Skeleton — odds', 14); add(S, od); od.layoutSizingHorizontal = 'FILL';
    const ln = AL('HORIZONTAL', { name: 'Loading status', gap: 8, align: 'CENTER' }); add(ln, await IC('spinner', 16, 'icon/brand'), await T(st.loadingText || 'Connecting to the game server · loading your seed pair', 'Caption', 'text/secondary')); add(S, ln);
    return S;
  }
  add(S, [await readout(st), 'FILL']);
  add(S, await slider({ w: sw, mode: st.mode, target: st.target, tStr: st.tStr, thumb: st.thumb, roll: st.roll, off: st.sliderOff }));
  add(S, [await legend(st.mode, st.target), 'FILL']);
  if (st.result) { const rb = await I('23:19422', { Result: st.result.v }); rb.name = 'Game/Result Banner'; add(S, rb); tryFill(rb); if (st.result.t) st.resMiss = await setTexts(rb, st.result.t); if (st.result.r) await repl(rb, st.result.r, true); }
  const od = await I('23:19312', { State: st.odds || 'Default' }); od.name = 'Game/Odds Display'; add(S, od); tryFill(od); if (st.oddsRepl) st.oddsN = await repl(od, st.oddsRepl, true);
  if (st.motion) { const mn = AL('HORIZONTAL', { name: 'Motion note', gap: 6, p: [4, 10, 4, 8], r: 9999, stroke: 'border/subtle', align: 'CENTER' }); add(mn, await IC('timer', 14, 'icon/muted'), await T(st.motion, 'Caption', 'text/tertiary', { name: 'Motion note text' })); add(S, mn); }
  return S;
}
async function inputBox(o) {
  const st = o.state || 'default';
  const b = AL('HORIZONTAL', { name: o.name || 'Input', gap: 8, p: [0, o.pr != null ? o.pr : 12, 0, o.pl != null ? o.pl : 16], r: 10, h: o.h || 48, align: 'CENTER', fill: st === 'disabled' ? 'surface/default' : 'surface/raised', stroke: st === 'error' ? 'border/danger' : st === 'focus' ? 'border/focus' : 'border/default', sw: st === 'focus' ? 2 : 1 });
  if (st === 'focus') b.strokeAlign = 'OUTSIDE';
  for (const n of (o.lead || [])) add(b, n);
  add(b, await T(o.value, o.style || 'Number/S', st === 'disabled' ? 'text/disabled' : st === 'error' ? 'text/danger' : 'text/primary', { name: o.vname || 'Value' }));
  addSpacer(b); if (o.suffix) add(b, await T(o.suffix, 'Label/M', 'text/tertiary', { name: 'Suffix' }));
  for (const n of (o.trail || [])) add(b, n);
  return b;
}
async function helperRow(text, tone) { const r = AL('HORIZONTAL', { name: 'Helper', gap: 6 }); add(r, await IC(tone === 'error' ? 'alert-circle' : 'info', 14, tone === 'error' ? 'status/danger' : 'icon/muted')); await wrapT(r, text, 'Caption', tone === 'error' ? 'text/danger' : 'text/tertiary', 200, { name: 'Helper text' }); return r; }
async function fieldBlock(label, right, box, helper) { const g = AL('VERTICAL', { name: 'Field — ' + label, gap: 8 }); const lr = AL('HORIZONTAL', { name: 'Label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Label/M', 'text/secondary', { name: 'Field label' })); addSpacer(lr); for (const n of (right || [])) add(lr, n); add(g, [lr, 'FILL']); add(g, [box, 'FILL']); if (helper) add(g, [helper, 'FILL']); return g; }
async function dirToggle(mode, dis, h = 40) { const t = AL('HORIZONTAL', { name: 'Direction', gap: 4, p: 4, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); for (const [m, label, ic] of [['over', 'Roll over', 'chevron-up'], ['under', 'Roll under', 'chevron-down']]) { const on = m === mode; const o = AL('HORIZONTAL', { name: 'Option — ' + label, gap: 6, h, r: 6, align: 'CENTER', justify: 'CENTER', fill: on ? 'brand/tint' : null, stroke: on ? 'border/brand' : null }); add(o, await IC(ic, 16, on ? 'icon/brand' : 'icon/muted'), await T(label, 'Label/M', on ? 'text/brand' : (dis ? 'text/disabled' : 'text/secondary'), { name: 'Option label' })); add(t, [o, 'FILL']); } return t; }
async function betPanel(st, o = {}) {
  const w = o.w || 360; const dis = !!st.panelOff;
  const P = AL('VERTICAL', { name: 'Bet panel', gap: 20, p: o.twoCol ? 24 : 20, r: 20, fill: 'surface/default', stroke: 'border/subtle', w });
  const hd = AL('HORIZONTAL', { name: 'Panel head', gap: 8, align: 'CENTER' }); add(hd, await T('Place a bet', 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await chip('zap', 'Instant result')); add(P, [hd, 'FILL']);
  const tk = await CHAIN('USDT', 20); tk.name = 'Token/USDT';
  const amtBox = await inputBox({ name: 'Amount input', value: st.bet, style: 'Number/M', h: 56, state: st.amtErr ? 'error' : dis ? 'disabled' : 'default', suffix: 'USDT', lead: [tk] });
  const amt = await fieldBlock('Bet amount', [await T('Available ' + st.avail + ' USDT', 'Caption', st.amtErr ? 'text/danger' : 'text/tertiary', { name: 'Available value' }), await DEMO('XS')], amtBox, st.amtErr ? await helperRow(st.amtErr, 'error') : null);
  const quick = AL('HORIZONTAL', { name: 'Quick amounts', gap: 8 }); for (const l of ['½', '2×', 'Max']) { const b = await BTN('Secondary', l, { size: 'S', state: dis ? 'Disabled' : 'Default' }); add(quick, [b, 'FILL']); } add(amt, [quick, 'FILL']);
  const dir = await fieldBlock('Direction', null, await dirToggle(st.mode, dis));
  const tState = st.tErr ? 'error' : st.tFocus ? 'focus' : dis ? 'disabled' : 'default';
  const tBox = await inputBox({ name: 'Target input', value: st.tStr, style: 'Number/M', h: 56, state: tState, pr: 8, trail: [await iconBtn('minus', { size: 'S', state: dis ? 'Disabled' : 'Default' }), await iconBtn('plus', { size: 'S', state: dis ? 'Disabled' : 'Default' })] });
  const tgt = await fieldBlock(st.mode === 'under' ? 'Roll under' : 'Roll over', [await T(st.mode === 'under' ? 'Target 0.01 – 98.00' : 'Target 2.00 – 99.99', 'Caption', 'text/tertiary')], tBox, st.tErr ? await helperRow(st.tErr, 'error') : null);
  const two = AL('HORIZONTAL', { name: 'Chance & multiplier', gap: 12 });
  add(two, [await fieldBlock('Win chance', null, await inputBox({ name: 'Win chance input', value: st.chance, suffix: '%', state: st.tErr ? 'error' : dis ? 'disabled' : 'default' })), 'FILL'], [await fieldBlock('Multiplier', null, await inputBox({ name: 'Multiplier input', value: st.mult, suffix: '×', state: dis ? 'disabled' : 'default' })), 'FILL']);
  const link = AL('HORIZONTAL', { name: 'Link note', gap: 6 }); add(link, await IC('link', 14, st.tFocus ? 'icon/brand' : 'icon/muted')); await wrapT(link, st.linkNote || 'Change any of the three — the other two update instantly. Multiplier = 99 ÷ win chance.', 'Caption', st.tFocus ? 'text/brand' : 'text/tertiary', 240, { name: 'Link note text' });
  const sum = AL('VERTICAL', { name: 'Payout summary', gap: 10, p: 16, r: 14, fill: 'bg/secondary', stroke: 'border/subtle' });
  const money = v => v === '—' ? '—' : v + ' USDT';
  add(sum, [await kv('Profit on win', money(st.profit), { color: st.profit.charAt(0) === '+' ? 'text/success' : 'text/primary', demo: true, vname: 'Profit value' }), 'FILL']);
  add(sum, [await kv('You receive on win', money(st.receive), { vname: 'Receive value' }), 'FILL']);
  add(sum, [await kv('Fees', '0.00 USDT', { vname: 'Fee value' }), 'FILL']);
  await wrapT(sum, 'No platform or network fee on game bets — the 1.00% house edge is already in the multiplier.', 'Caption', 'text/tertiary', 280, { name: 'Fee note' });
  const risk = AL('HORIZONTAL', { name: 'Risk note', gap: 8 }); add(risk, await IC('alert-circle', 16, 'icon/muted')); await wrapT(risk, 'You can lose your stake. Min 0.10 · Max 1,000.00 USDT per roll. Each roll is independent — past results never change the odds.', 'Caption', 'text/secondary', 280, { name: 'Risk text' });
  if (o.twoCol) { const row = AL('HORIZONTAL', { name: 'Panel columns', gap: 24 }); const a = AL('VERTICAL', { name: 'Column A', gap: 20 }); const b = AL('VERTICAL', { name: 'Column B', gap: 20 }); add(a, [amt, 'FILL'], [dir, 'FILL'], [sum, 'FILL']); add(b, [tgt, 'FILL'], [two, 'FILL'], [link, 'FILL']); add(row, [a, 'FILL'], [b, 'FILL']); add(P, [row, 'FILL']); }
  else add(P, [amt, 'FILL'], [dir, 'FILL'], [tgt, 'FILL'], [two, 'FILL'], [link, 'FILL'], [sum, 'FILL']);
  add(P, [risk, 'FILL']);
  if (st.panelNotice) add(P, [await callout(st.panelNotice), 'FILL']);
  const cta = await BTN(st.cta.type || 'Primary', st.cta.label, { size: 'L', lead: st.cta.lead || 'dice', state: st.cta.state || 'Default' }); cta.name = 'CTA'; add(P, [cta, 'FILL']);
  if (st.cta2) { const b2 = await BTN('Secondary', st.cta2.label, { size: 'L', lead: st.cta2.lead }); b2.name = 'CTA secondary'; add(P, [b2, 'FILL']); }
  await wrapT(P, st.hint || 'Space to roll · ↑ ↓ moves the target by 1.00 · results settle on the server', 'Caption', 'text/tertiary', 300, { name: 'Shortcut hint', align: 'CENTER' });
  return P;
}
const ROWS_ALL = [['@mira.sol', 'MS', '18:41:52', '25.00', 'Over 50.50', '88.41', true, '2.0000×', '+25.00'], ['Hidden', '', '18:41:47', '5.00', 'Under 20.00', '63.12', false, '4.9500×', '−5.00'], ['@kestrel', 'KE', '18:41:40', '100.00', 'Over 75.00', '91.07', true, '3.9600×', '+296.00'], ['@juno88', 'JU', '18:41:33', '2.50', 'Over 50.50', '12.95', false, '2.0000×', '−2.50'], ['@pixelfox', 'PF', '18:41:29', '40.00', 'Under 49.50', '22.30', true, '2.0000×', '+40.00'], ['@nova.k (you)', 'NK', '18:41:12', '10.00', 'Over 50.50', '61.08', true, '2.0000×', '+10.00']];
async function cellBox(w, al, name) { const c = AL('HORIZONTAL', { name: 'Cell — ' + name, gap: 8, p: [0, 16, 0, 16], h: 48, align: 'CENTER', justify: al === 'R' ? 'MAX' : 'MIN' }); if (w) c.resize(w, 48); return c; }
async function rollsTable(rows, o = {}) {
  const C = AL('VERTICAL', { name: o.name || 'Recent rolls', r: 14, fill: 'bg/secondary', stroke: 'border/subtle', clip: true });
  const hd = AL('HORIZONTAL', { name: 'Table head', gap: 12, p: [16, 20, 16, 20], align: 'CENTER' }); add(hd, await T(o.title || 'Recent rolls', 'Heading/H5', 'text/primary'), await DEMO('M')); addSpacer(hd);
  for (const [l, a] of (o.tabs || [['All players', true], ['My rolls', false], ['High rollers', false]])) add(hd, await I('20:6895', { State: a ? 'Active' : 'Default' }, { Label: l }));
  add(C, [hd, 'FILL']);
  const cols = o.cols || [['Player', 220, 'L'], ['Time (UTC)', 140, 'L'], ['Bet', 130, 'R'], ['Target', 160, 'L'], ['Roll', 150, 'L'], ['Multiplier', 130, 'R'], ['Profit', 0, 'R']];
  const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { t: 1, b: 1 });
  for (const [l, w, al] of cols) { const hc = await I('22:8309', { Align: al === 'R' ? 'Right' : 'Left', Sort: 'None' }, { Label: l, 'Show sort icon': false }); hc.name = 'Header — ' + l; add(hr, hc); if (w) hc.resize(w, hc.height); else hc.layoutSizingHorizontal = 'FILL'; }
  add(C, [hr, 'FILL']);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const row = AL('HORIZONTAL', { name: 'Row — ' + r[0], fill: i % 2 ? 'surface/default' : null, align: 'CENTER' });
    const cells = await (o.renderRow || renderRoll)(r, cols);
    for (let k = 0; k < cells.length; k++) { add(row, cells[k]); if (!cols[k][1]) cells[k].layoutSizingHorizontal = 'FILL'; }
    add(C, [row, 'FILL']);
  }
  return C;
}
async function renderRoll(r, cols) {
  const [h, ini, time, bet, tgt, roll, win, mult, prof] = r; const out = [];
  const c0 = await cellBox(cols[0][1], 'L', 'Player'); if (ini) { add(c0, await I('9:238', { Size: 'XS' }, { Initials: ini, 'Show status': false })); } else add(c0, await IC('eye-off', 16, 'icon/muted')); add(c0, await T(h, 'Body/S Strong', ini ? 'text/primary' : 'text/tertiary', { name: 'Handle' }), await DEMO('XS')); out.push(c0);
  const c1 = await cellBox(cols[1][1], 'L', 'Time'); add(c1, await T(time, 'Body/S', 'text/secondary')); out.push(c1);
  const c2 = await cellBox(cols[2][1], 'R', 'Bet'); add(c2, await T(bet, 'Number/S', 'text/primary')); out.push(c2);
  const c3 = await cellBox(cols[3][1], 'L', 'Target'); add(c3, await IC(tgt.indexOf('Under') === 0 ? 'chevron-down' : 'chevron-up', 14, 'icon/muted'), await T(tgt, 'Body/S', 'text/secondary')); out.push(c3);
  const c4 = await cellBox(cols[4][1], 'L', 'Roll'); add(c4, await IC(win ? 'check-circle' : 'x-circle', 16, win ? 'icon/brand' : 'status/danger'), await T(roll, 'Number/S', 'text/primary'), await T(win ? 'Win' : 'Lose', 'Caption', win ? 'text/brand' : 'text/danger')); out.push(c4);
  const c5 = await cellBox(cols[5][1], 'R', 'Multiplier'); add(c5, await T(mult, 'Number/S', 'text/secondary')); out.push(c5);
  const c6 = await cellBox(cols[6][1], 'R', 'Profit'); add(c6, await T(prof, 'Number/S', win ? 'text/success' : 'text/danger')); out.push(c6);
  return out;
}
async function buildPlay(name, x, y, st0) {
  const st = Object.assign({}, PLAY_BASE, st0); const w = st.w; const tab = w < 1000;
  const S = await shellD(name, w, x, y, { collapsed: tab, topbar: st.topbar, balance: st.balance, pad: tab ? [24, 24, 40, 24] : [32, 32, 48, 32] });
  const C = S.C; const notes = { sidebarItem: S.found, balance: S.balOk };
  add(C, [await gameHeader({ tablet: tab }), 'FILL']);
  if (st.alert) { const ab = await I('30:17116', { Type: st.alert, Layout: 'Inline' }); ab.name = 'Alert/Banner — ' + st.alert; add(C, ab); notes.alertFill = tryFill(ab); }
  const rg = await rgBar(st.rg, st.rgTexts); add(C, rg.b); notes.rgFill = tryFill(rg.b); notes.rgMiss = rg.miss; if (st.rgRepl) notes.rgN = await repl(rg.b, st.rgRepl, true);
  const inner = w - (tab ? 72 : 240) - (tab ? 48 : 64); let stg, panel;
  if (!tab) { const row = AL('HORIZONTAL', { name: 'Game area', gap: 24 }); add(C, [row, 'FILL']); panel = await betPanel(st, { w: 360 }); add(row, panel); stg = await stage(st, inner - 360 - 24 - 64, 32); add(row, [stg, 'FILL']); stg.layoutSizingVertical = 'FILL'; stg.primaryAxisAlignItems = 'CENTER'; }
  else { stg = await stage(st, inner - 48, 24); add(C, [stg, 'FILL']); panel = await betPanel(st, { w: inner, twoCol: true }); add(C, [panel, 'FILL']); }
  const low = AL(tab ? 'VERTICAL' : 'HORIZONTAL', { name: 'History & seeds', gap: 24 }); add(C, [low, 'FILL']);
  const hs = await I('23:23256', { Game: 'Dice' }); hs.name = 'Game/History Strip'; add(low, hs); notes.hsFill = tryFill(hs); if (st.histRepl) notes.histN = await repl(hs, st.histRepl);
  const sd = await I('23:23401', { State: st.seed || 'Active' }); sd.name = 'Game/Seed Display'; add(low, sd); tryFill(sd); if (st.seedRepl) notes.seedN = await repl(sd, st.seedRepl, true);
  if (!tab && !st.noTable) add(C, [await rollsTable(ROWS_ALL), 'FILL']);
  add(C, [await compliance({ wrap: tab, compact: tab }), 'FILL']);
  if (st.block) blockStage(stg, await prompt(st.block), st.blockY || 96);
  notes.resMiss = st.resMiss; notes.oddsN = st.oddsN;
  return { f: S.f, stg, panel, C, rg: rg.b, hs, notes };
}
// ===== END DICE KIT — play =====
