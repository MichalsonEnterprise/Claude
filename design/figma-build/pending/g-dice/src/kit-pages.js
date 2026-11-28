// ===== DICE KIT — history / fairness pages (agent g-dice) =====
async function pageHeader(title, sub, actions) {
  const h = AL('HORIZONTAL', { name: 'Page header', gap: 16, align: 'CENTER' });
  const th = await I('24:13443'); th.rescale(0.35); th.name = 'Tile/Game Art — Pool Dice (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 6 }); add(h, col); grow(col);
  const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'Pool Dice', 'Current page': title }); add(col, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, 'Heading/H2', 'text/primary', { name: 'Page title' }), await DEMO('M')); add(col, tr);
  await wrapT(col, sub, 'Body/M', 'text/secondary', 640, { name: 'Page subtitle' });
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' }); for (const a of actions) add(act, a); add(h, act);
  return h;
}
async function gameTabs(active) {
  const bar = AL('HORIZONTAL', { name: 'Game tabs', gap: 4 }); strokeSides(bar, 'border/subtle', { b: 1 });
  for (const l of ['Play', 'My rolls', 'Fairness', 'Rules & payouts']) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': false }); t.name = 'Tab — ' + l; add(bar, t); }
  return bar;
}
async function statTile(label, value, sub, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Overline', 'text/tertiary')); addSpacer(lr); add(lr, await DEMO('XS')); add(t, [lr, 'FILL']); const vr = AL('HORIZONTAL', { name: 'Stat value row', gap: 8, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 20, o.iconColor || 'icon/muted')); add(vr, await T(value, o.style || 'Number/L', o.color || 'text/primary', { name: 'Stat value' })); add(t, vr); await wrapT(t, sub, 'Caption', 'text/secondary', 200, { name: 'Stat sub' }); return t; }
async function filterChip(label, sel) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Filter — ' + label; return c; }
const MY_ROLLS = [['D-88214', '18:42:33', '10.00', 'Over 50.50', '49.50%', '2.0000×', '31.07', false, '−10.00'], ['D-88213', '18:42:07', '10.00', 'Over 50.50', '49.50%', '2.0000×', '73.21', true, '+10.00'], ['D-88212', '18:41:12', '10.00', 'Over 50.50', '49.50%', '2.0000×', '61.08', true, '+10.00'], ['D-88211', '18:40:48', '10.00', 'Over 50.50', '49.50%', '2.0000×', '18.77', false, '−10.00'], ['D-88210', '18:40:21', '10.00', 'Under 25.00', '25.00%', '3.9600×', '44.02', false, '−10.00'], ['D-88209', '18:39:57', '10.00', 'Under 25.00', '25.00%', '3.9600×', '9.15', true, '+29.60'], ['D-88208', '18:39:30', '10.00', 'Over 66.00', '34.00%', '2.9118×', '70.44', true, '+19.11'], ['D-88207', '18:39:02', '10.00', 'Over 66.00', '34.00%', '2.9118×', '52.86', false, '−10.00'], ['D-88206', '18:38:41', '10.00', 'Over 50.50', '49.50%', '2.0000×', '50.12', false, '−10.00'], ['D-88205', '18:38:15', '10.00', 'Over 50.50', '49.50%', '2.0000×', '96.30', true, '+10.00']];
const MY_COLS = [['Roll ID', 140, 'L'], ['Time (UTC)', 120, 'L'], ['Bet', 110, 'R'], ['Target', 150, 'L'], ['Win chance', 120, 'R'], ['Multiplier', 120, 'R'], ['Roll', 150, 'L'], ['Profit', 0, 'R'], ['Verify', 110, 'L']];
async function renderMine(r, cols) {
  const [id, time, bet, tgt, ch, mult, roll, win, prof] = r; const out = [];
  const c0 = await cellBox(cols[0][1], 'L', 'Roll ID'); add(c0, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); out.push(c0);
  const c1 = await cellBox(cols[1][1], 'L', 'Time'); add(c1, await T(time, 'Body/S', 'text/secondary')); out.push(c1);
  const c2 = await cellBox(cols[2][1], 'R', 'Bet'); add(c2, await T(bet, 'Number/S', 'text/primary')); out.push(c2);
  const c3 = await cellBox(cols[3][1], 'L', 'Target'); add(c3, await IC(tgt.indexOf('Under') === 0 ? 'chevron-down' : 'chevron-up', 14, 'icon/muted'), await T(tgt, 'Body/S', 'text/secondary')); out.push(c3);
  const c4 = await cellBox(cols[4][1], 'R', 'Win chance'); add(c4, await T(ch, 'Number/S', 'text/secondary')); out.push(c4);
  const c5 = await cellBox(cols[5][1], 'R', 'Multiplier'); add(c5, await T(mult, 'Number/S', 'text/secondary')); out.push(c5);
  const c6 = await cellBox(cols[6][1], 'L', 'Roll'); add(c6, await IC(win ? 'check-circle' : 'x-circle', 16, win ? 'icon/brand' : 'status/danger'), await T(roll, 'Number/S', 'text/primary'), await T(win ? 'Win' : 'Lose', 'Caption', win ? 'text/brand' : 'text/danger')); out.push(c6);
  const c7 = await cellBox(cols[7][1], 'R', 'Profit'); add(c7, await T(prof + ' USDT', 'Number/S', win ? 'text/success' : 'text/danger')); out.push(c7);
  const c8 = await cellBox(cols[8][1], 'L', 'Verify'); add(c8, await IC('shield-check', 14, 'icon/brand'), await T('Verify', 'Label/S', 'text/brand')); out.push(c8);
  return out;
}
async function sessionCard(o = {}) {
  const c = AL('VERTICAL', { name: 'Session & limits', gap: 14, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle', w: o.w || 360 });
  const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await IC('shield', 20, 'icon/brand'), await T('Session & limits', 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await I('6:159')); add(c, [hd, 'FILL']);
  for (const [l, v] of [['Session time', o.timer || '00:42:18'], ['Net this session', o.net || '−24.60 USDT'], ['Reality check', 'every 60 min · next 19:00 UTC']]) add(c, [await kv(l, v, { vstyle: 'Body/S Strong', demo: true }), 'FILL']);
  const ll = AL('VERTICAL', { name: 'Loss limit', gap: 6 }); add(ll, [await kv('Daily loss limit', o.lim || '24.60 / 200.00 USDT', { vstyle: 'Body/S Strong', demo: true }), 'FILL']);
  const tr = AL('HORIZONTAL', { name: 'Meter', h: 6, r: 9999, fill: 'border/default', clip: true }); add(ll, [tr, 'FILL']); add(tr, rect(Math.max(4, Math.round((o.w || 360) * 0.84 * (o.pct || 0.12))), 6, o.danger ? 'status/danger' : 'status/info', 0, 'Meter fill'));
  add(ll, await T('Resets 28 Nov 2026, 00:00 UTC · lowering a limit applies now, raising it after 24 h', 'Caption', 'text/tertiary', { name: 'Limit note', w: 300 })); add(c, [ll, 'FILL']);
  const a = AL('HORIZONTAL', { name: 'Card actions', gap: 8 }); add(a, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause-circle' })); add(c, a);
  return c;
}
async function stepCard(title, steps) {
  const c = AL('VERTICAL', { name: title, gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await DEMO('S')); add(c, [hd, 'FILL']);
  for (let i = 0; i < steps.length; i++) { const [t, b, mono, state] = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const n = AL('HORIZONTAL', { name: 'Step number', w: 28, h: 28, r: 9999, align: 'CENTER', justify: 'CENTER', fill: state === 'bad' ? 'status/danger-tint' : 'brand/tint', stroke: state === 'bad' ? 'border/danger' : 'border/brand' }); add(n, await T(String(i + 1), 'Label/S', state === 'bad' ? 'text/danger' : 'text/brand')); add(r, n); const col = AL('VERTICAL', { name: 'Step text', gap: 4 }); add(r, col); grow(col); const tr = AL('HORIZONTAL', { name: 'Step title row', gap: 6, align: 'CENTER' }); add(tr, await T(t, 'Body/S Strong', 'text/primary')); add(tr, await IC(state === 'bad' ? 'x-circle' : 'check-circle', 16, state === 'bad' ? 'status/danger' : 'icon/brand')); add(col, tr); await wrapT(col, b, 'Body/S', 'text/secondary', 400, { name: 'Step body' }); if (mono) { const m = AL('HORIZONTAL', { name: 'Mono chip', p: [6, 10, 6, 10], r: 6, fill: 'bg/secondary', stroke: 'border/subtle' }); add(m, await T(mono, 'Mono/S', 'text/primary', { name: 'Mono value' })); add(col, m); } add(c, [r, 'FILL']); }
  return c;
}
async function buildHistory(name, x, y) {
  const S = await shellD(name, 1440, x, y, {}); const C = S.C;
  add(C, [await pageHeader('My rolls', 'Every Pool Dice roll you made, with the seeds and nonce needed to verify it. Times are UTC.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Primary', 'Back to game', { lead: 'dice' })]), 'FILL']);
  add(C, [await gameTabs('My rolls'), 'FILL']);
  const k = AL('HORIZONTAL', { name: 'KPIs — today', gap: 16 }); add(C, [k, 'FILL']);
  add(k, [await statTile('ROLLS TODAY', '36', '17 wins · 19 losses · 27 Nov 2026 (UTC)'), 'FILL'], [await statTile('WAGERED', '360.00 USDT', 'Average bet 10.00 USDT'), 'FILL'], [await statTile('PAID OUT', '335.40 USDT', 'Stakes returned on winning rolls'), 'FILL'], [await statTile('NET RESULT', '−24.60 USDT', 'Matches your session bar · loss limit 200.00/day', { color: 'text/danger', icon: 'trending-down', iconColor: 'status/danger' }), 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, align: 'CENTER' }); add(C, [fr, 'FILL']);
  for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false]]) add(fr, await filterChip(l, s));
  add(fr, rect(1, 24, 'border/default', 0, 'Divider'));
  for (const [l, s] of [['All results', true], ['Wins', false], ['Losses', false]]) add(fr, await filterChip(l, s));
  addSpacer(fr); add(fr, await T('Showing 10 of 36 rolls', 'Caption', 'text/tertiary'));
  const tb = await rollsTable(MY_ROLLS, { name: 'My rolls table', title: 'Today · newest first', tabs: [], cols: MY_COLS, renderRow: renderMine }); add(C, [tb, 'FILL']);
  const pg = await I('23:16756', { Type: 'Load more' }); pg.name = 'Pagination'; add(tb, pg); tryFill(pg); const pgN = await repl(pg, { '1–20 of 1,284 transactions': '1–10 of 36 rolls today', '1,284': '36', 'transactions': 'rolls', 'Load 20 more': 'Load 10 more' }, true);
  const low = AL('HORIZONTAL', { name: 'Distribution & limits', gap: 24 }); add(C, [low, 'FILL']);
  const hc = AL('VERTICAL', { name: 'Result distribution', gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); add(low, [hc, 'FILL']);
  const hh = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hh, await T('Result distribution — last 1,000 rolls, all players', 'Heading/H5', 'text/primary')); addSpacer(hh); add(hh, await DEMO('S')); add(hc, [hh, 'FILL']);
  const hist = await I('30:17260', { State: 'Default' }); hist.name = 'Chart/Histogram'; add(hc, hist); tryFill(hist);
  await wrapT(hc, 'Each roll is independent: 0.00 – 99.99 are equally likely every time. Streaks in a short run are normal and never predict the next result.', 'Caption', 'text/tertiary', 600, { name: 'Independence note' });
  add(low, await sessionCard());
  add(C, [await compliance(), 'FILL']);
  return { f: S.f, notes: { sidebarItem: S.found, pgN } };
}
async function buildPF(name, x, y, failed) {
  const S = await shellD(name, 1440, x, y, {}); const C = S.C;
  add(C, [await pageHeader('Verify a roll', 'Check that roll D-88213 came from the seeds we committed to before you bet. Nothing here can change a result — it only recomputes it.', [await BTN('Ghost', 'How provably fair works', { lead: 'book' }), await BTN('Primary', 'Back to game', { lead: 'dice' })]), 'FILL']);
  add(C, [await gameTabs('Fairness'), 'FILL']);
  const row = AL('HORIZONTAL', { name: 'Verifier row', gap: 24 }); add(C, [row, 'FILL']);
  const left = AL('VERTICAL', { name: 'Verifier column', gap: 16 }); add(row, left);
  const v = await I('23:24790', { State: failed ? 'Failed' : 'Verified' }); v.name = 'Game/Provably Fair Verifier'; add(left, v);
  const right = AL('VERTICAL', { name: 'Explanation column', gap: 24 }); add(row, [right, 'FILL']);
  const sd = await I('23:23401', { State: 'Rotated' }); sd.name = 'Game/Seed Display'; add(right, sd); tryFill(sd);
  if (!failed) {
    add(right, [await stepCard('How roll D-88213 was computed', [['Commitment published', 'Before your bet we showed the SHA-256 hash of the server seed. It has not changed since.', '8f3c1e…e813'], ['Seeds revealed', 'After you rotated seeds, the server seed was revealed. Hashing it gives exactly the committed value.', 'c71d0a58…5c27b14'], ['Your inputs', 'Client seed nova-k-7f2a91 (you can edit it any time) and nonce 417 — the 417th roll with this seed pair.', 'nova-k-7f2a91 · 417'], ['Result recomputed', 'HMAC-SHA256 of client seed and nonce, keyed with the server seed, maps to 0.00 – 99.99. It gives 73.21 — the same as the recorded roll.', '73.21 ≥ 50.50 → Win · 2.0000× · 20.00 USDT']]), 'FILL']);
  } else {
    add(right, [await callout({ tone: 'danger', icon: 'x-circle', title: 'The recomputed roll doesn’t match the recorded roll', body: 'Most mismatches come from pasting a server seed from another seed pair or changing the nonce. Roll D-88213 used client seed nova-k-7f2a91 and nonce 417.', actions: [await BTN('Secondary', 'Use the seeds from roll D-88213', { size: 'S', lead: 'refresh' }), await BTN('Danger', 'Report this roll', { size: 'S', lead: 'flag' })] }), 'FILL']);
    add(right, [await stepCard('What we checked', [['Server seed hash', 'The server seed you pasted hashes to 41b7…09ac, not the committed 8f3c1e…e813.', '41b7…09ac ≠ 8f3c1e…e813', 'bad'], ['Client seed & nonce', 'These match roll D-88213.', 'nova-k-7f2a91 · 417'], ['If you report it', 'We freeze the record of this roll, attach both seeds and reply within 24 h with case reference PF-3318. The roll record itself can’t be edited by anyone.', 'Case PF-3318']]), 'FILL']);
  }
  add(C, [await compliance(), 'FILL']);
  return { f: S.f, notes: { sidebarItem: S.found } };
}
// ===== END DICE KIT — pages =====
