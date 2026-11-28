// ===== ROULETTE KIT — history / rules / fairness pages (agent g-roulette) =====
async function pageHeader(title, sub, actions, crumb) {
  const h = AL('HORIZONTAL', { name: 'Page header', gap: 16, align: 'CENTER' });
  const th = await I('25:14777'); th.rescale(0.35); th.name = 'Tile/Game Art — Pool Roulette (thumb)'; add(h, th);
  const col = AL('VERTICAL', { name: 'Title', gap: 6 }); add(h, col); grow(col);
  const bc = await I('14:1145', { Levels: 3 }); bc.name = 'Nav/Breadcrumb'; await setTexts(bc, { 'Crumb 1': 'Casino', 'Crumb 2': 'Pool Roulette', 'Current page': crumb || title }); add(col, bc);
  const tr = AL('HORIZONTAL', { name: 'Title row', gap: 12, align: 'CENTER' }); add(tr, await T(title, 'Heading/H2', 'text/primary', { name: 'Page title' }), await DEMO('M')); add(col, tr);
  await wrapT(col, sub, 'Body/M', 'text/secondary', 640, { name: 'Page subtitle' });
  const act = AL('HORIZONTAL', { name: 'Header actions', gap: 8, align: 'CENTER' }); for (const a of actions) add(act, a); add(h, act);
  return h;
}
async function gameTabs(active) { const bar = AL('HORIZONTAL', { name: 'Game tabs', gap: 4 }); strokeSides(bar, 'border/subtle', { b: 1 }); for (const l of ['Play', 'My bets', 'Fairness', 'Rules & payouts']) { const t = await I('20:6831', { State: l === active ? 'Active' : 'Default' }, { Label: l, 'Show count': false }); t.name = 'Tab — ' + l; add(bar, t); } return bar; }
async function statTile(label, value, sub, o = {}) { const t = AL('VERTICAL', { name: 'Stat — ' + label, gap: 6, p: 20, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const lr = AL('HORIZONTAL', { name: 'Stat label row', gap: 6, align: 'CENTER' }); add(lr, await T(label, 'Overline', 'text/tertiary')); addSpacer(lr); add(lr, await DEMO('XS')); add(t, [lr, 'FILL']); const vr = AL('HORIZONTAL', { name: 'Stat value row', gap: 8, align: 'CENTER' }); if (o.icon) add(vr, await IC(o.icon, 20, o.iconColor || 'icon/muted')); add(vr, await T(value, o.style || 'Number/L', o.color || 'text/primary', { name: 'Stat value' })); add(t, vr); await wrapT(t, sub, 'Caption', 'text/secondary', 200, { name: 'Stat sub' }); return t; }
async function filterChip(label, sel) { const c = await I('17:2766', { State: sel ? 'Selected' : 'Default' }, { Label: label, 'Show icon': false }); c.name = 'Filter — ' + label; return c; }
async function cellBox(w, al, name, h = 52) { const c = AL('HORIZONTAL', { name: 'Cell — ' + name, gap: 8, p: [0, 16, 0, 16], h, align: 'CENTER', justify: al === 'R' ? 'MAX' : 'MIN' }); if (w) c.resize(w, h); return c; }
async function tableCard(rows, o) {
  const C = AL('VERTICAL', { name: o.name || 'Table', r: 14, fill: 'bg/secondary', stroke: 'border/subtle', clip: true });
  const hd = AL('HORIZONTAL', { name: 'Table head', gap: 12, p: [16, 20, 16, 20], align: 'CENTER' }); add(hd, await T(o.title, 'Heading/H5', 'text/primary'), await DEMO('M')); addSpacer(hd); if (o.right) for (const x of o.right) add(hd, x); add(C, [hd, 'FILL']);
  const hr = AL('HORIZONTAL', { name: 'Header row', fill: 'surface/default' }); strokeSides(hr, 'border/subtle', { t: 1, b: 1 });
  for (const [l, w, al] of o.cols) { const hc = await I('22:8309', { Align: al === 'R' ? 'Right' : 'Left', Sort: l === o.sortBy ? 'Desc' : 'None' }, { Label: l, 'Show sort icon': l === o.sortBy }); hc.name = 'Header — ' + l; add(hr, hc); if (w) hc.resize(w, hc.height); else hc.layoutSizingHorizontal = 'FILL'; }
  add(C, [hr, 'FILL']);
  for (let i = 0; i < rows.length; i++) { const r = rows[i]; const row = AL('HORIZONTAL', { name: 'Row — ' + r[0], fill: i % 2 ? 'surface/default' : null, align: 'CENTER' }); const cells = await o.render(r, o.cols); for (let k = 0; k < cells.length; k++) { add(row, cells[k]); if (!o.cols[k][1]) cells[k].layoutSizingHorizontal = 'FILL'; } add(C, [row, 'FILL']); if (o.expand && o.expand.id === r[0]) add(C, [await o.expand.build(), 'FILL']); }
  return C;
}
const MY_SPINS = [['RL-88191', '18:46:12', 'Straight 19 · Red · 2nd dozen', '20.00', 19, '215.00', '+195.00'], ['RL-88190', '18:45:31', 'Straight 19 · Red · 2nd dozen', '20.00', 26, '0.00', '−20.00'], ['RL-88189', '18:44:58', 'Straight 19 · Red · 2nd dozen', '20.00', 14, '35.00', '+15.00'], ['RL-88188', '18:44:20', 'Straight 19 · Red · 2nd dozen', '20.00', 0, '0.00', '−20.00'], ['RL-88187', '18:43:47', 'Red · 2nd dozen', '15.00', 32, '20.00', '+5.00'], ['RL-88186', '18:43:09', 'Red · 2nd dozen', '15.00', 17, '15.00', '±0.00'], ['RL-88185', '18:42:36', 'Split 17 | 20 · Corner 22–26', '3.00', 8, '0.00', '−3.00'], ['RL-88184', '18:41:58', 'Split 17 | 20 · Corner 22–26', '3.00', 23, '18.00', '+15.00'], ['RL-88183', '18:41:20', 'Black', '10.00', 11, '20.00', '+10.00'], ['RL-88182', '18:40:44', 'Black', '10.00', 5, '0.00', '−10.00']];
const SPIN_COLS = [['Spin ID', 150, 'L'], ['Time (UTC)', 120, 'L'], ['Bets', 0, 'L'], ['Stake', 120, 'R'], ['Pocket', 150, 'L'], ['Returned', 130, 'R'], ['Net', 130, 'R'], ['Verify', 110, 'L']];
async function renderSpin(r, cols) {
  const [id, time, bets, stake, pk, ret, net] = r; const win = net.charAt(0) === '+'; const flat = net.charAt(0) === '±'; const out = [];
  const c0 = await cellBox(cols[0][1], 'L', 'Spin ID'); add(c0, await T(id, 'Mono/S', 'text/primary'), await DEMO('XS')); out.push(c0);
  const c1 = await cellBox(cols[1][1], 'L', 'Time'); add(c1, await T(time, 'Body/S', 'text/secondary')); out.push(c1);
  const c2 = await cellBox(cols[2][1], 'L', 'Bets'); add(c2, await T(bets, 'Body/S', 'text/primary')); out.push(c2);
  const c3 = await cellBox(cols[3][1], 'R', 'Stake'); add(c3, await T(stake, 'Number/S', 'text/primary')); out.push(c3);
  const c4 = await cellBox(cols[4][1], 'L', 'Pocket'); add(c4, await discNum(pk, 24), await T(colorOf(pk), 'Caption', 'text/secondary')); out.push(c4);
  const c5 = await cellBox(cols[5][1], 'R', 'Returned'); add(c5, await T(ret, 'Number/S', 'text/secondary')); out.push(c5);
  const c6 = await cellBox(cols[6][1], 'R', 'Net'); add(c6, await IC(win ? 'trending-up' : flat ? 'minus' : 'trending-down', 14, win ? 'icon/brand' : flat ? 'icon/muted' : 'status/danger'), await T(net, 'Number/S', win ? 'text/success' : flat ? 'text/secondary' : 'text/danger')); out.push(c6);
  const c7 = await cellBox(cols[7][1], 'L', 'Verify'); add(c7, await IC('shield-check', 14, 'icon/brand'), await T('Verify', 'Label/S', 'text/brand')); out.push(c7);
  return out;
}
async function spinDetail() {
  const d = AL('HORIZONTAL', { name: 'Expanded — RL-88191', gap: 24, p: [16, 20, 20, 20], fill: 'surface/selected' }); strokeSides(d, 'border/brand', { l: 3 });
  const a = AL('VERTICAL', { name: 'Per-bet settlement', gap: 8 }); add(d, [a, 'FILL']); add(a, await T('Per-bet settlement', 'Label/M', 'text/secondary'));
  for (const [l, v] of [['Straight 19 · 5.00 × 36 (35:1 + stake)', '180.00'], ['Red · 10.00 × 2 (1:1 + stake)', '20.00'], ['2nd dozen · 5.00 × 3 (2:1 + stake)', '15.00'], ['Total returned · 20.00 staked', '215.00 USDT']]) add(a, [await kv(l, v, { color: 'text/success' }), 'FILL']);
  const b = AL('VERTICAL', { name: 'Seeds for this spin', gap: 8 }); add(d, [b, 'FILL']); add(b, await T('Seeds for this spin', 'Label/M', 'text/secondary'));
  for (const [l, v] of [['Server seed hash', '8f3c1e…e813'], ['Client seed', 'nova-k-7f2a91'], ['Nonce', '417'], ['Settled', '27 Nov 2026, 18:46:17 UTC']]) add(b, [await kv(l, v, { vstyle: 'Mono/S', demo: true }), 'FILL']);
  const c = AL('VERTICAL', { name: 'Row actions', gap: 8 }); add(d, c); add(c, await BTN('Primary', 'Verify spin', { size: 'S', lead: 'shield-check' }), await BTN('Secondary', 'Repeat these bets', { size: 'S', lead: 'refresh' }));
  return d;
}
async function stepCard(title, steps) {
  const c = AL('VERTICAL', { name: title, gap: 16, p: 24, r: 14, fill: 'surface/default', stroke: 'border/subtle' }); const hd = AL('HORIZONTAL', { name: 'Card head', gap: 8, align: 'CENTER' }); add(hd, await T(title, 'Heading/H5', 'text/primary')); addSpacer(hd); add(hd, await DEMO('S')); add(c, [hd, 'FILL']);
  for (let i = 0; i < steps.length; i++) { const [t, b, mono, state] = steps[i]; const r = AL('HORIZONTAL', { name: 'Step ' + (i + 1), gap: 12 }); const n = AL('HORIZONTAL', { name: 'Step number', w: 28, h: 28, r: 9999, align: 'CENTER', justify: 'CENTER', fill: state === 'bad' ? 'status/danger-tint' : 'brand/tint', stroke: state === 'bad' ? 'border/danger' : 'border/brand' }); add(n, await T(String(i + 1), 'Label/S', state === 'bad' ? 'text/danger' : 'text/brand')); add(r, n); const col = AL('VERTICAL', { name: 'Step text', gap: 4 }); add(r, col); grow(col); const tr = AL('HORIZONTAL', { name: 'Step title row', gap: 6, align: 'CENTER' }); add(tr, await T(t, 'Body/S Strong', 'text/primary')); add(tr, await IC(state === 'bad' ? 'x-circle' : 'check-circle', 16, state === 'bad' ? 'status/danger' : 'icon/brand')); add(col, tr); await wrapT(col, b, 'Body/S', 'text/secondary', 400, { name: 'Step body' }); if (mono) { const m = AL('HORIZONTAL', { name: 'Mono chip', p: [6, 10, 6, 10], r: 6, fill: 'bg/secondary', stroke: 'border/subtle' }); add(m, await T(mono, 'Mono/S', 'text/primary', { name: 'Mono value' })); add(col, m); } add(c, [r, 'FILL']); }
  return c;
}
async function pageShell(name, x, y) { return shellD(name, 1440, x, y, { collapsed: false, pad: [32, 32, 48, 32] }); }
async function buildHistory(name, x, y) {
  const S = await pageShell(name, x, y); const C = S.C;
  add(C, [await pageHeader('My bets', 'Every Pool Roulette spin you played, with the pocket, what each bet returned and the seeds to verify it. Times are UTC.', [await BTN('Secondary', 'Export CSV', { lead: 'download' }), await BTN('Primary', 'Back to table', { lead: 'roulette' })]), 'FILL']);
  add(C, [await gameTabs('My bets'), 'FILL']);
  const k = AL('HORIZONTAL', { name: 'KPIs — today', gap: 16 }); add(C, [k, 'FILL']);
  add(k, [await statTile('SPINS TODAY', '10', '5 won · 4 lost · 1 broke even · 27 Nov 2026 (UTC)'), 'FILL'], [await statTile('STAKED', '136.00 USDT', 'Pool Roulette only · average 13.60 per spin'), 'FILL'], [await statTile('RETURNED', '323.00 USDT', 'Stake + winnings on winning bets'), 'FILL'], [await statTile('NET RESULT', '+187.00 USDT', 'Returned − staked · outcomes vary; the 2.70% edge applies over time', { color: 'text/success', icon: 'trending-up', iconColor: 'icon/brand' }), 'FILL']);
  const fr = AL('HORIZONTAL', { name: 'Filters', gap: 8, align: 'CENTER' }); add(C, [fr, 'FILL']);
  for (const [l, s] of [['Today', true], ['7 days', false], ['30 days', false]]) add(fr, await filterChip(l, s));
  add(fr, rect(1, 24, 'border/default', 0, 'Divider'));
  for (const [l, s] of [['All spins', true], ['Won', false], ['Lost', false], ['Inside bets', false], ['Outside bets', false]]) add(fr, await filterChip(l, s));
  addSpacer(fr); add(fr, await T('Showing 10 of 10 spins today', 'Caption', 'text/tertiary'));
  const tb = await tableCard(MY_SPINS, { name: 'My spins table', title: 'Today · newest first', cols: SPIN_COLS, render: renderSpin, sortBy: 'Time (UTC)', expand: { id: 'RL-88191', build: spinDetail } }); add(C, [tb, 'FILL']);
  const pg = await I('23:16756', { Type: 'Cursor' }); pg.name = 'Pagination'; add(tb, pg); tryFill(pg);
  const low = AL('HORIZONTAL', { name: 'Spin stats & limits', gap: 24 }); add(C, [low, 'FILL']);
  const hc = await card('Last 50 spins — all players', { title: 'Last 50 spins — all players (#88,141 – #88,190)', icon: 'bar-chart', demo: 'S', gap: 16, p: 24 }); add(low, [hc, 'FILL']);
  const hs = await I('29:17011', { Layout: 'Strip', State: 'Default' }); hs.name = 'Chart/Heat Strip'; add(hc, hs); tryFill(hs);
  await wrapT(hc, '23 red · 23 black · 4 zero. Every spin is independent: each of the 37 pockets has the same 1-in-37 chance every time, so “hot” or “cold” numbers never predict the next spin.', 'Caption', 'text/tertiary', 600, { name: 'Independence note' });
  const sc = await card('Session & limits', { title: 'Session & limits', icon: 'shield', w: 360, right: [await I('6:159')] }); add(low, sc);
  for (const [l, v] of [['Session time', '00:46:20'], ['Net this session (all games)', '+170.40 USDT'], ['Reality check', 'every 60 min · next 19:04 UTC'], ['Daily loss limit', '0.00 / 200.00 USDT']]) add(sc, [await kv(l, v, { vstyle: 'Body/S Strong', demo: true }), 'FILL']);
  const sa = AL('HORIZONTAL', { name: 'Card actions', gap: 8 }); add(sa, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Take a break', { size: 'S', lead: 'pause-circle' })); add(sc, sa);
  add(C, [await compliance(), 'FILL']);
  return { f: S.f, notes: { sidebarItem: S.found } };
}
const INSIDE_ROWS = [['Straight', 'Tap one number (0 included)', '1', '35:1', '2.70%'], ['Split', 'Tap the line between two numbers', '2', '17:1', '5.41%'], ['Street', 'Tap the outer edge of a row of three', '3', '11:1', '8.11%'], ['Corner', 'Tap where four numbers meet', '4', '8:1', '10.81%'], ['First four', '0 · 1 · 2 · 3 — tap the corner of 0 and 1', '4', '8:1', '10.81%'], ['Line', 'Two streets — tap the edge between them', '6', '5:1', '16.22%']];
const OUTSIDE_ROWS = [['Column', 'A full column of 12 — the 2:1 boxes', '12', '2:1', '32.43%'], ['Dozen', '1–12 · 13–24 · 25–36', '12', '2:1', '32.43%'], ['Red / Black', '18 numbers each', '18', '1:1', '48.65%'], ['Odd / Even', '18 numbers each (0 is neither)', '18', '1:1', '48.65%'], ['1–18 / 19–36', 'Low or high half', '18', '1:1', '48.65%']];
async function buildRules(name, x, y) {
  const S = await pageShell(name, x, y); const C = S.C;
  add(C, [await pageHeader('Rules & payouts', 'European roulette with a single zero. Every bet type returns the same 97.30% on average — the house edge is 2.70% (1 in 37) on all of them.', [await BTN('Secondary', 'How fairness works', { lead: 'shield-check' }), await BTN('Primary', 'Back to table', { lead: 'roulette' })]), 'FILL']);
  add(C, [await gameTabs('Rules & payouts'), 'FILL']);
  const map = await card('Where each bet goes', { title: 'Where each bet goes', icon: 'target', gap: 16, p: 24 }); add(C, [map, 'FILL']);
  const mr = AL('HORIZONTAL', { name: 'Felt map row', gap: 24, align: 'CENTER' }); add(map, [mr, 'FILL']);
  add(mr, await felt({ cells: { 19: 'Bet placed' }, bets: { 19: '1' }, obets: { 'Col 2': '1', '2nd 12': '1', 'RED': '1' }, marks: [{ type: 'split', a: 17, b: 20, value: '1', label: 'split' }, { type: 'street', a: 31, value: '1', label: 'street' }, { type: 'corner', a: 22, value: '1', label: 'corner' }, { type: 'line', a: 1, value: '1', label: 'line' }] }));
  const lg = AL('VERTICAL', { name: 'Felt map legend', gap: 10 }); add(mr, [lg, 'FILL']);
  for (const [t, d] of [['Straight 19', 'chip on the number'], ['Split 17 | 20', 'chip on the shared line'], ['Street 31 · 32 · 33', 'chip on the bottom edge of the row'], ['Corner 22 · 23 · 25 · 26', 'chip where the four meet'], ['Line 1 – 6', 'chip on the edge between two rows'], ['2nd column · 2nd dozen · Red', 'chips in the outside boxes']]) { const r = AL('HORIZONTAL', { name: 'Legend — ' + t, gap: 8, align: 'CENTER' }); add(r, await chipI('1', 20), await T(t, 'Body/S Strong', 'text/primary'), await T(d, 'Caption', 'text/tertiary')); add(lg, r); }
  const two = AL('HORIZONTAL', { name: 'Payout tables', gap: 24 }); add(C, [two, 'FILL']);
  add(two, [await payTable('Inside bets', INSIDE_ROWS, 'Payouts are “to 1”: a 1.00 split that wins returns 18.00 (17.00 winnings + your 1.00).'), 'FILL'], [await payTable('Outside bets', OUTSIDE_ROWS, 'If the ball lands on 0, every outside bet loses. This table has no La Partage or En Prison rule.'), 'FILL']);
  const three = AL('HORIZONTAL', { name: 'Rules cards', gap: 24 }); add(C, [three, 'FILL']);
  const how = await stepCard('How a spin works', [['Place your bets', 'Per spot 0.10 – 1,000.00 USDT, up to 5,000.00 USDT per spin. Chips can be moved or removed until you press Spin.'], ['Spin', 'Your total stake moves from Available to Locked. The pocket is computed from your seed pair and nonce — the wheel animation only shows it.'], ['Settle', 'Winnings and returned stakes go straight to Available, usually within a second. No fee is taken from winnings.'], ['If you disconnect', 'An accepted spin always settles on the server. You will find it in My bets with the pocket and seeds.']]); add(three, [how, 'FILL']);
  const lim = await card('Limits', { title: 'Limits', icon: 'scale', w: 360 }); add(three, lim);
  for (const [l, v] of [['Per spot', '0.10 – 1,000.00 USDT'], ['Per spin (table max)', '5,000.00 USDT'], ['Largest single win', '35,000.00 USDT'], ['House edge', '2.70% · every bet'], ['Fees on bets', '0.00 USDT']]) add(lim, [await kv(l, v, { vstyle: 'Body/S Strong' }), 'FILL']);
  await wrapT(lim, 'Largest single win = a 1,000.00 USDT straight bet at 35:1.', 'Caption', 'text/tertiary', 300);
  const rg = await card('Play within your limits', { title: 'Play within your limits', icon: 'shield', w: 360, right: [await I('6:159')] }); add(three, rg);
  await wrapT(rg, 'Roulette has no strategy that beats the house edge — betting systems only change how wins and losses are spread. Set a loss limit before you play; reality checks remind you every 60 minutes.', 'Body/S', 'text/secondary', 300);
  const ra = AL('HORIZONTAL', { name: 'Card actions', gap: 8, wrap: true, cgap: 8 }); add(ra, await BTN('Secondary', 'Set limits', { size: 'S', lead: 'sliders' }), await BTN('Ghost', 'Get help', { size: 'S', lead: 'help-circle' })); add(rg, [ra, 'FILL']);
  add(C, [await compliance(), 'FILL']);
  return { f: S.f, notes: { sidebarItem: S.found } };
}
async function buildPF(name, x, y) {
  const S = await pageShell(name, x, y); const C = S.C;
  add(C, [await pageHeader('Verify a spin', 'Check that spin RL-88191 came from the seeds we committed to before you bet. Verifying never changes a result — it only recomputes it.', [await BTN('Ghost', 'How provably fair works', { lead: 'book' }), await BTN('Primary', 'Back to table', { lead: 'roulette' })], 'Fairness'), 'FILL']);
  add(C, [await gameTabs('Fairness'), 'FILL']);
  const row = AL('HORIZONTAL', { name: 'Verifier row', gap: 24 }); add(C, [row, 'FILL']);
  const left = AL('VERTICAL', { name: 'Verifier column', gap: 16 }); add(row, left);
  const v = await I('23:24790', { State: 'Verified' }); v.name = 'Game/Provably Fair Verifier'; add(left, v);
  const n1 = await repl(v, { 'Pool Dice': 'Pool Roulette', 'D-88213': 'RL-88191', 'Roll 73.21': 'Pocket 19 · Red', '73.21 ≥ 50.50': '19 · Red', '73.21': '19 (Red)' }, true);
  const n2 = await repl(v, { 'Roll': 'Pocket', 'Dice': 'Roulette', 'Computed roll': 'Computed pocket', 'Recorded roll': 'Recorded pocket' });
  const vt = dumpT(v, 40);
  const right = AL('VERTICAL', { name: 'Explanation column', gap: 24 }); add(row, [right, 'FILL']);
  add(right, [await stepCard('How spin RL-88191 was computed', [['Commitment published', 'Before your bet we showed the SHA-256 hash of the server seed. It has not changed since.', '8f3c1e…e813'], ['Seeds revealed', 'After you rotated seeds, the server seed was revealed. Hashing it gives exactly the committed value.', 'c71d0a58…5c27b14'], ['Your inputs', 'Client seed nova-k-7f2a91 (you can change it any time) and nonce 417 — the 417th bet with this seed pair.', 'nova-k-7f2a91 · 417'], ['Pocket recomputed', 'HMAC-SHA256(server seed, client seed:nonce) → first 4 bytes as a number from 0 to 1 → × 37 → rounded down. 0.528137… × 37 = 19.54 → pocket 19.', 'floor(0.528137 × 37) = 19 → Red'], ['Bets settled', 'Pocket 19 pays Straight 19 at 35:1, Red at 1:1 and the 2nd dozen at 2:1 — 215.00 USDT returned on 20.00 staked.', '5.00×36 + 10.00×2 + 5.00×3 = 215.00']]), 'FILL']);
  const sd = await I('23:23401', { State: 'Rotated' }); sd.name = 'Game/Seed Display'; add(right, sd); tryFill(sd);
  const code = await card('Check it yourself', { title: 'Check it yourself', icon: 'code', gap: 12 }); add(right, [code, 'FILL']);
  const m = AL('VERTICAL', { name: 'Code block', gap: 4, p: 16, r: 10, fill: 'bg/secondary', stroke: 'border/subtle' }); add(code, [m, 'FILL']);
  for (const l of ['h = HMAC_SHA256(key = server_seed, msg = client_seed + ":" + nonce)', 'f = int(h[0:8], 16) / 2^32        # 0 ≤ f < 1', 'pocket = floor(f × 37)            # 0 – 36, European single zero']) add(m, await T(l, 'Mono/S', 'text/secondary'));
  await wrapT(code, 'Any HMAC-SHA256 tool gives the same pocket. Pocket numbers map directly to the felt (0 – 36), not to wheel positions.', 'Caption', 'text/tertiary', 400);
  add(C, [await compliance(), 'FILL']);
  return { f: S.f, notes: { sidebarItem: S.found, verifierRepl: n1 + n2, verifierTexts: vt } };
}
// ===== END ROULETTE KIT — pages =====
